import fs from "node:fs";
const meta = JSON.parse(fs.readFileSync("assets/analysis/meta.json", "utf8"));
const lrc = meta.lrc.filter((l) => !l.meta).sort((a, b) => a.t - b.t);

// normalize for matching: lowercase, collapse spaces, strip punctuation
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
function timeOf(text) {
  const want = norm(text);
  // exact, then prefix, then contained
  let hit = lrc.find((l) => norm(l.text) === want);
  if (!hit) hit = lrc.find((l) => norm(l.text).startsWith(want.slice(0, 14)));
  if (!hit) hit = lrc.find((l) => want.startsWith(norm(l.text).slice(0, 14)) && norm(l.text).length > 6);
  return hit ? hit.t : null;
}

const p = "src/sections4/tui_a.js";
let s = fs.readFileSync(p, "utf8");

// every user/her message in the script that quotes a lyric gets the metadata time
const re = /\{ who: "(user|her)", text: "((?:[^"\\]|\\.)*)", t0: ([\d.]+)/g;
const report = [];
s = s.replace(re, (m, who, text, t0) => {
  const plain = text.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  const t = timeOf(plain);
  if (t === null) return m;
  report.push(`  ${t.toFixed(3).padStart(8)}  ${plain.slice(0, 44)}`);
  return `{ who: "${who}", text: "${text}", t0: ${t.toFixed(3)}`;
});
fs.writeFileSync(p, s);
console.log("re-timed to metadata lyric clock:");
console.log(report.join("\n") || "  (none matched)");

// and the annotation windows follow the same clock
const L = "src/62_lyric.js";
let ly = fs.readFileSync(L, "utf8");
const win = [
  ["points", "If I'm a set of points"],
  ["circle", "If I'm a circle"],
  ["sine", "If I'm a sine wave"],
  ["limit", "If I approach infinity"],
  ["rect", "Switch my current"],
  ["time", "To A.D to B.C"]
];
const times = win.map(([k, t]) => [k, timeOf(t), t]);
console.log("\nannotation anchors:");
times.forEach(([k, t, src]) => console.log(`  ${String(t).padStart(8)}  ${k}   (${src})`));
console.log("\nmeta ranges: first", lrc[0].t, "last", lrc[lrc.length - 1].t, "n=" + lrc.length);
