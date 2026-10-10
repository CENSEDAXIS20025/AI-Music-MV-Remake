import fs from "node:fs";
const p = "src/sections/b_06_10.js";
let s = fs.readFileSync(p, "utf8");

const a0 = `        // hinge chain: base face + 4 sides + top
        var baseAngle = lerp(PI / 2, 0, fo);
        var rotZ = M4.rotX(-baseAngle);
        var transforms = [];`;
const a1 = `        // hinge chain: base face + 4 sides + top.
        // The net starts FLAT and folds UP into a cube, so the hinge angle has
        // to run 0 -> 90 deg as fo goes 0 -> 1. It ran the other way round, so
        // the shape started as a cube and unfolded instead.
        var transforms = [];`;
if (!s.includes(a0)) { console.log("MISS header"); process.exit(1); }
s = s.replace(a0, a1);

const b0 = `          var hinge = lerp(PI / 2, 0, fo);
          var m = M4.mul(M4.trans(d[0] * half, -half, d[2] * half), M4.rotX(PI / 2));
          // rotate about the hinge axis
          var axis = [d[2], 0, -d[0]];
          var r = M4.rotAxis(axis, -hinge);   // uniform: the axis already flips with d
          var mm = M4.mul(M4.trans(d[0] * half, -half * lerp(3.2, 1.0, fo), d[2] * half), r);
          mm = M4.mul(mm, M4.rotX(PI / 2));`;
const b1 = `          var hinge = lerp(0, PI / 2, fo);    // flat -> upright
          var axis = [d[2], 0, -d[0]];
          var r = M4.rotAxis(axis, -hinge);   // uniform: the axis already flips with d
          var mm = M4.mul(M4.trans(d[0] * half, -half * lerp(3.2, 1.0, fo), d[2] * half), r);
          mm = M4.mul(mm, M4.rotX(PI / 2));`;
if (!s.includes(b0)) { console.log("MISS sides"); process.exit(1); }
s = s.replace(b0, b1);

const c0 = "        var mTop = M4.mul(M4.trans(0, half * lerp(4.2, 1.0, fo), -half), M4.rotX(PI / 2 - lerp(PI / 2, 0, fo)));";
const c1 = "        // the lid stays horizontal in both states, it just travels down onto the cube\n" +
           "        var mTop = M4.mul(M4.trans(0, half * lerp(4.2, 1.0, fo), -half), M4.rotX(PI / 2));";
if (!s.includes(c0)) { console.log("MISS top"); process.exit(1); }
s = s.replace(c0, c1);
fs.writeFileSync(p, s);
console.log("net now folds UP: hinge 0->90, lid horizontal");
