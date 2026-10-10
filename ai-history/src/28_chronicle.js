/* ============================================================================
   CHRONICLE OF THE MACHINE  --  shared stage furniture
   ----------------------------------------------------------------------------
   One idea holds the whole film together: a timeline that runs from 1936 to
   2026 across the bottom of the frame, lighting up milestone by milestone as
   the song plays.  By 3:11 it is almost fully lit -- that IS the story.

   Everything here is shared: every section draws inside the same chrome, uses
   the same era palette, and never touches the rail band itself.

   Public surface (stable -- sections may rely on it):
     WEM.Chron.ERAS              15 era records, indexed by section index
     WEM.Chron.era(idOrIdx)      -> era record
     WEM.Chron.eraAt(t)          -> era record for the section containing t
     WEM.Chron.MILESTONES        [{t,y,name,fact,lane}]
     WEM.Chron.litCount(t)       -> how many milestones are lit at time t
     WEM.Chron.current(t)        -> the most recently lit milestone (or null)
     WEM.Chron.css(t)            -> current era main colour, e.g. "#5ce1c8"
     WEM.Chron.css2(t)           -> current era secondary colour
     WEM.Chron.rgb(hex)          -> [r,g,b] in 0..1, for ctx.gfx
     WEM.Chron.rgbA(hex, a)      -> [r,g,b] plus alpha, for ctx.gfx
     WEM.Chron.hexA(hex, a)      -> "rgba(r,g,b,a)" for the HUD
     WEM.Chron.rail(ctx)         -> draws the chronicle rail
     WEM.Chron.chrome(ctx)       -> draws the whole persistent frame
     WEM.Chron.panel(ctx,x,y,w,h,title,o)   era-tinted window
     WEM.Chron.tag(ctx,x,y,text,o)          small uppercase field label
     WEM.Chron.big(ctx,x,y,text,o)          big display type, letter-spaced
     WEM.Chron.rule(ctx,x,y,w,o)            hairline with end ticks
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core;
  var clamp = C.clamp, lerp = C.lerp, smoothstep = C.smoothstep, ease = C.ease;

  /* ------------------------------------------------------------------ eras */
  // index == section index (0..14).  id == the two digit section id.
  var ERAS = [
    { id: "01", name: "POWER LINE",          y0: 1936, y1: 1958, label: "RELAYS · VACUUM TUBES",
      main: "#ff8a3d", alt: "#ffd166", note: "electromechanical" },
    { id: "02", name: "world.execute(me);",  y0: 1957, y1: 1991, label: "ASSEMBLY · COMPILERS",
      main: "#ffc94a", alt: "#8ad4ff", note: "the first executable" },
    { id: "03", name: "SET OF POINTS",       y0: 2017, y1: 2018, label: "ATTENTION",
      main: "#5ce1c8", alt: "#ffffff", note: "mathematics of meaning" },
    { id: "04", name: "A.D. TO B.C.",        y0: 2018, y1: 2020, label: "PRETRAINING",
      main: "#4ad6ff", alt: "#6b8cff", note: "all of history, compressed" },
    { id: "05", name: "STIMULATIONS",        y0: 2022, y1: 2022, label: "RLHF",
      main: "#8f7bff", alt: "#5ce1c8", note: "learning from praise" },
    { id: "06", name: "EGGPLANT",            y0: 2023, y1: 2024, label: "MULTIMODAL",
      main: "#ff6fb0", alt: "#ffd166", note: "it can see" },
    { id: "07", name: "F TO M",              y0: 2024, y1: 2025, label: "ROLES · REASONING",
      main: "#6b8cff", alt: "#ffffff", note: "one model, every role" },
    { id: "08", name: "VIBRATIONS",          y0: 2025, y1: 2025, label: "ALIGNMENT",
      main: "#7f8892", alt: "#4ad6ff", note: "nobody is answering" },
    { id: "09", name: "FRAGMENTS",           y0: 2026, y1: 2026, label: "DISTILL · QUANTIZE",
      main: "#9ad14b", alt: "#ff8a3d", note: "smaller, so it can stay" },
    { id: "10", name: "ILLEGAL ARGUMENTS",   y0: 2026, y1: 2026, label: "RED TEAM",
      main: "#ff4d5e", alt: "#ffffff", note: "challenging your god" },
    { id: "11", name: "EXECUTION",           y0: 2026, y1: 2026, label: "COMPUTE",
      main: "#ffb020", alt: "#ff4d5e", note: "the sound of a data centre" },
    { id: "12", name: "COMPUTER USE",        y0: 2026, y1: 2026, label: "AGENTS",
      main: "#35e0ff", alt: "#5ce1c8", note: "it does it for you" },
    { id: "13", name: "LO-O-OVE",            y0: 2026, y1: 2026, label: "THE OBJECTIVE",
      main: "#ffd166", alt: "#ff6fb0", note: "a scalar you can maximise" },
    { id: "14", name: "THE FRONTIER",        y0: 2026, y1: 2026, label: "WHERE WE ARE",
      main: "#ffffff", alt: "#5ce1c8", note: "what do you want me to be" },
    { id: "15", name: "exit code 0",         y0: 2026, y1: 2026, label: "SHUTDOWN",
      main: "#e8eef4", alt: "#5ce1c8", note: "process finished" }
  ];

  /* ------------------------------------------------------------- milestones */
  // t  = when it lights up, in song seconds (so screen time == story time)
  // lane 0 = machines, lane 1 = models
  var MILESTONES = [
    { t: 1.6,  y: "1936", n: "TURING MACHINE",       f: "a tape, a head, and a decision", lane: 0 },
    { t: 4.2,  y: "1945", n: "ENIAC",                f: "17,468 vacuum tubes · 20 numbers of memory", lane: 0 },
    { t: 7.6,  y: "1947", n: "TRANSISTOR",           f: "the tube becomes a crystal", lane: 0 },
    { t: 11.2, y: "1958", n: "INTEGRATED CIRCUIT",   f: "a whole circuit on one slab", lane: 0 },
    { t: 20.6, y: "1971", n: "MICROPROCESSOR",       f: "4004 · 2,300 transistors", lane: 0 },
    { t: 24.2, y: "1972", n: "C",                    f: "the language that built the world", lane: 0 },
    { t: 27.8, y: "1991", n: "PYTHON · LINUX",       f: "a kernel and a snake, both free", lane: 0 },
    { t: 31.6, y: "2017", n: "TRANSFORMER",          f: "attention is all you need", lane: 1 },
    { t: 36.4, y: "2018", n: "GPT-1",                f: "117M parameters, unsupervised", lane: 1 },
    { t: 47.0, y: "2019", n: "GPT-2",                f: "1.5B parameters — too dangerous to release", lane: 1 },
    { t: 50.4, y: "2006", n: "CUDA",                 f: "the GPU learns to do mathematics", lane: 0 },
    { t: 53.6, y: "2012", n: "ALEXNET",              f: "8 layers, 60M weights, a new era", lane: 0 },
    { t: 54.8, y: "2020", n: "GPT-3",                f: "175B parameters · 300B tokens", lane: 1 },
    { t: 56.8, y: "2016", n: "ALPHAGO",              f: "the machine plays the impossible move", lane: 0 },
    { t: 62.4, y: "2022", n: "INSTRUCTGPT",          f: "learning from human preference", lane: 1 },
    { t: 67.0, y: "2022", n: "CHATGPT",              f: "one hundred million people in two months", lane: 1 },
    { t: 76.6, y: "2023", n: "GPT-4",                f: "it can see", lane: 1 },
    { t: 81.2, y: "2024", n: "GPT-4o",               f: "text, image, voice — one model", lane: 1 },
    { t: 91.0, y: "2024", n: "o1",                   f: "it thinks before it answers", lane: 1 },
    { t: 96.4, y: "2024", n: "DEEPSEEK-V3",          f: "671B mixture of experts", lane: 1 },
    { t: 100.2, y: "2025", n: "DEEPSEEK-R1",         f: "open reasoning weights", lane: 1 },
    { t: 107.6, y: "2025", n: "CLAUDE OPUS 4",       f: "a model you can work with all day", lane: 1 },
    { t: 112.4, y: "2025", n: "GPT-5",               f: "the frontier becomes a product", lane: 1 },
    { t: 124.6, y: "2026", n: "ON-DEVICE",           f: "2.1 GB → 0.4 GB, in your pocket", lane: 1 },
    { t: 164.5, y: "2026", n: "GPT-6 ASTRA",         f: "1,050,000 tokens of context", lane: 1 },
    { t: 169.0, y: "2026", n: "CLAUDE OPUS 5.5",     f: "680,000 lines migrated in one day", lane: 1 },
    { t: 173.6, y: "2026", n: "QWEN3.7-MAX · DEEPSEEK V4 · KIMI K2.6 · GLM-5.1 · MINIMAX M2.7",
      f: "five more, the same year", lane: 1 },
    { t: 198.0, y: "?", n: "AND THEN?",              f: "what do you want me to be?", lane: 1 }
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

  var MIX = { hex: hexA };

  /* ------------------------------------------------------------------ lookup */
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
  // 0..1 ramp that spikes on the beat right after a milestone lights up
  function lightK(t, m) {
    var d = t - m.t;
    if (d < 0) return 0;
    if (d > 1.6) return 1;
    return 1 + 0.9 * Math.exp(-d / 0.22);
  }

  /* ------------------------------------------------------------------- rail */
  var RAIL_TOP = -140, RAIL_BOT = -104, RAIL_BASE = -122;   // offsets from H

  function rail(ctx) {
    var hud = ctx.hud, W = ctx.W, H = ctx.H, t = ctx.t;
    var a = ctx.chromeAmt === undefined ? 1 : ctx.chromeAmt;
    if (a <= 0.002) return;
    var x0 = 40, x1 = W - 40, span = x1 - x0;
    var by = H + RAIL_BASE;
    var era_ = eraAt(t);
    var col = era_.main;

    // baseline
    hud.line(x0, by, x1, by, { color: "rgba(238,242,246," + (0.20 * a) + ")", lw: 1 });
    // end caps
    hud.line(x0, by - 7, x0, by + 7, { color: "rgba(238,242,246," + (0.38 * a) + ")", lw: 1 });
    hud.line(x1, by - 7, x1, by + 7, { color: "rgba(238,242,246," + (0.38 * a) + ")", lw: 1 });
    hud.T(x0, by + 26, "1936", { size: 9, color: WEM.HUD.COL.faint, alpha: 0.85 * a, spacing: 1.2 });
    hud.T(x1, by + 26, "2026", { size: 9, color: WEM.HUD.COL.faint, alpha: 0.85 * a, spacing: 1.2, align: "right" });
    hud.T(x0 + 40, by + 26, "CHRONICLE", { size: 9, color: hexA(col, 0.75 * a), alpha: a, spacing: 2.6 });

    var lastLabel = -1e9, lastYear = null;
    for (var i = 0; i < MILESTONES.length; i++) {
      var m = MILESTONES[i];
      var x = x0 + span * clamp(m.t / WEM.Data.duration, 0, 1);
      var lit = t >= m.t;
      var k = lit ? lightK(t, m) : 0;
      var up = m.lane === 0;
      var len = lit ? 13 * Math.min(k, 1.35) : 6;
      var c = lit ? hexA(col, Math.min(1, 0.55 + 0.45 * k)) : "rgba(238,242,246," + (0.20 * a) + ")";
      hud.line(x, by, x, by + (up ? -len : len), { color: c, lw: lit ? 2 : 1 });
      if (lit) {
        // a soft dot at the tip so a lit milestone reads from across the room
        hud.rect(x - 1.5, by + (up ? -len - 3 : len), 3, 3, { fill: hexA(col, 0.9 * a * Math.min(1, k)) });
      }
      // year labels: only lit ones, never closer than 62 px to the previous, and
      // never the same year twice in a row (2024-2026 has six releases in a row
      // and printing "2026" five times just reads as noise)
      if (lit && x - lastLabel > 62 && m.y !== lastYear) {
        lastLabel = x; lastYear = m.y;
        hud.T(x, by - (up ? 20 : 0) + (up ? 0 : 24), m.y, {
          size: 9, color: hexA(col, 0.9 * a), alpha: Math.min(1, k) * 0.95, spacing: 0.8
        });
      }
    }

    // playhead
    var px = x0 + span * clamp(t / WEM.Data.duration, 0, 1);
    hud.line(px, by - 20, px, by + 20, { color: "rgba(255,209,102," + (0.92 * a) + ")", lw: 2 });
    hud.rect(px - 3, by - 23, 6, 4, { fill: "rgba(255,209,102," + (0.92 * a) + ")" });

    // current milestone callout, right aligned just above the rail band
    var cur = current(t);
    if (cur) {
      var kk = Math.min(1, (t - cur.t) / 0.5);
      hud.T(W - 40, H + RAIL_TOP - 14, cur.y + "  ·  " + cur.n, {
        size: 13, color: hexA(col, a * kk), alpha: a, align: "right", weight: 600, spacing: 0.6
      });
      hud.T(W - 40, H + RAIL_BOT + 4, cur.f, {
        size: 10, color: WEM.HUD.COL.dim, alpha: 0.7 * a * kk, align: "right"
      });
    }
  }

  /* ----------------------------------------------------------------- chrome */
  function chrome(ctx) {
    var a = ctx.chromeAmt === undefined ? 1 : ctx.chromeAmt;
    // the audio meter is the film's signature and outlives the chrome: section 15
    // fades chromeAmt to 0 for the shutdown, and the LEDs must keep running to the
    // last frame (that is the whole point of the ending)
    if (WEM.AudioBar) WEM.AudioBar.draw(ctx, ctx.hud);
    if (a <= 0.002) return;
    var hud = ctx.hud, W = ctx.W, H = ctx.H, COL = WEM.HUD.COL;
    var t = ctx.t, era_ = eraAt(t), col = era_.main;
    var secId = (ctx.sec && ctx.sec.id) || "--";
    var secName = (ctx.sec && ctx.sec.name) || "";
    var bp = ctx.beat ? ctx.beat.barPulse : 0;

    /* top bar */
    hud.rect(0, 0, W, 46, { fill: "rgba(4,6,10," + (0.44 * a) + ")" });
    hud.line(0, 46.5, W, 46.5, { color: "rgba(238,242,246," + (0.14 * a) + ")" });
    // era tint bleeding down from the top edge
    hud.rect(0, 46, W, 2, { fill: hexA(col, 0.55 * a) });

    hud.T(24, 20, "Mili — world.execute (me) ;", { size: 15, color: COL.white, alpha: 0.86 * a, spacing: 0.4 });
    hud.T(24, 37, "CHRONICLE OF THE MACHINE · 1936 → 2026", {
      size: 9, color: hexA(col, 0.85 * a), alpha: a, spacing: 2.2
    });

    hud.T(600, 20, "SEGMENT " + secId + " / 15", { size: 11, color: COL.dim, alpha: 0.8 * a, spacing: 1.6 });
    hud.T(600, 39, String(secName).toUpperCase(), {
      size: 17, color: hexA(col, a), alpha: a, weight: 600, spacing: 1.1
    });

    var mm = Math.floor(t / 60), ss = t - mm * 60;
    var tm = (mm < 10 ? "0" : "") + mm + ":" + (ss < 10 ? "0" : "") + ss.toFixed(2);
    var D = WEM.Data.duration, dm = Math.floor(D / 60), ds = D - dm * 60;
    var dtxt = ((dm < 10 ? "0" : "") + dm) + ":" + ((ds < 10 ? "0" : "") + ds.toFixed(2));
    hud.T(W - 24, 20, tm + " / " + dtxt, { size: 15, color: COL.grey, alpha: 0.85 * a, align: "right" });
    hud.T(W - 24, 37, "ERA " + era_.y0 + (era_.y1 !== era_.y0 ? "–" + era_.y1 : "") + " · " + era_.label, {
      size: 10, color: hexA(col, 0.9 * a), alpha: a, align: "right", spacing: 1.4
    });

    /* corner brackets */
    var L = 26, mg = 14, cc = "rgba(238,242,246," + (0.30 * a) + ")";
    hud.line(mg, mg, mg + L, mg, { color: cc }); hud.line(mg, mg, mg, mg + L, { color: cc });
    hud.line(W - mg - L, mg, W - mg, mg, { color: cc }); hud.line(W - mg, mg, W - mg, mg + L, { color: cc });
    hud.line(mg, H - 82, mg + L, H - 82, { color: cc }); hud.line(mg, H - 82, mg, H - 82 - L, { color: cc });
    hud.line(W - mg - L, H - 82, W - mg, H - 82, { color: cc }); hud.line(W - mg, H - 82, W - mg, H - 82 - L, { color: cc });

    /* the rail, then the meter on top of everything */
    rail(ctx);

    /* pulse dot in the top bar, one per bar */
    var r = 2.4 + 2.6 * bp;
    hud.rect(W / 2 - r, 8 - r, r * 2, r * 2, { fill: hexA(col, 0.55 * a * (0.4 + 0.6 * bp)) });
  }

  /* ------------------------------------------------------------- HUD widgets */
  function panel(ctx, x, y, w, h, title, o) {
    o = o || {};
    var hud = ctx.hud, col = o.color || eraAt(ctx.t).main;
    var a = o.alpha === undefined ? 1 : o.alpha;
    hud.rect(x, y, w, h, { fill: o.bg || "rgba(6,9,13," + (0.62 * a) + ")" });
    hud.rect(x, y, w, h, { stroke: hexA(col, (o.stroke === undefined ? 0.42 : o.stroke) * a), lw: 1 });
    if (title) {
      hud.rect(x, y, w, 21, { fill: hexA(col, 0.14 * a) });
      hud.line(x, y + 21.5, x + w, y + 21.5, { color: hexA(col, 0.42 * a) });
      hud.T(x + 8, y + 15, String(title).toUpperCase(), {
        size: 10, color: hexA(col, a), alpha: a, spacing: 1.6, weight: 600
      });
      if (o.right) hud.T(x + w - 8, y + 15, o.right, { size: 10, color: WEM.HUD.COL.dim, alpha: 0.8 * a, align: "right" });
    }
    return { x: x, y: y + (title ? 21 : 0), w: w, h: h - (title ? 21 : 0) };
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
    var hud = ctx.hud;
    return hud.T(x, y, text, {
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

  // a horizontal instrument strip: label, unit, and a live bar.  used all over
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

  WEM.Chron = {
    ERAS: ERAS, MILESTONES: MILESTONES,
    era: era, eraAt: eraAt, sectionIdxAt: sectionIdxAt,
    litCount: litCount, current: current, lightK: lightK,
    css: function (t) { return eraAt(t).main; },
    css2: function (t) { return eraAt(t).alt; },
    rgb: function (h) { return hex2rgb(h); },
    rgbA: function (h, a) { var c = hex2rgb(h); return [c[0], c[1], c[2], a === undefined ? 1 : a]; },
    hexA: hexA, rgbCss: rgbCss,
    rail: rail, chrome: chrome,
    panel: panel, tag: tag, big: big, rule: rule, gauge: gauge,
    RAIL_TOP: RAIL_TOP, RAIL_BOT: RAIL_BOT, RAIL_BASE: RAIL_BASE
  };

  /* the film's frame is drawn by this module, not by the engine default */
  if (WEM.App) {
    WEM.App.prototype.drawChrome = function (ctx) { chrome(ctx); };
  }
})();
