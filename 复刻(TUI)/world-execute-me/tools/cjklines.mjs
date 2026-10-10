import fs from "node:fs";
for (const f of ["src/sections2/a2_04_05.js","src/sections2/c_11_15.js","src/sections3/c_11_15.js","index.html","index2.html"]) {
  const s = fs.readFileSync(f, "utf8");
  s.split("\n").forEach((line, i) => {
    if (/[\u4e00-\u9fff]/.test(line)) console.log(`${f}:${i+1}: ${line.trim().slice(0,110)}`);
  });
}
