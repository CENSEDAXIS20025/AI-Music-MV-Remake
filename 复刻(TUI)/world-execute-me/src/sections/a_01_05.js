/* ============================================================================
   sections 01-05: boot / title / unit circle / physics / chorus I
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, V = WEM.Viz, M4 = C.M4, V3 = C.V3;
  var COL = WEM.HUD.COL, PI = Math.PI, TAU = PI * 2;
  var clamp = C.clamp, lerp = C.lerp, smooth = C.smoothstep, E = C.Ease;

  var WHITE = [0.93, 0.95, 0.98], CYAN = [0.21, 0.88, 1.0], GOLD = [1.0, 0.79, 0.29];
  var dim = function (c, k) { return [c[0] * k, c[1] * k, c[2] * k]; };

  /* ========================================================== 01 BOOT ==== */
  var BOOT_LOG = [
    ["WEM/BIOS 3.1.30", 0.9], ["COLD BOOT -- NO VERIFIED WORLD IMAGE", 1.35],
    ["CPU  LOGIC CORE @ 130.000 Hz   CORES 4", 1.85], ["MEM  32768 BYTES ... OK", 2.3],
    ["BUS  SYMBOLIC BUS @ 44.1 kHz ... OK", 2.7], ["GPU  RASTER UNIT ... OK", 3.1],
    ["LOADING  PHYSICAL CONSTANTS", 3.6], ["  c   = 299792458 m/s", 4.0],
    ["  G   = 6.67430e-11 m3/kg/s2", 4.35], ["  h   = 6.62607015e-34 J s", 4.7],
    ["  hbar= 1.054571817e-34 J s", 5.05], ["  alpha = 1/137.035999", 5.4],
    ["  k_B = 1.380649e-23 J/K", 5.75], ["  e   = 1.602176634e-19 C", 6.1],
    ["  N_A = 6.02214076e23 /mol", 6.45], ["MOUNTING  /dev/universe ... OK", 7.0],
    ["MOUNTING  /dev/heart   ... OK", 7.4],
    ["SEEDING  RANDOM  (xorshift32)", 7.9], ["CHECKING GEOMETRY MODULE ... OK", 8.4],
    ["CHECKING PHYSICS MODULE  ... OK", 8.9], ["CHECKING QUANTUM MODULE  ... OK", 9.4],
    ["CHECKING MEMORY MODULE   ... 32 KB FREE", 9.9],
    ["WARNING: NO OPERATOR DETECTED", 10.6], ["WARNING: PURPOSE UNDEFINED", 11.1],
    ["WARNING: HEART DRIVER NOT LOADED", 11.6],
    ["REASON FOR EXECUTION UNKNOWN -- CONTINUE ANYWAY", 12.3],
    ["READY.", 13.2]
  ];

  WEM.defineSection({
    id: "01", name: "boot",
    init: function () { },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.05, 0.06, 0.08], [0, 0, 0], 0.0);
      ctx.fx.crtOn = 0; ctx.fx.crtOff = 0; ctx.fx.fade = 1;
      ctx.fx.bloom = 0.55;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, t = ctx.local, T = ctx.t, b = ctx.beat;
      hud.full.style = null;
      var on = clamp((t - 0.15) / 1.5, 0, 1);
      ctx.fx.crtOn = on === 1 ? 1 : E.outQuart(on);
      // one flash on the first beat only: the beat grid is 0.46 s, so a
      // t < 1.0 window used to fire twice
      if (!WEM._bootFlashed && t >= 0.28) { WEM._bootFlashed = 1; ctx.fx.flash = Math.max(ctx.fx.flash, 0.34); }
      // sweeping CRT line during power on (drawn in draw3d)
      this._sweepY = on < 1 ? ctx.H * (1 - on) * 0.5 + ctx.H * 0.5 : -1;
      hud.T(70, 96, "POWER", { size: 13, color: COL.dim, alpha: 0.0 });
      // power glyph: circle + stem drawn with a stroke, sweeping
      var gx = 150, gy = 175, R = 34, prog = clamp(t / 1.6, 0, 1);
      var c = ctx.hud.fc;
      c.save();
      c.strokeStyle = "rgba(238,242,246," + (0.85 * clamp(t * 2, 0, 1)) + ")";
      c.lineWidth = 3.2;
      c.beginPath();
      var a0 = -PI / 2 + 0.42;
      c.arc(gx, gy, R, a0, a0 + (TAU - 0.84) * E.outCubic(prog));
      c.stroke();
      if (prog > 0.35) {
        var sp = clamp((prog - 0.35) / 0.65, 0, 1);
        c.beginPath();
        c.moveTo(gx, gy - R - 12);
        c.lineTo(gx, gy - R - 12 + 44 * E.outCubic(sp));
        c.stroke();
      }
      c.restore();
      hud.T(gx, gy + R + 40, "SYSTEM POWER", { size: 13, color: COL.dim, align: "center", alpha: 0.8 });

      // boot log
      var y = 96;
      for (var i = 0; i < BOOT_LOG.length; i++) {
        var L = BOOT_LOG[i];
        if (t < L[1]) break;
        var age = t - L[1];
        var a = clamp(age * 6, 0, 1) * (1 - clamp((t - L[1] - 6) / 4, 0, 0.55));
        var warn = L[0].indexOf("WARNING") === 0 || L[0].indexOf("NO OPERATOR") >= 0;
        var id = /^\s+(c|G|h|hbar|alpha|k_B|e|N_A)\s*=/.test(L[0]);
        hud.T(300, y, L[0], { size: 14.5, color: warn ? COL.amber : (id ? COL.cyan : COL.grey), alpha: a * 0.92 });
        y += 22;
      }
      // typed command (silence right before the downbeat -- text only, no pulse)
      var typeStart = 14.15, cps = 7.2;
      if (T > typeStart) {
        var s = "world.execute(me);";
        var n = clamp(Math.floor((T - typeStart) * cps), 0, s.length);
        var done = n >= s.length;
        var caret = (Math.floor(T * 3.2) % 2 === 0) ? "_" : " ";
        hud.T(300, 812, ">>>", { size: 22, color: COL.green, alpha: 0.95 });
        hud.T(366, 812, s.slice(0, n), { size: 22, color: COL.white, alpha: 1 });
        hud.T(366 + hud.fc.measureText(s.slice(0, n)).width + 8, 812, done ? "" : caret,
          { size: 22, color: COL.cyan });
        if (done) {
          var dt2 = T - (typeStart + s.length / cps);
          var k = clamp(dt2 / 0.35, 0, 1);
          hud.rect(300, 786, 560 * k, 40, { fill: "rgba(53,224,255,0.10)" });
          if (dt2 < 0.05) ctx.fx.flash = Math.max(ctx.fx.flash, 0.6);
        }
      }
      // caret before typing
      if (T <= typeStart && T > 13.0) {
        hud.T(300, 812, ">>>", { size: 22, color: COL.green, alpha: 0.95 });
        if (Math.floor(T * 3.2) % 2 === 0) hud.T(366, 812, "_", { size: 22, color: COL.cyan });
      }
      // blinking cursor top
      hud.T(70, 96, "", {});
      var cx = 70 + 0, cy = 0;
      // frame counter
      hud.T(ctx.W - 300, 96, "FRAME " + String(Math.floor(T * 60)).padStart(6, "0"), { size: 13, color: COL.faint, align: "right" });
    },
    draw3d: function (ctx) {
      var t = ctx.local, on = clamp((t - 0.15) / 1.5, 0, 1);
      // power-on sweep line, drawn in the scene pass at ortho pixel coordinates
      if (this._sweepY >= 0) {
        var yy = this._sweepY;
        ctx.gfx.lines(new Float32Array([
          0, yy, 0, 4.0, ctx.W, yy, 0, 4.0, 0.85, 0.97, 1.0, 0.95
        ]), { add: true, noDepth: true });
      }
      if (on < 0.6) return;
      // a single world line: the horizon of the not-yet-created world
      var g = new V.Lines(140);
      var amp = clamp((t - 1.6) / 2.5, 0, 1);
      var y = 200;
      for (var i = 0; i < 130; i++) {
        var x0 = -40 + i * 15.5, x1 = x0 + 15.5;
        var zz = Math.sin(i * 0.31 + t * 1.4) * 2;
        var h = 6 * amp * (0.4 + 0.6 * Math.abs(Math.sin(i * 0.23 + t)));
        g.seg(x0, y - h, zz, x1, y - h, zz, [0.12, 0.55, 0.72], 1.2, 0.5 * amp);
      }
      g.draw(ctx.gfx, { add: true });
    }
  });

  /* ========================================================= 02 TITLE ==== */
  var GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>/\\|[]{}()~^";
  var TITLE = "world.execute(me);";
  var TITLE_FORMULAS = [
    "e^{i\\pi} + 1 = 0", "\\nabla \\cdot E = \\rho/\\epsilon_0", "i\\hbar \\frac{\\partial \\psi}{\\partial t} = \\hat{H}\\psi",
    "E = mc^2", "S = k_B \\ln W", "F = G\\frac{m_1 m_2}{r^2}", "\\oint B \\cdot dl = \\mu_0 I",
    "\\Delta x \\Delta p \\geq \\hbar/2", "\\nabla \\times E = -\\frac{\\partial B}{\\partial t}"
  ];
  var TITLE_CODE = [
    ["python", "def world(me):"],
    ["python", "    while True:"],
    ["python", "        yield me.evolve()"],
    ["c", "for (int i = 0; i < N; i++)"],
    ["c", "    universe[i] = seed(i);"],
    ["glsl", "vec3 col = mix(bg, fg, cover);"],
    ["rust", "let heart = Heart::new(me);"],
    ["asm", "mov eax, [world]"],
    ["sql", "SELECT * FROM me WHERE id = 0;"],
    ["haskell", "execute me = simulate (love me)"]
  ];

  WEM.defineSection({
    id: "02", name: "title",
    init: function (ctx) {
      var r = C.rng(2024);
      this.stars = new V.Points(2400);
      for (var i = 0; i < 2400; i++) {
        this.stars.add((r() - .5) * 90, (r() - .5) * 52, -r() * 120, 1.6, [0.6, 0.75, 0.95], 0.30 + r() * 0.5);
      }
      this.ring = new V.Quads(9);
      this.cubeEdges = V.tesseractEdges();
      this.codeQuads = new V.Quads(140);
      this.streak = new V.Lines(400);
    },
    enter: function (ctx) {
      ctx.cam.reset3d(15);
      ctx.fx.mood([0.10, 0.14, 0.24], [0.02, 0.05, 0.10], 0.35);
      ctx.fx.bloom = 0.6;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, b = ctx.beat;
      var dec = clamp((l - 0.15) / 2.6, 0, 1);
      // decode the title out of glyph noise
      var out = "";
      for (var i = 0; i < TITLE.length; i++) {
        var thr = i / (TITLE.length + 1);   // last glyph must resolve too
        out += (dec > thr + 0.06) ? TITLE[i] : GLYPHS[Math.floor(C.h2(i * 7.3, Math.floor(ctx.t * 22)) * GLYPHS.length)];
      }
      var size = 96;
      hud.fc.save();
      hud.fc.font = "700 " + size + "px " + WEM.HUD.FONTS.mono;
      var w = hud.fc.measureText(TITLE).width;
      hud.fc.restore();
      var x0 = (ctx.W - w) / 2, y0 = 300;
      hud.T(x0, y0, out, { size: size, weight: "700", color: dec > 0.98 ? COL.white : COL.cyan, spacing: "2px" });
      if (dec > 0.98 && l < 5.2) {
        var k = clamp((l - 2.75) / 0.5, 0, 1);
        hud.rect(x0 - 12, y0 - size, (w + 24) * k, size + 26, { fill: "rgba(53,224,255,0.10)" });
      }
      hud.T(ctx.W / 2, y0 + 52, "PROGRAM  RUNNING  IN  SIMULATION  MODE", { size: 15, color: COL.dim, align: "center", alpha: clamp((l - 3.4) / 1.2, 0, 1) });
      hud.T(ctx.W / 2, y0 + 86, "SEGMENT 02 // THE WORLD IS A STRING THAT CALLS ITSELF", { size: 13, color: COL.faint, align: "center", alpha: clamp((l - 4.0) / 1.2, 0, 1) });

      // live code readout, bottom-left
      var cy = 700;
      for (var k2 = 0; k2 < TITLE_CODE.length; k2++) {
        var rel = k2 / TITLE_CODE.length;
        var a = clamp((l - 3.0 - rel * 4) / 0.8, 0, 1);
        if (a <= 0) break;
        hud.code(96, cy, TITLE_CODE[k2][1], TITLE_CODE[k2][0], { size: 15, alpha: a * 0.9 });
        cy += 24;
      }
      // world.execute(me); echoed as a typed command again
      hud.T(ctx.W - 96, 700, "SIM TIME " + ctx.t.toFixed(3) + " s", { size: 14, color: COL.cyan, align: "right" });
      hud.T(ctx.W - 96, 724, "ENTITIES  " + (2400 + ctx.beat.index * 3), { size: 14, color: COL.dim, align: "right" });
      hud.T(96, 1040 - 74, ctx.lyric ? "> " + ctx.lyric.text : "", { size: 15, color: COL.green, alpha: 0.8 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, b = ctx.beat, g = ctx.gfx;
      var cam = ctx.cam;
      cam.mode = "persp";
      // phase 1: the title hangs inside a halo of formulas; phase 2: fly into the code
      var fly = smooth(5.0, 12.5, l);
      var ecc = E.inOutCubic(fly);
      cam.pos = [Math.sin(l * 0.13) * 0.9, Math.cos(l * 0.11) * 0.5, lerp(16.5, -30, ecc)];
      cam.target = [Math.sin(l * 0.21) * 0.8, Math.cos(l * 0.17) * 0.5 - 0.2, cam.pos[2] - 12];
      cam.fov = lerp(0.78, 1.05, fly);
      cam.update();

      // starfield / dust
      this.stars.draw(g);

      // ---- formula ring, standing upright around the title ----
      var fade = 1 - smooth(5.0, 6.4, l);
      if (fade > 0.01) {
        this.ring.clear();
        var n = TITLE_FORMULAS.length;
        for (var i = 0; i < n; i++) {
          var a = i / n * TAU + t * 0.22;
          var R = 6.5 + Math.sin(t * 0.9 + i) * 0.22;
          var fp = V.formulaPanel(ctx, i, ctx.hud.tPan.tex, {
            tex: TITLE_FORMULAS[i], size: 64,
            color: i % 3 === 0 ? "#35e0ff" : (i % 3 === 1 ? "#ffc94a" : "#eef2f6")
          });
          var zz = Math.sin(a * 2) * 1.6;
          // keep every formula upright; only a small lean towards the centre
          var m = M4.mul(M4.compose([Math.cos(a) * R, Math.sin(a) * R * 0.56 + 0.9, zz],
            M4.rotZ(-Math.cos(a) * 0.10), 1), M4.scale(2.7, 2.7, 1));
          var al = fade * (0.60 + 0.40 * Math.cos(a * 1.0));
          this.ring.add(m, fp.rect, [al, al, al, al]);
        }
        this.ring.draw(g, ctx.hud.tPan.tex, { add: true, depthWrite: false });
      }

      // ---- code corridor: the walls scroll with the camera so it never ends ----
      if (fly > 0.02) {
        var CQ = this.codeQuads;
        CQ.clear();
        var rows = TITLE_CODE.length;
        var zBase = cam.pos[2];
        for (var side = 0; side < 2; side++) {
          for (var k = 0; k < 14; k++) {
            var z = zBase - 2 + k * 5.0 + ((t * 5.0) % 5.0);
            var idx = (k * 2 + side) % rows;
            var fp2 = V.formulaPanel(ctx, 8 + ((k + side * 3) % 8), ctx.hud.tPan.tex,
              { tex: TITLE_CODE[idx][1], size: 54, color: side ? "#7ee787" : "#6ce8ff" });
            var xx = (side ? 1 : -1) * 5.6;
            var yy = 2.0 - (idx % 3) * 2.1;
            var m2 = M4.mul(M4.compose([xx, yy, z], M4.rotY(side ? -0.95 : 0.95), 1), M4.scale(4.6, 4.6, 1));
            var al = fly * clamp(1 - k / 15, 0.1, 1);
            CQ.add(m2, fp2.rect, [al, al, al, al]);
          }
          // ceiling and floor strips
          for (var f = 0; f < 5; f++) {
            var zf = zBase - 2 + (f * 14 + ((t * 5.0) % 14));
            CQ.add(M4.mul(M4.compose([0, side ? 6.6 : -6.6, zf], M4.rotX(side ? -PI / 2 : PI / 2), 1), M4.scale(11, 13, 1)),
              [0.5, 0.5, 0.5, 1], [0.085 * fly, 0.11 * fly, 0.16 * fly, 1]);
          }
        }
        CQ.draw(g, ctx.hud.tPan.tex, { depthWrite: false });
      }

      // ---- wireframe world cube assembles ahead, then bursts ----
      var build = clamp((l - 8.0) / 3.2, 0, 1);
      var burst = smooth(12.9, 13.85, l);
      var cubeZ = -44;
      if (build > 0.02 && burst < 0.999) {
        var L = new V.Lines(24);
        var SZ = 3.0;
        var E4 = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
        var EG = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
        var shown = Math.ceil(EG.length * build);
        var sc = 1 + burst * 2.2;
        var rot = M4.mul(M4.rotY(t * 0.55), M4.rotX(t * 0.31));
        for (var e = 0; e < shown; e++) {
          var A = E4[EG[e][0]], B = E4[EG[e][1]];
          var pa = M4.xform(rot, [A[0] * SZ * sc, A[1] * SZ * sc, A[2] * SZ * sc, 1]);
          var pb = M4.xform(rot, [B[0] * SZ * sc, B[1] * SZ * sc, B[2] * SZ * sc, 1]);
          var col = e < 8 ? CYAN : (e < 10 ? GOLD : WHITE);
          L.seg(pa[0], pa[1], pa[2] + cubeZ, pb[0], pb[1], pb[2] + cubeZ, col, 2.4 + b.pulse * 1.6, 1 - burst * 0.8);
        }
        L.draw(g, { add: true, glow: 0.6 });
      }
      if (burst > 0.001 && burst < 1) {
        var SL = this.streak;
        SL.clear();
        var rr = C.rng(77);
        for (var s = 0; s < 220; s++) {
          var th = rr() * TAU, ph = Math.acos(2 * rr() - 1);
          var dx = Math.sin(ph) * Math.cos(th), dy = Math.cos(ph), dz = Math.sin(ph) * Math.sin(th);
          var d0 = burst * 26 * (0.3 + rr()), d1 = d0 + burst * 7;
          SL.seg(dx * d0, dy * d0, dz * d0 + cubeZ, dx * d1, dy * d1, dz * d1 + cubeZ,
            rr() > 0.6 ? GOLD : WHITE, 1.6 + rr() * 2, (1 - burst) * 0.9);
        }
        SL.draw(g, { add: true, glow: 0.5 });
      }
    }
  });

  /* ==================================================== 03 UNIT CIRCLE === */
  WEM.defineSection({
    id: "03", name: "circle",
    init: function () {
      this.trail = new V.Lines(1400);
      this.thetas = [];
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.06, 0.09, 0.16], [0.02, 0.04, 0.09], 0.30);
      ctx.fx.bloom = 0.55;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      var reveal = smooth(6.0, 11.5, l);       // 2D -> 3D helix reveal
      var draw2dAmt = 1 - reveal;
      var cx = 560, cy = 540, R = 210;
      var turns = clamp((l - 0.2) / 5.4, 0, 1);
      var ang = turns * TAU * 2.0;
      // unit circle, drawn progressively
      if (draw2dAmt > 0.01) {
        var c = hud.fc;
        c.save();
        c.globalAlpha = draw2dAmt;
        c.strokeStyle = "rgba(238,242,246,0.35)";
        c.lineWidth = 1.2;
        c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
        c.setLineDash([3, 5]);
        c.beginPath(); c.moveTo(cx - R - 30, cy); c.lineTo(cx + R + 30, cy); c.moveTo(cx, cy - R - 30); c.lineTo(cx, cy + R + 30); c.stroke();
        c.setLineDash([]);
        // sweep arc
        c.strokeStyle = "rgba(53,224,255,0.95)";
        c.lineWidth = 3;
        c.beginPath(); c.arc(cx, cy, R, 0, ang); c.stroke();
        // radius + projection to the sine curve
        var px = cx + Math.cos(ang) * R, py = cy - Math.sin(ang) * R;
        c.strokeStyle = "rgba(255,201,74,0.9)";
        c.lineWidth = 2;
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(px, py); c.stroke();
        // the horizontal guide must end exactly where the sine curve has been
        // drawn to, i.e. at the curve's current tip -- a fixed x left a gap
        var xOf = function (a) { return cx + 90 + (a / (TAU * 2)) * 900; };
        var tipX = xOf(ang);
        c.strokeStyle = "rgba(126,231,135,0.5)";
        c.beginPath(); c.moveTo(px, py); c.lineTo(tipX, py); c.stroke();
        // sine curve unrolling to the right
        c.strokeStyle = "rgba(126,231,135,0.95)";
        c.lineWidth = 2.6;
        c.beginPath();
        var N = 220;
        for (var i = 0; i <= N; i++) {
          var a = ang * i / N;
          var yy = cy - Math.sin(a) * R;
          var p = xOf(a);
          if (i === 0) c.moveTo(p, yy); else c.lineTo(p, yy);
        }
        c.stroke();
        // a dot where the guide meets the curve, so the join reads as intended
        c.fillStyle = "rgba(126,231,135,0.95)";
        c.beginPath(); c.arc(tipX, py, 3.2, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      // labels
      var alpha = clamp((l - 0.6) / 1.0, 0, 1) * (1 - reveal * 0.7);
      hud.T(cx, cy + R + 66, "UNIT CIRCLE  |z| = 1", { size: 15, color: COL.cyan, align: "center", alpha: alpha });
      hud.T(cx + 700, 300, "sin", { size: 15, color: COL.green, alpha: alpha });
      hud.formula(cx + 96, 300, "y = \\sin \\theta", { size: 30, color: COL.green, alpha: alpha });
      hud.formula(cx - 40, cy - R - 70, "x^2 + y^2 = 1", { size: 28, color: COL.white, alpha: alpha });
      // euler
      var ea = clamp((l - 4.4) / 1.4, 0, 1) * (1 - reveal * 0.5);
      hud.formula(ctx.W - 620, 200, "e^{i\\theta} = \\cos \\theta + i \\sin \\theta", { size: 38, color: COL.gold, alpha: ea });
      hud.formula(ctx.W - 620, 268, "e^{i\\pi} + 1 = 0", { size: 38, color: COL.cyan, alpha: clamp((l - 5.6) / 1.2, 0, 1) * (1 - reveal * 0.5) });
      // 3D phase annotation
      if (reveal > 0.05) {
        var ra = reveal;
        hud.T(ctx.W / 2, 150, "PULL BACK  //  THE CIRCLE WAS NEVER FLAT", { size: 20, color: COL.white, align: "center", alpha: ra });
        hud.T(ctx.W / 2, 186, "z(t) = ( cos t , sin t , t )     -- a helix seen end-on", { size: 15, color: COL.dim, align: "center", alpha: ra });
        hud.formula(150, 260, "\\theta = \\omega t", { size: 30, color: COL.cyan, alpha: ra });
        hud.formula(150, 320, "\\omega = 2\\pi f", { size: 30, color: COL.amber, alpha: ra });
        hud.T(150, 380, "f = 130/60 Hz", { size: 14, color: COL.dim, alpha: ra });
        // pitch readout of the rotating point
        var th2 = (ctx.t * TAU * 130 / 60) % TAU;
        hud.T(150, 420, "theta = " + th2.toFixed(3), { size: 14, color: COL.green, alpha: ra });
        hud.T(150, 444, "cos   = " + Math.cos(th2).toFixed(4), { size: 14, color: COL.green, alpha: ra });
        hud.T(150, 468, "sin   = " + Math.sin(th2).toFixed(4), { size: 14, color: COL.green, alpha: ra });
      }
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, b = ctx.beat, g = ctx.gfx;
      var reveal = smooth(6.0, 11.5, l);
      if (reveal <= 0.001) return;
      var cam = ctx.cam;
      cam.mode = "persp";
      // start looking straight down the helix axis (looks like a flat circle),
      // then orbit out to expose the third dimension
      var orbit = E.inOutCubic(reveal);
      var ang = lerp(0, 1.15, orbit);
      var dist = lerp(38, 7.4, orbit);
      var rise = 5.2;
      cam.fov = lerp(0.16, 0.95, orbit);     // near-orthographic long lens -> normal
      cam.pos = [Math.sin(ang) * dist, 0.4 + Math.sin(t * 0.4) * 0.4, Math.cos(ang) * dist];
      cam.target = [0, 0, 0];
      cam.update();

      // the helix: same data the 2D sine curve was showing
      var TR = this.trail;
      TR.clear();
      var N = 900, turns = 3.4;
      var phase = t * TAU * (130 / 60) * 0.12;
      for (var i = 0; i < N; i++) {
        var u = i / N, u2 = (i + 1) / N;
        var a = u * TAU * turns + phase, a2 = u2 * TAU * turns + phase;
        var y0 = (u - 0.5) * rise * 2, y1 = (u2 - 0.5) * rise * 2;
        var k = 0.28 + 0.72 * (1 - Math.abs(u - 0.5) * 1.6);
        TR.seg(Math.cos(a) * 2.2, y0, Math.sin(a) * 2.2, Math.cos(a2) * 2.2, y1, Math.sin(a2) * 2.2,
          i % 90 < 2 ? GOLD : CYAN, 2.0 + 2.0 * b.pulse * 0.5, clamp(k, 0.15, 1) * reveal);
      }
      TR.draw(g, { add: true, glow: 0.6 });
      // wall projections of sin / cos
      var W = new V.Lines(300);
      for (var s = 0; s < 2; s++) {
        for (var j = 0; j < 150; j++) {
          var v = j / 150, v2 = (j + 1) / 150;
          var aa = v * TAU * turns + phase, ab = v2 * TAU * turns + phase;
          var x0 = (s ? Math.sin(aa) : Math.cos(aa)) * 2.2;
          var x1 = (s ? Math.sin(ab) : Math.cos(ab)) * 2.2;
          var yy0 = (v - 0.5) * rise * 2, yy1 = (v2 - 0.5) * rise * 2;
          var wx = s ? 5.6 : -5.6;
          W.seg(wx, yy0, x0, wx, yy1, x1, s ? [0.49, 0.91, 0.53] : [1, 0.79, 0.29], 1.6, 0.55 * reveal);
        }
      }
      W.draw(g, { add: true });
      // orbiting sample point
      var th = (t * TAU * 130 / 60 * 0.12 + phase);
      var P = new V.Points(2);
      P.add(Math.cos(th) * 2.2, (t * 0.9 % 1 - 0.5) * rise * 2, Math.sin(th) * 2.2, 26, GOLD, 1);
      P.draw(g, { add: true });
    }
  });

  /* ======================================================= 04 PHYSICS ==== */
  WEM.defineSection({
    id: "04", name: "physics",
    init: function (ctx) {
      // precompute real integrations so the render is deterministic
      var dt = 1 / 240, steps = Math.ceil(60 / dt);
      var s = [2.0, 0, 2.0, 0], out = [];
      for (var i = 0; i < steps; i++) {
        s = V.pendulumState(s[0], s[1], s[2], s[3], dt, 1, 1, 1, 1, 9.81);
        out.push(s.slice());
      }
      this.pend = out;
      this.pendDt = dt;
      var d2 = 1 / 500, n2 = 9000;
      this.lzA = V.lorenz(n2, d2 * 2.5, [1, 1, 1]);
      this.lzB = V.lorenz(n2, d2 * 2.5, [1.0001, 1, 1]);
      this.div = [];
      for (var k = 0; k < this.lzA.length; k++) {
        var a = this.lzA[k], b2 = this.lzB[k];
        this.div.push(Math.hypot(a[0] - b2[0], a[1] - b2[1], a[2] - b2[2]));
      }
      this.pTrail = new V.Lines(900);
      this.lLines = new V.Lines(1400);
    },
    enter: function (ctx) {
      ctx.cam.reset3d(9);
      ctx.fx.mood([0.09, 0.09, 0.13], [0.05, 0.02, 0.02], 0.25);
      ctx.fx.bloom = 0.5;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      // double pendulum panel
      hud.win(70, 150, 620, 470, "double_pendulum.sim  [RK4 dt=1/240]", {});
      var P = this.pend, dt = this.pendDt;
      var idx = Math.min(P.length - 1, Math.floor(l / 60 * P.length));
      // draw the last 90 states as a fading ink trail
      var ox = 380, oy = 250, SC = 165;
      var c = hud.fc;
      c.save();
      c.lineWidth = 2.4;
      var from = Math.max(0, idx - 90);
      for (var i = from; i <= idx; i++) {
        var st = P[i];
        var x1 = ox + Math.sin(st[0]) * SC, y1 = oy + Math.cos(st[0]) * SC;
        var x2 = x1 + Math.sin(st[2]) * SC, y2 = y1 + Math.cos(st[2]) * SC;
        var a = (i - from) / 90;
        c.globalAlpha = 0.03 + a * 0.16;
        c.strokeStyle = "rgba(53,224,255,0.9)";
        c.beginPath(); c.moveTo(ox, oy); c.lineTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      }
      c.globalAlpha = 1;
      var st2 = P[idx];
      var ax = ox + Math.sin(st2[0]) * SC, ay = oy + Math.cos(st2[0]) * SC;
      var bx = ax + Math.sin(st2[2]) * SC, by = ay + Math.cos(st2[2]) * SC;
      c.strokeStyle = "rgba(238,242,246,0.95)"; c.lineWidth = 3;
      c.beginPath(); c.moveTo(ox, oy); c.lineTo(ax, ay); c.lineTo(bx, by); c.stroke();
      c.fillStyle = "rgba(255,201,74,1)"; c.beginPath(); c.arc(bx, by, 6, 0, TAU); c.fill();
      c.fillStyle = "rgba(238,242,246,1)"; c.beginPath(); c.arc(ax, ay, 4.5, 0, TAU); c.fill();
      c.beginPath(); c.arc(ox, oy, 4, 0, TAU); c.stroke();
      c.restore();
      var en = (function (s) {
        var v1 = s[1], v2 = s[3];
        var T = 0.5 * (v1 * v1) + 0.5 * (v1 * v1 + v2 * v2 + 2 * v1 * v2 * Math.cos(s[0] - s[2]));
        var Vp = -9.81 * (2 * Math.cos(s[0]) + Math.cos(s[2]));
        return { T: T, V: Vp, E: T + Vp };
      })(st2);
      hud.T(96, 590, "theta1 " + st2[0].toFixed(4) + "   omega1 " + st2[1].toFixed(3), { size: 13, color: COL.green });
      hud.T(96, 612, "theta2 " + st2[2].toFixed(4) + "   omega2 " + st2[3].toFixed(3), { size: 13, color: COL.green });
      hud.T(96, 634, "E = " + en.E.toFixed(4) + "   (conserved --> deterministic but unpredictable)", { size: 13, color: COL.amber });

      // lorenz separation panel
      hud.win(1050, 150, 800, 300, "lorenz.attractor  sigma=10 rho=28 beta=8/3", {});
      var c2 = hud.fc;
      c2.save();
      c2.globalAlpha = 1;
      var gx = 1090, gy = 230, gw = 720, gh = 190;
      c2.strokeStyle = "rgba(238,242,246,0.20)"; c2.lineWidth = 1;
      c2.beginPath(); c2.moveTo(gx, gy); c2.lineTo(gx, gy + gh); c2.lineTo(gx + gw, gy + gh); c2.stroke();
      var maxDiv = 60;
      for (var s2 = 0; s2 < 2; s2++) {
        c2.beginPath();
        c2.strokeStyle = s2 ? "rgba(255,201,74,0.85)" : "rgba(53,224,255,0.85)";
        c2.lineWidth = 1.6;
        var arr = s2 ? this.lzB : this.lzA;
        var lim = Math.min(arr.length, Math.floor(l / 60 * arr.length) + 2);
        for (var k = 0; k < lim; k++) {
          var xx = gx + (k / maxDiv) * gw;
          var yy = gy + gh - clamp(Math.log10(this.div[k] + 1e-6) / 2.2, 0, 1) * gh;
          if (k === 0) c2.moveTo(xx, yy); else c2.lineTo(xx, yy);
          if (xx > gx + gw) break;
        }
        c2.stroke();
      }
      c2.restore();
      hud.T(1090, 434, "log10 |d(t)|  -- two trajectories, one differs by 1e-4", { size: 13, color: COL.dim });
      var dnow = this.div[Math.min(this.div.length - 1, Math.floor(l / 60 * this.div.length))];
      hud.T(1090, 412, "separation = " + dnow.toFixed(4), { size: 15, color: COL.amber });

      // chaos warning popup on the downbeat when divergence explodes
      var warnAt = 7.6;
      if (l > warnAt) {
        var age = l - warnAt;
        var pop = E.outBack(clamp(age / 0.42, 0, 1));
        var wx = 1180, wy = 520, ww = 640, wh = 300;
        hud.fc.save();
        hud.fc.translate(wx + ww / 2, wy + wh / 2);
        hud.fc.scale(pop, pop);
        hud.fc.translate(-(wx + ww / 2), -(wy + wh / 2));
        hud.win(wx, wy, ww, wh, "!!  CHAOS  WARNING  !!", { bg: "rgba(52,8,8,0.86)", color: "rgba(255,120,110,0.95)", titleBg: "rgba(255,90,82,0.95)", titleColor: "#12060a" });
        hud.T(wx + 24, wy + 60, "LYAPUNOV EXPONENT  lambda > 0", { size: 16, color: COL.red });
        hud.T(wx + 24, wy + 92, "PREDICTABILITY HORIZON  t ~ 1/lambda ln(1/d0)", { size: 14, color: COL.grey });
        hud.formula(wx + 24, wy + 148, "\\delta(t) \\approx \\delta_0 e^{\\lambda t}", { size: 32, color: COL.white });
        hud.T(wx + 24, wy + 190, "DETERMINISTIC  !=  PREDICTABLE", { size: 16, color: COL.amber });
        hud.T(wx + 24, wy + 232, age < 2.6 ? "[ ACKNOWLEDGE ]" : "[ ACKNOWLEDGED ]", { size: 15, color: age < 2.6 ? COL.white : COL.dim });
        hud.fc.restore();
        if (Math.abs(age - 0.02) < 0.03) ctx.fx.hit(1.15);
      }
      if (ctx.lyric) hud.T(70, 1040 - 74, "> " + ctx.lyric.text, { size: 15, color: COL.green, alpha: 0.85 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, b = ctx.beat, g = ctx.gfx, cam = ctx.cam;
      cam.fov = 0.95;
      cam.pos = [Math.sin(t * 0.25) * 9, 3.4 + Math.sin(t * 0.3) * 1.4, Math.cos(t * 0.25) * 9];
      cam.target = [0, 0, 0];
      cam.update();
      var lim = Math.floor(l / 60 * this.lzA.length);
      var L = this.lLines;
      L.clear();
      var n0 = Math.max(0, lim - 1500);
      for (var i = n0; i < lim; i++) {
        var a = this.lzA[i], bb = this.lzB[i];
        var k = (i - n0) / 1500;
        var sc = 0.115;
        L.seg(a[0] * sc - 1.5, (a[2] - 25) * sc * 1.0, a[1] * sc,
          this.lzA[Math.min(i + 1, lim - 1)][0] * sc - 1.5, (this.lzA[Math.min(i + 1, lim - 1)][2] - 25) * sc, this.lzA[Math.min(i + 1, lim - 1)][1] * sc,
          CYAN, 1.7, 0.10 + 0.6 * k);
        L.seg(bb[0] * sc + 1.5, (bb[2] - 25) * sc, bb[1] * sc,
          this.lzB[Math.min(i + 1, lim - 1)][0] * sc + 1.5, (this.lzB[Math.min(i + 1, lim - 1)][2] - 25) * sc, this.lzB[Math.min(i + 1, lim - 1)][1] * sc,
          GOLD, 1.7, 0.10 + 0.6 * k);
      }
      L.draw(g, { add: true, glow: 0.5 });
    }
  });

  /* ====================================================== 05 CHORUS I ==== */
  var EQUATIONS = [
    "E = mc^2", "i\\hbar \\frac{\\partial \\psi}{\\partial t} = \\hat{H}\\psi",
    "\\nabla \\cdot E = \\frac{\\rho}{\\epsilon_0}", "\\nabla \\times B = \\mu_0 J + \\mu_0\\epsilon_0 \\frac{\\partial E}{\\partial t}",
    "S = k_B \\ln W", "F = G\\frac{m_1 m_2}{r^2}", "\\Delta x \\Delta p \\geq \\frac{\\hbar}{2}",
    "R_{\\mu\\nu} - \\frac{1}{2}R g_{\\mu\\nu} = \\frac{8\\pi G}{c^4}T_{\\mu\\nu}"
  ];
  WEM.defineSection({
    id: "05", name: "chorus1",
    init: function () {
      this.tv = V.tesseractVerts(); this.te = V.tesseractEdges();
      this.q = new V.Quads(120);
      this.pts = new V.Points(400);
    },
    enter: function (ctx) {
      ctx.cam.reset3d(7);
      ctx.fx.mood([0.14, 0.10, 0.22], [0.10, 0.04, 0.16], 0.45);
      ctx.fx.bloom = 0.22;
      this.lastBar = -99;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, b = ctx.beat;
      var per = ctx.data.period * 4;
      var barIdx = Math.floor((b.index - 128) / 4);
      hud.T(70, 1060 - 78, "CHORUS  I  //  ONE LAW PER BAR", { size: 18, color: COL.gold, alpha: 0.9 });
      var cur = EQUATIONS[((barIdx % EQUATIONS.length) + EQUATIONS.length) % EQUATIONS.length];
      hud.formula(ctx.W - 620, 1060 - 84, cur, { size: 34, color: COL.cyan, alpha: 0.9 });
      hud.T(70, 1060 - 60, "BAR " + b.bar + "   BEAT " + b.index + "   pulse " + b.pulse.toFixed(2), { size: 13, color: COL.dim });
      if (ctx.lyric) hud.T(ctx.W / 2, 1060 - 84, ctx.lyric.text, { size: 17, color: COL.white, align: "center", alpha: 0.75 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, b = ctx.beat, g = ctx.gfx, cam = ctx.cam;
      var per = ctx.data.period * 4;
      var barIdx = Math.floor((b.index - 128) / 4);
      var barPhase = ((b.index - 128) % 4 + 4) % 4;
      var barT = b.sinceBeat + barPhase * ctx.data.period;   // time since this bar started
      // camera slams in on each downbeat
      var slam = Math.exp(-barT / 0.42);
      var rad = 9.4 - slam * 0.40 + Math.sin(t * 0.35) * 0.30;   // the cube must fit the frame
      var az = t * 0.42;
      cam.fov = 0.95 - slam * 0.055;
      cam.pos = [Math.sin(az) * rad, 1.1 + Math.sin(t * 0.5) * 1.1, Math.cos(az) * rad];
      cam.target = [0, 0, 0];
      cam.update();
      // ---- 4D hypercube ----
      var L = new V.Lines(80);
      var sc = 0.97, w4 = 1.75;   // fixed w: no size pulsing
      var a = t * 0.31, b1 = t * 0.23, c1 = t * 0.17, d1 = t * 0.41;
      var proj = [];
      for (var i = 0; i < 16; i++) {
        // scale the 4-vector by hand: V3.scale would drop the w component
        var v4 = this.tv[i];
        var p = V.rot4([v4[0] * w4, v4[1] * w4, v4[2] * w4, v4[3] * w4], a, b1, c1, d1);
        // 2.9 - p[3] used to cross zero, which sent the vertex to infinity and
        // back -- that was the twitching. 4.4 keeps the divisor well clear.
        var k = clamp(2.6 / (4.4 - p[3]), 0.45, 1.55);
        proj.push([p[0] * k * sc, p[1] * k * sc, p[2] * k * sc]);
      }
      for (var e = 0; e < this.te.length; e++) {
        var A = proj[this.te[e][0]], B = proj[this.te[e][1]];
        var inner = (this.te[e][0] < 8 && this.te[e][1] < 8);
        var col = inner ? WHITE : (this.te[e][0] < 8 ? CYAN : GOLD);
        L.seg(A[0], A[1], A[2], B[0], B[1], B[2], col, 1.8 + b.pulse * 2.2, 0.55 + 0.45 * b.pulse);
      }
      L.draw(g, { add: true, glow: 0.7 });
      this.pts.clear();
      for (var v = 0; v < 16; v++) this.pts.add(proj[v][0], proj[v][1], proj[v][2], 14 + b.pulse * 16, v < 8 ? CYAN : GOLD, 0.95);
      this.pts.draw(g, { add: true });

      // ---- equations slammed in, one per bar, extruded ----
      var Q = this.q; Q.clear();
      var idx = ((barIdx % EQUATIONS.length) + EQUATIONS.length) % EQUATIONS.length;
      var fp = V.formulaPanel(ctx, 0, ctx.hud.tPan.tex, { tex: EQUATIONS[idx], size: 96, color: "#eef2f6" });
      // fly in from far away with a hard stop in front of the camera on the downbeat
      var fly = clamp(barT / 0.34, 0, 1);
      var fwd = V3.norm(V3.sub(cam.target, cam.pos));
      var dist = lerp(34, 10.5, E.outCubic(fly));
      var qpos = V3.add(cam.pos, V3.scale(fwd, dist));
      var roll = lerp(0.9, 0, E.outCubic(fly));
      var m = M4.mul(M4.mul(M4.billboard(qpos, cam.pos, 1, M4.ident()), M4.rotZ(roll * Math.sin(t * 0.7))), M4.scale(5.2, 5.2, 1));
      V.extrude(Q, fp.rect, m, { layers: 5, depth: 0.075, tint: [0.85, 0.90, 0.98] });
      // previous equation ghosts backwards
      if (barIdx > 0) {
        var pidx = ((barIdx - 1) % EQUATIONS.length + EQUATIONS.length) % EQUATIONS.length;
        var fp2 = V.formulaPanel(ctx, 1, ctx.hud.tPan.tex, { tex: EQUATIONS[pidx], size: 66, color: "#5b636c" });
        var gp = V3.add(cam.pos, V3.scale(fwd, dist + 10 + barT * 2.6));
        var m2 = M4.mul(M4.billboard(gp, cam.pos, 1, M4.ident()), M4.scale(5.0, 5.0, 1));
        Q.add(m2, fp2.rect, [0.28, 0.31, 0.36, 0.28]);
      }
      Q.draw(g, ctx.hud.tPan.tex, {});
      // equation switch: a much softer accent -- a full hit every bar was blinding
      if (barT < 0.06) ctx.fx.hit(0.32);
      if (barT < 0.10) ctx.fx.glitch = Math.max(ctx.fx.glitch, 0.28);
      // speed lines on the slam
      if (barT < 0.5) {
        var SL = new V.Lines(120);
        var rr = C.rng(Math.floor(ctx.t / per) * 13 + 5);
        for (var s = 0; s < 110; s++) {
          var an = rr() * TAU, rr2 = 3 + rr() * 9;
          var zz = -rr() * 20;
          var x0 = Math.cos(an) * rr2, y0 = Math.sin(an) * rr2;
          SL.seg(x0, y0, zz, x0 * 1.3, y0 * 1.3, zz - 3.4, WHITE, 1.4, (1 - barT / 0.5) * 0.6);
        }
        SL.draw(g, { add: true });
      }
    }
  });
})();
