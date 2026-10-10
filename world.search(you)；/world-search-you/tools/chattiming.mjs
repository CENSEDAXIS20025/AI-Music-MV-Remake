/* timing audit on the DIALOGUE table: the window keeps the last 7 bubbles, so
   with 7 bubbles a row is on screen from its t0 until the 7th later t0.
   Reports rows that are on screen (or fully typed) for too short a time. */
import fs from "node:fs";

const src = fs.readFileSync(process.argv[2] || "src/70_chat.js", "utf8");
const DUR = +(process.argv[3] || 295.35);
const W = +(process.argv[4] || 7);
const SPEED = 2.4;

// bracket-match the DIALOGUE array (comments contain brackets, so count only
// brackets that start a data row)
const start = src.indexOf("var DIALOGUE = [");
const body = src.slice(start, src.indexOf("WEM.Chat", start));
const rows = [];
body.split("\n").forEach((line) => {
  const m = /^\s*\[\s*([0-9.]+)\s*,\s*"(you|her)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*(?:,\s*"((?:[^"\\]|\\.)*)")?\s*(?:,\s*"((?:[^"\\]|\\.)*)")?\s*\]\s*,?\s*$/.exec(line);
  if (m) rows.push({ t0: +m[1], who: m[2], text: m[3], note: m[4] || "", fix: m[5] || "" });
});
rows.sort((a, b) => a.t0 - b.t0);

const ts = rows.map((r) => r.t0);
const gaps = ts.slice(1).map((t, i) => +(t - ts[i]).toFixed(2));
const smallGaps = gaps.map((g, i) => [g, ts[i + 1]]).filter((x) => x[0] < 1.5);

console.log("rows:", rows.length, " you:", rows.filter(r => r.who === "you").length,
  " her:", rows.filter(r => r.who === "her").length);
console.log("notes:", rows.filter(r => r.note).length, " fixes:", rows.filter(r => r.fix).length);
console.log("first:", ts[0], " last:", ts[ts.length - 1], " duration:", DUR);
console.log("mean gap:", (gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(2) + "s",
  " max gap:", Math.max(...gaps).toFixed(2) + "s");
console.log("gaps < 1.5s:", smallGaps.length, smallGaps.slice(0, 12).map(x => x[1] + "(" + x[0] + ")").join(" "));

let tooShort = [], tight = [];
for (let i = 0; i < rows.length; i++) {
  const onScreen = (i + W < rows.length ? ts[i + W] : DUR) - ts[i];
  const typed = onScreen - rows[i].text.length / SPEED;
  const r = { t: ts[i], onScreen: +onScreen.toFixed(2), typed: +typed.toFixed(2), text: rows[i].text.slice(0, 28) };
  if (onScreen < 1.6) tooShort.push(r);
  else if (typed < 1.0) tight.push(r);
}
console.log("\nrows on screen < 1.6s: " + tooShort.length);
tooShort.forEach(r => console.log("   t=" + r.t + "  on=" + r.onScreen + "s  " + r.text));
console.log("rows fully typed for < 1.0s: " + tight.length);
tight.forEach(r => console.log("   t=" + r.t + "  typed=" + r.typed + "s  " + r.text));

// where is the window empty / sparse?
console.log("\nlast row visible from", ts[ts.length - W].toFixed(2), "to", DUR);
const tail = rows.slice(-W).map(r => r.t0 + " " + r.who + " " + r.text.replace(/\n/g, " / ").slice(0, 34));
console.log("final window:");
tail.forEach(x => console.log("   " + x));
