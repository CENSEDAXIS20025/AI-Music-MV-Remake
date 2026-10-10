import fs from "node:fs";
// expose the generated transcript
let a = fs.readFileSync("src/sections4/tui_a.js", "utf8");
if (!a.includes("WEM.chatSheet")) {
  a = a.replace("  function chatAt(ctx, opt) {", "  WEM.chatSheet = sheet;\n  function chatAt(ctx, opt) {");
  fs.writeFileSync("src/sections4/tui_a.js", a);
  console.log("exposed WEM.chatSheet");
}
// and point segment 09-15's chatAt at it
let b = fs.readFileSync("src/sections4/tui_b.js", "utf8");
const before = b;
b = b.replace('  var S = WEM.Tui.SCRIPT;', '  // the transcript is generated from the lyric sheet (see tui_a.js)');
b = b.replace('    var t = ctx.t, visible = [];\n    for (var i = 0; i < S.length; i++) if (S[i].t0 <= t + 0.01) visible.push(S[i]);',
              '    var t = ctx.t, sc = WEM.chatSheet(ctx), visible = [];\n    for (var i = 0; i < sc.length; i++) if (sc[i].t0 <= t + 0.01) visible.push(sc[i]);');
if (b === before) console.log("MISS tui_b chatAt");
else { fs.writeFileSync("src/sections4/tui_b.js", b); console.log("tui_b chatAt uses the generated sheet"); }
