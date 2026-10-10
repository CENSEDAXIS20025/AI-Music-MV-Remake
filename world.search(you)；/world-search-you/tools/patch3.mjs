import fs from "node:fs";
const U = (s) => s;   // identity, keeps the strings below readable
function edit(path, pairs, label) {
  let s = fs.readFileSync(path, "utf8");
  const before = s;
  for (const [a, b] of pairs) {
    if (!s.includes(a)) { console.log("  MISS in " + path + ": " + JSON.stringify(a.slice(0, 54))); continue; }
    s = s.split(a).join(b);
  }
  if (s !== before) { fs.writeFileSync(path, s); console.log("patched " + label); }
  else console.log("unchanged " + label);
}

/* ---------------------------------------------------------- 61_gadgets --- */
edit("src/61_gadgets.js", [
  // (10) the model's name in the header, with the end-of-training rename
  ['      c.fillStyle = "rgba(236,242,248,0.97)"; c.font = "600 15px " + CJK;\n      c.fillText("deepseek", x + 56, y + 22);',
   '      c.fillStyle = "rgba(236,242,248,0.97)"; c.font = "600 15px " + CJK;\n      var nm = o.name || "deepseek";\n      if (o.erase > 0) {\n        // wipe the training name from the left, then type the shipped one\n        var keep = Math.floor(nm.length * (1 - o.erase));\n        nm = nm.slice(0, keep);\n        if (o.erase >= 1) nm = (o.typed || "") + (Math.floor(t * 2) % 2 ? "\\u2588" : "");\n      }\n      c.fillText(nm, x + 56, y + 22);'],
  // (9) a scale-in for panels that ask for it
  ['      if (bg) hud.rect(x, y, w, h, { fill: bg });',
   '      if (o.pop !== undefined && o.pop < 1) {\n        c.save(); c.translate(x + w / 2, y + h / 2); c.scale(0.90 + o.pop * 0.10, 0.90 + o.pop * 0.10);\n        c.translate(-(x + w / 2), -(y + h / 2));\n      }\n      if (bg) hud.rect(x, y, w, h, { fill: bg });']
], "gadgets: header name + panel pop");

/* ------------------------------------------------------------ tui_a.js --- */
edit("src/sections4/tui_a.js", [
  // (6) the GUI types the command in the last seconds of the boot segment
  ['      statusBar(ctx, "\\u5f00\\u673a");',
   '      // (6) just before the opening, the GUI is where the command is typed\n      if (l > 11.0) {\n        var cmd = "world.execute(me);";\n        var nn = clamp(Math.floor((l - 11.2) * 6.2), 0, cmd.length);\n        if (nn > 0) {\n          WEM.Gadgets.guiChat(hud, 46, 96, 690, 838,\n            [{ who: "user", text: cmd.slice(0, nn), t0: 0 }], t,\n            { title: "deepseek \\u00b7 dsh", name: "deepseek-v4.1-flash-expires-on-0910",\n              sub: "\\u5728\\u7ebf \\u00b7 \\u7b49\\u5f85\\u6307\\u4ee4", inputText: nn < cmd.length ? "" : "", hint: "" });\n        }\n      }\n      statusBar(ctx, "\\u5f00\\u673a");'],
  // (1)(3)(4)(5) the opening: one flash, slower decode, long hold, code and
  // title leave together, chat only after the interlude
  ['      var reveal = clamp(l / 0.92, 0, 1);\n      var big = clamp(l / 0.28, 0, 1) * (1 - clamp((l - 6.9) / 0.85, 0, 1));\n      if (reveal >= 1 && !this.hitDone) { this.hitDone = true; ctx.fx.hit(0.8); }\n      if (l >= 7.75 && !this.cutDone) { this.cutDone = true; ctx.fx.hit(0.6); }',
   '      // the glyphs stay scrambled for a slow 1.7 s and then snap on the bar-9\n      // downbeat (t = 17.824); the frame then holds until the interlude ends\n      var reveal = clamp((l - 1.70) / 0.15, 0, 1) * 0.999 + clamp(l / 1.70, 0, 1) * 0.4;\n      reveal = clamp((l - 1.70) / 0.15, 0, 1);\n      if (l < 1.70) reveal = clamp(l / 3.4, 0, 0.62);\n      var hold = 1 - clamp((l - 11.15) / 0.72, 0, 1);\n      var big = clamp(l / 0.24, 0, 1) * hold;\n      if (l >= 1.85 && !this.hitDone) { this.hitDone = true; ctx.fx.hit(0.85); }'],
  ['      if (l > 4.4 && l < 7.0) {', '      if (l > 4.4 && l < 8.4) {'],
  // the code panel: no frame, no title, dimmer, and it leaves with the title
  ['      if (l < 7.9) {', '      if (l < 11.9) {'],
  ['        var cp = T.frame(hud, 60, 560, 640, 300, "\\u4e16\\u754c\\u7684\\u6e90\\u7801", { edge: "rgba(255,90,80,0.55)" });\n        var nShown = Math.floor(clamp(l / 6.4, 0, 1) * codeIn.length);',
   '        // (2) no frame and no title, and dimmer: it is texture, not a panel\n        var cp = { x: 68, y: 574 };\n        var nShown = Math.floor(clamp((l - 1.9) / 9.2, 0, 1) * codeIn.length);'],
  ['          hud.code(cp.x, cp.y + 20 + ci * 24, partial, ["python", "python", "python", "python", "python", "glsl", "rust", "sql", "haskell", "asm"][ci],\n            { size: 14, alpha: 0.95 });',
   '          hud.code(cp.x, cp.y + 20 + ci * 24, partial, ["python", "python", "python", "python", "python", "glsl", "rust", "sql", "haskell", "asm"][ci],\n            { size: 14, alpha: 0.42 * hold });'],
  ['        if (nShown < codeIn.length && Math.floor(t * 3) % 2 === 0) {\n          hud.T(cp.x + hud.codeWidth(codeIn[nShown].slice(0, 1), "python", 14) * 0 + 6, cp.y + 20 + (nShown + 1) * 24 - 18, "\\u2588", { size: 13, color: CY });\n        }',
   '        if (nShown < codeIn.length && Math.floor(t * 3) % 2 === 0) {\n          hud.T(cp.x + 6, cp.y + 20 + (nShown + 1) * 24 - 18, "\\u2588", { size: 13, color: CY, alpha: 0.5 * hold });\n        }'],
  // (5) the chat returns only once the interlude is over
  ['      if (l >= 7.75) chatAt(ctx, { title: "deepseek \\u00b7 dsh \\u00b7 \\u521d\\u59cb\\u5316" });',
   '      if (l >= 11.9) chatAt(ctx, { title: "deepseek \\u00b7 dsh \\u00b7 \\u521d\\u59cb\\u5316", name: "deepseek-v4.1-flash-expires-on-0910" });']
], "tui_a: opening sequence");

