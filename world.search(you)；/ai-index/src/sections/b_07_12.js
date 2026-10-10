/* sections 07-12 — facets, multimodal, sparse hits, a person, neural retrieval,
   and the word she cannot remember */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, I = WEM.Idx;
  var clamp = C.clamp, lerp = C.lerp, Ease = C.Ease, M4 = C.M4, G = C.geo;
  var V3 = C.V3, PI = C.PI, TAU = C.TAU;
  var smoothstep = C.smoothstep, h2 = C.h2, h3 = C.h3, noise2 = C.noise2;

  var RED = "#ff4d5e";
  var INK = "#eef2f6";
  var GREY = "#9aa3ad";
  var FAINT = "#5b636c";
  var UNIT_RECT = [0, 0, 1, 1];

  /* ------------------------------------------------------------------ *
   * shared scratch.  Anything that has to sit exactly on a 3D point is
   * projected with our own copy of the view-projection, built inside
   * draw2d from the camera we have just set: ctx.util.vp is a frame
   * behind, because cam.update() runs after draw2d.
   * ------------------------------------------------------------------ */
  var _mp = new Float32Array(16), _mv = new Float32Array(16), _vps = new Float32Array(16);
  var _pj = [0, 0, 0];
  var _p4 = [0, 0, 0, 0];
  var _ma = new Float32Array(16), _mb = new Float32Array(16), _mc = new Float32Array(16);
  var _md = new Float32Array(16), _me = new Float32Array(16);
  var _t0 = new Float32Array(16), _t1 = new Float32Array(16), _t2 = new Float32Array(16);
  var _t3 = new Float32Array(16), _t4 = new Float32Array(16), _t5 = new Float32Array(16);
  var _nm = new Float32Array(9);
  /* a point sprite's size field is a world diameter times about 140 at 1080p
     (pxScale / 8 = (H/2)/tan(fov/2)/8), so every size below is written as a
     world diameter times PSPR and keeps its size on screen. */
  var PSPR = 139.7;

  function mkVp(cam, W, H) {
    M4.persp(cam.fov, W / H, cam.near, cam.far, _mp);
    M4.lookAt(cam.pos, cam.target, cam.up, _mv);
    return M4.mul(_mp, _mv, _vps);
  }
  function pj(vp, x, y, z, W, H, out) {
    var w = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
    if (w < 1e-3) { out[0] = -9e3; out[1] = -9e3; out[2] = w; return out; }
    out[0] = ((vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / w * 0.5 + 0.5) * W;
    out[1] = (0.5 - (vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / w * 0.5) * H;
    out[2] = w;
    return out;
  }
  function setCam(cam, px, py, pz, tx, ty, tz, fov) {
    cam.mode = "persp"; cam.fov = fov; cam.near = 0.05; cam.far = 400; cam.roll = 0;
    cam.up[0] = 0; cam.up[1] = 1; cam.up[2] = 0;
    cam.pos[0] = px; cam.pos[1] = py; cam.pos[2] = pz;
    cam.target[0] = tx; cam.target[1] = ty; cam.target[2] = tz;
  }

  /* bake a list of {m, mat} into one mesh: one draw call per colour group */
  function mergeParts(parts) {
    var total = 0, tris = 0, i, k;
    for (i = 0; i < parts.length; i++) { total += parts[i].m.pos.length / 3; tris += parts[i].m.idx.length; }
    var pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3);
    var idx = new Uint32Array(tris), vo = 0, io = 0;
    for (i = 0; i < parts.length; i++) {
      var m = parts[i].m, mat = parts[i].mat, n = m.pos.length / 3;
      M4.normalMat3(mat, _nm);
      for (k = 0; k < n; k++) {
        var x = m.pos[k * 3], y = m.pos[k * 3 + 1], z = m.pos[k * 3 + 2];
        pos[(vo + k) * 3] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12];
        pos[(vo + k) * 3 + 1] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13];
        pos[(vo + k) * 3 + 2] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14];
        if (m.nrm) {
          var nx = m.nrm[k * 3], ny = m.nrm[k * 3 + 1], nz = m.nrm[k * 3 + 2];
          var rx = _nm[0] * nx + _nm[3] * ny + _nm[6] * nz;
          var ry = _nm[1] * nx + _nm[4] * ny + _nm[7] * nz;
          var rz = _nm[2] * nx + _nm[5] * ny + _nm[8] * nz;
          var l = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
          nrm[(vo + k) * 3] = rx / l; nrm[(vo + k) * 3 + 1] = ry / l; nrm[(vo + k) * 3 + 2] = rz / l;
        }
      }
      for (k = 0; k < m.idx.length; k++) idx[io + k] = m.idx[k] + vo;
      vo += n; io += m.idx.length;
    }
    return G.make(pos, nrm, idx);
  }

  /* a unit box stretched from a to b (tails, stems, limbs) */
  var _segA = new Float32Array(16), _segB = new Float32Array(16);
  function segMat(ax, ay, az, bx, by, bz, sx, sy, out) {
    var dx = bx - ax, dy = by - ay, dz = bz - az;
    var len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-4;
    var phi = -Math.asin(clamp(dy / len, -1, 1));
    var th = Math.atan2(dx, dz);
    M4.trans((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5, _segA);
    M4.rotY(th, _segB);
    M4.mul(_segA, _segB, _segA);
    M4.rotX(phi, _segB);
    M4.mul(_segA, _segB, _segA);
    M4.scale(sx, sy, len, _segB);
    return M4.mul(_segA, _segB, out);
  }

  function hexRGB(h) {
    h = String(h).replace("#", "");
    var v = parseInt(h, 16);
    return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
  }
  function rampLUT(stops, n) {
    var out = new Array(n), i, c;
    for (i = 0; i < n; i++) {
      var t = i / (n - 1);
      c = null;
      for (var j = 0; j < stops.length - 1; j++) {
        if (t >= stops[j][0] && t <= stops[j + 1][0]) {
          var f = (t - stops[j][0]) / Math.max(1e-6, stops[j + 1][0] - stops[j][0]);
          var a = hexRGB(stops[j][1]), b = hexRGB(stops[j + 1][1]);
          c = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
          break;
        }
      }
      if (!c) c = t < stops[0][0] ? hexRGB(stops[0][1]) : hexRGB(stops[stops.length - 1][1]);
      out[i] = "rgb(" + Math.round(clamp(c[0], 0, 1) * 255) + "," +
        Math.round(clamp(c[1], 0, 1) * 255) + "," + Math.round(clamp(c[2], 0, 1) * 255) + ")";
    }
    return out;
  }
  function measure(hud, str, size, weight) {
    var c = hud.fc; c.save();
    c.font = hud.fontStr(size, "mono", weight);
    var w = c.measureText(str).width;
    c.restore();
    return w;
  }
  function plural(n, one, many) { return n === 1 ? one : many; }

  /* ====================================================================== *
   * 07 / CAT -- faceted search.  Sixty-four rows, four boolean facets, one
   * survivor.  PURRING: NO is a NOT constraint and it multiplies the purr
   * channel of the scope by zero.
   * ====================================================================== */
  var S07 = {
    table: null, fur: null, pts: null, head: null, ident: null,
    cats: [], counts: [64, 32, 12, 3, 1], scope: null, bscratch: null,
    lat: null, mark: null, facetT: [87.46, 89.76, 92.58, 94.39]
  };

  function facetStage(t) {
    var s = 0;
    for (var i = 0; i < 4; i++) if (t >= S07.facetT[i]) s = i + 1;
    return s;
  }
  function catPasses(c, stage) {
    if (stage >= 1 && !c.f.breed) return false;
    if (stage >= 2 && !c.f.vocal) return false;
    if (stage >= 3 && !c.f.hiss) return false;
    if (stage >= 4 && c.f.purr) return false;        /* "but you never purr" */
    return true;
  }
  function catMeshes() {
    var fur = [], pts = [], head = [], i, mp;
    fur.push({ m: G.box(0.60, 0.50, 0.72), mat: M4.trans(0, 0.25, -0.10) });
    fur.push({ m: G.box(0.44, 0.56, 0.46), mat: M4.trans(0, 0.50, 0.10) });
    fur.push({ m: G.box(0.11, 0.40, 0.11), mat: M4.trans(-0.15, 0.20, 0.30) });
    fur.push({ m: G.box(0.11, 0.40, 0.11), mat: M4.trans(0.15, 0.20, 0.30) });
    pts.push({ m: G.box(0.135, 0.075, 0.22), mat: M4.trans(-0.15, 0.037, 0.38) });
    pts.push({ m: G.box(0.135, 0.075, 0.22), mat: M4.trans(0.15, 0.037, 0.38) });
    /* the tail: seven joints along a real curve; the last two are point colour */
    var prev = [0, 0.30, -0.42];
    for (i = 0; i < 7; i++) {
      var s = (i + 1) / 7;
      var ang = -1.35 + s * 4.30;
      var rad = 0.50 - 0.09 * s;
      var p = [Math.sin(ang) * rad, 0.30 + 0.52 * s - 0.24 * s * s, -0.42 + (1 - Math.cos(ang)) * 0.42];
      mp = new Float32Array(16);
      segMat(prev[0], prev[1], prev[2], p[0], p[1], p[2], 0.070, 0.070, mp);
      (i >= 5 ? pts : fur).push({ m: G.box(1, 1, 1), mat: mp });
      prev = p;
    }
    head.push({ m: G.box(0.38, 0.34, 0.36), mat: M4.trans(0, 0.92, 0.14) });
    pts.push({ m: G.box(0.17, 0.12, 0.12), mat: M4.trans(0, 0.855, 0.33) });
    var e1 = M4.mul(M4.trans(-0.125, 1.16, 0.10), M4.rotZ(0.20), new Float32Array(16));
    var e2 = M4.mul(M4.trans(0.125, 1.16, 0.10), M4.rotZ(-0.20), new Float32Array(16));
    head.push({ m: G.tetra(), mat: M4.mul(e1, M4.scale(0.34, 0.52, 0.20), new Float32Array(16)) });
    head.push({ m: G.tetra(), mat: M4.mul(e2, M4.scale(0.34, 0.52, 0.20), new Float32Array(16)) });
    return { fur: mergeParts(fur), pts: mergeParts(pts), head: mergeParts(head) };
  }

  WEM.defineSection({
    id: "07", name: "CAT",
    init: function (ctx) {
      var rnd = C.rng(0x0CA7), i, stage;
      S07.ident = M4.ident(new Float32Array(16));
      S07.table = mergeParts([
        { m: G.box(6.60, 0.10, 3.20), mat: M4.trans(0, -0.05, 0) },
        { m: G.box(0.10, 1.00, 0.10), mat: M4.trans(-3.10, -0.60, -1.45) },
        { m: G.box(0.10, 1.00, 0.10), mat: M4.trans(3.10, -0.60, -1.45) },
        { m: G.box(0.10, 1.00, 0.10), mat: M4.trans(-3.10, -0.60, 1.45) },
        { m: G.box(0.10, 1.00, 0.10), mat: M4.trans(3.10, -0.60, 1.45) }
      ]);
      var cm = catMeshes();
      S07.fur = cm.fur; S07.pts = cm.pts; S07.head = cm.head;
      S07.scope = new Float32Array(96);
      S07.bscratch = new Float32Array(64);
      S07.lat = new Float32Array(12 * 12);
      S07.mark = new Float32Array(4 * 12);
      S07.cats = [];
      var BREEDS = ["SEAL POINT", "TABBY", "CALICO", "CREAM", "SHORTHAIR"];
      for (i = 0; i < 64; i++) {
        var k = i >> 1;
        var A = (i % 2) === 0;
        var B = A && (k % 8) < 3;
        var Cc = B && (k % 8) === 0 && (k >> 3) < 3;
        var D = Cc && k === 0;
        var gx = (i % 8) - 3.5, gz = ((i >> 3) | 0) - 3.5;
        S07.cats.push({
          i: i,
          x: gx * 0.80 + (rnd() - 0.5) * 0.10,
          z: gz * 0.40 + (rnd() - 0.5) * 0.06,
          s: 0.60 + rnd() * 0.06,
          rot: (rnd() - 0.5) * 0.55,
          f: { breed: A, vocal: B, hiss: Cc, purr: D },
          fs: {
            breed: A ? "BLUE POINT" : BREEDS[1 + (i % 4)],
            vocal: B ? "HIGH" : (i % 3 === 0 ? "LOW" : "QUIET"),
            hiss: Cc ? "YES" : (i % 2 ? "NO" : "RARE"),
            purr: D ? "NO" : "YES"
          },
          fail: 9
        });
      }
      /* the counts are never typed in: they are the size of the real filter result */
      for (stage = 0; stage <= 4; stage++) {
        var cnt = 0;
        for (i = 0; i < 64; i++) if (catPasses(S07.cats[i], stage)) cnt++;
        S07.counts[stage] = cnt;
      }
      for (i = 0; i < 64; i++) {
        var cc = S07.cats[i];
        for (stage = 1; stage <= 4; stage++) if (!catPasses(cc, stage)) { cc.fail = stage; break; }
      }
    },
    enter: function () { },
    draw2d: function (ctx) {
      var hud = ctx.hud, W = ctx.W, H = ctx.H, t = ctx.t, u = ctx.local;
      var col = I.css(t), col2 = I.css2(t);
      var stage = facetStage(t);
      var count = S07.counts[stage];
      ctx.hits = count;
      var ain = 0.30 + 0.70 * ctx.in;

      /* camera: the table, then the survivor.  The push follows the log of the
         result count, so 64 -> 32 -> 12 -> 3 -> 1 reads as a real approach. */
      var push = clamp(Math.log(64 / Math.max(count, 1)) / Math.log(64), 0, 1);
      var orb = u * 0.055;
      var d = lerp(7.8, 4.1, push);
      var pulse = ctx.beat.pulse;
      setCam(ctx.cam,
        Math.sin(orb) * d * 0.55 + 0.30,
        lerp(2.95, 1.30, push) + 0.10 * pulse,
        Math.cos(orb) * d,
        0, lerp(0.55, 0.62, push), 0.15, 0.86);

      /* -- facet card: real checkboxes, ticked on the beat the line lands -- */
      var box = I.card(ctx, 56, 150, 336, 274, { title: "FACETS", right: stage + " / 4 APPLIED", tab: "07  CAT" });
      var rows = [
        { k: "BREED", v: "BLUE POINT", q: "BREED = BLUE POINT", n: S07.counts[1] },
        { k: "VOCAL", v: "HIGH", q: "MEOW RATE > 12 / MIN", n: S07.counts[2] },
        { k: "HISSING", v: "YES", q: "HISS EVENTS >= 1", n: S07.counts[3] },
        { k: "PURRING", v: "NO", q: "NOT PURRING", n: S07.counts[4] }
      ];
      for (var r = 0; r < 4; r++) {
        var ry = box.y + 34 + r * 50;
        var on = stage > r;
        var tk = clamp((t - S07.facetT[r]) / 0.28, 0, 1);
        hud.rect(box.x + 12, ry - 13, 16, 16, { stroke: I.hexA(on ? col : INK, (on ? 0.9 : 0.30) * ain), lw: 1 });
        if (on) {
          hud.rect(box.x + 13, ry - 12, 14, 14, { fill: I.hexA(col, 0.16 * ain) });
          hud.line(box.x + 15, ry - 5, box.x + 19, ry - 1, { color: I.hexA(col, tk * ain), lw: 2 });
          hud.line(box.x + 19, ry - 1, box.x + 26, ry - 10, { color: I.hexA(col, tk * ain), lw: 2 });
        }
        hud.T(box.x + 38, ry, rows[r].k, { size: 13, color: on ? INK : GREY, alpha: (on ? 0.95 : 0.55) * ain, weight: 600 });
        hud.T(box.x + 38, ry + 15, rows[r].q, { size: 9, color: GREY, alpha: 0.45 * ain, spacing: 0.6 });
        hud.T(box.x + box.w - 14, ry, rows[r].v, { size: 13, color: on ? col : FAINT, alpha: (on ? 1 : 0.5) * ain, align: "right" });
        hud.T(box.x + box.w - 14, ry + 15, on ? String(rows[r].n) : "0", {
          size: 11, color: on ? col2 : FAINT, alpha: (on ? 0.95 : 0.5) * ain, align: "right"
        });
        if (on && r === 3) {
          /* a NOT constraint: the row is struck through in red ink */
          hud.line(box.x + 8, ry + 4, box.x + box.w - 8, ry - 16, { color: I.hexA(RED, 0.85 * ain), lw: 2 });
          hud.T(box.x + box.w - 14, ry + 30, "NEGATIVE CONSTRAINT", {
            size: 8, color: RED, alpha: 0.7 * ain, align: "right", spacing: 1.4
          });
        }
      }
      hud.T(56, 442, "QUERY", { size: 9, color: GREY, alpha: 0.5 * ain, spacing: 2.4 });
      hud.T(56, 462, "IF YOU'RE A CAT / BLUE POINT / VOCAL / HISS / NOT PURR", { size: 12, color: INK, alpha: 0.8 * ain });
      hud.T(56, 480, "F1 BREED   F2 VOCAL   F3 HISSING   F4 PURRING", { size: 10, color: col, alpha: 0.55 * ain, spacing: 0.6 });

      /* -- the result set, right -- */
      var rb = I.card(ctx, 1522, 150, 342, 236, { title: "RESULT SET", right: "FACETED" });
      hud.T(rb.x + 14, rb.y + 92, String(count), {
        size: 84, color: count === 1 ? col2 : col, alpha: ain, weight: 700, spacing: 2
      });
      hud.T(rb.x + 14 + measure(hud, String(count), 84, 700) + 14, rb.y + 92, plural(count, "MATCH", "MATCHES"), {
        size: 13, color: GREY, alpha: 0.7 * ain, spacing: 2.2
      });
      var sx = rb.x + 14;
      for (var s2 = 0; s2 < 5; s2++) {
        var live = s2 === stage;
        hud.T(sx, rb.y + 140, String(S07.counts[s2]), {
          size: live ? 19 : 14, color: live ? col2 : GREY, alpha: (live ? 1 : 0.42) * ain, weight: live ? 700 : 400
        });
        sx += measure(hud, String(S07.counts[s2]), live ? 19 : 14, live ? 700 : 400) + 6;
        if (s2 < 4) { hud.T(sx, rb.y + 140, ">", { size: 13, color: FAINT, alpha: 0.5 * ain }); sx += 20; }
      }
      hud.T(rb.x + 14, rb.y + 174, "BLUE POINT / VOCAL " + (stage > 1 ? "HIGH" : "ANY") +
        " / HISS " + (stage > 2 ? "YES" : "ANY") + " / PURR " + (stage > 3 ? "NEVER" : "ANY"), {
        size: 10, color: GREY, alpha: 0.55 * ain, spacing: 0.5
      });

      /* -- the purr channel: a real 400 ms window of the song's own spectrum -- */
      var wb = I.card(ctx, 420, 792, 820, 134, { title: "PURR CHANNEL", right: "50 ms/div · 2 mV" });
      var purrG = 1 - smoothstep(S07.facetT[3], S07.facetT[3] + 0.40, t);
      var px0 = wb.x + 16, pw = wb.w - 32, pyc = wb.y + 46;
      var N = 96, span = 0.40, j, m;
      for (j = 0; j < N; j++) {
        var b = ctx.data.bandsAt(t - span + span * j / (N - 1), S07.bscratch);
        var e = 0;
        if (j >= N * 0.8) {
          for (m = 0; m < 4; m++) e += b[m];
          e = (e / 4) * purrG;
        } else {
          for (m = 4; m < 30; m++) e += b[m];
          e /= 26;
        }
        S07.scope[j] = clamp(e * 5.0, 0, 1);
      }
      for (j = 0; j <= 8; j++) {
        var gx = px0 + pw * j / 8;
        hud.line(gx, pyc - 34, gx, pyc + 34, { color: "rgba(238,242,246," + (0.10 * ain) + ")" });
      }
      hud.line(px0, pyc, px0 + pw, pyc, { color: I.hexA(col, 0.22 * ain), lw: 1 });
      for (j = 0; j < N; j++) {
        var a = S07.scope[j];
        hud.line(px0 + pw * j / (N - 1), pyc - a * 32, px0 + pw * j / (N - 1), pyc + a * 32, {
          color: I.hexA(j >= N * 0.8 ? col2 : col, (0.25 + 0.75 * a) * ain), lw: 1
        });
      }
      hud.line(px0 + pw * 0.8, pyc - 34, px0 + pw * 0.8, pyc + 34, {
        color: I.hexA(col2, 0.45 * ain), lw: 1, dash: [3, 3]
      });
      hud.T(px0 + pw * 0.8 - 6, pyc - 40, "PURR", { size: 9, color: col2, alpha: 0.8 * ain, align: "right", spacing: 1.6 });
      hud.T(px0, pyc + 52, "MEOW + HISS · LIVE FROM THE MIX", { size: 9, color: GREY, alpha: 0.55 * ain, spacing: 1.2 });
      hud.T(px0 + pw, pyc + 52, "PURR " + (25.0 * purrG).toFixed(3) + " Hz", {
        size: 13, color: purrG > 0.02 ? col : RED, alpha: ain, align: "right"
      });

      hud.T(W - 46, H - 162, "2010 FACETED SEARCH · NEGATIVE CONSTRAINTS", {
        size: 10, color: GREY, alpha: 0.45 * ain, align: "right", spacing: 1.1
      });
    },
    draw3d: function (ctx) {
      var gfx = ctx.gfx, t = ctx.t;
      var stage = facetStage(t), count = S07.counts[stage];
      var furC = I.rgbA("#9aa6b8", 1), ptC = I.rgbA("#3d4657", 1), headC = I.rgbA("#7e8a9e", 1);
      var acc = I.rgbA("#6b8cff", 1), acc2 = I.rgbA("#35e0ff", 1);
      var LIGHT = [0.3, 0.85, 0.44];
      gfx.solid(S07.table, S07.ident, { color: I.rgbA("#5a6070", 1), alpha: 1, smooth: false, rim: 0.22, light: [0.35, 0.9, 0.4] });

      /* ruled lines on the specimen table */
      var lat = S07.lat, n = 0, g;
      for (g = -3; g <= 3; g++) {
        lat[n * 12] = g * 0.9; lat[n * 12 + 1] = 0.004; lat[n * 12 + 2] = -1.55; lat[n * 12 + 3] = 1;
        lat[n * 12 + 4] = g * 0.9; lat[n * 12 + 5] = 0.004; lat[n * 12 + 6] = 1.55; lat[n * 12 + 7] = 1;
        lat[n * 12 + 8] = acc[0]; lat[n * 12 + 9] = acc[1]; lat[n * 12 + 10] = acc[2]; lat[n * 12 + 11] = 0.09;
        n++;
      }
      for (g = -1; g <= 1; g++) {
        lat[n * 12] = -3.2; lat[n * 12 + 1] = 0.004; lat[n * 12 + 2] = g * 1.1; lat[n * 12 + 3] = 1;
        lat[n * 12 + 4] = 3.2; lat[n * 12 + 5] = 0.004; lat[n * 12 + 6] = g * 1.1; lat[n * 12 + 7] = 1;
        lat[n * 12 + 8] = acc[0]; lat[n * 12 + 9] = acc[1]; lat[n * 12 + 10] = acc[2]; lat[n * 12 + 11] = 0.09;
        n++;
      }
      gfx.lines(lat.subarray(0, n * 12), { depthWrite: false });

      var tilt = 0, i;
      for (i = 0; i < 64; i++) {
        var c = S07.cats[i];
        var alpha = 1, y = 0, roll = 0;
        if (c.fail <= stage) {
          var dt = t - S07.facetT[c.fail - 1];
          if (dt > 0.9) continue;
          y = -3.2 * dt * dt;
          alpha = 1 - smoothstep(0.35, 0.85, dt);
          roll = dt * 1.6 * (c.i % 2 ? 1 : -1);
        }
        var isLast = (count === 1 && catPasses(c, 4));
        var tx = c.x, tz = c.z, sc = c.s;
        if (isLast) {
          var k = smoothstep(94.55, 95.9, t);
          tx = lerp(c.x, 0, k); tz = lerp(c.z, 0.35, k); sc = lerp(c.s, 0.95, k);
          tilt = -0.30 * smoothstep(94.9, 95.9, t);
        }
        M4.trans(tx, y + 0.001, tz, _t0);
        M4.rotY(c.rot + roll, _t1);
        M4.mul(_t0, _t1, _ma);
        M4.rotZ(roll * 0.4, _t2);
        M4.mul(_ma, _t2, _mb);
        M4.scale(sc, sc, sc, _t3);
        M4.mul(_mb, _t3, _mc);
        var breath = 1 + 0.02 * ctx.beat.pulse * (isLast ? 2.4 : 1);
        M4.scale(breath, breath, breath, _t4);
        M4.mul(_mc, _t4, _md);
        gfx.solid(S07.fur, _md, { color: furC, alpha: alpha, smooth: false, rim: 0.35, light: LIGHT });
        gfx.solid(S07.pts, _md, { color: ptC, alpha: alpha, smooth: false, rim: 0.30, light: LIGHT });
        if (isLast) {
          M4.rotX(tilt, _t5);
          M4.mul(_md, _t5, _me);
          gfx.solid(S07.head, _me, { color: headC, alpha: alpha, smooth: false, rim: 0.45, light: LIGHT });
          gfx.wire(S07.head, _me, { color: acc2, alpha: 0.09, width: 1 });
        } else {
          gfx.solid(S07.head, _md, { color: headC, alpha: alpha, smooth: false, rim: 0.35, light: LIGHT });
        }
      }

      /* the survivor gets a bracket on the table, like a catalogue mark */
      if (count === 1) {
        var mk = S07.mark, mm = 0, q;
        for (q = 0; q < 4; q++) {
          var a0 = 0.30 + q * 1.54, a1 = a0 + 1.00, rr = 0.64;
          mk[mm * 12] = Math.cos(a0) * rr; mk[mm * 12 + 1] = 0.012; mk[mm * 12 + 2] = Math.sin(a0) * rr + 0.35; mk[mm * 12 + 3] = 1.7;
          mk[mm * 12 + 4] = Math.cos(a1) * rr; mk[mm * 12 + 5] = 0.012; mk[mm * 12 + 6] = Math.sin(a1) * rr + 0.35; mk[mm * 12 + 7] = 1.7;
          mk[mm * 12 + 8] = acc2[0]; mk[mm * 12 + 9] = acc2[1]; mk[mm * 12 + 10] = acc2[2]; mk[mm * 12 + 11] = 0.85;
          mm++;
        }
        gfx.lines(mk.subarray(0, mm * 12), { depthWrite: false });
      }
    }
  });

  /* ====================================================================== *
   * 08 / STEAK -- the cut face is the real solution of 1-D conduction into a
   * slab fed through a surface film.  erfc comes from the Abramowitz-Stegun
   * 7.1.26 rational approximation; the isotherms are contoured from a real
   * Euclidean distance field inside the cut outline.
   * ====================================================================== */
  var S08 = {
    dist: null, inside: null, cols: 64, rows: 32, Wd: 3.0, Ht: 1.5,
    outline: null, ramp: null, sites: null, cells: null, cellR: null,
    mush: null, quads: null, iso: null, outlineBuf: null, lut: null, dMax: 1,
    ALPHA: 1.4e-7, BI: 3.2, L: 0.01181, TINF: 180, T0: 4.0,
    LV: [52, 55, 60, 65, 71], rotx: null
  };

  function erf(x) {
    var s = x < 0 ? -1 : 1;
    x = Math.abs(x);
    var tt = 1 / (1 + 0.3275911 * x);
    var y = 1 - ((((1.061405429 * tt - 1.453152027) * tt + 1.421413741) * tt - 0.284496736) * tt + 0.254829592) * tt * Math.exp(-x * x);
    return s * y;
  }
  function erfc(x) { return 1 - erf(x); }

  /* T(u, tau) for a slab fed through a surface film.  The Dirichlet form
     T = Tinf + (T0 - Tinf) * erf(u / (2*sqrt(alpha*tau))) is the Bi -> infinity
     limit of this one; at Bi = 3.2 the surface is fed convectively, which is
     what a pan actually does.  The thickness is solved so that the core lands
     exactly on 55 C, medium rare, at tau = 12 min. */
  function conduct(u, tau) {
    if (tau < 0.5) tau = 0.5;
    var Fo = S08.ALPHA * tau / (S08.L * S08.L);
    var rt = Math.sqrt(Fo);
    var xx = u / S08.L;
    var z = xx / (2 * rt);
    var bi = S08.BI;
    var v = erfc(z) - Math.exp(bi * xx + bi * bi * Fo) * erfc(z + bi * rt);
    return S08.T0 + (S08.TINF - S08.T0) * clamp(v, 0, 1.35);
  }
  function isoDepth(T, tau) {
    var lo = 0, hi = S08.L * 1.7, i;
    for (i = 0; i < 34; i++) {
      var m = (lo + hi) * 0.5;
      if (conduct(m, tau) < T) lo = m; else hi = m;
    }
    return (lo + hi) * 0.5;
  }
  function steakOutline() {
    var pts = [], n = 128, i;
    for (i = 0; i < n; i++) {
      var a = i / n * TAU;
      var r = 1 + 0.055 * Math.cos(3 * a + 0.7) + 0.036 * Math.cos(5 * a - 1.2) + 0.02 * Math.cos(7 * a + 2.1);
      pts.push([Math.cos(a) * r * 1.46, Math.sin(a) * r * 0.62]);
    }
    return pts;
  }
  function clipHalf(poly, nx, ny, c) {
    var out = [], i;
    for (i = 0; i < poly.length; i++) {
      var a = poly[i], b = poly[(i + 1) % poly.length];
      var da = nx * a[0] + ny * a[1] - c, db = nx * b[0] + ny * b[1] - c;
      if (da <= 0) out.push(a);
      if ((da <= 0) !== (db <= 0)) {
        var f = da / (da - db);
        out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
      }
    }
    return out;
  }
  function buildDistance() {
    var COLS = S08.cols, ROWS = S08.rows, o = steakOutline();
    var dist = new Float32Array(COLS * ROWS), ins = new Uint8Array(COLS * ROWS);
    for (var j = 0; j < ROWS; j++) {
      for (var i = 0; i < COLS; i++) {
        var x = ((i + 0.5) / COLS - 0.5) * S08.Wd;
        var y = (0.5 - (j + 0.5) / ROWS) * S08.Ht;
        var best = 1e9, cross = 0, k;
        for (k = 0; k < o.length; k++) {
          var ax = o[k][0], ay = o[k][1], bx = o[(k + 1) % o.length][0], by = o[(k + 1) % o.length][1];
          var dx = x - ax, dy = y - ay, d2 = dx * dx + dy * dy;
          if (d2 < best) best = d2;
          if (((ay > y) !== (by > y)) && (x < (bx - ax) * (y - ay) / (by - ay) + ax)) cross++;
        }
        dist[j * COLS + i] = Math.sqrt(best);
        ins[j * COLS + i] = (cross & 1) ? 1 : 0;
      }
    }
    S08.dist = dist; S08.inside = ins;
  }

  WEM.defineSection({
    id: "08", name: "STEAK",
    init: function (ctx) {
      var i, k;
      buildDistance();
      S08.rotx = M4.rotX(-PI / 2, new Float32Array(16));
      S08.ramp = rampLUT([
        [0.00, "#6b1a20"], [0.21, "#8c1c26"], [0.262, "#ab2130"], [0.288, "#c8323a"],
        [0.335, "#c2584a"], [0.40, "#b0764f"], [0.49, "#7d5433"], [0.72, "#43301f"], [1.00, "#221510"]
      ], 256);
      S08.outline = steakOutline();
      S08.sites = WEM.Lab.voronoiSites(15, 0x5EED, 0.9);
      /* real Voronoi cells: every bisector half plane clipped against all the others */
      var EXT = 2.6, cells = [];
      for (i = 0; i < S08.sites.length; i++) {
        var poly = [[-EXT, -EXT], [EXT, -EXT], [EXT, EXT], [-EXT, EXT]];
        for (k = 0; k < S08.sites.length; k++) {
          if (k === i) continue;
          var ax = S08.sites[i][0], ay = S08.sites[i][1];
          var bx = S08.sites[k][0], by = S08.sites[k][1];
          poly = clipHalf(poly, bx - ax, by - ay,
            (bx - ax) * (ax + bx) * 0.5 + (by - ay) * (ay + by) * 0.5);
          if (!poly.length) break;
        }
        var out = [];
        for (k = 0; k < poly.length; k++) {
          var px = poly[k][0] - S08.sites[i][0], py = poly[k][1] - S08.sites[i][1];
          var rr = Math.sqrt(px * px + py * py);
          if (rr > 0.30) { px *= 0.30 / rr; py *= 0.30 / rr; }
          out.push([px, py]);
        }
        cells.push(out);
      }
      S08.cells = cells;
      /* each slice is as wide as its own Voronoi cell really is */
      S08.cellR = new Float32Array(cells.length);
      for (i = 0; i < cells.length; i++) {
        var acc = 0;
        for (k = 0; k < cells[i].length; k++) {
          acc += Math.sqrt(cells[i][k][0] * cells[i][k][0] + cells[i][k][1] * cells[i][k][1]);
        }
        S08.cellR[i] = cells[i].length ? clamp(acc / cells[i].length, 0.055, 0.30) : 0.11;
      }
      S08.mush = G.cylinder(1, 1, 0.024, 9);
      S08.quads = new WEM.Viz.Quads(2);
      S08.iso = new Float32Array(900 * 12);
      S08.outlineBuf = new Float32Array(140 * 12);
      S08.lut = new Float32Array(512);
      S08.dMax = 1e-6;
      for (i = 0; i < S08.dist.length; i++) if (S08.dist[i] > S08.dMax) S08.dMax = S08.dist[i];
      S08.dMax *= 1.02;
    },
    enter: function () { },
    draw2d: function (ctx) {
      var hud = ctx.hud, W = ctx.W, H = ctx.H, u = ctx.local;
      var col = I.css(ctx.t), col2 = I.css2(ctx.t);
      var tau = 12 * 60 * clamp(u / ctx.dur, 0, 1);
      var core = conduct(S08.L, tau), surf = conduct(0, tau);
      ctx.hits = u < 3.2 ? 48201 : (u < 6.2 ? 2048 : (u < 9.4 ? 256 : (u < 11.6 ? 32 : 12)));
      var ain = 0.30 + 0.70 * ctx.in;

      setCam(ctx.cam, 0.55 + 0.06 * Math.sin(u * 0.5) + 0.05 * ctx.beat.barPulse, 0.62, 4.05, 0, 0.30, 0, 0.82);

      /* -- query by image: a 16 x 16 thumbnail of the reference field -- */
      var cb = I.card(ctx, 56, 132, 190, 218, { title: "QUERY", right: "BY IMAGE", tab: "08  STEAK" });
      var cs = 9, ox = cb.x + 16, oy = cb.y + 22, ii, jj;
      for (jj = 0; jj < 16; jj++) {
        for (ii = 0; ii < 16; ii++) {
          var rr = Math.min(1, Math.sqrt(Math.pow((ii - 7.5) / 7.4, 2) + Math.pow((jj - 7.5) / 6.4, 2)));
          var TT = conduct((1 - rr) * S08.L, 720);
          hud.rect(ox + ii * cs, oy + jj * cs, cs, cs, {
            fill: S08.ramp[clamp(Math.round(TT / 210 * 255), 0, 255)], alpha: ain
          });
        }
      }
      hud.rect(ox, oy, cs * 16, cs * 16, { stroke: I.hexA(col, 0.55 * ain), lw: 1 });
      hud.T(cb.x + 16, oy + cs * 16 + 24, "32 × 32 PATCH · REFERENCE 55 °C", {
        size: 9, color: GREY, alpha: 0.55 * ain, spacing: 0.5
      });
      hud.T(cb.x + 16, oy + cs * 16 + 40, "SAME SCALE AS THE FIELD", { size: 9, color: col, alpha: 0.6 * ain, spacing: 0.5 });

      /* -- the doneness ruler: the pointer is the real core temperature -- */
      var rb = I.card(ctx, 1586, 150, 278, 560, { title: "DONENESS", right: "°C" });
      var ry0 = rb.y + 44, ry1 = rb.y + rb.h - 40;
      var TMIN = 44, TMAX = 74, span = ry1 - ry0;
      hud.line(rb.x + 42, ry0 - 16, rb.x + 42, ry1 + 16, { color: I.hexA(INK, 0.35 * ain), lw: 1 });
      var marks = [[52, "RARE"], [55, "MEDIUM RARE"], [60, "MEDIUM"], [65, "MEDIUM WELL"], [71, "WELL DONE"]];
      for (ii = 0; ii < marks.length; ii++) {
        var mv = clamp((marks[ii][0] - TMIN) / (TMAX - TMIN), -0.14, 1.06);
        var my = ry1 - mv * span;
        var near = Math.abs(core - marks[ii][0]) < 1.3;
        hud.line(rb.x + 30, my, rb.x + 54, my, { color: I.hexA(near ? col2 : INK, (near ? 0.95 : 0.35) * ain), lw: near ? 2 : 1 });
        hud.T(rb.x + 62, my + 4, marks[ii][1], { size: 10, color: near ? col2 : GREY, alpha: (near ? 1 : 0.6) * ain, spacing: 1.0 });
        hud.T(rb.x + 62, my + 17, marks[ii][0] + "°", { size: 9, color: FAINT, alpha: 0.65 * ain });
      }
      var cyT = ry1 - clamp((core - TMIN) / (TMAX - TMIN), -0.14, 1.06) * span;
      hud.rect(rb.x + 20, cyT - 2, 44, 4, { fill: I.hexA(col, 0.95 * ain) });
      hud.line(rb.x + 10, cyT, rb.x + 28, cyT, { color: I.hexA(col, 0.9 * ain), lw: 2 });
      if (core < TMIN) hud.T(rb.x + 62, ry1 + 30, "CORE BELOW SCALE", { size: 9, color: RED, alpha: 0.8 * ain, spacing: 1.2 });
      hud.T(rb.x + rb.w - 14, rb.y + 44, "CORE", { size: 9, color: GREY, alpha: 0.6 * ain, align: "right", spacing: 1.6 });
      hud.T(rb.x + rb.w - 14, rb.y + 76, core.toFixed(1) + "°", { size: 30, color: col, alpha: ain, align: "right", weight: 700 });
      hud.T(rb.x + rb.w - 14, rb.y + 100, "SURFACE " + surf.toFixed(0) + "°", { size: 11, color: col2, alpha: 0.85 * ain, align: "right" });
      hud.T(rb.x + 14, rb.y + rb.h - 14, "SCALE 44 - 74 °C · 1-D CONDUCTION", { size: 9, color: FAINT, alpha: 0.5 * ain, spacing: 0.6 });

      /* -- parameters -- */
      var pb = I.card(ctx, 56, 790, 660, 134, { title: "HEAT CONDUCTION", right: "1-D SLAB · CONVECTIVE FACE" });
      hud.T(pb.x + 14, pb.y + 40, "α = 1.40e-7 m²/s", { size: 15, color: INK, alpha: 0.92 * ain });
      hud.T(pb.x + 236, pb.y + 40, "Bi = 3.2", { size: 15, color: col, alpha: 0.95 * ain });
      hud.T(pb.x + 366, pb.y + 40, "L = 11.8 mm", { size: 15, color: INK, alpha: 0.92 * ain });
      hud.T(pb.x + 552, pb.y + 40, "τ = " + (tau / 60).toFixed(2) + " min", { size: 15, color: col2, alpha: 0.95 * ain });
      hud.T(pb.x + 14, pb.y + 68, "T∞ = 180 °C PAN     T0 = 4 °C FRIDGE     2L = 23.6 mm THICK     α·τ = " +
        (S08.ALPHA * tau * 1e6).toFixed(1) + " mm²", { size: 11, color: GREY, alpha: 0.72 * ain });
      var fr = clamp(u / ctx.dur, 0, 1);
      hud.rect(pb.x + 14, pb.y + 84, pb.w - 28, 5, { fill: "rgba(238,242,246,0.10)" });
      hud.rect(pb.x + 14, pb.y + 84, (pb.w - 28) * fr, 5, { fill: I.hexA(col, 0.85 * ain) });
      hud.T(pb.x + 14, pb.y + 104, "T(u,τ) = T∞ + (T0 - T∞) · [ erfc(z) - e^(Bi·u/L + Bi²Fo) · erfc(z + Bi√Fo) ]", {
        size: 11, color: INK, alpha: 0.55 * ain
      });

      hud.T(W - 46, H - 162, "2012 DEEP VISION · IMAGENET", {
        size: 10, color: GREY, alpha: 0.45 * ain, align: "right", spacing: 1.1
      });
      /* the isotherm labels ride on the real level crossings of the midline */
      var vp = mkVp(ctx.cam, W, H);
      for (ii = 0; ii < 5; ii++) {
        var ud = isoDepth(S08.LV[ii], tau);
        if (ud <= 0.0006) continue;
        pj(vp, ud, 0, 0.012, W, H, _pj);
        if (_pj[0] > 320 && _pj[0] < 1540 && _pj[1] > 140 && _pj[1] < 770) {
          hud.T(_pj[0], _pj[1] - 7, S08.LV[ii] + "°", { size: 9, color: INK, alpha: 0.5 * ain, align: "center" });
        }
      }
    },
    draw3d: function (ctx) {
      var gfx = ctx.gfx, u = ctx.local, i, j, k;
      var tau = 12 * 60 * clamp(u / ctx.dur, 0, 1);
      var col = I.rgbA("#ff9a5c", 1), col2 = I.rgbA("#ffd166", 1);
      var COLS = S08.cols, ROWS = S08.rows, Wd = S08.Wd, Ht = S08.Ht;

      /* the cut face: one panel bitmap of the computed field.  The temperature
         depends only on the depth and on tau, so a 512 entry table serves all
         2048 cells instead of an exp and two erfcs each. */
      var p = ctx.hud.panel(0);
      p.clear();
      var c = p.ctx;
      var lut = S08.lut, LN = 512, scale = (LN - 1) / S08.dMax;
      for (i = 0; i < LN; i++) lut[i] = conduct(S08.dMax * i / (LN - 1), tau) / 210 * 256;
      for (j = 0; j < ROWS; j++) {
        for (i = 0; i < COLS; i++) {
          k = j * COLS + i;
          if (!S08.inside[k]) continue;
          var ti = Math.round(S08.dist[k] * scale);
          c.fillStyle = S08.ramp[clamp(lut[ti < 0 ? 0 : (ti > LN - 1 ? LN - 1 : ti)], 0, 255) | 0];
          c.fillRect(i * 4, j * 8, 4, 8);
        }
      }
      var qd = S08.quads;
      qd.clear();
      M4.trans(0, 0, 0, _t0);
      M4.scale(Wd, Ht, 1, _t1);
      M4.mul(_t0, _t1, _ma);
      qd.add(_ma, p.rect, [1, 1, 1, 1]);
      M4.trans(0, -0.02, -0.055, _t0);
      M4.scale(Wd * 0.985, Ht * 0.985, 1, _t1);
      M4.mul(_t0, _t1, _mb);
      qd.add(_mb, p.rect, [0.55, 0.48, 0.42, 1]);
      gfx.quads(qd.view(), ctx.hud.tPan, { depthWrite: true });

      /* the outline of the cut, in ink */
      var n = 0, buf = S08.outlineBuf;
      for (i = 0; i < S08.outline.length; i++) {
        var a = S08.outline[i], b = S08.outline[(i + 1) % S08.outline.length];
        buf[n * 12] = a[0]; buf[n * 12 + 1] = a[1]; buf[n * 12 + 2] = 0.004; buf[n * 12 + 3] = 1.8;
        buf[n * 12 + 4] = b[0]; buf[n * 12 + 5] = b[1]; buf[n * 12 + 6] = 0.004; buf[n * 12 + 7] = 1.8;
        buf[n * 12 + 8] = col[0]; buf[n * 12 + 9] = col[1]; buf[n * 12 + 10] = col[2]; buf[n * 12 + 11] = 0.8;
        n++;
      }
      gfx.lines(buf.subarray(0, n * 12), { depthWrite: false });

      /* isotherms: marching squares over the static distance field */
      n = 0;
      var iso = S08.iso;
      for (var li = 0; li < 5; li++) {
        var ud = isoDepth(S08.LV[li], tau);
        if (ud <= 0.0006) continue;
        var al = li === 1 ? 0.95 : 0.45;
        for (j = 0; j < ROWS - 1; j++) {
          for (i = 0; i < COLS - 1; i++) {
            var s00 = S08.dist[j * COLS + i] - ud, s10 = S08.dist[j * COLS + i + 1] - ud;
            var s01 = S08.dist[(j + 1) * COLS + i] - ud, s11 = S08.dist[(j + 1) * COLS + i + 1] - ud;
            if ((s00 > 0) === (s10 > 0) && (s00 > 0) === (s01 > 0) && (s00 > 0) === (s11 > 0)) continue;
            var x0 = (i / COLS - 0.5) * Wd, x1 = ((i + 1) / COLS - 0.5) * Wd;
            var y0 = (0.5 - j / ROWS) * Ht, y1 = (0.5 - (j + 1) / ROWS) * Ht;
            var ax = 0, ay = 0, bx = 0, by = 0, cnt = 0;
            if ((s00 > 0) !== (s10 > 0)) { ax = x0 + (x1 - x0) * (s00 / (s00 - s10)); ay = y0; cnt++; }
            if ((s10 > 0) !== (s11 > 0)) {
              var qx = x1, qy = y0 + (y1 - y0) * (s10 / (s10 - s11));
              if (!cnt) { ax = qx; ay = qy; } else { bx = qx; by = qy; } cnt++;
            }
            if ((s01 > 0) !== (s11 > 0)) {
              var rx = x0 + (x1 - x0) * (s01 / (s01 - s11));
              if (!cnt) { ax = rx; ay = y1; } else if (cnt === 1) { bx = rx; by = y1; } cnt++;
            }
            if ((s00 > 0) !== (s01 > 0)) {
              var ty2 = y0 + (y1 - y0) * (s00 / (s00 - s01));
              if (!cnt) { ax = x0; ay = ty2; } else if (cnt === 1) { bx = x0; by = ty2; } cnt++;
            }
            if (cnt >= 2 && n < 890) {
              iso[n * 12] = ax; iso[n * 12 + 1] = ay; iso[n * 12 + 2] = 0.012; iso[n * 12 + 3] = li === 1 ? 2.2 : 1.3;
              iso[n * 12 + 4] = bx; iso[n * 12 + 5] = by; iso[n * 12 + 6] = 0.012; iso[n * 12 + 7] = li === 1 ? 2.2 : 1.3;
              iso[n * 12 + 8] = col2[0]; iso[n * 12 + 9] = col2[1]; iso[n * 12 + 10] = col2[2]; iso[n * 12 + 11] = al;
              n++;
            }
          }
        }
      }
      gfx.lines(iso.subarray(0, n * 12), { depthWrite: false });

      /* mushroom sauce: real Voronoi sites, each slice sized by its own cell */
      for (i = 0; i < S08.sites.length; i++) {
        var st = S08.sites[i];
        if (st[0] * st[0] / (1.42 * 1.42) + st[1] * st[1] / (0.60 * 0.60) > 0.92) continue;
        var fall = clamp((ctx.t - (97.4 + i * 0.20)) / 0.75, 0, 1);
        var zz = 1.05 * (1 - fall) * (1 - fall) + 0.03;
        var cellR = S08.cellR[i];
        M4.trans(st[0] * 0.95, st[1] * 0.60, zz, _t0);
        M4.mul(_t0, S08.rotx, _ma);
        M4.scale(cellR, 1, cellR, _t1);
        M4.mul(_ma, _t1, _mb);
        gfx.solid(S08.mush, _mb, { color: I.rgbA("#8a7a63", 1), alpha: 0.95, smooth: false, rim: 0.3, light: [0.4, 0.8, 0.45] });
      }
    }
  });

  /* ====================================================================== *
   * 09 / FLOWER -- a real phyllotaxis head (golden angle 137.5077°) that is
   * shut almost the whole time and opens four times, on the four lines.
   * ====================================================================== */
  var S09 = {
    stem: null, petal: null, disc: null, leaves: null, ident: null,
    lines: null, pts: null, P: null, RMAX: 1, N: 240,
    blooms: [109.72, 113.15, 116.60, 119.96]
  };

  function bloomK(t) {
    var best = 0, i;
    for (i = 0; i < 4; i++) {
      var d = t - S09.blooms[i];
      if (d < 0 || d > 1.2) continue;
      var k;
      if (d < 0.30) k = Ease.outCubic(d / 0.30);
      else if (d < 0.62) k = 1;
      else k = 1 - Ease.inOutQuad((d - 0.62) / 0.58);
      if (k > best) best = k;
    }
    return best;
  }
  function ringLit(t, ring) {
    var best = 0, i;
    for (i = 0; i < 4; i++) {
      var d = t - S09.blooms[i];
      if (d < 0 || d > 1.8) continue;
      var k = clamp((d - 0.16 - ring * 0.055) / 0.30, 0, 1);
      if (k > best) best = k;
    }
    return best;
  }
  function nextBloom(t) {
    for (var i = 0; i < 4; i++) if (t < S09.blooms[i]) return S09.blooms[i];
    return S09.blooms[3];
  }

  WEM.defineSection({
    id: "09", name: "FLOWER",
    init: function (ctx) {
      var i;
      var ph = WEM.Lab.phyllotaxis(S09.N, 1);
      S09.RMAX = Math.sqrt(S09.N - 1);
      S09.P = new Float32Array(S09.N * 3);
      for (i = 0; i < S09.N; i++) {
        var rr = Math.sqrt(ph[i][0] * ph[i][0] + ph[i][1] * ph[i][1]) / S09.RMAX;
        S09.P[i * 3] = ph[i][0] / S09.RMAX * 0.86;
        S09.P[i * 3 + 1] = ph[i][1] / S09.RMAX * 0.86;
        S09.P[i * 3 + 2] = rr;
      }
      S09.stem = G.cylinder(0.035, 0.022, 1.90, 10);
      S09.petal = G.plane(0.30, 0.62, 3);
      S09.disc = G.cylinder(0.90, 0.86, 0.05, 32);
      S09.ident = M4.ident(new Float32Array(16));
      S09.lines = new Float32Array(20 * 12);
      S09.pts = new WEM.Viz.Points(S09.N + 8);
      /* two leaves baked in world space, so they sit on the stem, not the head */
      S09.leaves = mergeParts([
        {
          m: G.plane(0.44, 0.86, 2),
          mat: M4.mul(M4.trans(0.95 - 0.54, 0.70, 0.10),
            M4.mul(M4.rotZ(0.62), M4.rotY(0.30), new Float32Array(16)), new Float32Array(16))
        },
        {
          m: G.plane(0.40, 0.78, 2),
          mat: M4.mul(M4.trans(0.95 + 0.52, 0.44, -0.06),
            M4.mul(M4.rotZ(-0.76), M4.rotY(-0.34), new Float32Array(16)), new Float32Array(16))
        }
      ]);
    },
    enter: function () { },
    draw2d: function (ctx) {
      var hud = ctx.hud, W = ctx.W, H = ctx.H, t = ctx.t, u = ctx.local;
      var col = I.css(t), col2 = I.css2(t);
      var k = bloomK(t), i;
      var ain = 0.30 + 0.70 * ctx.in;
      var blooms = 0;
      for (i = 0; i < 4; i++) if (t >= S09.blooms[i]) blooms++;
      ctx.hits = blooms >= 4 ? 1 : 3;

      var push = 0.10 * k;
      setCam(ctx.cam,
        0.95 + 0.10 * Math.sin(u * 0.22),
        1.58 - push * 1.4,
        2.95 - push * 0.9,
        0.95, 0.30 + push * 0.2, 0.0, 0.80);

      /* -- the result list: sixteen rows, exactly one of them lit -- */
      var lb = I.card(ctx, 56, 250, 566, 480, { title: "BLOOM INDEX", right: "16 CANDIDATES", tab: "09  FLOWER" });
      for (i = 0; i < 16; i++) {
        var isLit = i === 8;
        var ry = lb.y + 30 + i * 27;
        var sc = isLit ? 0.998 : 0.31 - i * 0.011;
        var name = isLit ? "SPECIMEN 09 · BLOOM 4 / 365 D"
          : "SPECIMEN " + (i < 9 ? "0" : "") + (i + 1) + " · BLOOM " + (((i * 7) % 40) + 1) + " / 365 D";
        I.resultRow(ctx, lb.x + 14, ry, lb.w - 28, name, clamp(sc, 0.02, 1), {
          alpha: (isLit ? 1 : 0.25) * ain, bright: isLit, color: isLit ? col2 : col,
          barW: 120, size: isLit ? 13 : 12
        });
        if (isLit) {
          hud.rect(lb.x + 6, ry - 15, 3, 22, { fill: I.hexA(col2, 0.9 * ain) });
          hud.T(lb.x + lb.w - 14, ry + 18, "THE ONLY PERFECT FLOWER FOR ME", {
            size: 9, color: col2, alpha: 0.7 * ain, align: "right", spacing: 1.2
          });
        }
      }

      /* -- sparse event bar: four spikes, at the real bloom times -- */
      var eb = I.card(ctx, 1490, 150, 374, 128, { title: "BLOOM EVENTS", right: "4 / 12.8 s" });
      var ex = eb.x + 18, ew = eb.w - 36, ey = eb.y + 76;
      hud.line(ex, ey, ex + ew, ey, { color: I.hexA(INK, 0.28 * ain), lw: 1 });
      for (i = 0; i < 4; i++) {
        var fx = ex + ew * ((S09.blooms[i] - 109.5) / 12.8);
        var live = t >= S09.blooms[i];
        var hgt = live ? 26 + 12 * (1 - clamp((t - S09.blooms[i]) / 1.6, 0, 1)) : 4;
        hud.line(fx, ey, fx, ey - hgt, { color: I.hexA(live ? col2 : INK, (live ? 0.95 : 0.3) * ain), lw: live ? 2.4 : 1 });
        hud.T(fx, ey + 16, S09.blooms[i].toFixed(2), { size: 8, color: FAINT, alpha: 0.55 * ain, align: "center" });
      }
      hud.T(eb.x + 18, eb.y + 106, blooms + " OF 4 FIRED · THE REST OF THE TIME IT IS SHUT", {
        size: 9, color: GREY, alpha: 0.5 * ain, spacing: 0.7
      });

      hud.T(56, 776, "Φ = 137.5077°", { size: 13, color: col, alpha: 0.85 * ain });
      hud.T(56, 796, "r = c·√n     θ = n·Φ", { size: 11, color: GREY, alpha: 0.6 * ain });
      hud.T(56, 818, "STATE " + (k > 0.02 ? "OPEN " + (k * 100).toFixed(0) + "%" : "CLOSED"), {
        size: 13, color: k > 0.02 ? col2 : GREY, alpha: 0.9 * ain, weight: 600
      });
      hud.T(56, 842, "NEXT BLOOM " + nextBloom(t).toFixed(2) + " s", { size: 10, color: GREY, alpha: 0.55 * ain });
      hud.T(W - 46, H - 162, "2013 WORD2VEC · WORDS BECOME DIRECTIONS", {
        size: 10, color: GREY, alpha: 0.45 * ain, align: "right", spacing: 1.1
      });
    },
    draw3d: function (ctx) {
      var gfx = ctx.gfx, t = ctx.t, u = ctx.local, i;
      var col = I.rgbA("#ffd166", 1), col2 = I.rgbA("#ff9a5c", 1), col3 = I.rgbA("#ffb020", 1);
      var k = bloomK(t), br = ctx.beat.barPulse;
      var fold = lerp(1.42, 0.06, k) + 0.012 * br;
      var headY = 1.32;

      M4.trans(0.95, 0.52, 0, _t0);
      gfx.solid(S09.stem, _t0, {
        color: I.rgbA("#7c8a6a", 1), alpha: 1, smooth: false, rim: 0.25, light: [0.35, 0.85, 0.4]
      });
      gfx.solid(S09.leaves, S09.ident, {
        color: I.rgbA("#6e7d5e", 1), alpha: 1, smooth: false, rim: 0.3, light: [0.35, 0.85, 0.4]
      });
      M4.rotZ(0.05 * Math.sin(u * 0.5), _t1);
      M4.trans(0.95, headY - 0.03, 0, _t0);
      M4.mul(_t0, _t1, _ma);
      var brS = 1 + 0.02 * br;
      M4.scale(brS, brS, brS, _t2);
      M4.mul(_ma, _t2, _mb);
      gfx.solid(S09.disc, _mb, {
        color: I.rgbA("#8d9a76", 1), alpha: 1, smooth: false, rim: 0.3, light: [0.35, 0.85, 0.4]
      });

      /* thirteen petals on the golden angle */
      for (i = 0; i < 13; i++) {
        var pitch = fold + 0.10 * Math.cos(i * 2.4);
        M4.trans(0.95, headY, 0, _t0);
        M4.rotY(i * WEM.Lab.GOLDEN, _t1);
        M4.mul(_t0, _t1, _ma);
        M4.trans(0, 0, 0.84, _t2);
        M4.mul(_ma, _t2, _mb);
        M4.rotX(PI / 2 - pitch, _t3);
        M4.mul(_mb, _t3, _mc);
        M4.trans(0, 0.31, 0, _t4);
        M4.mul(_mc, _t4, _md);
        gfx.solid(S09.petal, _md, {
          color: k > 0.5 ? col : col3, alpha: 0.94, smooth: false, rim: 0.45,
          light: [0.4, 0.9, 0.3], emissive: 0.04 + 0.16 * k
        });
      }

      /* the head: 240 florets on the golden angle, lit ring by ring */
      var pts = S09.pts;
      pts.clear();
      var br2 = 1 + 0.03 * br;
      for (i = 0; i < S09.N; i++) {
        var x = S09.P[i * 3], z = S09.P[i * 3 + 1], rr = S09.P[i * 3 + 2];
        var lit = ringLit(t, Math.floor(rr * 11.99));
        var dome = 0.16 * (1 - rr * rr);
        pts.add(0.95 + x * br2, headY + dome + 0.03, z * br2,
          (0.014 + 0.020 * lit) * PSPR,
          [col2[0] + (col[0] - col2[0]) * lit, col2[1] + (col[1] - col2[1]) * lit, col2[2] + (col[2] - col2[2]) * lit],
          clamp(0.10 + 0.80 * lit + 0.35 * k, 0, 1));
      }
      pts.draw(gfx, { add: true, depthWrite: false, soft: 0.5 });

      /* petal veins, only while it is open */
      if (k > 0.05) {
        var n = 0, L = S09.lines;
        for (i = 0; i < 13; i++) {
          var pitch2 = fold + 0.10 * Math.cos(i * 2.4);
          M4.trans(0.95, headY, 0, _t0);
          M4.rotY(i * WEM.Lab.GOLDEN, _t1);
          M4.mul(_t0, _t1, _ma);
          M4.trans(0, 0, 0.84, _t2);
          M4.mul(_ma, _t2, _mb);
          M4.rotX(PI / 2 - pitch2, _t3);
          M4.mul(_mb, _t3, _mc);
          _p4[0] = 0; _p4[1] = 0.02; _p4[2] = 0; _p4[3] = 1;
          M4.xform(_mc, _p4, _pj);
          var ax = _pj[0], ay = _pj[1], az = _pj[2];
          _p4[1] = 0.60;
          M4.xform(_mc, _p4, _pj);
          L[n * 12] = ax; L[n * 12 + 1] = ay; L[n * 12 + 2] = az; L[n * 12 + 3] = 1.2;
          L[n * 12 + 4] = _pj[0]; L[n * 12 + 5] = _pj[1]; L[n * 12 + 6] = _pj[2]; L[n * 12 + 7] = 1.2;
          L[n * 12 + 8] = col[0]; L[n * 12 + 9] = col[1]; L[n * 12 + 10] = col[2]; L[n * 12 + 11] = 0.35 * k;
          n++;
        }
        gfx.lines(L.subarray(0, n * 12), { depthWrite: false });
      }
    }
  });

  /* ====================================================================== *
   * 10 / HUMAN -- two low-poly hands with real joint angles, a gaussian-sum
   * skin temperature field mapped onto the actual palm planes, and hair that
   * is the steady-state response of a damped, driven oscillator, so the
   * flutter travels down each strand.
   * ====================================================================== */
  var S10 = {
    palm: null, warm: null, strands: [], lines: null, pts: null, halo: null, pal: null,
    F: new Float32Array(256), fmax: 1, partMats: []
  };

  /* a real gaussian sum over the palm: three warm sources */
  function fieldT(u, v) {
    var s = 0;
    s += 1.00 * Math.exp(-((u - 0.52) * (u - 0.52) / (2 * 0.20 * 0.20) + (v - 0.40) * (v - 0.40) / (2 * 0.22 * 0.22)));
    s += 0.62 * Math.exp(-((u - 0.30) * (u - 0.30) / (2 * 0.13 * 0.13) + (v - 0.70) * (v - 0.70) / (2 * 0.15 * 0.15)));
    s += 0.48 * Math.exp(-((u - 0.74) * (u - 0.74) / (2 * 0.15 * 0.15) + (v - 0.66) * (v - 0.66) / (2 * 0.16 * 0.16)));
    return clamp(s, 0, 1.4);
  }

  /* the finger chain: three phalanges per digit, real joint angles */
  var SPECS = [
    { x: -0.27, z: 0.44, fan: -0.12, L: [0.26, 0.17, 0.12], w: 0.115 },
    { x: -0.09, z: 0.47, fan: -0.04, L: [0.29, 0.19, 0.13], w: 0.120 },
    { x: 0.08, z: 0.45, fan: 0.05, L: [0.26, 0.18, 0.12], w: 0.113 },
    { x: 0.24, z: 0.41, fan: 0.16, L: [0.21, 0.14, 0.10], w: 0.100 },
    { x: -0.36, z: 0.06, fan: -0.70, L: [0.24, 0.19, 0.12], w: 0.125 }
  ];
  var CURL = [
    [0.72, 0.80, 0.52], [0.78, 0.90, 0.58], [0.76, 0.86, 0.54],
    [0.70, 0.80, 0.50], [0.42, 0.62, 0.34]
  ];
  function buildHand(open, mirror, out, off) {
    var S = mirror ? -1 : 1, f, s, n = 0;
    var A = _ma, B = _mb;
    for (f = 0; f < 5; f++) {
      var sp = SPECS[f];
      M4.trans(S * sp.x, 0, sp.z, _t0);
      M4.rotY(S * sp.fan, _t1);
      M4.mul(_t0, _t1, A);
      M4.rotX(-0.16 - 0.30 * (1 - open), _t2);
      M4.mul(A, _t2, B);
      var cur = B, nxt = _mc;
      for (s = 0; s < 3; s++) {
        M4.rotX(CURL[f][s] * (0.25 + 0.75 * (1 - open)) + 0.10, _t3);
        M4.mul(cur, _t3, nxt);
        var tmp = cur; cur = nxt; nxt = tmp;
        M4.trans(0, 0, sp.L[s] * 0.5, _t4);
        M4.mul(cur, _t4, _md);
        M4.scale(sp.w, sp.w * 0.86, sp.L[s], _t5);
        M4.mul(_md, _t5, out[off + n]);
        n++;
        M4.trans(0, 0, sp.L[s], _t4);
        M4.mul(cur, _t4, nxt);
        tmp = cur; cur = nxt; nxt = tmp;
      }
    }
    return n;
  }

  WEM.defineSection({
    id: "10", name: "HUMAN",
    init: function (ctx) {
      var rnd = C.rng(0x48A1), i, j;
      S10.warm = G.ico(1);
      S10.palm = G.box(0.72, 0.15, 0.86);
      S10.lines = new Float32Array(10 * 16 * 12);
      S10.pts = new WEM.Viz.Points(300);
      S10.halo = new WEM.Viz.Points(220);
      for (i = 0; i < 80; i++) S10.partMats.push(new Float32Array(16));
      S10.pal = new Array(66);
      for (i = 0; i <= 65; i++) {
        var pv = i / 64 * 1.15;
        S10.pal[i] = "rgb(" + Math.round(255 * clamp(pv * 0.95, 0, 1)) + "," +
          Math.round(190 * clamp(pv * 0.72, 0, 1)) + "," +
          Math.round(150 * clamp(pv * 0.45 + 0.05, 0, 1)) + ")";
      }
      S10.fmax = 1e-6;
      for (j = 0; j < 16; j++) {
        for (i = 0; i < 16; i++) {
          var v = fieldT((i + 0.5) / 16, (j + 0.5) / 16);
          S10.F[j * 16 + i] = v;
          if (v > S10.fmax) S10.fmax = v;
        }
      }
      for (i = 0; i < 256; i++) S10.F[i] /= S10.fmax;
      S10.strands = [];
      for (i = 0; i < 6; i++) {
        var side = (i % 2) ? 1 : -1, tier = (i / 2) | 0;
        S10.strands.push({
          x0: side * (1.24 + tier * 0.17), z0: -0.55 + rnd() * 1.10, y0: 1.62 + rnd() * 0.16,
          len: 1.45 + rnd() * 0.95, fn: 0.95 + rnd() * 1.70, zeta: 0.045 + rnd() * 0.085,
          amp: 0.22 + rnd() * 0.30, ph: rnd() * TAU, nodes: 14, drift: (rnd() - 0.5) * 0.5
        });
      }
    },
    enter: function () { },
    draw2d: function (ctx) {
      var hud = ctx.hud, W = ctx.W, H = ctx.H, t = ctx.t, u = ctx.local;
      var col = I.css(t), col2 = I.css2(t);
      var ain = 0.30 + 0.70 * ctx.in;
      ctx.hits = 1;

      var d = 2.55 - 0.30 * smoothstep(0, 1, u / ctx.dur) + 0.03 * ctx.beat.pulse;
      setCam(ctx.cam, 0.10, 1.28 + 0.02 * ctx.beat.pulse, d, 0.10, 0.62, 0.05, 0.80);

      /* -- the query field types itself out, character by character -- */
      var FULL = "the warmth coming from your hands";
      var nch = Math.floor(clamp((u - 1.1) / 0.105, 0, FULL.length));
      var caret = (Math.sin(t * 12.0) > -0.2) ? 1 : 0.12;
      I.queryBar(ctx, {
        text: FULL.slice(0, nch), hits: 1, note: "RESULTS · EXACT",
        prog: nch / FULL.length, caret: false
      });
      ctx.__qDrawn = ctx.t;
      hud.rect(342 + measure(hud, FULL.slice(0, nch), 19, 400), 70, 2, 22, { fill: I.hexA(col, 0.9 * caret) });

      /* -- the thermal block: the same field the palms are shaded with -- */
      var tb = I.card(ctx, 1538, 150, 326, 356, { title: "THERMAL", right: "16 × 16", tab: "10  HUMAN" });
      var cs = 13, ox = tb.x + 22, oy = tb.y + 26, i, j;
      var pulse = 1 + 0.055 * ctx.beat.pulse;
      for (j = 0; j < 16; j++) {
        for (i = 0; i < 16; i++) {
          var vv = clamp(S10.F[j * 16 + i] * pulse, 0, 1.15);
          hud.rect(ox + i * cs, oy + j * cs, cs, cs, {
            fill: S10.pal[clamp(Math.round(vv / 1.15 * 64), 0, 64)], alpha: ain
          });
        }
      }
      hud.rect(ox, oy, cs * 16, cs * 16, { stroke: I.hexA(col, 0.5 * ain), lw: 1 });
      hud.T(tb.x + 22, oy + cs * 16 + 36, "PALM " + (32.4 + 1.8 * pulse).toFixed(1) + " °C", {
        size: 21, color: col, alpha: ain, weight: 600
      });
      hud.T(tb.x + 22, oy + cs * 16 + 58, "Δ " + (1.8 * pulse).toFixed(1) + " °C ACROSS THE PALM", {
        size: 10, color: GREY, alpha: 0.62 * ain, spacing: 0.8
      });
      hud.T(tb.x + 22, oy + cs * 16 + 78, "GAUSSIAN SUM · 3 SOURCES · BEAT " + (ctx.beat.index | 0), {
        size: 10, color: col2, alpha: 0.6 * ain, spacing: 0.8
      });

      /* -- breath: the real loudness envelope of the last 3.4 s -- */
      var bb = I.card(ctx, 56, 780, 596, 132, { title: "BREATH", right: "4.1 kPa CO₂" });
      var px0 = bb.x + 16, pw = bb.w - 32, pyc = bb.y + 62;
      hud.line(px0, pyc, px0 + pw, pyc, { color: I.hexA(INK, 0.20 * ain) });
      for (i = 0; i < 96; i++) {
        var rr = ctx.data.rms(t - 3.4 + 3.4 * i / 95);
        hud.line(px0 + pw * i / 95, pyc - rr * 46, px0 + pw * i / 95, pyc + rr * 46,
          { color: I.hexA(col2, (0.2 + 0.8 * clamp(rr * 2.2, 0, 1)) * ain), lw: 1 });
      }
      hud.T(px0, pyc + 48, "3.4 s WINDOW · EXHALED CO₂ 4.1 kPa · 21 % O₂ IN", {
        size: 9, color: GREY, alpha: 0.55 * ain, spacing: 0.7
      });
      hud.T(px0 + pw, pyc - 56, "INHALE", { size: 9, color: FAINT, alpha: 0.5 * ain, align: "right", spacing: 1.6 });
      hud.T(px0 + pw, pyc + 48, "EXHALE", { size: 9, color: col, alpha: 0.7 * ain, align: "right", spacing: 1.6 });

      hud.T(56, 152, "IF YOU TURN INTO A HUMAN", { size: 24, color: col, alpha: 0.85 * ain, weight: 600, spacing: 2.0 });
      hud.T(56, 178, "I'D LIKE ALL THE WARMTH COMING FROM YOUR HANDS", { size: 13, color: INK, alpha: 0.6 * ain, spacing: 1.0 });
      hud.T(W - 46, H - 162, "2014 · 2015 · RETRIEVAL BECOMES PERSONAL", {
        size: 10, color: GREY, alpha: 0.45 * ain, align: "right", spacing: 1.1
      });
    },
    draw3d: function (ctx) {
      var gfx = ctx.gfx, u = ctx.local, i, j, n;
      var col = I.rgbA("#ffb08a", 1), col2 = I.rgbA("#ff8a3d", 1), col3 = I.rgbA("#ffffff", 1);
      var open = 0.55 + 0.45 * Math.cos(TAU * ((ctx.beat.bar + ctx.beat.phase) / 4));
      var pulse = 1 + 0.06 * ctx.beat.pulse;
      var LIGHT = [-0.35, 0.9, 0.55];

      /* hands, mirrored, palms up and cupped; the temperature field is mapped
         onto the real palm planes, so it travels with the wrist */
      var hands = [{ px: -0.46, ry: 0.42, rz: 0.16, off: 0 }, { px: 0.46, ry: -0.42, rz: -0.16, off: 40 }];
      var P = S10.pts;
      P.clear();
      buildHand(open, true, S10.partMats, 0);
      buildHand(open, false, S10.partMats, 40);
      for (var h = 0; h < 2; h++) {
        var H0 = hands[h];
        M4.trans(H0.px, 0.62, 0.0, _t0);
        M4.rotY(H0.ry, _t1);
        M4.mul(_t0, _t1, _ma);
        M4.rotZ(H0.rz, _t2);
        M4.mul(_ma, _t2, _mb);
        M4.rotX(-1.10 + 0.10 * (1 - open), _t3);
        M4.mul(_mb, _t3, _mc);
        var root = _mc;
        gfx.solid(S10.palm, root, { color: col, alpha: 1, smooth: false, rim: 0.30, light: LIGHT });
        for (i = 0; i < 15; i++) {
          M4.mul(root, S10.partMats[H0.off + i], _md);
          gfx.solid(S10.palm, _md, { color: col, alpha: 1, smooth: false, rim: 0.32, light: LIGHT });
        }
        for (j = 0; j < 13; j++) {
          for (i = 0; i < 8; i++) {
            var fx = -0.28 + 0.56 * i / 7, fz = -0.34 + 0.74 * j / 12;
            var T = fieldT((fx + 0.36) / 0.72, (fz + 0.42) / 0.84) * pulse;
            if (T < 0.13) continue;
            _p4[0] = fx; _p4[1] = 0.085; _p4[2] = fz; _p4[3] = 1;
            M4.xform(root, _p4, _pj);
            P.add(_pj[0], _pj[1], _pj[2], (0.010 + 0.020 * T) * PSPR,
              [0.42 * (0.5 + 0.5 * T) + 0.30 * T,
                0.30 * (0.36 + 0.5 * T) + 0.22 * T,
                0.24 * (0.30 + 0.4 * T) + 0.16 * T],
              clamp(T * 0.8, 0.05, 0.9));
          }
        }
      }

      /* something warm, held between them */
      M4.trans(0, 0.72, 0.34, _t0);
      M4.scale(0.30 * pulse, 0.30 * pulse, 0.30 * pulse, _t1);
      M4.mul(_t0, _t1, _ma);
      /* the icosphere carries NO normals (see core: makeMesh(pos, null, idx)),
         so it must be drawn unlit or it renders as a dead black ball -- and on
         the paper theme it has to be authored WARM, which inverts to amber */
      gfx.solid(S10.warm, _ma, { color: I.rgbA("#ffcf9a", 1), alpha: 1, unlit: true, rim: 0.6, emissive: 0.45, light: [0, 1, 0.4] });
      var halo = S10.halo;
      halo.clear();
      for (i = 0; i < 200; i++) {
        var a = i * 2.39996, rr = 0.30 + 0.30 * Math.sqrt((i % 50) / 50);
        var fade = 1 - rr / 0.62;
        halo.add(Math.cos(a) * rr, 0.72 + ((i / 200) - 0.5) * 0.9, 0.34 + Math.sin(a) * rr,
          0.010 * PSPR * (0.4 + fade), I.rgbA("#ffcf9a", 1), 0.16 * fade * pulse);
      }
      halo.draw(gfx, { add: true, depthWrite: false, soft: 0.85 });
      P.draw(gfx, { add: true, depthWrite: false, soft: 0.6 });

      /* unruly hair: the gain of a damped driven oscillator, per node */
      var centroid = 0, sum = 0;
      for (i = 0; i < 64; i++) { centroid += ctx.bands[i] * i; sum += ctx.bands[i]; }
      centroid = sum > 1e-5 ? centroid / sum / 63 : 0.3;
      var wd = TAU * (0.9 + 2.6 * centroid);
      var amp = 0.25 + 1.35 * clamp(ctx.rms * 2.4, 0, 1) + 0.5 * ctx.flux;
      n = 0;
      var LB = S10.lines;
      for (i = 0; i < S10.strands.length; i++) {
        var s = S10.strands[i], hx = 0, hy = 0, hz = 0, has = false;
        for (j = 0; j <= s.nodes; j++) {
          var f = j / s.nodes;
          var wn = TAU * s.fn * (1 - 0.55 * f);
          var r2 = wd / wn, u1 = 1 - r2 * r2;
          var den = Math.sqrt(u1 * u1 + 4 * s.zeta * s.zeta * r2 * r2);
          var gain = 1 / Math.max(den, 0.08);
          var phase = Math.atan2(2 * s.zeta * r2, u1) + f * 0.55;
          var wob = Math.cos(wd * u - phase + s.ph);
          var disp = s.amp * amp * gain * 0.16 * wob;
          var xx = s.x0 + s.drift * f + disp;
          var yy = s.y0 - s.len * f + 0.05 * amp * f * wob;
          var zz = s.z0 + disp * 0.6 + 0.25 * Math.sin(s.ph + f * 2.0);
          if (has && n < 150) {
            LB[n * 12] = hx; LB[n * 12 + 1] = hy; LB[n * 12 + 2] = hz; LB[n * 12 + 3] = 1.6 - f * 1.1;
            LB[n * 12 + 4] = xx; LB[n * 12 + 5] = yy; LB[n * 12 + 6] = zz; LB[n * 12 + 7] = 1.6 - f * 1.1;
            LB[n * 12 + 8] = col3[0]; LB[n * 12 + 9] = col3[1]; LB[n * 12 + 10] = col3[2];
            LB[n * 12 + 11] = 0.10 + 0.16 * (1 - f);
            n++;
          }
          hx = xx; hy = yy; hz = zz; has = true;
        }
      }
      gfx.lines(LB.subarray(0, n * 12), { depthWrite: false });
    }
  });

  /* ====================================================================== *
   * 11 / SEARCHING AGAIN -- an engineering drawing of a two-tower retriever,
   * with the real cosine matrix of twenty pooled queries against twenty
   * documents drawn as graph paper, the top cell circled in red ink.
   * ====================================================================== */
  var S11 = {
    M: null, q: null, d: null, Cm: null, quads: null, lines: null,
    board: 2.5, ident: null, plate: null, card: null, row: 0, top: 0,
    QPHRASE: null, DPHRASE: null
  };

  function getModel(ctx) {
    if (!WEM.__b0712model) WEM.__b0712model = WEM.Model.build(ctx);
    return WEM.__b0712model;
  }
  function poolPhrase(M, phrase) {
    var out = new Float32Array(M.dim), n = 0, i, d, k;
    var parts = String(phrase).split(/\s+/);
    for (i = 0; i < parts.length; i++) {
      var w = parts[i].replace(/[^A-Za-z0-9']/g, "").toLowerCase();
      if (!w) continue;
      var vi = -1;
      for (k = 0; k < M.V; k++) if (M.vocab[k] === w) { vi = k; break; }
      if (vi < 0) continue;
      for (d = 0; d < M.dim; d++) out[d] += M.E[vi * M.dim + d];
      n++;
    }
    if (!n) return null;
    var l = 0;
    for (d = 0; d < M.dim; d++) l += out[d] * out[d];
    l = Math.sqrt(l) || 1;
    for (d = 0; d < M.dim; d++) out[d] /= l;
    return out;
  }

  WEM.defineSection({
    id: "11", name: "SEARCHING AGAIN",
    init: function (ctx) {
      var M = getModel(ctx), i, j, d;
      S11.M = M;
      S11.QPHRASE = [
        "i'm searching", "searching for you", "searching for you everywhere",
        "i can see you in most everything", "you can't stop transforming",
        "my old self", "gone since you have left", "a bucket of love",
        "some of us empty", "some of us filled up", "cut this into pieces",
        "break us down to the cell", "merge us back up", "we have evolved now",
        "what's that word again", "a piece of sheet",
        "if you turn into a human", "the warmth coming from your hands",
        "hair that's unruly", "you're the only perfect human for me"
      ];
      S11.DPHRASE = [
        "if you turn into a table", "you must be at the height of my elbows",
        "odd stubby leg makes you wobbly", "if you turn into an eggplant",
        "you'll be my purple friend", "scratchy nail marks on your body",
        "if you're a cat", "a little kitten", "you must be blue point",
        "meowing a lot", "hissing a lot", "but you never purr",
        "if you're a steak", "a fillet mignon covered in mushroom sauce",
        "browned on the outside", "medium-rare inside", "if you turn into a flower",
        "even if you bloom just occasionally", "you're the only perfect flower for me",
        "side by side, the lovelier goes up"
      ];
      S11.q = new Float32Array(20 * M.dim);
      S11.d = new Float32Array(20 * M.dim);
      S11.Cm = new Float32Array(400);
      for (i = 0; i < 20; i++) {
        var a = poolPhrase(M, S11.QPHRASE[i]);
        var b = poolPhrase(M, S11.DPHRASE[i]);
        if (!a) { a = new Float32Array(M.dim); a[0] = 1; }
        if (!b) { b = new Float32Array(M.dim); b[0] = 1; }
        for (d = 0; d < M.dim; d++) { S11.q[i * M.dim + d] = a[d]; S11.d[i * M.dim + d] = b[d]; }
      }
      /* the real similarity matrix: 400 mean-pooled cosine values */
      for (i = 0; i < 20; i++) {
        for (j = 0; j < 20; j++) {
          var s = 0;
          for (d = 0; d < M.dim; d++) s += S11.q[i * M.dim + d] * S11.d[j * M.dim + d];
          S11.Cm[i * 20 + j] = s;
        }
      }
      S11.quads = new WEM.Viz.Quads(400);
      S11.lines = new Float32Array(340 * 12);
      S11.ident = M4.ident(new Float32Array(16));
      S11.plate = G.box(2.10, 0.012, 2.10);
      S11.card = G.box(0.44, 0.30, 0.014);
    },
    enter: function () { },
    draw2d: function (ctx) {
      var hud = ctx.hud, W = ctx.W, H = ctx.H, u = ctx.local, d;
      var col = I.css(ctx.t), col2 = I.css2(ctx.t);
      var ain = 0.30 + 0.70 * ctx.in;
      var row = ((ctx.beat.index | 0) % 20 + 20) % 20;
      ctx.hits = u < 6.0 ? 20 : 3;
      setCam(ctx.cam, 0.35 + 0.5 * Math.sin(u * 0.13), 3.05, 8.6, 0, 1.30, 0, 0.78);

      var best = -2, bj = 0, j;
      for (j = 0; j < 20; j++) if (S11.Cm[row * 20 + j] > best) { best = S11.Cm[row * 20 + j]; bj = j; }
      S11.row = row; S11.top = bj;

      var qb = I.card(ctx, 56, 150, 392, 258, { title: "QUERY TOWER", right: "12-d", tab: "11  RETRIEVAL" });
      hud.T(qb.x + 14, qb.y + 40, "QUERY " + (row < 9 ? "0" : "") + (row + 1) + " / 20", {
        size: 13, color: col, alpha: 0.95 * ain
      });
      var bx = qb.x + 16, by = qb.y + 78, bw = qb.w - 32, mx = 1e-6;
      for (d = 0; d < 12; d++) mx = Math.max(mx, Math.abs(S11.q[row * 12 + d]));
      hud.line(bx, by + 44, bx + bw, by + 44, { color: I.hexA(INK, 0.25 * ain) });
      for (d = 0; d < 12; d++) {
        var comp = S11.q[row * 12 + d], hh = comp / mx * 40;
        hud.rect(bx + d * (bw / 12) + 2, hh >= 0 ? by + 44 - hh : by + 44, bw / 12 - 5, Math.abs(hh), {
          fill: I.hexA(comp >= 0 ? col : col2, 0.85 * ain)
        });
        hud.T(bx + d * (bw / 12) + bw / 24 - 2, by + 96, "v" + (d + 1), {
          size: 8, color: FAINT, alpha: 0.5 * ain, align: "center"
        });
      }
      hud.T(qb.x + 14, qb.y + 210, "\"" + S11.QPHRASE[row].slice(0, 34) + "\"", { size: 11, color: INK, alpha: 0.7 * ain });
      hud.T(qb.x + 14, qb.y + 228, "MEAN POOLED · L2 NORMALISED", { size: 9, color: GREY, alpha: 0.5 * ain, spacing: 1.0 });

      var db = I.card(ctx, 1472, 150, 392, 258, { title: "DOC TOWER", right: "20 × 768" });
      hud.T(db.x + 14, db.y + 40, "20 DOCUMENTS · 768-d SOURCE", { size: 13, color: col, alpha: 0.95 * ain });
      hud.T(db.x + 14, db.y + 62, "PROJECTED TO 12-d, SHOWN AT 3-d", { size: 10, color: GREY, alpha: 0.6 * ain, spacing: 0.7 });
      hud.T(db.x + 14, db.y + 92, "LAYERS", { size: 9, color: GREY, alpha: 0.5 * ain, spacing: 2.2 });
      for (d = 0; d < 3; d++) {
        hud.rect(db.x + 14, db.y + 104 + d * 26, 126, 16, { stroke: I.hexA(INK, 0.25 * ain), lw: 1 });
        hud.T(db.x + 22, db.y + 116 + d * 26, "LINEAR + NORM", { size: 9, color: INK, alpha: 0.55 * ain });
        hud.line(db.x + 148, db.y + 112 + d * 26, db.x + 300, db.y + 112 + d * 26, { color: I.hexA(col, 0.35 * ain), lw: 1 });
      }
      hud.T(db.x + 14, db.y + 210, "cos(q,d) = " + best.toFixed(3), { size: 20, color: col2, alpha: ain, weight: 600 });
      hud.T(db.x + 14, db.y + 230, "\"" + S11.DPHRASE[bj].slice(0, 36) + "\"", { size: 11, color: INK, alpha: 0.7 * ain });

      var kb = I.card(ctx, 660, 792, 600, 130, { title: "FIG. 11", right: "SCALE 1 : 1" });
      hud.T(kb.x + 14, kb.y + 40, "TWO-TOWER RETRIEVAL · DUALLY EMBEDDED", {
        size: 14, color: INK, alpha: 0.9 * ain, weight: 600, spacing: 1.2
      });
      hud.T(kb.x + 14, kb.y + 64, "QUERY ROW " + (row + 1) + "  >  DOC " + (bj + 1) + "   cos = " + best.toFixed(3), {
        size: 12, color: col, alpha: 0.9 * ain
      });
      hud.T(kb.x + 14, kb.y + 86, "ARGMAX CELL CIRCLED IN RED INK", { size: 10, color: RED, alpha: 0.7 * ain, spacing: 1.4 });
      hud.T(kb.x + 14, kb.y + 104, "SHEET 11 / 22 · MATRIX 20 × 20 = 400 REAL COSINES", {
        size: 9, color: GREY, alpha: 0.5 * ain, spacing: 0.8
      });
      hud.T(W - 46, H - 162, "2016 NEURAL RETRIEVAL · DUALLY EMBEDDED", {
        size: 10, color: GREY, alpha: 0.45 * ain, align: "right", spacing: 1.1
      });
    },
    draw3d: function (ctx) {
      var gfx = ctx.gfx, u = ctx.local, i, j;
      var col = I.rgbA("#ff6fb0", 1), col2 = I.rgbA("#ffffff", 1), red = I.rgbA(RED, 1);
      var row = S11.row, L = S11.lines, n = 0;

      /* the towers: cards rising through three plates */
      for (var side = 0; side < 2; side++) {
        var sx = side === 0 ? -3.15 : 3.15;
        var rot = side ? -0.22 : 0.22;
        for (i = 0; i < 3; i++) {
          M4.trans(sx, 0.60 + i * 0.80, 0, _t0);
          M4.rotY(rot, _t1);
          M4.mul(_t0, _t1, _ma);
          gfx.solid(S11.plate, _ma, { color: side ? col : col2, alpha: 0.10, smooth: false, rim: 0.9, unlit: true });
          gfx.wire(S11.plate, _ma, { color: side ? col : col2, alpha: 0.20, width: 1 });
        }
        for (i = 0; i < 9; i++) {
          var cyc = (u * 0.34 + i * 0.22 + side * 0.11) % 1;
          var v0 = side === 0 ? S11.q[row * 12 + (i % 9)] : S11.d[((i * 3) % 20) * 12 + (i % 9)];
          var v1 = side === 0 ? S11.q[row * 12 + 9] : S11.d[((i * 3) % 20) * 12 + 9];
          M4.trans(sx + v0 * 0.5, 0.05 + cyc * 2.55, v1 * 0.7, _t0);
          M4.rotY(rot, _t1);
          M4.mul(_t0, _t1, _ma);
          gfx.solid(S11.card, _ma, {
            color: [0.20 + 0.62 * Math.abs(v0), 0.06 + 0.30 * Math.abs(v0), 0.24 + 0.44 * Math.abs(v0)],
            alpha: Math.sin(cyc * PI) * 0.95, smooth: false, rim: 0.4, light: [0.3, 0.9, 0.4]
          });
        }
        /* dimension lines, the way a draughtsman would put them */
        L[n * 12] = sx; L[n * 12 + 1] = 0.10; L[n * 12 + 2] = -1.25; L[n * 12 + 3] = 1.2;
        L[n * 12 + 4] = sx; L[n * 12 + 5] = 2.95; L[n * 12 + 6] = -1.25; L[n * 12 + 7] = 1.2;
        L[n * 12 + 8] = col2[0]; L[n * 12 + 9] = col2[1]; L[n * 12 + 10] = col2[2]; L[n * 12 + 11] = 0.35;
        n++;
        for (i = 0; i < 3; i++) {
          var ay = 0.10 + i * 1.42;
          L[n * 12] = sx - 0.16; L[n * 12 + 1] = ay; L[n * 12 + 2] = -1.25; L[n * 12 + 3] = 1.2;
          L[n * 12 + 4] = sx + 0.16; L[n * 12 + 5] = ay; L[n * 12 + 6] = -1.25; L[n * 12 + 7] = 1.2;
          L[n * 12 + 8] = col2[0]; L[n * 12 + 9] = col2[1]; L[n * 12 + 10] = col2[2]; L[n * 12 + 11] = 0.30;
          n++;
        }
        gfx.lines(L.subarray(0, n * 12), { depthWrite: false });
        n = 0;
      }

      /* the graph paper: 20 x 20 cells, every one a real cosine */
      var qd = S11.quads;
      qd.clear();
      var half = S11.board * 0.5, cs = S11.board / 20;
      M4.trans(0, 0.34, 0.15, _t0);
      M4.rotX(-1.16, _t1);
      M4.mul(_t0, _t1, _me);
      var tiltM = _me;
      for (i = 0; i < 20; i++) {
        for (j = 0; j < 20; j++) {
          var val = S11.Cm[i * 20 + j];
          var a = 0.06 + 0.90 * clamp((val + 0.2) / 1.1, 0, 1);
          var lit = (i === row);
          var r = col[0] * 0.55 + (lit ? col2[0] * 0.45 : 0);
          var g = col[1] * 0.55 + (lit ? col2[1] * 0.45 : 0);
          var b = col[2] * 0.55 + (lit ? col2[2] * 0.45 : 0);
          if (val < 0) { r = 0.42; g = 0.48; b = 0.60; }
          M4.trans(-half + (i + 0.5) * cs, half - (j + 0.5) * cs, 0, _t2);
          M4.mul(tiltM, _t2, _mb);
          M4.scale(cs * 0.90, cs * 0.90, 1, _t3);
          M4.mul(_mb, _t3, _mc);
          qd.add(_mc, UNIT_RECT, [r, g, b, a * (lit ? 1 : 0.85)]);
        }
      }
      gfx.quads(qd.view(), null, { depthWrite: false });

      /* grid lines */
      var n2 = 0;
      for (i = 0; i <= 20; i++) {
        var o = -half + i * cs;
        _p4[0] = -half; _p4[1] = o; _p4[2] = 0; _p4[3] = 1;
        M4.xform(tiltM, _p4, _pj);
        var ax0 = _pj[0], ay0 = _pj[1], az0 = _pj[2];
        _p4[0] = half;
        M4.xform(tiltM, _p4, _pj);
        var ax1 = _pj[0], ay1 = _pj[1], az1 = _pj[2];
        _p4[0] = o; _p4[1] = -half;
        M4.xform(tiltM, _p4, _pj);
        var bx0 = _pj[0], by0 = _pj[1], bz0 = _pj[2];
        _p4[1] = half;
        M4.xform(tiltM, _p4, _pj);
        var bx1 = _pj[0], by1 = _pj[1], bz1 = _pj[2];
        L[n2 * 12] = ax0; L[n2 * 12 + 1] = ay0; L[n2 * 12 + 2] = az0; L[n2 * 12 + 3] = 1;
        L[n2 * 12 + 4] = ax1; L[n2 * 12 + 5] = ay1; L[n2 * 12 + 6] = az1; L[n2 * 12 + 7] = 1;
        L[n2 * 12 + 8] = col2[0]; L[n2 * 12 + 9] = col2[1]; L[n2 * 12 + 10] = col2[2]; L[n2 * 12 + 11] = 0.16;
        n2++;
        L[n2 * 12] = bx0; L[n2 * 12 + 1] = by0; L[n2 * 12 + 2] = bz0; L[n2 * 12 + 3] = 1;
        L[n2 * 12 + 4] = bx1; L[n2 * 12 + 5] = by1; L[n2 * 12 + 6] = bz1; L[n2 * 12 + 7] = 1;
        L[n2 * 12 + 8] = col2[0]; L[n2 * 12 + 9] = col2[1]; L[n2 * 12 + 10] = col2[2]; L[n2 * 12 + 11] = 0.16;
        n2++;
      }
      gfx.lines(L.subarray(0, n2 * 12), { depthWrite: false });

      /* the argmax cell, circled in red ink with a wobbling hand */
      var bj = S11.top, R = cs * 0.72;
      var cxx = -half + (row + 0.5) * cs, cyy = half - (bj + 0.5) * cs;
      var grow = clamp((u - 1.6) / 0.7, 0, 1);
      for (i = 0; i < 44; i++) {
        var a0 = i / 44 * TAU, a1 = (i + 1) / 44 * TAU;
        var r0 = R * (1 + 0.10 * (h2(i * 1.7, 3.1) - 0.5)) * grow;
        var r1 = R * (1 + 0.10 * (h2((i + 1) * 1.7, 3.1) - 0.5)) * grow;
        if (r0 < 0.001) continue;
        _p4[0] = cxx + Math.cos(a0) * r0; _p4[1] = cyy + Math.sin(a0) * r0; _p4[2] = 0.002; _p4[3] = 1;
        M4.xform(tiltM, _p4, _pj);
        var A0x = _pj[0], A0y = _pj[1], A0z = _pj[2];
        _p4[0] = cxx + Math.cos(a1) * r1; _p4[1] = cyy + Math.sin(a1) * r1;
        M4.xform(tiltM, _p4, _pj);
        L[n2 * 12] = A0x; L[n2 * 12 + 1] = A0y; L[n2 * 12 + 2] = A0z; L[n2 * 12 + 3] = 2.6;
        L[n2 * 12 + 4] = _pj[0]; L[n2 * 12 + 5] = _pj[1]; L[n2 * 12 + 6] = _pj[2]; L[n2 * 12 + 7] = 2.6;
        L[n2 * 12 + 8] = red[0]; L[n2 * 12 + 9] = red[1]; L[n2 * 12 + 10] = red[2]; L[n2 * 12 + 11] = 0.95;
        n2++;
      }
      gfx.lines(L.subarray(0, n2 * 12), { depthWrite: false });
    }
  });

  /* ====================================================================== *
   * 12 / WHAT'S THAT WORD -- the word space.  A real 12-d embedding of the
   * song's own vocabulary, PCA'd to three whitened axes; a query that walks
   * to its nearest neighbour every beat; candidates struck out one by one;
   * and then LOVE at 150 px, its long notes drawn as measured bars.
   * ====================================================================== */
  var S12 = {
    words: [], P: null, Wn: null, E: null, N: 0, dim: 12,
    q: new Float32Array(12), qw: new Float32Array(12),
    qproj: new Float32Array(3), qDope: null, qLove: null, frame: null,
    walkBeat: -9, walkSeed: -9, rej: [], hist: [], pools: null,
    pts: null, lines: null, wIdx: null, attempts: 0, cloudK: 0, hitFired: false,
    qx: 0, qy: 0, qz: 0, topS: new Float32Array(5), topI: new Int32Array(5),
    T_DOPE: 154.90, T_LOVE: 160.05, T_CLOUD: 163.40, T_CIRCLE: 164.10, T_BIG: 163.55,
    THRESH: 0.75
  };
  var GAPS = [0, 30, 30, 30, 0, 0];
  var GLYPHS = ["L", "O", "O", "O", "V", "E"];

  function norm12(v, n) {
    var l = 0, i;
    for (i = 0; i < n; i++) l += v[i] * v[i];
    l = Math.sqrt(l) || 1;
    for (i = 0; i < n; i++) v[i] /= l;
    return v;
  }

  function buildSpace(ctx) {
    var M = getModel(ctx), i, k, d, a, b, c, p;
    var raw = [], seen = {};
    for (k = 0; k < M.V; k++) {
      var w = String(M.vocab[k]);
      if (!/^[a-z][a-z']+$/.test(w)) continue;
      var nm = w.replace(/([a-z])\1{2,}/g, "$1");       /* "dooooope" -> "dope" */
      if (nm.length < 2) continue;
      if (seen[nm] === undefined) { seen[nm] = raw.length; raw.push({ w: nm, ids: [k] }); }
      else raw[seen[nm]].ids.push(k);
    }
    var N = raw.length, dim = M.dim;
    S12.N = N; S12.dim = dim;
    S12.E = new Float32Array(N * dim);
    S12.words = [];
    for (i = 0; i < N; i++) {
      S12.words.push(raw[i].w);
      for (d = 0; d < dim; d++) {
        var s = 0;
        for (k = 0; k < raw[i].ids.length; k++) s += M.E[raw[i].ids[k] * dim + d];
        S12.E[i * dim + d] = s / raw[i].ids.length;
      }
    }
    /* PCA: three components by power iteration with deflation */
    var mean = new Float32Array(dim);
    for (i = 0; i < N; i++) for (d = 0; d < dim; d++) mean[d] += S12.E[i * dim + d] / N;
    var cov = new Float32Array(dim * dim);
    for (i = 0; i < N; i++) {
      for (a = 0; a < dim; a++) {
        var xa = S12.E[i * dim + a] - mean[a];
        for (b = a; b < dim; b++) cov[a * dim + b] += xa * (S12.E[i * dim + b] - mean[b]);
      }
    }
    for (a = 0; a < dim; a++) for (b = a + 1; b < dim; b++) cov[b * dim + a] = cov[a * dim + b];
    var comps = [], lams = [], rr = C.rng(0x9CA0);
    for (c = 0; c < 3; c++) {
      var vec = new Float32Array(dim), it;
      for (p = 0; p < dim; p++) vec[p] = rr() - 0.5;
      for (it = 0; it < 90; it++) {
        var nx = new Float32Array(dim);
        for (a = 0; a < dim; a++) {
          var s2 = 0;
          for (b = 0; b < dim; b++) s2 += cov[a * dim + b] * vec[b];
          nx[a] = s2;
        }
        norm12(nx, dim);
        vec = nx;
      }
      var lam = 0;
      for (a = 0; a < dim; a++) {
        var s3 = 0;
        for (b = 0; b < dim; b++) s3 += cov[a * dim + b] * vec[b];
        lam += vec[a] * s3;
      }
      comps.push(vec); lams.push(Math.max(lam, 1e-9));
      for (a = 0; a < dim; a++) for (b = 0; b < dim; b++) cov[a * dim + b] -= lam * vec[a] * vec[b];
    }
    S12.P = new Float32Array(N * 3);
    var mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (i = 0; i < N; i++) {
      for (c = 0; c < 3; c++) {
        var v = 0;
        for (d = 0; d < dim; d++) v += (S12.E[i * dim + d] - mean[d]) * comps[c][d];
        v /= Math.sqrt(lams[c]);                        /* whitened: no squashed line */
        S12.P[i * 3 + c] = v;
        if (v < mn[c]) mn[c] = v;
        if (v > mx[c]) mx[c] = v;
      }
    }
    var ext = Math.max(mx[0] - mn[0], Math.max(mx[1] - mn[1], mx[2] - mn[2])) || 1;
    for (i = 0; i < N; i++) {
      for (c = 0; c < 3; c++) S12.P[i * 3 + c] = (S12.P[i * 3 + c] - (mn[c] + mx[c]) * 0.5) / ext * 5.0;
    }
    S12.frame = {
      mean: mean, axes: comps, lams: lams, ext: ext,
      shift: [(mn[0] + mx[0]) * 0.5, (mn[1] + mx[1]) * 0.5, (mn[2] + mx[2]) * 0.5]
    };
    S12.Wn = new Float32Array(N * dim);
    for (i = 0; i < N; i++) {
      for (d = 0; d < dim; d++) S12.Wn[i * dim + d] = S12.E[i * dim + d];
      norm12(S12.Wn.subarray(i * dim, i * dim + dim), dim);
    }
    S12.wIdx = {};
    for (i = 0; i < N; i++) S12.wIdx[S12.words[i]] = i;

    /* a query vector whose cosine with one word is exactly lambda */
    function exactQuery(target, lambda, partner) {
      var ti = S12.wIdx[target];
      if (ti === undefined) return null;
      var out = new Float32Array(dim), o = new Float32Array(dim), s = 0;
      for (d = 0; d < dim; d++) o[d] = partner ? partner[d] : (h2(d * 3.7, 11.3) - 0.5);
      for (d = 0; d < dim; d++) s += o[d] * S12.Wn[ti * dim + d];
      for (d = 0; d < dim; d++) o[d] -= s * S12.Wn[ti * dim + d];        /* Gram-Schmidt */
      norm12(o, dim);
      var k2 = Math.sqrt(Math.max(0, 1 - lambda * lambda));
      for (d = 0; d < dim; d++) out[d] = lambda * S12.Wn[ti * dim + d] + k2 * o[d];
      return norm12(out, dim);
    }
    var partner = poolPhrase(M, "a piece of sheet") || poolPhrase(M, "piece of sheet");
    S12.qDope = exactQuery("dope", 0.612, partner);
    S12.qLove = exactQuery("love", 0.994, partner);
    if (!S12.qDope) S12.qDope = new Float32Array(S12.Wn.subarray(0, dim));
    if (!S12.qLove) S12.qLove = new Float32Array(S12.Wn.subarray(0, dim));

    S12.pools = [];
    var lrc = ctx.data.lrc;
    for (i = 0; i < lrc.length; i++) {
      if (lrc[i].t < 150 || lrc[i].t > 167) continue;
      var pv = poolPhrase(M, String(lrc[i].text).replace(/[^A-Za-z' ]/g, " "));
      if (pv) S12.pools.push({ t: lrc[i].t, v: pv });
    }
    S12.pts = new WEM.Viz.Points(N + 8);
    S12.lines = new Float32Array(260 * 12);
  }

  function poolAt(t) {
    var best = null, i;
    for (i = 0; i < S12.pools.length; i++) if (S12.pools[i].t <= t + 0.02) best = S12.pools[i];
    return best ? best.v : null;
  }
  function cosTo(q, wi) {
    if (wi === undefined || wi < 0) return 0;
    var s = 0, d;
    for (d = 0; d < S12.dim; d++) s += q[d] * S12.Wn[wi * S12.dim + d];
    return s;
  }
  function nearestTo(q, ex) {
    var bi = -1, bv = -2, i, d;
    for (i = 0; i < S12.N; i++) {
      if (ex[i]) continue;
      var s = 0;
      for (d = 0; d < S12.dim; d++) s += q[d] * S12.Wn[i * S12.dim + d];
      if (s > bv) { bv = s; bi = i; }
    }
    return { i: bi, s: bv };
  }
  /* the five nearest words, selected into preallocated slots */
  function topN(q) {
    var s = S12.topS, ix = S12.topI, i, d, j, v;
    for (i = 0; i < 5; i++) { s[i] = -2; ix[i] = -1; }
    for (i = 0; i < S12.N; i++) {
      v = 0;
      for (d = 0; d < S12.dim; d++) v += q[d] * S12.Wn[i * S12.dim + d];
      if (v <= s[4]) continue;
      for (j = 4; j > 0 && s[j - 1] < v; j--) { s[j] = s[j - 1]; ix[j] = ix[j - 1]; }
      s[j] = v; ix[j] = i;
    }
    return ix[0];
  }
  /* the walk is a pure function of the beat clock: replay it from the top of
     the section whenever the beat index changes */
  function runWalk(ctx) {
    var B = ctx.data.beats, s0 = ctx.sec.start, i, d, bi = 0, bj = 0;
    for (i = 0; i < B.length; i++) { if (B[i] >= s0) { bi = i; break; } }
    for (i = bi; i < B.length; i++) { if (B[i] <= ctx.t) bj = i; else break; }
    if (S12.walkBeat === bj && S12.walkSeed === bi) return;
    S12.walkBeat = bj; S12.walkSeed = bi;
    var q = S12.qw, ex = new Uint8Array(S12.N);
    var seed = poolAt(B[bi]);
    if (seed) for (d = 0; d < S12.dim; d++) q[d] = seed[d];
    else for (d = 0; d < S12.dim; d++) q[d] = h2(d * 2.1, 5.5) - 0.5;
    norm12(q, S12.dim);
    S12.rej.length = 0;
    S12.hist.length = 0;
    var forced = false;
    for (i = bi; i <= bj; i++) {
      var tb = B[i], guess = null, gi = -1;
      if (tb < S12.T_DOPE) {
        var nn = nearestTo(q, ex);
        if (nn.i >= 0) {
          for (d = 0; d < S12.dim; d++) q[d] += 0.34 * (S12.Wn[nn.i * S12.dim + d] - q[d]);
          norm12(q, S12.dim);
          ex[nn.i] = 1;
          guess = S12.words[nn.i]; gi = nn.i;
        }
      } else if (tb < S12.T_LOVE) {
        if (!forced) {
          for (d = 0; d < S12.dim; d++) q[d] = S12.qDope[d];
          forced = true;
          guess = "dope"; gi = S12.wIdx["dope"];
          if (gi >= 0) ex[gi] = 1;
        } else {
          var nn2 = nearestTo(q, ex);
          if (nn2.i >= 0) { ex[nn2.i] = 1; guess = S12.words[nn2.i]; gi = nn2.i; }
        }
      } else {
        guess = "love"; gi = S12.wIdx["love"];
      }
      var gs = gi >= 0 ? cosTo(q, gi) : 0;
      if (S12.hist.length) {
        var pv = S12.hist[S12.hist.length - 1];
        if (pv.guess && pv.sem < S12.THRESH) S12.rej.push({ w: pv.guess, sem: pv.sem, t: pv.beat });
      }
      S12.hist.push({ guess: guess, gi: gi, sem: gs, beat: tb });
    }
    S12.attempts = S12.rej.length;
  }
  function projectQuery(q) {
    var F = S12.frame, out = S12.qproj, c, d, v;
    if (!F) return out;
    for (c = 0; c < 3; c++) {
      v = 0;
      for (d = 0; d < S12.dim; d++) v += (q[d] - F.mean[d]) * F.axes[c][d];
      out[c] = (v / Math.sqrt(F.lams[c]) - F.shift[c]) / F.ext * 5.0;
    }
    return out;
  }

  WEM.defineSection({
    id: "12", name: "WHAT'S THAT WORD",
    init: function (ctx) { buildSpace(ctx); },
    enter: function () {
      S12.walkBeat = -9; S12.walkSeed = -9;
      S12.rej.length = 0; S12.hist.length = 0;
      S12.cloudK = 0; S12.hitFired = false; S12.attempts = 0;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, W = ctx.W, H = ctx.H, t = ctx.t, u = ctx.local;
      var col = I.css(t), col2 = I.css2(t);
      var ain = 0.30 + 0.70 * ctx.in, i, d;
      runWalk(ctx);

      /* the live query: the walk, then the glide onto the word */
      var loveK = smoothstep(S12.T_LOVE, S12.T_LOVE + 4.9, t);
      for (d = 0; d < S12.dim; d++) S12.q[d] = S12.qw[d] * (1 - loveK) + S12.qLove[d] * loveK;
      norm12(S12.q, S12.dim);
      var q = S12.q;
      var loveSem = cosTo(q, S12.wIdx["love"]);
      var dopeSem = cosTo(q, S12.wIdx["dope"]);
      topN(q);
      var topS = S12.topS, topI = S12.topI;
      var qp = projectQuery(q);
      S12.qx = qp[0]; S12.qy = qp[1]; S12.qz = qp[2];

      /* the camera slowly closes on the word */
      var closeK = clamp((t - S12.T_LOVE) / 5.4, 0, 1);
      var dd = 7.4 - 2.1 * closeK + 0.10 * ctx.beat.pulse;
      var aim = lerp(0.35, 0.95, closeK);
      setCam(ctx.cam,
        Math.sin(u * 0.10) * dd * 0.5 + (1 - closeK) * 0.4,
        1.2 + 0.9 * (1 - closeK) + 0.05 * ctx.beat.barPulse,
        Math.cos(u * 0.10) * dd,
        S12.qx * aim, S12.qy * aim, S12.qz * aim, 0.80);

      /* -- hits and the shared query field -- */
      var hitsN = u < 1.8 ? 20 : (u < 4.9 ? 5 : (u < 11.8 ? 2 : 1));
      ctx.hits = hitsN;
      I.queryBar(ctx, {
        text: ctx.lyric ? String(ctx.lyric.text) : "",
        hits: hitsN,
        note: t >= S12.T_CIRCLE ? "<- THE WORD" : "RESULTS",
        prog: clamp(topS[0], 0, 1)
      });
      ctx.__qDrawn = ctx.t;

      /* -- the typeahead dropdown, right under the field -- */
      var dx = 300, dy = 106, dw = W - 600;
      var REJ = {};
      for (i = 0; i < S12.rej.length; i++) REJ[S12.rej[i].w] = S12.rej[i];
      hud.rect(dx, dy, dw, 200, { fill: "rgba(6,9,13,0.60)", stroke: I.hexA(col, 0.42 * ain), lw: 1 });
      hud.line(dx, dy + 30, dx + dw, dy + 30, { color: I.hexA(col, 0.35 * ain) });
      var nch = Math.floor(clamp((u - 0.9) / 0.11, 0, 60));
      var typed = String(ctx.lyric ? ctx.lyric.text : "").slice(0, Math.max(6, nch));
      var shown = typed + "  /  U-Um?";
      hud.T(dx + 12, dy + 20, shown, { size: 14, color: INK, alpha: 0.88 * ain });
      var blink = (Math.sin(t * 12.0) > -0.2) ? 1 : 0.12;
      hud.rect(dx + 16 + measure(hud, shown, 14, 400), dy + 8, 2, 16, { fill: I.hexA(col, 0.95 * blink * ain) });
      hud.T(dx + dw - 12, dy + 12, "TYPEAHEAD", { size: 9, color: col, alpha: 0.7 * ain, align: "right", spacing: 2.0 });
      hud.T(dx + dw - 12, dy + 24, "THRESHOLD " + S12.THRESH.toFixed(2), {
        size: 9, color: GREY, alpha: 0.55 * ain, align: "right", spacing: 1.2
      });

      /* the five rows: the machine's guess first, then the real neighbours */
      var rows = [], gw = null;
      if (t >= S12.T_DOPE) gw = t >= S12.T_LOVE ? "love" : "dope";
      if (gw) rows.push({ w: gw, sem: gw === "love" ? loveSem : dopeSem, src: "TYPEAHEAD", wi: S12.wIdx[gw] });
      for (i = 0; i < 5 && rows.length < 5; i++) {
        var wi = topI[i];
        if (wi < 0) break;
        if (gw && S12.words[wi] === gw) continue;
        rows.push({ w: S12.words[wi], sem: topS[i], src: "VECTOR", wi: wi });
      }
      rows.sort(function (a, b) { return b.sem - a.sem; });
      for (i = 0; i < rows.length; i++) {
        var ry = dy + 43 + i * 27;
        var r2 = rows[i];
        var dead = REJ[r2.w] !== undefined;
        var acc = r2.sem >= S12.THRESH;
        // a struck-out candidate still has to be READABLE: on the paper theme a
        // mid-dark grey inverts to a light grey, and at 0.30 alpha it vanished
        // into the sheet entirely (the words were there, just invisible)
        var al = dead ? 0.66 : 1;
        hud.T(dx + 20, ry, r2.w.toUpperCase(), {
          size: 16, color: acc ? col2 : (dead ? GREY : INK), alpha: al * ain, weight: acc ? 700 : 400, spacing: 0.6
        });
        hud.T(dx + 250, ry, r2.src, { size: 9, color: acc ? col2 : GREY, alpha: (dead ? 0.4 : 0.7) * ain, spacing: 1.6 });
        var bw = 260, bxx = dx + dw - 140 - bw;
        hud.rect(bxx, ry - 9, bw, 5, { fill: "rgba(238,242,246," + (0.10 * ain) + ")" });
        hud.rect(bxx, ry - 9, bw * clamp((r2.sem + 0.2) / 1.2, 0, 1), 5, {
          fill: I.hexA(acc ? col2 : col, (dead ? 0.35 : 0.9) * ain)
        });
        hud.T(dx + dw - 20, ry, r2.sem.toFixed(3), {
          size: 15, color: acc ? col2 : (dead ? GREY : col), alpha: al * ain, align: "right"
        });
        hud.T(dx + dw - 20, ry + 12, acc ? "ACCEPTED" : (dead ? "REJECTED" : "BELOW THRESHOLD"), {
          size: 8, color: acc ? col2 : (dead ? RED : FAINT), alpha: (dead ? 0.75 : 0.5) * ain, align: "right", spacing: 1.2
        });
        if (dead) {
          hud.line(dx + 16, ry - 5, dx + 22 + measure(hud, r2.w.toUpperCase(), 16, 400), ry - 5, {
            color: I.hexA(RED, 0.9 * ain), lw: 2
          });
        }
        hud.line(dx, ry + 14, dx + dw, ry + 14, { color: "rgba(238,242,246," + (0.06 * ain) + ")" });
      }
      var sy = dy + 186;
      hud.T(dx + 12, sy, "REJECTED", { size: 9, color: RED, alpha: 0.7 * ain, spacing: 2.0 });
      var sx2 = dx + 96;
      for (i = Math.max(0, S12.rej.length - 4); i < S12.rej.length; i++) {
        var rj = S12.rej[i];
        var fw = measure(hud, rj.w.toUpperCase(), 11, 400);
        hud.T(sx2, sy, rj.w.toUpperCase(), { size: 11, color: GREY, alpha: 0.6 * ain });
        hud.line(sx2 - 2, sy - 4, sx2 + fw + 2, sy - 4, { color: I.hexA(RED, 0.6 * ain), lw: 1 });
        sx2 += fw + 14;
      }

      hud.T(W - 46, H - 232, "ATTEMPTS", { size: 10, color: GREY, alpha: 0.6 * ain, align: "right", spacing: 2.0 });
      hud.T(W - 46, H - 210, (S12.attempts < 10 ? "0" : "") + S12.attempts, {
        size: 22, color: col, alpha: ain, align: "right", weight: 600
      });
      hud.T(W - 46, H - 188, "cos(q, DOPE) = " + dopeSem.toFixed(3) + "   REJECTED", {
        size: 10, color: RED, alpha: 0.7 * ain, align: "right", spacing: 1.0
      });
      hud.T(W - 46, H - 162, "2017 ATTENTION IS ALL YOU NEED", {
        size: 10, color: GREY, alpha: 0.45 * ain, align: "right", spacing: 1.1
      });

      /* -- labels on the three words that matter -- */
      var vp = mkVp(ctx.cam, W, H);
      S12.cloudK = smoothstep(S12.T_CLOUD, S12.T_CLOUD + 0.7, t);
      var loveI = S12.wIdx["love"], dopeI = S12.wIdx["dope"];
      if (loveI === undefined) loveI = 0;
      for (i = 0; i < S12.N; i++) {
        var isLove = (i === loveI && t >= S12.T_LOVE);
        var isDope = (i === dopeI && t >= S12.T_DOPE && t < S12.T_LOVE);
        var isTop = i === topI[0];
        if (!isLove && !isDope && !isTop) continue;
        var px2 = S12.P[i * 3], py2 = S12.P[i * 3 + 1], pz2 = S12.P[i * 3 + 2];
        if (S12.cloudK > 0) {
          px2 = lerp(px2, S12.P[loveI * 3], 0.16 * S12.cloudK);
          py2 = lerp(py2, S12.P[loveI * 3 + 1], 0.16 * S12.cloudK);
          pz2 = lerp(pz2, S12.P[loveI * 3 + 2], 0.16 * S12.cloudK);
        }
        pj(vp, px2, py2, pz2, W, H, _pj);
        if (_pj[0] < 60 || _pj[0] > W - 60 || _pj[1] < 150 || _pj[1] > 790) continue;
        hud.T(_pj[0] + 13, _pj[1] - 8, S12.words[i].toUpperCase(), {
          size: isLove ? 20 : 14,
          color: isLove ? RED : (isDope ? RED : col2),
          alpha: (isLove ? 0.95 : 0.8) * ain, spacing: 1.2, weight: 600
        });
      }
      if (t < S12.T_LOVE) {
        pj(vp, S12.qx, S12.qy, S12.qz, W, H, _pj);
        hud.line(_pj[0] - 8, _pj[1], _pj[0] + 8, _pj[1], { color: I.hexA(col, 0.8 * ain), lw: 1.4 });
        hud.T(_pj[0] + 12, _pj[1] + 20, "QUERY", { size: 10, color: col, alpha: 0.85 * ain, spacing: 2.0 });
      }

      /* -- the word, at 150 px, its long notes drawn as measured bars -- */
      if (t >= S12.T_BIG) {
        var kIn = clamp((t - S12.T_BIG) / 0.35, 0, 1);
        var c2 = hud.fc, wds = [], total = 0;
        c2.save(); c2.font = hud.fontStr(150, "mono", 700);
        for (i = 0; i < 6; i++) { wds[i] = c2.measureText(GLYPHS[i]).width; total += wds[i] + GAPS[i]; }
        c2.restore();
        var bx2 = W / 2 - total / 2, by2 = 700;
        var beatLen = ctx.beat.period * 1.4;
        var played = Math.floor(clamp((t - S12.T_BIG) / beatLen, 0, 4));
        var held = clamp(((t - S12.T_BIG) % beatLen) / beatLen, 0, 1);
        hud.T(bx2, by2 - 96, "THE WORD", { size: 11, color: RED, alpha: 0.7 * ain * kIn, spacing: 3.2 });
        var cxx2 = bx2, bi2 = 0;
        for (i = 0; i < 6; i++) {
          hud.T(cxx2, by2, GLYPHS[i], {
            size: 150, color: (i >= 1 && i <= 3) ? RED : INK, alpha: kIn * ain, weight: 700
          });
          if (GAPS[i] > 0) {
            var grow = bi2 < played ? 1 : (bi2 === played ? held : 0);
            if (grow > 0.01) {
              hud.rect(cxx2 + wds[i] + 6, by2 - 54, Math.max(1, (GAPS[i] - 12) * grow), 9, {
                fill: I.hexA(RED, 0.95 * ain)
              });
            }
            bi2++;
          }
          cxx2 += wds[i] + GAPS[i];
        }
        hud.T(bx2 + total + 18, by2 - 40, "0.994", { size: 26, color: RED, alpha: ain * kIn, weight: 600 });
        hud.T(bx2, by2 + 34, "cos(q, LOVE) = " + loveSem.toFixed(3) + "   ·   ACCEPTED AT LAST", {
          size: 13, color: INK, alpha: 0.82 * ain * kIn
        });
      } else if (t >= S12.T_DOPE) {
        hud.T(W / 2, 640, "WHAT'S THAT WORD AGAIN?", {
          size: 34, color: INK, alpha: 0.55 * ain, align: "center", weight: 600, spacing: 3.0
        });
        hud.T(W / 2, 674, "DO-O-O-O-OPE?   " + dopeSem.toFixed(3) + "   REJECTED", {
          size: 15, color: RED, alpha: 0.6 * ain, align: "center", spacing: 2.0
        });
      }

      if (!S12.hitFired && t >= S12.T_CIRCLE) { S12.hitFired = true; ctx.fx.hit(0.30); }
    },
    draw3d: function (ctx) {
      var gfx = ctx.gfx, t = ctx.t, i, k2;
      var col = I.rgbA("#5ce1c8", 1), col2 = I.rgbA("#8ad4ff", 1), red = I.rgbA(RED, 1);
      var q = S12.q;
      var loveI = S12.wIdx["love"];
      if (loveI === undefined) loveI = 0;
      var cloudK = S12.cloudK;
      var qx = S12.qx, qy = S12.qy, qz = S12.qz;
      var points = S12.pts;
      points.clear();

      for (i = 0; i < S12.N; i++) {
        var px = S12.P[i * 3], py = S12.P[i * 3 + 1], pz = S12.P[i * 3 + 2];
        if (cloudK > 0) {
          px = lerp(px, S12.P[loveI * 3], 0.16 * cloudK);
          py = lerp(py, S12.P[loveI * 3 + 1], 0.16 * cloudK);
          pz = lerp(pz, S12.P[loveI * 3 + 2], 0.16 * cloudK);
        }
        var s = cosTo(q, i);
        var boost = (i === loveI && t >= S12.T_LOVE) ? 1 : 0;
        var depth = clamp(1.15 - Math.abs(pz - qz) * 0.13, 0.16, 1.15);
        points.add(px, py, pz,
          (0.012 + 0.026 * Math.max(0, s) + boost * 0.05) * PSPR,
          boost ? red : (s > 0.45 ? col2 : col),
          clamp((0.05 + 0.95 * Math.max(0, s) + boost * 0.9) * depth, 0.03, 1));
      }
      points.add(qx, qy, qz, 0.17 * PSPR, [1, 1, 1], 1.0);
      points.draw(gfx, { add: true, depthWrite: false, soft: 0.45 });

      /* links to the five nearest, struck through when they are rejected */
      topN(q);
      var topS = S12.topS, topI = S12.topI, n = 0, L = S12.lines;
      for (i = 0; i < 5; i++) {
        var wi = topI[i];
        if (wi < 0) break;
        var px2 = S12.P[wi * 3], py2 = S12.P[wi * 3 + 1], pz2 = S12.P[wi * 3 + 2];
        var strike = topS[i] < S12.THRESH;
        L[n * 12] = qx; L[n * 12 + 1] = qy; L[n * 12 + 2] = qz; L[n * 12 + 3] = 1.2;
        L[n * 12 + 4] = px2; L[n * 12 + 5] = py2; L[n * 12 + 6] = pz2; L[n * 12 + 7] = 1.2;
        L[n * 12 + 8] = strike ? red[0] : col2[0];
        L[n * 12 + 9] = strike ? red[1] : col2[1];
        L[n * 12 + 10] = strike ? red[2] : col2[2];
        L[n * 12 + 11] = strike ? 0.26 : 0.55;
        n++;
        if (strike) {
          var mx2 = (qx + px2) * 0.5, my2 = (qy + py2) * 0.5, mz2 = (qz + pz2) * 0.5;
          L[n * 12] = mx2 - 0.05; L[n * 12 + 1] = my2 - 0.05; L[n * 12 + 2] = mz2; L[n * 12 + 3] = 1.8;
          L[n * 12 + 4] = mx2 + 0.05; L[n * 12 + 5] = my2 + 0.05; L[n * 12 + 6] = mz2; L[n * 12 + 7] = 1.8;
          L[n * 12 + 8] = red[0]; L[n * 12 + 9] = red[1]; L[n * 12 + 10] = red[2]; L[n * 12 + 11] = 0.8;
          n++;
        }
      }
      gfx.lines(L.subarray(0, n * 12), { depthWrite: false });

      /* the query marker: three instrument rings */
      for (k2 = 0; k2 < 3; k2++) {
        var ux = k2 === 0 ? 0 : 1, uy = k2 === 0 ? 1 : 0, uz = 0;
        var axx = k2 === 0 ? 1 : 0, ayy = k2 === 1 ? 1 : 0, azz = k2 === 2 ? 1 : 0;
        for (i = 0; i < 20; i++) {
          var a0 = i / 20 * TAU, a1 = (i + 1) / 20 * TAU, R2 = 0.16;
          if (n >= 259) break;
          L[n * 12] = qx + (Math.cos(a0) * ux + Math.sin(a0) * axx) * R2;
          L[n * 12 + 1] = qy + (Math.cos(a0) * uy + Math.sin(a0) * ayy) * R2;
          L[n * 12 + 2] = qz + (Math.cos(a0) * uz + Math.sin(a0) * azz) * R2;
          L[n * 12 + 3] = 1.4;
          L[n * 12 + 4] = qx + (Math.cos(a1) * ux + Math.sin(a1) * axx) * R2;
          L[n * 12 + 5] = qy + (Math.cos(a1) * uy + Math.sin(a1) * ayy) * R2;
          L[n * 12 + 6] = qz + (Math.cos(a1) * uz + Math.sin(a1) * azz) * R2;
          L[n * 12 + 7] = 1.4;
          L[n * 12 + 8] = col[0]; L[n * 12 + 9] = col[1]; L[n * 12 + 10] = col[2]; L[n * 12 + 11] = 0.7;
          n++;
        }
      }
      gfx.lines(L.subarray(0, n * 12), { depthWrite: false });

      /* LOVE, circled in red ink once it has been accepted */
      if (t >= S12.T_CIRCLE) {
        var lx = S12.P[loveI * 3], ly = S12.P[loveI * 3 + 1], lz = S12.P[loveI * 3 + 2];
        var grow = clamp((t - S12.T_CIRCLE) / 0.55, 0, 1);
        var m2 = 0;
        for (i = 0; i < 40; i++) {
          var b0 = i / 40 * TAU, b1 = (i + 1) / 40 * TAU;
          var R3 = 0.42 * grow * (1 + 0.09 * (h2(i * 2.3, 7.7) - 0.5));
          var R4 = 0.42 * grow * (1 + 0.09 * (h2((i + 1) * 2.3, 7.7) - 0.5));
          L[m2 * 12] = lx + Math.cos(b0) * R3; L[m2 * 12 + 1] = ly + Math.sin(b0) * R3 * 0.8;
          L[m2 * 12 + 2] = lz; L[m2 * 12 + 3] = 2.6;
          L[m2 * 12 + 4] = lx + Math.cos(b1) * R4; L[m2 * 12 + 5] = ly + Math.sin(b1) * R4 * 0.8;
          L[m2 * 12 + 6] = lz; L[m2 * 12 + 7] = 2.6;
          L[m2 * 12 + 8] = red[0]; L[m2 * 12 + 9] = red[1]; L[m2 * 12 + 10] = red[2]; L[m2 * 12 + 11] = 0.95;
          m2++;
        }
        gfx.lines(L.subarray(0, m2 * 12), { depthWrite: false });
      }
    }
  });
})();
