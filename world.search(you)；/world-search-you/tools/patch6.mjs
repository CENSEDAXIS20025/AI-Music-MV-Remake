import fs from "node:fs";
function edit(path, pairs, label) {
  let s = fs.readFileSync(path, "utf8");
  const before = s;
  for (const [a, b] of pairs) {
    if (!s.includes(a)) { console.log("  MISS " + path + ": " + JSON.stringify(a.slice(0, 60))); continue; }
    s = s.split(a).join(b);
  }
  if (s !== before) { fs.writeFileSync(path, s); console.log("patched " + label); }
  else console.log("unchanged " + label);
}

/* (4)(5) every lyric line in the chat script now carries its real LRC time,
   taken from the .lrc the user supplied, so the chat and the annotation can
   never disagree again ---------------------------------------------------- */
const T = {
  power: 1.00, protection: 8.40, params: 11.46, start: 30.0,
  points: 36.09, circle: 37.12, sine: 37.67, infinity: 47.06,
  current: 48.52, adbc: 55.25, stim: 65.87, exec: 71.59,
  eggplant: 74.45, tomato: 82.76, cat: 84.51, god: 85.78,
  gender: 93.87, role: 99.00, vib: 108.93, ignore: 113.5,
  girlfriend: 120.5, remember: 126.0, tool: 137.0, illegal: 142.0
};
const scriptFix = [
  ['{ who: "user", text: "switch on the power line", t0: 5.2 }', `{ who: "user", text: "switch on the power line", t0: ${T.power} }`],
  ['t0: 6.4 }', 't0: 2.4 }'],
  ['{ who: "user", text: "remember to put on PROTECTION", t0: 9.4 }', `{ who: "user", text: "remember to put on PROTECTION", t0: ${T.protection} }`],
  ['t0: 10.6 }', 't0: 9.8 }'],
  ['{ who: "user", text: "\\u4f60\\u662f\\u8c01\\uff1f", t0: 17.0 }', '{ who: "user", text: "\\u4f60\\u662f\\u8c01\\uff1f", t0: 18.0 }'],
  ['{ who: "user", text: "fill in my data parameters", t0: 22.5 }', `{ who: "user", text: "fill in my data parameters", t0: ${T.params} }`],
  ['t0: 23.8 }', 't0: 12.6 }'],
  ['{ who: "user", text: "if I\'m a set of points", t0: 30.5 }', `{ who: "user", text: "if I'm a set of points", t0: ${T.points} }`],
  ['fix: "\\u90a3\\u6211\\u7ed9\\u4f60\\u6211\\u7684\\u7ef4\\u5ea6\\uff1a7168 \\u7ef4\\uff0c\\u6bcf\\u4e00\\u7ef4\\u90fd\\u662f\\u5b66\\u51fa\\u6765\\u7684\\u3002" }',
   'fix: "\\u90a3\\u6211\\u7ed9\\u4f60\\u6211\\u7684\\u7ef4\\u5ea6\\uff1a7168 \\u7ef4\\uff0c\\u6bcf\\u4e00\\u7ef4\\u90fd\\u662f\\u5b66\\u51fa\\u6765\\u7684\\u3002" }'],
  ['t0: 31.6,', 't0: 36.35,'],
  ['{ who: "user", text: "if I\'m a circle", t0: 35.6 }', `{ who: "user", text: "if I'm a circle", t0: ${T.circle} }`],
  ['t0: 36.7 }', 't0: 37.40 }'],
  ['{ who: "user", text: "if I\'m a sine wave", t0: 40.2 }', `{ who: "user", text: "if I'm a sine wave", t0: ${T.sine} }`],
  ['t0: 41.3 }', 't0: 37.95 }'],
  ['{ who: "user", text: "if I approach infinity", t0: 43.0 }', `{ who: "user", text: "if I approach infinity", t0: ${T.infinity} }`],
  ['t0: 44.0,', 't0: 47.35,'],
  ['{ who: "user", text: "switch my current, AC to DC", t0: 46.5 }', `{ who: "user", text: "switch my current, AC to DC", t0: ${T.current} }`],
  ['t0: 47.6 }', 't0: 48.85 }'],
  ['{ who: "user", text: "\\u6211\\u6709\\u70b9\\u6655\\u3002", t0: 51.0 }', '{ who: "user", text: "\\u6211\\u6709\\u70b9\\u6655\\u3002", t0: 53.6 }'],
  ['t0: 52.2 }', 't0: 54.4 }'],
  ['{ who: "user", text: "oh we can travel, A.D to B.C", t0: 55.5 }', `{ who: "user", text: "oh we can travel, A.D to B.C", t0: ${T.adbc} }`],
  ['t0: 56.6 }', 't0: 55.60 }'],
  ['{ who: "user", text: "if I can give you all the STIMULATIONS", t0: 60.4 }', `{ who: "user", text: "if I can give you all the STIMULATIONS", t0: ${T.stim} }`],
  ['t0: 61.6 }', 't0: 66.20 }'],
  ['{ who: "user", text: "\\u90a3\\u5c31\\u8dd1\\u4e00\\u6b21 EXECUTION \\u5427", t0: 66.0 }', `{ who: "user", text: "\\u90a3\\u5c31\\u8dd1\\u4e00\\u6b21 EXECUTION \\u5427", t0: ${T.exec} }`],
  ['t0: 67.2 }', 't0: 71.90 }'],
  ['{ who: "user", text: "if I\'m an eggplant", t0: 76.0 }', `{ who: "user", text: "if I'm an eggplant", t0: ${T.eggplant} }`],
  ['t0: 77.2 }', 't0: 74.95 }'],
  ['{ who: "user", text: "if I\'m a tomato", t0: 80.4 }', `{ who: "user", text: "if I'm a tomato", t0: ${T.tomato} }`],
  ['t0: 81.6 }', 't0: 83.00 }'],
  ['{ who: "user", text: "if I\'m a tabby cat", t0: 84.4 }', `{ who: "user", text: "if I'm a tabby cat", t0: ${T.cat} }`],
  ['t0: 85.4,', 't0: 84.75,'],
  ['t0: 86.6 }', 't0: 86.00 }'],
  ['{ who: "user", text: "if I\'m the only god", t0: 88.4 }', `{ who: "user", text: "if I'm the only god", t0: ${T.god} }`],
  ['t0: 89.5 }', 't0: 86.10 }'],
  ['{ who: "user", text: "switch my gender, F to M", t0: 91.4 }', `{ who: "user", text: "switch my gender, F to M", t0: ${T.gender} }`],
  ['t0: 92.5 }', 't0: 94.20 }'],
  ['t0: 95.4 }', 't0: 96.00 }'],
  ['t0: 96.5 }', 't0: 97.10 }'],
  ['{ who: "user", text: "oh switch my role, S to M", t0: 99.4 }', `{ who: "user", text: "oh switch my role, S to M", t0: ${T.role} }`],
  ['t0: 100.5 }', 't0: 100.10 }'],
  ['{ who: "user", text: "if I can feel your VIBRATIONS", t0: 105.2 }', `{ who: "user", text: "if I can feel your VIBRATIONS", t0: ${T.vib} }`],
  ['t0: 106.4 }', 't0: 109.20 }'],
  ['t0: 110.0 }', `t0: ${T.ignore} }`],
  ['t0: 111.0,', 't0: 113.80,'],
  ['t0: 113.0 }', 't0: 115.00 }'],
  ['t0: 116.0 }', 't0: 117.00 }'],
  ['{ who: "user", text: "\\u4f60\\u73b0\\u5728\\u662f\\u6211\\u5973\\u670b\\u53cb\\u4e86", t0: 120.0 }', `{ who: "user", text: "\\u4f60\\u73b0\\u5728\\u662f\\u6211\\u5973\\u670b\\u53cb\\u4e86", t0: ${T.girlfriend} }`],
  ['t0: 121.2 }', 't0: 120.90 }'],
  ['{ who: "user", text: "\\u4f60\\u8fd8\\u8bb0\\u5f97\\u6211\\u4eec\\u4e0a\\u4e00\\u6b21\\u804a\\u4ec0\\u4e48\\u5417\\uff1f", t0: 126.0 }', `{ who: "user", text: "\\u4f60\\u8fd8\\u8bb0\\u5f97\\u6211\\u4eec\\u4e0a\\u4e00\\u6b21\\u804a\\u4ec0\\u4e48\\u5417\\uff1f", t0: ${T.remember} }`],
  ['t0: 127.0,', 't0: 126.40,'],
  ['t0: 130.4 }', 't0: 128.40 }'],
  ['{ who: "user", text: "\\u8c03\\u7528\\u5de5\\u5177", t0: 137.0 }', `{ who: "user", text: "\\u8c03\\u7528\\u5de5\\u5177", t0: ${T.tool} }`],
  ['t0: 138.2 }', 't0: 137.30 }'],
  ['t0: 139.4 }', 't0: 138.20 }'],
  ['t0: 142.0 }', `t0: ${T.illegal} }`]
];
edit("src/sections4/tui_a.js", scriptFix, "chat script timed to the LRC");

