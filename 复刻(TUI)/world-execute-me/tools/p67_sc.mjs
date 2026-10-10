import fs from "node:fs";
const p = "src/sections/a_01_05.js";
let s = fs.readFileSync(p, "utf8");
s = s.replace("var sc = 0.80, w4 = 1.75;", "var sc = 0.97, w4 = 1.75;");
fs.writeFileSync(p, s);
console.log("tesseract scale 0.80 -> 0.97");
