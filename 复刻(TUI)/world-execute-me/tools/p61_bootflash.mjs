import fs from "node:fs";
const p = "src/sections/a_01_05.js";
let s = fs.readFileSync(p, "utf8");
const a = "      if (t < 1.0 && b.pulse > 0.1) ctx.fx.flash = Math.max(ctx.fx.flash, b.pulse * 0.25);";
if (!s.includes(a)) { console.log("MISS boot flash"); process.exit(1); }
// beats are 0.46 s apart, so "flash while t < 1.0" fired twice; fire once
s = s.replace(a,
  "      // one flash on the first beat only: the beat grid is 0.46 s, so a\n" +
  "      // t < 1.0 window used to fire twice\n" +
  "      if (!WEM._bootFlashed && t >= 0.28) { WEM._bootFlashed = 1; ctx.fx.flash = Math.max(ctx.fx.flash, 0.34); }");
fs.writeFileSync(p, s);
console.log("boot flash is now single-shot");
