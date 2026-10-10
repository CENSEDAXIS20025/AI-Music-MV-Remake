/* structural check on the DIALOGUE table in src/70_chat.js */
import fs from "node:fs";
const s = fs.readFileSync(process.argv[2] || "src/70_chat.js", "utf8");
const start = s.indexOf("var DIALOGUE = [");
if (start < 0) { console.error("no DIALOGUE table"); process.exit(1); }
// bracket-match to the real end of the array, so an `];` inside a comment
// further down the file cannot truncate it
let depth = 0, end = -1, inStr = false, q = "";
for (let i = s.indexOf("[", start); i < s.length; i++) {
  const c = s[i];
  if (inStr) { if (c === "\\") i++; else if (c === q) inStr = false; continue; }
  if (c === '"' || c === "'") { inStr = true; q = c; continue; }
  if (c === "[") depth++;
  else if (c === "]") { if (--depth === 0) { end = i; break; } }
}
const body = s.slice(s.indexOf("[", start) + 1, end);
const rows = body.split("\n").map(l => l.trim()).filter(l => l.startsWith("["));
console.log("table chars:", body.length, "row lines:", rows.length);
const re = /^\[\s*([0-9.]+)\s*,\s*"(you|her)"\s*,/;
const bad = rows.filter(l => !re.test(l));
console.log("malformed:", bad.length);
bad.slice(0, 6).forEach(b => console.log("   ", b.slice(0, 90)));
const ts = rows.map(l => parseFloat(re.exec(l)[1]));
const dup = ts.filter((t, i, a) => a.indexOf(t) !== i);
console.log("duplicate timestamps:", dup);
console.log("out of order:", ts.filter((t, i) => i && t < ts[i - 1]));
console.log("first/last:", ts[0], ts[ts.length - 1]);
console.log("you rows:", rows.filter(l => /"(you)"/.test(re.exec(l)[0])).length,
  " her rows:", rows.filter(l => /"(her)"/.test(re.exec(l)[0])).length);
// workable window: with 7 bubbles, a row is on screen until the 7th later row
const W = 7, DUR = 295.35;
const idx = ts.map((t, i) => ({ t, i }));
let worst = null;
for (let i = 0; i < idx.length; i++) {
  const outAt = i + W < idx.length ? idx[i + W].t : DUR;
  const vis = outAt - idx[i].t;
  if (!worst || vis < worst.vis) worst = { vis, t: idx[i].t, i };
}
console.log("shortest time on screen:", worst.vis.toFixed(2) + "s at t=" + worst.t);
const under = [];
for (let i = 0; i < idx.length; i++) {
  const outAt = i + W < idx.length ? idx[i + W].t : DUR;
  if (outAt - idx[i].t < 1.6) under.push([idx[i].t, +(outAt - idx[i].t).toFixed(2)]);
}
console.log("rows on screen <1.6s:", JSON.stringify(under));
