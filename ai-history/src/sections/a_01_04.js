/* sections 01-04 — the machine is built, programmed, and taught to think
   ----------------------------------------------------------------------------
   01 POWER LINE          0.000 - 15.978   a hall of vacuum tubes is switched on
   02 world.execute(me); 15.978 - 29.825   the first executable line, then a stack
   03 SET OF POINTS       29.825 - 44.594  points -> line -> circle -> sine -> limit
   04 A.D. TO B.C.        44.594 - 59.363  forward/backward pass, history -> loss

   Everything is a pure function of ctx.t / ctx.local plus the beat clock.
   Composition area is y in [56, H-150]; the rail and the meter are chrome.
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, Ch = WEM.Chron;
  var clamp = C.clamp, lerp = C.lerp, Ease = C.Ease, M4 = C.M4, G = C.geo;
  var PI = C.PI, TAU = C.TAU, smoothstep = C.smoothstep;
  var h2 = C.h2, h3 = C.h3;

  /* ======================================================================
     shared helpers — era colour, flat HUD furniture, allocation-free maths
     ==================================================================== */

  var _hexCache = {};
  function hexRGB(h) {
    var c = _hexCache[h];
    if (c) return c;
    var s = String(h).replace("#", "");
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    var v = parseInt(s, 16);
    if (!(v >= 0)) v = 0xffffff;
    c = [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
    _hexCache[h] = c;
    return c;
  }
  function rgbOf(h) { return (Ch && Ch.rgb) ? Ch.rgb(h) : hexRGB(h); }
  function cssA(h, a) {
    if (Ch && Ch.hexA) return Ch.hexA(h, a);
    var c = hexRGB(h);
    return "rgba(" + Math.round(c[0] * 255) + "," + Math.round(c[1] * 255) + "," + Math.round(c[2] * 255) + "," + a + ")";
  }
  function eraMain(t) { return Ch ? Ch.css(t) : "#ffffff"; }
  function eraAlt(t) { return Ch ? Ch.css2(t) : "#ffffff"; }
  function greyA(a) { return "rgba(238,242,246," + a.toFixed(3) + ")"; }

  // era-tinted instrument panel — same furniture language as the shared chrome
  function field(hud, x, y, w, h, title, col, a, right) {
    a = a === undefined ? 1 : a;
    hud.rect(x, y, w, h, { fill: "rgba(6,9,13," + (0.62 * a).toFixed(3) + ")" });
    hud.rect(x, y, w, h, { stroke: cssA(col, 0.40 * a), lw: 1 });
    if (title) {
      hud.rect(x, y, w, 20, { fill: cssA(col, 0.13 * a) });
      hud.line(x, y + 20.5, x + w, y + 20.5, { color: cssA(col, 0.40 * a) });
      hud.T(x + 8, y + 14, String(title).toUpperCase(),
        { size: 10, color: cssA(col, a), alpha: a, spacing: 1.6, weight: 600 });
      if (right) hud.T(x + w - 8, y + 14, right, { size: 10, color: "#9aa3ad", alpha: 0.8 * a, align: "right" });
    }
    return { x: x, y: y + (title ? 21 : 0), w: w, h: h - (title ? 21 : 0) };
  }

  function kv(hud, x, y, w, k, v, a, vcol, size) {
    hud.T(x, y, k, { size: 10, color: "#9aa3ad", alpha: 0.9 * a, spacing: 1.3 });
    hud.T(x + w, y, v, { size: size || 12, color: vcol || "#eef2f6", alpha: a, align: "right" });
  }

  // the small historical footnote that closes each segment of act one
  function footnote(hud, x, y, text, a, align) {
    hud.T(x, y, text, { size: 10, color: "#9aa3ad", alpha: 0.45 * a, align: align || "right", spacing: 1.0 });
  }

  // basis matrix: col0 = local x, col1 = local y, col2 = local z, col3 = origin
  function basis(m, px, py, pz, ax, ay, az, bx, by, bz, cx, cy, cz) {
    m[0] = ax; m[1] = ay; m[2] = az; m[3] = 0;
    m[4] = bx; m[5] = by; m[6] = bz; m[7] = 0;
    m[8] = cx; m[9] = cy; m[10] = cz; m[11] = 0;
    m[12] = px; m[13] = py; m[14] = pz; m[15] = 1;
    return m;
  }
  // eye-facing quad basis of half-size hw x hh at p (no allocation)
  function billboardM(m, px, py, pz, ex, ey, ez, hw, hh) {
    var dx = ex - px, dy = ey - py, dz = ez - pz;
    var l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    dx /= l; dy /= l; dz /= l;
    var rx = dz, rz = -dx;
    var rl = Math.sqrt(rx * rx + rz * rz) || 1;
    rx /= rl; rz /= rl;
    var ux = dy * rz, uy = dz * rx - dx * rz, uz = -dy * rx;
    m[0] = rx * hw; m[1] = 0; m[2] = rz * hw; m[3] = 0;
    m[4] = ux * hh; m[5] = uy * hh; m[6] = uz * hh; m[7] = 0;
    m[8] = dx; m[9] = dy; m[10] = dz; m[11] = 0;
    m[12] = px; m[13] = py; m[14] = pz; m[15] = 1;
    return m;
  }
  // screen px -> world point at depth Z; exact for a horizontal camera (-z view)
  function worldAt(cam, sx, sy, Z, out) {
    var K = (cam.H * 0.5) / Math.tan(cam.fov * 0.5);
    var dz = cam.pos[2] - Z;
    out[0] = cam.pos[0] + (sx - cam.W * 0.5) * dz / K;
    out[1] = cam.pos[1] - (sy - cam.H * 0.5) * dz / K;
    out[2] = Z;
    return out;
  }
  // static keyframe track: keys = [{t, p:[x,y,z], q:[x,y,z]}] ; writes the camera
  function camTrack(keys, t, cam) {
    var i = 0, n = keys.length;
    while (i < n - 2 && t > keys[i + 1].t) i++;
    var a = keys[i], b = keys[i + 1];
    var k = (b.t > a.t) ? clamp((t - a.t) / (b.t - a.t), 0, 1) : 0;
    k = k * k * (3 - 2 * k);
    cam.mode = "persp"; cam.fov = 0.9; cam.near = 0.05; cam.far = 400; cam.roll = 0;
    cam.pos[0] = lerp(a.p[0], b.p[0], k);
    cam.pos[1] = lerp(a.p[1], b.p[1], k);
    cam.pos[2] = lerp(a.p[2], b.p[2], k);
    cam.target[0] = lerp(a.q[0], b.q[0], k);
    cam.target[1] = lerp(a.q[1], b.q[1], k);
    cam.target[2] = lerp(a.q[2], b.q[2], k);
    cam.up[0] = 0; cam.up[1] = 1; cam.up[2] = 0;
    cam.update();
  }

  var _m = new Float32Array(16);
  var _rect = [0, 0, 1, 1];
  var _rgba = [1, 1, 1, 1];
  var _col = [0, 0, 0];
  var _p = [0, 0, 0];
  var _q = [0, 0, 0];

  /* ==========================================================================
     01 · POWER LINE — 0.000 – 15.978
     A hall of tube racks, switched on one column per beat out of the dark.
     ======================================================================== */
  var S1_COLS = 12, S1_ROWS = 7, S1_LAY = 3, S1_N = S1_COLS * S1_ROWS * S1_LAY;
  var S1_RELAY_C = 16, S1_RELAY_R = 8;
  var S1_CARDS = 6, S1_HOLE_C = 8, S1_HOLE_R = 5;
  var S1_YO = 0.30;                                  // the hall sits above centre
  var S1_CARD_Y = 0.55;                              // card reader height
  var S1_TERM = [
    [0.100, "SWITCH ON THE POWER LINE"],
    [1.740, "REMEMBER TO PUT ON PROTECTION"],
    [3.873, "LAY DOWN YOUR PIECES"],
    [6.380, "OBJECT CREATION"],
    [7.446, "FILL IN MY DATA PARAMETERS"],
    [10.091, "INITIALIZATION"],
    [11.095, "SET UP OUR NEW WORLD"],
    [13.891, "SIMULATION"]
  ];
  var S1_POST = [
    [1.0, "VACUUM TUBES", "17,468", "OK"],
    [4.6, "RELAYS", "70,000", "OK"],
    [8.6, "MEMORY", "20 WORDS", "OK"],
    [12.6, "CLOCK", "100 kHz", "OK"]
  ];

  var s1 = {
    mesh: null, pts: null, relayQ: null, cardQ: null, rack: null,
    ign: null, flick: null, rx: null, ry: null, holeBand: null, cardT: null,
    flash: false
  };

  // k = 0 is the front plane, and the front plane lights first
  function s1pos(i, j, k, o) {
    o[0] = (i - (S1_COLS - 1) * 0.5) * 0.84;
    o[1] = (j - (S1_ROWS - 1) * 0.5) * 0.86 + S1_YO;
    o[2] = (1 - k) * 1.55;
    return o;
  }

  function s1line(arr, ax, ay, az, bx, by, bz, r, g, b, a, w) {
    arr.push(ax, ay, az, w, bx, by, bz, w, r, g, b, a);
  }

  WEM.defineSection({
    id: "01",
    name: "POWER LINE",

    init: function (ctx) {
      var i, j, k, v;
      /* --- one merged mesh for all 252 glass envelopes ------------------ */
      var tube = G.cylinder(0.056, 0.056, 0.30, 8, true);
      var nv = tube.pos.length / 3, ni = tube.idx.length;
      var pos = new Float32Array(nv * 3 * S1_N), nrm = new Float32Array(nv * 3 * S1_N);
      var idx = new Uint32Array(ni * S1_N);
      var vi = 0, ii = 0, base = 0, p = _p;
      for (k = 0; k < S1_LAY; k++) for (j = 0; j < S1_ROWS; j++) for (i = 0; i < S1_COLS; i++) {
        s1pos(i, j, k, p);
        for (v = 0; v < nv; v++) {
          pos[vi] = tube.pos[v * 3] + p[0];
          pos[vi + 1] = tube.pos[v * 3 + 1] + p[1];
          pos[vi + 2] = tube.pos[v * 3 + 2] + p[2];
          nrm[vi] = tube.nrm[v * 3];
          nrm[vi + 1] = tube.nrm[v * 3 + 1];
          nrm[vi + 2] = tube.nrm[v * 3 + 2];
          vi += 3;
        }
        for (v = 0; v < ni; v++) idx[ii++] = tube.idx[v] + base;
        base += nv;
      }
      s1.mesh = { pos: pos, nrm: nrm, idx: idx, _key: "s1tubes" };

      /* --- per-tube ignition beat + filament flicker, baked once -------- */
      s1.ign = new Float32Array(S1_N);
      s1.flick = new Float32Array(S1_N);
      var n = 0;
      for (k = 0; k < S1_LAY; k++) for (j = 0; j < S1_ROWS; j++) for (i = 0; i < S1_COLS; i++) {
        s1.ign[n] = i + k * 0.22;
        s1.flick[n] = 0.80 + 0.34 * h3(i * 3.11, j * 5.73, k * 2.37);
        n++;
      }

      /* --- relay matrix ------------------------------------------------- */
      s1.rx = new Float32Array(S1_RELAY_C * S1_RELAY_R);
      s1.ry = new Float32Array(S1_RELAY_C * S1_RELAY_R);
      for (i = 0; i < S1_RELAY_C; i++) for (j = 0; j < S1_RELAY_R; j++) {
        s1.rx[i * S1_RELAY_R + j] = (i - (S1_RELAY_C - 1) * 0.5) * 0.50;
        s1.ry[i * S1_RELAY_R + j] = (j - (S1_RELAY_R - 1) * 0.5) * 0.52;
      }

      /* --- punch card hole -> live spectrum band map -------------------- */
      s1.holeBand = new Int32Array(S1_CARDS * S1_HOLE_C * S1_HOLE_R);
      for (k = 0; k < S1_CARDS; k++) for (j = 0; j < S1_HOLE_R; j++) for (i = 0; i < S1_HOLE_C; i++) {
        s1.holeBand[(k * S1_HOLE_R + j) * S1_HOLE_C + i] = (i * 8 + j * 3 + k * 13) % 64;
      }
      s1.cardT = new Float32Array(S1_CARDS);
      for (k = 0; k < S1_CARDS; k++) s1.cardT[k] = k * 1.55;

      /* --- rack + floor rails, baked into one static line buffer -------- */
      var seg = [];
      var X0 = (S1_COLS - 1) * 0.42, Y0 = (S1_ROWS - 1) * 0.43;
      for (k = 0; k < S1_LAY; k++) {
        var z = (1 - k) * 1.55;
        for (i = 0; i <= S1_COLS; i++) {
          var x = -X0 - 0.42 + i * (2 * (X0 + 0.42) / S1_COLS);
          s1line(seg, x, -Y0 - 0.43 + S1_YO, z, x, Y0 + 0.43 + S1_YO, z, 0.42, 0.24, 0.12, 0.34, 1.2);
        }
        for (j = 0; j <= S1_ROWS; j++) {
          var y = -Y0 - 0.43 + S1_YO + j * (2 * (Y0 + 0.43) / S1_ROWS);
          s1line(seg, -X0 - 0.42, y, z, X0 + 0.42, y, z, 0.42, 0.24, 0.12, 0.34, 1.2);
        }
      }
      for (i = 0; i <= S1_COLS; i++) {
        var x2 = -X0 - 0.42 + i * (2 * (X0 + 0.42) / S1_COLS);
        s1line(seg, x2, Y0 + 0.43 + S1_YO, -1.55, x2, Y0 + 0.43 + S1_YO, 1.55, 0.55, 0.30, 0.14, 0.42, 1.4);
        s1line(seg, x2, -Y0 - 0.43 + S1_YO, -1.55, x2, -Y0 - 0.43 + S1_YO, 1.55, 0.55, 0.30, 0.14, 0.42, 1.4);
      }
      for (i = 0; i <= 12; i++) {                       // machine-room floor
        var fx = -10.5 + i * 1.75;
        s1line(seg, fx, -3.05, -9.0, fx, -3.05, 5.0, 0.16, 0.13, 0.13, 0.26, 1.0);
      }
      for (j = 0; j <= 8; j++) {
        var fz = -9.0 + j * 1.75;
        s1line(seg, -10.5, -3.05, fz, 10.5, -3.05, fz, 0.16, 0.13, 0.13, 0.26, 1.0);
      }
      s1.rack = new Float32Array(seg);

      s1.pts = new WEM.Viz.Points(560);
      s1.relayQ = new WEM.Viz.Quads(160);
      s1.cardQ = new WEM.Viz.Quads(280);
    },

    enter: function () { s1.flash = false; },

    draw2d: function (ctx) {
      var hud = ctx.hud, W = ctx.W, t = ctx.t, L = ctx.local;
      var bt = ctx.beat;
      var main = eraMain(t), alt = eraAlt(t);
      var a = ctx.in * (0.35 + 0.65 * ctx.out);
      var i;

      /* --- camera: very slow push in, breathing on the bar -------------- */
      var cam = ctx.cam;
      var cz = lerp(13.4, 9.5, Ease.inOutQuad(clamp(L / 15.4, 0, 1))) - 0.13 * bt.barPulse;
      var cy = 0.10 + 0.16 * bt.barPulse;
      cam.mode = "persp"; cam.fov = 0.9; cam.near = 0.05; cam.far = 400; cam.roll = 0;
      cam.pos[0] = 0; cam.pos[1] = cy; cam.pos[2] = cz;
      cam.target[0] = 0; cam.target[1] = cy; cam.target[2] = 0;
      cam.up[0] = 0; cam.up[1] = 1; cam.up[2] = 0;
      cam.update();

      /* --- segment 01 owns the power-on --------------------------------- */
      ctx.fx.crtOn = clamp(Ease.outCubic(clamp(L / 1.9, 0, 1)), 0, 1);

      /* --- the machine comes up to full heat ---------------------------- */
      var blow = smoothstep(11.4, 14.3, L);
      if (!s1.flash && t >= 15.0) {
        s1.flash = true;
        if (t < 15.7) ctx.fx.hit(0.85);      // the flash that marks the 01 -> 02 cut
      }
      var wb = 0.25 * blow * (0.55 + 0.45 * bt.pulse);
      if (wb > 0.002) ctx.fx.whiteBar = Math.max(ctx.fx.whiteBar, wb);
      var cm = rgbOf(main), ca = rgbOf(alt);
      ctx.fx.mood([cm[0] * 0.9 + 0.10, cm[1] * 0.55, cm[2] * 0.30], [ca[0], ca[1] * 0.7, ca[2] * 0.4], 0.16);

      /* --- punched paper tape across the top ---------------------------- */
      var tapeY = 64, tapeH = 28;
      var tx0 = 40, tx1 = W - 40, tspan = tx1 - tx0;
      hud.rect(tx0, tapeY, tspan, tapeH, { fill: cssA(alt, 0.055 * a) });
      hud.line(tx0, tapeY - 0.5, tx1, tapeY - 0.5, { color: cssA(alt, 0.34 * a) });
      hud.line(tx0, tapeY + tapeH + 0.5, tx1, tapeY + tapeH + 0.5, { color: cssA(alt, 0.34 * a) });
      var slots = 64, sw = tspan / slots;
      for (i = 0; i < slots; i++) {
        var bx = tx0 + (i + 0.5) * sw;
        var lvl = ctx.bands[i];
        hud.rect(bx - 5, tapeY + 6, 10, 5, { fill: cssA(alt, (0.10 + 0.05 * lvl) * a) });
        if (lvl > 0.22) {
          hud.rect(bx - 2, tapeY + 12, 4, 6, { fill: cssA(alt, (0.35 + 0.65 * lvl) * a) });
          hud.rect(bx - 2, tapeY + 5, 4, 6, { fill: cssA(alt, (0.30 + 0.60 * lvl) * a) });
        }
      }
      for (i = 0; i < slots; i += 2) {                  // sprocket row
        hud.rect(tx0 + (i + 0.5) * sw - 1.5, tapeY + 22, 3, 3, { fill: cssA(alt, 0.20 * a) });
      }
      var phx = tx0 + tspan * clamp(t / ctx.data.duration, 0, 1);
      hud.rect(phx - 1, tapeY - 3, 2, tapeH + 6, { fill: cssA(main, 0.75 * a) });
      hud.T(tx1, tapeY + tapeH + 14, "PUNCHED TAPE · 64 CHANNELS", {
        size: 9, color: cssA(alt, a), alpha: 0.8 * a, spacing: 1.8, align: "right"
      });

      /* --- left console: the lyric, typed one character at a time ------- */
      var active = 0;
      for (i = 0; i < S1_TERM.length; i++) if (t >= S1_TERM[i][0]) active = i;
      hud.rect(64, 132, 470, 254, { fill: "rgba(4,6,10," + (0.50 * a).toFixed(3) + ")" });
      hud.line(64, 132, 534, 132, { color: cssA(main, 0.42 * a) });
      hud.T(80, 122, "CONSOLE 0 · INPUT", { size: 10, color: cssA(main, a), alpha: 0.85 * a, spacing: 2.0 });
      for (i = 0; i < S1_TERM.length; i++) {
        var t0 = S1_TERM[i][0], txt = S1_TERM[i][1];
        if (t < t0 - 0.02) continue;
        var shown = Math.floor((t - t0) * 22);
        var isAct = (i === active);
        var s = txt.slice(0, clamp(shown, 0, txt.length));
        hud.T(96, 162 + i * 26, "> " + s, {
          size: 14,
          color: isAct ? cssA(alt, 1) : "#c3cad2",
          alpha: (isAct ? 1 : 0.52) * a,
          glow: isAct ? cssA(alt, 0.9) : null,
          blur: 10,
          spacing: 0.6
        });
        if (isAct && shown < txt.length && (Math.floor(t * 1.6) % 2 === 0)) {
          hud.rect(96 + hud.codeWidth("> " + s, "c", 14), 150 + i * 26, 8, 4, { fill: cssA(alt, 0.9 * a) });
        }
      }

      /* --- POST self test, bottom right --------------------------------- */
      var px = W - 40 - 336, py = 690, pw = 336, ph = 200;
      field(hud, px, py, pw, ph, "POST · SELF TEST", main, a, "POWER OK");
      for (i = 0; i < S1_POST.length; i++) {
        var ry = py + 46 + i * 30;
        var live = t >= S1_POST[i][0];
        kv(hud, px + 12, ry, pw - 24, S1_POST[i][1],
          live ? S1_POST[i][2] + "   " + S1_POST[i][3] : "- - - -",
          a, live ? cssA(alt, a) : "#5b636c", 12);
        if (live) hud.rect(px + 6, ry - 7, 3, 3, { fill: cssA(alt, 0.9 * a) });
      }
      if (Ch) {
        kv(hud, px + 12, py + 166, pw - 24, "CHRONICLE",
          Ch.litCount(t) + " / " + Ch.MILESTONES.length + " LIT", a, cssA(main, a), 12);
      }
      hud.rect(px + 12, py + ph - 22, pw - 24, 3, { fill: greyA(0.10 * a) });
      hud.rect(px + 12, py + ph - 22, (pw - 24) * clamp(L / 15.4, 0, 1), 3, { fill: cssA(main, 0.85 * a) });

      footnote(hud, W - 40, 912, "1936 TURING MACHINE · 1945 ENIAC · 1947 TRANSISTOR · 1958 INTEGRATED CIRCUIT", a);
      hud.T(64, 912, "MAINS 220 V · 60 Hz", { size: 10, color: "#9aa3ad", alpha: 0.45 * a, spacing: 1.0 });
    },

    draw3d: function (ctx) {
      var gfx = ctx.gfx, t = ctx.t, L = ctx.local, bt = ctx.beat, bd = ctx.bands;
      var main = eraMain(t), alt = eraAlt(t);
      var cm = rgbOf(main), ca = rgbOf(alt);
      var bf = bt.index + bt.phase;
      var blow = smoothstep(11.4, 14.3, L);
      var heat = 0.55 + 0.45 * bt.pulse;
      var i, j, k, n, lit, hot, dl;

      /* --- rack rails and floor ---------------------------------------- */
      gfx.lines(s1.rack, {
        add: true, glow: 0.55, depthWrite: false,
        fade: 0.20 + 0.80 * smoothstep(0.0, 4.5, L)
      });

      /* --- glass envelopes --------------------------------------------- */
      _col[0] = lerp(0.13, 0.62 * cm[0] + 0.10, 0.35 + 0.65 * blow);
      _col[1] = lerp(0.11, 0.36 * cm[1] + 0.06, 0.35 + 0.65 * blow);
      _col[2] = lerp(0.12, 0.18 * cm[2] + 0.05, 0.35 + 0.65 * blow);
      gfx.solid(s1.mesh, M4.ident(_m), {
        color: [_col[0], _col[1], _col[2]], alpha: 0.26 + 0.14 * blow,
        rim: 1.0, emissive: 0.18 + 0.30 * blow, depthWrite: false
      });

      /* --- filaments + sockets ----------------------------------------- */
      s1.pts.clear();
      n = 0;
      for (k = 0; k < S1_LAY; k++) for (j = 0; j < S1_ROWS; j++) for (i = 0; i < S1_COLS; i++) {
        s1pos(i, j, k, _p);
        lit = clamp((bf - s1.ign[n]) / 0.5, 0, 1);
        lit = lit * lit * (3 - 2 * lit);
        dl = 1 - 0.20 * k;
        hot = clamp(lit * s1.flick[n] * heat * (0.9 + 0.5 * blow), 0, 2.2);
        // the filament runs copper -> gold as it heats
        _col[0] = lerp(0.85, lerp(cm[0], ca[0], lit), lit);
        _col[1] = lerp(0.20, lerp(cm[1], ca[1], lit), lit);
        _col[2] = lerp(0.07, lerp(cm[2], ca[2], lit), lit);
        s1.pts.add(_p[0], _p[1] + 0.02, _p[2], 4.6 + 7.4 * hot, _col, clamp(hot * 0.95, 0, 1) * dl);
        // the socket keeps a little red glow from the first frame
        _col[0] = 0.95; _col[1] = 0.26 + 0.20 * lit; _col[2] = 0.12;
        s1.pts.add(_p[0], _p[1] - 0.17, _p[2], 2.2 + 1.6 * lit, _col, (0.30 + 0.35 * lit) * dl * heat);
        n++;
      }
      s1.pts.draw(gfx, { add: true, soft: 0.95, depthWrite: false });

      /* --- relay array: clatter driven by the spectrum ------------------ */
      var relayA = smoothstep(3.3, 4.4, L) * (1 - smoothstep(7.7, 8.7, L));
      if (relayA > 0.012) {
        var step = Math.floor(t * 8.0);
        var live = 0.22 + 0.62 * ctx.flux;
        s1.relayQ.clear();
        for (var ri = 0; ri < S1_RELAY_C; ri++) for (var rj = 0; rj < S1_RELAY_R; rj++) {
          var id = ri * S1_RELAY_R + rj;
          var hv = h2(ri * 1.7 + step * 0.37, rj * 2.3 - step * 0.11);
          var on = hv < live;
          var v = on ? (0.55 + 0.45 * hv) : 0.05;
          var sz = on ? 0.085 : 0.055;
          basis(_m, s1.rx[id], s1.ry[id], 2.55, sz, 0, 0, 0, sz, 0, 0, 0, 1);
          var puls = 0.5 + 0.5 * bt.pulse;
          _rgba[0] = lerp(cm[0] * 0.4, ca[0], v) * puls;
          _rgba[1] = lerp(cm[1] * 0.4, ca[1], v) * puls;
          _rgba[2] = lerp(cm[2] * 0.4, ca[2], v) * puls;
          _rgba[3] = relayA * (on ? 0.85 : 0.22);
          s1.relayQ.add(_m, _rect, _rgba);
        }
        s1.relayQ.draw(gfx, null, { add: true, depthWrite: false });
      }

      /* --- punched cards, fed in from screen right ---------------------- */
      var cardA = smoothstep(7.6, 8.8, L) * (1 - smoothstep(11.6, 12.7, L));
      if (cardA > 0.012) {
        var belt = bf * 0.42, span = 13.0, base = 3.35;
        s1.cardQ.clear();
        for (var ci = 0; ci < S1_CARDS; ci++) {
          var u = ((belt + s1.cardT[ci]) % span + span) % span;
          var cx = 7.2 - u;
          if (cx < -8.5 || cx > 8.5) continue;
          var fade = cardA * (1 - smoothstep(5.5, 8.0, Math.abs(cx)));
          basis(_m, cx, S1_CARD_Y, base, 0.78, 0, 0, 0, 0.50, 0, 0, 0, 1);
          _rgba[0] = 0.60; _rgba[1] = 0.38; _rgba[2] = 0.16; _rgba[3] = 0.72 * fade;
          s1.cardQ.add(_m, _rect, _rgba);
          // the holes are the live 64 band spectrum, punched straight through
          for (var hj = 0; hj < S1_HOLE_R; hj++) for (var hi = 0; hi < S1_HOLE_C; hi++) {
            var band = s1.holeBand[(ci * S1_HOLE_R + hj) * S1_HOLE_C + hi];
            if (bd[band] < 0.26) continue;
            var hxp = cx + (hi - (S1_HOLE_C - 1) * 0.5) * 0.170;
            var hyp = S1_CARD_Y + (hj - (S1_HOLE_R - 1) * 0.5) * 0.176;
            var inten = clamp((bd[band] - 0.26) * 2.2, 0, 1);
            basis(_m, hxp, hyp, base + 0.012, 0.048, 0, 0, 0, 0.056, 0, 0, 0, 1);
            _rgba[0] = 0.02; _rgba[1] = 0.02; _rgba[2] = 0.03;
            _rgba[3] = (0.55 + 0.45 * inten) * fade;
            s1.cardQ.add(_m, _rect, _rgba);
          }
        }
        // the read head every card passes through
        basis(_m, -2.6, S1_CARD_Y, base + 0.06, 0.045, 0, 0, 0, 0.78, 0, 0, 0, 1);
        var rh = 0.35 + 0.65 * bt.pulse;
        _rgba[0] = ca[0] * rh; _rgba[1] = ca[1] * rh; _rgba[2] = ca[2] * rh; _rgba[3] = cardA * 0.75;
        s1.cardQ.add(_m, _rect, _rgba);
        s1.cardQ.draw(gfx, null, { depthWrite: false });
      }

      /* --- status label on the machine frame ---------------------------- */
      var lp = ctx.util.vp(0, 3.58, 0);
      if (lp[2] > 0.2) {
        ctx.hud.T(lp[0], lp[1], "POWER LINE · " + (blow > 0.5 ? "FULL LOAD" : "WARMING UP"), {
          size: 12, color: cssA(blow > 0.5 ? alt : main, 0.85), alpha: 0.85 * a3(ctx), align: "center", spacing: 2.4
        });
      }
    }
  });

  function a3(ctx) { return ctx.in * (0.35 + 0.65 * ctx.out); }

  /* ==========================================================================
     02 · world.execute(me); — 15.978 – 29.825
     The line is stamped shut, we fly down it, then it folds into a call stack.
     ======================================================================== */
  var S2_TITLE = "world.execute(me);";
  var S2_GARBAGE = "#$%&@01<>/\\|+*=?ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var S2_INSTR = ["MOV", "ADD", "JMP", "CALL", "RET", "PUSH", "POP", "CMP", "LEA", "NOP"];
  var S2_LAYER = ["MAIN", "INIT", "PARSE", "EVAL", "EMIT", "CALL", "EXEC", "LOVE", "FOLD", "PUSH", "RET", "MAIN"];
  var S2_CARDS = 56;
  var S2_LANGS = [
    ["FORTRAN", "1957", 0], ["C", "1972", 24.2], ["C++", "1985", 0],
    ["PYTHON", "1991", 27.8], ["RUST", "2015", 0]
  ];
  var S2_OUT = [
    [0.75, "$ cc world.c -o world"],
    [1.55, "$ ./world"],
    [2.35, "> executing…"]
  ];
  var S2_CAM = [
    { t: 0.00, p: [0, 0.30, 5.0], q: [0, 0.30, 0] },
    { t: 0.45, p: [0, 0.30, 10.6], q: [0, 0.30, 0] },
    { t: 1.35, p: [0, 0.20, 3.2], q: [5.5, 0.10, 0] },
    { t: 2.00, p: [-8.6, 0.06, 0], q: [-5.1, 0.06, 0] },
    { t: 8.00, p: [8.6, 0.06, 0], q: [12.0, 0.06, 0] },
    { t: 9.30, p: [5.40, 2.30, 6.6], q: [0, 0.05, 0] },
    { t: 13.85, p: [-2.60, 3.40, 7.2], q: [0, 0.35, 0] }
  ];

  var s2 = { q: null, lines: null, hit: false, sym: null };

  WEM.defineSection({
    id: "02",
    name: "world.execute(me);",

    init: function (ctx) {
      s2.q = new WEM.Viz.Quads(S2_CARDS + 4);
      s2.lines = new WEM.Viz.Lines(260);
      // symbol table: addresses are random but stable (ctx.rnd is per section)
      var addr = 0x00400000 + ((ctx.rnd() * 0x1800) | 0) * 4;
      var names = ["main", "init", "execute", "love"];
      s2.sym = [];
      for (var i = 0; i < names.length; i++) {
        addr += 0x40 + ((ctx.rnd() * 0x180) | 0) * 4;
        s2.sym.push([names[i], "0x" + ("0000000" + addr.toString(16)).slice(-8).toUpperCase()]);
      }
    },

    enter: function () { s2.hit = false; },

    draw2d: function (ctx) {
      var hud = ctx.hud, W = ctx.W, t = ctx.t, L = ctx.local;
      var bt = ctx.beat;
      var main = eraMain(t), alt = eraAlt(t);
      var a = ctx.in * (0.4 + 0.6 * ctx.out);
      var cm = rgbOf(main), ca = rgbOf(alt);
      var i;

      camTrack(S2_CAM, L, ctx.cam);
      ctx.fx.mood([cm[0] * 0.85, cm[1] * 0.70, cm[2] * 0.30], [ca[0] * 0.8, ca[1] * 0.9, ca[2]], 0.13);

      /* --- the hook lands at 16.0: the press slams the line shut -------- */
      if (!s2.hit && t >= 16.0) {
        s2.hit = true;
        if (t < 16.6) { ctx.fx.hit(0.55); ctx.fx.whiteBar = Math.max(ctx.fx.whiteBar, 0.30); }
      }

      /* --- top: five languages, each on its real milestone -------------- */
      var ly = 74, lw = (W - 600) / (S2_LANGS.length - 1);
      hud.line(300, ly + 5, W - 300, ly + 5, { color: greyA(0.16 * a) });
      for (i = 0; i < S2_LANGS.length; i++) {
        var on = S2_LANGS[i][2] > 0 && t >= S2_LANGS[i][2];
        var x = 300 + i * lw;
        hud.rect(x - 2, ly + 3, 4, 4, { fill: on ? cssA(alt, a) : greyA(0.28 * a) });
        hud.T(x + 10, ly + 8, S2_LANGS[i][0], {
          size: 12, color: on ? cssA(alt, a) : "#9aa3ad", alpha: (on ? 1 : 0.7) * a,
          spacing: 1.8, glow: on ? cssA(alt, 0.8) : null, blur: 10
        });
        hud.T(x + 10, ly + 24, S2_LANGS[i][1], {
          size: 10, color: on ? cssA(main, a) : "#5b636c", alpha: a, spacing: 1.2
        });
      }

      /* --- the title: giant, decoding, then settling into a header ------ */
      var settle = smoothstep(2.55, 3.5, L);
      var tSize = lerp(150, 74, settle);
      var tY = lerp(452, 176, settle);
      var adv = hud.codeWidth("M", "c", tSize) + lerp(3, 1.5, settle);
      var tw = adv * S2_TITLE.length;
      var tx = W * 0.5 - tw * 0.5;
      var done = clamp((L - 0.0217) / 0.055, 0, S2_TITLE.length);
      var tick = Math.floor(t * 34);

      var plateA = (1 - settle * 0.55) * a;
      hud.rect(0, tY - tSize * 0.82, W, tSize * 1.18, { fill: "rgba(4,6,10," + (0.42 * plateA).toFixed(3) + ")" });
      hud.line(0, tY - tSize * 0.82, W, tY - tSize * 0.82, { color: cssA(main, 0.30 * plateA) });
      hud.line(0, tY + tSize * 0.36, W, tY + tSize * 0.36, { color: cssA(main, 0.30 * plateA) });

      for (i = 0; i < S2_TITLE.length; i++) {
        var state = done - i;
        var gi = Math.floor(h3(i * 7.31, tick * 1.7, 0) * S2_GARBAGE.length) % S2_GARBAGE.length;
        var glyph = state >= 1 ? S2_TITLE.charAt(i) : (state > -0.6 ? S2_GARBAGE.charAt(gi) : " ");
        var cx = tx + i * adv + adv * 0.5;
        hud.T(cx, tY, glyph, {
          size: tSize, font: "mono", weight: 700, align: "center",
          color: state >= 1 ? cssA(main, 1) : "#8ad4ff",
          alpha: (state >= 1 ? 0.94 : 0.42) * a,
          glow: cssA(state >= 1 ? main : alt, 0.9),
          blur: state >= 1 ? 26 : 12
        });
        if (state > -0.6 && state < 1) {
          hud.rect(cx - adv * 0.5, tY + tSize * 0.22, adv, 3, { fill: cssA(alt, 0.8 * a) });
        }
      }
      if (done < S2_TITLE.length) {
        hud.rect(tx + clamp(done, 0, S2_TITLE.length) * adv, tY - tSize * 0.72, 3, tSize * 0.98,
          { fill: cssA(alt, 0.9 * a) });
      } else {
        var uw = tw * 0.98 * clamp((L - 1.1) / 0.9, 0, 1);
        hud.rect(W * 0.5 - uw * 0.5, tY + tSize * 0.30, uw, 2,
          { fill: cssA(alt, (0.55 + 0.45 * bt.pulse) * a) });
      }

      /* --- compile output ---------------------------------------------- */
      for (i = 0; i < S2_OUT.length; i++) {
        if (L < S2_OUT[i][0]) continue;
        var oa = clamp((L - S2_OUT[i][0]) / 0.4, 0, 1);
        hud.T(W * 0.5, 636 + i * 28, S2_OUT[i][1], {
          size: 16, color: i === 2 ? cssA(alt, a) : "#c3cad2", alpha: oa * a,
          align: "center", glow: i === 2 ? cssA(alt, 0.7) : null, blur: 12, spacing: 0.8
        });
      }
      hud.rect(W * 0.5 - 150, 726, 300, 3, { fill: greyA(0.12 * a) });
      hud.rect(W * 0.5 - 150, 726, 300 * clamp((L - 2.4) / 11.0, 0, 1), 3, { fill: cssA(main, 0.8 * a) });

      /* --- symbol table, bottom left ----------------------------------- */
      var bx = 64, by = 640, bw = 430, bh = 176;
      field(hud, bx, by, bw, bh, "SYMBOL TABLE", main, a, "LINKED");
      for (i = 0; i < s2.sym.length; i++) {
        var ry = by + 46 + i * 30;
        hud.T(bx + 12, ry, s2.sym[i][1], { size: 12, color: cssA(main, a), alpha: 0.85 * a });
        hud.T(bx + 130, ry, s2.sym[i][0], { size: 13, color: "#eef2f6", alpha: a, glow: cssA(alt, 0.5), blur: 8 });
        hud.T(bx + bw - 14, ry, "T   .text", { size: 11, color: "#9aa3ad", alpha: 0.6 * a, align: "right" });
      }

      /* --- assembler listing, bottom right ------------------------------ */
      var ax = W - 40 - 430, ay = 640, aw = 430, ah = 176;
      field(hud, ax, ay, aw, ah, "ASSEMBLER", main, a, "1 PASS");
      var cur = Math.floor((bt.index + bt.phase) * 2.0);
      for (i = 0; i < 5; i++) {
        var ln = cur - 2 + i;
        var op = S2_INSTR[((ln % S2_INSTR.length) + S2_INSTR.length) % S2_INSTR.length];
        var reg = ["%rax", "%rbx", "%rcx", "%rdx"][((ln % 4) + 4) % 4];
        var isCur = (i === 2);
        hud.T(ax + 12, ay + 46 + i * 24,
          (ln < 10 ? "00" : "0") + ln + "  " + op + "   " + reg + ", " + (ln * 8) + "(%rbp)", {
            size: 13, color: isCur ? cssA(alt, a) : "#c3cad2", alpha: (isCur ? 1 : 0.55) * a,
            glow: isCur ? cssA(alt, 0.8) : null, blur: 10
          });
        if (isCur) hud.rect(ax + 6, ay + 36 + i * 24, 3, 13, { fill: cssA(alt, 0.9 * a) });
      }

      footnote(hud, W - 40, 858, "1971 MICROPROCESSOR · 1972 C · 1991 PYTHON", a);
      if (Ch) {
        hud.T(64, 858, "CHRONICLE  " + Ch.litCount(t) + " / " + Ch.MILESTONES.length + " LIT",
          { size: 10, color: "#9aa3ad", alpha: 0.45 * a, spacing: 1.0 });
      }
    },

    draw3d: function (ctx) {
      var gfx = ctx.gfx, t = ctx.t, L = ctx.local, bt = ctx.beat, bd = ctx.bands;
      var main = eraMain(t), alt = eraAlt(t);
      var cm = rgbOf(main), ca = rgbOf(alt);
      var eye = ctx.cam.pos;
      var PER = (ctx.data && ctx.data.period) || 0.461538;
      var stampK = smoothstep(0.0, 0.42, L);              // the press: z collapses
      var beltPhase = (bt.index + bt.phase) * 0.5;
      var towerK0 = 8.6, spanB = 28.0;
      var i, k;

      s2.q.clear();
      s2.lines.clear();

      for (i = 0; i < S2_CARDS; i++) {
        var layer = (i / 4) | 0, slot = i % 4;
        var active = layer < S2_LAYER.length;

        /* --- belt position: canyon walls plus a few floating lines ------ */
        var u = ((i * 0.5 - beltPhase) % spanB + spanB) % spanB;
        var bx = u - 14.0;
        var band = bd[(i * 5) % 40];
        var side = (i % 2) ? 1 : -1;
        var by = side * (1.45 + 0.62 * band);
        if (i % 7 === 3) by = (h2(i * 2.1, 7.3) < 0.5 ? -1 : 1) * (0.70 + 0.50 * h2(i * 3.7, 1.1));
        var bz = (((i * 0.37) % 4) + 4) % 4 - 2.0;
        bz *= (1 - stampK);

        /* --- tower position: one frame pushed per beat ------------------ */
        var age = L - (towerK0 + layer * PER);
        var tk = active ? clamp(age / 0.50, 0, 1) : 0;
        tk = tk * tk * (3 - 2 * tk);
        var drop = (1 - Ease.outCubic(clamp(age / 0.42, 0, 1))) * 0.95;
        var tx = lerp(bx, (slot - 1.5) * 0.62, tk);
        var ty = lerp(by, -1.90 + layer * 0.30 + drop, tk);
        var tz = lerp(bz, 0, tk);

        var al = clamp((L - 0.05) / 0.35, 0, 1);
        al *= active ? lerp(1, 0.30, tk) : lerp(1, 0.35, smoothstep(9.0, 10.5, L));

        // a card must never splash across the lens, or swipe through the rail
        var sp = ctx.util.vp(tx, ty, tz);
        if (sp[2] < 0.25) continue;
        al *= clamp((902 - sp[1]) / 150, 0, 1);
        if (al < 0.012) continue;

        billboardM(_m, tx, ty, tz, eye[0], eye[1], eye[2], 0.22, 0.145);
        var hot = tk > 0.02 ? (0.45 + 0.55 * clamp(age / 0.9, 0, 1)) : 1;
        _rgba[0] = cm[0] * hot; _rgba[1] = cm[1] * hot; _rgba[2] = cm[2] * hot;
        _rgba[3] = (0.30 + 0.24 * bt.pulse) * al;
        s2.q.add(_m, _rect, _rgba);

        /* --- card edge -------------------------------------------------- */
        s2.lines.seg(tx - 0.21, ty - 0.135, tz, tx + 0.21, ty - 0.135, tz, ca, 1.2, 0.55 * al);
        s2.lines.seg(tx + 0.21, ty - 0.135, tz, tx + 0.21, ty + 0.135, tz, ca, 1.2, 0.55 * al);

        /* --- the instruction printed on the near cards ------------------ */
        if (tk < 0.5 && al > 0.25) {
          if (sp[2] > 1.2 && sp[2] < 15.0 && sp[0] > 60 && sp[0] < ctx.W - 60 && sp[1] > 70 && sp[1] < 860) {
            var size = clamp(78 / sp[2], 7.5, 22);
            ctx.hud.T(sp[0], sp[1] + size * 0.35, S2_INSTR[i % S2_INSTR.length], {
              size: size, color: cssA(alt, 0.95), alpha: clamp((15.0 - sp[2]) / 9.0, 0, 1) * 0.8 * al,
              align: "center", spacing: 1.2, glow: cssA(main, 0.6), blur: 8
            });
          }
        }
      }
      s2.q.draw(gfx, null, { add: true, depthWrite: false });

      /* --- conveyor rails, piece by piece so nothing sweeps the rail band */
      var railA = 1 - smoothstep(8.4, 10.0, L);
      if (railA > 0.02) {
        var zR = 2.35 * (1 - stampK);
        for (k = -15; k < 15; k += 2) {
          var tick = ((k * 0.5 - beltPhase) % 2 + 2) % 2;
          var ru = ctx.util.vp(k + 1, 2.22, zR);
          if (ru[2] > 0.4 && ru[1] > 96 && ru[1] < 840) {
            s2.lines.seg(k, 2.22, zR, k + 2, 2.22, zR, cm, 1.6, 0.32 * railA);
            s2.lines.seg(k, 2.22, zR, k, 2.50 - 0.28 * tick, zR, cm, 1.0, 0.28 * railA);
          }
          var rd = ctx.util.vp(k + 1, -2.22, zR);
          if (rd[2] > 0.4 && rd[1] > 96 && rd[1] < 840) {
            s2.lines.seg(k, -2.22, zR, k + 2, -2.22, zR, cm, 1.6, 0.32 * railA);
            s2.lines.seg(k, -2.22, zR, k, -2.50 + 0.28 * tick, zR, cm, 1.0, 0.28 * railA);
          }
        }
      }

      /* --- the call stack tower ---------------------------------------- */
      var tA = smoothstep(8.5, 9.4, L);
      if (tA > 0.01) {
        s2.lines.seg(-1.35, -2.06, 0, 1.35, -2.06, 0, ca, 2.0, 0.7 * tA);
        for (var l2 = 0; l2 < S2_LAYER.length; l2++) {
          var pushed = clamp((L - (towerK0 + l2 * PER)) / 0.45, 0, 1);
          if (pushed <= 0) break;
          var yy = -1.90 + l2 * 0.30 + 0.15;
          s2.lines.seg(-1.45, yy, 0, 0.0, yy, 0, ca, 1.6, 0.55 * tA * pushed);
          s2.lines.seg(0.0, yy, 0, 1.45, yy, 0, ca, 1.6, 0.55 * tA * pushed);
          var pp = ctx.util.vp(-1.72, yy - 0.05, 0);
          if (pp[2] > 0.5 && pp[1] > 60 && pp[1] < 890) {
            ctx.hud.T(pp[0], pp[1], "FRAME " + (l2 < 10 ? "0" : "") + l2, {
              size: 9, color: cssA(main, 0.85), alpha: 0.7 * tA * pushed, align: "right", spacing: 1.4
            });
            ctx.hud.T(pp[0], pp[1] + 14, S2_LAYER[l2], {
              size: 12, color: cssA(alt, 0.95), alpha: 0.9 * tA * pushed, align: "right", spacing: 1.6,
              glow: cssA(alt, 0.5), blur: 8
            });
          }
        }
        // the stack pointer rides the newest frame
        var topL = clamp(Math.floor((L - towerK0) / PER), 0, S2_LAYER.length - 1);
        var sp2 = ctx.util.vp(1.62, -1.90 + topL * 0.30 + 0.15, 0);
        if (sp2[2] > 0.5 && sp2[1] > 60 && sp2[1] < 890) {
          ctx.hud.T(sp2[0], sp2[1] + 4, "SP \u2192", {
            size: 11, color: cssA(alt, 0.95), alpha: 0.9 * tA, spacing: 1.2
          });
        }
      }

      s2.lines.draw(gfx, { add: true, glow: 0.6, depthWrite: false });
    }
  });

  /* ==========================================================================
     03 · SET OF POINTS — 29.825 – 44.594
     One coordinate deforms: cloud -> line -> circle -> sine -> hyperbola -> words.
     ======================================================================== */
  var S3_N = 512, S3_DIM = 12;
  var S3_WORDS = [
    "POINT", "DIMENSION", "CIRCLE", "CIRCUMFERENCE", "SINE", "TANGENT",
    "INFINITY", "LIMIT", "VECTOR", "MATRIX", "ATTENTION", "TOKEN",
    "EMBED", "SOFTMAX", "QUERY", "KEY", "VALUE", "GRADIENT",
    "LOSS", "WEIGHT", "MODEL", "MEANING", "LOVE", "WORLD"
  ];
  var S3_A = 1.45;                      // amplitude == circle radius
  var S3_L = PI * S3_A;                 // half length of the unrolled line
  var S3_AX = 3.6, S3_B = 1.30;         // hyperbola semi-axes
  var S3_ASYM = S3_B / S3_AX;           // asymptote slope, shallow enough to leave
                                        // through the sides of the frame

  var s3 = {
    p0: null, qs: null, a: null, jitx: null, jity: null,
    pts: null, lines: null, W3: null, conn: null, tang: null
  };

  /* the whole segment is this one map: a in [-L, L] -> the plane.
     curl  0..1 : straight line rolls into a circle of radius L/PI
     unroll 0..1: that circle unrolls into y = A sin(x/A)
     hyp   0..1 : the sine opens into a hyperbola with slope ~0.54 asymptotes */
  function s3pos(a, curl, unroll, hyp, out) {
    var s = a / S3_L;
    var k = clamp(curl, 0.0008, 1);
    var rho = S3_L / (PI * k);
    var th = s * PI * k;
    var cx = rho * Math.sin(th);
    // the arc is kept vertically centred while it rolls, so the half-open
    // circle never swings its ends below the frame on the way round
    var cy = rho * (Math.cos(th) - 1) - rho * (Math.cos(PI * k) - 1) * 0.5;
    var sx = a;
    var sy = (S3_L / PI) * Math.sin(s * PI);
    var x = lerp(cx, sx, unroll);
    var y = lerp(cy, sy, unroll);
    if (hyp > 0.0001) {
      var hx = a * (1 + 1.55 * hyp);
      var sg = s >= 0 ? 1 : -1;
      var u = hx / S3_AX;
      var hy = sg * S3_B * Math.sqrt(1 + u * u);
      x = lerp(x, hx, hyp);
      y = lerp(y, hy, hyp);
    }
    out[0] = x; out[1] = y; out[2] = 0;
    return out;
  }

  /* a real (if tiny) embedding: signed hashing of character trigrams */
  function s3wordVec(word, out) {
    var i, n = out.length;
    for (i = 0; i < n; i++) out[i] = 0;
    var s = "<" + word.toLowerCase() + ">";
    for (i = 0; i + 2 < s.length; i++) {
      var code = (s.charCodeAt(i) * 131 + s.charCodeAt(i + 1) * 17 + s.charCodeAt(i + 2)) >>> 0;
      var hh = Math.imul(code ^ (code >>> 7), 2654435761) >>> 0;
      var idx = hh % n;
      var sgn = ((hh >>> 11) & 1) ? 1 : -1;
      out[idx] += sgn;
      out[(idx + 5) % n] += sgn * 0.55;
      out[(idx + 9) % n] += sgn * 0.25;
    }
    var l = 0;
    for (i = 0; i < n; i++) l += out[i] * out[i];
    l = Math.sqrt(l) || 1;
    for (i = 0; i < n; i++) out[i] /= l;
    return out;
  }

  /* PCA by power iteration with deflation — the 2-D layout is really solved */
  function s3buildEmbedding() {
    var n = S3_WORDS.length, D = S3_DIM, i, a, b, d, it;
    var V = new Float32Array(n * D), tmp = new Float32Array(D);
    for (i = 0; i < n; i++) {
      s3wordVec(S3_WORDS[i], tmp);
      for (d = 0; d < D; d++) V[i * D + d] = tmp[d];
    }
    var mu = new Float32Array(D);
    for (i = 0; i < n; i++) for (d = 0; d < D; d++) mu[d] += V[i * D + d] / n;
    var X = new Float32Array(n * D);
    for (i = 0; i < n; i++) for (d = 0; d < D; d++) X[i * D + d] = V[i * D + d] - mu[d];

    var M = new Float32Array(D * D);
    for (i = 0; i < n; i++) for (a = 0; a < D; a++) {
      var xa = X[i * D + a];
      for (b = a; b < D; b++) M[a * D + b] += xa * X[i * D + b];
    }
    for (a = 0; a < D; a++) for (b = a + 1; b < D; b++) M[b * D + a] = M[a * D + b];

    var comps = [];
    for (var kk = 0; kk < 2; kk++) {
      var v = new Float32Array(D), w = new Float32Array(D);
      for (d = 0; d < D; d++) v[d] = 0.15 + h2(d * 1.7, kk * 3.9);
      var lam = 1;
      for (it = 0; it < 90; it++) {
        for (a = 0; a < D; a++) {
          var sum = 0;
          for (b = 0; b < D; b++) sum += M[a * D + b] * v[b];
          w[a] = sum;
        }
        var nrm = 0;
        for (d = 0; d < D; d++) nrm += w[d] * w[d];
        nrm = Math.sqrt(nrm) || 1;
        for (d = 0; d < D; d++) v[d] = w[d] / nrm;
        lam = nrm;
      }
      comps.push(v);
      for (a = 0; a < D; a++) for (b = 0; b < D; b++) M[a * D + b] -= lam * v[a] * v[b];
    }

    var P = new Float32Array(n * 2), mx = 1e-6, my = 1e-6;
    for (i = 0; i < n; i++) {
      var px = 0, py = 0;
      for (d = 0; d < D; d++) { px += X[i * D + d] * comps[0][d]; py += X[i * D + d] * comps[1][d]; }
      P[i * 2] = px; P[i * 2 + 1] = py;
      mx = Math.max(mx, Math.abs(px)); my = Math.max(my, Math.abs(py));
    }
    var sc = Math.min(4.6 / mx, 2.35 / my);
    var out2 = new Float32Array(n * 2);
    for (i = 0; i < n; i++) { out2[i * 2] = P[i * 2] * sc - 1.10; out2[i * 2 + 1] = P[i * 2 + 1] * sc; }

    // tilt into 3D so the cloud reads as a space rather than a chart
    var cy = Math.cos(-0.30), sy = Math.sin(-0.30), cx = Math.cos(0.22), sx = Math.sin(0.22);
    var W3 = new Float32Array(n * 3);
    for (i = 0; i < n; i++) {
      var x0 = out2[i * 2], y0 = out2[i * 2 + 1];
      var xr = x0 * cy, zr = -x0 * sy;
      W3[i * 3] = xr;
      W3[i * 3 + 1] = y0 * cx - zr * sx;
      W3[i * 3 + 2] = y0 * sx + zr * cx;
    }

    // three nearest neighbours by cosine in the original 12-d space
    var conn = [];
    for (i = 0; i < n; i++) {
      var best = [];
      for (var j = 0; j < n; j++) {
        if (j === i) continue;
        var dot = 0;
        for (d = 0; d < D; d++) dot += V[i * D + d] * V[j * D + d];
        if (best.length < 3) { best.push([dot, j]); best.sort(cmpDot); }
        else if (dot > best[2][0]) { best[2] = [dot, j]; best.sort(cmpDot); }
      }
      for (var bj = 0; bj < best.length; bj++) if (best[bj][1] > i) conn.push(i, best[bj][1]);
    }
    return { W3: W3, conn: conn };
  }
  function cmpDot(p, q) { return q[0] - p[0]; }

  var S3_CAM = [
    { t: 0.00, p: [0, 0, 7.85], q: [0, 0, 0] },
    { t: 1.20, p: [0, 0, 7.55], q: [0, 0, 0] },
    { t: 3.30, p: [0, 0, 7.45], q: [0, 0, 0] },
    { t: 5.80, p: [0, 0, 6.35], q: [0, 0, 0] },
    { t: 7.30, p: [0, 0, 6.95], q: [0, 0, 0] },
    { t: 9.90, p: [0, 0, 7.30], q: [0, 0, 0] },
    { t: 11.10, p: [0, 0, 9.00], q: [0, 0, 0] },
    { t: 12.85, p: [0, 0, 8.45], q: [0, 0, 0] },
    { t: 14.77, p: [0, 0, 8.05], q: [0, 0, 0] }
  ];

  function s3latest(L, T3, PER) { return clamp(Math.floor((L - T3) / PER) - 2, 0, 6); }

  WEM.defineSection({
    id: "03",
    name: "SET OF POINTS",

    init: function (ctx) {
      var i, k;
      var R = ctx.rnd;
      s3.p0 = new Float32Array(S3_N * 3);      // the random cloud
      s3.qs = new Float32Array(S3_N);          // its projection onto the x axis (scaled)
      s3.a = new Float32Array(S3_N);           // even coordinate, assigned by rank
      s3.jitx = new Float32Array(S3_N);
      s3.jity = new Float32Array(S3_N);
      var qmax = 1e-6;
      for (i = 0; i < S3_N; i++) {
        var u1 = R(), u2 = R(), u3 = R();
        var rr = 2.35 * Math.cbrt(u1);
        var ct = 2 * u2 - 1, ph = TAU * u3, st = Math.sqrt(Math.max(0, 1 - ct * ct));
        var x = rr * st * Math.cos(ph), y = rr * st * Math.sin(ph), z = rr * ct;
        s3.p0[i * 3] = x; s3.p0[i * 3 + 1] = y; s3.p0[i * 3 + 2] = z;
        s3.qs[i] = x;
        qmax = Math.max(qmax, Math.abs(x));
        var jr = 0.26 * Math.sqrt(R()), ja = TAU * R();
        s3.jitx[i] = Math.cos(ja) * jr;
        s3.jity[i] = Math.sin(ja) * jr;
      }
      var scale = S3_L / qmax;
      var ord = new Array(S3_N);
      for (i = 0; i < S3_N; i++) { s3.qs[i] *= scale; ord[i] = i; }
      ord.sort(function (p, r) { return s3.qs[p] - s3.qs[r]; });
      // rank order is preserved, so evening the spacing never crosses two points
      for (k = 0; k < S3_N; k++) s3.a[ord[k]] = -S3_L + 2 * S3_L * (k + 0.5) / S3_N;

      s3.pts = new WEM.Viz.Points(700);
      s3.lines = new WEM.Viz.Lines(1400);
      var emb = s3buildEmbedding();
      s3.W3 = emb.W3;
      s3.conn = new Int32Array(emb.conn);

      s3.tang = new Float32Array(7 * 3);
      for (i = 0; i < 7; i++) {
        var sk = -1 + i / 3;
        s3.tang[i * 3] = sk * S3_L;
        s3.tang[i * 3 + 1] = (S3_L / PI) * Math.sin(sk * PI);
        s3.tang[i * 3 + 2] = Math.cos(sk * PI);        // dy/dx of y = A sin(x/A)
      }
    },

    enter: function () {},

    draw2d: function (ctx) {
      var hud = ctx.hud, W = ctx.W, t = ctx.t, L = ctx.local, D = ctx.dur;
      var main = eraMain(t), alt = eraAlt(t);
      var a = ctx.in * (0.4 + 0.6 * ctx.out);
      var cm = rgbOf(main), ca = rgbOf(alt);
      var PER = (ctx.data && ctx.data.period) || 0.461538;
      var i;

      camTrack(S3_CAM, L, ctx.cam);
      ctx.fx.mood([cm[0] * 0.55, cm[1] * 0.95, cm[2]], [0.75, 0.95, 1.0], 0.11);

      var T2 = D * 0.25, T3 = D * 0.50, T4 = D * 0.75;
      var curl = smoothstep(T2 + 0.55, T2 + 2.6, L);
      var rho = S3_L / (PI * clamp(curl, 0.0008, 1));
      var circ = 2 * PI * rho;
      var stage = L < T2 ? 0 : (L < T3 ? 1 : (L < T4 ? 2 : 3));
      var latest = s3latest(L, T3, PER);
      var slope = s3.tang[latest * 3 + 2];

      /* --- header ------------------------------------------------------- */
      hud.line(320, 78, 660, 78, { color: cssA(main, 0.35 * a) });
      hud.line(W - 660, 78, W - 320, 78, { color: cssA(main, 0.35 * a) });
      hud.T(W * 0.5, 84, "ATTENTION IS ALL YOU NEED · 2017", {
        size: 13, color: cssA(main, a), alpha: 0.85 * a, align: "center", spacing: 3.4,
        glow: cssA(main, 0.5), blur: 10
      });

      /* --- right readout, every number computed ------------------------- */
      var rxp = 1560, ryp = 132, rwp = 320, rhp = 300;
      field(hud, rxp, ryp, rwp, rhp, "READOUT", main, a, "d = 512");
      var vals = [
        "d = 512",
        stage >= 1 ? "2\u03C0r = " + circ.toFixed(4) : "\u2014",
        stage >= 2 ? "dy/dx = " + slope.toFixed(4) : "\u2014",
        "x \u2192 \u221E"
      ];
      var names = ["DIMENSION", "CIRCUMFERENCE", "TANGENT", "LIMIT"];
      for (i = 0; i < 4; i++) {
        var on = (i === stage);
        var ry = ryp + 50 + i * 34;
        hud.T(rxp + 14, ry, names[i], {
          size: 10, color: on ? cssA(alt, a) : "#9aa3ad", alpha: (on ? 1 : 0.7) * a, spacing: 1.6
        });
        hud.T(rxp + rwp - 14, ry, vals[i], {
          size: on ? 14 : 12, color: on ? cssA(main, a) : "#c3cad2", alpha: (on ? 1 : 0.55) * a, align: "right"
        });
        if (on) hud.rect(rxp + 6, ry - 8, 3, 10, { fill: cssA(alt, 0.9 * a) });
        hud.line(rxp + 14, ry + 8, rxp + rwp - 14, ry + 8, { color: greyA(0.08 * a) });
      }
      hud.T(rxp + 14, ryp + rhp - 18, "2\u03C0 = 6.2832   ·   r = " + (S3_L / PI).toFixed(4), {
        size: 10, color: "#9aa3ad", alpha: 0.6 * a, spacing: 1.0
      });

      /* --- model ledger: the two milestones this segment registers ------ */
      var l1 = t >= 31.6, l2b = t >= 36.4;
      var ly = ryp + rhp + 26;
      hud.T(W - 40, ly, "MODEL LEDGER", { size: 10, color: cssA(main, a), alpha: 0.7 * a, align: "right", spacing: 2.2 });
      hud.T(W - 40, ly + 22, "TRANSFORMER 2017 · ATTENTION IS ALL YOU NEED · d = 512", {
        size: 11, color: l1 ? cssA(alt, a) : "#5b636c", alpha: (l1 ? 1 : 0.7) * a, align: "right",
        glow: l1 ? cssA(alt, 0.7) : null, blur: 10
      });
      hud.T(W - 40, ly + 42, "GPT-1 2018 · 117M PARAMETERS", {
        size: 11, color: l2b ? cssA(alt, a) : "#5b636c", alpha: (l2b ? 1 : 0.7) * a, align: "right",
        glow: l2b ? cssA(alt, 0.7) : null, blur: 10
      });

      /* --- the formula the whole segment is about ----------------------- */
      var fa = clamp((L - (T4 - 0.8)) / 1.4, 0, 1) * a;
      if (fa > 0.01) {
        hud.formula(W * 0.5, 884, "\\text{softmax}(QK^T/\\sqrt{d})V", {
          size: 30, color: cssA(main, 0.95), align: "center"
        });
        hud.line(W * 0.5 - 210, 862, W * 0.5 + 210, 862, { color: cssA(alt, 0.25 * fa) });
      }
      hud.T(64, 884, "SET OF POINTS", { size: 11, color: cssA(main, a), alpha: 0.5 * a, spacing: 3.0 });
      hud.T(64, 902, "DIMENSION · CIRCUMFERENCE · TANGENTS · LIMITATIONS", {
        size: 10, color: "#9aa3ad", alpha: 0.45 * a, spacing: 1.4
      });
    },

    draw3d: function (ctx) {
      var gfx = ctx.gfx, t = ctx.t, L = ctx.local, D = ctx.dur, bt = ctx.beat;
      var main = eraMain(t), alt = eraAlt(t);
      var cm = rgbOf(main), ca = rgbOf(alt);
      var PER = (ctx.data && ctx.data.period) || 0.461538;
      var T2 = D * 0.25, T3 = D * 0.50, T4 = D * 0.75, T5 = D * 0.855;
      var i;

      /* --- the four deformations, all from one coordinate --------------- */
      var projK = smoothstep(0.16, 0.66, L);                 // cloud -> its projection
      var slideK = smoothstep(T2 - 0.35, T2 + 0.75, L);      // even spacing along the line
      var curl = smoothstep(T2 + 0.55, T2 + 2.6, L);         // roll into a circle
      var unroll = smoothstep(T3 - 0.30, T3 + 1.55, L);      // unroll into a sine
      var hyp = smoothstep(T4 - 0.15, T4 + 1.7, L);          // open into a hyperbola
      var coda = smoothstep(T5, T5 + 1.35, L);               // gather into word space
      var hypE = hyp * (1 - coda);

      s3.pts.clear();
      s3.lines.clear();

      /* --- 512 points --------------------------------------------------- */
      for (i = 0; i < S3_N; i++) {
        var sN = (s3.a[i] / S3_L + 1) * 0.5;
        var ki = clamp(projK * 1.5 - sN * 0.55, 0, 1);
        ki = ki * ki * (3 - 2 * ki);
        var sl = clamp((slideK - sN * 0.25) / 0.75, 0, 1);
        sl = sl * sl * (3 - 2 * sl);
        var c = lerp(s3.qs[i], s3.a[i], sl);
        s3pos(c, curl, unroll, hypE, _q);
        var px = lerp(s3.p0[i * 3], _q[0], ki);
        var py = lerp(s3.p0[i * 3 + 1], _q[1], ki);
        var pz = lerp(s3.p0[i * 3 + 2], _q[2], ki);
        if (coda > 0.001) {
          var w = i % S3_WORDS.length;
          px = lerp(px, s3.W3[w * 3] + s3.jitx[i], coda);
          py = lerp(py, s3.W3[w * 3 + 1] + s3.jity[i], coda);
          pz = lerp(pz, s3.W3[w * 3 + 2] + s3.jity[i] * 0.6, coda);
        }
        var lit = 0.55 + 0.45 * bt.pulse;
        _col[0] = lerp(cm[0], ca[0], 0.25 + 0.55 * (1 - coda));
        _col[1] = lerp(cm[1], ca[1], 0.25 + 0.55 * (1 - coda));
        _col[2] = lerp(cm[2], ca[2], 0.25 + 0.55 * (1 - coda));
        s3.pts.add(px, py, pz, (1.55 + 1.5 * lit) * (1 - 0.25 * coda), _col,
          (0.42 + 0.40 * lit) * (1 - 0.25 * hyp));
      }

      /* --- stage 1: the line, its ticks, and the real projection rays --- */
      if (L < T2 + 1.2) {
        var la = (1 - smoothstep(T2 - 0.6, T2 + 1.0, L)) * clamp(L / 0.35, 0, 1);
        s3.lines.seg(-S3_L * 1.06, 0, 0, S3_L * 1.06, 0, 0, ca, 1.4, 0.65 * la);
        for (i = 0; i <= 16; i++) {
          var tk = -1 + i / 8;
          s3.lines.seg(tk * S3_L - 0.07, -0.04, 0, tk * S3_L + 0.07, 0.04, 0, cm, 1.0, 0.45 * la);
        }
        for (i = 0; i < S3_N; i += 13) {
          var rk = clamp(projK * 1.5 - (s3.a[i] / S3_L + 1) * 0.5 * 0.55, 0, 1);
          if (rk > 0.98) continue;
          s3.lines.seg(s3.p0[i * 3], s3.p0[i * 3 + 1], s3.p0[i * 3 + 2],
            lerp(s3.p0[i * 3], s3.qs[i], rk), lerp(s3.p0[i * 3 + 1], 0, rk), lerp(s3.p0[i * 3 + 2], 0, rk),
            cm, 1.0, (1 - rk) * 0.30 * la);
        }
      }

      /* --- stage 2: the circle, its radius, its circumference ----------- */
      if (curl > 0.02 && L < T4 + 1.0) {
        var cA = curl * (1 - smoothstep(T4, T4 + 0.9, L)) * 0.85;
        var steps = 72;
        for (i = 0; i < steps; i++) {
          s3pos(-S3_L + 2 * S3_L * i / steps, curl, unroll, hypE, _p);
          s3pos(-S3_L + 2 * S3_L * (i + 1) / steps, curl, unroll, hypE, _q);
          s3.lines.seg(_p[0], _p[1], _p[2], _q[0], _q[1], _q[2], cm, 1.2, 0.42 * cA);
        }
        if (curl > 0.94 && unroll < 0.7) {
          // only annotate once the circle has closed: the radius of curvature
          // is then the radius, and 2*pi*r is the number written on the ring
          var rho2 = S3_L / (PI * clamp(curl, 0.0008, 1));
          var circStr = (2 * PI * rho2).toFixed(5);
          s3.lines.seg(0, 0, 0, rho2, 0, 0, ca, 1.4, 0.6 * cA);
          for (i = 0; i <= 24; i++) {
            var ang = i / 24 * TAU;
            var l0 = i % 6 === 0 ? 1.15 : 1.08;
            s3.lines.seg(Math.cos(ang) * rho2 * 1.02, Math.sin(ang) * rho2 * 1.02, 0,
              Math.cos(ang) * rho2 * l0, Math.sin(ang) * rho2 * l0, 0, ca, 1.1, 0.42 * cA);
          }
          for (i = 0; i < circStr.length; i++) {
            var an2 = -PI * 0.5 + (i / (circStr.length - 1)) * TAU * 0.88;
            var sp = ctx.util.vp(Math.cos(an2) * rho2 * 1.34, Math.sin(an2) * rho2 * 1.34, 0);
            if (sp[2] > 0.5) {
              ctx.hud.T(sp[0], sp[1] + 5, circStr.charAt(i), {
                size: 15, color: cssA(alt, 0.9), alpha: 0.8 * cA, align: "center",
                glow: cssA(alt, 0.5), blur: 8
              });
            }
          }
          var sp2 = ctx.util.vp(0, -rho2 * 1.34, 0);
          if (sp2[2] > 0.5) {
            ctx.hud.T(sp2[0], sp2[1] + 16, "r = " + rho2.toFixed(4), {
              size: 12, color: cssA(main, 0.9), alpha: 0.8 * cA, align: "center", spacing: 1.4
            });
          }
        }
      }

      /* --- stage 3: the sine, and tangents that are really tangent ------ */
      if (unroll > 0.02 && hyp < 0.98) {
        var sA = unroll * (1 - hyp) * 0.9;
        var seg2 = 108;
        for (i = 0; i < seg2; i++) {
          s3pos(-S3_L + 2 * S3_L * i / seg2, curl, unroll, hypE, _p);
          s3pos(-S3_L + 2 * S3_L * (i + 1) / seg2, curl, unroll, hypE, _q);
          s3.lines.seg(_p[0], _p[1], _p[2], _q[0], _q[1], _q[2], ca, 1.5, 0.55 * sA);
        }
        s3.lines.seg(-S3_L * 1.10, 0, 0, S3_L * 1.10, 0, 0, cm, 1.0, 0.20 * sA);
        var latest = s3latest(L, T3, PER);
        for (i = 0; i < 7; i++) {
          var tapp = clamp((L - (T3 + (2 + i) * PER)) / 0.22, 0, 1);
          if (tapp <= 0) continue;
          var x0 = s3.tang[i * 3], y0 = s3.tang[i * 3 + 1], mm = s3.tang[i * 3 + 2];
          var ext = 1.45;
          s3.lines.seg(x0 - ext, y0 - ext * mm, 0, x0 + ext, y0 + ext * mm, 0, ca, 1.8, 0.85 * tapp * sA);
          s3.lines.seg(x0, y0, 0, x0, 0, 0, cm, 1.0, 0.30 * tapp * sA);
          _col[0] = ca[0]; _col[1] = ca[1]; _col[2] = ca[2];
          s3.pts.add(x0, y0, 0, 3.4 + 1.6 * bt.pulse, _col, 0.9 * tapp * sA);
          if (i === latest) {
            var lp = ctx.util.vp(x0, y0 + 0.48, 0);
            if (lp[2] > 0.5) {
              ctx.hud.T(lp[0], lp[1], "dy/dx = " + mm.toFixed(4), {
                size: 13, color: cssA(alt, 0.95), alpha: 0.9 * tapp * sA, align: "center",
                glow: cssA(alt, 0.6), blur: 10, spacing: 1.0
              });
            }
          }
        }
      }

      /* --- stage 4: the hyperbola, its asymptotes, and the limit -------- */
      if (hyp > 0.02) {
        var hA = hyp * (1 - coda);
        var seg4 = 96;
        for (i = 0; i < seg4; i++) {
          s3pos(-S3_L + 2 * S3_L * i / seg4, curl, unroll, hypE, _p);
          s3pos(-S3_L + 2 * S3_L * (i + 1) / seg4, curl, unroll, hypE, _q);
          s3.lines.seg(_p[0], _p[1], _p[2], _q[0], _q[1], _q[2], ca, 1.7, 0.75 * hA);
        }
        var xin = 1.28, xout = 7.6 * (0.55 + 0.45 * hA);
        s3.lines.seg(xin, xin * S3_ASYM, 0, xout, xout * S3_ASYM, 0, cm, 1.6, 0.60 * hA);
        s3.lines.seg(-xin, -xin * S3_ASYM, 0, -xout, -xout * S3_ASYM, 0, cm, 1.6, 0.60 * hA);
        s3.lines.seg(xin, -xin * S3_ASYM, 0, xout, -xout * S3_ASYM, 0, cm, 1.6, 0.35 * hA);
        s3.lines.seg(-xin, xin * S3_ASYM, 0, -xout, xout * S3_ASYM, 0, cm, 1.6, 0.35 * hA);
        s3.lines.seg(-0.10, S3_B, 0, 0.10, S3_B, 0, ca, 1.4, 0.7 * hA);
        s3.lines.seg(-0.10, -S3_B, 0, 0.10, -S3_B, 0, ca, 1.4, 0.7 * hA);
      }

      /* --- coda: the thin links of the embedding space ------------------ */
      if (coda > 0.01) {
        for (i = 0; i < s3.conn.length; i += 2) {
          var wa = s3.conn[i], wb = s3.conn[i + 1];
          s3.lines.seg(s3.W3[wa * 3], s3.W3[wa * 3 + 1], s3.W3[wa * 3 + 2],
            s3.W3[wb * 3], s3.W3[wb * 3 + 1], s3.W3[wb * 3 + 2], cm, 1.0, 0.30 * coda);
        }
        for (i = 0; i < S3_WORDS.length; i++) {
          _col[0] = ca[0]; _col[1] = ca[1]; _col[2] = ca[2];
          s3.pts.add(s3.W3[i * 3], s3.W3[i * 3 + 1], s3.W3[i * 3 + 2], 2.6, _col, 0.6 * coda);
        }
      }

      s3.lines.draw(gfx, { add: true, glow: 0.55, depthWrite: false });
      s3.pts.draw(gfx, { add: true, soft: 0.9, depthWrite: false });

      /* --- LIMITATIONS falls between the asymptotes --------------------- */
      if (hyp > 0.2) {
        var hA2 = hyp * (1 - coda);
        if (hA2 > 0.05) {
          ctx.hud.rect(ctx.W * 0.5 - 215, 522, 430, 46, { fill: "rgba(4,6,10," + (0.72 * hA2).toFixed(3) + ")" });
          ctx.hud.T(ctx.W * 0.5, 553, "LIMITATIONS", {
            size: 40, font: "mono", weight: 700, align: "center",
            color: cssA(alt, 1), alpha: 0.95 * hA2, spacing: 9, glow: cssA(main, 0.9), blur: 22
          });
          ctx.hud.T(ctx.W * 0.5, 576, "x \u2192 \u221E   ·   y = \u00B1" + S3_ASYM.toFixed(4) + "x", {
            size: 11, color: cssA(main, 0.9), alpha: 0.75 * hA2, align: "center", spacing: 2.0
          });
        }
      }

      /* --- word labels -------------------------------------------------- */
      if (coda > 0.01) {
        for (i = 0; i < S3_WORDS.length; i++) {
          var wp = ctx.util.vp(s3.W3[i * 3], s3.W3[i * 3 + 1] + 0.20, s3.W3[i * 3 + 2]);
          if (wp[2] < 0.4) continue;
          ctx.hud.T(wp[0], wp[1], S3_WORDS[i], {
            size: 12, color: cssA(alt, 0.95), alpha: 0.9 * coda, align: "center", spacing: 1.4,
            glow: cssA(main, 0.5), blur: 8
          });
        }
      }

      /* --- the stage word, floating over its own geometry --------------- */
      var wlab = null, wy = 0.70, wa2 = 0;
      if (L < T2) {
        wlab = "DIMENSION"; wy = 0.72;
        wa2 = (1 - smoothstep(T2 - 0.7, T2, L)) * clamp(L / 0.5, 0, 1);
      } else if (L < T3) {
        wlab = "CIRCUMFERENCE"; wy = S3_L / PI + 0.80;
        wa2 = clamp((L - T2) / 0.5, 0, 1) * (1 - smoothstep(T3 - 0.6, T3, L));
      } else if (L < T4) {
        wlab = "TANGENTS"; wy = -S3_L / PI - 0.70;
        wa2 = clamp((L - T3) / 0.5, 0, 1) * (1 - smoothstep(T4 - 0.7, T4, L));
      }
      if (wlab) {
        var sp3 = ctx.util.vp(0, wy, 0);
        if (sp3[2] > 0.4) {
          ctx.hud.T(sp3[0], sp3[1], wlab, {
            size: 26, font: "mono", weight: 700, align: "center", spacing: 7,
            color: cssA(alt, 1), alpha: 0.92 * wa2 * (1 - coda), glow: cssA(main, 0.85), blur: 18
          });
        }
      }
    }
  });

  /* ==========================================================================
     04 · A.D. TO B.C. — 44.594 – 59.363
     Forward on beats 1-2, backward on 3-4; six layers become six bands of
     history, and all of it is pressed into one descending loss curve.
     ======================================================================== */
  var S4_L = 6, S4_N = 24;
  var S4_YEARS = [
    "2026", "2020", "2019", "2017", "2012", "2006",
    "1991", "1972", "1971", "1958", "1947", "1945",
    "1936", "1900", "1776", "1200", "476", "0",
    "\u2212500", "\u22121000", "\u22123000"
  ];
  var S4_BAND = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11], [12, 13, 14], [15, 16, 17, 18, 19, 20]];
  var S4_CAM = [
    { t: 0.00, p: [0, -0.72, 11.4], q: [0, -0.72, 0] },
    { t: 1.40, p: [0, -0.72, 11.4], q: [0, -0.72, 0] },
    { t: 3.20, p: [0, -0.88, 14.2], q: [0, -0.88, 0] },
    { t: 7.40, p: [0, -0.88, 14.2], q: [0, -0.88, 0] },
    { t: 11.00, p: [0, -0.78, 13.2], q: [0, -0.78, 0] },
    { t: 14.77, p: [0, -0.70, 12.6], q: [0, -0.70, 0] }
  ];

  var s4 = {
    pts: null, lines: null, nx: null, ny: null, grad: null, edges: null,
    loss: null, fm: [0, 0, 0]
  };

  // the storyboard's real loss function, with the endpoints rounded to the readout
  function s4loss(p) { return 1.021 + 3.976 * Math.pow(1 - clamp(p, 0, 1), 1.6); }
  function s4Y(v, gy0, gh) { return gy0 + gh * (1 - (v - 1.0) / 4.1); }

  WEM.defineSection({
    id: "04",
    name: "A.D. TO B.C.",

    init: function (ctx) {
      var i, l;
      s4.nx = new Float32Array(S4_L * S4_N);
      s4.ny = new Float32Array(S4_L * S4_N);
      for (l = 0; l < S4_L; l++) for (i = 0; i < S4_N; i++) {
        s4.nx[l * S4_N + i] = (l - (S4_L - 1) * 0.5) * 1.15;
        s4.ny[l * S4_N + i] = (i - (S4_N - 1) * 0.5) * 0.115;
      }
      var e = [];
      for (l = 0; l < S4_L - 1; l++) for (i = 0; i < S4_N; i++) {
        e.push(l * S4_N + i, (l + 1) * S4_N + i);
        e.push(l * S4_N + i, (l + 1) * S4_N + ((i + 7) % S4_N));
        e.push(l * S4_N + i, (l + 1) * S4_N + ((i + 17) % S4_N));
      }
      s4.edges = new Int32Array(e);
      // fixed per-weight sensitivities; the mean of the arrows is the real readout
      s4.grad = new Float32Array(S4_N * S4_L);
      var acc = 0;
      for (i = 0; i < S4_N * S4_L; i++) { s4.grad[i] = 0.30 + 1.45 * ctx.rnd(); acc += s4.grad[i]; }
      var mean = acc / (S4_N * S4_L);
      for (i = 0; i < S4_N * S4_L; i++) s4.grad[i] /= mean;
      // 241 samples of the real curve
      s4.loss = new Float32Array(241 * 2);
      for (i = 0; i <= 240; i++) {
        s4.loss[i * 2] = i / 240;
        s4.loss[i * 2 + 1] = s4loss(i / 240);
      }
      s4.pts = new WEM.Viz.Points(400);
      s4.lines = new WEM.Viz.Lines(1400);
    },

    enter: function () {},

    draw2d: function (ctx) {
      var hud = ctx.hud, W = ctx.W, t = ctx.t, L = ctx.local, D = ctx.dur;
      var bt = ctx.beat;
      var main = eraMain(t), alt = eraAlt(t);
      var a = ctx.in * (0.4 + 0.6 * ctx.out);
      var cm = rgbOf(main), ca = rgbOf(alt);
      var i;

      camTrack(S4_CAM, L, ctx.cam);
      ctx.fx.mood([cm[0] * 0.55, cm[1] * 0.85, cm[2]], [0.35, 0.5, 1.0], 0.14);

      /* --- the current direction: this IS "AC to DC" -------------------- */
      var bip = bt.beatInBar, ph = bt.phase;
      var fwd = bip < 2;

      var Tl = 7.406;                                     // 52 s
      var pCont = clamp((L - Tl) / (D - Tl - 0.25), 0, 1);
      var stepN = Math.floor(pCont * 16);
      var p = clamp(lerp(stepN / 16, pCont, 0.30), 0, 1);
      var loss = s4loss(p);
      var inst = loss + (ctx.bands[3] - 0.5) * 0.055;
      var gW = -0.000421 * Math.pow(1 - p, 0.6);

      hud.T(W * 0.5, 84, fwd ? "CURRENT  \u25B8\u25B8\u25B8  FORWARD PASS" : "CURRENT  \u25C2\u25C2\u25C2  BACKWARD PASS", {
        size: 15, color: cssA(fwd ? main : alt, a), alpha: 0.9 * a, align: "center", spacing: 4.0,
        glow: cssA(fwd ? main : alt, 0.7), blur: 12
      });
      hud.line(W * 0.5 - 300, 96, W * 0.5 + 300, 96, { color: cssA(main, 0.22 * a) });
      hud.T(W * 0.5, 116, "AC \u2192 DC · DIRECTION FLIPS ON EVERY BAR", {
        size: 10, color: "#9aa3ad", alpha: 0.55 * a, align: "center", spacing: 2.4
      });

      /* --- model ledger: this segment registers GPT-2 and GPT-3 --------- */
      var l1 = p >= 0.34, l2 = p >= 0.72;
      hud.T(W - 40, 74, "MODEL LEDGER", { size: 10, color: cssA(main, a), alpha: 0.7 * a, align: "right", spacing: 2.2 });
      hud.T(W - 40, 96, "GPT-2 2019 · 1.5B PARAMETERS", {
        size: 11, color: l1 ? cssA(alt, a) : "#5b636c", alpha: (l1 ? 1 : 0.65) * a, align: "right",
        glow: l1 ? cssA(alt, 0.7) : null, blur: 10
      });
      hud.T(W - 40, 116, "GPT-3 2020 · 175B PARAMETERS", {
        size: 11, color: l2 ? cssA(alt, a) : "#5b636c", alpha: (l2 ? 1 : 0.65) * a, align: "right",
        glow: l2 ? cssA(alt, 0.7) : null, blur: 10
      });

      /* --- GRADIENT STEP lands on the last half of every bar ------------ */
      var gs = (bip === 3 && ph > 0.5) ? clamp((ph - 0.5) / 0.18, 0, 1) : 0;
      if (gs > 0.01) {
        hud.T(W * 0.5, 300, "GRADIENT STEP", {
          size: 42, font: "mono", weight: 700, align: "center", spacing: 10,
          color: cssA(alt, 1), alpha: 0.9 * gs * a, glow: cssA(alt, 1), blur: 26
        });
        hud.line(W * 0.5 - 460, 316, W * 0.5 + 460, 316, { color: cssA(alt, 0.55 * gs * a) });
        hud.T(W * 0.5, 262, "w \u2190 w \u2212 \u03B7 \u2207L", {
          size: 15, color: cssA(main, 0.9), alpha: 0.8 * gs * a, align: "center", spacing: 2.0
        });
      }

      /* --- left: the loss curve, sampled from the real function --------- */
      var lx = 64, ly = 620, lw = 400, lh = 280;
      field(hud, lx, ly, lw, lh, "LOSS", main, a, "L = 1.02 + 3.97(1\u2212p)^1.6");
      var gx0 = lx + 34, gy0 = ly + 40, gw = lw - 54, gh = lh - 78;
      for (i = 1; i <= 5; i++) {
        hud.line(gx0, s4Y(i, gy0, gh), gx0 + gw, s4Y(i, gy0, gh), { color: greyA(0.09 * a) });
        hud.T(gx0 - 6, s4Y(i, gy0, gh) + 3, String(i), { size: 9, color: "#5b636c", alpha: 0.8 * a, align: "right" });
      }
      for (i = 0; i < 240; i += 6) {
        var pv = s4.loss[i * 2], vv = s4.loss[i * 2 + 1];
        var pv2 = s4.loss[(i + 6) * 2], vv2 = s4.loss[(i + 6) * 2 + 1];
        var on = pv <= p;
        hud.line(gx0 + gw * pv, s4Y(vv, gy0, gh), gx0 + gw * pv2, s4Y(vv2, gy0, gh),
          { color: on ? cssA(main, 0.95 * a) : greyA(0.14 * a), lw: on ? 2 : 1 });
      }
      var hx = gx0 + gw * p, hy = s4Y(loss, gy0, gh);
      hud.rect(hx - 3, hy - 3, 6, 6, { fill: cssA(alt, 0.95 * a) });
      hud.line(hx, hy, hx, gy0 + gh, { color: cssA(alt, 0.30 * a), dash: [3, 3] });
      hud.T(lx + 12, ly + lh - 24, "LOSS  " + loss.toFixed(3) + " \u2192 1.021", {
        size: 13, color: cssA(alt, a), alpha: a, glow: cssA(alt, 0.5), blur: 8
      });
      hud.T(lx + lw - 12, ly + lh - 24, "STEP " + (stepN < 10 ? "0" : "") + stepN + " / 16", {
        size: 12, color: "#c3cad2", alpha: 0.8 * a, align: "right"
      });

      /* --- middle: the gradient and the arrows it produces -------------- */
      var mx = 560, my = 640, mw = 620, mh = 240;
      field(hud, mx, my, mw, mh, "GRADIENT", main, a, fwd ? "FORWARD" : "BACKWARD");
      hud.T(mx + 16, my + 52, "\u2202L/\u2202W", { size: 13, color: "#9aa3ad", alpha: 0.85 * a, spacing: 1.4 });
      hud.T(mx + 150, my + 52, gW.toFixed(6), {
        size: 17, color: cssA(alt, a), alpha: a, glow: cssA(alt, 0.55), blur: 10
      });
      hud.T(mx + mw - 16, my + 52, "INST " + inst.toFixed(3), {
        size: 12, color: cssA(main, a), alpha: 0.8 * a, align: "right"
      });
      var aw = mw - 40, ay0 = my + 78, acw = aw / S4_N;
      for (i = 0; i < S4_N; i++) {
        var ln2 = 6 + 52 * clamp(Math.abs(gW * s4.grad[i]) / 0.000421 * 0.62, 0, 1.5);
        var axp = mx + 20 + (i + 0.5) * acw;
        hud.line(axp, ay0, axp, ay0 + ln2, { color: cssA(main, 0.75 * a), lw: 1 });
        hud.line(axp - 3, ay0 + ln2, axp, ay0 + ln2 + 5, { color: cssA(main, 0.75 * a) });
        hud.line(axp + 3, ay0 + ln2, axp, ay0 + ln2 + 5, { color: cssA(main, 0.75 * a) });
      }
      hud.line(mx + 20, ay0 - 6, mx + 20 + aw, ay0 - 6, { color: cssA(alt, 0.30 * a) });
      if (ctx.lyric) {
        hud.T(mx + 16, my + mh - 14, String(ctx.lyric.text).toUpperCase(), {
          size: 13, color: cssA(alt, 0.95), alpha: 0.7 * a, spacing: 1.6
        });
      }
      hud.T(mx + mw - 16, my + mh - 14, "BAR " + clamp(bt.bar - 23, 1, 8) + " / 8", {
        size: 11, color: "#9aa3ad", alpha: 0.7 * a, align: "right"
      });

      /* --- right: the corpus, and history pouring into the curve -------- */
      var cx2 = W - 40 - 456, cy2 = 620, cw = 456, ch = 280;
      field(hud, cx2, cy2, cw, ch, "CORPUS", main, a, "A.D. \u25B8 B.C.");
      hud.T(cx2 + 16, cy2 + 52, "300 BILLION TOKENS", {
        size: 17, color: cssA(alt, a), alpha: a, glow: cssA(alt, 0.5), blur: 10
      });
      hud.T(cx2 + 16, cy2 + 74, "CONTEXT 2,048 TOKENS · A.D. 2026 \u25B8 B.C. \u22123000", {
        size: 11, color: "#c3cad2", alpha: 0.7 * a, spacing: 1.0
      });
      var scroll = (L * 26) % 26;
      for (i = 0; i < 6; i++) {
        var yi = cy2 + 100 + i * 26 - scroll;
        var idx = (Math.floor(L * 1.9) + i) % S4_YEARS.length;
        hud.T(cx2 + 16, yi + 26, "  " + S4_YEARS[idx], {
          size: 13, color: idx < 3 ? cssA(alt, a) : (i % 2 ? "#c3cad2" : "#9aa3ad"),
          alpha: (0.35 + 0.5 * ((i + 1) / 6)) * a, spacing: 1.6
        });
        hud.line(cx2 + 10, yi + 30, cx2 + cw - 16, yi + 30, { color: greyA(0.07 * a) });
      }

      footnote(hud, W - 40, 596, "2006 CUDA · 2012 ALEXNET · 2019 GPT-2 · 2020 GPT-3", a);
      hud.T(64, 596, "PRETRAINING · 6 LAYERS \u00D7 24 UNITS", { size: 10, color: "#9aa3ad", alpha: 0.45 * a, spacing: 1.4 });

      /* --- the inflow: the bands are pressed into the curve ------------- */
      var fk = smoothstep(5.4, 7.6, L);
      if (fk > 0.02) {
        hud.line(74, 604, gx0 + 4, s4Y(s4loss(0), gy0, gh), { color: cssA(alt, 0.55 * fk * a), lw: 2 });
      }
    },

    draw3d: function (ctx) {
      var gfx = ctx.gfx, t = ctx.t, L = ctx.local, bt = ctx.beat;
      var main = eraMain(t), alt = eraAlt(t);
      var cm = rgbOf(main), ca = rgbOf(alt);
      var bip = bt.beatInBar, ph = bt.phase;
      var s01 = bip < 2 ? (bip + ph) / 2 : 1 - ((bip - 2) + ph) / 2;
      var front = s01 * (S4_L - 1);

      var Tb = 1.406, Tl = 7.406;
      var bandK = smoothstep(Tb, Tb + 1.7, L);            // layers -> time bands
      var funK = smoothstep(5.4, 7.5, L);                 // bands -> the curve
      var sc = 1 - 0.90 * funK;

      worldAt(ctx.cam, 74, 604, -1.0, s4.fm);
      var FM = s4.fm;

      s4.pts.clear();
      s4.lines.clear();

      var l, i, id;

      /* --- nodes: one activation wave, reversing once per bar ----------- */
      for (l = 0; l < S4_L; l++) {
        for (i = 0; i < S4_N; i++) {
          id = l * S4_N + i;
          var x = lerp(s4.nx[id], (i - (S4_N - 1) * 0.5) * 0.62, bandK);
          var y = lerp(s4.ny[id], (l - (S4_L - 1) * 0.5) * 0.62, bandK);
          if (funK > 0.001) { x = FM[0] + (x - FM[0]) * sc; y = FM[1] + (y - FM[1]) * sc; }
          var order = (bip < 2) ? l : (S4_L - 1 - l);
          var act = clamp(Math.exp(-Math.pow((order - front) / 1.15, 2)) * (0.55 + 0.65 * ctx.rms), 0, 1);
          var hot = 0.10 + 0.28 * (1 - bandK) + act;
          _col[0] = lerp(cm[0] * 0.5, 1.0, act * 0.80);
          _col[1] = lerp(cm[1] * 0.5, 1.0, act * 0.75);
          _col[2] = lerp(cm[2] * 0.6, 1.0, act * 0.70);
          s4.pts.add(x, y, 0, 1.5 + 5.0 * hot, _col, clamp(0.20 + 0.85 * hot, 0, 1) * (1 - 0.7 * funK));
          if (bandK > 0.05 && i % 4 === 0) {
            s4.lines.seg(x, y - 0.055, 0, x, y + 0.055, 0, cm, 1.0, 0.26 * bandK * (1 - funK));
          }
        }
      }

      /* --- wiring -------------------------------------------------------- */
      var wiring = (1 - bandK) * (1 - funK);
      for (i = 0; i < s4.edges.length; i += 2) {
        var a0 = s4.edges[i], b0 = s4.edges[i + 1];
        var la = (a0 / S4_N) | 0, lb = (b0 / S4_N) | 0;
        var oa = (bip < 2) ? la : (S4_L - 1 - la);
        var ob = (bip < 2) ? lb : (S4_L - 1 - lb);
        var fl = clamp(1 - Math.abs((oa + ob) * 0.5 - front) / 1.25, 0, 1);
        if (wiring < 0.02 && fl < 0.05) continue;
        var ax = lerp(s4.nx[a0], (a0 % S4_N - (S4_N - 1) * 0.5) * 0.62, bandK);
        var ay = lerp(s4.ny[a0], (la - (S4_L - 1) * 0.5) * 0.62, bandK);
        var bx = lerp(s4.nx[b0], (b0 % S4_N - (S4_N - 1) * 0.5) * 0.62, bandK);
        var by = lerp(s4.ny[b0], (lb - (S4_L - 1) * 0.5) * 0.62, bandK);
        if (funK > 0.001) {
          ax = FM[0] + (ax - FM[0]) * sc; ay = FM[1] + (ay - FM[1]) * sc;
          bx = FM[0] + (bx - FM[0]) * sc; by = FM[1] + (by - FM[1]) * sc;
        }
        var al = (0.06 + 0.42 * fl) * wiring * (0.6 + 0.4 * bt.pulse);
        if (al < 0.012) continue;
        s4.lines.seg(ax, ay, 0, bx, by, 0, fl > 0.4 ? ca : cm, fl > 0.4 ? 1.5 : 1.0, al);
      }

      /* --- the curve head grows out of the funnel mouth ----------------- */
      var pC = clamp((L - (Tl - 0.8)) / 1.6, 0, 1);
      if (pC > 0.01) {
        s4.lines.seg(FM[0] - 0.34, FM[1] + 0.16, FM[2], FM[0] + 0.10, FM[1] - 0.08, FM[2], ca, 2.2, 0.85 * pC);
      }

      s4.lines.draw(gfx, { add: true, glow: 0.55, depthWrite: false });
      s4.pts.draw(gfx, { add: true, soft: 0.85, depthWrite: false });

      /* --- year text rolling along the bands ---------------------------- */
      var vis = bandK * (1 - smoothstep(0.45, 0.95, funK));
      if (vis > 0.02) {
        for (l = 0; l < S4_L; l++) {
          var yrs = S4_BAND[l];
          var spd = 1.15 + 0.55 * l;
          for (i = 0; i < yrs.length; i++) {
            var spanX = 16.5;
            var xx = 8.6 - (((L * spd + i * 5.2 + l * 1.7) % spanX) + spanX) % spanX;
            var yy = (l - (S4_L - 1) * 0.5) * 0.62;
            if (funK > 0.001) { xx = FM[0] + (xx - FM[0]) * sc; yy = FM[1] + (yy - FM[1]) * sc; }
            if (xx < -8.4 || xx > 8.4) continue;
            var sp4 = ctx.util.vp(xx, yy, 0);
            if (sp4[2] < 0.5) continue;
            ctx.hud.T(sp4[0], sp4[1] + 4, S4_YEARS[yrs[i]], {
              size: 13, color: cssA(l < 3 ? alt : main, 0.9),
              alpha: 0.55 * vis * (0.45 + 0.55 * ctx.rms), align: "center", spacing: 1.2
            });
          }
        }
      }

      /* --- layer headers while the stack is still a network ------------- */
      if (bandK < 0.6) {
        for (l = 0; l < S4_L; l++) {
          var hp = ctx.util.vp(s4.nx[l * S4_N] - 0.72, s4.ny[l * S4_N + 12], 0);
          if (hp[2] < 0.5) continue;
          var o = (bip < 2) ? l : (S4_L - 1 - l);
          var fl2 = clamp(1 - Math.abs(o - front) / 1.15, 0, 1);
          ctx.hud.T(hp[0], hp[1], "L" + l, {
            size: 11, color: cssA(fl2 > 0.5 ? alt : main, 0.9),
            alpha: (0.35 + 0.6 * fl2) * clamp(1 - bandK * 1.6, 0, 1), align: "right", spacing: 1.4
          });
        }
      }
    }
  });
})();
