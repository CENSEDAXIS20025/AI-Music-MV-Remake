import fs from "node:fs";
// 1. sections: swap the always-on strip/3D for the lyric-gated ones
for (const f of ["src/sections4/tui_a.js", "src/sections4/tui_b.js"]) {
  let s = fs.readFileSync(f, "utf8");
  s = s.split("WEM.Gadgets.strip(ctx, ctx.hud, 766, 812, ctx.W - 812, 116, ctx.t);")
       .join("WEM.Lyric.draw(ctx, ctx.hud, ctx.t);");
  s = s.split("draw3d: function (ctx) { WEM.Gadgets.threeD(ctx); }")
       .join("draw3d: function (ctx) { WEM.Lyric.draw3d(ctx); }");
  fs.writeFileSync(f, s);
}
let g = fs.readFileSync("src/61_gadgets.js", "utf8");
const before = g;
const reps = [
  ["var av = 9;", "var av = 14;"],
  ["c.beginPath(); c.arc(x + 26, y + 23, 12, 0, Math.PI * 2); c.fill();",
   "c.beginPath(); c.arc(x + 30, y + 23, 16, 0, Math.PI * 2); c.fill();"],
  ['c.fillText("\\u5979", x + 26, y + 28);', 'c.fillText("\\u5979", x + 30, y + 29);'],
  ['c.font = "600 13px " + CJK; c.textAlign = "center";', 'c.font = "600 16px " + CJK; c.textAlign = "center";'],
  ['c.fillText("deepseek", x + 46, y + 22);', 'c.fillText("deepseek", x + 56, y + 22);'],
  ["x + 46, y + 38);", "x + 56, y + 38);"],
  ["c.beginPath(); c.arc(x + w - av - 6, cy + 14, av, 0, Math.PI * 2); c.fill();",
   "c.beginPath(); c.arc(x + w - av - 8, cy + av, av, 0, Math.PI * 2); c.fill();"],
  ['c.fillText("\\u4f60", x + w - av - 6, cy + 18);', 'c.fillText("\\u4f60", x + w - av - 8, cy + av + 5);'],
  ["c.beginPath(); c.arc(x + 22 + av, cy + 14, av, 0, Math.PI * 2); c.fill();",
   "c.beginPath(); c.arc(x + 22 + av, cy + av, av, 0, Math.PI * 2); c.fill();"],
  ['c.fillText("\\u5979", x + 22 + av, cy + 18);', 'c.fillText("\\u5979", x + 22 + av, cy + av + 5);'],
  ['c.font = "600 10px " + CJK;\n          c.textAlign = "center"; c.fillText("\\u4f60"',
   'c.font = "600 13px " + CJK;\n          c.textAlign = "center"; c.fillText("\\u4f60"'],
  ['c.font = "600 10px " + CJK;\n          c.textAlign = "center"; c.fillText("\\u5979"',
   'c.font = "600 13px " + CJK;\n          c.textAlign = "center"; c.fillText("\\u5979"'],
  ['c.font = "14px " + CJK;\n        c.textAlign = "center";', 'c.font = "18px " + CJK;\n        c.textAlign = "center";']
];
for (const [a, b] of reps) {
  if (!g.includes(a)) console.log("MISS:", JSON.stringify(a.slice(0, 46)));
  g = g.split(a).join(b);
}
fs.writeFileSync("src/61_gadgets.js", g);
console.log("gadgets patched:", before !== g);
