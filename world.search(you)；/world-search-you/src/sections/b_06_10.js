/* ============================================================================
   world.search(you);  --  sections 06-10
   06 search1 : "I'm searching" -- the crawler flies through the index
   07 cat     : "if you're a cat" -- fuzzy match, blue point, purr = 0 results
   08 steak   : "if you're a steak" -- recipe card, doneness gradient
   09 flower  : "if you turn into a flower" -- bloom cycle, petal geometry
   10 human   : "if you turn into a human" -- hand warmth, unruly hair
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, V = WEM.Viz, M4 = C.M4, V3 = C.V3;
  var COL = WEM.HUD.COL, PI = Math.PI, TAU = PI * 2;
  var clamp = C.clamp, lerp = C.lerp, smooth = C.smoothstep, E = C.Ease;
  var S = WEM.SUI;
  var tw = S.tw;

  var CYAN = [0.21, 0.88, 1.0], GOLD = [1.0, 0.79, 0.29], RED = [1.0, 0.35, 0.32];
  var GREEN = [0.49, 0.91, 0.53], PURPLE = [0.72, 0.55, 1.0], BLUE = [0.42, 0.58, 0.92];

  var LEX = ["table", "eggplant", "cat", "steak", "flower", "human", "you", "self", "love",
    "bubble", "memory", "bucket", "cell", "dog", "tomato", "elbow", "purr", "meow",
    "bloom", "stubby", "wobbly", "purple", "juice", "warmth", "unruly", "delicate"];

  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }

  /* ======================================================= 06 SEARCH 1 ==== */
  var CARDS = (function () {
    var r = C.rng(60606), out = [];
    for (var i = 0; i < 120; i++) {
      out.push({
        x: (r() - 0.5) * 13, y: (r() - 0.5) * 7.0, z: r() * 46,
        w: 1.1 + r() * 1.5, h: 0.7 + r() * 0.9,
        k: Math.floor(r() * 26), br: 0.35 + r() * 0.65
      });
    }
    return out;
  })();
  WEM.defineSection({
    id: "06", name: "search1",
    init: function () { },
    enter: function (ctx) {
      ctx.cam.reset3d(6);
      ctx.fx.mood([0.07, 0.11, 0.20], [0.01, 0.03, 0.08], 0.36);
      ctx.fx.bloom = 0.75;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, T = ctx.t, b = ctx.beat;
      // a big open window in the middle of the screen for the flight
      ctx.hudRect(0, 0.5, 0.5, 0.462, 0.412);
      hud.T(44, 150, "I'M SEARCHING", { size: 46, color: COL.white, weight: "700", spacing: 3, alpha: 0.95 });
      hud.T(46, 180, "query: (you)   \u2014   elastic snap active", { size: 13, color: COL.cyan, alpha: 0.9 });
      var bl = Math.floor(T * 3) % 4;
      hud.T(46, 206, "\u2588\u2588\u2588\u2588".slice(0, bl) + "\u2591\u2591\u2591\u2591".slice(0, 4 - bl),
        { size: 13, color: COL.green, alpha: 0.8 });
      var cx = 1876, cy = 130;
      var docs = Math.floor((l * 18420 + 312) * (1 + 0.1 * Math.sin(l * 2.1)));
      var rows = [
        ["DOCS SCANNED", num(docs)],
        ["SHARDS ACTIVE", "16 / 16"],
        ["LATENCY", (2.1 + 1.4 * Math.abs(Math.sin(l * 0.9))).toFixed(2) + " ms"],
        ["QPS", num(1840 + Math.floor(220 * Math.abs(Math.sin(l * 1.7))))],
        ["INDEX SIZE", "1.42 TB"],
        ["CACHE HIT", (0.62 + 0.2 * Math.abs(Math.sin(l * 0.4))).toFixed(3)]
      ];
      for (var i = 0; i < rows.length; i++) {
        hud.T(cx, cy + i * 26, rows[i][0], { size: 11, color: COL.faint, align: "right" });
        hud.T(cx, cy + i * 26 + 16, rows[i][1], { size: 15, color: i === 2 ? COL.amber : COL.white, align: "right" });
      }
      for (var s = 0; s < 28; s++) {
        var yy = 300 + s * 20;
        var on = (s % 16) <= (Math.floor(l * 3.4) % 16) ? 1 : 0;
        hud.line(40, yy, 40 + (on ? 26 : 12), yy, { color: on ? "rgba(53,224,255,0.85)" : "rgba(228,235,242,0.20)", lw: on ? 2 : 1 });
        hud.T(74, yy + 4, "SH" + String(s).padStart(2, "0"), { size: 10, color: on ? COL.dim : COL.faint, alpha: on ? 0.9 : 0.5 });
      }
      hud.rect(30, 900, 1860, 88, { fill: "rgba(9,11,15,0.90)" });
      hud.line(30, 900, 1890, 900, { color: "rgba(228,235,242,0.22)" });
      for (var q2 = 0; q2 < 4; q2++) {
        var tt = l - q2 * 0.30;
        if (tt < 0) continue;
        hud.T(46, 926 + q2 * 20 - q2 * 0, "> SH" + String(Math.floor(C.h2(q2 * 5, Math.floor(tt * 5)) * 16)).padStart(2, "0") +
          "  doc 0x" + S.hex(S.hash32(Math.floor(tt * 977)), 6) +
          "  " + LEX[Math.floor(C.h2(q2 * 11, Math.floor(tt * 7)) * LEX.length)] +
          "  bm25=" + (3 + 6 * C.h2(q2 * 7, Math.floor(tt * 4))).toFixed(3),
          { size: 12.5, color: q2 === 0 ? COL.green : COL.grey, alpha: clamp(1 - q2 / 4.5, 0, 1) });
      }
      hud.T(1876, 984, "world.search(you);", { size: 13, color: COL.cyan, align: "right", alpha: 0.8 });
      for (var k = 0; k < 40; k++) {
        var on2 = (k % 4) === (((b.beatInBar % 4) + 4) % 4) && b.index >= 0;
        hud.line(46 + k * 46, 878, 46 + k * 46, 878 + (on2 ? 10 : 5), {
          color: on2 ? "rgba(255,201,74,0.9)" : "rgba(228,235,242,0.25)", lw: on2 ? 2 : 1
        });
      }
    },
    draw3d: function (ctx) {
      var l = ctx.local, T = ctx.t, b = ctx.beat;
      var speed = 9.5 + 5.0 * b.pulse;
      var zc = (l * speed) % 46;
      ctx.cam.pos = [0, 0, 0]; ctx.cam.target = [0, 0, 12];
      ctx.cam.fov = 1.0; ctx.cam.update();
      var g = new V.Lines(4000);
      for (var i = 0; i < CARDS.length; i++) {
        var c = CARDS[i];
        var z = c.z - zc;
        if (z < 0.4) z += 46;
        if (z > 46) continue;
        var fade = clamp((46 - z) / 26, 0, 1) * clamp((z - 0.4) / 2.2, 0, 1);
        var col = c.k === 7 ? GOLD : (c.k === 3 ? CYAN : [0.55, 0.62, 0.72]);
        var x = c.x, y = c.y, w = c.w, h = c.h;
        var pts = [[x - w / 2, y - h / 2, z], [x + w / 2, y - h / 2, z],
        [x + w / 2, y + h / 2, z], [x - w / 2, y + h / 2, z]];
        g.path(pts, col, 1.3, fade * c.br, true);
        g.seg(x - w / 2, y - h / 2, z, x - w / 2, y - h / 2, z - 0.10, col, 1.0, fade * c.br * 0.7);
        g.seg(x + w / 2, y - h / 2, z, x + w / 2, y - h / 2, z - 0.10, col, 1.0, fade * c.br * 0.7);
      }
      var sy = 5.2 - ((l * 2.6) % 10.4);
      for (var k = 0; k < 30; k++) {
        var xx = -6.5 + k * 0.45;
        g.seg(xx, sy, 0.6, xx, sy, 44, [0.30, 0.95, 1.0], 2.2, 0.35);
      }
      g.draw(ctx.gfx, { add: true });
      var P = new V.Points(700), r = C.rng(31);
      for (var p = 0; p < 700; p++) {
        var pz = (r() * 46 - zc * 1.6) % 46; if (pz < 0) pz += 46;
        P.add((r() - 0.5) * 22, (r() - 0.5) * 13, pz, 1.0 + r() * 1.6,
          [0.55, 0.75, 0.95], clamp((46 - pz) / 46, 0, 1) * 0.35);
      }
      P.draw(ctx.gfx, { add: true, soft: 0.6 });
    }
  });

  /* ============================================================ 07 CAT ==== */
  WEM.defineSection({
    id: "07", name: "cat",
    init: function () {
      this.head = C.geo.ico(2);
      this.ear = C.geo.tetra();
      this.body = C.geo.ico(2);
      this.tail = C.geo.torus(0.5, 0.045, 40, 8);
      this.leg = C.geo.cylinder(0.075, 0.06, 1, 12);
      this.eye = C.geo.ico(1);
      this.terms = [
        ["cat", 0, 0.98], ["cats", 1, 0.91], ["kat", 1, 0.74], ["cot", 1, 0.66],
        ["car", 1, 0.61], ["kitten", 4, 0.88], ["feline", 6, 0.69], ["catalogue", 8, 0.22]
      ];
    },
    enter: function (ctx) {
      ctx.cam.reset3d(5.4);
      ctx.fx.mood([0.09, 0.12, 0.18], [0.02, 0.05, 0.10], 0.34);
      ctx.fx.bloom = 0.60;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, T = ctx.t, b = ctx.beat;
      var px = 30, py = 84, pw = 570, ph = 846;
      S.panel(hud, px, py, pw, ph, { title: "FUZZY MATCH  \u2014  q: cat" });
      hud.T(px + 24, py + 58, "edit distance", { size: 11, color: COL.cyan, spacing: 1.2 });
      for (var i = 0; i < this.terms.length; i++) {
        var tI = this.terms[i];
        var ap = clamp((l - 0.3 - i * 0.42) * 4, 0, 1);
        var yy = py + 92 + i * 44;
        hud.T(px + 24, yy, tI[0].toUpperCase(), { size: 15, color: tI[1] === 0 ? COL.gold : COL.white, alpha: ap });
        hud.T(px + pw - 26, yy, "d=" + tI[1], { size: 12, color: tI[1] === 0 ? COL.gold : COL.dim, align: "right", alpha: ap });
        S.metricBar(ctx, px + 24, yy + 10, pw - 52, "", tI[2], {
          bh: 6, alpha: ap, fill: tI[1] === 0 ? "rgba(255,201,74,0.85)" : "rgba(108,232,255,0.55)"
        });
      }
      hud.T(px + 24, py + 470, "blue point", { size: 13, color: COL.blue, alpha: clamp((l - 4.78) * 1.4, 0, 1) });
      hud.T(px + 24, py + 492, "colour-point allele (cs), recessive", { size: 11, color: COL.faint, alpha: clamp((l - 4.78) * 1.4, 0, 1) });
      var cw = clamp((l - 4.78) / 0.7, 0, 1);
      hud.rect(px + 24, py + 516, 150, 74, { fill: "rgb(238,228,206)" });
      hud.rect(px + 24, py + 516, 150 * cw, 74, { fill: "rgb(126,140,166)", alpha: 0.92 });
      hud.rect(px + 24, py + 516, 150, 74, { stroke: "rgba(228,235,242,0.5)" });
      hud.T(px + 186, py + 542, "#EEE4CE  body", { size: 11.5, color: COL.grey });
      hud.T(px + 186, py + 562, "#7E8CA6  points", { size: 11.5, color: COL.blue, alpha: cw });
      hud.T(px + 24, py + ph - 40, "points: ears, muzzle, tail, paws", { size: 11, color: COL.faint });

      var vx = 630, vy = 150, vw = 660, vh = 780;
      S.panel(hud, vx, vy, vw, vh, { title: "SPECIMEN  \u2014  felis catus, blue point", tick: 16 });
      ctx.hudRect(0, 0.5, 0.5, (vw / 2 - 6) / ctx.W, (vh / 2 - 6) / ctx.H);
      hud.T(vx + 18, vy + vh - 44, "mass 4.2 kg   length 46 cm + tail 30 cm", { size: 12, color: COL.grey });
      hud.T(vx + 18, vy + vh - 24, "gesture: idle, tail active", { size: 11, color: COL.faint });
      hud.T(vx + vw - 18, vy + vh - 24, "age 2 y", { size: 12, color: COL.dim, align: "right" });

      var rx = 1320, rw = 570;
      S.panel(hud, rx, py, rw, ph, { title: "FACETS" });
      var facets = [
        { k: "meow", n: 1284, t: 7.08, c: "rgba(94,224,160,0.75)" },
        { k: "hiss", n: 906, t: 9.90, c: "rgba(255,201,74,0.75)" },
        { k: "purr", n: 0, t: 11.71, c: "rgba(255,90,82,0.85)" }
      ];
      var fy = py + 70;
      for (var f = 0; f < facets.length; f++) {
        var F = facets[f], ap2 = clamp((l - F.t) * 4, 0, 1);
        if (ap2 <= 0) {
          // before the lyric names the facet, show the engine still counting
          hud.rect(rx + 20, fy - 20, rw - 40, 96, { fill: "rgba(255,255,255,0.02)" });
          hud.T(rx + 34, fy + 4, "\u00b7 \u00b7 \u00b7", { size: 22, color: COL.faint, alpha: 0.8 });
          hud.T(rx + rw - 34, fy + 4, "querying", { size: 14, color: COL.faint, align: "right", alpha: 0.8 });
          S.metricBar(ctx, rx + 34, fy + 22, rw - 68, "", 0.08 * Math.abs(Math.sin(T * 1.7 + f)), { bh: 10, fill: "rgba(120,130,145,0.4)" });
          fy += 118;
          continue;
        }
        hud.rect(rx + 20, fy - 20, rw - 40, 96, { fill: F.n === 0 ? "rgba(255,90,82,0.08)" : "rgba(255,255,255,0.03)", alpha: ap2 });
        hud.T(rx + 34, fy + 4, F.k, { size: 22, color: F.n === 0 ? COL.red : COL.white, alpha: ap2 });
        hud.T(rx + rw - 34, fy + 4, F.n === 0 ? "0 results" : num(F.n) + " hits", {
          size: 15, color: F.n === 0 ? COL.red : COL.grey, align: "right", alpha: ap2
        });
        S.metricBar(ctx, rx + 34, fy + 22, rw - 68, "", F.n === 0 ? 0 : Math.min(1, F.n / 1400), {
          bh: 10, alpha: ap2, fill: F.c
        });
        fy += 118;
      }
      if (l > 11.71) {
        var k2 = clamp((l - 11.71) / 0.45, 0, 1);
        S.stamp(ctx, rx + rw / 2, py + 500, ["PURR", "0 RESULTS"], {
          alpha: clamp(k2 * 1.4, 0, 1), pop: E.outBack(k2), size: 22, color: COL.red
        });
        hud.T(rx + rw / 2, py + 610, "no document contains a purr", { size: 13, color: COL.dim, align: "center", alpha: k2 });
        hud.T(rx + rw / 2, py + 634, "try: meow, hiss \u2014 or accept the hiss", { size: 12, color: COL.faint, align: "center", alpha: k2 });
      }
      var score = l < 4.78 ? 0.62 : l < 11.71 ? 0.91 : 0.93;
      hud.T(rx + rw / 2, py + ph - 90, score.toFixed(4), { size: 30, color: COL.white, align: "center", weight: "700" });
      hud.T(rx + rw / 2, py + ph - 66, "BEST SIMILARITY", { size: 11, color: COL.dim, align: "center", spacing: 1.6 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, T = ctx.t, b = ctx.beat;
      ctx.cam.pos = [2.35, 1.15, 3.55]; ctx.cam.target = [0, -0.05, 0];
      ctx.cam.fov = 0.78; ctx.cam.update();
      var gfx = ctx.gfx;
      var breathe = 1 + 0.02 * Math.sin(T * 2.2) + 0.025 * b.pulse;
      var cream = [0.88, 0.83, 0.70], point = [0.34, 0.43, 0.62];
      var g = new V.Lines(600);
      // a standing cat in profile: body, head, muzzle, ears, four legs, tail
      gfx.solid(this.body, M4.mul(M4.trans(-0.05, 0.10, 0), M4.scale(0.78, 0.40 * breathe, 0.38)),
        { color: cream, rim: 0.5 });
      gfx.solid(this.head, M4.mul(M4.trans(0.62, 0.40, 0), M4.scale(0.34, 0.32, 0.32)),
        { color: cream, rim: 0.5 });
      gfx.solid(this.head, M4.mul(M4.trans(0.86, 0.32, 0), M4.scale(0.17, 0.14, 0.17)),
        { color: point, rim: 0.6, emissive: 0.10 });
      for (var e = 0; e < 2; e++) {
        var sz = e === 0 ? 0.15 : -0.15;
        gfx.solid(this.ear, M4.mul(M4.trans(0.54, 0.66, sz), M4.mul(M4.rotZ(0.24), M4.scale(0.17, 0.24, 0.09))),
          { color: point, rim: 0.5 });
      }
      gfx.solid(this.eye, M4.mul(M4.trans(0.82, 0.46, 0.15), M4.scale(0.055, 0.055, 0.055)),
        { color: [0.60, 0.88, 1.0], unlit: true, emissive: 1.0 });
      gfx.solid(this.eye, M4.mul(M4.trans(0.82, 0.46, -0.15), M4.scale(0.055, 0.055, 0.055)),
        { color: [0.60, 0.88, 1.0], unlit: true, emissive: 1.0 });
      var legs = [[0.42, 0.18], [0.42, -0.18], [-0.52, 0.18], [-0.52, -0.18]];
      for (var i = 0; i < 4; i++) {
        gfx.solid(this.leg, M4.mul(M4.trans(legs[i][0], -0.42, legs[i][1]), M4.scale(1, 0.66, 1)),
          { color: i < 2 ? point : cream, rim: 0.4 });
      }
      // tail, flicking on the beat
      var flick = Math.sin(T * 3.1) * 0.35 + 0.6 * b.pulse;
      var tx = -0.82, ty = 0.16, tz = 0.0, ang = 0.9 + flick;
      var prev = [tx, ty, tz];
      for (var t2 = 1; t2 <= 9; t2++) {
        var u = t2 / 9;
        ang += 0.22 + 0.16 * Math.sin(T * 3.1 + u * 3);
        var nx = prev[0] - Math.cos(ang) * 0.16, ny = prev[1] + Math.sin(ang) * 0.16, nz = prev[2] + 0.03 * Math.sin(u * 5 + T);
        g.seg(prev[0], prev[1], prev[2], nx, ny, nz, point, 3.2 - u * 1.6, 0.95);
        prev = [nx, ny, nz];
      }
      // whiskers + ground
      for (var w = 0; w < 3; w++) {
        g.seg(0.86, 0.30, 0.10, 1.16, 0.22 + w * 0.07, 0.20, [0.85, 0.85, 0.88], 1.0, 0.55);
        g.seg(0.86, 0.30, -0.10, 1.16, 0.22 + w * 0.07, -0.20, [0.85, 0.85, 0.88], 1.0, 0.55);
      }
      for (var k = -5; k <= 5; k++) {
        g.seg(k * 0.32, -0.75, -1.2, k * 0.32, -0.75, 1.2, [0.30, 0.34, 0.40], 1.0, 0.22);
      }
      g.draw(gfx, { add: true });
    }
  });

  /* ========================================================== 08 STEAK ==== */
  WEM.defineSection({
    id: "08", name: "steak",
    init: function () {
      this.outer = C.geo.cylinder(0.90, 0.86, 0.36, 40);
      this.inner = C.geo.cylinder(0.70, 0.66, 0.40, 36);
      this.cap = C.geo.ico(2);
      this.ing = [
        ["fillet mignon", "200 g"], ["butter", "20 g"], ["mushrooms", "120 g"],
        ["cream", "60 ml"], ["thyme", "2 g"], ["garlic", "1 clove"],
        ["salt", "3 g"], ["black pepper", "1 g"]
      ];
    },
    enter: function (ctx) {
      ctx.cam.reset3d(4.6);
      ctx.fx.mood([0.18, 0.12, 0.09], [0.06, 0.03, 0.02], 0.34);
      ctx.fx.bloom = 0.58;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, T = ctx.t, b = ctx.beat;
      var TS = 3.03, TB = 7.28, TR = 10.19;
      var px = 30, py = 84, pw = 570, ph = 846;
      S.panel(hud, px, py, pw, ph, { title: "RECIPE  \u2014  q: steak" });
      hud.T(px + 24, py + 60, "fillet mignon", { size: 20, color: COL.white, alpha: clamp(l * 2, 0, 1) });
      hud.T(px + 24, py + 84, "covered in mushroom sauce", { size: 13, color: COL.amber, alpha: clamp((l - TS) * 1.5, 0, 1) });
      for (var i = 0; i < this.ing.length; i++) {
        var ap = clamp((l - 0.7 - i * 0.14) * 4, 0, 1);
        var yy = py + 126 + i * 34;
        hud.T(px + 24, yy, "\u25aa", { size: 12, color: COL.green, alpha: ap });
        hud.T(px + 42, yy, this.ing[i][0], { size: 14, color: COL.grey, alpha: ap });
        hud.T(px + pw - 26, yy, this.ing[i][1], { size: 14, color: COL.white, align: "right", alpha: ap });
        hud.line(px + 42, yy + 8, px + pw - 26, yy + 8, { color: "rgba(228,235,242,0.10)", alpha: ap });
      }
      hud.T(px + 24, py + 430, "SAUCE", { size: 11, color: COL.cyan, spacing: 1.2 });
      var steps = ["deglaze pan", "add cream", "reduce 4 min", "fold mushrooms", "season"];
      for (var s = 0; s < steps.length; s++) {
        var ap2 = clamp((l - 0.9 - s * 0.30) * 3, 0, 1);
        hud.T(px + 24, py + 456 + s * 26, (s + 1) + ". " + steps[s], { size: 13, color: COL.grey, alpha: ap2 });
      }
      // the pan surface, as a Chladni temperature mode -- the Maillard map
      hud.T(px + 24, py + 610, "PAN SURFACE  \u2014  T(x,y)", { size: 11, color: COL.cyan, spacing: 1.2 });
      for (var q = 0; q < 14; q++) for (var q2 = 0; q2 < 8; q2++) {
        var heat = WEM.Lab.chladni(3, 2, q / 13, q2 / 7);
        var on = clamp((l - 7.28) * 0.6, 0, 1) * clamp((heat + 1) / 2, 0.05, 1);
        hud.rect(px + 24 + q * 36, py + 624 + q2 * 22, 34, 20,
          { fill: "rgba(255,140,60," + (0.06 + 0.46 * on) + ")" });
      }
      hud.T(px + 24, py + ph - 60, "sear 3 min / side", { size: 12, color: COL.amber, alpha: clamp((l - TB) * 2, 0, 1) });
      hud.T(px + 24, py + ph - 38, "rest 5 min before slicing", { size: 11, color: COL.faint, alpha: clamp((l - TB) * 2, 0, 1) });

      var vx = 630, vy = 150, vw = 660, vh = 780;
      S.panel(hud, vx, vy, vw, vh, { title: "SPECIMEN  \u2014  cross section", tick: 16 });
      ctx.hudRect(0, 0.5, 0.5, (vw / 2 - 6) / ctx.W, (vh / 2 - 6) / ctx.H);
      hud.T(vx + 18, vy + vh - 44, "Maillard crust 1.8 mm", { size: 12, color: COL.amber, alpha: clamp((l - TB) * 2, 0, 1) });
      hud.T(vx + 18, vy + vh - 24, "core 54 \u00b0C \u2014 myoglobin still folded", { size: 11, color: COL.faint, alpha: clamp((l - TR) * 2, 0, 1) });
      hud.T(vx + vw - 18, vy + vh - 24, "thickness 38 mm", { size: 12, color: COL.dim, align: "right" });

      var rx = 1320, rw = 570;
      S.panel(hud, rx, py, rw, ph, { title: "DONENESS" });
      var barX = rx + 26, barY = py + 76, barW = rw - 52, barH = 40;
      var g = hud.fc.createLinearGradient(barX, 0, barX + barW, 0);
      g.addColorStop(0.00, "#5b2b3a"); g.addColorStop(0.22, "#8e2436");
      g.addColorStop(0.42, "#b83446"); g.addColorStop(0.62, "#c25a3e");
      g.addColorStop(0.80, "#8a5233"); g.addColorStop(1.00, "#5a4030");
      hud.fc.save(); hud.fc.fillStyle = g; hud.fc.globalAlpha = 0.92;
      hud.fc.fillRect(barX, barY, barW, barH); hud.fc.restore();
      hud.rect(barX, barY, barW, barH, { stroke: "rgba(228,235,242,0.4)" });
      var sel = clamp((l - TR) / 0.8, 0, 1);
      var markX = barX + (2 + 0.5) / 5 * barW;
      hud.line(markX, barY - 12, markX, barY + barH + 12, { color: "rgba(255,201,74,0.95)", lw: 2.5, alpha: 0.35 + 0.65 * sel });
      hud.T(markX, barY - 20, "MEDIUM RARE 54 \u00b0C", { size: 12, color: COL.gold, align: "center", alpha: sel });
      var labs = ["blue", "rare", "med-rare", "medium", "well"];
      for (var d = 0; d < labs.length; d++) {
        hud.T(barX + barW * (d + 0.5) / 5, barY + barH + 26, labs[d], {
          size: 10.5, color: d === 2 ? COL.gold : COL.faint, align: "center", alpha: d === 2 ? sel : 1
        });
      }
      var g2 = S.plotAxes(hud, rx + 26, py + 200, rw - 52, 190, { gx: 6, gy: 4 });
      var upto = clamp(l / 14, 0, 1);
      var tpts = [];
      for (var ti = 0; ti <= 90; ti++) {
        var uu = (ti / 90) * upto;
        tpts.push([g2.x + uu * g2.w, g2.y + g2.h - clamp(1 - Math.exp(-(uu * 14) * 0.30), 0, 1) * 0.99 * g2.h]);
      }
      for (var tk = 0; tk + 1 < tpts.length; tk++) {
        hud.line(tpts[tk][0], tpts[tk][1], tpts[tk + 1][0], tpts[tk + 1][1], { color: "rgba(255,120,90,0.9)", lw: 1.8 });
      }
      var curU = clamp(l / 14, 0, 1);
      hud.line(g2.x + g2.w * curU, g2.y, g2.x + g2.w * curU, g2.y + g2.h, { color: "rgba(255,201,74,0.85)", lw: 1.4 });
      hud.line(g2.x, g2.y + g2.h * (1 - 54 / 60), g2.x + g2.w, g2.y + g2.h * (1 - 54 / 60),
        { color: "rgba(255,201,74,0.45)", lw: 1, dash: [6, 5] });
      hud.T(g2.x + g2.w - 4, g2.y + g2.h * (1 - 54 / 60) - 6, "target 54 \u00b0C", { size: 10, color: COL.gold, align: "right" });
      var coreT = 20 + 40 * (1 - Math.exp(-l * 0.30));
      hud.T(rx + 34, py + 220, "T_core " + coreT.toFixed(1) + " \u00b0C", { size: 12, color: COL.white });
      hud.T(rx + 34, py + 372, "t = 0", { size: 10, color: COL.faint });
      hud.T(rx + rw - 34, py + 372, "14 min", { size: 10, color: COL.faint, align: "right" });
      hud.T(rx + 26, py + 406, "core temperature \u2014 newtonian heating", { size: 11, color: COL.faint });
      S.metricBar(ctx, rx + 26, py + 444, rw - 52, "crust (Maillard)", clamp((l - TB) * 0.5, 0, 1),
        { text: Math.max(0, (l - TB) * 0.25).toFixed(2) + " mm", fill: "rgba(255,160,80,0.8)" });
      S.metricBar(ctx, rx + 26, py + 494, rw - 52, "juice retention", 0.86 - clamp((l - TR) * 0.05, 0, 0.3), { text: "86 %" });
      S.metricBar(ctx, rx + 26, py + 544, rw - 52, "mushroom sauce", clamp((l - TS) * 0.5, 0, 1), { text: "120 g" });
      if (l > TR + 1.0) {
        var k2 = clamp((l - TR - 1.0) / 0.5, 0, 1);
        S.stamp(ctx, rx + rw / 2, py + 690, ["ONLY", "PERFECT", "STEAK"], { alpha: clamp(k2 * 1.4, 0, 1), pop: E.outBack(k2), size: 20 });
      }
    },
    draw3d: function (ctx) {
      var l = ctx.local, T = ctx.t, b = ctx.beat;
      ctx.cam.pos = [1.9, 1.6, 4.0]; ctx.cam.target = [0, 0, 0];
      ctx.cam.fov = 0.78; ctx.cam.update();
      var gfx = ctx.gfx;
      var crust = clamp((l - 7.28) / 1.4, 0, 1);
      var rot = M4.mul(M4.trans(0, -0.1, 0), M4.mul(M4.rotX(PI / 2 + 0.42), M4.rotY(T * 0.5)));
      gfx.solid(this.outer, rot, { color: [0.30 + 0.22 * crust, 0.16 + 0.10 * crust, 0.10], rim: 0.5, smooth: true });
      gfx.solid(this.inner, M4.mul(M4.trans(0, 0.03, 0), rot), {
        color: [0.72, 0.20, 0.26], rim: 0.4, smooth: true, emissive: 0.06
      });
      for (var i = 0; i < 3; i++) {
        var a = T * 0.3 + i * 2.1;
        var rr = 0.34;
        gfx.solid(this.cap, M4.mul(M4.trans(Math.cos(a) * rr, 0.32, Math.sin(a) * rr), M4.scale(0.20, 0.13, 0.20)),
          { color: [0.42, 0.34, 0.28], rim: 0.4 });
      }
      var g = new V.Lines(400);
      for (var k = 0; k < 72; k++) {
        var aa = k / 72 * TAU;
        var p0 = M4.xform(rot, [Math.cos(aa) * 0.90, 0.18, Math.sin(aa) * 0.90, 1]);
        var p1 = M4.xform(rot, [Math.cos(aa) * 0.62, 0.20, Math.sin(aa) * 0.62, 1]);
        g.seg(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], [0.95, 0.62, 0.35], 1.2, 0.35 + 0.4 * crust);
      }
      g.draw(gfx, { add: true });
    }
  });

  /* ========================================================= 09 FLOWER ==== */
  WEM.defineSection({
    id: "09", name: "flower",
    init: function () {
      var r = C.rng(909), pet = [];
      for (var i = 0; i < 8; i++) pet.push({ a: i / 8 * TAU, len: 0.62 + r() * 0.24, w: 0.22 + r() * 0.10 });
      this.petals = pet;
      var rr = C.rng(90), ev = [], y = 2.4;
      for (var k = 0; k < 9; k++) { ev.push(y); y += 5.4 + rr() * 3.4; }
      this.blooms = ev;
    },
    enter: function (ctx) {
      ctx.cam.reset3d(6.0);
      ctx.fx.mood([0.14, 0.11, 0.16], [0.05, 0.04, 0.05], 0.34);
      ctx.fx.bloom = 0.66;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, T = ctx.t, b = ctx.beat;
      var TD = 3.65, TO = 7.10, TM = 10.46;
      var px = 30, py = 84, pw = 570, ph = 846;
      S.panel(hud, px, py, pw, ph, { title: "BLOOM CYCLE  \u2014  q: flower" });
      var g = S.plotAxes(hud, px + 26, py + 60, pw - 52, 230, { gx: 8, gy: 4 });
      var years = 52;
      for (var i = 0; i < this.blooms.length; i++) {
        var yv = this.blooms[i];
        var u = yv / years;
        if (u > 1) continue;
        var ap = clamp((l - TD - i * 0.22) * 4, 0, 1);
        var bx = g.x + u * g.w;
        var bh = (0.35 + 0.65 * C.h2(i * 7.3, 1)) * g.h;
        hud.line(bx, g.y + g.h, bx, g.y + g.h - bh, { color: "rgba(255,143,208,0.9)", lw: 2, alpha: ap });
        hud.rect(bx - 3, g.y + g.h - bh - 3, 6, 6, { fill: "rgba(255,201,74,0.95)", alpha: ap });
        hud.T(bx, g.y + g.h - bh - 10, "y" + yv.toFixed(1), { size: 10, color: COL.faint, align: "center", alpha: ap });
      }
      var nx = g.x + clamp(26.0 / years, 0, 1) * g.w;
      hud.line(nx, g.y - 8, nx, g.y + g.h + 6, { color: "rgba(53,224,255,0.95)", lw: 2 });
      hud.T(nx + 8, g.y + 2, "now", { size: 11, color: COL.cyan });
      hud.T(px + 26, py + 302, "bloom events over 52 years \u2014 rare, irregular", { size: 11, color: COL.faint });
      hud.T(px + 26, py + 344, "DELICACY INDEX", { size: 11, color: COL.cyan, spacing: 1.2 });
      var met = [["petal thickness", 0.08, "0.08 mm"], ["petal mass", 0.42, "0.42 g"],
      ["bloom duty cycle", 0.041, "4.1 %"], ["stem stiffness", 0.12, "0.12 N/m"],
      ["tear force", 0.06, "0.06 N"]];
      for (var m = 0; m < met.length; m++) {
        var ap3 = clamp((l - TD - 0.4 - m * 0.2) * 4, 0, 1);
        S.metricBar(ctx, px + 26, py + 376 + m * 38, pw - 52, met[m][0], clamp(1 - met[m][1] * 3, 0.05, 1),
          { text: met[m][2], alpha: ap3, fill: "rgba(255,143,208,0.7)", size: 11.5 });
      }
      hud.T(px + 26, py + ph - 60, "P(bloom today) = 1.1 \u00d7 10\u207b\u00b3", { size: 12, color: COL.grey, alpha: clamp((l - TO) * 1.5, 0, 1) });
      hud.T(px + 26, py + ph - 38, "yet you are the only perfect flower", { size: 11, color: COL.pink, alpha: clamp((l - TM) * 1.5, 0, 1) });

      var vx = 630, vy = 150, vw = 660, vh = 780;
      S.panel(hud, vx, vy, vw, vh, { title: "PETAL GEOMETRY  \u2014  r = cos(4\u03b8)", tick: 16 });
      ctx.hudRect(0, 0.5, 0.5, (vw / 2 - 6) / ctx.W, (vh / 2 - 6) / ctx.H);
      hud.T(vx + 18, vy + vh - 44, "8 petals, phyllotaxis 137.508\u00b0", { size: 12, color: COL.grey });
      hud.T(vx + 18, vy + vh - 24, "aperture " + (clamp((l - 0.4) / 6.5, 0, 1) * 100).toFixed(0) + " %", { size: 11, color: COL.faint });

      var rx = 1320, rw = 570;
      S.panel(hud, rx, py, rw, ph, { title: "MATCH" });
      var score = l < TD ? 0.58 : l < TO ? 0.83 : l < TM ? 0.95 : 1.0;
      hud.T(rx + rw / 2, py + 118, score.toFixed(4), { size: 40, color: score >= 1 ? COL.gold : COL.white, align: "center", weight: "700" });
      hud.T(rx + rw / 2, py + 144, "COSINE SIMILARITY", { size: 11, color: COL.dim, align: "center", spacing: 1.6 });
      S.metricBar(ctx, rx + 26, py + 186, rw - 52, "delicacy", 0.97, { text: "0.97", fill: "rgba(255,143,208,0.8)" });
      S.metricBar(ctx, rx + 26, py + 236, rw - 52, "bloom frequency", 0.04, { text: "rare" });
      S.metricBar(ctx, rx + 26, py + 286, rw - 52, "petal count", 0.5, { text: "8" });
      S.metricBar(ctx, rx + 26, py + 336, rw - 52, "symmetry", 0.999, { text: "0.999" });
      if (l > TM) {
        var k2 = clamp((l - TM) / 0.5, 0, 1);
        S.stamp(ctx, rx + rw / 2, py + 540, ["ONLY", "PERFECT", "FLOWER"], { alpha: clamp(k2 * 1.4, 0, 1), pop: E.outBack(k2), size: 20 });
        hud.T(rx + rw / 2, py + 664, "1 RESULT", { size: 16, color: COL.gold, align: "center", alpha: k2, spacing: 2 });
      }
    },
    draw3d: function (ctx) {
      var l = ctx.local, T = ctx.t, b = ctx.beat;
      ctx.cam.pos = [0, 2.7, 3.6]; ctx.cam.target = [0, 0.05, 0];
      ctx.cam.fov = 0.80; ctx.cam.update();
      var open = clamp((l - 0.4) / 6.5, 0, 1);
      var breath = 1 + 0.03 * Math.sin(T * 1.4) + 0.04 * b.pulse;
      var gfx = ctx.gfx;
      var g = new V.Lines(2400);
      // petals: a closed outline in the petal's own plane, tilted out of the
      // flower's plane. Each petal is one rose-curve lobe, r = cos(4 theta)/2.
      for (var i = 0; i < this.petals.length; i++) {
        var P = this.petals[i];
        var tilt = 0.16 + 1.02 * E.outCubic(open) + 0.05 * Math.sin(T * 1.2 + i);
        var len = P.len * (0.30 + 0.70 * E.outCubic(open)) * breath * 1.25;
        var dir = [Math.cos(P.a), 0, Math.sin(P.a)];
        var perp = [-Math.sin(P.a), 0, Math.cos(P.a)];
        var ct = Math.cos(tilt), st = Math.sin(tilt);
        var outline = [];
        for (var s = 0; s <= 12; s++) {
          var u = s / 12;
          var hw = P.w * Math.sin(Math.pow(u, 0.62) * PI) * (1 - 0.12 * u) * 1.5;
          outline.push([dir[0] * u * len + perp[0] * hw, u * len * ct * 0.85, dir[2] * u * len + perp[2] * hw]);
        }
        for (var s2 = 12; s2 >= 0; s2--) {
          var u2 = s2 / 12;
          var hw2 = P.w * Math.sin(Math.pow(u2, 0.62) * PI) * (1 - 0.12 * u2) * 1.5;
          outline.push([dir[0] * u2 * len - perp[0] * hw2, u2 * len * ct * 0.85, dir[2] * u2 * len - perp[2] * hw2]);
        }
        var base = 0.10 + st * len * 0.30;
        var pts = outline.map(function (p) { return [p[0], p[1] + base, p[2]]; });
        g.path(pts, [1.0, 0.84, 0.95], 1.5, 0.62, true);
        // the midrib
        var tip = [dir[0] * len, len * ct * 0.85 + base, dir[2] * len];
        g.seg(0, base, 0, tip[0], tip[1], tip[2], [1.0, 0.72, 0.90], 1.2, 0.55);
      }
      // the centre: a phyllotaxis disc
      var P2 = new V.Points(900), gr = 137.50776405003785 * PI / 180;
      for (var n = 0; n < 900; n++) {
        var rr = 0.028 * Math.sqrt(n) * (0.35 + 0.65 * open);
        var aa = n * gr + T * 0.10;
        P2.add(Math.cos(aa) * rr, 0.14 + 0.035 * Math.sin(n * 0.7 + T), Math.sin(aa) * rr,
          1.0 + 1.8 * (1 - rr / 0.28), [1.0, 0.80, 0.35], 0.8);
      }
      P2.draw(gfx, { add: true, soft: 0.55 });
      // stem
      for (var q = 0; q < 10; q++) {
        var u3 = q / 9;
        g.seg(0, -1.7 * u3 + 0.10, 0, 0, -1.7 * (u3 + 0.11) + 0.10, 0, [0.42, 0.68, 0.40], 4.0 - 2 * u3, 0.9);
      }
      g.draw(gfx, { add: true });
    }
  });

  /* ========================================================== 10 HUMAN ==== */
  WEM.defineSection({
    id: "10", name: "human",
    init: function () {
      var r = C.rng(101010), strands = [];
      for (var i = 0; i < 260; i++) {
        strands.push({
          a: -PI * 0.5 + (r() - 0.5) * 2.5,
          len: 0.7 + r() * 1.2, curl: (r() - 0.5) * 3.2, ph: r() * TAU
        });
      }
      this.strands = strands;
    },
    enter: function (ctx) {
      ctx.cam.reset3d(6.0);
      ctx.fx.mood([0.14, 0.12, 0.13], [0.05, 0.04, 0.05], 0.32);
      ctx.fx.bloom = 0.60;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, T = ctx.t, b = ctx.beat;
      var TW = 3.32, TB = 6.74, TM = 10.15;
      var px = 30, py = 84, pw = 570, ph = 846;
      S.panel(hud, px, py, pw, ph, { title: "SENSORS  \u2014  q: human" });
      var g = S.plotAxes(hud, px + 26, py + 60, pw - 52, 190, { gx: 6, gy: 4 });
      S.plotLine(hud, g, function (u) {
        var tt = u * 13.7;
        var warm = 35.6 + 1.5 / (1 + Math.exp(-(tt - 3.32) * 2.2)) + 0.06 * Math.sin(tt * 3.1);
        return clamp((warm - 35.0) / 2.6, 0, 1);
      }, 110, { color: "rgba(255,140,110,0.95)" });
      var curU = clamp(l / 13.7, 0, 1);
      hud.line(g.x + g.w * curU, g.y, g.x + g.w * curU, g.y + g.h, { color: "rgba(255,201,74,0.8)", lw: 1.3 });
      var handT = 35.6 + 1.5 / (1 + Math.exp(-(l - TW) * 2.2));
      hud.T(px + 34, py + 80, "T_hand " + handT.toFixed(2) + " \u00b0C", { size: 12, color: COL.white });
      hud.T(px + 34, py + 238, "35.0", { size: 10, color: COL.faint });
      hud.T(px + 34, py + 74, "37.6", { size: 10, color: COL.faint });
      hud.T(px + 26, py + 274, "palm skin temperature \u2014 all the warmth", { size: 11, color: COL.faint });
      hud.T(px + 26, py + 314, "BREATH", { size: 11, color: COL.cyan, spacing: 1.2 });
      var voc = 0.20 + 0.55 / (1 + Math.exp(-(l - TB) * 1.8));
      S.metricBar(ctx, px + 26, py + 336, pw - 52, "volatile organics", voc,
        { text: (voc * 820).toFixed(0) + " ppb", fill: "rgba(255,201,74,0.75)", alpha: clamp((l - TB) * 2, 0.15, 1) });
      S.metricBar(ctx, px + 26, py + 386, pw - 52, "CO\u2082", 0.42, { text: "4.1 %", alpha: clamp((l - TB) * 2, 0.15, 1) });
      hud.T(px + 26, py + 426, "HAIR", { size: 11, color: COL.cyan, spacing: 1.2 });
      var unruly = clamp((l - TB) / 1.2, 0, 1);
      var hr = C.rng(4242);
      for (var i = 0; i < 40; i++) {
        var yy = py + 450 + i * 8;
        hud.line(px + 26, yy, px + pw - 26, yy, { color: "rgba(228,235,242,0.04)" });
      }
      hud.fc.save();
      hud.fc.globalAlpha = clamp(unruly * 1.2, 0, 1);
      hud.fc.strokeStyle = "rgba(232,226,214,0.9)";
      hud.fc.lineWidth = 1.0;
      // a scalp arc at the bottom of the panel; the strands grow up out of it
      var scalpY = py + 782, scalpR = 200;
      for (var k = 0; k < 300; k++) {
        var a0 = -PI + hr() * PI;
        var sxp = px + pw * 0.5 + Math.cos(a0) * scalpR;
        var syp = scalpY - Math.abs(Math.sin(a0)) * 26;
        var L2 = 55 + hr() * 105;
        var dirx = (hr() - 0.5) * 1.6 + Math.cos(a0) * 0.30;
        var ex = clamp(sxp + dirx * L2, px + 34, px + pw - 34);
        hud.fc.beginPath();
        hud.fc.moveTo(sxp, syp);
        hud.fc.bezierCurveTo(sxp + dirx * L2 * 0.25, syp - L2 * 0.40,
          ex - dirx * L2 * 0.20, syp - L2 * 0.78, ex, syp - L2);
        hud.fc.stroke();
      }
      hud.fc.restore();
      hud.line(px + 26, scalpY + 12, px + pw - 26, scalpY + 12, { color: "rgba(228,235,242,0.18)" });
      hud.T(px + pw - 26, scalpY + 30, "scalp", { size: 10, color: COL.faint, align: "right" });
      hud.T(px + 26, py + ph - 60, "strand count 112 400   disorder " + (unruly * 0.87).toFixed(2),
        { size: 12, color: COL.grey, alpha: clamp((l - TB) * 2, 0.15, 1) });
      hud.T(px + 26, py + ph - 38, "stinky breath, unruly hair \u2014 accepted", { size: 11, color: COL.pink, alpha: clamp((l - TM) * 1.5, 0, 1) });

      var vx = 630, vy = 150, vw = 660, vh = 780;
      S.panel(hud, vx, vy, vw, vh, { title: "HAIR FIELD  \u2014  112 400 strands", tick: 16 });
      ctx.hudRect(0, 0.5, 0.5, (vw / 2 - 6) / ctx.W, (vh / 2 - 6) / ctx.H);
      hud.T(vx + 18, vy + vh - 44, "disorder metric 0.87   curl variance 3.2", { size: 12, color: COL.grey });
      hud.T(vx + 18, vy + vh - 24, "the scalp is a closed surface; the hair is not", { size: 11, color: COL.faint });

      var rx = 1320, rw = 570;
      S.panel(hud, rx, py, rw, ph, { title: "MATCH" });
      var score = l < TW ? 0.61 : l < TB ? 0.86 : l < TM ? 0.96 : 1.0;
      hud.T(rx + rw / 2, py + 118, score.toFixed(4), { size: 40, color: score >= 1 ? COL.gold : COL.white, align: "center", weight: "700" });
      hud.T(rx + rw / 2, py + 144, "COSINE SIMILARITY", { size: 11, color: COL.dim, align: "center", spacing: 1.6 });
      S.metricBar(ctx, rx + 26, py + 186, rw - 52, "hand warmth", clamp((handT - 35) / 2.6, 0, 1),
        { text: handT.toFixed(2) + " \u00b0C", fill: "rgba(255,140,110,0.85)" });
      S.metricBar(ctx, rx + 26, py + 236, rw - 52, "breath quality", 1 - voc, { text: "poor", fill: "rgba(255,201,74,0.7)" });
      S.metricBar(ctx, rx + 26, py + 286, rw - 52, "hair order", 1 - unruly * 0.87, { text: "unruly" });
      S.metricBar(ctx, rx + 26, py + 336, rw - 52, "pulse", 0.55 + 0.1 * b.pulse, { text: "72 bpm", fill: "rgba(255,90,82,0.8)" });
      if (l > TM) {
        var k2 = clamp((l - TM) / 0.5, 0, 1);
        S.stamp(ctx, rx + rw / 2, py + 540, ["ONLY", "PERFECT", "HUMAN"], { alpha: clamp(k2 * 1.4, 0, 1), pop: E.outBack(k2), size: 20 });
        hud.T(rx + rw / 2, py + 664, "1 RESULT", { size: 16, color: COL.gold, align: "center", alpha: k2, spacing: 2 });
      }
    },
    draw3d: function (ctx) {
      var l = ctx.local, T = ctx.t, b = ctx.beat;
      ctx.cam.pos = [0, 0.55, 4.15]; ctx.cam.target = [0, 0.28, 0];
      ctx.cam.fov = 0.92; ctx.cam.update();
      var unruly = clamp((l - 6.74) / 1.2, 0, 1);
      var g = new V.Lines(12000);
      for (var i = 0; i < this.strands.length; i++) {
        var st = this.strands[i];
        var tw2 = 1 + 0.10 * b.pulse;
        var px0 = Math.cos(st.a) * 0.95, py0 = 0.25, pz0 = Math.sin(st.a) * 0.95;
        for (var s = 1; s <= 7; s++) {
          var u = s / 7;
          var wob = (0.10 + 0.55 * unruly) * u * u;
          var aa = st.a + st.curl * u * u * 0.9 + wob * Math.sin(u * 5.0 + st.ph + T * (1.4 + unruly));
          var rr = 0.95 + u * st.len * 0.55 * tw2;
          var yy = 0.25 + u * st.len * (0.9 - 0.45 * unruly) + wob * 0.35 * Math.sin(u * 7.0 + st.ph * 2 + T * 2.1);
          var nx = Math.cos(aa) * rr, nz = Math.sin(aa) * rr;
          var c = [0.88, 0.85, 0.78];
          if (unruly > 0.5 && (i % 17 === 0)) c = [0.74, 0.68, 0.60];
          g.seg(px0, py0, pz0, nx, yy, nz, c, 1.3, 0.22 + 0.5 * (1 - u) + 0.28 * unruly);
          px0 = nx; py0 = yy; pz0 = nz;
        }
      }
      for (var k = 0; k < 7; k++) {
        var ph = k / 7 * PI * 0.5;
        var pts = [];
        for (var q = 0; q <= 48; q++) {
          var aq = q / 48 * TAU;
          pts.push([Math.cos(aq) * Math.cos(ph) * 0.98, 0.25 + Math.sin(ph) * 0.55, Math.sin(aq) * Math.cos(ph) * 0.98]);
        }
        g.path(pts, [0.55, 0.52, 0.50], 1.2, 0.40, true);
      }
      g.draw(ctx.gfx, { add: true });
    }
  });
})();
