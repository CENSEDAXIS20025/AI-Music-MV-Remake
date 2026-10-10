/* ============================================================================
   world.search(you);  --  sections 11-15
   11 search2   : "I'm searching" -- descent through the shards
   12 typeahead : "a piece of sheet" -- autocomplete fails, candidates struck out
   13 love      : the typeahead lands on LOVE
   14 embed     : "I can see you in most everything" -- the embedding cloud
   15 rapid     : "searching for, searching for, searching for"
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

  /* ---------------------------------------------------- shared typeahead -- */
  // draws the suggestion dropdown; `cands` is [{w, conf, deadAt, note}]
  function dropdown(ctx, x, y, w, cands, l, o) {
    o = o || {};
    var hud = ctx.hud, rowH = o.rowH || 40;
    hud.rect(x, y, w, cands.length * rowH + 12, { fill: "rgba(8,10,14,0.92)", stroke: "rgba(228,235,242,0.30)", lw: 1 });
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i];
      var yy = y + 6 + i * rowH + rowH * 0.68;
      var dead = l >= c.deadAt;
      var k = dead ? clamp((l - c.deadAt) / 0.22, 0, 1) : 0;
      var col = dead ? COL.dim : (c.hit ? COL.gold : COL.white);
      hud.T(x + 18, yy, c.w, { size: 20, color: col, alpha: dead ? 0.55 : 1, glow: c.hit && !dead });
      if (c.note) hud.T(x + 18 + tw(hud, c.w, 20) + 16, yy, c.note, { size: 11, color: dead ? COL.faint : COL.dim });
      // confidence bar
      var bx = x + w - 210;
      hud.rect(bx, yy - 11, 150, 10, { fill: "rgba(255,255,255,0.05)" });
      hud.rect(bx, yy - 11, 150 * c.conf * (1 - k), 10, { fill: c.hit ? "rgba(255,201,74,0.9)" : "rgba(94,224,160,0.65)" });
      hud.T(x + w - 18, yy, dead ? "0.000" : c.conf.toFixed(3), { size: 12, color: dead ? COL.red : COL.dim, align: "right" });
      if (dead) {
        hud.line(x + 14, yy - 6, x + w - 232, yy - 6, { color: "rgba(255,90,82,0.85)", lw: 2, alpha: clamp(k * 1.6, 0, 1) });
      }
    }
  }

  /* ======================================================= 11 SEARCH 2 ==== */
  WEM.defineSection({
    id: "11", name: "search2",
    init: function () {
      var r = C.rng(1111), cells = [];
      for (var i = 0; i < 64; i++) cells.push({ t: r() * 12.5, n: Math.floor(r() * 9200) });
      this.cells = cells;
      // query plan tree
      var t = { x: 0.5, y: 0.06, ch: [] };
      for (var a = 0; a < 4; a++) {
        var n2 = { x: 0.14 + a * 0.24, y: 0.42, ch: [] };
        for (var b = 0; b < 4; b++) n2.ch.push({ x: 0.14 + a * 0.24 + (b - 1.5) * 0.055, y: 0.84, leaf: true });
        t.ch.push(n2);
      }
      this.tree = t;
    },
    enter: function (ctx) {
      ctx.cam.reset3d(5);
      ctx.fx.mood([0.06, 0.12, 0.16], [0.01, 0.04, 0.06], 0.34);
      ctx.fx.bloom = 0.70;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, T = ctx.t, b = ctx.beat;
      var px = 30, py = 84, pw = 560, ph = 846;
      // ---- left: shard map 8x8 ----
      S.panel(hud, px, py, pw, 470, { title: "SHARD MAP  \u2014  64 shards" });
      var cw = (pw - 56) / 8, chh = (470 - 110) / 8;
      for (var i = 0; i < 64; i++) {
        var cx = px + 28 + (i % 8) * cw, cy = py + 66 + Math.floor(i / 8) * chh;
        var c = this.cells[i];
        var done = clamp((l - c.t) / 0.6, 0, 1);
        var active = l >= c.t - 0.6 && l < c.t + 0.6;
        hud.rect(cx + 2, cy + 2, cw - 5, chh - 5, {
          fill: active ? "rgba(53,224,255,0.22)" : done > 0 ? "rgba(94,224,160,0.13)" : "rgba(255,255,255,0.03)",
          stroke: active ? "rgba(53,224,255,0.95)" : "rgba(228,235,242,0.16)"
        });
        if (done > 0.4) hud.T(cx + cw / 2, cy + chh / 2 + 4, String(i).padStart(2, "0"), { size: 10, color: done > 0.99 ? COL.dim : COL.faint, align: "center" });
      }
      var doneN = 0;
      for (var q = 0; q < 64; q++) if (l > this.cells[q].t) doneN++;
      hud.T(px + 28, py + 446, "scanned " + doneN + " / 64   \u2014   " + Math.round(doneN / 64 * 100) + " %",
        { size: 12, color: COL.grey });

      // ---- left, lower: telemetry ----
      S.panel(hud, px, 578, pw, 352, { title: "TELEMETRY" });
      var stats = [["DOCS SCANNED", num(1204000 + Math.floor(l * 184000))],
      ["SHARDS DONE", Math.round(clamp(l / 9, 0, 1) * 64) + " / 64"],
      ["LATENCY", (4.2 + 3.1 * Math.abs(Math.sin(l * 1.3))).toFixed(2) + " ms"],
      ["QPS", num(2200 + Math.floor(400 * Math.abs(Math.sin(l * 2.2))))],
      ["CRAWL BUDGET", Math.round(clamp(l / 14.45, 0, 1) * 100) + " %"]];
      for (var s2 = 0; s2 < stats.length; s2++) {
        hud.T(px + 22, 626 + s2 * 40, stats[s2][0], { size: 12, color: COL.faint });
        hud.T(px + pw - 22, 626 + s2 * 40, stats[s2][1], { size: 16, color: COL.white, align: "right" });
        hud.line(px + 22, 638 + s2 * 40, px + pw - 22, 638 + s2 * 40, { color: "rgba(228,235,242,0.08)" });
      }
      hud.T(px + 22, 838, "the cursor never stops", { size: 12, color: COL.cyan, alpha: 0.9 });
      hud.T(px + 22, 862, "the index never quite answers", { size: 12, color: COL.cyan, alpha: 0.9 });
      hud.T(px + 22, 898, "\u2014 I'M SEARCHING \u2014", { size: 15, color: COL.white, weight: "700", spacing: 2 });

      // ---- right: query plan ----
      var rx = 1330, rw = 560;
      S.panel(hud, rx, py, rw, 470, { title: "QUERY PLAN  \u2014  bm25+ descent" });
      var ox = rx + 30, oy = py + 76, ow = rw - 60, oh = 330;
      var root = this.tree;
      var p0 = [ox + ow * root.x, oy + oh * root.y];
      var lvl = clamp(l / 9, 0, 1);
      for (var a = 0; a < root.ch.length; a++) {
        var n2 = root.ch[a];
        var p1 = [ox + ow * n2.x, oy + oh * n2.y];
        var on = lvl > 0.10 + a * 0.06;
        hud.line(p0[0], p0[1], p1[0], p1[1], { color: on ? "rgba(53,224,255,0.75)" : "rgba(228,235,242,0.16)", lw: on ? 1.8 : 1 });
        for (var c2 = 0; c2 < n2.ch.length; c2++) {
          var p2 = [ox + ow * n2.ch[c2].x, oy + oh * n2.ch[c2].y];
          var on2 = lvl > 0.45 + a * 0.05 + c2 * 0.012;
          hud.line(p1[0], p1[1], p2[0], p2[1], { color: on2 ? "rgba(94,224,160,0.7)" : "rgba(228,235,242,0.12)", lw: on2 ? 1.5 : 1 });
          hud.rect(p2[0] - 7, p2[1] - 5, 14, 10, { fill: on2 ? "rgba(94,224,160,0.75)" : "rgba(255,255,255,0.06)" });
        }
        hud.rect(p1[0] - 10, p1[1] - 8, 20, 16, { fill: on ? "rgba(53,224,255,0.7)" : "rgba(255,255,255,0.06)" });
      }
      hud.rect(p0[0] - 14, p0[1] - 10, 28, 20, { fill: "rgba(255,201,74,0.9)" });
      hud.T(p0[0], p0[1] + 28, "QUERY", { size: 11, color: COL.gold, align: "center" });

      // ---- right, lower: posting-list merge ----
      S.panel(hud, rx, 578, rw, 352, { title: "POSTING-LIST MERGE" });
      var my = 632;
      var lists = [[3, 9, 14, 22, 31, 44, 57], [5, 9, 17, 22, 38, 51, 62]];
      for (var m = 0; m < 12; m++) {
        var which = m % 2, idx = Math.floor(m / 2);
        if (idx >= lists[which].length) continue;
        var v = lists[which][idx];
        var ap = clamp((l - 5.5 - m * 0.22) * 4, 0, 1);
        hud.T(rx + 26 + which * 150, my + idx * 17, "doc " + String(v).padStart(3, "0"),
          { size: 12, color: which ? "rgba(180,140,255,0.9)" : "rgba(108,232,255,0.9)", alpha: ap });
        hud.T(rx + 330 + m * 18, my, String(v).padStart(2, "0"),
          { size: 12, color: v === 9 || v === 22 ? COL.gold : COL.grey, alpha: ap });
      }
      hud.T(rx + 26, my + 148, "merged \u2192 " + Math.min(12, Math.max(0, Math.floor((l - 5.5) / 0.22))),
        { size: 12, color: COL.dim });
      var gq = S.plotAxes(hud, rx + 26, 800, rw - 52, 110, { gx: 6, gy: 3 });
      S.plotLine(hud, gq, function (u) {
        var tt = u * Math.max(l, 0.1);
        return 0.35 + 0.35 * Math.sin(tt * 1.7) + 0.2 * Math.sin(tt * 5.3);
      }, 90, { color: "rgba(108,232,255,0.85)" });
      hud.T(rx + 34, 820, "query latency", { size: 11, color: COL.dim });

      // ---- centre: the descent, through a screen-centred window ----
      var vx = 610, vy = 150, vw = 700, vh = 780;
      S.panel(hud, vx, vy, vw, vh, { title: "DESCENT", tick: 14 });
      ctx.hudRect(0, 0.5, 0.5, (vw / 2 - 6) / ctx.W, (vh / 2 - 6) / ctx.H);
      hud.T(vx + 18, vy + vh - 44, "level " + (Math.floor(clamp(l / 9, 0, 1) * 6) + 1) + " / 6   \u2014   the crawl descends one level per 1.5 s",
        { size: 12, color: COL.grey });
      hud.T(vx + vw - 18, vy + vh - 44, "shard latency 5.98 ms", { size: 12, color: COL.dim, align: "right" });
    },
    draw3d: function (ctx) {
      var l = ctx.local, T = ctx.t, b = ctx.beat;
      var lvl = clamp(l / 9, 0, 1);
      var drop = Math.floor(lvl * 5.99);
      var frac = lvl * 6 - drop;
      var cy = 2.2 - (drop + frac) * 1.6;
      // a vertical shaft of shard levels: the camera looks down into it.
      // (pos and target must not differ only in y -- lookAt() would be
      // degenerate and produce NaN, which renders nothing at all)
      ctx.cam.pos = [0.55, cy + 1.35, 1.35]; ctx.cam.target = [0, cy - 0.55, -0.22];
      ctx.cam.fov = 1.00; ctx.cam.update();
      var g = new V.Lines(4000);
      var HW = 0.95, HD = 0.66;
      // the four corner posts of the shaft, kept short so nothing projects
      // outside the viewport window
      for (var c = 0; c < 4; c++) {
        var sx = (c === 0 || c === 3) ? -HW : HW;
        var sz = (c < 2) ? -HD : HD;
        g.seg(sx, cy + 1.0, sz, sx, cy - 1.9, sz, [0.32, 0.38, 0.46], 1.1, 0.6);
      }
      // one ring per level, brightening below the descent line
      for (var i = 0; i < 4; i++) {
        var y = cy + 1.0 - i * 0.95;
        var col = [0.42, 0.88, 1.0];
        var a = 0.75 - i * 0.13;
        var pts = [[-HW, y, -HD], [HW, y, -HD], [HW, y, HD], [-HW, y, HD]];
        g.path(pts, col, 1.7, a, true);
        for (var k = -3; k <= 3; k++) {
          g.seg(k * (HW / 3), y, -HD, k * (HW / 3), y, HD, col, 1.0, a * 0.30);
          g.seg(-HW, y, k * (HD / 3), HW, y, k * (HD / 3), col, 1.0, a * 0.30);
        }
      }
      // scanning beams sweeping the level the camera is on
      for (var q = 0; q < 6; q++) {
        var ph = ((T * 1.4 + q * 0.31) % 1);
        var zz = -HD + ph * 2 * HD;
        g.seg(-HW, cy, zz, HW, cy, zz, [0.30, 0.95, 1.0], 2.0, 0.65);
      }
      g.draw(ctx.gfx, { add: true });
      var P = new V.Points(600), r = C.rng(77);
      for (var p = 0; p < 600; p++) {
        P.add((r() - 0.5) * 1.7, cy + 0.9 - r() * 2.6, (r() - 0.5) * 1.2,
          1.0 + r() * 2.0, [0.6, 0.85, 1.0], 0.30 * (1 - r()));
      }
      P.draw(ctx.gfx, { add: true, soft: 0.6 });
    }
  });

  /* ===================================================== 12 TYPEAHEAD ==== */
  var CANDS12 = [
    { w: "sheet", deadAt: 3.30, conf: 0.61 }, { w: "sheep", deadAt: 4.35, conf: 0.44 },
    { w: "shape", deadAt: 5.40, conf: 0.38 }, { w: "shift", deadAt: 6.45, conf: 0.31 },
    { w: "shoot", deadAt: 7.50, conf: 0.27 }, { w: "shop", deadAt: 8.55, conf: 0.22 },
    { w: "shard", deadAt: 9.60, conf: 0.19 }, { w: "dove", deadAt: 10.65, conf: 0.14 },
    { w: "hope", deadAt: 11.70, conf: 0.09 }, { w: "rope", deadAt: 12.75, conf: 0.05 }
  ];
  WEM.defineSection({
    id: "12", name: "typeahead",
    init: function () { },
    enter: function (ctx) {
      ctx.cam.reset3d(4.2);
      ctx.fx.mood([0.12, 0.11, 0.13], [0.04, 0.04, 0.05], 0.30);
      ctx.fx.bloom = 0.55;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, T = ctx.t, b = ctx.beat;
      var TY = [0.17, 3.12, 4.75, 7.18, 9.97, 11.99];
      // ---- the input ----
      var typed = "a piece of ";
      if (l > 3.12) typed = "a piece of sheet";
      if (l > 4.75) typed = "a piece of s";
      if (l > 7.18) typed = "a piece of ";
      if (l > 9.97) typed = "a piece of";
      if (l > 11.99) typed = "a piece of dope";
      S.panel(hud, 60, 84, 1100, 110, { title: "AUTOCOMPLETE", tick: 12 });
      var qb = S.queryBar(ctx, 82, 122, 1056, typed, { h: 52, size: 24, hits: "? suggestions" });
      if (l > 11.99) {
        hud.T(qb.textX + tw(hud, typed, 24) + 16, 158, "\u2190 typed by hand", { size: 12, color: COL.amber });
      }
      dropdown(ctx, 82, 214, 1056, CANDS12, l, { rowH: 38 });
      // the stall
      if (l > 4.75) {
        var k = clamp((l - 4.75) / 0.6, 0, 1);
        hud.T(1160, 158, "U-Um?", { size: 34, color: COL.amber, weight: "700", alpha: k, glow: true });
        hud.T(1160, 186, "suggestion engine: STALLED", { size: 13, color: COL.red, alpha: k });
      }
      if (l > 9.97) {
        hud.T(1160, 214, "what's that word again?", { size: 16, color: COL.white, weight: "700", alpha: clamp((l - 9.97) * 2, 0, 1) });
      }

      // ---- right: engine health ----
      var rx = 1290, rw = 600;
      S.panel(hud, rx, 84, rw, 620, { title: "SUGGEST ENGINE" });
      var g = S.plotAxes(hud, rx + 26, 140, rw - 52, 170, { gx: 6, gy: 4 });
      S.plotLine(hud, g, function (u) {
        var tt = u * 13.8;
        var v = 0.18 + 0.62 / (1 + Math.exp(-(tt - 4.6) * 1.6)) * (1 - 1 / (1 + Math.exp(-(tt - 12.6) * 3)));
        return clamp(v, 0, 1);
      }, 120, { color: "rgba(255,201,74,0.9)" });
      hud.line(g.x + g.w * clamp(l / 13.8, 0, 1), g.y, g.x + g.w * clamp(l / 13.8, 0, 1), g.y + g.h,
        { color: "rgba(255,90,82,0.9)", lw: 1.4 });
      hud.T(rx + 34, 160, "latency", { size: 11, color: COL.dim });
      hud.T(rx + 26, 330, "the trie is fully traversed and has nothing to offer",
        { size: 11, color: COL.faint });
      var alive = 0;
      for (var i = 0; i < CANDS12.length; i++) if (l < CANDS12[i].deadAt) alive++;
      S.metricBar(ctx, rx + 26, 364, rw - 52, "candidates remaining", alive / CANDS12.length,
        { text: alive + " / " + CANDS12.length, fill: "rgba(255,90,82,0.7)" });
      S.metricBar(ctx, rx + 26, 414, rw - 52, "vocabulary", 1, { text: "30 000" });
      S.metricBar(ctx, rx + 26, 464, rw - 52, "beam width", 0.12, { text: "12" });
      S.metricBar(ctx, rx + 26, 514, rw - 52, "confidence", 0.02, { text: "0.02", fill: "rgba(255,90,82,0.8)" });
      // the word cloud of what it is NOT
      hud.T(rx + 26, 584, "REJECTED", { size: 11, color: COL.cyan, spacing: 1.2 });
      var rejW = ["sheet", "sheep", "shape", "shift", "shoot", "shop", "shard", "dove", "hope", "rope", "lobe", "lore"];
      for (var q = 0; q < rejW.length; q++) {
        var dead = q < Math.floor(clamp((l - 3.3) / 0.95, 0, 12));
        var cxx = rx + 30 + (q % 3) * 190, cyy = 614 + Math.floor(q / 3) * 22;
        hud.T(cxx, cyy, rejW[q], { size: 13, color: dead ? COL.faint : COL.grey, alpha: dead ? 0.5 : 0.9 });
        if (dead) hud.line(cxx - 2, cyy - 4, cxx + tw(hud, rejW[q], 13) + 2, cyy - 4, { color: "rgba(255,90,82,0.7)", lw: 1.6 });
      }
      // ---- bottom: a sheet of paper with fold guides ----
      S.panel(hud, 60, 790, 1100, 180, { title: "CANDIDATE OBJECT  \u2014  'a piece of sheet'", tick: 12 });
      var pw2 = 860, phh = 92, px0 = 180, py0 = 826;
      hud.rect(px0, py0, pw2, phh, { fill: "rgba(238,235,228,0.10)", stroke: "rgba(238,235,228,0.55)" });
      for (var f = 1; f < 6; f++) {
        var fx = px0 + pw2 * f / 6;
        hud.line(fx, py0, fx, py0 + phh, { color: "rgba(238,235,228,0.25)", dash: [5, 5], lw: 1 });
      }
      hud.line(px0, py0 + phh * 0.5, px0 + pw2, py0 + phh * 0.5, { color: "rgba(238,235,228,0.25)", dash: [5, 5] });
      hud.T(px0 + pw2 + 18, py0 + 34, "80 g/m\u00b2", { size: 11, color: COL.faint });
      hud.T(px0 + pw2 + 18, py0 + 52, "0.10 mm", { size: 11, color: COL.faint });
      hud.T(px0 + pw2 + 18, py0 + 70, "no match", { size: 11, color: COL.red });
    },
    draw3d: function (ctx) {
      var l = ctx.local, T = ctx.t, b = ctx.beat;
      ctx.cam.pos = [0.5, 1.1, 3.4]; ctx.cam.target = [0, -0.62, 0];
      ctx.cam.fov = 0.86; ctx.cam.update();
      // a sheet of paper folding and unfolding, parked in the open band between
      // the autocomplete dropdown and the candidate-object panel
      var NX = 12, NY = 8, W2 = 3.0, H2 = 2.0;
      var g = new V.Lines(2400);
      var foldA = 0.5 * Math.sin(T * 0.9) + 0.35 * Math.sin(T * 2.3 + 1.1) * b.pulse;
      function pt(i, j) {
        var u = i / NX, v = j / NY;
        var x = (u - 0.5) * W2, z = (v - 0.5) * H2;
        var y = 0.34 * Math.sin(u * PI * 2.2 + T * 1.1) * Math.cos(v * PI * 1.5) * (0.5 + foldA * 0.6);
        y += 0.20 * Math.sin(v * PI * 3.0 - T * 0.7);
        return [x, y, z];
      }
      for (var i2 = 0; i2 <= NX; i2++) {
        for (var j2 = 0; j2 <= NY; j2++) {
          var a = pt(i2, j2);
          if (i2 < NX) { var b2 = pt(i2 + 1, j2); g.seg(a[0], a[1], a[2], b2[0], b2[1], b2[2], [0.86, 0.84, 0.78], 1.2, 0.40); }
          if (j2 < NY) { var c2 = pt(i2, j2 + 1); g.seg(a[0], a[1], a[2], c2[0], c2[1], c2[2], [0.86, 0.84, 0.78], 1.2, 0.40); }
        }
      }
      // crease lines that only exist while folding
      for (var k = 1; k < 4; k++) {
        var uu = k / 4;
        for (var j3 = 0; j3 < NY; j3++) {
          var a3 = pt(uu * NX, j3), b3 = pt(uu * NX, j3 + 1);
          g.seg(a3[0], a3[1], a3[2], b3[0], b3[1], b3[2], [1.0, 0.9, 0.6], 2.0, 0.30 + 0.5 * Math.min(1, Math.abs(foldA) * 2));
        }
      }
      g.draw(ctx.gfx, { add: true });
    }
  });

  /* =========================================================== 13 LOVE ==== */
  var CANDS13 = [
    { w: "lobe", deadAt: 1.30, conf: 0.58 }, { w: "lore", deadAt: 2.60, conf: 0.51 },
    { w: "lose", deadAt: 3.90, conf: 0.46 }, { w: "lone", deadAt: 5.20, conf: 0.40 },
    { w: "glove", deadAt: 6.50, conf: 0.36 }, { w: "dove", deadAt: 7.80, conf: 0.30 },
    { w: "love", deadAt: 11.82, conf: 0.99, hit: true }
  ];
  WEM.defineSection({
    id: "13", name: "love",
    init: function () { },
    enter: function (ctx) {
      ctx.cam.reset3d(5.0);
      ctx.fx.mood([0.20, 0.10, 0.16], [0.08, 0.03, 0.08], 0.36);
      ctx.fx.bloom = 0.72;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, T = ctx.t, b = ctx.beat;
      var HIT = 11.82;
      var typed = "so I can ";
      if (l > 4.90) typed = "so I can l";
      if (l > 6.75) typed = "so I can ";
      if (l > 9.90) typed = "so I can l";
      if (l > HIT) typed = "so I can love";
      S.panel(hud, 60, 84, 1100, 110, { title: "AUTOCOMPLETE", tick: 12 });
      var qb = S.queryBar(ctx, 82, 122, 1056, typed, {
        h: 52, size: 24, hits: l > HIT ? "1 suggestion" : "? suggestions",
        textColor: l > HIT ? COL.gold : COL.white, glow: l > HIT
      });
      dropdown(ctx, 82, 214, 1056, CANDS13, l, { rowH: 44 });
      // ---- the landing ----
      if (l > HIT) {
        var k = clamp((l - HIT) / 0.35, 0, 1);
        if (l - HIT < 0.09) ctx.fx.flash = Math.max(ctx.fx.flash, 1.0);
        if (l - HIT < 0.40) ctx.fx.glitch = Math.max(ctx.fx.glitch, 0.6);
        hud.fc.save();
        hud.fc.globalAlpha = clamp(k * 1.2, 0, 1) * (0.55 + 0.45 * b.barPulse);
        hud.fc.font = hud.fontStr(150, "mono", "700");
        hud.fc.textAlign = "center";
        hud.fc.shadowColor = "#ff8fd0"; hud.fc.shadowBlur = 40;
        hud.fc.fillStyle = "#ffe9f5";
        hud.fc.fillText("LOVE", 960, 700);
        hud.fc.restore();
        hud.T(960, 760, "1 RESULT \u2014 the word was love", { size: 20, color: COL.gold, align: "center", alpha: k, spacing: 2 });
        hud.T(960, 792, "\u201cLo-o-o-ove\u201d?", { size: 16, color: COL.pink, align: "center", alpha: clamp((l - HIT - 0.6) * 2, 0, 1) });
      } else {
        hud.T(960, 690, "U-Um?", { size: 44, color: COL.amber, align: "center", weight: "700", alpha: clamp((l - 4.90) * 2, 0, 0.9) });
        hud.T(960, 730, "what's that word again?", { size: 20, color: COL.dim, align: "center", alpha: clamp((l - 6.75) * 1.5, 0, 1) });
      }
      // ---- right: what is being eliminated ----
      var rx = 1290, rw = 600;
      S.panel(hud, rx, 84, rw, 620, { title: "CANDIDATE SPACE" });
      hud.T(rx + 26, 140, "26 letters \u00d7 4 slots = 456 976 strings", { size: 12, color: COL.grey });
      hud.T(rx + 26, 162, "the trie keeps only the ones that mean something", { size: 11, color: COL.faint });
      var words = ["lobe", "lore", "lose", "lone", "glove", "dove", "love"];
      for (var i = 0; i < words.length; i++) {
        var c = CANDS13[i];
        var dead = l >= c.deadAt;
        var yy = 200 + i * 40;
        hud.T(rx + 30, yy, words[i], { size: 18, color: dead ? COL.faint : (c.hit ? COL.gold : COL.white), alpha: dead ? 0.45 : 1 });
        if (dead) hud.line(rx + 26, yy - 6, rx + 26 + tw(hud, words[i], 18) + 8, yy - 6, { color: "rgba(255,90,82,0.85)", lw: 2 });
        hud.T(rx + rw - 30, yy, dead ? "eliminated" : "alive", { size: 12, color: dead ? COL.red : COL.green, align: "right", alpha: dead ? 0.7 : 1 });
      }
      S.metricBar(ctx, rx + 26, 500, rw - 52, "search space pruned", clamp(l / 12.4, 0, 1),
        { text: (clamp(l / 12.4, 0, 1) * 99.9998).toFixed(4) + " %", fill: "rgba(255,201,74,0.85)" });
      S.metricBar(ctx, rx + 26, 550, rw - 52, "affect", clamp((l - 2) / 10, 0, 1), { text: "rising", fill: "rgba(255,143,208,0.85)" });
      hud.T(rx + 26, 620, "the machine has no word for this yet. it is learning one.",
        { size: 11, color: COL.pink, alpha: 0.9 });
      hud.T(rx + 26, 650, "word frequency: love \u2014 rank 1 of 30 000", { size: 12, color: COL.gold, alpha: clamp((l - HIT) * 2, 0, 1) });
    },
    draw3d: function (ctx) {
      var l = ctx.local, T = ctx.t, b = ctx.beat;
      var HIT = 11.82;
      ctx.cam.pos = [0, 0.2, 5.6]; ctx.cam.target = [0, 0, 0];
      ctx.cam.fov = 0.82; ctx.cam.update();
      var build = clamp((l - HIT + 0.05) / 1.1, 0, 1);
      if (build <= 0) {
        // before the word lands: a slowly rotating wire cage of candidate letters
        var g = new V.Lines(900);
        for (var i = 0; i < 16; i++) {
          var a = i / 16 * TAU + T * 0.2;
          var r = 1.7 + 0.15 * Math.sin(T + i);
          g.seg(Math.cos(a) * r, -1.4, Math.sin(a) * r, Math.cos(a) * r, 1.4, Math.sin(a) * r, [0.5, 0.55, 0.65], 1.1, 0.35);
        }
        g.draw(ctx.gfx, { add: true });
        return;
      }
      // the heart: points sampled inside the Taubin implicit surface
      var P = new V.Points(9000), r = C.rng(1313);
      var n = Math.floor(9000 * build);
      for (var k = 0; k < n; k++) {
        var x = (r() - 0.5) * 2.4, y = (r() - 0.5) * 2.4, z = (r() - 0.5) * 2.4;
        var v = WEM.Lab.taubin(x, y * 1.05, z);
        if (v > 0) continue;
        // reject points too far inside, so the shell reads as a surface
        if (WEM.Lab.taubin(x * 1.22, y * 1.28, z * 1.22) < 0) continue;
        var pulse = 1 + 0.030 * Math.sin(T * 4.4) + 0.05 * b.pulse;
        P.add(x * 1.15 * pulse, -y * 1.15 * pulse + 0.10, z * 1.15 * pulse,
          1.6, [1.0, 0.45 + 0.2 * Math.abs(y), 0.62], 0.35 + 0.5 * build);
      }
      P.draw(ctx.gfx, { add: true, soft: 0.45 });
    }
  });

  /* ========================================================== 14 EMBED ==== */
  var FORMS14 = ["table", "eggplant", "cat", "steak", "flower", "human", "dog", "tomato"];
  WEM.defineSection({
    id: "14", name: "embed",
    init: function () {
      var r = C.rng(1414), pts = [];
      for (var i = 0; i < 2600; i++) {
        // a lumpy cloud: a few gaussian blobs, one per known form
        var b = Math.floor(r() * 8);
        var cx = Math.cos(b / 8 * TAU) * 2.4, cy = Math.sin(b / 8 * TAU) * 2.4;
        var gx = (r() + r() + r() - 1.5) * 0.95, gy = (r() + r() + r() - 1.5) * 0.95, gz = (r() + r() + r() - 1.5) * 0.95;
        pts.push({ x: cx + gx, y: gy, z: cy + gz, f: b, r: r() });
      }
      this.pts = pts;
    },
    enter: function (ctx) {
      ctx.cam.reset3d(8);
      ctx.fx.mood([0.08, 0.10, 0.19], [0.02, 0.03, 0.09], 0.36);
      ctx.fx.bloom = 0.80;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, T = ctx.t, b = ctx.beat;
      ctx.hudRect(0, 0.5, 0.5, 0.40, 0.40);
      // ---- title ----
      hud.T(44, 150, "I'M SEARCHING FOR YOU EVERYWHERE", { size: 34, color: COL.white, weight: "700", spacing: 2, alpha: 0.95 });
      hud.T(46, 178, "I CAN SEE YOU IN MOST EVERYTHING", { size: 20, color: COL.cyan, alpha: clamp((l - 3.05) * 1.4, 0, 1), spacing: 2 });
      hud.T(46, 208, "BUT SOMEHOW YOU CAN'T STOP TRANSFORMING", {
        size: 20, color: COL.amber, alpha: clamp((l - 6.83) * 1.4, 0, 1), spacing: 2, glow: clamp((l - 6.83) * 1.4, 0, 1) > 0.5
      });
      // ---- right: nearest neighbours ----
      var rx = 1500, rw = 390;
      S.panel(hud, rx, 250, rw, 640, { title: "NEAREST NEIGHBOURS" });
      var sims = FORMS14.map(function (f, i) {
        return { f: f, s: 0.99 - i * 0.052 - 0.02 * Math.abs(Math.sin(i * 2.1 + T * 0.4)) };
      }).sort(function (a, c) { return c.s - a.s; });
      for (var i = 0; i < sims.length; i++) {
        var ap = clamp((l - 0.4 - i * 0.22) * 4, 0, 1);
        var yy = 300 + i * 56;
        hud.T(rx + 22, yy, sims[i].f, { size: 16, color: i === 0 ? COL.gold : COL.grey, alpha: ap });
        hud.rect(rx + 22, yy + 10, rw - 44, 8, { fill: "rgba(255,255,255,0.06)", alpha: ap });
        hud.rect(rx + 22, yy + 10, (rw - 44) * sims[i].s, 8, { fill: i === 0 ? "rgba(255,201,74,0.9)" : "rgba(108,232,255,0.6)", alpha: ap });
        hud.T(rx + rw - 22, yy, "cos " + sims[i].s.toFixed(4), { size: 12, color: COL.dim, align: "right", alpha: ap });
      }
      hud.T(rx + 22, 860, "every point resembles you", { size: 12, color: COL.pink, alpha: 0.9 });
      // ---- left: the query vector ----
      S.panel(hud, 34, 250, 430, 640, { title: "QUERY VECTOR" });
      var r2 = C.rng(2929);
      for (var k = 0; k < 24; k++) {
        var yy2 = 300 + k * 22;
        var v = r2();
        hud.T(56, yy2, "d" + String(k).padStart(2, "0"), { size: 11, color: COL.faint });
        hud.rect(96, yy2 - 9, 240, 10, { fill: "rgba(255,255,255,0.05)" });
        hud.rect(96, yy2 - 9, 240 * v, 10, { fill: "rgba(180,140,255,0.6)" });
        hud.T(348, yy2, (v * 2 - 1).toFixed(3), { size: 11, color: COL.dim });
      }
      hud.T(56, 850, "dim 384, normalised", { size: 11, color: COL.faint });
      hud.T(56, 872, "the query never stops moving", { size: 11, color: COL.amber, alpha: clamp((l - 6.83) * 1.4, 0, 1) });
      // ---- bottom: the morph strip ----
      if (l > 6.83) {
        var k2 = clamp((l - 6.83) / 1.0, 0, 1);
        var idx = Math.floor((l - 6.83) * 3.2) % FORMS14.length;
        S.panel(hud, 34, 884, 1420, 76, { title: "", tick: 10 });
        hud.T(52, 930, "MORPH \u2192", { size: 16, color: COL.amber, alpha: k2 });
        for (var m = 0; m < FORMS14.length; m++) {
          var on = m === idx;
          hud.T(190 + m * 150, 930, FORMS14[m].toUpperCase(), {
            size: 16, color: on ? COL.gold : COL.faint, alpha: k2 * (on ? 1 : 0.55)
          });
        }
        hud.T(1440, 930, "target label: (you)", { size: 13, color: COL.cyan, align: "right", alpha: k2 });
      }
    },
    draw3d: function (ctx) {
      var l = ctx.local, T = ctx.t, b = ctx.beat;
      ctx.cam.pos = [Math.cos(T * 0.13) * 7.6, 2.6, Math.sin(T * 0.13) * 7.6];
      ctx.cam.target = [0, 0, 0]; ctx.cam.fov = 0.9; ctx.cam.update();
      var P = new V.Points(2600);
      for (var i = 0; i < this.pts.length; i++) {
        var p = this.pts[i];
        var near = p.f === 0;
        P.add(p.x, p.y, p.z, near ? 2.4 : 1.5,
          near ? [1.0, 0.80, 0.35] : [0.52, 0.70, 0.95],
          near ? 0.95 : 0.20 + 0.35 * p.r);
      }
      P.draw(ctx.gfx, { add: true, soft: 0.55 });
      // query point + neighbour links
      var g = new V.Lines(400);
      var qx = Math.cos(T * 0.55) * 1.6, qy = 0.9 * Math.sin(T * 0.9), qz = Math.sin(T * 0.55) * 1.6;
      for (var k = 0; k < 8; k++) {
        var b2 = k, cx = Math.cos(b2 / 8 * TAU) * 2.4, cz = Math.sin(b2 / 8 * TAU) * 2.4;
        g.seg(qx, qy, qz, cx, 0, cz, [1.0, 0.55, 0.85], 1.4, 0.35 + 0.3 * b.pulse);
      }
      g.draw(ctx.gfx, { add: true });
      var Q = new V.Points(1);
      Q.add(qx, qy, qz, 14, [1.0, 1.0, 1.0], 1.0);
      Q.draw(ctx.gfx, { add: true, soft: 0.9 });
    }
  });

  /* ========================================================== 15 RAPID ==== */
  WEM.defineSection({
    id: "15", name: "rapid",
    init: function () { },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.14, 0.09, 0.14], [0.05, 0.02, 0.06], 0.34);
      ctx.fx.bloom = 0.70;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, T = ctx.t, b = ctx.beat;
      var COLS = 5, CW = 360;
      hud.T(40, 74, "I'M SEARCHING", { size: 30, color: COL.white, weight: "700", spacing: 3, alpha: 0.92 });
      hud.T(430, 74, "query storm \u2014 " + num(120000 + Math.floor(l * 42000)) + " queries in flight",
        { size: 14, color: COL.amber, alpha: 0.9 });
      // four fires, one per lyric line
      var fires = [0.0, 3.02, 5.63, 6.95];
      for (var c = 0; c < COLS; c++) {
        var x = 40 + c * CW;
        S.panel(hud, x, 100, CW - 24, 812, { title: "LANE " + (c + 1), tick: 10, titleColor: COL.cyan });
        // a stack of queries firing in this lane
        for (var q = 0; q < 14; q++) {
          var age = ((l - c * 0.12 + q * 0.55) % 7.7);
          if (age < 0) continue;
          var yy = 146 + q * 54 - (l * 62) % 54;
          if (yy < 134 || yy > 890) continue;
          var a = clamp(1 - age / 3.0, 0, 1);
          var hit = age < 0.4;
          hud.T(x + 16, yy, "searching for", { size: 16, color: hit ? COL.white : COL.dim, alpha: a * 0.95 });
          hud.T(x + 16, yy + 20, "0x" + S.hex(S.hash32(c * 977 + q * 31 + Math.floor(l * 4)), 6),
            { size: 12, color: COL.green, alpha: a * 0.8 });
          hud.T(x + CW - 40, yy + 20, (C.h2(c * 7 + q, Math.floor(l * 3)) * 900 + 40).toFixed(0),
            { size: 12, color: COL.amber, align: "right", alpha: a * 0.8 });
          hud.line(x + 12, yy + 30, x + CW - 36, yy + 30, { color: "rgba(228,235,242,0.08)", alpha: a });
          if (hit) hud.rect(x + 10, yy - 18, CW - 44, 54, { fill: "rgba(53,224,255,0.10)", alpha: a });
        }
      }
      // each fire of the lyric slams a white band across every lane
      for (var f = 0; f < fires.length; f++) {
        var dt2 = l - fires[f];
        if (dt2 > 0 && dt2 < 0.35) {
          ctx.fx.flash = Math.max(ctx.fx.flash, 0.55 * (1 - dt2 / 0.35));
          for (var c2 = 0; c2 < COLS; c2++) {
            hud.rect(40 + c2 * CW, 100, CW - 24, 812, { fill: "rgba(53,224,255," + (0.16 * (1 - dt2 / 0.35)) + ")" });
          }
        }
      }
      S.panel(hud, 40, 930, 1860, 58, { title: "", tick: 8 });
      hud.T(56, 966, "SEARCHING FOR, SEARCHING FOR, SEARCHING FOR", {
        size: 22, color: COL.white, weight: "700", spacing: 3, alpha: 0.55 + 0.45 * b.barPulse
      });
      hud.T(1876, 966, "no result is ever reused", { size: 14, color: COL.amber, align: "right" });
    },
    draw3d: function (ctx) {
      var l = ctx.local, T = ctx.t, b = ctx.beat;
      ctx.cam.pos = [0, 0.4, 6.4]; ctx.cam.target = [0, 0, 0];
      ctx.cam.fov = 0.95; ctx.cam.update();
      var g = new V.Lines(3000);
      for (var i = 0; i < 140; i++) {
        var a = C.h2(i * 3.7, 1) * TAU;
        var rr = 1.2 + C.h2(i * 5.1, 2) * 3.0;
        var z = ((T * 6 + i * 0.9) % 16) - 8;
        var s = 0.25 + 0.5 * C.h2(i, 4);
        var x = Math.cos(a) * rr, y = Math.sin(a) * rr;
        g.seg(x - s, y, z, x + s, y, z, [0.30, 0.85, 1.0], 1.4, clamp(1 - Math.abs(z) / 9, 0, 1) * 0.6);
      }
      g.draw(ctx.gfx, { add: true });
    }
  });
})();
