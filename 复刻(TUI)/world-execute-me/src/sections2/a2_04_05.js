/* ============================================================================
   world.execute(me);  [v2] segments 04-05
   04 electric & time: breakdown arcs, |sin| + RC, six-blade diffraction,
      sunflower phyllotaxis, binary inspiral
   05 chorus: transformer attention heads, RLHF reward, spectrum city
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, V = WEM.Viz, L = WEM.Lab, M4 = C.M4, V3 = C.V3;
  var COL = WEM.HUD.COL, PI = Math.PI, TAU = PI * 2;
  var clamp = C.clamp, lerp = C.lerp, smooth = C.smoothstep, E = C.Ease;
  var WHITE = [0.93, 0.95, 0.98], CYAN = [0.21, 0.88, 1.0], GOLD = [1.0, 0.79, 0.29], GREEN = [0.49, 0.91, 0.53];

  var DIFFRACTION_FS = `#version 300 es
  precision highp float;
  uniform vec2 uRes; uniform float uTime, uOpen, uSpike, uBlades;
  in vec2 vUV; out vec4 outC;
  const float PI = 3.14159265;
  float airy(float x){ float t = x*3.8317/PI; float s = sin(t)/max(t,1e-4); return s*s; }
  void main(){
    vec2 uv = (vUV-0.5)*vec2(uRes.x/uRes.y,1.0);
    float ang = atan(uv.y, uv.x);
    float r = length(uv);
    // N-blade aperture: the far field is the squared sum of N coherent beams
    float sum = 0.0, sumI = 0.0;
    for(int k=0;k<8;k++){
      if(float(k) >= uBlades) break;
      float a = float(k)*PI/max(uBlades,1.0);
      float proj = r*cos(ang-a)*uSpike;
      sum += cos(proj); sumI += sin(proj);
    }
    float star = (sum*sum + sumI*sumI)/max(uBlades,1.0);
    float env = airy(r*uOpen*9.0);
    float ring = smoothstep(0.06,0.0, abs(r-0.30/uOpen)) * 0.6;
    vec3 col = vec3(0.015,0.018,0.026);
    col += vec3(1.0,0.97,0.93) * (env*env*1.1 + star*exp(-r*4.5)*0.85);
    col += vec3(0.55,0.75,1.0) * ring;
    col += vec3(0.9,0.9,1.0) * star*exp(-r*1.6)*0.18;
    outC = vec4(col, 1.0);
  }`;

  WEM.defineSection({
    id: "04", name: "electric / time",
    init: function () {
      this.arc = L.breakdown(0xE1EC, 220, 1.35);
      this.arcL = new V.Lines(240);
      this.sun = new V.Points(4200);
      this.sunPts = L.phyllotaxis(4200, 0.155);
      this.wave = new V.Lines(900);
      this.star = new V.Lines(60);
      this.binA = new V.Points(2);
      this.binL = new V.Lines(200);
      this.tc = 14.2;
      // RC filter state is derived analytically so frames stay reproducible
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.06, 0.09, 0.13], [0.02, 0.05, 0.09], 0.35);
      ctx.fx.bloom = 0.55;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      if (l < 3.0) {
        hud.formula(70, 120, "E = \\frac{V}{\\epsilon}", { size: 34, color: COL.white });
        hud.T(70, 182, "DIELECTRIC BREAKDOWN  ·  the path of least resistance", { size: 15, color: COL.dim });
        hud.T(70, 210, "each step attaches to the tip with the highest local field", { size: 13, color: COL.faint });
        var grown = clamp(l / 2.6, 0, 1);
        hud.T(70, 250, "branch tips   " + Math.round(1 + grown * 160), { size: 14, color: COL.cyan });
        hud.T(70, 274, "field strength " + (2.4 + 1.8 * Math.sin(l * 3)).toFixed(2) + " MV/m", { size: 14, color: COL.gold });
      } else if (l < 6.0) {
        var tau = (l - 3.0);
        hud.formula(70, 120, "V_{in} = |\\sin \\omega t|", { size: 30, color: COL.white });
        hud.formula(70, 176, "RC\\frac{dV_{out}}{dt} = V_{in} - V_{out}", { size: 26, color: COL.cyan });
        // integrate the RC filter for the elapsed section time
        var dt = 1 / 400, Vout = 0, RCv = 0.16;
        for (var s = 0; s < tau / dt; s++) {
          var tt = s * dt;
          Vout += dt * (Math.abs(Math.sin(tt * 6.0)) - Vout) / RCv;
        }
        hud.T(70, 226, "V_out = " + Vout.toFixed(4) + " V", { size: 15, color: COL.green });
        hud.T(70, 250, "ripple = " + (100 * (1 - Vout) / Math.max(Vout, 1e-6)).toFixed(1) + "%   RC = " + RCv.toFixed(3) + " s", { size: 13, color: COL.dim });
      } else if (l < 9.0) {
        hud.formula(70, 120, "I(\\theta) \\propto \\left|\\sum_{k=0}^{5} e^{i k \\pi/3}\\right|^2", { size: 26, color: COL.white });
        hud.T(70, 176, "SIX-BLADE APERTURE  ·  diffraction star", { size: 15, color: COL.dim });
        hud.T(70, 204, "six vanes -> six spikes; the Airy envelope sets the rings", { size: 13, color: COL.faint });
        hud.T(70, 236, "f-number  2.8      lambda 550 nm", { size: 13, color: COL.green });
      } else if (l < 11.9) {
        hud.formula(70, 120, "r = c\\sqrt{n}", { size: 30, color: COL.white });
        hud.formula(70, 176, "\\theta = n \\cdot 137.508^\\circ", { size: 30, color: COL.gold });
        hud.T(70, 232, "SUNFLOWER  ·  the golden angle packs seeds without gaps", { size: 15, color: COL.dim });
        var shown = Math.floor(clamp((l - 9.0) / 2.4, 0, 1) * 4200);
        hud.T(70, 260, "seeds  " + shown, { size: 14, color: COL.cyan });
        hud.T(70, 284, "divergence angle  " + (137.507764).toFixed(6) + " deg", { size: 13, color: COL.green });
      } else {
        var tau2 = l - 11.9;
        var a = L.inspiral(tau2 + 0.05, this.tc, 2.6);
        var f = L.chirp(tau2 + 0.05, this.tc, 0.10);
        hud.formula(70, 120, "a(t) \\propto (t_c - t)^{1/4}", { size: 30, color: COL.white });
        hud.formula(70, 176, "f_{gw} \\propto (t_c - t)^{-3/8}", { size: 28, color: COL.cyan });
        hud.T(70, 232, "INSPIRAL  ·  orbital decay by gravitational radiation", { size: 15, color: COL.dim });
        hud.T(70, 262, "separation  " + a.toFixed(4) + " AU", { size: 15, color: COL.green });
        hud.T(70, 286, "chirp freq  " + f.toFixed(3) + " Hz", { size: 14, color: COL.gold });
        hud.T(70, 310, "time to coalescence  " + Math.max(0, this.tc - tau2).toFixed(2) + " s", { size: 13, color: COL.dim });
      }
      if (ctx.lyric) hud.T(ctx.W / 2, ctx.H - 66, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.8 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx, cam = ctx.cam, b = ctx.beat;
      cam.mode = "persp"; cam.fov = 0.92;
      var az = t * 0.16;
      cam.pos = [Math.sin(az) * 7.6, 2.4, Math.cos(az) * 7.6];
      cam.target = [0, 0, 0];
      cam.up = [0, 1, 0];
      cam.update();
      var Ln = this.arcL, A = this.arc;
      if (l < 3.0) {
        // ---- dielectric breakdown arcs ----
        Ln.clear();
        var grow = clamp(l / 2.6, 0, 1);
        var n = Math.floor(A.length * grow);
        for (var i = 0; i < n; i++) {
          var s = A[i];
          var k = s[4];
          var col = k > 0.75 ? [0.72, 0.85, 1.0] : (k > 0.4 ? [0.45, 0.72, 1.0] : [0.85, 0.92, 1.0]);
          Ln.seg(s[0] * 3.0, s[1] * 3.0, (i % 7) * 0.02, s[2] * 3.0, s[3] * 3.0, 0, col, 1.2 + k * 2.6, 0.55 + 0.45 * Math.sin(t * 12 + i));
        }
        Ln.draw(g, { add: true, glow: 0.9 });
        var SP = this.star;
        SP.clear();
        for (var kk = 0; kk < 8; kk++) {
          var a2 = kk / 8 * TAU + t * 0.4;
          SP.seg(Math.cos(a2) * 3.6, Math.sin(a2) * 3.6, 0, Math.cos(a2) * 4.6, Math.sin(a2) * 4.6, 0, [0.6, 0.8, 1.0], 1.2, 0.35);
        }
        SP.draw(g, { add: true });
      } else if (l < 6.0) {
        // ---- rectified sine and its RC envelope ----
        var W = this.wave; W.clear();
        var tau = l - 3.0;
        var span = 5.0;
        for (var j = 0; j < 320; j++) {
          var u0 = j / 320 * span - span / 2, u1 = (j + 1) / 320 * span - span / 2;
          var vin0 = Math.abs(Math.sin((tau + u0) * 6.0)), vin1 = Math.abs(Math.sin((tau + u1) * 6.0));
          W.seg(u0 * 2.0, -1.6 + vin0 * 1.4, 0, u1 * 2.0, -1.6 + vin1 * 1.4, 0, [0.35, 0.55, 0.85], 1.6, 0.55);
        }
        // RC envelope, integrated from the section start
        var dt2 = 1 / 240, Vrc = 0, RCv = 0.16;
        for (var s2 = 0; s2 < (tau) / dt2; s2++) Vrc += dt2 * (Math.abs(Math.sin(s2 * dt2 * 6.0)) - Vrc) / RCv;
        var pts = [];
        for (var j2 = 0; j2 <= 160; j2++) {
          var uu = j2 / 160 * span - span / 2;
          var local = 0;
          var steps = Math.floor((tau + uu) / dt2);
          for (var q = Math.max(0, steps - 60); q <= steps; q++) local += dt2 * (Math.abs(Math.sin(q * dt2 * 6.0)) - local) / RCv;
          pts.push([uu * 2.0, -1.6 + local * 1.4, 0]);
        }
        W.path(pts, GOLD, 3.0, 0.95);
        W.draw(g, { add: true, glow: 0.5 });
      } else if (l < 9.0) {
        // ---- six-blade diffraction star ----
        var open = clamp((l - 6.0) / 1.2, 0, 1) * (0.7 + 0.3 * b.pulse);
        ctx.fs("diffraction", DIFFRACTION_FS, {
          uRes: [ctx.W, ctx.H], uTime: t, uOpen: open, uSpike: 60.0 + Math.sin(t * 0.5) * 6.0, uBlades: 6.0
        }, "current");
      } else if (l < 11.9) {
        // ---- phyllotaxis head ----
        cam.pos = [Math.sin(t * 0.2) * 3.4, 3.0, Math.cos(t * 0.2) * 3.4];
        cam.target = [0, 0.5, 0];
        cam.update();
        var P = this.sun; P.clear();
        var shown = Math.floor(clamp((l - 9.0) / 2.4, 0, 1) * this.sunPts.length);
        for (var q2 = 0; q2 < shown; q2++) {
          var pt = this.sunPts[q2];
          var r2 = Math.hypot(pt[0], pt[1]);
          var k2 = 1 - clamp(r2 / 10, 0, 1);
          P.add(pt[0], pt[1] * 0.06 + 0.5, pt[1], 2.0 + k2 * 3.4,
            k2 > 0.55 ? [1.0, 0.86, 0.42] : [0.62, 0.80, 0.52], 0.5 + 0.5 * k2);
        }
        P.draw(g, { add: true, soft: 0.8 });
      } else {
        // ---- binary inspiral ----
        var tau3 = l - 11.9;
        var a3 = L.inspiral(tau3 + 0.05, this.tc, 2.6);
        var ang = -Math.pow(Math.max(0, this.tc - tau3) / this.tc, 0.25) * 14.0 + tau3 * 3.0;
        var m1 = [Math.cos(ang) * a3 * 0.5, 0, Math.sin(ang) * a3 * 0.5];
        var m2 = [-m1[0], 0, -m1[2]];
        var L2 = this.binL; L2.clear();
        for (var w = 0; w < 160; w++) {
          var u0 = w / 160, u1 = (w + 1) / 160;
          var amp = 0.10 * Math.pow((this.tc - tau3 + 0.05) / this.tc, -0.25);
          var ph = (u0 * 26.0 - tau3 * 16.0);
          L2.seg(u0 * 6 - 3, Math.sin(ph) * amp * 2.4, u1 * 6 - 3, Math.sin(ph + 26.0 / 160) * amp * 2.4, 0, [0.55, 0.85, 1.0], 1.8, 0.5);
        }
        L2.draw(g, { add: true, glow: 0.6 });
        var BP = this.binA; BP.clear();
        BP.add(m1[0], m1[1], m1[2], 22, [1, 0.95, 0.85], 1);
        BP.add(m2[0], m2[1], m2[2], 18, [0.65, 0.82, 1.0], 1);
        BP.draw(g, { add: true });
        var ORB = new V.Lines(90);
        for (var o = 0; o < 90; o++) {
          var th0 = o / 90 * TAU, th1 = (o + 1) / 90 * TAU;
          ORB.seg(Math.cos(th0) * a3 * 0.5, 0, Math.sin(th0) * a3 * 0.5,
            Math.cos(th1) * a3 * 0.5, 0, Math.sin(th1) * a3 * 0.5, [0.35, 0.5, 0.7], 1.2, 0.35);
        }
        ORB.draw(g, { add: true });
      }
    }
  });

  /* ======================================================== 05 CHORUS === */
  WEM.defineSection({
    id: "05", name: "transformer",
    init: function (ctx) {
      // real tokens: the song's own lyric words
      var words = [];
      var lrc = ctx.data.lrc;
      for (var i = 0; i < lrc.length && words.length < 64; i++) {
        var parts = String(lrc[i].text).split(/\s+/);
        for (var j = 0; j < parts.length && words.length < 64; j++) {
          var w = parts[j].replace(/[^A-Za-z0-9]/g, "");
          if (w) words.push(w.toLowerCase());
        }
      }
      this.tokens = words;
      this.heads = [];
      for (var h = 0; h < 12; h++) this.heads.push(L.attention(words, 16, h));
      this.attnQ = new V.Points(64 * 64);
      this.reward = [];
      var r = C.rng(4242);
      var v = -0.35;
      for (var s = 0; s < 420; s++) {
        v += 0.010 * (1 - v) + (r() - 0.5) * 0.02;
        this.reward.push(v);
      }
      this.city = new V.Points(64 * 40);
      this.cityL = new V.Lines(4200);
    },
    enter: function (ctx) {
      ctx.cam.reset3d(9);
      ctx.fx.mood([0.11, 0.09, 0.16], [0.06, 0.03, 0.10], 0.35);
      ctx.fx.bloom = 0.45;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      if (l < 5.4) {
        hud.T(70, 116, "TRANSFORMER  ·  ATTENTION", { size: 19, color: COL.cyan, alpha: 0.95 });
        hud.formula(70, 168, "A = \\mathrm{softmax}\\!\\left(\\frac{QK^{T}}{\\sqrt{d}}\\right)", { size: 28, color: COL.white });
        hud.T(70, 214, "causal mask  ·  d = 16  ·  " + this.tokens.length + " real lyric tokens", { size: 13, color: COL.dim });
        // head grid
        var gx = 70, gy = 250, cell = 22;
        var layerOn = Math.floor((l / 0.42)) % 12;
        for (var hh = 0; hh < 12; hh++) {
          var hx = gx + (hh % 6) * (cell * 8 + 14), hy = gy + Math.floor(hh / 6) * (cell * 8 + 34);
          hud.rect(hx - 2, hy - 2, cell * 8 + 4, cell * 8 + 4, { stroke: hh === layerOn ? "rgba(53,224,255,0.9)" : "rgba(255,255,255,0.16)" });
          var A = this.heads[hh];
          var N = Math.min(8, A.length);
          for (var a = 0; a < N; a++) for (var bb = 0; bb <= a; bb++) {
            var w = A[a][bb];
            hud.rect(hx + bb * cell, hy + a * cell, cell - 1, cell - 1, { fill: "rgba(53,224,255," + (0.08 + w * 2.6) + ")" });
          }
          hud.T(hx, hy + cell * 8 + 16, "head " + (hh + 1), { size: 11, color: hh === layerOn ? COL.cyan : COL.faint });
        }
        hud.T(gx + 2 * (cell * 8 + 14) + 10, gy - 24, "layer " + (layerOn + 1) + " / 12", { size: 14, color: COL.cyan });
      } else if (l < 10.0) {
        hud.T(70, 116, "RLHF  ·  REWARD MODEL", { size: 19, color: COL.gold, alpha: 0.95 });
        hud.formula(70, 170, "\\max_\\pi \\mathbb{E}[r_\\phi(x,y)] - \\beta D_{KL}(\\pi \\| \\pi_{ref})", { size: 24, color: COL.white });
        var gx2 = 70, gy2 = 250, gw = 1000, gh = 320;
        hud.rect(gx2, gy2, gw, gh, { fill: "rgba(6,9,14,0.7)", stroke: "rgba(238,242,246,0.3)" });
        var c = hud.fc, nShow = Math.floor(clamp((l - 5.4) / 3.0, 0, 1) * this.reward.length);
        c.save();
        c.strokeStyle = "rgba(53,224,255,0.95)"; c.lineWidth = 2.2; c.beginPath();
        for (var i = 0; i < nShow; i++) {
          var X = gx2 + i / this.reward.length * gw, Y = gy2 + gh - clamp((this.reward[i] + 0.5) / 1.6, 0, 1) * gh;
          if (i === 0) c.moveTo(X, Y); else c.lineTo(X, Y);
        }
        c.stroke();
        c.strokeStyle = "rgba(255,255,255,0.25)"; c.lineWidth = 1;
        for (var gg = 1; gg < 6; gg++) { c.beginPath(); c.moveTo(gx2, gy2 + gg * gh / 6); c.lineTo(gx2 + gw, gy2 + gg * gh / 6); c.stroke(); }
        c.restore();
        if (nShow > 0) hud.T(gx2 + gw, gy2 - 12, "step " + nShow + "   reward " + this.reward[nShow - 1].toFixed(4), { size: 14, color: COL.green, align: "right" });
        hud.T(gx2, gy2 + gh + 28, "policy gradient with a KL leash: the reward rises, then plateaus", { size: 13, color: COL.dim });
      } else {
        hud.T(70, 116, "SPECTRUM  CITY", { size: 19, color: COL.cyan, alpha: 0.95 });
        hud.T(70, 152, "each block is one band of this recording; height is its energy now", { size: 14, color: COL.dim });
        var sp = ctx.bands;
        hud.T(70, 186, "peak band  " + (function () { var mi = 0; for (var i = 1; i < 64; i++) if (sp[i] > sp[mi]) mi = i; return mi; })() + " / 63", { size: 14, color: COL.green });
      }
      if (ctx.lyric) hud.T(ctx.W / 2, ctx.H - 66, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.85 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx, cam = ctx.cam, b = ctx.beat;
      if (l < 5.4) {
        // attention weights as a 3D point cloud of the (query,key) matrix
        cam.pos = [Math.sin(t * 0.25) * 6.5, 4.6, Math.cos(t * 0.25) * 6.5];
        cam.target = [0, 0, 0]; cam.fov = 0.9; cam.update();
        var P = this.attnQ; P.clear();
        var head = Math.floor(t * 2.4) % 12;
        var A = this.heads[head];
        var N = A.length;
        for (var a = 0; a < N; a++) {
          for (var k = 0; k < N; k++) {
            var w = A[a][k];
            if (w < 0.004) continue;
            var x = (k / N - 0.5) * 9, z = (a / N - 0.5) * 9;
            var y = Math.pow(w, 0.45) * 2.4;
            P.add(x, y, z, 1.6 + w * 26, w > 0.25 ? [1.0, 0.85, 0.45] : [0.30, 0.72, 1.0], 0.25 + w * 3.0);
          }
        }
        P.draw(g, { add: true, soft: 0.8 });
        var GG = new V.Lines(120);
        for (var i = 0; i <= 16; i++) {
          GG.seg(-4.5 + i * 0.5625, 0, -4.5, -4.5 + i * 0.5625, 0, 4.5, [0.30, 0.40, 0.55], 1, 0.18);
          GG.seg(-4.5, 0, -4.5 + i * 0.5625, 4.5, 0, -4.5 + i * 0.5625, [0.30, 0.40, 0.55], 1, 0.18);
        }
        GG.draw(g, { add: true });
      } else if (l < 10.0) {
        // reward landscape: a rising ridge
        cam.pos = [Math.sin(t * 0.18) * 9, 4.0, Math.cos(t * 0.18) * 9];
        cam.target = [0, 0.6, 0]; cam.fov = 0.9; cam.update();
        var W = new V.Lines(900); W.clear();
        var nShow = Math.floor(clamp((l - 5.4) / 3.0, 0, 1) * this.reward.length);
        for (var j = 0; j + 1 < nShow; j++) {
          var u0 = j / this.reward.length, u1 = (j + 1) / this.reward.length;
          W.seg(u0 * 12 - 6, this.reward[j] * 3.2, 0, u1 * 12 - 6, this.reward[j + 1] * 3.2, 0,
            j === nShow - 2 ? [1, 0.79, 0.29] : [0.30, 0.72, 1.0], 3.0, 0.9);
        }
        W.draw(g, { add: true, glow: 0.7 });
      } else {
        // spectrum city: blocks whose height follows the live band energy
        cam.pos = [Math.sin(t * 0.20) * 10, 5.2, Math.cos(t * 0.20) * 10];
        cam.target = [0, 0.8, 0]; cam.fov = 0.9; cam.update();
        var sp = ctx.bands;
        var CQn = 8, CW = 64;
        for (var band = 0; band < 64; band++) {
          for (var row = 0; row < 8; row++) {
            var hgt = sp[band] * (3.6 + 2.4 * Math.sin(row * 1.3 + t * 0.5)) * (1 - row * 0.06);
            var x = (band - 31.5) * 0.20;
            var z = (row - 3.5) * 0.42;
            var col = band < 12 ? GOLD : (band < 34 ? GREEN : CYAN);
            var m = M4.mul(M4.trans(x, hgt * 0.5 - 0.6, z), M4.scale(0.17, Math.max(0.02, hgt), 0.36));
            g.solid(ctx.app.boxMesh || (ctx.app.boxMesh = C.geo.box(1, 1, 1)), m,
              { color: col, rim: 0.7, alpha: 0.55 + 0.42 * sp[band], emissive: sp[band] * 0.4 });
          }
        }
        if (b.isDownbeat) ctx.fx.flash = Math.max(ctx.fx.flash, 0.14);
      }
    }
  });
})();
