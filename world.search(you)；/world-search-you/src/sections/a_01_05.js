/* ============================================================================
   world.search(you);  --  sections 01-05
   01 boot      : the search engine cold-boots with an empty index
   02 rank      : "side by side, the lovelier goes up" / "till the bubble pops"
   03 memory    : "take a memory, insert to the past" / "save it for the last"
   04 table     : "if you turn into a table"
   05 eggplant  : "if you turn into an eggplant"

   Layout rule: a 3D cut-out window (ctx.hudRect) must be centred on the screen
   centre, because a perspective camera projects its target exactly there.
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, V = WEM.Viz, M4 = C.M4, V3 = C.V3;
  var COL = WEM.HUD.COL, PI = Math.PI, TAU = PI * 2;
  var clamp = C.clamp, lerp = C.lerp, smooth = C.smoothstep, E = C.Ease;
  var S = WEM.SUI;
  var tw = S.tw;

  var WHITE = [0.93, 0.95, 0.98], CYAN = [0.21, 0.88, 1.0], GOLD = [1.0, 0.79, 0.29];
  var GREEN = [0.49, 0.91, 0.53], RED = [1.0, 0.35, 0.32], PURPLE = [0.72, 0.55, 1.0];

  // deterministic radial burst used whenever something pops / lands
  function burst(hud, cx, cy, age, seed, n, life, col, spread) {
    if (age < 0 || age > life) return;
    var r = C.rng(seed);
    spread = spread || 520;
    var k = 1 - age / life;
    for (var i = 0; i < n; i++) {
      var a = r() * TAU, sp = 0.30 + r() * 1.35, sz = 1 + r() * 3.4;
      var d = sp * age * spread;
      var x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.82 + 150 * age * age;
      var al = clamp(k * (0.4 + r() * 0.8), 0, 1);
      hud.rect(x, y, sz, sz, { fill: col || "rgba(255,255,255,0.95)", alpha: al });
      if (i % 7 === 0) hud.line(cx, cy, x, y, { color: col || "rgba(255,255,255,0.5)", lw: 1, alpha: al * 0.30 });
    }
  }

  // a lathe (surface of revolution) from a radius profile
  function lathe(profile, nseg, nring) {
    var pos = [], nrm = [], idx = [];
    for (var i = 0; i <= nring; i++) {
      var u = i / nring;
      var pr = profile(u);
      var y = pr[0], rx = pr[1], rz = pr.length > 2 ? pr[2] : pr[1];
      var d = profile(Math.min(1, u + 0.002)), d0 = profile(Math.max(0, u - 0.002));
      var dy = (d[0] - d0[0]) || 1e-4;
      var dr = ((d[1] + (d.length > 2 ? d[2] : d[1])) - (d0[1] + (d0.length > 2 ? d0[2] : d0[1]))) * 0.5;
      var nl = Math.hypot(dy, -dr) || 1;
      var ny = -dr / nl, nr = dy / nl;
      for (var j = 0; j <= nseg; j++) {
        var a = j / nseg * TAU, ca = Math.cos(a), sa = Math.sin(a);
        pos.push(ca * rx, y, sa * rz);
        nrm.push(ca * nr, ny, sa * nr);
      }
    }
    for (var i2 = 0; i2 < nring; i2++) for (var j2 = 0; j2 < nseg; j2++) {
      var A = i2 * (nseg + 1) + j2, B = A + 1, Cc = A + nseg + 1, D = Cc + 1;
      idx.push(A, Cc, B, B, Cc, D);
    }
    return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), idx: new Uint32Array(idx) };
  }

  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }

  /* ========================================================== 01 BOOT ==== */
  var BOOT_LOG = [
    ["SEARCH/BIOS 4.55.39", 0.85, 0], ["COLD BOOT -- INDEX IS EMPTY", 1.30, 0],
    ["CPU  MATCH CORE @ 139.530 Hz   SHARDS 16", 1.75, 1], ["MEM  65536 ENTRIES ... OK", 2.15, 1],
    ["BUS  QUERY BUS @ 44.1 kHz ... OK", 2.55, 1], ["CRWL CRAWLER DAEMON ... IDLE", 2.95, 2],
    ["TOKN BPE-30000 TOKENIZER ... OK", 3.35, 1], ["RANK BM25+ + DENSE RERANK ... OK", 3.75, 1],
    ["IDX  MOUNTING /idx/you ...", 4.20, 2], ["     ... 0 DOCUMENTS FOUND", 4.60, 3],
    ["WARN TARGET IS NOT A FIXED POINT", 5.20, 4], ["WARN TARGET CANNOT STOP TRANSFORMING", 5.70, 4],
    ["WARN QUERY RESULT WILL NEVER BE EXACT", 6.20, 4],
    ["AB   ELASTIC SNAP: RE-QUERY ON EVERY CHANGE", 6.90, 0],
    ["SESS SESSION 0x00000001 OPENED", 7.50, 2], ["TGT  TARGET: (you)", 8.00, 2],
    ["     ... NO STABLE HASH -- RETRY FOREVER", 8.45, 3],
    ["AUD  NOW PLAYING: world.search(you);", 9.00, 1],
    ["READY. AWAITING QUERY", 9.70, 5]
  ];
  var QUERY = "world.search(you);";

  WEM.defineSection({
    id: "01", name: "boot",
    init: function () { },
    enter: function (ctx) {
      ctx.cam.reset3d(14);
      ctx.fx.mood([0.05, 0.06, 0.08], [0, 0, 0], 0.0);
      ctx.fx.crtOn = 0; ctx.fx.crtOff = 0; ctx.fx.fade = 1;
      ctx.fx.bloom = 0.55;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, t = ctx.local, T = ctx.t;
      var on = clamp((t - 0.15) / 1.5, 0, 1);
      ctx.fx.crtOn = on === 1 ? 1 : E.outQuart(on);
      // Only the power-on scan line is kept as the opening flash; the extra
      // full-screen flash is off entirely (set to 0, as requested).
      if (!this._flashed && t >= 0.52) { this._flashed = 1; }
      // The power-on scan line travels the full height (bottom -> top) and
      // exits. It used to be capped at H/2, so it crawled up to the middle and
      // then vanished, which read as unfinished.
      this._sweepY = on < 1 ? ctx.H * (1 - E.outQuart(on)) : -1;

      var gx = 132, gy = 150, R = 30, prog = clamp(t / 1.5, 0, 1);
      var c = hud.fc;
      c.save();
      c.globalAlpha = clamp(t * 2, 0, 1);
      c.strokeStyle = "rgba(238,242,246,0.9)";
      c.lineWidth = 3.2;
      c.beginPath(); c.arc(gx, gy, R, 0, TAU * E.outCubic(prog)); c.stroke();
      if (prog > 0.4) {
        var sp = clamp((prog - 0.4) / 0.6, 0, 1);
        c.beginPath();
        c.moveTo(gx + R * 0.72, gy + R * 0.72);
        c.lineTo(gx + R * 0.72 + 24 * E.outCubic(sp), gy + R * 0.72 + 24 * E.outCubic(sp));
        c.stroke();
      }
      c.restore();
      hud.T(gx, gy + R + 44, "QUERY", { size: 12, color: COL.dim, align: "center", alpha: 0.9 });
      hud.T(gx, gy + R + 62, "ENGINE", { size: 12, color: COL.faint, align: "center", alpha: 0.75 });

      var y = 110;
      for (var i = 0; i < BOOT_LOG.length; i++) {
        var L = BOOT_LOG[i];
        if (t < L[1]) break;
        var age = t - L[1];
        var a = clamp(age * 6, 0, 1) * (1 - clamp((t - L[1] - 5.4) / 4, 0, 0.5));
        var col = L[2] === 4 ? COL.amber : L[2] === 1 ? COL.cyan : L[2] === 5 ? COL.green : COL.grey;
        hud.T(300, y, L[0], { size: 15, color: col, alpha: a });
        y += 24;
      }
      if (t > 10.2) hud.T(300, y + 18, ">>>", { size: 20, color: COL.green, alpha: clamp((t - 10.2) * 3, 0, 1) });
      var typeStart = 10.55, cps = 7.4;
      if (T > typeStart) {
        var nch = clamp(Math.floor((T - typeStart) * cps), 0, QUERY.length);
        var done = nch >= QUERY.length;
        var px = 366;
        hud.T(px, y + 18, QUERY.slice(0, nch), { size: 20, color: COL.white });
        var wpx = tw(hud, QUERY.slice(0, nch), 20);
        if (!done) S.caret(hud, px + wpx + 4, y + 18, 20, T, COL.cyan, true);
        if (done) {
          var dt2 = T - (typeStart + QUERY.length / cps);
          var k = clamp(dt2 / 0.4, 0, 1);
          hud.rect(300, y - 6, 620 * k, 40, { fill: "rgba(53,224,255,0.10)" });
          if (dt2 < 0.05) ctx.fx.flash = Math.max(ctx.fx.flash, 0.5);
        }
      }
      hud.T(ctx.W - 300, 110, "FRAME " + String(Math.floor(T * 60)).padStart(6, "0"),
        { size: 13, color: COL.faint, align: "right" });
      hud.T(ctx.W - 300, 132, "INDEX 0 DOCS / SHARDS 16", { size: 12, color: COL.faint, align: "right", alpha: 0.8 });
      hud.T(ctx.W - 300, 154, "ELASTIC SNAP ENABLED", { size: 12, color: COL.amber, align: "right", alpha: 0.7 });
    },
    draw3d: function (ctx) {
      var t = ctx.local;
      if (this._sweepY >= 0) {
        var y = this._sweepY;
        ctx.cam.reset2d(); ctx.cam.update();
        ctx.gfx.lines(new Float32Array([0, y, 0, 4.0, ctx.W, y, 0, 4.0, 0.85, 0.97, 1.0, 0.95]), { add: true });
        return;
      }
      ctx.cam.pos = [0, 2.2, 12.0]; ctx.cam.target = [0, -0.4, 0];
      ctx.cam.fov = 0.95; ctx.cam.update();
      var g = new V.Lines(1400);
      // a wall of 16 shard slabs, powering up left to right, receding
      for (var i = 0; i < 16; i++) {
        var col4 = i % 4, row4 = Math.floor(i / 4);
        var up = clamp((t - 1.6 - i * 0.34) / 0.5, 0, 1);
        if (up <= 0) continue;
        var x = (col4 - 1.5) * 2.6, z = -row4 * 2.2 - 0.5, yy = 1.7 - row4 * 1.15;
        var cc = up > 0.99 ? (i % 5 === 0 ? CYAN : [0.42, 0.48, 0.56]) : [0.9, 0.95, 1.0];
        var w = 1.55, h = 0.92;
        var pts = [[x - w / 2, yy - h / 2, z], [x + w / 2, yy - h / 2, z],
        [x + w / 2, yy + h / 2, z], [x - w / 2, yy + h / 2, z]];
        g.path(pts, cc, 1.5, up * (0.30 + 0.70 * up), true);
        if (up > 0.35) {
          g.seg(x - w / 2, yy - h / 2, z, x - w / 2, yy - h / 2, z - 0.55, cc, 1.0, up * 0.45);
          g.seg(x + w / 2, yy - h / 2, z, x + w / 2, yy - h / 2, z - 0.55, cc, 1.0, up * 0.45);
          g.seg(x + w / 2, yy + h / 2, z, x + w / 2, yy + h / 2, z - 0.55, cc, 1.0, up * 0.45);
          g.seg(x - w / 2, yy + h / 2, z, x - w / 2, yy + h / 2, z - 0.55, cc, 1.0, up * 0.45);
        }
      }
      // floor
      for (var k = 0; k < 26; k++) {
        var xx = -8 + k * 0.64;
        g.seg(xx, -2.4, 6.0, xx, -2.4, -8.0, [0.26, 0.30, 0.36], 1.0, 0.40);
      }
      for (var q = 0; q < 12; q++) {
        var zz = 6.0 - q * 1.28;
        g.seg(-8, -2.4, zz, 8, -2.4, zz, [0.26, 0.30, 0.36], 1.0, 0.40);
      }
      g.draw(ctx.gfx, { add: true });
    }
  });

  /* ========================================================== 02 RANK ==== */
  var FORMS = ["table", "eggplant", "cat", "steak", "flower", "human", "dog", "tomato", "old self", "you"];
  var POP_AT = 12.75;
  WEM.defineSection({
    id: "02", name: "rank",
    init: function () {
      this.rows = FORMS.map(function (n, i) { return { n: n, i: i, s: 0 }; });
    },
    enter: function (ctx) {
      ctx.cam.reset3d(4.6);
      ctx.fx.mood([0.10, 0.13, 0.20], [0.03, 0.06, 0.12], 0.30);
      ctx.fx.bloom = 0.62;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, T = ctx.t, b = ctx.beat;
      var climb = clamp(l / 12.4, 0, 1);
      var rows = this.rows;
      for (var i = 0; i < rows.length; i++) {
        var isYou = rows[i].n === "you";
        rows[i].s = isYou ? (0.06 + 0.90 * E.inOutCubic(climb))
          : (0.90 - i * 0.045 + 0.045 * Math.sin(T * (0.7 + i * 0.13) + i * 1.7));
      }
      var sorted = rows.slice().sort(function (a, c) { return c.s - a.s; });
      var leader = sorted[0];
      var rankYou = 1;
      for (var q = 0; q < sorted.length; q++) if (sorted[q].n === "you") rankYou = q + 1;

      // ---- left: the ranking table ----
      var px = 30, py = 84, pw = 610, ph = 876;
      S.panel(hud, px, py, pw, ph, { title: "RANKED RESULTS  \u2014  q: (you)" });
      var yy = py + 76;
      for (var r = 0; r < sorted.length; r++) {
        var row = sorted[r];
        var you = row.n === "you";
        var state = you ? "hi" : (row.s < 0.35 ? "dead" : null);
        var appear = clamp((l - 0.2 - r * 0.05) * 6, 0, 1);
        var slide = you ? Math.pow(1 - climb, 2) * 58 : 0;
        S.resultRow(ctx, px + 30 + slide, yy, pw - 62, {
          rank: "#" + (r + 1), name: row.n.toUpperCase(), score: row.s,
          state: state, alpha: appear * (state === "dead" ? 0.6 : 1),
          nameW: tw(hud, row.n.toUpperCase(), 14, null)
        });
        yy += 68;
      }
      hud.T(px + pw - 14, py + ph - 40, "sort: score DESC   k = 10", { size: 11, color: COL.faint, align: "right" });
      hud.T(px + 24, py + ph - 40, "#1 \u2192 #" + rankYou + " \u25b2", { size: 13, color: COL.accent });

      // ---- centre: the bubble, 3D behind, seen through a centred window ----
      var vx = 660, vy = 200, vw = 600, vh = 680;
      S.panel(hud, vx, vy, vw, vh, { title: "POPULARITY BUBBLE", tick: 16 });
      ctx.hudRect(0, 0.5, 0.5, (vw / 2 - 6) / ctx.W, (vh / 2 - 6) / ctx.H);
      var age = l - POP_AT;
      var inflate = clamp((l - 0.4) / (POP_AT - 0.4), 0, 1);
      // 2D frame marks around the window so the 3D reads as "in a viewport"
      S.crosshair(hud, vx + 18, vy + vh - 18, 9, "rgba(228,235,242,0.6)", 1);
      S.crosshair(hud, vx + vw - 18, vy + vh - 18, 9, "rgba(228,235,242,0.6)", 1);
      if (age >= 0) {
        burst(hud, 960, 540, age, 4242, 200, 1.5, "rgba(255,255,255,0.9)", 620);
        burst(hud, 960, 540, age, 911, 130, 1.9, "rgba(108,232,255,0.8)", 400);
        hud.T(960, 470, "POP", { size: 64, color: age < 0.22 ? COL.white : COL.red, align: "center", weight: "700", alpha: clamp(1 - age / 0.8, 0, 1) });
        hud.T(960, 620, "bubble burst \u2014 score discarded", { size: 15, color: COL.faint, align: "center", alpha: clamp((age - 0.4) * 2, 0, 1) });
        hud.T(960, 648, "rebuilding leaderboard \u2026", { size: 14, color: COL.amber, align: "center", alpha: clamp((age - 0.9) * 2, 0, 1) });
      }
      if (age >= 0 && age < 0.10) ctx.fx.flash = Math.max(ctx.fx.flash, 0.9);
      if (age >= 0 && age < 0.40) ctx.fx.glitch = Math.max(ctx.fx.glitch, 0.5);
      hud.T(vx + 20, vy + vh - 46, "V = " + (0.52 + 4.0 * E.inCubic(inflate)).toFixed(3) + " m\u00b3",
        { size: 12, color: COL.dim });
      hud.T(vx + vw - 20, vy + vh - 46, "P = " + (inflate * 4.2).toFixed(3) + " kPa",
        { size: 12, color: inflate > 0.86 ? COL.red : COL.dim, align: "right" });

      // ---- right: stats ----
      var rx = 1280, rw = 610;
      S.panel(hud, rx, py, rw, ph, { title: "LEADER  \u2014  " + leader.n.toUpperCase() });
      hud.T(rx + rw / 2, py + 108, leader.s.toFixed(4), { size: 44, color: COL.white, align: "center", weight: "700" });
      hud.T(rx + rw / 2, py + 136, "SIMILARITY TO QUERY (you)", { size: 11, color: COL.dim, align: "center", spacing: 1.6 });
      // rank history: "the lovelier goes up" -- a real step plot of rank(you),
      // drawn only as far as the song has actually got
      var g = S.plotAxes(hud, rx + 26, py + 172, rw - 52, 210, { gx: 6, gy: 4 });
      hud.T(rx + 34, py + 190, "#1", { size: 10, color: COL.faint });
      hud.T(rx + 34, py + 372, "#10", { size: 10, color: COL.faint });
      var rk = function (tt) {
        var c2 = clamp(tt / 12.4, 0, 1);
        return 1 - (9 * (1 - E.inOutCubic(c2))) / 9;
      };
      var upto = clamp(l / 12.4, 0, 1);
      var pts = [];
      for (var s2 = 0; s2 <= 120; s2++) {
        var u = (s2 / 120) * upto;
        pts.push([g.x + u * g.w, g.y + g.h - rk(u * 12.4) * g.h]);
      }
      for (var s3 = 0; s3 + 1 < pts.length; s3++) {
        hud.line(pts[s3][0], pts[s3][1], pts[s3 + 1][0], pts[s3 + 1][1], { color: "rgba(53,224,255,0.95)", lw: 2 });
      }
      if (pts.length) {
        var lastP = pts[pts.length - 1];
        hud.rect(lastP[0] - 3, lastP[1] - 3, 6, 6, { fill: "rgba(255,201,74,0.95)" });
        hud.line(lastP[0], g.y, lastP[0], g.y + g.h, { color: "rgba(255,201,74,0.55)", lw: 1.2 });
      }
      hud.T(rx + 26, py + 400, "rank of (you) over time  \u2014  side by side, the lovelier goes up", { size: 11, color: COL.faint });
      S.metricBar(ctx, rx + 26, py + 436, rw - 52, "internal pressure", inflate * 0.98,
        { text: (inflate * 4.2).toFixed(3) + " kPa", fill: inflate > 0.86 ? "rgba(255,90,82,0.85)" : "rgba(255,201,74,0.8)" });
      S.metricBar(ctx, rx + 26, py + 482, rw - 52, "volume", E.inCubic(inflate), { text: (E.inCubic(inflate) * 100).toFixed(1) + " %" });
      S.metricBar(ctx, rx + 26, py + 528, rw - 52, "burst margin", 1 - inflate,
        { text: inflate > 0.9 ? "CRITICAL" : "ok", fill: "rgba(108,232,255,0.7)" });
      var hist = this._hist || (this._hist = []);
      hist.length = 0;
      for (var h = 0; h < 9; h++) {
        var tt2 = h * 2.0 + 2.0;
        if (tt2 > 12.4) break;
        var c3 = clamp(tt2 / 12.4, 0, 1);
        hist.push([tt2, 10 - 9 * E.inOutCubic(c3)]);
      }
      hud.T(rx + 26, py + 580, "RANK LOG", { size: 11, color: COL.cyan, spacing: 1.2 });
      for (var hh = 0; hh < hist.length; hh++) {
        hud.T(rx + 26, py + 606 + hh * 20, "t+" + hist[hh][0].toFixed(1) + "s   rank #" + Math.round(hist[hh][1]),
          { size: 12, color: COL.grey, alpha: clamp((l - hist[hh][0]) * 1.5, 0.12, 1) });
      }
    },
    draw3d: function (ctx) {
      var l = ctx.local, T = ctx.t, b = ctx.beat;
      ctx.cam.pos = [0, 0.28, 3.35]; ctx.cam.target = [0, 0, 0];
      ctx.cam.fov = 0.82; ctx.cam.update();
      var gfx = ctx.gfx;
      var age = l - POP_AT;
      var inflate = clamp((l - 0.4) / (POP_AT - 0.4), 0, 1);
      if (age < 0) {
        var R = 0.20 + 0.66 * Math.pow(inflate, 1.55);
        var wob = 1 + 0.035 * Math.sin(T * 6.0) + 0.06 * b.pulse;
        var m = M4.mul(M4.scale(R * wob, R * 1.06 / wob, R), M4.rotY(T * 0.25));
        var sph = this._sphere || (this._sphere = C.geo.ico(2));
        gfx.solid(sph, m, { color: [0.14, 0.30, 0.42], alpha: 0.34, unlit: true, depthWrite: false, blend: "add" });
        gfx.wire(sph, m, { color: [0.82, 0.92, 1.0], alpha: 0.40, width: 1.1 });
        // a rising stream: "reach for the top"
        var P = new V.Points(260), r = C.rng(8123);
        for (var i = 0; i < 260; i++) {
          var u = (r() + T * 0.35) % 1;
          P.add((r() - 0.5) * 1.3, -0.95 + u * 0.9, (r() - 0.5) * 1.3, 1.1 + r() * 1.4,
            [0.6, 0.85, 1.0], (1 - u) * 0.55 * inflate);
        }
        P.draw(gfx, { add: true, soft: 0.5 });
      } else {
        var P2 = new V.Points(900), r2 = C.rng(4242);
        for (var j = 0; j < 900; j++) {
          var a = r2() * TAU, el = (r2() - 0.5) * PI, sp = 1.4 + r2() * 4.2;
          var d = sp * age;
          if (d > 6) continue;
          P2.add(Math.cos(a) * Math.cos(el) * d, Math.sin(el) * d - 1.6 * age * age + 0.3,
            Math.sin(a) * Math.cos(el) * d, 1.2 + r2() * 2.6, [0.92, 0.96, 1.0],
            clamp(1 - age / 1.6, 0, 1) * (0.4 + r2() * 0.6));
        }
        P2.draw(gfx, { add: true, soft: 0.6 });
      }
    }
  });

  /* ======================================================== 03 MEMORY ==== */
  WEM.defineSection({
    id: "03", name: "memory",
    init: function () {
      var r = C.rng(31337);
      this.mem = [];
      for (var i = 0; i < 8; i++) this.mem.push({ id: i, sweet: 0.35 + r() * 0.55, when: 0.05 + r() * 0.95 });
      var best = 0;
      for (var k = 1; k < 8; k++) if (this.mem[k].sweet > this.mem[best].sweet) best = k;
      this.mem[best].sweet = 0.947;
      this.best = best;
    },
    enter: function (ctx) {
      ctx.cam.reset3d(9);
      ctx.fx.mood([0.12, 0.10, 0.18], [0.04, 0.03, 0.08], 0.32);
      ctx.fx.bloom = 0.58;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local;
      var SWEEP = 6.82, PIN = 9.9;
      S.panel(hud, 30, 84, 1860, 382, { title: "MEMORY INDEX  \u2014  insert(address, payload)   /idx/you/mem" });

      var x0 = 74, y0 = 152, cw = 176, ch = 210, gap = 20;
      for (var i = 0; i < 8; i++) {
        var x = x0 + i * (cw + gap);
        var ins = 0.5 + i * 0.82;
        var ap = clamp((l - ins) * 5, 0, 1);
        if (ap <= 0) {
          hud.rect(x, y0, cw, ch, { stroke: "rgba(228,235,242,0.14)", lw: 1 });
          hud.T(x + cw / 2, y0 + ch / 2, "\u2014", { size: 22, color: COL.faint, align: "center", alpha: 0.5 });
          hud.T(x + 12, y0 + 22, "SLOT " + i, { size: 11, color: COL.faint, alpha: 0.7 });
          continue;
        }
        var slide = (1 - E.outCubic(ap)) * 60;
        var isBest = i === this.best;
        var dim = (l > SWEEP + 2.6 && !isBest) ? 0.32 : 1;
        var cy = y0 + slide;
        hud.rect(x, cy, cw, ch, { fill: isBest && l > SWEEP ? "rgba(255,201,74,0.07)" : "rgba(12,15,20,0.8)" });
        hud.rect(x, cy, cw, ch, {
          stroke: isBest && l > SWEEP ? "rgba(255,201,74,0.85)" : "rgba(228,235,242,0.35)",
          lw: isBest && l > SWEEP ? 1.8 : 1, alpha: ap * dim
        });
        hud.T(x + 12, cy + 22, "@0x" + S.hex(S.hash32(i * 7919 + 3), 4), { size: 11, color: COL.cyan, alpha: ap * dim });
        hud.T(x + cw - 12, cy + 22, String(28 + i).padStart(2, "0") + "s", { size: 11, color: COL.faint, align: "right", alpha: ap * dim });
        var mid = cy + 78;
        hud.line(x + 12, mid, x + cw - 12, mid, { color: "rgba(228,235,242,0.20)", alpha: ap * dim });
        for (var k = 0; k <= 34; k++) {
          var u = k / 34;
          var wv = ctx.data.waveAt(22 + i * 3.1 + u * 2.0);
          var amp = Math.max(Math.abs(wv[0]), Math.abs(wv[1]));
          var hgt = 3 + amp * 240 * (0.4 + 0.6 * this.mem[i].when);
          hud.line(x + 12 + u * (cw - 24), mid - hgt / 2, x + 12 + u * (cw - 24), mid + hgt / 2,
            { color: isBest ? "rgba(255,201,74,0.55)" : "rgba(108,232,255,0.42)", lw: 1.2, alpha: ap * dim });
        }
        hud.T(x + 12, cy + ch - 52, "sweetness", { size: 11, color: COL.dim, alpha: ap * dim });
        var rev = clamp((l - SWEEP - 0.25 - i * 0.13) * 5, 0, 1);
        hud.rect(x + 12, cy + ch - 42, cw - 24, 12, { fill: "rgba(255,255,255,0.06)", alpha: ap * dim });
        hud.rect(x + 12, cy + ch - 42, (cw - 24) * this.mem[i].sweet * rev, 12, {
          fill: isBest && rev > 0.9 ? "rgba(255,201,74,0.95)" : "rgba(94,224,160,0.7)", alpha: ap * dim
        });
        if (rev > 0.05) {
          hud.T(x + cw - 12, cy + ch - 52, this.mem[i].sweet.toFixed(3),
            { size: 12, color: isBest && rev > 0.9 ? COL.gold : COL.grey, align: "right", alpha: rev * dim });
        }
        if (isBest && rev > 0.95) hud.T(x + 12, cy + 44, "SWEETEST", { size: 11, color: COL.gold, alpha: clamp((rev - 0.95) * 8, 0, 1) });
      }
      // the "last" slot
      var lx = 1676, lw = 200;
      S.panel(hud, lx, y0 - 38, lw, ch + 76, {
        title: "SAVE LAST", titleColor: COL.gold, color: "rgba(255,201,74,0.45)",
        tickColor: "rgba(255,201,74,0.7)", tick: 12
      });
      if (l > PIN) {
        var fly = clamp((l - PIN) / 1.15, 0, 1);
        if (fly < 1) {
          var sx = x0 + this.best * (cw + gap) + cw / 2, sy = y0 + ch / 2;
          var tx = lx + lw / 2, ty = y0 - 38 + (ch + 76) / 2;
          var f = E.inOutCubic(fly);
          var mx = lerp(sx, tx, f), my = lerp(sy, ty, f) - Math.sin(f * PI) * 170;
          hud.rect(mx - cw / 2, my - 34, cw, 68, { fill: "rgba(255,201,74,0.22)", stroke: "rgba(255,201,74,0.9)", lw: 1.5 });
          hud.T(mx, my + 6, "0.947", { size: 22, color: COL.gold, align: "center" });
        } else {
          if (l - PIN < 0.12) ctx.fx.flash = Math.max(ctx.fx.flash, 0.55);
          hud.T(lx + lw / 2, y0 + 24, "0.947", { size: 26, color: COL.gold, align: "center" });
          hud.T(lx + lw / 2, y0 + 48, "SAVED FOR THE LAST", { size: 10, color: COL.gold, align: "center", spacing: 1.0 });
          hud.T(lx + lw / 2, y0 + 78, "RANK 1 / 8", { size: 13, color: COL.white, align: "center" });
          for (var q = 0, rowi = 0; q < 8; q++) {
            if (q === this.best) continue;
            hud.T(lx + 20, y0 + 112 + rowi * 16, "\u2715 @" + S.hex(S.hash32(q * 7919 + 3), 4) + "  " + this.mem[q].sweet.toFixed(2),
              { size: 11, color: "rgba(255,90,82,0.8)", alpha: clamp((l - PIN - 0.4) * 2, 0, 1) });
            rowi++;
          }
        }
      } else {
        hud.T(lx + lw / 2, y0 + ch / 2, "?", { size: 30, color: COL.faint, align: "center" });
      }
      if (l > SWEEP && l < PIN + 0.4) {
        var sp = clamp((l - SWEEP) / 3.0, 0, 1);
        var sxx = x0 + sp * (8 * (cw + gap) - gap);
        hud.line(sxx, y0 - 34, sxx, y0 + ch + 34, { color: "rgba(255,201,74,0.9)", lw: 2 });
        hud.T(sxx + 8, y0 - 42, "argmax sweetness", { size: 11, color: COL.gold });
      }
      // ---- bottom: the insert log ----
      S.panel(hud, 30, 700, 1860, 288, { title: "WRITE-AHEAD LOG" });
      var lg = ctx.data.beat.index;
      hud.T(50, 712, "> " + String(ctx.lyric ? ctx.lyric.text : "").slice(0, 96), { size: 14, color: COL.green, alpha: 0.9 });
      for (var m = 0; m < 6; m++) {
        var at = 0.5 + m * 0.82;
        if (l < at) break;
        hud.T(50, 744 + m * 24,
          "INSERT @0x" + S.hex(S.hash32(m * 7919 + 3), 4) + "  len=" + (220 + m * 37) + " B  sweet=" + this.mem[m].sweet.toFixed(3) +
          (m === this.best ? "   <-- max" : ""),
          { size: 12.5, color: m === this.best ? COL.gold : COL.grey, alpha: clamp((l - at) * 4, 0, 1) * 0.95 });
      }
      hud.T(1870, 952, "8 memories / 1 kept", { size: 12, color: COL.dim, align: "right" });
    },
    draw3d: function (ctx) {
      var l = ctx.local;
      ctx.cam.pos = [0, 0.9, 8.2]; ctx.cam.target = [0, 0, 0];
      ctx.cam.fov = 0.9; ctx.cam.update();
      var g = new V.Lines(900);
      // the memory bus lives in the open band between the two HUD panels
      for (var z = 0; z < 4; z++) {
        var zz = 2.0 - z * 2.4;
        var a = 0.30 * (1 - z / 5);
        for (var i = 0; i <= 20; i++) {
          var x = -11 + i * 1.1;
          g.seg(x, -1.15, zz, x, 0.55, zz, [0.5, 0.58, 0.70], 1.0, a);
        }
        g.seg(-11, -1.15, zz, 11, -1.15, zz, [0.5, 0.58, 0.70], 1.0, a);
        g.seg(-11, 0.55, zz, 11, 0.55, zz, [0.5, 0.58, 0.70], 1.0, a);
      }
      // payloads falling into their slots, one per insert()
      for (var k = 0; k < 8; k++) {
        var tt = 0.5 + k * 0.82;
        var f = clamp((l - tt) / 0.55, 0, 1);
        if (f <= 0) continue;
        var x2 = -9.9 + k * 2.83;
        var y2 = lerp(0.55, -1.05, E.inCubic(f));
        var col = (k === this.best && l > 6.82) ? GOLD : CYAN;
        g.seg(x2, y2 + 0.45, 0, x2, y2, 0, col, 4.5, 0.95 * (1 - f * 0.30));
      }
      // the argmax scan beat-pulses across the bus
      g.draw(ctx.gfx, { add: true });
    }
  });

  /* ========================================================= 04 TABLE ==== */
  WEM.defineSection({
    id: "04", name: "table",
    init: function () {
      this.mesh = C.geo.box(1.6, 0.10, 0.95);
      this.leg = C.geo.cylinder(0.055, 0.045, 1.0, 14);
    },
    enter: function (ctx) {
      ctx.cam.reset3d(5.3);
      ctx.fx.mood([0.15, 0.12, 0.09], [0.05, 0.03, 0.02], 0.32);
      ctx.fx.bloom = 0.55;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, T = ctx.t, b = ctx.beat;
      var TY = 3.37, TH = 6.94, TL = 10.23;
      var px = 30, py = 84, pw = 570, ph = 846;
      S.panel(hud, px, py, pw, ph, { title: "FILTER  \u2014  WHERE" });
      var rows = [
        { t: 0.35, k: "kind", v: "= \"table\"", n: 8431209, drop: 0.00 },
        { t: TY, k: "height", v: "= elbow(you) 1.021 m", n: 412, drop: 0.62 },
        { t: TH, k: "legs", v: "= 4  AND one stubby", n: 1, drop: 0.88 },
        { t: TL, k: "stability", v: "= wobbly (accepted)", n: 1, drop: 0.97 }
      ];
      var yy = py + 72;
      for (var i = 0; i < rows.length; i++) {
        var R = rows[i], ap = clamp((l - R.t) * 4, 0, 1);
        if (ap <= 0) { hud.T(px + 24, yy, "\u00b7 pending \u2026", { size: 12, color: COL.faint, alpha: 0.5 }); yy += 84; continue; }
        hud.rect(px + 16, yy - 22, pw - 32, 68, { fill: "rgba(53,224,255,0.05)", alpha: ap });
        hud.T(px + 26, yy, R.k, { size: 15, color: COL.purple, alpha: ap });
        hud.T(px + 26 + tw(hud, R.k, 15) + 14, yy, R.v, { size: 14, color: COL.white, alpha: ap });
        hud.T(px + pw - 26, yy, R.n === 1 ? "1 row" : num(R.n), { size: 13, color: R.n === 1 ? COL.gold : COL.amber, align: "right", alpha: ap });
        S.metricBar(ctx, px + 26, yy + 16, pw - 52, "", R.drop, { bh: 6, alpha: ap, fill: R.drop > 0.5 ? "rgba(94,224,160,0.8)" : "rgba(108,232,255,0.6)" });
        yy += 84;
      }
      hud.T(px + 24, py + ph - 118, "candidates eliminated", { size: 11, color: COL.faint });
      hud.T(px + 24, py + ph - 90, "8 431 209 \u2192 412 \u2192 1", { size: 17, color: COL.white });
      hud.T(px + 24, py + ph - 64, "log10 reduction  \u2248 6.93", { size: 12, color: COL.cyan });
      hud.T(px + 24, py + ph - 40, "index: /idx/you/furniture", { size: 11, color: COL.faint });
      // ---- the funnel: how the candidate set collapses, on a log axis ----
      var fx0 = px + 26, fy0 = py + 452, fw = pw - 52, fh = 250;
      hud.T(fx0, fy0 - 12, "CANDIDATE FUNNEL  (log scale)", { size: 11, color: COL.cyan, spacing: 1.2 });
      var stages = [
        { n: 8431209, lab: "kind", t: 0.35 },
        { n: 412, lab: "height", t: TY },
        { n: 1, lab: "legs", t: TH },
        { n: 1, lab: "stability", t: TL }
      ];
      var lmax = Math.log10(8431209);
      for (var f2 = 0; f2 < stages.length; f2++) {
        var st = stages[f2];
        var bw = (Math.log10(Math.max(st.n, 1)) + 1) / (lmax + 1) * fw;
        var bh = 42, byy = fy0 + 10 + f2 * 56;
        var ap2 = clamp((l - st.t) * 4, 0, 1);
        hud.rect(fx0, byy, fw, bh, { fill: "rgba(255,255,255,0.04)", alpha: ap2 });
        hud.rect(fx0, byy, bw, bh, {
          fill: f2 === 0 ? "rgba(108,232,255,0.35)" : f2 === 3 ? "rgba(255,201,74,0.40)" : "rgba(94,224,160,0.35)",
          alpha: ap2
        });
        hud.rect(fx0, byy, fw, bh, { stroke: "rgba(228,235,242,0.20)", lw: 1, alpha: ap2 });
        hud.T(fx0 + 10, byy + 26, st.lab, { size: 12, color: COL.grey, alpha: ap2 });
        hud.T(fx0 + fw - 10, byy + 26, st.n === 1 ? "1" : num(st.n), {
          size: 12, color: f2 === 3 ? COL.gold : COL.white, align: "right", alpha: ap2
        });
      }
      hud.T(fx0, fy0 + 10 + 4 * 56 + 14, "\u2193 6.93 orders of magnitude", { size: 12, color: COL.amber });

      // ---- centre: 3D table through a screen-centred window ----
      var vx = 630, vy = 150, vw = 660, vh = 780;
      S.panel(hud, vx, vy, vw, vh, { title: "CANDIDATE #000001  \u2014  elevation", tick: 16 });
      ctx.hudRect(0, 0.5, 0.5, (vw / 2 - 6) / ctx.W, (vh / 2 - 6) / ctx.H);
      var wob = clamp((l - TH) / 0.8, 0, 1);
      var ang = wob * 0.030 * Math.sin(T * 5.4) * (0.5 + 0.9 * b.pulse);
      hud.T(vx + 18, vy + vh - 44, "rock = " + (Math.abs(ang) * 180 / PI).toFixed(2) + "\u00b0",
        { size: 12, color: wob > 0.5 ? COL.amber : COL.faint });
      hud.T(vx + 18, vy + vh - 24, "\u03c9 = 5.40 rad/s   period 1.16 s", { size: 11, color: COL.faint });
      hud.T(vx + vw - 18, vy + vh - 24, "H = 1.021 m", { size: 13, color: COL.cyan, align: "right" });
      hud.T(vx + vw - 18, vy + vh - 44, "legs: 3 \u00d7 0.760 / 1 \u00d7 0.620", { size: 11, color: COL.grey, align: "right" });

      // ---- right: match ----
      var rx = 1320, rw = 570;
      S.panel(hud, rx, py, rw, ph, { title: "MATCH", tick: 12 });
      var score = l < TY ? 0.41 : l < TH ? 0.86 : l < TL ? 0.97 : 1.0;
      hud.T(rx + rw / 2, py + 118, score.toFixed(4), { size: 40, color: score >= 1 ? COL.gold : COL.white, align: "center", weight: "700" });
      hud.T(rx + rw / 2, py + 144, "COSINE SIMILARITY", { size: 11, color: COL.dim, align: "center", spacing: 1.6 });
      S.metricBar(ctx, rx + 26, py + 186, rw - 52, "height match", clamp(score * 0.99, 0, 1), { text: "1.021 m" });
      S.metricBar(ctx, rx + 26, py + 236, rw - 52, "leg count", 1, { text: "4" });
      S.metricBar(ctx, rx + 26, py + 286, rw - 52, "flatness", 0.998, { text: "0.998" });
      S.metricBar(ctx, rx + 26, py + 336, rw - 52, "stability", l > TH ? 0.21 : 0.94,
        { text: l > TH ? "WOBBLY" : "stable", fill: l > TH ? "rgba(255,90,82,0.8)" : "rgba(94,224,160,0.8)" });
      S.metricBar(ctx, rx + 26, py + 386, rw - 52, "elbow offset", 0.002, { text: "2 mm", fill: "rgba(108,232,255,0.7)" });
      if (l > TL) {
        var k = clamp((l - TL) / 0.5, 0, 1);
        S.stamp(ctx, rx + rw / 2, py + 540, ["ONLY", "PERFECT", "MATCH"], { alpha: clamp(k * 1.4, 0, 1), pop: E.outBack(k), size: 20 });
        hud.T(rx + rw / 2, py + 664, "1 RESULT", { size: 16, color: COL.gold, align: "center", alpha: k, spacing: 2 });
        hud.T(rx + rw / 2, py + 690, "took 0.412 ms", { size: 12, color: COL.faint, align: "center", alpha: k });
      }
    },
    draw3d: function (ctx) {
      var l = ctx.local, T = ctx.t, b = ctx.beat;
      ctx.cam.pos = [1.55, 1.15, 4.75]; ctx.cam.target = [0, 0.02, 0];
      ctx.cam.fov = 0.72; ctx.cam.update();
      var gfx = ctx.gfx;
      var TH = 6.94;
      var wob = clamp((l - TH) / 0.8, 0, 1);
      var ang = wob * 0.030 * Math.sin(T * 5.4) * (0.5 + 0.9 * b.pulse);
      var pivot = M4.trans(-0.72, -0.55, 0.42);
      var back = M4.trans(0.72, 0.55, -0.42);
      var base = M4.mul(pivot, M4.mul(M4.rotZ(ang), back));
      var top = M4.mul(base, M4.trans(0, 0.55, 0));
      gfx.solid(this.mesh, top, { color: [0.82, 0.78, 0.70], rim: 0.55 });
      gfx.wire(this.mesh, M4.mul(top, M4.scale(1.004, 1.02, 1.006)), { color: [1, 1, 1], alpha: 0.30, width: 1.0 });
      var legs = [[-0.66, 0.36, 0.815], [0.66, 0.36, 1.0], [-0.66, -0.36, 1.0], [0.66, -0.36, 1.0]];
      for (var i = 0; i < 4; i++) {
        // legs run from the floor (y = -0.55) up to the underside of the slab
        // (y = +0.50); 'hgt' shortens the stubby one
        var hgt = legs[i][2];
        var L = 1.05 * hgt;
        var m = M4.mul(base, M4.trans(legs[i][0], -0.55 + L * 0.5, legs[i][1]));
        m = M4.mul(m, M4.scale(1, L, 1));
        if (i === 0 && l > TH) gfx.solid(this.leg, m, { color: [0.85, 0.32, 0.28], emissive: 0.30 });
        else gfx.solid(this.leg, m, { color: [0.64, 0.62, 0.58] });
      }
      var g = new V.Lines(300);
      for (var k = -4; k <= 4; k++) {
        g.seg(k * 0.5, -0.55, -2, k * 0.5, -0.55, 2, [0.30, 0.34, 0.40], 1.0, 0.30);
        g.seg(-2, -0.55, k * 0.5, 2, -0.55, k * 0.5, [0.30, 0.34, 0.40], 1.0, 0.30);
      }
      // elbow-height datum across the bench top
      g.seg(-0.88, 0.62, 0, 0.88, 0.62, 0, [0.42, 0.88, 1.0], 1.8, 0.9);
      g.seg(0.88, 0.62, 0, 0.88, -0.55, 0, [0.42, 0.88, 1.0], 1.2, 0.40);
      g.seg(0.76, 0.60, 0, 0.90, 0.62, 0, [0.42, 0.88, 1.0], 1.2, 0.6);
      g.seg(0.76, 0.64, 0, 0.90, 0.62, 0, [0.42, 0.88, 1.0], 1.2, 0.6);
      g.draw(gfx, { add: true });
    }
  });

  /* ====================================================== 05 EGGPLANT ==== */
  function aubergineProfile(u) {
    var y = -1.0 + u * 2.0;
    var r = Math.sin(Math.pow(u, 0.78) * PI * 1.02);
    r = Math.pow(Math.max(r, 0), 0.62) * 0.62;
    r *= 0.92 + 0.08 * Math.sin(u * 7.0);
    return [y, r * 0.86, r];
  }
  WEM.defineSection({
    id: "05", name: "eggplant",
    init: function () {
      this.mesh = lathe(aubergineProfile, 40, 34);
    },
    enter: function (ctx) {
      ctx.cam.reset3d(8.4);
      ctx.fx.mood([0.16, 0.10, 0.22], [0.06, 0.02, 0.10], 0.36);
      ctx.fx.bloom = 0.62;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, T = ctx.t;
      var TSW = 3.48, TSC = 6.87, TST = 10.31;
      var px = 30, py = 84, pw = 570, ph = 846;
      S.panel(hud, px, py, pw, ph, { title: "QUERY: eggplant" });
      var swatch = l < TSW ? 0.06 : clamp((l - TSW) / 0.6, 0, 1);
      hud.rect(px + 28, py + 48, 190, 110, {
        fill: "rgb(" + Math.round(lerp(28, 84, swatch)) + "," + Math.round(lerp(30, 40, swatch)) + "," + Math.round(lerp(34, 110, swatch)) + ")"
      });
      hud.rect(px + 28, py + 48, 190, 110, { stroke: "rgba(228,235,242,0.5)" });
      hud.T(px + 236, py + 74, "#541E6E", { size: 18, color: COL.purple, alpha: swatch });
      hud.T(px + 236, py + 98, "RGB(84,30,110)", { size: 12, color: COL.dim, alpha: swatch });
      hud.T(px + 236, py + 118, "HSL(289,57,27)", { size: 12, color: COL.dim, alpha: swatch });
      hud.T(px + 236, py + 144, "purple friend", { size: 14, color: COL.pink, alpha: clamp((l - TSW - 0.4) * 1.2, 0, 1) });
      var g = S.plotAxes(hud, px + 28, py + 186, pw - 56, 120, { gx: 6, gy: 3 });
      S.plotLine(hud, g, function (u) {
        var nm = 400 + u * 200, s = 0;
        s += Math.exp(-Math.pow((nm - 520) / 34, 2)) * 0.95;
        s += Math.exp(-Math.pow((nm - 546) / 26, 2)) * 0.62;
        return clamp(s, 0, 1) * clamp((l - TSW) * 2, 0, 1);
      }, 110, { color: "rgba(196,120,255,0.9)" });
      hud.T(px + 28, py + 324, "anthocyanin \u03bb-max 520 / 546 nm", { size: 11, color: COL.faint });
      hud.T(px + 28, py + 366, "NUTRITION / 100 g", { size: 12, color: COL.cyan, spacing: 1.2 });
      var EG = WEM.Lab.EGGPLANT, ny = py + 396;
      for (var i = 0; i < EG.length; i++) {
        var e = EG[i];
        var ap = clamp((l - 0.6 - i * 0.13) * 4, 0, 1);
        var norm = e.k === "water" ? e.g / 100 : Math.pow(e.g, 0.45);
        S.metricBar(ctx, px + 28, ny, pw - 56, e.k, clamp(norm, 0, 1), {
          text: e.g >= 0.01 ? e.g.toFixed(e.g < 1 ? 3 : 1) + " g" : (e.g * 1e6).toFixed(0) + " \u00b5g",
          alpha: ap, fill: S.rgba(e.c, 0.8), size: 11.5, bh: 6
        });
        ny += 30;
      }
      hud.T(px + 28, py + ph - 40, "scratch marks: " + Math.floor(clamp((l - TSC) / 1.2, 0, 1) * 26) + "   depth 0.21 mm",
        { size: 12, color: COL.grey, alpha: clamp((l - TSC) * 2, 0, 1) });

      var vx = 630, vy = 150, vw = 660, vh = 780;
      S.panel(hud, vx, vy, vw, vh, { title: "SPECIMEN  \u2014  lateral view", tick: 16 });
      ctx.hudRect(1, 0.5, 0.5, (vw / 2 - 6) / ctx.W, (vh / 2 - 6) / ctx.H);
      hud.T(vx + 18, vy + vh - 44, "surface: glossy, 0.24 \u00b5m wax layer", { size: 12, color: COL.grey });
      hud.T(vx + 18, vy + vh - 24, "length 182 mm   max \u00d8 71 mm", { size: 11, color: COL.faint });
      hud.T(vx + vw - 18, vy + vh - 24, "mass 412 g", { size: 13, color: COL.dim, align: "right" });

      var rx = 1320, rw = 570;
      S.panel(hud, rx, py, rw, ph, { title: "MATCH", tick: 12 });
      var score = l < TSW ? 0.52 : l < TSC ? 0.84 : l < TST ? 0.96 : 1.0;
      hud.T(rx + rw / 2, py + 118, score.toFixed(4), { size: 40, color: score >= 1 ? COL.gold : COL.white, align: "center", weight: "700" });
      hud.T(rx + rw / 2, py + 144, "COSINE SIMILARITY", { size: 11, color: COL.dim, align: "center", spacing: 1.6 });
      S.metricBar(ctx, rx + 26, py + 186, rw - 52, "colour", l > TSW ? 1 : 0.2, { text: "#541E6E" });
      S.metricBar(ctx, rx + 26, py + 236, rw - 52, "gloss", 0.93, { text: "0.93" });
      S.metricBar(ctx, rx + 26, py + 286, rw - 52, "bitterness", 0.18, { text: "low", fill: "rgba(108,232,255,0.7)" });
      S.metricBar(ctx, rx + 26, py + 336, rw - 52, "scratches", l > TSC ? 0.78 : 0.0,
        { text: l > TSC ? "26" : "0", fill: "rgba(255,143,208,0.8)" });
      S.metricBar(ctx, rx + 26, py + 386, rw - 52, "water content", 0.92, { text: "92.0 g" });
      if (l > TST) {
        var k = clamp((l - TST) / 0.5, 0, 1);
        S.stamp(ctx, rx + rw / 2, py + 540, ["ONLY", "PERFECT", "MATCH"], { alpha: clamp(k * 1.4, 0, 1), pop: E.outBack(k), size: 20 });
        hud.T(rx + rw / 2, py + 664, "1 RESULT", { size: 16, color: COL.gold, align: "center", alpha: k, spacing: 2 });
      }
    },
    draw3d: function (ctx) {
      var l = ctx.local, T = ctx.t, b = ctx.beat;
      ctx.cam.pos = [0, 0.10, 8.4]; ctx.cam.target = [0, 0, 0];
      ctx.cam.fov = 0.80; ctx.cam.update();
      var m = M4.mul(M4.rotY(T * 0.42), M4.mul(M4.rotZ(0.19 + 0.03 * Math.sin(T * 0.9)), M4.scale(1.48, 1.48, 1.48)));
      ctx.gfx.solid(this.mesh, m, { color: [0.40, 0.15, 0.55], rim: 1.15, emissive: 0.16, smooth: true });
      ctx.gfx.wire(this.mesh, m, { color: [0.80, 0.62, 1.0], alpha: 0.14, width: 0.9 });
      var g = new V.Lines(900);
      // scratch marks, computed on the actual lathe surface
      var sc = clamp((l - 6.87) / 1.2, 0, 1);
      var nScr = Math.floor(sc * 26);
      var r = C.rng(5150);
      for (var s = 0; s < nScr; s++) {
        var u0 = 0.12 + r() * 0.72, a0 = r() * TAU, len = 0.06 + r() * 0.16, curl = (r() - 0.5) * 2.4;
        var prev = null;
        for (var q = 0; q <= 7; q++) {
          var uu = clamp(u0 + (q / 7) * len, 0, 1);
          var aa = a0 + curl * (q / 7) * 0.5 + 0.06 * Math.sin(q * 2.1 + s);
          var pr = aubergineProfile(uu);
          var p = M4.xform(m, [Math.cos(aa) * pr[1] * 1.012, pr[0], Math.sin(aa) * pr[2] * 1.012, 1]);
          if (prev) g.seg(prev[0], prev[1], prev[2], p[0], p[1], p[2], [1.0, 0.94, 0.98], 1.5, 0.8);
          prev = p;
        }
      }
      // calyx + stem
      for (var i = 0; i < 6; i++) {
        var a = i / 6 * TAU + T * 0.2;
        var p0 = M4.xform(m, [Math.cos(a) * 0.09, 1.00, Math.sin(a) * 0.09, 1]);
        var p1 = M4.xform(m, [Math.cos(a) * 0.26, 1.20, Math.sin(a) * 0.26, 1]);
        g.seg(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], [0.49, 0.70, 0.35], 2.2, 0.85);
      }
      var s0 = M4.xform(m, [0, 1.04, 0, 1]), s1 = M4.xform(m, [0.10, 1.44, 0.04, 1]);
      g.seg(s0[0], s0[1], s0[2], s1[0], s1[1], s1[2], [0.55, 0.72, 0.40], 3.6, 0.9);
      g.draw(ctx.gfx, { add: true });
    }
  });
})();
