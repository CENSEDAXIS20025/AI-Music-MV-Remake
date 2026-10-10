import fs from "node:fs";
const p = "src/sections/a_01_05.js";
let s = fs.readFileSync(p, "utf8");
const a = "      if (barT < 0.06) ctx.fx.hit(1.0);\n      if (barT < 0.10) ctx.fx.glitch = Math.max(ctx.fx.glitch, 0.7);";
if (!s.includes(a)) { console.log("MISS equation flash"); process.exit(1); }
s = s.replace(a,
  "      // equation switch: a much softer accent -- a full hit every bar was blinding\n" +
  "      if (barT < 0.06) ctx.fx.hit(0.32);\n" +
  "      if (barT < 0.10) ctx.fx.glitch = Math.max(ctx.fx.glitch, 0.28);");
fs.writeFileSync(p, s);
console.log("equation-switch flash softened (1.0 -> 0.32, glitch 0.7 -> 0.28)");
