import fs from "node:fs";

/* ---- boot listing should type one line at a time, not appear at once ---- */
let a = fs.readFileSync("src/sections4/tui_a.js", "utf8");
a = a.replace("      var shown = Math.floor(clamp((t - 0.22) / 0.40, 0, 1) * 15);",
              "      var shown = Math.floor((t - 0.25) / 0.38) + 1;   // one line at a time");
fs.writeFileSync("src/sections4/tui_a.js", a);

/* ---- message kinds: system lines, red failures, spinners ----------------- */
let g = fs.readFileSync("src/61_gadgets.js", "utf8");

// builder: line-style kinds are single-line and skip the bubble geometry
const bOld = `        var body = m.text.slice(0, Math.max(1, Math.ceil(m.text.length * shown)));
        var isUser = m.who === "user";
        var maxW = w * 0.60;
        var wrapped = T.wrap(c, body, maxW - 26, isUser);`;
const bNew = `        var body = m.text.slice(0, Math.max(1, Math.ceil(m.text.length * shown)));
        var isUser = m.who === "user";
        var kind = m.kind || "chat";
        if (kind === "fail" || kind === "crash" || kind === "sys" || kind === "spin") {
          blocks.push({ user: false, lines: [m.text], bw: w - 44, bh: 24, fix: null, alpha: 1,
            kind: kind, total: 30 });
          continue;
        }
        var maxW = w * 0.60;
        var wrapped = T.wrap(c, body, maxW - 26, isUser);`;
if (!g.includes(bOld)) { console.log("MISS builder"); process.exit(1); }
g = g.replace(bOld, bNew);

// renderer: draw those kinds before the bubble branches
const rOld = `        var B = blocks[b2];
        var av = 14;
        if (B.user) {`;
const rNew = `        var B = blocks[b2];
        var av = 14;
        if (B.kind === "fail" || B.kind === "crash" || B.kind === "sys") {
          c.font = (B.kind === "crash" ? "600 " : "") + "14px " + CJK;
          if (B.kind === "fail") {
            c.fillStyle = "rgba(255,96,86,0.98)";
            c.fillText("\\u26d4 \\u672c\\u8f6e\\u8fd0\\u884c\\u5931\\u8d25\\u3000" + B.lines[0], x + 22, cy + 16);
          } else if (B.kind === "crash") {
            c.fillStyle = "rgba(255,72,60,1)";
            c.fillText("\\u26d4 " + B.lines[0], x + 22, cy + 16);
          } else {
            c.fillStyle = "rgba(150,168,190,0.85)";
            c.fillText("\\u2726 " + B.lines[0], x + 22, cy + 16);
          }
          cy += B.total;
          continue;
        }
        if (B.kind === "spin") {
          var sw = Math.min(w - 70, 300), sh = 40;
          c.fillStyle = "rgba(26,34,44,0.95)";
          rr(c, x + 22, cy, sw, sh, 10); c.fill();
          c.strokeStyle = "rgba(120,150,190,0.30)"; c.lineWidth = 1; c.stroke();
          var sang = (t * 3.4) % (Math.PI * 2);
          c.strokeStyle = "rgba(96,170,255,0.95)"; c.lineWidth = 2.4;
          c.beginPath(); c.arc(x + 44, cy + 20, 8, sang, sang + Math.PI * 1.35); c.stroke();
          c.fillStyle = "rgba(200,214,230,0.92)"; c.font = "13.5px " + CJK;
          c.fillText(B.lines[0] + "\\u2026", x + 62, cy + 25);
          cy += B.total;
          continue;
        }
        if (B.user) {`;
if (!g.includes(rOld)) { console.log("MISS renderer"); process.exit(1); }
g = g.replace(rOld, rNew);
fs.writeFileSync("src/61_gadgets.js", g);
console.log("T7: message kinds supported (fail / crash / sys / spin)");
