/* transcript audit: for every row, when is it on screen (inside the last 7
   bubbles), and is that long enough to read? also checks anchor coverage.

   node tools/chataudit.mjs <src/70_chat.js> [duration] */
import fs from "node:fs";

const file = process.argv[2] || "src/70_chat.js";
const DUR = +(process.argv[3] || 295.35);
const src = fs.readFileSync(file, "utf8");

// pull the DIALOGUE table out and eval it
const m = /var DIALOGUE = \[([\s\S]*?)\n  \];/.exec(src);
if (!m) { console.error("no DIALOGUE table found"); process.exit(1); }
const raw = new Function("return [" + m[1] + "];")();
const rows = raw.filter((r) => Array.isArray(r) && typeof r[0] === "number" && typeof r[1] === "string");

const FPS = 60;
const msgs = rows.map((r) => ({ t0: r[0], who: r[1], text: r[2], note: r[3] || "", fix: r[4] || "" }))
  .sort((a, b) => a.t0 - b.t0);

// guiChat types a row out over text.length / speed seconds (speed 2.4)
const SPEED = 2.4;
console.log("rows:", msgs.length, " duration:", DUR);
const distinct = new Set(msgs.map((x) => x.t0));
if (distinct.size !== msgs.length) {
  console.log("!! duplicate timestamps:",
    msgs.map(x => x.t0).filter((t, i, a) => a.indexOf(t) !== i));
}

// for each row: first frame it is drawn, last frame it survives in the last-7 window
const out = [];
for (let i = 0; i < msgs.length; i++) {
  const start = msgs[i].t0;
  // the row falls out of the window when 7 later rows have arrived
  const outAt = i + 7 < msgs.length ? msgs[i + 7].t0 : DUR;
  const typeEnd = start + msgs[i].text.length / SPEED;
  out.push({ i, start, outAt, visible: outAt - start, typeEnd, read: outAt - typeEnd, m: msgs[i] });
}
const bad = out.filter((o) => o.visible < 1.6 || o.read < 0.9);
console.log("\nrows that are on screen for <1.6 s, or fully typed for <0.9 s:");
if (!bad.length) console.log("  (none)");
for (const o of bad) {
  console.log("  t=" + o.start.toFixed(2).padStart(6) + "  on screen " + o.visible.toFixed(2) +
    "s  fully-typed " + o.read.toFixed(2) + "s  " + o.m.text.replace(/\n/g, " / ").slice(0, 34));
}
const tight = out.filter((o) => o.read >= 0.9 && o.read < 1.8);
console.log("\ntight but acceptable (fully typed for 0.9-1.8 s): " + tight.length);
for (const o of tight) console.log("  t=" + o.start.toFixed(2).padStart(6) + "  " + o.read.toFixed(2) + "s  " + o.m.text.replace(/\n/g, " / ").slice(0, 30));

// gap histogram
console.log("\ngaps between consecutive rows:");
let small = 0;
for (let i = 1; i < msgs.length; i++) {
  const g = msgs[i].t0 - msgs[i - 1].t0;
  if (g < 1.2) { small++; console.log("  tight gap " + g.toFixed(2) + "s at t=" + msgs[i].t0); }
}
console.log("  gaps < 1.2 s: " + small);

console.log("\nnotes:", msgs.filter((x) => x.note).length, " fixes:", msgs.filter((x) => x.fix).length);
console.log("first row:", msgs[0].t0, "| last row:", msgs[msgs.length - 1].t0, "of", DUR);
const total = msgs.reduce((a, x) => a + x.text.replace(/\n/g, "").length, 0);
console.log("total characters of dialogue:", total);

// anchor coverage: the lrc moments the brief names
const LRC = [
  [14.36, "Side by side, the lovelier goes up"],
  [40.90, "If you turn into a table"],
  [54.46, "eggplant"],
  [68.17, "I'm searching"],
  [82.89, "cat"],
  [96.64, "steak"],
  [109.72, "flower"],
  [123.44, "human"],
  [137.09, "I'm searching"],
  [175.43, "What's that word again?"],
  [177.35, "Lo-o-o-o-ove"],
  [189.37, "can't stop transforming"],
  [203.16, "my old self that's gone"],
  [207.14, "bucket of love"],
  [214.35, "some of us empty"],
  [221.18, "break us down to the cell"],
  [228.16, "merge us back up"],
  [261.21, "I'm searching"],
  [275.53, "dog"],
  [285.36, "tomato"]
];
console.log("\nnearest row to each named lyric moment:");
for (const [t, label] of LRC) {
  let best = null, bd = 1e9;
  for (const x of msgs) { const d = Math.abs(x.t0 - t); if (d < bd) { bd = d; best = x; } }
  console.log("  " + t.toFixed(2).padStart(7) + "  +" + (best.t0 - t).toFixed(2).padStart(6) + "s  " +
    label.padEnd(32) + " -> " + best.who.padEnd(3) + " " + best.text.replace(/\n/g, " / ").slice(0, 30));
}
