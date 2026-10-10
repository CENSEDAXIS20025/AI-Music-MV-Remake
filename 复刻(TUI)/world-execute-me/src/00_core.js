/* ============================================================================
   world.execute(me);  --  core: math, WebGL2 resource manager, draw primitives
   Zero dependencies. Classic script, global namespace WEM.
   ========================================================================== */
(function () {
  "use strict";
  var WEM = (window.WEM = window.WEM || {});
  var PI = Math.PI, TAU = PI * 2;

  /* ------------------------------------------------------------------ math */
  var V3 = {
    add: function (a, b, o) { o = o || [0, 0, 0]; o[0] = a[0] + b[0]; o[1] = a[1] + b[1]; o[2] = a[2] + b[2]; return o; },
    sub: function (a, b, o) { o = o || [0, 0, 0]; o[0] = a[0] - b[0]; o[1] = a[1] - b[1]; o[2] = a[2] - b[2]; return o; },
    mul: function (a, b, o) { o = o || [0, 0, 0]; o[0] = a[0] * b[0]; o[1] = a[1] * b[1]; o[2] = a[2] * b[2]; return o; },
    scale: function (a, s, o) { o = o || [0, 0, 0]; o[0] = a[0] * s; o[1] = a[1] * s; o[2] = a[2] * s; return o; },
    dot: function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; },
    cross: function (a, b, o) { o = o || [0, 0, 0]; var x = a[1] * b[2] - a[2] * b[1], y = a[2] * b[0] - a[0] * b[2], z = a[0] * b[1] - a[1] * b[0]; o[0] = x; o[1] = y; o[2] = z; return o; },
    len: function (a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]); },
    norm: function (a, o) { o = o || [0, 0, 0]; var l = V3.len(a) || 1; o[0] = a[0] / l; o[1] = a[1] / l; o[2] = a[2] / l; return o; },
    lerp: function (a, b, t, o) { o = o || [0, 0, 0]; o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o; },
    dist: function (a, b) { var x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2]; return Math.sqrt(x * x + y * y + z * z); }
  };

  var M4 = {
    ident: function (o) { o = o || new Float32Array(16); o.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); return o; },
    mul: function (a, b, o) {
      o = o || new Float32Array(16);
      var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
      for (var i = 0; i < 4; i++) {
        var b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
        o[i * 4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        o[i * 4 + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        o[i * 4 + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        o[i * 4 + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      }
      return o;
    },
    persp: function (fovy, asp, near, far, o) {
      o = o || new Float32Array(16);
      var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
      o.set([f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
      return o;
    },
    ortho: function (l, r, b, t, n, f, o) {
      o = o || new Float32Array(16);
      o.set([2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, -2 / (f - n), 0,
        -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1]);
      return o;
    },
    lookAt: function (eye, center, up, o) {
      o = o || new Float32Array(16);
      var z = V3.norm(V3.sub(eye, center)), x = V3.norm(V3.cross(up, z)), y = V3.cross(z, x);
      o.set([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
        -V3.dot(x, eye), -V3.dot(y, eye), -V3.dot(z, eye), 1]);
      return o;
    },
    trans: function (x, y, z, o) { o = M4.ident(o); o[12] = x; o[13] = y; o[14] = z; return o; },
    scale: function (x, y, z, o) { o = M4.ident(o); o[0] = x; o[5] = y; o[10] = z; return o; },
    rotX: function (a, o) { o = M4.ident(o); var c = Math.cos(a), s = Math.sin(a); o[5] = c; o[6] = s; o[9] = -s; o[10] = c; return o; },
    rotY: function (a, o) { o = M4.ident(o); var c = Math.cos(a), s = Math.sin(a); o[0] = c; o[2] = -s; o[8] = s; o[10] = c; return o; },
    rotZ: function (a, o) { o = M4.ident(o); var c = Math.cos(a), s = Math.sin(a); o[0] = c; o[1] = s; o[4] = -s; o[5] = c; return o; },
    rotAxis: function (axis, a, o) {
      o = M4.ident(o);
      var x = axis[0], y = axis[1], z = axis[2], l = Math.sqrt(x * x + y * y + z * z) || 1;
      x /= l; y /= l; z /= l;
      var c = Math.cos(a), s = Math.sin(a), t = 1 - c;
      o[0] = t * x * x + c; o[1] = t * x * y + s * z; o[2] = t * x * z - s * y;
      o[4] = t * x * y - s * z; o[5] = t * y * y + c; o[6] = t * y * z + s * x;
      o[8] = t * x * z + s * y; o[9] = t * y * z - s * x; o[10] = t * z * z + c;
      return o;
    },
    compose: function (pos, rotM, s, o) {
      o = M4.ident(o);
      var sx = Array.isArray(s) ? s[0] : s, sy = Array.isArray(s) ? s[1] : s, sz = Array.isArray(s) ? s[2] : s;
      for (var c = 0; c < 3; c++) { o[c * 4] = rotM[c * 4] * sx; o[c * 4 + 1] = rotM[c * 4 + 1] * sx; o[c * 4 + 2] = rotM[c * 4 + 2] * sx; o[c * 4 + 3] = rotM[c * 4 + 3] * sx; }
      for (var c2 = 0; c2 < 3; c2++) { o[c2 * 4] *= 1; }
      // scale columns properly
      var r = rotM;
      o.set([r[0] * sx, r[1] * sx, r[2] * sx, 0, r[4] * sy, r[5] * sy, r[6] * sy, 0,
        r[8] * sz, r[9] * sz, r[10] * sz, 0, pos[0], pos[1], pos[2], 1]);
      return o;
    },
    xform: function (m, v, o) {
      o = o || [0, 0, 0, 0];
      var x = v[0], y = v[1], z = v[2], w = v.length > 3 ? v[3] : 1;
      o[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
      o[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
      o[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
      o[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
      return o;
    },
    // quad that always faces the eye (local +z points at the camera)
    billboard: function (pos, eye, s, o) {
      o = o || new Float32Array(16);
      var z = V3.norm(V3.sub(pos, eye));
      var x = V3.norm(V3.cross([0, 1, 0], z));
      var y = V3.cross(z, x);
      o.set([x[0] * s, x[1] * s, x[2] * s, 0, y[0] * s, y[1] * s, y[2] * s, 0,
        z[0] * s, z[1] * s, z[2] * s, 0, pos[0], pos[1], pos[2], 1]);
      return o;
    },
    inv: function (m, o) {
      o = o || new Float32Array(16);
      var a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3], a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7],
        a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11], a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15],
        b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32,
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
      if (!det) return M4.ident(o);
      det = 1 / det;
      o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
      o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
      o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
      o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
      o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
      o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
      o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
      o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
      if (o[15]) { /* keep */ }
      return o;
    },
    transpose: function (m, o) {
      o = o || new Float32Array(16);
      for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) o[i * 4 + j] = m[j * 4 + i];
      return o;
    },
    normalMat3: function (m, o) { // inverse-transpose upper 3x3, packed as mat3
      o = o || new Float32Array(9);
      var a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
      var A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
      var det = a * A + b * B + c * C;
      if (!det) { o.set([1, 0, 0, 0, 1, 0, 0, 0, 1]); return o; }
      det = 1 / det;
      o[0] = A * det; o[1] = B * det; o[2] = C * det;
      o[3] = (-(b * i - c * h)) * det; o[4] = (a * i - c * g) * det; o[5] = (-(a * h - b * g)) * det;
      o[6] = (b * f - c * e) * det; o[7] = (-(a * f - c * d)) * det; o[8] = (a * e - b * d) * det;
      return o;
    }
  };

  var Ease = {
    linear: function (t) { return t; },
    inQuad: function (t) { return t * t; },
    outQuad: function (t) { return t * (2 - t); },
    inOutQuad: function (t) { return t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t; },
    inCubic: function (t) { return t * t * t; },
    outCubic: function (t) { var u = t - 1; return u * u * u + 1; },
    inOutCubic: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    outQuart: function (t) { return 1 - Math.pow(1 - t, 4); },
    outExpo: function (t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); },
    inExpo: function (t) { return t <= 0 ? 0 : Math.pow(2, 10 * t - 10); },
    outBack: function (t) { var c1 = 1.70158, c3 = c1 + 1, u = t - 1; return 1 + c3 * u * u * u + c1 * u * u; },
    outElastic: function (t) { var c4 = TAU / 3; return t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1; },
    outBounce: function (t) {
      var n1 = 7.5625, d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + .75;
      if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + .9375;
      return n1 * (t -= 2.625 / d1) * t + .984375;
    }
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smoothstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function mix(a, b, t) { return a + (b - a) * t; }

  // deterministic RNG (mulberry32)
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      var t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // value noise 2D/3D, deterministic
  function h2(x, y) { var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123; return n - Math.floor(n); }
  function h3(x, y, z) { var n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123; return n - Math.floor(n); }
  function noise2(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return mix(mix(h2(xi, yi), h2(xi + 1, yi), u), mix(h2(xi, yi + 1), h2(xi + 1, yi + 1), u), v);
  }
  function fbm2(x, y, oct) {
    var s = 0, a = .5, f = 1;
    for (var i = 0; i < (oct || 4); i++) { s += a * noise2(x * f, y * f); f *= 2.03; a *= .5; }
    return s;
  }

  /* --------------------------------------------------------------- GL res */
  function Res(gl) { this.gl = gl; this._p = {}; this._t = {}; this._f = {}; this._b = {}; this._v = {}; }

  Res.prototype.program = function (key, vs, fs, opts) {
    var c = this._p[key];
    if (c) return c;
    var gl = this.gl;
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        var log = gl.getShaderInfoLog(s);
        console.error("[shader:" + key + "]\n" + log + "\n" + src.split("\n").map(function (l, i) { return (i + 1) + ": " + l; }).join("\n"));
        throw new Error("shader compile " + key + ": " + log);
      }
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    var bind = WEM.ATTR_BIND || [];
    for (var bi = 0; bi < bind.length; bi++) gl.bindAttribLocation(p, bi, bind[bi]);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("link " + key + ": " + gl.getProgramInfoLog(p));
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) {
      var info = gl.getActiveUniform(p, i);
      var nm = info.name.replace(/\[0\]$/, "");
      u[nm] = gl.getUniformLocation(p, nm);
    }
    var a = {}, m = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
    for (var j = 0; j < m; j++) { var ai = gl.getActiveAttrib(p, j); a[ai.name] = gl.getAttribLocation(p, ai.name); }
    var rec = { p: p, u: u, a: a, key: key, opts: opts || {} };
    this._p[key] = rec;
    return rec;
  };

  Res.prototype.buf = function (key, data, target, usage) {
    var gl = this.gl, b = this._b[key];
    if (!b) { b = this._b[key] = { buf: gl.createBuffer(), size: 0, target: target || gl.ARRAY_BUFFER }; }
    if (data) {
      gl.bindBuffer(b.target, b.buf);
      gl.bufferData(b.target, data, usage || gl.DYNAMIC_DRAW);
      b.size = data.byteLength;
      b.count = data.length;
    }
    return b;
  };

  Res.prototype.tex = function (key, o) {
    var gl = this.gl, t = this._t[key];
    if (!t) {
      t = this._t[key] = { tex: gl.createTexture(), w: 0, h: 0, key: key };
    }
    var target = o.target || gl.TEXTURE_2D;
    gl.bindTexture(target, t.tex);
    if (o.canvas) {
      gl.texImage2D(target, 0, o.internal || gl.RGBA8, o.format || gl.RGBA, o.type || gl.UNSIGNED_BYTE, o.canvas);
      t.w = o.canvas.width; t.h = o.canvas.height;
    } else if (o.data) {
      gl.texImage2D(target, 0, o.internal || gl.RGBA8, o.w, o.h, 0, o.format || gl.RGBA, o.type || gl.UNSIGNED_BYTE, o.data);
      t.w = o.w; t.h = o.h;
    } else if (o.w && o.h) {
      gl.texImage2D(target, 0, o.internal || gl.RGBA8, o.w, o.h, 0, o.format || gl.RGBA, o.type || gl.UNSIGNED_BYTE, null);
      t.w = o.w; t.h = o.h;
    }
    var f = o.filter || gl.LINEAR;
    if (o.mips) { gl.generateMipmap(target); f = o.filter || gl.LINEAR_MIPMAP_LINEAR; }
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, o.mips ? f : (o.min || f));
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, o.wrap || gl.CLAMP_TO_EDGE);
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, (o.wrapT !== undefined ? o.wrapT : o.wrap) || gl.CLAMP_TO_EDGE);
    if (o.unpackFlip) gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    t.w = t.w || o.w; t.h = t.h || o.h;
    return t;
  };

  Res.prototype.fbo = function (key, w, h, o) {
    o = o || {};
    var gl = this.gl, f = this._f[key];
    if (f && f.w === w && f.h === h && f.float === !!o.float) return f;
    if (f) { gl.deleteFramebuffer(f.fb); f.tex.forEach(function (t) { gl.deleteTexture(t); }); if (f.depth) gl.deleteRenderbuffer(f.depth); }
    var n = o.count || 1;
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    var internal = o.float ? gl.RGBA16F : gl.RGBA8;
    var type = o.float ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    var texs = [], atts = [];
    for (var i = 0; i < n; i++) {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, gl.RGBA, type, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, o.nearest ? gl.NEAREST : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, o.nearest ? gl.NEAREST : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0);
      texs.push(t); atts.push(gl.COLOR_ATTACHMENT0 + i);
    }
    if (n > 1) gl.drawBuffers(atts);
    var depth = null;
    if (o.depth) {
      depth = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    }
    var st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error("fbo " + key + " incomplete: 0x" + st.toString(16));
    f = this._f[key] = { fb: fb, tex: texs, depth: depth, w: w, h: h, float: !!o.float, count: n };
    return f;
  };

  Res.prototype.vao = function (key, attrs, indexData) {
    var gl = this.gl, v = this._v[key];
    if (v) return v;
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    var buffers = {};
    for (var name in attrs) {
      var a = attrs[name];
      var b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, a.data, a.usage || gl.STATIC_DRAW);
      gl.enableVertexAttribArray(a.loc);
      gl.vertexAttribPointer(a.loc, a.size, a.type || gl.FLOAT, !!a.norm, a.stride || 0, a.offset || 0);
      buffers[name] = { buf: b, count: a.data.length / a.size, size: a.size };
    }
    var ib = null, icount = 0;
    if (indexData) {
      ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);
      icount = indexData.length;
    }
    gl.bindVertexArray(null);
    v = this._v[key] = { vao: vao, buffers: buffers, ib: ib, count: attrs.a ? attrs.a.data.length / attrs.a.size : icount, icount: icount };
    return v;
  };

  /* ------------------------------------------------------------ geometry */
  function makeMesh(pos, nrm, idx) {
    return { pos: pos, nrm: nrm, idx: idx };
  }

  function boxMesh(sx, sy, sz) {
    sx = sx || 1; sy = sy === undefined ? sx : sy; sz = sz === undefined ? sx : sz;
    var hx = sx / 2, hy = sy / 2, hz = sz / 2;
    var f = [
      [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz], [0, 0, 1]],
      [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz], [0, 0, -1]],
      [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz], [1, 0, 0]],
      [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz], [-1, 0, 0]],
      [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz], [0, 1, 0]],
      [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz], [0, -1, 0]]
    ];
    var pos = [], nrm = [], idx = [];
    f.forEach(function (face, fi) {
      var base = pos.length / 3;
      for (var i = 0; i < 4; i++) { pos.push(face[i][0], face[i][1], face[i][2]); nrm.push(face[4][0], face[4][1], face[4][2]); }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    });
    return makeMesh(new Float32Array(pos), new Float32Array(nrm), new Uint16Array(idx));
  }

  function gridMesh(nx, nz, size, y) {
    var pos = [], idx = [];
    for (var i = 0; i <= nx; i++) for (var j = 0; j <= nz; j++) {
      pos.push((i / nx - .5) * size, y || 0, (j / nz - .5) * size);
    }
    for (var i2 = 0; i2 < nx; i2++) for (var j2 = 0; j2 < nz; j2++) {
      var a = i2 * (nz + 1) + j2, b = a + 1, c = a + (nz + 1), d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    return makeMesh(new Float32Array(pos), null, new Uint32Array(idx));
  }

  function planeMesh(w, h, seg) {
    seg = seg || 1;
    var pos = [], nrm = [], idx = [], uv = [];
    for (var i = 0; i <= seg; i++) for (var j = 0; j <= seg; j++) {
      var u = i / seg, v = j / seg;
      pos.push((u - .5) * w, (v - .5) * h, 0); nrm.push(0, 0, 1); uv.push(u, v);
    }
    for (var i2 = 0; i2 < seg; i2++) for (var j2 = 0; j2 < seg; j2++) {
      var a = i2 * (seg + 1) + j2, b = a + 1, c = a + seg + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), idx: new Uint32Array(idx), uv: new Float32Array(uv) };
  }

  function icosphere(subdiv) {
    var t = (1 + Math.sqrt(5)) / 2;
    var verts = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
    var faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2],
      [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    var cache = {};
    function mid(a, b) {
      var k = Math.min(a, b) + "_" + Math.max(a, b);
      if (cache[k] !== undefined) return cache[k];
      var va = verts[a], vb = verts[b];
      verts.push([(va[0] + vb[0]) / 2, (va[1] + vb[1]) / 2, (va[2] + vb[2]) / 2]);
      cache[k] = verts.length - 1;
      return cache[k];
    }
    for (var s = 0; s < (subdiv || 0); s++) {
      var nf = [];
      for (var i = 0; i < faces.length; i++) {
        var f = faces[i], a = mid(f[0], f[1]), b = mid(f[1], f[2]), c = mid(f[2], f[0]);
        nf.push([f[0], a, c], [f[1], b, a], [f[2], c, b], [a, b, c]);
      }
      faces = nf;
    }
    var pos = [], idx = [];
    verts.forEach(function (v) { var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]); pos.push(v[0] / l * .5, v[1] / l * .5, v[2] / l * .5); });
    faces.forEach(function (f) { idx.push(f[0], f[1], f[2]); });
    return makeMesh(new Float32Array(pos), null, new Uint32Array(idx));
  }

  function torusMesh(R, r, nu, nv) {
    nu = nu || 48; nv = nv || 24;
    var pos = [], nrm = [], idx = [];
    for (var i = 0; i <= nu; i++) for (var j = 0; j <= nv; j++) {
      var u = i / nu * TAU, v = j / nv * TAU;
      var cx = Math.cos(u) * R, cz = Math.sin(u) * R;
      var x = Math.cos(u) * (R + r * Math.cos(v)), y = r * Math.sin(v), z = Math.sin(u) * (R + r * Math.cos(v));
      pos.push(x, y, z);
      nrm.push(x - cx, y, z - cz);
    }
    for (var i2 = 0; i2 < nu; i2++) for (var j2 = 0; j2 < nv; j2++) {
      var a = i2 * (nv + 1) + j2, b = a + 1, c = a + nv + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    var n = new Float32Array(nrm.length);
    for (var k = 0; k < nrm.length; k += 3) { var l = Math.hypot(nrm[k], nrm[k + 1], nrm[k + 2]) || 1; n[k] = nrm[k] / l; n[k + 1] = nrm[k + 1] / l; n[k + 2] = nrm[k + 2] / l; }
    return makeMesh(new Float32Array(pos), n, new Uint32Array(idx));
  }

  function trefoilMesh(tube, nu, nv) {
    tube = tube || .22; nu = nu || 220; nv = nv || 12;
    function curve(t) { return [Math.sin(t) + 2 * Math.sin(2 * t), Math.cos(t) - 2 * Math.cos(2 * t), -Math.sin(3 * t)]; }
    var pos = [], nrm = [], idx = [];
    var SC = .34;
    for (var i = 0; i <= nu; i++) {
      var t = i / nu * TAU;
      var p = curve(t), p2 = curve(t + .001);
      var T = V3.norm(V3.sub(p2, p));
      var N = V3.norm(V3.cross(T, [0, 0, 1]));
      var B = V3.cross(T, N);
      for (var j = 0; j <= nv; j++) {
        var a = j / nv * TAU, ca = Math.cos(a), sa = Math.sin(a);
        var nx = N[0] * ca + B[0] * sa, ny = N[1] * ca + B[1] * sa, nz = N[2] * ca + B[2] * sa;
        pos.push((p[0] + nx * tube) * SC, (p[1] + ny * tube) * SC, (p[2] + nz * tube) * SC);
        nrm.push(nx, ny, nz);
      }
    }
    for (var i2 = 0; i2 < nu; i2++) for (var j2 = 0; j2 < nv; j2++) {
      var a2 = i2 * (nv + 1) + j2, b = a2 + 1, c = a2 + nv + 1, d = c + 1;
      idx.push(a2, c, b, b, c, d);
    }
    return makeMesh(new Float32Array(pos), new Float32Array(nrm), new Uint32Array(idx));
  }

  function tetraMesh() {
    var v = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]].map(function (p) { return V3.scale(p, .5); });
    var pos = [], idx = [], f = [[0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]];
    v.forEach(function (p) { pos.push(p[0], p[1], p[2]); });
    f.forEach(function (t) { idx.push(t[0], t[1], t[2]); });
    return makeMesh(new Float32Array(pos), null, new Uint16Array(idx));
  }

  function cylinderMesh(r0, r1, h, n, caps) {
    n = n || 24;
    var pos = [], nrm = [], idx = [];
    for (var i = 0; i <= n; i++) {
      var a = i / n * TAU, c = Math.cos(a), s = Math.sin(a);
      pos.push(c * r0, -h / 2, s * r0); nrm.push(c, 0, s);
      pos.push(c * r1, h / 2, s * r1); nrm.push(c, 0, s);
    }
    for (var i2 = 0; i2 < n; i2++) {
      var a2 = i2 * 2, b = a2 + 1, c2 = a2 + 2, d = a2 + 3;
      idx.push(a2, c2, b, b, c2, d);
    }
    return makeMesh(new Float32Array(pos), new Float32Array(nrm), new Uint32Array(idx));
  }

  WEM.core = {
    PI: PI, TAU: TAU, V3: V3, M4: M4, Ease: Ease,
    clamp: clamp, lerp: lerp, mix: mix, smoothstep: smoothstep,
    rng: rng, noise2: noise2, fbm2: fbm2, h2: h2, h3: h3,
    Res: Res,
    // pack one instanced quad: 16 (mat4) + 4 (rgba) + 4 (uv rect) floats
    packQuad: function (arr, off, m, rect, rgba) {
      for (var i = 0; i < 16; i++) arr[off + i] = m[i];
      arr[off + 16] = rgba[0]; arr[off + 17] = rgba[1];
      arr[off + 18] = rgba[2]; arr[off + 19] = rgba[3];
      arr[off + 20] = rect[0]; arr[off + 21] = rect[1];
      arr[off + 22] = rect[2] - rect[0]; arr[off + 23] = rect[3] - rect[1];
    },
    geo: {
      box: boxMesh, grid: gridMesh, plane: planeMesh, ico: icosphere, torus: torusMesh,
      trefoil: trefoilMesh, tetra: tetraMesh, cylinder: cylinderMesh, make: makeMesh
    }
  };
})();
