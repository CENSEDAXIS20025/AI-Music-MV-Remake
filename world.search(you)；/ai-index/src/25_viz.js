/* ============================================================================
   world.execute(me);  --  viz: reusable builders and real computed curves
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, V3 = C.V3, M4 = C.M4, PI = Math.PI, TAU = PI * 2;

  /* ------------------------------------------------------- batch builders */
  function Lines(max) {
    this.max = max || 4096;
    this.data = new Float32Array(this.max * 12);
    this.n = 0;
  }
  // instance layout must match the shader attributes:
  //   aInstA = p0.xyz + w0   (floats 0..3)
  //   aInstB = p1.xyz + w1   (floats 4..7)
  //   aInstC = rgba          (floats 8..11)
  Lines.prototype.seg = function (ax, ay, az, bx, by, bz, col, w, alpha) {
    if (this.n >= this.max) return this;
    var o = this.n * 12, d = this.data;
    var ww = w === undefined ? 1.6 : w;
    d[o] = ax; d[o + 1] = ay; d[o + 2] = az; d[o + 3] = ww;
    d[o + 4] = bx; d[o + 5] = by; d[o + 6] = bz; d[o + 7] = ww;
    d[o + 8] = col[0]; d[o + 9] = col[1]; d[o + 10] = col[2];
    d[o + 11] = alpha === undefined ? 1 : alpha;
    this.n++;
    return this;
  };
  Lines.prototype.path = function (pts, col, w, alpha, closed) {
    for (var i = 0; i + 1 < pts.length; i++) {
      var a = pts[i], b = pts[i + 1];
      var aa = Array.isArray(alpha) ? (alpha[i] === undefined ? 1 : alpha[i]) : alpha;
      var ww = Array.isArray(w) ? (w[i] === undefined ? 1.6 : w[i]) : w;
      this.seg(a[0], a[1], a[2] === undefined ? 0 : a[2], b[0], b[1], b[2] === undefined ? 0 : b[2], col, ww, aa);
    }
    if (closed && pts.length > 2) {
      var p0 = pts[0], pl = pts[pts.length - 1];
      this.seg(pl[0], pl[1], pl[2] === undefined ? 0 : pl[2], p0[0], p0[1], p0[2] === undefined ? 0 : p0[2], col, w, alpha);
    }
    return this;
  };
  Lines.prototype.glow = function (o) {
    this.opts = o || { add: true, glow: 0.7 };
    return this;
  };
  Lines.prototype.view = function () { return this.data.subarray(0, this.n * 12); };
  Lines.prototype.draw = function (gfx, o) {
    if (!this.n) return;
    gfx.lines(this.view(), o || this.opts || {});
  };
  Lines.prototype.clear = function () { this.n = 0; return this; };

  function Points(max) {
    this.max = max || 20000;
    this.data = new Float32Array(this.max * 8);
    this.n = 0;
  }
  Points.prototype.add = function (x, y, z, size, col, alpha) {
    if (this.n >= this.max) return this;
    var o = this.n * 8, d = this.data;
    d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = size;
    d[o + 4] = col[0]; d[o + 5] = col[1]; d[o + 6] = col[2];
    d[o + 7] = alpha === undefined ? 1 : alpha;
    this.n++;
    return this;
  };
  Points.prototype.view = function () { return this.data.subarray(0, this.n * 8); };
  Points.prototype.draw = function (gfx, o) { if (this.n) gfx.points(this.view(), o || { add: true }); };
  Points.prototype.clear = function () { this.n = 0; return this; };

  function Quads(max) {
    this.max = max || 512;
    this.data = new Float32Array(this.max * 24);
    this.n = 0;
  }
  Quads.prototype.add = function (m, rect, rgba) {
    if (this.n >= this.max) return this;
    C.packQuad(this.data, this.n * 24, m, rect, rgba);
    this.n++;
    return this;
  };
  Quads.prototype.view = function () { return this.data.subarray(0, this.n * 24); };
  Quads.prototype.draw = function (gfx, tex, o) { if (this.n) gfx.quads(this.view(), tex, o || {}); };
  Quads.prototype.clear = function () { this.n = 0; return this; };

  /* ------------------------------------------------------------- curves */
  function sample(fn, a, b, n) {
    var out = [];
    for (var i = 0; i <= n; i++) {
      var t = a + (b - a) * i / n;
      var p = fn(t, i / n);
      out.push([p[0], p[1], p[2] === undefined ? 0 : p[2]]);
    }
    return out;
  }
  function helix(n, R, rise, turns, phase) {
    return sample(function (t) {
      var a = phase + t * TAU * turns;
      return [Math.cos(a) * R, -rise * 0.5 + rise * t, Math.sin(a) * R];
    }, 0, 1, n);
  }
  function circlePts(n, R, y, phase) {
    return sample(function (t) { var a = phase + t * TAU; return [Math.cos(a) * R, y || 0, Math.sin(a) * R]; }, 0, 1, n);
  }
  // 2D polar heart: (x^2+y^2-1)^3 - x^2 y^3 = 0 solved parametrically
  function heartCurve(n, s) {
    s = s || 1;
    return sample(function (t) {
      var a = t * TAU;
      var x = 16 * Math.pow(Math.sin(a), 3);
      var y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
      return [x / 16 * s, y / 16 * s, 0];
    }, 0, 1, n);
  }
  // heart SDF-ish implicit form for point clouds
  function heartImplicit(x, y) {
    var a = x * x + y * y - 1;
    return a * a * a - x * x * y * y * y;
  }
  function lorenz(n, dt, p0, sigma, rho, beta) {
    sigma = sigma || 10; rho = rho || 28; beta = beta || 8 / 3;
    var x = p0[0], y = p0[1], z = p0[2], out = [];
    for (var i = 0; i < n; i++) {
      var dx = sigma * (y - x), dy = x * (rho - z) - y, dz = x * y - beta * z;
      x += dx * dt; y += dy * dt; z += dz * dt;
      out.push([x, y, z]);
    }
    return out;
  }
  function pendulumState(th1, w1, th2, w2, dt, m1, m2, l1, l2, g) {
    // classic double pendulum, RK4
    function deriv(s) {
      var a1 = s[0], av1 = s[1], a2 = s[2], av2 = s[3];
      var d = a2 - a1, sd = Math.sin(d), cd = Math.cos(d);
      var den = m1 + m2 - m2 * cd * cd;
      var dw1 = (m2 * g * Math.sin(a2) * cd - m2 * sd * (l1 * av1 * av1 * cd + l2 * av2 * av2)
        - (m1 + m2) * g * Math.sin(a1)) / (l1 * den);
      var dw2 = ((m1 + m2) * (l1 * av1 * av1 * sd - g * Math.sin(a2) + g * Math.sin(a1) * cd)
        + m2 * l2 * av2 * av2 * sd * cd) / (l2 * den);
      return [av1, dw1, av2, dw2];
    }
    var s = [th1, w1, th2, w2];
    var k1 = deriv(s);
    var k2 = deriv([s[0] + k1[0] * dt / 2, s[1] + k1[1] * dt / 2, s[2] + k1[2] * dt / 2, s[3] + k1[3] * dt / 2]);
    var k3 = deriv([s[0] + k2[0] * dt / 2, s[1] + k2[1] * dt / 2, s[2] + k2[2] * dt / 2, s[3] + k2[3] * dt / 2]);
    var k4 = deriv([s[0] + k3[0] * dt, s[1] + k3[1] * dt, s[2] + k3[2] * dt, s[3] + k3[3] * dt]);
    for (var i = 0; i < 4; i++) s[i] += dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    return s;
  }
  // 4D rotation + projection for the tesseract
  function rot4(p, a, b, c, d) {
    var x = p[0], y = p[1], z = p[2], w = p[3], t;
    t = x * Math.cos(a) - w * Math.sin(a); w = x * Math.sin(a) + w * Math.cos(a); x = t;
    t = y * Math.cos(b) - z * Math.sin(b); z = y * Math.sin(b) + z * Math.cos(b); y = t;
    t = x * Math.cos(c) - y * Math.sin(c); y = x * Math.sin(c) + y * Math.cos(c); x = t;
    t = z * Math.cos(d) - w * Math.sin(d); w = z * Math.sin(d) + w * Math.cos(d); z = t;
    return [x, y, z, w];
  }
  function tesseractVerts() {
    var v = [];
    for (var i = 0; i < 16; i++) v.push([(i & 1) ? 1 : -1, (i & 2) ? 1 : -1, (i & 4) ? 1 : -1, (i & 8) ? 1 : -1]);
    return v;
  }
  function tesseractEdges() {
    var e = [];
    for (var i = 0; i < 16; i++) for (var b = 0; b < 4; b++) {
      var j = i ^ (1 << b);
      if (j > i) e.push([i, j]);
    }
    return e;
  }
  function sierpinskiTetra(depth) {
    var tris = [];
    var VT = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]];
    function rec(a, b, c, d, lv) {
      if (lv >= depth) { tris.push([a, b, c]); return; }
      var ab = V3.scale(V3.add(a, b), .5), bc = V3.scale(V3.add(b, c), .5), ca = V3.scale(V3.add(c, a), .5);
      var ad = V3.scale(V3.add(a, d), .5), bd = V3.scale(V3.add(b, d), .5), cd = V3.scale(V3.add(c, d), .5);
      rec(a, ab, ca, ad, lv + 1); rec(ab, b, bc, bd, lv + 1);
      rec(ca, bc, c, cd, lv + 1); rec(ad, bd, cd, d, lv + 1);
    }
    rec(VT[0], VT[1], VT[2], VT[3], 0);
    return tris;
  }
  function recursiveTree(depth, len, spread, rnd) {
    var segs = [];
    function rec(x, y, z, ang, tilt, l, d) {
      if (d === 0 || l < 0.02) return;
      var x2 = x + Math.cos(ang) * Math.cos(tilt) * l;
      var y2 = y + Math.sin(tilt) * l;
      var z2 = z + Math.sin(ang) * Math.cos(tilt) * l;
      segs.push([[x, y, z], [x2, y2, z2], d]);
      var k = 2 + Math.floor(rnd() * 2);
      for (var i = 0; i < k; i++) {
        rec(x2, y2, z2, ang + (rnd() - .5) * spread, tilt + (rnd() - .5) * spread * .8 + 0.12, l * (0.62 + rnd() * 0.16), d - 1);
      }
    }
    rec(0, -1.4, 0, 0, PI * 0.5, len, depth);
    return segs;
  }

  /* ---------------------------------------------------------- 2D helpers */
  function plot(fn, a, b, n, sx, sy) {
    var out = [];
    for (var i = 0; i <= n; i++) {
      var x = a + (b - a) * i / n;
      out.push([x * sx, fn(x) * sy, 0]);
    }
    return out;
  }

  /* ------------------------------------------------- big typeset formula */
  // renders a formula centred in panel i at full 512px resolution and returns
  // the geometry needed to place it in 3D (optionally extruded along z)
  function formulaPanel(ctx, i, texObj, o) {
    o = o || {};
    // callers pass the atlas texture third and the expression in o.tex; accept
    // either order so a mistake can never silently render an empty panel
    var expr = (typeof texObj === "string") ? texObj : o.tex;
    var p = ctx.hud.panel(i);
    p.clear(o.bg);
    var size = o.size || 120;
    var w = ctx.hud.measureFormula(expr, size);
    var maxW = p.w - 40;
    if (w > maxW && w > 0) { size = size * maxW / w; }
    ctx.hud.formula(p.w / 2, p.h / 2 + size * 0.30, expr, { size: size, color: o.color || "#eef2f6", align: "center", ctx: p.ctx });
    return { p: p, rect: p.rect, size: size, aspect: 1, expr: expr };
  }

  // a stack of quads faking an extruded solid glyph block
  function extrude(quads, rect4, model, o) {
    o = o || {};
    var layers = o.layers || 7, depth = o.depth === undefined ? 0.06 : o.depth;
    var tint = o.tint || [0.82, 0.86, 0.92];
    for (var i = layers - 1; i >= 0; i--) {
      var m = M4.mul(model, M4.trans(0, 0, -depth * i));
      var k = 0.30 + 0.70 * (1 - i / layers);
      quads.add(m, rect4, o.shadow && i === 0 ? [1, 1, 1, 1] : [tint[0] * k, tint[1] * k, tint[2] * k, 1]);
    }
    return quads;
  }

  WEM.Viz = {
    Lines: Lines, Points: Points, Quads: Quads,
    sample: sample, helix: helix, circlePts: circlePts, heartCurve: heartCurve,
    heartImplicit: heartImplicit, lorenz: lorenz, pendulumState: pendulumState,
    rot4: rot4, tesseractVerts: tesseractVerts, tesseractEdges: tesseractEdges,
    sierpinskiTetra: sierpinskiTetra, recursiveTree: recursiveTree, plot: plot,
    formulaPanel: formulaPanel, extrude: extrude
  };
})();
