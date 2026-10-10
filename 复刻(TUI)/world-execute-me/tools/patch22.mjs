import fs from "node:fs";
const p = "src/sections4/tui_a.js";
let s = fs.readFileSync(p, "utf8");
const old = `        var runaway = d[2].length > 80;
        out.push({
          who: "her",
          text: runaway ? d[2] : corrupt(d[2], t0, 2000 + i * 41),
          t0: t0, q: qualityAt(t0),
          note: d[3], fix: d[4]
        });`;
const neu = `        var runaway = d[2].length > 80;
        var body = runaway ? d[2] : corrupt(d[2], t0, 2000 + i * 41);
        // the reference prints a small thinking / memory line above the answer
        if (d[3]) body = "\\u2726 " + d[3] + "\\n" + body;
        out.push({
          who: "her",
          text: body,
          t0: t0, q: qualityAt(t0),
          fix: d[4] ? corrupt(d[4], t0, 9000 + i * 17) : undefined
        });`;
if (!s.includes(old)) { console.log("MISS sheet push"); process.exit(1); }
fs.writeFileSync(p, s.replace(old, neu));
console.log("notes folded into the answer text");