/* ------------------------------------------------------------ tui_b.js --- */
edit("src/sections4/tui_b.js", [
  // (8) popups ride the screen shake but no longer jitter on their own, and
  // they land on beats
  ['      var jx = Math.sin(t * 23) * shake, jy = Math.cos(t * 19) * shake;',
   '      var B0 = ctx.data.phase0, BP = ctx.data.period;\n      var beatAt = function (abs) { return B0 + Math.ceil((abs - B0) / BP - 1e-6) * BP - (ctx.data.sections[10].start); };'],
  ['        var da = clamp((l - dg.t0) / 0.35, 0, 1);',
   '        var dgb = beatAt(ctx.data.sections[10].start + dg.t0);\n        var da = clamp((l - dgb) / 0.22, 0, 1);'],
  ['        WEM.Gadgets.popup(hud, dg.x + jx, dg.y + jy, 400, 130, dg.title, [dg.l1, dg.l2],',
   '        WEM.Gadgets.popup(hud, dg.x, dg.y, 400, 130, dg.title, [dg.l1, dg.l2],'],
  ['            px2 + Math.sin(t * 29 + pi * 1.3) * jit,\n            py2 + Math.cos(t * 25 + pi * 2.1) * jit,',
   '            px2, py2,'],
  // (9) the reward panel had the KL label sitting on its own bar
  ['      T.cjk(hud, p.x, p.y + 66, "\\u4e0e\\u57fa\\u51c6\\u7684 KL " + (0.4 + step * 0.06).toFixed(2).padStart(7) + "   \\u2190 \\u6b63\\u5728\\u53d1\\u6563", { size: 14, color: RE });\n      T.bar(hud, 12, 3, p.x, p.y, 40, clamp((0.4 + step * 0.06) / 4, 0, 1), { color: RE });',
   '      T.cjk(hud, p.x, p.y + 66, "\\u4e0e\\u57fa\\u51c6\\u7684 KL " + (0.4 + step * 0.06).toFixed(2).padStart(7) + "   \\u2190 \\u6b63\\u5728\\u53d1\\u6563", { size: 14, color: RE });\n      T.bar(hud, 0, 5, p.x, p.y, 52, clamp((0.4 + step * 0.06) / 4, 0, 1), { color: RE });']
], "tui_b: popups + reward panel");

