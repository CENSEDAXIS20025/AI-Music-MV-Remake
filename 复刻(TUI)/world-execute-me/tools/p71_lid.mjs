import fs from "node:fs";
const p = "src/sections/b_06_10.js";
let s = fs.readFileSync(p, "utf8");
const a = "        var mTop = M4.mul(M4.trans(0, half * lerp(4.2, 1.0, fo), -half), M4.rotX(PI / 2));";
if (!s.includes(a)) { console.log("MISS top transform"); process.exit(1); }
// In the flat net the lid must be coplanar with the others and one more step
// out along -Z (the 5th square of the cross): y = -1.6, z = -1.5.
// Folded, it must sit centred on the cube: y = +0.5, z = 0.
const b = "        var mTop = M4.mul(M4.trans(0, lerp(-half * 3.2, half, fo), lerp(-half * 3.0, 0, fo)), M4.rotX(PI / 2));";
s = s.replace(a, b);
fs.writeFileSync(p, s);
console.log("lid: net (-1.6,-1.5) -> cube (+0.5, 0)");
