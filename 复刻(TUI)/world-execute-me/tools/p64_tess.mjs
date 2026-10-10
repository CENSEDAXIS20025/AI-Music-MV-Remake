import fs from "node:fs";
const p = "src/sections/a_01_05.js";
let s = fs.readFileSync(p, "utf8");
const a = "      var rad = 7.0 - slam * 1.5 + Math.sin(t * 0.35) * 0.7;";
const b = "      var sc = 1.35, w4 = 1.9 + Math.sin(t * 0.7) * 0.35;";
if (!s.includes(a) || !s.includes(b)) { console.log("MISS tesseract scale"); process.exit(1); }
s = s.replace(a, "      var rad = 7.9 - slam * 1.2 + Math.sin(t * 0.35) * 0.55;   // pulled back a little");
s = s.replace(b, "      var sc = 0.88, w4 = 1.9 + Math.sin(t * 0.7) * 0.35;   // the hypercube no longer overflows");
fs.writeFileSync(p, s);
console.log("hypercube scale 1.35 -> 0.88, camera pulled back");
