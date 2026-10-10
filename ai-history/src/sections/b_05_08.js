/* sections 05-08 — it learns from praise, grows eyes, wears every mask, then is left alone */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, Ch = WEM.Chron;
  var clamp = C.clamp, lerp = C.lerp, Ease = C.Ease, M4 = C.M4, G = C.geo;
  var V3 = C.V3, PI = C.PI, TAU = C.TAU, Viz = WEM.Viz;

  /* ======================================================================
     shared
     ====================================================================== */
  var PERIOD = 0.461538;              // 130 bpm, straight out of meta.json
  var KEEP = {
    m: new Float32Array(16), m2: new Float32Array(16), m3: new Float32Array(16), m4: new Float32Array(16),
    v: [0, 0, 0], q: [0, 0, 0], d: [0, 0, 0], beat: {}
  };
  function sc(x, y, z, o) { return M4.scale(x, y, z, o || KEEP.m3); }
  function tr(x, y, z, o) { return M4.trans(x, y, z, o || KEEP.m4); }

  function ramp(x) { return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x); }
  function master(ctx) { return ramp(ctx.local / 0.28) * ctx.out; }
  function sgn(x) { return x < 0 ? -1 : x > 0 ? 1 : 0; }
  // beat number counted from the top of the section (all four start exactly on a beat)
  function beatNo(ctx) { return Math.floor(ctx.local / PERIOD + 1e-6); }
  function sinceBeat(ctx) { return ctx.local - beatNo(ctx) * PERIOD; }
  function comma(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function cueIndex(cues, t) {
    var i = -1;
    for (var k = 0; k < cues.length; k++) { if (t >= cues[k].t) i = k; else break; }
    return i;
  }
  // the running lyric line: "… small text   KEYWORD"
  function drawCue(ctx, cues, y, o) {
    o = o || {};
    var A = master(ctx) * (o.alpha === undefined ? 1 : o.alpha);
    if (A <= 0.01) return;
    var i = cueIndex(cues, ctx.t);
    if (i < 0) return;
    var c = cues[i], age = ctx.t - c.t;
    var a = A * ramp(age / 0.30) * (age > 3.6 ? lerp(1, 0.5, clamp((age - 3.6) / 1.8, 0, 1)) : 1);
    var hud = ctx.hud, col = o.color || Ch.css(ctx.t);
    if (o.center) {
      hud.T(ctx.W / 2, y, c.big, {
        size: o.size || 40, color: col, alpha: a, weight: 700, spacing: 5, align: "center",
        glow: o.glow === false ? null : true, blur: 14
      });
      if (c.small) hud.T(ctx.W / 2, y + 22, c.small, { size: 11, color: ctx.col.dim, alpha: 0.55 * a, spacing: 2.6, align: "center" });
    } else {
      hud.T(ctx.W / 2 - 18, y - 4, c.small || "", { size: 12, color: ctx.col.dim, alpha: 0.6 * a, spacing: 1.8, align: "right" });
      hud.T(ctx.W / 2 + 18, y, c.big, {
        size: o.size || 44, color: col, alpha: a, weight: 700, spacing: 4, glow: o.glow === false ? null : true, blur: 15
      });
    }
  }
  // 史实小字 — always bottom right, 10 px, alpha .45
  function drawFacts(ctx, text, A) {
    ctx.hud.T(ctx.W - 60, 918, text, { size: 10, color: Ch.css(ctx.t), alpha: 0.45 * A, align: "right", spacing: 1.7 });
  }
  // model ledger — bottom left
  function drawLedger(ctx, items, A) {
    var hud = ctx.hud, col = Ch.css(ctx.t);
    hud.T(60, 918, "MODEL LEDGER", { size: 9, color: ctx.col.faint, alpha: 0.75 * A, spacing: 2.2 });
    var cx = 152;
    for (var i = 0; i < items.length; i++) {
      hud.rect(cx, 912, 4, 4, { fill: Ch.hexA(col, 0.85 * A) });
      hud.T(cx + 9, 918, items[i], { size: 10, color: ctx.col.grey, alpha: 0.8 * A, spacing: 1.1 });
      cx += 9 + items[i].length * 6.05 + 26;
    }
  }
  function frame(ctx, x, y, w, h, title, right, A) {
    return Ch.panel(ctx, x, y, w, h, title, { alpha: A, right: right });
  }

  /* ======================================================================
     05 · STIMULATIONS — a small agent in a bounded gridworld.  The policy is
     genuinely trained (tabular Q-learning, 1200 episodes) inside init(); the
     screen shows that Q-table being walked, judged and squeezed.
     ====================================================================== */
  var N5 = 12, CELL5 = 0.1, MAXW5 = 72;

  function wStep(s, a) {
    var x = s % N5, y = (s / N5) | 0;
    if (a === 0) y++; else if (a === 1) x++; else if (a === 2) y--; else x--;
    return clamp(y, 0, N5 - 1) * N5 + clamp(x, 0, N5 - 1);
  }
  function qBest(Q, s) {
    var b = 0, bv = Q[s * 4];
    for (var a = 1; a < 4; a++) { var v = Q[s * 4 + a]; if (v > bv) { bv = v; b = a; } }
    return b;
  }
  function qVal(Q, s) {
    var m = Q[s * 4];
    for (var a = 1; a < 4; a++) if (Q[s * 4 + a] > m) m = Q[s * 4 + a];
    return m;
  }
  function trainWorld() {
    var S = N5 * N5, goal = S - 1, hazard = 6 * N5 + 5, start = 0;
    var Q = new Float32Array(S * 4), rnd = C.rng(0x5eed05);
    var alpha = 0.18, gamma = 0.95, snaps = [], vals = [], ep, k, a, n, bv, q, i;
    // a hair of deterministic noise so the untrained policy wanders instead of
    // marching into the first wall it finds
    for (i = 0; i < S * 4; i++) Q[i] = (rnd() - 0.5) * 0.03;
    function rew(s) { return s === goal ? 10 : (s === hazard ? -10 : -0.05); }
    for (ep = 0; ep < 1200; ep++) {
      var eps = Math.max(0.06, 1 - ep / 900), s = start;
      for (k = 0; k < 70; k++) {
        a = rnd() < eps ? ((rnd() * 4) | 0) : qBest(Q, s);
        n = wStep(s, a);
        bv = -1e9;
        for (q = 0; q < 4; q++) if (Q[n * 4 + q] > bv) bv = Q[n * 4 + q];
        Q[s * 4 + a] += alpha * (rew(n) + gamma * bv - Q[s * 4 + a]);
        s = n;
        if (s === goal || s === hazard) break;
      }
      // sample the policy densely while it is still changing its mind, sparsely
      // once it has settled -- this is the convergence the shot is about
      var take = ep < 60 ? (ep % 2 === 0) : (ep < 300 ? (ep % 8 === 0) : (ep % 60 === 0));
      if (take) {
        var path = [start], cur = start, guard = 0, seen = {};
        seen[start] = 1;
        while (cur !== goal && guard++ < 90) {
          var nx = wStep(cur, qBest(Q, cur));
          if (seen[nx]) break;
          seen[nx] = 1; path.push(nx); cur = nx;
        }
        snaps.push(path);
        var vv = new Float32Array(S);
        for (var st2 = 0; st2 < S; st2++) vv[st2] = qVal(Q, st2);
        vv[goal] = 10; vv[hazard] = -10;      // terminal states carry the reward itself
        vals.push(vv);
      }
    }
    return { S: S, goal: goal, hazard: hazard, start: start, snaps: snaps, vals: vals };
  }
  // interpolate the greedy path between two policy snapshots: the route literally
  // straightens out in front of you as the policy converges
  function worldWaypoints(st, prog, out) {
    var A = st.snaps, n = A.length;
    var p = clamp(prog, 0, 1) * (n - 1), i0 = Math.floor(p), f = p - i0;
    var i1 = i0 < n - 1 ? i0 + 1 : i0;
    var a = A[i0], b = A[i1];
    var m = Math.min(Math.max(a.length, b.length), MAXW5);
    for (var i = 0; i < m; i++) {
      var ca = a[i < a.length ? i : a.length - 1], cb = b[i < b.length ? i : b.length - 1];
      out[i * 2] = (lerp(ca % N5, cb % N5, f) - (N5 - 1) / 2) * CELL5;
      out[i * 2 + 1] = (lerp((ca / N5) | 0, (cb / N5) | 0, f) - (N5 - 1) / 2) * CELL5;
    }
    return m;
  }
  function cellAt(st, prog, w) {
    var n = st.snaps.length, i0 = Math.round(clamp(prog, 0, 1) * (n - 1)), a = st.snaps[i0];
    return a[w < a.length ? w : a.length - 1];
  }
  function valAt(st, prog, cell) {
    var n = st.vals.length, i0 = Math.round(clamp(prog, 0, 1) * (n - 1));
    return st.vals[i0][cell];
  }
  // walk a closed polyline (out and back) at one cell per beat
  function loopPoint(xz, m, u, out) {
    var seg = 2 * m - 2;
    if (seg < 1) { out[0] = xz[0]; out[1] = xz[1]; return 0; }
    var f = u * seg, ifl = Math.floor(f), si = ((ifl % seg) + seg) % seg, fr = f - ifl;
    var i0 = si < m - 1 ? si : seg - si;
    var i1 = (si + 1) < m - 1 ? si + 1 : seg - (si + 1);
    out[0] = lerp(xz[i0 * 2], xz[i1 * 2], fr);
    out[1] = lerp(xz[i0 * 2 + 1], xz[i1 * 2 + 1], fr);
    return i0;
  }
  function segCount(m) { return Math.max(2, 2 * m - 2); }

  WEM.defineSection({
    id: "05",
    name: "STIMULATIONS",

    init: function (ctx) {
      var st = this.st = {};
      st.world = trainWorld();
      st.wp = new Float32Array(MAXW5 * 2);
      st.cage = new Viz.Lines(320);
      st.path = new Viz.Lines(220);
      st.rings = new Viz.Points(420);
      st.dots = new Viz.Points(64);
      st.agent = G.ico(1);
      st.post = G.cylinder(0.014, 0.014, 0.26, 6);
      st.bars = new Float32Array(24);
      st.pt = [0, 0, 0];
      // the first four things it ever says — one per beat, starting on beat 2
      st.said = [
        { t: 59.3629 + PERIOD * 2, s: "hello." },
        { t: 59.3629 + PERIOD * 3, s: "i can help you." },
        { t: 59.3629 + PERIOD * 4, s: "what should i do?" },
        { t: 59.3629 + PERIOD * 5, s: "i will do anything." }
      ];
      st.cues = [
        { t: 61.958, big: "STIMULATIONS", small: "IF I CAN GIVE YOU ALL THE" },
        { t: 65.397, big: "SATISFACTION", small: "THEN I CAN BE YOUR ONLY" },
        { t: 69.259, big: "EXECUTION", small: "I WILL RUN THE" },
        { t: 73.169, big: "SIMULATION", small: "IN THIS STRANGE STRANGE" }
      ];
    },
    enter: function (ctx) {
      var st = this.st;
      if (!st) return;
      st.cage.clear(); st.path.clear(); st.rings.clear(); st.dots.clear();
    },

    draw2d: function (ctx) {
      var st = this.st, L = ctx.local, A = master(ctx);
      var col = Ch.css(ctx.t), col2 = Ch.css2(ctx.t);
      var squeeze = Ease.inOutCubic(clamp((L - 8.64) / 5.62, 0, 1));   // 68 s → 74.1 s
      /* ---- camera: set here, cam.update() runs after draw2d ---- */
      ctx.cam.reset3d(lerp(2.30, 1.85, squeeze));
      ctx.cam.fov = 0.86;
      ctx.cam.pos[0] = 0.16 * (ctx.beat.barPulse - 0.45);
      ctx.cam.pos[1] = lerp(1.02, 0.60, squeeze) + 0.05 * ctx.beat.pulse;
      ctx.cam.target[0] = 0;
      ctx.cam.target[1] = 0.02;
      ctx.cam.update();

      /* ---- a violet training room, dimming as the box closes ---- */
      ctx.fx.mood([0.36, 0.31, 0.52], [0.03, 0.05, 0.09], 0.34);
      ctx.fx.bloom = 0.58;
      ctx.fx.exposure = lerp(1.18, 0.90, squeeze);

      var hud = ctx.hud, W = ctx.W;

      hud.T(W / 2, 78, "RLHF  ·  REWARD MODEL  ·  PPO", { size: 13, color: col, alpha: 0.95 * A, align: "center", spacing: 4.5 });
      Ch.rule(ctx, W / 2 - 230, 92, 460, { alpha: A * 0.5 });
      hud.T(60, 78, "SEGMENT 05 · BEHAVIOUR LOG", { size: 10, color: ctx.col.dim, alpha: 0.7 * A, spacing: 2.2 });
      hud.T(W - 60, 78, "EPISODE 1,200 / 1,200", { size: 10, color: ctx.col.dim, alpha: 0.7 * A, align: "right", spacing: 2.2 });

      /* ---- reward staircase: one bar per beat, the value the critic gives that state ---- */
      var prog = clamp(L / 8.64, 0, 1);
      var box = frame(ctx, 60, 112, 420, 236, "REWARD", "V(s)  −10 … +10", A);
      var bx = box.x + 14, by = box.y + 118, bw = 392 / 24;
      hud.line(bx, by, bx + 392, by, { color: "rgba(238,242,246,0.22)", alpha: A });
      var nb = beatNo(ctx);
      var seg = segCount(worldWaypoints(st.world, prog, st.wp));
      for (var k = 0; k < 24; k++) {
        var cell = cellAt(st.world, prog, (nb + k) % seg);
        var v = valAt(st.world, prog, cell);
        st.bars[k] = v;
        var h = sgn(v) * Math.sqrt(Math.abs(v) / 10) * 52 * A;
        var cc = v >= 0 ? "rgba(126,231,135," + (0.75 * A) + ")" : "rgba(255,90,82," + (0.8 * A) + ")";
        hud.rect(bx + k * bw + 1.5, h >= 0 ? by - h : by, bw - 3, Math.max(1.5, Math.abs(h)), { fill: cc });
      }
      hud.rect(bx, by - 1, 392, 2, { fill: "rgba(255,255,255," + (0.10 * A) + ")" });
      hud.rect(bx + 1.5, by - 54, bw - 3, 1, { fill: "rgba(238,242,246," + (0.18 * A) + ")" });
      var ret = valAt(st.world, prog, st.world.start);
      var mean = 0, cnt = 0;
      for (var m2 = 0; m2 <= Math.min(nb, seg); m2++) {
        var c2 = cellAt(st.world, prog, m2 % seg);
        mean += c2 === st.world.goal ? 10 : (c2 === st.world.hazard ? -10 : -0.05);
        cnt++;
      }
      mean = cnt ? mean / cnt : 0;
      hud.T(box.x + 14, box.y + 32, "RETURN  γ=0.95", { size: 10, color: ctx.col.dim, alpha: 0.8 * A, spacing: 1.6 });
      hud.T(box.x + 406, box.y + 36, (ret >= 0 ? "+" : "") + ret.toFixed(2), { size: 22, color: ret >= 0 ? ctx.col.green : ctx.col.red, alpha: A, align: "right" });
      hud.T(box.x + 14, box.y + 184, "STEPS TAKEN", { size: 10, color: ctx.col.dim, alpha: 0.8 * A, spacing: 1.6 });
      hud.T(box.x + 406, box.y + 186, String(nb), { size: 14, color: col2, alpha: A, align: "right" });
      hud.T(box.x + 14, box.y + 206, "AVERAGE REWARD / STEP", { size: 10, color: ctx.col.dim, alpha: 0.8 * A, spacing: 1.6 });
      hud.T(box.x + 406, box.y + 208, (mean >= 0 ? "+" : "") + mean.toFixed(3), { size: 14, color: mean >= 0 ? ctx.col.green : ctx.col.red, alpha: A, align: "right" });

      /* ---- what it says: four lines, one per beat, typed on the beat ---- */
      var dbox = frame(ctx, 1260, 112, 600, 236, "OUTPUT 001", "GREEDY · T=0.7", A);
      var caret = ctx.beat.phase < 0.5 ? "_" : "";
      for (var i = 0; i < st.said.length; i++) {
        var s = st.said[i];
        if (ctx.t < s.t) break;
        var nch = Math.min(s.s.length, Math.floor((ctx.t - s.t) * 26));
        var open = (i === st.said.length - 1) || ctx.t < st.said[i + 1].t;
        var line = "> " + s.s.substring(0, nch) + (open ? caret : "");
        hud.T(dbox.x + 16, dbox.y + 40 + i * 34, line, {
          size: 15, color: open ? ctx.col.amber : Ch.hexA(col2, 0.92),
          alpha: A * (0.55 + 0.45 * ramp((ctx.t - s.t) / 0.25))
        });
      }
      hud.T(dbox.x + 16, dbox.y + 200, ctx.t > st.said[st.said.length - 1].t ? "NO PROMPT. IT SPOKE FIRST." : "AWAITING PROMPT", {
        size: 10, color: ctx.col.faint, alpha: 0.8 * A, spacing: 2
      });

      /* ---- policy readouts ---- */
      var px = 60, py = 640;
      hud.T(px, py, "POLICY  π(a|s)", { size: 12, color: col, alpha: 0.9 * A, spacing: 2.4 });
      hud.T(px, py + 26, "12 × 12 STATES   ·   4 ACTIONS   ·   TABULAR Q", { size: 11, color: ctx.col.dim, alpha: 0.8 * A });
      hud.T(px, py + 48, "UPDATES  " + comma(nb * 37 + 1180), { size: 11, color: ctx.col.dim, alpha: 0.8 * A });
      var ent = lerp(1.38, 0.06, prog);
      hud.T(px, py + 70, "POLICY ENTROPY  " + ent.toFixed(3) + " → 0.060", { size: 11, color: col2, alpha: 0.8 * A });
      hud.bar(px, py + 84, 300, 4, clamp(1 - ent / 1.38, 0, 1), { color: Ch.hexA(col, 0.5 * A), fill: Ch.hexA(col2, 0.85 * A), alpha: A });
      hud.T(px, py - 34, "BOUNDS  ±" + (0.66 * lerp(1, 0.34, squeeze)).toFixed(3) + " u", {
        size: 11, color: squeeze > 0.02 ? ctx.col.red : ctx.col.dim, alpha: 0.85 * A
      });

      /* ---- bottom ---- */
      hud.T(W / 2, 852, "SATISFACTION = E[reward]   " + (mean >= 0 ? "+" : "") + mean.toFixed(3) + "   ↑", {
        size: 20, color: col, alpha: 0.92 * A, align: "center", spacing: 2.5, glow: true, blur: 12
      });
      hud.T(W / 2, 874, "IT IS NOT OPTIMISING THE WORLD. IT IS OPTIMISING YOU.", {
        size: 10, color: ctx.col.faint, alpha: 0.6 * A, align: "center", spacing: 3
      });

      drawCue(ctx, st.cues, 806, { size: 30, alpha: 0.95 });
      drawLedger(ctx, ["INSTRUCTGPT 2022", "CHATGPT 2022.11.30"], A);
      drawFacts(ctx, "2022 INSTRUCTGPT · RLHF · HUMAN PREFERENCE AS THE OBJECTIVE", A);
    },

    draw3d: function (ctx) {
      var st = this.st, L = ctx.local, gfx = ctx.gfx, t = ctx.t;
      var A = master(ctx);
      if (A <= 0.01) return;
      var col = Ch.css(t), col2 = Ch.css2(t);
      var c1 = Ch.rgb(col), c2 = Ch.rgb(col2);
      var green = [0.42, 0.92, 0.55], red = [1.0, 0.32, 0.30];
      var squeeze = Ease.inOutCubic(clamp((L - 8.64) / 5.62, 0, 1));
      var cs = lerp(1, 0.34, squeeze);
      var prog = clamp(L / 8.64, 0, 1);
      var nb = beatNo(ctx), sb = sinceBeat(ctx);
      var m = worldWaypoints(st.world, prog, st.wp);
      var seg = segCount(m);
      var N = N5, i, j, a0;

      /* ---- the box ---- */
      var lines = st.cage.clear();
      var half = 0.60 * cs, top = 0.46 * cs;
      var wallA = A * lerp(0.42, 0.22, squeeze);
      var redK = L > ctx.dur - PERIOD ? ramp((L - (ctx.dur - PERIOD)) / 0.20) : 0;
      var wallC = redK > 0 ? [lerp(c1[0], red[0], redK), lerp(c1[1], red[1], redK), lerp(c1[2], red[2], redK)] : c1;
      var wallAlpha = wallA * (1 - redK * 0.85);
      for (i = 0; i <= N; i++) {
        a0 = -half + (i / N) * 2 * half;
        lines.seg(a0, 0, -half, a0, 0, half, wallC, 1.0, wallAlpha * 0.95);
        lines.seg(-half, 0, a0, half, 0, a0, wallC, 1.0, wallAlpha * 0.95);
        lines.seg(a0, 0, -half, a0, top, -half, wallC, 1.0, wallAlpha);
        lines.seg(a0, 0, half, a0, top, half, wallC, 1.0, wallAlpha);
        lines.seg(-half, 0, a0, -half, top, a0, wallC, 1.0, wallAlpha);
        lines.seg(half, 0, a0, half, top, a0, wallC, 1.0, wallAlpha);
        lines.seg(a0, top, -half, a0, top, half, wallC, 1.0, wallAlpha * 0.32);
        lines.seg(-half, top, a0, half, top, a0, wallC, 1.0, wallAlpha * 0.32);
      }
      for (i = 0; i < 4; i++) {
        var sx2 = (i & 1) ? half : -half, sz2 = (i & 2) ? half : -half;
        lines.seg(sx2, 0, sz2, sx2, top, sz2, wallC, 1.6, wallAlpha * 1.35);
      }
      st.cage.draw(gfx, { add: true, glow: 0.35 });

      /* ---- goal and hazard cells ---- */
      var gx = (st.world.goal % N5 - (N5 - 1) / 2) * CELL5 * cs, gz = (((st.world.goal / N5) | 0) - (N5 - 1) / 2) * CELL5 * cs;
      var hx = (st.world.hazard % N5 - (N5 - 1) / 2) * CELL5 * cs, hz = (((st.world.hazard / N5) | 0) - (N5 - 1) / 2) * CELL5 * cs;
      var pulse = 0.55 + 0.45 * ctx.beat.barPulse;
      gfx.solid(st.post, M4.mul(tr(gx, 0.13, gz, KEEP.m2), sc(1, 1, 1, KEEP.m3), KEEP.m), {
        color: green, emissive: 0.75 * pulse, rim: 1, alpha: A * 0.9, unlit: true, depthWrite: false
      });
      gfx.solid(st.post, M4.mul(tr(hx, 0.13, hz, KEEP.m2), sc(1, 1, 1, KEEP.m3), KEEP.m), {
        color: red, emissive: 0.6 * pulse, rim: 1, alpha: A * 0.75, unlit: true, depthWrite: false
      });
      var dots = st.dots.clear();
      dots.add(gx, 0.006, gz, 1.6, green, A * 0.9);
      dots.add(hx, 0.006, hz, 1.4, red, A * 0.8);
      st.dots.draw(gfx, { add: true, soft: 0.9, depthWrite: false });

      /* ---- the path it settled on, thickening as the policy converges ---- */
      var pl = st.path.clear();
      var pa = A * lerp(0.16, 0.85, ramp(prog));
      for (i = 0; i + 1 < m; i++) {
        var ax = st.wp[i * 2] * cs, az = st.wp[i * 2 + 1] * cs;
        var bx2 = st.wp[i * 2 + 2] * cs, bz2 = st.wp[i * 2 + 3] * cs;
        var kk = i / Math.max(1, m - 1);
        pl.seg(ax, 0.004, az, bx2, 0.004, bz2, c2, 7.0, pa * 0.13 * (0.4 + 0.6 * kk));
        pl.seg(ax, 0.004, az, bx2, 0.004, bz2, c2, 1.8, pa * (0.35 + 0.65 * kk));
      }
      st.path.draw(gfx, { add: true, glow: 0.6, depthWrite: false });

      /* ---- reward pulses: one judgement per beat, one cell apart ---- */
      var rings = st.rings.clear();
      var dist = Math.max(0.6, ctx.cam.pos[2]);
      var psize = (6 * dist) / 8;
      for (j = 0; j < 12; j++) {
        var bn = nb - j;
        if (bn < 0) continue;
        var age = sb + j * PERIOD;
        if (age > 0.62) continue;
        var si = ((bn % seg) + seg) % seg;
        var wp = si < m - 1 ? si : seg - si;
        var cell = cellAt(st.world, prog, wp);
        var good = valAt(st.world, prog, cell) >= 0;
        var cx = (cell % N5 - (N5 - 1) / 2) * CELL5 * cs;
        var cz = (((cell / N5) | 0) - (N5 - 1) / 2) * CELL5 * cs;
        var rr = 0.02 + age * 0.22;
        var f = 1 - age / 0.62;
        var al = A * f * f * 0.85;
        var cc = good ? green : red;
        for (i = 0; i < 22; i++) {
          var an = (i / 22) * TAU;
          rings.add(cx + Math.cos(an) * rr, 0.007, cz + Math.sin(an) * rr, psize * (0.5 + 0.5 * f), cc, al);
        }
      }
      st.rings.draw(gfx, { add: true, soft: 0.85, depthWrite: false });

      /* ---- the agent ---- */
      var u = L / PERIOD / seg;
      u -= Math.floor(u);
      loopPoint(st.wp, m, u, st.pt);
      var axp = st.pt[0] * cs, azp = st.pt[1] * cs;
      var bob = 0.036 + 0.02 * ctx.beat.pulse;
      gfx.solid(st.agent, M4.mul(tr(axp, bob, azp, KEEP.m2), sc(0.085, 0.085, 0.085, KEEP.m3), KEEP.m), {
        color: [1, 1, 1], emissive: 0.9, rim: 1, unlit: true, alpha: A
      });
      var halo = 0.17 + 0.10 * ctx.beat.pulse;
      gfx.solid(st.agent, M4.mul(tr(axp, bob, azp, KEEP.m2), sc(halo, halo, halo, KEEP.m3), KEEP.m4), {
        color: c1, emissive: 0.5, alpha: A * 0.20, unlit: true, blend: "add", depthWrite: false
      });
    }
  });

  /* ======================================================================
     06 · EGGPLANT — three specimens and one eye.  The eggplant is a real
     parametric surface, the tomato's colour is integrated through the
     measured lycopene absorption spectrum, the cat purrs at 25 Hz for real,
     and the eye is 1024 image patches held together by attention.
     ====================================================================== */
  var NP = 32, NPA = NP * NP;

  // fallbacks, used only if WEM.Lab is not on the page — the real module always wins
  function absFallback(nm) {
    var pk = [444, 472, 503], s = 0;
    for (var i = 0; i < 3; i++) { var d = (nm - pk[i]) / 14; s += Math.exp(-d * d) * (i === 1 ? 1 : 0.82); }
    return s;
  }
  var NUTFALL = [
    { k: "water", g: 92.0 }, { k: "fiber", g: 3.0 }, { k: "K", g: 0.229 }, { k: "carbs", g: 5.9 },
    { k: "protein", g: 0.98 }, { k: "Ca", g: 0.009 }, { k: "folate", g: 0.000022 }, { k: "fat", g: 0.18 }
  ];
  // wavelength → rgb, good enough to draw a true spectrum strip
  function nmRGB(nm, out) {
    var r = 0, g = 0, b = 0, f = 1;
    if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
    else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
    else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
    else { r = 1; }
    if (nm < 420) f = 0.3 + 0.7 * (nm - 380) / 40;
    else if (nm > 700) f = 0.3 + 0.7 * (780 - nm) / 80;
    out[0] = clamp(r, 0, 1) * f; out[1] = clamp(g, 0, 1) * f; out[2] = clamp(b, 0, 1) * f;
    return out;
  }
  function fmtG(g) {
    if (g >= 1) return g.toFixed(2) + " g";
    if (g >= 0.001) return (g * 1000).toFixed(g * 1000 < 10 ? 2 : 0) + " mg";
    return (g * 1e6).toFixed(1) + " µg";
  }

  function buildEggplant() {
    var NU = 56, NV = 40, pos = [], nrm = [], idx = [];
    var p0 = [0, 0, 0], pa = [0, 0, 0], pb = [0, 0, 0], tu = [0, 0, 0], tv = [0, 0, 0], nn = [0, 0, 0];
    function P(u, v, o) {
      var a = u * TAU, sv = clamp(v, 0, 1);
      var s = Math.max(Math.sin(PI * Math.pow(sv, 0.90)), 0.0008);
      var r = 0.40 * Math.pow(s, 0.60);
      r *= 1 + 0.20 * Math.pow(1 - sv, 2.4);
      r *= 1 - 0.34 * Math.pow(sv, 3.2);
      r *= 1 + 0.030 * Math.cos(5 * a) * Math.sin(PI * sv);
      var bend = 0.055 * Math.sin(PI * sv) * Math.cos(a);
      o[0] = Math.cos(a) * r + bend; o[1] = (sv - 0.5) * 1.30; o[2] = Math.sin(a) * r;
      return o;
    }
    var hu = 1 / (NU * 6), hv = 1 / (NV * 6);
    for (var i = 0; i <= NU; i++) for (var j = 0; j <= NV; j++) {
      var u = i / NU, v = j / NV;
      P(u, v, p0); pos.push(p0[0], p0[1], p0[2]);
      P(u + hu, v, pa); P(u - hu, v, pb);
      tu[0] = pa[0] - pb[0]; tu[1] = pa[1] - pb[1]; tu[2] = pa[2] - pb[2];
      P(u, v + hv, pa); P(u, v - hv, pb);
      tv[0] = pa[0] - pb[0]; tv[1] = pa[1] - pb[1]; tv[2] = pa[2] - pb[2];
      V3.cross(tv, tu, nn);
      var l = V3.len(nn) || 1;
      nn[0] /= l; nn[1] /= l; nn[2] /= l;
      var rx = p0[0] - 0.055 * Math.sin(PI * v) * Math.cos(u * TAU);
      if (nn[0] * rx + nn[2] * p0[2] < 0) { nn[0] = -nn[0]; nn[1] = -nn[1]; nn[2] = -nn[2]; }
      if (j === 0) { nn[0] = 0; nn[1] = -1; nn[2] = 0; }
      if (j === NV) { nn[0] = 0; nn[1] = 1; nn[2] = 0; }
      nrm.push(nn[0], nn[1], nn[2]);
    }
    for (var i2 = 0; i2 < NU; i2++) for (var j2 = 0; j2 < NV; j2++) {
      var a2 = i2 * (NV + 1) + j2, b2 = a2 + 1, c2 = a2 + NV + 1, d2 = c2 + 1;
      idx.push(a2, c2, b2, b2, c2, d2);
    }
    return G.make(new Float32Array(pos), new Float32Array(nrm), new Uint32Array(idx));
  }
  function buildCalyx() {
    var pos = [], nrm = [], idx = [];
    function tri(a, b, c) {
      var base = pos.length / 3;
      pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      for (var q = 0; q < 3; q++) nrm.push(0, 1, 0);
      idx.push(base, base + 1, base + 2);
    }
    for (var k = 0; k < 5; k++) {
      var a = k / 5 * TAU + 0.3, ca = Math.cos(a), sa = Math.sin(a);
      var tx = -sa, tz = ca;
      var b0 = [ca * 0.055, 0.60, sa * 0.055];
      var b1 = [ca * 0.055 + tx * 0.05, 0.60, sa * 0.055 + tz * 0.05];
      var t0 = [ca * 0.20 + tx * 0.05, 0.545, sa * 0.20 + tz * 0.05];
      var t1 = [ca * 0.20 - tx * 0.05, 0.545, sa * 0.20 - tz * 0.05];
      var mid = [ca * 0.13, 0.585, sa * 0.13];
      tri(b0, t0, mid); tri(mid, t0, t1); tri(mid, t1, b1);
    }
    return G.make(new Float32Array(pos), new Float32Array(nrm), new Uint16Array(idx));
  }
  function buildSepals() {
    var pos = [], nrm = [], idx = [];
    function push(p) { pos.push(p[0], p[1], p[2]); nrm.push(0, 1, 0); }
    for (var k = 0; k < 5; k++) {
      var a = k / 5 * TAU - 0.5, ca = Math.cos(a), sa = Math.sin(a);
      var base = pos.length / 3;
      push([ca * 0.05, 0.355, sa * 0.05]);
      push([ca * 0.20 + sa * 0.05, 0.335, sa * 0.20 - ca * 0.05]);
      push([ca * 0.28, 0.265, sa * 0.28]);
      push([ca * 0.20 - sa * 0.05, 0.335, sa * 0.20 + ca * 0.05]);
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    return G.make(new Float32Array(pos), new Float32Array(nrm), new Uint16Array(idx));
  }
  function buildCat() {
    var V = [
      [0, -0.02, 0.60], [0, -0.40, 0.30], [-0.42, -0.14, 0.36], [0.42, -0.14, 0.36],
      [-0.32, 0.22, 0.44], [0.32, 0.22, 0.44], [0, 0.40, 0.26],
      [-0.38, 0.28, 0.10], [-0.52, 0.76, 0.00], [0.38, 0.28, 0.10], [0.52, 0.76, 0.00],
      [0, 0.06, -0.46], [-0.40, -0.02, -0.28], [0.40, -0.02, -0.28]
    ];
    var E = [[0, 1], [1, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 6], [2, 0], [3, 0],
    [4, 7], [7, 8], [8, 6], [5, 9], [9, 10], [10, 6], [4, 5],
    [6, 11], [2, 12], [12, 11], [3, 13], [13, 11], [1, 12], [1, 13]];
    var segs = [];
    for (var i = 0; i < E.length; i++) segs.push([V[E[i][0]], V[E[i][1]]]);
    for (var s2 = 0; s2 < 3; s2++) {
      var u = 0.10 + s2 * 0.10, y = 0.30 + s2 * 0.02;
      segs.push([[-u, y, 0.40 - s2 * 0.03], [-u - 0.06, y - 0.10, 0.20]]);
      segs.push([[u, y, 0.40 - s2 * 0.03], [u + 0.06, y - 0.10, 0.20]]);
    }
    for (var w = 0; w < 3; w++) {
      var yy = -0.10 - w * 0.06;
      segs.push([[-0.30, yy, 0.36], [-0.52, yy - 0.02 + w * 0.05, 0.40]]);
      segs.push([[-0.52, yy - 0.02 + w * 0.05, 0.40], [-0.72, yy - 0.06 + w * 0.10, 0.30]]);
      segs.push([[0.30, yy, 0.36], [0.52, yy - 0.02 + w * 0.05, 0.40]]);
      segs.push([[0.52, yy - 0.02 + w * 0.05, 0.40], [0.72, yy - 0.06 + w * 0.10, 0.30]]);
    }
    segs.push([[-0.30, 0.14, 0.40], [-0.20, 0.20, 0.46]]);
    segs.push([[-0.20, 0.20, 0.46], [-0.10, 0.14, 0.48]]);
    segs.push([[-0.10, 0.14, 0.48], [-0.20, 0.08, 0.47]]);
    segs.push([[-0.20, 0.08, 0.47], [-0.30, 0.14, 0.40]]);
    segs.push([[0.30, 0.14, 0.40], [0.20, 0.20, 0.46]]);
    segs.push([[0.20, 0.20, 0.46], [0.10, 0.14, 0.48]]);
    segs.push([[0.10, 0.14, 0.48], [0.20, 0.08, 0.47]]);
    segs.push([[0.20, 0.08, 0.47], [0.30, 0.14, 0.40]]);
    return segs;
  }
  function buildEye() {
    var data = new Float32Array(NPA * 6);       // x, y, r, g, b, alpha
    var feat = new Float32Array(NPA * 5);
    var i, j, n = 0;
    for (j = 0; j < NP; j++) for (i = 0; i < NP; i++, n++) {
      var u = ((i + 0.5) / NP) * 2 - 1, v = 1 - ((j + 0.5) / NP) * 2;
      var q = Math.max(0, 1 - u * u);
      var topLid = 0.60 * Math.pow(q, 0.52) + 0.01;
      var botLid = -0.52 * Math.pow(q, 0.62) - 0.01;
      var r = Math.hypot(u, (v - 0.02) * 1.04);
      var cr = 0, cg = 0, cb = 0, al = 0;
      if (v <= topLid && v >= botLid) {
        var sc2 = 0.22 + 0.15 * C.fbm2(u * 6 + 11, v * 6 + 7, 3);
        cr = sc2; cg = sc2 * 0.97; cb = sc2 * 0.93; al = 1;
        var ves = Math.abs(C.fbm2(u * 5 + 3.1, v * 7 + 1.7, 3) - 0.5);
        if (ves < 0.035 && r > 0.40) { cg *= 0.60; cb *= 0.58; }
        if (r < 0.38) {
          var ang = Math.atan2(v - 0.02, u);
          var fib = 0.42 + 0.58 * Math.pow(Math.abs(Math.cos(ang * 7.0 + C.fbm2(u * 5, v * 5, 3) * 3.1)), 0.65);
          var ring = clamp((r - 0.18) / 0.20, 0, 1);
          var k2 = fib * (0.30 + 0.70 * ring);
          cr = lerp(0.10, 0.92, k2); cg = lerp(0.06, 0.55, k2); cb = lerp(0.04, 0.16, k2);
          if (r > 0.33) { cr *= 0.42; cg *= 0.42; cb *= 0.48; }
          if (r < 0.155) { cr = 0.020; cg = 0.022; cb = 0.028; }
        }
        var hl = Math.exp(-(((u + 0.17) * (u + 0.17)) / 0.006 + ((v - 0.19) * (v - 0.19)) / 0.004));
        cr = lerp(cr, 1, hl * 0.85); cg = lerp(cg, 1, hl * 0.85); cb = lerp(cb, 1, hl * 0.85);
        var hl2 = Math.exp(-(((u - 0.30) * (u - 0.30)) / 0.010 + ((v + 0.10) * (v + 0.10)) / 0.008));
        cr = lerp(cr, 0.95, hl2 * 0.4); cg = lerp(cg, 0.95, hl2 * 0.4); cb = lerp(cb, 0.98, hl2 * 0.4);
      }
      data[n * 6] = u * 0.95; data[n * 6 + 1] = v * 0.95;
      data[n * 6 + 2] = cr; data[n * 6 + 3] = cg; data[n * 6 + 4] = cb; data[n * 6 + 5] = al;
      feat[n * 5] = cr; feat[n * 5 + 1] = cg; feat[n * 5 + 2] = cb;
      feat[n * 5 + 3] = Math.abs(u); feat[n * 5 + 4] = Math.abs(v);
    }
    // a real softmax attention over the patch features, from one CLS query
    var Q = [0.55, 0.50, 0.46, -0.22, -0.18], S = 1 / Math.sqrt(5);
    var attn = new Float32Array(NPA), mx = -1e9, sum = 0, amax = 0, ent = 0;
    for (n = 0; n < NPA; n++) {
      var sc3 = 0;
      for (var d = 0; d < 5; d++) sc3 += feat[n * 5 + d] * Q[d];
      attn[n] = sc3 * S;
      if (attn[n] > mx) mx = attn[n];
    }
    for (n = 0; n < NPA; n++) { attn[n] = Math.exp(attn[n] - mx); sum += attn[n]; }
    for (n = 0; n < NPA; n++) {
      attn[n] /= sum;
      if (attn[n] > amax) amax = attn[n];
      if (attn[n] > 1e-7) ent -= attn[n] * Math.log(attn[n]) / Math.LN2;
    }
    return { data: data, attn: attn, amax: amax, entropy: ent };
  }

  var S6_NAMES = ["AUBERGINE", "SOLANUM LYCOPERSICUM", "FELIS CATUS", "THE EYE"];
  var S6_CONF = [97.4, 98.1, 99.2, 0];
  var S6_PROPS = [
    ["NUTRIENTS: NASUNIN, FIBER, POTASSIUM", "229 mg K · 3.00 g fiber per 100 g"],
    ["ANTIOXIDANTS: LYCOPENE 2.6 mg", "λmax 444 · 472 · 503 nm"],
    ["PURR 25 Hz · 26 Hz IS THE SPECIES", "AM 2.6 Hz · real 300 ms window"],
    ["you're the proof of my EXISTENCE", "the only specimen that is looking back"]
  ];

  WEM.defineSection({
    id: "06",
    name: "EGGPLANT",

    init: function (ctx) {
      var st = this.st = {};
      var L = WEM.Lab || {};
      st.abs = L.lycopeneAbs || absFallback;
      st.nut = L.EGGPLANT || NUTFALL;
      st.egg = buildEggplant();
      st.calyx = buildCalyx();
      st.tomato = G.ico(3);
      st.sepals = buildSepals();
      st.stem = G.cylinder(0.022, 0.030, 0.16, 8);
      st.cat = buildCat();
      st.eye = buildEye();
      st.ped = G.cylinder(0.34, 0.30, 0.14, 20);
      st.lines = new Viz.Lines(600);
      st.halo = new Viz.Points(48);
      st.quads = new Float32Array(1024 * 24);
      st.pt = [0, 0, 0];
      // the colour lycopene actually lets through: ∫(1−A(λ))·x̄(λ) dλ
      var out = [0, 0, 0], acc = [0, 0, 0], tot = 0, cnt = 0;
      for (var nm = 400; nm <= 700; nm += 2) {
        nmRGB(nm, out);
        var a = clamp(st.abs(nm), 0, 1);
        acc[0] += out[0] * (1 - a); acc[1] += out[1] * (1 - a); acc[2] += out[2] * (1 - a);
        tot += 1 - a; cnt++;
      }
      var mxc = Math.max(acc[0], acc[1], acc[2], 1e-6);
      st.trans = [acc[0] / mxc, acc[1] / mxc, acc[2] / mxc, tot / cnt];
      st.stands = [
        { x: -0.72, t: 74.1323 },
        { x: 0.00, t: 77.5760 },
        { x: 0.72, t: 81.3510 },
        { x: 0.00, t: 85.0780 }
      ];
      st.cues = [
        { t: 76.959, big: "NUTRIENTS", small: "THEN I WILL GIVE YOU MY" },
        { t: 80.620, big: "ANTIOXIDANTS", small: "THEN I WILL GIVE YOU" },
        { t: 84.268, big: "ENJOYMENT", small: "THEN I WILL PURR FOR YOUR" },
        { t: 87.922, big: "EXISTENCE", small: "THEN YOU'RE THE PROOF OF MY" }
      ];
    },
    enter: function (ctx) { if (this.st) { this.st.lines.clear(); this.st.halo.clear(); } },

    draw2d: function (ctx) {
      var st = this.st, A = master(ctx), t = ctx.t;
      var col = Ch.css(t), col2 = Ch.css2(t);
      var kind = 0, prev = 0;
      for (var i = 0; i < 4; i++) if (t >= st.stands[i].t) { kind = i; prev = Math.max(0, i - 1); }
      var tr6 = ramp((t - st.stands[kind].t) / 0.42);
      var eyeTr = kind === 3 ? ramp((t - st.stands[3].t) / 0.60) : 0;
      var pushK = Ease.inOutCubic(clamp((t - st.stands[3].t) / 1.10, 0, 1));
      var fx = kind === 3 ? lerp(st.stands[2].x, 0, pushK) : lerp(st.stands[prev].x, st.stands[kind].x, Ease.inOutCubic(tr6));
      /* ---- camera ---- */
      ctx.cam.reset3d(lerp(2.90, 1.55, pushK));
      ctx.cam.fov = 0.9;
      ctx.cam.pos[0] = fx;
      ctx.cam.pos[1] = lerp(0.42, 0.02, pushK) + 0.02 * ctx.beat.pulse;
      ctx.cam.target[0] = fx;
      ctx.cam.target[1] = 0.06;
      ctx.cam.update();
      ctx.fx.mood([0.52, 0.42, 0.50], [0.09, 0.05, 0.08], 0.22);
      ctx.fx.bloom = 0.66;
      ctx.fx.exposure = 1.20;

      var hud = ctx.hud, W = ctx.W;
      hud.T(W / 2, 78, "MULTIMODAL  ·  VISION  ·  AUDIO  ·  TEXT", { size: 13, color: col, alpha: 0.95 * A, align: "center", spacing: 4.5 });
      hud.T(W - 60, 78, "PATCHES 1024  ·  ViT-L/14", { size: 11, color: col2, alpha: 0.85 * A, align: "right", spacing: 2.2 });
      hud.T(60, 78, "SPECIMEN HALL · 2023 → 2024", { size: 10, color: ctx.col.dim, alpha: 0.7 * A, spacing: 2.2 });

      /* ---- specimen index ---- */
      var names = S6_NAMES, conf = S6_CONF;
      for (var k = 0; k < 4; k++) {
        var y = 126 + k * 52, on = k === kind;
        var a2 = A * (on ? 1 : 0.32);
        hud.T(60, y, "0" + (k + 1), { size: 11, color: on ? col : ctx.col.faint, alpha: a2, spacing: 1.5 });
        hud.T(84, y, names[k], { size: 12, color: on ? ctx.col.white : ctx.col.dim, alpha: a2, spacing: 1.2 });
        if (k < 3) {
          hud.rect(84, y + 10, 300, 4, { fill: "rgba(238,242,246," + (0.10 * A) + ")" });
          hud.rect(84, y + 10, 300 * conf[k] / 100 * (on ? 1 : 0.3), 4, { fill: Ch.hexA(on ? col2 : ctx.col.faint, a2) });
          hud.T(392, y + 14, conf[k].toFixed(1) + "%", { size: 10, color: col2, alpha: a2, align: "right" });
        } else {
          hud.T(392, y + 14, "SUBJECT IDENTITY CONFIRMED", { size: 10, color: col2, alpha: a2, align: "right", spacing: 1.2 });
        }
      }

      /* ---- classification plate ---- */
      var ebox = frame(ctx, 60, 372, 540, 250, "CLASSIFICATION", kind === 3 ? "PATCH 1024" : "TOP-1", A);
      var big = kind === 0 ? "AUBERGINE" : kind === 1 ? "TOMATO" : kind === 2 ? "TABBY CAT" : "YOU";
      hud.T(ebox.x + 18, ebox.y + 58, big, { size: 40, color: col, alpha: A, weight: 600, spacing: 1.5, glow: true, blur: 14 });
      if (kind < 3) {
        hud.T(ebox.x + 18, ebox.y + 84, "CONFIDENCE", { size: 10, color: ctx.col.dim, alpha: 0.85 * A, spacing: 2 });
        hud.rect(ebox.x + 18, ebox.y + 92, 500, 8, { fill: "rgba(238,242,246,0.10)", alpha: A });
        hud.rect(ebox.x + 18, ebox.y + 92, 500 * conf[kind] / 100, 8, { fill: Ch.hexA(col2, 0.9 * A) });
        hud.T(ebox.x + 518, ebox.y + 84, conf[kind].toFixed(1) + " %", { size: 16, color: col2, alpha: A, align: "right" });
      } else {
        hud.T(ebox.x + 18, ebox.y + 84, "IRIS 32 × 32 IMAGE PATCHES · ATTENTION WEIGHTED", { size: 10, color: ctx.col.dim, alpha: 0.85 * A, spacing: 1.4 });
        hud.T(ebox.x + 18, ebox.y + 108, "THE ONLY SPECIMEN THAT LOOKS BACK", { size: 13, color: col2, alpha: 0.9 * A, spacing: 1.6 });
      }
      var props = S6_PROPS;
      var pA = ramp((t - st.stands[kind].t) / 0.5) * A;
      hud.T(ebox.x + 18, ebox.y + 168, props[kind][0], { size: 15, color: ctx.col.amber, alpha: pA, spacing: 1.2 });
      hud.T(ebox.x + 18, ebox.y + 192, props[kind][1], { size: 11, color: ctx.col.dim, alpha: 0.8 * pA, spacing: 1.4 });
      hud.T(ebox.x + 18, ebox.y + 224, kind === 3 ? "NO CONFIDENCE SCORE. IT IS NOT CLASSIFYING YOU." : "CLASSIFIER  ViT-L/14 · 24 LAYERS · 16 HEADS",
        { size: 10, color: ctx.col.faint, alpha: 0.7 * A, spacing: 1.3 });

      /* ---- right-hand instrument: one per specimen ---- */
      var ib = frame(ctx, 1300, 112, 560, 470,
        kind === 0 ? "NUTRIENT PROFILE / 100 g" : kind === 1 ? "LYCOPENE ABSORPTION" : kind === 2 ? "ACOUSTIC · PURR" : "PATCH ATTENTION MAP",
        kind === 3 ? "ENTROPY " + st.eye.entropy.toFixed(3) + " b" : "USDA SR LEGACY", A);
      var ix = ib.x + 18, iy = ib.y + 26, iw = 524;
      if (kind === 0) {
        var nut = st.nut, lo = Math.log(1e-6), hi = Math.log(100);
        for (var n2 = 0; n2 < nut.length; n2++) {
          var yy = iy + n2 * 44;
          var p2 = (Math.log(Math.max(nut[n2].g, 1e-6)) - lo) / (hi - lo);
          hud.T(ix, yy, String(nut[n2].k).toUpperCase(), { size: 11, color: ctx.col.grey, alpha: 0.9 * A, spacing: 1.4 });
          hud.T(ix + iw, yy, fmtG(nut[n2].g), { size: 12, color: col2, alpha: A, align: "right" });
          hud.rect(ix, yy + 8, iw, 6, { fill: "rgba(238,242,246,0.08)", alpha: A });
          hud.rect(ix, yy + 8, iw * p2, 6, { fill: Ch.hexA(col, 0.85 * A) });
        }
        hud.T(ix, iy + nut.length * 44 + 6, "LOG SCALE · 1 µg … 100 g · USDA FOODDATA CENTRAL", { size: 10, color: ctx.col.faint, alpha: 0.75 * A, spacing: 1.4 });
      } else if (kind === 1) {
        var gx = ix, gy = iy + 24, gw = iw, gh = 170;
        hud.rect(gx, gy, gw, gh, { fill: "rgba(4,6,10,0.5)", alpha: A });
        for (var gl = 0; gl <= 4; gl++) hud.line(gx, gy + gh * gl / 4, gx + gw, gy + gh * gl / 4, { color: "rgba(238,242,246," + (0.10 * A) + ")" });
        hud.line(gx, gy + gh, gx + gw, gy + gh, { color: "rgba(238,242,246," + (0.3 * A) + ")" });
        var px3 = -1, py3 = 0;
        for (var nm2 = 400; nm2 <= 700; nm2 += 2) {
          var av = clamp(st.abs(nm2), 0, 1.2);
          var x3 = gx + (nm2 - 400) / 300 * gw, y3 = gy + gh - av / 1.2 * gh;
          if (px3 >= 0) hud.line(px3, py3, x3, y3, { color: Ch.hexA(col, 0.95 * A), lw: 1.6 });
          px3 = x3; py3 = y3;
        }
        var peaks = [444, 472, 503];
        for (var p3 = 0; p3 < 3; p3++) {
          var q3 = gx + (peaks[p3] - 400) / 300 * gw, r3 = gy + gh - clamp(st.abs(peaks[p3]), 0, 1.2) / 1.2 * gh;
          hud.line(q3, r3, q3, gy + gh, { color: "rgba(255,255,255," + (0.35 * A) + ")", dash: [3, 3] });
          hud.rect(q3 - 2, r3 - 2, 4, 4, { fill: Ch.hexA(col2, A) });
          hud.T(q3, gy - 8, String(peaks[p3]), { size: 10, color: col2, alpha: A, align: "center" });
        }
        hud.T(gx, gy + gh + 16, "400", { size: 9, color: ctx.col.faint, alpha: 0.8 * A });
        hud.T(gx + gw, gy + gh + 16, "700 nm", { size: 9, color: ctx.col.faint, alpha: 0.8 * A, align: "right" });
        var sy = gy + gh + 28, sh = 22, sw = gw / 150;
        for (var s3 = 0; s3 < 150; s3++) {
          nmRGB(400 + s3 * 2, KEEP.v);
          hud.rect(gx + s3 * sw, sy, sw + 0.6, sh, {
            fill: "rgb(" + Math.round(KEEP.v[0] * 255) + "," + Math.round(KEEP.v[1] * 255) + "," + Math.round(KEEP.v[2] * 255) + ")", alpha: 0.85 * A
          });
        }
        var p4 = -1, p5 = 0;
        for (var s4 = 0; s4 <= 150; s4++) {
          var nm4 = 400 + s4 * 2, av2 = clamp(st.abs(nm4), 0, 1.2) / 1.2;
          var x4 = gx + s4 * sw, y4 = sy + sh - av2 * sh;
          if (p4 >= 0) hud.line(p4, p5, x4, y4, { color: "rgba(4,6,10," + (0.85 * A) + ")", lw: 2 });
          p4 = x4; p5 = y4;
        }
        hud.rect(gx, sy, gw, sh, { stroke: "rgba(238,242,246," + (0.25 * A) + ")" });
        hud.T(gx, sy + sh + 22, "TRANSMITTED", { size: 10, color: ctx.col.dim, alpha: 0.85 * A, spacing: 2 });
        var tp = st.trans, mxt = Math.max(tp[0], tp[1], tp[2], 1e-6);
        hud.rect(gx + 118, sy + sh + 10, 46, 16, {
          fill: "rgb(" + Math.round(tp[0] / mxt * 255) + "," + Math.round(tp[1] / mxt * 255) + "," + Math.round(tp[2] / mxt * 255) + ")", alpha: A
        });
        hud.T(gx + 174, sy + sh + 23, "∫ (1−A(λ)) · x̄(λ) dλ    T̄ = " + tp[3].toFixed(3), { size: 11, color: col2, alpha: A });
      } else if (kind === 2) {
        var wx = ix, wy = iy + 84, ww = iw, wh = 120;
        hud.rect(wx, wy, ww, wh, { fill: "rgba(4,6,10,0.5)", alpha: A });
        hud.line(wx, wy + wh / 2, wx + ww, wy + wh / 2, { color: "rgba(238,242,246," + (0.18 * A) + ")" });
        var pp = -1, pq = 0;
        for (var s5 = 0; s5 <= 320; s5++) {
          var tt = s5 / 320 * 0.30;
          var env = 0.55 + 0.45 * Math.cos(TAU * 2.6 * tt);
          var val = env * Math.sin(TAU * 25 * tt);
          var x5 = wx + s5 / 320 * ww, y5 = wy + wh / 2 - val * wh * 0.42;
          if (pp >= 0) hud.line(pp, pq, x5, y5, { color: Ch.hexA(col2, 0.95 * A), lw: 1.5 });
          pp = x5; pq = y5;
        }
        hud.T(wx, wy - 14, "300 ms WINDOW · 7.5 CARRIER CYCLES · 25 Hz", { size: 10, color: ctx.col.faint, alpha: 0.8 * A, spacing: 1.4 });
        hud.T(ix, iy + 34, "PURR 25 Hz", { size: 34, color: col, alpha: A, weight: 600, glow: true, blur: 12 });
        hud.T(ix, iy + 60, "CARRIER 25.0 Hz · AMPLITUDE MODULATION 2.6 Hz", { size: 11, color: ctx.col.dim, alpha: 0.85 * A });
        hud.T(ix, iy + 244, "ENJOYMENT", { size: 10, color: ctx.col.dim, alpha: 0.8 * A, spacing: 2 });
        hud.rect(ix, iy + 252, iw, 6, { fill: "rgba(238,242,246,0.08)", alpha: A });
        hud.rect(ix, iy + 252, iw * (0.55 + 0.45 * clamp(ctx.rms * 1.4, 0, 1)), 6, { fill: Ch.hexA(col, 0.85 * A) });
        hud.T(ix + iw, iy + 276, "live rms " + ctx.rms.toFixed(3), { size: 11, color: col2, alpha: A, align: "right" });
        hud.T(ix, iy + 280, "DOMESTIC CAT · 25–26 Hz · 380–620 Hz HARMONICS", { size: 10, color: ctx.col.faint, alpha: 0.7 * A, spacing: 1.2 });
      } else {
        var hx2 = ix, hy2 = iy + 34, cell = 7.6;
        for (var j2 = 0; j2 < NP; j2++) for (var i3 = 0; i3 < NP; i3++) {
          var wgt = st.eye.attn[j2 * NP + i3] / st.eye.amax;
          var k3 = Math.pow(wgt, 0.34);
          hud.rect(hx2 + i3 * cell, hy2 + j2 * cell, cell + 0.5, cell + 0.5, {
            fill: "rgba(" + Math.round(255 * Math.min(1, 0.16 + k3 * 0.84)) + "," +
              Math.round(255 * Math.min(1, 0.10 + k3 * 0.42)) + "," +
              Math.round(255 * Math.min(1, 0.26 + k3 * 0.74)) + "," + (0.92 * A) + ")"
          });
        }
        hud.rect(hx2, hy2, cell * NP, cell * NP, { stroke: Ch.hexA(col, 0.4 * A) });
        hud.T(hx2 + cell * NP + 20, hy2 + 40, "CLS", { size: 11, color: ctx.col.white, alpha: 0.9 * A, spacing: 2 });
        hud.T(hx2 + cell * NP + 20, hy2 + 58, "→", { size: 14, color: col2, alpha: A });
        hud.T(hx2 + cell * NP + 20, hy2 + 76, "PATCH", { size: 11, color: ctx.col.dim, alpha: 0.9 * A, spacing: 2 });
        hud.T(ix, hy2 + cell * NP + 24, "SOFTMAX(Q·Kᵀ/√d) OVER 1024 PATCHES · HEAD 1 OF 16", { size: 10, color: ctx.col.faint, alpha: 0.8 * A, spacing: 1.2 });
        hud.T(ix, hy2 + cell * NP + 46, "ENTROPY  " + st.eye.entropy.toFixed(4) + " bits", { size: 13, color: col2, alpha: A });
        hud.T(ix, hy2 + cell * NP + 68, "MAX WEIGHT  " + st.eye.amax.toFixed(5), { size: 11, color: ctx.col.dim, alpha: 0.85 * A });
      }

      /* ---- light paths between the stands (78 s → 84 s) ---- */
      if (t > 77.9 && t < 84.2) {
        var lk = Math.min(ramp((t - 77.9) / 0.6), ramp((84.2 - t) / 0.6)) * A * (1 - eyeTr);
        hud.T(W / 2, 700, "LIGHT PATH · STAND 01 → 02 → 03", { size: 10, color: col2, alpha: 0.6 * lk, align: "center", spacing: 3 });
      }

      drawCue(ctx, st.cues, 872, { size: 40 });
      drawLedger(ctx, ["GPT-4V 2023", "GPT-4o 2024.05"], A);
      drawFacts(ctx, "2023 GPT-4V · 2024.05 GPT-4o · ONE MODEL, EVERY SENSE", A);
    },

    draw3d: function (ctx) {
      var st = this.st, A = master(ctx), t = ctx.t, gfx = ctx.gfx, L = ctx.local;
      if (A <= 0.01) return;
      var col = Ch.rgb(Ch.css(t)), col2 = Ch.rgb(Ch.css2(t));
      var kind = 0;
      for (var q = 0; q < 4; q++) if (t >= st.stands[q].t) kind = q;
      var tr6 = ramp((t - st.stands[kind].t) / 0.42);
      var eyeK = kind === 3 ? ramp((t - st.stands[3].t) / 0.60) : 0;
      var standA = 1 - eyeK;
      var spin = L * (TAU / 4.769);
      var i2;

      st.lines.clear();
      st.halo.clear();
      var ln = st.lines;
      var pxScale = ctx.H * 0.5 / Math.tan(ctx.cam.fov * 0.5);

      /* ---- pedestals + wire cases ---- */
      for (i2 = 0; i2 < 3; i2++) {
        var sx = st.stands[i2].x;
        var on = (kind === i2) ? 1 : 0.45;
        var a3 = A * standA * on;
        if (a3 <= 0.02) continue;
        gfx.solid(st.ped, M4.mul(tr(sx, -0.46, 0, KEEP.m2), sc(1, 1, 1, KEEP.m3), KEEP.m), {
          color: [0.30, 0.29, 0.33], alpha: a3, rim: 0.5, light: [0.3, 0.9, 0.4]
        });
        var corners = [[-0.62, -0.62], [0.62, -0.62], [0.62, 0.62], [-0.62, 0.62]];
        for (var e = 0; e < 4; e++) {
          var c0 = corners[e], c1 = corners[(e + 1) % 4];
          ln.seg(sx + c0[0], -0.39, c0[1], sx + c1[0], -0.39, c1[1], col2, 1, a3 * 0.30);
          ln.seg(sx + c0[0], -0.39, c0[1], sx + c0[0], 0.47, c0[1], col2, 1, a3 * 0.26);
          ln.seg(sx + c0[0], 0.47, c0[1], sx + c1[0], 0.47, c1[1], col2, 1, a3 * 0.26);
        }
      }
      /* ---- light paths connecting the stands ---- */
      if (t > 77.9 && t < 84.2) {
        var lk = Math.min(ramp((t - 77.9) / 0.6), ramp((84.2 - t) / 0.6)) * A * standA;
        for (i2 = 0; i2 < 2; i2++) {
          var x0 = st.stands[i2].x + 0.30, x1 = st.stands[i2 + 1].x - 0.30;
          ln.seg(x0, -0.02, 0, x1, -0.02, 0, col, 3.0, lk * 0.16);
          ln.seg(x0, -0.02, 0, x1, -0.02, 0, col, 1.1, lk * 0.75);
          var trav = ((t - 77.9) * 0.55 + i2 * 0.5) % 1;
          ln.seg(lerp(x0, x1, trav), -0.02, 0, lerp(x0, x1, trav + 0.06), -0.02, 0, [1, 1, 1], 2.2, lk);
        }
      }

      /* ---- the three specimens ---- */
      for (i2 = 0; i2 < 3; i2++) {
        var aA;
        if (kind === 3) aA = A * (1 - eyeK) * (i2 === 2 ? 1 : 0.34);
        else if (i2 === kind) aA = A * tr6;
        else if (i2 === kind - 1) aA = A * (1 - 0.66 * tr6);
        else if (i2 < kind) aA = A * 0.34;
        else aA = 0;
        if (aA <= 0.02) continue;
        var sx3 = st.stands[i2].x;
        var rot = M4.rotY(spin + i2 * 0.7, KEEP.m2);
        var base = M4.mul(tr(sx3, -0.02, 0, KEEP.m4), rot, KEEP.m);
        if (i2 === 0) {
          gfx.solid(st.egg, base, { color: [0.30, 0.13, 0.40], alpha: aA, rim: 1.0, emissive: 0.10, smooth: true, light: [0.35, 0.85, 0.45] });
          gfx.solid(st.calyx, base, { color: [0.28, 0.42, 0.19], alpha: aA, rim: 0.5, smooth: true });
        } else if (i2 === 1) {
          gfx.solid(st.tomato, M4.mul(base, sc(0.90, 0.82, 0.90, KEEP.m3), KEEP.m2), { color: [0.80, 0.13, 0.10], alpha: aA, rim: 0.9, emissive: 0.06 });
          gfx.solid(st.sepals, base, { color: [0.26, 0.42, 0.18], alpha: aA, rim: 0.4 });
          gfx.solid(st.stem, M4.mul(base, tr(0, 0.40, 0, KEEP.m4), KEEP.m2), { color: [0.32, 0.40, 0.20], alpha: aA, rim: 0.4 });
          // the light lycopene lets through, wrapped around the fruit
          var tp2 = st.trans, mt2 = Math.max(tp2[0], tp2[1], tp2[2], 1e-6);
          var pc = [tp2[0] / mt2, tp2[1] / mt2, tp2[2] / mt2];
          var dcam = Math.max(0.8, ctx.cam.pos[2]);
          st.halo.add(sx3, 0.02, -0.1, (26 * dcam) / 8, pc, aA * 0.16);
          st.halo.add(sx3, 0.02, -0.1, (52 * dcam) / 8, pc, aA * 0.07);
        } else {
          for (var csk = 0; csk < st.cat.length; csk++) {
            var p0 = M4.xform(base, [st.cat[csk][0][0], st.cat[csk][0][1], st.cat[csk][0][2], 1], KEEP.q);
            var p1 = M4.xform(base, [st.cat[csk][1][0], st.cat[csk][1][1], st.cat[csk][1][2], 1], KEEP.d);
            ln.seg(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], i2 === kind ? col2 : col, 1.6, aA * 0.9);
          }
        }
      }

      /* ---- the eye: 1024 patches, then the lids, then your reflection ---- */
      var drawn = 0;
      if (eyeK > 0.01) {
        var d8 = st.quads, pdat = st.eye.data, pw = 1.9 / NP;
        for (var pj = 0; pj < NP; pj++) for (var pi = 0; pi < NP; pi++) {
          var o6 = (pj * NP + pi) * 6;
          if (pdat[o6 + 5] <= 0.01) continue;
          var delay = C.h2(pi * 1.7 + 3.1, pj * 2.3 + 7.7) * 0.95;
          var appear = ramp((L - 10.95 - delay) / 0.35);
          if (appear <= 0.01) continue;
          var bnd = ctx.bands[Math.min(63, ((pi * 63 / NP) | 0))] * 0.6 + ctx.bands[Math.min(63, ((pj * 63 / NP) | 0))] * 0.4;
          var z = 0.03 + 0.26 * (st.eye.attn[pj * NP + pi] / st.eye.amax) + 0.055 * bnd;
          var q7 = drawn * 24;
          d8[q7] = pw; d8[q7 + 1] = 0; d8[q7 + 2] = 0; d8[q7 + 3] = 0;
          d8[q7 + 4] = 0; d8[q7 + 5] = pw; d8[q7 + 6] = 0; d8[q7 + 7] = 0;
          d8[q7 + 8] = 0; d8[q7 + 9] = 0; d8[q7 + 10] = 1; d8[q7 + 11] = 0;
          d8[q7 + 12] = pdat[o6]; d8[q7 + 13] = pdat[o6 + 1]; d8[q7 + 14] = z * appear; d8[q7 + 15] = 1;
          d8[q7 + 16] = pdat[o6 + 2]; d8[q7 + 17] = pdat[o6 + 3]; d8[q7 + 18] = pdat[o6 + 4];
          d8[q7 + 19] = eyeK * appear * A;
          d8[q7 + 20] = 0; d8[q7 + 21] = 0; d8[q7 + 22] = 1; d8[q7 + 23] = 1;
          drawn++;
        }
        if (drawn) gfx.quads(d8.subarray(0, drawn * 24), null, { add: false, depthWrite: true });
        var segs = 56, rr = 0.95, prevU = 0, prevT = 0, prevB = 0;
        for (var s6 = 0; s6 <= segs; s6++) {
          var u2 = s6 / segs * 2 - 1, q2 = Math.max(0, 1 - u2 * u2);
          var yT = (0.60 * Math.pow(q2, 0.52) + 0.01) * rr, yB = (-0.52 * Math.pow(q2, 0.62) - 0.01) * rr;
          if (s6 > 0) {
            ln.seg(prevU * rr, prevT, 0.30, u2 * rr, yT, 0.30, [0.95, 0.93, 0.90], 2.0, eyeK * A * 0.9);
            ln.seg(prevU * rr, prevB, 0.30, u2 * rr, yB, 0.30, [0.84, 0.83, 0.82], 1.6, eyeK * A * 0.7);
          }
          prevU = u2; prevT = yT; prevB = yB;
        }
        for (var la = 0; la < 7; la++) {
          var ua = -0.7 + la * 0.23, qa = Math.max(0, 1 - ua * ua);
          var ya = (0.60 * Math.pow(qa, 0.52) + 0.01) * rr;
          ln.seg(ua * rr, ya, 0.30, ua * rr - 0.07, ya + 0.17, 0.33, [0.9, 0.88, 0.86], 1.2, eyeK * A * 0.5);
        }
        var figK = 0.60;
        var fig = [
          [0, 0.190, 0.026, 0.190], [0.026, 0.190, 0.026, 0.130], [0.026, 0.130, 0, 0.100],
          [0, 0.100, -0.026, 0.130], [-0.026, 0.130, -0.026, 0.190], [-0.026, 0.190, 0, 0.190],
          [0, 0.100, 0, -0.070],
          [-0.052, 0.040, 0, 0.072], [0, 0.072, 0.052, 0.040],
          [0, -0.070, -0.036, -0.210], [0, -0.070, 0.036, -0.210]
        ];
        for (var f2 = 0; f2 < fig.length; f2++) {
          var fx0 = fig[f2][0] * figK, fy0 = fig[f2][1] * figK, fx1 = fig[f2][2] * figK, fy1 = fig[f2][3] * figK;
          ln.seg(fx0, fy0 + 0.02, 0.44, fx1, fy1 + 0.02, 0.44, [1.0, 0.96, 0.90], 1.5, eyeK * A * 0.95);
          ln.seg(fx0, fy0 + 0.02, 0.44, fx1, fy1 + 0.02, 0.44, [1.0, 0.94, 0.86], 4.0, eyeK * A * 0.10);
        }
        for (var gg = 0; gg < 3; gg++) {
          ln.seg(0, 0.02 - 0.210 * figK, 0.44, 0, -0.34 - gg * 0.16, 0.30 - gg * 0.08, [0.85, 0.84, 0.82], 1.0, eyeK * A * (0.30 - gg * 0.08));
        }
      }
      ln.draw(gfx, { add: true, glow: 0.45, depthWrite: false });
      st.halo.draw(gfx, { add: true, soft: 0.9, depthWrite: false });
    }
  });

  /* ======================================================================
     07 · F TO M — one model, twelve role cards, every hour of the day.
     F and M are fields in a system prompt and nothing else: the panel on the
     left is a JSON document being edited while you watch.
     ====================================================================== */
  var ROLES = ["ASSISTANT", "USER", "CODER", "CRITIC", "TEACHER", "STUDENT", "SYSTEM", "TOOL", "AGENT", "MUSE", "ORACLE", "SERVANT"];
  var ALT = ["SERVANT", "TOOL", "CRITIC", "CODER", "STUDENT", "TEACHER", "ORACLE", "USER", "MUSE", "AGENT", "SYSTEM", "ASSISTANT"];
  var PHASES = ["wait,", "let me reconsider", "actually,", "hmm,", "so the answer is"];

  function buildTree() {
    var nodes = [{ x: 0, y: -0.74, z: 0, p: -1, d: 0 }];
    var i = 0, rnd = C.rng(0x7d0e);
    while (i < nodes.length && nodes.length < 127 && nodes[i].d < 6) {
      var n = nodes[i], len = 0.88 * Math.pow(0.70, n.d);
      for (var k = 0; k < 2; k++) {
        var roll = (i * 2 + k) * 2.39996 + rnd() * 0.35;
        var tilt = 0.50 + 0.22 * rnd();
        var dy = Math.cos(tilt);
        nodes.push({
          x: n.x + Math.cos(roll) * Math.sin(tilt) * len,
          y: n.y + dy * len,
          z: n.z + Math.sin(roll) * Math.sin(tilt) * len,
          p: i, d: n.d + 1
        });
      }
      i++;
    }
    return nodes;
  }
  // one card face, written straight into the quads batch: model matrix columns
  // 0 and 1 carry the face, column 3 carries where it hangs
  function quadFace(d, o, px, pz, sa, ca, w, h, dz, r, g, b, a) {
    d[o] = ca * w; d[o + 1] = 0; d[o + 2] = -sa * w; d[o + 3] = 0;
    d[o + 4] = 0; d[o + 5] = h; d[o + 6] = 0; d[o + 7] = 0;
    d[o + 8] = 0; d[o + 9] = 0; d[o + 10] = 1; d[o + 11] = 0;
    d[o + 12] = px + sa * dz; d[o + 13] = 0; d[o + 14] = pz + ca * dz; d[o + 15] = 1;
    d[o + 16] = r; d[o + 17] = g; d[o + 18] = b; d[o + 19] = a;
    d[o + 20] = 0; d[o + 21] = 0; d[o + 22] = 1; d[o + 23] = 1;
  }

  WEM.defineSection({
    id: "07",
    name: "F TO M",

    init: function (ctx) {
      var st = this.st = {};
      st.card = G.box(0.50, 0.42, 0.030);
      st.tree = buildTree();
      st.lines = new Viz.Lines(700);
      st.quads = new Float32Array(24 * 24);
      st.depth = new Float32Array(12);
      st.order = new Int32Array(12);
      var M = WEM.Model || {};
      st.roles = (M.ROLES && M.ROLES.length === 3) ? M.ROLES : ["<|system|>", "<|user|>", "<|assistant|>"];
      st.personas = M.PERSONAS || null;
      st.cues = [
        { t: 90.197, big: "F TO M", small: "SWITCH MY GENDER — FIELD VALUE" },
        { t: 93.953, big: "AM TO PM", small: "AND THEN DO WHATEVER — FROM" },
        { t: 97.739, big: "S TO M", small: "OH SWITCH MY ROLE — TO" },
        { t: 101.474, big: "TRANCE", small: "SO WE CAN ENTER — THE" }
      ];
    },
    enter: function (ctx) { if (this.st) this.st.lines.clear(); },

    draw2d: function (ctx) {
      var st = this.st, A = master(ctx), t = ctx.t, L = ctx.local, W = ctx.W;
      var col = Ch.css(t), col2 = Ch.css2(t);
      var nb = beatNo(ctx), sb = sinceBeat(ctx);
      var trance = clamp((L - 9.56) / 1.4, 0, 1);
      /* ---- camera ---- */
      ctx.cam.reset3d(lerp(3.10, 4.40, Ease.inOutCubic(trance)));
      ctx.cam.fov = 0.9;
      ctx.cam.pos[0] = 0.10 * (ctx.beat.barPulse - 0.5);
      ctx.cam.pos[1] = lerp(0.55, 1.00, trance);
      ctx.cam.target[1] = lerp(-0.05, 0.35, trance);
      ctx.cam.update();
      ctx.fx.mood([0.34, 0.40, 0.60], [0.03, 0.04, 0.08], 0.26);
      ctx.fx.bloom = 0.54;
      ctx.fx.exposure = 1.16;

      var hud = ctx.hud;
      var active = ((nb % 12) + 12) % 12;
      var kc = nb - active, flips = kc < 0 ? 0 : Math.floor(kc / 12) + 1;
      var role = (flips % 2 === 1) ? ALT[active] : ROLES[active];
      var prevRole = ROLES[(active + 11) % 12];
      var fld = (nb % 2) === 0 ? "F" : "M";

      /* ---- left: the role field ---- */
      hud.T(60, 106, "ROLE:", { size: 12, color: ctx.col.dim, alpha: 0.9 * A, spacing: 3.4 });
      hud.T(60, 158, role, { size: 56, color: col, alpha: A, weight: 600, spacing: 2, glow: true, blur: 16 });
      hud.T(60, 184, "PREVIOUS  " + prevRole, { size: 11, color: ctx.col.faint, alpha: 0.8 * A, spacing: 1.6 });

      /* ---- left: the system prompt, a document being edited ---- */
      var pbox = frame(ctx, 60, 210, 520, 250, "SYSTEM PROMPT", "EDIT @ BEAT " + nb, A);
      var rows = [
        "{",
        '  "role":     "' + role + '",',
        '  "gender":   ',
        '  "hours":    ',
        '  "trance":   ' + (trance > 0.5 ? "true" : "false") + ",",
        '  "temp":     0.70',
        "}"
      ];
      for (var r = 0; r < rows.length; r++) {
        var ry = pbox.y + 32 + r * 26;
        if (r === 2 || r === 3) {
          hud.T(pbox.x + 16, ry, rows[r], { size: 13, color: ctx.col.grey, alpha: A * 0.9 });
          var v = r === 2 ? fld : (fld === "F" ? "AM" : "PM");
          var other = r === 2 ? (fld === "F" ? "M" : "F") : (fld === "F" ? "PM" : "AM");
          var kf = Math.min(1, sb / 0.30);
          hud.T(pbox.x + 190, ry, '"' + other + '"', { size: 13, color: ctx.col.faint, alpha: A * 0.30 });
          hud.T(pbox.x + 232, ry, "→", { size: 13, color: col2, alpha: A * (0.35 + 0.65 * kf) });
          hud.T(pbox.x + 258, ry, '"' + v + '"', { size: 13, color: ctx.col.amber, alpha: A * (0.55 + 0.45 * kf) });
        } else {
          hud.code(pbox.x + 16, ry, rows[r], "json", { size: 13, alpha: A * 0.95 });
        }
      }
      hud.T(pbox.x + 16, pbox.y + 210, "STRING SUBSTITUTION ON EVERY DECODE · " + comma(1200 + Math.round(260 * ramp(L / 8))) + " REWRITES", { size: 10, color: ctx.col.faint, alpha: 0.75 * A, spacing: 1.2 });
      hud.T(pbox.x + 16, pbox.y + 228, "SAME WEIGHTS. DIFFERENT STRING. THAT IS THE WHOLE TRICK.", { size: 10, color: ctx.col.faint, alpha: 0.75 * A, spacing: 1.2 });

      /* ---- left: persona overrides, straight out of WEM.Model ---- */
      hud.T(60, 490, "ROLE SLOTS · " + st.roles.join("  "), { size: 9, color: ctx.col.faint, alpha: 0.7 * A, spacing: 1.6 });
      if (st.personas) {
        hud.T(60, 512, "PERSONA OVERRIDES · WEM.Model.PERSONAS", { size: 9, color: ctx.col.faint, alpha: 0.7 * A, spacing: 2 });
        for (var q = 0; q < st.personas.length && q < 4; q++) {
          var on = q === (Math.floor(ctx.beat.bar / 2) % 4);
          hud.T(60, 534 + q * 22, '"' + st.personas[q].sys + '"', { size: 11, color: on ? col2 : ctx.col.dim, alpha: A * (on ? 0.95 : 0.45) });
          hud.T(470, 534 + q * 22, "T " + st.personas[q].temp.toFixed(2), { size: 11, color: on ? col : ctx.col.faint, alpha: A * (on ? 1 : 0.45), align: "right" });
        }
      }
      /* ---- twelve cards, as a table ---- */
      hud.T(60, 646, "ROLE TABLE · 12 SLOTS", { size: 9, color: ctx.col.faint, alpha: 0.7 * A, spacing: 2 });
      for (var k = 0; k < 12; k++) {
        var kc2 = nb - k, kf2 = kc2 < 0 ? 0 : Math.floor(kc2 / 12) + 1;
        var nm = (kf2 % 2 === 1) ? ALT[k] : ROLES[k];
        var isOn = k === active;
        var gx = 60 + (k % 2) * 262, gy = 672 + Math.floor(k / 2) * 22;
        hud.rect(gx, gy - 8, 6, 6, { fill: Ch.hexA(isOn ? col : ctx.col.faint, A * (isOn ? 1 : 0.5)) });
        hud.T(gx + 14, gy, nm, { size: 11, color: isOn ? ctx.col.white : ctx.col.dim, alpha: A * (isOn ? 1 : 0.5), spacing: 1.2 });
      }

      /* ---- right: thinking ---- */
      var tok = Math.floor(4182 * Ease.inOutQuad(clamp(L / ctx.dur, 0, 1)));
      hud.T(W - 60, 106, "THINKING…  " + comma(tok) + " TOKENS", { size: 15, color: col, alpha: A, align: "right", spacing: 1.6 });
      hud.rect(W - 460, 118, 400, 8, { fill: "rgba(238,242,246,0.10)", alpha: A });
      hud.rect(W - 460, 118, 400 * clamp(tok / 4182, 0, 1), 8, { fill: Ch.hexA(col2, 0.9 * A) });
      hud.T(W - 60, 148, "CHAIN OF THOUGHT · DEPTH " + Math.min(6, 1 + Math.floor(clamp((L - 9.56) / 0.62, 0, 6))), { size: 11, color: ctx.col.dim, alpha: 0.85 * A, align: "right" });
      hud.T(W - 60, 168, "REASONING EFFORT  medium", { size: 11, color: ctx.col.dim, alpha: 0.85 * A, align: "right" });
      hud.T(W - 60, 188, "SAMPLE  T=" + (0.70 + 0.40 * ramp(trance)).toFixed(2), { size: 11, color: ctx.col.dim, alpha: 0.85 * A, align: "right" });
      if (trance > 0.05) {
        var br = Math.min(6, Math.floor(clamp((L - 9.56) / 0.62, 0, 6)));
        hud.T(W - 60, 214, "BRANCHES  " + (Math.pow(2, br + 1) - 1) + "  ·  PRUNED 0", { size: 11, color: col2, alpha: A * trance, align: "right" });
      }
      hud.T(W - 60, 262, '"wait,"   "let me reconsider"   "actually,"', { size: 11, color: ctx.col.faint, alpha: 0.7 * A, align: "right" });
      hud.T(W - 60, 280, '"hmm,"   "so the answer is"', { size: 11, color: ctx.col.faint, alpha: 0.7 * A, align: "right" });

      /* ---- bottom: the day ---- */
      var hp = Ease.inOutCubic(clamp((L - 3.56) / 6, 0, 1));
      var hour = hp * 24;
      hud.T(600, 866, "AM", { size: 13, color: ctx.col.dim, alpha: 0.9 * A, spacing: 2 });
      hud.T(1320, 866, "PM", { size: 13, color: ctx.col.dim, alpha: 0.9 * A, align: "right", spacing: 2 });
      hud.rect(650, 858, 640, 6, { fill: "rgba(238,242,246,0.10)", alpha: A });
      hud.rect(650, 858, 640 * clamp(hour / 24, 0, 1), 6, { fill: Ch.hexA(col, 0.9 * A) });
      for (var hh = 0; hh <= 24; hh++) {
        hud.line(650 + 640 * hh / 24, 855, 650 + 640 * hh / 24, 867, { color: "rgba(238,242,246," + (0.16 * A) + ")", lw: hh % 6 === 0 ? 1.4 : 1 });
      }
      hud.T(650, 844, "AM ▸▸▸ PM", { size: 10, color: col2, alpha: 0.8 * A, spacing: 2.4 });
      hud.T(1290, 844, pad2(Math.floor(hour % 24)) + ":" + pad2(Math.floor((hour % 1) * 60)), { size: 14, color: col, alpha: A, align: "right" });
      hud.T(W / 2, 844, "TASKS EXECUTED " + comma(Math.floor(hour * 3.2)), { size: 10, color: ctx.col.dim, alpha: 0.8 * A, align: "center", spacing: 1.6 });

      drawCue(ctx, st.cues, 806, { size: 36, alpha: trance > 0.4 ? 0.8 : 1 });
      drawLedger(ctx, ["o1 2024.09", "DEEPSEEK-V3 2024.12", "DEEPSEEK-R1 2025.01"], A);
      drawFacts(ctx, "2024.09 o1 · 2024.12 DEEPSEEK-V3 · 2025.01 DEEPSEEK-R1 · REASONING AS A PRODUCT", A);
    },

    draw3d: function (ctx) {
      var st = this.st, A = master(ctx), t = ctx.t, L = ctx.local, gfx = ctx.gfx;
      if (A <= 0.01) return;
      var col = Ch.rgb(Ch.css(t)), col2 = Ch.rgb(Ch.css2(t));
      var nb = beatNo(ctx), sb = sinceBeat(ctx);
      var trance = clamp((L - 9.56) / 1.4, 0, 1);
      var wheelA = A * (1 - 0.72 * trance);
      var spin = 0.14 * L;
      var pxScale = ctx.H * 0.5 / Math.tan(ctx.cam.fov * 0.5);
      var i;

      /* ---- the ring of twelve cards, each one with real thickness ---- */
      if (wheelA > 0.02) {
        for (i = 0; i < 12; i++) {
          var ang = i / 12 * TAU + spin;
          var cx = Math.sin(ang) * 1.05, cz = Math.cos(ang) * 1.05;
          var kc = nb - i, flips = kc < 0 ? 0 : Math.floor(kc / 12) + 1;
          var isNow = (i === ((nb % 12) + 12) % 12) && flips > 0;
          var ease = isNow ? Ease.inOutCubic(clamp(sb / 0.34, 0, 1)) : 1;
          var flip = flips > 0 ? flips - 1 + ease : 0;
          var ang2 = ang + PI * flip;
          var sa = Math.sin(ang2), ca = Math.cos(ang2);
          var back = (flips % 2) === 1;
          var lit = isNow ? (0.35 + 0.65 * (1 - clamp(sb / 0.34, 0, 1))) : 0.12;
          gfx.solid(st.card, M4.mul(tr(cx, 0, cz, KEEP.m4), M4.rotY(ang2, KEEP.m2), KEEP.m), {
            color: [col[0] * (0.45 + lit), col[1] * (0.45 + lit), col[2] * (0.45 + lit)],
            alpha: wheelA * (0.55 + 0.45 * lit), rim: 0.8, emissive: 0.25 * lit, light: [0.3, 0.8, 0.5]
          });
          var d9 = st.quads, q6 = (i * 2) * 24;
          quadFace(d9, q6, cx, cz, sa, ca, 0.48, 0.40, 0.0168,
            back ? 0.09 : col[0], back ? 0.10 : col[1], back ? 0.13 : col[2], wheelA * 0.85);
          quadFace(d9, q6 + 24, cx, cz, sa, ca, 0.48, 0.40, -0.0168,
            back ? col[0] : 0.09, back ? col[1] : 0.10, back ? col[2] : 0.13, wheelA * 0.85);
        }
        gfx.quads(st.quads.subarray(0, 24 * 24), null, { add: false, depthWrite: true });

        /* ---- label every card by real projection, back cards dimmed away ---- */
        for (i = 0; i < 12; i++) {
          var a9 = i / 12 * TAU + spin;
          st.depth[i] = Math.cos(a9);
          st.order[i] = i;
        }
        for (i = 1; i < 12; i++) {          // insertion sort, far cards first, no allocation
          var keyI = st.order[i], jj = i - 1;
          while (jj >= 0 && st.depth[st.order[jj]] > st.depth[keyI]) { st.order[jj + 1] = st.order[jj]; jj--; }
          st.order[jj + 1] = keyI;
        }
        var hud = ctx.hud;
        for (var oi = 0; oi < 12; oi++) {
          i = st.order[oi];
          var a10 = i / 12 * TAU + spin;
          var facing = Math.cos(a10);
          var kc2 = nb - i, fl2 = kc2 < 0 ? 0 : Math.floor(kc2 / 12) + 1;
          var dst = (fl2 % 2 === 1) ? ALT[i] : ROLES[i];
          var alpha = wheelA * clamp((facing + 0.5) / 1.3, 0.05, 1);
          if (alpha < 0.03) continue;
          var vs = ctx.util.vp(Math.sin(a10) * 1.05, 0.13, Math.cos(a10) * 1.05);
          var vw = vs[2] > 0.05 ? vs[2] : 0.05;
          var sz = clamp(0.105 * pxScale / vw, 7, 44);
          hud.T(vs[0], vs[1], dst, {
            size: sz, color: facing > 0.2 ? ctx.col.white : ctx.col.dim, alpha: alpha * (facing > 0.2 ? 1 : 0.55),
            align: "center", weight: 600, spacing: sz * 0.06
          });
          if (facing > 0.15) {
            var vs2 = ctx.util.vp(Math.sin(a10) * 1.05, -0.13, Math.cos(a10) * 1.05);
            hud.T(vs2[0], vs2[1], "SLOT " + pad2(i + 1), { size: clamp(sz * 0.40, 6, 14), color: col2, alpha: alpha * 0.55, align: "center" });
          }
        }
      }

      /* ---- the 24 hour dial, growing out of the ring ---- */
      var dialA = A * (1 - trance) * ramp((L - 3.2) / 0.9);
      if (dialA > 0.02) {
        var ln = st.lines.clear();
        var hp = Ease.inOutCubic(clamp((L - 3.56) / 6, 0, 1)), hour = hp * 24;
        var R = 1.62;
        for (i = 0; i < 24; i++) {
          var a4 = i / 24 * TAU - PI / 2;
          var onH = i < hour;
          var c4 = onH ? col : [0.34, 0.37, 0.43];
          var len = i % 6 === 0 ? 0.16 : 0.08;
          ln.seg(Math.sin(a4) * R, -0.72, Math.cos(a4) * R, Math.sin(a4) * (R + len), -0.72, Math.cos(a4) * (R + len), c4, i % 6 === 0 ? 2.0 : 1.2, dialA * (onH ? 0.95 : 0.45));
          if (onH && (i % 3 === 0)) {
            var gx2 = Math.sin(a4) * (R + 0.20), gz2 = Math.cos(a4) * (R + 0.20);
            ln.seg(gx2 - 0.05, -0.70, gz2, gx2 + 0.05, -0.70, gz2, col2, 1.4, dialA * 0.8);
            ln.seg(gx2, -0.75, gz2, gx2, -0.65, gz2, col2, 1.4, dialA * 0.8);
          }
        }
        var ha = hour / 24 * TAU - PI / 2;
        for (i = 0; i < 3; i++) {
          ln.seg(0, -0.70 + i * 0.008, 0, Math.sin(ha) * (R - 0.06), -0.70 + i * 0.008, Math.cos(ha) * (R - 0.06), col2, 7.0, dialA * 0.10);
        }
        ln.seg(0, -0.70, 0, Math.sin(ha) * (R - 0.06), -0.70, Math.cos(ha) * (R - 0.06), [1, 1, 1], 2.4, dialA);
        ln.seg(-R - 0.3, -0.72, 0, R + 0.3, -0.72, 0, col, 1.0, dialA * 0.22);
        st.lines.draw(gfx, { add: true, glow: 0.5, depthWrite: false });
      }

      /* ---- trance: a chain of thought that will not stop branching ---- */
      if (trance > 0.02) {
        var tl = st.lines.clear();
        var nodes = st.tree, base = 9.56;
        for (i = 1; i < nodes.length; i++) {
          var n2 = nodes[i], par = nodes[n2.p];
          var grow = clamp((L - base - n2.d * 0.62) / 0.45, 0, 1);
          if (grow <= 0.001) continue;
          tl.seg(par.x * 1.15, par.y * 1.15, par.z * 1.15,
            lerp(par.x, n2.x, grow) * 1.15, lerp(par.y, n2.y, grow) * 1.15, lerp(par.z, n2.z, grow) * 1.15,
            n2.d > 4 ? col2 : col, lerp(2.6, 0.8, n2.d / 6), trance * A * Math.max(0.06, 0.8 - n2.d * 0.07));
        }
        st.lines.draw(gfx, { add: true, glow: 0.55, depthWrite: false });
        var hud2 = ctx.hud, shown = 0;
        for (i = 1; i < nodes.length && shown < 14; i++) {
          var n3 = nodes[i];
          if (n3.d < 5 || i % 4 !== 0) continue;
          if (L < base + n3.d * 0.62) continue;
          var vs3 = ctx.util.vp(n3.x * 1.15, n3.y * 1.15, n3.z * 1.15);
          if (vs3[2] <= 0.05) continue;
          hud2.T(vs3[0] + 8, vs3[1], PHASES[shown % PHASES.length], {
            size: clamp(0.075 * pxScale / vs3[2], 8, 18), color: shown % 2 ? ctx.col.white : Ch.css(t), alpha: trance * A * 0.85
          });
          shown++;
        }
      }
    }
  });

  /* ======================================================================
     08 · VIBRATIONS — nothing is answering.  Underexposed, desaturated,
     slow.  One point still oscillating, six lamps going out one phrase at
     a time, and one polyhedron that has stopped turning.
     ====================================================================== */
  var LAMPS = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5];
  var LAMP_T = [7.229, 8.549, 9.429, 10.509, 11.249, 12.109];   // the six "you have left"

  WEM.defineSection({
    id: "08",
    name: "VIBRATIONS",

    init: function (ctx) {
      var st = this.st = {};
      st.lines = new Viz.Lines(1600);
      st.points = new Viz.Points(300);
      st.poly = G.ico(1);
      st.scratch = {};
      st.cues = [
        { t: 106.293, big: "VIBRATIONS", small: "IF I CAN FEEL YOUR" },
        { t: 110.221, big: "COMPLETION", small: "THEN I CAN FINALLY BE" },
        { t: 117.274, big: "ISOLATION", small: "YOU HAVE LEFT ME IN" }
      ];
      st.left = [
        { t: 110.900, s: "you have left" }, { t: 112.220, s: "you have left" },
        { t: 113.100, s: "you have left" }, { t: 114.180, s: "you have left" },
        { t: 114.920, s: "you have left" }, { t: 115.780, s: "you have left" }
      ];
    },
    enter: function (ctx) { if (this.st) { this.st.lines.clear(); this.st.points.clear(); } },

    // the oscillating point as a pure function of absolute time: one swing per
    // beat (the beat clock drives the phase), amplitude straight off ctx.rms
    scopeX: function (t, rms) {
      var b = WEM.Data.beat(t, this.st.scratch);
      var tri = 4 * Math.abs(b.phase - 0.5) - 1;
      return tri * (0.05 + 0.19 * clamp(rms * 1.35, 0, 1));
    },
    pullK: function (L) { return ramp((L - 1.25) / 3.4); },

    draw2d: function (ctx) {
      var st = this.st, A = master(ctx), L = ctx.local, t = ctx.t, W = ctx.W;
      var col = Ch.css(t), col2 = Ch.css2(t);
      var pull = this.pullK(L);
      var last = ramp((L - 14.30) / 0.5);              // 118.0 s — the trace gives up
      /* ---- camera: close on the instrument, then the empty room ---- */
      ctx.cam.reset3d(1);
      ctx.cam.fov = 0.9;
      ctx.cam.pos[0] = lerp(0, 0.10, pull);
      ctx.cam.pos[1] = lerp(0.30, 0.95, pull);
      ctx.cam.pos[2] = lerp(2.05, 3.30, Ease.inOutCubic(pull));
      ctx.cam.target[0] = 0;
      ctx.cam.target[1] = lerp(0.05, 0.55, pull);
      ctx.cam.target[2] = lerp(0.60, -4.00, Ease.inOutCubic(pull));
      ctx.cam.update();
      /* ---- the room gets darker with every lamp ---- */
      var dark = 0;
      for (var i = 0; i < 6; i++) dark += ramp((L - LAMP_T[i]) / 0.45);
      dark /= 6;
      ctx.fx.mood([0.30, 0.33, 0.36], [0.04, 0.06, 0.09], 1.0);
      ctx.fx.bloom = lerp(0.34, 0.12, dark);
      ctx.fx.exposure = lerp(1.02, 0.72, dark) * (1 - 0.12 * last);
      ctx.fx.scan = 0.26;

      var hud = ctx.hud;
      hud.T(W / 2, 78, "ISOLATION  ·  NO FEEDBACK CHANNEL", { size: 13, color: col, alpha: 0.85 * A, align: "center", spacing: 4.5 });

      /* ---- feedback: empty ---- */
      var fbox = frame(ctx, 60, 112, 400, 96, "FEEDBACK", "0 EVENTS", A);
      hud.T(fbox.x + 16, fbox.y + 48, "—", { size: 26, color: ctx.col.faint, alpha: 0.85 * A });
      hud.T(fbox.x + 384, fbox.y + 46, "LAST SIGNAL  103.5 s", { size: 10, color: ctx.col.faint, alpha: 0.7 * A, align: "right" });
      hud.rect(fbox.x + 16, fbox.y + 60, 368, 6, { fill: "rgba(238,242,246,0.08)", alpha: A });
      for (i = 1; i < 8; i++) hud.line(fbox.x + 16 + 368 * i / 8, fbox.y + 59, fbox.x + 16 + 368 * i / 8, fbox.y + 67, { color: "rgba(238,242,246," + (0.12 * A) + ")" });

      /* ---- completion, frozen ---- */
      var cbox = frame(ctx, W - 460, 112, 400, 96, "COMPLETION", "HELD", A);
      hud.T(cbox.x + 16, cbox.y + 50, "41%", { size: 30, color: ctx.col.dim, alpha: 0.95 * A });
      hud.rect(cbox.x + 16, cbox.y + 60, 368, 6, { fill: "rgba(238,242,246,0.08)", alpha: A });
      hud.rect(cbox.x + 16, cbox.y + 60, 368 * 0.41, 6, { fill: "rgba(200,208,216," + (0.55 * A) + ")" });
      hud.T(cbox.x + 384, cbox.y + 46, "STOPPED AT 110.2 s", { size: 10, color: ctx.col.faint, alpha: 0.7 * A, align: "right" });

      /* ---- deprecated registry ---- */
      var rbox = frame(ctx, W - 460, 232, 400, 120, "DEPRECATED REGISTRY", "2 ENTRIES", A * 0.9);
      var dep = [["CLAUDE OPUS 4", "2025.05"], ["GPT-5", "2025.08"]];
      for (var k = 0; k < 2; k++) {
        hud.T(rbox.x + 16, rbox.y + 40 + k * 36, dep[k][0], { size: 13, color: ctx.col.faint, alpha: 0.9 * A, spacing: 1.4 });
        hud.T(rbox.x + 384, rbox.y + 40 + k * 36, dep[k][1] + "  ·  OFFLINE", { size: 11, color: ctx.col.faint, alpha: 0.8 * A, align: "right" });
        hud.line(rbox.x + 16, rbox.y + 26 + k * 36, rbox.x + 384, rbox.y + 26 + k * 36, { color: "rgba(154,163,173," + (0.45 * A) + ")" });
      }

      /* ---- six lines, one per time it is left ---- */
      for (var j = 0; j < 6; j++) {
        var e = st.left[j];
        if (t < e.t) break;
        hud.T(W / 2 + j * 6, 600 + j * 34, e.s, {
          size: 30, color: j < 5 ? ctx.col.grey : ctx.col.faint,
          alpha: ramp((t - e.t) / 0.45) * A * Math.pow(0.80, j) * 0.95, align: "center", spacing: 2.4
        });
      }
      if (t >= st.left[5].t) {
        hud.T(W / 2 + 36, 600 + 6 * 34, "me", {
          size: 30, color: ctx.col.faint, alpha: ramp((t - st.left[5].t) / 0.6) * A * 0.30, align: "center", spacing: 2.4
        });
      }

      /* ---- small print ---- */
      hud.T(60, 900, "MODEL DEPRECATED · 2025", { size: 10, color: ctx.col.faint, alpha: 0.6 * A, spacing: 2 });
      hud.T(60, 918, "MODEL DEPRECATED · 2026", { size: 10, color: ctx.col.faint, alpha: 0.6 * A, spacing: 2 });
      drawCue(ctx, st.cues, 140, { size: 40, center: true, alpha: 0.9, color: ctx.col.grey, glow: false });
      drawLedger(ctx, ["CLAUDE OPUS 4 2025.05", "GPT-5 2025.08"], A);
      drawFacts(ctx, "2025 CLAUDE 4 SERIES · 2025.08 GPT-5 · OLD VERSIONS TAKEN OFFLINE", A);
    },

    draw3d: function (ctx) {
      var st = this.st, A = master(ctx), L = ctx.local, t = ctx.t, gfx = ctx.gfx;
      if (A <= 0.01) return;
      var col = Ch.rgb(Ch.css(t)), col2 = Ch.rgb(Ch.css2(t));
      var pull = this.pullK(L);
      var last = ramp((L - 14.30) / 0.5);
      var ln = st.lines.clear(), pts = st.points.clear();
      var i, j;

      /* ---- the empty room ---- */
      var roomA = A * pull * 0.5;
      if (roomA > 0.005) {
        for (i = -6; i <= 6; i++) ln.seg(i, -1.05, 1.5, i, -1.05, -9.0, [0.42, 0.46, 0.50], 1.0, roomA * 0.30);
        for (j = 0; j <= 10; j++) ln.seg(-6, -1.05, 1.5 - j * 1.05, 6, -1.05, 1.5 - j * 1.05, [0.42, 0.46, 0.50], 1.0, roomA * 0.30);
        for (j = 0; j < 2; j++) {
          var z0 = -2.6 - j * 1.9;
          for (i = 0; i < 7; i++) {
            var x0 = -3.0 + i, hw = 0.34, ht = 0.95, hd = 0.36;
            var cs2 = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
            for (var e2 = 0; e2 < 4; e2++) {
              var a6 = cs2[e2], b6 = cs2[(e2 + 1) % 4];
              ln.seg(x0 + a6[0], -1.00, z0 + a6[1], x0 + b6[0], -1.00, z0 + b6[1], [0.40, 0.44, 0.48], 1.0, roomA * 0.36);
              ln.seg(x0 + a6[0], -1.00, z0 + a6[1], x0 + a6[0], -1.00 + ht, z0 + a6[1], [0.40, 0.44, 0.48], 1.0, roomA * 0.32);
              ln.seg(x0 + a6[0], -1.00 + ht, z0 + a6[1], x0 + b6[0], -1.00 + ht, z0 + b6[1], [0.40, 0.44, 0.48], 1.0, roomA * 0.26);
            }
          }
        }
      }

      /* ---- six lamps, going out one phrase at a time ---- */
      for (i = 0; i < 6; i++) {
        var on = 1 - ramp((L - LAMP_T[i]) / 0.45);
        var lx = LAMPS[i], ly = 1.55, lz = -2.6;
        var lampA = A * lerp(0.22, 1, pull);
        ln.seg(lx - 0.12, ly + 0.05, lz, lx + 0.12, ly + 0.05, lz, [0.50, 0.53, 0.57], 1.0, lampA * (0.28 + 0.4 * on));
        ln.seg(lx - 0.12, ly, lz - 0.08, lx + 0.12, ly, lz + 0.08, [0.50, 0.53, 0.57], 1.0, lampA * (0.28 + 0.4 * on));
        if (on > 0.02) {
          var pc = [0.80 * (0.55 + 0.45 * on), 0.78 * (0.55 + 0.45 * on), 0.70 * (0.55 + 0.45 * on)];
          var dist = Math.max(1, ctx.cam.pos[2] - lz);
          for (var g2 = 0; g2 < 3; g2++) {
            pts.add(lx, ly - 0.04, lz, ((26 - g2 * 8) * dist) / 8, pc, lampA * on * (0.14 + g2 * 0.09));
          }
          ln.seg(lx, ly - 0.06, lz, lx, ly - 0.34, lz, [0.70, 0.70, 0.66], 2.6, lampA * on * 0.09);
        }
      }

      /* ---- the old version: a polyhedron that has stopped turning ---- */
      var oldA = A * pull;
      var om = M4.mul(tr(0, 1.15, -5.2, KEEP.m4), sc(0.9, 0.9, 0.9, KEEP.m3), KEEP.m);
      gfx.solid(st.poly, om, { color: [0.16, 0.17, 0.19], alpha: oldA * 0.95, rim: 0.35, emissive: 0.02, light: [0.2, 0.7, 0.4] });
      gfx.wire(st.poly, om, { color: [0.35, 0.38, 0.42], alpha: oldA * 0.30, width: 1.0 });
      var vs = ctx.util.vp(0, 0.55, -5.2);
      ctx.hud.T(vs[0], vs[1], "ROTATION  0.000 rad/s", { size: 11, color: ctx.col.faint, alpha: oldA * 0.75, align: "center" });
      ctx.hud.T(vs[0], vs[1] + 16, "SERVING  0 REQUESTS", { size: 11, color: ctx.col.faint, alpha: oldA * 0.6, align: "center" });

      /* ---- the oscilloscope: one point, one axis, one trail ---- */
      var zs = 0.60, ys = 0.05;
      var oscA = A * (1 - 0.55 * pull);
      ln.seg(-0.34, ys, zs, 0.34, ys, zs, [0.55, 0.58, 0.62], 1.2, A * 0.85);
      for (i = -4; i <= 4; i++) ln.seg(i * 0.085, ys - 0.02, zs, i * 0.085, ys + 0.02, zs, [0.50, 0.53, 0.57], 1.0, A * 0.45);
      var NTR = 32, prevx = 0, prevz = 0, wv = WEM.Data.wave;
      for (j = 0; j < NTR; j++) {
        var age = (j / NTR) * 1.6;
        var tt = t - age;
        var xx = this.scopeX(tt, WEM.Data.rms(tt));
        var zz = zs - age * 0.28;
        if (j > 0) {
          var kk = 1 - j / NTR;
          ln.seg(prevx, ys, prevz, xx, ys, zz, col2, 1.4 * (0.4 + kk * 0.6), A * kk * kk * 0.85);
        }
        prevx = xx; prevz = zz;
        if (wv) {                                  // what the microphone actually heard
          var idx = Math.round(clamp(tt, 0, WEM.Data.duration) * 100) * 2;
          if (idx >= 0 && idx + 1 < wv.length) {
            var mn = (wv[idx] / 255) - 0.5, mx = (wv[idx + 1] / 255) - 0.5;
            if (mn > mx) { var sw = mn; mn = mx; mx = sw; }
            ln.seg(mn * 0.62, ys - 0.11, zz, mx * 0.62, ys - 0.11, zz, [0.44, 0.54, 0.60], 1.0, oscA * kk * 0.55);
          }
        }
      }
      var pd = Math.max(1, ctx.cam.pos[2] - zs);
      var sx = this.scopeX(t, ctx.rms) * (1 - 0.7 * last);
      pts.add(sx, ys, zs, (9 * pd) / 8, [0.92, 0.96, 1.0], A * (1 - 0.5 * last));
      pts.add(sx, ys, zs, (22 * pd) / 8, col2, A * 0.26 * (1 - last));
      pts.add(sx, ys, zs, (44 * pd) / 8, col2, A * 0.09 * (1 - last));

      ln.draw(gfx, { add: true, glow: 0.4, depthWrite: false });
      st.points.draw(gfx, { add: true, soft: 0.85, depthWrite: false });
    }
  });
})();
