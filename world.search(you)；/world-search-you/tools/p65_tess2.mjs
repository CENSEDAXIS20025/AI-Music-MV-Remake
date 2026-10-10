import fs from "node:fs";
const p = "src/sections/a_01_05.js";
let s = fs.readFileSync(p, "utf8");
s = s.replace("      var rad = 7.9 - slam * 1.2 + Math.sin(t * 0.35) * 0.55;   // pulled back a little",
              "      var rad = 9.4 - slam * 1.1 + Math.sin(t * 0.35) * 0.45;   // the cube must fit the frame");
s = s.replace("      var sc = 0.88, w4 = 1.9 + Math.sin(t * 0.7) * 0.35;   // the hypercube no longer overflows",
              "      var sc = 0.55, w4 = 1.9 + Math.sin(t * 0.7) * 0.35;   // the hypercube now fits the frame");
fs.writeFileSync(p, s);
console.log("scale 0.55, camera 9.4");
