/* ============================================================================
   world.execute(me);  --  render: WebGL2 draw API, bloom, CRT/glitch composite
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, M4 = C.M4, V3 = C.V3;
  var GLSL_HEAD = "";

  function trim(src) {
    // remove the leading newline so #version stays the first token
    return src.replace(/^\s*\n/, "");
  }
  // attribute locations are bound before link (see Res.program patch below)
  WEM.ATTR_BIND = ["aPos", "aNrm", "aUV", "aInstA", "aInstB", "aInstC", "aInstD", "aExtra", "aUV2"];

  /* ------------------------------------------------------------- shaders */
  var S = {};

  S.solidVS = trim(`
  #version 300 es
  precision highp float;
  in vec3 aPos; in vec3 aNrm;
  uniform mat4 uVP; uniform mat4 uModel; uniform mat3 uNM;
  out vec3 vN; out vec3 vW; out vec3 vL;
  void main(){
    vec4 w = uModel * vec4(aPos,1.0);
    vW = w.xyz; vL = aPos;
    vN = uNM * aNrm;
    gl_Position = uVP * w;
  }`);

  S.solidFS = trim(`
  #version 300 es
  precision highp float;
  in vec3 vN; in vec3 vW; in vec3 vL;
  uniform vec3 uColor; uniform vec3 uEye;
  uniform float uAlpha; uniform float uUnlit; uniform float uRim; uniform float uEmissive;
  uniform vec3 uLight; uniform float uFlat;
  out vec4 outC;
  void main(){
    vec3 n = normalize(gl_FrontFacing ? vN : -vN);
    if(uFlat > 0.5){
      n = normalize(cross(dFdx(vW), dFdy(vW)));
      if(!gl_FrontFacing) n = -n;
    }
    vec3 L = normalize(uLight);
    float d = abs(dot(n,L));
    float d2 = abs(dot(n, normalize(vec3(-0.4,0.6,0.5))));
    vec3 V = normalize(uEye - vW);
    float rim = pow(1.0 - clamp(abs(dot(n,V)),0.0,1.0), 2.2);
    vec3 base = uColor;
    vec3 lit = base*(0.22 + 0.78*d) + base*0.28*d2 + vec3(rim)*uRim*0.55 + base*uEmissive;
    outC = vec4(mix(lit, base, uUnlit) * uAlpha, uAlpha);
  }`);

  // thick screen-space lines, instanced: quad corner in aPos, segment in aInstA/B
  S.lineVS = trim(`
  #version 300 es
  precision highp float;
  in vec3 aPos;              // (side -1..1, along 0..1, 0)
  in vec4 aInstA;            // p0.xyz, w0
  in vec4 aInstB;            // p1.xyz, w1
  in vec4 aInstC;            // rgba
  uniform mat4 uVP; uniform vec2 uRes; uniform float uScale;
  out vec2 vUV; out vec4 vCol;
  void main(){
    vec4 c0 = uVP * vec4(aInstA.xyz,1.0);
    vec4 c1 = uVP * vec4(aInstB.xyz,1.0);
    float wq = mix(c0.w, c1.w, aPos.y);
    vec2 s0 = c0.xy / max(c0.w, 1e-5) * uRes * 0.5;
    vec2 s1 = c1.xy / max(c1.w, 1e-5) * uRes * 0.5;
    // orthographic cameras report w == 1 for both, so this stays exact
    vec2 dir = s1 - s0;
    float l = length(dir);
    if(l < 1e-5){ dir = vec2(1.0, 0.0); l = 1e-5; }
    vec2 nrm = vec2(-dir.y, dir.x) / l;
    float w = mix(aInstA.w, aInstB.w, aPos.y) * uScale;
    vec2 p = mix(s0, s1, aPos.y) + nrm * (aPos.x * w * 0.5);
    gl_Position = vec4(p / (uRes * 0.5) * wq, mix(c0.z/max(c0.w,1e-5), c1.z/max(c1.w,1e-5), aPos.y) * wq, wq);
    vUV = vec2(aPos.x, aPos.y);
    vCol = aInstC;
  }`);

  S.lineFS = trim(`
  #version 300 es
  precision highp float;
  in vec2 vUV; in vec4 vCol;
  uniform float uFade; uniform float uDash; uniform float uGlow;
  out vec4 outC;
  void main(){
    float e = smoothstep(0.0, 1.0, 1.0-abs(vUV.x));
    float a = vCol.a * e * uFade;
    if(uDash > 0.0){
      float f = fract(vUV.y * uDash);
      a *= step(0.45, f);
    }
    vec3 c = vCol.rgb * (1.0 + uGlow*e);
    outC = vec4(c*a, a);
  }`);

  S.pointVS = trim(`
  #version 300 es
  precision highp float;
  in vec3 aPos;
  in vec4 aInstA;   // xyz, size
  in vec4 aExtra;   // rgba
  uniform mat4 uVP; uniform float uScale;
  out vec4 vCol;
  void main(){
    vec4 c = uVP * vec4(aInstA.xyz, 1.0);
    gl_Position = c;
    // size is a pixel diameter at ~10 world units from the eye
    gl_PointSize = clamp(aInstA.w * uScale * 8.0 / max(c.w, 1e-3), 1.0, 56.0);
    vCol = aExtra;
  }`);

  S.pointFS = trim(`
  #version 300 es
  precision highp float;
  in vec4 vCol;
  uniform float uSoft;
  out vec4 outC;
  void main(){
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d) * 2.0;
    float a = smoothstep(1.0, 1.0 - max(uSoft, 0.01), r) * vCol.a;
    if(a <= 0.002) discard;
    outC = vec4(vCol.rgb * a, a);
  }`);

  // textured quads, expanded on the CPU into one interleaved vertex buffer --
  // deliberately not instanced so there is no divisor/attribute state to go wrong
  S.quadVS = trim(`
  #version 300 es
  precision highp float;
  in vec3 aPos; in vec2 aUV; in vec4 aExtra;
  uniform mat4 uVP;
  out vec2 vUV; out vec4 vTint;
  void main(){
    vUV = aUV; vTint = aExtra;
    gl_Position = uVP * vec4(aPos, 1.0);
  }`);

  S.quadFS = trim(`
  #version 300 es
  precision highp float;
  uniform sampler2D uTex; uniform float uUseTex;
  in vec2 vUV; in vec4 vTint;
  out vec4 outC;
  void main(){
    vec4 c = vec4(1.0);
    if(uUseTex > 0.5) c = texture(uTex, vUV);
    float a = c.a * vTint.a;
    if(a <= 0.002) discard;
    outC = vec4(c.rgb * vTint.rgb * a, a);
  }`);

  S.fsVS = trim(`
  #version 300 es
  precision highp float;
  in vec2 aPos; in vec2 aUV;
  out vec2 vUV;
  void main(){ vUV = aUV; gl_Position = vec4(aPos,0.0,1.0); }`);

  S.brightFS = trim(`
  #version 300 es
  precision highp float;
  uniform sampler2D uTex; uniform float uThresh;
  in vec2 vUV; out vec4 outC;
  void main(){
    vec3 c = texture(uTex, vUV).rgb;
    float l = dot(c, vec3(0.299,0.587,0.114));
    float k = max(l - uThresh, 0.0) / max(l, 0.0001);
    outC = vec4(c*k, 1.0);
  }`);

  S.blurFS = trim(`
  #version 300 es
  precision highp float;
  uniform sampler2D uTex; uniform vec2 uDir;
  in vec2 vUV; out vec4 outC;
  void main(){
    vec3 s = texture(uTex, vUV).rgb * 0.227027;
    s += (texture(uTex, vUV + uDir*1.3846).rgb + texture(uTex, vUV - uDir*1.3846).rgb) * 0.316216;
    s += (texture(uTex, vUV + uDir*3.2308).rgb + texture(uTex, vUV - uDir*3.2308).rgb) * 0.070270;
    outC = vec4(s, 1.0);
  }`);

  // composite: scene + full-screen 2D hud + bloom, with glitch/dispersion/mood
  S.compFS = trim(`
  #version 300 es
  precision highp float;
  uniform sampler2D uScene, uHud, uBloom;
  uniform vec2 uRes; uniform float uTime;
  uniform float uFlash, uGlitch, uDisp, uBloomAmt, uHudAmt, uStripes, uMood, uFade;
  uniform vec3 uMoodColor, uMoodColor2;
  uniform float uShakeY, uJump, uInvert, uWhiteBar, uGhost, uHudGlitch, uExposure;
  uniform vec4 uRects[6];      // xy = center, zw = halfsize (screen uv) : hud cut-out panels
  in vec2 vUV; out vec4 outC;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  void main(){
    vec2 uv = vUV;
    uv.y += uShakeY;
    uv.x += uJump;
    // ---- horizontal glitch bands ----
    float band = 0.0;
    if(uGlitch > 0.001){
      float row = floor(uv.y * 64.0);
      float h = hash(vec2(row, floor(uTime*18.0)));
      float k = step(1.0 - uGlitch*0.55, h);
      band = k * (hash(vec2(row*3.1, floor(uTime*18.0)))-0.5) * uGlitch * 0.10;
      uv.x += band;
    }
    // ---- dispersion (chromatic) ----
    float d = uDisp * 0.010 + abs(band)*0.6;
    vec2 dir = vec2(d, 0.0);
    vec3 sc;
    sc.r = texture(uScene, uv + dir).r;
    sc.g = texture(uScene, uv).g;
    sc.b = texture(uScene, uv - dir).b;
    float sa = max(texture(uScene, uv).a, max(texture(uScene, uv+dir).a, texture(uScene, uv-dir).a));
    // ---- vertical dark-grey stripes background ----
    float st = sin(uv.x * uRes.x * 0.30);
    float stripes = mix(0.5, 1.0, step(0.0, st)) ;
    stripes = 0.5 + 0.5*stripes;
    vec3 bg = vec3(0.055,0.058,0.064) * mix(0.65, 1.25, stripes);
    bg *= mix(vec3(1.0), uMoodColor, uMood);
    // mood gradient
    bg += uMoodColor2 * uMood * (0.10 + 0.25*length(uv-0.5));
    vec3 col = bg * (1.0 - sa) + sc;
    // ---- 2D hud layer on top ----
    vec2 huv = uv;
    if(uHudGlitch > 0.001){
      float row = floor(huv.y*90.0);
      float h = hash(vec2(row, floor(uTime*22.0)+7.0));
      huv.x += step(1.0-uHudGlitch*0.4, h) * (hash(vec2(row, uTime))-0.5)*uHudGlitch*0.05;
    }
    vec4 hud = texture(uHud, vec2(huv.x, 1.0 - huv.y));
    float hudMask = 1.0;
    for(int i=0;i<6;i++){
      if(uRects[i].z > 0.0){
        vec2 q = abs(uv - uRects[i].xy);
        hudMask *= 1.0 - step(q.x, uRects[i].z)*step(q.y, uRects[i].w);
      }
    }
    float ha = hud.a * uHudAmt * hudMask;
    col = col * (1.0-ha) + hud.rgb*ha;
    // ---- bloom ----
    vec3 bl = texture(uBloom, uv).rgb;
    col += bl * uBloomAmt;
    // ---- white glitch bars ----
    if(uWhiteBar > 0.001){
      float row = floor(uv.y*140.0);
      float h = hash(vec2(row, floor(uTime*30.0)*1.7));
      float k = step(1.0-uWhiteBar*0.5, h);
      col = mix(col, vec3(1.0), k*uWhiteBar*0.75);
    }
    // ---- mood tint & grade ----
    col = mix(col, col*uMoodColor*1.6+uMoodColor2*0.06, uMood*0.55);
    float l = dot(col, vec3(0.299,0.587,0.114));
    col = mix(vec3(l), col, 1.06 - uMood*0.35);
    col = mix(col, vec3(1.0)-col, uInvert);
    col += uFlash;
    col *= uFade * uExposure;
    outC = vec4(max(col, 0.0), 1.0);
  }`);

  // CRT: curvature, scanlines, aperture grille, vignette, grain, power on/off
  S.crtFS = trim(`
  #version 300 es
  precision highp float;
  uniform sampler2D uTex;
  uniform vec2 uRes; uniform float uTime;
  uniform float uCurve, uScan, uGrille, uVig, uGrain, uOn, uOff, uAberr, uRoll;
  in vec2 vUV; out vec4 outC;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  vec2 curve(vec2 uv, float k){
    uv = uv*2.0-1.0;
    uv *= 1.0 + k*(uv.y*uv.y*0.22 + uv.x*uv.x*0.06);
    return uv*0.5+0.5;
  }
  void main(){
    vec2 uv = vUV;
    float openK = 1.0;
    float bright = 0.0;
    // power-on: a bright line opens vertically into a full raster
    if(uOn < 0.999){
      float half_ = mix(0.0, 0.56, pow(uOn, 0.42));
      float dy = abs(uv.y - 0.5);
      openK = 1.0 - smoothstep(half_ - 0.012, half_ + 0.012, dy);
      bright = (1.0 - uOn) * 1.2 * smoothstep(0.030, 0.0, dy);
    }
    // power-off: the raster collapses back into a line and dies
    if(uOff > 0.001){
      float half2 = mix(0.56, 0.0, pow(uOff, 0.45));
      float dy2 = abs(uv.y - 0.5);
      openK *= 1.0 - smoothstep(half2 - 0.02, half2 + 0.02, dy2);
      bright += (1.0 - abs(uOff * 2.0 - 1.0)) * 1.5 * smoothstep(0.035, 0.0, dy2);
      bright *= 1.0 - smoothstep(0.80, 1.0, uOff);
    }
    uv.y += uRoll;
    uv = curve(uv, uCurve);
    if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0){ outC = vec4(0.0,0.0,0.0,1.0); return; }
    vec3 c;
    float ab = uAberr*(0.0015 + 0.004*dot(uv-0.5,uv-0.5)*2.0);
    c.r = texture(uTex, uv+vec2(ab,0.0)).r;
    c.g = texture(uTex, uv).g;
    c.b = texture(uTex, uv-vec2(ab,0.0)).b;
    // scanlines + grille
    float sl = 0.5+0.5*sin(uv.y*uRes.y*3.14159);
    c *= mix(1.0, 0.72+0.42*sl, uScan);
    float gr = 0.5+0.5*sin(uv.x*uRes.x*3.14159);
    c *= mix(1.0, 0.86+0.20*gr, uGrille);
    // vignette
    vec2 q = uv-0.5;
    float v = 1.0 - uVig*dot(q,q)*2.4;
    c *= clamp(v, 0.0, 1.0);
    c += bright*vec3(0.92,0.97,1.02);
    c *= openK;
    // grain
    c += (hash(uv*uRes + fract(uTime)*137.0)-0.5)*uGrain;
    outC = vec4(max(c,0.0), 1.0);
  }`);

  // generic fullscreen ray/field shaders used by several sections
  S.mandelFS = trim(`
  #version 300 es
  precision highp float;
  uniform vec2 uRes; uniform float uTime;
  uniform vec2 uCenter; uniform float uZoom; uniform float uIter; uniform float uMorph;
  uniform float uHue, uGlow, uGhost, uJulia; uniform vec2 uC;
  in vec2 vUV; out vec4 outC;
  vec2 cmul(vec2 a, vec2 b){ return vec2(a.x*b.x-a.y*b.y, a.x*b.y+a.y*b.x); }
  void main(){
    vec2 uv = (vUV-0.5)*vec2(uRes.x/uRes.y, 1.0);
    vec2 z, c;
    if(uJulia > 0.5){ z = uv*2.6/uZoom; c = uC + vec2(uMorph*0.05,0.0); }
    else { z = vec2(0.0); c = uCenter + uv*2.6/uZoom; }
    float it = 0.0; float maxit = uIter; float m = 0.0;
    for(int i=0;i<900;i++){
      if(float(i) >= maxit) break;
      z = cmul(z,z) + c;
      m = dot(z,z);
      if(m > 256.0){ break; }
      it += 1.0;
    }
    float sm = it - log2(log2(max(m,2.0)))*0.5 + 4.0;
    float t = clamp(sm/maxit*4.0, 0.0, 1.0);
    vec3 col;
    if(m <= 256.0 && it >= maxit-0.5){
      col = vec3(0.02,0.022,0.028);
    } else {
      float f = fract(sm*0.035 + uHue);
      col = vec3(0.5+0.5*cos(6.2831*(f+0.0)), 0.5+0.5*cos(6.2831*(f+0.33)), 0.5+0.5*cos(6.2831*(f+0.67)));
      col = mix(vec3(0.85,0.88,0.95), col, 0.45);
      col *= 0.35 + 0.9*t;
    }
    col += uGlow * vec3(0.35,0.55,0.75) * pow(1.0-t, 3.0) * (it<maxit-0.5?1.0:0.0);
    // keep the film's grey base: only a hint of colour survives
    float lum = dot(col, vec3(0.299,0.587,0.114));
    col = mix(vec3(lum), col, 0.32);
    col = mix(col, col * vec3(1.02,1.0,1.06), 0.5);
    outC = vec4(col, 1.0);
  }`);

  S.rayFS = trim(`
  #version 300 es
  precision highp float;
  uniform vec2 uRes; uniform float uTime;
  uniform float uDisk, uSpin, uHole, uRing, uGrid;
  uniform vec3 uTint; uniform float uWarp;
  in vec2 vUV; out vec4 outC;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y);
  }
  void main(){
    vec2 uv = (vUV-0.5)*vec2(uRes.x/uRes.y,1.0);
    vec3 col = vec3(0.0);
    // accretion disk: polar, lensed
    float r = length(uv);
    float a = atan(uv.y, uv.x);
    float rr = r;
    // gravitational lensing squash near the hole
    rr = mix(rr, rr*rr*1.6, uWarp*0.4);
    float disk = smoothstep(0.75, 0.30, rr) * smoothstep(0.12, 0.30, rr);
    float swirl = a*3.0 + uSpin*(6.0/(rr+0.25)) + uTime*uSpin*0.6;
    float n = noise(vec2(cos(swirl), sin(swirl))*2.2 + rr*9.0);
    n = n*0.6 + 0.4*noise(vec2(cos(swirl*2.0), sin(swirl*2.0))*5.0 - rr*20.0);
    float band = 0.5+0.5*sin(rr*46.0 - uTime*3.0 + n*4.0);
    vec3 diskCol = mix(vec3(1.0,0.72,0.30), vec3(0.55,0.85,1.0), clamp(rr*1.4,0.0,1.0));
    col += diskCol * disk * (0.35 + 0.9*band) * n * uDisk;
    // photon ring
    float ring = smoothstep(0.012, 0.0, abs(rr-0.235));
    col += vec3(1.0,0.95,0.85) * ring * uRing;
    float ring2 = smoothstep(0.02, 0.0, abs(rr-0.30));
    col += vec3(0.6,0.85,1.0) * ring2 * uRing*0.5;
    // event horizon
    float hor = smoothstep(0.215, 0.20, r);
    col *= (1.0-hor);
    col += vec3(0.02,0.03,0.05)*hor;
    col *= uTint;
    outC = vec4(col, 1.0);
  }`);

  /* ------------------------------------------------------------- renderer */
  function Renderer(canvas) {
    this.canvas = canvas;
    var gl = canvas.getContext("webgl2", {
      antialias: true, alpha: false, depth: true, stencil: false,
      preserveDrawingBuffer: true, premultipliedAlpha: false,
      powerPreference: "high-performance", desynchronized: false
    });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;
    // float render targets need the extension ENABLED, not merely supported
    this.extCBF = gl.getExtension("EXT_color_buffer_float");
    this.extFloatBlend = gl.getExtension("EXT_float_blend");
    this.hdr = !!this.extCBF;
    this.res = new C.Res(gl);
    this.w = canvas.width; this.h = canvas.height;
    this.fx = {
      flash: 0, glitch: 0, disp: 0, bloom: 0.50, hud: 1, stripes: 1,
      mood: 0, moodColor: [0.1, 0.2, 0.5], moodColor2: [0, 0, 0],
      fade: 1, crtOn: 1, crtOff: 0, invert: 0, whiteBar: 0, hudGlitch: 0,
      shakeY: 0, jump: 0, ghost: 0, curve: 0.26, scan: 0.34, grille: 0.26,
      vignette: 0.42, grain: 0.028, aberr: 0.55, roll: 0, dash: 0, scale: 1, exposure: 1.22
    };
    this.t = 0;
    this.hudRects = new Float32Array(24);
    this._buildQuad();
    this._buildLineProto();
    this._buildPointProto();
    this._buildMeshProto();
    this._bloomW = 0; this._bloomH = 0;
    this.dyn = {};
  }

  Renderer.prototype._dynBuf = function (key, floats) {
    var gl = this.gl, d = this.dyn[key];
    if (!d) { d = this.dyn[key] = { buf: gl.createBuffer(), cap: 0 }; }
    gl.bindBuffer(gl.ARRAY_BUFFER, d.buf);
    if (floats.byteLength > d.cap) {
      gl.bufferData(gl.ARRAY_BUFFER, floats, gl.DYNAMIC_DRAW);
      d.cap = floats.byteLength;
    } else {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, floats);
    }
    return d.buf;
  };

  Renderer.prototype._buildQuad = function () {
    var gl = this.gl, res = this.res;
    var verts = new Float32Array([-1, -1, 0, 0, 1, -1, 1, 0, 1, 1, 1, 1, -1, -1, 0, 0, 1, 1, 1, 1, -1, 1, 0, 1]);
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 16, 8);
    gl.bindVertexArray(null);
    this.quadVAO = vao; this.quadBuf = b;
  };

  Renderer.prototype._buildLineProto = function () {
    var gl = this.gl;
    // unit quad: x = side(-1..1), y = along(0..1)  -> packed (side, along, 0)
    var v = new Float32Array([
      -1, 0, 0, 1, 0, 0, 1, 1, 0,
      -1, 0, 0, 1, 1, 0, -1, 1, 0
    ]);
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    this.lineVAO = vao; this.lineQuadBuf = b; this.lineProtoCount = 6;
  };

  Renderer.prototype._buildPointProto = function () {
    var gl = this.gl;
    var v = new Float32Array([0, 0, 0]);
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this.pointVAO = vao; this.pointBuf = b;
  };

  // 2D unit quad (x,y in -0.5..0.5) with uv, for instanced quads
  Renderer.prototype._buildMeshProto = function () {
    var gl = this.gl;
    var v = new Float32Array([-.5, -.5, 0, 0, .5, -.5, 1, 0, .5, .5, 1, 1, -.5, -.5, 0, 0, .5, .5, 1, 1, -.5, .5, 0, 1]);
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 16, 8);
    gl.bindVertexArray(null);
    this.instQuadVAO = vao; this.instQuadBuf = b;
  };

  Renderer.prototype.resize = function (w, h) {
    this.w = w; this.h = h;
    this.canvas.width = w; this.canvas.height = h;
    var fl = !!this.hdr;
    this.scene = this.res.fbo("scene", w, h, { float: fl, depth: true });
    this.comp = this.res.fbo("comp", w, h, { float: fl });
    this.crt = this.res.fbo("crt", w, h, { float: fl });
    this._bloomW = Math.max(1, w >> 2); this._bloomH = Math.max(1, h >> 2);
    this.bloomA = this.res.fbo("bloomA", this._bloomW, this._bloomH, { float: fl });
    this.bloomB = this.res.fbo("bloomB", this._bloomW, this._bloomH, { float: fl });
  };

  Renderer.prototype.prog = function (key, vs, fs) {
    var r = this.res.program(key, vs, fs);
    if (!r._bound) { r._bound = true; }
    return r;
  };

  Renderer.prototype.beginScene = function (cam) {
    var gl = this.gl, f = this.scene;
    gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb);
    gl.viewport(0, 0, this.w, this.h);
    // the post chain leaves depthMask(false); a masked depth clear would leave the
    // previous frame's depth buffer intact and reject almost every fragment
    gl.depthMask(true);
    gl.colorMask(true, true, true, true);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.cam = cam;
    this.vp = cam.vp;
    this.eye = cam.pos;
    this.pxScale = cam.pxScale || (this.h * 0.5 / Math.tan((cam.fov || 1) * 0.5));
  };

  Renderer.prototype.u = function (prog, name, v) {
    var gl = this.gl, loc = prog.u[name];
    if (loc === undefined || loc === null) return;
    if (typeof v === "number") gl.uniform1f(loc, v);
    else if (typeof v === "boolean") gl.uniform1f(loc, v ? 1 : 0);
    else if (v && v.tex !== undefined) { gl.activeTexture(gl.TEXTURE0 + (v.unit || 0)); gl.bindTexture(gl.TEXTURE_2D, v.tex); gl.uniform1i(loc, v.unit || 0); }
    else if (v && v.length !== undefined) {
      switch (v.length) {
        case 2: gl.uniform2f(loc, v[0], v[1]); break;
        case 3: gl.uniform3f(loc, v[0], v[1], v[2]); break;
        case 4: gl.uniform4f(loc, v[0], v[1], v[2], v[3]); break;
        case 9: gl.uniformMatrix3fv(loc, false, v); break;
        case 16: gl.uniformMatrix4fv(loc, false, v); break;
        case 24: gl.uniform4fv(loc, v); break;
        default: gl.uniform1fv(loc, v);
      }
    }
  };

  /* ------------------------------------------------------------ draw API */
  Renderer.prototype.gfx = function () {
    var self = this;
    if (self._gfx) return self._gfx;
    var gl = self.gl;
    var gfx = {};
    var cached = {};

    function meshVAO(mesh, key) {
      var k = key || mesh._key;
      if (!k) { k = mesh._key = "m" + (Math.random() * 1e9 | 0); }
      var v = cached[k];
      if (v) return v;
      var vb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.pos, gl.STATIC_DRAW);
      var nb = null;
      if (mesh.nrm) { nb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, nb); gl.bufferData(gl.ARRAY_BUFFER, mesh.nrm, gl.STATIC_DRAW); }
      var uv = mesh.uv, ub = null;
      if (uv) { ub = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, ub); gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW); }
      var ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.idx, gl.STATIC_DRAW);
      v = cached[k] = { pos: vb, nrm: nb, uv: ub, ib: ib, count: mesh.idx.length, itype: mesh.idx instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT };
      return v;
    }

    function edgeKey(mesh) {
      if (mesh._edges) return mesh._edges;
      var idx = mesh.idx, pos = mesh.pos, seen = {}, out = [];
      function add(a, b) { var k = Math.min(a, b) + ":" + Math.max(a, b); if (!seen[k]) { seen[k] = 1; out.push(a, b); } }
      for (var i = 0; i < idx.length; i += 3) { add(idx[i], idx[i + 1]); add(idx[i + 1], idx[i + 2]); add(idx[i + 2], idx[i]); }
      var cols = new Float32Array(out.length * 3);
      for (var j = 0; j < out.length; j++) { cols[j * 3] = pos[out[j] * 3]; cols[j * 3 + 1] = pos[out[j] * 3 + 1]; cols[j * 3 + 2] = pos[out[j] * 3 + 2]; }
      mesh._edges = { pos: cols, n: out.length / 2 };
      return mesh._edges;
    }

    gfx.solid = function (mesh, model, o) {
      o = o || {};
      var prog = self.prog("solid", S.solidVS, S.solidFS);
      gl.useProgram(prog.p);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(o.depthWrite !== false);
      if (o.blend === "add") gl.blendFunc(gl.ONE, gl.ONE);
      else gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      var v = meshVAO(mesh);
      var vao = self._vaoOf(mesh, cached, meshVAO);
      gl.bindVertexArray(vao);
      self.u(prog, "uVP", self.vp);
      self.u(prog, "uModel", model);
      self.u(prog, "uNM", C.M4.normalMat3(model, self._nm || (self._nm = new Float32Array(9))));
      self.u(prog, "uColor", o.color || [0.9, 0.92, 0.96]);
      self.u(prog, "uEye", self.eye);
      self.u(prog, "uAlpha", o.alpha === undefined ? 1 : o.alpha);
      self.u(prog, "uUnlit", o.unlit ? 1 : 0);
      self.u(prog, "uRim", o.rim === undefined ? 0.5 : o.rim);
      self.u(prog, "uEmissive", o.emissive || 0);
      self.u(prog, "uFlat", o.smooth ? 0 : 1);
      self.u(prog, "uLight", o.light || [0.42, 0.78, 0.46]);
      gl.drawElements(gl.TRIANGLES, v.count, v.itype, 0);
      gl.bindVertexArray(null);
    };

    self._vaoOf = function (mesh, cache, mk) {
      var k = mesh._key || (mesh._key = "m" + (Math.random() * 1e9 | 0));
      if (self._meshVAO[k]) return self._meshVAO[k];
      var v = mk(mesh, k);
      var vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, v.pos);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      if (v.nrm) { gl.bindBuffer(gl.ARRAY_BUFFER, v.nrm); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0); }
      if (v.uv) { gl.bindBuffer(gl.ARRAY_BUFFER, v.uv); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0); }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, v.ib);
      gl.bindVertexArray(null);
      self._meshVAO[k] = vao;
      return vao;
    };
    self._meshVAO = self._meshVAO || {};

    // flat wireframe (uses depth-friendly LINES)
    gfx.wire = function (mesh, model, o) {
      o = o || {};
      var e = edgeKey(mesh);
      var arr = new Float32Array((e.n) * 12);
      var col = o.color || [0.8, 0.85, 0.9];
      var a = o.alpha === undefined ? 1 : o.alpha;
      var w = o.width || 1.6;
      for (var i = 0; i < e.n; i++) {
        var o0 = i * 12;
        arr[o0] = e.pos[i * 6]; arr[o0 + 1] = e.pos[i * 6 + 1]; arr[o0 + 2] = e.pos[i * 6 + 2]; arr[o0 + 3] = w;
        arr[o0 + 4] = e.pos[i * 6 + 3]; arr[o0 + 5] = e.pos[i * 6 + 4]; arr[o0 + 6] = e.pos[i * 6 + 5]; arr[o0 + 7] = w;
        arr[o0 + 8] = col[0]; arr[o0 + 9] = col[1]; arr[o0 + 10] = col[2];
        arr[o0 + 11] = a;
      }
      // transform on CPU (wireframes are small)
      for (var j = 0; j < e.n; j++) {
        var p0 = C.M4.xform(model, [arr[j * 12], arr[j * 12 + 1], arr[j * 12 + 2], 1]);
        var p1 = C.M4.xform(model, [arr[j * 12 + 4], arr[j * 12 + 5], arr[j * 12 + 6], 1]);
        arr[j * 12] = p0[0]; arr[j * 12 + 1] = p0[1]; arr[j * 12 + 2] = p0[2];
        arr[j * 12 + 4] = p1[0]; arr[j * 12 + 5] = p1[1]; arr[j * 12 + 6] = p1[2];
      }
      gfx.lines(arr, o);
    };

    gfx.lines = function (data, o) {
      o = o || {};
      var count = data.length / 12;
      if (!count) return;
      var prog = self.prog("line", S.lineVS, S.lineFS);
      gl.useProgram(prog.p);
      var vao = self._lineVAO;
      if (!vao) {
        vao = self._lineVAO = gl.createVertexArray();
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, self.lineQuadBuf);
        gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        self._lineInst = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, self._lineInst);
        var stride = 48;
        gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, stride, 0); gl.vertexAttribDivisor(3, 1);
        gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 4, gl.FLOAT, false, stride, 16); gl.vertexAttribDivisor(4, 1);
        gl.enableVertexAttribArray(5); gl.vertexAttribPointer(5, 4, gl.FLOAT, false, stride, 32); gl.vertexAttribDivisor(5, 1);
      } else {
        gl.bindVertexArray(vao);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, self._lineInst);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(o.depthWrite === false ? false : true);
      if (o.add) gl.blendFunc(gl.ONE, gl.ONE);
      else gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      self.u(prog, "uVP", self.vp);
      self.u(prog, "uRes", [self.w, self.h]);
      self.u(prog, "uScale", (o.scale || 1) * (self.w / 1920));
      self.u(prog, "uFade", o.fade === undefined ? 1 : o.fade);
      self.u(prog, "uDash", o.dash || 0);
      self.u(prog, "uGlow", o.glow || 0);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
      gl.bindVertexArray(null);
    };

    gfx.points = function (data, o) {
      o = o || {};
      var count = data.length / 8;   // stride is 8 floats: xyz + size + rgba
      if (!count) return;
      var prog = self.prog("point", S.pointVS, S.pointFS);
      gl.useProgram(prog.p);
      var vao = self._pointVAOInst;
      if (!vao) {
        vao = self._pointVAOInst = gl.createVertexArray();
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, self.pointBuf);
        gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        self._pointInst = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, self._pointInst);
        gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 32, 0); gl.vertexAttribDivisor(3, 1);
        gl.enableVertexAttribArray(7); gl.vertexAttribPointer(7, 4, gl.FLOAT, false, 32, 16); gl.vertexAttribDivisor(7, 1);
      } else gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, self._pointInst);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(o.depthWrite === false ? false : true);
      if (o.add !== false) gl.blendFunc(gl.ONE, gl.ONE); else gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      self.u(prog, "uVP", self.vp);
      self.u(prog, "uScale", (o.scale || 1) * (self.w / 1920));
      self.u(prog, "uSoft", o.soft === undefined ? 0.7 : o.soft);
      gl.drawArraysInstanced(gl.POINTS, 0, 1, count);
      gl.bindVertexArray(null);
    };

    // quads: source data stride 24 floats = mat4(16) + rgba(4) + uvRect(4)
    var QCX = [-0.5, 0.5, 0.5, -0.5, 0.5, -0.5];
    var QCY = [-0.5, -0.5, 0.5, -0.5, 0.5, 0.5];
    var QCU = [0, 1, 1, 0, 1, 0];
    var QCV = [0, 0, 1, 0, 1, 1];
    gfx.quads = function (data, tex, o) {
      o = o || {};
      var count = data.length / 24;
      if (!count) return;
      var nv = count * 6, stride = 9;
      var verts = self._quadVerts;
      if (!verts || verts.length < nv * stride) verts = self._quadVerts = new Float32Array(nv * stride);
      var k = 0;
      for (var i = 0; i < count; i++) {
        var o0 = i * 24;
        var m0 = data[o0], m1 = data[o0 + 1], m2 = data[o0 + 2];
        var m4 = data[o0 + 4], m5 = data[o0 + 5], m6 = data[o0 + 6];
        var m12 = data[o0 + 12], m13 = data[o0 + 13], m14 = data[o0 + 14];
        var cr = data[o0 + 16], cg = data[o0 + 17], cb = data[o0 + 18], ca = data[o0 + 19];
        var u0 = data[o0 + 20], v0 = data[o0 + 21], du = data[o0 + 22], dv = data[o0 + 23];
        for (var v = 0; v < 6; v++) {
          var x = QCX[v], y = QCY[v];
          verts[k++] = m0 * x + m4 * y + m12;
          verts[k++] = m1 * x + m5 * y + m13;
          verts[k++] = m2 * x + m6 * y + m14;
          verts[k++] = u0 + QCU[v] * du;
          verts[k++] = v0 + QCV[v] * dv;
          verts[k++] = cr; verts[k++] = cg; verts[k++] = cb; verts[k++] = ca;
        }
      }
      var prog = self.prog("quad", S.quadVS, S.quadFS);
      gl.useProgram(prog.p);
      if (!self._quadVAOFlat) {
        self._quadVAOFlat = gl.createVertexArray();
        self._quadVBuf = gl.createBuffer();
        gl.bindVertexArray(self._quadVAOFlat);
        gl.bindBuffer(gl.ARRAY_BUFFER, self._quadVBuf);
        // stride is 9 floats: pos(3) uv(2) rgba(4) -> aExtra starts at byte 20
        gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 36, 0);
        gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 36, 12);
        gl.enableVertexAttribArray(7); gl.vertexAttribPointer(7, 4, gl.FLOAT, false, 36, 20);
      }
      gl.bindVertexArray(self._quadVAOFlat);
      gl.bindBuffer(gl.ARRAY_BUFFER, self._quadVBuf);
      gl.bufferData(gl.ARRAY_BUFFER, verts.subarray(0, nv * stride), gl.DYNAMIC_DRAW);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(o.depthWrite === false ? false : true);
      if (o.noDepth) gl.disable(gl.DEPTH_TEST);
      if (o.add) gl.blendFunc(gl.ONE, gl.ONE);
      else gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      var raw = tex ? (tex.tex || tex) : null;
      gl.activeTexture(gl.TEXTURE0 + (o.unit || 0));
      gl.bindTexture(gl.TEXTURE_2D, raw);
      self.u(prog, "uVP", self.vp);
      self.u(prog, "uUseTex", raw ? 1 : 0);
      self.u(prog, "uTex", { tex: raw, unit: o.unit || 0 });
      gl.drawArrays(gl.TRIANGLES, 0, nv);
      gl.bindVertexArray(null);
    };

    gfx.fullscreen = function (prog, uniforms, target) {
      gl.useProgram(prog.p);
      gl.bindVertexArray(self.quadVAO);
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.disable(gl.BLEND);
      var unit = 0;
      if (uniforms) for (var k in uniforms) {
        var v = uniforms[k];
        if (v && v.tex !== undefined) { v.unit = unit; unit++; }
        self.u(prog, k, v);
      }
      if (target === "current") { /* keep the currently bound framebuffer/viewport */ }
      else if (target) { gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); gl.viewport(0, 0, target.w, target.h); }
      else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, self.w, self.h); }
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindVertexArray(null);
    };

    gfx.fso = function (key, vs, fs) { return self.prog(key, vs, fs); };

    self._gfx = gfx;
    return gfx;
  };

  Renderer.prototype.composite = function (hudTex, opts) {
    var gl = this.gl, f = this.fx;
    var gfx = this.gfx();
    // bloom
    var bright = this.prog("bright", S.fsVS, S.brightFS);
    var blur = this.prog("blur", S.fsVS, S.blurFS);
    gfx.fullscreen(bright, { uTex: { tex: this.scene.tex[0] }, uThresh: 0.62 }, this.bloomA);
    gfx.fullscreen(blur, { uTex: { tex: this.bloomA.tex[0] }, uDir: [1.0 / this._bloomW, 0] }, this.bloomB);
    gfx.fullscreen(blur, { uTex: { tex: this.bloomB.tex[0] }, uDir: [0, 1.0 / this._bloomH] }, this.bloomA);
    // composite
    var comp = this.prog("comp", S.fsVS, S.compFS);
    var rects = opts && opts.hudRects ? opts.hudRects : this.hudRects;
    gfx.fullscreen(comp, {
      uScene: { tex: this.scene.tex[0] }, uHud: { tex: hudTex }, uBloom: { tex: this.bloomA.tex[0] },
      uRes: [this.w, this.h], uTime: this.t,
      uFlash: f.flash, uGlitch: f.glitch, uDisp: f.disp, uBloomAmt: f.bloom, uHudAmt: f.hud,
      uStripes: f.stripes, uMood: f.mood, uMoodColor: f.moodColor, uMoodColor2: f.moodColor2,
      uFade: f.fade, uInvert: f.invert, uWhiteBar: f.whiteBar, uHudGlitch: f.hudGlitch,
      uShakeY: f.shakeY, uJump: f.jump, uGhost: f.ghost, uRects: rects, uExposure: f.exposure
    }, this.comp);
    // crt to screen
    var crt = this.prog("crt", S.fsVS, S.crtFS);
    gfx.fullscreen(crt, {
      uTex: { tex: this.comp.tex[0] }, uRes: [this.w, this.h], uTime: this.t,
      uCurve: f.curve, uScan: f.scan, uGrille: f.grille, uVig: f.vignette, uGrain: f.grain,
      uOn: f.crtOn, uOff: f.crtOff, uAberr: f.aberr, uRoll: f.roll
    }, null);
  };

  Renderer.prototype.decay = function (dt) {
    var f = this.fx;
    var k = function (v, rate, to) { return Math.max(to === undefined ? 0 : to, v * Math.pow(rate === undefined ? 0.001 : rate, dt)); };
    f.flash *= Math.pow(0.0005, dt);
    if (f.flash < 0.002) f.flash = 0;
    f.glitch *= Math.pow(0.002, dt); if (f.glitch < 0.002) f.glitch = 0;
    f.disp *= Math.pow(0.01, dt); if (f.disp < 0.002) f.disp = 0;
    f.whiteBar *= Math.pow(0.001, dt); if (f.whiteBar < 0.002) f.whiteBar = 0;
    f.hudGlitch *= Math.pow(0.01, dt); if (f.hudGlitch < 0.003) f.hudGlitch = 0;
    f.shakeY *= Math.pow(0.0008, dt); if (Math.abs(f.shakeY) < 0.0004) f.shakeY = 0;
    f.jump *= Math.pow(0.0008, dt); if (Math.abs(f.jump) < 0.0004) f.jump = 0;
    f.invert *= Math.pow(0.004, dt); if (f.invert < 0.003) f.invert = 0;
  };

  WEM.Renderer = Renderer;
  WEM.Shaders = S;
  WEM.GLSL = { trim: trim };
})();
