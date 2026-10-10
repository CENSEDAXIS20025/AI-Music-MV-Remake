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

edit("src/61_gadgets.js", [
  // the prompt placeholder text and the send button keep their place; a footer
  // row carries the live training state, like the reference does
  ['      c.fillStyle = "rgba(43,74,140,0.95)";\n      rr(c, x + w - 48, iy, 34, 42, 10); c.fill();\n      c.fillStyle = "rgba(238,244,250,0.98)"; c.font = "17px " + CJK;\n      c.textAlign = "center"; c.fillText("\\u2191", x + w - 31, iy + 27); c.textAlign = "left";\n      c.restore();',
   `      c.fillStyle = "rgba(43,74,140,0.95)";
      rr(c, x + w - 48, iy, 34, 42, 10); c.fill();
      c.fillStyle = "rgba(238,244,250,0.98)"; c.font = "17px " + CJK;
      c.textAlign = "center"; c.fillText("\\u2191", x + w - 31, iy + 27); c.textAlign = "left";
      // ---- training footer: rounds, steps, tokens, cache ----
      if (o.footer) {
        var fy = y + h - 14;
        c.fillStyle = "rgba(140,155,175,0.75)"; c.font = "11px " + CJK;
        c.fillText(o.footer, x + 16, fy);
        if (o.lossText) { c.fillStyle = "rgba(94,224,160,0.9)"; c.textAlign = "right"; c.fillText(o.lossText, x + w - 16, fy); c.textAlign = "left"; }
        if (o.prog !== undefined) {
          var bx = x + 16, bw = w - 32, by = fy + 5;
          c.fillStyle = "rgba(255,255,255,0.08)"; c.fillRect(bx, by, bw, 3);
          c.fillStyle = "rgba(53,224,255,0.65)"; c.fillRect(bx, by, bw * clamp(o.prog, 0, 1), 3);
        }
      }
      c.restore();`]
], "guiChat training footer");

// both chatAt helpers feed the header status and the footer
for (const f of ["src/sections4/tui_a.js", "src/sections4/tui_b.js"]) {
  edit(f, [
    ['    if (opt.alpha === undefined) opt.alpha = 1;',
     `    if (opt.alpha === undefined) opt.alpha = 1;
    if (WEM.chatState) {
      var st = WEM.chatState(ctx);
      opt.sub = st.sub; opt.footer = st.footer; opt.lossText = st.lossText; opt.prog = st.prog;
    }`]
  ], f + " chat state");
}

// expose the state helper from tui_a
edit("src/sections4/tui_a.js", [
  ['  WEM.chatSheet = sheet;',
   `  WEM.chatSheet = sheet;
  // live training state for the chat chrome: same clock as the right-hand panel
  WEM.chatState = function (ctx) {
    var t = ctx.t;
    var prog = trainProgress(t), loss = lossAt(t), step = stepAt(t);
    var retired = t > 200.4;
    return {
      sub: (retired ? "\\u5df2\\u9000\\u5f79 \\u00b7 " : "\\u9884\\u8bad\\u7ec3\\u4e2d \\u00b7 ") + ckptAt(t),
      footer: Math.max(1, Math.round(prog * 126)) + " \\u8f6e " + Math.max(1, Math.round(prog * 902)) + " \\u6b65 \\u00b7 " +
              (step * 13).toLocaleString() + " tok \\u00b7 \\u7f13\\u5b58\\u547d\\u4e2d " + Math.round(prog * 96 + 3) + "%",
      lossText: "loss " + loss.toFixed(3),
      prog: prog
    };
  };`]
], "chatState helper");
