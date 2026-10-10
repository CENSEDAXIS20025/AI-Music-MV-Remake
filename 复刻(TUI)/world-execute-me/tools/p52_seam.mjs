import fs from "node:fs";
const p = "src/sections4/tui_a.js";
let s = fs.readFileSync(p, "utf8");
const old = `      // the seam between them
      if (wipe > 0.02) {
        c0.save();
        c0.fillStyle = "rgba(120,170,230," + 0.5 * wipe + ")";
        c0.fillRect(DIVX - 1, 60, 2, ctx.H - 130);
        c0.fillStyle = "rgba(53,224,255," + 0.18 * wipe + ")";
        c0.fillRect(DIVX - 4, 60, 8, ctx.H - 130);
        c0.restore();
      }
`;
if (!s.includes(old)) { console.log("MISS seam block"); process.exit(1); }
s = s.replace(old, "");        // no divider line between the two panels
fs.writeFileSync(p, s);
console.log("blue divider line removed");
