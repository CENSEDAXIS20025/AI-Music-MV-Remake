import fs from "node:fs";
for (const f of ["src/sections4/tui_a.js","src/sections4/tui_b.js"]) {
  let s = fs.readFileSync(f, "utf8");
  s = s.split("visible.slice(-9)").join("visible.slice(-7)");
  fs.writeFileSync(f, s);
}
console.log("chat window trimmed to 7 messages");
