import fs from "node:fs";
const p = "src/sections4/tui_a.js";
let s = fs.readFileSync(p, "utf8");
const before = s;
for (const f of ["your_cat.png", "love.txt", "goodnight.txt"]) {
  s = s.split(', "\u5199\u5165 \u00b7 ~/memory/you/' + f + '"').join("");
  s = s.split(', "\\u5199\\u5165 \\u00b7 ~/memory/you/' + f + '"').join("");
}
fs.writeFileSync(p, s);
const left = (s.match(/memory\/you\//g) || []).length;
console.log(before !== s ? "memory-write lines removed" : "nothing matched", "| remaining refs:", left);
