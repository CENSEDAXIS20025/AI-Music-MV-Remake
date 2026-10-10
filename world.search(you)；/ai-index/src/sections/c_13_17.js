/* sections 13-17 — the word, the whole map, the retry, what was lost, and buckets */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, I = WEM.Idx, V = WEM.Viz;
  var clamp = C.clamp, lerp = C.lerp, Ease = C.Ease, M4 = C.M4, G = C.geo;
  var smoothstep = C.smoothstep, TAU = Math.PI * 2;
  var INK = "#eef2f6", GREY = "#c3cad2", DIMT = "#9aa3ad", FAINT = "#5b636c";
  var REDPEN = "#ff4d5e";

  /* ====================================================================== *
   *  0 · SHARED MACHINERY                                                  *
   *                                                                        *
   *  Everything the three word-space segments need is computed here, once, *
   *  from this song's own lyrics: a real embedding, its principal plane,    *
   *  and the neighbour / analogy queries the instrument displays.          *
   * ====================================================================== */

  /* deterministic hash — no Math.random anywhere in this file */
  function fnv(str, salt) {
    var h = (2166136261 ^ (salt | 0)) >>> 0, i;
    for (i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= h >>> 13;
    return h >>> 0;
  }

  // This song's own words. "Lo-o-o-ove" collapses to "loooove" and then to
  // "love": the held vowel is the same word, and a real index would fold it.
  function tokensOf(line) {
    var raw = String(line == null ? "" : line).split(/\s+/), out = [], i, w;
    for (i = 0; i < raw.length; i++) {
      w = raw[i].replace(/[^A-Za-z']/g, "").toLowerCase();
      w = w.replace(/([a-z])\1{2,}/g, "$1");
      if (w) out.push(w);
    }
    return out;
  }

  var SUB = 32, CTX = 64, DIM = SUB + CTX;   // form dims | meaning dims

  // words the film types that the lyrics never sing
  var EXTRA = ["time", "search", "find", "hold", "word", "love", "you", "me",
    "looking", "however", "stayed", "behind", "more", "where", "did", "go", "stay"];

  // function words: they carry the co-occurrence but they are not neighbours
  var STOP = {
    the: 1, a: 1, an: 1, of: 1, to: 1, in: 1, it: 1, is: 1, at: 1, on: 1, by: 1, so: 1, be: 1,
    as: 1, up: 1, do: 1, if: 1, my: 1, we: 1, us: 1, i: 1, that: 1, this: 1, with: 1, for: 1,
    and: 1, but: 1, or: 1, has: 1, have: 1, can: 1, could: 1, must: 1, will: 1, there: 1,
    where: 1, what: 1, when: 1, who: 1, now: 1, then: 1, than: 1, not: 1, no: 1, from: 1,
    o: 1, u: 1, did: 1, go: 1, more: 1, are: 1, was: 1, were: 1, all: 1, into: 1, you: 1, me: 1
  };

  function normRange(v, a, b) {
    var s = 0, i;
    for (i = a; i < b; i++) s += v[i] * v[i];
    s = Math.sqrt(s) || 1;
    for (i = a; i < b; i++) v[i] /= s;
  }

  /* ---------------------------------------------------------------- the lexicon
     A real embedding of this film's vocabulary, built from the LRC at load:
       dims  0 .. 31   hashed character 2..4-grams        (form / subword)
       dims 32 .. 95   random-indexing projection of the real +-5 token
                       co-occurrence, weighted by smooth inverse frequency
                       (Arora et al. 2017) — i.e. meaning, not spelling.
     A word the corpus never used (time, search, find, hold) borrows the
     context of every lyric word it shares a 3+ character stem with, and
     keeps its own subword vector. So every query the film types has a
     vector, and every cosine the film shows is computed from these. */
  var LEX = null;
  function lexicon(ctx) { if (!LEX) LEX = buildLexicon(ctx); return LEX; }

  function buildLexicon(ctx) {
    var lrc = ctx.data.lrc, lines = [], i, j, k, d, w;
    for (i = 0; i < lrc.length; i++) lines.push(tokensOf(lrc[i].text));

    var freq = {}, order = [];
    for (i = 0; i < lines.length; i++) {
      for (j = 0; j < lines[i].length; j++) {
        w = lines[i][j];
        if (freq[w] === undefined) { freq[w] = 0; order.push(w); }
        freq[w]++;
      }
    }
    for (i = 0; i < EXTRA.length; i++) {
      if (freq[EXTRA[i]] === undefined) { freq[EXTRA[i]] = 0; order.push(EXTRA[i]); }
    }
    var N = order.length, idx = {}, vec = new Array(N);
    for (i = 0; i < N; i++) { idx[order[i]] = i; vec[i] = new Float32Array(DIM); }

    // (a) form: signed hashed character n-grams of "^word$"
    for (i = 0; i < N; i++) {
      var s = "^" + order[i] + "$", v = vec[i], n, h;
      for (n = 2; n <= 4; n++) {
        for (j = 0; j + n <= s.length; j++) {
          h = fnv(s.substr(j, n), 11 + n * 977);
          v[h % SUB] += (((h >>> 20) & 1) ? 1 : -1) * (n === 4 ? 0.5 : n === 3 ? 1 : 0.6);
        }
      }
      normRange(v, 0, SUB);
    }

    // (b) meaning: every line votes for the words that surround each word
    for (i = 0; i < lines.length; i++) {
      var L = lines[i];
      for (j = 0; j < L.length; j++) {
        var vw = vec[idx[L[j]]];
        for (d = -5; d <= 5; d++) {
          var jj = j + d;
          if (d === 0 || jj < 0 || jj >= L.length) continue;
          var ad = d < 0 ? -d : d;
          var wt = (ad === 1 ? 1 : ad === 2 ? 0.8 : ad === 3 ? 0.6 : ad === 4 ? 0.4 : 0.25) / Math.sqrt(freq[L[jj]]);
          var h1 = fnv(L[jj], 55), h2 = fnv(L[jj], 9173);
          vw[SUB + h1 % CTX] += (((h1 >>> 19) & 1) ? 1 : -1) * wt * 0.72;
          vw[SUB + h2 % CTX] += (((h2 >>> 19) & 1) ? 1 : -1) * wt * 0.72;
        }
      }
    }
    for (i = 0; i < N; i++) normRange(vec[i], SUB, DIM);

    // (c) words this song never sang: morphological backoff into the context space
    for (i = 0; i < N; i++) {
      if (freq[order[i]] > 0) continue;
      var any = 0, a = order[i];
      for (k = 0; k < N; k++) {
        if (k === i || freq[order[k]] === 0) continue;
        var b = order[k], m = a.length < b.length ? a.length : b.length, pre = 0, suf = 0;
        for (j = 0; j < m && a.charCodeAt(j) === b.charCodeAt(j); j++) pre = j + 1;
        for (j = 1; j <= m && a.charCodeAt(a.length - j) === b.charCodeAt(b.length - j); j++) suf = j;
        var best = pre > suf ? pre : suf;
        if (best >= 3) {
          var ww = (best - 2) / 3; if (ww > 1) ww = 1;
          for (d = SUB; d < DIM; d++) vec[i][d] += vec[k][d] * ww;
          any += ww;
        }
      }
      if (any) normRange(vec[i], SUB, DIM);
    }

    // (d) form is half the story, meaning is the other half; then unit length
    var sif = {};
    for (i = 0; i < N; i++) {
      for (d = 0; d < SUB; d++) vec[i][d] *= 0.5;
      normRange(vec[i], 0, DIM);
      sif[order[i]] = 1 / Math.sqrt(1 + freq[order[i]]);
    }
    return { V: order, idx: idx, vec: vec, freq: freq, N: N, sif: sif };
  }

  function lexWord(lex, w) { var i = lex.idx[w]; return i === undefined ? null : lex.vec[i]; }
  function lexDot(a, b) { var s = 0, i; for (i = 0; i < DIM; i++) s += a[i] * b[i]; return s; }

  // a query string pooled into one vector (smooth-inverse-frequency weighted)
  function lexQuery(lex, text) {
    var t = tokensOf(text), v = new Float32Array(DIM), i, d, w, s, n = 0;
    for (i = 0; i < t.length; i++) {
      w = lexWord(lex, t[i]);
      if (!w) continue;
      s = lex.sif[t[i]] || 0.4;
      for (d = 0; d < DIM; d++) v[d] += w[d] * s;
      n++;
    }
    if (!n) v[0] = 1;
    normRange(v, 0, DIM);
    return v;
  }

  function lexTop(lex, q, k, keep) {
    var out = [], i, res = [];
    for (i = 0; i < lex.N; i++) out.push({ w: lex.V[i], c: lexDot(q, lex.vec[i]) });
    out.sort(function (a, b) { return b.c - a.c; });
    for (i = 0; i < out.length && res.length < k; i++) {
      if (keep && !keep(out[i])) continue;
      res.push(out[i]);
    }
    return res;
  }

  function lexAnalogy(lex, a, b, c) {
    var va = lexWord(lex, a), vb = lexWord(lex, b), vc = lexWord(lex, c);
    var v = new Float32Array(DIM), i;
    for (i = 0; i < DIM; i++) v[i] = va[i] - vb[i] + vc[i];
    // the sum has to be a unit vector before its dot products are cosines
    normRange(v, 0, DIM);
    var top = lexTop(lex, v, 4, function (e) {
      return e.w !== a && e.w !== b && e.w !== c && !STOP[e.w] && e.w.indexOf("'") < 0;
    });
    return { a: a, b: b, c: c, v: v, top: top, word: top.length ? top[0].w : "—", cos: top.length ? top[0].c : 0 };
  }

  /* ------------------------------------------------------- principal plane
     Power iteration on the covariance of the 96-dim vectors — the same
     projection section 12 uses, computed here so the cloud behind the ring
     is a real picture of the space rather than a scatter. */
  function makeBasis(lex, comps) {
    var N = lex.N, d, i, a, b, it, c;
    var mean = new Float32Array(DIM);
    for (i = 0; i < N; i++) for (d = 0; d < DIM; d++) mean[d] += lex.vec[i][d] / N;
    var cov = new Float32Array(DIM * DIM);
    for (i = 0; i < N; i++) {
      for (a = 0; a < DIM; a++) {
        var xa = lex.vec[i][a] - mean[a];
        for (b = a; b < DIM; b++) cov[a * DIM + b] += xa * (lex.vec[i][b] - mean[b]);
      }
    }
    for (a = 0; a < DIM; a++) for (b = a + 1; b < DIM; b++) cov[b * DIM + a] = cov[a * DIM + b];
    var r = C.rng(0x1D3A), out = [];
    for (c = 0; c < comps; c++) {
      var u = new Float32Array(DIM);
      for (i = 0; i < DIM; i++) u[i] = r() - 0.5;
      for (it = 0; it < 56; it++) {
        var nx = new Float32Array(DIM);
        for (a = 0; a < DIM; a++) {
          var s = 0;
          for (b = 0; b < DIM; b++) s += cov[a * DIM + b] * u[b];
          nx[a] = s;
        }
        normRange(nx, 0, DIM);
        u = nx;
      }
      out.push(u);
      var lam = 0;
      for (a = 0; a < DIM; a++) {
        var s2 = 0;
        for (b = 0; b < DIM; b++) s2 += cov[a * DIM + b] * u[b];
        lam += u[a] * s2;
      }
      for (a = 0; a < DIM; a++) for (b = 0; b < DIM; b++) cov[a * DIM + b] -= lam * u[a] * u[b];
    }
    return { mean: mean, u: out };
  }

  // centred projection, in world units, normalised so the cloud fits `span`
  function project(basis, v, out) {
    var k, d, s;
    for (k = 0; k < 3; k++) {
      s = 0;
      for (d = 0; d < DIM; d++) s += basis.u[k][d] * (v[d] - basis.mean[d]);
      out[k] = s;
    }
    return out;
  }

  function makeCloud(lex, basis, span) {
    var pts = new Float32Array(lex.N * 3), i, p = [0, 0, 0], mx = 1e-6;
    for (i = 0; i < lex.N; i++) {
      project(basis, lex.vec[i], p);
      pts[i * 3] = p[0]; pts[i * 3 + 1] = p[1]; pts[i * 3 + 2] = p[2];
      mx = Math.max(mx, Math.abs(p[0]), Math.abs(p[1]));
    }
    var k = span / mx;
    for (i = 0; i < lex.N * 3; i++) pts[i] *= k;
    return pts;
  }

  /* ---------------------------------------------------------------- helpers */
  function beatIndexAt(ctx, t) {
    var B = ctx.data.beats, lo = 0, hi = B.length - 1, idx = -1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (B[mid] <= t) { idx = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return idx < 0 ? 0 : idx;
  }
  function beatTime(ctx, i) {
    var B = ctx.data.beats;
    return B[clamp(i, 0, B.length - 1)];
  }

  /* ====================================================================== *
   *  13 · LOVE — 165.530 .. 179.600                                        *
   *  The word arrived. Now the instrument shows what surrounds it: the real *
   *  cosine neighbourhood, and two real analogy parallelograms.            *
   * ====================================================================== */
  var S13 = null;

  WEM.defineSection({
    id: "13",
    name: "LOVE",
    init: function (ctx) {
      var lex = lexicon(ctx), i;
      var st = S13 = { lex: lex };

      st.love = lexWord(lex, "love");
      st.nei = lexTop(lex, st.love, 12, function (e) {
        return e.w !== "love" && !STOP[e.w] && e.w.indexOf("'") < 0 && lex.freq[e.w] > 0;
      });
      st.a1 = lexAnalogy(lex, "you", "me", "time");
      st.a2 = lexAnalogy(lex, "search", "find", "hold");
      st.basis = makeBasis(lex, 3);
      st.cloud = makeCloud(lex, st.basis, 4.4);
      st.freqLove = lex.freq["love"] || 0;

      // the ring: rank i sits at its own angle, and a word that is closer in
      // the space stands closer to the centre
      var cmax = st.nei[0] ? st.nei[0].c : 1, cmin = st.nei[st.nei.length - 1] ? st.nei[st.nei.length - 1].c : 0;
      st.ring = [];
      for (i = 0; i < st.nei.length; i++) {
        var f = cmax > cmin ? (st.nei[i].c - cmin) / (cmax - cmin) : 0.5;
        st.ring.push({ w: st.nei[i].w, c: st.nei[i].c, a: -Math.PI / 2 + i * TAU / st.nei.length, r: lerp(1.62, 1.06, f) });
      }

      // the two parallelograms: e1 = A - B, e2 = C, result e1 + e2, all in
      // the real principal plane of the space
      st.par = [makePara(lex, st.basis, st.a1), makePara(lex, st.basis, st.a2)];

      st.pts = new V.Points(600);
      st.lns = new V.Lines(500);
    },
    enter: function (ctx) { /* every value is derived from ctx.t / the LRC */ },
    draw2d: function (ctx) {
      var st = S13, L = ctx.local;
      // three movements: the ring, the two parallelograms, the ring again
      var push = L < 6.2 ? Ease.inOutCubic(clamp((L - 0.25) / 5.4, 0, 1))
        : L < 10.9 ? 1 - 0.34 * Ease.inOutCubic(clamp((L - 6.4) / 1.5, 0, 1))
          : 0.66 + 0.34 * Ease.inOutCubic(clamp((L - 11.1) / 1.6, 0, 1));
      var d = lerp(9.0, 4.7, push);
      ctx.cam.mode = "persp";
      ctx.cam.fov = 0.9;
      ctx.cam.pos[0] = 0; ctx.cam.pos[1] = 0.30 + 0.10 * ctx.beat.barPulse; ctx.cam.pos[2] = d;
      ctx.cam.target[0] = 0; ctx.cam.target[1] = 0.06; ctx.cam.target[2] = 0;
      ctx.cam.up[0] = 0; ctx.cam.up[1] = 1; ctx.cam.up[2] = 0;

      var col = I.css(ctx.t), col2 = I.css2(ctx.t);
      var hud = ctx.hud, W = ctx.W;
      var inA = ctx.in;

      // ---- the query bar carries the match that finally happened ----
      I.queryBar(ctx, { hits: 1, note: "EXACT MATCH", prog: 1, alpha: inA });
      ctx.__qDrawn = ctx.t;
      ctx.hits = 1;

      // ---- left: the entry, cold as a dictionary ----
      var box = I.card(ctx, 46, 150, 384, 336, { title: "ENTRY", tab: "13 · LOVE", right: "96-D", alpha: inA });
      hud.T(66, 232, "LOVE", { size: 54, color: col, weight: 700, spacing: 5, alpha: inA });
      hud.T(68, 262, "/lʌv/", { size: 15, color: col2, alpha: 0.9 * inA });
      hud.T(140, 262, "noun", { size: 13, color: DIMT, alpha: 0.85 * inA, spacing: 1.2 });
      var SENSES = [
        "1 · a strong feeling of deep affection",
        "2 · the object of that feeling; a beloved person",
        "3 · great interest and pleasure in something",
        "4 · (tennis) a score of zero",
        "5 · to hold dear; to prize above others"
      ];
      for (var s = 0; s < SENSES.length; s++) {
        hud.T(66, 292 + s * 21, SENSES[s], { size: 12, color: GREY, alpha: 0.86 * inA });
      }
      hud.line(66, 402, 410, 402, { color: I.hexA(col, 0.28 * inA) });
      hud.T(66, 424, "FREQ " + st.freqLove + " · LYRICS " + ctx.data.lrc.length + " LINES", { size: 10, color: DIMT, alpha: 0.8 * inA, spacing: 1.1 });
      hud.T(66, 444, "VEC 96-D · UNIT LENGTH · FORM ⊕ CONTEXT", { size: 10, color: FAINT, alpha: 0.75 * inA, spacing: 1.1 });
      hud.T(66, 464, "NEIGHBOURS BY COSINE", { size: 10, color: I.hexA(col2, 0.9 * inA), alpha: inA, spacing: 1.6 });

      // ---- right: the twelve neighbours, real cosines ----
      I.card(ctx, 1420, 150, 454, 372, { title: "12 NEIGHBOURS", tab: "k-NN", right: "cos", alpha: inA });
      for (var n = 0; n < st.nei.length; n++) {
        var y = 196 + n * 27;
        I.resultRow(ctx, 1438, y, 418, st.nei[n].w.toUpperCase(), clamp(st.nei[n].c, 0, 1), {
          alpha: inA * (n === 0 ? 1 : 0.92), barW: 96, size: 12,
          bright: n < 3, color: n < 3 ? col : col2
        });
      }

      // ---- bottom: the two analogies ----
      var ana = 0.45 + 0.55 * (1 - Math.abs(clamp((L - 8.55) / 2.35, -1, 1)));
      for (var q = 0; q < st.par.length; q++) {
        var P = st.par[q], yy = 826 + q * 44;
        var hl = q === 0 ? ana : ana * 0.9;
        hud.T(46, yy, P.a.toUpperCase() + " − " + P.b.toUpperCase() + " + " + P.c.toUpperCase() + "  =  " + P.word.toUpperCase(),
          { size: 17, color: q === 0 ? col : col2, alpha: inA * (0.55 + 0.45 * hl), spacing: 1.6, weight: 600 });
        hud.T(560, yy, P.cos.toFixed(3), { size: 15, color: INK, alpha: inA * (0.5 + 0.5 * hl), align: "right" });
        hud.T(586, yy, "cos", { size: 10, color: FAINT, alpha: 0.8 * inA, spacing: 1.2 });
        var alt = P.top[1];
        if (alt) hud.T(640, yy, "then " + alt.w.toUpperCase() + " " + alt.c.toFixed(3), { size: 11, color: DIMT, alpha: 0.7 * inA * hl });
      }
      hud.T(46, 908, "NEAREST OVER " + st.lex.N + " LEXICON WORDS · STOPWORDS EXCLUDED", { size: 10, color: FAINT, alpha: 0.7 * inA, spacing: 1.2 });
      hud.T(W - 46, 908, "2018 BERT · BIDIRECTIONAL CONTEXT", { size: 10, color: DIMT, alpha: 0.45 * inA, align: "right", spacing: 1.2 });
    },
    draw3d: function (ctx) {
      var st = S13, L = ctx.local, t = ctx.t;
      var col = I.rgbA(I.css(t), 1), col2 = I.rgbA(I.css2(t), 1);
      var gfx = ctx.gfx;
      var yaw = 0.235 * L;
      var ringA = 1 - smoothstep(6.1, 7.4, L) + smoothstep(10.6, 11.9, L);
      ringA = clamp(ringA, 0, 1);
      var parA = clamp(smoothstep(6.1, 7.4, L) - smoothstep(10.7, 12.0, L), 0, 1);
      var tighten = 1 - 0.14 * smoothstep(11.4, 13.4, L);

      // ---- the cloud: the whole lexicon, projected into its principal plane ----
      var P = st.pts; P.clear();
      var cy = Math.cos(yaw), sy = Math.sin(yaw);
      for (var i = 0; i < st.lex.N; i++) {
        var x0 = st.cloud[i * 3], y0 = st.cloud[i * 3 + 1], z0 = st.cloud[i * 3 + 2] * 0.35 - 4.2;
        var xr = x0 * cy - z0 * sy, zr = x0 * sy + z0 * cy;
        var dep = clamp((zr + 8.4) / 9.0, 0, 1);
        var f = st.lex.freq[st.lex.V[i]] > 0 ? 1 : 0.45;
        P.add(xr, y0 + 0.05, zr, 0.035 + 0.030 * dep, col2, (0.10 + 0.26 * dep) * f * (0.35 + 0.65 * ringA));
      }
      P.draw(gfx, { add: true, depthWrite: false, soft: 0.85, scale: 1 });

      // ---- the dial: love at the centre, its twelve real neighbours around it ----
      var Ln = st.lns; Ln.clear();
      var rr = I.rgbA(REDPEN, 1);
      var lab = [];
      for (var k = 0; k < st.ring.length; k++) {
        var e = st.ring[k], rr2 = e.r * tighten;
        var x = Math.cos(e.a) * rr2, y = Math.sin(e.a) * rr2 * 0.82, z = Math.sin(e.a * 1.0) * 0.10;
        var px = x * cy - z * sy, pz = x * sy + z * cy;
        var wdt = 0.7 + 4.6 * e.c;
        Ln.seg(0, 0, 0, px, y, pz, col, wdt, (0.30 + 0.70 * e.c) * ringA);
        Ln.seg(px, y, pz, px * 1.03, y * 1.03, pz * 1.03, col2, 3.0, 0.85 * ringA);
        lab.push({ w: e.w, c: e.c, x: px * 1.10, y: y * 1.10 + 0.02, z: pz * 1.10 });
      }
      // the bezel, with a tick every 30 degrees
      for (var s = 0; s < 24; s++) {
        var a0 = s / 24 * TAU, a1 = (s + 1) / 24 * TAU;
        var R0 = 1.92 * tighten;
        Ln.seg(Math.cos(a0) * R0, Math.sin(a0) * R0 * 0.82, 0, Math.cos(a1) * R0, Math.sin(a1) * R0 * 0.82, 0,
          col2, 1.0, 0.20 * ringA);
        if (s % 2 === 0) {
          Ln.seg(Math.cos(a0) * R0 * 0.97, Math.sin(a0) * R0 * 0.80, 0, Math.cos(a0) * R0 * 0.94, Math.sin(a0) * R0 * 0.775, 0,
            col2, 1.6, 0.55 * ringA);
        }
      }
      // a red pen ring around the word itself, once it has arrived
      var arrived = clamp((t - 177.35) / 0.9, 0, 1);
      if (arrived > 0.001) {
        for (var q = 0; q < 30; q++) {
          var b0 = q / 30 * TAU, b1 = (q + 1) / 30 * TAU, Rq = 0.34 + 0.012 * Math.sin(q * 2.1);
          Ln.seg(Math.cos(b0) * Rq, Math.sin(b0) * Rq, 0.02, Math.cos(b1) * Rq, Math.sin(b1) * Rq, 0.02, rr, 2.6, 0.9 * arrived);
        }
      }
      Ln.draw(gfx, { add: true, depthWrite: false, glow: 0.35 });

      // ---- the two parallelograms ----
      if (parA > 0.01) {
        var Lp = st.lns;
        for (var pi = 0; pi < st.par.length; pi++) {
          var Pa = st.par[pi];
          var ox = pi === 0 ? -2.02 : 2.02, oz = 0.42 + 0.10 * parA;
          var O = [ox, -0.62, oz], E1 = [Pa.e1[0], Pa.e1[1], 0], E2 = [Pa.e2[0], Pa.e2[1], 0];
          var P1 = [O[0] + E1[0], O[1] + E1[1], oz], P2 = [O[0] + E2[0], O[1] + E2[1], oz];
          var PR = [O[0] + E1[0] + E2[0], O[1] + E1[1] + E2[1], oz];
          var ink = I.rgbA(I.css(t), 1);
          var shade = [0.55, 0.62, 0.72];
          Lp.seg(O[0], O[1], oz, P1[0], P1[1], oz, ink, 2.4, 0.85 * parA);
          Lp.seg(O[0], O[1], oz, P2[0], P2[1], oz, ink, 2.4, 0.85 * parA);
          Lp.seg(P1[0], P1[1], oz, PR[0], PR[1], oz, shade, 1.8, 0.7 * parA);
          Lp.seg(P2[0], P2[1], oz, PR[0], PR[1], oz, shade, 1.8, 0.7 * parA);
          // the diagonal is the answer
          for (var dq = 0; dq < 12; dq++) {
            var u0 = dq / 12, u1 = (dq + 1) / 12;
            Lp.seg(lerp(O[0], PR[0], u0), lerp(O[1], PR[1], u0), oz + 0.005,
              lerp(O[0], PR[0], u1), lerp(O[1], PR[1], u1), oz + 0.005, I.rgbA(REDPEN, 1), 1.8, 0.55 * parA);
          }
          // red pen circle on the result
          for (var rq = 0; rq < 22; rq++) {
            var c0 = rq / 22 * TAU, c1 = (rq + 1) / 22 * TAU;
            Lp.seg(PR[0] + Math.cos(c0) * 0.085, PR[1] + Math.sin(c0) * 0.085, oz + 0.02,
              PR[0] + Math.cos(c1) * 0.085, PR[1] + Math.sin(c1) * 0.085, oz + 0.02, I.rgbA(REDPEN, 1), 2.2, 0.9 * parA);
          }
          lab.push({ w: Pa.word.toUpperCase(), c: Pa.cos, x: PR[0] + 0.14, y: PR[1] + 0.05, z: oz, red: true });
          lab.push({ w: Pa.a.toUpperCase() + " − " + Pa.b.toUpperCase(), c: -1, x: P1[0], y: P1[1] - 0.13, z: oz, small: true });
          lab.push({ w: Pa.c.toUpperCase(), c: -1, x: P2[0] + 0.10, y: P2[1] + 0.04, z: oz, small: true });
        }
        Lp.draw(gfx, { add: true, depthWrite: false, glow: 0.45 });
      }

      // ---- 3D labels, projected with this frame's camera ----
      var hud = ctx.hud;
      for (var li = 0; li < lab.length; li++) {
        var e2 = lab[li];
        var sp = ctx.util.vp(e2.x, e2.y, e2.z);
        if (sp[2] <= 0.05) continue;
        var sx = sp[0], sy2 = sp[1];
        if (sx < 60 || sx > 1860 || sy2 < 130 || sy2 > 918) continue;
        if (e2.red) {
          hud.T(sx, sy2 - 12, e2.w, { size: 20, color: REDPEN, weight: 600, alpha: 0.95 * parA, spacing: 1.4 });
          hud.T(sx, sy2 + 6, e2.c.toFixed(3), { size: 11, color: REDPEN, alpha: 0.7 * parA });
        } else if (e2.small) {
          hud.T(sx, sy2, e2.w, { size: 10, color: DIMT, alpha: 0.68 * parA, align: "center" });
        } else {
          hud.T(sx, sy2, e2.w + "  " + e2.c.toFixed(3), {
            size: 11, color: e2.c > 0.32 ? INK : DIMT, alpha: (0.45 + 0.5 * clamp(e2.c, 0, 1)) * ringA, align: "center"
          });
        }
      }
      // the word itself, at the centre of its own neighbourhood
      var spc = ctx.util.vp(0, 0, 0);
      if (spc[2] > 0.05) {
        hud.T(spc[0], spc[1] + 10, "LOVE", { size: 40, color: INK, weight: 700, align: "center", spacing: 6, alpha: 0.95 * ringA });
        hud.T(spc[0], spc[1] + 30, "1.000", { size: 10, color: FAINT, align: "center", alpha: 0.8 * ringA, spacing: 1.4 });
      }
    }
  });

  // a real parallelogram: e1 = A - B, e2 = C, projected into the principal plane
  function makePara(lex, basis, an) {
    var e1 = new Float32Array(DIM), e2 = new Float32Array(DIM), i;
    var va = lexWord(lex, an.a), vb = lexWord(lex, an.b), vc = lexWord(lex, an.c);
    for (i = 0; i < DIM; i++) { e1[i] = va[i] - vb[i]; e2[i] = vc[i]; }
    var p1 = [0, 0, 0], p2 = [0, 0, 0], k, d;
    for (k = 0; k < 2; k++) {
      var s1 = 0, s2 = 0;
      for (d = 0; d < DIM; d++) { s1 += basis.u[k][d] * e1[d]; s2 += basis.u[k][d] * e2[d]; }
      p1[k] = s1; p2[k] = s2;
    }
    var mx = 1e-6;
    mx = Math.max(mx, Math.abs(p1[0]), Math.abs(p1[1]), Math.abs(p2[0]), Math.abs(p2[1]),
      Math.abs(p1[0] + p2[0]), Math.abs(p1[1] + p2[1]));
    var sc = 1.25 / mx;
    return {
      a: an.a, b: an.b, c: an.c, word: an.word, cos: an.cos, top: an.top,
      e1: [p1[0] * sc, p1[1] * sc], e2: [p2[0] * sc, p2[1] * sc]
    };
  }

  /* ====================================================================== *
   *  14 · EVERYWHERE — 179.600 .. 193.300                                  *
   *  A wall of 960 index cards. A query sweeps it and most of the wall     *
   *  lights up — and then every card changes what it is, and the matches   *
   *  expire. Eight cycles.                                                 *
   * ====================================================================== */
  var W_COLS = 40, W_ROWS = 24, W_N = W_COLS * W_ROWS, W_PITCH = 0.33;
  var THINGS = ["table", "eggplant", "cat", "steak", "flower", "human",
    "dog", "tomato", "bucket", "sheet", "memory", "word"];

  var S14 = null;

  WEM.defineSection({
    id: "14",
    name: "EVERYWHERE",
    init: function (ctx) {
      var st = S14 = buildWallState(ctx);
      st.quads = new V.Quads(W_N);
      st.mm = new Float32Array(16);
      st.rm = new Float32Array(16);
      st.pos = [0, 0, 0];
      st.scl = [0, 0, 0];
      drawWallPanels(ctx);
      if (ctx.hud.uploadPan) ctx.hud.uploadPan(ctx.res);
    },
    enter: function (ctx) {
      var st = S14, c, b, i;
      wallScores(ctx, st, 8, 179.600, 13.700);
      // per-cycle read-out: the real peak of that cycle's four beats
      st.cyc = [];
      for (c = 0; c < st.cycN; c++) {
        var top = -2, peak = 0;
        for (b = 0; b < st.nb; b++) {
          if (((b / 4) | 0) !== c) continue;
          var n = 0;
          for (i = 0; i < W_N; i++) {
            var s = st.score[b * W_N + i];
            if (s > st.thr[b]) n++;
            if (s > top) top = s;
          }
          if (n > peak) peak = n;
        }
        st.cyc.push({ text: st.cycText[c], top: top > -2 ? top : 0, n: peak });
      }
    },
    draw2d: function (ctx) {
      var st = S14, t = ctx.t, W = ctx.W;
      var col = I.css(t), col2 = I.css2(t), hud = ctx.hud, inA = ctx.in;
      var drift = lerp(-2.3, 2.3, Ease.inOutQuad(ctx.prog));
      ctx.cam.mode = "persp"; ctx.cam.fov = 0.9;
      ctx.cam.pos[0] = drift; ctx.cam.pos[1] = 0.10 + 0.16 * ctx.beat.barPulse; ctx.cam.pos[2] = 11.6;
      ctx.cam.target[0] = drift * 0.42; ctx.cam.target[1] = 0; ctx.cam.target[2] = 0;
      ctx.cam.up[0] = 0; ctx.cam.up[1] = 1; ctx.cam.up[2] = 0;

      var s = wallLive(ctx, st, ctx.beat.index - st.b0);
      ctx.hits = s.matches;

      // ---- the eight shadows across the top: every cycle that has been run ----
      for (var c = 0; c < st.cycN; c++) {
        var cy = st.cyc[c], age = clamp((ctx.local - (c + 1) * 13.7 / st.cycN) , 0, 40);
        var decay = Math.exp(-age * 0.55);
        var x = 62 + c * 74, y = 142;
        hud.rect(x, y, 56, 42, { fill: "rgba(6,9,13," + (0.55 * inA) + ")", stroke: I.hexA(c === s.cyc ? col : col2, (0.30 + 0.55 * decay) * inA), lw: 1 });
        hud.T(x + 6, y + 16, "C" + (c + 1), { size: 11, color: c === s.cyc ? col : DIMT, alpha: (0.5 + 0.5 * decay) * inA, spacing: 1.2 });
        hud.T(x + 6, y + 32, cy.n + "", { size: 13, color: INK, alpha: (0.35 + 0.6 * decay) * inA, weight: 600 });
        hud.T(x + 50, y + 32, cy.top.toFixed(2), { size: 10, color: I.hexA(col2, 1), alpha: (0.3 + 0.6 * decay) * inA, align: "right" });
        // the shadow of the thing that matched, decaying
        hud.rect(x + 36, y + 6, 14, 14, { fill: I.hexA(col, (0.10 + 0.5 * decay) * inA) });
      }

      // ---- right: the instrument read-out ----
      I.card(ctx, 1500, 150, 374, 236, { title: "WALL", tab: "40 × 24", right: "960", alpha: inA });
      hud.T(1518, 208, "MATCHES", { size: 10, color: DIMT, alpha: 0.9 * inA, spacing: 1.6 });
      hud.T(1856, 214, String(s.matches), { size: 34, color: col, weight: 700, align: "right", alpha: inA });
      hud.T(1856, 232, "/ 960", { size: 11, color: DIMT, alpha: 0.85 * inA, align: "right" });
      hud.rect(1518, 244, 338, 4, { fill: "rgba(238,242,246," + (0.12 * inA) + ")" });
      hud.rect(1518, 244, 338 * clamp(s.matches / W_N, 0, 1), 4, { fill: I.hexA(col, 0.9 * inA) });
      hud.T(1518, 278, "TOP", { size: 10, color: DIMT, alpha: 0.9 * inA, spacing: 1.6 });
      hud.T(1856, 282, s.top.toFixed(3), { size: 20, color: INK, align: "right", alpha: inA, weight: 600 });
      hud.T(1518, 306, "Δ THIS BEAT", { size: 10, color: DIMT, alpha: 0.9 * inA, spacing: 1.6 });
      hud.T(1856, 310, (s.delta >= 0 ? "+" : "") + s.delta.toFixed(3), {
        size: 20, align: "right", alpha: inA, weight: 600, color: s.delta < 0 ? REDPEN : col2
      });
      hud.T(1518, 336, "CYCLE " + (s.cyc + 1) + " / " + st.cycN, { size: 11, color: col2, alpha: 0.9 * inA, spacing: 1.4 });
      hud.T(1518, 356, "QUERY", { size: 10, color: DIMT, alpha: 0.9 * inA, spacing: 1.6 });
      hud.T(1518, 374, String(st.cycText[s.cyc]).toUpperCase().slice(0, 42), { size: 12, color: INK, alpha: 0.9 * inA });

      // ---- bottom left: what a match means here ----
      hud.T(46, 862, "MATCH = cos(card, query) ≥ μ + 0.15σ OF THIS BEAT'S WALL", { size: 10, color: FAINT, alpha: 0.8 * inA, spacing: 1.1 });
      hud.T(46, 882, "EVERY CARD CHANGES WHAT IT IS ON EVERY BEAT — THE OLD MATCHES EXPIRE", { size: 10, color: DIMT, alpha: 0.7 * inA, spacing: 1.1 });
      hud.T(46, 908, "CARD = 0.72 · THING + 0.28 · MODIFIER, BOTH REAL EMBEDDINGS", { size: 10, color: FAINT, alpha: 0.7 * inA, spacing: 1.1 });
      hud.T(W - 46, 908, "2019 VECTOR DATABASE · ANN · FAISS", { size: 10, color: DIMT, alpha: 0.45 * inA, align: "right", spacing: 1.2 });
    },
    draw3d: function (ctx) {
      var st = S14, t = ctx.t;
      var col = I.rgbA(I.css(t), 1), col2 = I.rgbA(I.css2(t), 1);
      var b = st.live.b, prev = Math.max(0, b - 1);
      var u = st.live.u;                       // sweep progress inside this beat
      var halfW = (W_COLS - 1) * 0.5 * W_PITCH;
      var sweepX = lerp(-halfW - 0.9, halfW + 0.9, Ease.outQuad(u));
      var flip = st.live.flip;                 // 0 at the swap, 1 edge-on..face-on
      var Q = st.quads; Q.clear();
      var mm = st.mm, rm = st.rm, pos = st.pos, scl = st.scl;
      for (var i = 0; i < W_N; i++) {
        var x = st.cx[i], y = st.cy[i];
        var s = st.score[b * W_N + i];
        var thr = st.thr[b];
        var lit = s > thr;
        var scanned = x <= sweepX;
        var wake = clamp(1 - (sweepX - x) / 1.35, 0, 1);
        var rel = clamp((s - st.lo[b]) / (st.hi[b] - st.lo[b] || 1), 0, 1);
        var thing = st.beatThing[b * W_N + i];
        var keep = lit && scanned;
        var was = st.score[prev * W_N + i] > st.thr[prev];
        var a = (0.34 + 0.66 * wake) * (keep ? 1 : 0.30) * ctx.in;
        var k = keep ? (0.42 + 0.58 * rel) : (0.12 + 0.20 * wake);
        // the lit cards take the era's ink; the rest of the wall stays neutral
        // paper, so a sweep reads as ink arriving and not as a kaleidoscope
        var sat = keep ? 1 : 0.28;
        var rr = lerp(0.86, col[0], sat) * (0.5 + 0.5 * k);
        var gg = lerp(0.88, col[1], sat) * (0.5 + 0.5 * k);
        var bb = lerp(0.90, col[2], sat) * (0.5 + 0.5 * k);
        if (!keep && (was || rel > 0.72)) { rr *= 0.45; gg *= 0.42; bb *= 0.42; }   // expired: back to grey ink
        var sy = flip;
        var sq = 0.86 + 0.14 * (keep ? 1 : 0.4);
        M4.rotY(st.tilt[i] + (1 - flip) * 0.02, rm);
        pos[0] = x; pos[1] = y; pos[2] = 0;
        scl[0] = W_PITCH * 0.90 * sq; scl[1] = scl[0] * sy; scl[2] = 1;
        M4.compose(pos, rm, scl, mm);
        var rect = st.rect[thing];
        C.packQuad(Q.data, Q.n * 24, mm, rect, [rr, gg, bb, a]);
        Q.n++;
      }
      Q.draw(ctx.gfx, ctx.hud.tPan, {});
      // the sweep line itself, in the era's ink, additive so it reads as light
      var ln = st.sweep || (st.sweep = new V.Lines(2));
      ln.clear();
      ln.seg(sweepX, -4.15, 0.06, sweepX, 4.15, 0.06, I.rgbA(I.css(ctx.t), 1), 2.2, 0.55 * ctx.in);
      ln.draw(ctx.gfx, { add: true, depthWrite: false, glow: 0.5 });
    }
  });

  /* ------------------------------------------------ the card wall, shared */
  function buildWallState(ctx) {
    var lex = lexicon(ctx), st = { lex: lex, nb: 40, cycN: 8, cycText: [] };
    var i, c, r;
    st.tv = [];
    for (i = 0; i < THINGS.length; i++) st.tv.push(lexWord(lex, THINGS[i]));
    st.mw = new Int32Array(W_N);
    st.cx = new Float32Array(W_N);
    st.cy = new Float32Array(W_N);
    st.tilt = new Float32Array(W_N);
    for (i = 0; i < W_N; i++) {
      c = i % W_COLS; r = (i / W_COLS) | 0;
      st.cx[i] = (c - (W_COLS - 1) * 0.5) * W_PITCH;
      st.cy[i] = ((W_ROWS - 1) * 0.5 - r) * W_PITCH;
      st.tilt[i] = (C.h2(i * 0.713, 9.4) - 0.5) * 0.055;
      st.mw[i] = Math.floor(C.h2(i * 1.371, 3.17) * lex.N) % lex.N;
    }
    st.beatThing = new Uint8Array(st.nb * W_N);
    for (i = 0; i < st.nb * W_N; i++) {
      var b = (i / W_N) | 0;
      st.beatThing[i] = Math.floor(C.h3(i * 0.37, b * 1.7, 4.2) * THINGS.length) % THINGS.length;
    }
    st.score = new Float32Array(st.nb * W_N);
    st.thr = new Float32Array(st.nb);
    st.lo = new Float32Array(st.nb);
    st.hi = new Float32Array(st.nb);
    st.wtop = new Float32Array(st.nb);
    st.wfrac = new Float32Array(st.nb);
    st.sThing = [];
    st.sMod = [];
    st.rect = [];
    for (i = 0; i < THINGS.length; i++) st.rect.push(panelRect(ctx, i));
    st.live = { b: 0, u: 0, flip: 1, matches: 0, top: 0, delta: 0, cyc: 0 };
    return st;
  }

  // eight cycles of four beats; each cycle a real query, each beat a real
  // re-assignment of what every card is
  function wallScores(ctx, st, cycles, t0, dur) {
    var lex = st.lex, c, b, i, k;
    st.b0 = beatIndexAt(ctx, t0);
    st.cycN = cycles;
    st.t0 = t0; st.dur = dur;
    st.cycText = [];
    for (c = 0; c < cycles; c++) {
      var line = ctx.data.lyricAt(t0 + dur * (c + 0.5) / cycles);
      var txt = line && line.text ? String(line.text) : "I'm searching for";
      st.cycText.push(txt);
      var q = lexQuery(lex, txt);
      var sthing = [], smod = new Float32Array(W_N);
      for (k = 0; k < THINGS.length; k++) sthing.push(lexDot(q, st.tv[k]));
      for (i = 0; i < W_N; i++) smod[i] = lexDot(q, lex.vec[st.mw[i]]);
      st.sThing.push(sthing);
      st.sMod.push(smod);
    }
    for (b = 0; b < st.nb; b++) {
      c = clamp((b / 4) | 0, 0, cycles - 1);
      var mean = 0, lo = 1e9, hi = -1e9;
      for (i = 0; i < W_N; i++) {
        var s = 0.72 * st.sThing[c][st.beatThing[b * W_N + i]] + 0.28 * st.sMod[c][i];
        st.score[b * W_N + i] = s;
        mean += s / W_N;
        if (s < lo) lo = s;
        if (s > hi) hi = s;
      }
      var varr = 0;
      for (i = 0; i < W_N; i++) { var d = st.score[b * W_N + i] - mean; varr += d * d / W_N; }
      var sd = Math.sqrt(varr);
      st.thr[b] = mean + 0.15 * sd;
      st.lo[b] = lo; st.hi[b] = hi;
      st.wtop[b] = hi;
      var above = 0;
      for (i = 0; i < W_N; i++) if (st.score[b * W_N + i] > st.thr[b]) above++;
      st.wfrac[b] = above / W_N;
    }
  }

  // one frame of the wall: where the sweep is, which cards are lit, what the
  // previous beat's matches were worth
  function wallLive(ctx, st, b) {
    var live = st.live;
    live.b = clamp(b, 0, st.nb - 1);
    live.u = clamp(ctx.beat.sinceBeat / Math.max(ctx.beat.period, 0.05), 0, 1);
    live.flip = Math.abs(Math.cos(Math.PI * clamp((ctx.t - ctx.beat.grid + 0.17) / 0.34, 0, 1)));
    var halfW = (W_COLS - 1) * 0.5 * W_PITCH;
    var sweepX = lerp(-halfW - 0.9, halfW + 0.9, Ease.outQuad(live.u));
    var n = 0, top = -2;
    var pb = Math.max(0, live.b - 1);
    for (var i = 0; i < W_N; i++) {
      if (st.cx[i] > sweepX) continue;
      var s = st.score[live.b * W_N + i];
      if (s > st.thr[live.b]) { n++; if (s > top) top = s; }
    }
    live.matches = n;
    // the wall's own best and the share of it that matched, both real; the
    // drop between two beats is what "the matches expired" means numerically
    live.top = st.wtop[live.b];
    live.delta = st.wfrac[live.b] - st.wfrac[pb];
    live.cyc = clamp((live.b / 4) | 0, 0, st.cycN - 1);
    return live;
  }

  /* ------------------------------------------- the twelve card faces (atlas)
     Panels 0..11 belong to the wall; 12..14 are section 16's photograph and
     stamp. init() runs once per segment, so a seek can never overwrite them. */
  function drawWallPanels(ctx) {
    for (var i = 0; i < THINGS.length; i++) cardPanel(ctx, i, THINGS[i], i);
  }

  function cardPanel(ctx, i, label, glyph) {
    var hud = ctx.hud, p = hud.panel(i), c = p.ctx, w = p.w, h = p.h;
    p.clear();
    hud.rect(12, 12, w - 24, h - 24, { fill: "rgba(7,10,15,0.95)", ctx: c });
    hud.rect(12, 12, w - 24, h - 24, { stroke: "rgba(238,242,246,0.30)", lw: 3, ctx: c });
    hud.line(12, 82, w - 12, 82, { color: "rgba(238,242,246,0.20)", lw: 3, ctx: c });
    hud.T(34, 62, String(label).toUpperCase(), { size: 34, color: "rgba(238,242,246,0.70)", spacing: 3, ctx: c });
    hud.T(w - 34, 62, "№ " + ("0" + (i + 1)).slice(-2), { size: 28, color: "rgba(154,163,173,0.9)", align: "right", ctx: c });
    drawGlyph(ctx, c, glyph, w * 0.5, h * 0.5 + 42, 148);
    return p;
  }

  // simple geometry only: no faces, no emoji, no curves that need a library
  function drawGlyph(ctx, c, kind, cx, cy, r) {
    var ink = "rgba(238,242,246,0.86)", dim = "rgba(154,163,173,0.75)";
    c.save();
    c.lineWidth = 7; c.lineCap = "round"; c.strokeStyle = ink; c.fillStyle = ink;
    function line(x0, y0, x1, y1) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
    function ell(x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.stroke(); }
    function disc(x, y, rr) { c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill(); }
    switch (kind) {
      case 0:   // table
        line(cx - r, cy - r * 0.30, cx + r, cy - r * 0.30);
        line(cx - r * 0.86, cy - r * 0.30, cx - r * 0.92, cy + r * 0.80);
        line(cx + r * 0.86, cy - r * 0.30, cx + r * 0.92, cy + r * 0.80);
        c.lineWidth = 5; c.strokeStyle = dim;
        line(cx - r * 0.28, cy - r * 0.30, cx - r * 0.32, cy + r * 0.78);
        line(cx + r * 0.30, cy - r * 0.30, cx + r * 0.34, cy + r * 0.78);
        break;
      case 1:   // eggplant
        c.beginPath();
        c.moveTo(cx, cy - r * 0.72);
        c.bezierCurveTo(cx + r * 0.92, cy - r * 0.30, cx + r * 0.66, cy + r * 0.92, cx, cy + r * 0.92);
        c.bezierCurveTo(cx - r * 0.66, cy + r * 0.92, cx - r * 0.92, cy - r * 0.30, cx, cy - r * 0.72);
        c.stroke();
        line(cx, cy - r * 0.72, cx - r * 0.20, cy - r * 1.00);
        break;
      case 2:   // cat, seen as a shape only
        ell(cx + r * 0.15, cy + r * 0.35, r * 0.72, r * 0.46);
        ell(cx - r * 0.62, cy - r * 0.24, r * 0.38, r * 0.34);
        c.beginPath();
        c.moveTo(cx - r * 0.90, cy - r * 0.50); c.lineTo(cx - r * 0.78, cy - r * 1.02); c.lineTo(cx - r * 0.44, cy - r * 0.66);
        c.moveTo(cx - r * 0.42, cy - r * 0.60); c.lineTo(cx - r * 0.16, cy - r * 0.96); c.lineTo(cx - r * 0.22, cy - r * 0.44);
        c.stroke();
        c.beginPath();
        c.moveTo(cx + r * 0.84, cy + r * 0.42);
        c.quadraticCurveTo(cx + r * 1.24, cy + r * 0.20, cx + r * 1.06, cy - r * 0.42);
        c.stroke();
        break;
      case 3:   // steak
        c.beginPath();
        c.moveTo(cx - r * 0.94, cy + r * 0.10);
        c.bezierCurveTo(cx - r * 0.80, cy - r * 0.86, cx + r * 0.62, cy - r * 0.96, cx + r * 0.94, cy - r * 0.10);
        c.bezierCurveTo(cx + r * 1.06, cy + r * 0.72, cx - r * 0.36, cy + r * 1.00, cx - r * 0.94, cy + r * 0.10);
        c.stroke();
        c.lineWidth = 5; c.strokeStyle = dim;
        ell(cx - r * 0.10, cy + r * 0.05, r * 0.42, r * 0.26);
        break;
      case 4: {  // flower: real golden-angle phyllotaxis
        var ph = WEM.Lab.phyllotaxis(120, r * 0.115), k;
        c.fillStyle = dim;
        for (k = 0; k < ph.length; k++) {
          var q = k / ph.length;
          disc(cx + ph[k][0], cy + ph[k][1], 2.6 + 5.5 * q);
        }
        c.strokeStyle = ink; c.lineWidth = 6;
        for (k = 0; k < 8; k++) {
          var a = k / 8 * TAU;
          ell(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92, r * 0.20, r * 0.32);
        }
        break;
      }
      case 5:   // a person, from behind: silhouette only, never a face
        disc(cx, cy - r * 0.52, r * 0.30);
        c.beginPath();
        c.moveTo(cx - r * 0.78, cy + r * 0.98);
        c.bezierCurveTo(cx - r * 0.74, cy - r * 0.06, cx + r * 0.74, cy - r * 0.06, cx + r * 0.78, cy + r * 0.98);
        c.closePath(); c.fill();
        break;
      case 6:   // dog
        ell(cx + r * 0.05, cy + r * 0.28, r * 0.78, r * 0.40);
        ell(cx - r * 0.72, cy - r * 0.24, r * 0.34, r * 0.30);
        c.beginPath();
        c.moveTo(cx - r * 0.92, cy - r * 0.46); c.lineTo(cx - r * 1.06, cy - r * 0.94); c.lineTo(cx - r * 0.60, cy - r * 0.54);
        c.stroke();
        line(cx - r * 0.44, cy + r * 0.62, cx - r * 0.50, cy + r * 0.98);
        line(cx + r * 0.44, cy + r * 0.62, cx + r * 0.50, cy + r * 0.98);
        line(cx + r * 0.78, cy + r * 0.16, cx + r * 1.14, cy - r * 0.30);
        break;
      case 7:   // tomato
        disc(cx, cy + r * 0.14, r * 0.76);
        c.strokeStyle = ink;
        line(cx - r * 0.26, cy - r * 0.62, cx - r * 0.44, cy - r * 0.94);
        line(cx + r * 0.26, cy - r * 0.62, cx + r * 0.44, cy - r * 0.94);
        line(cx - r * 0.16, cy - r * 0.58, cx + r * 0.16, cy - r * 0.58);
        break;
      case 8:   // bucket
        c.beginPath();
        c.moveTo(cx - r * 0.62, cy - r * 0.52); c.lineTo(cx - r * 0.44, cy + r * 0.92);
        c.lineTo(cx + r * 0.44, cy + r * 0.92); c.lineTo(cx + r * 0.62, cy - r * 0.52);
        c.closePath(); c.stroke();
        c.beginPath(); c.arc(cx, cy - r * 0.52, r * 0.62, Math.PI, 0); c.stroke();
        c.strokeStyle = dim; c.lineWidth = 6;
        line(cx - r * 0.54, cy + 0.10 * r, cx + r * 0.54, cy + 0.10 * r);
        break;
      case 9:   // sheet of paper, folded corner
        c.beginPath();
        c.moveTo(cx - r * 0.70, cy - r * 0.94); c.lineTo(cx + r * 0.42, cy - r * 0.94);
        c.lineTo(cx + r * 0.70, cy - r * 0.62); c.lineTo(cx + r * 0.70, cy + r * 0.94);
        c.lineTo(cx - r * 0.70, cy + r * 0.94); c.closePath(); c.stroke();
        c.strokeStyle = dim; c.lineWidth = 5;
        line(cx - r * 0.44, cy - r * 0.34, cx + r * 0.34, cy - r * 0.34);
        line(cx - r * 0.44, cy + r * 0.06, cx + r * 0.44, cy + r * 0.06);
        line(cx - r * 0.44, cy + r * 0.46, cx + r * 0.10, cy + r * 0.46);
        break;
      case 10:  // the catalogue drawer this film keeps pulling open
        c.strokeRect(cx - r * 0.84, cy - r * 0.62, r * 1.68, r * 1.24);
        c.strokeStyle = dim; c.lineWidth = 5;
        c.strokeRect(cx - r * 0.52, cy - r * 0.34, r * 1.04, r * 0.34);
        c.beginPath(); c.arc(cx, cy + r * 0.24, r * 0.16, 0, Math.PI); c.stroke();
        break;
      default:  // a word card, mid-typeahead
        c.strokeRect(cx - r * 0.80, cy - r * 0.72, r * 1.60, r * 1.44);
        c.strokeStyle = dim; c.lineWidth = 5;
        line(cx - r * 0.52, cy - r * 0.40, cx + r * 0.34, cy - r * 0.40);
        line(cx - r * 0.52, cy - r * 0.04, cx + r * 0.52, cy - r * 0.04);
        line(cx - r * 0.52, cy + r * 0.32, cx - r * 0.06, cy + r * 0.32);
        c.fillStyle = ink;
        c.fillRect(cx + r * 0.10, cy + r * 0.20, 9, r * 0.42);
        break;
    }
    c.restore();
  }

  /* ====================================================================== *
   *  15 · RAPID — 193.300 .. 203.150                                       *
   *  The same wall, retried. Six rewrites; every rewrite throws all 960    *
   *  cards up, re-ranks them by the new query's real cosine and lands them *
   *  on a beat. No strobing: the speed is in the motion.                   *
   * ====================================================================== */
  var PHRASES = [
    "looking for you again",
    "you, in everything i see",
    "where did you go",
    "you, however you are now",
    "the you that stayed behind",
    "you, one more time"
  ];
  var S15 = null;

  WEM.defineSection({
    id: "15",
    name: "RAPID",
    init: function (ctx) {
      var st = S15 = buildWallState(ctx);
      st.quads = new V.Quads(W_N);
      st.mm = new Float32Array(16);
      st.rm = new Float32Array(16);
      st.pos = [0, 0, 0];
      st.stag = new Float32Array(W_N);
      for (var i = 0; i < W_N; i++) st.stag[i] = (i % W_COLS) / W_COLS * 0.20;
      drawWallPanels(ctx);
      if (ctx.hud.uploadPan) ctx.hud.uploadPan(ctx.res);
    },
    enter: function (ctx) {
      var st = S15;
      wallScores(ctx, st, 6, 193.300, 9.850);
      wallRewrites(ctx, st, PHRASES);
      st.hitDone = false;      // exactly one hit per entry, on the first landing
    },
    draw2d: function (ctx) {
      var st = S15, t = ctx.t, hud = ctx.hud, W = ctx.W, inA = ctx.in;
      var col = I.css(t), col2 = I.css2(t);
      wall15Frame(ctx, st);
      var ri = st.rwIndex;
      var rw = st.rw[ri];
      var frozen = st.frozen;

      ctx.cam.mode = "persp"; ctx.cam.fov = 0.9;
      var push = Ease.inOutQuad(ctx.prog);
      ctx.cam.pos[0] = lerp(-0.9, 0.9, push); ctx.cam.pos[1] = 0.08; ctx.cam.pos[2] = lerp(11.4, 10.2, push);
      ctx.cam.target[0] = ctx.cam.pos[0] * 0.35; ctx.cam.target[1] = 0; ctx.cam.target[2] = 0;
      ctx.cam.up[0] = 0; ctx.cam.up[1] = 1; ctx.cam.up[2] = 0;

      I.queryBar(ctx, {
        text: rw.text, hits: rw.n, note: "RESULTS",
        prog: clamp(rw.top, 0, 1), alpha: inA
      });
      ctx.__qDrawn = ctx.t;
      ctx.hits = rw.n;

      var best = 0;
      for (var k = 0; k < st.rw.length; k++) best = Math.max(best, st.rw[k].top);

      // ---- right: the rewrite log, with the real jagged score curve ----
      I.card(ctx, 1480, 150, 394, 336, { title: "REWRITES", tab: "06", right: "BEST " + best.toFixed(3), alpha: inA });
      var cx0 = 1500, cw = 354, cy0 = 200, ch = 58;
      hud.line(cx0, cy0 + ch, cx0 + cw, cy0 + ch, { color: "rgba(238,242,246," + (0.14 * inA) + ")" });
      var px = 0, py = 0;
      for (var q = 0; q < st.rw.length; q++) {
        var fx = cx0 + cw * (q + 0.5) / st.rw.length;
        var fy = cy0 + ch * (1 - clamp(st.rw[q].top / (best || 1), 0, 1));
        if (q > 0) hud.line(px, py, fx, fy, { color: I.hexA(q <= ri ? col : col2, (q <= ri ? 0.95 : 0.4) * inA), lw: q === ri ? 2 : 1.2 });
        px = fx; py = fy;
      }
      for (var q2 = 0; q2 < st.rw.length; q2++) {
        var fx2 = cx0 + cw * (q2 + 0.5) / st.rw.length;
        var fy2 = cy0 + ch * (1 - clamp(st.rw[q2].top / (best || 1), 0, 1));
        hud.rect(fx2 - 2.5, fy2 - 2.5, 5, 5, { fill: I.hexA(q2 <= ri ? col : col2, (q2 <= ri ? 1 : 0.45) * inA) });
      }
      hud.T(cx0, cy0 - 8, "TOP SCORE PER REWRITE", { size: 9, color: FAINT, alpha: 0.9 * inA, spacing: 1.4 });

      for (var q3 = 0; q3 < st.rw.length; q3++) {
        var y = 292 + q3 * 30, on = q3 === ri;
        hud.T(1500, y, "0" + (q3 + 1), { size: 11, color: on ? col : FAINT, alpha: inA, weight: on ? 600 : 400 });
        hud.T(1530, y, st.rw[q3].text, { size: 12, color: on ? INK : DIMT, alpha: (on ? 1 : 0.62) * inA });
        hud.T(1836, y, String(st.rw[q3].n), { size: 12, color: on ? col : DIMT, alpha: (on ? 1 : 0.62) * inA, align: "right", weight: 600 });
        hud.T(1872, y, st.rw[q3].top.toFixed(3), { size: 11, color: on ? col2 : FAINT, alpha: (on ? 1 : 0.6) * inA, align: "right" });
      }

      // ---- bottom left: what the re-rank is ----
      hud.T(46, 862, "RE-RANK z = (cos − μ) / σ · HIGH SCORES COME FORWARD, LOW ONES SINK", { size: 10, color: DIMT, alpha: 0.75 * inA, spacing: 1.1 });
      hud.T(46, 882, "EVERY LANDING IS ON A BEAT · SHAKE ±0.0045", { size: 10, color: FAINT, alpha: 0.75 * inA, spacing: 1.1 });
      if (frozen) {
        hud.T(960, 806, "STOP", { size: 26, color: REDPEN, align: "center", weight: 700, spacing: 12, alpha: 0.9 * inA });
      }
      hud.T(W - 46, 908, "2020 RAG · RETRIEVAL AUGMENTED GENERATION", { size: 10, color: DIMT, alpha: 0.45 * inA, align: "right", spacing: 1.2 });
    },
    draw3d: function (ctx) {
      var st = S15, t = ctx.t;
      var col = I.rgbA(I.css(t), 1), col2 = I.rgbA(I.css2(t), 1);
      var ri = st.rwIndex, frozen = st.frozen;
      var z0 = ri > 0 ? st.lay[ri - 1] : null, z1 = st.lay[ri];
      var litArr = st.lit[ri], scArr = st.sc[ri];
      var Q = st.quads; Q.clear();
      var mm = st.mm, rm = st.rm, pos = st.pos;
      var bNow = clamp(ctx.beat.index - st.b0, 0, st.nb - 1);
      var pulse = ctx.beat.pulse * (frozen ? 0 : 1);
      for (var i = 0; i < W_N; i++) {
        var u = clamp((st.flight - st.stag[i]) / (1 - 0.20), 0, 1);
        var e = Ease.inOutCubic(u);
        var za = z0 ? z0[i] : 0;
        var zb = z1[i];
        var z = lerp(za, zb, e) + 0.05 * pulse * (C.h2(i * 0.31, 5.5) - 0.5);
        var hop = Math.sin(Math.PI * Math.pow(u, 0.85)) * (z0 ? 0.95 : 0.55);
        var y = st.cy[i] + hop;
        var lit = litArr[i], s = scArr[i];
        var thing = st.beatThing[bNow * W_N + i];
        var k = lit ? (0.45 + 0.55 * s) : 0.18;
        var a = clamp((lit ? 1 : 0.34) * ctx.in * (0.80 + 0.45 * (1 - Math.abs(0.5 - e) * 2)), 0, 1);
        var sat = lit ? 1 : 0.26;
        var rr = lerp(0.86, lerp(col2[0], col[0], s), sat) * (0.55 + 0.45 * k);
        var gg = lerp(0.88, lerp(col2[1], col[1], s), sat) * (0.55 + 0.45 * k);
        var bb = lerp(0.90, lerp(col2[2], col[2], s), sat) * (0.55 + 0.45 * k);
        var sq = W_PITCH * (0.86 + 0.20 * (lit ? s : 0.2));
        pos[0] = st.cx[i]; pos[1] = y; pos[2] = z;
        M4.rotY(st.tilt[i] * 0.6 + z * 0.04, rm);
        M4.compose(pos, rm, [sq, sq, 1], mm);
        C.packQuad(Q.data, Q.n * 24, mm, st.rect[thing], [rr, gg, bb, a]);
        Q.n++;
      }
      Q.draw(ctx.gfx, ctx.hud.tPan, {});
      // the landing shake: a short, small, real impulse
      var lq = t - st.landT;
      if (!frozen && lq >= 0 && lq < 0.20) ctx.fx.shakeY = 0.0045 * (1 - lq / 0.20);
      // one hit for the whole segment, on the first landing
      if (!st.hitDone && t >= st.hitT) { st.hitDone = true; ctx.fx.hit(0.3); }
    }
  });

  function wallRewrites(ctx, st, phrases) {
    var lex = st.lex, k, i;
    st.rw = []; st.lay = []; st.lit = []; st.sc = [];
    for (k = 0; k < phrases.length; k++) {
      var q = lexQuery(lex, phrases[k]);
      var bLand = clamp(st.b0 + 4 * k + 2, 0, st.nb - 1);
      var sThing = [], sMod = new Float32Array(W_N), j;
      for (j = 0; j < THINGS.length; j++) sThing.push(lexDot(q, st.tv[j]));
      for (i = 0; i < W_N; i++) sMod[i] = lexDot(q, lex.vec[st.mw[i]]);
      var raw = new Float32Array(W_N), mean = 0, lo = 1e9, hi = -1e9;
      for (i = 0; i < W_N; i++) {
        var s = 0.72 * sThing[st.beatThing[bLand * W_N + i]] + 0.28 * sMod[i];
        raw[i] = s; mean += s / W_N;
        if (s < lo) lo = s;
        if (s > hi) hi = s;
      }
      var varr = 0;
      for (i = 0; i < W_N; i++) { var d = raw[i] - mean; varr += d * d / W_N; }
      var sd = Math.sqrt(varr) || 1e-6;
      var thr = mean + 0.15 * sd;
      var z = new Float32Array(W_N), lit = new Uint8Array(W_N), rel = new Float32Array(W_N);
      var n = 0, top = -2;
      for (i = 0; i < W_N; i++) {
        z[i] = clamp((raw[i] - mean) / sd * 0.62, -1.75, 1.75);
        rel[i] = clamp((raw[i] - lo) / ((hi - lo) || 1), 0, 1);
        if (raw[i] > thr) { lit[i] = 1; n++; if (raw[i] > top) top = raw[i]; }
      }
      st.rw.push({ text: phrases[k], n: n, top: top > -2 ? top : 0 });
      st.lay.push(z); st.lit.push(lit); st.sc.push(rel);
    }
    st.rewriteT = [];
    for (k = 0; k < phrases.length; k++) {
      st.rewriteT.push([beatTime(ctx, st.b0 + 4 * k), beatTime(ctx, st.b0 + 4 * k + 2)]);
    }
  }

  // one frame of the retry: which rewrite we are inside, how far the cards
  // have flown, and when they land (the landing is always a real beat)
  function wall15Frame(ctx, st) {
    st.frozen = ctx.t > 203.0;
    var sb = ctx.beat.index - st.b0;
    var ri = clamp((sb / 4) | 0, 0, st.rw.length - 1);
    var T = st.rewriteT[ri];
    var u = clamp((ctx.t - T[0]) / Math.max(0.05, T[1] - T[0]), 0, 1);
    st.rwIndex = ri;
    st.flight = st.frozen ? 1 : u;
    st.landT = T[1];
    st.hitT = st.rewriteT[0][1];
    return st;
  }

  /* ====================================================================== *
   *  16 · MY OLD SELF — 203.150 .. 207.230                                 *
   *  One card, one line, one stamp. The quietest frame in the film.        *
   * ====================================================================== */
  var S16 = null;

  WEM.defineSection({
    id: "16",
    name: "MY OLD SELF",
    init: function (ctx) {
      var st = S16 = {};
      photoPanel(ctx, 12, true);
      photoPanel(ctx, 13, false);
      stampPanel(ctx, 14);
      if (ctx.hud.uploadPan) ctx.hud.uploadPan(ctx.res);
      st.quads = new V.Quads(8);
      st.mm = new Float32Array(16);
      st.rm = new Float32Array(16);
      st.pos = [0, 0, 0];
    },
    enter: function (ctx) { },
    draw2d: function (ctx) {
      var st = S16, L = ctx.local, t = ctx.t, hud = ctx.hud;
      ctx.cam.mode = "persp"; ctx.cam.fov = 0.9;
      ctx.cam.pos[0] = 0; ctx.cam.pos[1] = 0.03; ctx.cam.pos[2] = lerp(5.20, 5.02, clamp(L / 4.0, 0, 1));
      ctx.cam.target[0] = 0; ctx.cam.target[1] = 0.02; ctx.cam.target[2] = 0;
      ctx.cam.up[0] = 0; ctx.cam.up[1] = 1; ctx.cam.up[2] = 0;

      // quieter chrome for the last half second — never all the way off
      var tail = smoothstep(206.63, 207.20, t);
      ctx.chromeAmt = 1 - 0.25 * tail;
      ctx.hits = 0;

      var inA = ctx.in;

      // exactly one line of lyric, centred above the card
      var ly = ctx.lyric && ctx.lyric.text ? String(ctx.lyric.text) : "My old self that's gone since you have left";
      hud.T(960, 208, ly, { size: 18, color: INK, align: "center", alpha: 0.8 * inA, spacing: 0.6 });
      hud.line(360, 224, 1560, 224, { color: "rgba(238,242,246," + (0.10 * inA) + ")" });

      hud.T(46, 892, "CARD № 0412 · LAST SEEN 2021", { size: 13, color: DIMT, alpha: 0.85 * inA, spacing: 1.2 });
      hud.T(46, 914, "2021 · WHAT WAS LOST", { size: 10, color: FAINT, alpha: 0.42 * inA, spacing: 1.4 });
      hud.T(1874, 892, "MATCH 0.000", { size: 13, color: DIMT, alpha: 0.85 * inA, align: "right", spacing: 1.2 });
    },
    draw3d: function (ctx) {
      var st = S16, t = ctx.t;
      var Q = st.quads; Q.clear();
      var mm = st.mm, rm = st.rm, pos = st.pos;
      var fade = clamp((t - 203.15) / 2.85, 0, 1);
      var cardA = lerp(1, 0.35, Ease.inOutQuad(fade));
      var grey = Ease.inOutQuad(fade);

      // the stamp: down at 206.2, then the card takes the weight
      var sk = clamp((t - 206.20) / 0.155, 0, 1);
      var sinkK = clamp((t - 206.36), 0, 3);
      var sink = -0.055 * (1 - Math.exp(-sinkK * 4.5) * Math.cos(sinkK * 11.0)) * (sinkK > 0 ? 1 : 0);
      var cardY = sink * 0.6;

      M4.ident(rm);
      // the grey print first, the warm one on top of it: a real desaturation
      pos[0] = 0; pos[1] = cardY - 0.004; pos[2] = -0.012;
      M4.compose(pos, rm, [3.20, 2.05, 1], mm);
      C.packQuad(Q.data, Q.n * 24, mm, panelRect(ctx, 13), [0.92, 0.94, 0.97, cardA * grey]);
      Q.n++;
      pos[0] = 0; pos[1] = cardY; pos[2] = 0;
      M4.compose(pos, rm, [3.20, 2.05, 1], mm);
      C.packQuad(Q.data, Q.n * 24, mm, panelRect(ctx, 12), [1.0, 0.97, 0.92, cardA * (1 - grey)]);
      Q.n++;
      // the stamp face, coming down and staying
      if (sk > 0.001) {
        var sy = lerp(2.60, -0.46 + sink, Ease.inQuad(sk));
        var squash = 1 + 0.10 * Math.exp(-sk * 9) * Math.sin(sk * 26);
        pos[0] = 0.34; pos[1] = sy; pos[2] = 0.045;
        M4.rotZ(-0.055, rm);
        M4.compose(pos, rm, [1.62, 0.62 * squash, 1], mm);
        C.packQuad(Q.data, Q.n * 24, mm, panelRect(ctx, 14), [1, 1, 1, clamp(sk * 1.6, 0, 1) * lerp(0.92, 0.72, fade)]);
        Q.n++;
      }
      Q.draw(ctx.gfx, ctx.hud.tPan, {});
    }
  });

  function panelRect(ctx, i) {
    // panels are 512 px cells of a 4x4 atlas
    var u0 = (i % 4) / 4, v0 = ((i / 4) | 0) / 4;
    return [u0, v0 + 0.25, u0 + 0.25, v0];
  }

  function photoPanel(ctx, i, sepia) {
    var hud = ctx.hud, p = hud.panel(i), c = p.ctx, w = p.w, h = p.h;
    p.clear();
    var warm = sepia ? "rgba(58,40,26,0.96)" : "rgba(26,26,28,0.96)";
    hud.rect(10, 10, w - 20, h - 20, { fill: "rgba(7,10,15,0.95)", ctx: c });
    hud.rect(10, 10, w - 20, h - 20, { stroke: "rgba(238,242,246,0.30)", lw: 3, ctx: c });
    // the print itself
    hud.rect(44, 60, w - 88, h - 176, { fill: warm, ctx: c });
    hud.rect(44, 60, w - 88, h - 176, { stroke: "rgba(238,242,246,0.16)", lw: 2, ctx: c });
    var cx = w * 0.5, cy = 60 + (h - 176) * 0.54, r = 96;
    c.save();
    c.strokeStyle = sepia ? "rgba(226,206,180,0.80)" : "rgba(206,210,214,0.80)";
    c.fillStyle = c.strokeStyle;
    c.lineWidth = 5;
    // a person from behind: head, shoulders, one arm — never a face
    c.beginPath(); c.arc(cx + 6, cy - r * 0.62, r * 0.34, 0, TAU); c.fill();
    c.beginPath();
    c.moveTo(cx - r * 0.92, cy + r * 0.92);
    c.bezierCurveTo(cx - r * 0.86, cy - r * 0.10, cx + r * 0.80, cy - r * 0.16, cx + r * 0.94, cy + r * 0.92);
    c.closePath(); c.fill();
    c.globalAlpha = 0.5;
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(cx + r * 0.60, cy + r * 0.10);
    c.bezierCurveTo(cx + r * 1.08, cy + r * 0.28, cx + r * 1.10, cy + r * 0.62, cx + r * 0.92, cy + r * 0.86);
    c.stroke();
    c.globalAlpha = 1;
    // print grain
    c.strokeStyle = "rgba(238,242,246,0.05)";
    c.lineWidth = 1;
    for (var g = 0; g < 26; g++) {
      var gy = 66 + g * ((h - 190) / 26);
      c.beginPath(); c.moveTo(48, gy); c.lineTo(w - 48, gy + (g % 3) - 1); c.stroke();
    }
    c.restore();
    // the ruled head and the hand-written catalogue number
    hud.line(10, 52, w - 10, 52, { color: "rgba(238,242,246,0.18)", lw: 3, ctx: c });
    hud.T(30, 40, "PHOTOGRAPH · SUBJECT UNKNOWN", { size: 22, color: "rgba(238,242,246,0.55)", spacing: 2, ctx: c });
    c.save();
    c.translate(w - 132, h - 62);
    c.rotate(-0.055);
    hud.T(0, 0, "№ 0412", { size: 40, color: sepia ? "rgba(226,206,180,0.92)" : "rgba(206,210,214,0.92)", ctx: c, font: "math" });
    c.restore();
    hud.T(34, h - 62, "LAST SEEN 2021", { size: 22, color: "rgba(154,163,173,0.85)", spacing: 2, ctx: c });
    return p;
  }

  function stampPanel(ctx, i) {
    var hud = ctx.hud, p = hud.panel(i), c = p.ctx, w = p.w, h = p.h;
    p.clear();
    var red = "rgba(255,77,94,0.95)";
    hud.rect(30, 76, w - 60, h - 200, { stroke: red, lw: 9, ctx: c });
    hud.rect(42, 88, w - 84, h - 224, { stroke: "rgba(255,77,94,0.45)", lw: 3, ctx: c });
    hud.T(w * 0.5, h * 0.5 - 6, "WITHDRAWN", { size: 76, color: red, align: "center", weight: 600, spacing: 6, ctx: c });
    hud.line(84, h * 0.5 + 26, w - 84, h * 0.5 + 26, { color: "rgba(255,77,94,0.7)", lw: 4, ctx: c });
    hud.T(w * 0.5, h * 0.5 + 62, "№ 0412 · 2021", { size: 30, color: "rgba(255,77,94,0.85)", align: "center", spacing: 3, ctx: c });
    return p;
  }

  /* ====================================================================== *
   *  17 · BUCKETS — 207.230 .. 221.030                                     *
   *  Twelve jars. Their levels are a histogram this song actually wrote:   *
   *  the 84 LRC lines fall into twelve equal spans of time, and each jar   *
   *  holds the warmth-words counted in its own span. Some are empty.       *
   * ====================================================================== */
  var WARM = ["love", "lovelier", "warm", "warmth", "hug", "hold", "hands", "sweet", "sweetest", "perfect", "only"];
  var NJAR = 12, JAR_R = 0.34, JAR_H = 2.00, JAR_GAP = 1.02, SHELF_Y = -1.34;
  var S17 = null;

  WEM.defineSection({
    id: "17",
    name: "BUCKETS",
    init: function (ctx) {
      var st = S17 = {};
      var lrc = ctx.data.lrc, D = ctx.data.duration, i, j, k;

      // ---- the real histogram: every LRC line into its twelfth of the song
      var hist = new Array(NJAR).fill(0), lines = new Array(NJAR).fill(0);
      for (i = 0; i < lrc.length; i++) {
        var toks = tokensOf(lrc[i].text);
        k = clamp(Math.floor(lrc[i].t / D * NJAR), 0, NJAR - 1);
        lines[k]++;
        for (j = 0; j < toks.length; j++) if (WARM.indexOf(toks[j]) >= 0) hist[k]++;
      }
      st.hist = hist; st.lines = lines;
      st.max = 1;
      for (i = 0; i < NJAR; i++) st.max = Math.max(st.max, hist[i]);
      var mu = 0;
      for (i = 0; i < NJAR; i++) mu += hist[i] / NJAR;
      var varr = 0;
      for (i = 0; i < NJAR; i++) { var d = hist[i] - mu; varr += d * d / NJAR; }
      st.mu = mu; st.sd = Math.sqrt(varr);
      st.empty = 0;
      for (i = 0; i < NJAR; i++) if (hist[i] === 0) st.empty++;

      st.jar = G.cylinder(JAR_R, JAR_R * 0.94, JAR_H, 30);
      st.disc = G.ico(1);
      st.shelf = G.box(NJAR * JAR_GAP + 0.9, 0.18, 1.35);
      st.back = G.box(NJAR * JAR_GAP + 0.9, 0.10, 0.06);
      st.mm = new Float32Array(16);
      st.rm = new Float32Array(16);
      st.pos = [0, 0, 0];
      st.pts = new V.Points(240);
      st.bars = [];
      for (i = 0; i < NJAR; i++) st.bars.push({ x: 0, lvl: 0, full: false, idx: i });
      st.b0 = beatIndexAt(ctx, 207.230);
    },
    enter: function (ctx) { },
    draw2d: function (ctx) {
      var st = S17, t = ctx.t, hud = ctx.hud, W = ctx.W, inA = ctx.in;
      var col = I.css(t), col2 = I.css2(t);
      var pan = lerp(-2.9, 2.9, Ease.inOutQuad(ctx.prog));
      ctx.cam.mode = "persp"; ctx.cam.fov = 0.9;
      ctx.cam.pos[0] = pan; ctx.cam.pos[1] = 1.10 + 0.10 * ctx.beat.barPulse; ctx.cam.pos[2] = 9.4;
      ctx.cam.target[0] = pan * 0.62; ctx.cam.target[1] = -0.35; ctx.cam.target[2] = 0;
      ctx.cam.up[0] = 0; ctx.cam.up[1] = 1; ctx.cam.up[2] = 0;

      ctx.hits = NJAR;
      ctx.hits = NJAR;
      var filled = 0;
      for (var i = 0; i < NJAR; i++) if (st.hist[i] > 0) filled++;
      var shown = 0;
      for (i = 0; i < NJAR; i++) if (st.hist[i] > 0 && jarFill(ctx, st, i) > 0.02) shown++;

      I.card(ctx, 1480, 150, 394, 224, { title: "DISTRIBUTION", tab: "12 BUCKETS", right: "LRC " + ctx.data.lrc.length, alpha: inA });
      hud.T(1500, 208, "μ", { size: 12, color: DIMT, alpha: 0.9 * inA, spacing: 1.4 });
      hud.T(1856, 212, st.mu.toFixed(2), { size: 22, color: INK, align: "right", alpha: inA, weight: 600 });
      hud.T(1500, 244, "σ", { size: 12, color: DIMT, alpha: 0.9 * inA, spacing: 1.4 });
      hud.T(1856, 248, st.sd.toFixed(2), { size: 22, color: INK, align: "right", alpha: inA, weight: 600 });
      hud.T(1500, 280, "EMPTY", { size: 12, color: DIMT, alpha: 0.9 * inA, spacing: 1.4 });
      hud.T(1856, 284, st.empty + " / 12", { size: 22, color: st.empty ? col2 : INK, align: "right", alpha: inA, weight: 600 });
      hud.T(1500, 306, "MAX " + st.max + " · FILLED " + filled + " / 12 · POURING " + shown, { size: 10, color: FAINT, alpha: 0.85 * inA, spacing: 1.1 });
      hud.T(1500, 326, "COUNTS LOVE · LOVELIER · WARM · WARMTH · HUG · HOLD", { size: 10, color: FAINT, alpha: 0.8 * inA, spacing: 1.1 });
      hud.T(1500, 344, "HANDS · SWEET · SWEETEST · PERFECT · ONLY, PER SPAN", { size: 10, color: FAINT, alpha: 0.8 * inA, spacing: 1.1 });

      hud.T(46, 892, "EACH ONE OF US HAS A BUCKET", { size: 15, color: col, alpha: 0.9 * inA, spacing: 3, weight: 600 });
      hud.T(46, 914, "SOME OF US EMPTY, SOME OF US FILLED UP", { size: 11, color: DIMT, alpha: 0.75 * inA, spacing: 2 });
      hud.T(W - 46, 908, "2022 CHATGPT · EVERYBODY STARTS ASKING", { size: 10, color: DIMT, alpha: 0.45 * inA, align: "right", spacing: 1.2 });
    },
    draw3d: function (ctx) {
      var st = S17, t = ctx.t, gfx = ctx.gfx, i, j;
      var col = I.rgbA(I.css(t), 1), col2 = I.rgbA(I.css2(t), 1);
      var glass = [0.62, 0.68, 0.78];
      var mm = st.mm, rm = st.rm, pos = st.pos;
      var bars = st.bars;

      // shelf
      M4.ident(rm);
      pos[0] = 0; pos[1] = SHELF_Y - 0.10; pos[2] = 0;
      M4.compose(pos, rm, [1, 1, 1], mm);
      gfx.solid(st.shelf, mm, { color: [0.42, 0.38, 0.34], alpha: 1, rim: 0.35 });
      pos[0] = 0; pos[1] = SHELF_Y + 0.62; pos[2] = -0.62;
      M4.compose(pos, rm, [1, 1, 1], mm);
      gfx.solid(st.back, mm, { color: [0.30, 0.28, 0.27], alpha: 0.9, rim: 0.2 });

      var P = st.pts; P.clear();
      for (i = 0; i < NJAR; i++) {
        var x = (i - (NJAR - 1) * 0.5) * JAR_GAP;
        var f = jarFill(ctx, st, i);
        var target = st.hist[i] / st.max;
        var lvl = target * f;
        var full = st.hist[i] === st.max;
        // the liquid
        if (lvl > 0.004) {
          var hy = lvl * JAR_H;
          pos[0] = x; pos[1] = SHELF_Y + hy * 0.5; pos[2] = 0;
          M4.compose(pos, rm, [0.90, lvl, 0.90], mm);
          gfx.solid(st.jar, mm, { color: [col[0], col[1], col[2]], alpha: 0.94, rim: 0.25, emissive: 0.08 });
          // the meniscus, still ringing from the pour
          var rip = jarRipple(ctx, st, i) * f;
          pos[0] = x; pos[1] = SHELF_Y + hy + rip * 0.03; pos[2] = 0;
          M4.compose(pos, rm, [0.62, 0.02, 0.62], mm);
          gfx.solid(st.disc, mm, { color: [col2[0] * 0.9, col2[1] * 0.9, col2[2] * 0.9], alpha: 1, rim: 0.9 });
          pos[1] = SHELF_Y + 0.012;
          M4.compose(pos, rm, [0.62, 0.02, 0.62], mm);
          gfx.solid(st.disc, mm, { color: [col[0] * 0.7, col[1] * 0.7, col[2] * 0.7], alpha: 1, rim: 0.2 });
        }
        // the jar itself, last and translucently, so it never hides the liquid
        pos[0] = x; pos[1] = SHELF_Y + JAR_H * 0.5; pos[2] = 0;
        M4.compose(pos, rm, [1, 1, 1], mm);
        gfx.solid(st.jar, mm, { color: glass, alpha: 0.13, rim: 0.85, depthWrite: false, unlit: true });
        pos[1] = SHELF_Y + JAR_H;
        M4.compose(pos, rm, [0.70, 0.02, 0.70], mm);
        gfx.solid(st.disc, mm, { color: [0.70, 0.78, 0.88], alpha: 0.16, rim: 1.0, depthWrite: false, unlit: true });

        // anything past the brim falls
        if (full && f > 0.98) {
          for (j = 0; j < 18; j++) {
            var ph = C.h2(i * 7.7 + j, 2.3);
            var tau = ((t * 0.62 + ph) % 1);
            var vx = (C.h2(j * 5.3, i + 1) - 0.5) * 0.46;
            var vz = (C.h2(j * 2.7, i + 2) - 0.5) * 0.46;
            var sx = x + Math.sign(vx || 1) * JAR_R * 0.96;
            P.add(sx + vx * tau, SHELF_Y + JAR_H + 0.02 - 2.2 * tau * tau, vz * tau,
              0.05, col2, 0.55 * (1 - tau) * ctx.in);
          }
        }
        // the bar for this jar, drawn later in screen space above it
        var sp = ctx.util.vp(x, SHELF_Y + JAR_H + 0.35, 0);
        var bar = bars[i];
        bar.x = sp[0]; bar.lvl = lvl; bar.full = full; bar.idx = i;
      }
      P.draw(gfx, { add: true, depthWrite: false, soft: 0.8, scale: 1 });

      // ---- the histogram, one bar per jar, riding above the shelf ----
      var hud = ctx.hud;
      var baseY = 330, maxH = 132;
      hud.line(120, baseY, 1800, baseY, { color: "rgba(238,242,246," + (0.16 * ctx.in) + ")" });
      for (i = 0; i < bars.length; i++) {
        var bb = bars[i];
        if (bb.x < 70 || bb.x > 1850) continue;
        var bw = 22;
        var hgt2 = maxH * (st.hist[bb.idx] / st.max) * jarFill(ctx, st, bb.idx);
        hud.rect(bb.x - bw * 0.5, baseY - hgt2, bw, hgt2, { fill: I.hexA(col, (bb.full ? 0.95 : 0.72) * ctx.in) });
        hud.rect(bb.x - bw * 0.5, baseY - maxH * (st.hist[bb.idx] / st.max), bw, 1.5, { fill: "rgba(238,242,246," + (0.35 * ctx.in) + ")" });
        hud.T(bb.x, baseY + 14, String(st.hist[bb.idx]), { size: 10, color: INK, align: "center", alpha: 0.8 * ctx.in });
        if (i % 2 === 0) {
          var mmn = Math.floor(i * ctx.data.duration / NJAR / 60), sss = Math.floor(i * ctx.data.duration / NJAR % 60);
          hud.T(bb.x, baseY + 28, mmn + ":" + ("0" + sss).slice(-2), { size: 9, color: FAINT, align: "center", alpha: 0.7 * ctx.in, spacing: 1 });
        }
      }
      hud.T(120, baseY - maxH - 14, "LINES OF THIS SONG, BY THE TWELFTH OF ITS TIME · BAR = JAR " + NJAR + " / " + NJAR,
        { size: 10, color: DIMT, alpha: 0.8 * ctx.in, spacing: 1.2 });

      // ---- jar labels, projected ----
      for (i = 0; i < NJAR; i++) {
        var jx = (i - (NJAR - 1) * 0.5) * JAR_GAP;
        var sp2 = ctx.util.vp(jx, SHELF_Y - 0.16, 0);
        if (sp2[0] < 60 || sp2[0] > 1860 || sp2[1] < 130 || sp2[1] > 918) continue;
        hud.T(sp2[0], sp2[1], "B" + ("0" + (i + 1)).slice(-2), { size: 10, color: col2, align: "center", alpha: 0.7 * ctx.in, spacing: 1.2 });
      }
    }
  });

  /* --------------------------------------------------- section 17 helpers */
  // jar i starts pouring two beats after the section begins, one jar per beat
  function jarFill(ctx, st, i) {
    var bStart = st.b0 + 2 + i;
    var t0 = beatTime(ctx, bStart);
    var q = clamp((ctx.t - t0) / 0.46, 0, 1);
    if (ctx.t < t0) return 0;
    return Ease.outCubic(q);
  }
  // a real damped ring on the surface after the pour stops
  function jarRipple(ctx, st, i) {
    var t0 = beatTime(ctx, st.b0 + 2 + i) + 0.46;
    var tau = ctx.t - t0;
    if (tau <= 0) return 0;
    return Math.exp(-tau * 2.1) * Math.cos(tau * 12.5);
  }
})();
