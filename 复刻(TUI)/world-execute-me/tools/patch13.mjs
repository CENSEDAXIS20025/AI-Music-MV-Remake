import fs from "node:fs";
const p = "src/sections4/tui_a.js";
let s = fs.readFileSync(p, "utf8");
if (s.includes("function modelName")) { console.log("already present"); process.exit(0); }
const fn = `  // (10) the run is named after the checkpoint being trained; when training
  // finishes the name is wiped and the shipped one types itself in
  var NAME0 = "deepseek-v4.1-flash-expires-on-0910", NAME1 = "deepseek-flash";
  function modelName(t) {
    var t0 = 198.6, dur = 3.2;
    if (t < t0) return { name: NAME0, erase: 0, typed: "" };
    var u = clamp((t - t0) / dur, 0, 1);
    if (u < 0.30) return { name: NAME0, erase: u / 0.30, typed: "" };
    var k = Math.floor(NAME1.length * (u - 0.30) / 0.70);
    return { name: NAME1, erase: 1, typed: NAME1.slice(0, k) };
  }
  WEM.modelName = modelName;
  function chatAt(ctx, opt) {`;
s = s.replace("  function chatAt(ctx, opt) {", fn);
fs.writeFileSync(p, s);
console.log("modelName restored");
