import fs from "node:fs";
// uploadPan must tolerate being called before any pan drawing has happened
let h = fs.readFileSync("src/20_hud.js", "utf8");
if (!h.includes("    if (!this.tPan) this.tPan = res.tex(\"hudPan\", { canvas: this.panC });\n    if (!this.panC)")) {
  h = h.replace('    if (!this.tPan) this.tPan = res.tex("hudPan", { canvas: this.panC });',
    '    if (!this.panC) return;\n    if (!this.tPan) this.tPan = res.tex("hudPan", { canvas: this.panC });');
  fs.writeFileSync("src/20_hud.js", h);
  console.log("uploadPan guarded");
}
