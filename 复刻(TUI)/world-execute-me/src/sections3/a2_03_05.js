/* ============================================================================
   world.execute(me);  [v3] segments 03-05
   03 pretraining : the real loss curve, the learned embedding space (PCA),
                    sinusoidal positional TANGENTS, context length LIMITATIONS
   04 scaling     : loss-surface descent, the AC/DC residual stream, AD->BC data
   05 chorus      : the sampler reading the model's own distribution, attention,
                    EXECUTION
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, V = WEM.Viz, M = WEM.Model, L = WEM.Lab, M4 = C.M4, V3 = C.V3;
  var COL = WEM.HUD.COL, PI = Math.PI, TAU = PI * 2;
  var clamp = C.clamp, lerp = C.lerp, smooth = C.smoothstep, E = C.Ease;
  var WHITE = [0.93, 0.95, 0.98], CYAN = [0.21, 0.88, 1.0], GOLD = [1.0, 0.79, 0.29],
    GREEN = [0.49, 0.91, 0.53], BLUE = [0.36, 0.58, 1.0], RED = [1.0, 0.35, 0.30];

  function MODEL(ctx) { return ctx.app.model || (ctx.app.model = M.build(ctx)); }

  /* ==================================================== 03 PRETRAINING === */
  WEM.defineSection({
    id: "03", name: "pretraining",
    init: function () { this.proj = null; },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.05, 0.08, 0.12], [0.02, 0.04, 0.09], 0.3);
      ctx.fx.bloom = 0.45;
    },
    ensure: function (ctx) {
      if (this.proj) return;
      var m = MODEL(ctx);
      var mean = m.pca.mean, c0 = m.pca.comps[0], c1 = m.pca.comps[1];
      var pts = [];
      var counts = {};
      for (var i = 0; i < m.ids.length; i++) counts[m.vocab[m.ids[i]]] = (counts[m.vocab[m.ids[i]]] || 0) + 1;
      var maxX = 1e-9, maxY = 1e-9;
      for (var v = 0; v < m.V; v++) {
        var x = 0, y = 0;
        for (var d = 0; d < m.dim; d++) {
          var dv = m.E[v * m.dim + d] - mean[d];
          x += dv * c0[d]; y += dv * c1[d];
        }
        maxX = Math.max(maxX, Math.abs(x)); maxY = Math.max(maxY, Math.abs(y));
        pts.push({ w: m.vocab[v], x: x, y: y, n: counts[m.vocab[v]] || 0 });
      }
      for (var p = 0; p < pts.length; p++) { pts[p].x /= maxX; pts[p].y /= maxY; }
      this.proj = pts;
      this.m = m;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      this.ensure(ctx);
      var m = this.m;
      if (l < 4.2) {
        hud.T(70, 112, "PRETRAINING  ·  NEXT-TOKEN PREDICTION", { size: 18, color: COL.cyan, alpha: 0.95 });
        hud.formula(70, 162, "\\mathcal{L} = -\\sum_i \\log p_\\theta(x_i \\mid x_{<i})", { size: 26, color: COL.white });
        var step = Math.floor(clamp(l / 4.2, 0, 1) * m.loss.length);
        var cur = m.loss[Math.max(0, step - 1)];
        hud.T(70, 212, "step " + (step * 10).toLocaleString() + "   loss " + cur.toFixed(4) + "   ppl " + Math.exp(cur).toFixed(2), { size: 15, color: COL.green });
        hud.T(70, 240, "trained here, in this page, on the lyric tokens themselves", { size: 13, color: COL.dim });
        hud.T(70, 264, "runs of " + m.ids.length + " tokens   vocab " + m.V + "   d_model " + m.dim, { size: 13, color: COL.faint });
      } else if (l < 8.4) {
        hud.T(70, 112, "EMBEDDING  ·  IF I'M A SET OF POINTS", { size: 18, color: COL.cyan, alpha: 0.95 });
        hud.formula(70, 162, "\\dim = 7168 \\;\\to\\; 2", { size: 22, color: COL.white });
        hud.T(300, 162, "principal components", { size: 15, color: COL.grey });
        hud.T(70, 200, "every point is a real word vector learned just now; position = PC1 / PC2", { size: 13, color: COL.dim });
        hud.T(70, 226, this.m ? ((this.m.loss[0].toFixed(3) + " -> " + this.m.loss[this.m.loss.length - 1].toFixed(3)) + "   (loss fell while you watched)") : "", { size: 13, color: COL.green });
      } else if (l < 11.8) {
        hud.T(70, 112, "POSITIONAL ENCODING  ·  TANGENTS", { size: 18, color: COL.cyan, alpha: 0.95 });
        hud.formula(70, 162, "PE_{p,2i} = \\sin\\!\\left(\\frac{p}{10000^{2i/d}}\\right)", { size: 24, color: COL.white });
        hud.T(70, 212, "each row is a position, each column a frequency; the slope is the tangent", { size: 13, color: COL.dim });
      } else {
        hud.T(70, 112, "CONTEXT  ·  LIMITATIONS", { size: 18, color: COL.cyan, alpha: 0.95 });
        var frac = clamp((l - 11.8) / 2.4, 0, 1);
        var tok = Math.floor(frac * 131072);
        hud.formula(70, 162, "\\lim_{n \\to \\infty} \\mathrm{Attn}(n) = O(n^2)", { size: 26, color: COL.white });
        hud.T(70, 212, "context  " + tok.toLocaleString() + " / 131,072 tokens", { size: 16, color: tok > 120000 ? COL.red : COL.green });
        hud.bar(70, 226, 640, 16, frac, { fill: tok > 120000 ? [1, 0.35, 0.3] : CYAN });
        hud.T(70, 268, "attention cost grows with the square of the window --", { size: 13, color: COL.dim });
        hud.T(70, 288, "if I approach infinity, then you can be my LIMITATIONS", { size: 15, color: COL.gold });
      }
      if (ctx.lyric) hud.T(ctx.W / 2, ctx.H - 76, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.8 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx;
      var SC = ctx.W / 14;
      if (l < 4.2) {
        // ---- the real training curve ----
        var m = this.m, Ln = this._cl || (this._cl = new V.Lines(400));
        Ln.clear();
        var gx = 300, gy = 700, gw = 1300, gh = 300;
        Ln.seg(gx, gy, 0, gx + gw, gy, 0, [0.30, 0.36, 0.44], 1.4, 0.6);
        Ln.seg(gx, gy, 0, gx, gy - gh, 0, [0.30, 0.36, 0.44], 1.4, 0.6);
        var y0 = Math.log(m.V) + 0.4, y1 = 0;
        var n = m.loss.length;
        var shown = Math.floor(clamp(l / 4.2, 0, 1) * n);
        for (var i = 0; i + 1 < Math.max(2, shown); i++) {
          var a0 = m.loss[i], a1 = m.loss[i + 1];
          var X0 = gx + i / (n - 1) * gw, X1 = gx + (i + 1) / (n - 1) * gw;
          var Y0 = gy - clamp((a0 - y1) / (y0 - y1), 0, 1) * gh, Y1 = gy - clamp((a1 - y1) / (y0 - y1), 0, 1) * gh;
          Ln.seg(X0, Y0, 0, X1, Y1, 0, i > n - 6 ? GOLD : CYAN, 3.0, 0.95);
        }
        // the starting entropy line: -log(1/V)
        var Yh = gy - clamp((Math.log(m.V) - y1) / (y0 - y1), 0, 1) * gh;
        Ln.seg(gx, Yh, gx + gw, Yh, 0, [0.85, 0.45, 0.35], 1.6, 0.7);
        Ln.draw(g, { add: true, glow: 0.5 });
      } else if (l < 8.4) {
        // ---- the learned embedding space ----
        var pts = this.proj, P = this._pp || (this._pp = new V.Points(400));
        P.clear();
        var reveal = clamp((l - 4.2) / 2.6, 0, 1);
        var cx = ctx.W / 2, cy = 640, R = SC * 3.6;
        for (var p = 0; p < pts.length; p++) {
          if (p / pts.length > reveal) break;
          var q = pts[p];
          P.add(cx + q.x * R, cy - q.y * R, 0, 3.5 + Math.min(q.n, 8) * 1.4,
            q.n >= 4 ? GOLD : (q.n >= 2 ? CYAN : [0.55, 0.62, 0.72]), 0.35 + Math.min(q.n, 8) * 0.14);
        }
        P.draw(g, { add: true, soft: 0.7 });
        var hud = ctx.hud;
        for (var p2 = 0; p2 < pts.length; p2 += 3) {
          var q2 = pts[p2];
          if (q2.n < 3 || p2 / pts.length > reveal) continue;
          hud.T(cx + q2.x * R + 8, cy - q2.y * R + 4, q2.w.slice(0, 12), { size: 11, color: "rgba(200,220,240,0.8)" });
        }
      } else if (l < 11.8) {
        // ---- sinusoidal positional encoding heat map ----
        var Ln2 = this._pe || (this._pe = new V.Lines(4000));
        Ln2.clear();
        var cols = 48, rows = 34, cw = ctx.W * 0.72 / cols, ch = 460 / rows;
        var ox = ctx.W / 2 - cols * cw / 2;
        for (var r2 = 0; r2 < rows; r2++) {
          for (var c2 = 0; c2 < cols; c2++) {
            var pos = r2 * 4, dim = c2;
            var v = dim % 2 === 0
              ? Math.sin(pos / Math.pow(10000, dim / cols))
              : Math.cos(pos / Math.pow(10000, (dim - 1) / cols));
            var y0b = 400 + r2 * ch;
            Ln2.seg(ox + c2 * cw, y0b, 0, ox + (c2 + 1) * cw, y0b, 0,
              v >= 0 ? [0.25 + v * 0.7, 0.55 + v * 0.4, 1.0] : [1.0, 0.4 + v * 0.3, 0.35], ch * 0.92, 0.85);
          }
        }
        Ln2.draw(g, { add: true });
        // tangent family over the first row
        var TL = this._tg || (this._tg = new V.Lines(300));
        TL.clear();
        for (var k = 0; k < 26; k++) {
          var u = k / 26;
          var X = ox + u * cols * cw;
          var slope = Math.cos(u * 9.0);
          TL.seg(X - 26, 380 - slope * 18, 0, X + 26, 380 + slope * 18, 0, [1, 0.79, 0.29], 1.8, 0.55);
        }
        TL.draw(g, { add: true, glow: 0.4 });
      } else {
        // ---- context window filling up: attention quadrangle ----
        var Ln3 = this._ct || (this._ct = new V.Lines(3000));
        Ln3.clear();
        var frac = clamp((l - 11.8) / 2.4, 0, 1);
        var cols3 = 80, rows3 = 26, cw3 = ctx.W * 0.74 / cols3, ch3 = 380 / rows3;
        var ox3 = ctx.W / 2 - cols3 * cw3 / 2;
        var filled = frac * cols3;
        for (var r3 = 0; r3 < rows3; r3++) {
          for (var c3 = 0; c3 < cols3; c3++) {
            if (c3 > filled || r3 > filled) continue;
            var x0 = ox3 + c3 * cw3, y0 = 480 + r3 * ch3;
            var hot = (c3 + r3) / (filled * 2);
            Ln3.seg(x0, y0, 0, x0 + cw3 * 0.94, y0, 0,
              hot > 0.86 ? [1, 0.42, 0.36] : [0.22, 0.62 + hot * 0.3, 0.95], ch3 * 0.86, 0.25 + hot * 0.75);
          }
        }
        Ln3.draw(g, { add: true, glow: 0.45 });
      }
    }
  });

  /* ======================================================== 04 SCALING === */
  WEM.defineSection({
    id: "04", name: "scaling",
    init: function () {
      // a real 2D loss surface (Rastrigin-ish) and a real descent on it
      this.path = [];
      var x = -3.4, y = 3.0, lr = 0.06;
      for (var s = 0; s < 300; s++) {
        var gx = 2 * x + 3 * Math.sin(3 * y) * 3, gy = 2 * y + 3 * Math.sin(3 * x) * 3;
        x -= lr * gx * 0.5; y -= lr * gy * 0.5;
        this.path.push([x, y]);
      }
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.07, 0.07, 0.11], [0.03, 0.03, 0.07], 0.3);
      ctx.fx.bloom = 0.45;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      if (l < 4.4) {
        hud.T(70, 112, "OPTIMISATION  ·  GRADIENT DESCENT", { size: 18, color: COL.cyan, alpha: 0.95 });
        hud.formula(70, 162, "\\theta_{k+1} = \\theta_k - \\eta \\nabla_\\theta \\mathcal{L}", { size: 26, color: COL.white });
        var k = Math.floor(clamp(l / 4.4, 0, 1) * this.path.length);
        var p = this.path[Math.max(0, k - 1)];
        hud.T(70, 212, "step " + k * 100 + "   theta = (" + p[0].toFixed(3) + ", " + p[1].toFixed(3) + ")", { size: 14, color: COL.green });
        hud.T(70, 238, "Adam with weight decay, cosine schedule, warmup 2000", { size: 13, color: COL.dim });
      } else if (l < 8.4) {
        hud.T(70, 112, "SWITCH MY CURRENT  ·  AC TO DC", { size: 18, color: COL.cyan, alpha: 0.95 });
        hud.T(70, 152, "61 layers, one residual stream: attention is the AC, the feed-forward the DC", { size: 14, color: COL.dim });
        hud.formula(70, 186, "h_{l+1} = h_l + \\mathrm{Attn}(h_l) + \\mathrm{FFN}(h_l)", { size: 24, color: COL.white });
        hud.T(70, 236, "layer " + Math.floor(clamp((l - 4.4) / 4.0, 0, 1) * 61) + " / 61", { size: 15, color: COL.green });
      } else if (l < 11.8) {
        hud.T(70, 112, "OH WE CAN TRAVEL  ·  A.D TO B.C", { size: 18, color: COL.cyan, alpha: 0.95 });
        hud.T(70, 152, "the corpus is a timeline; the model learns all of it at once", { size: 14, color: COL.dim });
      } else {
        hud.T(70, 112, "SCALING LAWS", { size: 18, color: COL.cyan, alpha: 0.95 });
        hud.formula(70, 162, "L(N, D) = E + \\frac{A}{N^{\\alpha}} + \\frac{B}{D^{\\beta}}", { size: 26, color: COL.white });
        hud.T(70, 212, "alpha = 0.34   beta = 0.28", { size: 14, color: COL.green });
        hud.T(70, 238, "compute-optimal is a straight line on log-log paper", { size: 13, color: COL.dim });
      }
      if (ctx.lyric) hud.T(ctx.W / 2, ctx.H - 76, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.8 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx;
      var SC = ctx.W / 14;
      if (l < 4.4) {
        // ---- contour field + the real descent path ----
        var CF = this._cf || (this._cf = new V.Lines(6000));
        CF.clear();
        var cx = ctx.W / 2, cy = 620, R = SC * 4.2;
        for (var gy = -4; gy <= 4; gy++) {
          for (var gx = -4; gx <= 4; gx++) {
            var v = (gx * gx + gy * gy) / 8 + 3 * Math.cos(3 * gx * 0.5) + 3 * Math.cos(3 * gy * 0.5);
            var hot = clamp((v + 6) / 12, 0, 1);
            CF.seg(cx + gx * R / 4.4, cy + gy * R / 4.4, 0, cx + (gx + 1) * R / 4.4, cy + gy * R / 4.4, 0,
              [0.20 + hot * 0.6, 0.30 + hot * 0.3, 0.45 + hot * 0.2], 3.0, 0.18 + hot * 0.4);
          }
        }
        // the descent
        var k = Math.floor(clamp(l / 4.4, 0, 1) * this.path.length);
        for (var i = 0; i + 1 < k; i++) {
          var a = this.path[i], b2 = this.path[i + 1];
          var kk = i / this.path.length;
          CF.seg(cx + a[0] * R / 4.4, cy + a[1] * R / 4.4, 0, cx + b2[0] * R / 4.4, cy + b2[1] * R / 4.4, 0,
            i > k - 12 ? GOLD : [0.4, 0.9, 1.0], 3.2, 0.2 + kk * 0.8);
        }
        CF.draw(g, { add: true, glow: 0.5 });
      } else if (l < 8.4) {
        // ---- the residual stream: 61 layers, alternating blocks ----
        var RL = this._rl || (this._rl = new V.Lines(3000));
        RL.clear();
        var prog = clamp((l - 4.4) / 4.0, 0, 1);
        var y = 620, x0 = 180, x1 = ctx.W - 180;
        var layers = 61;
        for (var L2 = 0; L2 < layers; L2++) {
          var u0 = L2 / layers, u1 = (L2 + 1) / layers;
          if (u0 > prog + 0.1) break;
          var attn = L2 % 2 === 0;
          var hh = attn ? 46 : 26;
          RL.seg(x0 + u0 * (x1 - x0), y - hh / 2, 0, x0 + u0 * (x1 - x0), y + hh / 2, 0,
            attn ? [0.30, 0.72, 1.0] : [1.0, 0.72, 0.35], 2.0, 0.7);
          RL.seg(x0 + u0 * (x1 - x0), y - hh / 2, 0, x0 + u1 * (x1 - x0), y - hh / 2, 0,
            attn ? [0.30, 0.72, 1.0] : [1.0, 0.72, 0.35], 1.6, 0.5);
          RL.seg(x0 + u0 * (x1 - x0), y + hh / 2, 0, x0 + u1 * (x1 - x0), y + hh / 2, 0,
            attn ? [0.30, 0.72, 1.0] : [1.0, 0.72, 0.35], 1.6, 0.5);
        }
        // the stream itself, brightening as it goes
        RL.seg(x0, y, 0, x0 + Math.min(prog + 0.02, 1) * (x1 - x0), y, 0, [0.95, 0.97, 1.0], 4.5, 0.95);
        RL.draw(g, { add: true, glow: 0.6 });
      } else if (l < 11.8) {
        // ---- the corpus timeline: token mass per era ----
        var TL = this._tl || (this._tl = new V.Lines(2200));
        TL.clear();
        var y0 = 620, x0b = 140, x1b = ctx.W - 140;
        var eras = 46, prog2 = clamp((l - 8.4) / 3.0, 0, 1);
        for (var e = 0; e < eras; e++) {
          if (e / eras > prog2) break;
          var u = e / eras;
          var mass = 0.25 + 0.75 * Math.abs(Math.sin(e * 1.7)) * (0.4 + u);
          var X = x0b + u * (x1b - x0b);
          TL.seg(X, y0, 0, X, y0 - mass * 260, 0,
            u < 0.2 ? [1.0, 0.55, 0.35] : (u < 0.6 ? [0.49, 0.91, 0.53] : [0.36, 0.68, 1.0]), 8, 0.75);
        }
        TL.seg(x0b, y0, 0, x1b, y0, 0, [0.4, 0.46, 0.55], 1.6, 0.6);
        TL.draw(g, { add: true, glow: 0.45 });
        var hud = ctx.hud;
        var years = ["3000 BC", "0", "1000", "1500", "1900", "1950", "2000", "2024"];
        for (var yy = 0; yy < years.length; yy++) {
          hud.T(x0b + (x1b - x0b) * yy / (years.length - 1), y0 + 28, years[yy],
            { size: 12, color: COL.faint, align: "center" });
        }
      } else {
        // ---- scaling law: log-log compute vs loss ----
        var SL = this._sl || (this._sl = new V.Lines(900));
        SL.clear();
        var x0c = 320, y0c = 760, w = 1200, h = 320;
        SL.seg(x0c, y0c, 0, x0c + w, y0c, 0, [0.35, 0.4, 0.48], 1.4, 0.6);
        SL.seg(x0c, y0c, 0, x0c, y0c - h, 0, [0.35, 0.4, 0.48], 1.4, 0.6);
        var prog3 = clamp((l - 11.8) / 2.4, 0, 1);
        var nPts = 26;
        for (var i2 = 0; i2 + 1 < nPts; i2++) {
          if (i2 / nPts > prog3) break;
          var u0 = i2 / nPts, u1 = (i2 + 1) / nPts;
          var a0 = 1.9 * Math.pow(u0 + 0.05, -0.34) + 1.5;
          var a1 = 1.9 * Math.pow(u1 + 0.05, -0.34) + 1.5;
          var m0 = 44, m1 = 44 * (1 + (u1 - u0) * 6);
          SL.seg(x0c + u0 * w, y0c - clamp((4.4 - a0) / 2.6, 0, 1) * h, 0,
            x0c + u1 * w, y0c - clamp((4.4 - a1) / 2.6, 0, 1) * h, 0, GOLD, 3.4, 0.95);
          SL.seg(x0c + u0 * w, y0c, 0, x0c + u0 * w, y0c - Math.log10(m0) / 4 * h, 0, [0.36, 0.68, 1.0], 2.4, 0.6);
          SL.seg(x0c + u1 * w, y0c, 0, x0c + u1 * w, y0c - Math.log10(m1) / 4 * h, 0, [0.36, 0.68, 1.0], 2.4, 0.6);
        }
        SL.draw(g, { add: true, glow: 0.5 });
      }
    }
  });

  /* ========================================================= 05 CHORUS === */
  WEM.defineSection({
    id: "05", name: "chorus / execution",
    init: function (ctx) { },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.08, 0.07, 0.12], [0.04, 0.02, 0.08], 0.45);
      ctx.fx.bloom = 0.55;
    },
    ensure: function (ctx) {
      if (this.m) return;
      var m = MODEL(ctx);
      this.m = m;
      // a real sample from the model's own distribution
      var sid = m.vocab.indexOf("if");
      if (sid < 0) sid = 1;
      this.gen = m.sample(m, sid, 220, 0.85, 0x51A3);
      // wrap the sample into lines once, with an explicitly chosen font, so the
      // layout never depends on whatever font the last HUD call happened to set
      var hud = ctx.hud, c = hud.fc;
      c.save();
      c.font = "15px " + WEM.HUD.FONTS.mono;
      this.lines = [];
      var cur = "", curW = 0, maxW = ctx.W - 900;
      for (var i = 0; i < this.gen.length; i++) {
        var w = this.gen[i].tok;
        var wpx = c.measureText(w + " ").width;
        if (curW + wpx > maxW) { this.lines.push({ s: cur, n: i }); cur = ""; curW = 0; }
        cur += w + " "; curW += wpx;
      }
      if (cur) this.lines.push({ s: cur, n: this.gen.length });
      c.restore();
      this.heads = [];
      var words = [];
      for (var k = 0; k < m.ids.length && words.length < 48; k++) words.push(m.vocab[m.ids[k]]);
      for (var h = 0; h < 8; h++) this.heads.push(L.attention(words, 12, h));
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      this.ensure(ctx);
      var m = this.m;
      if (l < 5.4) {
        hud.T(70, 112, "SAMPLING  ·  THE MODEL SPEAKS", { size: 18, color: COL.cyan, alpha: 0.95 });
        hud.formula(70, 158, "x_{t+1} \\sim \\mathrm{softmax}(z / T)", { size: 26, color: COL.white });
        var sid = m.vocab.indexOf("if") >= 0 ? m.vocab.indexOf("if") : 1;
        var top = m.topk(m, sid, 6);
        hud.T(70, 206, "next-token distribution, T = 0.85", { size: 13, color: COL.dim });
        for (var k = 0; k < top.length; k++) {
          var y = 234 + k * 26;
          hud.T(70, y, (k + 1) + ". " + (top[k].tok + "          ").slice(0, 11), { size: 14, color: k === 0 ? COL.gold : COL.grey });
          hud.bar(200, y - 12, 340, 14, top[k].p, { fill: k === 0 ? GOLD : CYAN });
          hud.T(556, y, (top[k].p * 100).toFixed(2) + "%", { size: 13, color: COL.dim });
        }
        hud.T(70, 234 + 6 * 26 + 16, "temperature 0.85   top-p 0.95   repetition penalty 1.05", { size: 12, color: COL.faint });
      } else if (l < 9.8) {
        hud.T(70, 112, "ATTENTION  ·  128 HEADS", { size: 18, color: COL.cyan, alpha: 0.95 });
        hud.formula(70, 158, "A = \\mathrm{softmax}\\!\\left(\\frac{QK^{T}}{\\sqrt{d}}\\right)", { size: 24, color: COL.white });
        hud.T(70, 204, "eight heads over the lyric tokens, causal mask, computed here", { size: 13, color: COL.dim });
      } else {
        hud.T(70, 112, "EXECUTION", { size: 18, color: COL.red, alpha: 0.95 });
        var rep = Math.floor(clamp((l - 9.8) / 4.6, 0, 1) * 12);
        for (var i = 0; i < rep; i++) {
          var col = i % 2 ? COL.white : COL.cyan;
          hud.T(70, 168 + i * 30, "EXECUTION", { size: 22, color: col, alpha: 0.9 });
          hud.T(320, 168 + i * 30, "run " + (i + 1) + " / 12", { size: 13, color: COL.dim });
        }
      }
      if (ctx.lyric) hud.T(ctx.W / 2, ctx.H - 76, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.8 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx;
      var SC = ctx.W / 14;
      var hud = ctx.hud;
      if (l < 5.4) {
        // ---- the generated token stream, sampled for real ----
        var gen = this.gen, lines = this.lines || [];
        var TL = this._gl || (this._gl = new V.Lines(2600));
        TL.clear();
        var shown = clamp((l - 0.3) / 4.4, 0, 1) * gen.length;
        var hud2 = ctx.hud;
        for (var li = 0; li < lines.length; li++) {
          if (lines[li].n > shown) {
            // partial line: reveal character by character
            var want = Math.ceil((shown - (li ? lines[li - 1].n : 0)) / Math.max(1, lines[li].n - (li ? lines[li - 1].n : 0)) * lines[li].s.length);
            if (want <= 0) break;
            var cut = lines[li].s.slice(0, Math.max(1, want));
            hud2.T(800, 200 + li * 26, cut, { size: 15, color: "rgba(200,235,255,0.95)" });
            TL.seg(800, 206 + li * 26, 0, 800 + hud2.fc.measureText(cut).width, 206 + li * 26, 0, GOLD, 1.2, 0.35);
            break;
          }
          hud2.T(800, 200 + li * 26, lines[li].s, { size: 15, color: "rgba(200,235,255,0.92)" });
          if (li % 3 === 0) TL.seg(800, 206 + li * 26, 0, 800 + 900, 206 + li * 26, 0, [0.3, 0.6, 0.9], 1.0, 0.16);
        }
        TL.draw(g, { add: true });
      } else if (l < 9.8) {
        // ---- real attention matrices as a text-free heat grid ----
        var Ln = this._at || (this._at = new V.Lines(9000));
        Ln.clear();
        var head = Math.floor(t * 1.6) % this.heads.length;
        var A = this.heads[head];
        var N = Math.min(24, A.length);
        var cell = 22, ox = ctx.W / 2 - N * cell / 2, oy = 340;
        for (var a = 0; a < N; a++) {
          for (var k = 0; k <= a; k++) {
            var w2 = A[a][k];
            Ln.seg(ox + k * cell, oy + a * cell, 0, ox + (k + 1) * cell * 0.94, oy + a * cell, 0,
              w2 > 0.3 ? [1, 0.82, 0.42] : [0.22, 0.55 + w2 * 1.4, 1.0], cell * 0.86, 0.12 + w2 * 2.6);
          }
        }
        Ln.draw(g, { add: true, glow: 0.5 });
        hud.T(ox, oy - 16, "head " + (head + 1) + " / 8   tokens 1.." + N, { size: 13, color: COL.cyan });
      } else {
        // ---- EXECUTION: the GPU grid lights up per launch ----
        var GL = this._gp || (this._gp = new V.Lines(6000));
        GL.clear();
        var cols = 64, rows = 26, cw = ctx.W * 0.8 / cols, ch = 400 / rows;
        var ox2 = ctx.W / 2 - cols * cw / 2;
        var rep = clamp((l - 9.8) / 4.6, 0, 1);
        for (var r = 0; r < rows; r++) {
          for (var c = 0; c < cols; c++) {
            var idx = r * cols + c;
            var wave = (idx / (cols * rows));
            if (wave > rep) continue;
            var near = 1 - Math.abs(wave - rep) * 12;
            var on = near > 0.2;
            GL.seg(ox2 + c * cw, 400 + r * ch, 0, ox2 + (c + 1) * cw * 0.92, 400 + r * ch, 0,
              on ? [1, 0.85, 0.45] : [0.25, 0.6, 0.95], ch * 0.8, on ? 0.95 : 0.3);
          }
        }
        GL.draw(g, { add: true, glow: 0.6 });
      }
    }
  });
})();
