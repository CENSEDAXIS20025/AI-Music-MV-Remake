/* ============================================================================
   world.execute(me);  [v2]  --  lab: the maths behind the second storyboard
   Platonic solids, Bessel modes, Chladni, Voronoi, Dijkstra cracks, attention,
   dielectric breakdown, phyllotaxis, inspiral, bit level identity, heart curves.
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, V3 = C.V3, M4 = C.M4, V = WEM.Viz;
  var PI = Math.PI, TAU = PI * 2;

  /* ------------------------------------------------------ platonic solids */
  // exact vertex / face data, faces listed with their true polygon order
  var PHI = (1 + Math.sqrt(5)) / 2;
  var PLATONIC = {
    tetra: {
      name: "tetrahedron", V: 4, E: 6, F: 4,
      verts: [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]],
      faces: [[0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]]
    },
    cube: {
      name: "cube", V: 8, E: 12, F: 6,
      verts: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],
      faces: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]
    },
    octa: {
      name: "octahedron", V: 6, E: 12, F: 8,
      verts: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
      faces: [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]]
    },
    dodeca: (function () {
      var inv = 1 / PHI, v = [], faces = [];
      [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]
        .forEach(function (p) { v.push(p); });
      [[0, inv, PHI], [0, inv, -PHI], [0, -inv, PHI], [0, -inv, -PHI],
      [inv, PHI, 0], [inv, -PHI, 0], [-inv, PHI, 0], [-inv, -PHI, 0],
      [PHI, 0, inv], [-PHI, 0, inv], [PHI, 0, -inv], [-PHI, 0, -inv]].forEach(function (p) { v.push(p); });
      // each face lies in the plane normal to one icosahedral direction: take the
      // five vertices with the largest projection, then order them around the normal
      for (var i = 8; i < 20; i++) {
        var d = V3.norm(v[i]);
        var order = v.map(function (p, idx) { return [V3.dot(p, d), idx]; })
          .sort(function (a, b) { return b[0] - a[0]; })
          .slice(0, 5).map(function (e) { return e[1]; });
        var up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
        var e1 = V3.norm(V3.cross(up, d)), e2 = V3.cross(d, e1);
        order.sort(function (a, b) {
          var pa = v[a], pb = v[b];
          return Math.atan2(V3.dot(pa, e2), V3.dot(pa, e1)) - Math.atan2(V3.dot(pb, e2), V3.dot(pb, e1));
        });
        faces.push(order);
      }
      return { name: "dodecahedron", V: 20, E: 30, F: 12, verts: v, faces: faces };
    })(),
    icosa: {
      name: "icosahedron", V: 12, E: 30, F: 20,
      verts: [[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
      [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
      [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]],
      faces: [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]]
    }
  };
  var PLATONIC_ORDER = ["tetra", "cube", "octa", "dodeca", "icosa"];

  // triangulate a platonic solid and normalise it to unit radius
  function solidMesh(key) {
    var S = PLATONIC[key];
    var scale = 0.5 / Math.max(Math.abs(S.verts[0][0]), 1) * (1 / Math.max.apply(null, S.verts.map(function (v) { return V3.len(v); }))) * 1;
    var pos = [], idx = [];
    S.verts.forEach(function (v) {
      var n = V3.scale(v, 0.5 / Math.sqrt(3));
      pos.push(n[0], n[1], n[2]);
    });
    S.faces.forEach(function (f) {
      for (var i = 1; i + 1 < f.length; i++) idx.push(f[0], f[i], f[i + 1]);
    });
    return { pos: new Float32Array(pos), idx: new Uint16Array(idx), src: S };
  }

  /* ------------------------------------------------------------ functs */
  // Bessel J_n by its power series (accurate for the small arguments used here)
  function besselJ(n, x) {
    var s = 0, t = Math.pow(x / 2, n) / fact(n);
    for (var k = 0; k < 60; k++) {
      s += t;
      t *= -(x * x / 4) / ((k + 1) * (k + n + 1));
      if (Math.abs(t) < 1e-14 * Math.abs(s) + 1e-300) break;
    }
    return s;
  }
  function fact(n) { var r = 1; for (var i = 2; i <= n; i++) r *= i; return r; }
  function besselZero(n, which) {   // which-th positive zero by bisection
    var count = 0, prev = besselJ(n, 0.001), x = 0.001, step = 0.01;
    for (var i = 0; i < 400000; i++) {
      x += step;
      var cur = besselJ(n, x);
      if (prev === 0 || (prev < 0) !== (cur < 0)) {
        if (cur !== 0) count++;
        if (count === which) {
          var lo = x - step, hi = x;
          for (var b = 0; b < 60; b++) {
            var mid = (lo + hi) / 2;
            if ((besselJ(n, lo) < 0) !== (besselJ(n, mid) < 0)) hi = mid; else lo = mid;
          }
          return (lo + hi) / 2;
        }
      }
      prev = cur;
      if (x > 60) break;
    }
    return 0;
  }

  // Chladni plate mode (m,n): cos(n pi x) cos(m pi y) - cos(m pi x) cos(n pi y)
  function chladni(m, n, x, y) {
    return Math.cos(n * PI * x) * Math.cos(m * PI * y) - Math.cos(m * PI * x) * Math.cos(n * PI * y);
  }

  /* --------------------------------------------------------------- misc */
  function popcount(x) { var c = 0; while (x) { c += x & 1; x >>>= 1; } return c; }
  function bits8(x) { var s = ""; for (var i = 7; i >= 0; i--) s += (x >> i) & 1; return s; }

  // sunflower / phyllotaxis: r = c sqrt(n), theta = n * 137.508 deg
  var GOLDEN = 137.50776405003785 * PI / 180;
  function phyllotaxis(n, c) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var r = (c || 1) * Math.sqrt(i);
      var a = i * GOLDEN;
      out.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return out;
  }

  // binary inspiral: separation a(t) = a0 * ((t_c - t)/t_c)^(1/4)
  function inspiral(t, tc, a0) {
    var u = Math.max(0, (tc - t) / tc);
    return a0 * Math.pow(u, 0.25);
  }
  // gravitational-wave frequency chirp f ~ (t_c - t)^(-3/8)
  function chirp(t, tc, f0) {
    var u = Math.max(1e-6, (tc - t) / tc);
    return f0 * Math.pow(u, -0.375);
  }

  // dielectric-breakdown / DLA style growth in 2D: returns branch segments
  function breakdown(seed, steps, spread) {
    var r = C.rng(seed);
    var segs = [], tips = [[0, 0, 0, 0]];
    for (var s = 0; s < steps; s++) {
      var i = Math.floor(r() * tips.length);
      var t = tips[i];
      var ang = t[3] + (r() - 0.5) * spread;
      var len = 0.10 + r() * 0.16;
      var nx = t[2] + Math.cos(ang) * len, ny = t[1] + Math.sin(ang) * len;
      segs.push([t[2], t[1], nx, ny, s / steps]);
      tips[i] = [0, ny, nx, ang];
      if (r() < 0.34 && tips.length < 420) tips.push([0, ny, nx, ang + (r() - 0.5) * 0.9]);
    }
    return segs;
  }

  // real softmax attention over a token sequence
  function attention(tokens, dim, head) {
    var r = C.rng(0x51ed + head * 7919);
    function vec(n) { var v = []; for (var i = 0; i < n; i++) v.push(r() * 2 - 1); return v; }
    var N = tokens.length, Q = [], K = [];
    for (var i = 0; i < N; i++) { Q.push(vec(dim)); K.push(vec(dim)); }
    var A = [], scale = 1 / Math.sqrt(dim);
    for (var a = 0; a < N; a++) {
      var row = [], mx = -1e9;
      for (var b = 0; b < N; b++) {
        var dot = 0;
        for (var d = 0; d < dim; d++) dot += Q[a][d] * K[b][d];
        dot *= scale;
        if (b > a) dot = -1e9;                  // causal mask
        row.push(dot);
        if (dot > mx) mx = dot;
      }
      var sum = 0;
      for (var b2 = 0; b2 < N; b2++) { row[b2] = Math.exp(row[b2] - mx); sum += row[b2]; }
      for (var b3 = 0; b3 < N; b3++) row[b3] /= sum;
      A.push(row);
    }
    return A;
  }

  // Voronoi cells by nearest site, on a coarse grid
  function voronoiSites(n, seed, radius) {
    var r = C.rng(seed), out = [];
    for (var i = 0; i < n; i++) {
      var a = r() * TAU, rad = Math.sqrt(r()) * radius;
      out.push([Math.cos(a) * rad, Math.sin(a) * rad, 0.55 + r() * 0.75]);
    }
    return out;
  }

  // Dijkstra over a grid with pseudo-random edge weights -> crack field
  function dijkstraField(w, h, seed) {
    var r = C.rng(seed);
    var cost = new Float32Array(w * h);
    for (var i = 0; i < w * h; i++) cost[i] = 0.15 + r();
    var dist = new Float32Array(w * h).fill(1e9);
    var done = new Uint8Array(w * h);
    var src = (h >> 1) * w;
    dist[src] = 0;
    var pq = [[0, src]];
    while (pq.length) {
      pq.sort(function (a, b) { return a[0] - b[0]; });
      var top = pq.shift(), u = top[1];
      if (done[u]) continue;
      done[u] = 1;
      var ux = u % w, uy = (u / w) | 0;
      for (var k = 0; k < 4; k++) {
        var nx = ux + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = uy + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        var v = ny * w + nx, nd = dist[u] + cost[v];
        if (nd < dist[v]) { dist[v] = nd; pq.push([nd, v]); }
      }
    }
    return dist;
  }

  /* --------------------------------------------------------- heart curves */
  // nine genuinely different parametric/implicit hearts
  var HEARTS = [
    { name: "16\\sin^3 t", f: function (t) { var a = t * TAU; return [Math.pow(Math.sin(a), 3), (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16]; } },
    { name: "r = 1 - \\sin\\theta", f: function (t) { var a = t * TAU; var r = 1 - Math.sin(a); return [Math.cos(a) * r, Math.sin(a) * r]; } },
    { name: "r = 1 - 2\\sin\\theta", f: function (t) { var a = t * TAU; var r = Math.abs(1 - 2 * Math.sin(a)); return [Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8]; } },
    { name: "cardioid", f: function (t) { var a = t * TAU; var r = 0.5 + 0.5 * Math.cos(a); return [Math.cos(a) * r * 2 - 0.3, Math.sin(a) * r * 2]; } },
    { name: "(x^2+y^2-1)^3 = x^2y^3", f: function (t) {   // solved radially
        var a = t * TAU, c = Math.cos(a), s = Math.sin(a), lo = 0, hi = 2;
        for (var i = 0; i < 42; i++) {
          var m = (lo + hi) / 2, x = c * m, y = s * m;
          var v = Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y;
          if (v > 0) hi = m; else lo = m;
        }
        return [c * lo, s * lo];
      } },
    { name: "x^{2/3}+y^{2/3}=1", f: function (t) { var a = t * TAU, c = Math.cos(a), s = Math.sin(a); return [Math.sign(c) * Math.pow(Math.abs(c), 3), Math.sign(s) * Math.pow(Math.abs(s), 3)]; } },
    { name: "taubin slice", f: function (t) { var a = t * TAU; return [Math.sin(a) * 0.9, Math.cos(a) * 0.9 + 0.25 * Math.cos(2 * a) - 0.1]; } },
    { name: "squircle n=4", f: function (t) { var a = t * TAU, c = Math.cos(a), s = Math.sin(a), p = 4; return [Math.sign(c) * Math.pow(Math.abs(c), 2 / p), Math.sign(s) * Math.pow(Math.abs(s), 2 / p)]; } },
    { name: "butterfly heart", f: function (t) { var a = t * TAU; return [Math.sin(a) * (Math.exp(Math.cos(a)) - 2 * Math.cos(4 * a) - Math.pow(Math.sin(a / 12), 5)) * 0.42, Math.cos(a) * (Math.exp(Math.cos(a)) - 2 * Math.cos(4 * a) - Math.pow(Math.sin(a / 12), 5)) * 0.42]; } }
  ];

  // Taubin heart implicit: (x^2 + 9/4 y^2 + z^2 - 1)^3 - x^2 z^3 - 9/80 y^2 z^3
  function taubin(x, y, z) {
    var a = x * x + 2.25 * y * y + z * z - 1;
    return a * a * a - x * x * z * z * z - (9 / 80) * y * y * z * z * z;
  }

  /* ------------------------------------------------------------ USDA data */
  // raw eggplant, per 100 g (USDA FoodData Central, SR Legacy 11053)
  var EGGPLANT = [
    { k: "water", g: 92.0, c: [0.42, 0.60, 0.86] },
    { k: "fiber", g: 3.0, c: [0.49, 0.91, 0.53] },
    { k: "K", g: 0.229, c: [1.00, 0.79, 0.29] },
    { k: "carbs", g: 5.9, c: [0.85, 0.70, 0.95] },
    { k: "protein", g: 0.98, c: [1.00, 0.62, 0.45] },
    { k: "Ca", g: 0.009, c: [0.60, 0.85, 1.00] },
    { k: "folate", g: 0.000022, c: [0.55, 0.95, 0.85] },
    { k: "fat", g: 0.18, c: [0.95, 0.90, 0.60] }
  ];
  // lycopene in hexane: real absorption maxima
  var LYCOPENE = { peaks: [444, 472, 503], gamma: 14, color: [0.86, 0.15, 0.10] };
  function lycopeneAbs(nm) {
    var s = 0;
    for (var i = 0; i < LYCOPENE.peaks.length; i++) {
      var d = (nm - LYCOPENE.peaks[i]) / LYCOPENE.gamma;
      s += Math.exp(-d * d) * (i === 1 ? 1.0 : 0.82);
    }
    return s;
  }

  WEM.Lab = {
    PLATONIC: PLATONIC, PLATONIC_ORDER: PLATONIC_ORDER, solidMesh: solidMesh,
    besselJ: besselJ, besselZero: besselZero, chladni: chladni,
    popcount: popcount, bits8: bits8, GOLDEN: GOLDEN, phyllotaxis: phyllotaxis,
    inspiral: inspiral, chirp: chirp, breakdown: breakdown,
    attention: attention, voronoiSites: voronoiSites, dijkstraField: dijkstraField,
    HEARTS: HEARTS, taubin: taubin, EGGPLANT: EGGPLANT, LYCOPENE: LYCOPENE,
    lycopeneAbs: lycopeneAbs, PHI: PHI
  };
})();
