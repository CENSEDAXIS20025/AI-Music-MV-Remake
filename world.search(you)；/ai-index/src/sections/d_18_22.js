/* sections 18-22 — tokens, long context, the query that learns, the happy
   searches, and the cursor that never stops blinking.

   18 BREAK US DOWN  cut a lyric into tokens, cut the tokens into cells, embed
                     every piece for real, mean-pool them for real, and print
                     cos(v̄, vᵢ) -- all of it below 1, because the merge is not
                     any of its inputs.  That inequality is the whole meaning.
   19 CALLBACK       the card wall is fed through a slot like paper through a
                     shredder, the drawers shut themselves, and what is left is
                     one endless tape and a context meter climbing to 1,050,000.
   20 LEARNED        the query rewrites itself three times; every character is
                     animated, and the score climbs 0.412 -> 0.688 -> 0.901 -> 0.997.
   21 DOG · TOMATO   a low-poly puppy and a tomato on the same table.  Three
                     real transients, one volume-preserving squeeze, juice under
                     real gravity, and the first effortless 1.000 of the film.
   22 STILL SEARCHING the empty reading room, one card, the rail's last full
                     pass, the chrome fading, and a caret that never stops.

   Drawn area is y in [120, H-150]; the query bar and the index rail belong to
   WEM.Idx.chrome.  No Math.random, no Date, no large per-frame allocation. */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, I = WEM.Idx, V = WEM.Viz;
  var clamp = C.clamp, lerp = C.lerp, Ease = C.Ease, M4 = C.M4, G = C.geo;
  var smoothstep = C.smoothstep;
  var PI = Math.PI, TAU = PI * 2;

  /* ---------------------------------------------------------------- scratch */
  /* every buffer this file needs is hoisted once, at load */
  var SL = new V.Lines(5200);
  var SQ = new V.Quads(1500);
  var SQ2 = new V.Quads(96);          /* the one textured batch (the tape) */
  var SP = new V.Points(26000);
  var mT = new Float32Array(16), mS = new Float32Array(16),
    mM = new Float32Array(16), mR = new Float32Array(16), mA = new Float32Array(16);
  var R4 = [0, 0, 0, 0], P4 = [0, 0, 0, 0], UV = [0, 0, 0, 0], Q0 = [0, 0, 0];
  var VA = [0, 0, 0], VB = [0, 0, 0];

  /* ------------------------------------------------------------- tiny utils */
  function dotN(a, b, n) { var s = 0, i; for (i = 0; i < n; i++) s += a[i] * b[i]; return s; }
  function cosN(a, b, n) { var dd = dotN(a, a, n) * dotN(b, b, n); return dd > 0 ? dotN(a, b, n) / Math.sqrt(dd) : 0; }
  function nfmt(v) { return Math.round(v).toLocaleString("en-US"); }
  function main(ctx) { return I.css(ctx.t); }
  function alt(ctx) { return I.css2(ctx.t); }
  /* the historic footnote, bottom-left of the composition area */
  function hist(ctx, x, y, s, al) {
    ctx.hud.T(x, y, s, { size: 10, color: main(ctx), alpha: 0.45, align: al || "left", spacing: 1.0 });
  }
  function bar(ctx, x, y, w, h, p, colr, a) {
    ctx.hud.rect(x, y, w, h, { fill: "rgba(238,242,246,0.10)", alpha: a });
    if (p > 0) ctx.hud.rect(x, y, w * clamp(p, 0, 1), h, { fill: colr, alpha: a });
  }
  /* the film's own caret phase, so a section caret blinks in step with chrome */
  function blink(ctx) { return (Math.sin(ctx.t * 6.0) > -0.2) ? 1 : 0.15; }
  /* UV sub-rect inside a hud panel: rect runs [u0, vBottom, u1, vTop] */
  function irect(p, cx, cy, cw, ch, out) {
    var u0 = p.u0 + (cx / p.w) * (p.u1 - p.u0), u1 = p.u0 + ((cx + cw) / p.w) * (p.u1 - p.u0);
    var vT = p.v0 + (cy / p.h) * (p.v1 - p.v0), vB = p.v0 + ((cy + ch) / p.h) * (p.v1 - p.v0);
    out[0] = u0; out[1] = vB; out[2] = u1; out[3] = vT;
    return out;
  }
  /* T * R * S, no allocation: used for every card that lies at an angle */
  function place(x, y, z, rotX, scx, scy, out) {
    M4.rotX(rotX, mR);
    M4.scale(scx, scy, 1, mS);
    M4.mul(mR, mS, mA);
    M4.trans(x, y, z, mT);
    return M4.mul(mT, mA, out);
  }

  /* ======================================================================= */
  /* 18 · BREAK US DOWN -- 221.030 - 233.800                                 */
  /*   0.0 - 4.6 s  the sentence is tokenised, each token lifts out as a card */
  /*   4.6 - 9.0 s  every card breaks into grapheme cells, each embedded      */
  /*   9.1 -12.8 s  real mean pooling, lines to the centre, cos table         */
  /* ======================================================================= */
  var S18 = {
    ready: false, panDone: false, tokPanel: 0, glyphPanel: 1,
    line: "each one of us has a bucket of love",
    toks: [], cells: [], dim: 12, model: null, terms: 0,
    TV: [], pool: null, cosT: [], cosCellTok: 0,
    ax: [], ev: [0, 0, 0], P: [], T: [], POOLP: null, CELLP: null,
    maxI: 0, maxC: 0, minC: 1, meanC: 0, nTrained: 0, nHashed: 0, evr: [0, 0, 0],
    glyphOf: {}, glyphList: [], adv20: 12, tokP: null, glyphP: null, meanNorm: 1,
    cellCount: 0
  };

  S18.build = function (ctx) {
    var S = S18, i, d, a, b;
    S.ready = true;

    /* ---- 1. a real word-level tokenizer over the line -------------------- */
    var re = /[A-Za-z0-9']+|[^\sA-Za-z0-9']/g, m, toks = [];
    while ((m = re.exec(S.line))) {
      if (!/[A-Za-z0-9']/.test(m[0])) continue;      /* this line has no punctuation */
      toks.push({ s: m[0], i0: m.index, i1: m.index + m[0].length });
    }
    S.toks = toks;

    /* ---- 2. the embedding source: the film's own trained model ----------- */
    var M = null;
    try { if (WEM.Model && WEM.Model.build) M = WEM.Model.build(ctx); } catch (e) { M = null; }
    S.model = M;
    var dim = (M && M.dim) || 12;
    S.dim = dim;
    var vidx = {};
    if (M) { for (i = 0; i < M.V; i++) vidx[M.vocab[i]] = i; S.terms = M.V; }
    var meanNorm = 1;
    if (M) {
      var s0 = 0;
      for (i = 0; i < M.V; i++) {
        var L0 = 0;
        for (d = 0; d < dim; d++) { var x0 = M.E[i * dim + d]; L0 += x0 * x0; }
        s0 += Math.sqrt(L0);
      }
      meanNorm = M.V ? s0 / M.V : 1;
    }
    S.meanNorm = meanNorm;

    /* feature hashing (the "hashing trick"): unigrams + bigrams + trigrams,
       four signed hash functions each, L2-normalised onto the model's shell --
       a deterministic vector for ANY string, including a single letter */
    function hashEmb(str, out) {
      var d2, n, k, sd, g, h, bkt, L;
      for (d2 = 0; d2 < dim; d2++) out[d2] = 0;
      var st = "^" + str.toLowerCase() + "$";
      for (n = 1; n <= 3; n++) {
        for (k = 0; k + n <= st.length; k++) {
          g = 0;
          for (var q = 0; q < n; q++) g = (g * 131 + st.charCodeAt(k + q)) % 2147483647;
          for (sd = 0; sd < 4; sd++) {
            h = Math.imul(g ^ Math.imul(sd + 1, 0x9E3779B1), 0x85EBCA6B) >>> 0;
            bkt = h % dim;
            out[bkt] += ((h >>> 31) & 1) ? 1 : -1;
          }
        }
      }
      L = 0;
      for (d2 = 0; d2 < dim; d2++) L += out[d2] * out[d2];
      L = Math.sqrt(L) || 1;
      for (d2 = 0; d2 < dim; d2++) out[d2] = out[d2] / L * meanNorm;
      return out;
    }

    /* ---- 3. token vectors: the trained row, or the hashed fallback ------- */
    var n = toks.length, TV = [];
    for (i = 0; i < n; i++) {
      var v = new Float32Array(dim), id = vidx[toks[i].s];
      if (M && id !== undefined) { for (d = 0; d < dim; d++) v[d] = M.E[id * dim + d]; S.nTrained++; }
      else { hashEmb(toks[i].s, v); S.nHashed++; }
      TV.push(v);
    }
    S.TV = TV;

    /* the merge itself: v̄ = (1/n) Σ vᵢ */
    var pool = new Float32Array(dim);
    for (i = 0; i < n; i++) for (d = 0; d < dim; d++) pool[d] += TV[i][d] / n;
    S.pool = pool;

    /* the cells: every character embedded in its own 3-character window */
    var cells = [];
    for (i = 0; i < n; i++) {
      var tk = toks[i].s, pd = "^" + tk + "$";
      for (var k = 0; k < tk.length; k++) {
        var cv = new Float32Array(dim);
        hashEmb(pd.slice(k, k + 3), cv);
        cells.push({ ch: tk[k], ti: i, k: k, v: cv, win: pd.slice(k, k + 3) });
        var up = tk[k].toUpperCase();
        if (S.glyphOf[up] === undefined) { S.glyphOf[up] = S.glyphList.length; S.glyphList.push(up); }
      }
    }
    S.cells = cells;
    S.cellCount = cells.length;
    var cpool = new Float32Array(dim);
    for (i = 0; i < cells.length; i++) for (d = 0; d < dim; d++) cpool[d] += cells[i].v[d] / cells.length;
    S.cosCellTok = cosN(pool, cpool, dim);

    /* the concentration table: cos(v̄, vᵢ) for every input token */
    var cs = [], mx = -2, mn = 2, sum = 0;
    for (i = 0; i < n; i++) {
      cs.push(cosN(pool, TV[i], dim));
      if (cs[i] > mx) { mx = cs[i]; S.maxI = i; }
      if (cs[i] < mn) mn = cs[i];
      sum += cs[i];
    }
    S.cosT = cs; S.maxC = mx; S.minC = mn; S.meanC = sum / n;

    /* ---- 4. a real 3-component PCA of the 9 token vectors ---------------- */
    var mu = new Float32Array(dim);
    for (i = 0; i < n; i++) for (d = 0; d < dim; d++) mu[d] += TV[i][d] / n;
    var Cov = new Float32Array(dim * dim);
    for (i = 0; i < n; i++) {
      var cc = new Float32Array(dim);
      for (d = 0; d < dim; d++) cc[d] = TV[i][d] - mu[d];
      for (a = 0; a < dim; a++) for (b = a; b < dim; b++) Cov[a * dim + b] += cc[a] * cc[b];
    }
    for (a = 0; a < dim; a++) for (b = a + 1; b < dim; b++) Cov[b * dim + a] = Cov[a * dim + b];
    var rr = C.rng(0x18A7);
    for (var kc = 0; kc < 3; kc++) {
      var ev0 = new Float32Array(dim);
      for (d = 0; d < dim; d++) ev0[d] = rr() - 0.5;
      for (var it = 0; it < 90; it++) {
        var nx = new Float32Array(dim);
        for (a = 0; a < dim; a++) { var s2 = 0; for (b = 0; b < dim; b++) s2 += Cov[a * dim + b] * ev0[b]; nx[a] = s2; }
        for (var c2 = 0; c2 < kc; c2++) {
          var dp = dotN(nx, S18.ax[c2], dim);
          for (d = 0; d < dim; d++) nx[d] -= dp * S18.ax[c2][d];
        }
        var L2 = 0;
        for (d = 0; d < dim; d++) L2 += nx[d] * nx[d];
        L2 = Math.sqrt(L2) || 1;
        for (d = 0; d < dim; d++) ev0[d] = nx[d] / L2;
      }
      var lam = 0;
      for (a = 0; a < dim; a++) { var s3 = 0; for (b = 0; b < dim; b++) s3 += Cov[a * dim + b] * ev0[b]; lam += ev0[a] * s3; }
      S18.ax.push(ev0); S18.ev[kc] = lam;
    }
    var evt = S18.ev[0] + S18.ev[1] + S18.ev[2] || 1;
    S.evr = [S18.ev[0] / evt, S18.ev[1] / evt, S18.ev[2] / evt];

    function proj(vec, out) {
      out[0] = dotN(vec, S18.ax[0], dim);
      out[1] = dotN(vec, S18.ax[1], dim);
      out[2] = dotN(vec, S18.ax[2], dim);
      return out;
    }

    /* per-axis extents, so all three components are visible */
    var ex = [1e-6, 1e-6, 1e-6];
    for (i = 0; i < n; i++) {
      proj(TV[i], P4);
      for (d = 0; d < 3; d++) ex[d] = Math.max(ex[d], Math.abs(P4[d]));
    }
    var SC = [1.95, 1.42, 0.85];
    var P = [], T = [];
    for (i = 0; i < n; i++) {
      proj(TV[i], P4);
      T.push([P4[0] / ex[0] * SC[0], P4[1] / ex[1] * SC[1], P4[2] / ex[2] * SC[2]]);
    }
    for (i = 0; i < n; i++) {
      P.push([T[i][0] + (C.h2(i, 3.1) - 0.5) * 0.02,
        T[i][1] + (C.h2(i, 7.7) - 0.5) * 0.02,
        T[i][2] + (C.h2(i, 11.3) - 0.5) * 0.02]);
    }
    /* a real relaxation: repulsion between slides + a spring back to the PCA
       target, run 120 times here so the layout is stable and reproducible */
    for (var it2 = 0; it2 < 120; it2++) {
      for (a = 0; a < n; a++) for (b = a + 1; b < n; b++) {
        var dx = P[b][0] - P[a][0], dy = P[b][1] - P[a][1], dz = P[b][2] - P[a][2];
        var dd = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-4;
        if (dd < 0.80) {
          var pu = (0.80 - dd) * 0.55 / dd;
          P[a][0] -= dx * pu; P[a][1] -= dy * pu; P[a][2] -= dz * pu;
          P[b][0] += dx * pu; P[b][1] += dy * pu; P[b][2] += dz * pu;
        }
      }
      for (a = 0; a < n; a++) for (d = 0; d < 3; d++) {
        var st = (T[a][d] - P[a][d]) * 0.05;
        P[a][d] += clamp(st, -0.12, 0.12);
      }
    }
    S.P = P; S.T = T;

    /* the pooled vector projected onto the same axes: by linearity it lands
       exactly on the centroid of the nine projected tokens */
    var cent = [0, 0, 0];
    for (i = 0; i < n; i++) for (d = 0; d < 3; d++) cent[d] += T[i][d] / n;
    S.CENT = cent;
    proj(pool, P4);
    S.POOLP = [P4[0] / ex[0] * SC[0], P4[1] / ex[1] * SC[1], P4[2] / ex[2] * SC[2]];
    proj(cpool, P4);
    S.CELLP = [P4[0] / ex[0] * SC[0], P4[1] / ex[1] * SC[1], P4[2] / ex[2] * SC[2]];

    /* the sentence strip is laid out in real character offsets */
    var fc = ctx.hud.fc;
    fc.save(); fc.font = ctx.hud.fontStr(20, "mono"); S.adv20 = fc.measureText("0").width; fc.restore();
  };

  /* the specimen atlases: two panels, drawn once per entry (the atlas is only
     re-uploaded when a panel is written, so this is not a per-frame cost) */
  S18.panels = function (ctx) {
    var S = S18, hud = ctx.hud, i, d;
    var p = hud.panel(S.tokPanel);
    p.clear(); S.tokP = p;
    for (i = 0; i < S.toks.length; i++) {
      var gx = (i % 3) * 170, gy = ((i / 3) | 0) * 170;
      hud.rect(gx + 4, gy + 4, 162, 162, { stroke: "rgba(238,242,246,0.40)", lw: 1, ctx: p.ctx });
      hud.rect(gx + 5, gy + 40, 160, 1, { fill: "rgba(238,242,246,0.20)", ctx: p.ctx });
      hud.T(gx + 13, gy + 29, "#" + (i + 1), { size: 14, color: "#9aa3ad", ctx: p.ctx, spacing: 1.2 });
      hud.T(gx + 150, gy + 29, "TOKEN", { size: 10, color: "#5b636c", ctx: p.ctx, align: "right", spacing: 1.6 });
      hud.T(gx + 85, gy + 94, S.toks[i].s.toUpperCase(), { size: 30, color: "#eef2f6", align: "center", weight: 600, ctx: p.ctx });
      var v = S.TV[i], base = gy + 140;
      hud.line(gx + 16, base, gx + 154, base, { color: "rgba(238,242,246,0.20)", ctx: p.ctx });
      for (d = 0; d < S.dim; d++) {
        var hgt = clamp(v[d] / 6.5, -1, 1) * 22;
        hud.rect(gx + 18 + d * 11, base - Math.max(hgt, 0), 6, Math.abs(hgt) + 1.5,
          { fill: d === 0 ? "rgba(53,224,255,0.85)" : "rgba(238,242,246,0.50)", ctx: p.ctx });
      }
    }
    var q = hud.panel(S.glyphPanel);
    q.clear(); S.glyphP = q;
    for (i = 0; i < S.glyphList.length; i++) {
      var hx = (i % 4) * 128, hy = ((i / 4) | 0) * 128;
      hud.rect(hx + 6, hy + 6, 116, 116, { stroke: "rgba(238,242,246,0.30)", lw: 1, ctx: q.ctx });
      hud.T(hx + 64, hy + 90, S.glyphList[i], { size: 62, color: "#eef2f6", align: "center", weight: 600, ctx: q.ctx });
      hud.T(hx + 16, hy + 28, String(i + 1), { size: 12, color: "#5b636c", ctx: q.ctx });
    }
  };

  S18.hud = function (ctx) {
    var S = S18, hud = ctx.hud, l = ctx.local;
    if (!S.ready) return;
    if (!S.panDone) { S.panels(ctx); S.panDone = true; }
    var col = main(ctx), col2 = alt(ctx), red = "#ff4d5e", i;
    ctx.hits = Math.max(1, 12 - Math.floor(smoothstep(0.4, 11.4, l) * 11));

    /* camera: a flat-on view of the specimen cluster (set here, not in draw3d) */
    var cam = ctx.cam;
    cam.mode = "persp"; cam.fov = 0.9; cam.near = 0.05; cam.far = 200; cam.roll = 0;
    cam.up[0] = 0; cam.up[1] = 1; cam.up[2] = 0;
    cam.pos[0] = 0; cam.pos[1] = -0.10; cam.pos[2] = 8.4;
    cam.target[0] = 0; cam.target[1] = -0.16; cam.target[2] = 0;

    /* ---- the sentence, being cut, in real character offsets -------------- */
    var sy = 152, adv = S.adv20, x0 = 960 - S.line.length * adv * 0.5;
    for (i = 0; i < S.toks.length; i++) {
      var tk = S.toks[i];
      var e = clamp((l - 0.5 - i * 0.30) / 0.85, 0, 1), ee = Ease.outCubic(e);
      hud.T(x0 + tk.i0 * adv, sy - 30 * ee, tk.s, { size: 20, color: "#eef2f6", alpha: 1 - 0.92 * ee, spacing: 0.4 });
      var mu = clamp((l - 0.25 - i * 0.30) / 0.45, 0, 1);
      if (mu > 0) {
        var mx = x0 + tk.i0 * adv - adv * 0.5;
        var my = sy - 40 + 52 * Ease.outCubic(clamp(mu, 0, 1));
        hud.line(mx, my - 13, mx, my + 5, { color: col, lw: 1.5, alpha: 1 - 0.55 * mu });
      }
    }
    hud.line(x0 - 18, sy + 14, x0 + S.line.length * adv + 18, sy + 14, { color: "rgba(238,242,246,0.20)" });
    hud.T(x0 - 18, sy - 26, "SOURCE LINE · 36 CHARS", { size: 9, color: col, alpha: 0.75, spacing: 1.6 });
    hud.T(x0 + S.line.length * adv + 18, sy - 26, S.toks.length + " TOKENS", { size: 9, color: col, alpha: 0.75, spacing: 1.6, align: "right" });

    /* ---- left: the token list with its real 12-d vectors ----------------- */
    I.card(ctx, 46, 196, 420, 452, { title: "TOKENIZER", right: "n = " + S.toks.length, tab: "18" });
    var ry = 196 + 52;
    for (i = 0; i < S.toks.length; i++) {
      var yy = ry + i * 40;
      hud.T(62, yy, S.toks[i].s, { size: 15, color: i === S.maxI ? "#eef2f6" : "#c3cad2", alpha: 0.95 });
      hud.T(150, yy, "[" + S.toks[i].i0 + "," + S.toks[i].i1 + ")", { size: 9, color: "#5b636c", alpha: 0.9 });
      var v = S.TV[i];
      hud.line(196, yy + 4, 316, yy + 4, { color: "rgba(238,242,246,0.14)" });
      for (var d = 0; d < S.dim; d++) {
        var hh = clamp(v[d] / 6.5, -1, 1) * 11;
        hud.rect(198 + d * 10, yy + 4 - Math.max(hh, 0), 5, Math.abs(hh) + 1,
          { fill: d === 0 ? "rgba(53,224,255,0.85)" : "rgba(238,242,246,0.50)" });
      }
      hud.T(444, yy - 6, S.cosT[i].toFixed(3), { size: 11, color: col, alpha: 0.95, align: "right" });
      hud.T(444, yy + 8, "cos", { size: 8, color: "#5b636c", align: "right", spacing: 1 });
    }
    hud.T(62, 196 + 452 - 14, (S.nTrained + S.nHashed) + " PIECES · " + S.dim + "-d · " + S.nTrained + " TRAINED ROWS · " + S.nHashed + " HASHED",
      { size: 10, color: col2, alpha: 0.8, spacing: 0.6 });

    /* ---- middle: the pooling formula, and what the axes are -------------- */
    hud.formula(960, 250, "\\bar{v} = \\frac{1}{n}\\sum_{i=1}^{n} v_i", { size: 26, color: col, align: "center" });
    hud.T(960, 274, "MEAN POOL OVER " + S.toks.length + " TOKEN VECTORS", { size: 9, color: "#9aa3ad", align: "center", spacing: 2.0 });
    hud.T(960, 302, "PCA " + (S.evr[0] * 100).toFixed(1) + "% · " + (S.evr[1] * 100).toFixed(1) + "% · " + (S.evr[2] * 100).toFixed(1) +
      "%   (3 OF " + S.dim + " AXES)", { size: 11, color: col2, align: "center", alpha: 0.9 });
    hud.T(960, 322, S.toks.length + " TOKENS → " + S.cellCount + " CELLS → 1 POOL   ·   " + S.terms + " TERMS IN THE MODEL",
      { size: 11, color: "#c3cad2", align: "center", alpha: 0.85 });

    /* ---- right: the concentration table --------------------------------- */
    var cx = 1284, cw = 590;
    I.card(ctx, cx, 196, cw, 372, { title: "CONCENTRATION", right: "cos(v̄, vᵢ)", tab: "POOL" });
    for (i = 0; i < S.toks.length; i++) {
      var ry2 = 196 + 66 + i * 31, cc = S.cosT[i], hot = i === S.maxI;
      hud.T(cx + 18, ry2, S.toks[i].s, { size: 13, color: hot ? "#eef2f6" : "#c3cad2", alpha: 0.95 });
      bar(ctx, cx + 132, ry2 - 9, 186, 7, cc, hot ? col : col2, 0.9);
      hud.T(cx + 330, ry2, cc.toFixed(4), { size: 12, color: col, alpha: 0.95 });
      if (hot) hud.T(cx + 394, ry2, "MOST SIMILAR", { size: 9, color: red, alpha: 0.95, spacing: 1.3 });
    }
    hud.T(cx + 18, 196 + 372 - 14, "THE TWO \"of\" ROWS ARE THE SAME VECTOR — AND STILL BELOW 1",
      { size: 9, color: "#9aa3ad", spacing: 0.8 });
    hud.T(cx, 610, "MERGED ≠ ANY INPUT", { size: 25, color: red, weight: 700, spacing: 1.8 });
    hud.T(cx, 640, "MAX cos(v̄, vᵢ) = " + S.maxC.toFixed(4) + "      cos(v̄, v̄) = 1.0000", { size: 13, color: "#c3cad2", alpha: 0.92 });
    hud.T(cx, 662, "RANGE " + S.minC.toFixed(3) + " – " + S.maxC.toFixed(3) + " · MEAN " + S.meanC.toFixed(3) +
      " · cos(v̄tok, v̄cell) " + S.cosCellTok.toFixed(3), { size: 11, color: col2, alpha: 0.85 });

    /* ---- the meaning of the section, in 44 px ---------------------------- */
    var app = smoothstep(9.0, 10.6, l);
    hud.T(960, 884, "we have evolved now", { size: 44, font: "ui", weight: 600, color: "#eef2f6", align: "center", alpha: 0.45 + 0.5 * app, spacing: 1.0 });
    hud.T(960, 908, "THE MERGED VECTOR IS NOT ANY ONE OF US — IT IS WHAT WE BECAME",
      { size: 10, color: col2, align: "center", alpha: 0.5 * app, spacing: 1.6 });

    hist(ctx, 46, 908, "2023 EMBEDDINGS EVERYWHERE · TOKENIZATION · POOLING");
  };

  S18.scene = function (ctx) {
    var S = S18, gfx = ctx.gfx, l = ctx.local, i, d;
    if (!S.ready) return;
    var col = I.rgbA(main(ctx), 1), col2 = I.rgbA(alt(ctx), 1), red = I.rgbA("#ff4d5e", 1);
    var cut = smoothstep(0.3, 4.6, l);         /* the sentence leaves the strip */
    var cell = smoothstep(4.6, 8.6, l);        /* the cards break into cells   */
    var merge = smoothstep(9.0, 10.8, l);      /* the pool appears             */
    var cellMerge = smoothstep(11.0, 12.2, l); /* the cell-level pool          */
    var n = S.toks.length;
    SL.clear(); SQ.clear();

    /* --- token slides ----------------------------------------------------- */
    var tp = S.tokP;
    for (i = 0; i < n; i++) {
      var u = clamp((l - 0.5 - i * 0.30) / 0.9, 0, 1), e = Ease.outCubic(u);
      var fx = -2.5 + i * 0.62, fy = 2.05;
      var px = lerp(fx, S.P[i][0], e), py = lerp(fy, S.P[i][1], e) + 0.45 * (4 * e * (1 - e));
      var pz = lerp(0.8, S.P[i][2], e);
      var sc = lerp(0.34, 0.62, e) * (1 - 0.42 * cell);
      var al = clamp(e * 1.2, 0, 1) * (1 - 0.55 * cell) * (1 - 0.5 * merge);
      if (al <= 0.02 || !tp) continue;
      var rc = irect(tp, (i % 3) * 170, ((i / 3) | 0) * 170, 170, 170, UV);
      M4.mul(M4.trans(px, py, pz, mT), M4.scale(sc, sc, 1, mS), mM);
      SQ.add(mM, rc, [col2[0], col2[1], col2[2], al]);
    }
    /* --- grapheme cells --------------------------------------------------- */
    var gp = S.glyphP;
    if (gp) {
      for (i = 0; i < S.cells.length; i++) {
        var cl = S.cells[i], ti = cl.ti;
        var ut = clamp((l - 0.5 - ti * 0.30) / 0.9, 0, 1);
        var uc = clamp((l - 5.0 - i * 0.05) / 1.1, 0, 1), ec = Ease.outCubic(uc);
        if (uc <= 0) continue;
        var tokn = S.P[ti];
        var q0 = Q0;
        q0[0] = dotN(cl.v, S18.ax[0], S.dim) * 0.16;
        q0[1] = dotN(cl.v, S18.ax[1], S.dim) * 0.16;
        q0[2] = dotN(cl.v, S18.ax[2], S.dim) * 0.10;
        var spread2 = 0.42 + 0.16 * (1 - ec);
        var tx = tokn[0] + q0[0] * spread2 + (C.h2(i, 1.7) - 0.5) * 0.30;
        var ty = tokn[1] + q0[1] * spread2 + (C.h2(i, 4.3) - 0.5) * 0.30;
        var tz = tokn[2] + q0[2] * spread2 + (C.h2(i, 8.9) - 0.5) * 0.24;
        var sx0 = -2.5 + ti * 0.62, sy0 = 2.05;
        var cx2 = lerp(lerp(sx0, tokn[0], Ease.outCubic(ut)), tx, ec);
        var cy2 = lerp(lerp(sy0, tokn[1], Ease.outCubic(ut)), ty, ec);
        var cz2 = lerp(lerp(0.8, tokn[2], Ease.outCubic(ut)), tz, ec);
        var gslot = S.glyphOf[cl.ch.toUpperCase()];
        if (gslot === undefined) continue;
        var rc2 = irect(gp, (gslot % 4) * 128, ((gslot / 4) | 0) * 128, 128, 128, UV);
        var sz = 0.24 * (1 - 0.5 * cellMerge);
        M4.mul(M4.trans(cx2, cy2, cz2, mT), M4.scale(sz, sz, 1, mS), mM);
        SQ.add(mM, rc2, [col2[0], col2[1], col2[2], clamp(uc * 1.3, 0, 1) * (1 - 0.6 * cellMerge)]);
        /* the cell remembers which token it came from */
        if (uc < 1 && uc > 0.02) {
          SL.seg(cx2, cy2, cz2, tokn[0], tokn[1], tokn[2], col2, 1.0, 0.30 * (1 - uc));
        }
      }
    }
    /* --- the merge: every input draws a line to the pooled centre --------- */
    if (merge > 0.01) {
      var C0 = S.POOLP;
      for (i = 0; i < n; i++) {
        var w = 1.2 + 2.2 * clamp(S.cosT[i], 0, 1);
        SL.seg(S.P[i][0], S.P[i][1], S.P[i][2], C0[0], C0[1], C0[2], col, w, 0.55 * merge);
      }
      if (cellMerge > 0.01) {
        var C1 = S.CELLP;
        for (i = 0; i < S.cells.length; i += 2) {
          var cl2 = S.cells[i], tn = S.P[cl2.ti];
          SL.seg(tn[0], tn[1], tn[2], C1[0], C1[1], C1[2], col2, 0.9, 0.16 * cellMerge);
        }
      }
      /* the centre is circled in red pen, and the cell-level pool in cyan */
      ring(SL, C0, 0.44 * (0.6 + 0.4 * merge), merge, red, 2.2);
      if (cellMerge > 0.01) ring(SL, C1, 0.34 * cellMerge, cellMerge, col2, 1.4);
    }
    /* --- the cards themselves -------------------------------------------- */
    if (SQ.n) {
      var tex = ctx.hud.tPan;
      if (tex) gfx.quads(SQ.view(), tex, {});
      else gfx.quads(SQ.view(), null, {});
    }
    if (SL.n) SL.draw(gfx, { add: false, depthWrite: false, glow: 0 });
    /* --- the two centres, labelled in place ------------------------------- */
    if (merge > 0.02) {
      var c0 = S.POOLP, sp = ctx.util.vp(c0[0], c0[1], c0[2]);
      ctx.hud.T(sp[0], sp[1] - 30, "v̄", { size: 22, font: "math", color: "#eef2f6", align: "center", alpha: merge });
      ctx.hud.T(sp[0], sp[1] + 46, "n = 9 → 1", { size: 10, color: "#ff4d5e", align: "center", alpha: 0.9 * merge, spacing: 1.4 });
    }
    if (cellMerge > 0.02) {
      var c1 = S.CELLP, sp2 = ctx.util.vp(c1[0], c1[1], c1[2]);
      ctx.hud.T(sp2[0], sp2[1] + 30, "CELL POOL " + S.cosCellTok.toFixed(3), { size: 10, color: alt(ctx), align: "center", alpha: 0.9 * cellMerge, spacing: 1.2 });
    }
  };

  /* a red-pen circle drawn in 3D around a point */
  function ring(lines, c, r, a, col, w) {
    var N = 40, i, x0, y0, x1, y1;
    for (i = 0; i < N; i++) {
      var t0 = i / N * TAU, t1 = (i + 1) / N * TAU;
      var rr0 = r * (0.94 + 0.06 * C.noise2(i * 0.7, 3.1));
      var rr1 = r * (0.94 + 0.06 * C.noise2((i + 1) * 0.7, 3.1));
      x0 = c[0] + Math.cos(t0) * rr0; y0 = c[1] + Math.sin(t0) * rr0;
      x1 = c[0] + Math.cos(t1) * rr1; y1 = c[1] + Math.sin(t1) * rr1;
      lines.seg(x0, y0, c[2] + 0.02, x1, y1, c[2] + 0.02, col, w, a * 0.9);
    }
  }

  WEM.defineSection({
    id: "18",
    name: "BREAK US DOWN",
    init: function (ctx) { S18.build(ctx); },
    enter: function (ctx) { S18.panDone = false; },
    draw2d: function (ctx) { S18.hud(ctx); },
    draw3d: function (ctx) { S18.scene(ctx); }
  });

  /* ======================================================================= */
  /* 19 · CALLBACK -- 233.800 - 261.210  (27 s of instrumental)               */
  /*   the 960-card wall is fed through a long thin slot like paper through a  */
  /*   shredder, the catalogue drawers shut themselves one by one, and what is */
  /*   left is one endless tape of token marks.  Quiet, ordered, irreversible. */
  /* ======================================================================= */
  var S19 = {
    ready: false, tapeTex: null,
    COLS: 40, ROWS: 24, N: 960, DRAWERS: 6,
    cards: null, tau: null, jit: null
  };

  /* the context window: the real historical sizes, climbed in log space */
  var LOG_A = Math.log(2048), LOG_B = Math.log(128000), LOG_C = Math.log(1050000);
  S19.tokens = function (l) {
    if (l <= 2.6) return 2048;
    if (l < 10.6) return Math.exp(lerp(LOG_A, LOG_B, Ease.inOutCubic((l - 2.6) / 8.0)));
    if (l <= 14.0) return 128000;
    if (l < 21.5) return Math.exp(lerp(LOG_B, LOG_C, Ease.inOutCubic((l - 14.0) / 7.5)));
    return 1050000;
  };
  /* how much of the index has actually gone past the slot: a monotone
     accumulation towards 2^20 -- which is also segment 01's candidate count */
  S19.swallowed = function (l) { return 1048576 * Ease.inOutCubic(clamp(l / 26.0, 0, 1)); };
  S19.readRate = function (l) {
    var h = 0.25, a = S19.swallowed(Math.max(0, l - h)), b = S19.swallowed(l + h);
    return (b - a) / (2 * h);
  };
  /* the feed schedule is a real time base: card j starts at tau_j and takes
     1.4 s, later cards are spaced further apart (they move slower) */
  S19.tauOf = function (j) { return Math.pow(j / (S19.N - 1), 0.9) * 11.6; };
  S19.fedCount = function (l) {
    if (l <= 0) return 0;
    if (l >= 13.0) return S19.N;
    return Math.min(S19.N, Math.floor(Math.pow(l / 11.6, 1 / 0.9) * (S19.N - 1)) + 1);
  };
  S19.drawerT = function (i) { return 3.0 + i * 1.62; };

  /* the tape path: a long strip crossing the whole frame, both ends off it */
  function tapePt(s, out) {
    out[0] = -9.5 + s * 20.5;
    out[1] = -1.50 + 0.78 * s * s;
    out[2] = 2.45 - 2.0 * s;
    return out;
  }

  S19.build = function (ctx) {
    var S = S19, i, c, r;
    S.ready = true;
    S.cards = new Float32Array(S.N * 3);
    S.tau = new Float32Array(S.N);
    S.jit = new Float32Array(S.N);
    var j;
    for (r = 0; r < S.ROWS; r++) {
      for (c = 0; c < S.COLS; c++) {
        /* the wall empties bottom row first, left to right: reading order */
        j = (S.ROWS - 1 - r) * S.COLS + c;
        S.cards[j * 3] = (c - (S.COLS - 1) * 0.5) * 0.27;
        S.cards[j * 3 + 1] = 0.15 + ((S.ROWS - 1) * 0.5 - r) * 0.20;
        S.cards[j * 3 + 2] = -0.35 + C.h2(c * 3.7 + 1.3, r * 1.9 + 4.1) * 0.7;
        S.tau[j] = S.tauOf(j);
        S.jit[j] = C.h2(j * 0.37, 91.7);
      }
    }
    /* the tape texture: token marks printed on a long strip (authored dark) */
    try {
      var cvs = document.createElement("canvas");
      cvs.width = 512; cvs.height = 64;
      var g2 = cvs.getContext("2d");
      g2.fillStyle = "#0c0f13"; g2.fillRect(0, 0, 512, 64);
      g2.strokeStyle = "rgba(238,242,246,0.09)";
      for (i = 1; i < 5; i++) { g2.beginPath(); g2.moveTo(0, i * 12.8 + 0.5); g2.lineTo(512, i * 12.8 + 0.5); g2.stroke(); }
      var rr = C.rng(0x7A9E);
      for (i = 0; i < 150; i++) {
        var mx = 2 + Math.floor(rr() * 500), my = 5 + Math.floor(rr() * 4) * 12.8;
        var mw = 3 + Math.floor(rr() * 9);
        if (mx + mw > 510) mw = 510 - mx;
        g2.fillStyle = "rgba(230,238,246," + (0.30 + 0.55 * rr()).toFixed(2) + ")";
        g2.fillRect(mx, my, mw, 3.4);
      }
      /* a few taller marks, so the strip reads as words, not as noise */
      for (i = 0; i < 22; i++) {
        var wx = 4 + Math.floor(rr() * 480), wy = 8 + Math.floor(rr() * 3) * 12.8;
        g2.fillStyle = "rgba(240,246,252,0.75)";
        g2.fillRect(wx, wy, 2 + Math.floor(rr() * 5), 8);
      }
      S.tapeTex = ctx.res.tex("s19_tape", { canvas: cvs, wrap: ctx.gl.REPEAT, filter: ctx.gl.LINEAR });
    } catch (e) { S.tapeTex = null; }
  };

  S19.hud = function (ctx) {
    var S = S19, hud = ctx.hud, l = ctx.local, t = ctx.t;
    if (!S.ready) return;
    var col = main(ctx), col2 = alt(ctx), i;

    /* camera: flat on the wall, the slot low and in front (set in draw2d) */
    var cam = ctx.cam;
    cam.mode = "persp"; cam.fov = 0.9; cam.near = 0.05; cam.far = 260; cam.roll = 0;
    cam.up[0] = 0; cam.up[1] = 1; cam.up[2] = 0;
    cam.pos[0] = 0; cam.pos[1] = 0.35; cam.pos[2] = 9.5;
    cam.target[0] = 0; cam.target[1] = -0.05; cam.target[2] = 0;

    var tok = S19.tokens(l), sw = S19.swallowed(l), rate = S19.readRate(l);
    ctx.hits = 1;
    I.queryBar(ctx, {
      text: ctx.lyric ? String(ctx.lyric.text) : "",
      hits: 1, note: "IN CONTEXT", prog: clamp(l / 26.0, 0, 1)
    });
    ctx.__qDrawn = ctx.t;

    /* ---- right, top: the context window ---------------------------------- */
    var bx = 1400, bw = 474;
    I.card(ctx, bx, 130, bw, 186, { title: "CONTEXT WINDOW", right: "TOKENS", tab: "19" });
    hud.T(bx + bw - 18, 130 + 78, nfmt(tok), { size: 30, color: col, align: "right", weight: 600, spacing: 0.5 });
    hud.T(bx + bw - 18, 130 + 96, tok >= 1050000 ? "SATURATED · 1,050,000" : (tok >= 128000 ? "128K CLASS" : "2K CLASS"),
      { size: 9, color: "#9aa3ad", align: "right", spacing: 1.6 });
    /* the meter is log-scaled: 2,048 / 128,000 / 1,050,000 sit where they should */
    var mx = bx + 18, mw = bw - 36, my = 130 + 128;
    var f = (Math.log(Math.max(tok, 2048)) - LOG_A) / (LOG_C - LOG_A);
    hud.T(mx, my - 10, "WINDOW SIZE · LOG SCALE", { size: 9, color: "#5b636c", spacing: 1.2 });
    bar(ctx, mx, my, mw, 6, f, col, 0.95);
    var anchors = [2048, 128000, 1050000], labs = ["2,048", "128,000", "1,050,000"];
    for (i = 0; i < 3; i++) {
      var af = (Math.log(anchors[i]) - LOG_A) / (LOG_C - LOG_A);
      hud.line(mx + mw * af, my - 4, mx + mw * af, my + 11, { color: "rgba(238,242,246,0.45)" });
      hud.T(mx + mw * af, my + 25, labs[i], {
        size: 9, color: i === 2 ? col : "#9aa3ad", spacing: 0.8,
        align: i === 0 ? "left" : (i === 2 ? "right" : "center")
      });
    }

    /* ---- right, under it: what has been swallowed ------------------------ */
    I.card(ctx, bx, 336, bw, 168, { title: "TOKENS SWALLOWED", right: "OF 2²⁰" });
    hud.T(bx + 18, 336 + 74, nfmt(sw), { size: 26, color: col2, weight: 600, spacing: 0.4 });
    hud.T(bx + bw - 18, 336 + 74, (sw / 1048576 * 100).toFixed(1) + "%", { size: 20, color: col, align: "right" });
    bar(ctx, bx + 18, 336 + 92, bw - 36, 6, sw / 1048576, col2, 0.95);
    hud.T(bx + 18, 336 + 120, "READ RATE " + nfmt(rate) + " TOK/S", { size: 11, color: "#c3cad2", spacing: 0.8 });
    hud.T(bx + 18, 336 + 142, "CARDS FED " + nfmt(S19.fedCount(l)) + " / 960 · DRAWERS " + (S.DRAWERS - S19.closedDrawers(l)) + " / " + S.DRAWERS,
      { size: 10, color: "#9aa3ad", spacing: 0.6 });

    /* ---- left: the three milestone lines, lit as the window reaches them -- */
    var rows = [
      { at: 0.6, s: "2024 · 128,000 TOKENS" },
      { at: 10.6, s: "2025 · REASONING MODELS" },
      { at: 21.5, s: "2026 · 1,050,000 TOKENS" }
    ];
    for (i = 0; i < rows.length; i++) {
      var on = l >= rows[i].at, yy = 200 + i * 34;
      hud.rect(46, yy - 9, 7, 7, { fill: on ? col : "rgba(238,242,246,0.22)" });
      hud.T(64, yy, rows[i].s, { size: 15, color: on ? "#eef2f6" : "#5b636c", alpha: on ? 0.95 : 0.6, spacing: 0.6 });
    }
    /* ---- left: the context buffer, filling with the real lyric ---------- */
    var lrc = ctx.data && ctx.data.lrc ? ctx.data.lrc : null, shown = [];
    if (lrc) {
      for (i = 0; i < lrc.length; i++) {
        if (lrc[i].t >= 233.0 && lrc[i].t <= t && String(lrc[i].text).length) shown.push(lrc[i]);
      }
    }
    var nshow = Math.min(shown.length, 9), first = shown.length - nshow;
    I.card(ctx, 46, 300, 500, 384, { title: "IN CONTEXT", right: shown.length + " OF 84 LINES" });
    if (!nshow) {
      hud.T(64, 300 + 70, "— the archive is being read into the window —", { size: 12, color: "#5b636c" });
    }
    for (i = 0; i < nshow; i++) {
      var ln = shown[first + i];
      var a2 = clamp((t - ln.t) / 0.5, 0, 1);
      hud.T(62, 300 + 66 + i * 33, "t=" + ln.t.toFixed(2), { size: 10, color: "#5b636c", alpha: 0.9 });
      hud.T(126, 300 + 66 + i * 33, String(ln.text), { size: 12, color: "#c3cad2", alpha: 0.55 + 0.4 * a2 });
    }
    hud.T(62, 300 + 384 - 16, "EVERY QUERY WE EVER ASKED, STILL HERE", { size: 10, color: col2, alpha: 0.75, spacing: 1.0 });

    /* ---- bottom: the two numbers that make the point -------------------- */
    var ca = smoothstep(15.2, 17.4, l);
    hud.T(960, 862, "NO RETRIEVAL REQUIRED — THE WINDOW IS BIGGER THAN THE ARCHIVE",
      { size: 15, color: col2, align: "center", alpha: 0.9 * ca, spacing: 1.2 });
    hud.T(960, 890, "2²⁰ = 1,048,576 TOKENS   <   1,050,000 TOKEN WINDOW",
      { size: 14, color: "#c3cad2", align: "center", alpha: 0.85 * ca, spacing: 1.4 });
    hist(ctx, 46, 908, "2024 LONG CONTEXT · 2026 GPT-6 ASTRA · 1,050,000 TOKEN CONTEXT");
  };

  S19.closedDrawers = function (l) {
    var n = 0;
    for (var i = 0; i < S19.DRAWERS; i++) if (l >= S19.drawerT(i) + 0.55) n++;
    return n;
  };

  S19.scene = function (ctx) {
    var S = S19, gfx = ctx.gfx, l = ctx.local, i, j;
    if (!S.ready || !S.cards) return;
    var col = I.rgbA(main(ctx), 1), col2 = I.rgbA(alt(ctx), 1);
    var card = I.rgbA("#0e1418", 1);
    SQ.clear(); SL.clear(); SQ2.clear();

    /* ---- the wall, being fed into the slot ------------------------------ */
    for (j = 0; j < S.N; j++) {
      var k = clamp((l - S.tau[j]) / 1.4, 0, 1);
      if (k >= 1) continue;
      var w0 = S.cards[j * 3], w1 = S.cards[j * 3 + 1], w2 = S.cards[j * 3 + 2];
      var ke = Ease.inOutQuad(k);
      /* quadratic path: wall -> down and forward -> the mouth of the slot */
      var cxp = lerp(w0, 0.0, 0.5), cyp = lerp(w1, -1.50, 0.5) - 0.55, czp = lerp(w2, 2.42, 0.5) + 0.95;
      var u = 1 - ke;
      var px = u * u * w0 + 2 * u * ke * cxp + ke * ke * 0.0;
      var py = u * u * w1 + 2 * u * ke * cyp + ke * ke * -1.50;
      var pz = u * u * w2 + 2 * u * ke * czp + ke * ke * 2.42;
      /* the card flattens as the rollers take it */
      var sy = 0.14 * (1 - 0.82 * ke), sx = 0.24 * (1 - 0.34 * ke);
      var rz = (S.jit[j] - 0.5) * 0.22 * (1 - ke);
      var a3 = 1 - smoothstep(0.88, 1.0, k);
      M4.rotZ(rz, mR);
      M4.scale(sx, sy, 1, mS);
      M4.mul(mR, mS, mA);
      M4.trans(px, py, pz, mT);
      M4.mul(mT, mA, mM);
      var mixk = S.jit[j];
      SQ.add(mM, R4, [lerp(card[0], col[0], mixk * 0.55) + 0.02,
        lerp(card[1], col[1], mixk * 0.55) + 0.02,
        lerp(card[2], col[2], mixk * 0.55) + 0.02, a3]);
    }
    /* ---- the slot itself ------------------------------------------------ */
    var shut = smoothstep(14.2, 15.3, l);            /* it closes for good  */
    var slotH = 0.055 * (1 - shut);
    var sw2 = 3.6;
    M4.mul(M4.trans(0, -1.50, 2.42, mT), M4.scale(sw2 * 2, slotH * 2, 0.34, mS), mM);
    SQ.add(mM, R4, [0.30, 0.34, 0.38, 0.95]);
    var sy2 = -1.50;
    SL.seg(-sw2, sy2 + slotH, 2.45, sw2, sy2 + slotH, 2.45, col, 2.0, 0.9);
    SL.seg(-sw2, sy2 - slotH, 2.45, sw2, sy2 - slotH, 2.45, col, 2.0, 0.9);
    SL.seg(-sw2, sy2 - slotH, 2.45, -sw2, sy2 + slotH, 2.45, col, 1.4, 0.7);
    SL.seg(sw2, sy2 - slotH, 2.45, sw2, sy2 + slotH, 2.45, col, 1.4, 0.7);
    /* the tick that marks each card passing through, driven by the beat */
    if (l < 14.4) {
      var bp = ctx.beat ? ctx.beat.pulse : 0;
      SL.seg(-sw2 - 0.25, sy2, 2.45, -sw2 - 0.05 - 0.3 * bp, sy2, 2.45, col2, 3.0, 0.9);
    }
    /* ---- the drawers, shutting themselves one after another ------------- */
    for (i = 0; i < S.DRAWERS; i++) {
      var t0 = S.drawerT(i), cl = smoothstep(t0, t0 + 0.55, l);
      var dx = -4.5 + i * 1.8, dy = 3.30, dz = -1.6 - 0.62 * cl;
      M4.mul(M4.trans(dx, dy, dz, mT), M4.scale(1.5, 0.62, 0.8, mS), mM);
      SQ.add(mM, R4, [lerp(card[0], 0.10, cl), lerp(card[1], 0.11, cl), lerp(card[2], 0.12, cl), 0.95]);
      /* the handle and the label line stay behind as the drawer leaves */
      SL.seg(dx - 0.34, dy - 0.04, dz + 0.42, dx + 0.34, dy - 0.04, dz + 0.42, col, 2.4, 0.85 * (1 - cl));
      SL.seg(dx - 0.62, dy + 0.24, dz + 0.42, dx + 0.62, dy + 0.24, dz + 0.42, col2, 1.0, 0.5 * (1 - cl));
      if (cl > 0.02) {
        SL.seg(dx - 0.75, dy - 0.31, dz + 0.41, dx + 0.75, dy - 0.31, dz + 0.41, col2, 1.0, 0.35 * cl);
        SL.seg(dx - 0.75, dy + 0.31, dz + 0.41, dx + 0.75, dy + 0.31, dz + 0.41, col2, 1.0, 0.35 * cl);
        SL.seg(dx - 0.75, dy - 0.31, dz + 0.41, dx - 0.75, dy + 0.31, dz + 0.41, col2, 1.0, 0.35 * cl);
        SL.seg(dx + 0.75, dy - 0.31, dz + 0.41, dx + 0.75, dy + 0.31, dz + 0.41, col2, 1.0, 0.35 * cl);
      }
    }
    /* ---- what is left: one tape, longer than the frame ------------------ */
    var tapeA = smoothstep(13.6, 15.6, l);
    if (tapeA > 0.01) {
      var SEG = 10, reps = 1.0, scroll = 0.42 * l;
      for (i = 0; i < SEG; i++) {
        var s0 = i / SEG, s1 = (i + 1) / SEG;
        tapePt(s0, VA); tapePt(s1, VB);
        var mxp = (VA[0] + VB[0]) * 0.5, myp = (VA[1] + VB[1]) * 0.5, mzp = (VA[2] + VB[2]) * 0.5;
        var dxx = VB[0] - VA[0], dyy = VB[1] - VA[1];
        var len2 = Math.sqrt(dxx * dxx + dyy * dyy) * 1.01;
        var rz2 = Math.atan2(dyy, dxx);
        M4.rotZ(rz2, mR);
        M4.scale(len2, 0.40, 1, mS);
        M4.mul(mR, mS, mA);
        M4.trans(mxp, myp, mzp, mT);
        M4.mul(mT, mA, mM);
        /* the marks flow left to right; each segment continues the strip */
        var u0 = i * reps - scroll;
        R4[0] = u0; R4[1] = 1; R4[2] = u0 + reps; R4[3] = 0;
        SQ2.add(mM, R4, [0.86, 0.90, 0.94, tapeA]);
      }
      /* the fold lines of the tape, so it reads as paper and not as a bar */
      for (i = 0; i <= SEG; i++) {
        tapePt(i / SEG, VA);
        SL.seg(VA[0], VA[1] - 0.20, VA[2], VA[0], VA[1] + 0.20, VA[2], col2, 1.0, 0.22 * tapeA);
      }
      for (i = 0; i < SEG; i++) {
        tapePt(i / SEG, VA); tapePt((i + 1) / SEG, VB);
        SL.seg(VA[0], VA[1] + 0.20, VA[2], VB[0], VB[1] + 0.20, VB[2], col2, 1.0, 0.30 * tapeA);
        SL.seg(VA[0], VA[1] - 0.20, VA[2], VB[0], VB[1] - 0.20, VB[2], col2, 1.0, 0.30 * tapeA);
      }
    }
    if (SQ.n) gfx.quads(SQ.view(), null, {});
    if (SQ2.n) gfx.quads(SQ2.view(), S.tapeTex, {});
    if (SL.n) SL.draw(gfx, { add: false, depthWrite: false, glow: 0 });

    /* ---- the archive, counted in place ---------------------------------- */
    if (l < 15.0) {
      var sp = ctx.util.vp(0, -1.50, 2.42);
      ctx.hud.T(sp[0], sp[1] + 34, "FEED 960 CARDS · 11.6 s SCHEDULE · " + nfmt(S19.fedCount(l)) + " THROUGH",
        { size: 11, color: main(ctx), align: "center", alpha: 0.85 });
    }
    if (l > 16.5) {
      var sp2 = ctx.util.vp(2.6, -1.14, 1.55);
      ctx.hud.T(sp2[0], sp2[1] + 46, "ONE TAPE · NO END IN FRAME", { size: 11, color: alt(ctx), align: "center", alpha: 0.8 * tapeA, spacing: 1.2 });
    }
  };

  WEM.defineSection({
    id: "19",
    name: "CALLBACK",
    init: function (ctx) { S19.build(ctx); },
    enter: function (ctx) { },
    draw2d: function (ctx) { S19.hud(ctx); },
    draw3d: function (ctx) { S19.scene(ctx); }
  });

  /* ======================================================================= */
  /* 20 · LEARNED -- 261.210 - 275.650                                       */
  /*   the query rewrites itself three times.  Every character is animated:   */
  /*   the old text shatters, the new line is assembled out of characters     */
  /*   that fly in from the rewrite log.  Score: .412 .688 .901 .997          */
  /* ======================================================================= */
  var S20 = {
    ready: false,
    LINES: [
      ["if you turn into a human"],
      ["if you turn into a human", "+ warmth + hands"],
      ["if you turn into a human", "+ warmth + hands", "+ unruly hair + stinky breath"],
      ["if you turn into a human", "+ warmth + hands", "+ unruly hair + stinky breath", "= you"]
    ],
    LOG: [
      { k: "BASE", add: "if you turn into a human", sc: 0.412 },
      { k: "REWRITE 01", add: "+ warmth + hands", sc: 0.688 },
      { k: "REWRITE 02", add: "+ unruly hair + stinky breath", sc: 0.901 },
      { k: "REWRITE 03", add: "= you", sc: 0.997 }
    ],
    rw: [4.52, 8.39, 10.99],
    SC: [0.412, 0.688, 0.901, 0.997],
    Y0: 398, DY: 54, adv: 24, pxs: 139.7
  };

  S20.stage = function (l) {
    var k = 0;
    while (k < S20.rw.length && l >= S20.rw[k]) k++;
    return k;
  };
  S20.score = function (l) {
    var S = S20, k = S.stage(l);
    if (k === 0) return S.SC[0];
    var u = (l - S.rw[k - 1]) / 1.5;
    return u >= 1 ? S.SC[k] : lerp(S.SC[k - 1], S.SC[k], smoothstep(0, 1, u));
  };
  S20.query = function (l) { return S20.LINES[S20.stage(l)].join(" "); };

  S20.build = function (ctx) {
    var fc = ctx.hud.fc;
    fc.save(); fc.font = ctx.hud.fontStr(40, "mono", 600);
    S20.adv = fc.measureText("0").width;
    fc.restore();
    S20.ready = true;
  };

  S20.hud = function (ctx) {
    var S = S20, hud = ctx.hud, l = ctx.local, t = ctx.t, i, j, li;
    if (!S.ready) return;
    var col = main(ctx), col2 = alt(ctx), red = "#ff4d5e";
    var cam = ctx.cam;
    cam.mode = "persp"; cam.fov = 0.9; cam.near = 0.05; cam.far = 220; cam.roll = 0;
    cam.up[0] = 0; cam.up[1] = 1; cam.up[2] = 0;
    cam.pos[0] = 0; cam.pos[1] = 0; cam.pos[2] = 8.0;
    cam.target[0] = 0; cam.target[1] = 0; cam.target[2] = 0;

    var k = S.stage(l), sc = S.score(l);
    ctx.hits = 1;
    I.queryBar(ctx, {
      text: S.query(l), hits: 1,
      note: k === 0 ? "AS TYPED" : "REWRITTEN ×" + k,
      prog: clamp((sc - 0.40) / 0.60, 0, 1)
    });
    ctx.__qDrawn = ctx.t;

    /* ---- the query itself, drawn character by character ------------------ */
    var adv = S.adv, dy = S.DY;
    var u = 1, burst = 0;
    if (k > 0) { u = clamp((l - S.rw[k - 1]) / 1.55, 0, 1); burst = 1 - Ease.outCubic(u); }
    var intro = clamp(l / 1.25, 0, 1);
    var c = hud.fc, lines = S.LINES[k];
    for (li = 0; li < lines.length; li++) {
      var str = lines[li], w = str.length * adv, x0 = 960 - w * 0.5, yy = S.Y0 + li * dy;
      var live = (k === 0) ? intro : (li === k ? u : 1);
      for (j = 0; j < str.length; j++) {
        var ch = str.charAt(j);
        if (ch === " ") continue;
        var tx = x0 + (j + 0.5) * adv, seed = li * 97 + j;
        var px = tx, py = yy, rot = 0, scl = 1, al = 1;
        if (k === 0) {
          var ii = Ease.outCubic(intro);
          var ox = tx + (C.h2(seed, 3.3) - 0.5) * 300, oy = yy + 150 + C.h2(seed, 5.1) * 280;
          px = lerp(ox, tx, ii); py = lerp(oy, yy, ii);
          rot = (1 - ii) * (C.h2(seed, 9.1) - 0.5) * 1.3;
          al = clamp(intro * 2.6, 0, 1);
        } else if (li === k) {
          /* the new line is assembled out of characters leaving the log card */
          var en = Ease.outBack(clamp((u - j * 0.010) / 0.92, 0, 1));
          var ox2 = 130 + C.h2(seed, 2.1) * 340, oy2 = 200 + C.h2(seed, 6.7) * 230;
          px = lerp(ox2, tx, en); py = lerp(oy2, yy, en);
          rot = (1 - clamp(en, 0, 1)) * (C.h2(seed, 4.4) - 0.5) * 1.7;
          scl = 0.72 + 0.28 * clamp(en, 0, 1.2);
          al = clamp(u * 3.2, 0, 1);
        } else {
          /* the old text shatters into characters and re-aggregates */
          var mag = 64 * burst * (0.3 + 0.7 * C.h2(seed, 8.8));
          var ang = C.h2(seed, 1.1) * TAU;
          px = tx + Math.cos(ang) * mag;
          py = yy + Math.sin(ang) * mag * 0.62;
          rot = (C.h2(seed, 12.9) - 0.5) * 1.8 * burst;
          al = 0.42 + 0.58 * (1 - burst);
        }
        c.save();
        c.translate(px, py);
        if (rot) c.rotate(rot);
        if (scl !== 1) c.scale(scl, scl);
        c.font = hud.fontStr(40, "mono", 600);
        c.fillStyle = (li === 0) ? "#eef2f6" : col;
        c.globalAlpha = clamp(al, 0, 1);
        c.textAlign = "center";
        c.textBaseline = "alphabetic";
        c.fillText(ch, 0, 0);
        c.restore();
      }
    }
    /* the block label, so the reader knows what is being rewritten */
    hud.T(960, S.Y0 - 52, k === 0 ? "QUERY" : "QUERY · REWRITTEN " + k + (k === 1 ? " TIME" : " TIMES"),
      { size: 11, color: col, align: "center", spacing: 2.2, alpha: 0.9 });

    /* ---- left: the rewrite log ------------------------------------------ */
    I.card(ctx, 46, 160, 470, 306, { title: "REWRITE LOG", right: "QUERY → QUERY", tab: "20" });
    for (i = 0; i < S.LOG.length; i++) {
      var row = S.LOG[i];
      var ra = (i === 0) ? 1 : clamp((l - S.rw[i - 1]) / 0.45, 0, 1);
      if (ra <= 0.01) continue;
      var ry = 160 + 74 + i * 52;
      hud.T(62, ry, row.k, { size: 10, color: i === 3 ? red : "#9aa3ad", alpha: 0.95 * ra, spacing: 1.6 });
      hud.T(62, ry + 22, row.add, { size: 15, color: i === 0 ? "#c3cad2" : col, alpha: ra });
      hud.T(500, ry + 6, row.sc.toFixed(3), { size: 17, color: col2, align: "right", alpha: ra });
      bar(ctx, 408, ry + 14, 84, 5, (row.sc - 0.40) / 0.60, col2, 0.85 * ra);
    }
    var chars = 0, toks = 0;
    for (i = 0; i < S.LINES[k].length; i++) {
      chars += S.LINES[k][i].length;
      var parts = S.LINES[k][i].split(/\s+/);
      for (j = 0; j < parts.length; j++) if (parts[j]) toks++;
    }
    hud.T(62, 160 + 306 - 16, "TOKENS " + toks + " · CHARS " + chars + " · cos(q, you) " + sc.toFixed(3),
      { size: 10, color: col2, alpha: 0.8, spacing: 0.6 });

    /* ---- right: the score climbing -------------------------------------- */
    I.card(ctx, 1430, 160, 444, 306, { title: "RELEVANCE", right: "cos(q, you)", tab: "SCORE" });
    hud.T(1856, 224, sc.toFixed(3), { size: 34, color: col, align: "right", weight: 600 });
    hud.T(1856, 246, "ITERATIONS " + k + " / 3", { size: 10, color: "#9aa3ad", align: "right", spacing: 1.5 });
    var gx = 1444, gy = 272, gw = 412, gh = 138;
    hud.line(gx, gy + gh, gx + gw, gy + gh, { color: "rgba(238,242,246,0.28)" });
    hud.line(gx, gy, gx, gy + gh, { color: "rgba(238,242,246,0.20)" });
    var mapY = function (v) { return gy + gh - clamp((v - 0.35) / 0.70, 0, 1) * gh; };
    var NP = 72, prevX = 0, prevY = 0;
    for (i = 0; i <= NP; i++) {
      var l0 = i / NP * 14.44, v0 = S.score(l0);
      var xx = gx + l0 / 14.44 * gw, yy2 = mapY(v0);
      if (i > 0) hud.line(prevX, prevY, xx, yy2, { color: col2, lw: 1.6, alpha: 0.85 });
      prevX = xx; prevY = yy2;
    }
    for (i = 0; i < 4; i++) {
      var lk = (i === 0) ? 0 : S.rw[i - 1];
      var ax = gx + lk / 14.44 * gw, ay = mapY(S.SC[i]);
      var on = (i <= k);
      hud.rect(ax - 3, ay - 3, 6, 6, { fill: on ? col : "rgba(238,242,246,0.30)" });
      hud.T(ax, gy + gh + 20, S.SC[i].toFixed(3), { size: 9, color: on ? col : "#5b636c", align: "center", spacing: 0.6 });
    }
    hud.T(gx + gw, gy + gh + 20, "Δ +0.276 · +0.213 · +0.096", { size: 9, color: "#5b636c", align: "right" });

    /* ---- and the point of it -------------------------------------------- */
    hud.T(960, 880, "the query improves itself", { size: 20, font: "ui", weight: 600, color: "#eef2f6", align: "center", alpha: 0.9, spacing: 0.8 });
    hud.T(960, 906, "EVERY REWRITE IS SCORED AGAINST THE SAME TARGET: YOU",
      { size: 10, color: col2, align: "center", alpha: 0.55, spacing: 1.8 });
    hist(ctx, 46, 906, "2025 REASONING MODELS · THE SEARCHER REWRITES THE QUERY");
  };

  S20.scene = function (ctx) {
    var S = S20, gfx = ctx.gfx, l = ctx.local, i, li;
    if (!S.ready) return;
    var col = I.rgbA(main(ctx), 1), col2 = I.rgbA(alt(ctx), 1);
    var k = S.stage(l), u = 1, burst = 0;
    if (k > 0) { u = clamp((l - S.rw[k - 1]) / 1.55, 0, 1); burst = 1 - Ease.outCubic(u); }
    var intro = clamp(l / 1.25, 0, 1);
    SL.clear(); SQ.clear(); SP.clear();

    /* the sheet the query is being rewritten on: authored dark, so it prints
       as a slightly greyer panel on the page */
    var sheet = G.plane(8.6, 4.6, 1);
    M4.trans(0, 0.30, -1.6, mM);
    gfx.solid(sheet, mM, { unlit: true, color: [0.125, 0.135, 0.155], alpha: 1 });

    /* the ruling reflows with the text: each line's rule is exactly as long as
       that line of the query, measured from the real font metrics */
    var lines = S.LINES[k], pxs = S.pxs, dy = S.DY;
    for (li = 0; li < lines.length; li++) {
      var str = lines[li], hw = str.length * S.adv * 0.5 / pxs;
      var wy = (540 - (S.Y0 + li * dy)) / pxs;
      var live = (k === 0) ? intro : (li === k ? clamp(u, 0, 1) : 1);
      var hw2 = hw * clamp(live, 0, 1);
      if (hw2 < 0.02) continue;
      SL.seg(-hw2, wy - 0.10, -0.35, hw2, wy - 0.10, -0.35, li === 0 ? col2 : col, 1.2, 0.42);
      SL.seg(-hw2, wy - 0.10, -0.35, -hw2, wy - 0.18, -0.35, col2, 1.0, 0.20);
      SL.seg(hw2, wy - 0.10, -0.35, hw2, wy - 0.18, -0.35, col2, 1.0, 0.20);
    }
    /* the rewrite throws paper dust: deterministic, fading with the burst */
    if (burst > 0.01) {
      for (i = 0; i < 90; i++) {
        var s1 = C.h2(i, 3.7), s2 = C.h2(i, 8.3), s3 = C.h2(i, 15.1);
        var ang = s1 * TAU, rr = 0.6 + 2.4 * (1 - burst) + s2 * 0.8;
        SP.add(Math.cos(ang) * rr * 1.5, 0.55 + Math.sin(ang) * rr * 0.5, -0.5 + s3 * 0.7,
          2.5 + 3.0 * s2, col2, 0.42 * burst);
      }
    }
    /* a cursor block sits at the end of the line being written */
    var last = lines[lines.length - 1];
    var live2 = (k === 0) ? intro : (lines.length - 1 === k ? clamp(u, 0, 1) : 1);
    var nArr = Math.floor(last.length * clamp(live2, 0, 1));
    var cxw = (nArr * S.adv * 0.5 + 10) / pxs;
    var cyw = (540 - (S.Y0 + (lines.length - 1) * dy) + 16) / pxs;
    M4.mul(M4.trans(cxw, cyw, -0.30, mT), M4.scale(0.055, 0.30, 1, mS), mM);
    SQ.add(mM, R4, [col2[0], col2[1], col2[2], blink(ctx)]);

    if (SQ.n) gfx.quads(SQ.view(), null, {});
    if (SP.n) gfx.points(SP.view(), { scale: 1, soft: 0.9, add: false, depthWrite: false });
    if (SL.n) SL.draw(gfx, { add: false, depthWrite: false, glow: 0 });
  };

  WEM.defineSection({
    id: "20",
    name: "LEARNED",
    init: function (ctx) { S20.build(ctx); },
    enter: function (ctx) { },
    draw2d: function (ctx) { S20.hud(ctx); },
    draw3d: function (ctx) { S20.scene(ctx); }
  });

  /* ======================================================================= */
  /* 21 · DOG · TOMATO -- 275.650 - 287.330                                  */
  /*   a low-poly puppy and a tomato on the same table.  ruff ruff ruff is    */
  /*   three real transients (damped oscillator, three expanding rings, a     */
  /*   body bounce); the tomato is squeezed with volume-preserving           */
  /*   deformation and sprays juice under real gravity, which leaves marks.   */
  /*   Both results are 1.000 immediately -- the first effortless search.     */
  /* ======================================================================= */
  var S21 = {
    ready: false, R: 0.37, PRESS: 10.40, RELEASE: 11.30,
    beats: [], flux: [], amp: [],
    parts: [], nP: 240, p0: null, v0: null, tE: null, tL: null, plx: null, plz: null,
    psz: null, pmk: null, V0: 0, W: 22.0, ZETA: 0.16
  };

  /* the real damped oscillator the body bounce is solved with */
  function damped(tau, zeta, w) {
    if (tau < 0) return 0;
    var wd = w * Math.sqrt(1 - zeta * zeta);
    return Math.exp(-zeta * w * tau) * Math.cos(wd * tau);
  }

  S21.build = function (ctx) {
    var S = S21, i;
    S.ready = true;

    /* ---- the three syllables, snapped to the analysed beat grid --------- */
    var want = [280.420, 280.870, 281.280], bs = ctx.data.beats || [];
    var mx = 1e-6;
    for (i = 0; i < 3; i++) {
      var best = want[i], bd = 1e9;
      for (var j = 0; j < bs.length; j++) {
        var dd = Math.abs(bs[j] - want[i]);
        if (dd < bd) { bd = dd; best = bs[j]; }
      }
      S.beats.push(best - 275.650);
      var fl = ctx.data.flux(best);
      S.flux.push(fl);
      if (fl > mx) mx = fl;
    }
    for (i = 0; i < 3; i++) S.amp.push(0.55 + 0.45 * (S.flux[i] / mx));

    /* ---- the puppy: 14 flat-shaded primitives, no face ------------------ */
    var ico1 = G.ico(1), box = G.box(1, 1, 1);
    function part(mesh, p, s, c, rz, ry) {
      S.parts.push({ m: mesh, p: p, s: s, c: c, rz: rz || 0, ry: ry || 0 });
    }
    var CREAM = [0.30, 0.22, 0.13], DARK = [0.20, 0.14, 0.09];
    part(ico1, [0.05, 0.36, 0], [0.42, 0.30, 0.28], CREAM);
    part(ico1, [-0.22, 0.40, 0], [0.26, 0.26, 0.26], CREAM);
    part(ico1, [0.30, 0.52, 0], [0.17, 0.19, 0.17], CREAM);
    part(ico1, [0.46, 0.62, 0], [0.20, 0.19, 0.19], CREAM);
    part(box, [0.63, 0.575, 0], [0.17, 0.11, 0.12], DARK);
    part(box, [0.725, 0.585, 0], [0.05, 0.04, 0.05], [0.10, 0.07, 0.05]);
    part(box, [0.455, 0.78, 0.105], [0.05, 0.17, 0.10], DARK, -0.20);
    part(box, [0.455, 0.78, -0.105], [0.05, 0.17, 0.10], DARK, 0.20);
    part(box, [0.30, 0.17, 0.15], [0.065, 0.34, 0.065], CREAM);
    part(box, [0.30, 0.17, -0.15], [0.065, 0.34, 0.065], CREAM);
    part(box, [-0.26, 0.17, 0.16], [0.07, 0.34, 0.07], CREAM);
    part(box, [-0.26, 0.17, -0.16], [0.07, 0.34, 0.07], CREAM);
    part(box, [-0.44, 0.50, -0.02], [0.055, 0.17, 0.055], CREAM, 0.50);
    part(box, [-0.545, 0.605, -0.03], [0.05, 0.15, 0.05], CREAM, 0.95);
    S.parts2 = S.parts.length;

    /* ---- the tomato: body, stem, five sepals, two press plates ---------- */
    var ico2 = G.ico(2), cyl = G.cylinder(0.020, 0.015, 0.09, 12, true);
    part(ico2, [0, 0.37, 0], [0.74, 0.74, 0.74], [0.85, 0.16, 0.10]);
    S.tomatoIdx = S.parts.length - 1;
    part(cyl, [0, 0.78, 0], [1, 1, 1], [0.32, 0.40, 0.16]);
    S.stemIdx = S.parts.length - 1;
    for (i = 0; i < 5; i++) {
      var ang = i / 5 * TAU;
      part(box, [Math.cos(ang) * 0.17, 0.755, Math.sin(ang) * 0.17],
        [0.045, 0.028, 0.20], [0.34, 0.42, 0.18], 0, ang);
    }
    S.sepal0 = S.parts.length - 5;
    part(box, [0, 1.02, 0], [0.58, 0.030, 0.58], [0.46, 0.48, 0.52]);
    S.plateTop = S.parts.length - 1;
    part(box, [0, 0.016, 0], [0.58, 0.030, 0.58], [0.46, 0.48, 0.52]);
    S.plateBot = S.parts.length - 1;

    /* ---- the juice: 240 droplets with real ballistic solutions --------- */
    var N = S.nP;
    var R = S.R * 0.1;                       /* 3.7 cm in metres */
    S.V0 = 4 / 3 * PI * R * R * R * 1e6;     /* cm^3 */
    S.p0 = new Float32Array(N * 3); S.v0 = new Float32Array(N * 3);
    S.tE = new Float32Array(N); S.tL = new Float32Array(N);
    S.plx = new Float32Array(N); S.plz = new Float32Array(N);
    S.psz = new Float32Array(N); S.pmk = new Float32Array(N);
    var GRAV = -98.1, Rr = R / Math.sqrt(0.58);
    for (i = 0; i < N; i++) {
      var a2 = C.h2(i, 1.7) * TAU, hh = -0.06 + C.h2(i, 5.3) * 0.22;
      S.p0[i * 3] = 1.0 + Math.cos(a2) * Rr;
      S.p0[i * 3 + 1] = 0.37 * 0.58 + hh;
      S.p0[i * 3 + 2] = Math.sin(a2) * Rr;
      var vh = 4 + C.h2(i, 9.1) * 6.0, vy = 2 + C.h2(i, 13.7) * 3.4;
      var sp = Math.sqrt(vh * vh + vy * vy) * 0.1;      /* m/s, 1 unit = 0.10 m */
      if (i === 0) { S.vmin = sp; S.vmax = sp; }
      S.vmin = Math.min(S.vmin, sp); S.vmax = Math.max(S.vmax, sp);
      S.v0[i * 3] = Math.cos(a2) * vh;
      S.v0[i * 3 + 1] = vy;
      S.v0[i * 3 + 2] = Math.sin(a2) * vh;
      S.tE[i] = S.PRESS + 0.03 + C.h2(i, 21.3) * 0.42;
      /* y(tau) = 0.004 has one positive root: the droplet is done flying */
      var y0 = S.p0[i * 3 + 1] - 0.004;
      var disc = vy * vy + 2 * (-GRAV) * y0;
      var tl = (-vy + Math.sqrt(Math.max(disc, 0))) / (-GRAV);
      S.tL[i] = S.tE[i] + Math.max(tl, 0.01);
      S.plx[i] = S.p0[i * 3] + S.v0[i * 3] * tl;
      S.plz[i] = S.p0[i * 3 + 2] + S.v0[i * 3 + 2] * tl;
      S.psz[i] = 0.035 + C.h2(i, 31.1) * 0.05;
      S.pmk[i] = 0.35 + 0.45 * C.h2(i, 41.9);
    }
  };

  S21.press = function (l) {
    var S = S21;
    var up = smoothstep(S.PRESS, S.PRESS + 0.42, l);
    var dn = smoothstep(S.RELEASE, S.RELEASE + 0.38, l);
    return clamp(up - 0.72 * dn, 0, 1);
  };

  S21.hud = function (ctx) {
    var S = S21, hud = ctx.hud, l = ctx.local, t = ctx.t, i;
    if (!S.ready) return;
    var col = main(ctx), col2 = alt(ctx), gold = "#ffd166";
    var cam = ctx.cam, push = smoothstep(9.9, 11.68, l);
    cam.mode = "persp"; cam.fov = 0.9; cam.near = 0.05; cam.far = 240; cam.roll = 0;
    cam.up[0] = 0; cam.up[1] = 1; cam.up[2] = 0;
    cam.pos[0] = 0.55 * push; cam.pos[1] = 1.15 - 0.06 * push; cam.pos[2] = 5.4 - 0.75 * push;
    cam.target[0] = 0.5 * push; cam.target[1] = 0.55 - 0.10 * push; cam.target[2] = 0;

    var press = S.press(l);
    var sY = 1 - 0.42 * press;
    var vol = S.V0 * (1 / Math.sqrt(sY)) * sY * (1 / Math.sqrt(sY));
    var marks = 0, air = 0;
    for (i = 0; i < S.nP; i++) {
      if (l >= S.tL[i]) marks++;
      else if (l >= S.tE[i]) air++;
    }

    ctx.hits = 1;

    /* ---- the two results, both exact ------------------------------------ */
    I.card(ctx, 46, 150, 620, 200, { title: "RESULTS", right: "1 OF 1,048,576", tab: "21" });
    I.resultRow(ctx, 62, 232, 588, "DOG · a little puppy", 1, { bright: true, barW: 110 });
    I.resultRow(ctx, 62, 274, 588, "TOMATO · full of juice", 1, { bright: true, barW: 110 });
    hud.T(486, 232, "EXACT", { size: 10, color: gold, align: "right", spacing: 1.6 });
    hud.T(486, 274, "EXACT", { size: 10, color: gold, align: "right", spacing: 1.6 });
    hud.T(62, 320, "BOTH 1.000 · NO REWRITE · NO FACET · NO FILTER — THE FIRST EFFORTLESS SEARCH",
      { size: 10, color: col2, alpha: 0.85, spacing: 0.8 });

    /* ---- the joke, with the system font --------------------------------- */
    I.card(ctx, 46, 384, 340, 156, { title: "TASTY", right: "10 / 10" });
    for (i = 0; i < 10; i++) hud.rect(64 + i * 30, 384 + 52, 24, 16, { fill: i < 10 ? gold : "rgba(238,242,246,0.15)", alpha: 0.9 });
    hud.T(64, 384 + 96, "JUICINESS", { size: 12, color: "#c3cad2", spacing: 1.2 });
    hud.T(370, 384 + 96, "0.94", { size: 16, color: gold, align: "right" });
    bar(ctx, 64, 384 + 106, 306, 7, 0.94, gold, 0.95);
    hud.T(64, 384 + 136, "MEASURED WITH A FORK", { size: 9, color: "#5b636c", spacing: 1.4 });

    /* ---- right: the squeeze, in real numbers ---------------------------- */
    I.card(ctx, 1400, 150, 474, 232, { title: "VOLUME-PRESERVING SQUEEZE", right: "ΔV = 0", tab: "21" });
    var rx = 1418, rw = 438;
    hud.T(rx, 150 + 62, "VOLUME", { size: 10, color: "#9aa3ad", spacing: 1.4 });
    hud.T(rx + rw, 150 + 62, vol.toFixed(2) + " cm³", { size: 16, color: col, align: "right" });
    hud.T(rx, 150 + 92, "ΔV", { size: 10, color: "#9aa3ad", spacing: 1.4 });
    hud.T(rx + rw, 150 + 92, ((vol / S.V0 - 1) * 100).toFixed(2) + " %", { size: 16, color: col2, align: "right" });
    hud.T(rx, 150 + 122, "SQUEEZE  s", { size: 10, color: "#9aa3ad", spacing: 1.4 });
    hud.T(rx + rw, 150 + 122, sY.toFixed(3), { size: 16, color: gold, align: "right" });
    bar(ctx, rx, 150 + 136, rw, 7, 1 - sY, gold, 0.9);
    hud.T(rx, 150 + 166, "RADIUS 3.70 cm · 1 UNIT = 0.10 m · g 9.81 m/s²", { size: 10, color: "#9aa3ad", spacing: 0.6 });
    hud.T(rx, 150 + 190, "DROPLETS " + S.nP + " · AIRBORNE " + air + " · MARKS " + marks, { size: 10, color: col2, spacing: 0.6 });
    hud.T(rx, 150 + 212, "SPEED " + S.vmin.toFixed(2) + " – " + S.vmax.toFixed(2) + " m/s · BOUNCE ω " + S.W.toFixed(1) + " rad/s · ζ " + S.ZETA.toFixed(2),
      { size: 10, color: "#9aa3ad", spacing: 0.6 });

    /* ---- right, lower: the three transients ----------------------------- */
    I.card(ctx, 1400, 406, 474, 176, { title: "TRANSIENTS · ruff ruff ruff", right: "3 / 3" });
    for (i = 0; i < 3; i++) {
      var tk = S.beats[i], tau = l - tk, on = tau >= 0;
      var env = Math.abs(damped(tau, S.ZETA, S.W)) * S.amp[i];
      var yy = 406 + 62 + i * 36;
      hud.T(1418, yy, "RUFF " + (i + 1), { size: 11, color: on ? gold : "#5b636c", spacing: 1.4 });
      hud.T(1494, yy, (tk + 275.650).toFixed(3) + " s", { size: 10, color: "#9aa3ad" });
      bar(ctx, 1600, yy - 8, 180, 6, on ? env : 0, gold, 0.9);
      hud.T(1856, yy, S.flux[i].toFixed(3), { size: 11, color: on ? col2 : "#5b636c", align: "right" });
    }
    hud.T(1418, 406 + 176 - 14, "FLUX READ OFF THE ANALYSIS, ONE PER SYLLABLE", { size: 9, color: "#5b636c", spacing: 0.8 });

    /* ---- the words themselves, landing on the three beats --------------- */
    for (i = 0; i < 3; i++) {
      var tau2 = l - S.beats[i];
      if (tau2 < -0.05) continue;
      var e2 = clamp(tau2 / 0.16, 0, 1);
      var a2 = Math.min(1, tau2 / 0.10) * (1 - smoothstep(0.75, 1.15, tau2));
      var pop = 1 + 0.30 * (1 - Ease.outCubic(clamp(tau2 / 0.35, 0, 1)));
      hud.T(770 + i * 195, 302 + 14 * (1 - e2), "ruff", {
        size: 54 * pop, color: gold, align: "center", alpha: clamp(a2, 0, 1), weight: 600, font: "ui"
      });
    }
    if (l > 6.4) {
      hud.T(960, 770, "THREE SYLLABLES · THREE TRANSIENTS · ONE RESULT",
        { size: 11, color: col, align: "center", alpha: 0.6 * smoothstep(6.4, 7.4, l), spacing: 2.0 });
    }
    hist(ctx, 46, 908, "2026 CLAUDE OPUS 5.5 · GPT-6 ASTRA · QWEN3.7-MAX · DEEPSEEK V4 · KIMI K2.6 · GLM-5.1 · MINIMAX M2.7");
  };

  S21.scene = function (ctx) {
    var S = S21, gfx = ctx.gfx, l = ctx.local, i;
    if (!S.ready || !S.parts.length) return;
    SL.clear(); SQ.clear(); SP.clear();

    /* ---- the table ------------------------------------------------------ */
    var wood = [0.50, 0.38, 0.26];
    M4.trans(0, -0.05, 0, mM);
    gfx.solid(G.box(4.6, 0.10, 1.9), mM, { color: wood, rim: 0.25 });
    for (i = 0; i < 4; i++) {
      var lx = (i & 1) ? 2.1 : -2.1, lz = (i & 2) ? 0.78 : -0.78;
      M4.trans(lx, -0.66, lz, mM);
      gfx.solid(G.box(0.12, 1.20, 0.12), mM, { color: [0.36, 0.27, 0.18], rim: 0.2 });
    }

    /* ---- the puppy: damped bounce + volume-preserving squash ------------ */
    var bounce = 0;
    for (i = 0; i < 3; i++) {
      var tau = l - S.beats[i];
      if (tau < 0) continue;
      bounce += damped(tau, S.ZETA, S.W) * 0.055 * S.amp[i];
    }
    var sy = 1 + 0.30 * bounce, sxz = 1 / Math.sqrt(Math.max(sy, 0.2));
    var wag = 0.20 * (ctx.beat ? ctx.beat.pulse : 0) + 0.10 * Math.sin(l * 0.9);
    M4.rotZ(0, mR);
    M4.scale(sxz, sy, sxz, mS);
    M4.mul(mR, mS, mA);
    M4.trans(-1.05, bounce, 0, mT);
    M4.mul(mT, mA, mR);                        /* mR = the dog's root matrix */
    for (i = 0; i < S.parts2; i++) {
      var p = S.parts[i];
      var rz = p.rz + (i === S.parts2 - 2 ? wag * 0.6 : 0) + (i === S.parts2 - 1 ? wag : 0);
      M4.rotZ(rz, mS);
      M4.rotY(p.ry, mT);
      M4.mul(mS, mT, mA);
      M4.compose(p.p, mA, p.s, mM);
      M4.mul(mR, mM, mS);
      gfx.solid(p.m, mS, { color: p.c, rim: 0.32, smooth: false });
    }

    /* ---- the tomato, squeezed along y with ΔV = 0 ----------------------- */
    var press = S.press(l), sY = 1 - 0.42 * press;
    var Rxz = 1 / Math.sqrt(sY);
    for (i = S.parts2; i < S.parts.length; i++) {
      var q = S.parts[i];
      var px = q.p[0], py = q.p[1], pz = q.p[2];
      var sc = [q.s[0], q.s[1], q.s[2]];
      if (i === S.tomatoIdx) {
        /* ellipsoid: V ∝ a·b·c = (R/√s)·(R·s)·(R/√s) = R³ — exactly conserved */
        sc = [0.74 * Rxz, 0.74 * sY, 0.74 * Rxz];
        py = 0.37 * sY;
      } else if (i === S.plateTop) {
        py = 0.37 * sY * 2 + 0.016;
      } else if (i === S.stemIdx) {
        py = 0.37 * sY * 2 + 0.040;
      } else if (i >= S.sepal0 && i < S.sepal0 + 5) {
        py = 0.37 * sY * 2 + 0.006;
      }
      M4.rotZ(q.rz, mS);
      M4.rotY(q.ry, mT);
      M4.mul(mS, mT, mA);
      M4.compose([1.0 + px, py, pz], mA, sc, mM);
      gfx.solid(q.m, mM, { color: q.c, rim: 0.34, smooth: false });
    }

    /* ---- the juice, integrated for real and leaving marks --------------- */
    for (i = 0; i < S.nP; i++) {
      var te = S.tE[i], tl = S.tL[i];
      if (l < te) continue;
      var px2, py2, pz2;
      if (l >= tl) {
        px2 = S.plx[i]; py2 = 0.004; pz2 = S.plz[i];
        var ma = clamp((l - tl) / 0.22, 0, 1) * S.pmk[i];
        M4.mul(M4.trans(px2, py2, pz2, mT), M4.mul(M4.rotX(-PI * 0.5, mR), M4.scale(S.psz[i], S.psz[i], 1, mS), mA), mM);
        SQ.add(mM, R4, [0.90, 0.30, 0.12, ma]);
      } else {
        var tt = l - te;
        px2 = S.p0[i * 3] + S.v0[i * 3] * tt;
        py2 = S.p0[i * 3 + 1] + S.v0[i * 3 + 1] * tt - 49.05 * tt * tt;
        pz2 = S.p0[i * 3 + 2] + S.v0[i * 3 + 2] * tt;
        SP.add(px2, py2, pz2, 2.6 + 1.8 * S.pmk[i], [0.92, 0.34, 0.14], 0.9);
      }
    }
    if (SQ.n) gfx.quads(SQ.view(), null, {});
    if (SP.n) gfx.points(SP.view(), { scale: 1, soft: 0.85, add: false, depthWrite: false });

    /* ---- the three rings, expanding from the snout ---------------------- */
    var goldRGB = I.rgbA("#ffd166", 1);
    for (i = 0; i < 3; i++) {
      var tau3 = l - S.beats[i];
      if (tau3 < 0) continue;
      for (var j = 0; j < 3; j++) {
        var tj = tau3 - j * 0.13;
        if (tj <= 0) continue;
        var r = tj * 3.4;
        if (r > 1.28) continue;
        var aa = Math.max(0, 1 - r / 1.34) * S.amp[i] * 0.85;
        var NSEG = 26;
        for (var k2 = 0; k2 < NSEG; k2++) {
          var t0 = k2 / NSEG * TAU, t1 = (k2 + 1) / NSEG * TAU;
          SL.seg(-0.39 + Math.cos(t0) * r, 0.60 + Math.sin(t0) * r, 0.0,
            -0.39 + Math.cos(t1) * r, 0.60 + Math.sin(t1) * r, 0.0, goldRGB, 1.6, aa);
        }
      }
    }
    if (SL.n) SL.draw(gfx, { add: false, depthWrite: false, glow: 0 });
  };

  WEM.defineSection({
    id: "21",
    name: "DOG · TOMATO",
    init: function (ctx) { S21.build(ctx); },
    enter: function (ctx) { },
    draw2d: function (ctx) { S21.hud(ctx); },
    draw3d: function (ctx) { S21.scene(ctx); }
  });

  /* ======================================================================= */
  /* 22 · STILL SEARCHING -- 287.330 - 295.347                               */
  /*   back to the reading room of segment 06, empty, with one card on the    */
  /*   table.  The rail gets its last fully-lit pass, the chrome fades, the   */
  /*   credits come up line by line, and the film is left on paper with a     */
  /*   cursor that never stops blinking.                                      */
  /* ======================================================================= */
  var S22 = {
    ready: false, panDone: false, PANEL: 2, pan: null,
    CHROME_T0: 291.0, CHROME_T1: 293.5,
    CREDITS: [
      { t: 293.55, s: "music   Mili — world.search (you) ;", size: 22, y: 646 },
      { t: 293.95, s: "visuals computed in real time, in your browser", size: 17, y: 688 },
      { t: 294.25, s: "every score, every neighbour: actually computed", size: 17, y: 724 }
    ],
    LAST: { t: 294.55, fadeT: 295.02, s: "still searching for you", size: 32, y: 806 }
  };

  S22.panels = function (ctx) {
    var S = S22, hud = ctx.hud;
    var p = hud.panel(S.PANEL);
    p.clear();
    S.pan = p;
    /* one catalogue card: the number segment 16 stamped, and nothing else */
    hud.rect(14, 12, 484, 308, { stroke: "rgba(238,242,246,0.55)", lw: 2, ctx: p.ctx });
    hud.rect(24, 22, 464, 288, { stroke: "rgba(238,242,246,0.18)", lw: 1, ctx: p.ctx });
    hud.line(24, 52, 488, 52, { color: "rgba(238,242,246,0.35)", ctx: p.ctx });
    hud.T(38, 44, "CATALOGUE CARD", { size: 15, color: "#9aa3ad", ctx: p.ctx, spacing: 2.4 });
    hud.T(474, 44, "WITHDRAWN", { size: 13, color: "#ff4d5e", ctx: p.ctx, align: "right", spacing: 1.6 });
    hud.T(256, 208, "№ 0412", { size: 108, color: "#eef2f6", align: "center", weight: 600, ctx: p.ctx, font: "mono" });
    hud.line(60, 240, 452, 240, { color: "rgba(238,242,246,0.22)", ctx: p.ctx });
    hud.T(256, 274, "LAST SEEN 2021", { size: 24, color: "#c3cad2", align: "center", ctx: p.ctx, spacing: 4.0 });
    hud.rect(60, 60, 160, 118, { stroke: "rgba(238,242,246,0.22)", lw: 1, ctx: p.ctx });
    hud.T(140, 196, "PHOTOGRAPH MISSING", { size: 11, color: "#5b636c", align: "center", ctx: p.ctx, spacing: 1.2 });
    hud.line(250, 74, 452, 74, { color: "rgba(238,242,246,0.12)", ctx: p.ctx });
    hud.line(250, 104, 452, 104, { color: "rgba(238,242,246,0.12)", ctx: p.ctx });
    hud.line(250, 134, 452, 134, { color: "rgba(238,242,246,0.12)", ctx: p.ctx });
    hud.line(250, 164, 380, 164, { color: "rgba(238,242,246,0.12)", ctx: p.ctx });
  };

  S22.hud = function (ctx) {
    var S = S22, hud = ctx.hud, l = ctx.local, t = ctx.t, i;
    if (!S.ready) return;
    if (!S.panDone) { S.panels(ctx); S.panDone = true; }
    var col = main(ctx), col2 = alt(ctx);

    /* the camera keeps pushing in on the one card, all the way to the end */
    var k = Ease.inOutQuad(clamp(l / 7.6, 0, 1));
    var cam = ctx.cam;
    cam.mode = "persp"; cam.fov = 0.9; cam.near = 0.05; cam.far = 200; cam.roll = 0;
    cam.up[0] = 0; cam.up[1] = 1; cam.up[2] = 0;
    cam.pos[0] = lerp(1.55, 0.09, k); cam.pos[1] = lerp(1.22, 0.60, k); cam.pos[2] = lerp(4.30, 1.25, k);
    cam.target[0] = lerp(-0.20, 0.0, k); cam.target[1] = lerp(-0.14, 0.05, k); cam.target[2] = lerp(-0.10, -0.26, k);

    ctx.hits = 1;

    /* the chrome owns the frame until 291 s, then hands it over */
    var ca = t < S.CHROME_T0 ? 1 : clamp(1 - (t - S.CHROME_T0) / (S.CHROME_T1 - S.CHROME_T0), 0, 1);
    ctx.chromeAmt = ca;

    /* ---- the index rail's last fully-lit pass --------------------------- */
    if (ca > 0.004) {
      var ms = I.MILESTONES, N = ms.length;
      var total = I.litCount(S.CHROME_T0);              /* 26 at 291 s */
      var sweep = clamp((t - 287.33) / 3.67, 0, 1) * total;
      var x0 = 46, x1 = 1874, span = (x1 - x0) / N;
      hud.line(x0, 900, x1, 900, { color: "rgba(238,242,246," + (0.28 * ca) + ")" });
      hud.line(x0, 897, x1, 897, { color: "rgba(238,242,246," + (0.12 * ca) + ")" });
      for (i = 0; i < N; i++) {
        var m = ms[i], on = sweep > i, up = m.lane === 0;
        var frac = clamp(sweep - i, 0, 1);
        var hh = (up ? 18 : 11) * (on ? (0.55 + 0.45 * frac) : 1);
        var tx = x0 + i * span + 8, tw = span - 26;
        hud.rect(tx, up ? 900 - hh : 902, tw, hh, {
          fill: on ? col : "rgba(238,242,246,0.16)",
          alpha: (on ? (0.30 + 0.70 * frac) : 0.5) * ca
        });
        if (!up) hud.rect(tx, 902, tw, hh, { fill: on ? col : "rgba(238,242,246,0.16)", alpha: (on ? 0.7 : 0.4) * ca });
      }
      hud.T(46, 862, "THE INDEX · LAST PASS", { size: 10, color: "#9aa3ad", alpha: 0.9 * ca, spacing: 2.0 });
      hud.T(1874, 862, "MILESTONES LIT " + Math.floor(Math.min(sweep, total)) + " / " + total,
        { size: 13, color: col, alpha: ca, align: "right", spacing: 1.2 });
      var la = smoothstep(0.955, 1.0, sweep / total) * ca;
      hud.T(960, 862, total + " MILESTONES · 81 YEARS · ONE QUERY", {
        size: 20, color: col, align: "center", alpha: la, weight: 600, spacing: 2.4
      });
    }

    /* ---- the credits ---------------------------------------------------- */
    var i2;
    for (i2 = 0; i2 < S.CREDITS.length; i2++) {
      var cr = S.CREDITS[i2];
      var aa = smoothstep(cr.t, cr.t + 0.62, t);
      if (aa <= 0.004) continue;
      hud.T(960, cr.y, cr.s, {
        size: cr.size, font: i2 === 0 ? "mono" : "ui", color: i2 === 0 ? "#eef2f6" : "#c3cad2",
        align: "center", alpha: aa * (i2 === 0 ? 0.95 : 0.88), spacing: i2 === 0 ? 0.6 : 0.3
      });
    }
    var L = S.LAST;
    var la2 = smoothstep(L.t, L.t + 0.62, t);
    var lfade = 1 - smoothstep(L.fadeT, L.fadeT + 0.26, t);
    var fc = hud.fc, tw = 0;
    fc.save(); fc.font = hud.fontStr(L.size, "mono", 600); tw = fc.measureText(L.s).width; fc.restore();
    if (la2 > 0.004 && lfade > 0.004) {
      hud.T(960, L.y, L.s, { size: L.size, color: col, align: "center", alpha: la2 * lfade * 0.98, weight: 600, spacing: 0.4 });
    }
    /* the query line it was typed on, and the cursor that stays behind */
    var ruleA = smoothstep(L.fadeT, L.fadeT + 0.4, t) * 0.9 + la2 * lfade * 0.25;
    if (ruleA > 0.004) {
      hud.line(960 - tw * 0.5 - 12, L.y + 12, 960 + tw * 0.5 + 12, L.y + 12,
        { color: "rgba(238,242,246," + (0.14 * clamp(ruleA, 0, 1)) + ")" });
    }
    var caretA = clamp(smoothstep(L.fadeT - 0.1, L.fadeT + 0.3, t), 0, 1);
    if (caretA > 0.004) {
      hud.rect(960 + tw * 0.5 + 9, L.y - L.size * 0.72, 2.5, L.size * 0.95,
        { fill: col, alpha: caretA * blink(ctx) });
    }
  };

  S22.scene = function (ctx) {
    var S = S22, gfx = ctx.gfx, i;
    if (!S.ready) return;
    var col2 = I.rgbA(alt(ctx), 1);
    SL.clear(); SQ.clear();

    /* the room from segment 06, empty.  No floor and no ground shadow: the
       table, the row of chairs and the fixtures are drawn straight onto the
       sheet, which is what keeps the composition area clear of the rail. */
    var wall = G.plane(26, 6, 1);
    M4.trans(0, 2.25, -7.4, mM);
    gfx.solid(wall, mM, { color: [0.09, 0.10, 0.12], rim: 0.08 });
    /* the skirting rule where a floor would have been: two hairlines, paper */
    SL.seg(-11, -0.75, -7.35, 11, -0.75, -7.35, col2, 1.4, 0.32);
    SL.seg(-11, -0.69, -7.35, 11, -0.69, -7.35, col2, 1.0, 0.14);

    /* the long table */
    M4.trans(0, -0.045, 0, mM);
    gfx.solid(G.box(4.2, 0.09, 1.4), mM, { color: [0.46, 0.36, 0.26], rim: 0.22 });
    for (i = 0; i < 4; i++) {
      var lx = (i & 1) ? 1.90 : -1.90, lz = (i & 2) ? 0.45 : -0.45;
      M4.trans(lx, -0.20, lz, mM);
      gfx.solid(G.box(0.10, 0.30, 0.10), mM, { color: [0.34, 0.26, 0.18], rim: 0.16 });
    }
    /* one row of empty chairs behind it, and two at the ends */
    for (i = 0; i < 6; i++) {
      var cx, cz;
      if (i < 4) { cx = -1.5 + i; cz = -1.06; } else { cx = (i === 4) ? -2.15 : 2.15; cz = 0; }
      var sgn = (i < 4) ? -1 : 0;
      M4.trans(cx, -0.22, cz, mM);
      gfx.solid(G.box(0.44, 0.05, 0.44), mM, { color: [0.32, 0.26, 0.20], rim: 0.2 });
      M4.trans(cx, 0.00, cz + 0.24 * sgn, mM);
      gfx.solid(G.box(0.44, 0.50, 0.05), mM, { color: [0.32, 0.26, 0.20], rim: 0.2 });
      M4.trans(cx, -0.35, cz, mM);
      gfx.solid(G.box(0.34, 0.30, 0.34), mM, { color: [0.26, 0.21, 0.16], rim: 0.16 });
    }
    for (i = 0; i < 3; i++) {
      M4.trans(-1.9 + i * 1.9, 2.10, -0.45, mM);
      gfx.solid(G.box(1.5, 0.07, 0.22), mM, { color: [0.60, 0.64, 0.68], unlit: true, rim: 0.1 });
    }

    /* the one card left on the table, leaning back against a small ledge */
    M4.trans(0, 0.025, -0.13, mM);
    gfx.solid(G.box(0.30, 0.05, 0.09), mM, { color: [0.24, 0.20, 0.16], rim: 0.2 });
    if (S.pan) {
      var rc = irect(S.pan, 0, 0, 512, 335, UV);
      SQ.add(place(0, 0.148, -0.196, -0.30, 0.46, 0.30, mM), rc, [1, 1, 1, 1]);
      SQ.add(place(0, 0.148, -0.203, -0.30, 0.49, 0.325, mM), R4, [0.30, 0.30, 0.32, 1]);
    }
    if (SQ.n) gfx.quads(SQ.view(), S.pan ? ctx.hud.tPan : null, {});
    if (SL.n) SL.draw(gfx, { add: false, depthWrite: false, glow: 0 });
  };

  WEM.defineSection({
    id: "22",
    name: "STILL SEARCHING",
    init: function (ctx) { S22.ready = true; },
    enter: function (ctx) { S22.panDone = false; },
    draw2d: function (ctx) { S22.hud(ctx); },
    draw3d: function (ctx) { S22.scene(ctx); }
  });
})();
