/* ============================================================================
   sections 11-15: critical / black hole / big bang / heart / credits
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, V = WEM.Viz, M4 = C.M4, V3 = C.V3;
  var COL = WEM.HUD.COL, PI = Math.PI, TAU = PI * 2, geo = C.geo;
  var clamp = C.clamp, lerp = C.lerp, smooth = C.smoothstep, E = C.Ease;
  var WHITE = [0.93, 0.95, 0.98], CYAN = [0.21, 0.88, 1.0], GOLD = [1.0, 0.79, 0.29], RED = [1.0, 0.35, 0.32];

  var PANIC = [
    "FATAL: recursion depth exceeded (limit 1000)",
    "  at window(0x0041) -> window(0x0042) -> window(0x0043)",
    "  at render.scene(...) line 1533",
    "  at world.execute(me) line 1",
    "STACK OVERFLOW -- cannot unwind",
    "SEGMENTATION FAULT (core dumped)",
    "UNIVERSE PROCESS TERMINATED UNEXPECTEDLY"
  ];

  /* ====================================================== 11 CRITICAL ==== */
  WEM.defineSection({
    id: "11", name: "critical",
    init: function () {
      this.tunnel = new V.Quads(80);
      this.grid = new V.Lines(1800);
    },
    enter: function (ctx) {
      ctx.cam.reset3d(7);
      ctx.fx.mood([0.85, 0.10, 0.10], [0.20, 0.0, 0.0], 0.55);   // red alert segment
      ctx.fx.bloom = 0.8;
      ctx.fx.flash = 0.9;
      this.black = -1;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      var blackoutAt = 9.62;                  // right after the countdown
      var retypeAt = 10.4;
      var black = l > blackoutAt;
      // ---------- red alert phase ----------
      if (!black) {
        ctx.chromeAmt = 0.35;
        hud.rect(0, 0, ctx.W, ctx.H, { fill: "rgba(70,6,6," + (0.20 + 0.14 * b.pulse) + ")" });
        // infinite nested windows
        var depth = 11;
        var c = hud.fc;
        c.save();
        for (var i = 0; i < depth; i++) {
          var s = Math.pow(0.86, i);
          var w = ctx.W * 0.74 * s, h = ctx.H * 0.70 * s;
          var x = ctx.W * 0.5 - w / 2 + Math.sin(t * 0.7 + i * 0.6) * 6 * i * 0.4;
          var y = ctx.H * 0.5 - h / 2 + Math.cos(t * 0.6 + i * 0.5) * 5 * i * 0.4;
          var a = clamp(0.85 - i * 0.055, 0.05, 0.9);
          c.globalAlpha = a;
          c.strokeStyle = i % 3 === 0 ? "rgba(255,90,82,0.95)" : "rgba(238,242,246,0.55)";
          c.lineWidth = i === 0 ? 2.2 : 1.2;
          c.strokeRect(x + .5, y + .5, w, h);
          c.fillStyle = i % 2 ? "rgba(255,90,82,0.85)" : "rgba(238,242,246,0.8)";
          c.fillRect(x, y, w, 17 * Math.max(0.3, s));
          c.fillStyle = "#0a0202";
          c.font = "600 " + Math.max(7, 11 * s) + "px " + WEM.HUD.FONTS.mono;
          c.textBaseline = "middle";
          c.fillText("call_frame[" + String(i).padStart(2, "0") + "]  0x" + (0x4100 + i * 17).toString(16).toUpperCase() + "  depth " + (i + 1), x + 8, y + 9 * Math.max(0.3, s));
        }
        c.restore();
        var el = b.sinceBeat;
        // EXECUTION barrage
        if (l < 8.2) {
          var n = Math.floor(b.sinceBeat / 0.001);
          var k = Math.exp(-b.sinceBeat / 0.16);
          hud.T(ctx.W / 2, ctx.H * 0.5 + 10, "EXECUTION", {
            size: 130 + k * 40, weight: "700", color: k > 0.5 ? COL.white : COL.red,
            align: "center", alpha: 0.55 + 0.45 * k, glow: true, blur: 26
          });
        }
        // stack growth
        var stack = Math.floor(1000 * clamp(l / 9.6, 0, 1));
        hud.win(70, 150, 560, 210, "stack.trace", { bg: "rgba(40,4,4,0.82)", color: "rgba(255,120,110,0.9)", titleBg: "rgba(255,90,82,0.92)", titleColor: "#12060a" });
        hud.T(94, 204, "depth  " + stack + " / 1000", { size: 16, color: stack > 900 ? COL.red : COL.white });
        hud.bar(94, 220, 500, 14, stack / 1000, { fill: stack > 900 ? COL.red : COL.amber, color: "rgba(255,255,255,0.6)" });
        hud.T(94, 262, "frame size 128 B    heap " + (32 - stack * 0.006).toFixed(2) + " KB", { size: 13, color: COL.grey });
        hud.T(94, 288, "RECURSION  WITHOUT  BASE  CASE", { size: 15, color: COL.amber });
        hud.T(94, 316, "the world calls itself with no way out", { size: 13, color: COL.faint });
        // countdown EIN DOS TROIS ...
        var cd = l - 11.2;
        if (cd > 0) {
          var words = ["EIN", "DOS", "TROIS", "NE", "FEM", "LIU"];
          var wi = Math.min(words.length - 1, Math.floor(cd / 0.42));
          var wk = 1 - ((cd / 0.42) % 1);
          hud.T(ctx.W / 2, 300, words[wi], {
            size: 150 + 60 * Math.exp(-(1 - wk) * 8), weight: "700", color: COL.white,
            align: "center", alpha: 0.9, glow: "rgba(255,110,100,1)", blur: 30
          });
        }
        if (b.isDownbeat) { ctx.fx.flash = Math.max(ctx.fx.flash, 0.10); ctx.fx.hit(0.14); }
      } else {
        // ---------- black + red retype ----------
        ctx.chromeAmt = 0.0;
        ctx.fx.mood([0, 0, 0], [0, 0, 0], 1.0);
        ctx.fx.stripes = 0;
        if (this.black < 0) { this.black = l; }
        var s = "world.execute(me);";
        if (l > retypeAt) {
          var n2 = clamp(Math.floor((l - retypeAt) * 4.2), 0, s.length);
          hud.T(ctx.W / 2 - 210, ctx.H / 2 + 30, ">>>", { size: 30, color: "rgba(255,70,60,1)" });
          hud.T(ctx.W / 2 - 120, ctx.H / 2 + 30, s.slice(0, n2), { size: 30, color: "rgba(255,90,82,1)" });
          if (Math.floor(ctx.t * 3) % 2 === 0) hud.T(ctx.W / 2 - 120 + hud.fc.measureText(s.slice(0, n2)).width + 6, ctx.H / 2 + 30, "_", { size: 30, color: "rgba(255,60,50,1)" });
        } else {
          var pa = clamp((l - blackoutAt) / 0.9, 0, 1);
          hud.T(ctx.W / 2, ctx.H / 2 - 40, "FATAL ERROR", { size: 64, weight: "700", color: "rgba(255,60,50," + pa + ")", align: "center" });
          hud.T(ctx.W / 2, ctx.H / 2 + 30, "UNIVERSE PROCESS TERMINATED", { size: 22, color: "rgba(255,90,82," + pa * 0.9 + ")", align: "center" });
        }
      }
      if (ctx.lyric && !black) hud.T(ctx.W / 2, ctx.H - 100, ctx.lyric.text, { size: 17, color: COL.white, align: "center", alpha: 0.85 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, b = ctx.beat, g = ctx.gfx, cam = ctx.cam;
      if (l > 9.62) return;
      // red grid tunnel collapsing inward
      cam.fov = 0.95;
      var z = -((t * 5) % 2.4);
      cam.pos = [Math.sin(t * 0.5) * 0.5, Math.cos(t * 0.4) * 0.5, 6];
      cam.target = [0, 0, -6];
      cam.update();
      var G = this.grid; G.clear();
      var D = 22;
      for (var ring = 0; ring < 16; ring++) {
        var zz = -ring * 2.4 + z;
        var rad = 3.2 + 0.5 * Math.sin(ring * 0.7 + t * 2);
        var N = 24;
        for (var i = 0; i < N; i++) {
          var a0 = i / N * TAU, a1 = (i + 1) / N * TAU;
          G.seg(Math.cos(a0) * rad, Math.sin(a0) * rad, zz, Math.cos(a1) * rad, Math.sin(a1) * rad, zz,
            RED, 1.6, clamp(1 - ring / 16, 0, 1) * 0.7);
          G.seg(Math.cos(a0) * rad, Math.sin(a0) * rad, zz, Math.cos(a0) * rad * 1.16, Math.sin(a0) * rad * 1.16, zz - 2.4,
            [1, 0.5, 0.45], 1.2, clamp(1 - ring / 16, 0, 1) * 0.5);
        }
      }
      G.draw(g, { add: true, glow: 0.5 });
      // windows flying at the camera as quads
      var Q = this.tunnel; Q.clear();
      for (var k = 0; k < 14; k++) {
        var zk = -((k * 3.1 + t * 5) % 34);
        var sc = 2.2 + (-zk) * 0.16;
        Q.add(M4.mul(M4.compose([Math.sin(k * 2.1 + t) * 1.6, Math.cos(k * 1.7 + t * 0.8) * 1.2, zk], M4.rotZ(Math.sin(t + k) * 0.2), 1), M4.scale(sc, sc, 1)),
          [0, 0, 0, 0], [1, 0.35, 0.32, clamp(0.5 - (-zk) / 60, 0.05, 0.5)]);
      }
      Q.draw(g, null, { add: true, noDepth: true });
      if (b.isDownbeat && b.pulse > 0.8) ctx.fx.glitch = Math.max(ctx.fx.glitch, 0.5);
    }
  });

  /* ===================================================== 12 BLACK HOLE === */
  WEM.defineSection({
    id: "12", name: "blackhole",
    init: function (ctx) {
      this.grid = new V.Lines(9000);
      this.q = new V.Quads(20);
      this.formulas = [
        "R_{\\mu\\nu} - \\frac{1}{2}R g_{\\mu\\nu} = \\frac{8\\pi G}{c^4} T_{\\mu\\nu}",
        "r_s = \\frac{2GM}{c^2}", "S = \\frac{k_B c^3 A}{4 G \\hbar}",
        "\\Delta S \\geq 0", "T_H = \\frac{\\hbar c^3}{8\\pi G M k_B}"
      ];
      this.spiral = [];
    },
    enter: function (ctx) {
      ctx.cam.reset3d(9);
      ctx.fx.mood([0.06, 0.07, 0.10], [0.08, 0.03, 0.02], 0.35);
      ctx.fx.bloom = 0.55;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      hud.T(70, 116, "EVENT  HORIZON", { size: 20, color: COL.gold, alpha: 0.95 });
      hud.formula(70, 172, "r_s = \\frac{2GM}{c^2}", { size: 34, color: COL.white });
      hud.formula(70, 240, "S = \\frac{k_B c^3 A}{4 G \\hbar}", { size: 28, color: COL.cyan, alpha: 0.9 });
      hud.T(70, 292, "M = 1.000e+01 M_sun      r_s = 29.5 km", { size: 14, color: COL.green });
      hud.T(70, 316, "T_H = 6.17e-09 K", { size: 14, color: COL.green });
      hud.T(70, 356, "nothing returns -- not even the program", { size: 13, color: COL.faint });
      // infalling formula list (properly typeset, spiralling into the horizon)
      var names = ["E = mc^2", "i\\hbar \\frac{\\partial \\psi}{\\partial t} = \\hat{H}\\psi", "\\nabla \\times B = \\mu_0 J", "S = k_B \\ln W"];
      for (var i = 0; i < names.length; i++) {
        var p = clamp((l - 1.2 - i * 0.9) / 6.5, 0, 1);
        if (p <= 0 || p >= 1) continue;
        var rr = lerp(760, 40, E.inQuad(p));
        var aa = l * 0.8 + i * 1.7;
        var x = ctx.W / 2 + Math.cos(aa) * rr, y = ctx.H / 2 + Math.sin(aa) * rr * 0.45;
        hud.formula(x, y, names[i], {
          size: 20 + p * 14, align: "center",
          color: p > 0.8 ? "rgba(255,90,82,0.95)" : "rgba(214,222,232,0.95)", alpha: clamp(1.1 - p, 0, 1) * 0.9
        });
      }
      if (ctx.lyric) hud.T(ctx.W / 2, ctx.H - 106, ctx.lyric.text, { size: 17, color: COL.white, align: "center", alpha: 0.85 });
      if (b.isDownbeat) ctx.fx.hit(0.16);   // softer beat accent
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, b = ctx.beat, g = ctx.gfx, cam = ctx.cam;
      // accretion disk + photon ring, raymarched in a fullscreen pass
      ctx.fs("ray", WEM.Shaders.rayFS, {
        uRes: [ctx.W, ctx.H], uTime: t,
        uDisk: clamp(l / 2.2, 0, 1) * (0.42 + 0.30 * b.pulse),
        uSpin: 1.0, uHole: 1.0, uRing: clamp((l - 1.0) / 1.6, 0, 1) * 0.55,
        uGrid: 1.0, uTint: [1.0, 0.97, 0.95], uWarp: clamp(l / 3.0, 0, 1)
      }, "current");
      // spacetime grid pulled into the well
      cam.fov = 0.85;
      var az = t * 0.16;
      cam.pos = [Math.sin(az) * 9.5, 7.6 - l * 0.10, Math.cos(az) * 9.5];
      cam.target = [0, -0.4, 0];
      cam.update();
      var G = this.grid; G.clear();
      var N = 34, SZ = 26;
      var rs = 3.0;
      var well = function (x, z) {
        var r = Math.hypot(x, z);
        // Flamm paraboloid: w = 2 sqrt(rs (r - rs))
        return r <= rs ? -8 : -2 * Math.sqrt(rs * (r - rs)) * 0.85;
      };
      for (var i = 0; i <= N; i++) {
        var u = i / N - 0.5;
        for (var j = 0; j < N; j++) {
          var v0 = j / N - 0.5, v1 = (j + 1) / N - 0.5;
          var x0 = u * SZ, z0 = v0 * SZ, z1 = v1 * SZ;
          var y00 = well(x0, z0), y01 = well(x0, z1);
          if (y00 < -7.9 || y01 < -7.9) continue;
          var r = Math.hypot(x0, (z0 + z1) / 2);
          var al = clamp(0.85 - r / SZ * 1.1, 0.06, 0.9);
          G.seg(x0, y00, z0, x0, y01, z1, r < 5 ? [1, 0.55, 0.35] : [0.42, 0.52, 0.68], 1.5, al);
        }
        for (var k = 0; k < N; k++) {
          var w0 = k / N - 0.5, w1 = (k + 1) / N - 0.5;
          var zz0 = u * SZ, xa = w0 * SZ, xb = w1 * SZ;
          var ya = well(xa, zz0), yb = well(xb, zz0);
          if (ya < -7.9 || yb < -7.9) continue;
          var rr = Math.hypot((xa + xb) / 2, zz0);
          G.seg(xa, ya, zz0, xb, yb, zz0, rr < 5 ? [1, 0.55, 0.35] : [0.42, 0.52, 0.68], 1.5, clamp(0.85 - rr / SZ * 1.1, 0.06, 0.9));
        }
      }
      G.draw(g, { add: true, glow: 0.35 });
      // formulas spiralling in and being tidally stretched
      var Q = this.q; Q.clear();
      for (var f = 0; f < this.formulas.length; f++) {
        var p = clamp((l - 0.9 - f * 1.1) / 8.0, 0, 1);
        if (p <= 0 || p >= 1.02) continue;
        var rad = lerp(15, 2.4, E.inQuad(p));
        var ang = l * 0.9 + f * 1.9;
        var stretch = 1 + p * 5.5;
        var fp = V.formulaPanel(ctx, f, ctx.hud.tPan.tex, { tex: this.formulas[f], size: 74, color: "#eef2f6" });
        var m = M4.mul(M4.compose([Math.cos(ang) * rad, Math.sin(ang * 0.7) * 1.6, Math.sin(ang) * rad],
          M4.mul(M4.rotY(-ang + PI / 2), M4.rotZ(f * 0.3)), 1), M4.scale(3.4 * stretch, 3.4 / Math.sqrt(stretch), 1));
        var al = clamp(1.1 - p, 0.05, 1) * clamp(p * 6, 0, 1);
        Q.add(m, fp.rect, [al, al * 0.9, al * 0.85, al]);
      }
      Q.draw(g, ctx.hud.tPan.tex, { add: true });
    }
  });

  /* ======================================================= 13 BIG BANG === */
  WEM.defineSection({
    id: "13", name: "bigbang",
    init: function (ctx) {
      var r = C.rng(13800000000);
      this.N = 26000;
      this.seed = new Float32Array(this.N * 6);
      for (var i = 0; i < this.N; i++) {
        var th = r() * TAU, ph = Math.acos(2 * r() - 1);
        var arm = r() < 0.72 ? 0 : (r() < 0.9 ? 1 : 2);
        this.seed[i * 6] = Math.sin(ph) * Math.cos(th);
        this.seed[i * 6 + 1] = Math.cos(ph);
        this.seed[i * 6 + 2] = Math.sin(ph) * Math.sin(th);
        this.seed[i * 6 + 3] = r();
        this.seed[i * 6 + 4] = arm;
        this.seed[i * 6 + 5] = r();
      }
      this.pts = new V.Points(this.N);
      this.q = new V.Quads(48);
    },
    enter: function (ctx) {
      ctx.cam.reset3d(10);
      ctx.fx.mood([0.10, 0.09, 0.14], [0.10, 0.06, 0.03], 0.30);
      ctx.fx.bloom = 0.9;
      ctx.fx.flash = 1.0;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      var phase = l < 5.0 ? 0 : l < 10.6 ? 1 : 2;
      hud.T(70, 116, phase === 0 ? "SINGULARITY  //  t = 0" : phase === 1 ? "STRUCTURE  FORMATION" : "RECOMBINATION  //  PRISM", { size: 20, color: COL.gold, alpha: 0.95 });
      hud.T(70, 152, "E = mc^2      T = 2.7 K      z = 1089", { size: 14, color: COL.dim });
      var age = 13.8e9 * clamp(l / 14.3, 0, 1);
      hud.T(70, 182, "cosmic time  " + (age / 1e9).toFixed(3) + " Gyr", { size: 14, color: COL.green });
      if (phase === 2) {
        hud.T(ctx.W / 2, 240, "AND  THERE  WAS  LIGHT", { size: 34, weight: "600", color: COL.white, align: "center", alpha: clamp((l - 10.6) / 1.2, 0, 1) });
      }
      // prism: white light splits into the spectrum
      var py = 900, px = 640, s = 130;
      var a = clamp((l - 10.8) / 2.4, 0, 1);
      if (a > 0) {
        var c = hud.fc;
        c.save();
        c.globalAlpha = a;
        c.strokeStyle = "rgba(238,242,246,0.85)"; c.lineWidth = 2;
        c.beginPath(); c.moveTo(px, py - s); c.lineTo(px + s, py + s); c.lineTo(px - s, py + s); c.closePath(); c.stroke();
        var cols = ["#ff3b30", "#ff9500", "#ffd60a", "#34c759", "#32ade6", "#5856d6", "#bf5af2"];
        for (var i = 0; i < 7; i++) {
          c.strokeStyle = cols[i]; c.lineWidth = 5; c.globalAlpha = a * 0.9;
          c.beginPath();
          c.moveTo(px + 20, py + 10);
          c.lineTo(px + 210 + i * 16, py + 92 + i * 13);
          c.stroke();
        }
        c.globalAlpha = a; c.strokeStyle = "rgba(238,242,246,0.9)"; c.lineWidth = 6;
        c.beginPath(); c.moveTo(px - 300, py + 40); c.lineTo(px - 40, py + 22); c.stroke();
        c.restore();
        ctx.fx.disp = Math.max(ctx.fx.disp, a * 0.5);
        ctx.fx.aberr = 0.55 + a * 1.1;
      } else ctx.fx.aberr = 0.55;
      if (ctx.lyric) hud.T(ctx.W / 2, ctx.H - 106, ctx.lyric.text, { size: 17, color: COL.white, align: "center", alpha: 0.85 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, b = ctx.beat, g = ctx.gfx, cam = ctx.cam;
      var phase = l < 5.0 ? 0 : l < 10.6 ? 1 : 2;
      cam.fov = 0.95;
      var az = t * 0.12 + (phase === 2 ? 0.9 : 0);
      // pull well back in the galaxy phase so the spiral structure reads
      var rad = phase === 0 ? lerp(3.0, 12.0, E.outExpo(clamp(l / 5.0, 0, 1)))
        : (phase === 1 ? lerp(18.0, 14.0, clamp((l - 5) / 5.6, 0, 1)) : lerp(14.0, 8.5, clamp((l - 10.6) / 3.4, 0, 1)));
      var hgt = phase === 1 ? 8.5 : (phase === 0 ? 4.4 : 3.0);
      cam.pos = [Math.sin(az) * rad, hgt + Math.sin(l * 0.2) * 1.2, Math.cos(az) * rad];
      cam.target = [0, 0, 0];
      cam.update();
      var P = this.pts; P.clear();
      var S = this.seed, N = this.N;
      var expand = phase === 0 ? E.outExpo(clamp(l / 4.6, 0, 1)) : 1;
      for (var i = 0; i < N; i++) {
        var dx = S[i * 6], dy = S[i * 6 + 1], dz = S[i * 6 + 2];
        var rr = S[i * 6 + 3], arm = S[i * 6 + 4], rr2 = S[i * 6 + 5];
        var x, y, z, r0;
        if (phase === 0) {
          r0 = 0.4 + rr * 11 * expand;
          x = dx * r0; y = dy * r0 * 0.62; z = dz * r0;
          var sw = (1 - expand) * 22;
          var ang = Math.atan2(z, x) + sw;
          var rad2 = Math.hypot(x, z);
          x = Math.cos(ang) * rad2; z = Math.sin(ang) * rad2;
        } else if (phase === 1) {
          // spiral galaxy: logarithmic arms
          var armIdx = arm;
          var tr = 1.0 + rr * 5.8;
          var th = rr2 * 5.2 + armIdx * TAU / 3 + t * 0.10 + tr * 0.75;
          var sc = clamp((l - 5.0) / 5.6, 0, 1);
          var trc = lerp(Math.hypot(dx, dz) * 10 + 3, tr, sc);
          var x0 = Math.cos(th) * trc, z0 = Math.sin(th) * trc;
          x = lerp(dx * (3 + rr * 11), x0, sc);
          z = lerp(dz * (3 + rr * 11), z0, sc);
          y = dy * lerp(7, 0.55 + rr2 * 0.55, sc);
          r0 = 0;
        } else {
          // collapse into a formula sphere
          var cc = clamp((l - 10.6) / 3.4, 0, 1);
          var nr = 4.2;
          var th2 = rr2 * 5.2 + arm * TAU / 3 + t * 0.06;
          var tr2 = 1.4 + rr * 8.4;
          var gx = Math.cos(th2) * tr2, gz = Math.sin(th2) * tr2;
          var gy = dy * (0.9 + rr2 * 0.9);
          var sph = 4.4 + Math.sin(l * 1.2 + i * 0.01) * 0.06;
          var nx = dx * sph, ny = dy * sph, nz = dz * sph;
          x = lerp(gx, nx, E.inOutCubic(cc));
          y = lerp(gy, ny, E.inOutCubic(cc));
          z = lerp(gz, nz, E.inOutCubic(cc));
        }
        var col = phase === 0 ? (i % 17 === 0 ? GOLD : [1, 0.55, 0.35])
          : (phase === 1 ? (arm === 0 ? [0.72, 0.86, 1.0] : (arm === 1 ? [1.0, 0.90, 0.62] : [0.90, 0.68, 1.0])) : [0.95, 0.95, 1.0]);
        var sz = 1.9 + rr2 * 4.2;
        // concentrate brightness in the density wave so the arms read as arms
        var armBoost = phase === 1 ? (0.30 + 0.70 * Math.pow(Math.max(0, 1 - Math.abs(((rr2 * 5.2 + arm * 2.094) % TAU) - 0.6) / 1.6), 2)) : 1;
        P.add(x, y, z, sz, col, (0.50 + 0.45 * rr) * (phase === 1 ? 0.45 + 0.75 * armBoost : 1));
      }
      P.draw(g, { add: true, soft: 0.85 });
      if (phase === 0 && l < 0.35) ctx.fx.flash = Math.max(ctx.fx.flash, 1.2 - l * 3.4);
      // formula sphere: panels on a fibonacci sphere
      if (phase === 2) {
        var Q = this.q; Q.clear();
        var cc2 = clamp((l - 10.6) / 3.4, 0, 1);
        var FORM = ["E = mc^2", "S = k_B \\ln W", "e^{i\\pi} + 1 = 0", "F = G\\frac{m_1 m_2}{r^2}",
          "\\Delta x \\Delta p \\geq \\frac{\\hbar}{2}", "\\nabla \\cdot E = \\frac{\\rho}{\\epsilon_0}"];
        var M = 12;
        for (var f = 0; f < M; f++) {
          var ph2 = Math.acos(1 - 2 * (f + 0.5) / M);
          var th3 = PI * (1 + Math.sqrt(5)) * f;
          var px2 = Math.sin(ph2) * Math.cos(th3) * 5.4, py2 = Math.cos(ph2) * 5.4, pz2 = Math.sin(ph2) * Math.sin(th3) * 5.4;
          var fp = V.formulaPanel(ctx, 8 + (f % 8), ctx.hud.tPan.tex, { tex: FORM[f % FORM.length], size: 56, color: f % 3 === 0 ? "#35e0ff" : "#eef2f6" });
          var look = M4.lookAt([px2 * 1.6, py2 * 1.6, pz2 * 1.6], [0, 0, 0], [0, 1, 0]);
          var m = M4.mul(M4.trans(px2, py2, pz2), M4.mul(look, M4.scale(3.4, 3.4, 1)));
          var al = cc2 * clamp((l - 11.0 - f * 0.12) / 0.6, 0, 1);
          Q.add(m, fp.rect, [al, al, al, al]);
        }
        Q.draw(g, ctx.hud.tPan.tex, { add: true });
      }
    }
  });

  /* ========================================================= 14 HEART === */
  function heartMesh(n, thick) {
    // extrude the polar heart curve into a low-poly solid
    var curve = V.heartCurve(n, 1.0);
    var rings = [
      { z: -thick, s: 0.18 }, { z: -thick * 0.55, s: 0.72 }, { z: 0, s: 1.0 },
      { z: thick * 0.55, s: 0.72 }, { z: thick, s: 0.18 }
    ];
    var pos = [], idx = [];
    var R = rings.length, N = curve.length - 1;
    for (var r = 0; r < R; r++) {
      for (var i = 0; i < N; i++) {
        var p = curve[i];
        var k = rings[r].s;
        var bulge = 1 + 0.12 * Math.sin(i / N * PI);
        pos.push(p[0] * k * bulge, p[1] * k * bulge * 1.05 + 0.02, rings[r].z * (1 - 0.25 * Math.abs(p[0])));
      }
    }
    for (var r2 = 0; r2 + 1 < R; r2++) {
      for (var i2 = 0; i2 < N; i2++) {
        var i3 = (i2 + 1) % N;
        var a = r2 * N + i2, b = r2 * N + i3, c = (r2 + 1) * N + i2, d = (r2 + 1) * N + i3;
        idx.push(a, c, b, b, c, d);
      }
    }
    return { pos: new Float32Array(pos), idx: new Uint32Array(idx), n: N, rings: R };
  }

  WEM.defineSection({
    id: "14", name: "heart",
    init: function (ctx) {
      this.mesh = heartMesh(56, 0.30);
      this.curve = V.heartCurve(360, 2.6);
      this.outline = new V.Lines(400);
      this.tris = [];
      var idx = this.mesh.idx;
      for (var i = 0; i < idx.length; i += 3) this.tris.push([idx[i], idx[i + 1], idx[i + 2]]);
      this.rnd = C.rng(5201314);
      this.triState = this.tris.map(function () {
        return { fx: (this.rnd() - .5) * 60, fy: (this.rnd() - .5) * 40, fz: (this.rnd() - .5) * 60, rx: this.rnd(), ry: this.rnd() };
      }, this);
      this.burst = new V.Lines(600);
      this.assembleAt = 3.4;
    },
    enter: function (ctx) {
      ctx.cam.reset3d(7);
      ctx.fx.mood([0.12, 0.06, 0.10], [0.10, 0.02, 0.05], 0.35);
      ctx.fx.bloom = 0.8;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      var phase = l < this.assembleAt ? 0 : l < 10.4 ? 1 : 2;
      if (phase === 0) {
        // the implicit equation, then the curve being plotted
        hud.formula(ctx.W / 2, 230, "(x^2 + y^2 - 1)^3 - x^2 y^3 = 0", { size: 54, color: COL.white, align: "center" });
        hud.T(ctx.W / 2, 288, "THE  HEART  CURVE  --  AN  ALGEBRAIC  EXPRESSION  OF  LOVE", { size: 17, color: COL.dim, align: "center" });
        var c = hud.fc;
        c.save();
        c.strokeStyle = "rgba(255,120,150,0.95)"; c.lineWidth = 3;
        c.beginPath();
        var upto = clamp(l / 3.0, 0, 1);
        var n = this.curve.length;
        for (var i = 0; i < n * upto; i++) {
          var p = this.curve[i];
          var x = ctx.W / 2 + p[0] * 120, y = 620 - p[1] * 120;
          if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.stroke();
        c.restore();
      } else if (phase === 1) {
        hud.T(70, 116, "ASSEMBLY  //  " + Math.floor(clamp((l - this.assembleAt) / 6.4, 0, 1) * this.tris.length) + " / " + this.tris.length + " TRIANGLES", { size: 18, color: COL.cyan, alpha: 0.95 });
        hud.formula(70, 170, "\\int_{0}^{\\infty} \\frac{1}{x^2+1} dx = \\frac{\\pi}{2}", { size: 26, color: COL.white, alpha: 0.85 });
        hud.formula(70, 224, "\\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^n = e", { size: 26, color: COL.gold, alpha: 0.85 });
        hud.T(70, 280, "every structure in this film was computed, not drawn", { size: 14, color: COL.dim, alpha: 0.9 });
      } else {
        ctx.chromeAmt = 1 - clamp((l - 10.4) / 1.0, 0, 1) * 0.55;
        hud.T(70, 116, "RETURN  0", { size: 18, color: COL.green, alpha: 0.95 });
        hud.win(70, 470, 560, 210, "process exit", { bg: "rgba(4,12,6,0.8)", color: "rgba(126,231,135,0.85)", titleBg: "rgba(126,231,135,0.92)", titleColor: "#04120a" });
        var et = clamp((l - 10.4) / 1.6, 0, 1);
        hud.T(96, 526, "world.execute(me);   ->   complete", { size: 15, color: COL.white, alpha: et });
        hud.T(96, 556, "exit code 0", { size: 24, color: COL.green, alpha: et });
        hud.T(96, 592, "lifetime " + ctx.t.toFixed(3) + " s", { size: 14, color: COL.grey, alpha: et });
        hud.T(96, 618, "objects created  " + (10 + ctx.data.notes.length) + "    destroyed  0", { size: 14, color: COL.grey, alpha: et });
        hud.T(96, 652, "> simulation ended. thank you.", { size: 14, color: COL.dim, alpha: et });
      }
      if (ctx.lyric && l < 12.0) hud.T(ctx.W / 2, ctx.H - 106, ctx.lyric.text, { size: 17, color: COL.white, align: "center", alpha: 0.85 });
      // heart pulse on every beat
      if (b.pulse > 0.85) ctx.fx.flash = Math.max(ctx.fx.flash, 0.10);
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, b = ctx.beat, g = ctx.gfx, cam = ctx.cam;
      var phase = l < this.assembleAt ? 0 : l < 10.4 ? 1 : 2;
      cam.mode = "persp";
      cam.fov = 0.9;
      var az = Math.sin(t * 0.14) * 0.7;
      var dist = phase === 0 ? lerp(16, 8.5, clamp(l / 3.4, 0, 1)) : 7.2 - b.pulse * 0.35;
      cam.pos = [Math.sin(az) * dist, 0.2 + Math.sin(t * 0.3) * 0.3, Math.cos(az) * dist];
      cam.target = [0, 0.05, 0];
      cam.update();
      // 2D heart outline first
      if (phase === 0) {
        var O = this.outline; O.clear();
        var upto = Math.floor(this.curve.length * clamp(l / 3.0, 0, 1));
        for (var i = 0; i + 1 < upto; i++) {
          var a = this.curve[i], b2 = this.curve[i + 1];
          O.seg(a[0], a[1], 0, b2[0], b2[1], 0, [1.0, 0.45, 0.6], 3.4, 1);
        }
        O.draw(g, { add: true, glow: 0.7 });
        return;
      }
      // low-poly heart: triangles fly in from off screen and lock together
      var M = this.mesh, prog = clamp((l - this.assembleAt) / 6.4, 0, 1);
      var beatS = 1 + b.pulse * 0.10 + clamp((l - 6.0) / 3, 0, 1) * 0.06 * Math.sin(t * 5.2);
      var baseRot = M4.mul(M4.rotY(t * 0.30), M4.rotX(Math.sin(t * 0.22) * 0.10));
      var heartPos = [0, 0.6 + Math.sin(t * 1.3) * 0.03, 0];
      // outer shell (assembled)
      var solidModel = M4.mul(M4.compose(heartPos, baseRot, 2.1 * beatS), M4.ident());
      g.solid(M, solidModel, {
        color: phase === 2 && l > 11.6 ? [0.55, 0.60, 0.68] : [0.95, 0.30, 0.42],
        rim: 0.9, alpha: 0.92, emissive: 0.12 + b.pulse * 0.25
      });
      // wireframe overlay
      g.wire(M, solidModel, { color: [1, 0.85, 0.9], alpha: 0.18, width: 1 });
      // flying triangles
      var ST = this.triState, pos = M.pos, progN = Math.floor(prog * this.tris.length);
      var L = this.burst; L.clear();
      for (var k = 0; k < this.tris.length; k++) {
        if (k > progN) continue;
        var st = ST[k];
        var done = clamp((prog * this.tris.length - k) / 26, 0, 1);
        var ez = E.outCubic(done);
        var tri = this.tris[k];
        for (var e = 0; e < 3; e++) {
          var va = tri[e], vb = tri[(e + 1) % 3];
          var ax = pos[va * 3], ay = pos[va * 3 + 1], az = pos[va * 3 + 2];
          var bx = pos[vb * 3], by = pos[vb * 3 + 1], bz = pos[vb * 3 + 2];
          var wa = M4.xform(solidModel, [ax, ay, az, 1]);
          var wb = M4.xform(solidModel, [bx, by, bz, 1]);
          var ox = st.fx * (1 - ez), oy = st.fy * (1 - ez), oz = st.fz * (1 - ez);
          L.seg(wa[0] + ox, wa[1] + oy, wa[2] + oz, wb[0] + ox, wb[1] + oy, wb[2] + oz,
            done > 0.98 ? [1, 0.45, 0.6] : GOLD, 1.4, (1 - done) * 0.8 + 0.2);
        }
      }
      L.draw(g, { add: true, glow: 0.4 });
      // final shutdown
      if (l > 10.9) {
        var k2 = clamp((l - 10.9) / 0.9, 0, 1);
        ctx.fx.crtOff = k2;
      }
    }
  });

  /* ======================================================= 15 CREDITS === */
  WEM.defineSection({
    id: "15", name: "credits",
    init: function () { },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0, 0, 0], [0, 0, 0], 1);
      ctx.fx.stripes = 0;
      ctx.fx.bloom = 0.35;
      ctx.fx.crtOff = 0;
      ctx.fx.hud = 1;
    },
    chrome: 0,
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      ctx.chromeAmt = 0;
      ctx.fx.stripes = 0;
      // faint scan of a dead terminal
      var a1 = clamp((l - 0.3) / 0.9, 0, 1);
      var fadeEnd = clamp((ctx.dur - l) / 1.4, 0, 1);
      var A = a1 * (l > ctx.dur - 1.5 ? fadeEnd : 1);
      hud.T(ctx.W / 2, 430, "world.execute(me);", { size: 62, weight: "700", color: COL.white, align: "center", alpha: A * 0.95, spacing: "2px" });
      hud.T(ctx.W / 2, 492, "a computed visual study of a program that runs a universe", { size: 17, color: COL.dim, align: "center", alpha: A * 0.85 });
      hud.T(ctx.W / 2, 610, "music  —  Mili", { size: 30, weight: "600", color: COL.gold, align: "center", alpha: A, spacing: "1px" });
      hud.T(ctx.W / 2, 660, "world.execute (me) ;", { size: 15, color: COL.dim, align: "center", alpha: A * 0.7 });
      hud.T(ctx.W / 2, 740, "visuals computed in real time from the recording", { size: 13, color: COL.faint, align: "center", alpha: A * 0.8 });
      hud.T(ctx.W / 2, 762, "tempo 130.000 BPM   grid phase 0.286 s   " + ctx.data.beats.length + " beats   " + ctx.data.notes.length + " midi events", { size: 13, color: COL.faint, align: "center", alpha: A * 0.7 });
      if (Math.floor(t * 1.6) % 2 === 0)
        hud.T(ctx.W / 2, 830, "_", { size: 22, color: COL.dim, align: "center", alpha: A * 0.9 });
      // power off at the very end
      if (l > ctx.dur - 0.75) ctx.fx.crtOff = clamp((l - (ctx.dur - 0.75)) / 0.52, 0, 1);
    },
    draw3d: function () { }
  });
})();
