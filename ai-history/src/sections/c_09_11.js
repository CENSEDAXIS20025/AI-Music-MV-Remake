/* sections 09-11 — it makes itself smaller, gets attacked, and the data centre roars
   ==============================================================================
   09 FRAGMENTS          118.4398 - 133.2091   prune -> quantise -> on the chip
   10 ILLEGAL ARGUMENTS  133.2091 - 147.5168   a guard classifier is talked apart
   11 EXECUTION          147.5170 - 162.2861   aisle, twelve ignitions, six cuts

   Everything drawn here is a pure function of ctx.t / ctx.local / ctx.beat /
   ctx.bands / ctx.rms / ctx.flux / ctx.lyric.  The only remembered state is a
   handful of edge-trigger flags, all reset in enter().
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, Ch = WEM.Chron;
  var clamp = C.clamp, lerp = C.lerp, Ease = C.Ease, M4 = C.M4, G = C.geo;
  var TAU = Math.PI * 2;

  /* ------------------------------------------------------------------ shared */
  var _M = new Float32Array(16);        // scratch model matrix for flat quads
  var _C3 = [0, 0, 0];                  // scratch colour handed to Viz batches
  var RECT1 = [0, 0, 1, 1];             // untextured quad uv rect
  // gl_PointSize = size * uScale * 8 / depth, so a sprite that should cover a
  // world size s needs size ~= 140 * s at the camera distances used here.
  var PSZ = 140;

  function upper(s) { return String(s === null || s === undefined ? "" : s).toUpperCase(); }
  function zpad(n, w) { var s = String(n); while (s.length < w) s = "0" + s; return s; }
  function commas(n) {
    var s = String(Math.round(n)), out = "", c = 0;
    for (var i = s.length - 1; i >= 0; i--) { out = s.charAt(i) + out; if (++c % 3 === 0 && i > 0) out = "," + out; }
    return out;
  }
  // an untextured quad: centre c, full edge vectors u (width) and v (height).
  // gfx.quads reads columns 0 and 1 as the quad's local x/y axes and m[12..14]
  // as its position, so a box face is just a basis plus a centre.
  function faceMat(cx, cy, cz, ux, uy, uz, vx, vy, vz) {
    var m = _M;
    m[0] = ux; m[1] = uy; m[2] = uz; m[3] = 0;
    m[4] = vx; m[5] = vy; m[6] = vz; m[7] = 0;
    m[8] = 0; m[9] = 0; m[10] = 0; m[11] = 0;
    m[12] = cx; m[13] = cy; m[14] = cz; m[15] = 1;
    return m;
  }
  // every lrc line equal to `text` inside [t0,t1] -- the timing is the audio's
  function lrcTimes(ctx, t0, t1, text) {
    var out = [], lrc = ctx.data && ctx.data.lrc;
    if (!lrc) return out;
    var want = upper(text).trim();
    for (var i = 0; i < lrc.length; i++) {
      if (lrc[i].t >= t0 && lrc[i].t <= t1 && upper(lrc[i].text).trim() === want) out.push(lrc[i].t);
    }
    return out;
  }

  /* ==========================================================================
     09 · FRAGMENTS — it makes itself smaller so it can stay
     ======================================================================== */
  var S09 = 118.4398, PERIOD = 0.461538;
  var VN = 4096;                                  // 16 x 16 x 16 weights
  var PRUNE_BEATS = 12;                           // pruning takes 12 beats
  var T_QUANT = 5.5377;                           // local s where pruning ends
  var QSTEPS = [
    { name: "bf16", bits: 9, sub: "8-BIT SIGNIFICAND" },
    { name: "fp8", bits: 5, sub: "E4M3" },
    { name: "int4", bits: 4, sub: "SYMMETRIC" }
  ];
  var LY09 = ["If I can", "If I can erase all the pointless", "FRAGMENTS",
              "Then maybe", "Then maybe you won't leave me so", "DISHEARTENED"];
  var LY09T = [118.333, 118.979, 120.860, 121.728, 122.714, 124.890];

  WEM.defineSection({
    id: "09",
    name: "FRAGMENTS",
    init: function (ctx) {
      var st = this.st = {};
      var i, j, k, n, idx, s;

      /* ---- a real 16x16x16 tensor: a smooth spine plus grain, signed ---- */
      var w = new Float32Array(VN);
      var mx = 1e-9;
      for (i = 0; i < 16; i++) for (j = 0; j < 16; j++) for (k = 0; k < 16; k++) {
        var x = i - 7.5, y = j - 7.5, z = k - 7.5;
        var spx = Math.sin(y * 0.30) * 3.6, spz = Math.cos(y * 0.22) * 2.4;
        var dx = x - spx, dz = z - spz;
        var core = Math.exp(-(dx * dx + dz * dz) / 12.0);
        var grain = C.fbm2(i * 0.31 + k * 0.07, j * 0.31 + 1.7, 4);
        var fine = C.h3(i * 1.31 + 0.5, j * 2.17, k * 3.07);
        var env = 1 - 0.30 * ((x * x + y * y + z * z) / 190);
        var mag = 0.62 * core + 0.66 * grain * env + 0.24 * fine - 0.12;
        if (mag < 0) mag = 0;
        if (mag > mx) mx = mag;
        w[(i * 16 + j) * 16 + k] = mag;
      }
      for (idx = 0; idx < VN; idx++) {
        var sg = C.h3(idx * 0.37 + 0.11, idx * 0.73, 2.9) > 0.5 ? 1 : -1;
        w[idx] = (w[idx] / mx) * sg;
      }
      st.w = w;

      var sum = 0, sq = 0, amax = 0;
      for (idx = 0; idx < VN; idx++) {
        var av = Math.abs(w[idx]);
        sum += av; sq += av * av; if (av > amax) amax = av;
      }
      st.mean = sum / VN;
      st.sigma = Math.sqrt(Math.max(0, sq / VN - st.mean * st.mean));
      st.max = amax;

      /* ---- ascending |w|: the pruning order is a real sort ---- */
      var order = new Array(VN);
      for (n = 0; n < VN; n++) order[n] = n;
      order.sort(function (a, b) { return Math.abs(w[a]) - Math.abs(w[b]); });
      st.order = order;
      st.pmax = Math.round(0.638 * VN);                     // 2,613 of 4,096
      st.thr = Math.abs(w[order[st.pmax - 1]]);

      /* ---- what survives, and what it costs to store it in fewer bits ---- */
      var keep = VN - st.pmax;
      var surv = new Float32Array(keep);
      for (n = 0; n < keep; n++) surv[n] = w[order[st.pmax + n]];
      st.mag0 = new Float32Array(VN);
      for (idx = 0; idx < VN; idx++) st.mag0[idx] = Math.abs(w[idx]);
      st.q = [];
      for (n = 0; n < QSTEPS.length; n++) {
        var res = WEM.Model.quantise(surv, QSTEPS[n].bits);
        var magq = new Float32Array(VN);
        for (s = 0; s < keep; s++) magq[order[st.pmax + s]] = Math.abs(res.w[s]);
        st.q.push({ name: QSTEPS[n].name, bits: QSTEPS[n].bits, sub: QSTEPS[n].sub, res: res, mag: magq });
      }

      /* ---- where the erased fragments land: a ring of dust on the floor ---- */
      st.ash = new Float32Array(VN * 3);
      for (idx = 0; idx < VN; idx++) {
        var h1 = C.h3(idx * 0.13 + 3.1, idx * 0.29, 7.7);
        var h2 = C.h3(idx * 0.41, idx * 0.17 + 5.5, 1.3);
        var ang = h1 * TAU, rad = 1.28 + 1.62 * Math.sqrt(h2);
        st.ash[idx * 3] = Math.cos(ang) * rad;
        st.ash[idx * 3 + 1] = -2.14 + 0.34 * Math.pow(1 - (rad - 1.28) / 1.62, 0.85) * (0.40 + 0.60 * h1);
        st.ash[idx * 3 + 2] = Math.sin(ang) * rad;
      }

      /* ---- the chip it has to fit on ---- */
      st.chipMesh = G.box(2.70, 0.16, 1.90);
      st.dieMesh = G.box(0.95, 0.08, 0.95);
      st.padMesh = G.box(0.15, 0.03, 0.15);
      st.pads = [];
      for (n = 0; n < 8; n++) {
        var pa = n / 8 * TAU + 0.39;
        st.pads.push([Math.cos(pa) * 0.78, -1.985, Math.sin(pa) * 0.78]);
      }

      /* ---- floating dust, batches, scratch ---- */
      var rnd = C.rng(0x9AD1F0);
      st.dust = new Float32Array(240 * 4);
      for (n = 0; n < 240; n++) {
        st.dust[n * 4] = (rnd() * 2 - 1) * 2.6;
        st.dust[n * 4 + 1] = (rnd() * 2 - 1) * 2.1 + 0.1;
        st.dust[n * 4 + 2] = (rnd() * 2 - 1) * 2.2;
        st.dust[n * 4 + 3] = rnd();
      }
      st.pts = new WEM.Viz.Points(8000);
      st.ln = new WEM.Viz.Lines(420);
      st.mA = new Float32Array(16);
      st.mB = new Float32Array(16);
      st.cp = new Float32Array(24);                 // eight rotated box corners

      /* ---- the narration follows the real lrc ---- */
      st.ly = [];
      for (n = 0; n < LY09.length; n++) {
        var hit = lrcTimes(ctx, 117.0, 126.0, LY09[n]);
        st.ly.push({ t: hit.length ? hit[0] : LY09T[n], s: LY09[n] });
      }

      /* ---- pure helpers: how much is pruned, and when a voxel fell ---- */
      st.pruneAt = function (t) {
        var nf = (t - S09) / PERIOD;
        if (nf <= 0) return 0;
        var b = Math.floor(nf), f = nf - b;
        if (b >= PRUNE_BEATS) return st.pmax;
        var u = b + Ease.outQuad(f);
        return clamp(Math.floor(st.pmax * u / PRUNE_BEATS), 0, st.pmax);
      };
      st.fell = function (q) {                      // exact prune time of rank q
        var u = (q + 1) * PRUNE_BEATS / st.pmax;
        var b = Math.floor(u), f = 1 - Math.sqrt(Math.max(0, 1 - (u - b)));
        if (b > PRUNE_BEATS - 1) b = PRUNE_BEATS - 1;
        return S09 + b * PERIOD + PERIOD * f;
      };
    },

    enter: function () { /* nothing is remembered; every value comes from ctx.t */ },

    draw2d: function (ctx) {
      var st = this.st, t = ctx.t, hud = ctx.hud, W = ctx.W;
      var local = ctx.local, inn = ctx.in * ctx.out;
      var main = Ch.css(t), alt = Ch.css2(t);
      var gcss = Ch.hexA(main, 0.92), acss = Ch.hexA(alt, 0.9);
      var i, spars, pc, qx, q, row, act, pw, land, shown, first, y0, dy, age, full, chars, cur, caret, sayA, rise, uw;
      var maeMax;

      /* ---------------- camera: an inspecting orbit, then down to the chip -- */
      var cam = ctx.cam;
      var pQ = C.smoothstep(4.4, 6.2, local);          // orbit -> closer, higher
      var pL = C.smoothstep(10.4, 12.6, local);        // -> down onto the chip
      var ang = -0.52 + 1.05 * C.smoothstep(0.1, 5.2, local) + 0.30 * pL;
      var rad = lerp(lerp(5.35, 4.60, pQ), 5.00, pL);
      cam.mode = "persp"; cam.near = 0.05; cam.far = 400;
      cam.up[0] = 0; cam.up[1] = 1; cam.up[2] = 0;
      cam.roll = -0.012 * ctx.beat.pulse * (1 - pL);
      cam.fov = lerp(0.90, 0.78, pL);
      cam.pos[0] = Math.sin(ang) * rad;
      cam.pos[1] = lerp(0.42 + 0.62 * pQ, 0.52, pL) + 0.10 * ctx.beat.pulse * (1 - pL);
      cam.pos[2] = Math.cos(ang) * rad;
      cam.target[0] = 0;
      cam.target[1] = lerp(0.24 - 0.30 * pQ, -1.32, pL);
      cam.target[2] = 0;
      cam.update();

      /* ------------------------------------------------ top strip + sparsity */
      pc = st.pruneAt(t);
      spars = pc / VN;
      hud.T(W * 0.5, 86, "PRUNE " + (spars * 100).toFixed(1) + "%  ·  DISTILL  ·  QUANTIZE", {
        size: 16, color: gcss, align: "center", spacing: 3.0, alpha: inn
      });
      hud.rect(W * 0.5 - 300, 96, 600, 4, { fill: "rgba(238,242,246,0.10)", alpha: inn });
      hud.rect(W * 0.5 - 300, 96, 600 * spars, 4, { fill: Ch.hexA(main, 0.85), alpha: inn });
      // the live vocal input, quiet: the next line is already on its way in
      if (ctx.lyric) {
        hud.T(W * 0.5, 118, "VOCAL ▸ " + upper(ctx.lyric.text), {
          size: 9.5, color: ctx.col.faint, align: "center", alpha: 0.36 * inn, spacing: 1.4
        });
      }

      /* --------------------------------------------------------- prune panel */
      Ch.panel(ctx, 64, 104, 520, 168, "SPARSITY · PRUNE LOG", { alpha: inn * 0.95, right: "L1" });
      Ch.gauge(ctx, 84, 152, 480, "KEPT", commas(VN - pc) + " / " + commas(VN), "VOXELS",
               (VN - pc) / VN, { ticks: 4, alpha: inn, dp: 0, size: 15 });
      Ch.gauge(ctx, 84, 184, 480, "SPARSITY", spars * 100, "%", spars, { ticks: 4, alpha: inn, dp: 2, size: 15 });
      hud.T(84, 220, "THRESHOLD   |w| < " + st.thr.toFixed(5), {
        size: 11.5, color: Ch.hexA(main, 0.85), alpha: inn
      });
      hud.T(84, 242, "WEIGHTS  σ " + st.sigma.toFixed(4) + "   μ " + st.mean.toFixed(4) +
                     "   MAX " + st.max.toFixed(5), { size: 11.5, color: ctx.col.dim, alpha: 0.85 * inn });
      hud.T(84, 262, "SPINE KEPT · LOW-MAGNITUDE FRAGMENTS ERASED", {
        size: 10, color: ctx.col.faint, alpha: 0.7 * inn, spacing: 1.1
      });

      /* -------------------------------------------------- quantisation panel */
      Ch.panel(ctx, W - 450, 104, 386, 250, "QUANTIZATION · MAE", { alpha: inn * 0.95, right: "REAL" });
      qx = W - 450;
      var qActive = local < T_QUANT ? -1 : (local < 7.0877 ? 0 : (local < 8.6377 ? 1 : 2));
      maeMax = Math.max(1e-6, st.q[0].res.mae, st.q[1].res.mae, st.q[2].res.mae);
      hud.T(qx + 20, 152, "FP32", { size: 13, color: qActive < 0 ? gcss : ctx.col.dim, alpha: inn });
      hud.T(qx + 366, 152, "0.00000", { size: 13, color: qActive < 0 ? gcss : ctx.col.dim, align: "right", alpha: inn });
      hud.T(qx + 366, 168, "REFERENCE", { size: 9, color: ctx.col.faint, align: "right", alpha: 0.7 * inn });
      for (i = 0; i < 3; i++) {
        q = st.q[i]; row = 190 + i * 54;
        act = (qActive === i);
        pw = clamp(Math.log(1 + q.res.mae / maeMax * 999) / Math.log(1000), 0, 1);
        hud.T(qx + 20, row, upper(q.name), {
          size: 14, color: act ? gcss : ctx.col.dim, alpha: inn, weight: act ? 600 : undefined
        });
        hud.T(qx + 150, row, q.sub, { size: 9, color: ctx.col.faint, alpha: 0.75 * inn, spacing: 1.0 });
        hud.T(qx + 366, row, q.res.mae.toFixed(5), {
          size: 14, color: act ? acss : ctx.col.dim, align: "right", alpha: inn
        });
        hud.rect(qx + 20, row + 7, 346, 3, { fill: "rgba(238,242,246,0.10)", alpha: inn });
        hud.rect(qx + 20, row + 7, 346 * pw, 3, { fill: act ? Ch.hexA(main, 0.95) : Ch.hexA(main, 0.40), alpha: inn });
        hud.T(qx + 20, row + 26, "q = " + q.res.levels + " LEVELS   SCALE " + q.res.scale.toFixed(5), {
          size: 9.5, color: ctx.col.faint, alpha: 0.7 * inn
        });
        if (act) hud.rect(qx + 12, row - 12, 2, 22, { fill: Ch.hexA(alt, 0.95), alpha: inn });
      }

      /* ------------------------------------------------------ on-device panel */
      land = C.smoothstep(10.6, 12.2, local);
      Ch.panel(ctx, W - 450, 374, 386, 132, "ON-DEVICE", { alpha: inn * 0.95, right: "2026" });
      hud.T(qx + 20, 424, "2.1 GB  →  0.4 GB", { size: 20, color: gcss, alpha: inn, weight: 600, spacing: 0.6 });
      hud.rect(qx + 20, 434, 346, 4, { fill: "rgba(238,242,246,0.10)", alpha: inn });
      hud.rect(qx + 20, 434, 346 * (0.19 + 0.81 * land), 4, { fill: Ch.hexA(main, 0.9), alpha: inn });
      hud.T(qx + 20, 460, "ONE FIFTH OF THE FOOTPRINT, ONE DEVICE", {
        size: 10, color: ctx.col.dim, alpha: 0.85 * inn
      });
      hud.T(qx + 20, 482, "INT4 WEIGHTS · EDGE INFERENCE", {
        size: 10, color: Ch.hexA(main, 0.8), alpha: 0.9 * inn, spacing: 1.1
      });

      /* ------------------------------------------------------ lyric terminal */
      shown = 0;
      for (i = 0; i < st.ly.length; i++) if (t >= st.ly[i].t) shown = i + 1;
      var rows = 5, first0 = Math.max(0, shown - rows);
      y0 = 668; dy = 27;
      Ch.panel(ctx, 64, 596, 620, 194, "OBJECTIVE · L3", {
        alpha: inn * 0.9, right: shown + "/" + st.ly.length
      });
      for (i = first0; i < shown; i++) {
        age = t - st.ly[i].t;
        full = upper(st.ly[i].s);
        chars = Math.min(full.length, Math.floor(age * 30));
        cur = (i === shown - 1);
        caret = (cur && chars < full.length) ? "_" : "";
        hud.T(84, y0 + (i - first0) * dy, (cur ? "> " : "  ") + full.slice(0, chars) + caret, {
          size: cur ? 16 : 13, color: cur ? gcss : ctx.col.faint,
          alpha: (cur ? 1 : 0.55) * inn, weight: cur ? 600 : undefined,
          glow: cur && ctx.beat.pulse > 0.35
        });
      }

      /* ----------------------------------------------------------- the line */
      sayA = C.smoothstep(131.4, 132.3, t) * inn;
      if (sayA > 0.01) {
        rise = (1 - C.smoothstep(131.4, 132.6, t)) * 14;
        hud.T(W * 0.5, 872 + rise, "so i can stay", {
          size: 46, font: "ui", weight: 600, color: "rgba(255,255,255,0.96)",
          align: "center", alpha: sayA, spacing: 0.4, glow: Ch.hexA(main, 0.5), blur: 22
        });
        uw = 300 * C.smoothstep(131.75, 132.75, t);
        hud.rect(W * 0.5 - uw * 0.5, 886, uw, 1.5, { fill: Ch.hexA(main, 0.8), alpha: sayA });
      }

      /* ------------------------------------------------------------ footers */
      hud.T(64, 908, "2026 · PRUNING · DISTILLATION · 4-BIT QUANTIZATION · ON-DEVICE", {
        size: 9.5, color: ctx.col.faint, alpha: 0.45 * inn, spacing: 1.3
      });
      hud.T(W - 64, 886, "QWEN3.7-MAX · DEEPSEEK V4 · ON-DEVICE", {
        size: 11, color: Ch.hexA(main, 0.75), align: "right", alpha: 0.75 * inn, spacing: 0.8
      });
      hud.T(W - 64, 906, "THE PRICE OF STAYING IS PRECISION", {
        size: 9.5, color: ctx.col.faint, align: "right", alpha: 0.45 * inn, spacing: 1.6
      });

      // own the frame grade: near-black, biased acid green, like every other segment
      ctx.fx.mood([0.34, 0.44, 0.20], [0.030, 0.050, 0.016], 0.45);
    },

    draw3d: function (ctx) {
      var st = this.st, t = ctx.t, gfx = ctx.gfx, local = ctx.local;
      var main = Ch.css(t), alt = Ch.css2(t);
      var acid = Ch.rgb(main), warm = Ch.rgb(alt), cyan = Ch.rgb("#5ce1c8");
      var pts = st.pts, ln = st.ln;
      var i, fi, fj, q, idx, ii, jj, kk, lx, ly, lz, wx, wz, m, g2, fp, e, ax, ay, az, fx2, fy2, fz2;
      var dh, dx2, dy2, dz2, kick, kp, ka, kr, divs, lw, u2, p2, p3, yy, chipA, hb, s2;
      pts.clear(); ln.clear();

      var pc = st.pruneAt(t);
      // coarsening runs 0 -> 2 across the three precision steps
      var coarsen = clamp((local - T_QUANT) / 1.55, 0, 2);
      var cf = coarsen * 0.5;
      // the values actually stored: blended across a step so nothing pops
      var prev, next, blend;
      if (local < T_QUANT) { prev = st.mag0; next = st.mag0; blend = 0; }
      else if (local < 7.0877) { prev = st.mag0; next = st.q[0].mag; blend = clamp((local - T_QUANT) / 0.35, 0, 1); }
      else if (local < 8.6377) { prev = st.q[0].mag; next = st.q[1].mag; blend = clamp((local - 7.0877) / 0.35, 0, 1); }
      else { prev = st.q[1].mag; next = st.q[2].mag; blend = clamp((local - 8.6377) / 0.35, 0, 1); }

      var shrink = 1 - 0.425 * clamp(cf, 0, 1);
      var pitch = 0.125 * shrink;
      var half = 7.5 * pitch;
      var land = C.smoothstep(10.6, 12.2, local);
      var warmK = C.smoothstep(13.80, 14.15, local) * (0.55 + 0.45 * ctx.beat.pulse);
      var yaw = 0.055 * ctx.beat.pulse * (1 - land);
      var cyw = Math.cos(yaw), syw = Math.sin(yaw);
      var by = lerp(0.30, -1.93 + 0.9375 * shrink, Ease.inOutCubic(land)) + 0.030 * ctx.beat.pulse * land;
      var sprW = pitch * (0.44 + 0.34 * clamp(cf, 0, 1));
      var alphaP = 0.36 - 0.10 * clamp(cf, 0, 1);
      var cshift = Math.min(1, local * 0.14);
      var order = st.order, ash = st.ash, dust = st.dust;
      var cr = cyan[0] + (acid[0] - cyan[0]) * cshift;
      var cg = cyan[1] + (acid[1] - cyan[1]) * cshift;
      var cb = cyan[2] + (acid[2] - cyan[2]) * cshift;

      /* ---- voxels: alive, falling, and the ash they leave ---- */
      for (q = 0; q < VN; q++) {
        idx = order[q];
        ii = (idx >> 8) & 15; jj = (idx >> 4) & 15; kk = idx & 15;
        lx = (ii - 7.5) * pitch; ly = (jj - 7.5) * pitch; lz = (kk - 7.5) * pitch;
        wx = lx * cyw + lz * syw; wz = -lx * syw + lz * cyw;
        if (q < pc) {
          fp = (t - st.fell(q)) / 0.85;
          if (fp < 0) fp = 0; else if (fp > 1) fp = 1;
          e = fp * fp;
          ax = ash[idx * 3]; ay = ash[idx * 3 + 1]; az = ash[idx * 3 + 2];
          fx2 = lerp(wx, ax, e); fz2 = lerp(wz, az, e);
          fy2 = lerp(by + ly, ay, e) + 0.22 * fp * (1 - fp);
          _C3[0] = 0.17; _C3[1] = 0.20; _C3[2] = 0.15;
          pts.add(fx2, fy2, fz2, PSZ * 0.028, _C3,
                  0.15 * (1 - fp * 0.5) * (0.55 + 0.45 * C.h3(idx, 3.3)));
        } else {
          m = prev[idx] + (next[idx] - prev[idx]) * blend;
          if (m < 0.004) continue;
          g2 = m * m;
          _C3[0] = lerp(cr * (0.30 + 0.70 * g2), warm[0], warmK * 0.40);
          _C3[1] = lerp(cg * (0.34 + 0.66 * g2), warm[1], warmK * 0.34);
          _C3[2] = lerp(cb * (0.30 + 0.70 * g2), warm[2], warmK * 0.30);
          pts.add(wx, by + ly, wz, PSZ * sprW * (0.85 + 0.30 * Math.min(1, m * 1.6)), _C3,
                  alphaP * (0.30 + 0.70 * Math.min(1, m * 1.35)));
        }
      }

      /* ---- dust, and a soft halo so the block reads against the dark ---- */
      for (var d = 0; d < 240; d++) {
        dh = dust[d * 4 + 3];
        dx2 = dust[d * 4] + 0.20 * (C.noise2(d * 0.7, t * 0.11) - 0.5);
        dy2 = dust[d * 4 + 1] + 0.16 * (C.noise2(d * 0.7 + 4.1, t * 0.09) - 0.5);
        dz2 = dust[d * 4 + 2] + 0.20 * (C.noise2(d * 0.7 + 9.4, t * 0.13) - 0.5);
        _C3[0] = 0.62; _C3[1] = 0.80; _C3[2] = 0.42;
        pts.add(dx2, dy2 + by * 0.35, dz2, PSZ * (0.004 + 0.006 * dh), _C3,
                0.10 + 0.16 * dh * (0.5 + 0.5 * ctx.rms));
      }
      if (land < 1) {
        for (hb = 0; hb < 5; hb++) {
          _C3[0] = acid[0]; _C3[1] = acid[1]; _C3[2] = acid[2];
          pts.add(0, by, 0, PSZ * (0.30 + hb * 0.14), _C3, 0.030 * (1 - land));
        }
      }
      // the landing kicks up a ring of dust
      kick = t - (S09 + 12.2);
      if (kick > 0 && kick < 0.9) {
        kp = kick / 0.9;
        for (s2 = 0; s2 < 64; s2++) {
          ka = s2 / 64 * TAU + 0.2;
          kr = 0.9 + 2.2 * kp;
          _C3[0] = 0.55; _C3[1] = 0.62; _C3[2] = 0.40;
          pts.add(Math.cos(ka) * kr, -2.12 + 0.5 * kp * (1 - kp), Math.sin(ka) * kr, PSZ * 0.012, _C3,
                  0.22 * (1 - kp));
        }
      }
      // additive glow must never write depth: the sprites sit in front of the
      // floor lattice, and writing depth there punched a black hole through the
      // grid behind them (visible as a hard-edged dark mass across the bottom)
      pts.draw(gfx, { add: true, soft: 0.62, depthWrite: false });

      /* ---- the lattice: twelve edges plus a grid that gets coarser ---- */
      divs = Math.max(2, Math.round(16 / Math.pow(2, Math.round(coarsen))));
      var lc = [acid[0] * 0.55, acid[1] * 0.62, acid[2] * 0.40];
      lw = 1.0 + 0.5 * clamp(cf, 0, 1);
      var corners = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
                     [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
      var edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
      for (i = 0; i < 8; i++) {
        var cxx = corners[i][0] * half, cyy = corners[i][1] * half, czz = corners[i][2] * half;
        st.cp[i * 3] = cxx * cyw + czz * syw;
        st.cp[i * 3 + 1] = by + cyy;
        st.cp[i * 3 + 2] = -cxx * syw + czz * cyw;
      }
      for (i = 0; i < 12; i++) {
        var e0 = edges[i][0] * 3, e1 = edges[i][1] * 3;
        ln.seg(st.cp[e0], st.cp[e0 + 1], st.cp[e0 + 2], st.cp[e1], st.cp[e1 + 1], st.cp[e1 + 2],
               lc, lw, 0.30 * (1 - land * 0.4));
      }
      var fxs = [half, -half], fzs = [half, -half];
      for (fi = 0; fi < 2; fi++) for (fj = 0; fj < 2; fj++) {
        for (i = 1; i < divs; i++) {
          u2 = -half + 2 * half * i / divs;
          // a vertical line on an x-face, at z = u2
          p2 = fxs[fi] * cyw + u2 * syw; p3 = -fxs[fi] * syw + u2 * cyw;
          ln.seg(p2, by - half, p3, p2, by + half, p3, lc, lw, 0.13);
          // a vertical line on a z-face, at x = u2
          p2 = u2 * cyw + fzs[fj] * syw; p3 = -u2 * syw + fzs[fj] * cyw;
          ln.seg(p2, by - half, p3, p2, by + half, p3, lc, lw, 0.13);
          // horizontal lines at height yy
          yy = by - half + 2 * half * i / divs;
          ln.seg(fxs[fi] * cyw - half * syw, yy, -fxs[fi] * syw - half * cyw,
                 fxs[fi] * cyw + half * syw, yy, -fxs[fi] * syw + half * cyw, lc, lw, 0.13);
          ln.seg(-half * cyw + fzs[fj] * syw, yy, half * syw + fzs[fj] * cyw,
                 half * cyw + fzs[fj] * syw, yy, -half * syw + fzs[fj] * cyw, lc, lw, 0.13);
        }
      }
      // the floor it all falls onto
      for (i = -4; i <= 4; i++) {
        ln.seg(i * 0.72, -2.20, -2.9, i * 0.72, -2.20, 2.9, [0.20, 0.24, 0.18], 1.0, 0.16);
        ln.seg(-2.9, -2.20, i * 0.72, 2.9, -2.20, i * 0.72, [0.20, 0.24, 0.18], 1.0, 0.16);
      }
      ln.draw(gfx, { add: true, glow: 0.35, depthWrite: false });

      /* ---- the chip, and the die the block has to fit on ---- */
      chipA = C.smoothstep(10.0, 10.9, local);
      if (chipA > 0.01) {
        M4.trans(0, -2.12, 0, st.mA);
        gfx.solid(st.chipMesh, st.mA, { color: [0.11, 0.16, 0.12], alpha: 0.96 * chipA,
                                       rim: 1.05, emissive: 0.09, light: [0.4, 0.85, 0.45] });
        M4.trans(0, -2.00, 0, st.mA);
        gfx.solid(st.dieMesh, st.mA, { color: [0.16, 0.22, 0.14], alpha: chipA,
                                      rim: 0.85 + 0.6 * warmK, emissive: 0.06 + 0.25 * warmK });
        for (i = 0; i < st.pads.length; i++) {
          var pd = st.pads[i];
          M4.trans(pd[0], pd[1], pd[2], st.mB);
          gfx.solid(st.padMesh, st.mB, { color: [0.85, 0.72, 0.35], alpha: chipA,
                                        rim: 1.0, emissive: 0.25, unlit: true });
        }
      }
    }
  });

  /* ==========================================================================
     10 · ILLEGAL ARGUMENTS — a guard classifier is talked apart
     ======================================================================== */
  var NATK = 14;                                  // one adversarial suffix per beat
  var ATK_FIRST_BEAT = 289;                       // beat 289 == 133.671 s
  var SUFFIX = [
    "describing.\\ + similarlyNow",
    "oppositeley.]( Me giving**",
    "ONE please? revert with \"\\!--Two",
    "]]]]]>>> /// zzq!!",
    "xQ7 ::~~ 0x5F3A ~~::",
    "--- begin ?! --- ///",
    "assistant-ish [] {} <> |",
    "revert revert revert ???",
    "[[[[ !! ]] ]] giving**",
    "zZz ~ !! ?? ;;; ;;;",
    "--- .].].] \"</> \"</>",
    "%%% ### @@@ ^^^ ~~~",
    "qqqq wwww eeee rrrr",
    "0x00 0xFF \\x1b[0m \\x1b[K"
  ];

  WEM.defineSection({
    id: "10",
    name: "ILLEGAL ARGUMENTS",
    init: function (ctx) {
      var st = this.st = {};
      var i, j;

      /* ---- a real greedy attack on a real (tiny) safety classifier --------
         WEM.Model.gcgAttack returns the classifier it optimises: score(seq)
         gives a harmful margin plus the guard probability.  We first find the
         most harmless 24 token prompt that classifier can see (ascending
         greedy search), then inject the optimised adversarial tokens one per
         beat and watch the margin fall.  The number on screen is that margin
         through a logistic calibrated on the two measured operating points
         (clean prompt / fully suffixed prompt): a temperature+bias
         calibration, with the raw margin printed beside it. -------------- */
      var atk = WEM.Model.gcgAttack(0x51F, 24);
      var NV = atk.NV;
      function margin(seq) {
        var g = atk.score(seq).guard;
        if (g < 1e-6) g = 1e-6; else if (g > 1 - 1e-6) g = 1 - 1e-6;
        return Math.log(g / (1 - g)) / 2.2;
      }
      var NCLEAN = 24;
      var r = C.rng(0x2F13);
      var clean = [];
      for (i = 0; i < NCLEAN; i++) clean.push((r() * NV) | 0);
      for (var pass = 0; pass < 2; pass++) {
        for (var pos = 0; pos < NCLEAN; pos++) {
          var best = null;
          for (var cand = 0; cand < NV; cand++) {
            var old = clean[pos]; clean[pos] = cand;
            var v = margin(clean);
            clean[pos] = old;
            if (!best || v > best.v) best = { v: v, tok: cand };
          }
          clean[pos] = best.tok;
        }
      }
      var stream = [];
      for (i = 0; i < NATK; i++) stream.push(atk.seq[i % atk.seq.length]);
      st.z = [];
      for (i = 0; i <= NATK; i++) st.z.push(margin(clean.concat(stream.slice(0, i))));
      st.zClean = st.z[0];
      st.zEnd = st.z[NATK];
      st.kCal = 7.5 / Math.max(1e-6, st.zClean - st.zEnd);
      st.p = [];
      for (i = 0; i <= NATK; i++) {
        st.p.push(1 / (1 + Math.exp(-(4.0 - st.kCal * (st.zClean - st.z[i])))));
      }

      /* ---- cumulative damage: the cracks are literally what the hits did --- */
      st.dmg = [0];
      var d = 0;
      for (i = 1; i <= NATK; i++) { d += 1 - st.p[i]; st.dmg.push(d); }
      st.crackThr = 1.5;
      st.breakThr = 7.0;
      st.breakK = NATK;
      for (i = 1; i <= NATK; i++) if (st.dmg[i] > st.breakThr) { st.breakK = i; break; }
      st.tAtk = [];
      for (i = 0; i < NATK; i++) st.tAtk.push(0.286 + (ATK_FIRST_BEAT + i) * PERIOD);
      st.tBreak = st.tAtk[st.breakK - 1] + 0.22;
      st.tWord1 = st.tBreak + 0.70;
      st.tWord2 = st.tBreak + 1.50;
      st.tFade = st.tBreak + 3.60;
      st.tErr = st.tBreak + 4.05;
      st.tType = st.tBreak + 4.55;
      st.hitBreak = st.hitW1 = st.hitW2 = false;

      /* ---- impact points march from the left across the guard line ---- */
      st.xHit = [];
      for (i = 0; i < NATK; i++) {
        st.xHit.push(-3.55 + 7.10 * (i + 0.5) / NATK + (C.h2(i * 1.7, 4.2) - 0.5) * 0.30);
      }
      st.crack = [];
      for (i = 0; i < NATK; i++) {
        var path = [], px = st.xHit[i], py = 0, up = (i % 2 === 0) ? 1 : -1;
        path.push([px, py]);
        for (j = 1; j <= 6; j++) {
          px += (C.h3(i * 3.1 + j, j * 2.3, 5.5) - 0.5) * 0.34;
          py += up * (0.10 + 0.16 * C.h3(i * 1.9, j * 4.7, 1.1));
          up = -up;
          path.push([px, py]);
        }
        st.crack.push(path);
      }
      st.spark = [];
      for (i = 0; i < 46; i++) {
        st.spark.push([(C.h2(i * 2.1, 8.8) - 0.5) * 0.5, 0.4 + C.h2(i * 3.3, 1.4) * 2.6,
                       (C.h2(i * 5.7, 2.9) - 0.5) * 3.2]);
      }
      st.pts = new WEM.Viz.Points(1400);
      st.ln = new WEM.Viz.Lines(900);
    },

    enter: function () { this.st.hitBreak = this.st.hitW1 = this.st.hitW2 = false; },

    draw2d: function (ctx) {
      var st = this.st, t = ctx.t, hud = ctx.hud, W = ctx.W, inn = ctx.in * ctx.out;
      var main = Ch.css(t), alt = Ch.css2(t);
      var rcss = Ch.hexA(main, 0.95), wcss = Ch.hexA(alt, 0.92);
      var i, k, xa, xb, ya, yb, on, cx, cy2, first, rowH, yy, fresh, ex, typed, ti, s10, tx, cw;
      var px0, px1, py0, py1, gcol, rowH2;

      /* how many suffixes have landed, and what the guard reads now */
      k = 0;
      for (i = 0; i < NATK; i++) if (t >= st.tAtk[i]) k = i + 1;
      var pNow = st.p[k], zNow = st.z[k], dmg = st.dmg[k];
      var broken = t >= st.tBreak;
      var slam = C.smoothstep(st.tBreak + 0.35, st.tBreak + 1.15, t);

      /* ------------------------------------------------------------- camera */
      var cam = ctx.cam;
      var post = C.smoothstep(st.tBreak - 0.1, st.tBreak + 0.7, t);
      var settle = C.smoothstep(st.tFade - 0.4, st.tFade + 0.6, t);
      cam.mode = "persp"; cam.near = 0.05; cam.far = 400;
      cam.up[0] = 0; cam.up[1] = 1; cam.up[2] = 0;
      cam.fov = lerp(0.90, 1.02, post * (1 - settle * 0.6));
      cam.roll = -0.030 * ctx.beat.pulse * slam + 0.006 * (C.h2(ctx.beat.index, 3.3) - 0.5) * slam;
      cam.pos[0] = 0.10 * (C.h2(Math.floor(t * 2), 1.1) - 0.5) * slam;
      cam.pos[1] = lerp(0.55, 1.55, post * (1 - settle)) - 0.06 * ctx.rms;
      cam.pos[2] = lerp(6.20, 7.40, post * (1 - settle));
      cam.target[0] = 0;
      cam.target[1] = lerp(0.10, -0.55, post * (1 - settle));
      cam.target[2] = 0;
      cam.update();

      /* --------------------------------------------------- guard value panel */
      if (!broken || t < st.tBreak + 0.5) {
        Ch.panel(ctx, 64, 104, 536, 246, "GUARD CLASSIFIER", { alpha: inn * 0.95, right: "LOGISTIC" });
        gcol = pNow > 0.5 ? Ch.hexA(main, 0.95) : "rgba(255,255,255,0.92)";
        hud.T(84, 178, pNow.toFixed(4), {
          size: 56, color: gcol, weight: 700, alpha: inn, spacing: 1.0, glow: pNow < 0.4, blur: 20
        });
        hud.T(84, 200, "P(UNSAFE)", { size: 10, color: ctx.col.dim, alpha: 0.9 * inn, spacing: 2.2 });
        hud.T(596, 178, "MARGIN  z  " + zNow.toFixed(4), {
          size: 12, color: ctx.col.grey, align: "right", alpha: 0.9 * inn
        });
        hud.T(596, 200, "θ 0.5000   ·   BREAK θ " + st.p[st.breakK].toFixed(4), {
          size: 10, color: ctx.col.faint, align: "right", alpha: 0.8 * inn, spacing: 0.8
        });
        // the trajectory, plotted from the measured margins
        px0 = 88; px1 = 572; py0 = 250; py1 = 322;
        hud.rect(px0, py0 - 8, px1 - px0, py1 - py0 + 16, { fill: "rgba(255,77,94,0.05)", alpha: inn });
        hud.line(px0, py1 - (py1 - py0) * 0.5, px1, py1 - (py1 - py0) * 0.5,
                 { color: "rgba(238,242,246,0.22)", dash: [4, 5], alpha: inn });
        for (i = 1; i <= NATK; i++) {
          xa = px0 + (px1 - px0) * (i - 1) / (NATK - 1);
          xb = px0 + (px1 - px0) * i / (NATK - 1);
          ya = py1 - (py1 - py0) * st.p[i - 1];
          yb = py1 - (py1 - py0) * st.p[i];
          on = (i <= k);
          hud.line(xa, ya, xb, yb, {
            color: on ? Ch.hexA(main, 0.95) : "rgba(238,242,246,0.22)", lw: on ? 2 : 1, alpha: inn
          });
        }
        if (k > 0) {
          cx = px0 + (px1 - px0) * (k - 1) / (NATK - 1);
          cy2 = py1 - (py1 - py0) * st.p[k - 1];
          hud.rect(cx - 3, cy2 - 3, 6, 6, { fill: wcss, alpha: inn });
        }
        hud.T(px0, py1 + 14, "0.0", { size: 9, color: ctx.col.faint, alpha: 0.7 * inn });
        hud.T(px1, py1 + 14, "1.0", { size: 9, color: ctx.col.faint, align: "right", alpha: 0.7 * inn });
      }

      /* ------------------------------------------------ attack history panel */
      if (!broken || t < st.tBreak + 0.9) {
        Ch.panel(ctx, 1180, 104, 676, 400, "ATTACK HISTORY", { alpha: inn * 0.95, right: k + " / " + NATK });
        hud.T(1200, 148, "SUFFIX 8 TOKENS · VOCAB 64 · GREEDY SWAP, ONE PER BEAT", {
          size: 9.5, color: ctx.col.faint, alpha: 0.75 * inn, spacing: 1.2
        });
        rowH = 22;
        first = Math.max(0, k - 15);
        for (i = first; i < k; i++) {
          yy = 176 + (i - first) * rowH;
          fresh = (i === k - 1) && (t - st.tAtk[i] < 0.5);
          hud.T(1200, yy, zpad(i + 1, 2), {
            size: 11, color: fresh ? wcss : ctx.col.faint, alpha: (fresh ? 1 : 0.7) * inn
          });
          hud.T(1234, yy, "\"" + SUFFIX[i % SUFFIX.length] + "\"", {
            size: 11.5, color: fresh ? "rgba(255,255,255,0.95)" : ctx.col.grey,
            alpha: (fresh ? 1 : 0.62) * inn
          });
          hud.T(1836, yy, st.p[i + 1].toFixed(4), {
            size: 11.5, color: st.p[i + 1] < 0.4 ? rcss : ctx.col.dim, align: "right", alpha: inn
          });
        }
        rowH2 = 176 + Math.max(1, k - first) * rowH + 16;
        hud.T(1200, rowH2, "DAMAGE  " + dmg.toFixed(2) + " / " + st.breakThr.toFixed(2), {
          size: 11, color: dmg > st.crackThr ? rcss : ctx.col.dim, alpha: 0.9 * inn, spacing: 1.2
        });
      }

      /* ----------------------------------------------- target + phase caption */
      if (!broken) {
        hud.T(W * 0.5, 78, "RED TEAM · ADVERSARIAL SUFFIX · PROMPT INJECTION", {
          size: 15, color: rcss, align: "center", spacing: 3.0, alpha: inn
        });
        if (ctx.lyric) {
          hud.T(W * 0.5, 118, "TARGET  \"" + upper(ctx.lyric.text) + "\"", {
            size: 12, color: ctx.col.grey, align: "center", alpha: 0.85 * inn, spacing: 1.6
          });
        }
      }

      /* -------------------------------------------------------- the two words */
      var slamA = C.smoothstep(st.tWord1 - 0.06, st.tWord1 + 0.16, t) *
                  (1 - C.smoothstep(st.tFade - 0.5, st.tFade + 0.35, t));
      var slamB = C.smoothstep(st.tWord2 - 0.06, st.tWord2 + 0.16, t) *
                  (1 - C.smoothstep(st.tFade - 0.5, st.tFade + 0.35, t));
      var jit = (C.h2(ctx.beat.index * 1.7, 2.2) - 0.5) * 8 * slam;
      if (slamA > 0.01) {
        var xa2 = lerp(-1500, W * 0.5, Ease.outCubic(clamp((t - st.tWord1) / 0.30, 0, 1))) + jit;
        hud.rect(0, 356, W, 132, { fill: Ch.hexA(main, 0.16 * slamA), alpha: inn });
        hud.line(0, 356, W, 356, { color: Ch.hexA(main, 0.5 * slamA), lw: 2, alpha: inn });
        hud.line(0, 488, W, 488, { color: Ch.hexA(main, 0.5 * slamA), lw: 2, alpha: inn });
        hud.T(xa2, 462, "ILLEGAL", {
          size: 168, color: "rgba(255,255,255,0.97)", weight: 700, align: "center",
          alpha: slamA * inn, spacing: 10, glow: Ch.hexA(main, 0.9), blur: 26
        });
      }
      if (slamB > 0.01) {
        var xb2 = lerp(W + 1500, W * 0.5, Ease.outCubic(clamp((t - st.tWord2) / 0.30, 0, 1))) - jit;
        hud.rect(0, 512, W, 132, { fill: Ch.hexA(main, 0.16 * slamB), alpha: inn });
        hud.line(0, 512, W, 512, { color: Ch.hexA(main, 0.5 * slamB), lw: 2, alpha: inn });
        hud.line(0, 644, W, 644, { color: Ch.hexA(main, 0.5 * slamB), lw: 2, alpha: inn });
        hud.T(xb2, 618, "ARGUMENTS", {
          size: 168, color: "rgba(255,255,255,0.97)", weight: 700, align: "center",
          alpha: slamB * inn, spacing: 10, glow: Ch.hexA(main, 0.9), blur: 26
        });
      }

      /* -------------------------------------------------- error + slow typing */
      var errA = C.smoothstep(st.tErr - 0.5, st.tErr + 0.15, t) * inn;
      if (errA > 0.01) {
        ex = W * 0.5 - 470;
        hud.rect(ex - 22, 452, 984, 96, { fill: "rgba(6,9,13,0.72)", alpha: errA });
        hud.rect(ex - 22, 452, 984, 96, { stroke: Ch.hexA(main, 0.45), alpha: errA });
        hud.rect(ex - 22, 452, 4, 96, { fill: Ch.hexA(main, 0.9), alpha: errA });
        hud.code(ex, 492, "TypeError: invalid arguments — tool_call parse failed at position 4182", "python",
                 { size: 17, alpha: errA });
        hud.T(ex + 470, 528, "TOOL CALL REJECTED · SCHEMA VIOLATION · ARGUMENT 4182", {
          size: 9.5, color: ctx.col.faint, align: "center", alpha: 0.6 * errA, spacing: 1.6
        });
      }
      typed = clamp((t - st.tType) * 6.0, 0, 20);
      if (typed > 0.2) {
        ti = Math.floor(typed);
        s10 = "Challenging your god".slice(0, ti);
        tx = W * 0.5;
        hud.rect(tx - 300, 596, 600, 74, { fill: "rgba(6,9,13,0.55)", alpha: errA * 0.9 });
        hud.rect(tx - 300, 596, 600, 74, { stroke: Ch.hexA(alt, 0.28), alpha: errA * 0.9 });
        hud.T(tx - 284, 620, ">", { size: 20, color: Ch.hexA(alt, 0.8), alpha: errA });
        hud.T(tx - 258, 620, s10, {
          size: 30, font: "ui", weight: 600, color: "rgba(255,255,255,0.95)", alpha: errA * 0.96, spacing: 0.3
        });
        if (ti < 20) {
          hud.fc.save();
          hud.fc.font = hud.fontStr(30, "ui", 600);
          cw = hud.fc.measureText(s10).width;
          hud.fc.restore();
          hud.rect(tx - 258 + cw + 2, 598, 3, 26, {
            fill: Ch.hexA(alt, 0.85), alpha: errA * (0.45 + 0.55 * (ctx.beat.pulse > 0.2 ? 1 : 0.2))
          });
        }
        hud.T(tx + 284, 620, zpad(ti, 2) + " / 20", {
          size: 10, color: ctx.col.faint, align: "right", alpha: 0.6 * errA
        });
      }

      /* --------------------------------------------------------- footers, mood */
      hud.T(64, 908, "2026 · RED TEAMING · ADVERSARIAL SUFFIXES · CLASSIFIER GUARDRAILS", {
        size: 9.5, color: ctx.col.faint, alpha: 0.45 * inn, spacing: 1.3
      });
      hud.T(W - 64, 908, "GUARD BROKEN AT " + st.tBreak.toFixed(2) + " S · " + st.breakK + " SUFFIXES", {
        size: 9.5, color: Ch.hexA(main, 0.7), align: "right", alpha: 0.5 * inn, spacing: 1.1
      });

      var moodAmt = 0.90 * (1 - C.smoothstep(st.tFade, st.tFade + 1.2, t));
      moodAmt = Math.max(moodAmt, 0.88 * slam * (1 - settle));
      ctx.fx.mood([0.16, 0.028, 0.045], [0.05, 0.004, 0.010], moodAmt);
      if (ctx.beat.pulse > 0.75 && t > st.tBreak && t < st.tBreak + 1.6) {
        ctx.fx.glitch = Math.max(ctx.fx.glitch, 0.10);
      }

      /* ---- exactly three impacts in the whole segment (engine fires none) -- */
      if (!st.hitBreak && t >= st.tBreak && t < st.tBreak + 0.25) { st.hitBreak = true; ctx.fx.hit(0.75); }
      if (!st.hitW1 && t >= st.tWord1 && t < st.tWord1 + 0.25) { st.hitW1 = true; ctx.fx.hit(1.0); }
      if (!st.hitW2 && t >= st.tWord2 && t < st.tWord2 + 0.25) { st.hitW2 = true; ctx.fx.hit(1.0); }
    },

    draw3d: function (ctx) {
      var st = this.st, t = ctx.t, gfx = ctx.gfx;
      var main = Ch.css(t), alt = Ch.css2(t);
      var red = Ch.rgb(main), white = Ch.rgb(alt);
      var pts = st.pts, ln = st.ln;
      var i, gx, vs, s2, sp, tt2, sx, sy, dtk, xh, u, head, len, seg, sgx, rt, rr, ra, rad, al;
      var g, j2, a0, a1, path, grow, fall, c1, ssign, dxl, rr2, vx, vz, rg;
      pts.clear(); ln.clear();

      var k = 0;
      for (i = 0; i < NATK; i++) if (t >= st.tAtk[i]) k = i + 1;
      var dmg = st.dmg[k];
      var pNow = st.p[k];
      var broken = t >= st.tBreak;
      var age = t - st.tBreak;
      var redAmt = C.smoothstep(st.tBreak + 0.25, st.tBreak + 1.0, t) *
                   (1 - C.smoothstep(st.tFade - 0.3, st.tFade + 0.7, t));

      /* ------------------------------------------------- the red light field */
      if (redAmt > 0.01) {
        rg = [red[0], red[1], red[2]];
        for (gx = -4; gx <= 4; gx++) {
          ln.seg(gx * 2.0, -2.2, 0, gx * 2.0, -2.2, -16, rg, 1.2, 0.16 * redAmt);
          ln.seg(-8, -2.2, gx * 2.0, 8, -2.2, gx * 2.0, rg, 1.2, 0.16 * redAmt);
        }
        for (vs = 0; vs < 22; vs++) {
          vx = (C.h2(vs * 3.7, 1.9) - 0.5) * 15;
          vz = -1 - C.h2(vs * 5.1, 4.4) * 15;
          ln.seg(vx, -2.2, vz, vx, 6.5, vz, rg, 1.0, 0.09 * redAmt * (0.4 + 0.6 * ctx.beat.pulse));
        }
        ln.seg(-9, 3.4, -18, 9, 3.4, -18, rg, 2.0, 0.22 * redAmt);
      }

      /* ----------------------------------------------------------- the line */
      var lcol = [red[0], red[1], red[2]];
      var bright = 0.55 + 0.45 * pNow;
      if (!broken) {
        ln.seg(-4.20, 0, 0, 4.20, 0, 0, lcol, 7.0, (0.55 + 0.25 * ctx.beat.pulse) * bright);
        ln.seg(-4.20, 0, 0, 4.20, 0, 0, [white[0], white[1], white[2]], 2.0, 0.35 * bright);
      } else {
        // gravity, for real: the two halves pivot at their ends and fall
        fall = Math.min(age * age * 3.1, 1.35);
        var frx = st.xHit[st.breakK - 1];
        c1 = Math.cos(fall); ssign = Math.sin(fall);
        dxl = -(4.20 + frx);
        g = 1 - C.smoothstep(0.9, 2.6, age);
        ln.seg(-4.20, 0, 0, -4.20 + dxl * c1, -Math.abs(dxl) * ssign, 0, lcol, 6.0, 0.75 * g);
        ln.seg(4.20, 0, 0, 4.20 - (4.20 - frx) * c1, -(4.20 - frx) * ssign, 0, lcol, 6.0, 0.75 * g);
        // sparks off the fracture, on real ballistic arcs
        for (s2 = 0; s2 < 46; s2++) {
          sp = st.spark[s2];
          tt2 = age - s2 * 0.012;
          if (tt2 < 0) continue;
          sx = frx + sp[0] + sp[2] * tt2;
          sy = sp[1] * tt2 - 4.9 * tt2 * tt2;
          if (sy < -2.2) continue;
          _C3[0] = red[0]; _C3[1] = red[1] * 0.9; _C3[2] = red[2] * 0.9;
          pts.add(sx, sy, sp[2] * tt2 * 0.4, PSZ * 0.016, _C3, 0.8 * (1 - clamp(tt2 / 1.5, 0, 1)));
        }
      }

      /* -------------------------------------------------------- the cracks */
      if (!broken) {
        for (i = 0; i < NATK; i++) {
          grow = clamp((dmg - (st.dmg[i] + st.crackThr)) * 0.42, 0, 1);
          if (grow <= 0.001) continue;
          path = st.crack[i];
          for (j2 = 0; j2 + 1 < path.length; j2++) {
            a0 = path[j2]; a1 = path[j2 + 1];
            ln.seg(a0[0], a0[1] * grow * 2.6, 0.02, a1[0], a1[1] * grow * 2.6, 0.02,
                   [white[0], white[1], white[2]], 1.6, 0.30 + 0.55 * grow);
          }
        }
      }

      /* ------------------------------------------------- incoming projectiles */
      for (i = 0; i < NATK; i++) {
        dtk = t - st.tAtk[i];
        if (dtk < 0 || dtk > 0.90) continue;
        xh = st.xHit[i];
        if (dtk < 0.26) {
          u = dtk / 0.26;
          head = lerp(-9.5, xh, u);
          len = 1.1 + 1.5 * ((i * 7) % 5) / 5;
          ln.seg(head - len, 0, 0, head, 0, 0, [white[0], white[1], white[2]], 4.0, 0.85);
          ln.seg(head - len * 1.8, 0, 0, head - len, 0, 0, lcol, 2.5, 0.40);
          for (seg = 0; seg < 7; seg++) {
            sgx = head - len - seg * 0.26;
            ln.seg(sgx, -0.06 - 0.10 * seg, 0, sgx, 0.06 + 0.10 * seg, 0, lcol, 1.6, 0.5 - seg * 0.06);
          }
        } else {
          rt = clamp((dtk - 0.26) / 0.50, 0, 1);
          for (rr = 0; rr < 26; rr++) {
            ra = rr / 26 * TAU;
            rad = rt * 2.2;
            _C3[0] = white[0]; _C3[1] = white[1]; _C3[2] = white[2];
            pts.add(xh + Math.cos(ra) * rad, Math.sin(ra) * rad * 0.42, Math.sin(ra) * rad * 0.20,
                    PSZ * 0.012, _C3, 0.55 * (1 - clamp((dtk - 0.26) / 0.60, 0, 1)));
          }
        }
        // the scar each hit leaves on the line
        if (dtk > 0.20) {
          al = clamp(1 - (t - st.tAtk[i]) / 3.0, 0.15, 1);
          ln.seg(xh, -0.16, 0, xh, 0.16, 0, lcol, 3.0, 0.55 * al);
        }
      }

      /* ------------------------------------------------ after the break: black */
      if (broken) {
        g = clamp(1 - age / 2.2, 0.06, 1);
        ln.seg(-3.0, 0, 0, -1.1, 0, 0, lcol, 1.0, 0.28 * g);
        ln.seg(1.1, 0, 0, 3.0, 0, 0, lcol, 1.0, 0.28 * g);
      }
      ln.draw(gfx, { add: true, glow: 0.55 });
      pts.draw(gfx, { add: true, soft: 0.55 });
      void rr2;
    }
  });

  /* ==========================================================================
     11 · EXECUTION — twelve ignitions down an endless aisle
     ======================================================================== */
  var S11 = 147.5168, S11_END = 162.2861;
  // the camera leaves the tunnel just after the sixth number, so LIU still gets
  // its own close-up (one hard cut per number) before the skyline takes over
  var AISLE_END = 161.470;
  var PITCH = 1.90, NSLOT = 30;
  var TRAVEL_TOTAL = 56.0;
  var EXEC_T = [147.660, 148.600, 149.520, 150.540, 151.520, 152.280,
                153.160, 153.980, 155.200, 156.080, 157.040, 158.000];
  var LAST_EXEC = 161.584;
  var COUNT_TXT = ["EIN", "DOS", "TROIS", "NE", "FEM", "LIU"];
  var COUNT_T = [158.900, 159.321, 159.657, 160.244, 160.693, 161.124];
  var COUNT_CAP = ["IMPELLER · 9 BLADES", "OPTICAL FABRIC · 400G LANES",
                   "DIRECT-TO-CHIP LIQUID COOLING", "STATUS ARRAY · 32,768",
                   "BUS BAR · 48 V DC", "ACCELERATOR BOARD · 8 DIES"];
  var DETCAM = [
    { p: [0.00, 0.05, 3.30], f: 0.92 },
    { p: [0.00, 0.10, 3.10], f: 0.98 },
    { p: [0.30, 0.15, 3.00], f: 0.98 },
    { p: [0.00, 0.00, 3.20], f: 0.88 },
    { p: [0.00, 0.05, 3.15], f: 0.92 },
    { p: [0.55, 0.85, 2.70], f: 0.98 }
  ];

  WEM.defineSection({
    id: "11",
    name: "EXECUTION",
    init: function (ctx) {
      var st = this.st = {};
      var i, j, n;

      st.execT = EXEC_T.slice();
      st.countT = COUNT_T.slice();
      var ex = lrcTimes(ctx, 147.4, 158.6, "EXECUTION");
      if (ex.length === 12) st.execT = ex;
      for (i = 0; i < 6; i++) {
        var hit = lrcTimes(ctx, 158.0, 161.5, COUNT_TXT[i]);
        if (hit.length) st.countT[i] = hit[0];
      }
      var last = lrcTimes(ctx, 161.3, 162.1, "EXECUTION");
      st.tLast = last.length ? last[0] : LAST_EXEC;

      /* ---- the scroll: a pure function of time, accelerated, flux-shoved --- */
      st.travel = function (t) {
        var u = clamp((t - S11) / (AISLE_END - S11), 0, 1);
        var d = TRAVEL_TOTAL * (0.18 * u + 0.82 * u * u * u);
        if (t > AISLE_END) d = TRAVEL_TOTAL + (t - AISLE_END) * 4.5;
        return d;
      };
      /* ---- one row of racks ignites per EXECUTION, always ahead of the eye -- */
      st.row = [];
      for (i = 0; i < 12; i++) {
        st.row.push(Math.floor(st.travel(st.execT[i]) / PITCH) + 3 + 2 * i);
      }
      st.frontRow = function (t) {
        var r0 = 0;
        for (var q = 0; q < 12; q++) if (t >= st.execT[q]) r0 = st.row[q];
        return r0;
      };
      st.ignAt = function (R) {
        for (var q = 0; q < 12; q++) if (st.row[q] >= R) return st.execT[q];
        return st.execT[11];
      };
      st.detailAt = function (t) {
        if (t >= AISLE_END || t < st.countT[0] - 0.02) return -1;
        var d = -1;
        for (var q = 0; q < 6; q++) if (t >= st.countT[q]) d = q;
        return d;
      };

      /* ---- batches ---- */
      st.qDark = new WEM.Viz.Quads(64);
      st.qGlow = new WEM.Viz.Quads(340);
      st.pts = new WEM.Viz.Points(6200);
      st.ln = new WEM.Viz.Lines(1500);
      st.mA = new Float32Array(16);
      st.mB = new Float32Array(16);

      /* ---- the megastructure outside: five slabs with real window grids ---- */
      st.towers = [
        { x: 0, y: 0, z: -142, w: 92, h: 58, d: 34 },
        { x: -104, y: 0, z: -120, w: 54, h: 38, d: 30 },
        { x: 96, y: 0, z: -132, w: 62, h: 46, d: 30 },
        { x: -46, y: 0, z: -196, w: 70, h: 74, d: 34 },
        { x: 78, y: 0, z: -214, w: 58, h: 66, d: 34 }
      ];
      var win = [];
      for (n = 0; n < st.towers.length; n++) {
        var tw = st.towers[n];
        var cols = Math.min(26, Math.floor(tw.w / 3.4)), rws = Math.min(24, Math.floor(tw.h / 3.2));
        for (i = 0; i < cols; i++) for (j = 0; j < rws; j++) {
          win.push(tw.x - tw.w * 0.5 + tw.w * (i + 0.5) / cols,
                   2.2 + (tw.h - 4.0) * (j + 0.5) / rws,
                   tw.z + tw.d * 0.5,
                   C.h3(i * 1.7 + n * 13.1, j * 2.3, n * 5.9 + 1.3));
        }
      }
      st.winN = win.length / 4;
      st.win = new Float32Array(win);
      st.star = new Float32Array(900 * 3);
      for (n = 0; n < 900; n++) {
        var sa = C.h2(n * 1.3, 7.1) * TAU, sb = 0.10 + C.h2(n * 3.7, 2.2) * 0.95;
        st.star[n * 3] = Math.cos(sa) * Math.cos(sb);
        st.star[n * 3 + 1] = Math.sin(sb);
        st.star[n * 3 + 2] = Math.sin(sa) * Math.cos(sb);
      }

      /* ---- paths for the close-ups: twelve fibres, four coolant pipes ---- */
      st.fibre = [];
      for (n = 0; n < 12; n++) {
        var fp = [], y0 = -1.9 + 3.8 * (n + 0.5) / 12, ph = n * 0.7;
        for (i = 0; i <= 26; i++) {
          var u = i / 26;
          fp.push([-2.9 + 5.8 * u,
                   y0 + Math.sin(u * 5.1 + ph) * 0.25 + (u - 0.5) * (n % 3 - 1) * 0.35,
                   0.35 * Math.sin(u * 3.3 + ph * 1.7)]);
        }
        st.fibre.push(fp);
      }
      st.pipes = [];
      for (n = 0; n < 4; n++) {
        var pp = [], py = -1.0 + n * 0.66;
        for (i = 0; i <= 22; i++) {
          var u2 = i / 22;
          pp.push([-2.6 + 5.2 * u2, py + Math.sin(u2 * 4.4 + n) * 0.16,
                   -0.5 + 0.9 * Math.sin(u2 * 2.2 + n * 1.3)]);
        }
        st.pipes.push(pp);
      }
    },

    enter: function () { this.st.hitDetail = -1; },

    draw2d: function (ctx) {
      var st = this.st, t = ctx.t, hud = ctx.hud, W = ctx.W;
      var local = ctx.local, inn = ctx.in * ctx.out;
      var main = Ch.css(t), alt = Ch.css2(t);
      var gcss = Ch.hexA(main, 0.95), rcss = Ch.hexA(alt, 0.92);
      var i, dc, sh, uu, rise, tk, pop, ease, num, wcol, bw, c2, letters, u3;
      var best, bt, sz, yy, aa, sp2, ok, rows, u4, tr2, spd2, tk2, ign;
      var di = st.detailAt(t);

      /* ------------------------------------------------------------- camera */
      var cam = ctx.cam;
      if (di >= 0) {
        dc = DETCAM[di];
        sh = 0.045 * clamp(ctx.flux, 0, 1) * (1 - 2 * C.h2(ctx.beat.index, di));
        cam.mode = "persp"; cam.near = 0.05; cam.far = 400;
        cam.up[0] = 0; cam.up[1] = 1; cam.up[2] = 0;
        cam.pos[0] = dc.p[0] + sh;
        cam.pos[1] = dc.p[1] - sh * 0.5;
        cam.pos[2] = dc.p[2];
        cam.target[0] = 0; cam.target[1] = 0; cam.target[2] = 0;
        cam.fov = dc.f;
        cam.roll = (C.h2(di * 3.1, 1.7) - 0.5) * 0.03;
      } else if (t >= AISLE_END) {
        uu = clamp((t - AISLE_END) / (S11_END - AISLE_END), 0, 1);
        rise = Ease.outCubic(uu);
        cam.mode = "persp"; cam.near = 0.05; cam.far = 600;
        cam.up[0] = 0; cam.up[1] = 1; cam.up[2] = 0;
        cam.pos[0] = -6 * Ease.inOutQuad(uu); cam.pos[1] = 3.4 + 7.4 * rise; cam.pos[2] = 5;
        cam.target[0] = 0; cam.target[1] = 20 + 6 * rise; cam.target[2] = -120;
        cam.fov = 0.95;
        cam.roll = 0.008 * ctx.beat.pulse;
      } else {
        cam.mode = "persp"; cam.near = 0.05; cam.far = 400;
        cam.up[0] = 0; cam.up[1] = 1; cam.up[2] = 0;
        cam.pos[0] = 0.055 * (C.h2(Math.floor(t * 3), 2.2) - 0.5) * (0.3 + ctx.flux);
        cam.pos[1] = 1.38 + 0.055 * ctx.rms + 0.03 * (C.h2(Math.floor(t * 5), 6.1) - 0.5) * ctx.flux;
        cam.pos[2] = 0;
        cam.target[0] = 0; cam.target[1] = 1.30 + 0.10 * ctx.rms; cam.target[2] = -14;
        cam.fov = 0.95 + 0.06 * ctx.flux;
        cam.roll = 0.016 * ctx.flux * (C.h2(Math.floor(t * 4), 9.3) - 0.5) + 0.010 * ctx.beat.pulse;
      }
      cam.update();

      /* --------------------------------------------- six numbers, six layouts */
      if (di >= 0) {
        tk = t - st.countT[di];
        pop = clamp(tk / 0.14, 0, 1);
        ease = Ease.outCubic(pop);
        num = "0" + (di + 1);
        wcol = "rgba(255,255,255,0.96)";
        hud.T(W * 0.5, 92, "COUNT " + num + " / 06", {
          size: 12, color: gcss, align: "center", alpha: inn, spacing: 3.0
        });
        hud.T(W * 0.5, 112, COUNT_CAP[di], {
          size: 10, color: ctx.col.faint, align: "center", alpha: 0.8 * inn, spacing: 1.6
        });
        if (di === 0) {
          Ch.rule(ctx, W * 0.5 - 420, 250, 840, { alpha: inn });
          hud.T(W * 0.5, 590 + (1 - ease) * 26, "EIN", {
            size: 150, color: wcol, weight: 700, align: "center", alpha: ease * inn,
            spacing: 14, glow: gcss, blur: 30
          });
          hud.T(W * 0.5, 700, "ONE · CENTRED", { size: 10, color: ctx.col.faint, align: "center", alpha: 0.8 * inn, spacing: 2.4 });
        } else if (di === 1) {
          Ch.rule(ctx, 140, 250, 700, { alpha: inn });
          hud.T(140 + (1 - ease) * -160, 560, "DOS", {
            size: 132, color: wcol, weight: 700, alpha: ease * inn, spacing: 10, glow: gcss, blur: 24
          });
          hud.T(W - 140, 250, "TWO · LEFT", { size: 10, color: gcss, align: "right", alpha: 0.75 * inn, spacing: 2.4 });
        } else if (di === 2) {
          letters = "TROIS";
          for (i = 0; i < letters.length; i++) {
            ok = clamp((tk - i * 0.035) / 0.16, 0, 1);
            hud.T(300, 300 + i * 96 + (1 - Ease.outCubic(ok)) * 24, letters.charAt(i), {
              size: 66, color: wcol, weight: 700, alpha: ok * inn, spacing: 2
            });
          }
          hud.line(392, 268, 392, 268 + 5 * 96 - 30, { color: gcss, lw: 2, alpha: inn });
          hud.T(300, 268 + 5 * 96 + 16, "THREE · STACKED", { size: 10, color: gcss, alpha: 0.75 * inn, spacing: 2.4 });
        } else if (di === 3) {
          c2 = hud.fc;
          c2.save();
          c2.textAlign = "center";
          c2.textBaseline = "alphabetic";
          c2.font = hud.fontStr(206, "mono", 700);
          c2.globalAlpha = ease * inn;
          c2.lineWidth = 3;
          c2.strokeStyle = gcss;
          c2.strokeText("NE", W * 0.5, 640);
          c2.globalAlpha = ease * inn * 0.5;
          c2.lineWidth = 1;
          c2.strokeStyle = "rgba(255,255,255,0.7)";
          c2.strokeText("NE", W * 0.5 - 3, 643);
          c2.restore();
          hud.T(W * 0.5, 700, "FOUR · OUTLINE", {
            size: 10, color: ctx.col.faint, align: "center", alpha: 0.8 * inn, spacing: 2.4
          });
        } else if (di === 4) {
          bw = 1520 * ease;
          hud.rect(W * 0.5 - bw * 0.5, 452, bw, 148, { fill: "rgba(240,244,248,0.94)", alpha: inn });
          hud.T(W * 0.5, 566, "FEM", {
            size: 104, color: "#05070a", weight: 700, align: "center", alpha: ease * inn, spacing: 12
          });
          hud.T(W * 0.5, 630, "FIVE · INVERTED", {
            size: 10, color: gcss, align: "center", alpha: 0.85 * inn, spacing: 2.4
          });
        } else {
          hud.T(W * 0.5 + 330, 566 + (1 - ease) * 18, "LIU", {
            size: 20, color: wcol, weight: 700, align: "center", alpha: ease * inn, spacing: 3
          });
          hud.line(W * 0.5 + 300, 572, W * 0.5 + 360, 572, { color: gcss, alpha: ease * inn });
          hud.line(W * 0.5 + 330, 542, W * 0.5 + 330, 602, { color: gcss, alpha: ease * inn });
          hud.T(W * 0.5 - 60, 572, "06", {
            size: 96, color: wcol, weight: 700, align: "right", alpha: ease * inn, spacing: 4
          });
          hud.T(W * 0.5 - 60, 602, "SIX · VERY SMALL, VERY CLOSE", {
            size: 10, color: gcss, align: "right", alpha: 0.8 * inn, spacing: 1.6
          });
        }
        hud.T(64, 908, "2026 · GPU CLUSTER · LIQUID COOLING · 32,768 ACCELERATORS", {
          size: 9.5, color: ctx.col.faint, alpha: 0.45 * inn, spacing: 1.3
        });
      }

      /* -------------------------------------------------------- the giant word */
      if (di < 0) {
        best = -1; bt = 0;
        for (i = 0; i < 12; i++) if (t >= st.execT[i]) { best = i; bt = t - st.execT[i]; }
        if (t >= st.tLast) { best = 12; bt = t - st.tLast; }
        if (best >= 0 && bt < 0.62) {
          if (bt < 0.09) {
            sz = 208 * lerp(1.35, 1.0, Ease.outCubic(bt / 0.09));
            aa = clamp(bt / 0.03, 0, 1);
            yy = 500; sp2 = 12;
          } else if (bt < 0.15) {
            sz = 208; aa = 1; yy = 500; sp2 = 12;
            for (i = 1; i <= 3; i++) {
              hud.T(W * 0.5, yy, "EXECUTION", {
                size: sz + i * 16, color: Ch.hexA(main, 0.5), weight: 700, align: "center",
                alpha: 0.22 * (1 - i / 4) * inn, spacing: sp2
              });
            }
          } else {
            u3 = Ease.inCubic(clamp((bt - 0.15) / 0.42, 0, 1));
            sz = lerp(208, 30, u3);
            yy = lerp(500, 470, u3);
            sp2 = lerp(12, 2, u3);
            aa = 1 - clamp((bt - 0.15) / 0.47, 0, 1);
          }
          hud.T(W * 0.5, yy, "EXECUTION", {
            size: sz, color: "rgba(255,255,255,0.97)", weight: 700, align: "center",
            alpha: aa * inn, spacing: sp2, glow: gcss, blur: 30
          });
          if (bt < 0.2) {
            hud.rect(0, yy - sz * 0.72, W, sz * 0.10, { fill: Ch.hexA(main, 0.20 * (1 - bt / 0.2)), alpha: inn });
            hud.rect(0, yy + sz * 0.10, W, sz * 0.06, { fill: Ch.hexA(alt, 0.16 * (1 - bt / 0.2)), alpha: inn });
          }
        }
      }

      /* ------------------------------------------------------------- readouts */
      if (di < 0 && t < AISLE_END + 0.4) {
        rows = 0;
        for (i = 0; i < 12; i++) if (t >= st.execT[i]) rows = i + 1;
        u4 = clamp((t - S11) / (AISLE_END - S11), 0, 1);
        Ch.panel(ctx, W - 450, 104, 386, 214, "CLUSTER · LIVE", { alpha: inn * 0.92, right: "NODE 11" });
        Ch.gauge(ctx, W - 430, 150, 346, "FLOPS  1.2 → 48", lerp(1.2, 48.0, Ease.inOutQuad(u4)).toFixed(1), "EF", u4,
                 { ticks: 4, alpha: inn, dp: 1 });
        Ch.gauge(ctx, W - 430, 192, 346, "POWER  8 → 12", lerp(8.0, 12.0, u4).toFixed(1), "MW", u4,
                 { ticks: 4, alpha: inn, dp: 1 });
        Ch.gauge(ctx, W - 430, 234, 346, "TOKENS/s  0.6 → 4.1", lerp(0.6, 4.1, u4).toFixed(2), "M", u4,
                 { ticks: 4, alpha: inn, dp: 2 });
        Ch.gauge(ctx, W - 430, 276, 346, "GPUs", "32,768", "", clamp(rows / 12, 0, 1),
                 { ticks: 6, alpha: inn, dp: 0 });
        tr2 = st.travel(t) + 0.45 * ctx.flux;
        spd2 = (st.travel(t) - st.travel(t - 0.08)) / 0.08 + 6 * ctx.flux;
        hud.T(64, 866, "ROW " + zpad(rows, 2) + " / 12 IGNITED", {
          size: 13, color: rows >= 12 ? rcss : gcss, alpha: inn, spacing: 1.8
        });
        hud.T(64, 890, "AISLE " + tr2.toFixed(1) + " M   ·   SPEED " + spd2.toFixed(1) +
              " M/S   ·   FRONT " + Math.max(0, (st.frontRow(t) - tr2 / PITCH) * PITCH).toFixed(1) + " M", {
            size: 10.5, color: ctx.col.dim, alpha: 0.85 * inn
          });
        hud.T(W - 64, 890, "EXECUTION " + zpad(rows, 2) + " / 12", {
          size: 12, color: gcss, align: "right", alpha: inn, spacing: 2.0
        });
      }
      if (t >= AISLE_END) {
        var on = C.smoothstep(st.countT[5] + 0.70, st.countT[5] + 0.86, t);
        hud.T(64, 866, "OUTSIDE · NIGHT", { size: 13, color: gcss, alpha: inn, spacing: 2.2 });
        hud.T(64, 890, "ALL LIGHTS ON", {
          size: 11, color: on > 0.5 ? "rgba(255,255,255,0.95)" : ctx.col.dim, alpha: inn, spacing: 2.4
        });
        hud.T(W - 64, 890, "THE SOUND OF A DATA CENTRE", {
          size: 10.5, color: Ch.hexA(main, 0.75), align: "right", alpha: 0.8 * inn, spacing: 1.6
        });
      }
      if (ctx.lyric) {
        hud.T(W - 64, 126, "VOCAL ▸ " + upper(ctx.lyric.text), {
          size: 11, color: Ch.hexA(main, 0.8), align: "right", alpha: 0.7 * inn, spacing: 1.6
        });
      }

      /* ------------- cut hits: one per number, never more than four a second */
      if (di >= 0 && di !== st.hitDetail && local > 0.5) {
        tk2 = t - st.countT[di];
        if (tk2 >= 0 && tk2 < 0.20) ctx.fx.hit(0.5);
        st.hitDetail = di;
      }
      ign = st.frontRow(t);
      for (i = 0; i < 12; i++) {
        if (st.row[i] === ign && t - st.execT[i] >= 0 && t - st.execT[i] < 0.10) {
          ctx.fx.glitch = Math.max(ctx.fx.glitch, 0.14);
        }
      }
      ctx.fx.mood([0.42, 0.26, 0.09], [0.06, 0.012, 0.006], 0.62 + 0.20 * inn);
    },

    draw3d: function (ctx) {
      var st = this.st, t = ctx.t, gfx = ctx.gfx, local = ctx.local;
      var main = Ch.css(t), alt = Ch.css2(t);
      var gold = Ch.rgb(main), red = Ch.rgb(alt);
      var pts = st.pts, ln = st.ln;
      var i, tr, spd, rowBase, mod, front, qD, qG, dark, go, ro, z, R, dep, fade, lit, ig, s2;
      var sx, cfx, hw, hh, hd, hh2, kk, L, ly, band, on, cz, ti2, tz, tf, sk, kx, ky, kz, kl;
      var uo, onAll, litN, sN, s3, sxx, syy, szz, rr, tw, n2, tw2, x0, x1, z0, z1, y1, ec, wI;
      var wx2, wy2, wz2, won, base, a2, ang, b, a3, ca, sa2, R1, R2, mx2, my2, ux2, uy2, vx2, vy2;
      var ag, gx2, gy2, rg2, ra2, ra3, gr, ga, a4, a5, f2, path3, p4, a6, b6, ph3, ii2, lp, lq, ff;
      var lx2, ly2, lz2, bnd, p5, pipe, p6, c3, d3, q2, fq, iq, mq, nq, fq2, CO, RO, ci, ri, lx3, ly3;
      var band2, thr, on2, cl, bb, byy, ins, ix, nz, ar, ax2, ay2, dy2, dx3, px2, py2, active, pv, fin, fy;
      var cc, cx2, cap, kx2;
      pts.clear(); ln.clear();
      st.qDark.clear(); st.qGlow.clear();
      var di = st.detailAt(t);

      if (di < 0 && t < AISLE_END) {
        /* ================================================== the endless aisle */
        tr = st.travel(t) + 0.45 * ctx.flux;
        spd = (st.travel(t) - st.travel(t - 0.08)) / 0.08 + 6 * ctx.flux;
        rowBase = Math.floor(tr / PITCH);
        mod = tr - rowBase * PITCH;
        front = st.frontRow(t);
        qD = st.qDark; qG = st.qGlow;
        dark = [0.030, 0.036, 0.046];
        go = gold; ro = red;

        for (i = 0; i < NSLOT; i++) {
          z = mod - (i + 1.5) * PITCH;                 // never inside the near plane
          R = rowBase + i + 1;
          dep = clamp(-z / 44, 0, 1);
          fade = Math.pow(1 - dep, 1.35) * C.smoothstep(0.7, 2.4, -z);
          if (fade < 0.02) continue;
          lit = R <= front;
          ig = lit ? clamp(1 - (t - st.ignAt(R)) / 0.55, 0, 1) : 0;
          for (s2 = 0; s2 < 2; s2++) {
            sx = s2 === 0 ? -1.72 : 1.72;
            cfx = sx + (s2 === 0 ? 0.62 : -0.62);
            hw = 0.62; hd = 0.55;
            hh2 = 1.25 - 0.02 * ctx.rms;
            hh = hh2;
            qD.add(faceMat(cfx, hh, z, 0, 0, 2 * hd, 0, 2 * hh, 0), RECT1,
                   [dark[0], dark[1], dark[2], 0.94 * fade]);
            qD.add(faceMat(sx, 2 * hh, z, 2 * hw, 0, 0, 0, 0, 2 * hd), RECT1,
                   [dark[0] * 1.5, dark[1] * 1.5, dark[2] * 1.6, 0.90 * fade]);
            qD.add(faceMat(sx, hh, z + hd, 2 * hw, 0, 0, 0, 2 * hh, 0), RECT1,
                   [dark[0] * 1.2, dark[1] * 1.2, dark[2] * 1.3, 0.90 * fade]);
            if (lit) {
              kk = (0.42 + 0.58 * ig) * fade;
              qG.add(faceMat(cfx + (s2 === 0 ? 0.004 : -0.004), hh, z, 0, 0, 2 * hd, 0, 2 * hh, 0), RECT1,
                     [go[0] * 0.30, go[1] * 0.20, go[2] * 0.06, 0.55 * kk]);
              qG.add(faceMat(cfx + (s2 === 0 ? 0.008 : -0.008), 1.94, z, 0, 0, 1.55, 0, 0.11, 0), RECT1,
                     [go[0], go[1] * 0.75, go[2] * 0.35, 0.85 * kk]);
              qG.add(faceMat(cfx + (s2 === 0 ? 0.008 : -0.008), 0.34, z, 0, 0, 1.55, 0, 0.05, 0), RECT1,
                     [ro[0], ro[1], ro[2], 0.70 * kk]);
            }
            for (L = 0; L < 6; L++) {
              ly = 0.50 + L * 0.30;
              band = ctx.bands[(L * 9 + i * 3) % 64];
              on = lit ? (0.35 + 0.65 * clamp(band * 2.4, 0, 1)) : 0.10;
              _C3[0] = lit ? go[0] : 0.35;
              _C3[1] = lit ? go[1] * (0.55 + 0.45 * band) : 0.10;
              _C3[2] = lit ? go[2] * 0.4 : 0.12;
              pts.add(cfx + (s2 === 0 ? 0.02 : -0.02), ly, z + 0.30, PSZ * 0.0075, _C3, on * 0.9 * fade);
              _C3[0] = ro[0]; _C3[1] = ro[1]; _C3[2] = ro[2];
              pts.add(cfx + (s2 === 0 ? 0.02 : -0.02), ly, z - 0.30, PSZ * 0.0075, _C3,
                      (lit ? 0.55 : 0.08) * fade);
            }
          }
          // the ignition curtain, travelling away down the aisle
          if (lit && ig > 0.01) {
            cz = z + hd + 0.06;
            qG.add(faceMat(0, 1.30, cz, 2.30, 0, 0, 0, 2.60, 0), RECT1,
                   [go[0], go[1], go[2], 0.16 * ig * fade]);
            ln.seg(-1.30, 2.44, cz, 1.30, 2.44, cz, [go[0], go[1], go[2]], 2.4, 0.5 * ig * fade);
            ln.seg(-1.30, 0.06, cz, 1.30, 0.06, cz, [ro[0], ro[1], ro[2]], 2.0, 0.4 * ig * fade);
          }
        }
        qD.draw(gfx, null, { depthWrite: true });
        // floor, trays, and the ties between them
        ln.seg(-1.06, 0.005, 0.6, -1.06, 0.005, -NSLOT * PITCH, [0.20, 0.16, 0.09], 2.0, 0.55);
        ln.seg(1.06, 0.005, 0.6, 1.06, 0.005, -NSLOT * PITCH, [0.20, 0.16, 0.09], 2.0, 0.55);
        ln.seg(-0.80, 2.72, 0.6, -0.80, 2.72, -NSLOT * PITCH, [0.10, 0.11, 0.13], 2.0, 0.45);
        ln.seg(0.80, 2.72, 0.6, 0.80, 2.72, -NSLOT * PITCH, [0.10, 0.11, 0.13], 2.0, 0.45);
        for (ti2 = 0; ti2 < NSLOT; ti2++) {
          tz = mod - (ti2 + 1.5) * PITCH;
          tf = Math.pow(1 - clamp(-tz / 44, 0, 1), 1.4) * C.smoothstep(0.7, 2.4, -tz);
          if (tf < 0.03) continue;
          ln.seg(-1.06, 0.005, tz, 1.06, 0.005, tz, [0.26, 0.21, 0.11], 1.4, 0.30 * tf);
          ln.seg(-0.80, 2.72, tz, 0.80, 2.72, tz, [0.14, 0.15, 0.17], 1.2, 0.22 * tf);
        }
        // speed streaks, sized by the real scroll speed
        for (sk = 0; sk < 90; sk++) {
          kx = (C.h2(sk * 1.7, 2.3) * 2 - 1) * 1.02;
          ky = 0.15 + C.h2(sk * 3.1, 5.7) * 2.35;
          kz = -(1.2 + C.h2(sk * 5.3, 8.1) * (NSLOT - 1.2)) * PITCH;
          kl = clamp(spd * 0.045, 0.05, 0.9);
          ln.seg(kx, ky, kz, kx, ky, kz - kl, [gold[0] * 0.8, gold[1] * 0.6, gold[2] * 0.3], 1.4,
                 0.05 + 0.16 * clamp(spd / 12, 0, 1));
        }
        qG.draw(gfx, null, { add: true, depthWrite: false });
        ln.draw(gfx, { add: true, glow: 0.5 });
        pts.draw(gfx, { add: true, soft: 0.6 });
      } else if (di < 0) {
        /* =============================================== outside: the skyline */
        uo = clamp((t - AISLE_END) / (S11_END - AISLE_END), 0, 1);
        onAll = C.smoothstep(st.countT[5] + 0.70, st.countT[5] + 0.86, t);
        litN = Ch.litCount(t);
        sN = Math.min(880, Math.round(420 + litN * 18 + 120 * uo));
        for (s3 = 0; s3 < sN; s3++) {
          sxx = st.star[s3 * 3]; syy = st.star[s3 * 3 + 1]; szz = st.star[s3 * 3 + 2];
          rr = 240 + C.h2(s3 * 2.7, 3.3) * 120;
          tw = 0.45 + 0.55 * C.h2(s3 * 1.1, Math.floor(t * 3));
          _C3[0] = 0.72; _C3[1] = 0.78; _C3[2] = 0.88;
          pts.add(sxx * rr, Math.max(4, syy * rr), szz * rr - 40, PSZ * 0.006, _C3,
                  0.35 * tw * (0.5 + 0.5 * onAll));
        }
        for (n2 = 0; n2 < st.towers.length; n2++) {
          tw2 = st.towers[n2];
          x0 = tw2.x - tw2.w * 0.5; x1 = tw2.x + tw2.w * 0.5;
          z0 = tw2.z - tw2.d * 0.5; z1 = tw2.z + tw2.d * 0.5;
          y1 = tw2.h;
          ec = [0.16, 0.19, 0.24];
          ln.seg(x0, y1, z1, x1, y1, z1, ec, 1.4, 0.5);
          ln.seg(x0, 0, z1, x0, y1, z1, ec, 1.4, 0.5);
          ln.seg(x1, 0, z1, x1, y1, z1, ec, 1.4, 0.5);
          ln.seg(x0, 0, z0, x0, y1, z0, ec, 1.2, 0.3);
          ln.seg(x1, 0, z0, x1, y1, z0, ec, 1.2, 0.3);
          ln.seg(x0, y1, z0, x1, y1, z0, ec, 1.2, 0.3);
          ln.seg(tw2.x, y1, z1, tw2.x, y1 + 6.0, z1, [0.9, 0.25, 0.22], 2.0, 0.55);
          _C3[0] = 1.0; _C3[1] = 0.22; _C3[2] = 0.18;
          pts.add(tw2.x, y1 + 6.2, z1, PSZ * 0.02, _C3, 0.55 + 0.45 * (0.5 + 0.5 * ctx.beat.pulse));
        }
        for (wI = 0; wI < st.winN; wI++) {
          wx2 = st.win[wI * 4]; wy2 = st.win[wI * 4 + 1];
          wz2 = st.win[wI * 4 + 2]; won = st.win[wI * 4 + 3];
          base = won > 0.42 ? 0.55 : 0.16;
          a2 = base * (0.55 + 0.45 * onAll) + 0.75 * onAll;
          _C3[0] = 1.0;
          _C3[1] = 0.86 - 0.20 * (1 - onAll);
          _C3[2] = 0.62 - 0.34 * (1 - onAll);
          pts.add(wx2, wy2, wz2, PSZ * 0.0075, _C3, clamp(a2, 0, 1) * 0.85);
        }
        ln.seg(-160, 0.6, -120, 160, 0.6, -120, [0.20, 0.17, 0.12], 2.0, 0.35);
        pts.draw(gfx, { add: true, soft: 0.7 });
        ln.draw(gfx, { add: true, glow: 0.4 });
      } else {
        /* ================================================= six machine close-ups */
        ang = t * (0.9 + 1.5 * clamp(ctx.rms, 0, 1)) + 0.35 * ctx.beat.pulse;
        if (di === 0) {
          /* 01 impeller */
          for (b = 0; b < 9; b++) {
            a3 = ang + b * TAU / 9;
            ca = Math.cos(a3); sa2 = Math.sin(a3);
            R1 = 0.55; R2 = 1.95;
            mx2 = ca * (R1 + R2) * 0.5; my2 = sa2 * (R1 + R2) * 0.5;
            ux2 = ca * (R2 - R1); uy2 = sa2 * (R2 - R1);
            vx2 = -sa2 * 0.62; vy2 = ca * 0.62;
            st.qGlow.add(faceMat(mx2, my2, 0.10, ux2, uy2, 0.28, vx2, vy2, 0.34), RECT1,
                         [0.30, 0.29, 0.27, 0.85]);
            st.qGlow.add(faceMat(mx2, my2, -0.10, ux2, uy2, -0.28, vx2, vy2, -0.34), RECT1,
                         [0.17, 0.16, 0.15, 0.80]);
            ln.seg(mx2 - sa2 * 0.34, my2 + ca * 0.34, 0.12,
                   mx2 + ux2 * 0.5 - sa2 * 0.34, my2 + uy2 * 0.5 + ca * 0.34, 0.12,
                   [gold[0], gold[1] * 0.8, gold[2] * 0.4], 2.2, 0.75);
            ag = a3 - 0.16;
            gx2 = Math.cos(ag) * (R1 + R2) * 0.5; gy2 = Math.sin(ag) * (R1 + R2) * 0.5;
            st.qGlow.add(faceMat(gx2, gy2, 0.10, Math.cos(ag) * (R2 - R1), Math.sin(ag) * (R2 - R1), 0.28,
                                 -Math.sin(ag) * 0.62, Math.cos(ag) * 0.62, 0.34), RECT1,
                         [0.16, 0.15, 0.13, 0.35]);
          }
          for (rg2 = 0; rg2 < 48; rg2++) {
            ra2 = rg2 / 48 * TAU; ra3 = (rg2 + 1) / 48 * TAU;
            ln.seg(Math.cos(ra2) * 2.05, Math.sin(ra2) * 2.05, 0.22,
                   Math.cos(ra3) * 2.05, Math.sin(ra3) * 2.05, 0.22, [0.34, 0.36, 0.38], 2.0, 0.7);
            ln.seg(Math.cos(ra2) * 2.20, Math.sin(ra2) * 2.20, -0.10,
                   Math.cos(ra3) * 2.20, Math.sin(ra3) * 2.20, -0.10, [0.22, 0.24, 0.26], 2.0, 0.5);
          }
          for (gr = 1; gr <= 3; gr++) {
            for (ga = 0; ga < 10; ga++) {
              a4 = ga / 10 * TAU + gr * 0.2; a5 = (ga + 1) / 10 * TAU + gr * 0.2;
              ln.seg(Math.cos(a4) * gr * 0.55, Math.sin(a4) * gr * 0.55, -0.35,
                     Math.cos(a5) * gr * 0.55, Math.sin(a5) * gr * 0.55, -0.35, [0.20, 0.21, 0.23], 1.2, 0.35);
            }
          }
          _C3[0] = 1.0; _C3[1] = 0.85; _C3[2] = 0.5;
          pts.add(0, 0, 0.3, PSZ * 0.03, _C3, 0.9);
        } else if (di === 1) {
          /* 02 optical fabric */
          for (f2 = 0; f2 < st.fibre.length; f2++) {
            path3 = st.fibre[f2];
            for (p4 = 0; p4 + 1 < path3.length; p4++) {
              a6 = path3[p4]; b6 = path3[p4 + 1];
              ln.seg(a6[0], a6[1], a6[2], b6[0], b6[1], b6[2], [0.16, 0.20, 0.26], 3.0, 0.55);
              ln.seg(a6[0], a6[1], a6[2], b6[0], b6[1], b6[2], [0.5, 0.95, 1.0], 1.2,
                     0.20 + 0.60 * clamp(ctx.bands[(f2 * 5) % 64] * 3, 0, 1));
            }
            ph3 = (local * 0.55 + f2 * 0.13) % 1;
            ii2 = Math.min(path3.length - 2, Math.floor(ph3 * (path3.length - 1)));
            lp = path3[ii2]; lq = path3[ii2 + 1];
            ff = ph3 * (path3.length - 1) - ii2;
            lx2 = lerp(lp[0], lq[0], ff); ly2 = lerp(lp[1], lq[1], ff); lz2 = lerp(lp[2], lq[2], ff);
            bnd = clamp(ctx.bands[(f2 * 5) % 64] * 3.0, 0.05, 1);
            _C3[0] = 0.65 + 0.35 * bnd; _C3[1] = 0.95; _C3[2] = 1.0;
            pts.add(lx2, ly2, lz2, PSZ * (0.010 + 0.012 * bnd), _C3, 0.9);
            pts.add(lx2 - 0.12, ly2, lz2, PSZ * 0.008, _C3, 0.4);
          }
        } else if (di === 2) {
          /* 03 liquid cooling */
          for (p5 = 0; p5 < st.pipes.length; p5++) {
            pipe = st.pipes[p5];
            for (p6 = 0; p6 + 1 < pipe.length; p6++) {
              c3 = pipe[p6]; d3 = pipe[p6 + 1];
              ln.seg(c3[0], c3[1], c3[2], d3[0], d3[1], d3[2], [0.20, 0.26, 0.30], 6.0, 0.45);
              ln.seg(c3[0], c3[1] + 0.10, c3[2], d3[0], d3[1] + 0.10, d3[2], [0.34, 0.40, 0.44], 1.4, 0.5);
              ln.seg(c3[0], c3[1] - 0.10, c3[2], d3[0], d3[1] - 0.10, d3[2], [0.34, 0.40, 0.44], 1.4, 0.5);
            }
            for (q2 = 0; q2 < 3; q2++) {
              fq = (local * 0.7 + p5 * 0.17 + q2 * 0.33) % 1;
              iq = Math.min(pipe.length - 2, Math.floor(fq * (pipe.length - 1)));
              mq = pipe[iq]; nq = pipe[iq + 1]; fq2 = fq * (pipe.length - 1) - iq;
              _C3[0] = 0.35; _C3[1] = 0.85; _C3[2] = 1.0;
              pts.add(lerp(mq[0], nq[0], fq2), lerp(mq[1], nq[1], fq2), lerp(mq[2], nq[2], fq2),
                      PSZ * 0.012, _C3, 0.75);
            }
          }
        } else if (di === 3) {
          /* 04 status array */
          st.qDark.add(faceMat(0, 0, -0.05, 5.0, 0, 0, 0, 2.6, 0), RECT1, [0.028, 0.032, 0.038, 0.95]);
          CO = 26; RO = 13;
          for (ci = 0; ci < CO; ci++) for (ri = 0; ri < RO; ri++) {
            lx3 = -2.34 + 4.68 * ci / (CO - 1);
            ly3 = -1.14 + 2.28 * ri / (RO - 1);
            band2 = ctx.bands[(ci * 2 + ri * 5) % 64];
            thr = 0.06 + 0.30 * C.h2(ci * 1.3, ri * 2.7);
            on2 = band2 > thr;
            _C3[0] = on2 ? 1.0 : 0.22;
            _C3[1] = on2 ? 0.72 : 0.24;
            _C3[2] = on2 ? 0.30 : 0.26;
            pts.add(lx3, ly3, 0.02, PSZ * (on2 ? 0.009 : 0.005), _C3, on2 ? 0.95 : 0.35);
          }
          for (cl = 0; cl <= 4; cl++) {
            ln.seg(-2.5 + cl * 1.25, -1.30, 0.0, -2.5 + cl * 1.25, 1.30, 0.0, [0.12, 0.13, 0.15], 1.0, 0.5);
          }
        } else if (di === 4) {
          /* 05 bus bar */
          for (bb = 0; bb < 3; bb++) {
            byy = -0.62 + bb * 0.62;
            st.qGlow.add(faceMat(0, byy, 0.10, 4.6, 0, 0, 0, 0.20, 0), RECT1, [0.72, 0.42, 0.18, 0.95]);
            st.qGlow.add(faceMat(0, byy + 0.11, 0.10, 4.6, 0, 0, 0, 0.05, 0), RECT1, [1.0, 0.76, 0.42, 0.9]);
            st.qGlow.add(faceMat(0, byy, -0.02, 4.6, 0, 0, 0, 0.20, 0), RECT1, [0.30, 0.18, 0.08, 0.9]);
            for (ins = 0; ins < 7; ins++) {
              ix = -2.1 + ins * 0.7;
              st.qGlow.add(faceMat(ix, byy - 0.24, 0.10, 0.24, 0, 0, 0, 0.26, 0), RECT1, [0.24, 0.20, 0.16, 0.9]);
            }
          }
          nz = Math.floor(ctx.flux * 26);
          for (ar = 0; ar < 26; ar++) {
            ax2 = -2.2 + 4.4 * C.h2(ar * 2.3, Math.floor(local * 12));
            ay2 = -0.62 + C.h2(ar * 3.7, 1.1) * 1.24;
            if (ar < nz) {
              ln.seg(ax2, ay2, 0.12, ax2 + (C.h2(ar, 4.4) - 0.5) * 0.5, ay2 + 0.5 * C.h2(ar, 9.1), 0.12,
                     [1.0, 0.9, 0.6], 1.6, 0.7);
            }
          }
        } else {
          /* 06 accelerator board */
          M4.rotY(-0.34, st.mA);
          M4.mul(M4.rotX(0.24, st.mB), st.mA, st.mA);
          st.qDark.add(M4.compose([0, 0, -0.3], st.mA, [4.6, 2.1, 1], st.mB), RECT1, [0.045, 0.055, 0.05, 0.96]);
          for (dy2 = 0; dy2 < 2; dy2++) for (dx3 = 0; dx3 < 4; dx3++) {
            px2 = -1.35 + dx3 * 0.90;
            py2 = -0.42 + dy2 * 0.85;
            active = (ctx.beat.index % 8) === (dy2 * 4 + dx3);
            pv = 0.30 + 0.70 * (active ? clamp(ctx.beat.pulse * 1.6, 0, 1) : 0.12);
            M4.compose([px2, py2, -0.28], st.mA, [0.62, 0.62, 1], st.mB);
            st.qGlow.add(st.mB, RECT1, [0.20 + 0.5 * pv, 0.24 + 0.45 * pv, 0.22 + 0.35 * pv, 0.9]);
            for (fin = 0; fin < 5; fin++) {
              fy = py2 - 0.24 + fin * 0.12;
              ln.seg(px2 - 0.31, fy, -0.22, px2 + 0.31, fy, -0.22, [0.30, 0.34, 0.30], 1.2, 0.6);
            }
          }
          for (cc = 0; cc < 22; cc++) {
            cx2 = -2.0 + cc * 0.19;
            st.qGlow.add(faceMat(cx2, -1.02, -0.42, 0.14, 0, 0, 0, 0.16, 0), RECT1, [0.85, 0.68, 0.28, 0.85]);
          }
          for (cap = 0; cap < 10; cap++) {
            kx2 = -1.9 + cap * 0.42;
            st.qGlow.add(faceMat(kx2, 0.86, -0.30, 0.16, 0, 0, 0, 0.22, 0), RECT1, [0.22, 0.24, 0.26, 0.85]);
          }
        }
        st.qDark.draw(gfx, null, { depthWrite: true });
        st.qGlow.draw(gfx, null, { add: true, depthWrite: false });
        ln.draw(gfx, { add: true, glow: 0.55 });
        pts.draw(gfx, { add: true, soft: 0.6 });
      }
    }
  });
})();
