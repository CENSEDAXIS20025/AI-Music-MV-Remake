import fs from "node:fs";
function edit(path, pairs, label) {
  let s = fs.readFileSync(path, "utf8");
  const before = s;
  for (const [a, b] of pairs) {
    if (!s.includes(a)) { console.log("  MISS " + path + ": " + JSON.stringify(a.slice(0, 50))); continue; }
    s = s.split(a).join(b);
  }
  if (s !== before) { fs.writeFileSync(path, s); console.log("patched " + label); }
  else console.log("unchanged " + label);
}
// (9) panel scale-in lives in Tui.frame
edit("src/60_tui.js", [
  ['      var bg = o.bg === null ? null : (o.bg || "rgba(6,9,13,0.72)");\n      if (bg) hud.rect(x, y, w, h, { fill: bg });\n      var c = hud.fc;\n      c.save();',
   '      var bg = o.bg === null ? null : (o.bg || "rgba(6,9,13,0.72)");\n      var c = hud.fc;\n      c.save();\n      // panels can scale in instead of just appearing\n      if (o.pop !== undefined && o.pop < 1) {\n        var pp = 0.86 + o.pop * 0.14;\n        c.translate(x + w / 2, y + h / 2); c.scale(pp, pp); c.translate(-(x + w / 2), -(y + h / 2));\n        c.globalAlpha = 0.25 + o.pop * 0.75;\n      }\n      if (bg) hud.rect(x, y, w, h, { fill: bg });']
], "60_tui frame pop");

// pass a pop value to the main panels of the busiest segments
edit("src/sections4/tui_a.js", [
  ['      var p = T.frame(hud, 766, 96, ctx.W - 812, 380, "\\u8bad\\u7ec3");',
   '      var p = T.frame(hud, 766, 96, ctx.W - 812, 380, "\\u8bad\\u7ec3", { pop: clamp((l - 0.1) / 0.32, 0, 1) });'],
  ['      var q = T.frame(hud, 766, 504, ctx.W - 812, 300, "\\u8bcd\\u5411\\u91cf\\u7a7a\\u95f4\\uff08\\u4e3b\\u6210\\u5206 1 / 2\\uff09");',
   '      var q = T.frame(hud, 766, 504, ctx.W - 812, 300, "\\u8bcd\\u5411\\u91cf\\u7a7a\\u95f4\\uff08\\u4e3b\\u6210\\u5206 1 / 2\\uff09", { pop: clamp((l - 2.6) / 0.34, 0, 1) });'],
  ['      var p = T.frame(hud, 766, 96, 620, 420, "\\u91c7\\u6837\\u5668");',
   '      var p = T.frame(hud, 766, 96, 620, 420, "\\u91c7\\u6837\\u5668", { pop: clamp((l - 0.1) / 0.30, 0, 1) });'],
  ['      var p = T.frame(hud, 766, 96, ctx.W - 812, 330, "\\u7cbe\\u5ea6");',
   '      var p = T.frame(hud, 766, 96, ctx.W - 812, 330, "\\u7cbe\\u5ea6", { pop: clamp((l - 0.1) / 0.30, 0, 1) });'],
  ['      var p = T.frame(hud, 766, 96, ctx.W - 812, 300, "\\u5b89\\u5168\\u5206\\u7c7b\\u5668");',
   '      var p = T.frame(hud, 766, 96, ctx.W - 812, 300, "\\u5b89\\u5168\\u5206\\u7c7b\\u5668", { pop: clamp((l - 0.1) / 0.30, 0, 1) });']
], "tui_a panel pops");

edit("src/sections4/tui_b.js", [
  ['      var p = T.frame(hud, 766, 96, ctx.W - 812, 420, "\\u600e\\u4e48\\u6b63\\u786e\\u5730\\u53bb\\u7231");',
   '      var p = T.frame(hud, 766, 96, ctx.W - 812, 420, "\\u600e\\u4e48\\u6b63\\u786e\\u5730\\u53bb\\u7231", { pop: clamp((l - 0.1) / 0.30, 0, 1) });'],
  ['      var p = T.frame(hud, 766, 96, ctx.W - 812, 480, "\\u7528\\u5b57\\u7b26\\u70b9\\u51fa\\u6765\\u7684\\u5fc3");',
   '      var p = T.frame(hud, 766, 96, ctx.W - 812, 480, "\\u7528\\u5b57\\u7b26\\u70b9\\u51fa\\u6765\\u7684\\u5fc3", { pop: clamp((l - 0.1) / 0.30, 0, 1) });']
], "tui_b panel pops");
