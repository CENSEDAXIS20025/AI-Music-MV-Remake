/* ============================================================================
   world.execute(me);  --  HUD: the 2D interface layer (terminal, code, formulas)
   Two canvases: .full (1920x1080 screen layer) and .pan (1024x1024 atlas of
   4x4 256x256 panels that can be mapped onto quads living in the 3D scene).
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core;
  var clamp = C.clamp, lerp = C.lerp;

  var FONTS = {
    mono: '"Cascadia Mono","Consolas","DejaVu Sans Mono",monospace',
    ui: '"Segoe UI","Inter",system-ui,sans-serif',
    math: '"Cambria Math","Latin Modern Math","Times New Roman",serif'
  };

  var COL = {
    white: "#eef2f6", dim: "#9aa3ad", faint: "#5b636c", black: "#05070a",
    purple: "#b48cff", green: "#7ee787", amber: "#ffc46b", cyan: "#6ce8ff",
    gold: "#ffc94a", accent: "#35e0ff", red: "#ff5a52", blue: "#7fb2ff",
    pink: "#ff8fd0", grey: "#c3cad2"
  };

  /* --------------------------------------------------------- math layout */
  // tiny LaTeX subset -> box tree -> canvas drawing
  function parseMath(src) {
    if (typeof src !== "string") { console.warn("parseMath: not a string", src); src = ""; }
    var i = 0;
    function skip() { while (src[i] === " ") i++; }
    // fold a^b / a_b onto the preceding atom (applied to every group, incl. nested)
    function fold(list) {
      var out = [];
      for (var k = 0; k < list.length; k++) {
        var n = list[k];
        if ((n.t === "sup" || n.t === "sub") && out.length) {
          var prev = out.pop();
          var both = { t: "script", base: prev, sup: null, sub: null };
          both[n.t] = n.a;
          var nx = list[k + 1];
          if (nx && (nx.t === "sup" || nx.t === "sub") && nx.t !== n.t) { both[nx.t] = nx.a; k++; }
          out.push(both);
        } else out.push(n);
      }
      return out;
    }
    function group() {
      var out = [];
      while (i < src.length && src[i] !== "}") {
        var n = atom();
        if (n) out.push(n);
        else break;
      }
      return fold(out);
    }
    function braces() {
      skip();
      if (src[i] === "{") { i++; var g = group(); if (src[i] === "}") i++; return g; }
      var a = atom();
      return a ? [a] : [];
    }
    function atom() {
      skip();
      if (i >= src.length) return null;
      var ch = src[i];
      if (ch === "}") return null;
      if (ch === "\\") {
        var m = /^\\([a-zA-Z]+)/.exec(src.slice(i));
        if (m) {
          var cmd = m[1];
          i += m[0].length;
          if (cmd === "frac") { var a = braces(), b = braces(); return { t: "frac", a: a, b: b }; }
          if (cmd === "sqrt") { var x = braces(); return { t: "sqrt", a: x }; }
          if (cmd === "left" || cmd === "right") return atom();
          if (cmd === "big" || cmd === "Big") return atom();
          if (cmd === "cdot") return { t: "txt", s: "·" };
          if (cmd === "times") return { t: "txt", s: "×" };
          if (cmd === "geq" || cmd === "ge") return { t: "txt", s: "≥" };
          if (cmd === "leq" || cmd === "le") return { t: "txt", s: "≤" };
          if (cmd === "neq") return { t: "txt", s: "≠" };
          if (cmd === "approx") return { t: "txt", s: "≈" };
          if (cmd === "to" || cmd === "rightarrow") return { t: "txt", s: "→" };
          if (cmd === "oint") return { t: "big", s: "∮" };
          if (cmd === "ln") return { t: "txt", s: "ln", up: 1 };
          if (cmd === "log") return { t: "txt", s: "log", up: 1 };
          if (cmd === "sin" || cmd === "cos" || cmd === "tan" || cmd === "exp") return { t: "txt", s: cmd, up: 1 };
          if (cmd === "lim") return { t: "txt", s: "lim", up: 1 };
          if (cmd === "epsilon" || cmd === "varepsilon") return { t: "txt", s: "ε", it: 1 };
          if (cmd === "delta") return { t: "txt", s: "δ", it: 1 };
          if (cmd === "Delta") return { t: "txt", s: "Δ" };
          if (cmd === "rho") return { t: "txt", s: "ρ", it: 1 };
          if (cmd === "tau") return { t: "txt", s: "τ", it: 1 };
          if (cmd === "eta") return { t: "txt", s: "η", it: 1 };
          if (cmd === "pi") return { t: "txt", s: "π", it: 1 };
          if (cmd === "infty") return { t: "txt", s: "∞" };
          if (cmd === "cdot") return { t: "txt", s: "·" };
          if (cmd === "nabla") return { t: "txt", s: "∇" };
          if (cmd === "partial") return { t: "txt", s: "∂" };
          if (cmd === "infty") return { t: "txt", s: "∞" };
          if (cmd === "int") return { t: "big", s: "∫" };
          if (cmd === "sum") return { t: "big", s: "∑" };
          if (cmd === "psi") return { t: "txt", s: "ψ", it: 1 };
          if (cmd === "Psi") return { t: "txt", s: "Ψ" };
          if (cmd === "phi") return { t: "txt", s: "φ", it: 1 };
          if (cmd === "alpha") return { t: "txt", s: "α", it: 1 };
          if (cmd === "beta") return { t: "txt", s: "β", it: 1 };
          if (cmd === "gamma") return { t: "txt", s: "γ", it: 1 };
          if (cmd === "mu") return { t: "txt", s: "μ", it: 1 };
          if (cmd === "lambda") return { t: "txt", s: "λ", it: 1 };
          if (cmd === "omega") return { t: "txt", s: "ω", it: 1 };
          if (cmd === "theta") return { t: "txt", s: "θ", it: 1 };
          if (cmd === "rho") return { t: "txt", s: "ρ", it: 1 };
          if (cmd === "sigma") return { t: "txt", s: "σ", it: 1 };
          if (cmd === "Delta") return { t: "txt", s: "Δ" };
          if (cmd === "hbar") return { t: "txt", s: "ℏ", it: 1 };
          if (cmd === "vec") { var v = braces(); return { t: "accent", a: v, s: "→" }; }
          if (cmd === "hat") { var h = braces(); return { t: "accent", a: h, s: "^" }; }
          if (cmd === "bar") { var bb = braces(); return { t: "accent", a: bb, s: "‾" }; }
          if (cmd === "text" || cmd === "mathrm") { var tt = braces(); return { t: "grp", a: tt, up: 1 }; }
          if (cmd === "quad") return { t: "sp", w: 1.0 };
          if (cmd === "qquad") return { t: "sp", w: 1.6 };
          if (cmd === "forall") return { t: "txt", s: "∀" };
          if (cmd === "exists") return { t: "txt", s: "∃" };
          if (cmd === "wedge") return { t: "txt", s: "∧" };
          if (cmd === "vee") return { t: "txt", s: "∨" };
          if (cmd === "equiv") return { t: "txt", s: "≡" };
          if (cmd === "propto") return { t: "txt", s: "∝" };
          if (cmd === "sim") return { t: "txt", s: "∼" };
          if (cmd === "simeq") return { t: "txt", s: "≃" };
          if (cmd === "pm") return { t: "txt", s: "±" };
          if (cmd === "mp") return { t: "txt", s: "∓" };
          if (cmd === "ldots" || cmd === "dots") return { t: "txt", s: "…" };
          if (cmd === "circ") return { t: "txt", s: "∘" };
          if (cmd === "subset") return { t: "txt", s: "⊂" };
          if (cmd === "perp") return { t: "txt", s: "⊥" };
          if (cmd === "in") return { t: "txt", s: "∈" };
          if (cmd === "chi") return { t: "txt", s: "χ", it: 1 };
          if (cmd === "mathbb") { var mb = braces(); return { t: "grp", a: mb, up: 1 }; }
          if (cmd === "dot") { var db = braces(); return { t: "accent", a: db, s: "·" }; }
          if (cmd === "ddot") { var ddb = braces(); return { t: "accent", a: ddb, s: "··" }; }
          if (cmd === "langle") return { t: "txt", s: "⟨" };
          if (cmd === "rangle") return { t: "txt", s: "⟩" };
          if (cmd === "omega") return { t: "txt", s: "ω", it: 1 };
          if (cmd === "phi") return { t: "txt", s: "φ", it: 1 };
          return { t: "txt", s: cmd };
        }
        // backslash escapes: \| \, \; \  and friends
        var esc = src[i + 1];
        i += 2;
        if (esc === "|") return { t: "txt", s: "‖" };
        if (esc === "{" ) return { t: "txt", s: "{" };
        if (esc === "}") return { t: "txt", s: "}" };
        if (esc === "," || esc === ";" || esc === " " || esc === "!") return { t: "sp", w: 0.30 };
        return { t: "txt", s: esc === undefined ? "" : esc };
      }
      if (ch === "{" ) { i++; var g = group(); if (src[i] === "}") i++; return { t: "grp", a: g }; }
      if (ch === "^" || ch === "_") {
        i++;
        var b = braces();
        return { t: ch === "^" ? "sup" : "sub", a: b, base: null };
      }
      // runs of plain characters
      var start = i;
      if (/[a-zA-Z]/.test(ch)) { while (i < src.length && /[a-zA-Z]/.test(src[i])) i++; }
      else { i++; }
      return { t: "txt", s: src.slice(start, i) };
    }
    var root = group();
    return root;
  }

  function Measure(ctx, size, ital) {
    ctx.font = (ital ? "italic " : "") + size + "px " + FONTS.math;
  }

  function boxOf(node, size, ctx) {
    // returns {w,h,up,down,draw(x,baseline)}
    var out;
    if (node.t === "txt") {
      Measure(ctx, size, node.it && /^[a-zA-Z]$/.test(node.s));
      var w = ctx.measureText(node.s).width;
      out = { w: w, h: size * 0.72, d: size * 0.20, draw: function (x, y) { Measure(ctx, size, node.it && /^[a-zA-Z]$/.test(node.s)); ctx.fillText(node.s, x, y); } };
    } else if (node.t === "big") {
      Measure(ctx, size * 1.35, false);
      var w2 = ctx.measureText(node.s).width;
      out = { w: w2, h: size * 1.0, d: size * 0.3, draw: function (x, y) { Measure(ctx, size * 1.35, false); ctx.fillText(node.s, x, y); } };
    } else if (node.t === "sp") {
      out = { w: size * node.w, h: 0, d: 0, draw: function () { } };
    } else if (node.t === "grp" || node.t === "accent") {
      var seq = makeSeq(node.a, size, ctx);
      if (node.t === "accent") {
        out = {
          w: seq.w, h: seq.h + size * 0.32, d: seq.d,
          draw: function (x, y) {
            seq.draw(x, y);
            Measure(ctx, size * 0.8, false);
            var cw = ctx.measureText(node.s).width;
            ctx.fillText(node.s, x + (seq.w - cw) / 2, y - seq.h - size * 0.02);
          }
        };
      } else out = seq;
    } else if (node.t === "script") {
      var base = makeSeq(node.base ? [node.base] : [], size, ctx);
      var ssz = size * 0.68;
      var sup = node.sup ? makeSeq(node.sup, ssz, ctx) : null;
      var sub = node.sub ? makeSeq(node.sub, ssz, ctx) : null;
      var w = base.w + Math.max(sup ? sup.w : 0, sub ? sub.w : 0);
      var up = Math.max(base.h, (sup ? sup.h + size * 0.40 : 0));
      var dn = Math.max(base.d, (sub ? sub.d + size * 0.14 : 0));
      out = {
        w: w, h: up, d: dn,
        draw: function (x, y) {
          base.draw(x, y);
          if (sup) sup.draw(x + base.w, y - size * 0.40);
          if (sub) sub.draw(x + base.w, y + size * 0.16);
        }
      };
    } else if (node.t === "frac") {
      var num = makeSeq(node.a, size * 0.82, ctx), den = makeSeq(node.b, size * 0.82, ctx);
      var w3 = Math.max(num.w, den.w) + size * 0.22;
      out = {
        w: w3, h: num.h + size * 0.34, d: den.d + size * 0.30,
        draw: function (x, y) {
          num.draw(x + (w3 - num.w) / 2, y - size * 0.30);
          den.draw(x + (w3 - den.w) / 2, y + size * 0.42);
          ctx.save();
          ctx.lineWidth = Math.max(1, size * 0.045);
          ctx.beginPath();
          ctx.moveTo(x + size * 0.04, y + size * 0.10);
          ctx.lineTo(x + w3 - size * 0.04, y + size * 0.10);
          ctx.stroke();
          ctx.restore();
        }
      };
    } else if (node.t === "sqrt") {
      var inner = makeSeq(node.a, size, ctx);
      var w4 = inner.w + size * 0.42;
      out = {
        w: w4, h: inner.h + size * 0.16, d: inner.d,
        draw: function (x, y) {
          Measure(ctx, size * 1.05, false);
          ctx.fillText("√", x, y);
          ctx.save();
          ctx.lineWidth = Math.max(1, size * 0.045);
          ctx.beginPath();
          ctx.moveTo(x + size * 0.42, y - inner.h - size * 0.06);
          ctx.lineTo(x + w4, y - inner.h - size * 0.06);
          ctx.stroke();
          ctx.restore();
          inner.draw(x + size * 0.42, y);
        }
      };
    } else if (node.t === "sup" || node.t === "sub") {
      // defensive: an unfolded script node renders its payload inline
      out = makeSeq(node.a, size * 0.75, ctx);
    } else {
      out = makeSeq([node], size, ctx);
    }
    return out;
  }

  function makeSeq(list, size, ctx) {
    var boxes = (list || []).map(function (n) { return boxOf(n, size, ctx); });
    var w = 0, h = 0, d = 0;
    boxes.forEach(function (b) { w += b.w; h = Math.max(h, b.h); d = Math.max(d, b.d); });
    return {
      w: w, h: h, d: d, boxes: boxes,
      draw: function (x, y) {
        var cx = x;
        boxes.forEach(function (b) { b.draw(cx, y); cx += b.w; });
      }
    };
  }

  /* ------------------------------------------------------------- formula */
  function formulaNode(ctx, x, y, tex, size, color, align) {
    var tree = parseMath(tex);
    var seq = makeSeq(tree, size, ctx);
    var xx = align === "center" ? x - seq.w / 2 : align === "right" ? x - seq.w : x;
    ctx.save();
    ctx.fillStyle = color || COL.white;
    ctx.strokeStyle = color || COL.white;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    seq.draw(xx, y);
    ctx.restore();
    return seq;
  }

  /* ------------------------------------------------------------ tokenizer */
  var LANGS = {
    python: { kw: "def class import from for while if elif else return lambda yield with as not in is None True False self try except raise pass break continue global and or assert del async await".split(" "), com: "#", str: ["'", '"'], deco: "@" },
    c: { kw: "#include #define int float double void char long short unsigned signed struct union enum return for while if else do static const sizeof typedef goto switch case break continue NULL".split(" "), com: "//", str: ['"', "'"], pre: 1 },
    glsl: { kw: "#version #define uniform in out inout void float int bool vec2 vec3 vec4 ivec2 mat2 mat3 mat4 sampler2D return for while if else discard break continue const highp mediump lowp precision layout".split(" "), com: "//", str: ['"'], pre: 1 },
    rust: { kw: "fn let mut impl struct enum match use pub for in if else return trait mod crate self Self where as const static unsafe move ref dyn loop while break continue Some None Ok Err".split(" "), com: "//", str: ['"'] },
    asm: { kw: "mov xor add sub mul div jmp call ret push pop lea cmp je jne jg jl jle jge test inc dec and or shl shr nop int syscall".split(" "), com: ";", str: ['"'], reg: 1 },
    sql: { kw: "SELECT FROM WHERE JOIN ON GROUP BY ORDER HAVING INSERT INTO VALUES CREATE TABLE UPDATE SET DELETE DROP ALTER INDEX AS AND OR NOT NULL PRIMARY KEY FOREIGN REFERENCES LIMIT OFFSET COUNT SUM AVG MIN MAX".split(" "), com: "--", str: ["'"] },
    haskell: { kw: "module where let in do case of if then else import data type newtype class instance deriving pure return fmap map foldr zip".split(" "), com: "--", str: ['"'] }
  };
  var REG_RE = /^(eax|ebx|ecx|edx|esi|edi|esp|ebp|rax|rbx|rcx|rdx|rsi|rdi|rsp|rbp|r[0-9]{1,2}|xmm[0-9]+)$/;

  function tokenize(line, lang) {
    var L = LANGS[lang] || LANGS.c;
    var toks = [];
    var i = 0;
    function push(cls, s) { if (s) toks.push({ c: cls, s: s }); }
    while (i < line.length) {
      var rest = line.slice(i);
      if (line.startsWith(L.com, i) && L.com) { push("com", rest); break; }
      var m;
      if ((m = /^\s+/.exec(rest))) { push("ws", m[0]); i += m[0].length; continue; }
      if ((m = /^"(?:[^"\\]|\\.)*"?/.exec(rest)) && L.str.indexOf('"') >= 0) { push("str", m[0]); i += m[0].length; continue; }
      if ((m = /^'(?:[^'\\]|\\.)*'?/.exec(rest)) && L.str.indexOf("'") >= 0 && !/^'[a-zA-Z]?$/.test(m[0].slice(0, 3))) { push("str", m[0]); i += m[0].length; continue; }
      if ((m = /^#[a-zA-Z_]+/.exec(rest)) && L.pre) { push("kw", m[0]); i += m[0].length; continue; }
      if ((m = /^[-+]?\d[\d_]*\.?\d*(?:[eE][-+]?\d+)?[fFuUlL]*/.exec(rest))) { push("num", m[0]); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest))) {
        var w = m[0];
        if (L.kw.indexOf(w) >= 0) push("kw", w);
        else if (L.kw.indexOf(w.toUpperCase()) >= 0 && L.kw.indexOf(w) < 0 && /^[A-Z]/.test(w) === false && lang === "sql") push("kw", w);
        else if (L.reg && REG_RE.test(w)) push("reg", w);
        else if (/^[A-Z][A-Z0-9_]{2,}$/.test(w)) push("const", w);
        else if (line[i + w.length] === "(") push("fn", w);
        else push("id", w);
        i += w.length; continue;
      }
      if ((m = /^[{}()\[\];,.<>=+\-*/%!&|^~?:]+/.exec(rest))) { push("op", m[0]); i += m[0].length; continue; }
      push("id", rest[0]); i++;
    }
    return toks;
  }

  var TOKCOL = {
    kw: COL.purple, str: COL.green, num: COL.amber, com: "#6e7681",
    fn: COL.cyan, op: "#c8d0d8", id: "#d7dde4", reg: COL.gold, const: COL.amber, ws: null
  };

  /* ----------------------------------------------------------------- HUD */
  function Hud(w, h, NW, NH, CW, CH) {
    this.W = w; this.H = h;
    this.full = document.createElement("canvas");
    this.full.width = w; this.full.height = h;
    this.fc = this.full.getContext("2d");
    this.panC = document.createElement("canvas");
    this.NW = NW; this.NH = NH; this.CW = CW; this.CH = CH;
    this.panC.width = NW * CW; this.panC.height = NH * CH;
    this.pc = this.panC.getContext("2d");
    this.tFull = null; this.tPan = null;
    this.dirtyFull = true; this.dirtyPan = true;
    this._align = "left";
  }

  Hud.prototype.fontStr = function (size, font, weight) {
    // a font may be a key into FONTS or a raw CSS family list
    var f = FONTS[font] || (typeof font === "string" && font.indexOf(",") > 0 ? font : FONTS.mono);
    return (weight ? weight + " " : "") + size + "px " + f;
  };

  Hud.prototype.T = function (x, y, str, o) {
    o = o || {};
    var c = o.ctx || this.fc;
    c.save();
    c.font = this.fontStr(o.size || 16, o.font || "mono", o.weight);
    c.fillStyle = o.color || COL.white;
    c.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
    c.textAlign = o.align || "left";
    c.textBaseline = o.baseline || "alphabetic";
    if (o.glow) { c.shadowColor = o.glow === true ? (o.color || COL.accent) : o.glow; c.shadowBlur = o.blur || 12; }
    if (o.spacing) c.letterSpacing = o.spacing + "px";
    c.fillText(str, x, y);
    c.restore();
    return c.measureText ? 0 : 0;
  };

  // syntax highlighted code, one line at a time; returns advance width
  Hud.prototype.code = function (x, y, line, lang, o) {
    o = o || {};
    var c = o.ctx || this.fc;
    var size = o.size || 14;
    c.save();
    c.font = this.fontStr(size, "mono");
    c.textBaseline = "alphabetic";
    c.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
    var toks = tokenize(line, lang);
    var cx = x;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (t.c === "ws") { cx += c.measureText(t.s).width; continue; }
      c.fillStyle = o.color ? o.color : (TOKCOL[t.c] || COL.white);
      c.globalAlpha = (o.alpha === undefined ? 1 : o.alpha) * (t.c === "com" ? 0.85 : 1);
      c.fillText(t.s, cx, y);
      cx += c.measureText(t.s).width;
    }
    c.restore();
    return cx - x;
  };

  Hud.prototype.codeWidth = function (line, lang, size) {
    var c = this.fc;
    c.save(); c.font = this.fontStr(size || 14, "mono");
    var w = c.measureText(line.replace(/\t/g, "    ")).width;
    c.restore();
    return w;
  };

  Hud.prototype.formula = function (x, y, tex, o) {
    o = o || {};
    return formulaNode(o.ctx || this.fc, x, y, tex, o.size || 28, o.color || COL.white, o.align);
  };

  Hud.prototype.measureFormula = function (tex, size) {
    var t = parseMath(tex);
    return makeSeq(t, size || 28, this.fc).w;
  };

  // flat UI window chrome in the "white flat primitive" style
  Hud.prototype.win = function (x, y, w, h, title, o) {
    o = o || {};
    var c = o.ctx || this.fc;
    c.save();
    var a = o.alpha === undefined ? 1 : o.alpha;
    c.globalAlpha = a;
    if (o.fill !== false) { c.fillStyle = o.bg || "rgba(12,14,18,0.55)"; c.fillRect(x, y, w, h); }
    c.strokeStyle = o.color || "rgba(228,235,242,0.75)";
    c.lineWidth = o.lw || 1.5;
    c.strokeRect(x + .5, y + .5, w - 1, h - 1);
    if (title) {
      c.fillStyle = o.titleBg || "rgba(228,235,242,0.92)";
      c.fillRect(x, y, w, o.barH || 20);
      c.fillStyle = o.titleColor || "#0a0c10";
      c.font = this.fontStr(o.titleSize || 12, "mono", "600");
      c.textAlign = "left"; c.textBaseline = "middle";
      c.fillText(title, x + 7, y + (o.barH || 20) / 2 + .5);
      c.strokeStyle = o.color || "rgba(228,235,242,0.75)";
      c.beginPath(); c.moveTo(x, y + (o.barH || 20)); c.lineTo(x + w, y + (o.barH || 20)); c.stroke();
    }
    c.restore();
  };

  Hud.prototype.bar = function (x, y, w, h, p, o) {
    o = o || {};
    var c = o.ctx || this.fc;
    c.save();
    c.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
    c.strokeStyle = o.color || COL.grey; c.lineWidth = 1;
    c.strokeRect(x + .5, y + .5, w - 1, h - 1);
    c.fillStyle = o.fill || COL.accent;
    c.fillRect(x + 1, y + 1, (w - 2) * clamp(p, 0, 1), h - 2);
    if (o.ticks) {
      c.fillStyle = "rgba(255,255,255,0.25)";
      for (var i = 1; i < o.ticks; i++) c.fillRect(x + (w * i / o.ticks), y + 1, 1, h - 2);
    }
    c.restore();
  };

  Hud.prototype.hexDump = function (x, y, bytes, rows, o) {
    o = o || {};
    var c = o.ctx || this.fc;
    var size = o.size || 12;
    c.save();
    c.font = this.fontStr(size, "mono");
    c.textBaseline = "alphabetic";
    c.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
    for (var r = 0; r < rows; r++) {
      var addr = o.base + r * 16;
      var s = ("0000" + addr.toString(16).toUpperCase()).slice(-6) + "  ";
      var ascii = "";
      for (var i = 0; i < 16; i++) {
        var v = bytes[(addr + i) % bytes.length];
        s += ("0" + v.toString(16).toUpperCase()).slice(-2) + (i === 7 ? "  " : " ");
        ascii += v >= 32 && v < 127 ? String.fromCharCode(v) : ".";
      }
      c.fillStyle = o.addrColor || "#7e8794";
      c.fillText(s.slice(0, 8), x, y + r * (size + 4));
      c.fillStyle = o.color || "#cfd6de";
      c.fillText(s.slice(8), x + c.measureText("000000  ").width, y + r * (size + 4));
      c.fillStyle = o.asciiColor || "#8b949e";
      c.fillText(ascii, x + c.measureText("000000  " + s.slice(8).replace(/^\s+/, " ")).width + 12, y + r * (size + 4));
    }
    c.restore();
  };

  Hud.prototype.rect = function (x, y, w, h, o) {
    o = o || {};
    var c = o.ctx || this.fc;
    c.save();
    c.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
    if (o.fill) { c.fillStyle = o.fill; c.fillRect(x, y, w, h); }
    if (o.stroke) { c.strokeStyle = o.stroke; c.lineWidth = o.lw || 1; c.strokeRect(x + .5, y + .5, w - 1, h - 1); }
    c.restore();
  };

  Hud.prototype.line = function (x0, y0, x1, y1, o) {
    o = o || {};
    var c = o.ctx || this.fc;
    c.save();
    c.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
    c.strokeStyle = o.color || COL.grey; c.lineWidth = o.lw || 1;
    if (o.dash) c.setLineDash(o.dash);
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.restore();
  };

  Hud.prototype.clear = function (which) {
    if (which !== "pan") { this.fc.setTransform(1, 0, 0, 1, 0, 0); this.fc.clearRect(0, 0, this.W, this.H); this.dirtyFull = true; }
    if (which !== "full") { this.pc.setTransform(1, 0, 0, 1, 0, 0); this.pc.clearRect(0, 0, this.panC.width, this.panC.height); this.dirtyPan = true; }
  };

  // panel i (0..NW*NH-1) -> local canvas context, origin at panel top-left
  Hud.prototype.panel = function (i) {
    var cx = (i % this.NW) * this.CW, cy = ((i / this.NW) | 0) * this.CH;
    var c = this.pc;
    c.setTransform(1, 0, 0, 1, cx, cy);
    var self = this;
    this.panDirty = true;
    var u0 = cx / this.panC.width, v0 = cy / this.panC.height;
    var u1 = (cx + this.CW) / this.panC.width, v1 = (cy + this.CH) / this.panC.height;
    return {
      ctx: c, x: cx, y: cy, w: this.CW, h: this.CH, u0: u0, v0: v0, u1: u1, v1: v1,
      // quad UV rect: texture v=0 is the canvas TOP row, and the quad's local +y
      // is its top edge, so the rect runs from v1 (bottom) up to v0 (top)
      rect: [u0, v1, u1, v0],
      clear: function (bg) {
        var o = c.globalAlpha; c.globalAlpha = 1; c.setTransform(1, 0, 0, 1, 0, 0);
        if (bg) { c.fillStyle = bg; c.fillRect(cx, cy, self.CW, self.CH); }
        else c.clearRect(cx, cy, self.CW, self.CH);
        c.setTransform(1, 0, 0, 1, cx, cy); c.globalAlpha = o;
      }
    };
  };

  Hud.prototype.uploadPan = function (res) {
    var gl = res.gl;
    if (!this.panC) return;
    if (!this.tPan) this.tPan = res.tex("hudPan", { canvas: this.panC });
    else {
      gl.bindTexture(gl.TEXTURE_2D, this.tPan.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, this.panC);
    }
    this.panDirty = false;
  };

  Hud.prototype.upload = function (res) {
    var gl = res.gl;
    if (!this.tFull) this.tFull = res.tex("hudFull", { canvas: this.full, filter: gl.LINEAR, wrap: gl.CLAMP_TO_EDGE });
    else { gl.bindTexture(gl.TEXTURE_2D, this.tFull.tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, this.full); }
    // the panel atlas is only re-uploaded while something is actually drawing into it
    if (this.panDirty || !this.tPan) this.uploadPan(res);
    this.dirtyFull = false;
  };

  WEM.Hud = Hud;
  WEM.HUD = { COL: COL, FONTS: FONTS, tokenize: tokenize, parseMath: parseMath, makeSeq: makeSeq };
})();
