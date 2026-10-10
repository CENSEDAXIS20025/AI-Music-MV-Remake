// verify the exact matrix expression used by the heart section, outside the browser
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
global.window = {};
new Function(fs.readFileSync(path.join(ROOT, "src/00_core.js"), "utf8"))();
const C = global.window.WEM.core, M4 = C.M4, V3 = C.V3;

const t = 199;
const heartPos = [0, 0.6 + Math.sin(t * 1.3) * 0.03, 0];
const baseRot = M4.mul(M4.rotY(t * 0.30), M4.rotX(Math.sin(t * 0.22) * 0.10));
const beatS = 1 + 0.0125 + 0.546 * 0.06 * Math.sin(t * 5.2);
const solidModel = M4.mul(M4.compose(heartPos, baseRot, 2.1 * beatS), M4.ident());
console.log("beatS", beatS.toFixed(4));
console.log("compose matrix:", Array.from(solidModel).map(v => +v.toFixed(3)).join(","));

// bounds of the transformed unit cube
let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
  const p = M4.xform(solidModel, [x, y, z, 1]);
  for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], p[i]); mx[i] = Math.max(mx[i], p[i]); }
}
console.log("transformed cube bounds:", mn.map(v => +v.toFixed(3)), mx.map(v => +v.toFixed(3)));

// compare against an explicit T*R*S
const explicit = M4.mul(M4.mul(M4.trans(heartPos[0], heartPos[1], heartPos[2]), baseRot), M4.scale(2.1 * beatS, 2.1 * beatS, 2.1 * beatS));
console.log("explicit matrix:  ", Array.from(explicit).map(v => +v.toFixed(3)).join(","));

// is compose() even reading its 3rd argument correctly?
const s = M4.compose([0, 0, 0], M4.ident(), 2.0);
console.log("compose(ident, 2.0) diag:", [s[0], s[5], s[10]].map(v => +v.toFixed(3)));
const s3 = M4.compose([0, 0, 0], M4.ident(), [2, 3, 4]);
console.log("compose(ident, [2,3,4]) diag:", [s3[0], s3[5], s3[10]].map(v => +v.toFixed(3)));
