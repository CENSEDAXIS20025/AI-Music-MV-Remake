import fs from "node:fs";
const files = ["src/27_model.js","src/sections3/a_01_05.js","src/sections3/a2_03_05.js","src/sections3/b_06_10.js","src/sections3/c_11_15.js","src/sections2/a2_04_05.js","src/sections2/b_06_10.js","src/sections2/c_11_15.js","src/sections2/a_01_05.js","src/50_audiobar.js","src/26_lab.js","src/40_main.js","index.html","index2.html","index3.html"];
for (const f of files) {
  let s;
  try { s = fs.readFileSync(f, "utf8"); } catch { console.log("missing", f); continue; }
  const bad = [];
  const re = /[\uFFFD\u00e2\u00e5\u00e6\u00e7\u00e8\u00e9\u9429\u951b\u9418\u6d5c\u7039\u5b2a\u7eeb]/g;
  let m, count = 0;
  while ((m = re.exec(s)) && count < 3) {
    const line = s.slice(0, m.index).split("\n").length;
    bad.push(`line${line}:"${s.slice(Math.max(0,m.index-18), m.index+18).replace(/\n/g," ")}"`);
    count++;
  }
  // count CJK chars (expected 0 in the source files, many in README/index titles)
  const cjk = (s.match(/[\u4e00-\u9fff]/g) || []).length;
  console.log(`${f.padEnd(34)} cjk=${String(cjk).padStart(5)}  ${bad.length ? "SUSPECT " + bad.join(" | ") : "clean"}`);
}
