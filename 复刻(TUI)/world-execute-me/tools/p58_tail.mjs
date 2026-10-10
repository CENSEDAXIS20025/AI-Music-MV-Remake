import fs from "node:fs";
const p = "src/50_audiobar.js";
let s = fs.readFileSync(p, "utf8");
const a = "var lit = Math.pow(clamp(v * w * abm * abg, 0, 1), abe) * SEG * 1.04 + 0.35;";
if (!s.includes(a)) { console.log("MISS"); process.exit(1); }
// keep the tail constants at their original values so the V3 film is unchanged
s = s.replace(a, "var lit = Math.pow(clamp(v * w * abm * abg, 0, 1), abe) * SEG * 1.02 + 0.2;");
fs.writeFileSync(p, s);
console.log("V3 meter behaviour restored; v1 differs only by expo/mul");
