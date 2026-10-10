import fs from "node:fs";
fs.copyFileSync("src/sections4/tui_a.bak", "src/sections4/tui_a.js");
const meta = JSON.parse(fs.readFileSync("assets/analysis/meta.json", "utf8"));
const lrc = meta.lrc.filter((l) => !l.meta).sort((a, b) => a.t - b.t);
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();

// strict: a scripted line is a lyric only if it is pure latin and matches an
// LRC line exactly (or shares a long prefix). Everything else keeps its time.
function timeOf(plain) {
  if (/[^\x00-\x7F]/.test(plain)) return null;
  const want = norm(plain);
  if (want.length < 6) return null;
  let hit = lrc.find((l) => norm(l.text) === want);
  if (!hit) hit = lrc.find((l) => norm(l.text).length > 10 && (norm(l.text).startsWith(want.slice(0, 12)) || want.startsWith(norm(l.text).slice(0, 12))));
  return hit ? hit.t : null;
}

const p = "src/sections4/tui_a.js";
let s = fs.readFileSync(p, "utf8");
const msgs = [];
const re = /\{ who: "(user|her)", text: "((?:[^"\\]|\\.)*)", t0: ([\d.]+)/g;
s = s.replace(re, (m, who, text, t0) => {
  const plain = text.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  const t = timeOf(plain);
  msgs.push({ who, text, plain, t0: parseFloat(t0), locked: t !== null, t });
  return `\u0000${msgs.length - 1}\u0000`;   // placeholder, rewritten below
});
// rebuild in order: lyrics take their real time; replies sit 0.35 s after the
// line they answer; anything else keeps relative spacing
let prev = 0.1;
for (let i = 0; i < msgs.length; i++) {
  const m = msgs[i];
  if (m.locked) m.newT = m.t;
  else m.newT = Math.max(prev + 0.35, m.t0);
  prev = m.newT;
}
// second pass: pull any block of replies that ended up bunched at the very start
let out = s;
for (let i = 0; i < msgs.length; i++) {
  const m = msgs[i];
  out = out.replace(`\u0000${i}\u0000`, `{ who: "${m.who}", text: "${m.text}", t0: ${m.newT.toFixed(3)}`);
}
fs.writeFileSync(p, out);
console.log("re-timed:");
msgs.forEach((m) => console.log(`  ${m.newT.toFixed(3).padStart(8)}${m.locked ? " *" : "  "} ${m.plain.slice(0, 40)}`));
