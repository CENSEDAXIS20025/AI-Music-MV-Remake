import fs from "node:fs";
// the thinking row is drawn by chatAt, just before the window, so it does not
// disturb guiChat's internal layout
const snippet = `    // a single scrolling row: she thinks first, then answers
    var _sc = sheet(ctx);
    for (var _ti = 0; _ti < _sc.length; _ti++) {
      var _tm = _sc[_ti];
      if (_tm.who !== "her" || !_tm.think) continue;
      var _lead = 0.95;
      if (t < _tm.t0 - _lead || t > _tm.t0) continue;
      var _ph = (t - (_tm.t0 - _lead)) / _lead;
      var _cut = Math.ceil(_tm.think.length * clamp(_ph * 1.35, 0, 1));
      ctx.hud.T(68, 96 + 838 - 106,
        "\\u273b \\u6df1\\u5ea6\\u601d\\u8003 \\u00b7 " + _tm.think.slice(0, _cut) +
        (_ph < 0.75 && Math.floor(t * 3) % 2 ? "\\u258c" : ""),
        { size: 12, color: "rgba(150,168,190,0.92)" });
      break;
    }
`;
let a = fs.readFileSync("src/sections4/tui_a.js", "utf8");
const anchorA = `    WEM.Gadgets.guiChat(ctx.hud, 46, 96, 690, 838, visible.slice(-7), t, opt);`;
if (!a.includes(anchorA)) { console.log("MISS tui_a guiChat call"); process.exit(1); }
a = a.replace(anchorA, snippet + anchorA);
fs.writeFileSync("src/sections4/tui_a.js", a);

let b = fs.readFileSync("src/sections4/tui_b.js", "utf8");
const anchorB = `    WEM.Gadgets.guiChat(ctx.hud, 46, 96, 690, 838, visible.slice(-7), t, opt);`;
if (b.includes(anchorB)) {
  b = b.replace(anchorB, snippet.replace("sheet(ctx)", "WEM.chatSheet(ctx)") + anchorB);
  fs.writeFileSync("src/sections4/tui_b.js", b);
  console.log("tui_b think row added");
}
console.log("think row added to chatAt");