/* ----------------------------------------------------------- 62_lyric --- */
edit("src/62_lyric.js", [
  // (7)(11) each annotation holds until the next lyric names the next idea, and
  // the panel loses its opaque fill -- a flat dark plate was collecting the
  // film grain into visible blocks
  ['  var WINDOWS = [\n    { t0: 36.09, t1: 37.10, kind: "points", lrc: "If I\'m a set of points", tex: "\\\\dim = 7168" },\n    { t0: 37.12, t1: 37.65, kind: "circle", lrc: "If I\'m a circle", tex: "x^2 + y^2 = 1" },\n    { t0: 37.67, t1: 38.85, kind: "sine", lrc: "If I\'m a sine wave", tex: "y = \\\\sin \\\\theta" },\n    { t0: 47.06, t1: 48.50, kind: "limit", lrc: "If I approach infinity", tex: "a_n = (1+\\\\frac{1}{n})^n \\\\to e" },\n    { t0: 48.52, t1: 50.20, kind: "rect", lrc: "Switch my current", tex: "V_{in} = |\\\\sin \\\\omega t|" },\n    { t0: 55.25, t1: 56.90, kind: "time", lrc: "To A.D to B.C", tex: "t: \\\\mathbb{R} \\\\to S^1" },\n    { t0: 188.10, t1: 196.60, kind: "love", lrc: "the algebraic expression of LO-O-OVE", tex: "(x^2+y^2-1)^3 - x^2 y^3 = 0" }\n  ];',
   '  var WINDOWS = [\n    { t0: 36.02, t1: 37.06, kind: "points", lrc: "If I\'m a set of points", tex: "\\\\dim = 7168" },\n    { t0: 37.06, t1: 37.61, kind: "circle", lrc: "If I\'m a circle", tex: "x^2 + y^2 = 1" },\n    { t0: 37.61, t1: 39.55, kind: "sine", lrc: "If I\'m a sine wave", tex: "y = \\\\sin \\\\theta" },\n    { t0: 46.99, t1: 48.45, kind: "limit", lrc: "If I approach infinity", tex: "a_n = (1+\\\\frac{1}{n})^n \\\\to e" },\n    { t0: 48.45, t1: 50.95, kind: "rect", lrc: "Switch my current", tex: "V_{in} = |\\\\sin \\\\omega t|" },\n    { t0: 55.18, t1: 57.60, kind: "time", lrc: "To A.D to B.C", tex: "t: \\\\mathbb{R} \\\\to S^1" },\n    { t0: 188.05, t1: 197.60, kind: "love", lrc: "the algebraic expression of LO-O-OVE", tex: "(x^2+y^2-1)^3 - x^2 y^3 = 0" }\n  ];'],
  ['      c.globalAlpha = a;\n      c.fillStyle = "rgba(10,13,18,0.9)";\n      if (c.roundRect) { c.beginPath(); c.roundRect(px, py, pw, ph, 8); c.fill(); }\n      else c.fillRect(px, py, pw, ph);\n      c.strokeStyle = "rgba(255,201,74,0.35)"; c.lineWidth = 1.2;\n      if (c.roundRect) { c.beginPath(); c.roundRect(px, py, pw, ph, 8); c.stroke(); }',
   '      c.globalAlpha = a;\n      // no opaque plate -- only a hairline frame, so the grain has no flat\n      // field to clump in and the annotation reads as an overlay\n      c.strokeStyle = "rgba(255,201,74,0.30)"; c.lineWidth = 1.2;\n      if (c.roundRect) { c.beginPath(); c.roundRect(px, py, pw, ph, 8); c.stroke(); }\n      else c.strokeRect(px, py, pw, ph);']
], "lyric: windows + overlay frame");

/* ------------------------------------------------- chatAt name plumbing --- */
for (const f of ["src/sections4/tui_a.js", "src/sections4/tui_b.js"]) {
  edit(f, [
    ['    opt.lyric = ctx.lyric ? ctx.lyric.text : "";',
     '    opt.lyric = ctx.lyric ? ctx.lyric.text : "";\n    opt.name = modelName(ctx.t).name;\n    opt.erase = modelName(ctx.t).erase;\n    opt.typed = modelName(ctx.t).typed;']
  ], f + " chatAt name");
}
// one shared clock for the rename
edit("src/sections4/tui_a.js", [
  ['  function chatAt(ctx, opt) {',
   '  // (10) the run is named after the checkpoint being trained; when training\n  // finishes the name is wiped and the shipped one types itself in\n  var NAME0 = "deepseek-v4.1-flash-expires-on-0910", NAME1 = "deepseek-flash";\n  function modelName(t) {\n    var t0 = 198.6, dur = 3.2;\n    if (t < t0) return { name: NAME0, erase: 0, typed: "" };\n    var u = clamp((t - t0) / dur, 0, 1);\n    if (u < 0.30) return { name: NAME0, erase: u / 0.30, typed: "" };\n    var k = Math.floor(NAME1.length * (u - 0.30) / 0.70);\n    return { name: NAME1, erase: 1, typed: NAME1.slice(0, k) };\n  }\n  function chatAt(ctx, opt) {']
], "tui_a modelName");
