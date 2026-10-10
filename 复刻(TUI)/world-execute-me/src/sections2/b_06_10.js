/* ============================================================================
   world.execute(me);  [v2] segments 06-10
   06 everything is a point: eggplant USDA flow, lycopene 444/472/503,
      Schroedinger cat, exists-unique proof
   07 swap: F -> M three bit flips, 12-hour double cover, braid sigma_1,
      moire, superellipse
   08 vibration: million-grain Chladni, Lissajous, Bessel J4 mode
   09 fragments: heap compaction, Voronoi shatter, Dijkstra cracks
   10 illegal arguments: real errors and stacks, IEEE-754 to NaN, context overflow
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, V = WEM.Viz, L = WEM.Lab, M4 = C.M4, V3 = C.V3;
  var COL = WEM.HUD.COL, PI = Math.PI, TAU = PI * 2;
  var clamp = C.clamp, lerp = C.lerp, smooth = C.smoothstep, E = C.Ease;
  var WHITE = [0.93, 0.95, 0.98], CYAN = [0.21, 0.88, 1.0], GOLD = [1.0, 0.79, 0.29], GREEN = [0.49, 0.91, 0.53];

  /* ================================================ 06 EVERYTHING POINT === */
  WEM.defineSection({
    id: "06", name: "everything is a point",
    init: function (ctx) {
      this.flow = L.EGGPLANT;
      this.flowL = new V.Lines(700);
      this.flowP = new V.Points(400);
      this.spec = new V.Lines(420);
      this.cat = new V.Points(900);
      this.catL = new V.Lines(400);
      this.proof = [];
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.08, 0.07, 0.10], [0.04, 0.03, 0.06], 0.25);
      ctx.fx.bloom = 0.45;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      // sub-phase boundaries
      if (l < 3.6) {
        hud.T(70, 116, "EGGPLANT  ·  USDA NUTRIENT FLOW", { size: 18, color: COL.green, alpha: 0.95 });
        hud.T(70, 148, "raw, per 100 g  ·  FoodData Central 11053", { size: 13, color: COL.dim });
      } else if (l < 7.2) {
        hud.T(70, 116, "TOMATO  ·  LYCOPENE", { size: 18, color: COL.red, alpha: 0.95 });
        hud.formula(70, 168, "\\lambda_{max} = 444,\\ 472,\\ 503\\ \\mathrm{nm}", { size: 28, color: COL.white });
        hud.T(70, 216, "absorption in hexane  ·  the colour you see is what is left", { size: 13, color: COL.dim });
      } else if (l < 10.8) {
        hud.T(70, 116, "CAT  ·  SUPERPOSITION", { size: 18, color: COL.cyan, alpha: 0.95 });
        hud.formula(70, 168, "|\\psi\\rangle = \\frac{1}{\\sqrt{2}}\\left(|\\mathrm{alive}\\rangle + |\\mathrm{dead}\\rangle\\right)", { size: 30, color: COL.white });
      } else {
        hud.T(70, 116, "GOD  ·  UNIQUE EXISTENCE", { size: 18, color: COL.gold, alpha: 0.95 });
        hud.formula(70, 168, "\\exists! x\\, P(x) \\;\\equiv\\; \\exists x\\, P(x) \\wedge \\forall y \\forall z\\, (P(y) \\wedge P(z) \\to y = z)", { size: 22, color: COL.white });
      }
      if (ctx.lyric) hud.T(ctx.W / 2, ctx.H - 66, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.85 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx, cam = ctx.cam;
      cam.mode = "ortho"; cam.update();
      if (l < 3.6) {
        // ---- USDA flow: one source, eight nutrient sinks ----
        var FLn = this.flowL, FP = this.flowP;
        FLn.clear(); FP.clear();
        var total = 0, i;
        for (i = 0; i < this.flow.length; i++) total += this.flow[i].g;
        var x0 = 620, y0 = 540, x1 = 1320;
        var y = 200;
        var grow = clamp(l / 2.8, 0, 1);
        for (i = 0; i < this.flow.length; i++) {
          var f = this.flow[i];
          var share = f.g / total;
          var h = Math.max(3, share * 640);
          var target = y + h / 2;
          var t1 = clamp((l - 0.5 - i * 0.16) / 0.9, 0, 1);
          var tx = lerp(x0 + 60, x1, E.outCubic(t1)) * 1 + 0;
          var cx1 = lerp(x0 + 60, x0 + 160, t1);
          FLn.seg(x0, y0, 0, cx1, lerp(y0, target, t1), 0, f.c, Math.max(4, h * 0.42), 0.85);
          FLn.seg(cx1, lerp(y0, target, t1), 0, tx, target, 0, f.c, Math.max(3, h * 0.38), 0.85 * t1);
          FP.add(tx + 6, target, 0, 10 + share * 120, f.c, 0.95);
          y += h + 12;
        }
        FP.add(x0 - 6, y0, 0, 34, [0.55, 0.42, 0.80], 1);
        FLn.draw(g, { add: true, glow: 0.4 });
        FP.draw(g, { add: true });
      } else if (l < 7.2) {
        // ---- lycopene absorption spectrum ----
        var W = this.spec; W.clear();
        var gx = 300, gy = 900, gw = 1320, gh = 420;
        for (var w = 0; w < 400; w++) {
          var nm0 = 380 + w / 400 * 220, nm1 = 380 + (w + 1) / 400 * 220;
          var a0 = L.lycopeneAbs(nm0), a1 = L.lycopeneAbs(nm1);
          var X0 = gx + (nm0 - 380) / 220 * gw, X1 = gx + (nm1 - 380) / 220 * gw;
          W.seg(X0, gy, 0, X1, gy, 0, [0.25, 0.28, 0.34], 1.2, 0.5);
          W.seg(X0, gy - a0 * gh, 0, X1, gy - a1 * gh, 0, [1.0, 0.55, 0.30], 3.0, 0.95);
        }
        for (var p = 0; p < L.LYCOPENE.peaks.length; p++) {
          var nm = L.LYCOPENE.peaks[p];
          var X = gx + (nm - 380) / 220 * gw;
          W.seg(X, gy, 0, X, gy - gh * 1.02, 0, [0.42, 0.85, 1.0], 1.6, 0.55);
        }
        W.draw(g, { add: true, glow: 0.5 });
      } else if (l < 10.8) {
        // ---- Schroedinger cat: two basis states and their interference ----
        var P = this.cat, W2 = this.catL;
        P.clear(); W2.clear();
        for (var i2 = 0; i2 < 900; i2++) {
          var u = i2 / 900;
          var x = -1 + 2 * u;
          var psi = Math.cos(PI * x * 3.0) * Math.exp(-x * x * 3.2);
          var alive = Math.max(0, psi), dead = Math.max(0, -psi);
          var ph = 0.5 + 0.5 * Math.sin(t * 2.2 - u * 9.0);
          P.add(x * 620 + 960, 420 - alive * 300 * ph, 0, 4 + alive * 26, [0.35, 0.85, 1.0], 0.3 + alive * 1.6);
          P.add(x * 620 + 960, 640 + dead * 300 * ph, 0, 4 + dead * 26, [1.0, 0.42, 0.38], 0.3 + dead * 1.6);
        }
        W2.seg(340, 540, 0, 1580, 540, 0, [0.5, 0.55, 0.62], 1.4, 0.5);
        W2.draw(g, { add: true });
        P.draw(g, { add: true, soft: 0.85 });
      } else {
        // ---- exists-unique proof tree ----
        var Ln = this.flowL; Ln.clear();
        var boxes = [
          [960, 900, "\\exists! x\\, P(x)"],
          [480, 720, "\\exists x\\, P(x)"],
          [1440, 720, "\\forall y \\forall z\\, (P(y) \\wedge P(z) \\to y=z)"],
          [240, 540, "[a]\\ P(a)"],
          [860, 540, "\\forall y\\, (P(y) \\to y = a)"],
          [1240, 540, "[b,c]\\ P(b) \\wedge P(c)"],
          [1660, 540, "b = c"]
        ];
        var prog = clamp((l - 10.8) / 3.0, 0, 1);
        var shown = Math.ceil(prog * boxes.length);
        for (var bi = 1; bi < shown; bi++) {
          var par = bi === 1 || bi === 2 ? 0 : (bi === 3 ? 1 : (bi === 4 ? 1 : (bi === 5 ? 2 : 2)));
          Ln.seg(boxes[par][0], boxes[par][1] + 26, 0, boxes[bi][0], boxes[bi][1] - 26, 0, [0.55, 0.62, 0.72], 1.6, 0.7);
        }
        Ln.draw(g, { add: true });
      }
    }
  });

  /* =========================================================== 07 SWAP === */
  WEM.defineSection({
    id: "07", name: "swap",
    init: function () {
      this.moire = new V.Lines(600);
      this.braid = new V.Lines(600);
      this.super = new V.Lines(2000);
      this.bits = new V.Points(40);
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.06, 0.10, 0.20], [0.02, 0.05, 0.14], 0.55);   // deep blue segment
      ctx.fx.bloom = 0.6;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      if (l < 3.4) {
        var F = 0x46, M = 0x4D, X = F ^ M;
        hud.T(70, 116, "SWAP  ·  F -> M", { size: 19, color: COL.cyan, alpha: 0.95 });
        hud.T(70, 170, "'F' = 0x46 = " + L.bits8(F), { size: 20, color: COL.white });
        hud.T(70, 204, "'M' = 0x4D = " + L.bits8(M), { size: 20, color: COL.white });
        hud.T(70, 238, "XOR     = " + L.bits8(X) + "   popcount = " + L.popcount(X), { size: 20, color: COL.gold });
        hud.T(70, 288, "exactly " + L.popcount(X) + " bits differ: gender is a three-bit edit", { size: 15, color: COL.dim });
      } else if (l < 6.6) {
        hud.T(70, 116, "12-HOUR CLOCK  ·  A DOUBLE COVER", { size: 19, color: COL.cyan, alpha: 0.95 });
        hud.formula(70, 170, "p : \\mathbb{R} \\to S^1, \\quad t \\mapsto t \\bmod 12\\mathrm{h}", { size: 26, color: COL.white });
        hud.T(70, 222, "the day wraps the dial twice: AM and PM are two sheets of one circle", { size: 14, color: COL.dim });
        hud.T(70, 250, "one day = 2 x 12 h  ·  winding number 2", { size: 14, color: COL.green });
      } else if (l < 9.6) {
        hud.T(70, 116, "BRAID GROUP  B_n", { size: 19, color: COL.cyan, alpha: 0.95 });
        hud.formula(70, 170, "\\sigma_1 \\sigma_2 \\sigma_1 = \\sigma_2 \\sigma_1 \\sigma_2", { size: 30, color: COL.gold });
        hud.T(70, 222, "two strands cross; the crossing cannot be undone without crossing back", { size: 14, color: COL.dim });
      } else if (l < 12.4) {
        hud.T(70, 116, "MOIRE  ·  TWO GRATINGS BEAT", { size: 19, color: COL.cyan, alpha: 0.95 });
        hud.formula(70, 170, "f_{moire} = |f_1 - f_2|", { size: 28, color: COL.white });
        hud.T(70, 222, "the pattern you see is the difference, not the lines", { size: 14, color: COL.dim });
      } else {
        hud.T(70, 116, "SUPERELLIPSE", { size: 19, color: COL.cyan, alpha: 0.95 });
        hud.formula(70, 170, "|x|^n + |y|^n = r^n", { size: 32, color: COL.white });
        var n = [0.6, 1, 2, 4, 8][Math.floor(clamp((l - 12.4) / 0.5, 0, 4.99))];
        hud.T(70, 226, "n = " + n + (n === 1 ? "   (a diamond)" : n === 2 ? "   (a circle)" : n > 2 ? "   (a squircle)" : "   (a hypocycloid)"), { size: 15, color: COL.green });
      }
      if (ctx.lyric) hud.T(ctx.W / 2, ctx.H - 66, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.85 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx;
      if (l < 3.4) {
        var F = 0x46, M = 0x4D;
        var P = this.bits; P.clear();
        for (var i = 0; i < 8; i++) {
          var bitF = (F >> (7 - i)) & 1, bitM = (M >> (7 - i)) & 1;
          var differs = bitF !== bitM;
          var flip = clamp((l - 0.7 - i * 0.24) / 0.5, 0, 1);
          var shown = differs ? (flip > 0.5 ? bitM : bitF) : bitF;
          P.add(500 + i * 115, 560, 0, 30, differs ? (flip > 0.5 ? [1.0, 0.79, 0.29] : [1.0, 0.42, 0.38]) : [0.55, 0.62, 0.70], shown ? 1 : 0.28);
        }
        P.draw(g, { add: true });
      } else if (l < 6.6) {
        // two clock faces stacked, one covering the other
        var Ln = this.braid; Ln.clear();
        var cx = 960, cy = 620, R = 200;
        for (var f2 = 0; f2 < 2; f2++) {
          var yy = cy - f2 * 120;
          for (var m = 0; m < 60; m++) {
            var a0 = m / 60 * TAU, a1 = (m + 1) / 60 * TAU;
            var big = m % 5 === 0;
            Ln.seg(cx + Math.cos(a0) * R, yy + Math.sin(a0) * R, f2 * 2,
              cx + Math.cos(a1) * R, yy + Math.sin(a1) * R, f2 * 2,
              big ? [0.85, 0.90, 0.96] : [0.35, 0.42, 0.52], big ? 2.0 : 1.0, 0.85 - f2 * 0.25);
          }
          var ang = (t * (f2 ? 2.0 : 1.0)) % TAU;
          Ln.seg(cx, yy, f2 * 2, cx + Math.cos(-ang + PI / 2) * R * 0.7, yy + Math.sin(-ang + PI / 2) * R * 0.7, f2 * 2,
            f2 ? GOLD : CYAN, 3.0, 0.95);
        }
        Ln.draw(g, { add: true, glow: 0.5 });
      } else if (l < 9.6) {
        var Ln2 = this.braid; Ln2.clear();
        var x0 = 480, wdt = 320;
        for (var s = 0; s < 3; s++) {
          for (var j = 0; j < 90; j++) {
            var u0 = j / 90, u1 = (j + 1) / 90;
            var y0 = 300 + u0 * 560, y1 = 300 + u1 * 560;
            var A0 = strand(s, u0, t), A1 = strand(s, u1, t);
            Ln2.seg(x0 + A0 * wdt, y0, 0, x0 + A1 * wdt, y1, 0,
              s === 0 ? CYAN : s === 1 ? GOLD : [0.75, 0.82, 0.92], 4.0, 0.9);
          }
        }
        Ln2.draw(g, { add: true, glow: 0.5 });
        function strand(s, u, tt) {
          var ph = tt * 0.7;
          return 0.9 * Math.sin(u * 6.0 + ph + s * TAU / 3);
        }
      } else if (l < 12.4) {
        var Ln3 = this.moire; Ln3.clear();
        for (var k = 0; k < 150; k++) {
          var x = 260 + k * 9.4;
          Ln3.seg(x, 220, 0, x + 40, 900, 0, [0.42, 0.62, 0.85], 1.6, 0.55);
          var x2 = 260 + k * 9.4 * 1.06 + Math.sin(k * 0.1 + t * 0.6) * 8;
          Ln3.seg(x2, 220, 1, x2 + 360, 900, 1, [0.85, 0.78, 0.55], 1.6, 0.5);
        }
        Ln3.draw(g, { add: true });
      } else {
        var Ln4 = this.super; Ln4.clear();
        var ns = [0.6, 1, 2, 4, 8];
        var idx = clamp(Math.floor((l - 12.4) / 0.5), 0, 4);
        for (var q = 0; q < ns.length; q++) {
          if (q > idx) break;
          var n = ns[q], R = 150 + q * 60;
          var col = q === idx ? WHITE : [0.35, 0.42, 0.52];
          var alpha = q === idx ? 0.95 : 0.4;
          for (var a = 0; a < 200; a++) {
            var u0 = a / 200 * TAU, u1 = (a + 1) / 200 * TAU;
            var p0 = superPt(n, u0, R), p1 = superPt(n, u1, R);
            Ln4.seg(960 + p0[0], 580 + p0[1], 0, 960 + p1[0], 580 + p1[1], 0, col, q === idx ? 3.2 : 1.6, alpha);
          }
        }
        Ln4.draw(g, { add: true, glow: 0.45 });
        function superPt(n, a, R) {
          var c = Math.cos(a), s = Math.sin(a);
          var x = Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * R;
          var y = Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * R;
          return [x, y];
        }
      }
    }
  });

  /* ====================================================== 08 VIBRATION === */
  WEM.defineSection({
    id: "08", name: "vibration",
    init: function () {
      this.grains = new V.Points(26000);
      this.k = 0;
      // Bessel J4 fifth zero, computed by bisection on the series
      this.j45 = L.besselZero(4, 5);
      this.bessel = new V.Lines(6000);
      this.lissa = new V.Lines(1400);
      var r = C.rng(8080);
      this.seedX = new Float32Array(26000);
      this.seedY = new Float32Array(26000);
      for (var i = 0; i < 26000; i++) { this.seedX[i] = r(); this.seedY[i] = r(); }
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.07, 0.08, 0.11], [0.03, 0.04, 0.07], 0.3);
      ctx.fx.bloom = 0.5;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      if (l < 6.2) {
        var modes = [[1, 2], [2, 3], [1, 4], [3, 5], [2, 6], [4, 7]];
        var mi = Math.floor(l / 1.0) % modes.length;
        var m = modes[mi][0], n = modes[mi][1];
        hud.T(70, 116, "CHLADNI PLATE  ·  1,000,000 GRAINS", { size: 18, color: COL.cyan, alpha: 0.95 });
        hud.formula(70, 170, "\\cos n\\pi x \\cos m\\pi y - \\cos m\\pi x \\cos n\\pi y = 0", { size: 22, color: COL.white });
        hud.T(70, 216, "mode (m, n) = (" + m + ", " + n + ")", { size: 16, color: COL.gold });
        hud.T(70, 244, "grains migrate to the nodal lines and stop there", { size: 13, color: COL.dim });
        hud.T(70, 272, "resonance  " + (m * m + n * n) + " x f0", { size: 14, color: COL.green });
      } else if (l < 10.0) {
        hud.T(70, 116, "LISSAJOUS", { size: 18, color: COL.cyan, alpha: 0.95 });
        hud.formula(70, 170, "x = A\\sin(at + \\delta), \\quad y = B\\sin(bt)", { size: 26, color: COL.white });
        var a = 3, bb = 2;
        hud.T(70, 222, "a : b = " + a + " : " + bb + "   ->   the curve closes after " + a + " x " + bb + " periods", { size: 14, color: COL.green });
      } else {
        hud.T(70, 116, "BESSEL MODE", { size: 18, color: COL.cyan, alpha: 0.95 });
        hud.formula(70, 170, "J_4(j_{4,5} r)\\cos 4\\theta", { size: 30, color: COL.white });
        hud.T(70, 224, "j_{4,5} = " + this.j45.toFixed(6) + "   (fifth zero of J4, found by bisection)", { size: 14, color: COL.green });
        hud.T(70, 250, "four nodal diameters and five nodal circles", { size: 13, color: COL.dim });
      }
      if (ctx.lyric) hud.T(ctx.W / 2, ctx.H - 66, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.85 });
      if (b.isDownbeat && l < 6.2) ctx.fx.flash = Math.max(ctx.fx.flash, 0.16);
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx;
      if (l < 6.2) {
        var modes = [[1, 2], [2, 3], [1, 4], [3, 5], [2, 6], [4, 7]];
        var mi = Math.floor(l / 1.0) % modes.length;
        var m = modes[mi][0], n = modes[mi][1];
        var P = this.grains; P.clear();
        var cx = 960, cy = 580, S = 470;
        var settle = clamp((l % 1.0) / 0.55, 0, 1);
        var sigma = (1 - E.outCubic(settle)) * 0.10 + 0.004;
        for (var i = 0; i < 26000; i++) {
          var x = this.seedX[i] * 2 - 1, y = this.seedY[i] * 2 - 1;
          var v = L.chladni(m, n, x, y);
          // grains drift toward |v| = 0 (nodal lines), with the plate shaking
          var shake = 1 - E.outCubic(settle);
          var pull = v * 0.16 * settle;
          var gx = x - pull * Math.sign(x) * 0.10 + (this.seedX[i] - 0.5) * sigma * 4;
          var gy = y - pull * Math.sign(y) * 0.10 + (this.seedY[i] - 0.5) * sigma * 4;
          var xx = clamp(gx, -1, 1), yy = clamp(gy, -1, 1);
          var val = Math.abs(L.chladni(m, n, xx, yy));
          var onNode = val < 0.14;
          var size = onNode ? 2.4 : 1.6;
          P.add(cx + xx * S, cy + yy * S, 0, size,
            onNode ? [0.95, 0.96, 0.99] : [0.32, 0.48, 0.62], onNode ? 0.9 : 0.25 + shake * 0.4);
        }
        P.draw(g, { add: true, soft: 0.9 });
      } else if (l < 10.0) {
        var W = this.lissa; W.clear();
        var A = 380, B = 340, cx2 = 960, cy2 = 560;
        var a = 3, bb = 2, dl = PI / 2;
        for (var j = 0; j < 1200; j++) {
          var u0 = j / 1200 * TAU * 2, u1 = (j + 1) / 1200 * TAU * 2;
          var x0 = Math.sin(a * u0 + dl) * A, y0 = Math.sin(bb * u0) * B;
          var x1 = Math.sin(a * u1 + dl) * A, y1 = Math.sin(bb * u1) * B;
          var k = j / 1200;
          W.seg(cx2 + x0, cy2 + y0, 0, cx2 + x1, cy2 + y1, 0,
            [0.3 + 0.7 * k, 0.8, 1.0 - 0.5 * k], 2.6, 0.75);
        }
        W.draw(g, { add: true, glow: 0.6 });
      } else {
        var W2 = this.bessel; W2.clear();
        var cx3 = 960, cy3 = 560, R = 430, N = 300;
        var prog = clamp((l - 10.0) / 2.4, 0, 1);
        var rings = Math.ceil(prog * 36);
        for (var ri = 0; ri < rings; ri++) {
          var r0 = ri / 36, r1 = (ri + 1) / 36;
          for (var s = 0; s < 72; s++) {
            var th0 = s / 72 * TAU, th1 = (s + 1) / 72 * TAU;
            var d0 = L.besselJ(4, this.j45 * r0) * Math.cos(4 * th0);
            var d1 = L.besselJ(4, this.j45 * r1) * Math.cos(4 * th1);
            var amp = Math.abs(d0);
            var col = d0 > 0 ? [0.35, 0.75, 1.0] : [1.0, 0.55, 0.35];
            W2.seg(cx3 + Math.cos(th0) * r0 * R, cy3 + Math.sin(th0) * r0 * R, 0,
              cx3 + Math.cos(th1) * r1 * R, cy3 + Math.sin(th1) * r1 * R, 0,
              col, 1.4 + amp * 3.4, 0.15 + amp * 0.80);
          }
        }
        W2.draw(g, { add: true, glow: 0.7 });
      }
    }
  });

  /* ====================================================== 09 FRAGMENTS === */
  WEM.defineSection({
    id: "09", name: "fragments",
    init: function (ctx) {
      this.cells = [];
      var r = C.rng(9001);
      for (var i = 0; i < 128; i++) this.cells.push({ live: false, born: r(), size: 0.5 + r() * 1.6, obj: 1 + ((r() * 60) | 0) });
      this.cube = C.geo.box(0.44, 0.44, 0.44);
      this.sites = L.voronoiSites(64, 77, 4.6);
      this.vor = new V.Lines(9000);
      this.dist = L.dijkstraField(48, 32, 0x0D1);
      this.crack = new V.Lines(7000);
    },
    enter: function (ctx) {
      ctx.cam.reset3d(9);
      ctx.fx.mood([0.08, 0.08, 0.10], [0.05, 0.03, 0.02], 0.25);
      ctx.fx.bloom = 0.45;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      if (l < 5.2) {
        hud.T(70, 116, "HEAP  ·  FRAGMENTATION", { size: 18, color: COL.cyan, alpha: 0.95 });
        var live = this.cells.filter(function (c) { return c._live; }).length;
        var span = 0;
        this.cells.forEach(function (c) { if (c._live) span++; });
        hud.T(70, 152, "live objects  " + live + " / 128", { size: 14, color: COL.green });
        hud.T(70, 176, "fragmentation  " + (25 + 45 * Math.abs(Math.sin(l * 0.8))).toFixed(1) + "%", { size: 14, color: COL.gold });
        hud.T(70, 200, "the allocator cannot move a live block without a copy", { size: 13, color: COL.dim });
      } else if (l < 9.6) {
        hud.T(70, 116, "VORONOI  ·  SHATTER", { size: 18, color: COL.cyan, alpha: 0.95 });
        hud.formula(70, 170, "V(p_i) = \\{x : \\|x - p_i\\| \\le \\|x - p_j\\| \\; \\forall j\\}", { size: 22, color: COL.white });
        hud.T(70, 214, "64 seeds, nearest-site partition, then a radial impulse", { size: 13, color: COL.dim });
      } else {
        hud.T(70, 116, "DIJKSTRA  ·  CRACK PATH", { size: 18, color: COL.cyan, alpha: 0.95 });
        hud.formula(70, 170, "d(v) = \\min_{u \\in N(v)} \\left( d(u) + w(u,v) \\right)", { size: 24, color: COL.white });
        hud.T(70, 216, "48 x 32 grid, random edge weights, single source at the left edge", { size: 13, color: COL.dim });
        hud.T(70, 240, "the crack follows the shortest weighted path", { size: 13, color: COL.faint });
      }
      if (ctx.lyric) hud.T(ctx.W / 2, ctx.H - 66, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.85 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx, cam = ctx.cam;
      if (l < 5.2) {
        cam.fov = 0.9;
        cam.pos = [Math.sin(t * 0.2) * 7.5, 5.2, Math.cos(t * 0.2) * 7.5];
        cam.target = [0, -0.6, 0];
        cam.update();
        var phase = l < 2.0 ? 0 : l < 3.6 ? 1 : 2;
        var ph = phase === 0 ? l / 2.0 : phase === 1 ? (l - 2.0) / 1.6 : clamp((l - 3.6) / 1.6, 0, 1);
        var liveIdx = [], k = 0;
        // deterministic slots so the section is frame reproducible
        for (var i = 0; i < this.cells.length; i++) {
          var c = this.cells[i];
          var alloc = l > 0.4 + c.born * 1.4 && i < 96;
          var dead = phase >= 1 && l > 2.0 + (i / this.cells.length) * 1.5 && (i % 3 !== 0);
          c._live = alloc && !dead;
          if (c._live) liveIdx.push(i);
        }
        // compaction (phase 2) packs live blocks to the front
        for (var q = 0; q < liveIdx.length; q++) {
          var src = liveIdx[q];
          var slot = phase === 2 ? q : src;
          var gx = slot % 16, gy = Math.floor(slot / 16);
          var x = (gx - 7.5) * 0.62, y = (gy - 3.5) * 0.62 + 0.6;
          var c2 = this.cells[src];
          var pop = clamp((l - (0.4 + c2.born * 1.4)) / 0.3, 0, 1);
          var m = M4.mul(M4.trans(x, y, 0), M4.mul(M4.rotY(t * 0.7 + src), M4.scale(0.72 * pop, 0.72 * pop, 0.72 * pop)));
          g.solid(this.cube, m, {
            color: src % 3 === 0 ? CYAN : [0.85, 0.90, 0.95], rim: 0.8, alpha: 0.78,
            emissive: src % 3 === 0 ? 0.3 : 0.05
          });
        }
      } else if (l < 9.6) {
        cam.fov = 0.95;
        var az = t * 0.18;
        cam.pos = [Math.sin(az) * 11, 6.0, Math.cos(az) * 11];
        cam.target = [0, 0, 0]; cam.update();
        var W = this.vor; W.clear();
        var burst = clamp((l - 6.6) / 2.6, 0, 1);
        for (var s = 0; s < this.sites.length; s++) {
          var p = this.sites[s];
          var dir = V3.norm([p[0], 0.4, p[1]]);
          var off = E.inQuad(burst) * 6.0 * p[2];
          var cx0 = p[0] + dir[0] * off, cz0 = p[1] + dir[2] * off;
          var col = burst > 0.6 ? GOLD : [0.55, 0.72, 0.88];
          for (var e = 0; e < 6; e++) {
            var th0 = e / 6 * TAU, th1 = (e + 1) / 6 * TAU;
            var r0 = 0.62 * p[2], r1 = 0.62 * p[2];
            W.seg(cx0 + Math.cos(th0) * r0, 0, cz0 + Math.sin(th0) * r0, cx0 + Math.cos(th1) * r1, 0, cz0 + Math.sin(th1) * r1, col, 1.8, 0.7);
            W.seg(cx0 + Math.cos(th0) * r0, 0, cz0 + Math.sin(th0) * r0, cx0, 0.55 * p[2] * (1 - burst), cz0, col, 1.3, 0.45);
          }
        }
        W.draw(g, { add: true, glow: 0.5 });
      } else {
        cam.mode = "ortho"; cam.update();
        var W2 = this.crack; W2.clear();
        var w = 48, h = 32, S = 26;
        var maxD = 0;
        for (var i2 = 0; i2 < this.dist.length; i2++) if (this.dist[i2] < 1e8 && this.dist[i2] > maxD) maxD = this.dist[i2];
        var formed = clamp((l - 9.6) / 3.0, 0, 1);
        for (var yy = 0; yy < h; yy++) {
          for (var xx = 0; xx < w; xx++) {
            var d = this.dist[yy * w + xx] / maxD;
            if (d > formed) continue;
            var X = 400 + xx * S, Y = 240 + yy * S;
            var edge = Math.abs(d - formed) < 0.035;
            W2.seg(X, Y, 0, X + S, Y, 0, edge ? GOLD : [0.30, 0.45, 0.60], edge ? 2.6 : 1.0, edge ? 0.95 : 0.28);
            W2.seg(X, Y, 0, X, Y + S, 0, edge ? GOLD : [0.30, 0.45, 0.60], edge ? 2.6 : 1.0, edge ? 0.95 : 0.28);
            W2.seg(X + S, Y, 0, X + S, Y + S, 0, [0.30, 0.45, 0.60], 1.0, 0.20);
            W2.seg(X, Y + S, 0, X + S, Y + S, 0, [0.30, 0.45, 0.60], 1.0, 0.20);
          }
        }
        W2.draw(g, { add: true, glow: 0.4 });
      }
    }
  });

  /* ================================================== 10 ILLEGAL ARGS === */
  WEM.defineSection({
    id: "10", name: "illegal arguments",
    init: function (ctx) {
      this.lines = [];
      // capture REAL errors thrown by this engine, right now
      var cases = [
        function () { var a = new Float32Array(4); return a[9].toFixed(2); },
        function () { return JSON.parse('{"world":'); },
        function () { return (void 0).execute(); },
        function () { return null.me; },
        function () { return 9007199254740992 + 1 === 9007199254740992 ? "2^53 + 1 === 2^53" : "?"; }
      ];
      var labels = ["RangeError: index out of bounds", "SyntaxError: unterminated JSON", "TypeError: undefined is not a function", "TypeError: null has no properties", "precision loss above 2^53"];
      for (var i = 0; i < cases.length; i++) {
        try { var v = cases[i](); this.lines.push({ label: labels[i], stack: String(v), kind: "value" }); }
        catch (e) { this.lines.push({ label: e.name + ": " + e.message, stack: String(e.stack || "").split("\n").slice(0, 5).join("\n"), kind: "error" }); }
      }
      this.float = [];
      var vals = [1, 2, 1e100, 1e308, Infinity, -Infinity, 0];
      for (var j = 0; j < vals.length; j++) this.float.push({ v: vals[j], s: String(vals[j]), bits: "" });
      this.ctxLen = 4096;
      this.nan = new V.Points(600);
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.10, 0.05, 0.05], [0.05, 0.01, 0.01], 0.4);
      ctx.fx.bloom = 0.5;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      hud.T(60, 100, "ILLEGAL  ARGUMENTS", { size: 20, color: COL.red, alpha: 0.95 });
      hud.T(60, 128, "the engine is throwing for real -- these strings come from the live call stack", { size: 13, color: COL.dim });
      var c = hud.fc;
      var y = 170;
      for (var i = 0; i < this.lines.length; i++) {
        var ln = this.lines[i];
        if (l < 0.35 + i * 0.85) break;
        var a = clamp((l - (0.35 + i * 0.85)) / 0.4, 0, 1);
        hud.rect(60, y - 20, 1080, 74, { fill: "rgba(30,6,6,0.72)", stroke: "rgba(255,90,82,0.35)" });
        hud.T(76, y, (ln.kind === "error" ? "!" : ">") + " " + ln.label, { size: 15, color: COL.red, alpha: a });
        var st = ln.stack.split("\n").slice(0, 2).join("   ");
        hud.T(76, y + 24, st.slice(0, 116), { size: 12, color: COL.grey, alpha: a * 0.85 });
        y += 84;
      }
      // IEEE-754 walk
      if (l > 4.6) {
        var a2 = clamp((l - 4.6) / 0.8, 0, 1);
        hud.T(60, y + 30, "IEEE-754  ·  where the numbers stop being numbers", { size: 17, color: COL.cyan, alpha: a2 });
        var yy = y + 66;
        var walk = ["1", "2", "1e100", "1e308", "Infinity", "-Infinity", "0/0", "NaN"];
        var stage = clamp((l - 5.0) / 3.0, 0, 1) * (walk.length - 1);
        for (var w = 0; w < walk.length; w++) {
          if (w > stage + 0.2) break;
          var on = Math.abs(stage - w) < 0.6;
          hud.T(90 + w * 168, yy, (w ? "-> " : "") + walk[w], { size: 17, color: on ? COL.gold : COL.grey, alpha: a2 * (on ? 1 : 0.6) });
        }
        hud.T(90, yy + 40, "overflow saturates to Infinity; Inf - Inf and 0/0 are NaN; every later comparison is false", { size: 13, color: COL.dim, alpha: a2 });
        hud.T(90, yy + 66, "NaN !== NaN  ->  " + (NaN !== NaN), { size: 14, color: COL.red, alpha: a2 });
      }
      // context window overflow
      if (l > 9.0) {
        var a3 = clamp((l - 9.0) / 0.6, 0, 1);
        var used = Math.floor(clamp((l - 9.0) / 5.0, 0, 1.12) * this.ctxLen);
        hud.T(ctx.W - 620, 200, "CONTEXT  WINDOW", { size: 17, color: COL.cyan, alpha: a3 });
        hud.bar(ctx.W - 620, 216, 560, 22, used / this.ctxLen, { fill: used > this.ctxLen ? COL.red : COL.cyan, color: "rgba(255,255,255,0.5)" });
        hud.T(ctx.W - 620, 266, used.toLocaleString() + " / " + this.ctxLen.toLocaleString() + " tokens", { size: 15, color: used > this.ctxLen ? COL.red : COL.green, alpha: a3 });
        if (used > this.ctxLen) {
          hud.T(ctx.W - 620, 296, "OVERFLOW: the oldest tokens are dropped from the front", { size: 14, color: COL.red, alpha: a3 });
          hud.T(ctx.W - 620, 322, "attention to them becomes 0 -- the model forgets the beginning", { size: 13, color: COL.dim, alpha: a3 });
        }
      }
      if (ctx.lyric) hud.T(60, ctx.H - 66, "> " + ctx.lyric.text, { size: 15, color: COL.green, alpha: 0.85 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx;
      var P = this.nan; P.clear();
      var stage = clamp((l - 5.0) / 3.0, 0, 1);
      var r = C.rng(0x4E41);
      for (var i = 0; i < 600; i++) {
        var a = C.h2(i * 1.7, 0) * TAU, rad = C.h2(i * 2.3, 1) * 4.0;
        var spin = stage * 6.0 * (i % 7 === 0 ? -1 : 1);
        var x = 960 + Math.cos(a + spin) * rad * 120;
        var y = 620 + Math.sin(a + spin) * rad * 90;
        var bad = stage > 0.72 && (i % 5 === 0);
        P.add(x, y, 0, bad ? 14 : 4.5, bad ? [1.0, 0.35, 0.30] : [0.5, 0.65, 0.85], bad ? 0.95 : 0.45);
      }
      P.draw(g, { add: true, soft: 0.75 });
    }
  });
})();
