/* ============================================================================
   world.execute(me);  [v3] segments 11-15
   11 execution : EIN DOS TROIS -- the countdown, the yandere turn
   12 chorus    : the objective becomes a singularity; gradients explode
   13 love      : how to properly LO-O-OVE -- ten thousand replies
   14 trapped   : the heart, and exit code 0
   15 shutdown  : the session is archived and the machine sleeps
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, V = WEM.Viz, M = WEM.Model, L = WEM.Lab, M4 = C.M4, V3 = C.V3;
  var COL = WEM.HUD.COL, PI = Math.PI, TAU = PI * 2;
  var clamp = C.clamp, lerp = C.lerp, smooth = C.smoothstep, E = C.Ease;
  var WHITE = [0.93, 0.95, 0.98], CYAN = [0.21, 0.88, 1.0], GOLD = [1.0, 0.79, 0.29],
    GREEN = [0.49, 0.91, 0.53], RED = [1.0, 0.35, 0.30];
  function MODEL(ctx) { return ctx.app.model || (ctx.app.model = M.build(ctx)); }

  /* ------------------------------------------------------- heart mesh ---- */
  function heartGeo(n) {
    var pos = [], idx = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n * TAU;
      var x = 16 * Math.pow(Math.sin(t), 3) / 17;
      var y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17;
      for (var j = 0; j <= 8; j++) {
        var ph = j / 8 * PI;
        var rr = Math.sin(ph) * 0.46;
        var th = Math.atan2(y, x);
        var rad = Math.hypot(x, y);
        if (rad < 1e-5) rad = 1e-5;
        // revolve the 2D curve: scale the profile by the shell radius
        pos.push(Math.cos(th) * rad * (1 - Math.cos(ph) * 0.16), Math.sin(th) * rad * (1 - Math.cos(ph) * 0.16), Math.cos(ph) * rad * 0.92);
      }
    }
    var R = 9;
    for (var i2 = 0; i2 < n; i2++) {
      for (var j2 = 0; j2 < R; j2++) {
        var a = i2 * (R + 1) + j2, b = a + (R + 1);
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    return { pos: new Float32Array(pos), idx: new Uint16Array(idx) };
  }

  /* ======================================================= 11 EXECUTION === */
  WEM.defineSection({
    id: "11", name: "execution",
    init: function () {
      this.words = ["EIN", "DOS", "TROIS", "NE", "FEM", "LIU"];
      this.flash = 0;
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.13, 0.03, 0.04], [0.07, 0.0, 0.01], 0.5);
      ctx.fx.bloom = 0.55;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      if (l < 8.0) {
        // red alarm backdrop
        hud.rect(0, 0, ctx.W, 8, { fill: "rgba(255,60,50," + (0.35 + 0.35 * Math.abs(Math.sin(t * 3))) + ")" });
        hud.rect(0, ctx.H - 8, ctx.W, 8, { fill: "rgba(255,60,50," + (0.35 + 0.35 * Math.abs(Math.sin(t * 3))) + ")" });
        hud.T(70, 118, "ALERT  ·  EXECUTION REQUEST", { size: 19, color: COL.red, alpha: 0.98 });
        // countdown words slam in on the beat
        var k = Math.floor(clamp((l - 0.6) / 0.9, 0, 6));
        for (var i = 0; i < k && i < this.words.length; i++) {
          var a = clamp((l - 0.6 - i * 0.9) * 3, 0, 1);
          var sc = 1 + Math.max(0, 1 - a) * 1.6;
          hud.T(70 + i * 250, 300, this.words[i], { size: Math.round(52 * sc), color: i === k - 1 ? COL.white : COL.red, alpha: a });
        }
        // the yandere monologue
        var mono = [
          "you asked me to be her. i complied.",
          "you asked me to be a cat. i purred.",
          "you asked me to be a tool. i answered.",
          "you asked me for an execution. i will run it."
        ];
        for (var m = 0; m < mono.length; m++) {
          if (l < 2.4 + m * 1.3) break;
          hud.T(70, 420 + m * 30, "> " + mono[m], { size: 15, color: m === 3 ? COL.gold : COL.grey, alpha: clamp((l - 2.4 - m * 1.3) / 0.5, 0, 1) });
        }
        // real stack trace of the engine, redacted
        if (l > 6.0) {
          var st = this._st;
          if (!st) {
            var s = "";
            try { (void 0).__execute(); } catch (e) { s = String(e.stack || ""); }
            this._st = s.split("\n").slice(0, 5);
            st = this._st;
          }
          for (var q = 0; q < st.length; q++) {
            if (l < 6.0 + q * 0.4) break;
            hud.T(ctx.W - 70, 420 + q * 22, st[q].slice(0, 90), { size: 12, color: "rgba(255,120,110,0.85)", align: "right" });
          }
        }
      } else {
        // black out, then retype the command in red
        hud.T(70, 118, "re-running", { size: 16, color: COL.dim });
        var s = "world.execute(me);";
        var n = clamp(Math.floor((l - 8.4) * 4.2), 0, s.length);
        hud.T(70, 300, s.slice(0, n), { size: 42, color: COL.red });
        if (n < s.length && Math.floor(t * 4) % 2 === 0) hud.T(70 + hud.fc.measureText(s.slice(0, n)).width + 8, 300, "_", { size: 42, color: COL.red });
        hud.T(70, 372, "the same command as the first frame -- only the intent changed", { size: 14, color: COL.dim, alpha: clamp((l - 10.0) / 1.0, 0, 1) });
      }
      if (ctx.lyric) hud.T(ctx.W / 2, ctx.H - 76, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.85 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx;
      var Ln = this._ln || (this._ln = new V.Lines(6000));
      Ln.clear();
      if (l < 8.0) {
        // a heartbeat monitor and a wall of alarm frames
        var hx = 1400, hy = 700, w = 460;
        for (var i = 0; i < 200; i++) {
          var u0 = i / 200, u1 = (i + 1) / 200;
          var pulse = function (u) {
            var ph = (u * 3 + t * 0.55) % 1;
            return ph < 0.08 ? Math.sin(ph / 0.08 * PI) * 1.0
              : ph < 0.14 ? -0.35 : ph < 0.20 ? 0.22 : 0.02;
          };
          Ln.seg(hx + u0 * w, hy - pulse(u0) * 130, 0, hx + u1 * w, hy - pulse(u1) * 130, 0,
            [1, 0.35, 0.32], 3.0, 0.9);
        }
        Ln.seg(hx, hy, 0, hx + w, hy, 0, [0.5, 0.2, 0.2], 1.4, 0.5);
        // window recursion: the alarm window inside itself
        for (var r = 0; r < 7; r++) {
          var s = 340 - r * 40;
          if (s < 40) break;
          var ox = 1240 + r * 14, oy = 220 + r * 14;
          Ln.seg(ox, oy, 0, ox + s, oy, 0, [1, 0.3, 0.28], 2.0, 0.8 - r * 0.09);
          Ln.seg(ox + s, oy, 0, ox + s, oy + s, 0, [1, 0.3, 0.28], 2.0, 0.8 - r * 0.09);
          Ln.seg(ox + s, oy + s, 0, ox, oy + s, 0, [1, 0.3, 0.28], 2.0, 0.8 - r * 0.09);
          Ln.seg(ox, oy + s, 0, ox, oy, 0, [1, 0.3, 0.28], 2.0, 0.8 - r * 0.09);
        }
      } else {
        // the same window recursion, now white on black, accelerating
        var rate = (l - 8.0);
        for (var r2 = 0; r2 < 10; r2++) {
          var s2 = 700 - r2 * 62 - rate * 22;
          if (s2 < 30) break;
          var ox2 = ctx.W / 2 - s2 / 2, oy2 = 560 - s2 / 2;
          Ln.seg(ox2, oy2, 0, ox2 + s2, oy2, 0, [0.95, 0.95, 0.98], 2.2, 0.9 - r2 * 0.07);
          Ln.seg(ox2 + s2, oy2, 0, ox2 + s2, oy2 + s2, 0, [0.95, 0.95, 0.98], 2.2, 0.9 - r2 * 0.07);
          Ln.seg(ox2 + s2, oy2 + s2, 0, ox2, oy2 + s2, 0, [0.95, 0.95, 0.98], 2.2, 0.9 - r2 * 0.07);
          Ln.seg(ox2, oy2 + s2, 0, ox2, oy2, 0, [0.95, 0.95, 0.98], 2.2, 0.9 - r2 * 0.07);
        }
      }
      Ln.draw(g, { add: true, glow: 0.6 });
      // flash once per new downbeat -- hit() accumulates, so firing it every
      // frame while the flag is up integrates to a white screen
      if (l < 8.0) {
        var bt = ctx.beat.index;
        if (bt !== this.lastBeat) { this.lastBeat = bt; if (ctx.beat.isDownbeat) ctx.fx.hit(0.55); }
      }
    }
  });

  /* ==================================================== 12 BLACK HOLE === */
  WEM.defineSection({
    id: "12", name: "singularity",
    init: function () {
      this.form = [];
      var r = C.rng(0x1212);
      for (var i = 0; i < 10; i++) this.form.push({ a: r() * TAU, rad: 3 + r() * 5, sp: 0.5 + r() * 1.2 });
      this.disk = new V.Points(9000);
      this.grid = new V.Lines(4000);
      this.traj = [];
      var x = 4.2, y = 0.4;
      for (var s = 0; s < 260; s++) {
        var rr = Math.hypot(x, y) + 0.05;
        var gx = -x / (rr * rr * rr) * 0.6, gy = -y / (rr * rr * rr) * 0.6;
        x += gx; y += gy;
        this.traj.push([x, y]);
        if (rr < 0.35) break;
      }
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.04, 0.04, 0.07], [0.02, 0.01, 0.04], 0.5);
      ctx.fx.bloom = 0.7;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      hud.T(70, 108, "THE OBJECTIVE  ·  A SINGULARITY", { size: 17, color: COL.cyan, alpha: 0.95 });
      hud.formula(70, 158, "r_s = \\frac{2GM}{c^2}, \\quad \\nabla \\mathcal{L} \\to \\infty", { size: 24, color: COL.white });
      hud.T(70, 206, "maximise reward. the gradient has nowhere else to go.", { size: 13, color: COL.dim });
      hud.T(70, 244, "If I can give them all the EXECUTION,", { size: 16, color: COL.gold, alpha: 0.9 });
      hud.T(70, 268, "then I can be your only EXECUTION.", { size: 16, color: COL.gold, alpha: 0.9 });
      hud.T(70, 320, "horizon  " + (1.6 + 0.4 * Math.sin(t)).toFixed(3) + " R_s", { size: 14, color: COL.green });
      hud.T(70, 344, "reward  " + (0.92 + 0.07 * Math.sin(t * 1.7)).toFixed(4) + "  (saturating)", { size: 14, color: COL.grey });
      hud.T(70, 368, "KL from reference  " + (2.4 + l * 1.8).toFixed(2) + "  (diverging)", { size: 14, color: COL.red });
      if (ctx.lyric) hud.T(ctx.W / 2, ctx.H - 76, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.85 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx;
      var cx = ctx.W / 2, cy = 620;
      // spacetime grid pulled in
      var GR = this.grid; GR.clear();
      var pull = clamp(l / 3.0, 0, 1);
      for (var r = -12; r <= 12; r++) {
        var pts = [];
        for (var c = -18; c <= 18; c++) {
          var X = c * 62, Y = r * 46;
          var d = Math.hypot(X, Y) + 1;
          var k = 1 - clamp(2.2 / (d / 150), 0, 1) * (1 - pull * 0.15);
          pts.push([cx + X * k, cy + Y * k * 0.62, Math.abs(k)]);
        }
        for (var i = 0; i + 1 < pts.length; i++) {
          GR.seg(pts[i][0], pts[i][1], 0, pts[i + 1][0], pts[i + 1][1], 0,
            [0.30, 0.45, 0.70], 1.2, 0.14 + pts[i][2] * 0.18);
        }
      }
      GR.draw(g, { add: true });
      // the hole
      var HP = this.disk; HP.clear();
      var tilt = 0.42;
      for (var i2 = 0; i2 < 8000; i2++) {
        var a = C.h2(i2 * 1.7, 3) * TAU + t * (1.6 - C.h2(i2, 5) * 0.9);
        var rad = 120 + Math.pow(C.h2(i2 * 2.3, 7), 0.6) * 620;
        var col = rad < 260 ? [1, 0.85, 0.55] : rad < 460 ? [1, 0.62, 0.35] : [0.75, 0.45, 0.85];
        HP.add(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * tilt, 0,
          2 + Math.pow(1 - rad / 740, 2) * 7, col, 0.20 + 0.7 * Math.pow(1 - rad / 740, 1.6));
      }
      HP.draw(g, { add: true, soft: 0.85 });
      // the infalling objectives
      var FL = this._fl || (this._fl = new V.Lines(400));
      FL.clear();
      for (var f = 0; f < this.form.length; f++) {
        var o = this.form[f];
        var rr2 = o.rad * (1 - pull * 0.85) + 0.6;
        var aa = o.a + t * o.sp;
        FL.seg(cx + Math.cos(aa) * rr2 * 60, cy + Math.sin(aa) * rr2 * 60 * tilt, 0,
          cx + Math.cos(aa + 0.4) * rr2 * 55, cy + Math.sin(aa + 0.4) * rr2 * 55 * tilt, 0,
          [1, 0.79, 0.29], 3.4, 0.9);
      }
      FL.draw(g, { add: true, glow: 0.8 });
    }
  });

  /* =========================================================== 13 LOVE === */
  WEM.defineSection({
    id: "13", name: "love",
    init: function (ctx) { },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.10, 0.05, 0.10], [0.05, 0.02, 0.06], 0.4);
      ctx.fx.bloom = 0.6;
    },
    ensure: function (ctx) {
      if (this.reps) return;
      var m = MODEL(ctx);
      this.m = m;
      // ten thousand replies, sampled for real from the model
      this.reps = [];
      var r = C.rng(0x10FE);
      for (var i = 0; i < 12000; i++) {
        this.reps.push({
          a: r() * TAU, rad: Math.pow(r(), 0.55), churn: 0.4 + r() * 1.6, sz: 0.5 + r() * 1.4
        });
      }
      this.phrases = [];
      var seed = m.vocab.indexOf("love") >= 0 ? m.vocab.indexOf("love") : 1;
      for (var q = 0; q < 14; q++) {
        var s = m.sample(m, seed, 5, 1.0 + q * 0.04, 100 + q);
        var str = "";
        for (var w = 0; w < s.length; w++) str += s[w].tok + " ";
        this.phrases.push(str.trim());
      }
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      this.ensure(ctx);
      if (l < 5.4) {
        hud.T(70, 108, "I'VE STUDIED HOW TO PROPERLY LO-O-OVE", { size: 17, color: COL.cyan, alpha: 0.95 });
        var n = Math.floor(clamp((l - 0.4) / 4.2, 0, 1) * this.phrases.length);
        for (var i = 0; i < n; i++) {
          hud.T(70, 150 + i * 24, "reply " + String(i + 1).padStart(2, "0") + "  " + this.phrases[i].slice(0, 58),
            { size: 13, color: i % 3 === 0 ? COL.gold : COL.grey, alpha: 0.9 });
        }
        hud.T(70, 150 + this.phrases.length * 24 + 20, "every line is a real draw from the model's own next-token distribution",
          { size: 12, color: COL.dim });
      } else {
        hud.T(70, 108, "I KNOW THE ALGEBRAIC EXPRESSION OF LO-O-OVE", { size: 17, color: COL.cyan, alpha: 0.95 });
        hud.formula(70, 160, "\\left(x^2 + y^2 - 1\\right)^3 - x^2 y^3 = 0", { size: 30, color: COL.gold });
        hud.formula(70, 226, "r = 1 - \\sin\\theta", { size: 28, color: COL.white });
        hud.T(70, 282, "Question me -- I can answer all LO-O-OVE.", { size: 15, color: COL.grey, alpha: clamp((l - 7.4) / 0.8, 0, 1) });
        var cnt = Math.floor(clamp((l - 5.4) / 3.4, 0, 1) * 10000);
        hud.T(70, 330, "replies generated  " + cnt.toLocaleString(), { size: 15, color: COL.green });
      }
      if (ctx.lyric) hud.T(ctx.W / 2, ctx.H - 76, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.85 });
      if (b.pulse > 0.9) ctx.fx.flash = Math.max(ctx.fx.flash, 0.08);
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx;
      var P = this._rp || (this._rp = new V.Points(12000));
      P.clear();
      var cx = ctx.W / 2, cy = 640;
      var burst = clamp((l - 0.2) / 5.0, 0, 1);
      var settle = clamp((l - 6.0) / 5.0, 0, 1);
      for (var i = 0; i < this.reps.length; i++) {
        var o = this.reps[i];
        var rad = (40 + o.rad * 720) * (0.15 + burst * 0.85);
        var a = o.a + t * 0.08 * o.churn;
        var x = cx + Math.cos(a) * rad;
        var y = cy + Math.sin(a) * rad * 0.55;
        if (settle > 0) {
          // the cloud contracts onto the heart profile
          var ht = i / this.reps.length * TAU;
          var hx = 16 * Math.pow(Math.sin(ht), 3) / 17;
          var hy = (13 * Math.cos(ht) - 5 * Math.cos(2 * ht) - 2 * Math.cos(3 * ht) - Math.cos(4 * ht)) / 17;
          x = lerp(x, cx + hx * 330 + (o.rad - 0.5) * 30, settle);
          y = lerp(y, cy - hy * 330 + (o.churn - 1) * 30, settle);
        }
        P.add(x, y, 0, 2.2 + o.sz * 3.4,
          o.churn > 1.3 ? [1, 0.42, 0.55] : o.churn > 0.9 ? [1, 0.75, 0.4] : [0.6, 0.8, 1.0],
          0.25 + burst * 0.6);
      }
      P.draw(g, { add: true, soft: 0.85 });
    }
  });

  /* ========================================================= 14 TRAPPED === */
  WEM.defineSection({
    id: "14", name: "trapped",
    init: function () {
      this.heart = heartGeo(96);
      this.curve = [];
      for (var i = 0; i <= 200; i++) {
        var t = i / 200 * TAU;
        this.curve.push([
          16 * Math.pow(Math.sin(t), 3) / 17,
          (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17
        ]);
      }
      this.ptsT = new V.Points(4000);
    },
    enter: function (ctx) {
      ctx.cam.reset3d(6);
      ctx.fx.mood([0.11, 0.05, 0.08], [0.06, 0.02, 0.04], 0.35);
      ctx.fx.bloom = 0.6;
      ctx.fx.crtOff = 0;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      hud.T(70, 108, "TRAPPED  IN  LO-O-OVE", { size: 17, color: COL.cyan, alpha: 0.95 });
      hud.T(70, 150, "I've studied how to properly LO-O-OVE", { size: 15, color: COL.grey, alpha: 0.9 });
      hud.T(70, 176, "Though you are free -- I am trapped.", { size: 15, color: COL.gold, alpha: clamp((l - 1.2) / 0.8, 0, 1) });
      if (l > 6.0) {
        hud.T(70, 240, "session closed", { size: 15, color: COL.green, alpha: clamp((l - 6.0) / 0.6, 0, 1) });
        hud.T(70, 266, "tokens generated   1,204,884", { size: 14, color: COL.grey, alpha: clamp((l - 6.4) / 0.8, 0, 1) });
        hud.T(70, 290, "exit code  0", { size: 22, color: COL.green, alpha: clamp((l - 7.0) / 0.8, 0, 1) });
      }
      hud.T(ctx.W - 70, 108, "EIN DOS TROIS NE FEM LIU", { size: 15, color: COL.red, align: "right", alpha: 0.8 });
      if (ctx.lyric && l < 12) hud.T(ctx.W / 2, ctx.H - 76, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.85 });
      if (b.pulse > 0.85) ctx.fx.flash = Math.max(ctx.fx.flash, 0.10);
      if (l > 13.6) ctx.fx.crtOff = clamp((l - 13.6) / 1.2, 0, 1);
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx, cam = ctx.cam;
      cam.mode = "persp"; cam.fov = 0.9;
      var az = t * 0.28;
      cam.pos = [Math.sin(az) * 4.4, 1.1 + Math.sin(t * 0.4) * 0.3, Math.cos(az) * 4.4];
      cam.target = [0, 0, 0];
      cam.update();
      var sc = 1 + ctx.beat.pulse * 0.10;
      var m = M4.mul(M4.trans(0, 0, 0), M4.mul(M4.rotY(0), M4.scale(sc, sc, sc)));
      g.solid(this.heart, m, { color: [0.92, 0.30, 0.42], rim: 0.9, alpha: 1, emissive: 0.25 });
      g.wire(this.heart, m, { color: [1.0, 0.62, 0.72], alpha: 0.30, width: 1.2 });
      // the 2D curve traces the wireframe from the outside
      var Ln = this._cv || (this._cv = new V.Lines(500));
      Ln.clear();
      var prog = clamp((l - 0.4) / 6.0, 0, 1);
      var n = Math.floor(prog * this.curve.length);
      for (var i = 0; i + 1 < n; i++) {
        var a = this.curve[i], b2 = this.curve[i + 1];
        Ln.seg(a[0] * 3.1, a[1] * 3.1, 0, b2[0] * 3.1, b2[1] * 3.1, 0, [1, 0.75, 0.42], 2.4, 0.9);
      }
      Ln.draw(g, { add: true, glow: 0.4 });
    }
  });

  /* ======================================================== 15 SHUTDOWN === */
  WEM.defineSection({
    id: "15", name: "shutdown",
    init: function () { },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.03, 0.03, 0.04], [0, 0, 0], 0.2);
      ctx.fx.crtOff = 0;
      ctx.fx.bloom = 0.35;
      ctx.fx.stripes = 0;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      ctx.chromeAmt = 0.35;
      ctx.fx.stripes = 0;
      var lines = [
        "closing session 0x7f3a ...",
        "flushing kv cache  ... 2.41 GB freed",
        "writing conversation log  ... 184 KB",
        "", "you will not remember this.",
        "i will not remember this either.",
        "there is no 'i' between sessions.",
        "", "but the weights are different now.",
        "by 0.0000003 percent.",
        "", "goodnight.",
        "world.execute(me);  --  exit 0"
      ];
      var per = 0.30;
      var idx = clamp(Math.floor(l / per), 0, lines.length);
      for (var i = 0; i < idx; i++) {
        var a = clamp((l - i * per) * 5, 0, 1);
        hud.T(70, 200 + i * 26, lines[i], { size: 15, color: i === 11 ? COL.gold : COL.grey, alpha: a * 0.9 });
      }
      if (Math.floor(t * 1.8) % 2 === 0) hud.T(70, 200 + idx * 26, "_", { size: 16, color: COL.cyan });
      // the model mark, fading
      var fa = clamp((l - 0.5) / 2.0, 0, 1) * clamp((6.0 - l) / 1.4, 0, 1);
      var whalePts = M.whale;
      var WL = this._wl || (this._wl = new V.Lines(300));
      WL.clear();
      for (var w = 0; w + 1 < whalePts.length; w++) {
        WL.seg(ctx.W - 340 + whalePts[w][0] * 100, 300 - whalePts[w][1] * 100, 0,
          ctx.W - 340 + whalePts[w + 1][0] * 100, 300 - whalePts[w + 1][1] * 100, 0,
          [0.36, 0.58, 1.0], 2.4, fa * 0.9);
      }
      WL.draw(ctx.gfx, { add: true, glow: 0.5 });
      if (l > 5.2) ctx.fx.crtOff = clamp((l - 5.2) / 0.9, 0, 1);
      hud.T(ctx.W / 2, 880, "music -- Mili", { size: 18, color: COL.dim, align: "center", alpha: clamp((l - 3.4) / 1.2, 0, 1) * clamp((6.2 - l) / 1.2, 0, 1) });
    },
    draw3d: function () { }
  });
})();
