import fs from "node:fs";
const p = "src/sections/c_11_15.js";
let s = fs.readFileSync(p, "utf8");

// section 12 (blackhole, 162.3-177.1 s): the downbeat accent was 0.45
const a = "      if (b.isDownbeat) ctx.fx.hit(0.45);";
if (!s.includes(a)) { console.log("MISS downbeat 0.45"); process.exit(1); }
s = s.replace(a, "      if (b.isDownbeat) ctx.fx.hit(0.16);   // softer beat accent");

// and section 11's downbeat pair, same complaint class
const b1 = "        if (b.isDownbeat) { ctx.fx.flash = Math.max(ctx.fx.flash, 0.22); ctx.fx.hit(0.35); }";
if (s.includes(b1)) {
  s = s.replace(b1, "        if (b.isDownbeat) { ctx.fx.flash = Math.max(ctx.fx.flash, 0.10); ctx.fx.hit(0.14); }");
  console.log("section 11 downbeat softened too");
}
fs.writeFileSync(p, s);
console.log("section 12 downbeat hit 0.45 -> 0.16");
