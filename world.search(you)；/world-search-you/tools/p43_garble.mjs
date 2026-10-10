import fs from "node:fs";
const p = "src/sections4/tui_a.js";
let s = fs.readFileSync(p, "utf8");
const old = `  function corrupt(text, t, seed) {
    var q = qualityAt(t);
    if (q >= 0.80 || text.indexOf("\\n") >= 0) return text;   // structured lines stay intact`;
const neu = `  var GARBLE_END = 59.223;      // from "If I can" onward the dialogue is clean
  function corrupt(text, t, seed) {
    if (t >= GARBLE_END) return text;                        // no garble after 59.223
    var q = qualityAt(t);
    if (q >= 0.80 || text.indexOf("\\n") >= 0) return text;   // structured lines stay intact`;
if (!s.includes(old)) { console.log("MISS corrupt"); process.exit(1); }
fs.writeFileSync(p, s.replace(old, neu));
console.log("corruption now stops at 59.223 (If I can)");
