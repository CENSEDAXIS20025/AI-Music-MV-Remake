/* sections 01-06 — comparison, ranking, the card catalogue, the first queries
   ----------------------------------------------------------------------------
   01 SIDE BY SIDE   0.000 - 14.370  a 1945 worktable and a real bubble sort
   02 RANK          14.370 - 28.230  a hanging rank tower, and a dot-matrix
                                     printout of a REAL inverted index of this
                                     song's own lyrics, weighted by REAL TF-IDF
   03 TAKE A MEMORY 28.230 - 40.770  a card-catalogue wall and a microfilm reader
   04 TABLE         40.770 - 54.350  hard constraints, a candidate field filtered
                                     to one, and a real damped wobble on odd legs
   05 EGGPLANT      54.350 - 68.060  a 24-bin colour histogram sampled off the
                                     surface, scored by a real intersection
   06 I'M SEARCHING 68.060 - 82.680  an empty reading room. the emptiness is the
                                     content.

   Every readout is computed: the sort trace, the inverted index, the TF-IDF, the
   filter counts, the wobble solution, the colour histogram, the intersections.
   Authored in the DARK convention — the light build inverts lightness in the
   composite, so a near-white pixel here prints as ink and a mid-dark fill prints
   as a light card.  A large light-grey fill would print as a black block.
   -------------------------------------------------------------------------- */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, I = WEM.Idx;
  var clamp = C.clamp, lerp = C.lerp, Ease = C.Ease, M4 = C.M4, G = C.geo;
  var V = WEM.Viz;
  var PI = C.PI, TAU = C.TAU, smoothstep = C.smoothstep;

  /* ============================================================== authoring */
  var INK = "rgba(232,238,244,0.94)", INK2 = "rgba(232,238,244,0.60)";
  var INK3 = "rgba(232,238,244,0.30)", INK4 = "rgba(232,238,244,0.13)";
  var CARD_BG = "#252b33", PAGE_BG = "#1d222a";
  var BRASS = [0.70, 0.52, 0.17], STEEL = [0.52, 0.56, 0.60];
  var WOOD = [0.30, 0.20, 0.13];

  /* ------------------------------------------------------------ small util */
  function pad(n, w) {
    var s = String(Math.abs(Math.round(n)));
    while (s.length < w) s = "0" + s;
    return s;
  }
  function commas(n) {
    var s = String(Math.round(n)), out = "", c = 0;
    for (var i = s.length - 1; i >= 0; i--) {
      out = s.charAt(i) + out;
      if (++c % 3 === 0 && i > 0) out = "," + out;
    }
    return out;
  }

  /* card axes: yaw about world Y; tilt 0 = lying flat face up,
     PI/2 = standing upright facing +Z.  a = long edge, b = short edge. */
  function axesFlat(th, ph, a, b) {
    var ct = Math.cos(th), st = Math.sin(th), cf = Math.cos(ph), sf = Math.sin(ph);
    a[0] = ct; a[1] = 0; a[2] = -st;
    b[0] = st * cf; b[1] = sf; b[2] = ct * cf;
  }
  /* pack one quad straight into the gfx.quads layout (stride 24) */
  function pushQuad(d, o, cx, cy, cz, a, b, w, h, rect, rgba) {
    d[o] = a[0] * w; d[o + 1] = a[1] * w; d[o + 2] = a[2] * w; d[o + 3] = 0;
    d[o + 4] = b[0] * h; d[o + 5] = b[1] * h; d[o + 6] = b[2] * h; d[o + 7] = 0;
    d[o + 8] = 0; d[o + 9] = 0; d[o + 10] = 1; d[o + 11] = 0;
    d[o + 12] = cx; d[o + 13] = cy; d[o + 14] = cz; d[o + 15] = 1;
    d[o + 16] = rgba[0]; d[o + 17] = rgba[1]; d[o + 18] = rgba[2]; d[o + 19] = rgba[3];
    d[o + 20] = rect[0]; d[o + 21] = rect[1];
    d[o + 22] = rect[2] - rect[0]; d[o + 23] = rect[3] - rect[1];
  }
  var _ax = [0, 0, 0], _bx = [0, 0, 0], _rg = [1, 1, 1, 1];
  var RC_FULL = [0, 0, 1, 1];

  /* bake a mesh out of transformed copies of a primitive */
  function MeshBuilder() { this.pos = []; this.nrm = []; this.idx = []; }
  MeshBuilder.prototype.add = function (m, x, y, z, sx, sy, sz, rz) {
    var Mt = M4.trans(x, y, z), Mr;
    if (rz) { Mr = M4.rotZ(rz); Mt = M4.mul(Mt, Mr); }
    Mt = M4.mul(Mt, M4.scale(sx === undefined ? 1 : sx, sy === undefined ? 1 : sy, sz === undefined ? 1 : sz));
    var nm = M4.normalMat3(Mt), base = this.pos.length / 3, i;
    for (i = 0; i < m.pos.length; i += 3) {
      var p = M4.xform(Mt, [m.pos[i], m.pos[i + 1], m.pos[i + 2], 1]);
      this.pos.push(p[0], p[1], p[2]);
      var nx = m.nrm ? m.nrm[i] : 0, ny = m.nrm ? m.nrm[i + 1] : 1, nz = m.nrm ? m.nrm[i + 2] : 0;
      this.nrm.push(nm[0] * nx + nm[3] * ny + nm[6] * nz,
        nm[1] * nx + nm[4] * ny + nm[7] * nz,
        nm[2] * nx + nm[5] * ny + nm[8] * nz);
    }
    for (i = 0; i < m.idx.length; i++) this.idx.push(m.idx[i] + base);
    return this;
  };
  MeshBuilder.prototype.build = function () {
    return G.make(new Float32Array(this.pos), new Float32Array(this.nrm), new Uint32Array(this.idx));
  };

  /* one shared universe of documents: card i has a fixed loveliness.
     01, 02 and 04 all read the same score, so the film stays consistent.
     The table is drawn from the seeded generator rather than from h2(i * k):
     a linear hash step aliases against 2*PI and leaves long runs in order,
     which made the first bubble pass swap 58 times out of 63.              */
  var SCORES = (function () {
    var r = C.rng(0x5EED1945), a = new Float32Array(256);
    for (var i = 0; i < 256; i++) a[i] = 0.16 + 0.76 * r();
    return a;
  })();
  function docScore(i) { return SCORES[(i | 0) & 255]; }

  /* --------------------------- atlas panels (2048x2048, 4x4 of 512x512) ---
     App.frame() calls hud.clear() before every 2D/3D pass and that wipes the
     panel atlas as well as the screen layer, so a panel authored in init() or
     enter() is gone before it is ever uploaded.  Panels are therefore authored
     during draw3d, once per section entry: panel() marks the atlas dirty, the
     upload happens at the end of that frame, and later frames leave the GPU
     copy alone.  A section must redraw every panel it owns in the same frame,
     because the upload always replaces the whole atlas.                      */
  var AW = 2048;
  /* a horizontal band of a panel, as a quad UV rect (v runs UP the quad) */
  function bandRect(pi, y0, y1) {
    var PX = (pi % 4) * 512;
    return [PX / AW, y1 / 512, (PX + 512) / AW, y0 / 512];
  }
  function cellRect(pi, cxi, cyi, nx, ny) {
    var PX = (pi % 4) * 512, PY = ((pi / 4) | 0) * 512;
    var cw = 512 / nx, ch = 512 / ny;
    var x0 = PX + cxi * cw, y0 = PY + cyi * ch;
    return [x0 / AW, (y0 + ch) / 512, (x0 + cw) / AW, y0 / 512];
  }
  var CARD_W = 0.44, CARD_H = 0.275;
  var CARD_BAND = bandRect(0, 96, 416);          // 512x320, ratio 1.6
  function cardPanel(ctx) {
    var p = ctx.hud.panel(0), h = ctx.hud;
    p.clear(CARD_BG);
    h.rect(2, 98, 508, 316, { stroke: INK3, lw: 2, ctx: p.ctx });
    h.line(2, 134, 510, 134, { color: INK3, lw: 2, ctx: p.ctx });
    for (var i = 0; i < 5; i++) h.line(18, 174 + i * 44, 494, 174 + i * 44, { color: INK4, lw: 1, ctx: p.ctx });
    h.T(16, 124, "INDEX CARD", { size: 13, color: INK2, spacing: 2.4, ctx: p.ctx });
    h.T(494, 124, "№", { size: 13, color: INK3, align: "right", ctx: p.ctx });
  }

  /* ==================================================================== 01 */
  /* SIDE BY SIDE — a real bubble sort of 64 cards on a 1945 worktable.       */
  var S1 = {
    N: 64, MAXCMP: 2016,
    sc: null, swapAt: null, swapLog: null, pairJ: null, total: 0, passSwaps: 0,
    ordA: null, ordB: null, rank: null, top: null, slot: null,
    vx: null, vy: null, vz: null, sp: null, th: null, tum: null,
    tbl: null, lamp: null, bub: null, ln: null, qd: null
  };
  var S1_LYR = ["Side by side, the lovelier goes up", "Reach for the top, till the bubble pops",
    "Take a memory, insert to the past", "Which one is the sweetest? Save it for the last"];
  var S1_LYRT = [1.30, 4.30, 7.30, 10.30];
  function s1State(k, out) {
    var i, n = S1.N, j, tmp;
    for (i = 0; i < n; i++) out[i] = i;
    var ns = S1.swapAt[k];
    for (i = 0; i < ns; i++) { j = S1.swapLog[i]; tmp = out[j]; out[j] = out[j + 1]; out[j + 1] = tmp; }
    return out;
  }
  function s1Cmp(ctx) { return clamp(Math.floor(ctx.beat.index + 1), 0, S1.MAXCMP); }
  function s1Init(ctx) {
    var n = S1.N, i, j;
    S1.sc = new Float32Array(n);
    for (i = 0; i < n; i++) S1.sc[i] = docScore(i);
    /* record a real bubble sort: every comparison and every swap */
    var arr = [], cmp = 0, swaps = [], at = new Int32Array(S1.MAXCMP + 1), pj = new Int32Array(S1.MAXCMP + 1);
    for (i = 0; i < n; i++) arr.push(i);
    var tail = 0;
    at[0] = 0;
    while (tail < n - 1 && cmp < S1.MAXCMP) {
      var swapped = false;
      for (j = 0; j < n - 1 - tail && cmp < S1.MAXCMP; j++) {
        pj[cmp] = j; cmp++;
        if (S1.sc[arr[j]] > S1.sc[arr[j + 1]]) {
          var tp = arr[j]; arr[j] = arr[j + 1]; arr[j + 1] = tp;
          swaps.push(j); swapped = true;
        }
        at[cmp] = swaps.length;
      }
      tail++;
      if (!swapped) break;
    }
    for (i = cmp + 1; i <= S1.MAXCMP; i++) { at[i] = swaps.length; pj[i] = pj[Math.max(0, cmp - 1)]; }
    S1.total = cmp;
    S1.passSwaps = at[Math.min(64, cmp)];
    S1.swapAt = at;
    S1.swapLog = new Int32Array(swaps);
    S1.pairJ = pj;
    S1.ordA = new Int32Array(n); S1.ordB = new Int32Array(n);
    S1.rank = new Int32Array(n); S1.slot = new Int32Array(n);
    S1.vx = new Float32Array(n); S1.vy = new Float32Array(n); S1.vz = new Float32Array(n);
    S1.sp = new Float32Array(n); S1.th = new Float32Array(n); S1.tum = new Float32Array(n);
    for (i = 0; i < n; i++) {
      S1.vx[i] = (ctx.rnd() - 0.5) * 3.4;
      S1.vy[i] = 0.6 + ctx.rnd() * 2.4;
      S1.vz[i] = (ctx.rnd() - 0.5) * 2.6;
      S1.sp[i] = (ctx.rnd() - 0.5) * 7.0;
      S1.th[i] = (ctx.rnd() - 0.5) * 0.5;
      S1.tum[i] = ctx.rnd() * PI;
    }
    /* the sweetest cards, and which timeline slot each one owns */
    var order = [];
    for (i = 0; i < n; i++) order.push(i);
    order.sort(function (a, b) { return S1.sc[b] - S1.sc[a] || (a - b); });
    S1.top = order;
    for (i = 0; i < n; i++) S1.slot[order[i]] = i;

    var B = new MeshBuilder(), box = G.box(1, 1, 1);
    B.add(box, 0, -1.03, 0.35, 5.6, 0.16, 3.2);            // the top
    B.add(box, -2.45, -1.52, 0.35, 0.16, 0.85, 2.8);       // trestles
    B.add(box, 2.45, -1.52, 0.35, 0.16, 0.85, 2.8);
    B.add(box, 0, -1.30, 1.72, 1.05, 0.30, 0.70);          // the drawer
    B.add(box, 0, -1.30, 1.42, 0.94, 0.24, 0.10);
    B.add(box, 0, -1.24, 2.10, 0.34, 0.035, 0.035);        // its brass pull
    S1.tbl = B.build();
    var L2 = new MeshBuilder(), cyl = G.cylinder(0.07, 0.05, 0.06, 16);
    L2.add(cyl, -1.85, -0.92, -0.55, 1, 1, 1);
    L2.add(cyl, -1.85, -0.62, -0.55, 0.34, 12.0, 0.34);    // the stem
    L2.add(cyl, -1.52, -0.05, -0.55, 0.30, 8.0, 0.30, 0.95);
    L2.add(cyl, -1.05, 0.22, -0.55, 0.30, 6.0, 0.30, -1.15);
    L2.add(G.cylinder(0.24, 0.075, 0.26, 22), -0.86, 0.18, -0.55, 1, 1, 1);
    S1.lamp = L2.build();
    S1.bub = G.ico(3);
    S1.ln = new V.Lines(80);
    S1.qd = new Float32Array(n * 24);
    return true;
  }
  WEM.defineSection({
    id: "01",
    name: "SIDE BY SIDE",
    init: s1Init,
    enter: function (ctx) { S1.panK = null; },
    draw2d: function (ctx) {
      var t = ctx.t, L = ctx.local, hud = ctx.hud, col = I.css(t), col2 = I.css2(t);
      var cam = ctx.cam, i;
      ctx.hits = 1048576;

      /* a slow long take across the worktable */
      var k = clamp(L / 8.2, 0, 1), k2 = clamp((L - 8.2) / 6.17, 0, 1);
      var e1 = Ease.inOutQuad(k), e2 = Ease.inOutQuad(k2);
      cam.reset3d(6);
      cam.fov = 0.86;
      cam.pos[0] = lerp(lerp(-1.05, -0.10, e1), 0.95, e2);
      cam.pos[1] = lerp(lerp(0.98, 1.78, e1), 1.52, e2);
      cam.pos[2] = lerp(lerp(4.55, 6.05, e1), 5.35, e2);
      cam.target[0] = lerp(lerp(-0.62, -0.35, k), 0.12, e2);
      cam.target[1] = lerp(lerp(-0.72, 0.02, e1), -0.42, e2);
      cam.target[2] = 0.05;

      /* the pop: one bar, never a hit */
      var dp = t - 8.2;
      if (dp > 0 && dp < 0.16) ctx.fx.whiteBar = Math.max(ctx.fx.whiteBar, 0.2 * (1 - dp / 0.16));
      if (dp > 0 && dp < 0.5) ctx.fx.shakeY = Math.max(ctx.fx.shakeY, 0.0035 * (1 - dp / 0.5));

      /* ---------------- the typed lyric card ----------------------------- */
      var bx = I.card(ctx, 46, 138, 640, 214, { title: "SIDE BY SIDE", right: "01 / 22", head: 28 });
      for (i = 0; i < 4; i++) {
        var txt = S1_LYR[i];
        var shown = clamp((t - S1_LYRT[i]) * 24, 0, txt.length) | 0;
        if (shown <= 0) continue;
        var on = ctx.lyric && String(ctx.lyric.text) === txt;
        var act = !on && i === s1ActiveLine(t);
        hud.T(bx.x + 14, bx.y + 34 + i * 33, txt.slice(0, shown), {
          size: 17, color: on ? col : (act ? INK : "#5f6873"),
          alpha: on ? 1 : (act ? 0.9 : 0.42), spacing: 0.4,
          glow: on ? col : false, blur: 10
        });
        if (shown < txt.length) hud.rect(bx.x + 14 + shown * 10.2, bx.y + 21 + i * 33, 8, 3, { fill: I.hexA(col, 0.9) });
      }

      /* ---------------- the comparator ----------------------------------- */
      var kk = s1Cmp(ctx);
      var cc = I.card(ctx, 46, 668, 508, 232, { title: "COMPARATOR", right: "PAIRWISE", head: 28 });
      hud.T(cc.x + 14, cc.y + 40, "COMPARISONS", { size: 11, color: INK2, spacing: 1.8 });
      hud.T(cc.x + cc.w - 14, cc.y + 44, pad(Math.min(kk, 64), 2) + "/" + S1.N, {
        size: 26, color: col, align: "right", weight: 600
      });
      hud.T(cc.x + 14, cc.y + 80, "SWAPS", { size: 11, color: INK2, spacing: 1.8 });
      hud.T(cc.x + cc.w - 14, cc.y + 84, pad(s1Swaps(kk), 2) + "/" + pad(S1.passSwaps, 2), {
        size: 26, color: col2, align: "right", weight: 600
      });
      hud.bar(cc.x + 14, cc.y + 110, cc.w - 28, 12, clamp(kk / 64, 0, 1),
        { color: I.hexA(col, 0.55), fill: I.hexA(col, 0.75), ticks: 8 });
      hud.T(cc.x + 14, cc.y + 144, "A[0..63] · ASCENDING BY LOVELINESS", { size: 10, color: INK2, spacing: 1.2 });
      hud.T(cc.x + 14, cc.y + 170, "IF A[J] > A[J+1] THEN SWAP", { size: 12, color: INK, spacing: 0.6 });
      hud.T(cc.x + 14, cc.y + 194, "J = " + pad(kk > 0 ? S1.pairJ[kk - 1] : 0, 2) + "   PASS 01 OF 63", {
        size: 12, color: I.hexA(col2, 0.9), spacing: 0.6
      });

      /* ---------------- the sort card ------------------------------------ */
      var sc = I.card(ctx, 1400, 700, 474, 196, { title: "SORT · BUBBLE", right: "n = 64", head: 28, tab: "O(n²)" });
      hud.T(sc.x + 14, sc.y + 42, "COMPARISONS REMAINING", { size: 10, color: INK2, spacing: 1.6 });
      hud.T(sc.x + 14, sc.y + 74, commas(Math.max(0, S1.total - kk)), { size: 24, color: INK, spacing: 0.6 });
      hud.T(sc.x + 14, sc.y + 112, "SWAPS REMAINING", { size: 10, color: INK2, spacing: 1.6 });
      hud.T(sc.x + 14, sc.y + 140, commas(Math.max(0, S1.swapLog.length - s1Swaps(kk))), { size: 24, color: INK, spacing: 0.6 });
      hud.T(sc.x + sc.w - 14, sc.y + 140, "PASS 01", { size: 11, color: I.hexA(col, 0.85), align: "right", spacing: 2.2 });

      hud.T(1874, 906, "1945 VANNEVAR BUSH · \"AS WE MAY THINK\" · THE MEMEX", {
        size: 10, color: INK2, alpha: 0.45, align: "right", spacing: 1.0
      });
    },
    draw3d: function (ctx) {
      var g = ctx.gfx, t = ctx.t, col = I.css(t), i;
      var cr = I.rgbA(col, 1);
      if (S1.panK !== 1) { S1.panK = 1; cardPanel(ctx); }

      g.solid(S1.tbl, M4.ident(), { color: WOOD, rim: 0.22, light: [-0.7, 1.1, 0.5] });
      g.solid(S1.lamp, M4.ident(), { color: BRASS, rim: 0.35, light: [-0.7, 1.1, 0.5] });
      g.solid(G.ico(1), M4.trans(-0.86, 0.10, -0.55),
        { color: [1.0, 0.80, 0.45], alpha: 0.9, unlit: true, emissive: 0.7, rim: 0 });

      var kk = s1Cmp(ctx);
      var oA = s1State(Math.max(0, kk - 1), S1.ordA);
      var oB = s1State(kk, S1.ordB);
      var n = S1.N;
      var sp = 0.013 + 0.024 * smoothstep(3.4, 8.0, t);
      var base = -0.93;
      var ph = ctx.beat.phase;
      var lift = smoothstep(0, 0.20, ph) * (1 - smoothstep(0.70, 0.99, ph));
      var pj = kk > 0 ? S1.pairJ[kk - 1] : -1;
      var c0 = pj >= 0 ? oA[pj] : -1, c1 = pj >= 0 ? oA[pj + 1] : -1;
      var hi = (c0 >= 0 && S1.sc[c0] > S1.sc[c1]) ? c0 : c1;

      var rank = S1.rank, slot = S1.slot;
      for (i = 0; i < n; i++) rank[oB[i]] = i;

      var tau = Math.max(0, t - 8.2);
      var lineOn = smoothstep(9.05, 9.95, t);
      var pileOn = smoothstep(12.0, 13.15, t);
      var push = Ease.outCubic(clamp((t - 10.05) / 0.42, 0, 1));
      var newCard = S1.top[0], aside = smoothstep(13.0, 14.0, t);
      var quads = S1.qd, qi = 0;

      for (i = 0; i < n; i++) {
        var card = i, r = rank[card];
        var x = -0.86 + r * 0.0105, y = base + 0.03 + r * sp, z = 0.16 + r * 0.0055;
        var th = S1.th[card] * 0.25, phc = 0;
        var isPair = (card === c0 || card === c1);

        if (isPair) {
          var isHi = (card === hi), side = (card === c0) ? -1 : 1;
          x = x + side * 0.30 * lift;
          z = z + 0.62 * lift;
          y = lerp(y, 0.62 + (isHi ? 0.30 : 0) * (1 - Math.abs(lift - 0.5) * 2), lift);
          phc = 0.30 * lift;
          th = S1.th[card] * lift;
        }

        if (tau > 0) {
          var y0 = y, vx = S1.vx[card], vy = S1.vy[card], vz = S1.vz[card], ga = 3.1;
          var tLand = (vy + Math.sqrt(vy * vy + 2 * ga * Math.max(0, y0 - (base + 0.02)))) / ga;
          var tt = Math.min(tau, tLand);
          var ex = -0.86 + vx * tt, ey = y0 + vy * tt - 0.5 * ga * tt * tt, ez = 0.16 + vz * tt;
          if (tau > tLand) { ex += vx * (tau - tLand) * 0.22; ez += vz * (tau - tLand) * 0.22; }
          var eb = smoothstep(0, 0.22, tau);
          x = lerp(x, ex, eb); y = lerp(y, ey, eb); z = lerp(z, ez, eb);
          var settle = smoothstep(tLand + 0.05, tLand + 0.55, tau);
          th = S1.th[card] + S1.sp[card] * tt * (1 - settle) * 0.9;
          phc = (1 - settle) * (0.5 + 0.5 * Math.sin(S1.tum[card] + tt * 5.0));
        }

        if (lineOn > 0) {                       /* 25 cards stand on the line */
          var sl = slot[card];
          if (sl < 24) {
            var s2 = sl + (sl >= 12 ? push : 0);
            if (card === newCard) s2 = 12;
            x = lerp(x, -2.02 + s2 * 0.175, lineOn);
            y = lerp(y, base + 0.30, lineOn);
            z = lerp(z, 0.30, lineOn);
            th = lerp(th, 0, lineOn);
            phc = lerp(phc, PI * 0.5, lineOn);
          } else {
            x = lerp(x, -2.40 + (sl - 24) * 0.075, lineOn);
            y = lerp(y, base + 0.02 + (sl % 3) * 0.012, lineOn);
            z = lerp(z, 1.05, lineOn);
            th = lerp(th, 0.2, lineOn);
            phc = lerp(phc, 0, lineOn);
          }
        }

        if (pileOn > 0) {                        /* one pile, one card aside */
          var px = 0.30 + r * 0.006, py = base + 0.03 + r * 0.020, pz = 0.02 + r * 0.004;
          if (r === n - 1) {
            px = lerp(px, 1.72, aside); py = lerp(py, base + 0.34, aside); pz = lerp(pz, 0.86, aside);
            th = lerp(th, -0.5, aside); phc = lerp(phc, PI * 0.42, aside);
          } else {
            phc = lerp(phc, 0, pileOn);
          }
          x = lerp(x, px, pileOn); y = lerp(y, py, pileOn); z = lerp(z, pz, pileOn);
        }

        axesFlat(th, phc, _ax, _bx);
        _rg[0] = 1; _rg[1] = 1; _rg[2] = 1; _rg[3] = isPair ? 1 : 0.96;
        if (isPair && card === hi) { _rg[0] = 1.0; _rg[1] = 0.72; _rg[2] = 0.42; }
        else if (isPair) { _rg[0] = 0.72; _rg[1] = 0.78; _rg[2] = 0.90; }
        pushQuad(quads, qi, x, y, z, _ax, _bx, CARD_W, CARD_H, CARD_BAND, _rg);
        qi += 24;
      }
      g.quads(quads.subarray(0, qi), ctx.hud.tPan, {});

      /* the bubble the lyric is waiting for */
      var bub = clamp((t - 5.2) / 3.0, 0, 1);
      if (bub > 0 && t < 8.30) {
        var rad = 0.62 + 0.95 * Ease.inOutQuad(bub);
        var burst = t < 8.2 ? 1 : (1 - (t - 8.2) / 0.10);
        var br = 0.55 + 0.45 * ctx.beat.barPulse;
        var bm = M4.compose([-0.55, base + 0.42 + rad * 0.5, 0.2], M4.ident(), [rad * 2, rad * 1.5, rad * 2]);
        g.solid(S1.bub, bm, {
          color: [0.62, 0.72, 0.86], alpha: (0.09 * burst * br + 0.03) * bub,
          rim: 0.95, depthWrite: false
        });
        g.wire(S1.bub, bm, { color: [0.72, 0.82, 0.96], alpha: 0.16 * burst * bub, width: 1.0, depthWrite: false });
      }

      /* the timeline drawn straight onto the wood */
      if (lineOn > 0.01) {
        for (i = 0; i < 26; i++) {
          var tx = -2.02 + i * 0.175;
          S1.ln.seg(tx, base + 0.012, 0.36, tx, base + 0.012, 0.24,
            [cr[0], cr[1], cr[2]], 1.2, lineOn * (i === 12 ? 0.95 : 0.35));
        }
        S1.ln.seg(-2.30, base + 0.012, 0.30, 2.30, base + 0.012, 0.30, [cr[0], cr[1], cr[2]], 2.0, lineOn * 0.85);
        S1.ln.draw(g, { add: true, glow: 0.35, depthWrite: false });
        S1.ln.clear();
      }
    }
  });
  function s1Swaps(k) { return S1.swapAt[clamp(k | 0, 0, S1.MAXCMP)]; }
  function s1ActiveLine(t) {
    var a = 0;
    for (var i = 0; i < 4; i++) if (t >= S1_LYRT[i]) a = i;
    return a;
  }

  /* ==================================================================== 02 */
  /* RANK — a hanging rank tower (a real insertion sort) and a dot-matrix      */
  /* printout of a real inverted index of this song's own lyrics.              */
  var S2 = {
    M: 32, sc: null, ins: null, idx: null, tbl: null, tower: null,
    rpath: null, rarc: null, rtot: 1, ribbon: null, qd: null, dotP: null, dotC: null
  };
  function buildInvertedIndex(lrc) {
    /* a real tokeniser: lowercase, punctuation split, then the two filters
       every retrieval system of the period actually ran — one-character
       tokens and the function-word list.                               */
    var STOP = { the: 1, a: 1, an: 1, and: 1, of: 1, to: 1, in: 1, is: 1, it: 1, i: 1, my: 1,
      me: 1, you: 1, your: 1, but: 1, that: 1, this: 1, as: 1, at: 1, on: 1, for: 1, if: 1,
      so: 1, do: 1, be: 1, are: 1, am: 1, we: 1, us: 1, "i'm": 1, "you're": 1 };
    var lines = [], i, k;
    for (i = 0; i < lrc.length; i++) {
      var tx = String(lrc[i].text === undefined ? "" : lrc[i].text).trim();
      if (!tx) continue;
      var toks = tx.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/), keep = [];
      for (k = 0; k < toks.length; k++) if (toks[k].length > 1 && !STOP[toks[k]]) keep.push(toks[k]);
      if (keep.length) lines.push({ no: i + 1, text: tx, toks: keep });
    }
    var N = lines.length, post = {}, order = [];
    for (var li = 0; li < N; li++) {
      var seen = {}, tk = lines[li].toks;
      for (k = 0; k < tk.length; k++) {
        var w = tk[k];
        if (!post[w]) { post[w] = { w: w, df: 0, lines: [], tf: {} }; order.push(w); }
        var P = post[w];
        P.tf[li] = (P.tf[li] || 0) + 1;
        if (!seen[w]) { seen[w] = 1; P.df++; P.lines.push(lines[li].no); }
      }
    }
    var terms = [];
    for (i = 0; i < order.length; i++) {
      var Q = post[order[i]];
      var idf = Math.log(N / Q.df);                     /* the real IDF */
      var best = 0, bl = 0;
      for (var lj in Q.tf) { var v = Q.tf[lj] * idf; if (v > best) { best = v; bl = +lj; } }
      terms.push({ w: Q.w, df: Q.df, idf: idf, weight: best, lines: Q.lines, best: bl + 1 });
    }
    terms.sort(function (a, b) { return b.weight - a.weight || (a.w < b.w ? -1 : 1); });
    return { N: N, terms: terms, count: order.length };
  }
  function s2B0() { return WEM.Data.beat(14.370, S2._b || (S2._b = {})).index; }
  function s2State(k) { return S2.ins[clamp(k | 0, 0, S2.M)]; }
  function s2Swaps(k) { return S2.shifts[clamp(k | 0, 0, S2.M)]; }
  function s2LineList(a, max) {
    var s = "", n = Math.min(max, a.length);
    for (var i = 0; i < n; i++) s += (i ? " " : "") + pad(a[i], 2);
    if (a.length > n) s += " +" + (a.length - n);
    return s;
  }
  function s2LineNo(ctx) { return Math.max(0, Math.floor((ctx.t - 21.0) / 0.43)); }
  function s2Design(ctx) {
    if (!ctx.data || !ctx.data.lrc || !ctx.data.lrc.length) return null;
    return buildInvertedIndex(ctx.data.lrc);
  }
  function s2Panel(ctx) {
    var p = ctx.hud.panel(1), h = ctx.hud, S = p.w, i;
    var D = S2.idx;
    cardPanel(ctx);
    p.clear(PAGE_BG);
    h.rect(2, 2, 508, 508, { stroke: INK4, lw: 1, ctx: p.ctx });
    h.T(12, 22, "INVERTED INDEX · WORLD.SEARCH (YOU) ;", { size: 11, color: INK, spacing: 0.4, ctx: p.ctx });
    h.T(12, 36, D.N + " LINES · " + D.count + " TERMS · 1-CHAR + STOPWORDS DROPPED", { size: 9, color: INK2, spacing: 0.4, ctx: p.ctx });
    h.line(10, 44, 502, 44, { color: INK3, lw: 1, ctx: p.ctx });
    var wmax = D.terms[0] ? D.terms[0].weight : 1;
    for (i = 0; i < 30; i++) {
      var T2 = D.terms[i];
      if (!T2) break;
      var word = T2.w.toUpperCase();
      while (word.length < 14) word += " ";
      /* heavier weight = more ink; authored lighter here because the whole
         frame is inverted onto paper                                      */
      h.T(12, 62 + i * 14.6, word + " " + s2LineList(T2.lines, 7), {
        size: 9.5, color: INK, alpha: 0.32 + 0.68 * (T2.weight / wmax), ctx: p.ctx
      });
    }
    /* punch the glyphs into a dot-matrix grid: ink survives only where a
       needle actually struck the paper                                     */
    var sc = S2.dotC;
    if (!sc) {
      sc = S2.dotC = document.createElement("canvas");
      sc.width = 512; sc.height = 512;
    }
    var sx = sc.getContext("2d");
    sx.setTransform(1, 0, 0, 1, 0, 0);
    sx.globalCompositeOperation = "source-over";
    sx.globalAlpha = 1;
    sx.clearRect(0, 0, 512, 512);
    sx.drawImage(p.ctx.canvas, p.x, p.y, 512, 512, 0, 0, 512, 512);
    if (!S2.dotP) {
      var d = document.createElement("canvas");
      d.width = 3; d.height = 3;
      var dx = d.getContext("2d");
      dx.fillStyle = "#000000"; dx.fillRect(0, 0, 3, 3);
      dx.fillStyle = "#ffffff"; dx.fillRect(0, 0, 2, 2);
      S2.dotP = sx.createPattern(d, "repeat");
    }
    if (S2.dotP) {
      sx.globalCompositeOperation = "multiply";
      sx.fillStyle = S2.dotP;
      sx.fillRect(0, 0, 512, 512);
    }
    sx.globalCompositeOperation = "source-over";
    p.ctx.setTransform(1, 0, 0, 1, 0, 0);
    p.ctx.globalAlpha = 1;
    p.ctx.drawImage(sc, 0, 0, 512, 512, p.x, p.y, 512, 512);
    p.ctx.setTransform(1, 0, 0, 1, p.x, p.y);
  }
  function s2Init(ctx) {
    var i;
    S2.idx = s2Design(ctx) || { N: 0, terms: [{ w: "-", df: 1, idf: 0, weight: 1, lines: [1], best: 1 }], count: 0 };
    S2.sc = new Float32Array(S2.M);
    for (i = 0; i < S2.M; i++) S2.sc[i] = docScore(i * 2 + 1);
    /* a real insertion sort of 32 cards, one insertion per beat */
    S2.ins = [];
    S2.shifts = new Int32Array(S2.M + 1);
    var arr = [], sh = 0;
    for (i = 0; i < S2.M; i++) arr.push(i);
    S2.ins.push(arr.slice());
    for (i = 1; i < S2.M; i++) {
      var key = arr[i], p = i - 1;
      while (p >= 0 && S2.sc[arr[p]] > S2.sc[key]) { arr[p + 1] = arr[p]; p--; sh++; }
      arr[p + 1] = key;
      S2.ins.push(arr.slice());
      S2.shifts[i] = sh;
    }
    var B = new MeshBuilder(), box = G.box(1, 1, 1);
    B.add(box, 2.35, 0.20, -1.40, 1.15, 0.36, 0.74);       // printer body
    B.add(box, 2.35, 0.45, -1.68, 1.05, 0.14, 0.18);       // paper guide
    B.add(box, 2.35, 0.32, -1.02, 0.95, 0.07, 0.18);       // platen cover
    B.add(box, 1.92, 0.30, -1.02, 0.10, 0.14, 0.10);       // tractor knobs
    B.add(box, 2.78, 0.30, -1.02, 0.10, 0.14, 0.10);
    B.add(box, 2.35, -0.02, -1.40, 1.30, 0.06, 0.86);      // printer base
    B.add(box, 2.10, -0.09, -0.75, 3.20, 0.08, 2.40);      // the machine-room desk
    B.add(box, 0.60, -0.60, -0.75, 0.10, 0.95, 2.20);
    B.add(box, 3.60, -0.60, -0.75, 0.10, 0.95, 2.20);
    B.add(box, 0.0, -1.20, -0.60, 8.0, 0.10, 5.0);         // floor
    B.add(box, -2.90, 0.30, -1.70, 0.10, 3.0, 3.4);        // back wall
    S2.tbl = B.build();
    var Ln = new V.Lines(80);
    for (i = 0; i < S2.M; i++) {
      var y = -1.15 + i * 0.072;
      Ln.seg(-1.05, y, -0.30, -0.45, y, -0.30, [0.55, 0.60, 0.66], 1.0, 0.5);
    }
    Ln.seg(-0.45, 1.45, -0.30, -0.45, -1.30, -0.30, [0.62, 0.66, 0.72], 1.6, 0.6);
    S2.tower = Ln;
    /* the fanfold: in from above the frame, through the platen, folded on the
       desk in front of the printer                                          */
    var pts = [], px = 2.35;
    pts.push([px, 3.30, -1.62]);
    pts.push([px, 1.10, -1.60]);
    pts.push([px, 0.56, -1.58]);
    pts.push([px, 0.44, -1.48]);
    pts.push([px, 0.36, -1.26]);
    pts.push([px, 0.30, -1.02]);
    pts.push([px, 0.02, -0.92]);
    pts.push([px, -0.10, -0.86]);
    var zz = -0.86, yy = -0.10, dir = 1;
    for (i = 0; i < 9; i++) {
      zz += dir * 0.145; yy += 0.015;
      pts.push([px - 0.006 * i, yy, zz]);
      dir = -dir;
    }
    S2.rpath = pts;
    var arc = [0];
    for (i = 1; i < pts.length; i++) {
      var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], dz = pts[i][2] - pts[i - 1][2];
      arc.push(arc[i - 1] + Math.sqrt(dx * dx + dy * dy + dz * dz));
    }
    S2.rarc = arc;
    S2.rtot = arc[arc.length - 1];
    S2.ribbon = new Float32Array((pts.length - 1) * 24);
    S2.qd = new Float32Array(S2.M * 24);
    S2.pt = new V.Points(8);
    return true;
  }
  WEM.defineSection({
    id: "02",
    name: "RANK",
    init: s2Init,
    enter: function (ctx) { S2.panK = null; },
    draw2d: function (ctx) {
      var t = ctx.t, L = ctx.local, hud = ctx.hud, col = I.css(t), col2 = I.css2(t);
      var cam = ctx.cam, i;
      ctx.hits = s2Hits(ctx);

      var k = clamp(L / 6.6, 0, 1), k2 = clamp((L - 6.6) / 7.26, 0, 1);
      var e1 = Ease.inOutQuad(k), e2 = Ease.inOutQuad(k2);
      cam.reset3d(6);
      cam.fov = 0.88;
      cam.pos[0] = lerp(-0.05, 0.10, e1) + e2 * 0.42;
      cam.pos[1] = lerp(0.20, 0.42, e1) + e2 * 0.30;
      cam.pos[2] = lerp(4.20, 3.95, e1) + e2 * 0.15;
      cam.target[0] = lerp(-0.60, -0.55, e1) + e2 * 1.55;
      cam.target[1] = lerp(0.10, 0.35, e1) + e2 * -0.20;
      cam.target[2] = -0.06;

      /* ---------------- the live ranking table ---------------------------- */
      /* the inserted prefix of an insertion sort is genuinely sorted, so the
         table shows exactly that: a ranking that is being built, one card at
         a time.  Earlier rows are real; later rows are not in the array yet. */
      var kk = clamp(Math.floor(ctx.beat.index - s2B0()), 0, S2.M);
      var st = s2State(kk);
      var pre = Math.min(kk, S2.M);
      var cb = I.card(ctx, 46, 138, 566, 560, { title: "RANKING · LIVE", right: "INSERTION SORT", head: 28 });
      hud.T(cb.x + 12, cb.y + 28, "RANK", { size: 10, color: INK2, spacing: 1.8 });
      hud.T(cb.x + 92, cb.y + 28, "DOC", { size: 10, color: INK2, spacing: 1.8 });
      hud.T(cb.x + cb.w - 12, cb.y + 28, "SCORE", { size: 10, color: INK2, spacing: 1.8, align: "right" });
      for (i = 0; i < 12; i++) {
        var ri = pre - 1 - i, yy = cb.y + 52 + i * 40;
        if (ri < 0) {
          hud.T(cb.x + 12, yy, pad(i + 1, 2), { size: 13, color: INK4, spacing: 1.0 });
          hud.T(cb.x + 92, yy, "— — —", { size: 13, color: INK4, spacing: 0.8 });
          hud.line(cb.x + 8, yy + 12, cb.x + cb.w - 8, yy + 12, { color: INK4 });
          continue;
        }
        var rk = ri, doc = st[ri];
        var fresh = (ri === pre - 1) && kk > 0;
        hud.T(cb.x + 12, yy, pad(rk + 1, 2), { size: 13, color: fresh ? col : INK2, spacing: 1.0 });
        hud.T(cb.x + 92, yy, "D" + pad(doc * 2 + 1, 4), { size: 13, color: fresh ? INK : "#8d949c", spacing: 0.8 });
        hud.rect(cb.x + 214, yy - 8, 208, 7, { fill: "rgba(232,238,244,0.09)" });
        hud.rect(cb.x + 214, yy - 8, 208 * clamp(S2.sc[doc], 0, 1), 7, { fill: I.hexA(fresh ? col : col2, fresh ? 0.9 : 0.5) });
        hud.T(cb.x + cb.w - 12, yy, S2.sc[doc].toFixed(3), { size: 14, color: fresh ? col : INK2, align: "right" });
        hud.line(cb.x + 8, yy + 12, cb.x + cb.w - 8, yy + 12, { color: INK4 });
      }
      hud.T(cb.x + 12, cb.y + cb.h - 14, "INSERTIONS " + pad(kk, 2) + " / " + S2.M + "  ·  DISPLACED " + pad(s2Swaps(kk), 3), {
        size: 11, color: I.hexA(col, 0.9), spacing: 1.2
      });

      /* ---------------- the print preview --------------------------------- */
      var pb = I.card(ctx, 1336, 138, 538, 428, { title: "PRINT PREVIEW", right: "22 CPS", head: 28, tab: "FANFOLD" });
      hud.T(pb.x + 12, pb.y + 30, "INVERTED INDEX · " + S2.idx.N + " LINES · " + S2.idx.count + " TERMS", {
        size: 12, color: col, spacing: 0.8
      });
      hud.line(pb.x + 10, pb.y + 42, pb.x + pb.w - 10, pb.y + 42, { color: INK3 });
      var wmax = S2.idx.terms[0].weight || 1;
      for (i = 0; i < 8; i++) {
        var T2 = S2.idx.terms[i];
        if (!T2) break;
        var y2 = pb.y + 66 + i * 30;
        var ink = 0.30 + 0.70 * (T2.weight / wmax);
        hud.T(pb.x + 14, y2, T2.w.toUpperCase(), { size: 13, color: INK, alpha: ink, spacing: 0.4 });
        hud.T(pb.x + 176, y2, "df " + pad(T2.df, 2) + "   idf " + T2.idf.toFixed(2), { size: 10, color: INK2, alpha: 0.4 + 0.6 * ink });
        hud.T(pb.x + pb.w - 14, y2, "→ " + s2LineList(T2.lines, 5), { size: 10, color: INK2, alpha: 0.4 + 0.6 * ink, align: "right" });
        hud.rect(pb.x + 14, y2 + 6, 148 * (T2.weight / wmax), 3, { fill: I.hexA(col, 0.75) });
        hud.line(pb.x + 10, y2 + 15, pb.x + pb.w - 10, y2 + 15, { color: INK4 });
      }
      hud.T(pb.x + 12, pb.y + pb.h - 14, "tf × log(N / df)    N = " + S2.idx.N + " LINES    RARE WORDS WEIGH MORE", {
        size: 10, color: INK2, spacing: 1.0
      });

      var sheets = s2Sheets(ctx);
      hud.T(960, 128, "PRINTER 22 CPS · PAPER " + commas(sheets) + (sheets === 1 ? " SHEET" : " SHEETS"), {
        size: 13, color: I.hexA(col, 0.95), align: "center", spacing: 2.0
      });
      var pr = clamp((t - 21.0) / 0.6, 0, 1);
      if (pr > 0) {
        hud.T(1620, 128, "LINE " + pad(s2LineNo(ctx), 3) + " OF " + (S2.idx.count + S2.idx.N), {
          size: 10, color: INK2, align: "right", alpha: pr, spacing: 1.2
        });
      }

      hud.T(1874, 906, "1960 INVERTED INDEX · 1972 TF-IDF · KAREN SPÄRCK JONES", {
        size: 10, color: INK2, alpha: 0.45, align: "right", spacing: 1.0
      });
    },
    draw3d: function (ctx) {
      var g = ctx.gfx, t = ctx.t, col = I.css(t), i;
      var cr = I.rgbA(col, 1);
      if (S2.panK !== 1) { S2.panK = 1; cardPanel(ctx); s2Panel(ctx); }
      g.solid(S2.tbl, M4.ident(), { color: [0.26, 0.27, 0.30], rim: 0.20, light: [0.3, 1.0, 0.4] });

      /* ---------------- the tower: every card moves because it must -------- */
      var kk = clamp(Math.floor(ctx.beat.index - s2B0()), 0, S2.M);
      var ph = Ease.inOutQuad(clamp(ctx.beat.phase, 0, 1));
      var A = s2State(kk > 0 ? kk - 1 : 0), Bs = s2State(kk);
      var ra = S2.ra || (S2.ra = new Int32Array(S2.M));
      var rb = S2.rb || (S2.rb = new Int32Array(S2.M));
      for (i = 0; i < S2.M; i++) { ra[A[i]] = i; rb[Bs[i]] = i; }
      var quads = S2.qd, qi = 0;
      for (i = 0; i < S2.M; i++) {
        var r = (kk === 0) ? rb[i] : lerp(ra[i], rb[i], ph);
        var y = -1.15 + r * 0.072;
        var x = -0.45 + Math.sin(r * 0.55) * 0.035 + Math.sin(r * 7.1) * 0.006;
        var z = -0.30 + r * 0.004;
        var moving = (ra[i] !== rb[i]) && kk > 0;
        var lift = moving ? Math.sin(clamp(ctx.beat.phase, 0, 1) * PI) * 0.09 : 0;
        axesFlat(0, PI * 0.5 * (0.92 + 0.08 * S2.sc[i]), _ax, _bx);
        var glow = 0.30 + 0.70 * S2.sc[i];
        _rg[0] = lerp(0.62, 1.00, glow); _rg[1] = lerp(0.66, 0.86, glow); _rg[2] = lerp(0.70, 0.55, glow);
        if (moving && Math.abs(r - rb[i]) < 0.6) { _rg[0] = 1.0; _rg[1] = 0.80; _rg[2] = 0.42; }
        _rg[3] = 1;
        pushQuad(quads, qi, x, y + lift, z, _ax, _bx, CARD_W, CARD_H, CARD_BAND, _rg);
        qi += 24;
      }
      g.quads(quads.subarray(0, qi), ctx.hud.tPan, {});
      S2.tower.draw(g, { add: true, depthWrite: false, glow: 0.2 });

      /* ---------------- the printout, one line per beat -------------------- */
      var pr = clamp((t - 21.0) / 0.8, 0, 1);
      if (pr > 0.001) {
        var d = S2.ribbon, pts = S2.rpath, arc = S2.rarc;
        var scroll = 0.0293 * ((t - 21.0) / 0.43);       /* one printed row per beat */
        var LEN = 0.76;
        for (i = 0; i + 1 < pts.length; i++) {
          var vis = clamp((pr - i * 0.02) * 3, 0, 1);
          if (vis <= 0.001) continue;
          var p0 = pts[i], p1 = pts[i + 1];
          var v0 = 0.10 + (arc[i] / S2.rtot) * LEN - scroll;
          var v1 = 0.10 + (arc[i + 1] / S2.rtot) * LEN - scroll;
          var bxx = p0[0] - p1[0], byy = p0[1] - p1[1], bzz = p0[2] - p1[2];
          var bl = Math.sqrt(bxx * bxx + byy * byy + bzz * bzz) || 1e-4;
          _ax[0] = 1; _ax[1] = 0; _ax[2] = 0;
          _bx[0] = bxx / bl; _bx[1] = byy / bl; _bx[2] = bzz / bl;
          _rg[0] = 1; _rg[1] = 1; _rg[2] = 1; _rg[3] = vis;
          var rect = [0.02, v1, 0.98, v0];
          pushQuad(d, i * 24, (p0[0] + p1[0]) * 0.5, (p0[1] + p1[1]) * 0.5, (p0[2] + p1[2]) * 0.5,
            _ax, _bx, 0.50, bl, rect, _rg);
        }
        g.quads(d.subarray(0, (pts.length - 1) * 24), ctx.hud.tPan, {});
      }
      if (pr > 0.001 && pr < 1) {
        var sp2 = S2.pt;
        sp2.clear();
        for (i = 0; i < 8; i++) {
          sp2.add(2.35 + (C.h2(i * 3.1, 1.7) - 0.5) * 1.0, 0.30, -1.02 + C.h2(i, 5.5) * 0.10, 0.02,
            [cr[0], cr[1], cr[2]], (1 - pr) * 0.7);
        }
        sp2.draw(g, { add: true, depthWrite: false, soft: 0.9 });
      }
    }
  });
  function s2Hits(ctx) {
    var kb = Math.max(0, ctx.beat.index - s2B0());
    var v = 1048576 * Math.pow(0.0625, clamp(kb / 32, 0, 1));
    return Math.max(65536, Math.round(v / 1024) * 1024);
  }
  function s2Sheets(ctx) {
    return Math.floor(Math.max(0, ctx.t - 14.4) * 22 / 26);
  }

  /* ==================================================================== 03 */
  /* TAKE A MEMORY — a library card catalogue and a microfilm reader.          */
  var S3 = { dates: [2026, 1998, 1972], insT: [30.6, 32.4, 34.2], slots: [10, 6, 2] };
  function s3Init(ctx) {
    var B = new MeshBuilder(), box = G.box(1, 1, 1);
    B.add(box, 0, 0.18, -0.30, 4.30, 2.55, 0.62);            // carcass
    B.add(box, 0, 1.50, -0.05, 4.30, 0.10, 0.90);            // cap
    B.add(box, 0, -1.10, -0.05, 4.30, 0.16, 0.90);           // plinth
    B.add(box, -2.16, 0.18, -0.10, 0.18, 2.40, 0.80);
    B.add(box, 2.16, 0.18, -0.10, 0.18, 2.40, 0.80);
    B.add(box, 0.0, -1.40, 0.0, 9.0, 0.10, 6.0);             // floor
    S3.cab = B.build();
    var D = new MeshBuilder();
    D.add(box, 0, -0.09, 0, 0.62, 0.05, 0.44);               // tray floor
    D.add(box, 0, 0.03, 0.215, 0.62, 0.22, 0.03);            // tray front
    D.add(box, 0, 0.03, -0.215, 0.62, 0.22, 0.03);           // tray back
    D.add(box, -0.295, 0.03, 0, 0.03, 0.22, 0.44);
    D.add(box, 0.295, 0.03, 0, 0.03, 0.22, 0.44);
    S3.drawer = D.build();
    S3.rod = G.cylinder(0.012, 0.012, 0.60, 10);
    var R = new MeshBuilder();
    R.add(box, 0, 0.02, 0, 1.10, 0.10, 0.72);
    R.add(box, -0.34, 0.34, -0.10, 0.10, 0.60, 0.10);
    R.add(box, 0.34, 0.34, -0.10, 0.10, 0.60, 0.10);
    R.add(box, 0, 0.62, -0.10, 0.86, 0.10, 0.16);
    S3.reader = R.build();
    S3.reel = G.cylinder(0.30, 0.30, 0.05, 26);
    S3.lens = G.cylinder(0.09, 0.11, 0.26, 18);
    S3.sheet = G.plane(0.92, 0.70, 4);
    S3.pt = new V.Points(4);
    return true;
  }
  function s3Which(t) {
    var w = -1;
    for (var i = 0; i < 3; i++) if (t >= S3.insT[i] - 0.5) w = i;
    return w;
  }
  function s3Hits(ctx) {
    var kb = Math.max(0, ctx.beat.index - WEM.Data.beat(28.23, S3._b || (S3._b = {})).index);
    var v = 65536 * Math.pow(0.125, clamp(kb / 30, 0, 1));
    return Math.max(8192, Math.round(v / 256) * 256);
  }
  function s3Frame(t) { return Math.abs(Math.floor((t - 34.2) * 2.2)) % 12; }
  function s3Sweet(t) { return t > 39.1; }
  function s3Cell(i) { return cellRect(4, i % 3, (i / 3) | 0, 3, 3); }        /* film frames */
  function s3Front(i) { return cellRect(3, i % 3, (i / 3) | 0, 3, 5); }      /* drawer faces */
  function s3Panels(ctx) {
    var h = ctx.hud, p, i, j;
    cardPanel(ctx);
    /* --- fifteen drawer fronts on panel 3 (3 x 5 of 170.7 x 102.4) ------- */
    p = h.panel(3);
    p.clear("#0f1317");
    var CW = 512 / 3, CH = 512 / 5;
    for (i = 0; i < 3; i++) {
      for (j = 0; j < 5; j++) {
        var x = i * CW, y = j * CH;
        h.rect(x + 4, y + 4, CW - 8, CH - 8, { fill: "#232830", stroke: "rgba(232,238,244,0.22)", lw: 2, ctx: p.ctx });
        h.rect(x + 16, y + 14, 74, 26, { stroke: "rgba(232,238,244,0.28)", lw: 1.4, ctx: p.ctx });
        h.rect(x + 19, y + 17, 68, 20, { fill: "#2d333b", ctx: p.ctx });
        h.T(x + 24, y + 32, "A-" + pad(j * 3 + i + 1, 2), { size: 11, color: INK2, spacing: 0.6, ctx: p.ctx });
        h.T(x + CW - 14, y + 32, "MEMORY", { size: 9, color: INK3, align: "right", spacing: 1.0, ctx: p.ctx });
        /* the brass pull */
        h.rect(x + CW * 0.5 - 30, y + CH - 34, 60, 12, { fill: "rgba(176,130,44,0.95)", ctx: p.ctx });
        h.rect(x + CW * 0.5 - 30, y + CH - 34, 60, 4, { fill: "rgba(228,188,98,0.9)", ctx: p.ctx });
        h.rect(x + CW * 0.5 - 30, y + CH - 26, 60, 4, { fill: "rgba(92,64,16,0.9)", ctx: p.ctx });
      }
    }
    /* --- nine microfilm frames on panel 4 -------------------------------- */
    p = h.panel(4);
    p.clear("#0d1014");
    for (i = 0; i < 9; i++) {
      var cx = (i % 3) * 170.7, cy = ((i / 3) | 0) * 170.7;
      h.rect(cx + 4, cy + 4, 162, 162, { fill: "#1a1f26", stroke: "rgba(232,238,244,0.20)", lw: 2, ctx: p.ctx });
      if (i === 0) {
        h.T(cx + 16, cy + 30, "FORM 12-B", { size: 13, color: INK2, ctx: p.ctx });
        for (j = 0; j < 7; j++) h.line(cx + 14, cy + 44 + j * 15, cx + 148, cy + 44 + j * 15, { color: INK4, ctx: p.ctx });
      } else if (i === 1) {
        h.line(cx + 24, cy + 70, cx + 138, cy + 70, { color: INK2, lw: 3, ctx: p.ctx });
        h.line(cx + 34, cy + 70, cx + 34, cy + 138, { color: INK2, lw: 3, ctx: p.ctx });
        h.line(cx + 128, cy + 70, cx + 128, cy + 138, { color: INK2, lw: 3, ctx: p.ctx });
        h.T(cx + 16, cy + 52, "h = 0.72 m", { size: 11, color: INK2, ctx: p.ctx });
      } else if (i === 2) {
        h.rect(cx + 54, cy + 74, 58, 58, { stroke: INK2, lw: 2, ctx: p.ctx });
        for (j = 0; j < 4; j++) h.rect(cx + 58 + j * 14, cy + 42, 9, 34, { stroke: INK2, lw: 2, ctx: p.ctx });
        h.rect(cx + 46, cy + 82, 11, 32, { stroke: INK2, lw: 2, ctx: p.ctx });
      } else if (i === 3) {
        for (j = 0; j < 46; j++) {
          var u = j / 45, v2 = 0.5 + 0.42 * Math.sin(u * 6.1) * Math.exp(-u * 1.1);
          h.rect(cx + 16 + u * 130, cy + 150 - v2 * 108, 2, 2, { fill: INK2, ctx: p.ctx });
        }
      } else if (i === 4) {
        for (j = 0; j < 9; j++) h.line(cx + 26, cy + 124 - j * 9, cx + 140, cy + 124 - j * 9, { color: INK3, lw: 2, ctx: p.ctx });
      } else if (i === 5) {
        for (j = 0; j < 4; j++) for (var k2 = 0; k2 < 4; k2++)
          h.rect(cx + 24 + k2 * 32, cy + 28 + j * 32, 26, 26, { stroke: INK4, lw: 1, ctx: p.ctx });
      } else if (i === 6) {
        h.rect(cx + 68, cy + 46, 36, 92, { stroke: INK2, lw: 2, ctx: p.ctx });
        h.rect(cx + 78, cy + 28, 16, 18, { stroke: INK2, lw: 2, ctx: p.ctx });
        h.T(cx + 14, cy + 156, "SPECIMEN", { size: 10, color: INK3, ctx: p.ctx });
      } else if (i === 7) {
        for (j = 0; j < 6; j++) {
          var yy = cy + 34 + j * 22;
          h.line(cx + 18, yy, cx + 62 + (j % 3) * 24, yy, { color: INK2, lw: 2, ctx: p.ctx });
          h.line(cx + 76, yy + 6, cx + 146, yy - 4, { color: INK3, lw: 1, ctx: p.ctx });
        }
      } else {
        h.rect(cx + 10, cy + 10, 150, 150, { stroke: "rgba(255,120,120,0.85)", lw: 3, ctx: p.ctx });
        h.T(cx + 24, cy + 62, "SWEETEST", { size: 22, color: "rgba(255,152,152,0.95)", weight: 600, spacing: 2, ctx: p.ctx });
        h.T(cx + 24, cy + 86, "KEEP FOR THE LAST", { size: 12, color: INK2, ctx: p.ctx });
        h.rect(cx + 24, cy + 104, 104, 3, { fill: "rgba(255,152,152,0.8)", ctx: p.ctx });
      }
    }
  }
  WEM.defineSection({
    id: "03",
    name: "TAKE A MEMORY",
    init: s3Init,
    enter: function (ctx) { S3.panK = null; },
    draw2d: function (ctx) {
      var t = ctx.t, L = ctx.local, hud = ctx.hud, col = I.css(t), col2 = I.css2(t);
      var cam = ctx.cam, i;
      ctx.hits = s3Hits(ctx);

      var k = clamp(L / 6.4, 0, 1), k2 = clamp((L - 6.4) / 6.14, 0, 1);
      var e1 = Ease.inOutQuad(k), e2 = Ease.inOutQuad(k2);
      cam.reset3d(6);
      cam.fov = 0.88;
      cam.pos[0] = lerp(-0.30, 0.62, e1) + e2 * 1.05;
      cam.pos[1] = lerp(0.55, 0.30, e1) + e2 * 0.35;
      cam.pos[2] = lerp(3.10, 2.45, e1) + e2 * -0.35;
      cam.target[0] = lerp(-0.70, 0.55, e1) + e2 * 0.95;
      cam.target[1] = lerp(-0.05, -0.32, e1) + e2 * 0.28;
      cam.target[2] = lerp(0.25, -0.10, e1);

      /* ---------------- the timeline, bottom left ------------------------- */
      var x0 = 60, x1 = 700, y0 = 838;
      hud.line(x0, y0, x1, y0, { color: INK3, lw: 1 });
      hud.T(x0, y0 + 24, "1945", { size: 10, color: INK2, spacing: 1.2 });
      hud.T(x1, y0 + 24, "2026", { size: 10, color: INK2, spacing: 1.2, align: "right" });
      hud.T(x0, y0 - 14, "MEMORY · INSERTED IN ORDER", { size: 10, color: I.hexA(col, 0.9), spacing: 2.0 });
      for (i = 0; i < 3; i++) {
        var yr = S3.dates[i], xx = x0 + (x1 - x0) * (yr - 1945) / 81;
        var age = t - S3.insT[i];
        var f = age > 0 ? Math.exp(-age / 0.55) : 0;
        hud.line(xx, y0 - 10, xx, y0 + 10, { color: I.hexA(col, 0.35 + 0.65 * f), lw: 1 + 2 * f });
        if (age > -0.5) {
          hud.T(xx, y0 - 18, String(yr), {
            size: f > 0.2 ? 15 : 11, color: f > 0.2 ? col : INK2, align: "center",
            weight: f > 0.2 ? 600 : 400
          });
        }
      }
      hud.T(x0, y0 + 46, "THREE INSERTIONS · EACH ONE EARLIER THAN THE LAST", { size: 10, color: INK2, spacing: 1.2 });

      /* ---------------- the card in hand ---------------------------------- */
      var cur = s3Which(t);
      var cb = I.card(ctx, 1336, 138, 538, 342, {
        title: "CATALOG · DRAWER 07", right: "CARD 0412", head: 28,
        tab: cur >= 0 ? String(S3.dates[cur]) : "OPEN"
      });
      var rows = [
        ["TITLE", cur === 0 ? "A LOVELIER THING" : (cur === 1 ? "THE SWEETEST ONE" : "A MEMORY, UNSORTED")],
        ["DATE", cur >= 0 ? S3.dates[cur] + "-04-12" : "---- -- --"],
        ["SUBJECT", "YOU, DESCRIBED AS SOMETHING ELSE"],
        ["CROSS-REF", "SEE ALSO 1972 · 1998 · 2026"],
        ["FILED AT", cur >= 0 ? "SLOT " + pad(S3.slots[cur], 2) + " OF 14" : "SLOT -- OF 14"],
        ["STATUS", cur >= 0 ? "FILED" : "IN HAND"]
      ];
      for (i = 0; i < rows.length; i++) {
        var y2 = cb.y + 30 + i * 40;
        hud.T(cb.x + 14, y2, rows[i][0], { size: 10, color: INK2, spacing: 1.6 });
        hud.T(cb.x + 150, y2, rows[i][1], { size: 13, color: i === 5 && cur >= 0 ? col : INK, spacing: 0.4 });
        hud.line(cb.x + 10, y2 + 12, cb.x + cb.w - 10, y2 + 12, { color: INK4 });
      }
      hud.T(cb.x + 14, cb.y + cb.h - 16, "STEEL ROD · 14 CARDS · ONE SLOT AT A TIME", { size: 10, color: I.hexA(col2, 0.8), spacing: 1.2 });

      /* ---------------- microfilm readout --------------------------------- */
      if (L > 6.0) {
        var fa = clamp((L - 6.0) / 0.7, 0, 1);
        hud.T(1336, 512, "MICROFILM · 35 mm · 24× FRAME", { size: 11, color: I.hexA(col, 0.95), alpha: fa, spacing: 2.0 });
        hud.T(1336, 538, "FRAME " + pad(s3Frame(t) + 1, 2) + " / 12   ·   GATE " + (s3Sweet(t) ? "SWEETEST" : "SCANNING"), {
          size: 12, color: s3Sweet(t) ? col : INK2, alpha: fa, spacing: 0.8
        });
        hud.T(1874, 538, "PROJECTED ONTO PAPER", { size: 10, color: INK2, alpha: fa * 0.8, align: "right", spacing: 1.2 });
      }
      hud.T(1874, 906, "1951 MICROFILM CATALOG · 1989 THE WEB", {
        size: 10, color: INK2, alpha: 0.45, align: "right", spacing: 1.0
      });
    },
    draw3d: function (ctx) {
      var g = ctx.gfx, t = ctx.t, L = ctx.local, i, j;
      if (S3.panK !== 1) { S3.panK = 1; s3Panels(ctx); }
      g.solid(S3.cab, M4.ident(), { color: [0.24, 0.245, 0.27], rim: 0.18, light: [-0.2, 1.0, 0.5] });

      /* ---------------- thirty drawer fronts ------------------------------- */
      var q = S3.qd || (S3.qd = new Float32Array(31 * 24));
      var qi = 0;
      for (var r = 0; r < 5; r++) {
        for (var c = 0; c < 6; c++) {
          if (r === 1 && c === 0) continue;              /* this one is open */
          var x = -1.65 + c * 0.66, y = -0.66 + r * 0.45;
          axesFlat(0, PI * 0.5, _ax, _bx);
          var dv = 0.94 + 0.06 * C.h2(c * 3.1 + r, 0.7);
          _rg[0] = dv; _rg[1] = dv; _rg[2] = dv; _rg[3] = 1;
          pushQuad(q, qi, x, y, 0.015, _ax, _bx, 0.62, 0.372, s3Front((c + r * 2) % 15), _rg);
          qi += 24;
        }
      }
      g.quads(q.subarray(0, qi), ctx.hud.tPan, {});

      /* ---------------- the open drawer ----------------------------------- */
      var open = smoothstep(29.0, 30.1, t) * (1 - smoothstep(34.2, 35.6, t));
      if (open > 0.001) {
        var dz = 0.60 * open;
        g.solid(S3.drawer, M4.trans(-1.65, -0.21, 0.02 + dz),
          { color: [0.28, 0.28, 0.31], rim: 0.22, alpha: open, light: [-0.2, 1.0, 0.5] });
        g.solid(S3.rod, M4.mul(M4.trans(-1.65, -0.14, 0.02 + dz), M4.rotZ(PI * 0.5)),
          { color: STEEL, rim: 0.5, smooth: true, alpha: open, light: [-0.2, 1.0, 0.5] });
        var q2 = S3.qc || (S3.qc = new Float32Array(16 * 24));
        var qj = 0;
        for (i = 0; i < 14; i++) {
          var shift = 0;
          for (var d = 0; d < 3; d++) {
            if (i >= S3.slots[d] && t > S3.insT[d]) shift += Ease.outCubic(clamp((t - S3.insT[d]) / 0.42, 0, 1));
          }
          var sx = -1.94 + (i + shift) * 0.040;
          axesFlat(-PI * 0.5, PI * 0.5, _ax, _bx);
          _rg[0] = 1; _rg[1] = 1; _rg[2] = 1; _rg[3] = 0.98 * open;
          pushQuad(q2, qj, sx, -0.06, 0.02 + dz, _ax, _bx, 0.30, 0.24, CARD_BAND, _rg);
          qj += 24;
        }
        g.quads(q2.subarray(0, qj), ctx.hud.tPan, {});
        var cur = s3Which(t);
        if (cur >= 0) {
          var fl = clamp(1 - (t - S3.insT[cur]) / 0.55, 0, 1);
          if (fl > 0.001) {
            var e3 = Ease.outCubic(clamp((t - S3.insT[cur]) / 0.5, 0, 1));
            var fx = lerp(2.60, -1.94 + S3.slots[cur] * 0.040, e3);
            var fy = lerp(0.55, -0.06, e3);
            axesFlat(-PI * 0.5, PI * 0.5, _ax, _bx);
            _rg[0] = 1.0; _rg[1] = 0.78; _rg[2] = 0.42; _rg[3] = fl;
            pushQuad(q2, 0, fx, fy, 0.02 + dz, _ax, _bx, 0.30, 0.24, CARD_BAND, _rg);
            g.quads(q2.subarray(0, 24), ctx.hud.tPan, {});
          }
        }
      }

      /* ---------------- the microfilm reader ------------------------------- */
      var rd = smoothstep(6.0, 7.0, L) * open;
      if (rd > 0.001) {
        g.solid(S3.reader, M4.trans(1.70, -0.98, -0.05),
          { color: [0.25, 0.26, 0.29], rim: 0.24, alpha: rd, light: [-0.3, 1.0, 0.4] });
        var spin = (t - 34.2) * 2.4;
        g.solid(S3.reel, M4.mul(M4.mul(M4.trans(1.70, 0.05, -0.02), M4.rotX(spin)), M4.rotY(PI * 0.5)),
          { color: BRASS, rim: 0.5, smooth: true, alpha: rd, light: [-0.3, 1.0, 0.4] });
        g.solid(S3.reel, M4.mul(M4.mul(M4.trans(2.14, 0.05, -0.02), M4.rotX(-spin * 0.7)), M4.rotY(PI * 0.5)),
          { color: BRASS, rim: 0.5, smooth: true, alpha: rd, light: [-0.3, 1.0, 0.4] });
        g.solid(S3.lens, M4.mul(M4.trans(1.70, 0.16, 0.24), M4.rotX(PI * 0.5)),
          { color: [0.40, 0.42, 0.45], rim: 0.6, smooth: true, alpha: rd, light: [-0.3, 1.0, 0.4] });
        g.solid(S3.sheet, M4.mul(M4.trans(0.72, 0.16, 0.70), M4.rotY(-0.42)),
          { color: [0.20, 0.21, 0.23], rim: 0.14, alpha: rd, light: [-0.3, 1.0, 0.4] });
        var fo = (t - 34.2) * 2.2;
        var q3 = S3.qf || (S3.qf = new Float32Array(20 * 24));
        var qk = 0;
        for (i = 0; i < 12; i++) {
          var fx2 = 1.08 + (i - (fo % 1)) * 0.112;
          if (fx2 < 0.95 || fx2 > 2.55) continue;
          axesFlat(0, PI * 0.5, _ax, _bx);
          _rg[0] = 1; _rg[1] = 1; _rg[2] = 1; _rg[3] = 0.95 * rd;
          pushQuad(q3, qk, fx2, 0.05, 0.02, _ax, _bx, 0.10, 0.075,
            s3Cell(Math.abs((i + Math.floor(fo)) % 9)), _rg);
          qk += 24;
        }
        g.quads(q3.subarray(0, qk), ctx.hud.tPan, {});
        /* what the gate throws onto the paper */
        _rg[0] = 1; _rg[1] = 1; _rg[2] = 1; _rg[3] = 0.92 * rd;
        pushQuad(q3, 0, 0.72, 0.16, 0.74, _ax, _bx, 0.80, 0.60, s3Cell(Math.abs(Math.floor(fo) % 9)), _rg);
        g.quads(q3.subarray(0, 24), ctx.hud.tPan, {});
        var lg = S3.pt;
        lg.clear();
        lg.add(1.70, 0.16, 0.28, 0.30, [1.0, 0.86, 0.55], 0.5 * rd);
        lg.draw(g, { add: true, depthWrite: false, soft: 0.95 });
      }
    }
  });

  /* ==================================================================== 04 */
  /* TABLE — hard constraints over a real candidate field, and a real damped   */
  /* oscillation while the leg count is odd.                                   */
  var S4 = { NT: 2304, NW: 48, hi: null, ei: null, li: null, death: null, evT: null, legT: null };
  function s4Init(ctx) {
    var NT = S4.NT, i;
    S4.hi = new Float32Array(NT); S4.ei = new Float32Array(NT);
    S4.li = new Uint8Array(NT); S4.death = new Uint8Array(NT);
    for (i = 0; i < NT; i++) {
      S4.hi[i] = 0.60 + C.h2(i * 0.317 + 1.3, 4.7) * 0.25;
      S4.ei[i] = C.h2(i * 0.713 + 5.1, 8.3) * 0.050;
      S4.li[i] = 3 + ((C.h2(i * 1.913 + 0.7, 2.9) * 4) | 0);
    }
    var best = -1, bd = 1e9;
    for (i = 0; i < NT; i++) {
      if (S4.hi[i] < 0.70 || S4.hi[i] > 0.74) continue;
      if (S4.li[i] !== 4) continue;
      if (S4.ei[i] >= 0.01) continue;
      var d = Math.abs(S4.hi[i] - 0.72) + S4.ei[i] * 4;
      if (d < bd) { bd = d; best = i; }
    }
    S4.winner = best < 0 ? 0 : best;
    /* the stage at which each candidate dies — real, and known up front */
    for (i = 0; i < NT; i++) {
      var st = 0;
      if (S4.hi[i] < 0.70 || S4.hi[i] > 0.74) st = 1;
      else if (S4.li[i] !== 4) st = 2;
      else if (S4.ei[i] >= 0.01) st = 3;
      else if (i !== S4.winner) st = 4;
      S4.death[i] = st;
    }
    var B = new MeshBuilder(), box = G.box(1, 1, 1);
    B.add(box, 0, 0.72, 0, 1.40, 0.055, 0.80);           // the fixed top
    B.add(box, 0, -0.04, 0, 7.0, 0.08, 5.0);             // floor, 1 unit = 1 m
    S4.tbl = B.build();
    S4.leg = G.cylinder(0.028, 0.024, 1.0, 12);
    S4.qd = new Float32Array(NT * 24);
    S4.q1 = new Float32Array(24);
    S4.pt = new V.Points(12);
    /* beat-locked drops */
    var b0 = WEM.Data.beat(40.770, S4._b || (S4._b = {})).index, Bt = WEM.Data.beats;
    function beatAt(k) { return Bt[clamp(b0 + k, 0, Bt.length - 1)]; }
    S4.evT = [beatAt(3), beatAt(7), beatAt(11), beatAt(22)];
    S4.legT = [S4.evT[1], beatAt(12), beatAt(22)];
    return true;
  }
  function s4Stage(t) {
    var n = 0;
    for (var i = 0; i < 4; i++) if (t >= S4.evT[i]) n = i + 1;
    return n;
  }
  function s4Count(t) { return [1048576, 4096, 64, 4, 1][s4Stage(t)]; }
  function s4Legs(t) {
    if (t >= S4.legT[2]) return 4;
    if (t >= S4.legT[1]) return 3;
    if (t >= S4.legT[0]) return 4;
    return 5;
  }
  function s4Wobble(t) {
    var w0 = S4.legT[1], w1 = S4.legT[2];
    if (t < w0) return 0;
    var A = 0.17 / Math.max(s4Legs(t), 1);
    var z = 0.06, om = 2.41, omd = om * Math.sqrt(1 - z * z);
    var tau = t - w0;
    var th = -A * Math.exp(-z * om * tau) * Math.cos(omd * tau);
    return th * (1 - smoothstep(w1, w1 + 0.85, t));
  }
  WEM.defineSection({
    id: "04",
    name: "TABLE",
    init: s4Init,
    enter: function (ctx) { S4.panK = null; },
    draw2d: function (ctx) {
      var t = ctx.t, hud = ctx.hud, col = I.css(t), col2 = I.css2(t);
      var cam = ctx.cam, i;
      var stage = s4Stage(t);
      ctx.hits = s4Count(t);

      /* a slow orbit, then a lower and warier angle for the wobble */
      var L = ctx.local, k = clamp((L - 4.6) / 4.4, 0, 1);
      var ang = lerp(-0.72, 0.62, clamp(L / 9.0, 0, 1));
      var rad = lerp(2.35, 2.05, Ease.inOutQuad(k));
      cam.reset3d(6);
      cam.fov = 0.86;
      cam.pos[0] = Math.sin(ang) * rad;
      cam.pos[1] = lerp(0.92, 0.72, Ease.inOutQuad(k));
      cam.pos[2] = Math.cos(ang) * rad;
      cam.target[0] = 0;
      cam.target[1] = lerp(0.48, 0.36, Ease.inOutQuad(k));
      cam.target[2] = 0;

      /* ---------------- the constraints, one line at a time --------------- */
      var chips = [
        { k: "H = 0.72 m", s: "h in [0.70, 0.74] m" },
        { k: "LEGS = 4", s: "legs = 4" },
        { k: "WOBBLE < 0.01", s: "|lj - lk| < 0.01 m" },
        { k: "UNIQUE = 1", s: "one table left" }
      ];
      hud.T(300, 132, "CONSTRAINTS", { size: 10, color: INK2, spacing: 2.4 });
      for (i = 0; i < 4; i++) {
        var a = clamp((t - S4.evT[i]) / 0.30, 0, 1);
        if (a <= 0.001) continue;
        var x = 300 + i * 268, y = 146;
        hud.rect(x, y, 248, 44, {
          fill: I.hexA(col, 0.16 * a), stroke: I.hexA(col, 0.20 + 0.55 * a), lw: 2
        });
        hud.rect(x + 10, y + 18, 8, 8, { fill: I.hexA(col, 0.95 * a) });
        hud.T(x + 28, y + 20, chips[i].k, { size: 15, color: INK, alpha: a, spacing: 0.8 });
        hud.T(x + 28, y + 36, chips[i].s, { size: 10, color: INK2, alpha: 0.85 * a, spacing: 0.6 });
      }

      /* ---------------- the count chain, right ---------------------------- */
      var LAB = ["1,048,576", "4,096", "64", "4", "1"];
      for (i = 0; i < 5; i++) {
        var passed = i <= stage, isNow = i === stage;
        var yy = 232 + i * 92;
        var pop = isNow && i > 0 ? clamp(1 - (t - S4.evT[i - 1]) / 0.5, 0, 1) : (isNow ? clamp(1 - (t - 40.77) / 1.2, 0, 1) : 0);
        hud.T(1874, yy, LAB[i], {
          size: isNow ? 50 + 10 * pop : 32,
          color: isNow ? col : (passed ? INK2 : INK4),
          alpha: passed ? (isNow ? 1 : 0.5) : 0.35,
          align: "right", weight: isNow ? 700 : 400, spacing: 1.5
        });
        hud.T(1874, yy + 18, isNow ? "CANDIDATES" : (passed ? "FILTERED OUT" : "PENDING"), {
          size: 9, color: isNow ? I.hexA(col2, 0.9) : INK3, align: "right", spacing: 2.2
        });
        if (passed && !isNow) hud.line(1520, yy - 12, 1874, yy - 12, { color: INK4, lw: 1 });
      }
      /* a printed page turning on every drop — never a flash */
      if (stage > 0) {
        var da = clamp((t - S4.evT[stage - 1]) / 0.34, 0, 1);
        if (da < 1) {
          var sw = Math.abs(Math.cos(da * PI * 0.5));
          hud.rect(1330, 650, 120 * sw + 2, 168, { stroke: I.hexA(col, 0.7), fill: I.hexA(col, 0.10) });
          hud.line(1330 + 60 * sw + 1, 650, 1330 + 60 * sw + 1, 818, { color: I.hexA(col, 0.8) });
        }
      }

      /* ---------------- the wobble instrument, bottom left ---------------- */
      var wb = I.card(ctx, 46, 700, 620, 200, { title: "WOBBLE", right: "SDOF", head: 28, tab: "ω ζ" });
      var legs = s4Legs(t), th0 = s4Wobble(t);
      hud.T(wb.x + 14, wb.y + 34, "ω = 2.41 rad/s    ζ = 0.06    ωd = " + (2.41 * Math.sqrt(1 - 0.0036)).toFixed(3) + " rad/s", {
        size: 12, color: INK, spacing: 0.6
      });
      hud.T(wb.x + 14, wb.y + 58, "LEGS " + legs + "    AMPLITUDE ∝ 1/LEGS = " + (legs === 4 ? "0.000" : (0.17 / legs).toFixed(3)) + " rad", {
        size: 12, color: I.hexA(col2, 0.95), spacing: 0.6
      });
      hud.T(wb.x + 14, wb.y + 84, "θ(t) = −θ₀ e^(−ζωt) cos(ωd t)", { size: 13, color: INK2, spacing: 0.4 });
      hud.T(wb.x + wb.w - 14, wb.y + 84, "θ = " + th0.toFixed(4) + " rad", { size: 13, color: INK, align: "right" });
      var px0 = wb.x + 14, pw = wb.w - 28, py = wb.y + 116, phh = 56;
      hud.line(px0, py + phh * 0.5, px0 + pw, py + phh * 0.5, { color: INK4 });
      var prevX = 0, prevY = 0;
      for (i = 0; i <= 120; i++) {
        var tt = t - 2.6 + (i / 120) * 2.6;
        var v = s4Wobble(tt) / 0.06;
        var X = px0 + (i / 120) * pw, Y = py + phh * 0.5 - v * phh * 0.46;
        if (i > 0) hud.line(prevX, prevY, X, Y, { color: I.hexA(col, 0.8), lw: 1.2 });
        prevX = X; prevY = Y;
      }
      hud.T(px0 + pw, py + phh + 14, "-2.6 s  →  now", { size: 9, color: INK3, align: "right", spacing: 1.2 });

      hud.T(1874, 906, "1994 BM25 · 1998 PAGERANK", {
        size: 10, color: INK2, alpha: 0.45, align: "right", spacing: 1.0
      });
    },
    draw3d: function (ctx) {
      var g = ctx.gfx, t = ctx.t, col = I.css(t), i;
      var cr = I.rgbA(col, 1);
      var stage = s4Stage(t);
      if (S4.panK !== 1) { S4.panK = 1; cardPanel(ctx); }
      g.solid(S4.tbl, M4.ident(), { color: [0.22, 0.23, 0.25], rim: 0.16, light: [-0.4, 1.0, 0.5] });

      /* ---------------- the candidate field IS the tabletop ---------------- */
      var q = S4.qd, qi = 0, nw = S4.NW;
      var tw = 1.40 / nw, td = 0.80 / nw;
      for (i = 0; i < S4.NT; i++) {
        var cx = ((i % nw) / (nw - 1) - 0.5) * 1.40;
        var cz = (((i / nw) | 0) / (nw - 1) - 0.5) * 0.80;
        var dth = S4.death[i];
        var ok = dth === 0;
        var y = 0.752;
        if (!ok) {
          if (dth > stage) continue;                     /* not filtered yet */
          var age = clamp((t - S4.evT[dth - 1]) / 0.95, 0, 1);
          if (age >= 1) continue;
          y -= age * age * 3.4;
          _rg[0] = 0.28; _rg[1] = 0.29; _rg[2] = 0.31; _rg[3] = 0.55 * (1 - age);
        } else {
          var kk = clamp((S4.hi[i] - 0.60) / 0.25, 0, 1);
          if (stage === 0) {
            _rg[0] = 0.20 + 0.22 * kk; _rg[1] = 0.22 + 0.24 * kk; _rg[2] = 0.26 + 0.26 * kk;
            _rg[3] = 0.35 + 0.30 * (0.5 + 0.5 * Math.sin(i * 0.7 + t * 2.0));
          } else {
            var win = (i === S4.winner && stage >= 4);
            _rg[0] = lerp(0.34, 1.00, kk) * (win ? 1.0 : 0.86);
            _rg[1] = lerp(0.38, 0.78, kk) * (win ? 0.92 : 0.86);
            _rg[2] = lerp(0.44, 0.42, kk) * (win ? 0.62 : 0.86);
            _rg[3] = 0.95;
          }
        }
        if (y < -0.4) continue;
        _ax[0] = 1; _ax[1] = 0; _ax[2] = 0;
        _bx[0] = 0; _bx[1] = 0; _bx[2] = 1;
        pushQuad(q, qi, cx, y, cz, _ax, _bx, tw * 0.86, td * 0.86, RC_FULL, _rg);
        qi += 24;
      }
      g.quads(q.subarray(0, qi), null, {});

      /* ---------------- the table: real legs, real wobble ------------------ */
      var legs = s4Legs(t), wob = s4Wobble(t);
      var pivotY = 0;                                  /* it rocks on the floor */
      var rot = M4.mul(M4.trans(0, pivotY, 0), M4.rotZ(wob));
      rot = M4.mul(rot, M4.trans(0, -pivotY, 0));
      var solidA = smoothstep(S4.evT[3], S4.evT[3] + 0.9, t);
      g.solid(S4.tbl, rot, { color: [0.30, 0.31, 0.34], rim: 0.20, alpha: solidA * 0.92, light: [-0.4, 1.0, 0.5] });
      var xs = [1, 1, -1, -1, 0], zs = [1, -1, 1, -1, 0];
      var nLeg = legs === 3 ? 3 : (legs === 5 ? 5 : 4);
      for (i = 0; i < nLeg; i++) {
        var lx, lz;
        if (nLeg === 3) {                                 /* a real tripod */
          var an = i / 3 * TAU + 0.52;
          lx = Math.cos(an) * 0.56; lz = Math.sin(an) * 0.30;
        } else {
          lx = xs[i] * 0.62; lz = zs[i] * 0.31;
        }
        var err = (t < S4.evT[2]) ? S4.ei[(i * 37 + 11 * nLeg) % S4.NT] : 0.006 * C.h2(i * 2.7, 1.1);
        var lh = 0.72 - err;
        var lm = M4.mul(rot, M4.trans(lx, 0.72 - lh * 0.5, lz));
        lm = M4.mul(lm, M4.scale(1, lh, 1));
        g.solid(S4.leg, lm, { color: [0.27, 0.28, 0.31], rim: 0.24, smooth: true, light: [-0.4, 1.0, 0.5] });
      }

      /* ---------------- the one perfect card ------------------------------- */
      if (stage >= 4) {
        var asd = smoothstep(S4.evT[3], S4.evT[3] + 1.5, t);
        var cy = lerp(0.80, 0.95, Ease.outCubic(asd)) + 0.02 * ctx.beat.barPulse;
        _rg[0] = 1.0; _rg[1] = 0.86; _rg[2] = 0.58; _rg[3] = 1;
        axesFlat(0.25 * asd, PI * 0.5, _ax, _bx);
        pushQuad(S4.q1, 0, 0, cy, 0, _ax, _bx, CARD_W, CARD_H, CARD_BAND, _rg);
        g.quads(S4.q1.subarray(0, 24), ctx.hud.tPan, {});
        var pt = S4.pt;
        pt.clear();
        for (i = 0; i < 12; i++) {
          var an2 = i / 12 * TAU + t * 0.5;
          pt.add(Math.cos(an2) * 0.34, cy, Math.sin(an2) * 0.20, 0.014, [cr[0], cr[1], cr[2]], 0.5 * asd);
        }
        pt.draw(g, { add: true, depthWrite: false, soft: 0.9 });
      }
    }
  });

  /* ==================================================================== 05 */
  /* EGGPLANT — a parametric spindle with finite-difference normals, a real    */
  /* 24-bin colour histogram of its own surface, and a real intersection.      */
  var S5 = {
    NU: 56, NV: 40, NP: 2240, bins: 24,
    base: null, N: null, D: null, DK: null, ref: null, cur: null, histN: -1,
    sl: null, cand: null, candMesh: null, score: 1, top: 1, qd: null, qb: null, frame: null
  };
  function s5Base(u, v, out) {
    var a = u * TAU;
    var r = 0.30 * Math.pow(Math.sin(PI * clamp(v, 0.002, 0.998)), 0.58) * (1 + 0.10 * Math.sin(PI * v));
    out[0] = Math.cos(a) * r;
    out[1] = (v - 0.5) * 1.30;
    out[2] = Math.sin(a) * r * 0.94;
    return out;
  }
  function s5Colour(u, v, n, disp, gain, out) {
    var lit = clamp(n[1] * 0.55 + n[0] * 0.42 + n[2] * 0.72, 0, 1);
    var r = 0.26 + 0.10 * v, g = 0.09 + 0.05 * v, b = 0.40 + 0.06 * (1 - v);
    var spec = Math.pow(clamp(n[0] * 0.30 + n[1] * 0.40 + n[2] * 0.86, 0, 1), 22);
    if (v > 0.90) {                                    /* the calyx is green */
      var k = (v - 0.90) / 0.10;
      r = lerp(r, 0.16, k); g = lerp(g, 0.30, k); b = lerp(b, 0.14, k);
    }
    r = (r * (0.22 + 0.95 * lit) + spec * 0.55) * gain[0];
    g = (g * (0.22 + 0.95 * lit) + spec * 0.55) * gain[1];
    b = (b * (0.22 + 0.95 * lit) + spec * 0.55) * gain[2];
    /* a scratch exposes pale flesh */
    var fl = clamp(disp * 26, 0, 1) * 0.95;
    out[0] = lerp(r, 0.78 * gain[0], fl);
    out[1] = lerp(g, 0.72 * gain[1], fl);
    out[2] = lerp(b, 0.62 * gain[2], fl);
    return out;
  }
  var _hN = [0, 0, 0], _hC = [0, 0, 0];
  function s5Histogram(N, D, gain) {
    var NU = S5.NU, NV = S5.NV, H = new Float64Array(S5.bins);
    var id, i, j, tot = 0;
    for (i = 0; i < NU; i++) {
      for (j = 0; j < NV; j++) {
        id = i * NV + j;
        _hN[0] = N[id * 3]; _hN[1] = N[id * 3 + 1]; _hN[2] = N[id * 3 + 2];
        s5Colour(i / NU, j / (NV - 1), _hN, D ? D[id] : 0, gain, _hC);
        var lum = 0.299 * _hC[0] + 0.587 * _hC[1] + 0.114 * _hC[2];
        H[clamp(Math.floor(lum * S5.bins), 0, S5.bins - 1)] += 1;
        tot++;
      }
    }
    for (i = 0; i < S5.bins; i++) H[i] /= (tot || 1);
    return H;
  }
  function s5Intersect(a, b) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += Math.min(a[i], b[i]);
    return s;
  }
  var GAIN1 = [1, 1, 1];
  function s5Init(ctx) {
    var NU = S5.NU, NV = S5.NV, i, j, s;
    var base = new Float32Array(NU * NV * 3), p0 = [0, 0, 0];
    for (i = 0; i < NU; i++) {
      for (j = 0; j < NV; j++) {
        s5Base(i / NU, j / (NV - 1), p0);
        var id = (i * NV + j) * 3;
        base[id] = p0[0]; base[id + 1] = p0[1]; base[id + 2] = p0[2];
      }
    }
    /* finite-difference normals */
    var N = new Float32Array(NU * NV * 3);
    for (i = 0; i < NU; i++) {
      for (j = 0; j < NV; j++) {
        var id2 = i * NV + j;
        var ia = ((i + 1) % NU) * NV + j, ib = ((i - 1 + NU) % NU) * NV + j;
        var ja = i * NV + Math.min(NV - 1, j + 1), jb = i * NV + Math.max(0, j - 1);
        var ux = base[ia * 3] - base[ib * 3], uy = base[ia * 3 + 1] - base[ib * 3 + 1], uz = base[ia * 3 + 2] - base[ib * 3 + 2];
        var vx = base[ja * 3] - base[jb * 3], vy = base[ja * 3 + 1] - base[jb * 3 + 1], vz = base[ja * 3 + 2] - base[jb * 3 + 2];
        var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        var l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        nx /= l; ny /= l; nz /= l;
        if (nx * base[id2 * 3] + nz * base[id2 * 3 + 2] < 0) { nx = -nx; ny = -ny; nz = -nz; }
        N[id2 * 3] = nx; N[id2 * 3 + 1] = ny; N[id2 * 3 + 2] = nz;
      }
    }
    S5.base = base; S5.N = N;
    /* eight real scratches: short nail marks, a narrow gaussian groove of
       displacement along the normal.  Short on purpose — a nail mark, not a
       gouge — so each one costs the intersection only a little.          */
    S5.sl = [];
    for (i = 0; i < 8; i++) {
      S5.sl.push({
        u: 0.06 + ctx.rnd() * 0.88, v: 0.18 + ctx.rnd() * 0.60,
        ang: ctx.rnd() * PI, len: 0.05 + ctx.rnd() * 0.10,
        w: 0.020 + ctx.rnd() * 0.014, d: 0.030 + ctx.rnd() * 0.016
      });
    }
    S5.D = new Float32Array(NU * NV);
    S5.DK = new Float32Array(8 * NU * NV);
    for (s = 0; s < 8; s++) {
      var sc = S5.sl[s], ca = Math.cos(sc.ang), sa = Math.sin(sc.ang);
      for (i = 0; i < NU; i++) {
        for (j = 0; j < NV; j++) {
          var uu = i / NU - sc.u, vv = j / (NV - 1) - sc.v;
          var ta = (uu * ca + vv * sa) / sc.len;      /* along the scratch */
          if (ta < -0.5 || ta > 0.5) continue;
          var da = -uu * sa + vv * ca;                /* across it, in uv */
          S5.DK[s * NU * NV + i * NV + j] = sc.d * Math.exp(-(da * da) / (2 * sc.w * sc.w));
        }
      }
    }
    S5.ref = s5Histogram(N, null, GAIN1);
    /* five candidates, really scored against the standard eggplant */
    S5.cand = [
      { n: "SOLANUM · TYPE SPECIMEN", c: [1.00, 1.00, 1.00], sq: [1.00, 1.00, 1.00] },
      { n: "PALE CULTIVAR", c: [1.34, 1.20, 1.06], sq: [0.94, 0.94, 1.10] },
      { n: "UNRIPE · GREEN", c: [0.72, 1.45, 0.82], sq: [1.10, 0.90, 1.00] },
      { n: "OVERRIPE · DARK", c: [0.56, 0.60, 0.72], sq: [0.88, 1.14, 0.92] },
      { n: "WAXY · LONG", c: [1.14, 0.94, 1.22], sq: [0.80, 1.24, 0.86] }
    ];
    for (i = 1; i < 5; i++) S5.cand[i].sc = s5Intersect(S5.ref, s5Histogram(N, null, S5.cand[i].c));
    S5.cand[0].sc = 1;
    /* one real indexed mesh, reshaped per candidate by its model matrix */
    var NU2 = 26, NV2 = 18, pos = [], nrm = [], idx = [];
    var b2 = new Float32Array(NU2 * NV2 * 3), q0 = [0, 0, 0];
    for (i = 0; i < NU2; i++) {
      for (j = 0; j < NV2; j++) {
        s5Base(i / NU2, j / (NV2 - 1), q0);
        var k3 = (i * NV2 + j) * 3;
        b2[k3] = q0[0]; b2[k3 + 1] = q0[1]; b2[k3 + 2] = q0[2];
      }
    }
    for (i = 0; i < NU2; i++) {
      for (j = 0; j < NV2; j++) {
        var k4 = i * NV2 + j;
        var i2 = ((i + 1) % NU2) * NV2 + j, i3 = ((i - 1 + NU2) % NU2) * NV2 + j;
        var j2 = i * NV2 + Math.min(NV2 - 1, j + 1), j3 = i * NV2 + Math.max(0, j - 1);
        var ax2 = b2[i2 * 3] - b2[i3 * 3], ay2 = b2[i2 * 3 + 1] - b2[i3 * 3 + 1], az2 = b2[i2 * 3 + 2] - b2[i3 * 3 + 2];
        var bx2 = b2[j2 * 3] - b2[j3 * 3], by2 = b2[j2 * 3 + 1] - b2[j3 * 3 + 1], bz2 = b2[j2 * 3 + 2] - b2[j3 * 3 + 2];
        var nx2 = ay2 * bz2 - az2 * by2, ny2 = az2 * bx2 - ax2 * bz2, nz2 = ax2 * by2 - ay2 * bx2;
        var l2 = Math.sqrt(nx2 * nx2 + ny2 * ny2 + nz2 * nz2) || 1;
        pos.push(b2[k4 * 3], b2[k4 * 3 + 1], b2[k4 * 3 + 2]);
        nrm.push(nx2 / l2, ny2 / l2, nz2 / l2);
      }
    }
    for (i = 0; i < NU2; i++) {
      for (j = 0; j < NV2 - 1; j++) {
        var a1 = i * NV2 + j, b1 = ((i + 1) % NU2) * NV2 + j, c1 = ((i + 1) % NU2) * NV2 + j + 1, d1 = i * NV2 + j + 1;
        idx.push(a1, b1, c1, a1, c1, d1);
      }
    }
    S5.candMesh = G.make(new Float32Array(pos), new Float32Array(nrm), new Uint16Array(idx));
    S5.qd = new Float32Array(NU * NV * 24);
    S5.qb = new Float32Array(48 * 24);
    return true;
  }
  function s5ScratchCount(t) {
    var n = 0;
    for (var i = 0; i < 8; i++) if (t >= 60.2 + i * 0.86) n = i + 1;
    return n;
  }
  function s5TopScore() {
    var m = S5.score;
    for (var i = 1; i < 5; i++) m = Math.max(m, S5.cand[i].sc);
    return m;
  }
  WEM.defineSection({
    id: "05",
    name: "EGGPLANT",
    init: s5Init,
    enter: function (ctx) { S5.panK = null; },
    draw2d: function (ctx) {
      var t = ctx.t, L = ctx.local, hud = ctx.hud, col = I.css(t), col2 = I.css2(t);
      var cam = ctx.cam, i;
      ctx.hits = t < 64.0 ? 5120 : (t < 66.8 ? 5 : 1);

      cam.reset3d(6);
      cam.fov = 0.84;
      var out = clamp((L - 9.0) / 2.6, 0, 1);
      cam.pos[0] = lerp(-0.15, 0.05, out);
      cam.pos[1] = lerp(0.28, 0.62, Ease.inOutQuad(out));
      cam.pos[2] = lerp(2.75, 3.85, Ease.inOutQuad(out));
      cam.target[0] = 0; cam.target[1] = lerp(0.02, 0.06, out); cam.target[2] = 0;

      /* ---------------- the two histograms and their overlap -------------- */
      var hb = I.card(ctx, 1336, 138, 538, 366, { title: "HISTOGRAM INTERSECTION", right: "24 BINS", head: 28, tab: "L*" });
      var bw = (hb.w - 28) / 24, q = S5.ref, c2 = S5.cur || S5.ref;
      var mx = 0.0001;
      for (i = 0; i < 24; i++) mx = Math.max(mx, Math.max(q[i], c2[i]));
      for (i = 0; i < 24; i++) {
        var x = hb.x + 14 + i * bw;
        var hq = (q[i] / mx) * 128, hc = (c2[i] / mx) * 128;
        hud.rect(x + 1, hb.y + 186 - hc, bw - 3, hc, { fill: I.hexA(col, 0.40) });
        hud.rect(x + 1, hb.y + 186 - hq, bw - 3, hq, { stroke: I.hexA(col2, 0.9), lw: 1 });
        if (i % 4 === 0) hud.line(x, hb.y + 188, x, hb.y + 194, { color: INK3 });
      }
      hud.line(hb.x + 10, hb.y + 187, hb.x + hb.w - 10, hb.y + 187, { color: INK2 });
      hud.T(hb.x + 14, hb.y + 210, "0.0", { size: 9, color: INK3 });
      hud.T(hb.x + hb.w - 14, hb.y + 210, "1.0   L*", { size: 9, color: INK3, align: "right" });
      hud.rect(hb.x + 14, hb.y + 232, 22, 8, { fill: I.hexA(col, 0.40) });
      hud.T(hb.x + 44, hb.y + 240, "CANDIDATE · " + S5.NU + "×" + S5.NV + " SURFACE SAMPLES", { size: 11, color: INK2, spacing: 0.8 });
      hud.rect(hb.x + 14, hb.y + 252, 22, 8, { stroke: I.hexA(col2, 0.9), lw: 1 });
      hud.T(hb.x + 44, hb.y + 260, "QUERY · A STANDARD EGGPLANT", { size: 11, color: INK2, spacing: 0.8 });
      hud.T(hb.x + 14, hb.y + 296, "Σ min(qᵢ, cᵢ)", { size: 16, color: INK, spacing: 0.6 });
      hud.T(hb.x + hb.w - 14, hb.y + 300, S5.score.toFixed(3), { size: 34, color: col, align: "right", weight: 600 });
      hud.T(hb.x + 14, hb.y + 324, "SCRATCHES " + pad(s5ScratchCount(t), 2) + " · EACH COSTS A LITTLE, NONE COSTS THE MATCH", {
        size: 10, color: I.hexA(col2, 0.9), spacing: 0.8
      });

      /* ---------------- the five candidates -------------------------------- */
      var lb = I.card(ctx, 46, 626, 700, 274, { title: "RESULTS", right: "EGGPLANT", head: 28 });
      for (i = 0; i < 5; i++) {
        var show = clamp((t - (64.0 + i * 0.22)) / 0.4, 0, 1);
        if (show <= 0.001) continue;
        var sc = i === 0 ? S5.score : S5.cand[i].sc;
        I.resultRow(ctx, lb.x + 14, lb.y + 34 + i * 40, lb.w - 28, S5.cand[i].n, sc,
          { alpha: show, barW: 120, bright: i === 0, size: 13 });
      }
      hud.T(lb.x + 14, lb.y + lb.h - 14,
        "CANDIDATES 5 · TOP SCORE " + s5TopScore().toFixed(3) + " · " + S5.NU + "×" + S5.NV + " SAMPLES IN 24 BINS", {
          size: 11, color: col, spacing: 1.0
        });

      hud.T(1874, 906, "2003 TOPIC MODELS · LATENT SEMANTIC INDEXING", {
        size: 10, color: INK2, alpha: 0.45, align: "right", spacing: 1.0
      });
    },
    draw3d: function (ctx) {
      var g = ctx.gfx, t = ctx.t, L = ctx.local, i, j, k;
      var NU = S5.NU, NV = S5.NV, NP = S5.NP, base = S5.base, N = S5.N;
      if (S5.panK !== 1) { S5.panK = 1; cardPanel(ctx); }
      var nSc = s5ScratchCount(t), D = S5.D, DK = S5.DK;
      for (k = 0; k < NP; k++) D[k] = 0;
      for (i = 0; i < nSc; i++) {
        var off = i * NP;
        for (k = 0; k < NP; k++) D[k] += DK[off + k];
      }
      /* the histogram is taken off the surface as it actually is right now */
      if (S5.histN !== nSc) {
        S5.cur = s5Histogram(N, D, GAIN1);
        S5.score = s5Intersect(S5.ref, S5.cur);
        S5.histN = nSc;
      }
      S5.cand[0].sc = S5.score;

      var bob = 0.020 * ctx.beat.barPulse;
      var lineUp = clamp((L - 8.6) / 2.6, 0, 1);
      var step = lineUp > 0.01 ? 2 : 1;
      var sc = lerp(1.0, 0.50, Ease.inOutQuad(lineUp));
      var cxOff = lerp(0, -1.34, Ease.inOutQuad(lineUp));
      var rotY = t * 0.22, cth = Math.cos(rotY), sth = Math.sin(rotY);
      var q = S5.qd, qi = 0, tmp = [0, 0, 0], nrm = [0, 0, 0];
      for (i = 0; i < NU; i += step) {
        for (j = 0; j < NV; j += step) {
          var id = i * NV + j;
          nrm[0] = N[id * 3]; nrm[1] = N[id * 3 + 1]; nrm[2] = N[id * 3 + 2];
          var dd = D[id];
          var px = base[id * 3] + nrm[0] * dd * 0.55;
          var py = base[id * 3 + 1] + nrm[1] * dd * 0.55;
          var pz = base[id * 3 + 2] + nrm[2] * dd * 0.55;
          px *= sc; py = py * sc + bob; pz *= sc;
          var wx = px * cth + pz * sth, wz = -px * sth + pz * cth;
          s5Colour(i / NU, j / (NV - 1), nrm, dd, GAIN1, tmp);
          var ia = ((i + 1) % NU) * NV + j, ja = i * NV + Math.min(NV - 1, j + 1);
          var ax0 = base[ia * 3] - base[id * 3], ay0 = base[ia * 3 + 1] - base[id * 3 + 1], az0 = base[ia * 3 + 2] - base[id * 3 + 2];
          var bx0 = base[ja * 3] - base[id * 3], by0 = base[ja * 3 + 1] - base[id * 3 + 1], bz0 = base[ja * 3 + 2] - base[id * 3 + 2];
          var la = Math.sqrt(ax0 * ax0 + ay0 * ay0 + az0 * az0) || 1e-4;
          var lb2 = Math.sqrt(bx0 * bx0 + by0 * by0 + bz0 * bz0) || 1e-4;
          ax0 /= la; ay0 /= la; az0 /= la;
          bx0 /= lb2; by0 /= lb2; bz0 /= lb2;
          _ax[0] = ax0 * cth + az0 * sth; _ax[1] = ay0; _ax[2] = -ax0 * sth + az0 * cth;
          _bx[0] = bx0 * cth + bz0 * sth; _bx[1] = by0; _bx[2] = -bx0 * sth + bz0 * cth;
          _rg[0] = tmp[0]; _rg[1] = tmp[1]; _rg[2] = tmp[2]; _rg[3] = 1;
          pushQuad(q, qi, wx + cxOff, py, wz, _ax, _bx, la * step * 1.18 * sc, lb2 * step * 1.18 * sc, RC_FULL, _rg);
          qi += 24;
        }
      }
      g.quads(q.subarray(0, qi), null, {});

      /* ---------------- the 24-bin ring ------------------------------------ */
      var H = S5.cur, HR = S5.ref;
      var q2 = S5.qb, qj = 0, R = 1.05;
      for (i = 0; i < 24; i++) {
        var an = i / 24 * TAU + 0.3;
        var bx2 = Math.cos(an) * R + cxOff * 0.4, bz2 = Math.sin(an) * R;
        var hgt = clamp(H[i] * 9.0, 0.005, 1.05), hq = clamp(HR[i] * 9.0, 0.005, 1.05);
        _ax[0] = -Math.sin(an); _ax[1] = 0; _ax[2] = Math.cos(an);
        _bx[0] = 0; _bx[1] = 1; _bx[2] = 0;
        _rg[0] = 0.66; _rg[1] = 0.42; _rg[2] = 0.92; _rg[3] = 0.9;
        pushQuad(q2, qj, bx2, 0.02 + hgt * 0.5, bz2, _ax, _bx, 0.055, hgt, RC_FULL, _rg);
        qj += 24;
        _rg[0] = 0.42; _rg[1] = 0.72; _rg[2] = 0.95; _rg[3] = 0.5;
        pushQuad(q2, qj, bx2, 0.02 + hq * 0.5, bz2, _ax, _bx, 0.020, hq, RC_FULL, _rg);
        qj += 24;
      }
      g.quads(q2.subarray(0, qj), null, { depthWrite: false });

      /* ---------------- the line-up ---------------------------------------- */
      if (lineUp > 0.001) {
        var xs = [-1.34, -0.67, 0, 0.67, 1.34];
        for (i = 1; i < 5; i++) {
          var ap = clamp((lineUp - 0.10 - i * 0.08) * 2.4, 0, 1);
          if (ap <= 0.001) continue;
          var M = M4.mul(M4.trans(xs[i], -0.06, -0.30), M4.rotY(t * 0.20 + i));
          M = M4.mul(M, M4.scale(0.24 * S5.cand[i].sq[0], 0.30 * S5.cand[i].sq[1], 0.24 * S5.cand[i].sq[2]));
          g.solid(S5.candMesh, M, {
            color: [0.30 * S5.cand[i].c[0], 0.14 * S5.cand[i].c[1], 0.44 * S5.cand[i].c[2]],
            alpha: ap, rim: 0.45, light: [-0.3, 1.0, 0.6]
          });
        }
        if (t > 66.4) {
          var p = ctx.util.vp(xs[0], -0.06, -0.30);
          S5.frame = [p[0], p[1], clamp((t - 66.4) / 0.5, 0, 1)];
        } else S5.frame = null;
      }
      /* the red pen ring, in screen space, over the winner */
      if (S5.frame && S5.frame[2] > 0.01) {
        var c2d = ctx.hud.fc;
        c2d.save();
        c2d.globalAlpha = S5.frame[2] * 0.9;
        c2d.strokeStyle = "rgba(255,90,84,0.95)";
        c2d.lineWidth = 3;
        c2d.strokeRect(S5.frame[0] - 46, S5.frame[1] - 74, 92, 148);
        c2d.lineWidth = 1.5;
        c2d.strokeRect(S5.frame[0] - 41, S5.frame[1] - 69, 82, 138);
        c2d.restore();
      }
    }
  });

  /* ==================================================================== 06 */
  /* I'M SEARCHING — an empty reading room.  The emptiness is the content.     */
  var S6 = { room: null, chair: null, lamp: null, stampT: 0, qd: null };
  function s6Init(ctx) {
    var B = new MeshBuilder(), box = G.box(1, 1, 1), i;
    B.add(box, 0, -0.42, 0.35, 3.70, 0.07, 1.05);          /* the reading table */
    B.add(box, -1.62, -0.86, 0.35, 0.10, 0.90, 0.92);
    B.add(box, 1.62, -0.86, 0.35, 0.10, 0.90, 0.92);
    B.add(box, -1.62, -0.46, 0.35, 0.16, 0.06, 1.00);
    B.add(box, 1.62, -0.46, 0.35, 0.16, 0.06, 1.00);
    B.add(box, 0, -1.30, 0, 11.0, 0.10, 7.0);              /* floor */
    B.add(box, 0, 0.60, -3.30, 11.0, 3.90, 0.12);          /* back wall */
    S6.room = B.build();
    var C2 = new MeshBuilder();
    C2.add(box, 0, 0.00, 0, 0.44, 0.045, 0.42);
    C2.add(box, 0, 0.30, -0.20, 0.44, 0.46, 0.045);
    C2.add(box, -0.19, -0.24, -0.18, 0.035, 0.48, 0.035);
    C2.add(box, 0.19, -0.24, -0.18, 0.035, 0.48, 0.035);
    C2.add(box, -0.19, -0.24, 0.18, 0.035, 0.48, 0.035);
    C2.add(box, 0.19, -0.24, 0.18, 0.035, 0.48, 0.035);
    S6.chair = C2.build();
    var L2 = new MeshBuilder();
    L2.add(box, 0, 0, 0, 0.10, 0.045, 2.30);               /* fluorescent housing */
    S6.lamp = L2.build();
    S6.tube = G.box(0.075, 0.012, 2.10);
    S6.qd = new Float32Array(12 * 24);
    return true;
  }
  function s6Panel(ctx) {
    var p = ctx.hud.panel(5), h = ctx.hud;
    p.clear(CARD_BG);
    h.rect(2, 98, 508, 316, { stroke: INK3, lw: 2, ctx: p.ctx });
    h.line(2, 134, 510, 134, { color: INK3, lw: 2, ctx: p.ctx });
    h.T(16, 124, "INDEX CARD", { size: 13, color: INK2, spacing: 2.4, ctx: p.ctx });
    h.T(494, 124, "№ 0412", { size: 13, color: INK3, align: "right", ctx: p.ctx });
    h.line(64, 268, 448, 268, { color: INK4, ctx: p.ctx });
    h.T(256, 250, "NO MATCH", { size: 38, color: "rgba(255,120,132,0.92)", align: "center", weight: 600, spacing: 3, ctx: p.ctx });
    h.line(64, 268, 448, 268, { color: "rgba(255,120,132,0.55)", lw: 2, ctx: p.ctx });
    h.T(256, 292, "№ 0412 · HELD OPEN", { size: 12, color: INK3, align: "center", spacing: 2, ctx: p.ctx });
  }
  WEM.defineSection({
    id: "06",
    name: "I'M SEARCHING",
    init: s6Init,
    enter: function (ctx) {
      S6.panK = null;
      /* the stamp lands on the beat that carries the line */
      var Bt = WEM.Data.beats, t0 = 68.17, i;
      for (i = 0; i < Bt.length; i++) if (Bt[i] >= t0) break;
      S6.stampT = Bt[Math.min(i, Bt.length - 1)];
    },
    draw2d: function (ctx) {
      var t = ctx.t, hud = ctx.hud, col = I.css(t);
      var cam = ctx.cam, i;
      ctx.hits = 0;

      /* one slow push from 74 s; nothing else in the frame moves */
      var push = clamp((t - 74.0) / 8.68, 0, 1);
      var e = Ease.inOutQuad(push);
      cam.reset3d(6);
      cam.fov = 0.84;
      cam.pos[0] = 0.10 - 0.08 * e;
      cam.pos[1] = 0.68 - 0.18 * e;
      cam.pos[2] = 3.60 - 1.55 * e;
      cam.target[0] = 0.10 * e;
      cam.target[1] = -0.15 - 0.10 * e;
      cam.target[2] = 0.20 - 0.30 * e;

      /* ---------------- twenty grey rows, nothing above 0.041 ------------- */
      var x0 = 1180, w = 694, y0 = 196, rh = 26;
      var scroll = ((t - 68.06) * 6.0) % rh;
      hud.T(x0, y0 - 28, "RESULTS", { size: 10, color: INK3, spacing: 2.4 });
      hud.T(x0 + w, y0 - 28, "SCORE", { size: 10, color: INK3, spacing: 2.4, align: "right" });
      hud.line(x0, y0 - 16, x0 + w, y0 - 16, { color: INK4 });
      for (i = 0; i < 20; i++) {
        var y = y0 + i * rh - scroll;
        if (y < y0 - rh || y > 762) continue;
        var fade = clamp((t - 68.4 - i * 0.05) / 0.6, 0, 1);
        if (fade <= 0.001) continue;
        I.resultRow(ctx, x0, y, w, "DOC " + pad(4100 + i * 7, 4) + " · " + s6Title(i), 0.041 - i * 0.0016,
          { alpha: 0.34 * fade, barW: 150, size: 12, color: "#9aa3ad" });
      }
      hud.T(x0, 806, "NO DOCUMENT REACHES THE RELEVANCE FLOOR 0.050", { size: 12, color: INK2, alpha: 0.5 });

      /* ---------------- the stamp ----------------------------------------- */
      var age = t - S6.stampT;
      if (age > 0) {
        var k = clamp(age / 0.34, 0, 1);
        var c = hud.fc;
        c.save();
        c.translate(700, 452);
        c.rotate(lerp(-0.42, -0.13, Ease.outCubic(k)));
        var scl = lerp(2.6, 1.0, Ease.outCubic(k));
        c.scale(scl, scl);
        c.globalAlpha = 0.92 * clamp(age / 0.12, 0, 1);
        c.strokeStyle = "rgba(255,77,94,0.95)";
        c.fillStyle = "rgba(255,77,94,0.95)";
        c.lineWidth = 4;
        c.strokeRect(-228, -62, 456, 124);
        c.lineWidth = 1.6;
        c.strokeRect(-216, -50, 432, 100);
        c.font = "700 62px " + ctx.fonts.mono;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("NO MATCH", 0, -6);
        c.font = "13px " + ctx.fonts.mono;
        c.fillText("0 RESULTS · QUERY HELD OPEN", 0, 34);
        c.restore();
      }

      hud.T(1874, 906, "2004 MAPREDUCE", {
        size: 10, color: INK2, alpha: 0.45, align: "right", spacing: 1.0
      });
    },
    draw3d: function (ctx) {
      var g = ctx.gfx, t = ctx.t, i;
      var quads = S6.qd, qi = 0;
      var nmRect = bandRect(5, 96, 416);
      if (S6.panK !== 1) { S6.panK = 1; cardPanel(ctx); s6Panel(ctx); }

      /* 1. the room: table, a row of empty chairs, ceiling tubes */
      g.solid(S6.room, M4.ident(), { color: [0.24, 0.25, 0.27], rim: 0.12, light: [0.1, 1.0, 0.3] });
      for (i = 0; i < 6; i++) {
        g.solid(S6.chair, M4.mul(M4.trans(-1.65 + i * 0.66, -0.86, -0.66), M4.rotY(0.02 * (i - 3))),
          { color: [0.22, 0.23, 0.25], rim: 0.14, light: [0.1, 1.0, 0.3] });
      }
      for (i = 0; i < 3; i++) {
        g.solid(S6.lamp, M4.trans(-1.15 + i * 1.15, 0.92, -0.20),
          { color: [0.30, 0.31, 0.33], rim: 0.10, light: [0.1, 1.0, 0.3] });
        g.solid(S6.tube, M4.trans(-1.15 + i * 1.15, 0.868, -0.20),
          { color: [0.62, 0.64, 0.66], unlit: true, emissive: 0.8, rim: 0, alpha: 0.95 });
      }

      /* 2. the cards: a slow vortex carries them off, one stays put */
      var n = 12;
      var gust = smoothstep(70.9, 72.4, t) * (1 - smoothstep(75.5, 77.0, t));
      var vx = 0.30, vz = -0.16;
      for (i = 0; i < n; i++) {
        var hx = vx + (C.h2(i * 3.7, 1.1) - 0.5) * 0.34;
        var hz = vz + (C.h2(i * 1.3, 6.2) - 0.5) * 0.24;
        var px, py, pz, th, tilt;
        if (i === 0) {
          px = vx + 0.02 * Math.sin(t * 0.3); py = -0.372; pz = vz;
          th = 0.06; tilt = 0;
        } else {
          var dx = hx - vx, dz = hz - vz, rl = Math.sqrt(dx * dx + dz * dz) || 1e-4;
          var w = gust * (0.9 + 0.5 * C.h2(i * 5.1, 2.2));
          var ang = w * (t - 70.9);                        /* the vortex integral */
          var rx = dx * Math.cos(ang) - dz * Math.sin(ang);
          var rz = dx * Math.sin(ang) + dz * Math.cos(ang);
          var rad = rl + 0.60 * gust * (0.4 + C.h2(i, 9.1));
          px = vx + rx / rl * rad;
          pz = vz + rz / rl * rad;
          py = -0.372 - gust * (0.55 + 0.9 * C.h2(i * 2.2, 4.4)) + gust * gust * 0.22;
          th = gust * C.h2(i * 7.7, 1.9) * 6.0;
          tilt = gust * (0.4 + C.h2(i, 3.3)) * 2.2;
        }
        axesFlat(th, tilt, _ax, _bx);
        var dim = i === 0 ? 0.86 : 0.86 * (1 - gust * 0.65);
        _rg[0] = dim; _rg[1] = dim; _rg[2] = dim; _rg[3] = i === 0 ? 1 : (1 - gust * 0.3);
        pushQuad(quads, qi, px, py, pz, _ax, _bx, CARD_W, CARD_H,
          i === 0 ? nmRect : CARD_BAND, _rg);
        qi += 24;
      }
      g.quads(quads.subarray(0, qi), ctx.hud.tPan, {});
    }
  });
  function s6Title(i) {
    var T = ["A MEMORY", "A TABLE", "AN EGGPLANT", "A CAT", "A STEAK", "A FLOWER", "A HUMAN",
      "A PIECE OF SHEET", "A DOG", "A TOMATO", "A BUCKET", "A CELL", "A NEIGHBOUR", "A TOKEN",
      "A SHADOW", "AN OLD SELF", "A WARM HAND", "A REWRITE", "A LONG CONTEXT", "A QUERY"];
    return T[i % T.length];
  }
})();
