import fs from "node:fs";
const p = "src/sections/b_06_10.js";
let s = fs.readFileSync(p, "utf8");
const a = "          var r = M4.rotAxis(axis, -hinge * (i === 1 || i === 3 ? -1 : 1) * (i === 2 || i === 3 ? -1 : 1));";
if (!s.includes(a)) { console.log("MISS hinge sign"); process.exit(1); }
// the sign expression evaluated to +1,-1,-1,+1, so two of the four side faces
// folded the wrong way. The hinge axis already flips with the face direction,
// so one uniform sign is the correct one.
s = s.replace(a, "          var r = M4.rotAxis(axis, -hinge);   // uniform: the axis already flips with d");
// drop the no-op translation that was left behind
s = s.replace("          mm = M4.mul(mm, M4.trans(0, i === 1 || i === 3 ? 0 : 0, 0));\n", "");
fs.writeFileSync(p, s);
console.log("cube-net hinge corrected");
