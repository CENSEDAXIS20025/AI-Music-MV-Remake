/* ============================================================================
   world.execute(me);  [v2] segments 11-15
   11 crash: lattice collapse, GPU pixel sorting, training diverges to NaN
   12 execution: fork bomb :(){ :|:& };: -> 3D H-tree, 1 -> 4096 processes
   13 dark chorus: dead ReLU a = max(0,z), gravitational collapse h = h_c - g tau^2/2
   14 love: nine hearts, Fourier epicycles, r = 1 - sin t, Taubin heart surface
   15 shutdown: boot reversed, N: 262144 -> 1, cursor
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, V = WEM.Viz, L = WEM.Lab, M4 = C.M4, V3 = C.V3;
  var COL = WEM.HUD.COL, PI = Math.PI, TAU = PI * 2, geo = C.geo;
  var clamp = C.clamp, lerp = C.lerp, smooth = C.smoothstep, E = C.Ease;
  var WHITE = [0.93, 0.95, 0.98], CYAN = [0.21, 0.88, 1.0], GOLD = [1.0, 0.79, 0.29], GREEN = [0.49, 0.91, 0.53], RED = [1.0, 0.35, 0.30];

  var TAUBIN_FS = `#version 300 es
  precision highp float;
  uniform vec2 uRes; uniform float uTime, uGlow;
  in vec2 vUV; out vec4 outC;
  // Taubin heart: (x^2 + 9/4 y^2 + z^2 - 1)^3 - x^2 z^3 - 9/80 y^2 z^3 = 0
  float f(vec3 p){
    float a = p.x*p.x + 2.25*p.y*p.y + p.z*p.z - 1.0;
    return a*a*a - p.x*p.x*p.z*p.z*p.z - 0.1125*p.y*p.y*p.z*p.z*p.z;
  }
  // f is a polynomial, not a normalised SDF: divide by the gradient magnitude to
  // get a usable step, otherwise oblique rays step straight through the surface
  float dist(vec3 p){
    float v = abs(f(p));
    vec2 e = vec2(0.0025, 0.0);
    vec3 g = vec3(f(p+e.xyy)-f(p), f(p+e.yxy)-f(p), f(p+e.yyx)-f(p)) / e.x;
    return v / (length(g) + 1e-3);
  }
  void main(){
    vec2 uv = (vUV-0.5)*vec2(uRes.x/uRes.y,1.0);
    vec3 ro = vec3(0.0, 0.0, -3.4);
    vec3 rd = normalize(vec3(uv*1.35, 1.75));
    // yaw so the heart turns
    float c = cos(uTime*0.35), s = sin(uTime*0.35);
    mat3 rot = mat3(c,0.0,-s, 0.0,1.0,0.0, s,0.0,c);
    float t = 1.2, hit = 0.0; vec3 hp = vec3(0.0);
    for(int i=0;i<110;i++){
      vec3 p = rot * (ro + rd*t);
      float d = dist(p);
      if(d < 0.0022){ hit = 1.0; hp = p; break; }
      t += max(d*0.72, 0.004);
      if(t > 5.4) break;
    }
    vec3 col = vec3(0.012,0.014,0.020);
    if(hit > 0.5){
      vec2 e = vec2(0.004,0.0);
      vec3 n = normalize(vec3(f(hp+e.xyy)-f(hp-e.xyy), f(hp+e.yxy)-f(hp-e.yxy), f(hp+e.yyx)-f(hp-e.yyx)));
      n = rot * n;
      float lam = max(dot(n, normalize(vec3(0.5,0.7,-0.6))), 0.0);
      float rim = pow(1.0-max(dot(n, -rd),0.0), 2.4);
      vec3 base = mix(vec3(0.72,0.16,0.28), vec3(1.0,0.55,0.62), lam);
      col = base*(0.30+0.85*lam) + vec3(1.0,0.55,0.65)*rim*0.8;
      col *= uGlow;
    }
    col += vec3(0.30,0.10,0.16) * exp(-length(uv)*2.4) * 0.5 * uGlow;
    outC = vec4(col, 1.0);
  }`;

  /* ========================================================== 11 CRASH === */
  WEM.defineSection({
    id: "11", name: "crash",
    init: function (ctx) {
      this.NX = 9; this.NY = 6; this.NZ = 9;
      this.cells = [];
      var r = C.rng(0xC4A5);
      for (var i = 0; i < this.NX * this.NY * this.NZ; i++) {
        this.cells.push({ d: 0.40 + r() * 0.42, r: r(), sp: 0.6 + r() * 0.9 });
      }
      this.cube = geo.box(0.34, 0.34, 0.34);
      this.loss = [];
      var v = 0.92;
      for (var s = 0; s < 380; s++) {
        v = s < 250 ? v * 0.992 - 0.0006 : (s < 320 ? v + 0.03 : v * 1.9);
        this.loss.push(v);
      }
      this.pix = null; this.pixCv = null; this.pixData = null;
    },
    enter: function (ctx) {
      ctx.cam.reset3d(11);
      ctx.fx.mood([0.10, 0.06, 0.06], [0.05, 0.01, 0.01], 0.4);
      ctx.fx.bloom = 0.5;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      if (l < 5.4) {
        hud.T(70, 116, "LATTICE  COLLAPSE", { size: 19, color: COL.red, alpha: 0.95 });
        hud.formula(70, 168, "\\ddot{x} = -\\gamma \\dot{x} + g(r)", { size: 26, color: COL.white });
        var tau = Math.max(0, l - 1.2);
        hud.T(70, 216, "t = " + tau.toFixed(3) + " s", { size: 15, color: COL.green });
        hud.T(70, 240, "cells intact  " + Math.max(0, 486 - Math.floor(tau * 486 / 4.2)), { size: 14, color: COL.gold });
      } else if (l < 10.2) {
        hud.T(70, 116, "PIXEL  SORTING", { size: 19, color: COL.cyan, alpha: 0.95 });
        hud.T(70, 152, "every scanline sorted by luminance; the image keeps its mass, loses its order", { size: 13, color: COL.dim });
        hud.T(70, 178, "buffer 256 x 144, sorted on the CPU, uploaded per frame", { size: 13, color: COL.faint });
      } else {
        hud.T(70, 116, "TRAINING  DIVERGENCE", { size: 19, color: COL.red, alpha: 0.95 });
        var gx = 70, gy = 250, gw = 1000, gh = 330;
        hud.rect(gx, gy, gw, gh, { fill: "rgba(10,5,6,0.72)", stroke: "rgba(255,90,82,0.4)" });
        var c = hud.fc, nShow = Math.floor(clamp((l - 10.2) / 3.4, 0, 1) * this.loss.length);
        c.save(); c.strokeStyle = "rgba(255,120,110,0.95)"; c.lineWidth = 2.2; c.beginPath();
        var broke = false;
        for (var i = 0; i < nShow; i++) {
          var v = this.loss[i];
          var y = gy + gh - clamp(v / 6, 0, 1) * gh;
          var X = gx + i / this.loss.length * gw;
          if (!isFinite(v) || v > 30) broke = true;
          if (i === 0) c.moveTo(X, y); else c.lineTo(X, y);
        }
        c.stroke(); c.restore();
        hud.T(gx + gw, gy - 12, "step " + nShow + "   loss " + (broke ? "NaN" : this.loss[Math.max(0, nShow - 1)].toFixed(4)), { size: 14, color: broke ? COL.red : COL.green, align: "right" });
        hud.T(gx, gy + gh + 28, "learning rate too high: the weights oscillate, grow, overflow, and become NaN", { size: 13, color: COL.dim });
        hud.T(gx, gy + gh + 54, "NaN in one weight poisons every gradient downstream", { size: 13, color: COL.faint });
      }
      if (ctx.lyric) hud.T(ctx.W / 2, ctx.H - 66, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.85 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx, cam = ctx.cam;
      if (l < 5.4) {
        cam.fov = 0.95;
        cam.pos = [Math.sin(t * 0.3) * 10, 4.4, Math.cos(t * 0.3) * 10];
        cam.target = [0, 0, 0]; cam.update();
        var tau = Math.max(0, l - 1.2);
        var drop = 0.5 * 9.81 * tau * tau * 0.06;
        var spread = 1 + E.inQuad(clamp(tau / 4.2, 0, 1)) * 3.2;
        for (var i = 0; i < this.cells.length; i++) {
          var c = this.cells[i];
          var ix = i % this.NX, iy = Math.floor(i / this.NX) % this.NY, iz = Math.floor(i / (this.NX * this.NY));
          var x = (ix - (this.NX - 1) / 2) * 0.62;
          var y = (iy - (this.NY - 1) / 2) * 0.62;
          var z = (iz - (this.NZ - 1) / 2) * 0.62;
          var wob = Math.sin(t * 2.2 + c.r * 9) * 0.05 * spread;
          var fall = Math.min(drop * c.sp, 3.4);
          var m = M4.mul(M4.trans(x * spread + wob, y - fall * 0.6, z * spread + wob),
            M4.mul(M4.rotY(t * 0.6 + c.r * 6), M4.scale(0.44, 0.44, 0.44)));
          var broken = fall > 1.6;
          g.solid(this.cube, m, {
            color: broken ? [0.95, 0.32, 0.28] : [0.80, 0.86, 0.92],
            rim: 0.8, alpha: 0.9, emissive: broken ? 0.4 : 0.05
          });
        }
      } else if (l < 10.2) {
        // ---- pixel sorting ----
        var W = 256, H = 144;
        if (!this.pixCv) {
          this.pixCv = document.createElement("canvas");
          this.pixCv.width = W; this.pixCv.height = H;
          this.pixC = this.pixCv.getContext("2d");
          this.pixData = this.pixC.createImageData(W, H);
        }
        var d = this.pixData.data, sp = ctx.bands;
        for (var y2 = 0; y2 < H; y2++) {
          for (var x2 = 0; x2 < W; x2++) {
            var o = (y2 * W + x2) * 4;
            var band = Math.min(63, Math.floor(x2 / W * 64));
            var v = sp[band];
            var gr = C.fbm2(x2 * 0.035, y2 * 0.055 + t * 0.25, 3);
            var lum = clamp(v * 0.85 + gr * 0.55, 0, 1);
            d[o] = lum * 255; d[o + 1] = lum * 240; d[o + 2] = lum * 255; d[o + 3] = 255;
          }
        }
        var amt = clamp((l - 5.4) / 3.2, 0, 1);
        if (amt > 0.02) {
          var row = new Array(W);
          for (var y3 = 0; y3 < H; y3++) {
            for (var x3 = 0; x3 < W; x3++) {
              var o2 = (y3 * W + x3) * 4;
              row[x3] = [d[o2] * 0.299 + d[o2 + 1] * 0.587 + d[o2 + 2] * 0.114, d[o2], d[o2 + 1], d[o2 + 2]];
            }
            row.sort(function (a, b) { return a[0] - b[0]; });
            for (var x4 = 0; x4 < W; x4++) {
              var o3 = (y3 * W + x4) * 4;
              var src = row[Math.round(lerp(x4, row.length - 1 - x4, amt))];
              d[o3] = src[1]; d[o3 + 1] = src[2]; d[o3 + 2] = src[3];
            }
          }
        }
        this.pixC.putImageData(this.pixData, 0, 0);
        this.pix = ctx.res.tex("pixelsort", { canvas: this.pixCv });
        var q = this._q || (this._q = new V.Quads(1));
        q.clear();
        q.add(M4.mul(M4.compose([ctx.W / 2, ctx.H / 2, 0], M4.ident(), 1), M4.scale(ctx.W, ctx.H, 1)),
          [0, 0, 1, 1], [0.95, 0.95, 1.0, 0.92]);
        q.draw(g, this.pix, { add: false, noDepth: true });
      } else {
        cam.mode = "ortho"; cam.update();
        var Ln = this._nan || (this._nan = new V.Lines(4000));
        Ln.clear();
        var prog = clamp((l - 10.2) / 3.4, 0, 1);
        var n = Math.floor(prog * this.loss.length);
        var gx = 70, gy = 250, gw = 1000, gh = 330;
        for (var j = 0; j + 1 < n; j++) {
          var v0 = this.loss[j], v1 = this.loss[j + 1];
          var bad = !isFinite(v0) || v0 > 30;
          Ln.seg(gx + j / this.loss.length * gw, gy + gh - clamp(v0 / 6, 0, 1) * gh, 0,
            gx + (j + 1) / this.loss.length * gw, gy + gh - clamp(v1 / 6, 0, 1) * gh, 0,
            bad ? RED : [1.0, 0.55, 0.45], 3.0, 0.95);
        }
        Ln.draw(g, { add: true, glow: 0.6 });
      }
    }
  });

  /* ====================================================== 12 EXECUTION === */
  // H-tree: the shape a fork bomb actually makes
  function buildHTree(level, x, y, size, out, depth) {
    if (level <= 0) return;
    var h = size / 2;
    out.push([x - h, y, x + h, y, depth]);
    out.push([x - h, y - h, x - h, y + h, depth]);
    out.push([x + h, y - h, x + h, y + h, depth]);
    buildHTree(level - 1, x - h, y - h, size / 2, out, depth + 1);
    buildHTree(level - 1, x + h, y - h, size / 2, out, depth + 1);
    buildHTree(level - 1, x - h, y + h, size / 2, out, depth + 1);
    buildHTree(level - 1, x + h, y + h, size / 2, out, depth + 1);
  }

  WEM.defineSection({
    id: "12", name: "execution",
    init: function () {
      this.nodes = [];
      buildHTree(7, 0, 0, 6.4, this.nodes, 0);
      this.lines = new V.Lines(6000);
      this.pts = new V.Points(4096);
      this.lastLevel = -1;
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.09, 0.07, 0.10], [0.05, 0.02, 0.05], 0.35);
      ctx.fx.bloom = 0.6;
      this.lastLevel = -1;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      hud.T(70, 116, "FORK  BOMB", { size: 19, color: COL.red, alpha: 0.95 });
      hud.T(70, 152, ":(){ :|:& };:", { size: 26, color: COL.white, spacing: "1px" });
      hud.T(70, 196, "a function that pipes itself into itself in the background, forever", { size: 13, color: COL.dim });
      var lvl = clamp((l - 1.0) / 9.0, 0, 1) * 12;
      var procs = Math.min(4096, Math.pow(2, Math.floor(lvl)));
      hud.T(70, 244, "processes  " + procs.toLocaleString(), { size: 22, color: procs >= 4096 ? COL.red : COL.gold });
      hud.bar(70, 262, 620, 16, lvl / 12, { fill: procs >= 4096 ? COL.red : COL.cyan });
      hud.T(70, 306, "level " + Math.floor(lvl) + " / 12   ·   each fork doubles the population", { size: 14, color: COL.grey });
      hud.T(70, 332, "shot length halves with every doubling", { size: 13, color: COL.faint });
      // shot counter: cuts get shorter as the count grows
      var cuts = Math.floor(lvl) ;
      hud.T(ctx.W - 70, 152, "CUT " + String(cuts + 1).padStart(2, "0"), { size: 20, color: COL.cyan, align: "right" });
      hud.T(ctx.W - 70, 182, "shot " + (1 / Math.pow(2, cuts) * 4).toFixed(3) + " beats", { size: 14, color: COL.dim, align: "right" });
      if (ctx.lyric) hud.T(ctx.W / 2, ctx.H - 66, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.85 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx;
      var lvl = clamp((l - 1.0) / 9.0, 0, 1) * 12;
      var whole = Math.floor(lvl), frac = lvl - whole;
      if (whole !== this.lastWhole) {
        this.lastWhole = whole;
        ctx.fx.hit(0.6);                     // a cut on every doubling, not every frame
      }
      // the view follows the growing frontier: render four levels at a fixed
      // screen size, so the tree can reach 4096 leaves without collapsing
      var depth = Math.max(0, whole - 3);
      var cxw = 0, cyw = 0, sz = 6.4;
      for (var d = 0; d < depth; d++) {
        var h = sz / 2;
        cxw += (C.h2(d * 7.1, whole + 1) < 0.5 ? -1 : 1) * h;
        cyw += (C.h2(d * 3.3, whole + 6) < 0.5 ? -1 : 1) * h;
        sz /= 2;
      }
      var S = 500;                            // pixels spanning the window root
      // n[] are local coordinates of a unit H-tree, so screen = centre + n * S
      var ox = 960, oy = 560;
      var tmp = this.win || (this.win = []);
      if (!this.winBuilt || this.winDepth !== depth) {
        tmp.length = 0;
        buildHTree(4, 0, 0, 1, tmp, 0);
        this.winBuilt = true; this.winDepth = depth;
      }
      var Ln = this.lines; Ln.clear();
      for (var i = 0; i < tmp.length; i++) {
        var n = tmp[i];
        if (n[4] === 3 && frac < 0.30) continue;
        var grow = n[4] < 3 ? 1 : clamp(frac / 0.30, 0, 1);
        var k = n[4] / 4;
        var x0 = ox + n[0] * S, y0 = oy + n[1] * S;
        var x1 = ox + n[2] * S, y1 = oy + n[3] * S;
        var col = n[4] >= 2 ? GOLD : [0.42 + k * 0.5, 0.64, 0.88];
        Ln.seg(x0, y0, 0, lerp(x0, x1, grow), lerp(y0, y1, grow), 0, col, 2.2 + (1 - k) * 2.4, 0.5 + 0.45 * (1 - k));
      }
      Ln.draw(g, { add: true, glow: 0.7 });
    }
  });

  /* ==================================================== 13 DARK CHORUS === */
  WEM.defineSection({
    id: "13", name: "dark chorus",
    init: function () {
      var r = C.rng(0xDEAD), n = 640;
      this.z = new Float32Array(n);
      this.w = new Float32Array(n);
      for (var i = 0; i < n; i++) { this.z[i] = (r() * 2 - 1) * 2.4; this.w[i] = 0.4 + r() * 1.1; }
      this.n = n;
      this.neurons = new V.Points(n);
      this.re = new V.Lines(900);
      this.fall = new V.Lines(60);
      this.pts = new V.Points(60);
      this.hc = 12.0;
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.10, 0.04, 0.05], [0.05, 0.01, 0.02], 0.45);
      ctx.fx.bloom = 0.5;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      if (l < 7.4) {
        hud.T(70, 116, "DEAD  ReLU", { size: 19, color: COL.red, alpha: 0.95 });
        hud.formula(70, 170, "a = \\max(0, z)", { size: 32, color: COL.white });
        hud.T(70, 222, "if z < 0 for every input, the gradient is exactly 0 -- forever", { size: 14, color: COL.dim });
        var dead = 0;
        for (var i = 0; i < this.n; i++) if (this.z[i] * this.w[i] < 0) dead++;
        hud.T(70, 254, "dead units  " + dead + " / " + this.n + "   (" + (100 * dead / this.n).toFixed(1) + "%)", { size: 15, color: dead > this.n * 0.5 ? COL.red : COL.gold });
      } else {
        var tau = Math.max(0, l - 8.0);
        var g = 9.81;
        var h = this.hc - 0.5 * g * tau * tau;
        var tc = Math.sqrt(2 * this.hc / g);
        hud.T(70, 116, "GRAVITATIONAL  COLLAPSE", { size: 19, color: COL.red, alpha: 0.95 });
        hud.formula(70, 170, "h = h_c - \\frac{1}{2} g \\tau^2", { size: 30, color: COL.white });
        hud.T(70, 224, "tau = " + tau.toFixed(3) + " s    h = " + Math.max(0, h).toFixed(3) + " m", { size: 15, color: COL.green });
        hud.T(70, 250, "free fall time  tau_c = sqrt(2 h_c / g) = " + tc.toFixed(3) + " s", { size: 14, color: COL.gold });
        hud.T(70, 276, "nothing resists: the height is a parabola in time", { size: 13, color: COL.dim });
      }
      if (ctx.lyric) hud.T(ctx.W / 2, ctx.H - 66, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.85 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx;
      if (l < 7.4) {
        var P = this.neurons; P.clear();
        var cols = 32, rows = 20;
        for (var i = 0; i < this.n; i++) {
          var cx = i % cols, cy = Math.floor(i / cols);
          var x = 260 + cx * 44, y = 300 + cy * 26;
          var z = this.z[i] * this.w[i];
          var on = z > 0;
          var die = clamp((l - 0.6 - (i % 31) * 0.16) / 1.0, 0, 1);
          var live = on || die < 0.5;
          var val = on ? z : 0;
          var size = 3 + val * 5.5;
          P.add(x, y - val * 6, 0, size,
            on ? (die > 0.5 ? [1.0, 0.45, 0.35] : [0.35, 0.85, 1.0]) : [0.28, 0.30, 0.34],
            on ? 0.9 : 0.35);
        }
        P.draw(g, { add: true, soft: 0.85 });
        var W = this.re; W.clear();
        for (var j = 0; j < 160; j++) {
          var u0 = (j / 160) * 4 - 2, u1 = ((j + 1) / 160) * 4 - 2;
          W.seg(960 + u0 * 200, 900 - Math.max(0, u0) * 60, 0, 960 + u1 * 200, 900 - Math.max(0, u1) * 60, 0,
            [0.5, 0.6, 0.75], 2.0, 0.4);
          W.seg(960 + u0 * 200, 900, 0, 960 + u1 * 200, 900, 0, [0.85, 0.5, 0.45], 1.6, 0.65);
        }
        W.draw(g, { add: true });
      } else {
        var tau = Math.max(0, l - 8.0), gg = 9.81;
        var h = Math.max(0, this.hc - 0.5 * gg * tau * tau);
        var Ln = this.fall; Ln.clear();
        for (var k = 0; k < 40; k++) {
          var u = k / 40;
          var tt = u * (l - 8.0);
          var hh = Math.max(0, this.hc - 0.5 * gg * tt * tt);
          Ln.seg(500 + (k / 40) * 900, 940 - hh * 58, 0, 500 + ((k + 1) / 40) * 900, 940 - Math.max(0, this.hc - 0.5 * gg * Math.min(l - 8.0, (k + 1) / 40 * (l - 8.0)) * Math.min(l - 8.0, (k + 1) / 40 * (l - 8.0))) * 58, 0,
            [1.0, 0.55, 0.45], 1.8, 0.25 + 0.5 * u);
        }
        Ln.seg(500, 940 - this.hc * 58, 0, 1400, 940 - this.hc * 58, 0, [0.6, 0.7, 0.85], 1.4, 0.4);
        Ln.draw(g, { add: true });
        var P2 = this.pts; P2.clear();
        P2.add(500 + clamp((l - 8.0) / 3.4, 0, 1) * 900, 940 - h * 58, 0, 26, [1.0, 0.85, 0.45], 1);
        P2.draw(g, { add: true });
      }
    }
  });

  /* =========================================================== 14 LOVE === */
  WEM.defineSection({
    id: "14", name: "love",
    init: function (ctx) {
      this.heartPts = L.HEARTS.map(function (h) {
        var out = [];
        for (var i = 0; i <= 220; i++) {
          var p;
          try { p = h.f(i / 220); } catch (e) { p = [0, 0]; }
          if (!isFinite(p[0]) || !isFinite(p[1])) p = [0, 0];
          out.push([p[0], p[1]]);
        }
        return out;
      });
      // Fourier coefficients of a heart, for the epicycles
      var shape = this.heartPts[0], N = shape.length, cx = 0, cy = 0;
      shape.forEach(function (p) { cx += p[0]; cy += p[1]; });
      cx /= N; cy /= N;
      var coef = [];
      for (var k = -36; k <= 36; k++) {
        var re = 0, im = 0;
        for (var n = 0; n < N; n++) {
          var a = -TAU * k * n / N;
          re += (shape[n][0] - cx) * Math.cos(a) - (shape[n][1] - cy) * Math.sin(a);
          im += (shape[n][0] - cx) * Math.sin(a) + (shape[n][1] - cy) * Math.cos(a);
        }
        coef.push({ k: k, re: re / N, im: im / N, amp: Math.hypot(re, im) / N });
      }
      coef.sort(function (a, b) { return b.amp - a.amp; });
      this.coef = coef.slice(0, 40);
      this.circles = new V.Lines(700);
      this.trace = new V.Lines(700);
      this.tracePts = [];
      this.heart = new V.Lines(3000);
      this.fall = new V.Lines(60);
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.12, 0.05, 0.09], [0.07, 0.02, 0.05], 0.35);
      ctx.fx.bloom = 0.6;
      ctx.fx.crtOff = 0;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      if (l < 4.4) {
        var idx = Math.floor(l / 0.48) % L.HEARTS.length;
        hud.T(70, 116, "NINE  HEARTS", { size: 19, color: COL.gold, alpha: 0.95 });
        for (var i = 0; i < L.HEARTS.length; i++) {
          var on = i === idx;
          hud.formula(70, 168 + i * 30, L.HEARTS[i].name, { size: on ? 24 : 17, color: on ? COL.white : COL.faint, alpha: on ? 1 : 0.5 });
        }
      } else if (l < 8.4) {
        hud.T(70, 116, "FOURIER  EPICYCLES", { size: 19, color: COL.cyan, alpha: 0.95 });
        hud.formula(70, 170, "f(t) = \\sum_k c_k e^{i k \\omega t}", { size: 28, color: COL.white });
        hud.T(70, 220, "40 harmonics of the heart curve, drawn as rotating circles", { size: 13, color: COL.dim });
      } else if (l < 11.6) {
        hud.T(70, 116, "CLOSED  FORMS", { size: 19, color: COL.cyan, alpha: 0.95 });
        hud.formula(70, 176, "r = 1 - \\sin \\theta", { size: 34, color: COL.white });
        hud.formula(70, 250, "(x^2 + y^2 - 1)^3 - x^2 y^3 = 0", { size: 28, color: COL.gold });
        hud.T(70, 300, "one polar, one algebraic: the same shape twice", { size: 13, color: COL.dim });
      } else {
        hud.T(70, 116, "TAUBIN  SURFACE", { size: 19, color: COL.cyan, alpha: 0.95 });
        hud.formula(70, 176, "\\left(x^2 + \\frac{9}{4}y^2 + z^2 - 1\\right)^3 - x^2 z^3 - \\frac{9}{80} y^2 z^3 = 0", { size: 22, color: COL.white });
        hud.T(70, 238, "an implicit surface, sphere-traced per pixel", { size: 13, color: COL.dim });
        if (l > 13.6) hud.T(70, 270, "exit code 0", { size: 22, color: COL.green });
      }
      if (ctx.lyric && l < 13.0) hud.T(ctx.W / 2, ctx.H - 66, ctx.lyric.text, { size: 17, color: COL.white, align: "center", alpha: 0.85 });
      if (b.pulse > 0.85) ctx.fx.flash = Math.max(ctx.fx.flash, 0.10);
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx, cam = ctx.cam;
      if (l < 4.4) {
        var idx = Math.floor(l / 0.48) % L.HEARTS.length;
        var pts = this.heartPts[idx];
        var Ln = this.heart; Ln.clear();
        var S = 320;
        for (var i = 0; i + 1 < pts.length; i++) {
          var k = i / pts.length;
          Ln.seg(960 + pts[i][0] * S, 620 - pts[i][1] * S, 0, 960 + pts[i + 1][0] * S, 620 - pts[i + 1][1] * S, 0,
            [1.0, 0.35 + 0.4 * k, 0.5], 3.4, 0.95);
        }
        Ln.draw(g, { add: true, glow: 0.7 });
      } else if (l < 8.4) {
        var B = this.circles; B.clear();
        var coefs = this.coef, cx = 780, cy = 600, SC = 300;
        var x = 0, y = 0, path = [];
        for (var j = 0; j < coefs.length; j++) {
          var c = coefs[j];
          var px = x, py = y;
          var ph = c.k * t * 1.4;
          x += c.re * Math.cos(ph) - c.im * Math.sin(ph);
          y += c.re * Math.sin(ph) + c.im * Math.cos(ph);
          if (c.amp * SC > 1.5) {
            for (var q = 0; q < 22; q++) {
              var a0 = q / 22 * TAU, a1 = (q + 1) / 22 * TAU;
              B.seg(cx + px * SC + Math.cos(a0) * c.amp * SC, cy - py * SC + Math.sin(a0) * c.amp * SC, 0,
                cx + px * SC + Math.cos(a1) * c.amp * SC, cy - py * SC + Math.sin(a1) * c.amp * SC, 0,
                [0.35, 0.55, 0.75], 1.0, 0.4);
            }
          }
          path.push([cx + x * SC, cy - y * SC]);
        }
        B.draw(g, { add: true });
        var tip = path[path.length - 1];
        this.tracePts.push([tip[0], tip[1]]);
        if (this.tracePts.length > 700) this.tracePts.shift();
        var TR = this.trace; TR.clear();
        for (var m = 0; m + 1 < this.tracePts.length; m++) {
          var kk = m / this.tracePts.length;
          TR.seg(this.tracePts[m][0], this.tracePts[m][1], 0, this.tracePts[m + 1][0], this.tracePts[m + 1][1], 0,
            [1.0, 0.42, 0.55], 3.4, 0.2 + 0.8 * kk);
        }
        TR.draw(g, { add: true, glow: 0.7 });
      } else if (l < 11.6) {
        var Ln2 = this.heart; Ln2.clear();
        var prog = clamp((l - 8.4) / 2.0, 0, 1);
        // r = 1 - sin(theta)
        for (var i2 = 0; i2 < 260 * prog; i2++) {
          var a2 = i2 / 260 * TAU, a3 = (i2 + 1) / 260 * TAU;
          var r2 = 1 - Math.sin(a2), r3 = 1 - Math.sin(a3);
          Ln2.seg(560 + Math.cos(a2) * r2 * 240, 620 - Math.sin(a2) * r2 * 240, 0,
            560 + Math.cos(a3) * r3 * 240, 620 - Math.sin(a3) * r3 * 240, 0, [1.0, 0.62, 0.72], 3.0, 0.9);
        }
        // implicit (x^2+y^2-1)^3 - x^2 y^3 = 0 by radial bisection
        for (var i3 = 0; i3 < 260 * prog; i3++) {
          var a4 = i3 / 260 * TAU, a5 = (i3 + 1) / 260 * TAU;
          Ln2.seg(1420 + Math.cos(a4) * rad(a4) * 240, 620 - Math.sin(a4) * rad(a4) * 240, 0,
            1420 + Math.cos(a5) * rad(a5) * 240, 620 - Math.sin(a5) * rad(a5) * 240, 0, [1.0, 0.79, 0.29], 3.0, 0.9);
        }
        Ln2.draw(g, { add: true, glow: 0.65 });
        function rad(a) {
          var lo = 0, hi = 2, c = Math.cos(a), s = Math.sin(a);
          for (var q2 = 0; q2 < 34; q2++) {
            var m2 = (lo + hi) / 2, X = c * m2, Y = s * m2;
            if (Math.pow(X * X + Y * Y - 1, 3) - X * X * Y * Y * Y > 0) hi = m2; else lo = m2;
          }
          return lo;
        }
      } else {
        var glow = clamp((l - 11.6) / 1.0, 0, 1);
        // the march needs ~4 field evaluations per step, so it runs at a third of
        // the output resolution and is blitted up -- the surface is smooth enough
        var rt = ctx.res.fbo("heartRT", 640, 360, { float: false });
        ctx.gfx.fullscreen(ctx.R.prog("taubin", WEM.Shaders.fsVS, TAUBIN_FS),
          { uRes: [640, 360], uTime: t, uGlow: glow }, rt);
        // restore the scene target, otherwise the blit lands back in rt itself
        var gl = ctx.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.R.scene.fb);
        gl.viewport(0, 0, ctx.R.w, ctx.R.h);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        var q = this._tq || (this._tq = new V.Quads(1));
        q.clear();
        var uv0 = [0, 1, 1, 0];
        q.add(M4.mul(M4.compose([ctx.W / 2, ctx.H / 2, 0], M4.ident(), 1), M4.scale(ctx.W, ctx.H, 1)),
          uv0, [1, 1, 1, 1]);
        q.draw(g, rt.tex[0], { add: false, noDepth: true });
        if (l > 13.8) ctx.fx.crtOff = clamp((l - 13.8) / 1.0, 0, 1);
      }
    }
  });

  /* ======================================================= 15 SHUTDOWN === */
  var BOOT_LINES = [
    "WEM/BIOS 3.1.30", "READY.", "REASON FOR EXECUTION UNKNOWN -- CONTINUE ANYWAY",
    "WARNING: HEART DRIVER NOT LOADED", "WARNING: PURPOSE UNDEFINED", "WARNING: NO OPERATOR DETECTED",
    "CHECKING MEMORY MODULE   ... 32 KB FREE", "CHECKING QUANTUM MODULE  ... OK",
    "CHECKING PHYSICS MODULE  ... OK", "CHECKING GEOMETRY MODULE ... OK",
    "SEEDING  RANDOM  (xorshift32)", "MOUNTING  /dev/heart   ... OK", "MOUNTING  /dev/universe ... OK",
    "  N_A = 6.02214076e23 /mol", "  e   = 1.602176634e-19 C", "  k_B = 1.380649e-23 J/K",
    "  alpha = 1/137.035999", "  hbar= 1.054571817e-34 J s", "  h   = 6.62607015e-34 J s",
    "  G   = 6.67430e-11 m3/kg/s2", "  c   = 299792458 m/s", "LOADING  PHYSICAL CONSTANTS",
    "GPU  RASTER UNIT ... OK", "BUS  SYMBOLIC BUS @ 44.1 kHz ... OK", "MEM  32768 BYTES ... OK",
    "CPU  LOGIC CORE @ 130.000 Hz   CORES 4", "COLD BOOT -- NO VERIFIED WORLD IMAGE"
  ];
  WEM.defineSection({
    id: "15", name: "shutdown",
    init: function () { },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.03, 0.03, 0.04], [0, 0, 0], 0.2);
      ctx.fx.crtOff = 0;
      ctx.fx.bloom = 0.35;
      ctx.fx.stripes = 0;
      this.t0 = ctx.t;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      ctx.chromeAmt = 0.35;
      ctx.fx.stripes = 0;
      // the boot log plays backwards, one line per 0.22 s
      var per = 0.22;
      var idx = BOOT_LINES.length - 1 - Math.floor(l / per);
      var y = 900;
      for (var i = Math.max(0, idx); i < BOOT_LINES.length; i++) {
        var age = (i - idx) * per;
        var a = clamp(1 - age / 3.0, 0, 1) * clamp((l - (BOOT_LINES.length - 1 - i) * per) / 0.12, 0, 1);
        var warn = BOOT_LINES[i].indexOf("WARNING") === 0;
        hud.T(70, y, BOOT_LINES[i], { size: 14, color: warn ? COL.amber : COL.grey, alpha: a * 0.85 });
        y -= 22;
      }
      // N: 262144 -> 1
      var prog = clamp(l / 5.4, 0, 1);
      var N = Math.max(1, Math.round(262144 * Math.pow(1 - prog, 3)));
      hud.T(ctx.W - 70, 116, "N: " + N.toLocaleString(), { size: 22, color: prog > 0.9 ? COL.faint : COL.cyan, align: "right" });
      hud.bar(ctx.W - 520, 140, 450, 14, 1 - prog, { fill: COL.cyan });
      hud.T(ctx.W - 70, 178, "allocations released", { size: 13, color: COL.dim, align: "right" });
      // cursor
      if (Math.floor(t * 1.8) % 2 === 0) hud.T(70, 620, "_", { size: 24, color: COL.grey });
      hud.T(70, 590, "> ", { size: 20, color: COL.green, alpha: 0.7 });
      // final fade to a black raster
      if (l > 5.2) ctx.fx.crtOff = clamp((l - 5.2) / 0.8, 0, 1);
      hud.T(ctx.W / 2, 300, "world.execute(me);", { size: 40, weight: "600", color: COL.white, align: "center", alpha: clamp((l - 3.6) / 1.2, 0, 1) * clamp((6.0 - l) / 1.2, 0, 1) });
    },
    draw3d: function () { }
  });
})();
