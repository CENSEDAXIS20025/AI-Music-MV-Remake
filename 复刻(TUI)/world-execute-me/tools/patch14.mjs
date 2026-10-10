import fs from "node:fs";
const p = "src/sections4/tui_a.js";
let s = fs.readFileSync(p, "utf8");
const a = `      if (!STARTS.test(line) && out.length) {           // continuation
        out[out.length - 1].text += " " + line;
        continue;
      }`;
const b = `      if (!STARTS.test(line) && out.length) {           // continuation
        // fold into the last *user* bubble, never into her reply
        for (var u = out.length - 1; u >= 0; u--) {
          if (out[u].who === "user") { out[u].text += " " + line; break; }
        }
        continue;
      }`;
if (!s.includes(a)) { console.log("MISS fold"); process.exit(1); }
fs.writeFileSync(p, s.replace(a, b));
console.log("continuations fold into the user line");
