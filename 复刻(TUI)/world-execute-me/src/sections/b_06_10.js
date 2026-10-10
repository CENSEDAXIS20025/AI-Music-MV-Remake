/* ============================================================================
   sections 06-10: geometry / quantum / fourier / fractal / memory
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, V = WEM.Viz, M4 = C.M4, V3 = C.V3;
  var COL = WEM.HUD.COL, PI = Math.PI, TAU = PI * 2, geo = C.geo;
  var clamp = C.clamp, lerp = C.lerp, smooth = C.smoothstep, E = C.Ease;
  var WHITE = [0.93, 0.95, 0.98], CYAN = [0.21, 0.88, 1.0], GOLD = [1.0, 0.79, 0.29];

  // polyhedron dual: vertices become face centroids of the source mesh
  function dualOf(mesh) {
    var pos = mesh.pos, idx = mesh.idx, verts = [], map = {}, out = [], oi = [];
    for (var i = 0; i < idx.length; i += 3) {
      var cx = 0, cy = 0, cz = 0;
      for (var k = 0; k < 3; k++) {
        var v = idx[i + k];
        cx += pos[v * 3]; cy += pos[v * 3 + 1]; cz += pos[v * 3 + 2];
      }
      cx /= 3; cy /= 3; cz /= 3;
      var l = Math.hypot(cx, cy, cz) || 1;
      out.push(cx / l * 0.5, cy / l * 0.5, cz / l * 0.5);
    }
    // edges between faces that shared an edge in the source
    var edgeMap = {};
    function key(a, b) { return Math.min(a, b) + ":" + Math.max(a, b); }
    for (var t = 0; t < idx.length; t += 3) {
      var f = t / 3;
      for (var e = 0; e < 3; e++) {
        var a = idx[t + e], b = idx[t + (e + 1) % 3];
        var kk = key(a, b);
        if (edgeMap[kk] === undefined) edgeMap[kk] = f;
        else { oi.push(edgeMap[kk], f); delete edgeMap[kk]; }
      }
    }
    return { pos: new Float32Array(out), idx: new Uint32Array(0), _dualEdges: oi };
  }

  /* ====================================================== 06 GEOMETRY ==== */
  WEM.defineSection({
    id: "06", name: "geometry",
    init: function (ctx) {
      this.plane = geo.plane(1, 1, 1);
      this.cube = geo.box(1, 1, 1);
      this.ico = geo.ico(1);
      this.dodeca = dualOf(geo.ico(0));
      this.octa = dualOf(geo.box(1, 1, 1));
      this.torus = geo.torus(0.62, 0.24, 72, 26);
      this.tref = geo.trefoil(0.20, 200, 12);
      this.netLines = new V.Lines(600);
      this.spin = 0;
    },
    enter: function (ctx) {
      ctx.cam.reset3d(8);
      ctx.fx.mood([0.09, 0.11, 0.17], [0.03, 0.05, 0.10], 0.30);
      ctx.fx.bloom = 0.55;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, b = ctx.beat;
      var phase = l < 5.6 ? 0 : (l < 10.4 ? 1 : 2);
      if (phase === 0) {
        hud.T(70, 1000, "NET  -->  SOLID", { size: 20, color: COL.cyan, alpha: 0.9 });
        hud.T(70, 1030, "a flat 2D layout folds into a 3D body on the bar", { size: 14, color: COL.dim });
      } else if (phase === 1) {
        hud.T(70, 1000, "PLATONIC  SOLIDS  //  V - E + F = 2", { size: 20, color: COL.gold, alpha: 0.9 });
        hud.win(70, 140, 470, 250, "euler_characteristic.tbl", {});
        var rows = [["tetrahedron", 4, 6, 4], ["cube", 8, 12, 6], ["octahedron", 6, 12, 8], ["dodecahedron", 20, 30, 12], ["icosahedron", 12, 30, 20]];
        hud.T(96, 190, "SOLID            V    E    F   V-E+F", { size: 13, color: COL.dim });
        for (var i = 0; i < rows.length; i++) {
          var r = rows[i];
          var on = (Math.floor((l - 5.6) / 0.9) % 5) === i;
          hud.T(96, 218 + i * 26, (r[0] + "                 ").slice(0, 15) + "  " + r[1] + "   " + r[2] + "   " + r[3] + "    2",
            { size: 14, color: on ? COL.cyan : COL.grey, alpha: on ? 1 : 0.75 });
        }
        hud.formula(96, 370, "\\chi = V - E + F", { size: 26, color: COL.amber });
      } else {
        hud.T(70, 1000, "TORUS  /  TREFOIL  KNOT", { size: 20, color: COL.cyan, alpha: 0.9 });
        hud.formula(70, 140, "\\chi(S^1 \\times S^1) = 0", { size: 30, color: COL.white });
        hud.formula(70, 200, "\\chi(S^2) = 2", { size: 30, color: COL.white });
        hud.formula(70, 260, "\\oint_C \\frac{dz}{z} = 2\\pi i", { size: 30, color: COL.gold });
        hud.T(70, 320, "genus 1 : one hole, no boundary", { size: 14, color: COL.dim });
      }
      if (ctx.lyric) hud.T(ctx.W / 2, 988, ctx.lyric.text, { size: 15, color: COL.white, align: "center", alpha: 0.7 });
      if (Math.abs(l - 10.4) < 0.03) ctx.fx.whiteBar = 0.5;
      if (l > 10.35 && l < 10.8) ctx.fx.whiteBar = Math.max(ctx.fx.whiteBar, 0.45);
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, b = ctx.beat, g = ctx.gfx, cam = ctx.cam;
      var phase = l < 5.6 ? 0 : (l < 10.4 ? 1 : 2);
      cam.fov = 0.95;
      if (phase === 0) {
        // look down on the flat net so the fold is legible
        cam.pos = [Math.sin(t * 0.22) * 4.0, 5.4, Math.cos(t * 0.22) * 4.0];
        cam.target = [0, -0.7, 0];
      } else {
        var az = t * 0.28;
        cam.pos = [Math.sin(az) * 7.4, 2.4 + Math.sin(t * 0.33) * 0.8, Math.cos(az) * 7.4];
        cam.target = [0, 0.2, 0];
      }
      cam.update();

      if (phase === 0) {
        // ---- a real cube net that folds up ----
        var fold = clamp((l - 2.0) / 3.2, 0, 1);
        var fo = E.inOutCubic(fold);
        var half = 0.5;
        // hinge chain: base face + 4 sides + top.
        // The net starts FLAT and folds UP into a cube, so the hinge angle has
        // to run 0 -> 90 deg as fo goes 0 -> 1. It ran the other way round, so
        // the shape started as a cube and unfolded instead.
        var transforms = [];
        // bottom face lies flat, sides hinge up, top hinges last
        var mBottom = M4.mul(M4.trans(0, -half * lerp(3.2, 1.0, fo), 0), M4.rotX(PI / 2));
        transforms.push(M4.mul(mBottom, M4.trans(0, 0, 0)));
        var sides = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
        for (var i = 0; i < 4; i++) {
          var d = sides[i];
          var hinge = lerp(0, PI / 2, fo);    // flat -> upright
          var axis = [d[2], 0, -d[0]];
          var r = M4.rotAxis(axis, -hinge);   // uniform: the axis already flips with d
          var mm = M4.mul(M4.trans(d[0] * half, -half * lerp(3.2, 1.0, fo), d[2] * half), r);
          mm = M4.mul(mm, M4.rotX(PI / 2));
          transforms.push(mm);
        }
        // the lid stays horizontal in both states, it just travels down onto the cube
        var mTop = M4.mul(M4.trans(0, lerp(-half * 3.2, half, fo), lerp(-half * 3.0, 0, fo)), M4.rotX(PI / 2));
        transforms.push(mTop);
        for (var k = 0; k < transforms.length; k++) {
          g.solid(this.plane, transforms[k], {
            color: k === 0 ? [0.30, 0.62, 0.78] : [0.88, 0.92, 0.97],
            alpha: 0.55 + 0.4 * fo, rim: 0.8, light: [0.4, 0.8, 0.5]
          });
          g.wire(this.plane, transforms[k], { color: CYAN, alpha: 0.6, width: 1.2 });
        }
        // crease lines of the net
        var L = this.netLines; L.clear();
        if (fold < 0.999) {
          for (var c2 = -2; c2 <= 2; c2++) {
            L.seg(c2 * 0.5, -half * lerp(3.2, 1.0, fo) + 0.001, -2.2, c2 * 0.5, -half * lerp(3.2, 1.0, fo) + 0.001, 2.2, GOLD, 1.2, (1 - fo) * 0.8);
          }
        }
        L.draw(g, { add: true });
      } else if (phase === 1) {
        // ---- platonic carousel ----
        var solids = [[this.cube, "cube"], [this.ico, "ico"], [this.dodeca, "dodeca"], [this.octa, "octa"]];
        var idx = Math.floor((l - 5.6) / 0.9) % solids.length;
        var sub = ((l - 5.6) / 0.9) % 1;
        var pop = E.outBack(clamp(sub / 0.35, 0, 1));
        var s = solids[idx][0];
        var m = M4.mul(M4.compose([0, 0.3, 0], M4.mul(M4.rotY(t * 0.6), M4.rotX(t * 0.27)), 3.0 * pop), M4.ident());
        if (s._dualEdges) {
          // dual meshes have edges, not faces: draw as a point/line frame
          var P = new V.Points(40), L2 = new V.Lines(60);
          var n = s.pos.length / 3;
          for (var p = 0; p < n; p++) {
            var wp = M4.xform(m, [s.pos[p * 3] * 2, s.pos[p * 3 + 1] * 2, s.pos[p * 3 + 2] * 2, 1]);
            P.add(wp[0], wp[1], wp[2], 12, GOLD, 0.95);
          }
          for (var e2 = 0; e2 < s._dualEdges.length; e2 += 2) {
            var a2 = s._dualEdges[e2], b2 = s._dualEdges[e2 + 1];
            var wa = M4.xform(m, [s.pos[a2 * 3] * 2, s.pos[a2 * 3 + 1] * 2, s.pos[a2 * 3 + 2] * 2, 1]);
            var wb = M4.xform(m, [s.pos[b2 * 3] * 2, s.pos[b2 * 3 + 1] * 2, s.pos[b2 * 3 + 2] * 2, 1]);
            L2.seg(wa[0], wa[1], wa[2], wb[0], wb[1], wb[2], CYAN, 2.0, 0.75);
          }
          L2.draw(g, { add: true, glow: 0.5 });
          P.draw(g, { add: true });
        } else {
          g.solid(s, m, { color: [0.90, 0.93, 0.97], rim: 0.9, alpha: 1 });
          g.wire(s, m, { color: CYAN, alpha: 0.55, width: 1.3 });
        }
        // ghost of the next solid
        for (var gh = 1; gh <= 2; gh++) {
          var ns = solids[(idx + gh) % solids.length][0];
          var mg = M4.mul(M4.compose([0, 0.3, -gh * 4.5], M4.rotY(t * 0.3), 2.2), M4.ident());
          if (!ns._dualEdges) g.wire(ns, mg, { color: WHITE, alpha: 0.12, width: 1 });
        }
      } else {
        // ---- torus and trefoil ----
        var k2 = clamp((l - 10.4) / 1.2, 0, 1);
        var mt = M4.mul(M4.rotX(0.5 + t * 0.2), M4.rotY(t * 0.5));
        g.solid(this.torus, M4.mul(M4.trans(-2.4 * (1 - k2), 0.2, 0), mt), { color: [0.88, 0.92, 0.97], rim: 0.8, alpha: k2 });
        g.wire(this.torus, M4.mul(M4.trans(-2.4 * (1 - k2), 0.2, 0), mt), { color: CYAN, alpha: 0.35, width: 1 });
        var mk = M4.mul(M4.compose([2.6 * k2, 0.2, 0], M4.mul(M4.rotY(t * 0.7), M4.rotX(t * 0.4)), 3.6), M4.ident());
        g.solid(this.tref, mk, { color: [0.95, 0.85, 0.55], rim: 0.9, alpha: k2 });
        g.wire(this.tref, mk, { color: GOLD, alpha: 0.30, width: 1 });
      }
    }
  });

  /* ======================================================= 07 QUANTUM ==== */
  WEM.defineSection({
    id: "07", name: "quantum",
    init: function (ctx) {
      // hydrogen 2p_z cloud by rejection sampling |psi|^2 ~ z^2 e^{-r}
      var r = C.rng(1913), pts = [];
      var tries = 0;
      while (pts.length < 2600 && tries < 400000) {
        tries++;
        var x = (r() * 2 - 1) * 9, y = (r() * 2 - 1) * 9, z = (r() * 2 - 1) * 9;
        var rad = Math.hypot(x, y, z);
        if (rad > 9) continue;
        var dens = z * z * Math.exp(-rad) / 12;
        if (r() * 0.9 < dens) pts.push([x, y, z]);
      }
      this.cloud = pts;
      this.collapseAt = 11.2;
      this.wave = new V.Lines(1200);
      this.fill = new V.Points(1600);
      this.bloch = new V.Lines(400);
      this.pts = new V.Points(2800);
    },
    enter: function (ctx) {
      ctx.cam.reset3d(9);
      ctx.fx.mood([0.16, 0.30, 0.85], [0.02, 0.06, 0.20], 0.85);   // deep blue segment
      ctx.fx.bloom = 0.85;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      var coll = clamp((l - this.collapseAt) / 0.25, 0, 1);
      hud.T(70, 120, "QUANTUM  //  |psi|^2", { size: 20, color: COL.cyan, alpha: 0.95 });
      hud.formula(70, 176, "i\\hbar \\frac{\\partial}{\\partial t}\\psi = \\hat{H}\\psi", { size: 30, color: COL.white });
      hud.formula(70, 236, "\\psi(x,t) = \\int \\phi(k) e^{i(kx - \\omega t)} dk", { size: 26, color: COL.cyan, alpha: 0.9 });
      hud.formula(70, 292, "\\Delta x \\Delta p \\geq \\frac{\\hbar}{2}", { size: 26, color: COL.gold });
      if (coll > 0.01) {
        hud.win(70, 340, 520, 150, "MEASUREMENT", { bg: "rgba(40,10,60,0.8)", color: "rgba(180,140,255,0.9)", titleBg: "rgba(180,140,255,0.95)", titleColor: "#0a0612" });
        hud.T(94, 396, "eigenstate selected   |psi> -> |x0>", { size: 15, color: COL.cyan });
        hud.T(94, 424, "wavefunction collapsed at t = " + ctx.data.sections[6].start.toFixed(3), { size: 14, color: COL.grey });
        hud.T(94, 456, "probability 1.000000", { size: 15, color: COL.gold });
      }
      // probability density bar
      var bw = 760, bx = ctx.W - bw - 70, by = 300;
      hud.line(bx, by, bx + bw, by, { color: "rgba(238,242,246,0.35)" });
      for (var i = 0; i < 80; i++) {
        var x = -8 + 16 * i / 80;
        var p = Math.exp(-Math.pow(x - 0, 2) / (2 * Math.pow(1.1 + l * 0.22, 2)));
        var hgt = p * 90 * (1 - coll);
        hud.line(bx + i * bw / 80, by, bx + i * bw / 80, by - hgt, { color: "rgba(107,232,255,0.75)", lw: 2 });
      }
      hud.T(bx + bw, by + 22, "spreading gaussian wave packet", { size: 13, color: COL.dim, align: "right" });
      if (b.index === 191 + 24 && b.pulse > 0.8) ctx.fx.hit(1.2);
      if (ctx.lyric) hud.T(ctx.W / 2, 1060 - 74, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.8 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, b = ctx.beat, g = ctx.gfx, cam = ctx.cam;
      var coll = clamp((l - this.collapseAt) / 0.25, 0, 1);
      cam.fov = 1.0;
      cam.pos = [Math.sin(t * 0.3) * 7.6, 1.6 + Math.sin(t * 0.4) * 1.0, Math.cos(t * 0.3) * 7.6 - 1.2];
      cam.target = [0, 0, 0];
      cam.update();

      // ---- wave packet Re / Im / |psi|^2 ----
      var W = this.wave, F = this.fill;
      W.clear(); F.clear();
      var sigma0 = 1.1, spread = 1 + l * 0.30;
      var k0 = 3.2;
      var N = 360;
      for (var i = 0; i < N; i++) {
        var u = i / N, u2 = (i + 1) / N;
        var x0 = -7.5 + 15 * u, x1 = -7.5 + 15 * u2;
        var s = sigma0 * spread;
        var env = Math.exp(-Math.pow(x0, 2) / (2 * s * s));
        var env1 = Math.exp(-Math.pow(x1, 2) / (2 * s * s));
        var ph = k0 * (x0 - 1.6 * t) + 0.5 * (1 / (s * s)) * t;
        var ph1 = k0 * (x1 - 1.6 * t) + 0.5 * (1 / (s * s)) * t;
        var re0 = env * Math.cos(ph) * 2.2, re1 = env1 * Math.cos(ph1) * 2.2;
        var im0 = env * Math.sin(ph) * 2.2, im1 = env1 * Math.sin(ph1) * 2.2;
        var zoff = -1.6;
        W.seg(x0 * 0.9, re0 + zoff, 0, x1 * 0.9, re1 + zoff, 0, CYAN, 3.2, 1.0);
        W.seg(x0 * 0.9, im0 + zoff, 0, x1 * 0.9, im1 + zoff, 0, [0.71, 0.55, 1.0], 2.2, 0.75);
        var dens = env * env * 26 * (1 - coll) + coll * (Math.abs(x0) < 0.12 ? 40 : 0);
        if (i % 2 === 0) F.add(x0 * 0.9, zoff, 0, Math.max(1.6, dens * b.pulse * 1.6), GOLD, 0.45 + 0.5 * (1 - coll));
      }
      W.draw(g, { add: true, glow: 0.55 });
      F.draw(g, { add: true });

      // ---- electron cloud collapsing on measurement ----
      this.pts.clear();
      var r = C.rng(31);
      var cc = this.cloud;
      for (var p = 0; p < cc.length; p++) {
        var q = cc[p];
        var jx = (r() - .5) * 0.5, jy = (r() - .5) * 0.5, jz = (r() - .5) * 0.5;
        var pul = 1 + 0.06 * Math.sin(t * 2.2 + p * 0.11);
        var xx = lerp(q[0] * 0.42 * pul + jx, 0.25, coll);
        var yy = lerp(q[1] * 0.42 * pul + jy, 2.4, coll);
        var zz = lerp(q[2] * 0.42 * pul + jz, 0.0, coll);
        var al = lerp(0.16 + 0.5 * Math.abs(q[2]) / 9, 0.9, coll);
        this.pts.add(xx, yy, zz, lerp(3.2, 7, coll), coll > 0.5 ? GOLD : [0.55, 0.78, 1.0], al);
      }
      this.pts.draw(g, { add: true });

      // ---- bloch sphere precession ----
      var B = this.bloch; B.clear();
      var R = 2.1, bx = 5.4, by = 2.6;
      for (var la = -2; la <= 2; la++) {
        var th = la / 3 * PI / 2;
        var rr = Math.cos(th) * R, yy = Math.sin(th) * R;
        for (var a2 = 0; a2 < 48; a2++) {
          var a1 = a2 / 48 * TAU, a3 = (a2 + 1) / 48 * TAU;
          B.seg(bx + Math.cos(a1) * rr, by + yy, Math.sin(a1) * rr,
            bx + Math.cos(a3) * rr, by + yy, Math.sin(a3) * rr, [0.6, 0.75, 1.0], 1.0, 0.20);
        }
      }
      for (var me = 0; me < 8; me++) {
        var ph2 = me / 8 * PI;
        for (var a4 = 0; a4 < 48; a4++) {
          var t1 = a4 / 48 * TAU, t2 = (a4 + 1) / 48 * TAU;
          B.seg(bx + Math.sin(t1) * Math.cos(ph2) * R, by + Math.cos(t1) * R, Math.sin(t1) * Math.sin(ph2) * R,
            bx + Math.sin(t2) * Math.cos(ph2) * R, by + Math.cos(t2) * R, Math.sin(t2) * Math.sin(ph2) * R,
            [0.6, 0.75, 1.0], 1.0, 0.16);
        }
      }
      var omega = 1.9;
      var pth = 1.05, pphi = t * omega;
      var sx = Math.sin(pth) * Math.cos(pphi), sy = Math.cos(pth), sz = Math.sin(pth) * Math.sin(pphi);
      B.seg(bx, by, 0, bx + sx * R, by + sy * R, sz * R, GOLD, 3.0, 1);
      B.draw(g, { add: true, glow: 0.5 });
      var PP = new V.Points(2);
      PP.add(bx + sx * R, by + sy * R, sz * R, 18, GOLD, 1);
      PP.draw(g, { add: true });
    }
  });

  /* ======================================================= 08 FOURIER ==== */
  WEM.defineSection({
    id: "08", name: "fourier",
    init: function (ctx) {
      // the psi glyph, as a polyline, then its DFT -> rotating epicycles
      var shape = [];
      var put = function (x, y) { shape.push([x, y]); };
      // draw a capital psi using strokes
      var strokes = [
        [[-0.30, -1.00], [-0.30, -0.25]],   // left stem
        [[0.30, -1.00], [0.30, -0.25]],     // right stem
        [[-0.62, -0.30], [-0.30, 0.10], [0.0, 0.02], [0.30, 0.10], [0.62, -0.30]], // cup
        [[0.0, 0.02], [0.0, 1.00]]          // tail
      ];
      strokes.forEach(function (s) {
        for (var i = 0; i + 1 < s.length; i++) {
          for (var k = 0; k < 40; k++) {
            var u = k / 40;
            put(lerp(s[i][0], s[i + 1][0], u), lerp(s[i][1], s[i + 1][1], u));
          }
        }
      });
      this.shape = shape;
      // DFT
      var N = shape.length, coef = [];
      var cx = 0, cy = 0;
      shape.forEach(function (p) { cx += p[0]; cy += p[1]; });
      cx /= N; cy /= N;
      for (var k = -40; k <= 40; k++) {
        var re = 0, im = 0;
        for (var n = 0; n < N; n++) {
          var ang = -TAU * k * n / N;
          re += (shape[n][0] - cx) * Math.cos(ang) - (shape[n][1] - cy) * Math.sin(ang);
          im += (shape[n][0] - cx) * Math.sin(ang) + (shape[n][1] - cy) * Math.cos(ang);
        }
        coef.push({ k: k, re: re / N, im: im / N, amp: Math.hypot(re, im) / N });
      }
      coef.sort(function (a, b) { return b.amp - a.amp; });
      this.coef = coef.slice(0, 56);
      this.circles = new V.Lines(300);
      this.trace = new V.Lines(700);
      this.mount = new V.Lines(9000);
      this.tracePts = [];
      this.bars = new V.Points(64);
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.08, 0.12, 0.18], [0.02, 0.06, 0.10], 0.30);
      ctx.fx.bloom = 0.6;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      var mount = smooth(7.6, 10.2, l);
      if (mount < 0.98) {
        hud.T(70, 116, "FOURIER  //  EVERY SHAPE IS A SUM OF CIRCLES", { size: 20, color: COL.cyan, alpha: 0.95 * (1 - mount) });
        hud.formula(70, 172, "f(t) = \\sum_{k=-\\infty}^{\\infty} c_k e^{i k \\omega t}", { size: 30, color: COL.white, alpha: 1 - mount });
        hud.formula(70, 232, "c_k = \\frac{1}{T}\\int_0^T f(t) e^{-i k \\omega t} dt", { size: 26, color: COL.gold, alpha: 1 - mount });
        hud.T(70, 300, "56 harmonics  ->  psi", { size: 14, color: COL.dim, alpha: 1 - mount });
      }
      var sp = ctx.bands;
      // live spectrum strip
      var bx = 70, by = 1010, bw = 700, bh = 84;
      hud.rect(bx, by - bh, bw, bh, { fill: "rgba(6,10,16,0.5)" });
      for (var i = 0; i < 64; i++) {
        var h = clamp(sp[i] * 3.8, 0, 1) * bh;   // compensated for the global band gain
        var c = i < 12 ? COL.amber : (i < 34 ? COL.green : COL.cyan);
        hud.rect(bx + i * bw / 64, by - h, bw / 64 - 1.5, h, { fill: c, alpha: 0.85 });
      }
      hud.T(bx, by + 18, "REAL SPECTRUM OF THIS RECORDING  (64 log bands, 40 Hz - 16 kHz)", { size: 12, color: COL.dim });
      if (mount > 0.02) {
        hud.T(ctx.W - 70, 116, "SPECTRAL  MOUNTAIN  RANGE", { size: 20, color: COL.gold, align: "right", alpha: mount });
        hud.T(ctx.W - 70, 148, "z = history   x = band   y = log magnitude", { size: 13, color: COL.dim, align: "right", alpha: mount });
        var mm = Math.floor(t / 60), ss = t - mm * 60;
        hud.T(ctx.W - 70, 176, "PLAYHEAD  " + mm + ":" + ss.toFixed(2), { size: 15, color: COL.cyan, align: "right", alpha: mount });
      }
      if (ctx.lyric) hud.T(ctx.W / 2, 1060 - 78, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.8 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx, cam = ctx.cam, b = ctx.beat;
      var mount = smooth(7.6, 10.2, l);
      if (mount <= 0.01) {
        cam.mode = "ortho"; cam.update();
        this.drawEpicycles(ctx, 1);
      } else {
        cam.mode = "persp"; cam.fov = 0.9;
        var az = -0.5 + t * 0.10;
        cam.pos = [Math.sin(az) * 7.5, 4.2 - mount * 1.0, Math.cos(az) * 7.5];
        cam.target = [0, -0.6, 0];
        cam.update();
        if (mount < 0.99) this.drawEpicycles(ctx, 1 - mount);
        this.drawMountains(ctx, mount);
      }
    },
    drawEpicycles: function (ctx, alpha) {
      var g = ctx.gfx, t = ctx.t;
      var coefs = this.coef;
      var cx = 700, cy = 520, SC = 250;
      var B = this.circles; B.clear();
      var path = [];
      var x = 0, y = 0;
      for (var i = 0; i < coefs.length; i++) {
        var c = coefs[i];
        var prevx = x, prevy = y;
        var ph = c.k * t * 1.5;
        x += c.re * Math.cos(ph) - c.im * Math.sin(ph);
        y += c.re * Math.sin(ph) + c.im * Math.cos(ph);
        var r = c.amp;
        // draw the circle in screen space (ortho -> pixel coordinates)
        if (r * SC > 1.2) {
          var N = 26;
          for (var k = 0; k < N; k++) {
            var a0 = k / N * TAU, a1 = (k + 1) / N * TAU;
            B.seg(cx + prevx * SC + Math.cos(a0) * r * SC, cy + prevy * SC + Math.sin(a0) * r * SC, 0,
              cx + prevx * SC + Math.cos(a1) * r * SC, cy + prevy * SC + Math.sin(a1) * r * SC, 0,
              [0.35, 0.55, 0.75], 1.0, 0.5 * alpha);
          }
        }
        path.push([cx + x * SC, cy + y * SC, 0]);
      }
      B.draw(g, { add: true });
      // the traced psi glyph
      var tr = this.tracePts;
      if (!this._lastPt || Math.abs(x - this._lastPt[0]) > 1e-6) {
        tr.push([path[path.length - 1][0], path[path.length - 1][1], 2]);
        if (tr.length > 620) tr.shift();
        this._lastPt = [x, y];
      }
      var T2 = this.trace; T2.clear();
      for (var j = 0; j + 1 < tr.length; j++) {
        var k2 = j / tr.length;
        T2.seg(tr[j][0], tr[j][1], tr[j][2], tr[j + 1][0], tr[j + 1][1], tr[j + 1][2],
          [1.0, 0.79, 0.29], 3.2, (0.15 + 0.85 * k2) * alpha);
      }
      // radius arrow
      if (path.length) {
        T2.seg(cx, cy, 0, path[path.length - 1][0], path[path.length - 1][1], 0, [0.21, 0.88, 1.0], 1.6, 0.8 * alpha);
      }
      T2.draw(g, { add: true, glow: 0.6 });
      var P = new V.Points(1);
      P.add(path[path.length - 1][0], path[path.length - 1][1], 3, 12, [1, 1, 1], 1 * alpha);
      P.draw(g, { add: true });
    },
    drawMountains: function (ctx, alpha) {
      var g = ctx.gfx, t = ctx.t, data = ctx.data;
      var rows = 96, cols = 56, tstep = 1 / 30;
      var M = this.mount; M.clear();
      var cols2 = 56;
      // history rows: spectrum of the last N frames, drawn as a wireframe terrain
      var hist = 88;
      var get = function (row, col) {
        var tt = t - (hist - row) * tstep;
        if (tt < 0) return 0;
        var f = tt * data.fps;
        var i0 = Math.floor(f);
        if (i0 < 0 || i0 >= data.frames - 1) return 0;
        var fr = f - i0;
        var a = i0 * data.bands + col, bb = (i0 + 1) * data.bands + col;
        return (data.spec[a] * (1 - fr) + data.spec[bb] * fr) / 255;
      };
      var XS = 12.0 / cols2, ZS = 9.0 / hist;
      for (var rw = 0; rw < hist; rw++) {
        for (var cl = 0; cl < cols2; cl++) {
          var h0 = get(rw, cl), h1 = get(rw, cl + 1);
          var x0 = -6.0 + cl * XS, x1 = x0 + XS;
          var z0 = -4.5 + rw * ZS;
          var y0 = h0 * h0 * 2.1, y1 = h1 * h1 * 2.1;   // calmer amplitude
          var col = cl < 12 ? [1.0, 0.72, 0.30] : (cl < 34 ? [0.49, 0.91, 0.53] : [0.35, 0.85, 1.0]);
          M.seg(x0, y0, z0, x1, y1, z0, col, 2.0, (0.34 + 0.78 * (rw / hist)) * alpha);
        }
      }
      M.draw(g, { add: true, glow: 0.4 });
      // playhead
      var P = this.bars; P.clear();
      for (var c3 = 0; c3 < cols2; c3++) {
        var hh = get(hist - 1, c3);
        P.add(-6.0 + c3 * XS, hh * hh * 2.1, 4.5, 8 + hh * 16, [1, 0.79, 0.29], 0.95 * alpha);
      }
      P.draw(g, { add: true });
      var PL = new V.Lines(4);
      PL.seg(-6.2, 0, 4.5, 6.2, 0, 4.5, [1, 0.85, 0.4], 2.4, 0.8 * alpha);
      PL.draw(g, { add: true, glow: 0.8 });
    }
  });

  /* ======================================================= 09 FRACTAL ==== */
  WEM.defineSection({
    id: "09", name: "fractal",
    init: function (ctx) {
      this.tree = new V.Lines(4000);
      this.sier = new V.Lines(4000);
      this.sierCache = {};
      this.zoomT = -0.743643887037151;
      this.zoomT2 = 0.13182590420533;
      this.levels = [];
      var r = C.rng(909);
      this.treeSeed = V.recursiveTree(6, 1.5, 1.05, r);
    },
    enter: function (ctx) {
      ctx.cam.reset3d(9);
      ctx.fx.mood([0.10, 0.10, 0.12], [0.10, 0.04, 0.02], 0.20);
      ctx.fx.bloom = 0.6;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, b = ctx.beat;
      var phase = l < 7.4 ? 0 : 1;
      if (phase === 0) {
        var zoom = Math.pow(10, clamp((l - 0.4) / 7.0, 0, 1) * 3.7);
        hud.rect(58, 86, 620, 268, { fill: "rgba(6,8,12,0.74)" });
        hud.T(70, 116, "MANDELBROT  //  z_{n+1} = z_n^2 + c", { size: 20, color: COL.cyan, alpha: 0.95 });
        hud.formula(70, 170, "z_{n+1} = z_n^2 + c", { size: 30, color: COL.white });
        hud.T(70, 230, "re " + this.zoomT.toFixed(15), { size: 14, color: COL.green });
        hud.T(70, 252, "im " + this.zoomT2.toFixed(15), { size: 14, color: COL.green });
        hud.T(70, 274, "zoom  1e" + Math.log10(zoom).toFixed(2), { size: 14, color: COL.amber });
        hud.T(70, 296, "maxiter " + Math.round(140 + Math.log10(zoom) * 90), { size: 14, color: COL.dim });
        hud.T(70, 330, "the boundary is infinite; every pixel hides the whole set", { size: 13, color: COL.faint });
      } else {
        hud.T(70, 116, "SELF-SIMILARITY  //  RECURSION", { size: 20, color: COL.gold, alpha: 0.95 });
        hud.T(70, 156, "L-system branch depth grows one level per bar", { size: 13, color: COL.dim });
        var depth = 3 + Math.floor((l - 7.4) / 1.85);
        hud.T(70, 186, "tree depth  " + Math.min(depth, 8), { size: 15, color: COL.green });
        var sd = 1 + Math.floor((l - 7.4) / 3.7);
        hud.T(70, 210, "sierpinski order " + Math.min(sd, 4), { size: 15, color: COL.cyan });
        hud.formula(70, 262, "\\dim_H = \\frac{\\log 3}{\\log 2} \\approx 1.585", { size: 26, color: COL.white });
        hud.formula(70, 314, "\\dim_H = \\frac{\\log 4}{\\log 3} \\approx 1.262", { size: 26, color: COL.white });
      }
      if (ctx.lyric) hud.T(ctx.W / 2, 1060 - 74, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.8 });
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, b = ctx.beat, g = ctx.gfx, cam = ctx.cam;
      var phase = l < 7.4 ? 0 : 1;
      if (phase === 0) {
        // fullscreen mandelbrot with an exponential dive. The zoom is capped at
        // ~5e3: beyond that float32 can no longer resolve neighbouring pixels at
        // these coordinates and the image degenerates into blocks.
        var zoom = Math.pow(10, clamp((l - 0.4) / 7.0, 0, 1) * 3.7);
        ctx.fs("mandel", WEM.Shaders.mandelFS, {
          uRes: [ctx.W, ctx.H], uTime: t,
          uCenter: [this.zoomT, this.zoomT2], uZoom: zoom * 1.6,
          uIter: 140 + Math.log10(zoom) * 90, uMorph: 0,
          uHue: 0.02 + l * 0.01, uGlow: 0.5 + b.pulse * 1.2, uGhost: 0, uJulia: 0, uC: [0, 0]
        }, "current");
      } else {
        // recursive tree + sierpinski tetrahedron
        cam.fov = 0.9;
        var az = t * 0.18;
        cam.pos = [Math.sin(az) * 8.4, 2.0, Math.cos(az) * 8.4];
        cam.target = [0, 0.1, 0];
        cam.update();
        var grow = (l - 7.4) / 1.85;
        var depth = clamp(3 + Math.floor(grow), 0, 8);
        var partial = clamp(grow - Math.floor(grow), 0, 1);
        var T = this.tree; T.clear();
        var segs = this.treeSeed;
        var shown = (depth - 3 + partial) / 5;
        for (var i = 0; i < segs.length; i++) {
          var s = segs[i];
          if (s[2] > depth) continue;
          if (s[2] === depth && partial < 0.15) continue;
          var k = 1 - (s[2] - 3) / 6;
          T.seg(s[0][0] - 3.4, s[0][1], s[0][2], s[1][0] - 3.4, s[1][1], s[1][2],
            [0.62, 0.78, 0.62], 1.0 + 2.2 * k, 0.35 + 0.6 * k);
        }
        T.draw(g, { add: true });
        var sd = clamp(1 + Math.floor((l - 7.4) / 3.7), 1, 4);
        var pf = clamp(((l - 7.4) / 3.7) % 1, 0, 1);
        if (!this.sierCache[sd]) this.sierCache[sd] = V.sierpinskiTetra(sd);
        var tris = this.sierCache[sd];
        var S = this.sier; S.clear();
        var lim = Math.floor(tris.length * (0.35 + 0.65 * pf));
        for (var j = 0; j < Math.min(lim, tris.length); j++) {
          var tr = tris[j];
          var col = j % 7 === 0 ? GOLD : CYAN;
          for (var e = 0; e < 3; e++) {
            var A = tr[e], B = tr[(e + 1) % 3];
            S.seg(A[0] * 1.5 + 3.4, A[1] * 1.5, A[2] * 1.5, B[0] * 1.5 + 3.4, B[1] * 1.5, B[2] * 1.5, col, 1.4, 0.55);
          }
        }
        S.draw(g, { add: true });
        if (b.isDownbeat && b.pulse > 0.7) ctx.fx.flash = Math.max(ctx.fx.flash, 0.20);
      }
    }
  });

  /* ======================================================== 10 MEMORY ==== */
  WEM.defineSection({
    id: "10", name: "memory",
    init: function (ctx) {
      this.NX = 16; this.NY = 8;
      this.cells = [];
      var r = C.rng(1337);
      for (var i = 0; i < this.NX * this.NY; i++) {
        this.cells.push({ live: false, marked: false, born: r() * 12, obj: 1 + Math.floor(r() * 40) });
      }
      this.cube = geo.box(0.42, 0.42, 0.42);
      this.bytes = new Uint8Array(4096);
      for (var b = 0; b < 4096; b++) this.bytes[b] = (b * 37 + ((b * b) >> 3)) & 255;
    },
    enter: function (ctx) {
      ctx.cam.reset3d(9);
      ctx.fx.mood([0.08, 0.10, 0.13], [0.02, 0.05, 0.08], 0.25);
      ctx.fx.bloom = 0.5;
    },
    compute: function (l) {
      // pure function of section time -- no per-frame mutation, so every frame is
      // reproducible no matter where the renderer starts
      var N = this.cells.length;
      var ph, phase;
      if (l < 3.6) { phase = 0; ph = l / 3.6; }
      else if (l < 7.2) { phase = 1; ph = (l - 3.6) / 3.6; }
      else if (l < 10.8) { phase = 2; ph = (l - 7.2) / 3.6; }
      else { phase = 3; ph = clamp((l - 10.8) / 3.6, 0, 1); }
      var slots = [];
      for (var i = 0; i < N; i++) {
        var c = this.cells[i];
        var allocated = l > (0.6 + c.born * 0.03) && i < 90;
        var isMarkTarget = (i % 3 === 0);
        var freeAt = 7.2 + (i / N) * 3.4;
        var alive = allocated;
        if (phase >= 2 && l > freeAt && !isMarkTarget) alive = false;
        var marked = phase === 1 && isMarkTarget && alive && ph > (i / N) * 0.92;
        var markedKept = (phase >= 2) && isMarkTarget && allocated;
        c._live = alive;
        c._marked = marked || markedKept;
        c._slot = alive ? slots.length : -1;
        if (alive) slots.push(i);
      }
      this._phase = phase; this._ph = ph; this._slots = slots;
      return phase;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t, b = ctx.beat;
      var phase = this.compute(l);
      var names = ["ALLOCATE", "MARK", "SWEEP", "COMPACT"];
      var cols = [COL.green, COL.cyan, COL.amber, COL.gold];
      hud.T(70, 116, "HEAP  //  GC CYCLE", { size: 20, color: COL.white, alpha: 0.95 });
      for (var i = 0; i < 4; i++) {
        var on = i === phase;
        hud.rect(70 + i * 190, 140, 170, 34, { fill: on ? "rgba(53,224,255,0.16)" : "rgba(255,255,255,0.03)", stroke: on ? "rgba(53,224,255,0.8)" : "rgba(255,255,255,0.15)" });
        hud.T(155 + i * 190, 163, names[i], { size: 14, color: on ? cols[i] : COL.faint, align: "center" });
      }
      // heap map strip
      var hx = 70, hy = 210, hw = 900, hh = 26;
      hud.rect(hx, hy, hw, hh, { stroke: "rgba(238,242,246,0.4)" });
      for (var c = 0; c < this.cells.length; c++) {
        var cell = this.cells[c];
        var cw = hw / this.cells.length;
        var col = cell.marked ? "rgba(53,224,255,0.95)" : (cell.live ? "rgba(126,231,135,0.75)" : "rgba(255,255,255,0.07)");
        hud.rect(hx + c * cw + 1, hy + 2, cw - 2, hh - 4, { fill: col });
      }
      hud.T(hx, hy + hh + 20, "32 KB HEAP   " + this.cells.filter(function (x) { return x._live; }).length + " OBJECTS LIVE", { size: 13, color: COL.dim });
      hud.T(hx, hy + hh + 42, "16 x 8 x 2 CELLS   FRAGMENTATION " + (12 + 30 * Math.abs(Math.sin(l * 0.6))).toFixed(1) + "%", { size: 13, color: COL.dim });
      // hex dump panel
      hud.win(1050, 150, 800, 330, "hexdump -C /dev/heap", {});
      var base = Math.floor((t * 90) % 3800);
      hud.hexDump(1074, 200, this.bytes, 15, { base: base, size: 13, color: "#cfd6de" });
      hud.T(1074, 200 + 15 * 17 + 16, "0x" + base.toString(16).toUpperCase().padStart(6, "0") + "  reading...", { size: 13, color: COL.green });
      if (ctx.lyric) hud.T(ctx.W / 2, 1060 - 74, ctx.lyric.text, { size: 16, color: COL.white, align: "center", alpha: 0.8 });
      if (phase !== this._lastPhase) { this._lastPhase = phase; ctx.fx.hit(0.26); }   // softer cut
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, b = ctx.beat, g = ctx.gfx, cam = ctx.cam;
      this.compute(l);
      var phase = this._phase, ph = this._ph, slots = this._slots;
      cam.fov = 0.9;
      cam.pos = [Math.sin(t * 0.2) * 7.5, 5.2 - t * 0.02, Math.cos(t * 0.2) * 7.5];
      cam.target = [0, -0.6, 0];
      cam.update();
      for (var k = 0; k < slots.length; k++) {
        var ci = slots[k];
        var cell = this.cells[ci];
        var compacting = phase === 3;
        var from = ci, to = k;
        var pp = compacting ? E.inOutCubic(clamp(ph * 1.6 - (k / slots.length) * 0.6, 0, 1)) : 0;
        var slot = compacting ? lerp(from, to, pp) : from;
        var col = cell._marked ? CYAN : [0.85, 0.90, 0.95];
        var gx = slot % this.NX, gy = Math.floor(slot / this.NX);
        var x = (gx - (this.NX - 1) / 2) * 0.62;
        var y = (gy - (this.NY - 1) / 2) * 0.62 + 0.4;
        var pop = clamp((l - (0.6 + cell.born * 0.03)) / 0.3, 0, 1);
        var m = M4.mul(M4.trans(x, y, 0), M4.mul(M4.rotY(t * 0.8 + ci), M4.scale(0.75 * pop, 0.75 * pop, 0.75 * pop)));
        g.solid(this.cube, m, { color: col, rim: 0.8, alpha: cell._marked ? 0.95 : 0.75, emissive: cell._marked ? 0.35 : 0.05 });
      }
      // sweep cursor
      if (phase === 2) {
        var S = new V.Lines(40);
        var sx = -((this.NX - 1) / 2) * 0.62 - 0.5 + ph * (this.NX * 0.62);
        S.seg(sx, -2.6, 0.6, sx, 2.6, 0.6, [1, 0.55, 0.3], 3.0, 0.9);
        S.draw(g, { add: true, glow: 0.8 });
      }
      if (phase === 3) {
        var S2 = new V.Lines(4);
        S2.seg(0, -2.8, 1.0, 0, 2.8, 1.0, GOLD, 2.4, 0.7);
        S2.draw(g, { add: true, glow: 0.8 });
      }
    }
  });
})();
