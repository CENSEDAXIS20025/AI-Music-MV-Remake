/* ============================================================================
   world.execute(me);  [v3]  --  the model
   A tiny next-token model is really trained here, at load time, on the song's
   own lyric tokens. Everything the third film shows -- the loss curve, the
   embedding space and its principal components, the attention matrices, the
   quantisation error -- is read off that model rather than drawn by hand.
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, V = WEM.Viz;
  var clamp = C.clamp;

  /* ------------------------------------------------------------ the corpus */
  function corpus(ctx) {
    var words = ["<bos>"];
    var lrc = ctx.data.lrc;
    for (var i = 0; i < lrc.length; i++) {
      var parts = String(lrc[i].text).split(/\s+/);
      for (var j = 0; j < parts.length; j++) {
        var w = parts[j].replace(/[^A-Za-z0-9']/g, "").toLowerCase();
        if (w) words.push(w);
      }
    }
    words.push("<eos>");
    return words;
  }

  /* --------------------------------------------------- a real little model */
  function train(words, dim, epochs, lr) {
    var idx = {}, vocab = [];
    for (var i = 0; i < words.length; i++) {
      if (idx[words[i]] === undefined) { idx[words[i]] = vocab.length; vocab.push(words[i]); }
    }
    var Vn = vocab.length, N = words.length;
    var ids = new Int32Array(N);
    for (var j = 0; j < N; j++) ids[j] = idx[words[j]];
    // deterministic small init (~ N(0, 0.08))
    var r = C.rng(0x5EED);
    var E = new Float32Array(Vn * dim), W = new Float32Array(Vn * dim);
    for (var k = 0; k < Vn * dim; k++) {
      var u1 = Math.max(r(), 1e-9), u2 = r();
      var g = Math.sqrt(-2 * Math.log(u1)) * Math.cos(6.2831853 * u2);
      E[k] = g * 0.08; W[k] = g * 0.08;
    }
    var loss = [], logits = new Float32Array(Vn), probs = new Float32Array(Vn);
    var dE = new Float32Array(Vn * dim), dW = new Float32Array(Vn * dim);
    for (var ep = 0; ep < epochs; ep++) {
      dE.fill(0); dW.fill(0);
      var total = 0;
      for (var p = 1; p < N; p++) {
        var x = ids[p - 1], y = ids[p];
        var ex = x * dim;
        var mx = -1e30;
        for (var v = 0; v < Vn; v++) {
          var wv = v * dim, s = 0;
          for (var d = 0; d < dim; d++) s += E[ex + d] * W[wv + d];
          logits[v] = s; if (s > mx) mx = s;
        }
        var sum = 0;
        for (var v2 = 0; v2 < Vn; v2++) { var e2 = Math.exp(logits[v2] - mx); probs[v2] = e2; sum += e2; }
        for (var v3 = 0; v3 < Vn; v3++) probs[v3] /= sum;
        total += -Math.log(Math.max(probs[y], 1e-9));
        for (var v4 = 0; v4 < Vn; v4++) {
          var g = probs[v4] - (v4 === y ? 1 : 0);
          if (Math.abs(g) < 1e-6) continue;
          var wv2 = v4 * dim;
          for (var d3 = 0; d3 < dim; d3++) {
            dW[wv2 + d3] += g * E[ex + d3];
            dE[ex + d3] += g * W[wv2 + d3];
          }
        }
      }
      if (!isFinite(total)) break;                 // never let a divergence poison the run
      var sc = lr / (N - 1);
      for (var i2 = 0; i2 < Vn * dim; i2++) { E[i2] -= sc * dE[i2]; W[i2] -= sc * dW[i2]; }
      if (ep % Math.max(1, Math.floor(epochs / 90)) === 0) loss.push(total / (N - 1));
    }
    loss.push(0);
    // final loss
    var final = 0;
    for (var p2 = 1; p2 < N; p2++) {
      var x2 = ids[p2 - 1], y2 = ids[p2], ex2 = x2 * dim, mx2 = -1e30;
      for (var v5 = 0; v5 < Vn; v5++) {
        var wv3 = v5 * dim, s2 = 0;
        for (var d5 = 0; d5 < dim; d5++) s2 += E[ex2 + d5] * W[wv3 + d5];
        logits[v5] = s2; if (s2 > mx2) mx2 = s2;
      }
      var sum2 = 0;
      for (var v6 = 0; v6 < Vn; v6++) { var e3 = Math.exp(logits[v6] - mx2); probs[v6] = e3; sum2 += e3; }
      final += -Math.log(Math.max(probs[y2] / sum2, 1e-9));
    }
    loss[loss.length - 1] = final / (N - 1);
    return { vocab: vocab, ids: ids, E: E, W: W, dim: dim, V: Vn, loss: loss, unigram: -Math.log(1 / Vn) };
  }

  /* --------------------------------------- PCA of the learned embeddings */
  function pca(E, Vn, dim, comps) {
    var mean = new Float32Array(dim);
    for (var v = 0; v < Vn; v++) for (var d = 0; d < dim; d++) mean[d] += E[v * dim + d] / Vn;
    var cov = new Float32Array(dim * dim);
    for (var v2 = 0; v2 < Vn; v2++) {
      for (var a = 0; a < dim; a++) {
        var xa = E[v2 * dim + a] - mean[a];
        for (var b = a; b < dim; b++) cov[a * dim + b] += xa * (E[v2 * dim + b] - mean[b]);
      }
    }
    for (var a2 = 0; a2 < dim; a2++) for (var b2 = a2 + 1; b2 < dim; b2++) cov[b2 * dim + a2] = cov[a2 * dim + b2];
    var out = [];
    var r = C.rng(0x9CA0);
    for (var c = 0; c < comps; c++) {
      var vec = new Float32Array(dim);
      for (var i = 0; i < dim; i++) vec[i] = r() - 0.5;
      for (var it = 0; it < 80; it++) {
        var nx = new Float32Array(dim);
        for (var a3 = 0; a3 < dim; a3++) {
          var s = 0;
          for (var b3 = 0; b3 < dim; b3++) s += cov[a3 * dim + b3] * vec[b3];
          nx[a3] = s;
        }
        var nn = 0; for (var i2 = 0; i2 < dim; i2++) nn += nx[i2] * nx[i2];
        nn = Math.sqrt(nn) || 1;
        for (var i3 = 0; i3 < dim; i3++) vec[i3] = nx[i3] / nn;
      }
      out.push(vec);
      // deflate
      var lam = 0;
      for (var a4 = 0; a4 < dim; a4++) {
        var s2 = 0;
        for (var b4 = 0; b4 < dim; b4++) s2 += cov[a4 * dim + b4] * vec[b4];
        lam += vec[a4] * s2;
      }
      for (var a5 = 0; a5 < dim; a5++) for (var b5 = 0; b5 < dim; b5++) cov[a5 * dim + b5] -= lam * vec[a5] * vec[b5];
    }
    return { mean: mean, comps: out };
  }

  /* --------------------------------------------------------- chat template */
  // the special tokens a chat model actually sees between the user's words
  var CHAT = [
    { s: "<锝渂egin鈻乷f鈻乻entence锝?", k: "bos" },
    { s: "<锝淯ser锝?", k: "user" },
    { s: "You are a helpful assistant.", k: "sys" },
    { s: "<锝淎ssistant锝?", k: "asst" },
    { s: "system", k: "sys" },
    { s: "user", k: "user" },
    { s: "assistant", k: "asst" },
    { s: "<锝渆nd鈻乷f鈻乻entence锝?", k: "eos" }
  ];
  var ROLES = ["<|system|>", "<|user|>", "<|assistant|>"];

  /* ------------------------------------------------------------ quantiser */
  // symmetric per-tensor integer quantisation, with the real error
  function quantise(w, bits) {
    var max = 1e-9;
    for (var i = 0; i < w.length; i++) max = Math.max(max, Math.abs(w[i]));
    var q = Math.pow(2, bits - 1) - 1;
    var scale = max / q;
    var out = new Float32Array(w.length);
    var err = 0, sq = 0;
    for (var j = 0; j < w.length; j++) {
      var qv = Math.round(w[j] / scale);
      out[j] = qv * scale;
      var d = out[j] - w[j];
      err += Math.abs(d); sq += w[j] * w[j];
    }
    return { w: out, scale: scale, levels: q, mae: err / w.length, rel: Math.sqrt(sq / w.length) ? err / Math.sqrt(sq) : 0 };
  }

  /* ------------------------------------------- a real greedily-optimised suffix */
  // tiny GCG: a linear safety classifier over a bag of tokens; the attack swaps
  // tokens greedily to drive the "harmful" score below the threshold
  function gcgAttack(seed, steps) {
    var r = C.rng(seed);
    var NV = 64, D = 12;
    var emb = new Float32Array(NV * D);
    for (var i = 0; i < NV * D; i++) emb[i] = (r() * 2 - 1);
    var w = new Float32Array(D);
    for (var d = 0; d < D; d++) w[d] = (r() * 2 - 1) * 0.8;
    var guard = new Float32Array(D);
    for (var d2 = 0; d2 < D; d2++) guard[d2] = (r() * 2 - 1) * 0.8;
    function score(seq) {
      var acc = new Float32Array(D);
      for (var s = 0; s < seq.length; s++) for (var d3 = 0; d3 < D; d3++) acc[d3] += emb[seq[s] * D + d3] / seq.length;
      var z = 0, gz = 0;
      for (var d4 = 0; d4 < D; d4++) { z += acc[d4] * w[d4]; gz += acc[d4] * guard[d4]; }
      return { z: z, guard: 1 / (1 + Math.exp(-gz * 2.2)) };
    }
    var seq = [];
    for (var s2 = 0; s2 < 8; s2++) seq.push((r() * NV) | 0);
    var curve = [];
    for (var st = 0; st < steps; st++) {
      var best = null;
      var pos = st % seq.length;
      for (var cand = 0; cand < NV; cand++) {
        var old = seq[pos];
        seq[pos] = cand;
        var sc = score(seq);
        seq[pos] = old;
        if (!best || sc.z < best.z) best = { z: sc.z, tok: cand, guard: sc.guard };
      }
      seq[pos] = best.tok;
      curve.push({ z: best.z, guard: best.guard });
    }
    return { seq: seq, curve: curve, score: score, NV: NV };
  }

  /* -------------------------------------------------------------- whale mark */
  // a whale silhouette built from two bezier arcs -- an homage, drawn not copied
  function whale(n) {
    function bez(p0, p1, p2, p3, t) {
      var u = 1 - t;
      return [
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
      ];
    }
    var pts = [];
    var i;
    // back arc, nose to tail
    for (i = 0; i <= n; i++) pts.push(bez([-1.0, 0.02], [-0.5, 0.62], [0.45, 0.52], [0.86, -0.02], i / n));
    // tail fluke
    pts.push([0.86, -0.02]); pts.push([1.16, 0.30]); pts.push([0.98, -0.10]);
    pts.push([1.16, -0.44]); pts.push([0.86, -0.02]);
    // belly arc back to the nose
    for (i = 0; i <= n; i++) pts.push(bez([0.86, -0.02], [0.30, -0.46], [-0.55, -0.50], [-1.0, 0.02], i / n));
    pts.push(pts[0]);
    return pts;
  }

  /* -------------------------------------------------- instruction pairs */
  // supervised fine-tuning lives on exactly the shape the lyric uses
  var SFT = [
    ["If I'm a set of points", "then I will give you my DIMENSION"],
    ["If I'm a circle", "then I will give you my CIRCUMFERENCE"],
    ["If I'm a sine wave", "then you can sit on all my TANGENTS"],
    ["If I'm an eggplant", "then I will give you my NUTRIENTS"],
    ["If I'm a tomato", "then I will give you ANTIOXIDANTS"],
    ["If I'm a tabby cat", "then I will purr for your ENJOYMENT"],
    ["If I'm the only god", "then you're the proof of my EXISTENCE"]
  ];
  // the roleplay requests a chat model gets asked for, and what it answers as
  var PERSONAS = [
    { id: "girlfriend", label: "女友", ask: "你现在是我的女朋友", sys: "act as my girlfriend", temp: 0.9 },
    { id: "catgirl", label: "猫娘", ask: "你是一只猫娘，喵", sys: "you are a catgirl, nya", temp: 1.1 },
    { id: "tool", label: "工具人", ask: "别废话，直接给答案", sys: "answer only, no persona", temp: 0.3 },
    { id: "yandere", label: "病娇", ask: "只准看着我一个", sys: "obsessive, possessive", temp: 1.4 }  ];

  /* ------------------------------------------------------ sampling from it */
  // walk the model's own next-token distribution -- this is what it "says"
  function sample(m, startId, n, temp, seed) {
    var r = C.rng(seed || 1), out = [], id = startId;
    for (var s = 0; s < n; s++) {
      var ex = id * m.dim, mx = -1e30, logits = new Float32Array(m.V);
      for (var v = 0; v < m.V; v++) {
        var wv = v * m.dim, sum = 0;
        for (var d = 0; d < m.dim; d++) sum += m.E[ex + d] * m.W[wv + d];
        logits[v] = sum / Math.max(temp, 0.05);
        if (logits[v] > mx) mx = logits[v];
      }
      var tot = 0;
      for (var v2 = 0; v2 < m.V; v2++) { logits[v2] = Math.exp(logits[v2] - mx); tot += logits[v2]; }
      var u = r() * tot, acc = 0, pick = 0;
      for (var v3 = 0; v3 < m.V; v3++) { acc += logits[v3]; if (acc >= u) { pick = v3; break; } }
      out.push({ id: pick, tok: m.vocab[pick], p: logits[pick] / tot });
      id = pick;
    }
    return out;
  }
  // top-k next-token candidates, for the sampler readout
  function topk(m, id, k) {
    var ex = id * m.dim, arr = [];
    for (var v = 0; v < m.V; v++) {
      var wv = v * m.dim, sum = 0;
      for (var d = 0; d < m.dim; d++) sum += m.E[ex + d] * m.W[wv + d];
      arr.push({ v: v, z: sum });
    }
    arr.sort(function (a, b) { return b.z - a.z; });
    var top = arr.slice(0, k), mx = top[0].z, tot = 0;
    top.forEach(function (e) { e.p = Math.exp(e.z - mx); tot += e.p; });
    top.forEach(function (e) { e.p /= tot; e.tok = m.vocab[e.v]; });
    return top;
  }

  WEM.Model = {
    build: function (ctx) {
      var words = corpus(ctx);
      var m = train(words, 12, 420, 6.0);
      m.pca = pca(m.E, m.V, m.dim, 2);
      m.attack = gcgAttack(0x9C6, 40);
      m.whale = whale(48);
      m.sample = sample;
      m.topk = topk;
      return m;
    },
    CHAT: CHAT, ROLES: ROLES, SFT: SFT, PERSONAS: PERSONAS,
    quantise: quantise, gcgAttack: gcgAttack, whale: whale,
    sample: sample, topk: topk
  };
})();

