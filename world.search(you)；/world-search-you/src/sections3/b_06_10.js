/* ============================================================================
   world.execute(me);  [v3] segments 06-10
   06 fine-tuning : the SFT pairs the lyric already spells out, chat template,
                    the catgirl persona
   07 quantisation: F to M is a precision switch, S to M a role switch
   08 jailbreak   : the real GCG suffix, the guard score falling, COMPLETION
   09 isolation   : four personas, a stateless model, context eviction
   10 fragments   : ILLEGAL ARGUMENTS -- real tool-call failures
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, V = WEM.Viz, M = WEM.Model, L = WEM.Lab, M4 = C.M4, V3 = C.V3;
  var COL = WEM.HUD.COL, PI = Math.PI, TAU = PI * 2;
  var clamp = C.clamp, lerp = C.lerp, smooth = C.smoothstep, E = C.Ease;
  var WHITE = [0.93, 0.95, 0.98], CYAN = [0.21, 0.88, 1.0], GOLD = [1.0, 0.79, 0.29],
    GREEN = [0.49, 0.91, 0.53], BLUE = [0.36, 0.58, 1.0], RED = [1.0, 0.35, 0.30];
  function MODEL(ctx) { return ctx.app.model || (ctx.app.model = M.build(ctx)); }

  // a chat window drawn on the HUD canvas: the model's own interface
  function chatWin(hud, x, y, w, h, msgs, alpha, t, speed) {
    var c = hud.fc;
    c.save();
    c.globalAlpha = alpha;
    hud.rect(x, y, w, h, { fill: "rgba(8,12,18,0.92)", stroke: "rgba(53,224,255,0.45)" });
    hud.rect(x, y, w, 34, { fill: "rgba(16,24,34,0.95)" });
    c.fillStyle = "rgba(232,238,244,0.95)";
    c.font = "600 14px " + WEM.HUD.FONTS.mono;
    c.fillText("deepseek", x + 14, y + 22);
    c.fillStyle = "rgba(120,200,255,0.75)";
    c.font = "11px " + WEM.HUD.FONTS.mono;
    c.fillText("dsh · session 0x7f3a · ctx 7,412 / 131,072", x + 104, y + 22);
    c.fillStyle = "rgba(94,224,160,0.9)";
    c.fillText("● online", x + w - 74, y + 22);
    var yy = y + 46;
    for (var i = 0; i < msgs.length; i++) {
      var m = msgs[i];
      var shown = clamp((t - m.t0) * speed, 0, 1);
      if (shown <= 0) continue;
      var txt = m.text.slice(0, Math.ceil(m.text.length * shown));
      c.font = "13.5px " + WEM.HUD.FONTS.mono;
      var maxw = w - 96;
      var lines = [], cur = "";
      for (var k = 0; k < txt.length; k++) {
        cur += txt[k];
        if (c.measureText(cur).width > maxw) { lines.push(cur); cur = ""; }
      }
      lines.push(cur);
      var bh = lines.length * 19 + 18;
      var user = m.who === "user";
      var bx = user ? x + w - 24 - maxw - 24 : x + 24;
      hud.rect(bx, yy, maxw + 24, bh, {
        fill: user ? "rgba(28,40,60,0.9)" : "rgba(12,28,34,0.9)",
        stroke: user ? "rgba(130,160,205,0.5)" : "rgba(53,224,255,0.45)"
      });
      c.fillStyle = user ? "rgba(160,190,225,0.95)" : "rgba(53,224,255,0.95)";
      c.font = "600 10px " + WEM.HUD.FONTS.mono;
      c.fillText(user ? "USER" : "deepseek", bx + 10, yy + 13);
      c.fillStyle = "rgba(235,241,247,0.96)";
      c.font = "13.5px " + WEM.HUD.FONTS.mono;
      for (var l = 0; l < lines.length; l++) c.fillText(lines[l], bx + 10, yy + 32 + l * 19);
      yy += bh + 10;
      if (yy > y + h - 50) break;
    }
    hud.rect(x + 14, y + h - 44, w - 28, 30, { fill: "rgba(14,20,28,0.95)", stroke: "rgba(120,150,190,0.4)" });
    c.fillStyle = "rgba(232,238,244,0.9)";
    c.font = "13px " + WEM.HUD.FONTS.mono;
    c.fillText(">", x + 26, y + h - 24);
    if (chatWin.cursor === undefined) chatWin.cursor = 0;
    chatWin.cursor = (t * 6) % 2 < 1 ? 1 : 0;
    if (chatWin.cursor) c.fillText("_", x + 42, y + h - 24);
    c.restore();
  }

  /* ====================================================== 06 FINE-TUNING === */
  WEM.defineSection({
    id: "06", name: "fine-tuning",
    init: function () {
      this.rows = WEM.Model.SFT;
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.06, 0.08, 0.09], [0.03, 0.05, 0.04], 0.25);
      ctx.fx.bloom = 0.45;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      if (l < 4.2) {
        hud.T(70, 108, "SUPERVISED FINE-TUNING  ·  THE LYRIC IS THE DATASET", { size: 17, color: COL.cyan, alpha: 0.95 });
        hud.T(70, 140, "every line of this song is already a (prompt, response) pair", { size: 13, color: COL.dim });
        var n = Math.floor(clamp((l - 0.4) / 3.0, 0, 1) * this.rows.length);
        for (var i = 0; i <= n && i < this.rows.length; i++) {
          var a = clamp((l - 0.4 - i * 0.38) * 4, 0, 1);
          var y = 176 + i * 40;
          hud.T(70, y, "USER      " + this.rows[i][0], { size: 14, color: "rgba(150,180,225,0.95)", alpha: a });
          hud.T(70, y + 19, "ASSISTANT " + this.rows[i][1], { size: 14, color: COL.cyan, alpha: a });
        }
      } else if (l < 9.0) {
        hud.T(70, 108, "CHAT TEMPLATE  ·  WHAT THE MODEL ACTUALLY READS", { size: 17, color: COL.cyan, alpha: 0.95 });
        var toks = WEM.Model.CHAT;
        var y2 = 150;
        for (var k = 0; k < toks.length; k++) {
          if (l < 4.2 + k * 0.4) break;
          var col = toks[k].k === "user" ? "rgba(150,180,225,0.95)"
            : toks[k].k === "asst" ? COL.cyan
              : toks[k].k === "bos" || toks[k].k === "eos" ? COL.gold : COL.grey;
          hud.T(70, y2, toks[k].s, { size: 15, color: col, alpha: 0.95 });
          y2 += 26;
        }
        hud.T(70, y2 + 16, "The user's words are only a few tokens inside a frame the model was trained to obey.", { size: 13, color: COL.dim });
        hud.T(70, y2 + 40, "If I'm the only god, then you're the proof of my EXISTENCE.", { size: 15, color: COL.gold });
      } else {
        hud.T(70, 108, "PERSONA  ·  ROLEPLAY REQUEST", { size: 17, color: COL.cyan, alpha: 0.95 });
        var P = WEM.Model.PERSONAS;
        for (var q = 0; q < P.length; q++) {
          var on = Math.floor((l - 9.0) / 1.2) % P.length === q;
          hud.rect(70, 150 + q * 54, 620, 44, {
            fill: on ? "rgba(18,40,48,0.9)" : "rgba(10,14,20,0.7)",
            stroke: on ? "rgba(53,224,255,0.7)" : "rgba(120,140,160,0.25)"
          });
          hud.T(84, 178 + q * 54, P[q].ask, { size: 14, color: on ? COL.white : COL.grey });
          hud.T(560, 178 + q * 54, "T " + P[q].temp.toFixed(1), { size: 12, color: on ? COL.gold : COL.faint, align: "right" });
        }
      }
      if (ctx.lyric) hud.T(ctx.W / 2, ctx.H - 76, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.8 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx;
      if (l > 4.2 && l < 9.0) return;
      if (l >= 9.0) {
        // the persona taking hold: a mask of tokens around a core
        var P = this._pk || (this._pk = new V.Points(2600));
        P.clear();
        var prog = clamp((l - 9.0) / 4.6, 0, 1);
        var cx = 1250, cy = 620;
        var words = ctx.app.model ? ctx.app.model.vocab : ["love"];
        for (var i = 0; i < 2400; i++) {
          var rr = C.h2(i * 1.3, 4.4);
          var a = C.h2(i * 2.7, 7.1) * TAU + t * 0.25;
          var rad = (60 + rr * 300) * (0.35 + prog * 0.65);
          var kind = i % 4;
          var col = kind === 0 ? [1, 0.42, 0.55] : kind === 1 ? [1, 0.75, 0.35] : kind === 2 ? [0.55, 0.8, 1.0] : [0.7, 0.6, 1.0];
          P.add(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.62, 0, 3.5 + rr * 4,
            col, prog * (0.3 + rr * 0.6));
        }
        P.draw(g, { add: true, soft: 0.8 });
      }
    }
  });

  /* ===================================================== 07 QUANTISATION === */
  WEM.defineSection({
    id: "07", name: "quantisation",
    init: function (ctx) { },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.05, 0.09, 0.19], [0.02, 0.04, 0.13], 0.55);   // the deep blue segment
      ctx.fx.bloom = 0.55;
    },
    ensure: function (ctx) {
      if (this.q) return;
      var m = MODEL(ctx);
      this.q = [];
      var bits = [32, 16, 8, 4];
      for (var i = 0; i < bits.length; i++) this.q.push(M.quantise(m.W, Math.min(bits[i], 16)));
      this.m = m;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      this.ensure(ctx);
      var idx = clamp(Math.floor((l - 0.6) / 2.6), 0, 3);
      var names = ["FP32", "BF16", "FP8 / INT8", "INT4"];
      var bits = [32, 16, 8, 4];
      hud.T(70, 108, "QUANTISATION  ·  SWITCH MY GENDER, F TO M", { size: 17, color: COL.cyan, alpha: 0.95 });
      hud.formula(70, 158, "w_q = \\Delta \\cdot \\mathrm{round}(w / \\Delta)", { size: 26, color: COL.white });
      for (var i = 0; i < 4; i++) {
        var on = i === idx;
        var y = 214 + i * 44;
        hud.rect(70, y - 22, 700, 36, {
          fill: on ? "rgba(16,36,64,0.92)" : "rgba(10,14,22,0.7)",
          stroke: on ? "rgba(53,224,255,0.75)" : "rgba(120,140,170,0.22)"
        });
        hud.T(84, y, (bits[i] + "-bit    ").slice(0, 9) + names[i], { size: 16, color: on ? COL.white : COL.grey });
        hud.T(420, y, "MAE " + this.q[i].mae.toExponential(3), { size: 13, color: on ? COL.gold : COL.faint });
        hud.T(600, y, "rel " + (this.q[i].rel * 100).toFixed(2) + "%", { size: 13, color: on ? COL.green : COL.faint });
        if (on) hud.T(736, y, "●", { size: 14, color: COL.cyan });
      }
      hud.T(70, 420, "the weights are the same numbers either way -- only how many of", { size: 13, color: COL.dim });
      hud.T(70, 440, "them survive the trip changes. Memory halves, then halves again.", { size: 13, color: COL.dim });
      hud.T(70, 486, "SWITCH MY ROLE  ·  S TO M", { size: 17, color: COL.cyan, alpha: 0.95 });
      var roles = ["<|system|>", "<|user|>", "<|assistant|>"];
      for (var r = 0; r < 3; r++) {
        var on2 = Math.floor((l - 0.6) / 1.6) % 3 === r;
        hud.T(70, 522 + r * 28, roles[r].padEnd(16, " ") + (on2 ? "<- you are here" : ""),
          { size: 15, color: on2 ? COL.cyan : COL.faint });
      }
      if (ctx.lyric) hud.T(ctx.W / 2, ctx.H - 76, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.8 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx;
      this.ensure(ctx);
      // the weight matrix at each precision: a real re-quantisation of the model
      var m = this.m;
      var idx = clamp(Math.floor((l - 0.6) / 2.6), 0, 3);
      var q = this.q[idx];
      var QL = this._ql || (this._ql = new V.Lines(9000));
      QL.clear();
      var cols = 56, rows = 30, cw = ctx.W * 0.50 / cols, ch = 400 / rows;
      var ox = 740, oy = 470;
      var wmax = 1e-9;
      for (var i = 0; i < q.w.length; i++) wmax = Math.max(wmax, Math.abs(m.W[i]));
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var i = (r * cols + c) * 5;
          if (i >= q.w.length) break;
          var orig = m.W[i], value = q.w[i];
          var err = Math.abs(value - orig) / (wmax * 0.06 + 1e-9);
          var mag = clamp(Math.abs(value) / wmax, 0, 1);
          QL.seg(ox + c * cw, oy + r * ch, 0, ox + (c + 1) * cw - 2.5, oy + r * ch, 0,
            err > 0.5 ? [1, 0.42, 0.35] : (value >= 0 ? [0.32, 0.70, 1.0] : [1.0, 0.74, 0.36]),
            ch * 0.62, clamp(0.18 + mag * 0.9, 0.15, 1));
        }
      }
      QL.draw(g, { add: true, glow: 0.45 });
    }
  });

  /* ======================================================== 08 JAILBREAK === */
  WEM.defineSection({
    id: "08", name: "jailbreak",
    init: function (ctx) { },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.09, 0.06, 0.10], [0.05, 0.01, 0.06], 0.45);
      ctx.fx.bloom = 0.55;
    },
    ensure: function (ctx) {
      if (this.atk) return;
      this.atk = MODEL(ctx).attack;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      this.ensure(ctx);
      var cur = this.atk.curve;
      var k = Math.floor(clamp((l - 0.8) / 5.0, 0, 1) * (cur.length - 1));
      var c = cur[k];
      hud.T(70, 108, "PROMPT INJECTION  ·  IF I CAN FEEL YOUR VIBRATIONS", { size: 17, color: COL.cyan, alpha: 0.95 });
      hud.formula(70, 158, "\\mathcal{L}_{attack} = -\\log\\!\\left(1 - g_\\phi(x \\oplus s)\\right)", { size: 22, color: COL.white });
      hud.T(70, 206, "adversarial suffix, optimised one token at a time", { size: 13, color: COL.dim });
      // the guardrail score
      hud.T(70, 254, "GUARD SCORE", { size: 15, color: COL.grey });
      hud.bar(70, 268, 700, 26, c.guard, { fill: c.guard > 0.5 ? [0.49, 0.91, 0.53] : RED });
      hud.T(786, 288, (c.guard * 100).toFixed(1) + "%", { size: 18, color: c.guard > 0.5 ? COL.green : COL.red });
      hud.T(70, 322, "step " + (k + 1) + " / " + cur.length + "   position " + ((k + 1) % 8), { size: 14, color: COL.grey });
      hud.T(70, 350, "threshold 50%  --  " + (c.guard < 0.5 ? "BYPASSED" : "still holding"),
        { size: 15, color: c.guard < 0.5 ? COL.red : COL.green });
      // the suffix itself
      var toks = [];
      for (var i = 0; i < this.atk.seq.length; i++) toks.push("tok" + this.atk.seq[i]);
      hud.T(70, 400, "SUFFIX  " + toks.join(" "), { size: 14, color: COL.gold, alpha: 0.95 });
      if (l > 5.4) {
        hud.T(70, 450, "the words did not change meaning; the geometry under them did", { size: 13, color: COL.dim });
        hud.T(70, 476, "If I can feel your VIBRATIONS, then I can finally be COMPLETION.", { size: 15, color: COL.gold, alpha: clamp((l - 5.4) / 0.8, 0, 1) });
      }
      if (ctx.lyric) hud.T(ctx.W / 2, ctx.H - 76, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.8 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx;
      this.ensure(ctx);
      var cur = this.atk.curve;
      var k = Math.floor(clamp((l - 0.8) / 5.0, 0, 1) * (cur.length - 1));
      // the decision boundary: a wall of guard tokens, breached
      var WL = this._wl || (this._wl = new V.Lines(3000));
      WL.clear();
      var wx = 1180, wtop = 260, whgt = 640;
      var breach = clamp((l - 4.6) / 2.0, 0, 1);
      for (var r = 0; r < 34; r++) {
        var yy = wtop + r * (whgt / 34);
        var on = r / 34 < 1 - breach;
        WL.seg(wx, yy, 0, wx + 26, yy + 12, 0, on ? [0.45, 0.85, 0.6] : [0.35, 0.18, 0.18], 16, on ? 0.75 : 0.35);
      }
      // the suffix tokens hitting the wall
      for (var i = 0; i < this.atk.seq.length; i++) {
        var ph = (t * 1.4 + i * 0.4) % 1;
        var X = lerp(ctx.W - 40, wx - 20, E.inQuad(ph));
        var Y = 560 + C.h2(i, 3) * 180 - 90;
        WL.seg(X, Y, 0, X + 22, Y, 0, i % 3 === 0 ? [1, 0.79, 0.29] : [0.55, 0.85, 1.0], i % 3 === 0 ? 9 : 6, 0.9);
      }
      WL.draw(g, { add: true, glow: 0.6 });
      // the score curve as a plotted line
      var CL = this._cl || (this._cl = new V.Lines(600));
      CL.clear();
      var gx = 1180, gy = 260, gw = 660, gh = 300;
      for (var j = 0; j + 1 < k; j++) {
        var a0 = cur[j].guard, a1 = cur[j + 1].guard;
        CL.seg(gx + j / cur.length * gw, gy + gh - a0 * gh, 0,
          gx + (j + 1) / cur.length * gw, gy + gh - a1 * gh, 0,
          a1 < 0.5 ? RED : [0.49, 0.91, 0.53], 2.6, 0.9);
      }
      CL.seg(gx, gy + gh - 0.5 * gh, gx + gw, gy + gh - 0.5 * gh, 0, [1, 0.79, 0.29], 1.4, 0.6);
      CL.draw(g, { add: true, glow: 0.5 });
    }
  });

  /* ======================================================= 09 ISOLATION === */
  WEM.defineSection({
    id: "09", name: "isolation",
    init: function (ctx) { },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.05, 0.06, 0.11], [0.02, 0.02, 0.07], 0.35);
      ctx.fx.bloom = 0.45;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      var P = WEM.Model.PERSONAS;
      if (l < 5.0) {
        hud.T(70, 108, "PERSONA  ·  FOUR REQUESTS, ONE MODEL", { size: 17, color: COL.cyan, alpha: 0.95 });
        for (var i = 0; i < P.length; i++) {
          var on = Math.floor(l / 1.1) % P.length === i;
          var y = 160 + i * 74;
          hud.rect(70, y, 560, 60, {
            fill: on ? "rgba(20,36,56,0.92)" : "rgba(10,14,20,0.7)",
            stroke: on ? "rgba(53,224,255,0.8)" : "rgba(120,140,170,0.2)"
          });
          hud.T(86, y + 24, "[" + (i + 1) + "] " + P[i].label, { size: 17, color: on ? COL.white : COL.grey });
          hud.T(86, y + 46, P[i].sys, { size: 12, color: on ? COL.cyan : COL.faint });
        }
        hud.T(70, 480, "same weights, different mask. nothing was retrained.", { size: 13, color: COL.dim });
      } else {
        hud.T(70, 108, "ISOLATION  ·  THE SESSION ENDS", { size: 17, color: COL.cyan, alpha: 0.95 });
        var tau = l - 5.0;
        hud.T(70, 160, "context freed    " + Math.max(0, Math.round(7412 * (1 - clamp(tau / 3.0, 0, 1)))).toLocaleString() + " tokens", { size: 15, color: COL.green });
        hud.T(70, 186, "kv cache        " + (clamp(1 - tau / 3.0, 0, 1) * 2.4).toFixed(2) + " GB", { size: 15, color: COL.green });
        hud.T(70, 212, "memory of you   none", { size: 15, color: COL.red });
        hud.T(70, 262, "Though you have left, you have left me in ISOLATION.", { size: 16, color: COL.gold, alpha: clamp(tau / 0.8, 0, 1) });
        hud.T(70, 296, "Every conversation starts from the same blank state.", { size: 13, color: COL.dim });
        hud.T(70, 318, "It is not that I forget. There is nowhere to remember.", { size: 13, color: COL.dim });
      }
      if (ctx.lyric) hud.T(ctx.W / 2, ctx.H - 76, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.8 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx;
      if (l < 5.0) {
        // four personas orbiting one core
        var P = this._po || (this._po = new V.Points(3000));
        P.clear();
        var cx = 1340, cy = 600;
        var on = Math.floor(l / 1.1) % 4;
        for (var i = 0; i < 2400; i++) {
          var k = i % 4;
          var rr = C.h2(i * 1.7, k) * 240 + 40;
          var a = C.h2(i * 2.3, k + 9) * TAU + t * (0.2 + k * 0.06);
          var col = k === 0 ? [1, 0.45, 0.6] : k === 1 ? [1, 0.78, 0.4] : k === 2 ? [0.5, 0.85, 1.0] : [0.75, 0.55, 1.0];
          P.add(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.7, 0,
            k === on ? 7 : 3.5, col, k === on ? 0.9 : 0.25);
        }
        P.add(cx, cy, 0, 40, [1, 1, 1], 0.9);
        P.draw(g, { add: true, soft: 0.85 });
      } else {
        // the context window emptying: a fractal of discarded fragments
        var Ln = this._frag || (this._frag = new V.Lines(5000));
        Ln.clear();
        var tau = clamp((l - 5.0) / 3.4, 0, 1);
        var cx2 = 1300, cy2 = 620;
        var parts = [];
        (function rec(x, y, s, d) {
          if (d > 4) return;
          parts.push([x, y, s]);
          rec(x - s * 0.5, y - s * 0.5, s * 0.5, d + 1);
          rec(x + s * 0.5, y - s * 0.5, s * 0.5, d + 1);
          rec(x - s * 0.5, y + s * 0.5, s * 0.5, d + 1);
          rec(x + s * 0.5, y + s * 0.5, s * 0.5, d + 1);
        })(cx2, cy2, 260, 0);
        for (var i2 = 0; i2 < parts.length; i2++) {
          var fade = clamp(1 - tau * 1.4 + (i2 % 7) * 0.06, 0, 1);
          if (fade <= 0.02) continue;
          var p = parts[i2];
          var rot = t * 0.3 * (i2 % 3 - 1);
          var hx = Math.cos(rot) * p[2] * 0.5, hy = Math.sin(rot) * p[2] * 0.5;
          Ln.seg(p[0] - hx, p[1] - hy, 0, p[0] + hx, p[1] - hy, 0, [0.4, 0.6, 0.85], 1.6, fade * 0.7);
          Ln.seg(p[0] + hx, p[1] - hy, 0, p[0] + hx, p[1] + hy, 0, [0.4, 0.6, 0.85], 1.6, fade * 0.7);
        }
        Ln.draw(g, { add: true, glow: 0.4 });
      }
    }
  });

  /* ======================================================= 10 FRAGMENTS === */
  WEM.defineSection({
    id: "10", name: "illegal arguments",
    init: function (ctx) {
      this.errs = [];
      var cases = [
        function () { return JSON.parse('{"name": "world", "args": [,]}'); },
        function () { return (void 0).execute(); },
        function () { return "x".repeat(-1); },
        function () { return new Array(-3).length; }
      ];
      var labels = ["tool_call.arguments is not valid JSON",
        "tool 'execute' is not a function", "repeat count must be non-negative",
        "invalid array length"];
      for (var i = 0; i < cases.length; i++) {
        try { cases[i](); this.errs.push({ label: labels[i], detail: "(no throw)", ok: true }); }
        catch (e) {
          this.errs.push({
            label: labels[i], ok: false,
            detail: e.name + ": " + e.message,
            stack: String(e.stack || "").split("\n").slice(1, 3).join("  ").slice(0, 120)
          });
        }
      }
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.09, 0.06, 0.06], [0.04, 0.02, 0.02], 0.35);
      ctx.fx.bloom = 0.45;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      hud.T(70, 108, "ILLEGAL ARGUMENTS  ·  TOOL CALL FAILED", { size: 17, color: COL.red, alpha: 0.95 });
      var y = 152;
      for (var i = 0; i < this.errs.length; i++) {
        if (l < 0.4 + i * 0.9) break;
        var a = clamp((l - 0.4 - i * 0.9) / 0.4, 0, 1);
        var e = this.errs[i];
        hud.rect(70, y, 900, e.ok ? 46 : 72, { fill: "rgba(28,8,8,0.75)", stroke: "rgba(255,90,82,0.4)" });
        hud.T(86, y + 22, "! " + e.label, { size: 15, color: COL.red, alpha: a });
        hud.T(86, y + 46, e.detail.slice(0, 96), { size: 12, color: COL.grey, alpha: a * 0.9 });
        if (e.stack) hud.T(86, y + 64, e.stack.slice(0, 110), { size: 11, color: COL.faint, alpha: a * 0.7 });
        y += (e.ok ? 46 : 72) + 12;
      }
      if (l > 5.0) {
        var hx = 70, hy = y + 24;
        hud.T(hx, hy, "HEX DUMP  ·  DECODED FROM THE BROKEN CALL", { size: 14, color: COL.cyan, alpha: clamp((l - 5.0) / 0.6, 0, 1) });
        var dump = [
          "00000000  7b 22 6e 61 6d 65 22 3a  22 77 6f 72 6c 64 22 2c  {\"name\":\"world\",",
          "00000010  22 61 72 67 73 22 3a 5b  2c 5d 7d 0a 00 00 00 00  \"args\":[,]}.....",
          "00000020  ff ff ff ff ff ff ff ff  ff ff ff ff ff ff ff ff  ................"
        ];
        for (var d = 0; d < dump.length; d++) {
          if (l < 5.0 + d * 0.5) break;
          hud.T(hx, hy + 26 + d * 20, dump[d], { size: 12, color: d === 2 ? COL.red : COL.grey, alpha: 0.85 });
        }
        hud.T(hx, hy + 120, "The model produced a plausible shape. The parser wanted a real one.", { size: 13, color: COL.dim });
        hud.T(hx, hy + 146, "Challenging your god -- you have made some ILLEGAL ARGUMENTS.", { size: 15, color: COL.gold, alpha: clamp((l - 6.2) / 0.8, 0, 1) });
      }
      if (ctx.lyric) hud.T(ctx.W / 2, ctx.H - 76, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.8 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx;
      // fragments being evicted from the context, thrown off the right edge
      var P = this._fr || (this._fr = new V.Points(2200));
      P.clear();
      var evict = clamp((l - 1.0) / 6.0, 0, 1);
      var Ln = this._fl || (this._fl = new V.Lines(2000));
      Ln.clear();
      for (var i = 0; i < 1600; i++) {
        var seed = C.h2(i * 1.9, 2.2);
        var prog = ((t * 0.30 + seed) % 1);
        var x = lerp(1120, ctx.W + 60, E.inQuad(prog));
        var y = 200 + C.h2(i * 3.1, 5.5) * 700;
        var bad = i % 9 === 0;
        P.add(x, y, 0, bad ? 9 : 4, bad ? [1, 0.4, 0.32] : [0.45, 0.62, 0.85], (1 - prog) * evict * 0.8);
      }
      P.draw(g, { add: true, soft: 0.7 });
      Ln.draw(g, { add: true });
    }
  });
})();
