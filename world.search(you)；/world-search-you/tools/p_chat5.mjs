import fs from "node:fs";
let g = fs.readFileSync("src/61_gadgets.js", "utf8");
const before = g;
// the footer sat at h-14 and the input box ended at h-18, so they collided and
// the footer was clipped by the card's bottom edge. Lift the whole bottom stack.
g = g.replace("c.fillText(\"\\u266a \" + o.lyric, x + w / 2, y + h - Math.round(74 * K));",
              "c.fillText(\"\\u266a \" + o.lyric, x + w / 2, y + h - Math.round(94 * K));");
g = g.replace("var iy = y + h - Math.round(60 * K);", "var iy = y + h - Math.round(80 * K);");
g = g.replace("var fy = y + h - Math.round(14 * K);", "var fy = y + h - Math.round(24 * K);");
if (g === before) { console.log("MISS layout"); process.exit(1); }
fs.writeFileSync("src/61_gadgets.js", g);
console.log("bottom stack lifted: lyric -94, input -80, footer -24");

let s = fs.readFileSync("src/70_chat.js", "utf8");
const ch = s.match(/var CH = \{[^}]*\};[^\n]*\n/)[0];
s = s.replace(ch, "var CH = { x: 670, y: 236, w: 580, h: 620 };   // taller, so the footer has room\n");
fs.writeFileSync("src/70_chat.js", s);
console.log("card h 590 -> 620");
