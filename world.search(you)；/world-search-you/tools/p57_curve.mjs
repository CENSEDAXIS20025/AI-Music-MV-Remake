import fs from "node:fs";
// the meter curve should be tunable per page, so v1's taller bars do not
// change the V3 film, whose meter was already tuned
let bar = fs.readFileSync("src/50_audiobar.js", "utf8");
const old = "        var lit = Math.pow(clamp(v * w * 1.30 * abg, 0, 1), 0.45) * SEG * 1.04 + 0.35;";
if (!bar.includes(old)) { console.log("MISS lit"); process.exit(1); }
bar = bar.replace(old,
  "        var abe = (typeof window !== \"undefined\" && window.WEM_AB_EXPO) || 0.70;\n" +
  "        var abm = (typeof window !== \"undefined\" && window.WEM_AB_MUL) || 1.06;\n" +
  "        var lit = Math.pow(clamp(v * w * abm * abg, 0, 1), abe) * SEG * 1.04 + 0.35;");
fs.writeFileSync("src/50_audiobar.js", bar);
console.log("meter curve is now per page");

for (const f of ["index.html", "tools/bundle.mjs"]) {
  let s = fs.readFileSync(f, "utf8");
  if (s.includes("WEM_AB_EXPO")) { console.log(f + " already set"); continue; }
  s = s.replace("window.WEM_AB_GAIN = 0.88;",
    "window.WEM_AB_GAIN = 0.88;\n  window.WEM_AB_EXPO = 0.45;   // taller bars\n  window.WEM_AB_MUL = 1.30;");
  fs.writeFileSync(f, s);
  console.log(f + " -> v1 meter curve");
}
