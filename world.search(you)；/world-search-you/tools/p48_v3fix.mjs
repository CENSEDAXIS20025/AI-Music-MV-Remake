import fs from "node:fs";
const done = [];

/* 1. garble stops at 44.452 -- phase A is the garbled one, phase B is fixed */
let a = fs.readFileSync("src/sections4/tui_a.js", "utf8");
const g0 = "  var GARBLE_END = 59.223;      // from \"If I can\" onward the dialogue is clean";
const g1 = "  var GARBLE_END = 44.452;      // garble belongs to the first phase only";
if (a.includes(g0)) { a = a.replace(g0, g1); done.push("garble boundary -> 44.452"); }

/* 3. no memory-write lines in the conversation */
const n0 = a;
const MEM = ["your_cat.png", "love.txt", "goodnight.txt"];
for (const f of MEM) {
  const needle = ', "\\u5199\\u5165 \\u00b7 ~/memory/you/' + f + '"';
  a = a.split(needle).join("");
}
if (a !== n0) done.push("memory-write lines removed");

/* 4. the weight matrix shimmers and carries a scan line */
const h0 = `        var wi = (r * cols + c) * 3;
        if (wi >= cur.w.length) return 0;
        return Math.abs(cur.w[wi]) / wmax;`;
const h1 = `        var wi = (r * cols + c) * 3;
        if (wi >= cur.w.length) return 0;
        var v = Math.abs(cur.w[wi]) / wmax;
        // live: a slow breathing plus a scan line travelling across the tensor
        var scan = Math.abs(((c + r * 0.6) - ((ctx.t * 14) % (cols + 8))) + 4);
        v *= 0.86 + 0.14 * Math.sin(ctx.t * 2.4 + c * 0.35 + r * 0.6);
        if (scan < 2) v += 0.45 * (1 - scan / 2);
        return v;`;
if (a.includes(h0)) { a = a.replace(h0, h1); done.push("weight matrix animated"); }
fs.writeFileSync("src/sections4/tui_a.js", a);

/* 5. restore the terminal ending: the chat runs to 晚安, then the code screen */
let b = fs.readFileSync("src/sections4/tui_b.js", "utf8");
const e0 = `      if (t < 209.4) {
        ctx.chromeAmt = 1;
        chatAt(ctx, { title: "deepseek \\u00b7 dsh" });
        return;
      }
      if (t < 211.2) {
        ctx.chromeAmt = 1;
        if (WEM.dshHome) WEM.dshHome(hud, 46, 96, 690, 838, t);
        return;
      }`;
const e1 = `      // the conversation carries the final 晚安, then the terminal takes over
      if (t < 208.6) {
        ctx.chromeAmt = 1;
        chatAt(ctx, { title: "deepseek \\u00b7 dsh" });
        return;
      }`;
if (b.includes(e0)) { b = b.replace(e0, e1); fs.writeFileSync("src/sections4/tui_b.js", b); done.push("terminal ending restored"); }
else console.log("  MISS ending block");

/* 2. popups in TUI style: square corners, box-drawing rules, monospace */
let g = fs.readFileSync("src/61_gadgets.js", "utf8");
const p0 = g.indexOf("      // shadow\n      c.fillStyle = \"rgba(0,0,0,0.5)\";\n      rr(c, x + 5, y + 6, w, h, 10); c.fill();");
const p1 = g.indexOf("      c.textAlign = \"center\"; c.fillText(\"\\u786e\\u5b9a\", bx + bw2 / 2, by + 19); c.textAlign = \"left\";");
if (p0 < 0 || p1 < 0) { console.log("  MISS popup body", p0, p1); }
else {
  const body = `      // TUI chrome: square corners, box-drawing rules, monospace text
      var MONO = "'Cascadia Mono','Consolas','DejaVu Sans Mono',monospace";
      c.fillStyle = "rgba(0,0,0,0.55)";
      c.fillRect(x + 4, y + 5, w, h);
      c.fillStyle = "rgba(16,18,22,0.99)";
      c.fillRect(x, y, w, h);
      c.strokeStyle = "rgba(255,90,80,0.85)"; c.lineWidth = 1;
      c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      c.font = "12px " + MONO;
      var bar = "\\u250c\\u2500 " + title + " ";
      var guard = 0;
      while (c.measureText(bar).width < w - 30 && guard++ < 400) bar += "\\u2500";
      bar += "\\u2510";
      c.fillStyle = "rgba(255,96,86,0.95)";
      c.fillText(bar, x + 4, y + 16);
      c.fillText("[\\u00d7]", x + w - 26, y + 16);
      c.fillStyle = "rgba(226,220,220,0.95)"; c.font = "12.5px " + MONO;
      for (var i2 = 0; i2 < lines.length; i2++) {
        if (i2 * 20 + 44 > h - 34) break;
        c.fillText("\\u2502 " + lines[i2], x + 8, y + 42 + i2 * 20);
      }
      c.fillStyle = "rgba(255,90,80,0.45)"; c.font = "12px " + MONO;
      var bot = "\\u2514";
      guard = 0;
      while (c.measureText(bot).width < w - 16 && guard++ < 400) bot += "\\u2500";
      bot += "\\u2518";
      c.fillText(bot, x + 4, y + h - 6);
      c.fillStyle = "rgba(255,120,110,0.98)"; c.font = "600 12px " + MONO;
      c.fillText("[ \\u786e\\u5b9a ]", x + w - 68, y + h - 12);
`;
  g = g.slice(0, p0) + body + g.slice(p1 + "      c.textAlign = \"center\"; c.fillText(\"\\u786e\\u5b9a\", bx + bw2 / 2, by + 19); c.textAlign = \"left\";".length);
  fs.writeFileSync("src/61_gadgets.js", g);
  done.push("TUI popup style");
}
console.log("applied: " + done.join(", "));
