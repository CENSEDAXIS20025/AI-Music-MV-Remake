import fs from "node:fs";
// the header status now carries its own colour, and a leading dot
let g = fs.readFileSync("src/61_gadgets.js", "utf8");
const old = `      c.fillStyle = "rgba(94,224,160,0.9)"; c.font = "11px " + CJK;
      c.fillText(o.sub || "\\u5728\\u7ebf \\u00b7 \\u63a8\\u7406\\u4e2d", x + 56, y + 38);`;
const neu = `      c.font = "11px " + CJK;
      var st = o.sub || "\\u5728\\u7ebf \\u00b7 \\u63a8\\u7406\\u4e2d";
      var stc = o.subColor || "rgba(94,224,160,0.9)";
      c.fillStyle = stc;
      c.beginPath(); c.arc(x + 57, y + 34, 2.6, 0, Math.PI * 2); c.fill();
      c.fillText(st, x + 65, y + 38);`;
if (!g.includes(old)) { console.log("MISS header"); process.exit(1); }
fs.writeFileSync("src/61_gadgets.js", g.replace(old, neu));
console.log("T6: header status colour");
