import fs from "node:fs";
function edit(path, pairs, label) {
  let s = fs.readFileSync(path, "utf8");
  const before = s;
  for (const [a, b] of pairs) {
    if (!s.includes(a)) { console.log("  MISS " + path + ": " + JSON.stringify(a.slice(0, 56))); continue; }
    s = s.split(a).join(b);
  }
  if (s !== before) { fs.writeFileSync(path, s); console.log("patched " + label); }
  else console.log("unchanged " + label);
}

/* (2) revert the scale-in -- it read as a wobble, not a reveal -------------- */
edit("src/60_tui.js", [
  ['      if (o.pop !== undefined && o.pop < 1) {\n        var pp = 0.86 + o.pop * 0.14;\n        c.translate(x + w / 2, y + h / 2); c.scale(pp, pp); c.translate(-(x + w / 2), -(y + h / 2));\n        c.globalAlpha = 0.25 + o.pop * 0.75;\n      }\n', '']
], "revert panel pop");

/* (1) the chat fades in instead of snapping on ----------------------------- */
edit("src/61_gadgets.js", [
  ['      o = o || {};\n      var c = hud.fc;\n      c.save();\n      // window',
   '      o = o || {};\n      var c = hud.fc;\n      c.save();\n      if (o.alpha !== undefined) c.globalAlpha = o.alpha;\n      // window']
], "guiChat alpha");

edit("src/sections4/tui_a.js", [
  ['      if (l >= 11.9) chatAt(ctx, { title: "deepseek \\u00b7 dsh \\u00b7 \\u521d\\u59cb\\u5316", name: "deepseek-v4.1-flash-expires-on-0910" });',
   '      if (l >= 11.9) chatAt(ctx, { title: "deepseek \\u00b7 dsh \\u00b7 \\u521d\\u59cb\\u5316",\n        name: "deepseek-v4.1-flash-expires-on-0910", alpha: clamp((l - 11.9) / 0.9, 0, 1) });']
], "chat fade-in");

/* the fade has to reach guiChat ------------------------------------------- */
for (const f of ["src/sections4/tui_a.js", "src/sections4/tui_b.js"]) {
  edit(f, [
    ['    opt.typed = modelName(ctx.t).typed;', '    opt.typed = modelName(ctx.t).typed;\n    if (opt.alpha === undefined) opt.alpha = 1;']
  ], f + " alpha default");
}

/* (3) the guard bars sat on top of the CJK caption ------------------------- */
edit("src/sections4/tui_b.js", [
  ['        T.t(hud, 0, r + 6, q.x, q.y, "guard " + (cur[ci].guard * 100).toFixed(0).padStart(4) + "%  " +',
   '        T.t(hud, 0, r + 8, q.x, q.y, "guard " + (cur[ci].guard * 100).toFixed(0).padStart(4) + "%  " +']
], "suffix panel layout");
