/* ============================================================================
   THE INDEX OF YOU  --  shared stage furniture for world.search (you) ;
   ----------------------------------------------------------------------------
   The film is a semantic-retrieval piece: a machine tries to find "you" by
   describing what you would be if you were other things, and never quite can,
   because you keep transforming.  Two devices hold it together:

     1. the QUERY BAR under the top chrome -- the current lyric line *is* the
        search query, with a live hit count that the sections drive;
     2. the INDEX RAIL across the bottom -- the history of retrieval, from
        Vannevar Bush's memex to a million-token context window, lighting up
        card-catalogue tab by tab as the song plays.

   The page runs the engine's paper theme (window.WEM_THEME = "light"): every
   section is AUTHORED DARK and the composite inverts lightness centrally, so
   the palette below is the dark-convention one.

   Public surface (stable -- sections may rely on it):
     WEM.Idx.ERAS / MILESTONES
     WEM.Idx.era(idOrIdx) / eraAt(t)
     WEM.Idx.css(t) / css2(t)             current era colours, CSS strings
     WEM.Idx.rgb(hex) / rgbA(hex,a)       for ctx.gfx
     WEM.Idx.hexA(hex, a)
     WEM.Idx.litCount(t) / current(t) / lightK(t, m)
     WEM.Idx.rail(ctx) / chrome(ctx)
     WEM.Idx.queryBar(ctx, o)             o = {text, hits, note, caret}
     WEM.Idx.card(ctx,x,y,w,h,o)          an index card
     WEM.Idx.tab(ctx,x,y,w,h,label,o)     a catalogue tab
     WEM.Idx.resultRow(ctx,x,y,w,title,score,o)
     WEM.Idx.tag / big / rule / gauge
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core;
  var clamp = C.clamp, lerp = C.lerp, smoothstep = C.smoothstep;

  /* ------------------------------------------------------------------ eras */
  // index == section index (0..21).  id == the two digit section id.
  var ERAS = [
    { id: "01", name: "SIDE BY SIDE",      y0: 1945, y1: 1948, label: "THE MEMEX",        main: "#ff9a4d", alt: "#ffd166", note: "two things, compared" },
    { id: "02", name: "RANK",              y0: 1960, y1: 1972, label: "INDEX & WEIGHT",   main: "#ffc94a", alt: "#ff8a3d", note: "the lovelier goes up" },
    { id: "03", name: "TAKE A MEMORY",     y0: 1972, y1: 1989, label: "CATALOGUES",       main: "#8ad4ff", alt: "#6b8cff", note: "insert to the past" },
    { id: "04", name: "TABLE",             y0: 1994, y1: 1998, label: "CONSTRAINTS",      main: "#5ce1c8", alt: "#8ad4ff", note: "four legs, elbow height" },
    { id: "05", name: "EGGPLANT",          y0: 2003, y1: 2003, label: "FUZZY MATCH",      main: "#b48cff", alt: "#ff6fb0", note: "purple, and scratched" },
    { id: "06", name: "I'M SEARCHING",     y0: 2004, y1: 2004, label: "THE QUERY",        main: "#ff6fb0", alt: "#b48cff", note: "nothing matches yet" },
    { id: "07", name: "CAT",               y0: 2010, y1: 2010, label: "FACETS",           main: "#6b8cff", alt: "#35e0ff", note: "not this, not that" },
    { id: "08", name: "STEAK",             y0: 2012, y1: 2012, label: "MULTIMODAL",       main: "#ff9a5c", alt: "#ffd166", note: "search with a picture" },
    { id: "09", name: "FLOWER",            y0: 2013, y1: 2013, label: "SPARSE HITS",      main: "#ffd166", alt: "#ff9a5c", note: "it blooms occasionally" },
    { id: "10", name: "HUMAN",             y0: 2014, y1: 2015, label: "THE PERSON",       main: "#ffffff", alt: "#8ad4ff", note: "warmth from your hands" },
    { id: "11", name: "SEARCHING AGAIN",   y0: 2016, y1: 2016, label: "NEURAL RETRIEVAL", main: "#ff6fb0", alt: "#ffffff", note: "search by meaning" },
    { id: "12", name: "WHAT'S THAT WORD",  y0: 2017, y1: 2017, label: "TYPEAHEAD",        main: "#5ce1c8", alt: "#8ad4ff", note: "what's it called?" },
    { id: "13", name: "LOVE",              y0: 2018, y1: 2018, label: "EMBEDDINGS",       main: "#ff4d8e", alt: "#b48cff", note: "the word arrives at last" },
    { id: "14", name: "EVERYWHERE",        y0: 2019, y1: 2019, label: "VECTOR SPACE",     main: "#8f7bff", alt: "#35e0ff", note: "you can't stop transforming" },
    { id: "15", name: "RAPID",             y0: 2020, y1: 2020, label: "RETRY",            main: "#ff4d5e", alt: "#ff9a5c", note: "searching, searching" },
    { id: "16", name: "MY OLD SELF",       y0: 2021, y1: 2021, label: "WHAT WAS LOST",    main: "#9aa3ad", alt: "#c3cad2", note: "not you -- me" },
    { id: "17", name: "BUCKETS",           y0: 2022, y1: 2022, label: "HISTOGRAMS",       main: "#ffb020", alt: "#ffd166", note: "some empty, some full" },
    { id: "18", name: "BREAK US DOWN",     y0: 2023, y1: 2023, label: "TOKENS",           main: "#35e0ff", alt: "#5ce1c8", note: "cut, embed, merge back" },
    { id: "19", name: "CALLBACK",          y0: 2024, y1: 2024, label: "LONG CONTEXT",     main: "#7ee787", alt: "#35e0ff", note: "stop retrieving, just read" },
    { id: "20", name: "LEARNED",           y0: 2025, y1: 2025, label: "REASONING",        main: "#5ce1c8", alt: "#7ee787", note: "the query improves itself" },
    { id: "21", name: "DOG · TOMATO",      y0: 2026, y1: 2026, label: "WHERE WE ARE",     main: "#ffd166", alt: "#ff9a5c", note: "ruff ruff ruff" },
    { id: "22", name: "STILL SEARCHING",   y0: 2026, y1: 2026, label: "UNRESOLVED",       main: "#e8eef4", alt: "#8ad4ff", note: "the cursor is still blinking" }
  ];

  /* ------------------------------------------------------------- milestones */
  // t = when the tab lights up, in song seconds.  lane 0 = retrieval, lane 1 = models
  var MILESTONES = [
    { t: 3.2,   y: "1945", n: "VANNEVAR BUSH",      f: "as we may think · the memex", lane: 0 },
    { t: 7.0,   y: "1948", n: "INFORMATION THEORY", f: "shannon measures surprise", lane: 0 },
    { t: 11.0,  y: "1951", n: "MICROFILM CATALOG",  f: "a library on film", lane: 0 },
    { t: 18.0,  y: "1960", n: "INVERTED INDEX",     f: "every word points at every page", lane: 0 },
    { t: 24.0,  y: "1972", n: "TF-IDF",             f: "rare words mean more", lane: 0 },
    { t: 31.5,  y: "1989", n: "THE WEB",            f: "everything, addressable", lane: 0 },
    { t: 47.0,  y: "1994", n: "BM25",               f: "the ranking function we still use", lane: 0 },
    { t: 52.0,  y: "1998", n: "PAGERANK",           f: "links counted as votes", lane: 0 },
    { t: 62.0,  y: "2003", n: "TOPIC MODELS",       f: "a document becomes a mixture", lane: 0 },
    { t: 74.0,  y: "2004", n: "MAPREDUCE",          f: "index the whole web overnight", lane: 0 },
    { t: 90.0,  y: "2010", n: "FACETED SEARCH",     f: "narrow it down until it is one", lane: 0 },
    { t: 100.0, y: "2012", n: "DEEP VISION",        f: "a machine finally sees", lane: 0 },
    { t: 115.0, y: "2013", n: "WORD2VEC",           f: "words become directions", lane: 1 },
    { t: 130.0, y: "2016", n: "NEURAL RETRIEVAL",   f: "match by meaning, not by string", lane: 1 },
    { t: 144.0, y: "2017", n: "ATTENTION",          f: "look at everything at once", lane: 1 },
    { t: 158.0, y: "2018", n: "BERT",               f: "read the whole sentence first", lane: 1 },
    { t: 172.0, y: "2019", n: "VECTOR DATABASE",    f: "nearest neighbour, a billion times", lane: 1 },
    { t: 186.0, y: "2020", n: "RAG",                f: "look it up, then answer", lane: 1 },
    { t: 197.0, y: "2021", n: "CLIP",               f: "search pictures with words", lane: 1 },
    { t: 211.0, y: "2022", n: "CHATGPT",            f: "everybody starts asking", lane: 1 },
    { t: 227.0, y: "2023", n: "EMBEDDINGS EVERYWHERE", f: "everything becomes a vector", lane: 1 },
    { t: 241.0, y: "2024", n: "LONG CONTEXT",       f: "128,000 tokens in one go", lane: 1 },
    { t: 255.0, y: "2025", n: "REASONING MODELS",   f: "the searcher rewrites the query", lane: 1 },
    { t: 268.0, y: "2026", n: "1,050,000 TOKENS",   f: "GPT-6 ASTRA · stop searching, read it all", lane: 1 },
    { t: 281.0, y: "2026", n: "CLAUDE OPUS 5.5 · 国产五雄", f: "OSWORLD 2.1 · 81.8%", lane: 1 },
    { t: 291.0, y: "?",    n: "STILL SEARCHING",    f: "the cursor never stops blinking", lane: 1 }
  ];

  /* ---------------------------------------------------------------- colours */
  function hex2rgb(h) {
    h = String(h).replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var v = parseInt(h, 16);
    return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
  }
  function rgbCss(c) { return "rgb(" + Math.round(c[0] * 255) + "," + Math.round(c[1] * 255) + "," + Math.round(c[2] * 255) + ")"; }
  function hexA(h, a) {
    var c = hex2rgb(h);
    return "rgba(" + Math.round(c[0] * 255) + "," + Math.round(c[1] * 255) + "," + Math.round(c[2] * 255) + "," + (a === undefined ? 1 : a) + ")";
  }

  /* ----------------------------------------------------------------- lookup */
  function sectionIdxAt(t) {
    var s = WEM.Data && WEM.Data.sections;
    if (!s) return 0;
    for (var i = s.length - 1; i >= 0; i--) if (t >= s[i].start) return i;
    return 0;
  }
  function era(idOrIdx) {
    if (typeof idOrIdx === "string") {
      for (var i = 0; i < ERAS.length; i++) if (ERAS[i].id === idOrIdx) return ERAS[i];
      return ERAS[0];
    }
    return ERAS[clamp(idOrIdx | 0, 0, ERAS.length - 1)];
  }
  function eraAt(t) { return ERAS[clamp(sectionIdxAt(t), 0, ERAS.length - 1)]; }
  function litCount(t) {
    var n = 0;
    for (var i = 0; i < MILESTONES.length; i++) if (t >= MILESTONES[i].t) n++; else break;
    return n;
  }
  function current(t) {
    var best = null;
    for (var i = 0; i < MILESTONES.length; i++) { if (t >= MILESTONES[i].t) best = MILESTONES[i]; else break; }
    return best;
  }
  function lightK(t, m) {
    var d = t - m.t;
    if (d < 0) return 0;
    if (d > 1.6) return 1;
    return 1 + 0.9 * Math.exp(-d / 0.22);
  }

  /* ------------------------------------------------------------------- rail */
  var RAIL_TOP = -140, RAIL_BOT = -104, RAIL_BASE = -120;

  function rail(ctx) {
    var hud = ctx.hud, W = ctx.W, H = ctx.H, t = ctx.t;
    var a = ctx.chromeAmt === undefined ? 1 : ctx.chromeAmt;
    if (a <= 0.002) return;
    var x0 = 40, x1 = W - 40, span = x1 - x0;
    var by = H + RAIL_BASE;
    var e = eraAt(t), col = e.main;

    // the rail is drawn as the ruled edge of an index card: one hairline, a
    // double rule above it, and tab dividers hanging off it
    hud.line(x0, by, x1, by, { color: "rgba(238,242,246," + (0.34 * a) + ")", lw: 1 });
    hud.line(x0, by - 3, x1, by - 3, { color: "rgba(238,242,246," + (0.14 * a) + ")", lw: 1 });
    hud.line(x0, by - 9, x0, by + 9, { color: "rgba(238,242,246," + (0.40 * a) + ")", lw: 1 });
    hud.line(x1, by - 9, x1, by + 9, { color: "rgba(238,242,246," + (0.40 * a) + ")", lw: 1 });
    hud.T(x0, by + 27, "1945", { size: 9, color: WEM.HUD.COL.faint, alpha: 0.9 * a, spacing: 1.2 });
    hud.T(x0 + 44, by + 27, "THE INDEX", { size: 9, color: hexA(col, 0.8 * a), alpha: a, spacing: 2.6 });
    hud.T(x1, by + 27, "2026", { size: 9, color: WEM.HUD.COL.faint, alpha: 0.9 * a, spacing: 1.2, align: "right" });

    var lastLabel = -1e9, lastYear = null;
    for (var i = 0; i < MILESTONES.length; i++) {
      var m = MILESTONES[i];
      var x = x0 + span * clamp(m.t / WEM.Data.duration, 0, 1);
      var lit = t >= m.t;
      var k = lit ? lightK(t, m) : 0;
      var up = m.lane === 0;
      var hgt = lit ? 7 * Math.min(k, 1.3) : 3.5;
      var wd = lit ? 5 : 3;
      // the tab: a small card sticking out of the rail
      hud.rect(x - wd * 0.5, by + (up ? -4 - hgt : 1), wd, hgt, {
        fill: lit ? hexA(col, Math.min(1, 0.62 + 0.38 * k) * a) : "rgba(238,242,246," + (0.22 * a) + ")"
      });
      if (lit && x - lastLabel > 62 && m.y !== lastYear) {
        lastLabel = x; lastYear = m.y;
        hud.T(x, by + (up ? -22 : 22), m.y, {
          size: 9, color: hexA(col, 0.95 * a), alpha: Math.min(1, k) * 0.95, spacing: 0.8,
          align: up ? "left" : "left"
        });
      }
    }

    // the query cursor on the rail: a thin double bar, like a card held open
    var px = x0 + span * clamp(t / WEM.Data.duration, 0, 1);
    hud.rect(px - 1.5, by - 14, 3, 28, { fill: "rgba(255,209,102," + (0.95 * a) + ")" });
    hud.rect(px - 5, by - 17, 10, 3, { fill: "rgba(255,209,102," + (0.95 * a) + ")" });

    var cur = current(t);
    if (cur) {
      var kk = Math.min(1, (t - cur.t) / 0.5);
      hud.T(W - 40, H + RAIL_TOP - 16, cur.y + "  ·  " + cur.n, {
        size: 13, color: hexA(col, a * kk), alpha: a, align: "right", weight: 600, spacing: 0.6
      });
      hud.T(W - 40, H + RAIL_BOT + 6, cur.f, {
        size: 10, color: WEM.HUD.COL.dim, alpha: 0.75 * a * kk, align: "right"
      });
    }
  }

  /* -------------------------------------------------------------- query bar */
  // The film's signature device: the lyric line is the query.
  function queryBar(ctx, o) {
    o = o || {};
    var hud = ctx.hud, W = ctx.W, t = ctx.t;
    var a = (ctx.chromeAmt === undefined ? 1 : ctx.chromeAmt) * (o.alpha === undefined ? 1 : o.alpha);
    if (a <= 0.002) return;
    var e = eraAt(t), col = o.color || e.main;
    var x = o.x === undefined ? 300 : o.x, y = o.y === undefined ? 60 : o.y;
    var w = o.w === undefined ? W - 600 : o.w, h = o.h === undefined ? 42 : o.h;

    hud.rect(x, y, w, h, { fill: "rgba(4,6,10," + (0.42 * a) + ")" });
    hud.rect(x, y, w, h, { stroke: hexA(col, 0.55 * a), lw: 1 });
    // the field label
    hud.T(x + 12, y - 8, "QUERY", { size: 9, color: hexA(col, 0.9 * a), alpha: a, spacing: 2.4 });
    // magnifier glyph, drawn: a ring plus a stem
    var gx = x + 22, gy = y + h * 0.5, rr = 5.5;
    for (var i = 0; i < 14; i++) {
      var a0 = -0.9 + i / 13 * 4.4;
      var a1 = -0.9 + (i + 1) / 13 * 4.4;
      hud.line(gx + Math.cos(a0) * rr, gy + Math.sin(a0) * rr, gx + Math.cos(a1) * rr, gy + Math.sin(a1) * rr,
        { color: hexA(col, 0.9 * a), lw: 1.6 });
    }
    hud.line(gx + 4, gy + 4, gx + 8.5, gy + 8.5, { color: hexA(col, 0.9 * a), lw: 1.8 });

    var text = o.text === undefined ? (ctx.lyric ? String(ctx.lyric.text) : "") : o.text;
    hud.T(x + 48, y + h * 0.5 + 6, text, {
      size: o.size || 19, color: WEM.HUD.COL.white, alpha: 0.94 * a, spacing: 0.3
    });
    // blinking caret right after the text
    if (o.caret !== false) {
      var tw = 0;
      var c2 = hud.fc;
      c2.save(); c2.font = hud.fontStr(o.size || 19, "mono"); tw = c2.measureText(text).width; c2.restore();
      var blink = (Math.sin(t * 6.0) > -0.2) ? 1 : 0.15;
      hud.rect(x + 50 + tw, y + 10, 2, h - 20, { fill: hexA(col, 0.9 * a * blink) });
    }
    // right side: hit count
    var hits = o.hits === undefined ? ctx.hits : o.hits;
    var ht = (hits === undefined || hits === null) ? "—" : (typeof hits === "number" ? hits.toLocaleString("en-US") : String(hits));
    hud.T(x + w - 14, y + h * 0.5 - 2, ht, { size: 20, color: hexA(col, a), alpha: a, align: "right", weight: 600 });
    hud.T(x + w - 14, y + h * 0.5 + 14, o.note || "RESULTS", { size: 9, color: WEM.HUD.COL.dim, alpha: 0.85 * a, align: "right", spacing: 1.8 });
    // a thin relevance bar along the bottom edge of the field
    var pr = o.prog === undefined ? 0 : clamp(o.prog, 0, 1);
    if (pr > 0) hud.rect(x, y + h - 2, w * pr, 2, { fill: hexA(col, 0.75 * a) });
  }

  /* ----------------------------------------------------------------- chrome */
  function chrome(ctx) {
    var a = ctx.chromeAmt === undefined ? 1 : ctx.chromeAmt;
    // the meter outlives the chrome: the last frames of the film are black with
    // nothing but the LEDs still running
    if (WEM.AudioBar) WEM.AudioBar.draw(ctx, ctx.hud);
    if (a <= 0.002) return;
    var hud = ctx.hud, W = ctx.W, H = ctx.H, COL = WEM.HUD.COL;
    var t = ctx.t, e = eraAt(t), col = e.main;
    var secId = (ctx.sec && ctx.sec.id) || "--";
    var secName = (ctx.sec && ctx.sec.name) || "";
    var bp = ctx.beat ? ctx.beat.barPulse : 0;

    hud.rect(0, 0, W, 50, { fill: "rgba(4,6,10," + (0.46 * a) + ")" });
    hud.line(0, 50.5, W, 50.5, { color: "rgba(238,242,246," + (0.16 * a) + ")" });
    hud.rect(0, 50, W, 2, { fill: hexA(col, 0.5 * a) });

    hud.T(46, 21, "Mili — world.search (you) ;", { size: 15, color: COL.white, alpha: 0.88 * a, spacing: 0.4 });
    hud.T(46, 39, "THE INDEX OF YOU · 1945 → 2026", { size: 9, color: hexA(col, 0.85 * a), alpha: a, spacing: 2.2 });

    hud.T(600, 21, "SEGMENT " + secId + " / 22", { size: 11, color: COL.dim, alpha: 0.8 * a, spacing: 1.6 });
    hud.T(600, 41, String(secName).toUpperCase(), { size: 17, color: hexA(col, a), alpha: a, weight: 600, spacing: 1.1 });

    var mm = Math.floor(t / 60), ss = t - mm * 60;
    var tm = (mm < 10 ? "0" : "") + mm + ":" + (ss < 10 ? "0" : "") + ss.toFixed(2);
    var D = WEM.Data.duration, dm = Math.floor(D / 60), ds = D - dm * 60;
    var dtxt = ((dm < 10 ? "0" : "") + dm) + ":" + ((ds < 10 ? "0" : "") + ds.toFixed(2));
    hud.T(W - 46, 21, tm + " / " + dtxt, { size: 15, color: COL.grey, alpha: 0.85 * a, align: "right" });
    hud.T(W - 46, 39, "ERA " + e.y0 + (e.y1 !== e.y0 ? "–" + e.y1 : "") + " · " + e.label, {
      size: 10, color: hexA(col, 0.9 * a), alpha: a, align: "right", spacing: 1.4
    });

    var L = 26, mg = 14, cc = "rgba(238,242,246," + (0.30 * a) + ")";
    hud.line(mg, mg, mg + L, mg, { color: cc }); hud.line(mg, mg, mg, mg + L, { color: cc });
    hud.line(W - mg - L, mg, W - mg, mg, { color: cc }); hud.line(W - mg, mg, W - mg, mg + L, { color: cc });
    hud.line(mg, H - 82, mg + L, H - 82, { color: cc }); hud.line(mg, H - 82, mg, H - 82 - L, { color: cc });
    hud.line(W - mg - L, H - 82, W - mg, H - 82, { color: cc }); hud.line(W - mg, H - 82, W - mg, H - 82 - L, { color: cc });

    if (ctx.__qDrawn !== t) queryBar(ctx, {});
    rail(ctx);

    var r = 2.4 + 2.6 * bp;
    hud.rect(W / 2 - r, 9 - r, r * 2, r * 2, { fill: hexA(col, 0.5 * a * (0.4 + 0.6 * bp)) });
  }

  /* ------------------------------------------------------------ components */
  // an index card: ruled head, a tab, a hairline body
  function card(ctx, x, y, w, h, o) {
    o = o || {};
    var hud = ctx.hud, col = o.color || eraAt(ctx.t).main;
    var a = o.alpha === undefined ? 1 : o.alpha;
    hud.rect(x, y, w, h, { fill: "rgba(6,9,13," + ((o.fill === undefined ? 0.66 : o.fill) * a) + ")" });
    hud.rect(x, y, w, h, { stroke: hexA(col, (o.stroke === undefined ? 0.45 : o.stroke) * a), lw: 1 });
    // the top rule of a ruled card
    var ry = y + (o.head === undefined ? 26 : o.head);
    hud.line(x, ry, x + w, ry, { color: hexA(col, 0.34 * a) });
    if (o.title) {
      hud.T(x + 10, y + 17, String(o.title).toUpperCase(), {
        size: 10, color: hexA(col, a), alpha: a, spacing: 1.7, weight: 600
      });
    }
    if (o.right) hud.T(x + w - 10, y + 17, o.right, { size: 10, color: WEM.HUD.COL.dim, alpha: 0.8 * a, align: "right" });
    if (o.tab) {
      var tw = 12 + String(o.tab).length * 7.2;
      hud.rect(x + w - tw - 6, y - 13, tw, 13, { fill: hexA(col, 0.20 * a), stroke: hexA(col, 0.55 * a) });
      hud.T(x + w - tw + 0, y - 3, String(o.tab), { size: 9, color: hexA(col, 0.95 * a), alpha: a, spacing: 1.2 });
    }
    return { x: x, y: ry, w: w, h: h - (ry - y) };
  }

  // a catalogue tab that sticks out to the right of a stack
  function tab(ctx, x, y, w, h, label, o) {
    o = o || {};
    var hud = ctx.hud, col = o.color || eraAt(ctx.t).main;
    var a = o.alpha === undefined ? 1 : o.alpha;
    var on = o.on === undefined ? true : o.on;
    hud.rect(x, y, w, h, {
      fill: on ? hexA(col, (o.fillA === undefined ? 0.22 : o.fillA) * a) : "rgba(238,242,246," + (0.05 * a) + ")",
      stroke: on ? hexA(col, 0.6 * a) : "rgba(238,242,246," + (0.18 * a) + ")"
    });
    hud.T(x + w - 6, y + h * 0.5 + 4, String(label), {
      size: o.size || 10, color: on ? hexA(col, a) : WEM.HUD.COL.faint, alpha: a, align: "right", spacing: 1.4
    });
  }

  // one search result
  function resultRow(ctx, x, y, w, title, score, o) {
    o = o || {};
    var hud = ctx.hud, col = o.color || eraAt(ctx.t).main;
    var a = o.alpha === undefined ? 1 : o.alpha;
    hud.T(x, y, String(title), { size: o.size || 13, color: o.bright ? WEM.HUD.COL.white : WEM.HUD.COL.grey, alpha: a });
    var bw = o.barW === undefined ? 90 : o.barW;
    var bx = x + w - bw - 46;
    hud.rect(bx, y - 8, bw, 6, { fill: "rgba(238,242,246," + (0.10 * a) + ")" });
    hud.rect(bx, y - 8, bw * clamp(score, 0, 1), 6, { fill: hexA(col, 0.85 * a) });
    hud.T(x + w, y, score.toFixed(3), { size: 11, color: hexA(col, a), alpha: a, align: "right" });
    hud.line(x, y + 6, x + w, y + 6, { color: "rgba(238,242,246," + (0.07 * a) + ")" });
  }

  function tag(ctx, x, y, text, o) {
    o = o || {};
    var hud = ctx.hud, col = o.color || eraAt(ctx.t).main;
    var a = o.alpha === undefined ? 1 : o.alpha;
    hud.rect(x, y - 6, 4, 4, { fill: hexA(col, 0.9 * a) });
    hud.T(x + 10, y, String(text).toUpperCase(), {
      size: o.size || 10, color: o.bright ? WEM.HUD.COL.white : hexA(col, 0.9 * a),
      alpha: a, spacing: o.spacing === undefined ? 1.8 : o.spacing
    });
  }

  function big(ctx, x, y, text, o) {
    o = o || {};
    return ctx.hud.T(x, y, text, {
      size: o.size || 120, color: o.color || eraAt(ctx.t).main, alpha: o.alpha === undefined ? 1 : o.alpha,
      weight: o.weight || 700, spacing: o.spacing === undefined ? 4 : o.spacing,
      align: o.align || "left", glow: o.glow, blur: o.blur
    });
  }

  function rule(ctx, x, y, w, o) {
    o = o || {};
    var hud = ctx.hud, col = o.color || eraAt(ctx.t).main;
    var a = o.alpha === undefined ? 1 : o.alpha;
    hud.line(x, y, x + w, y, { color: hexA(col, 0.5 * a), lw: 1 });
    hud.line(x, y - 4, x, y + 4, { color: hexA(col, 0.8 * a), lw: 1 });
    hud.line(x + w, y - 4, x + w, y + 4, { color: hexA(col, 0.8 * a), lw: 1 });
  }

  function gauge(ctx, x, y, w, label, value, unit, p, o) {
    o = o || {};
    var hud = ctx.hud, col = o.color || eraAt(ctx.t).main;
    var a = o.alpha === undefined ? 1 : o.alpha;
    hud.T(x, y, label, { size: 10, color: WEM.HUD.COL.dim, alpha: 0.9 * a, spacing: 1.4 });
    hud.T(x + w, y, (typeof value === "number" ? value.toFixed(o.dp === undefined ? 3 : o.dp) : value) + (unit ? " " + unit : ""),
      { size: o.size || 13, color: hexA(col, a), alpha: a, align: "right" });
    hud.rect(x, y + 5, w, 3, { fill: "rgba(238,242,246," + (0.10 * a) + ")" });
    hud.rect(x, y + 5, w * clamp(p, 0, 1), 3, { fill: hexA(col, 0.85 * a) });
    if (o.ticks) {
      for (var i = 1; i < o.ticks; i++) {
        hud.line(x + w * i / o.ticks, y + 4, x + w * i / o.ticks, y + 9, { color: "rgba(238,242,246," + (0.16 * a) + ")" });
      }
    }
  }

  WEM.Idx = {
    ERAS: ERAS, MILESTONES: MILESTONES,
    era: era, eraAt: eraAt, sectionIdxAt: sectionIdxAt,
    litCount: litCount, current: current, lightK: lightK,
    css: function (t) { return eraAt(t).main; },
    css2: function (t) { return eraAt(t).alt; },
    rgb: function (h) { return hex2rgb(h); },
    rgbA: function (h, a) { var c = hex2rgb(h); return [c[0], c[1], c[2], a === undefined ? 1 : a]; },
    hexA: hexA, rgbCss: rgbCss,
    rail: rail, chrome: chrome, queryBar: queryBar,
    card: card, tab: tab, resultRow: resultRow,
    tag: tag, big: big, rule: rule, gauge: gauge,
    RAIL_TOP: RAIL_TOP, RAIL_BOT: RAIL_BOT, RAIL_BASE: RAIL_BASE
  };

  if (WEM.App) {
    WEM.App.prototype.drawChrome = function (ctx) { chrome(ctx); };
  }
})();
