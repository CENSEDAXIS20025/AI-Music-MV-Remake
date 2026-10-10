import fs from "node:fs";
const done = [];

/* 1. segment 15 shows ONLY the code ending -- the chat was still covering it */
let b = fs.readFileSync("src/sections4/tui_b.js", "utf8");
const oldEnd = `      // the conversation carries the final 晚安, then the terminal takes over
      if (t < 208.6) {
        ctx.chromeAmt = 1;
        chatAt(ctx, { title: "deepseek \\u00b7 dsh" });
        return;
      }`;
if (b.includes(oldEnd)) { b = b.replace(oldEnd, "      // the closing code screen owns this segment from the first frame"); fs.writeFileSync("src/sections4/tui_b.js", b); done.push("chat removed from the ending"); }
else console.log("  MISS ending block");

/* 2. popups: back to the modern style, but with square corners ------------- */
let g = fs.readFileSync("src/61_gadgets.js", "utf8");
const s0 = g.indexOf("      // TUI chrome: square corners");
const s1 = g.indexOf('      c.fillText("[ \\u786e\\u5b9a ]", x + w - 68, y + h - 12);');
if (s0 < 0 || s1 < 0) { console.log("  MISS popup block", s0, s1); }
else {
  const body = `      // the modern dialog, but with square corners
      c.fillStyle = "rgba(0,0,0,0.5)";
      c.fillRect(x + 5, y + 6, w, h);
      c.fillStyle = "rgba(26,29,36,0.98)";
      c.fillRect(x, y, w, h);
      c.strokeStyle = "rgba(255,90,80,0.7)"; c.lineWidth = 1.6; c.strokeRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
      // title bar
      c.fillStyle = "rgba(72,26,26,0.98)"; c.fillRect(x, y, w, 34);
      c.fillStyle = "rgba(255,110,100,0.95)";
      c.beginPath(); c.arc(x + 18, y + 17, 5, 0, Math.PI * 2); c.fill();
      c.fillStyle = "rgba(245,235,235,0.97)"; c.font = "600 13px " + CJK;
      c.fillText(title, x + 32, y + 22);
      c.fillStyle = "rgba(200,180,180,0.7)"; c.font = "14px " + CJK;
      c.textAlign = "right"; c.fillText("\\u2715", x + w - 12, y + 22); c.textAlign = "left";
      c.fillStyle = "rgba(226,220,220,0.95)"; c.font = "13px " + CJK;
      for (var i = 0; i < lines.length; i++) {
        if (i * 22 + 46 > h - 40) break;
        c.fillText(lines[i], x + 18, y + 58 + i * 22);
      }
      var bw2 = 78, bh2 = 28;
      var bx = x + w - bw2 - 14, by = y + h - bh2 - 14;
      c.fillStyle = "rgba(64,70,84,0.98)";
      c.fillRect(bx, by, bw2, bh2);
      c.strokeStyle = "rgba(160,170,190,0.5)"; c.lineWidth = 1.2; c.strokeRect(bx, by, bw2, bh2);
      c.fillStyle = "rgba(235,240,246,0.96)"; c.font = "13px " + CJK;
      c.textAlign = "center"; c.fillText("\\u786e\\u5b9a", bx + bw2 / 2, by + 19); c.textAlign = "left";
`;
  g = g.slice(0, s0) + body + g.slice(s1 + '      c.fillText("[ \\u786e\\u5b9a ]", x + w - 68, y + h - 12);'.length);
  fs.writeFileSync("src/61_gadgets.js", g);
  done.push("popups back to modern, square corners");
}

/* 3. light garble in the FIRST phase only -------------------------------- */
let a = fs.readFileSync("src/sections4/tui_a.js", "utf8");
const c0 = `  var GARBLE_END = 44.452;      // garble belongs to the first phase only
  function corrupt(text, t, seed) {
    if (t >= GARBLE_END) return text;                        // no garble after 59.223
    var q = qualityAt(t);
    if (q >= 0.80 || text.indexOf("\\n") >= 0) return text;   // structured lines stay intact
    var r = C.rng(seed | 0), out = "";
    if (q < 0.14) {                              // nothing but token soup
      var n = 12 + Math.floor(r() * 16);
      for (var k = 0; k < n; k++) out += SOUP[Math.floor(r() * SOUP.length)];
      return out;
    }
    // damage falls off with quality, so the improvement is visible line to line
    var keep = clamp((q - 0.10) / 0.78, 0, 1);`;
const c1 = `  var GARBLE_END = 44.452;      // garble lives in the first phase only
  function corrupt(text, t, seed) {
    if (t >= GARBLE_END) return text;                         // clean from 44.452 on
    if (text.indexOf("\\n") >= 0) return text;                 // structured lines stay intact
    var q = qualityAt(t);
    var r = C.rng(seed | 0), out = "";
    // light damage: whole words survive, only scattered characters break
    var keep = clamp(0.80 + q * 0.40, 0, 1);`;
if (a.includes(c0)) { a = a.replace(c0, c1); done.push("light garble in phase A only"); }
else console.log("  MISS corrupt()");
// phase A's baked-in lines go through corrupt() as well, so they get the garble
const n0 = a;
a = a.split(', "^raw:').join(', "');
if (a !== n0) done.push("phase A lines now corrupted");
fs.writeFileSync("src/sections4/tui_a.js", a);

/* 4. v1 audio meter a little stronger ------------------------------------ */
let h = fs.readFileSync("index.html", "utf8");
h = h.replace("window.WEM_AB_GAIN = 0.6;", "window.WEM_AB_GAIN = 0.88;");
fs.writeFileSync("index.html", h);
let bm = fs.readFileSync("tools/bundle.mjs", "utf8");
bm = bm.replace("window.WEM_AB_GAIN = 0.6;", "window.WEM_AB_GAIN = 0.88;");
/* 5. and calm the in-frame line field further ---------------------------- */
h = fs.readFileSync("index.html", "utf8").replace("window.WEM_BANDS_GAIN = 0.45;", "window.WEM_BANDS_GAIN = 0.22;");
fs.writeFileSync("index.html", h);
bm = bm.replace("window.WEM_BANDS_GAIN = 0.45;", "window.WEM_BANDS_GAIN = 0.22;");
fs.writeFileSync("tools/bundle.mjs", bm);
done.push("v1 meter 0.88, band gain 0.22");

console.log("applied: " + done.join(", "));
