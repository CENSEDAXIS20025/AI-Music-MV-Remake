import fs from "node:fs";
function edit(path, pairs, label) {
  let s = fs.readFileSync(path, "utf8");
  const before = s;
  for (const [a, b] of pairs) {
    if (!s.includes(a)) { console.log("  MISS " + path + ": " + JSON.stringify(a.slice(0, 56))); continue; }
    s = s.split(a).join(b);
  }
  if (s !== before) { fs.writeFileSync(path, s); console.log("patched " + label); }
  else console.log("unchanged " + label);
}
// the weight heat map walked past the end of the tensor and rendered the string
// "undefined" across the panel
edit("src/sections4/tui_a.js", [
  ['      T.heat(hud, 0, 1, q.x, q.y, function (c, r) {\n        return Math.abs(cur.w[(r * cols + c) * 3]) / wmax;\n      }, cols, rows2, { color: "rgba(53,224,255,0.9)", size: 13 });',
   '      T.heat(hud, 0, 1, q.x, q.y, function (c, r) {\n        var wi = (r * cols + c) * 3;\n        if (wi >= cur.w.length) return 0;\n        return Math.abs(cur.w[wi]) / wmax;\n      }, cols, rows2, { color: "rgba(53,224,255,0.9)", size: 13 });']
], "weight heat bounds");
// and the same guard inside T.heat itself, so no panel can ever print "undefined"
edit("src/60_tui.js", [
  ['          var v = clamp(get(c, r), 0, 1);\n          line += SHADE[Math.min(3, Math.floor(v * 3.999))];',
   '          var v = clamp(get(c, r), 0, 1);\n          if (!isFinite(v)) v = 0;\n          line += SHADE[Math.min(3, Math.floor(v * 3.999))] || " ";']
], "heat guard");
