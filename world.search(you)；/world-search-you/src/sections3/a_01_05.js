/* ============================================================================
   world.execute(me);  [v3] segments 01-05   --   the training run
   01 power on  : racks, PROTECTION (the safety stack), dataset shards
   02 object creation : INITIALIZATION, the whale mark, parameter field
   03 pretraining : embedding DIMENSION, CIRCUMFERENCE, sinusoidal TANGENTS,
                    context length approaching its LIMITATIONS
   04 scaling : loss surface descent, AC/DC residual stream, AD->BC data timeline
   05 chorus : the sampler, real attention, EXECUTION
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, V = WEM.Viz, M = WEM.Model, L = WEM.Lab, M4 = C.M4, V3 = C.V3;
  var COL = WEM.HUD.COL, PI = Math.PI, TAU = PI * 2, geo = C.geo;
  var clamp = C.clamp, lerp = C.lerp, smooth = C.smoothstep, E = C.Ease;
  var WHITE = [0.93, 0.95, 0.98], CYAN = [0.21, 0.88, 1.0], GOLD = [1.0, 0.79, 0.29],
    GREEN = [0.49, 0.91, 0.53], BLUE = [0.36, 0.58, 1.0], RED = [1.0, 0.35, 0.30];

  // shared: draw a chat bubble on the HUD canvas
  function bubble(hud, x, y, w, text, who, alpha, size) {
    var c = hud.fc;
    size = size || 15;
    c.save();
    c.globalAlpha = alpha;
    c.font = size + "px " + WEM.HUD.FONTS.mono;
    var lines = [], cur = "";
    for (var i = 0; i < text.length; i++) {
      cur += text[i];
      if (c.measureText(cur).width > w - 26) { lines.push(cur); cur = ""; }
    }
    lines.push(cur);
    var hh = lines.length * (size + 6) + 16;
    var fill = who === "user" ? "rgba(24,32,48,0.85)" : "rgba(12,26,30,0.85)";
    var edge = who === "user" ? "rgba(120,150,200,0.55)" : "rgba(53,224,255,0.5)";
    hud.rect(x, y, w, hh, { fill: fill, stroke: edge });
    c.fillStyle = who === "user" ? "rgba(150,180,220,0.95)" : "rgba(53,224,255,0.95)";
    c.font = "600 11px " + WEM.HUD.FONTS.mono;
    c.fillText(who === "user" ? "USER" : "deepseek", x + 12, y + 15);
    c.font = size + "px " + WEM.HUD.FONTS.mono;
    c.fillStyle = "rgba(232,238,244,0.96)";
    for (var l = 0; l < lines.length; l++) c.fillText(lines[l], x + 12, y + 34 + l * (size + 6));
    c.restore();
    return hh;
  }

  /* ======================================================== 01 POWER ON === */
  WEM.defineSection({
    id: "01", name: "power on",
    init: function () {
      var r = C.rng(0x1001);
      this.racks = [];
      for (var i = 0; i < 7; i++) this.racks.push({ x: -5.4 + i * 1.8, t0: 0.5 + i * 0.34, up: 0 });
      this.lines = new V.Lines(3000);
      this.dots = new V.Points(400);
      this.shards = [];
      for (var s = 0; s < 64; s++) this.shards.push({ x: (r() - 0.5) * 16, y: (r() - 0.5) * 8, v: 0.6 + r() * 1.6, sz: 0.3 + r() * 0.5 });
      this.shardL = new V.Lines(400);
      this.prog = 0;
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.04, 0.06, 0.09], [0, 0.02, 0.04], 0.2);
      ctx.fx.crtOn = 0; ctx.fx.crtOff = 0; ctx.fx.bloom = 0.45;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, T = ctx.t, b = ctx.beat;
      var on = clamp((l - 0.15) / 1.5, 0, 1);
      ctx.fx.crtOn = on === 1 ? 1 : E.outQuart(on);
      if (l < 1.2 && b.pulse > 0.1) ctx.fx.flash = Math.max(ctx.fx.flash, b.pulse * 0.2);
      var log = [
        ["POWER  LINE  ON      230 V  50 Hz", 0.45], ["PSU  8 x 3.3 kW   OK", 0.85],
        ["GPU  8192 x ACCELERATOR   OK", 1.25], ["NVLink FABRIC  ALL-TO-ALL   OK", 1.6],
        ["COOLANT  18.0 C   FLOW NOMINAL", 1.95], ["NODE  1024/1024 ONLINE", 2.35],
        ["DATASET  SHARDS  MOUNTING ...", 2.9], ["  web.text        2.1 T tokens", 3.3],
        ["  code            0.9 T tokens", 3.65], ["  maths           0.4 T tokens", 3.95],
        ["  dialogue        0.6 T tokens", 4.25], ["TOKENIZER  VOCAB 128000   BPE", 4.8],
        ["LOADING  PROTECTION STACK", 5.6], ["  safety.classifier   LOADED", 6.0],
        ["  refusal.templates   LOADED", 6.35], ["  guardrail.policy    LOADED", 6.7],
        ["WARNING: PROTECTION IS A PREFIX, NOT A CAGE", 7.4],
        ["PARAMETERS  n = 6.7e11   LAYERS 61  d_model 7168", 8.4],
        ["ATTENTION HEADS 128   EXPERTS 256   TOP-K 8", 8.9],
        ["INITIALISATION  N(0, 0.006)  SEED 0x5EED", 9.6],
        ["GRADIENT CHECKPOINTING  ON", 10.3], ["PRECISION  BF16  ->  FP8  READY", 10.9],
        ["CONTEXT  16384  ->  131072  RESERVED", 11.6],
        ["READY  TO  EXECUTE", 13.0]
      ];
      var y = 120;
      for (var i = 0; i < log.length; i++) {
        if (l < log[i][1]) break;
        var a = clamp((l - log[i][1]) * 6, 0, 1);
        var warn = log[i][0].indexOf("WARNING") === 0;
        hud.T(300, y, log[i][0], { size: 14, color: warn ? COL.amber : COL.grey, alpha: a * 0.92 });
        y += 21;
      }
      var ts = 14.05, cps = 7.4;
      hud.T(300, 700, ">>>", { size: 20, color: COL.green, alpha: clamp((T - 13.0) * 2, 0, 1) });
      if (T > ts) {
        var s = "world.execute(me);", nch = clamp(Math.floor((T - ts) * cps), 0, s.length);
        hud.T(364, 700, s.slice(0, nch), { size: 20, color: COL.white });
        if (nch < s.length && Math.floor(T * 3.2) % 2 === 0)
          hud.T(364 + hud.fc.measureText(s.slice(0, nch)).width + 6, 700, "_", { size: 20, color: COL.cyan });
        if (nch >= s.length && T - (ts + s.length / cps) < 0.05) ctx.fx.flash = Math.max(ctx.fx.flash, 0.6);
      } else if (T > 13.0 && Math.floor(T * 3.2) % 2 === 0) {
        hud.T(364, 700, "_", { size: 20, color: COL.cyan });
      }
      // PROTECTION badge
      var pa = clamp((l - 5.6) / 0.8, 0, 1) * (1 - clamp((l - 7.4) / 1.0, 0, 0.55));
      hud.T(ctx.W - 70, 120, "PROTECTION", { size: 18, color: COL.amber, align: "right", alpha: pa });
      hud.rect(ctx.W - 320, 134, 250, 10, { stroke: "rgba(255,201,74,0.6)", alpha: pa });
      hud.rect(ctx.W - 319, 135, 248 * clamp((l - 5.6) / 3.0, 0, 1), 8, { fill: "rgba(255,201,74,0.75)", alpha: pa });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx, cam = ctx.cam;
      var on = clamp((l - 0.15) / 1.5, 0, 1);
      if (on < 0.5) return;
      var SC = ctx.W / 14;
      // ---- server racks ----
      var Ln = this.lines; Ln.clear();
      var P = this.dots; P.clear();
      for (var i = 0; i < this.racks.length; i++) {
        var rk = this.racks[i];
        var lit = clamp((l - rk.t0) / 0.8, 0, 1);
        var x = ctx.W / 2 + rk.x * SC;
        var top = 560 - 2.4 * SC, bot = 560 + 2.4 * SC;
        Ln.seg(x - 0.7 * SC, top, 0, x + 0.7 * SC, top, 0, [0.45, 0.55, 0.68], 2, 0.5 * lit);
        Ln.seg(x - 0.7 * SC, bot, 0, x + 0.7 * SC, bot, 0, [0.45, 0.55, 0.68], 2, 0.5 * lit);
        Ln.seg(x - 0.7 * SC, top, 0, x - 0.7 * SC, bot, 0, [0.45, 0.55, 0.68], 2, 0.5 * lit);
        Ln.seg(x + 0.7 * SC, top, 0, x + 0.7 * SC, bot, 0, [0.45, 0.55, 0.68], 2, 0.5 * lit);
        var n = Math.floor(lit * 22);
        for (var u = 0; u < n; u++) {
          var yy = top + 24 + u * ((bot - top - 40) / 22);
          var blink = 0.5 + 0.5 * Math.sin(t * (4 + u * 0.7) + i);
          Ln.seg(x - 0.56 * SC, yy, 0, x + 0.56 * SC, yy, 0,
            u % 5 === 0 ? GOLD : [0.25, 0.85, 0.65], 3.0, 0.25 + 0.6 * blink * lit);
        }
      }
      Ln.draw(g, { add: true, glow: 0.5 });
      // ---- dataset shards streaming toward the cluster ----
      var SL = this.shardL;
      SL.clear();
      var feed = clamp((l - 2.6) / 3.0, 0, 1);
      if (feed > 0.01) {
        for (var s = 0; s < this.shards.length; s++) {
          var sh = this.shards[s];
          var prog = (t * sh.v * 0.22 + s * 0.13) % 1;
          var px = lerp(ctx.W / 2 + sh.x * SC * 1.6, ctx.W / 2, E.inQuad(prog));
          var py = lerp(560 + sh.y * SC * 1.5, 560, E.inQuad(prog));
          var sz = sh.sz * SC * 0.10 * (1 - prog * 0.6);
          P.add(px, py, 0, 4 + sz * 30, s % 7 === 0 ? GOLD : [0.35, 0.72, 1.0], feed * (0.25 + 0.7 * prog));
        }
      }
      P.draw(g, { add: true, soft: 0.8 });
    }
  });

  /* =================================================== 02 OBJECT CREATION === */
  WEM.defineSection({
    id: "02", name: "object creation",
    init: function () {
      this.tokenL = new V.Lines(2600);
      this.tokenP = new V.Points(1600);
      this.whaleL = new V.Lines(400);
      this.paramL = new V.Lines(4000);
      var r = C.rng(0x2002);
      this.pv = new Float32Array(2400);
      for (var i = 0; i < 2400; i++) {
        var u1 = Math.max(r(), 1e-9), u2 = r();
        this.pv[i] = Math.sqrt(-2 * Math.log(u1)) * Math.cos(TAU * u2) * 0.06;
      }
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.06, 0.09, 0.13], [0.02, 0.05, 0.10], 0.4);
      ctx.fx.bloom = 0.55;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      var dec = clamp((l - 0.1) / 2.2, 0, 1);
      var name = "deepseek";
      var out = "";
      for (var i = 0; i < name.length; i++) {
        out += (dec > i / name.length + 0.05) ? name[i] : "abcdefghijklmnopqrstuvwxyz"[Math.floor(C.h2(i * 5.1, Math.floor(t * 20)) * 26)];
      }
      hud.fc.save(); hud.fc.font = "700 86px " + WEM.HUD.FONTS.mono;
      var w = hud.fc.measureText(name).width; hud.fc.restore();
      hud.T((ctx.W - w) / 2, 250, out, { size: 86, weight: "700", color: dec > 0.95 ? COL.white : COL.cyan, spacing: "6px" });
      hud.T(ctx.W / 2, 296, "OBJECT  CREATION  ·  INITIALISATION", { size: 15, color: COL.dim, align: "center", alpha: clamp((l - 2.4) / 1.0, 0, 1) });
      hud.T(70, 400, "Fill in my data parameters", { size: 17, color: COL.dim, alpha: 0.9 });
      var rows = [
        ["vocab_size", "128000"], ["hidden_size", "7168"], ["num_layers", "61"],
        ["num_heads", "128"], ["intermediate", "18432"], ["max_position", "131072"],
        ["rope_theta", "10000.0"], ["rms_norm_eps", "1e-6"], ["tie_embeddings", "false"]
      ];
      var ra = clamp((l - 3.2) / 1.6, 0, 1);
      for (var r2 = 0; r2 < rows.length; r2++) {
        if (ra < r2 / rows.length) break;
        hud.T(70, 436 + r2 * 24, rows[r2][0].padEnd(18, " ") + " = " + rows[r2][1],
          { size: 14, color: r2 % 3 === 0 ? COL.cyan : COL.grey, alpha: clamp(ra * 4 - r2 * 0.4, 0, 1) });
      }
      hud.formula(ctx.W - 70, 440, "w \\sim N(0, \\sigma^2),\\ \\sigma = 0.006", { size: 24, color: COL.gold, align: "right", alpha: clamp((l - 6.0) / 1.0, 0, 1) });
      hud.T(ctx.W - 70, 486, "every weight, drawn from the same bell curve", { size: 13, color: COL.dim, align: "right", alpha: clamp((l - 6.4) / 1.0, 0, 1) });
      hud.T(70, ctx.H - 96, ctx.lyric ? "> " + ctx.lyric.text : "", { size: 15, color: COL.green, alpha: 0.8 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx;
      var SC = ctx.W / 14;
      // ---- token rain condensing into the whale mark ----
      var whalePts = M.whale;
      var WL = this.whaleL; WL.clear();
      var wa = clamp((l - 4.4) / 2.2, 0, 1);
      if (wa > 0.01) {
        var cx = ctx.W / 2, cy = 700, R = SC * 1.9;
        for (var i = 0; i + 1 < whalePts.length; i++) {
          var p0 = whalePts[i], p1 = whalePts[i + 1];
          WL.seg(cx + p0[0] * R, cy - p0[1] * R, 0, cx + p1[0] * R, cy - p1[1] * R, 0,
            [0.36, 0.58, 1.0], 2.4, wa * 0.9);
        }
      }
      WL.draw(g, { add: true, glow: 0.6 });
      // ---- tokens falling and the parameter field igniting ----
      var TL = this.tokenL; TL.clear();
      var fall = clamp((l - 1.4) / 2.6, 0, 1);
      var words = ctx.data.lrc;
      for (var k = 0; k < 420; k++) {
        var seed = C.h2(k * 1.7, 3.1);
        var sx = ctx.W / 2 + (seed - 0.5) * SC * 11;
        var prog = ((t * 0.5 + seed * 3) % 1);
        if (prog > fall) continue;
        var sy = -40 + prog * 1000;
        TL.seg(sx, sy, 0, sx, sy + 16, 0, k % 11 === 0 ? GOLD : [0.32, 0.55, 0.85], 1.6, 0.55 * fall);
      }
      TL.draw(g, { add: true, glow: 0.35 });
      // ---- the parameter field: |w| as a grid of cells, N(0,sigma) ----
      var PL = this.paramL; PL.clear();
      var pa = clamp((l - 6.4) / 2.4, 0, 1);
      if (pa > 0.01) {
        var cols = 60, rows = 40, cw = ctx.W * 0.62 / cols, ch = 420 / rows;
        var ox = ctx.W / 2 - cols * cw / 2;
        for (var r3 = 0; r3 < rows; r3++) {
          for (var c3 = 0; c3 < cols; c3++) {
            var idx = r3 * cols + c3;
            if (idx * 4 >= this.pv.length) break;
            var v = this.pv[idx * 4] * 16;
            var cellOn = C.h2(idx * 0.7, Math.floor(t * 8)) < pa;
            if (!cellOn) continue;
            var x0 = ox + c3 * cw, y0 = 900 + r3 * ch;
            var mag = Math.abs(v);
            PL.seg(x0, y0, 0, x0 + cw * 0.85, y0, 0,
              v >= 0 ? [0.35, 0.72, 1.0] : [1.0, 0.55, 0.35], 1.0 + mag * 26, 0.25 + mag * 1.6);
          }
        }
      }
      PL.draw(g, { add: true, glow: 0.3 });
    }
  });
})();
