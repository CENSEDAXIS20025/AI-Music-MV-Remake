/* ============================================================================
   world.execute(me);  [v2] segments 01-05
   01 boot: PCB routing, five platonic solids, He init N(0, 2/n)
   02 title: three-arm galaxy, raymarched lattice megastructure
   03 definitions: Byrne plate, unit circle + tangent envelope, eps-N, 2^53
   04 electric & time: breakdown arcs, |sin| + RC, diffraction star,
      sunflower phyllotaxis, binary inspiral
   05 chorus: transformer attention, RLHF reward, spectrum city
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, V = WEM.Viz, L = WEM.Lab, M4 = C.M4, V3 = C.V3;
  var COL = WEM.HUD.COL, PI = Math.PI, TAU = PI * 2, geo = C.geo;
  var clamp = C.clamp, lerp = C.lerp, smooth = C.smoothstep, E = C.Ease;
  var WHITE = [0.93, 0.95, 0.98], CYAN = [0.21, 0.88, 1.0], GOLD = [1.0, 0.79, 0.29], GREEN = [0.49, 0.91, 0.53];

  /* =========================================================== 01 BOOT === */
  // routing generator: Manhattan traces with 45 degree corners, pads and vias
  function makePCB(n, seed, span) {
    var r = C.rng(seed), traces = [], pads = [];
    for (var i = 0; i < n; i++) {
      var x = (r() - 0.5) * span, y = (r() - 0.5) * span;
      var pts = [[x, y]];
      var dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
      var d = dirs[(r() * 4) | 0], steps = 2 + ((r() * 4) | 0);
      for (var s = 0; s < steps; s++) {
        var len = (0.4 + r() * 1.5) * (0.4 + 0.6 * (1 - s / steps));
        if (r() < 0.5) {   // 45 degree jog first
          var nd = dirs[((r() * 4) | 0)];
          x += (d[0] + nd[0]) * 0.4 * len; y += (d[1] + nd[1]) * 0.4 * len;
          pts.push([x, y]); d = nd;
        }
        x += d[0] * len; y += d[1] * len;
        pts.push([x, y]);
      }
      traces.push(pts);
      pads.push([pts[0][0], pts[0][1], 0.10 + r() * 0.08]);
      pads.push([x, y, 0.10 + r() * 0.08]);
    }
    return { traces: traces, pads: pads };
  }

  WEM.defineSection({
    id: "01", name: "boot / pcb",
    init: function () {
      var r = C.rng(11), n = 600;
      this.he = new Float32Array(n);
      this.solidKeys = L.PLATONIC_ORDER;
      this.meshes = {};
      this.solidKeys.forEach(function (k) { this.meshes[k] = L.solidMesh(k); }, this);
      this.pcb = makePCB(46, 4242, 13);
      this.traces = new V.Lines(2400);
      this.pads = new V.Points(120);
      this.hist = new V.Lines(400);
      this.prog = 0;
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.04, 0.06, 0.07], [0, 0.02, 0.01], 0.15);
      ctx.fx.crtOn = 0; ctx.fx.crtOff = 0; ctx.fx.bloom = 0.45;
      // He initialisation: sample N(0, sqrt(2/n)) with Box-Muller, n = 256
      var n = 256, sigma = Math.sqrt(2 / n), r = C.rng(0x4865), i = 0;
      while (i < this.he.length) {
        var u1 = Math.max(r(), 1e-9), u2 = r();
        var g1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(TAU * u2);
        var g2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(TAU * u2);
        this.he[i++] = g1 * sigma; if (i < this.he.length) this.he[i++] = g2 * sigma;
      }
      this.sigma = sigma;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, T = ctx.t, b = ctx.beat;
      var on = clamp((l - 0.15) / 1.4, 0, 1);
      ctx.fx.crtOn = on === 1 ? 1 : E.outQuart(on);
      if (l < 1.0 && b.pulse > 0.1) ctx.fx.flash = Math.max(ctx.fx.flash, b.pulse * 0.22);
      var c = hud.fc;
      // ---- platonic table, builds one solid at a time ----
      if (l > 4.0) {
        hud.win(60, 120, 430, 236, "euler_characteristic.tbl", {});
        hud.T(84, 166, "V     E     F    V-E+F", { size: 13, color: COL.dim });
        for (var i = 0; i < 5; i++) {
          var t0 = 4.0 + i * 0.62;
          if (l < t0) break;
          var S = L.PLATONIC[L.PLATONIC_ORDER[i]];
          var on2 = l < t0 + 0.62;
          hud.T(84, 194 + i * 26, (S.name + "                    ").slice(0, 17) +
            "   " + S.V + "    " + S.E + "    " + S.F + "     2",
            { size: 14, color: on2 ? COL.cyan : COL.grey, alpha: on2 ? 1 : 0.72 });
        }
        hud.formula(84, 348, "\\chi = V - E + F = 2", { size: 26, color: COL.gold });
      }
      // ---- He initialisation histogram ----
      if (l > 7.6) {
        var bx = 60, by = 900, bw = 620, bh = 130;
        hud.win(bx - 12, by - bh - 42, bw + 24, bh + 42, "he_init  N(0, 2/n)   n=256", {});
        var bins = 48, counts = new Float32Array(bins), maxc = 0;
        var shown = Math.floor(clamp((l - 7.6) / 3.0, 0, 1) * this.he.length);
        for (var k = 0; k < shown; k++) {
          var v = this.he[k] / (this.sigma * 4) + 0.5;
          var bi = clamp(Math.floor(v * bins), 0, bins - 1);
          counts[bi]++; if (counts[bi] > maxc) maxc = counts[bi];
        }
        for (var j = 0; j < bins; j++) {
          var hgt = maxc ? counts[j] / maxc * (bh - 8) : 0;
          var good = Math.abs((j / bins - 0.5) * 4) < 1.2;
          hud.rect(bx + j * bw / bins, by - hgt, bw / bins - 1.4, hgt,
            { fill: good ? COL.cyan : COL.faint, alpha: 0.85 });
        }
        hud.line(bx + bw / 2, by - bh - 6, bx + bw / 2, by, { color: "rgba(255,201,74,0.8)", lw: 1.5 });
        hud.line(bx + bw / 2 - bw * 0.30, by - bh - 6, bx + bw / 2 - bw * 0.30, by, { color: "rgba(255,201,74,0.5)", dash: [4, 4] });
        hud.line(bx + bw / 2 + bw * 0.30, by - bh - 6, bx + bw / 2 + bw * 0.30, by, { color: "rgba(255,201,74,0.5)", dash: [4, 4] });
        hud.formula(bx, by + 30, "w \\sim N(0, \\sqrt{2/n})", { size: 24, color: COL.white });
        hud.T(bx + 330, by + 30, "sd = " + this.sigma.toFixed(6) + "   n = 256", { size: 14, color: COL.green });
      }
      // ---- typed command at the end ----
      var ts = 14.05, cps = 7.4;
      if (T > 13.0) hud.T(70, 604, ">>>", { size: 20, color: COL.green, alpha: 0.95 });
      if (T > ts) {
        var s = "world.execute(me);";
        var nch = clamp(Math.floor((T - ts) * cps), 0, s.length);
        hud.T(134, 604, s.slice(0, nch), { size: 20, color: COL.white });
        if (nch < s.length && Math.floor(T * 3.2) % 2 === 0) hud.T(134 + hud.fc.measureText(s.slice(0, nch)).width + 6, 604, "_", { size: 20, color: COL.cyan });
        if (nch >= s.length && T - (ts + s.length / cps) < 0.05) ctx.fx.flash = Math.max(ctx.fx.flash, 0.6);
      } else if (T > 13.0 && Math.floor(T * 3.2) % 2 === 0) {
        hud.T(134, 604, "_", { size: 20, color: COL.cyan });
      }
      hud.T(ctx.W - 60, 604, "POST  " + (Math.min(99, Math.floor(l * 7)) ) + "%", { size: 14, color: COL.dim, align: "right" });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx, cam = ctx.cam;
      var on = clamp((l - 0.15) / 1.4, 0, 1);
      if (on < 0.5) return;
      var grow = clamp(l / 3.6, 0, 1);
      // ---- PCB traces etching themselves in (ortho camera works in pixels) ----
      var SC = ctx.W / 16.6, OX = ctx.W / 2, OY = ctx.H / 2;
      var TR = this.traces; TR.clear();
      var total = 0, want = 0;
      for (var i = 0; i < this.pcb.traces.length; i++) total += this.pcb.traces[i].length - 1;
      want = Math.floor(total * grow);
      var drawn = 0, rr = C.rng(7);
      for (var i2 = 0; i2 < this.pcb.traces.length && drawn < want; i2++) {
        var pts = this.pcb.traces[i2];
        for (var k = 0; k + 1 < pts.length && drawn < want; k++, drawn++) {
          var a = pts[k], b2 = pts[k + 1];
          var live = (drawn % 37) < 4;
          TR.seg(OX + a[0] * SC, OY + a[1] * SC, 0, OX + b2[0] * SC, OY + b2[1] * SC, 0,
            live ? GOLD : [0.30, 0.72, 0.52], live ? 2.6 : 2.0, live ? 0.95 : 0.55);
        }
      }
      TR.draw(g, { add: true, glow: 0.35 });
      var P = this.pads; P.clear();
      for (var p = 0; p < this.pcb.pads.length; p++) {
        var pd = this.pcb.pads[p];
        if (p / this.pcb.pads.length > grow) break;
        P.add(OX + pd[0] * SC, OY + pd[1] * SC, 0, pd[2] * 26, [1, 0.86, 0.42], 0.9);
      }
      P.draw(g, { add: true });

      // ---- five platonic solids, one per beat, in a row ----
      if (l > 3.8) {
        var idx = clamp(Math.floor((l - 3.8) / 0.62), 0, 4);
        var sub = ((l - 3.8) / 0.62) % 1;
        for (var s = 0; s <= idx; s++) {
          var key = this.solidKeys[s];
          var mesh = this.meshes[key];
          var appear = s < idx ? 1 : E.outBack(clamp(sub / 0.45, 0, 1));
          var pulse = s === idx ? ctx.beat.pulse : 0;
          var sc = (0.62 + appear * 0.22) * (1 + pulse * 0.06);
          var ang = t * 0.45 + s * 1.1;
          var m = M4.mul(M4.compose([-4.4 + s * 2.2, 1.4, 0], M4.mul(M4.rotY(ang), M4.rotX(ang * 0.6)), sc), M4.ident());
          g.solid(mesh, m, { color: s === idx ? [0.93, 0.95, 0.98] : [0.70, 0.76, 0.84], rim: 0.85, alpha: 1 });
          g.wire(mesh, m, { color: s === idx ? CYAN : [0.42, 0.52, 0.62], alpha: s === idx ? 0.55 : 0.30, width: 1.2 });
        }
      }
    }
  });

  /* ========================================================== 02 TITLE === */
  // raymarched lattice megastructure
  var LATTICE_FS = `#version 300 es
  precision highp float;
  uniform vec2 uRes; uniform float uTime, uFly, uGlow, uCell;
  in vec2 vUV; out vec4 outC;
  float sdBox(vec3 p, vec3 b){ vec3 q = abs(p)-b; return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0); }
  mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
  float map(vec3 p){
    p.xz *= rot(p.y*0.05 + uTime*0.02);
    vec3 q = mod(p, uCell) - uCell*0.5;
    float node = sdBox(q, vec3(uCell*0.15));
    float strut = min(min(length(q.yz), length(q.xz)), length(q.xy)) - uCell*0.028;
    return min(node, strut);
  }
  void main(){
    vec2 uv = (vUV-0.5)*vec2(uRes.x/uRes.y,1.0);
    vec3 ro = vec3(uv*1.6, uTime*1.6);
    vec3 rd = normalize(vec3(uv*0.42, 1.0));
    float t = 0.0; float glow = 0.0; float hit = 0.0;
    for(int i=0;i<96;i++){
      vec3 p = ro + rd*t;
      float d = map(p);
      glow += 0.010/(0.05 + abs(d));
      if(d < 0.004){ hit = 1.0; break; }
      t += max(d*0.85, 0.010);
      if(t > 44.0) break;
    }
    vec3 col = vec3(0.015,0.020,0.030);
    col += vec3(0.22,0.58,0.92) * glow * 0.030 * uGlow;
    if(hit > 0.5){
      vec3 p = ro + rd*t;
      vec2 e = vec2(0.004,0.0);
      vec3 n = normalize(vec3(map(p+e.xyy)-map(p-e.xyy), map(p+e.yxy)-map(p-e.yxy), map(p+e.yyx)-map(p-e.yyx)));
      float lam = max(dot(n, normalize(vec3(0.4,0.7,-0.5))), 0.0);
      float fog = exp(-t*0.055);
      vec3 base = mix(vec3(0.42,0.48,0.58), vec3(0.95,0.97,1.0), lam);
      col = mix(col, base*(0.22+0.95*lam), fog);
      col += vec3(0.2,0.85,1.0) * pow(1.0-abs(dot(n,rd)), 3.0) * 0.45 * fog;
    }
    outC = vec4(col, 1.0);
  }`;

  var GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>/\\|[]{}()~^";
  var TITLE = "world.execute(me);";
  WEM.defineSection({
    id: "02", name: "title / galaxy",
    init: function () {
      var r = C.rng(2027), N = 22000;
      this.N = N;
      this.arm = new Float32Array(N * 5);
      for (var i = 0; i < N; i++) {
        var arm = i % 3;
        var rr = Math.pow(r(), 0.55);
        this.arm[i * 5] = arm;
        this.arm[i * 5 + 1] = rr;
        this.arm[i * 5 + 2] = r();
        this.arm[i * 5 + 3] = r();
        this.arm[i * 5 + 4] = r();
      }
      this.pts = new V.Points(N);
    },
    enter: function (ctx) {
      ctx.cam.reset3d(12);
      ctx.fx.mood([0.09, 0.11, 0.20], [0.02, 0.05, 0.11], 0.45);
      ctx.fx.bloom = 0.55;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, b = ctx.beat;
      var dec = clamp((l - 0.1) / 2.4, 0, 1);
      var out = "";
      for (var i = 0; i < TITLE.length; i++) {
        out += (dec > i / TITLE.length + 0.05) ? TITLE[i] : GLYPHS[Math.floor(C.h2(i * 7.3, Math.floor(ctx.t * 22)) * GLYPHS.length)];
      }
      var size = 92;
      hud.fc.save(); hud.fc.font = "700 " + size + "px " + WEM.HUD.FONTS.mono;
      var w = hud.fc.measureText(TITLE).width; hud.fc.restore();
      hud.T((ctx.W - w) / 2, 250, out, { size: size, weight: "700", color: dec > 0.98 ? COL.white : COL.cyan, spacing: "2px" });
      hud.T(ctx.W / 2, 300, "THREE-ARM SPIRAL  ·  RAYMARCHED LATTICE", { size: 15, color: COL.dim, align: "center", alpha: clamp((l - 2.6) / 1.2, 0, 1) });
      hud.formula(70, 420, "\\theta(r) = \\theta_0 + \\frac{\\ln r}{\\tan \\alpha}", { size: 28, color: COL.gold });
      hud.T(70, 470, "logarithmic arms, alpha = 12.4 deg", { size: 13, color: COL.dim });
      hud.T(70, 496, "flat rotation curve: v = const -> differential winding", { size: 13, color: COL.faint });
      hud.formula(ctx.W - 70, 420, "\\nabla \\cdot E = \\frac{\\rho}{\\epsilon_0}", { size: 28, color: COL.cyan, align: "right" });
      hud.T(ctx.W - 70, 470, "lattice resolved in the fragment shader", { size: 13, color: COL.dim, align: "right" });
      hud.T(70, ctx.H - 96, ctx.lyric ? "> " + ctx.lyric.text : "", { size: 15, color: COL.green, alpha: 0.8 });
      if (Math.floor(l) === 3 && b.pulse > 0.9) ctx.fx.hit(0.5);
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx, cam = ctx.cam, b = ctx.beat;
      // ---- the lattice megastructure, full screen ----
      var reveal = smooth(3.4, 6.4, l);
      if (reveal > 0.01) {
        ctx.fs("lattice", LATTICE_FS, {
          uRes: [ctx.W, ctx.H], uTime: t, uFly: 1.0,
          uGlow: reveal * (0.8 + 0.7 * b.pulse), uCell: 3.0
        }, "current");
      }
      // ---- three-arm logarithmic spiral galaxy ----
      var gal = 1 - smooth(5.6, 7.6, l);
      if (gal > 0.01) {
        cam.mode = "persp"; cam.fov = 0.9;
        var az = t * 0.14;
        cam.pos = [Math.sin(az) * 13, 8.2, Math.cos(az) * 13];
        cam.target = [0, 0, 0];
        cam.update();
        var P = this.pts; P.clear();
        var tanA = Math.tan(12.4 * PI / 180);
        for (var i = 0; i < this.N; i++) {
          var arm = this.arm[i * 5], rr = this.arm[i * 5 + 1], a1 = this.arm[i * 5 + 2], a2 = this.arm[i * 5 + 3], a3 = this.arm[i * 5 + 4];
          var rad = 0.6 + rr * 8.4;
          // differential rotation: inner material orbits faster
          var omega = 1.25 * Math.pow(rad, -0.62);
          var th = arm * TAU / 3 + Math.log(rad / 0.6) / tanA - t * omega * 0.22 + (a1 - 0.5) * 0.28 / (0.3 + rad * 0.3);
          var x = Math.cos(th) * rad + (a2 - 0.5) * 0.5;
          var z = Math.sin(th) * rad + (a3 - 0.5) * 0.5;
          var y = (a2 - 0.5) * 0.9 * Math.exp(-rad * 0.22);
          var inner = 1 - clamp(rad / 8.4, 0, 1);
          var col = rad < 2.2 ? [1.0, 0.94, 0.80] : (arm === 0 ? [0.62, 0.80, 1.0] : arm === 1 ? [1.0, 0.88, 0.62] : [0.86, 0.72, 1.0]);
          P.add(x, y, z, 1.8 + a3 * 3.4, col, gal * (0.30 + 0.55 * (0.4 + inner)));
        }
        P.draw(g, { add: true, soft: 0.85 });
        // core
        var CP = new V.Points(1);
        CP.add(0, 0, 0, 26 + b.pulse * 18, [1, 0.95, 0.85], gal);
        CP.draw(g, { add: true });
      }
    }
  });

  /* ==================================================== 03 DEFINITIONS === */
  // Byrne-style plate: Euclid I.1, two circles and the equilateral triangle
  function byrnePlate(c, x0, y0, s, alpha) {
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = "#efe9dc"; c.fillRect(x0, y0, s, s);
    c.strokeStyle = "#2a2622"; c.lineWidth = 2;
    c.strokeRect(x0 + 0.5, y0 + 0.5, s - 1, s - 1);
    c.strokeRect(x0 + 12.5, y0 + 12.5, s - 25, s - 25);
    var A = [x0 + s * 0.30, y0 + s * 0.72], B = [x0 + s * 0.70, y0 + s * 0.72];
    var rAB = Math.hypot(B[0] - A[0], B[1] - A[1]);
    var h = Math.sqrt(3) / 2 * rAB;
    var Cc = [(A[0] + B[0]) / 2, A[1] - h];
    c.lineWidth = 2.1;
    c.beginPath(); c.arc(A[0], A[1], rAB, 0, TAU); c.stroke();          // circle BCD
    c.beginPath(); c.arc(B[0], B[1], rAB, 0, TAU); c.stroke();          // circle ACE
    c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.lineTo(Cc[0], Cc[1]); c.closePath(); c.stroke();
    c.fillStyle = "#2a2622";
    [[A, "A"], [B, "B"], [Cc, "C"]].forEach(function (p) {
      c.beginPath(); c.arc(p[0][0], p[0][1], 3.4, 0, TAU); c.fill();
      c.font = "italic 22px " + WEM.HUD.FONTS.math;
      c.fillText(p[1], p[0][0] - 20, p[0][1] - 10);
    });
    c.font = "italic 20px " + WEM.HUD.FONTS.math;
    c.fillText("D", A[0] + rAB * 0.72, A[1] + 16);
    c.fillText("E", B[0] - rAB * 0.80, B[1] + 16);
    c.font = "600 15px " + WEM.HUD.FONTS.mono;
    c.fillStyle = "#5a5048";
    c.fillText("PROPOSITION I  ·  PROBLEM", x0 + 28, y0 + s - 34);
    c.fillText("On a given finite straight line to construct", x0 + 28, y0 + s - 16);
    c.font = "italic 17px " + WEM.HUD.FONTS.math;
    c.fillStyle = "#2a2622";
    c.fillText("an equilateral triangle.", x0 + 28, y0 + s - 0 + 2 - 0);
    c.restore();
  }

  WEM.defineSection({
    id: "03", name: "definitions",
    init: function () {
      this.envelope = new V.Lines(1600);
      this.tangents = new V.Lines(900);
      this.tanPts = [];
      // eps-N: a_n = (1 + 1/n)^n -> e
      this.e = Math.E;
      this.an = [];
      for (var n = 1; n <= 400; n++) this.an.push(Math.pow(1 + 1 / n, n));
      // 2^53 quantisation
      this.q = [];
      var base = Math.pow(2, 53);
      for (var i = -3; i <= 6; i++) this.q.push({ v: base + i, exact: (base + i) - base === i });
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.07, 0.08, 0.11], [0.03, 0.03, 0.05], 0.25);
      ctx.fx.bloom = 0.42;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      // phase 0 : Byrne plate
      var p0 = 1 - smooth(3.0, 3.8, l);
      if (p0 > 0.01) byrnePlate(hud.fc, 250, 150, 620, p0);
      if (l < 3.9) {
        hud.formula(940, 240, "AB = AC = BC", { size: 34, color: COL.white, alpha: p0 });
        hud.T(940, 300, "EUCLID, ELEMENTS I  ·  BYRNE 1847 PLATE", { size: 15, color: COL.dim, alpha: p0 });
        hud.T(940, 330, "the proof is a picture: no symbols are required", { size: 13, color: COL.faint, alpha: p0 });
      }
      // phase 1 : unit circle, sin, tangent envelope
      var p1 = smooth(3.4, 4.0, l) * (1 - smooth(7.2, 7.9, l));
      if (p1 > 0.01) {
        var c = hud.fc, cx = 420, cy = 560, R = 150;
        c.save(); c.globalAlpha = p1;
        c.strokeStyle = "rgba(238,242,246,0.45)"; c.lineWidth = 1.5;
        c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
        c.setLineDash([3, 5]); c.beginPath();
        c.moveTo(cx - R - 24, cy); c.lineTo(cx + R + 24, cy);
        c.moveTo(cx, cy - R - 24); c.lineTo(cx, cy + R + 24); c.stroke(); c.setLineDash([]);
        var th = (l - 3.4) * 2.4;
        var px = cx + Math.cos(th) * R, py = cy - Math.sin(th) * R;
        c.strokeStyle = "rgba(255,201,74,0.95)"; c.lineWidth = 2.4;
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(px, py); c.stroke();
        c.strokeStyle = "rgba(126,231,135,0.95)"; c.lineWidth = 2.6;
        c.beginPath();
        for (var i = 0; i <= 200; i++) {
          var a = th * i / 200;
          var xx = cx + R + 60 + (a / th) * 620, yy = cy - Math.sin(a) * R;
          if (i === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy);
        }
        c.stroke();
        // tangent family along the sine curve
        c.strokeStyle = "rgba(53,224,255,0.30)"; c.lineWidth = 1.2;
        for (var k = -6; k <= 14; k++) {
          var x0 = k * 44;
          if (x0 < -(cx - R + 60) || x0 > 620) continue;
          var slope = Math.cos((x0 / 620) * th);
          var X = cx + R + 60 + x0, Y = cy - Math.sin((x0 / 620) * th) * R;
          c.beginPath();
          c.moveTo(X - 30, Y + slope * 30 * (R / 150) * 0.43);
          c.lineTo(X + 30, Y - slope * 30 * (R / 150) * 0.43);
          c.stroke();
        }
        c.restore();
        hud.formula(cx - 40, cy - R - 60, "x^2 + y^2 = 1", { size: 30, color: COL.white, alpha: p1 });
        hud.formula(cx + 700, 300, "y = \\sin \\theta", { size: 30, color: COL.green, alpha: p1 });
        hud.T(cx + 700, 350, "cyan lines: the tangent family; its envelope is the sine curve itself", { size: 13, color: COL.dim, alpha: p1 });
        hud.formula(cx + 700, 400, "y' = \\cos \\theta", { size: 26, color: COL.cyan, alpha: p1 });
      }
      // phase 2 : eps-N limit
      var p2 = smooth(7.0, 7.7, l) * (1 - smooth(10.0, 10.6, l));
      if (p2 > 0.01) {
        var gx = 150, gy = 260, gw = 760, gh = 360;
        hud.rect(gx, gy, gw, gh, { fill: "rgba(6,9,14,0.72)", stroke: "rgba(238,242,246,0.35)" });
        var c2 = hud.fc;
        c2.save(); c2.globalAlpha = p2;
        var Nmax = 400, prog = clamp((l - 7.0) / 2.4, 0, 1);
        var shown = Math.max(2, Math.floor(prog * Nmax));
        var lo = 2.0, hi = 2.9;
        var Y = function (v) { return gy + gh - (v - lo) / (hi - lo) * gh; };
        var X = function (n) { return gx + Math.log(n) / Math.log(Nmax) * gw; };
        c2.strokeStyle = "rgba(255,201,74,0.9)"; c2.lineWidth = 1.6; c2.setLineDash([6, 5]);
        c2.beginPath(); c2.moveTo(gx, Y(this.e)); c2.lineTo(gx + gw, Y(this.e)); c2.stroke(); c2.setLineDash([]);
        c2.font = "13px " + WEM.HUD.FONTS.mono; c2.fillStyle = "rgba(255,201,74,0.95)";
        c2.fillText("e = 2.718281828...", gx + 8, Y(this.e) - 8);
        // current epsilon band
        var eps = this.an[shown - 1] - this.e;
        c2.strokeStyle = "rgba(255,90,82,0.55)"; c2.lineWidth = 1;
        c2.beginPath(); c2.moveTo(gx, Y(this.e + Math.abs(eps))); c2.lineTo(gx + gw, Y(this.e + Math.abs(eps)));
        c2.moveTo(gx, Y(this.e - Math.abs(eps))); c2.lineTo(gx + gw, Y(this.e - Math.abs(eps))); c2.stroke();
        c2.strokeStyle = "rgba(53,224,255,1)"; c2.lineWidth = 2.2; c2.beginPath();
        for (var n2 = 1; n2 <= shown; n2++) {
          var xx2 = X(n2), yy2 = Y(this.an[n2 - 1]);
          if (n2 === 1) c2.moveTo(xx2, yy2); else c2.lineTo(xx2, yy2);
        }
        c2.stroke(); c2.restore();
        hud.formula(gx, gy - 22, "a_n = \\left(1 + \\frac{1}{n}\\right)^n \\to e", { size: 30, color: COL.white, alpha: p2 });
        hud.T(gx + gw, gy - 22, "n = " + shown + "    |a_n - e| = " + Math.abs(eps).toExponential(3), { size: 14, color: COL.cyan, align: "right", alpha: p2 });
        hud.T(gx + gw, gy + gh + 26, "for every eps > 0 there is an N with |a_n - e| < eps for all n > N", { size: 13, color: COL.dim, align: "right", alpha: p2 });
      }
      // phase 3 : 2^53 quantisation
      var p3 = smooth(9.8, 10.5, l);
      if (p3 > 0.01) {
        hud.formula(150, 150, "2^{53} = 9007199254740992", { size: 32, color: COL.white, alpha: p3 });
        var c3 = hud.fc;
        c3.save(); c3.globalAlpha = p3;
        var y0 = 420, x0 = 300, step = 210;
        c3.strokeStyle = "rgba(238,242,246,0.55)"; c3.lineWidth = 2;
        c3.beginPath(); c3.moveTo(x0 - 130, y0); c3.lineTo(x0 + step * 9 + 40, y0); c3.stroke();
        c3.font = "13px " + W3FONT();
        for (var i3 = 0; i3 < this.q.length; i3++) {
          var item = this.q[i3];
          var X3 = x0 + i3 * step;
          var real = Math.pow(2, 53) + (i3 - 3);
          var repr = real === Math.pow(2, 53) ? Math.pow(2, 53) : real;
          var ok = item.exact;
          c3.fillStyle = ok ? "rgba(126,231,135,1)" : "rgba(255,90,82,1)";
          c3.beginPath(); c3.arc(X3, y0, 6, 0, TAU); c3.fill();
          c3.fillStyle = "rgba(238,242,246,0.9)";
          c3.textAlign = "center";
          c3.fillText(ok ? item.v.toString() : "2^53", X3, y0 + 30);
          if (!ok) {
            c3.fillStyle = "rgba(255,90,82,0.95)";
            c3.fillText("collapses", X3, y0 + 52);
          }
        }
        c3.textAlign = "left";
        c3.restore();
        hud.T(150, y0 + 130, "above 2^53 the representable integers are spaced 2 apart: x + 1 === x", { size: 15, color: COL.white, alpha: p3 });
        hud.T(150, y0 + 160, "live check:  2**53 + 1 === 2**53  ->  " + (Math.pow(2, 53) + 1 === Math.pow(2, 53)), { size: 15, color: COL.cyan, alpha: p3 });
        hud.T(150, y0 + 186, "              2**53 + 2 === 2**53  ->  " + (Math.pow(2, 53) + 2 === Math.pow(2, 53)), { size: 15, color: COL.green, alpha: p3 });
        hud.formula(150, y0 + 240, "\\epsilon_{machine} = 2^{-52}", { size: 28, color: COL.gold, alpha: p3 });
      }
      function W3FONT() { return WEM.HUD.FONTS.mono; }
    },
    draw3d: function (ctx) {
      // the plate and plots are 2D; a faint measurement grid gives the section depth
      var l = ctx.local, t = ctx.t, g = ctx.gfx;
      if (l < 3.4 || l > 8.0) return;
      var GG = new V.Lines(240);
      var a = smooth(3.4, 4.2, l) * (1 - smooth(7.2, 8.0, l));
      for (var i = 0; i <= 20; i++) {
        GG.seg(560, 120 + i * 42, 1, 1900, 120 + i * 42, 1, [0.30, 0.42, 0.55], 1, 0.10 * a);
        GG.seg(560 + i * 67, 120, 1, 560 + i * 67, 960, 1, [0.30, 0.42, 0.55], 1, 0.10 * a);
      }
      GG.draw(g, { add: true });
    }
  });
})();
