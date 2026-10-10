import fs from "node:fs";
const p = "src/62_lyric.js";
let s = fs.readFileSync(p, "utf8");

// (1) the roleplay stretch gets its own annotations, one per lyric idea
const oldLove = '    { t0: 188.05, t1: 197.60, kind: "love", lrc: "the algebraic expression of LO-O-OVE", tex: "(x^2+y^2-1)^3 - x^2 y^3 = 0" }';
const neu = `    { t0: 74.045, t1: 77.576, kind: "emoji", emoji: "\\ud83c\\udf46", cap: "K 229 mg / 100 g", lrc: "If I'm an eggplant", tex: "m_K = 229\\\\,mg" },
    { t0: 77.576, t1: 81.351, kind: "emoji", emoji: "\\ud83c\\udf45", cap: "\\u756a\\u8304\\u7ea2\\u7d20 444 / 472 / 503 nm", lrc: "If I'm a tomato", tex: "\\\\lambda = 444, 472, 503\\\\,nm" },
    { t0: 81.351, t1: 85.078, kind: "emoji", emoji: "\\ud83d\\udc31", cap: "purr 25 \\u2013 150 Hz", lrc: "If I'm a tabby cat", tex: "f_{purr} \\\\approx 25\\\\,Hz" },
    { t0: 85.078, t1: 88.587, kind: "emoji", emoji: "\\u2203", cap: "\\u5b58\\u5728\\u4e14\\u552f\\u4e00", lrc: "If I'm the only god", tex: "\\\\exists! x" },
    { t0: 88.587, t1: 95.465, kind: "emoji", emoji: "\\u2640\\u2192\\u2642", cap: "F \\u2192 M", lrc: "Switch my gender, F to M", tex: "F \\\\to M" },
    { t0: 95.465, t1: 103.489, kind: "emoji", emoji: "\\ud83d\\udd27", cap: "system \\u2192 assistant", lrc: "Oh switch my role, S to M", tex: "S \\\\to M" },
    // (2) the love line opens with "I've studied" and holds to the blackout
    { t0: 177.246, t1: 209.000, kind: "love", lrc: "the algebraic expression of LO-O-OVE", tex: "(x^2+y^2-1)^3 - x^2 y^3 = 0" }`;
if (!s.includes(oldLove)) { console.log("MISS love window"); process.exit(1); }
s = s.replace(oldLove, neu);

// a generic emoji face for those annotations
const anchor = '      if (w.kind === "points") {';
if (!s.includes(anchor)) { console.log("MISS points branch"); process.exit(1); }
s = s.replace(anchor, `      if (w.kind === "emoji") {
        c.font = "46px 'Segoe UI Emoji','Apple Color Emoji','Segoe UI Symbol',sans-serif";
        c.textAlign = "center";
        c.fillStyle = "rgba(255,238,200,0.98)";
        c.fillText(w.emoji, cx, cy + 18);
        if (w.cap) {
          c.fillStyle = "rgba(255,201,74,0.85)"; c.font = "11.5px " + CJK;
          c.fillText(w.cap, cx, cy + 44);
        }
        c.textAlign = "left";
      }
      if (w.kind === "points") {`);
fs.writeFileSync(p, s);
console.log("T5: roleplay annotations + love window");