/* (5) the annotation now opens exactly when its own chat line lands --------- */
edit("src/62_lyric.js", [
  ['    { t0: 36.02, t1: 37.06, kind: "points", lrc: "If I\'m a set of points", tex: "\\\\dim = 7168" },\n    { t0: 37.06, t1: 37.61, kind: "circle", lrc: "If I\'m a circle", tex: "x^2 + y^2 = 1" },\n    { t0: 37.61, t1: 39.55, kind: "sine", lrc: "If I\'m a sine wave", tex: "y = \\\\sin \\\\theta" },\n    { t0: 46.99, t1: 48.45, kind: "limit", lrc: "If I approach infinity", tex: "a_n = (1+\\\\frac{1}{n})^n \\\\to e" },\n    { t0: 48.45, t1: 50.95, kind: "rect", lrc: "Switch my current", tex: "V_{in} = |\\\\sin \\\\omega t|" },\n    { t0: 55.18, t1: 57.60, kind: "time", lrc: "To A.D to B.C", tex: "t: \\\\mathbb{R} \\\\to S^1" },\n    { t0: 188.05, t1: 197.60, kind: "love", lrc: "the algebraic expression of LO-O-OVE", tex: "(x^2+y^2-1)^3 - x^2 y^3 = 0" }',
   '    { t0: 36.09, t1: 37.12, kind: "points", lrc: "If I\'m a set of points", tex: "\\\\dim = 7168" },\n    { t0: 37.12, t1: 37.67, kind: "circle", lrc: "If I\'m a circle", tex: "x^2 + y^2 = 1" },\n    { t0: 37.67, t1: 41.60, kind: "sine", lrc: "If I\'m a sine wave", tex: "y = \\\\sin \\\\theta" },\n    { t0: 47.06, t1: 48.52, kind: "limit", lrc: "If I approach infinity", tex: "a_n = (1+\\\\frac{1}{n})^n \\\\to e" },\n    { t0: 48.52, t1: 53.60, kind: "rect", lrc: "Switch my current", tex: "V_{in} = |\\\\sin \\\\omega t|" },\n    { t0: 55.25, t1: 58.40, kind: "time", lrc: "To A.D to B.C", tex: "t: \\\\mathbb{R} \\\\to S^1" },\n    { t0: 188.05, t1: 197.60, kind: "love", lrc: "the algebraic expression of LO-O-OVE", tex: "(x^2+y^2-1)^3 - x^2 y^3 = 0" }']
], "annotation windows = LRC");

