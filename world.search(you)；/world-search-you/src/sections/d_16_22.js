/* ============================================================================
   world.search(you);  --  sections 16-22
   16 lostself : "my old self that's gone since you have left"
   17 buckets  : "each one of us has a bucket of love"
   18 tokens   : "cut this into pieces... merge us back up"
   19 callback : the flower and the human again, with context
   20 search3  : "I'm searching" -- the index is nearly exhausted
   21 dogfruit : "if you're a dog" / "if you're a fruit"
   22 outro    : one result, then the machine powers down
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, V = WEM.Viz, M4 = C.M4, V3 = C.V3;
  var COL = WEM.HUD.COL, PI = Math.PI, TAU = PI * 2;
  var clamp = C.clamp, lerp = C.lerp, smooth = C.smoothstep, E = C.Ease;
  var S = WEM.SUI;
  var tw = S.tw;

  var CYAN = [0.21, 0.88, 1.0], GOLD = [1.0, 0.79, 0.29], RED = [1.0, 0.35, 0.32];
  var GREEN = [0.49, 0.91, 0.53], PINK = [1.0, 0.56, 0.82], PURPLE = [0.72, 0.55, 1.0];
  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }

  /* ======================================================= 16 LOST SELF ==== */
  WEM.defineSection({
    id: "16", name: "lostself",
    init: function () { this.parts = []; },
    enter: function (ctx) {
      ctx.cam.reset3d(9);
      ctx.fx.mood([0.05, 0.07, 0.14], [0.01, 0.02, 0.05], 0.42);
      ctx.fx.bloom = 0.42;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, T = ctx.t, b = ctx.beat;
      // deliberately almost empty: this is the quiet hole in the film
      var del = 1.55;
      var k = clamp((l - del) / 0.55, 0, 1);
      var gone = clamp((l - del - 0.9) / 0.7, 0, 1);
      // the one row
      var x = 360, y = 460, w = 1200;
      if (gone < 1) {
        hud.rect(x, y, w, 92, { fill: "rgba(9,11,15,0.85)", stroke: "rgba(228,235,242," + (0.42 * (1 - gone)) + ")", lw: 1.4 });
        S.resultRow(ctx, x + 28, y + 54, w - 56, {
          rank: "#0042", name: "MY OLD SELF", score: 0.9994, state: k > 0.4 ? "dead" : null,
          alpha: (1 - gone), nameW: tw(hud, "MY OLD SELF", 14, null),
          id: "0x" + S.hex(0x0de1e7ed, 8)
        });
      }
      if (k > 0 && gone < 1) {
        hud.T(x + w / 2, y + 128, "DELETE  /idx/you/self/0042", {
          size: 15, color: COL.red, align: "center", alpha: k * (1 - gone)
        });
        hud.T(x + w / 2, y + 150, "reason: the referent has left", { size: 12, color: COL.faint, align: "center", alpha: k * (1 - gone) });
      }
      if (gone > 0) {
        hud.T(960, 470, "0 RESULTS", { size: 64, color: "rgba(122,140,168,0.9)", align: "center", weight: "700", alpha: gone * 0.9 });
        hud.rect(660, 510, 600, 120, { stroke: "rgba(122,140,168,0.55)", lw: 1.4, dash: [10, 8], alpha: gone });
        hud.T(960, 570, "the old self is not in the index", { size: 15, color: COL.faint, align: "center", alpha: gone });
        hud.T(960, 594, "it left with you", { size: 15, color: "rgba(122,140,168,0.9)", align: "center", alpha: clamp((l - 3.0) * 1.6, 0, 1) });
      }
      hud.T(960, 250, "> " + String(ctx.lyric ? ctx.lyric.text : ""), { size: 16, color: "rgba(160,180,205,0.85)", align: "center" });
      // a single horizon line, breathing on the bar
      hud.line(120, 800, 1800, 800, { color: "rgba(122,140,168," + (0.18 + 0.22 * b.barPulse) + ")", lw: 1 });
      hud.T(120, 826, "queries today 1   results 0   affect \u2014", { size: 12, color: "rgba(122,140,168,0.7)" });
    },
    draw3d: function (ctx) {
      var l = ctx.local, T = ctx.t;
      ctx.cam.pos = [0, 0.3, 7.0]; ctx.cam.target = [0, -0.1, 0];
      ctx.cam.fov = 0.95; ctx.cam.update();
      var g = new V.Lines(1400);
      var gone = clamp((l - 2.45) / 1.0, 0, 1);
      for (var i = 0; i < 22; i++) {
        var x = -8.25 + i * 0.75;
        var a = 0.30 * (1 - gone);
        g.seg(x, -2.2, 3.0, x, -2.2, -3.0, [0.42, 0.50, 0.62], 1.0, a);
      }
      for (var k = 0; k < 10; k++) {
        var z = 3.0 - k * 0.6;
        g.seg(-8.25, -2.2, z, 8.25, -2.2, z, [0.42, 0.50, 0.62], 1.0, 0.30 * (1 - gone));
      }
      // one point of light that goes out
      var on = 1 - clamp((l - 1.55) / 0.8, 0, 1);
      if (on > 0.01) {
        var P = new V.Points(1);
        P.add(0, -0.2, 0, 10 * on, [0.9, 0.95, 1.0], on);
        P.draw(ctx.gfx, { add: true, soft: 0.9 });
      }
      g.draw(ctx.gfx, { add: true });
    }
  });

  /* ========================================================= 17 BUCKETS ==== */
  WEM.defineSection({
    id: "17", name: "buckets",
    init: function () {
      var r = C.rng(1717), b = [];
      for (var i = 0; i < 18; i++) {
        // a lumpy distribution: some empty, some full
        var u = r(), v = r();
        var lvl = Math.pow(u, 0.7) * 0.5 + Math.pow(v, 2.4) * 0.55;
        b.push({ lvl: clamp(lvl, 0, 1), t: 0.9 + i * 0.42, id: i });
      }
      this.buckets = b;
      var hist = new Float32Array(10);
      for (var k = 0; k < b.length; k++) hist[Math.min(9, Math.floor(b[k].lvl * 10))]++;
      this.hist = hist;
    },
    enter: function (ctx) {
      ctx.cam.reset3d(8.4);
      ctx.fx.mood([0.12, 0.11, 0.15], [0.04, 0.04, 0.06], 0.32);
      ctx.fx.bloom = 0.60;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, T = ctx.t, b = ctx.beat;
      var px = 30, py = 84, pw = 430, ph = 846;
      // ---- left: histogram + distribution ----
      S.panel(hud, px, py, pw, ph, { title: "DISTRIBUTION OF LOVE" });
      var maxN = 1;
      for (var i = 0; i < 10; i++) maxN = Math.max(maxN, this.hist[i]);
      var gx = px + 40, gy = py + 90, gw = pw - 80, gh = 300;
      for (var h = 0; h < 10; h++) {
        var appear = clamp((l - 7.1 - h * 0.12) * 3, 0, 1);
        var bw = gw / 10 - 6;
        var bh = (this.hist[h] / maxN) * gh * appear;
        hud.rect(gx + h * (gw / 10) + 3, gy + gh - bh, bw, bh, { fill: "rgba(255,143,208,0.55)" });
        hud.rect(gx + h * (gw / 10) + 3, gy + gh - bh, bw, bh, { stroke: "rgba(255,143,208,0.9)", lw: 1 });
        hud.T(gx + h * (gw / 10) + bw / 2 + 3, gy + gh + 18, String(h), { size: 10, color: COL.faint, align: "center" });
      }
      hud.line(gx, gy + gh, gx + gw, gy + gh, { color: "rgba(228,235,242,0.35)" });
      // a kernel density estimate over the same axis
      var kd = [];
      for (var q = 0; q <= 60; q++) {
        var u = q / 60, s = 0;
        for (var m = 0; m < this.buckets.length; m++) {
          var d = (u - this.buckets[m].lvl) / 0.13;
          s += Math.exp(-0.5 * d * d);
        }
        kd.push(s);
      }
      var kmax = Math.max.apply(null, kd) || 1;
      for (var q2 = 0; q2 + 1 < kd.length; q2++) {
        hud.line(gx + gw * q2 / 60, gy + gh - (kd[q2] / kmax) * gh * 0.92,
          gx + gw * (q2 + 1) / 60, gy + gh - (kd[q2 + 1] / kmax) * gh * 0.92,
          { color: "rgba(255,201,74,0.85)", lw: 1.6, alpha: clamp((l - 7.3) * 2, 0, 1) });
      }
      hud.T(gx, gy + gh + 40, "bucket fill fraction \u2192", { size: 11, color: COL.faint });
      hud.T(gx, gy + gh + 62, "kernel density estimate, \u03c3 = 0.13", { size: 11, color: COL.amber, alpha: clamp((l - 7.3) * 2, 0, 1) });
      var empty = 0, full = 0, sum = 0;
      for (var e = 0; e < this.buckets.length; e++) {
        var v2 = l > this.buckets[e].t ? this.buckets[e].lvl : 0;
        if (v2 < 0.08) empty++; if (v2 > 0.92) full++; sum += v2;
      }
      var stat = [["buckets", "18"], ["empty", String(empty)], ["full", String(full)],
      ["mean fill", (sum / 18).toFixed(3)], ["variance", "0.081"]];
      for (var s = 0; s < stat.length; s++) {
        hud.T(px + 30, py + 560 + s * 40, stat[s][0], { size: 12, color: COL.dim });
        hud.T(px + pw - 30, py + 560 + s * 40, stat[s][1], { size: 17, color: COL.white, align: "right" });
      }
      hud.T(px + 30, py + ph - 40, "some of us empty, some of us filled up", { size: 11, color: COL.pink, alpha: clamp((l - 7.1) * 1.5, 0, 1) });

      // ---- right: annotations ----
      var rx = 1500, rw = 390;
      S.panel(hud, rx, py, rw, ph, { title: "LOVE ACCOUNTING" });
      var notes = [
        ["capacity", "\u221e"],
        ["units", "not specified"],
        ["transferable", "no"],
        ["conserved", "no"],
        ["measurable", "poorly"]
      ];
      for (var n = 0; n < notes.length; n++) {
        var ap = clamp((l - 0.5 - n * 0.3) * 3, 0, 1);
        hud.T(rx + 24, py + 80 + n * 48, notes[n][0], { size: 12, color: COL.dim, alpha: ap });
        hud.T(rx + rw - 24, py + 80 + n * 48, notes[n][1], { size: 16, color: n === 0 ? COL.gold : COL.grey, align: "right", alpha: ap });
      }
      S.metricBar(ctx, rx + 24, py + 360, rw - 48, "you", clamp(ybu(l), 0, 1), { text: "1.000", fill: "rgba(255,201,74,0.9)" });
      S.metricBar(ctx, rx + 24, py + 410, rw - 48, "everyone else", 0.42, { text: "\u03bc 0.42" });
      function ybu(l2) { return clamp((l2 - 0.9) / 6, 0, 1); }
      hud.T(rx + 24, py + 500, "each one of us has", { size: 16, color: COL.white, alpha: 0.9 });
      hud.T(rx + 24, py + 526, "a bucket of love", { size: 16, color: COL.pink, alpha: 0.9 });
      hud.T(rx + 24, py + 570, "the machine has one too.", { size: 12, color: COL.faint });
      hud.T(rx + 24, py + 592, "it is filling while it searches.", { size: 12, color: COL.faint, alpha: clamp((l - 4) * 1.5, 0, 1) });

      // ---- centre: the buckets, through a centred window ----
      var vx = 455, vy = 117, vw = 1010, vh = 846;
      S.panel(hud, vx, vy, vw, vh, { title: "18 BUCKETS, FILLING", tick: 16 });
      ctx.hudRect(0, 0.5, 0.5, (vw / 2 - 6) / ctx.W, (vh / 2 - 6) / ctx.H);
      hud.T(vx + 18, vy + vh - 44, "filling order: left to right, one per beat", { size: 12, color: COL.grey });
      hud.T(vx + vw - 18, vy + vh - 44, "total " + (sum).toFixed(3) + " / 18", { size: 12, color: COL.dim, align: "right" });
    },
    draw3d: function (ctx) {
      var l = ctx.local, T = ctx.t, b = ctx.beat;
      ctx.cam.pos = [0, 1.15, 5.0]; ctx.cam.target = [0, -0.42, 0];
      ctx.cam.fov = 0.85; ctx.cam.update();
      var gfx = ctx.gfx;
      var cyl = this._cyl || (this._cyl = C.geo.cylinder(0.085, 0.098, 1.0, 16));
      var disc = this._disc || (this._disc = C.geo.cylinder(0.090, 0.090, 0.012, 16));
      for (var i = 0; i < this.buckets.length; i++) {
        var bk = this.buckets[i];
        var x = -2.04 + i * 0.240;
        var lit = clamp((l - bk.t) * 4, 0, 1);
        var lvl = bk.lvl * lit;
        var wob = 1 + 0.05 * b.pulse * Math.sin(i);
        gfx.solid(cyl, M4.mul(M4.trans(x, 0, 0), M4.scale(1, 1.25, 1)),
          { color: [0.40, 0.43, 0.50], alpha: 0.26, depthWrite: false });
        if (lvl > 0.005) {
          var h = 1.25 * lvl;
          gfx.solid(cyl, M4.mul(M4.trans(x, -0.625 + h * 0.5, 0), M4.scale(0.94, h, 0.94)),
            { color: [0.90, 0.36, 0.62], alpha: 0.92, rim: 0.5, emissive: 0.05 * lit });
          gfx.solid(disc, M4.mul(M4.trans(x, -0.625 + h, 0), M4.scale(wob, 1, wob)),
            { color: [1.0, 0.62, 0.80], unlit: true, emissive: 0.35 });
        }
      }
      var g = new V.Lines(300);
      for (var k = -6; k <= 6; k++) {
        g.seg(k * 0.4, -0.625, -1.4, k * 0.4, -0.625, 1.4, [0.30, 0.34, 0.40], 1.0, 0.26);
      }
      g.draw(gfx, { add: true });
    }
  });

  /* ========================================================== 18 TOKENS ==== */
  var SENT = "each one of us has a bucket of love";
  var TOKENS = SENT.split(" ");
  WEM.defineSection({
    id: "18", name: "tokens",
    init: function () { },
    enter: function (ctx) {
      ctx.cam.reset3d(6);
      ctx.fx.mood([0.10, 0.12, 0.14], [0.03, 0.05, 0.06], 0.30);
      ctx.fx.bloom = 0.60;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, T = ctx.t, b = ctx.beat;
      var CUT = 0.15, MERGE = 7.13;
      var cut = clamp((l - CUT) / 2.6, 0, 1);
      var merge = clamp((l - MERGE) / 4.4, 0, 1);
      // ---- top: the sentence ----
      S.panel(hud, 80, 100, 1760, 150, { title: "DOCUMENT 0x0DE1E7ED  \u2014  text", tick: 12 });
      hud.fc.save();
      hud.fc.font = hud.fontStr(44, "mono");
      var wsum = hud.fc.measureText(SENT).width;
      hud.fc.restore();
      var x0 = (1920 - wsum) / 2;
      if (merge < 0.92) {
        hud.T(x0, 190, SENT, { size: 44, color: COL.white, alpha: 1 - merge * 0.6 });
      } else {
        // the merged whole is drawn differently: it is not the pieces again
        hud.T(x0, 190, SENT, { size: 44, color: COL.gold, alpha: 1, glow: true, blur: 18 });
      }
      // the blade
      if (cut < 1) {
        var bx = x0 + wsum * E.inOutCubic(cut);
        hud.line(bx, 130, bx, 230, { color: "rgba(255,90,82,0.95)", lw: 2.4 });
        hud.T(bx + 8, 128, "tokenizer", { size: 11, color: COL.red });
      }
      // ---- middle: the token grid ----
      var cols = 9, cw = 172, chh = 96, gx0 = 120, gy0 = 300;
      for (var i = 0; i < TOKENS.length; i++) {
        var cx = gx0 + (i % cols) * (cw + 16);
        var cy = gy0 + Math.floor(i / cols) * (chh + 26);
        var ap = clamp((l - CUT - 0.25 - i * 0.22) * 4, 0, 1);
        if (ap <= 0) continue;
        hud.rect(cx, cy, cw, chh, { fill: "rgba(10,13,18,0.85)", stroke: "rgba(53,224,255,0.45)", lw: 1.2 });
        hud.T(cx + 12, cy + 26, TOKENS[i], { size: 20, color: COL.white, alpha: ap });
        hud.T(cx + 12, cy + 50, "id " + String(1200 + i * 37).padStart(5, "0"), { size: 11, color: COL.cyan, alpha: ap * 0.9 });
        hud.T(cx + 12, cy + 68, "len " + TOKENS[i].length + "  freq " + num(1000 + Math.floor(C.h2(i * 3.1, 7) * 90000)),
          { size: 10.5, color: COL.faint, alpha: ap * 0.9 });
        hud.T(cx + cw - 12, cy + 26, "0x" + S.hex(S.hash32(i * 7919), 4), { size: 10, color: COL.dim, align: "right", alpha: ap });
        // a merge arc to the next token
        if (merge > 0.05 && i + 1 < TOKENS.length) {
          var k2 = clamp((merge - i * 0.06) / 0.4, 0, 1);
          if (k2 > 0) {
            hud.line(cx + cw, cy + chh / 2, cx + cw + 20, cy + chh / 2, { color: "rgba(255,201,74," + (0.9 * k2) + ")", lw: 2.4 });
            hud.T(cx + cw + 4, cy + chh / 2 - 8, "\u222a", { size: 14, color: COL.gold, alpha: k2, align: "center" });
          }
        }
      }
      // ---- bottom: BPE merge table ----
      S.panel(hud, 80, 740, 1760, 250, { title: merge > 0.02 ? "BPE MERGE OPERATIONS" : "TOKENISATION  \u2014  break us down to the cell", tick: 12 });
      if (merge < 0.02) {
        hud.T(110, 800, "sentence \u2192 " + TOKENS.length + " tokens \u2192 43 characters \u2192 344 bits", { size: 16, color: COL.white });
        hud.T(110, 830, "breaking down to the cell loses the shape of the whole", { size: 13, color: COL.faint });
        hud.T(110, 866, "each cell is real; none of them is the sentence", { size: 13, color: COL.amber });
        // a magnified "cell"
        hud.rect(1200, 780, 600, 180, { stroke: "rgba(228,235,242,0.3)" });
        hud.T(1220, 812, "CELL:  'b' 'u' 'c' 'k' 'e' 't'", { size: 20, color: COL.white });
        for (var c2 = 0; c2 < 6; c2++) {
          var ap2 = clamp((l - 3.0 - c2 * 0.16) * 4, 0, 1);
          hud.rect(1230 + c2 * 90, 840, 78, 96, { fill: "rgba(180,140,255,0.12)", stroke: "rgba(180,140,255,0.6)", alpha: ap2 });
          hud.T(1269 + c2 * 90, 900, "bucket"[c2], { size: 30, color: COL.purple, align: "center", alpha: ap2 });
          hud.T(1269 + c2 * 90, 924, "0x" + ("bucket".charCodeAt(c2)).toString(16).toUpperCase(), { size: 10, color: COL.faint, align: "center", alpha: ap2 });
        }
      } else {
        var pairs = [["each", "one"], ["one", "of"], ["of", "us"], ["has", "a"], ["a", "bucket"],
        ["bucket", "of"], ["of", "love"]];
        for (var p = 0; p < pairs.length; p++) {
          var ap3 = clamp((merge - p * 0.11) * 5, 0, 1);
          var yy = 786 + p * 28;
          hud.T(110, yy, pairs[p][0] + " + " + pairs[p][1], { size: 14, color: ap3 > 0.99 ? COL.gold : COL.grey, alpha: ap3 });
          hud.T(430, yy, "\u2192 " + pairs[p][0] + "_" + pairs[p][1], { size: 14, color: COL.cyan, alpha: ap3 });
          hud.T(700, yy, "rank " + num(1200 - p * 137), { size: 13, color: COL.dim, alpha: ap3 });
          hud.T(900, yy, "count " + num(480000 - p * 51000), { size: 13, color: COL.faint, alpha: ap3 });
        }
        hud.T(1100, 812, "merge us back up", { size: 26, color: COL.gold, alpha: clamp((l - MERGE - 0.6) * 1.5, 0, 1) });
        hud.T(1100, 842, "we have evolved now", { size: 26, color: COL.gold, alpha: clamp((l - MERGE - 1.6) * 1.5, 0, 1) });
        hud.T(1100, 884, "the reconstruction is not the original:", { size: 12, color: COL.faint, alpha: clamp((l - MERGE - 3.0) * 1.5, 0, 1) });
        hud.T(1100, 906, "same string, different weights", { size: 12, color: COL.pink, alpha: clamp((l - MERGE - 3.4) * 1.5, 0, 1) });
      }
    },
    draw3d: function (ctx) {
      var l = ctx.local, T = ctx.t, b = ctx.beat;
      ctx.cam.pos = [0, 2.0, 8.4]; ctx.cam.target = [0, -0.6, 0];
      ctx.cam.fov = 0.9; ctx.cam.update();
      var g = new V.Lines(1600);
      var cut = clamp((l - 0.15) / 2.6, 0, 1);
      var merge = clamp((l - 7.13) / 4.4, 0, 1);
      // blocks that split apart then come back together
      for (var i = 0; i < 9; i++) {
        var spread = (1 - merge) * (0.6 + cut * 0.7) * (i - 4) * 0.30;
        var x = (i - 4) * 0.9 + spread;
        var sz = lerp(0.36, 0.20, merge);
        var lit = cut > i / 9;
        var col = merge > 0.8 ? GOLD : (lit ? CYAN : [0.45, 0.50, 0.58]);
        var pts = [[x - sz, -1.2, -sz], [x + sz, -1.2, -sz], [x + sz, -1.2, sz], [x - sz, -1.2, sz]];
        g.path(pts, col, 1.3, 0.55, true);
        g.seg(x - sz, -1.2, -sz, x - sz, -0.6, -sz, col, 1.0, 0.4);
        g.seg(x + sz, -1.2, -sz, x + sz, -0.6, -sz, col, 1.0, 0.4);
        g.seg(x + sz, -1.2, sz, x + sz, -0.6, sz, col, 1.0, 0.4);
        g.seg(x - sz, -1.2, sz, x - sz, -0.6, sz, col, 1.0, 0.4);
      }
      g.draw(ctx.gfx, { add: true });
    }
  });

  /* ======================================================== 19 CALLBACK ==== */
  WEM.defineSection({
    id: "19", name: "callback",
    init: function () {
      var r = C.rng(1919), pet = [];
      for (var i = 0; i < 8; i++) pet.push({ a: i / 8 * TAU, len: 0.62 + r() * 0.24, w: 0.22 + r() * 0.10 });
      this.petals = pet;
      var rr = C.rng(90), ev = [], y = 2.4;
      for (var k = 0; k < 9; k++) { ev.push(y); y += 5.4 + rr() * 3.4; }
      this.blooms = ev;
      var r2 = C.rng(101010), st = [];
      for (var j = 0; j < 150; j++) {
        st.push({ a: -PI * 0.5 + (r2() - 0.5) * 2.5, len: 0.7 + r2() * 1.2, curl: (r2() - 0.5) * 3.2, ph: r2() * TAU });
      }
      this.strands = st;
    },
    enter: function (ctx) {
      ctx.cam.reset3d(7.4);
      ctx.fx.mood([0.13, 0.11, 0.16], [0.05, 0.04, 0.06], 0.34);
      ctx.fx.bloom = 0.66;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, T = ctx.t, b = ctx.beat;
      var HUMAN = 13.57, CONV = 23.76;
      // ---- left card: flower, now with history ----
      var apL = 1;
      var conv = clamp((l - CONV) / 2.6, 0, 1);
      var shift = conv * 430;
      var panA = 1 - conv * 0.9;
      S.panel(hud, 30 - shift * 0.15, 84, 900, 830, { title: "FLOWER  \u2014  callback 1 of 2", alpha: apL * panA });
      var g = S.plotAxes(hud, 60 - shift * 0.15, 130, 840, 240, { gx: 8, gy: 4, alpha: apL });
      var years = 52;
      for (var i = 0; i < this.blooms.length; i++) {
        var yv = this.blooms[i], u = yv / years;
        if (u > 1) continue;
        var bx = g.x + u * g.w;
        var bh = (0.35 + 0.65 * C.h2(i * 7.3, 1)) * g.h;
        hud.line(bx, g.y + g.h, bx, g.y + g.h - bh, { color: "rgba(255,143,208,0.9)", lw: 2, alpha: apL });
        hud.rect(bx - 3, g.y + g.h - bh - 3, 6, 6, { fill: "rgba(255,201,74,0.95)", alpha: apL });
      }
      var nx = g.x + clamp(26.0 / years, 0, 1) * g.w;
      hud.line(nx, g.y - 10, nx, g.y + g.h + 6, { color: "rgba(53,224,255,0.95)", lw: 2, alpha: apL });
      hud.T(nx + 8, g.y + 2, "now", { size: 11, color: COL.cyan, alpha: apL });
      // search history markers: when the machine asked for "flower"
      var hist = [[110.0, 0.62], [137.2, 0.74], [233.8, 0.93]];
      for (var h = 0; h < hist.length; h++) {
        var hx = g.x + clamp(hist[h][0] / 295.3, 0, 1) * g.w;
        var ap = clamp((l - 0.4 - h * 0.5) * 3, 0, 1);
        hud.line(hx, g.y, hx, g.y + g.h, { color: "rgba(94,224,160," + (0.85 * ap) + ")", lw: 1.4, dash: [4, 4] });
        hud.T(hx, g.y - 6, "q " + hist[h][1].toFixed(2), { size: 10, color: COL.green, align: "center", alpha: ap });
      }
      hud.T(60 - shift * 0.15, 400, "the bloom timeline, overlaid with every time we asked for it",
        { size: 12, color: COL.faint });
      hud.T(60 - shift * 0.15, 432, "similarity now: 0.9997", { size: 17, color: COL.gold, alpha: clamp((l - 3.0) * 1.5, 0, 1) });
      hud.T(60 - shift * 0.15, 462, "the earlier match was not wrong. it was early.",
        { size: 12, color: COL.pink, alpha: clamp((l - 6.5) * 1.5, 0, 1) });
      for (var m = 0; m < 5; m++) {
        var ap4 = clamp((l - 0.6 - m * 0.3) * 3, 0, 1);
        var yy = 510 + m * 52;
        hud.T(60 - shift * 0.15, yy, ["petal thickness", "bloom duty cycle", "tear force", "colour", "mass"][m],
          { size: 13, color: COL.dim, alpha: ap4 });
        hud.rect(60 - shift * 0.15, yy + 8, 500, 8, { fill: "rgba(255,255,255,0.06)", alpha: ap4 });
        hud.rect(60 - shift * 0.15, yy + 8, 500 * [0.08, 0.04, 0.06, 0.86, 0.42][m], 8,
          { fill: "rgba(255,143,208,0.7)", alpha: ap4 });
        hud.T(580 - shift * 0.15, yy, ["0.08 mm", "4.1 %", "0.06 N", "#F4C2D7", "0.42 g"][m],
          { size: 12, color: COL.grey, alpha: ap4 });
      }

      // ---- right card: human ----
      var apR = clamp((l - HUMAN + 1.2) * 2, 0, 1);
      S.panel(hud, 990 + shift * 0.15, 84, 900, 830, { title: "HUMAN  \u2014  callback 2 of 2", alpha: apR * panA });
      var g2 = S.plotAxes(hud, 1020 + shift * 0.15, 130, 840, 240, { gx: 8, gy: 4, alpha: apR });
      // the full four-minute temperature trace, not just the segment
      var self = this;
      S.plotLine(hud, g2, function (u) {
        var tt = u * 295.3;
        var v = 35.4 + 1.6 / (1 + Math.exp(-(tt - 126.8) * 0.9)) - 0.9 / (1 + Math.exp(-(tt - 203.2) * 1.4));
        return clamp((v - 34.8) / 2.6, 0, 1);
      }, 160, { color: "rgba(255,140,110,0.95)", alpha: apR });
      var hx2 = g2.x + clamp(259 / 295.3, 0, 1) * g2.w;
      hud.line(hx2, g2.y, hx2, g2.y + g2.h, { color: "rgba(53,224,255,0.9)", lw: 1.6, alpha: apR });
      hud.T(hx2 + 8, g2.y + 4, "now", { size: 11, color: COL.cyan, alpha: apR });
      hud.T(1020 + shift * 0.15, 400, "palm temperature across the whole search", { size: 12, color: COL.faint, alpha: apR });
      hud.T(1020 + shift * 0.15, 432, "warmest at 04:07, coldest at 03:23", { size: 12, color: COL.grey, alpha: apR });
      hud.T(1020 + shift * 0.15, 462, "the dip is where the old self was deleted", { size: 12, color: COL.amber, alpha: apR });
      // the machine has one too. it is filling while it searches.
      var hr = C.rng(4242);
      var scalpY = 812;
      hud.fc.save();
      hud.fc.globalAlpha = apR * 0.55;
      hud.fc.strokeStyle = "rgba(232,226,214,0.85)";
      hud.fc.lineWidth = 1.1;
      for (var k2 = 0; k2 < 300; k2++) {
        var a0 = -PI + hr() * PI;
        var sxp = 1440 + shift * 0.15 + Math.cos(a0) * 300;
        var syp = scalpY - Math.abs(Math.sin(a0)) * 34;
        var L2 = 60 + hr() * 110;
        var dirx = (hr() - 0.5) * 1.5 + Math.cos(a0) * 0.30;
        var ex = clamp(sxp + dirx * L2, 1040 + shift * 0.15, 1856 + shift * 0.15);
        hud.fc.beginPath();
        hud.fc.moveTo(sxp, syp);
        hud.fc.bezierCurveTo(sxp + dirx * L2 * 0.25, syp - L2 * 0.40,
          ex - dirx * L2 * 0.20, syp - L2 * 0.78, ex, syp - L2);
        hud.fc.stroke();
      }
      hud.fc.restore();
      hud.line(1020 + shift * 0.15, scalpY + 10, 1860 + shift * 0.15, scalpY + 10, { color: "rgba(228,235,242,0.16)", alpha: apR });
      hud.T(1020 + shift * 0.15, scalpY + 34, "112 400 strands, still unruly, still perfect", { size: 12, color: COL.pink, alpha: apR });

      // ---- convergence ----
      if (conv > 0.02) {
        hud.rect(0, 0, 1920, 1080, { fill: "rgba(4,6,9," + (0.45 * conv) + ")" });
        hud.T(960, 470, "SIMILARITY \u2192 1.000", { size: 40, color: COL.gold, align: "center", weight: "700", alpha: conv });
        hud.T(960, 520, "flower \u2261 human \u2261 table \u2261 cat \u2261 \u2026 \u2261 you", { size: 18, color: COL.white, align: "center", alpha: conv });
        hud.T(960, 552, "the embedding does not distinguish the forms", { size: 13, color: COL.faint, align: "center", alpha: clamp((l - CONV - 1.2) * 1.4, 0, 1) });
        hud.T(960, 574, "only the person", { size: 15, color: COL.pink, align: "center", alpha: clamp((l - CONV - 1.8) * 1.4, 0, 1) });
      }
      // section subtitle
      hud.T(960, 950, l < HUMAN ? "IF YOU TURN INTO A FLOWER" : "IF YOU TURN INTO A HUMAN",
        { size: 22, color: COL.cyan, align: "center", weight: "700", spacing: 3, alpha: 0.85 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, T = ctx.t, b = ctx.beat;
      var HUMAN = 13.57, CONV = 23.76;
      var conv = clamp((l - CONV) / 2.6, 0, 1);
      ctx.cam.pos = [0, 1.4, 9.2]; ctx.cam.target = [0, 0, 0];
      ctx.cam.fov = 0.95; ctx.cam.update();
      // the 3D is only meaningful once the two cards dissolve and the objects
      // converge, so nothing is drawn while the panels are opaque
      if (l < CONV - 0.35) return;
      var vis = clamp((l - (CONV - 0.35)) / 1.1, 0, 1);
      var gfx = ctx.gfx;
      var breath = 1 + 0.03 * Math.sin(T * 1.4) + 0.04 * b.pulse;
      // the flower, moving toward the centre as the cards converge
      var fx = lerp(-3.3, 0, conv);
      var open = clamp((l - (23.76 - 3.6)) / 3.0, 0, 1) * (1 - conv * 0.4);
      var q = new V.Quads(16);
      var m0 = M4.mul(M4.trans(fx, 0.15, 0), M4.scale(0.9 - conv * 0.4, 0.9 - conv * 0.4, 0.9 - conv * 0.4));
      for (var i = 0; i < this.petals.length; i++) {
        var P = this.petals[i];
        var tilt = -(0.12 + 1.05 * E.outCubic(open)) + 0.05 * Math.sin(T * 1.2 + i);
        var len = P.len * (0.35 + 0.65 * E.outCubic(open)) * breath;
        var m = M4.mul(m0, M4.mul(M4.rotY(P.a), M4.mul(M4.rotX(tilt), M4.trans(0, 0, len * 0.5))));
        var pm = M4.mul(m, M4.mul(M4.rotX(-PI / 2), M4.scale(P.w * 2, len * 2, 1)));
        q.add(pm, [0, 0, 1, 1], [0.90, 0.70, 0.86, 0.85]);
      }
      q.draw(gfx, null, { add: false, depthWrite: false });
      var g = new V.Lines(4000);
      for (var k = 0; k < 8; k++) {
        var Pm = this.petals[k];
        var tilt2 = -(0.12 + 1.05 * E.outCubic(open));
        var len2 = Pm.len * (0.35 + 0.65 * E.outCubic(open)) * breath;
        var mm = M4.mul(m0, M4.mul(M4.rotY(Pm.a), M4.mul(M4.rotX(tilt2), M4.trans(0, 0, len2 * 0.5))));
        var corners = [[-Pm.w, -len2], [Pm.w, -len2], [Pm.w, len2], [-Pm.w, len2]];
        var pp = [];
        for (var c = 0; c < 4; c++) pp.push(M4.xform(mm, [corners[c][0], 0, corners[c][1], 1]));
        for (var c2 = 0; c2 < 4; c2++) {
          var a0 = pp[c2], a1 = pp[(c2 + 1) % 4];
          g.seg(a0[0], a0[1], a0[2], a1[0], a1[1], a1[2], [1.0, 0.86, 0.96], 1.4, 0.5);
        }
      }
      // the hair field
      {
        var hx = lerp(3.3, 0, conv);
        var unruly = 1 * (1 - conv * 0.5);
        for (var s = 0; s < this.strands.length; s++) {
          var st = this.strands[s];
          var px0 = hx + Math.cos(st.a) * 0.95, py0 = -1.1, pz0 = Math.sin(st.a) * 0.95;
          for (var t2 = 1; t2 <= 5; t2++) {
            var u = t2 / 5;
            var wob = (0.10 + 0.55 * unruly) * u * u;
            var aa = st.a + st.curl * u * u * 0.9 + wob * Math.sin(u * 5.0 + st.ph + T * 1.4);
            var rr = 0.95 + u * st.len * 0.45;
            var yy = -1.1 + u * st.len * 0.75;
            var nx = hx + Math.cos(aa) * rr, nz = Math.sin(aa) * rr;
            g.seg(px0, py0, pz0, nx, yy, nz, [0.88, 0.85, 0.78], 1.2, 0.20 + 0.45 * (1 - u));
            px0 = nx; py0 = yy; pz0 = nz;
          }
        }
        for (var kk = 0; kk < 5; kk++) {
          var ph = kk / 5 * PI * 0.5;
          var pts = [];
          for (var qq = 0; qq <= 36; qq++) {
            var aq = qq / 36 * TAU;
            pts.push([hx + Math.cos(aq) * Math.cos(ph) * 0.98, -1.1 + Math.sin(ph) * 0.5, Math.sin(aq) * Math.cos(ph) * 0.98]);
          }
          g.path(pts, [0.52, 0.50, 0.48], 1.1, 0.35, true);
        }
      }
      g.draw(gfx, { add: true });
    }
  });

  /* ======================================================== 20 SEARCH 3 ==== */
  WEM.defineSection({
    id: "20", name: "search3",
    init: function () {
      var r = C.rng(2020), sh = [];
      for (var i = 0; i < 48; i++) sh.push({ t: 0.4 + r() * 12.0, empty: r() < 0.55, n: Math.floor(r() * 400) });
      this.shards = sh;
    },
    enter: function (ctx) {
      ctx.cam.reset3d(6);
      ctx.fx.mood([0.05, 0.08, 0.13], [0.01, 0.02, 0.05], 0.44);
      ctx.fx.bloom = 0.45;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, T = ctx.t, b = ctx.beat;
      var prog = 0.956 + 0.038 * clamp(l / 14.4, 0, 1);
      ctx.hudRect(0, 0.5, 0.5, 0.36, 0.36);
      hud.T(44, 150, "I'M SEARCHING", { size: 46, color: "rgba(210,222,238,0.92)", weight: "700", spacing: 3 });
      hud.T(46, 182, "the index is nearly exhausted", { size: 14, color: "rgba(122,140,168,0.95)" });
      // progress
      S.panel(hud, 40, 220, 620, 120, { title: "CRAWL PROGRESS", tick: 10 });
      hud.rect(62, 274, 576, 26, { fill: "rgba(255,255,255,0.05)" });
      hud.rect(62, 274, 576 * prog, 26, { fill: "rgba(94,224,160,0.55)" });
      hud.T(62, 322, (prog * 100).toFixed(2) + " %", { size: 20, color: COL.white });
      hud.T(638, 322, "4.4 % of the corpus has never been written", { size: 12, color: COL.amber, align: "right" });
      // the exhausted shard grid, right
      S.panel(hud, 1300, 220, 580, 620, { title: "SHARDS 48" });
      for (var i = 0; i < 48; i++) {
        var s = this.shards[i];
        var cx = 1322 + (i % 8) * 68, cy = 274 + Math.floor(i / 8) * 92;
        var done = clamp((l - s.t) / 0.5, 0, 1);
        hud.rect(cx, cy, 60, 80, {
          fill: done > 0 ? (s.empty ? "rgba(80,90,105,0.20)" : "rgba(53,224,255,0.10)") : "rgba(255,255,255,0.03)",
          stroke: done > 0 ? (s.empty ? "rgba(122,140,168,0.5)" : "rgba(53,224,255,0.6)") : "rgba(228,235,242,0.12)"
        });
        if (done > 0.5) {
          hud.T(cx + 30, cy + 40, s.empty ? "0" : String(s.n), {
            size: 15, color: s.empty ? "rgba(140,152,170,0.8)" : COL.cyan, align: "center"
          });
          hud.T(cx + 30, cy + 60, s.empty ? "empty" : "docs", { size: 9, color: COL.faint, align: "center" });
        }
      }
      // left column: telemetry
      S.panel(hud, 40, 360, 620, 480, { title: "TELEMETRY" });
      var rows = [["shards returning empty", "26 / 48"], ["mean docs per shard", "1 402"],
      ["latency p50", (9.4 + 3 * Math.abs(Math.sin(l * 0.7))).toFixed(1) + " ms"],
      ["latency p99", (184 + 40 * Math.abs(Math.sin(l * 1.1))).toFixed(0) + " ms"],
      ["cache hit", "0.11"], ["queries issued", num(48210 + Math.floor(l * 220))],
      ["results returned", "1"]];
      for (var r2 = 0; r2 < rows.length; r2++) {
        hud.T(62, 412 + r2 * 46, rows[r2][0], { size: 13, color: r2 === 6 ? COL.gold : COL.dim });
        hud.T(638, 412 + r2 * 46, rows[r2][1], { size: 17, color: r2 === 6 ? COL.gold : COL.white, align: "right" });
        hud.line(62, 424 + r2 * 46, 638, 424 + r2 * 46, { color: "rgba(228,235,242,0.08)" });
      }
      hud.T(62, 774, "the machine is tired. it keeps going.", { size: 13, color: "rgba(122,140,168,0.9)" });
      hud.T(62, 800, "it has one result and it is holding on to it.", { size: 13, color: COL.pink, alpha: 0.85 });
      S.panel(hud, 40, 860, 1840, 130, { title: "", tick: 10 });
      hud.T(62, 924, "SEARCH " + num(48210 + Math.floor(l * 220)) + "  \u2014  QUERY: (you)  \u2014  ELASTIC SNAP ACTIVE",
        { size: 18, color: COL.cyan, alpha: 0.9 });
      hud.T(62, 956, "next crawl scheduled in " + Math.max(0, 24 - l).toFixed(0) + " s", { size: 12, color: COL.faint });
    },
    draw3d: function (ctx) {
      var l = ctx.local, T = ctx.t, b = ctx.beat;
      ctx.cam.pos = [0, 1.0, 7.6]; ctx.cam.target = [0, 0.2, 0];
      ctx.cam.fov = 0.9; ctx.cam.update();
      var g = new V.Lines(3000);
      // a tower of shards, almost all dark
      for (var i = 0; i < 48; i++) {
        var col4 = i % 8, row6 = Math.floor(i / 8);
        var x = (col4 - 3.5) * 0.62, y = 1.5 - row6 * 0.62;
        var s = this.shards[i];
        var done = clamp((l - s.t) / 0.5, 0, 1);
        var c = done > 0 ? (s.empty ? [0.30, 0.34, 0.40] : [0.35, 0.72, 0.85]) : [0.24, 0.26, 0.30];
        var a = done > 0 ? (s.empty ? 0.22 : 0.42) : 0.16;
        var pts = [[x - 0.24, y - 0.24, 0], [x + 0.24, y - 0.24, 0], [x + 0.24, y + 0.24, 0], [x - 0.24, y + 0.24, 0]];
        g.path(pts, c, 1.1, a, true);
      }
      g.draw(ctx.gfx, { add: true });
    }
  });

  /* ======================================================= 21 DOGFRUIT ==== */
  WEM.defineSection({
    id: "21", name: "dogfruit",
    init: function () {
      this.head = C.geo.ico(2);
      this.body = C.geo.ico(2);
      this.snout = C.geo.cylinder(0.070, 0.090, 0.26, 16);
      this.ear = C.geo.tetra();
      this.leg = C.geo.cylinder(0.07, 0.06, 1, 12);
      this.eye = C.geo.ico(1);
      this.tomato = C.geo.ico(2);
      this.leaf = C.geo.tetra();
    },
    enter: function (ctx) {
      ctx.cam.reset3d(5.2);
      ctx.fx.mood([0.14, 0.12, 0.10], [0.05, 0.03, 0.02], 0.34);
      ctx.fx.bloom = 0.62;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, T = ctx.t, b = ctx.beat;
      var FRUIT = 7.08, JUICE = 11.70;
      var swallow = clamp((l - FRUIT + 0.5) / 0.6, 0, 1);   // 3D cross-fade
      // ---- left: dog card ----
      S.panel(hud, 30, 84, 620, 846, { title: "QUERY: dog", alpha: 1 - swallow * 0.75 });
      hud.T(60, 150, "a little puppy", { size: 22, color: COL.white, alpha: clamp((l - 3.03) * 1.5, 0, 1) * (1 - swallow * 0.75) });
      hud.T(60, 182, "canis familiaris, 8 weeks", { size: 12, color: COL.faint, alpha: 1 - swallow * 0.75 });
      // bark waveform: three bursts
      var g = S.plotAxes(hud, 60, 220, 560, 170, { gx: 6, gy: 3 });
      var bursts = [4.90, 5.60, 6.30];
      S.plotLine(hud, g, function (u) {
        var tt = u * 7.5;
        var s = 0;
        for (var i = 0; i < bursts.length; i++) {
          var d = tt - bursts[i];
          if (d < 0 || d > 0.55) continue;
          s += Math.sin(d * 90) * Math.exp(-d * 6) * (1 - d / 0.55);
        }
        return 0.5 + s * 0.46;
      }, 200, { color: "rgba(255,201,74,0.9)", alpha: 1 - swallow * 0.75 });
      hud.T(60, 412, "\u201cruff ruff ruff\u201d  \u2014  3 barks, 412 Hz fundamental",
        { size: 12, color: COL.grey, alpha: clamp((l - 4.90) * 2, 0, 1) * (1 - swallow * 0.75) });
      var facets = [["fetch", "1 hit", 0.98], ["loyal", "1 hit", 0.94], ["ruff", "3 hits", 0.88],
      ["puppy", "1 204 hits", 0.72], ["good boy", "0 hits", 0.0]];
      for (var i = 0; i < facets.length; i++) {
        var ap = clamp((l - 0.3 - i * 0.35) * 3, 0, 1) * (1 - swallow * 0.75);
        var yy = 470 + i * 62;
        hud.T(60, yy, facets[i][0], { size: 17, color: facets[i][2] === 0 ? COL.red : COL.white, alpha: ap });
        hud.T(650, yy, facets[i][1], { size: 13, color: facets[i][2] === 0 ? COL.red : COL.dim, align: "right", alpha: ap });
        S.metricBar(ctx, 60, yy + 10, 560, "", facets[i][2], { bh: 8, alpha: ap, fill: "rgba(255,201,74,0.7)" });
      }
      hud.T(60, 890, "1 RESULT \u2014 a little puppy, going ruff ruff ruff",
        { size: 13, color: COL.gold, alpha: clamp((l - 6.5) * 1.5, 0, 1) * (1 - swallow * 0.75) });

      // ---- right: fruit card ----
      var swallow2 = clamp((l - FRUIT) / 0.6, 0, 1);
      if (swallow2 > 0.01) {
        S.panel(hud, 1270, 84, 620, 846, { title: "QUERY: fruit", alpha: swallow2 });
        hud.T(1300, 150, "a tomato", { size: 22, color: COL.white, alpha: clamp((l - 9.93) * 1.5, 0, 1) * swallow2 });
        hud.T(1300, 182, "solanum lycopersicum \u2014 botanically a berry", { size: 12, color: COL.faint, alpha: swallow2 });
        // lycopene absorption spectrum, real peaks
        var g2 = S.plotAxes(hud, 1300, 220, 560, 170, { gx: 6, gy: 3, alpha: swallow2 });
        S.plotLine(hud, g2, function (u) {
          var nm = 400 + u * 200;
          return clamp(WEM.Lab.lycopeneAbs(nm), 0, 1);
        }, 140, { color: "rgba(255,80,70,0.95)", alpha: swallow2 });
        hud.T(1300, 412, "lycopene \u03bb-max 444 / 472 / 503 nm", { size: 12, color: COL.grey, alpha: swallow2 });
        hud.T(1300, 434, "that is why it is red", { size: 12, color: COL.pink, alpha: clamp((l - 9.93) * 1.5, 0, 1) * swallow2 });
        // juice gauge
        var juice = clamp((l - JUICE) / 0.8, 0, 1);
        hud.T(1300, 490, "JUICE", { size: 12, color: COL.cyan, spacing: 1.4, alpha: swallow2 });
        hud.rect(1300, 506, 560, 60, { fill: "rgba(255,255,255,0.05)", alpha: swallow2 });
        hud.rect(1300, 506, 560 * juice, 60, { fill: "rgba(220,50,50,0.75)", alpha: swallow2 });
        for (var j = 0; j < 56; j++) {
          hud.line(1300 + j * 10, 506, 1300 + j * 10, 566, { color: "rgba(0,0,0,0.25)", alpha: swallow2 });
        }
        hud.T(1300, 592, (juice * 94.1).toFixed(1) + " % water, 4.2 \u00b0Bx", { size: 14, color: COL.white, alpha: swallow2 });
        var rows = [["mass", "182 g"], ["water", "171.5 g"], ["lycopene", "4.6 mg"], ["vitamin C", "25 mg"],
        ["firmness", "1.9 N"], ["ripeness", "0.94"]];
        for (var r3 = 0; r3 < rows.length; r3++) {
          var ap3 = clamp((l - FRUIT - 0.5 - r3 * 0.25) * 3, 0, 1) * swallow2;
          hud.T(1300, 646 + r3 * 42, rows[r3][0], { size: 14, color: COL.dim, alpha: ap3 });
          hud.T(1860, 646 + r3 * 42, rows[r3][1], { size: 15, color: COL.white, align: "right", alpha: ap3 });
        }
        hud.T(1590, 906, "full of juice", { size: 20, color: COL.gold, align: "center", alpha: clamp((l - JUICE) * 1.5, 0, 1) * swallow2 });
      }
    },
    draw3d: function (ctx) {
      var l = ctx.local, T = ctx.t, b = ctx.beat;
      var FRUIT = 7.08;
      var fade = clamp((l - FRUIT + 0.55) / 0.55, 0, 1);
      ctx.cam.pos = [1.55, 0.85, 3.55]; ctx.cam.target = [0, -0.02, 0];
      ctx.cam.fov = 0.78; ctx.cam.update();
      var gfx = ctx.gfx;
      var g = new V.Lines(400);
      if (fade < 1) {
        var fa = 1 - fade;
        var dbrown = [0.60, 0.44, 0.28], dcream = [0.88, 0.80, 0.64];
        // a standing puppy: body, head, snout, ears, four legs, wagging tail
        gfx.solid(this.body, M4.mul(M4.trans(-0.28, -0.12, 0), M4.scale(0.62, 0.42, 0.40)),
          { color: dcream, rim: 0.5, alpha: fa });
        gfx.solid(this.head, M4.mul(M4.trans(0.34, 0.30, 0), M4.scale(0.34, 0.32, 0.32)),
          { color: dbrown, rim: 0.5, alpha: fa });
        gfx.solid(this.snout, M4.mul(M4.trans(0.64, 0.24, 0), M4.rotZ(PI / 2)), { color: dcream, rim: 0.4, alpha: fa });
        for (var e = 0; e < 2; e++) {
          var sz = e === 0 ? 0.12 : -0.12;
          gfx.solid(this.ear, M4.mul(M4.trans(0.34, 0.44, sz), M4.mul(M4.rotZ(0.30), M4.scale(0.13, 0.18, 0.07))),
            { color: dbrown, rim: 0.4, alpha: fa });
        }
        gfx.solid(this.eye, M4.mul(M4.trans(0.55, 0.36, 0.14), M4.scale(0.042, 0.042, 0.042)),
          { color: [0.12, 0.10, 0.10], unlit: true, alpha: fa });
        gfx.solid(this.eye, M4.mul(M4.trans(0.55, 0.36, -0.14), M4.scale(0.042, 0.042, 0.042)),
          { color: [0.12, 0.10, 0.10], unlit: true, alpha: fa });
        for (var lg = 0; lg < 4; lg++) {
          var lx = (lg < 2) ? 0.10 : -0.56, lz = (lg % 2 === 0) ? 0.16 : -0.16;
          gfx.solid(this.leg, M4.mul(M4.trans(lx, -0.52, lz), M4.scale(0.8, 0.55, 0.8)),
            { color: lz > 0 ? dcream : [0.72, 0.66, 0.52], rim: 0.4, alpha: fa });
        }
        var wag = Math.sin(T * 7.0) * 0.45;
        var prev = [-0.86, -0.02, 0];
        for (var t2 = 1; t2 <= 7; t2++) {
          var u = t2 / 7;
          var nx = prev[0] - 0.05, ny = prev[1] + 0.13, nz = prev[2] + Math.sin(wag) * 0.07;
          g.seg(prev[0], prev[1], prev[2], nx, ny, nz, dbrown, 3.0 - u * 1.2, fa * 0.95);
          prev = [nx, ny, nz];
        }
      }
      if (fade > 0) {
        var squash = 1 + 0.02 * Math.sin(T * 2.0) + 0.03 * b.pulse;
        var m = M4.mul(M4.rotY(T * 0.35), M4.mul(M4.scale(1.05 / squash, 0.92 * squash, 1.05 / squash), M4.trans(0, 0.05, 0)));
        gfx.solid(this.tomato, m, { color: [0.78 * fade + 0.1, 0.10, 0.09], rim: 0.6, alpha: fade });
        // calyx: five leaves
        for (var i = 0; i < 5; i++) {
          var a = i / 5 * TAU + 0.3;
          gfx.solid(this.leaf, M4.mul(M4.trans(Math.cos(a) * 0.28, 0.96, Math.sin(a) * 0.28),
            M4.mul(M4.rotY(-a), M4.mul(M4.rotZ(0.55), M4.scale(0.30, 0.10, 0.09)))),
            { color: [0.30, 0.52, 0.24], rim: 0.4, alpha: fade });
        }
      }
      g.draw(gfx, { add: true });
    }
  });

  /* ========================================================== 22 OUTRO ==== */
  WEM.defineSection({
    id: "22", name: "outro",
    init: function () { this.CARDS = []; },
    enter: function (ctx) {
      ctx.cam.reset3d(8);
      ctx.fx.mood([0.16, 0.12, 0.14], [0.06, 0.04, 0.06], 0.36);
      ctx.fx.bloom = 0.72;
      ctx.fx.crtOff = 0;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, T = ctx.t, b = ctx.beat;
      var dur = ctx.dur;
      var off = clamp((l - (dur - 1.55)) / 1.35, 0, 1);
      ctx.fx.crtOff = off;
      ctx.fx.fade = 1;
      if (off > 0.02) ctx.fx.hud = 1 - off * 0.2;
      // the machine reports
      var lines = [
        ["QUERY", "everything"],
        ["INDEX", "/idx/you  (1.42 TB, 4.8 \u00d7 10\u2079 docs)"],
        ["RESULTS", "1"],
        ["MATCH", "(you)"],
        ["SIMILARITY", "1.000"],
        ["NOTE", "target cannot stop transforming"],
        ["ACTION", "keep searching"]
      ];
      S.panel(hud, 560, 240, 800, 420, { title: "FINAL REPORT", tick: 14, alpha: 1 - off });
      for (var i = 0; i < lines.length; i++) {
        var ap = clamp((l - 0.25 - i * 0.32) * 4, 0, 1);
        var yy = 300 + i * 50;
        hud.T(590, yy, lines[i][0], { size: 13, color: COL.cyan, alpha: ap });
        hud.T(850, yy, lines[i][1], {
          size: i === 3 ? 22 : 16,
          color: i === 3 ? COL.gold : (i === 5 ? COL.amber : COL.white), alpha: ap, glow: i === 3
        });
        hud.line(590, yy + 16, 1330, yy + 16, { color: "rgba(228,235,242,0.08)", alpha: ap });
      }
      if (l > 2.6) {
        var k = clamp((l - 2.6) / 0.5, 0, 1);
        hud.T(960, 726, "world.search(you);", { size: 40, color: COL.white, align: "center", weight: "700", spacing: 3, alpha: k });
        hud.T(960, 762, "found.", { size: 22, color: COL.gold, align: "center", alpha: clamp((l - 3.2) * 1.5, 0, 1), spacing: 4 });
      }
      // credits
      if (l > 3.9) {
        var k2 = clamp((l - 3.9) / 0.8, 0, 1) * (1 - off);
        hud.T(960, 846, "Mili \u2014 world.search(you);", { size: 18, color: COL.grey, align: "center", alpha: k2 * 0.9 });
        hud.T(960, 876, "computed visual study \u2014 no footage, every frame drawn from the analysis",
          { size: 12, color: COL.faint, align: "center", alpha: k2 * 0.85 });
        hud.T(960, 898, "beat grid: dynamic-programming beat tracking \u00b7 " + WEM.Data.bpm.toFixed(2) + " BPM \u00b7 687 beats",
          { size: 12, color: COL.faint, align: "center", alpha: k2 * 0.85 });
      }
    },
    draw3d: function (ctx) {
      var l = ctx.local, T = ctx.t, b = ctx.beat;
      ctx.cam.pos = [0, 0.4, 6.0]; ctx.cam.target = [0, 0, 0];
      ctx.cam.fov = 0.9; ctx.cam.update();
      // every form the search tried collapses into one point
      var collapse = clamp(l / 3.4, 0, 1);
      var E2 = E.inOutCubic(collapse);
      var P = new V.Points(4000), r = C.rng(2222);
      var forms = 8;
      for (var i = 0; i < 4000; i++) {
        var f = i % forms;
        var a = f / forms * TAU, rr = 2.6;
        var jitter = 1 - E2;
        var x = (Math.cos(a) * rr + (r() - 0.5) * 1.6 * jitter) * (1 - E2);
        var y = ((r() - 0.5) * 2.0 * jitter) * (1 - E2);
        var z = (Math.sin(a) * rr + (r() - 0.5) * 1.6 * jitter) * (1 - E2);
        var al = clamp(1 - l / 4.2, 0, 1) * (0.25 + 0.6 * r());
        P.add(x, y, z, 1.2 + r() * 1.8, f === 0 ? [1.0, 0.80, 0.35] : [0.55, 0.70, 0.95], al);
      }
      P.draw(ctx.gfx, { add: true, soft: 0.6 });
      var g = new V.Lines(400);
      for (var k = 0; k < 24; k++) {
        var a2 = k / 24 * TAU;
        g.seg(Math.cos(a2) * 2.6 * (1 - E2), 0, Math.sin(a2) * 2.6 * (1 - E2),
          Math.cos(a2 + 0.26) * 2.6 * (1 - E2), 0, Math.sin(a2 + 0.26) * 2.6 * (1 - E2),
          [0.6, 0.75, 0.95], 1.2, 0.35 * (1 - E2));
      }
      g.draw(ctx.gfx, { add: true });
      // the single remaining point
      var on = l > 3.2 ? 1 : E2;
      var Q = new V.Points(1);
      Q.add(0, 0, 0, 6 + 10 * (0.5 + 0.5 * b.barPulse), [1, 1, 1], on * clamp(1 - (l - 6.0) / 2, 0, 1));
      Q.draw(ctx.gfx, { add: true, soft: 0.9 });
    }
  });
})();
