import fs from "node:fs";
const p = "src/sections4/tui_b.js";
let s = fs.readFileSync(p, "utf8");
const anchor = '      statusBar(ctx, "\\u6267\\u884c\\u8bf7\\u6c42", "rgba(120,20,20,0.7)");';
if (!s.includes(anchor)) { console.log("MISS anchor"); process.exit(1); }
// (3) the last EXECUTION of the flood lands dead centre, in red
const add = [
  '      // (3) when the lyric reaches its last EXECUTION the word itself lands',
  '      var lastEx = 158.00 - ctx.data.sections[10].start;',
  '      if (l > lastEx - 0.10 && l < lastEx + 1.80) {',
  '        var ue = clamp((l - lastEx) / 0.26, 0, 1);',
  '        var sce = 1 + (1 - ue) * 1.9;',
  '        hud.T(ctx.W / 2, ctx.H / 2 + 40, "EXECUTION", {',
  '          size: Math.round(104 * sce), weight: "700", align: "center",',
  '          color: "rgba(255,64,54,0.98)",',
  '          alpha: clamp((l - lastEx) / 0.18, 0, 1)',
  '        });',
  '        hud.T(ctx.W / 2, ctx.H / 2 + 120, "\\u6700\\u540e\\u4e00\\u6b21", { size: 16, color: "rgba(255,140,130,0.95)", align: "center", alpha: clamp((l - lastEx - 0.3) / 0.4, 0, 1) });',
  '      }'
].join("\n") + "\n";
s = s.replace(anchor, add + anchor);
fs.writeFileSync(p, s);
console.log("added centred EXECUTION");