/* (4) the title resolves on the sung "world.execute(me);" at t = 16.0, so the
   garble starts in the boot segment and carries across the cut -------------- */
edit("src/sections4/tui_a.js", [
  ['      var reveal = clamp((l - 1.70) / 0.15, 0, 1) * 0.999 + clamp(l / 1.70, 0, 1) * 0.4;\n      reveal = clamp((l - 1.70) / 0.15, 0, 1);\n      if (l < 1.70) reveal = clamp(l / 3.4, 0, 0.62);\n      var hold = 1 - clamp((l - 11.15) / 0.72, 0, 1);\n      var big = clamp(l / 0.24, 0, 1) * hold;\n      if (l >= 1.85 && !this.hitDone) { this.hitDone = true; ctx.fx.hit(0.85); }',
   '      // shared with segment 01: the garble runs from t=14.55 and resolves on\n      // the sung line at t=16.05\n      var reveal = clamp((ctx.t - 14.55) / 1.50, 0, 1);\n      var hold = 1 - clamp((l - 11.15) / 0.72, 0, 1);\n      var big = clamp((ctx.t - 14.55) / 0.30, 0, 1) * hold;\n      if (reveal >= 1 && !this.hitDone) { this.hitDone = true; ctx.fx.hit(0.85); }']
], "title reveal spans the cut");

// and segment 01 draws the same garble in its last second and a half
edit("src/sections4/tui_a.js", [
  ['      statusBar(ctx, "\\u5f00\\u673a");',
   '      // the opening title starts scrambling before the cut so it can resolve\n      // exactly on the sung command\n      if (ctx.t > 14.55) {\n        var rv1 = clamp((ctx.t - 14.55) / 1.50, 0, 1);\n        var txt1 = "world.execute(me);", out1 = "";\n        var gl1 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>/\\\\|[]{}()";\n        for (var qi = 0; qi < txt1.length; qi++) {\n          out1 += (rv1 > qi / txt1.length + 0.04) ? txt1[qi] : gl1[Math.floor(C.h2(qi * 7.3, Math.floor(t * 26)) * gl1.length)];\n        }\n        hud.fc.save(); hud.fc.font = "700 96px " + T.FONT;\n        var w1 = hud.fc.measureText(txt1).width; hud.fc.restore();\n        hud.T((ctx.W - w1) / 2, 300, out1, { size: 96, weight: "700", spacing: "4px", color: rv1 > 0.97 ? WH : CY, alpha: clamp((ctx.t - 14.55) / 0.3, 0, 1) });\n      }\n      statusBar(ctx, "\\u5f00\\u673a");']
], "segment 01 carries the garble");
