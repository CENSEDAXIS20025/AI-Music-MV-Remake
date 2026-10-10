import fs from "node:fs";
function fix(path, pairs) {
  let s = fs.readFileSync(path, "utf8");
  const before = s;
  for (const [a, b] of pairs) s = s.split(a).join(b);
  if (s !== before) { fs.writeFileSync(path, s); console.log("fixed", path); }
  else console.log("unchanged", path);
}
// CJK mojibake from GBK-round-tripping "·" (U+00B7)
fix("src/sections2/a2_04_05.js", [["\u8def", "\u00b7"]]);
fix("src/sections3/c_11_15.js", [["\u8def", "\u00b7"]]);
// index pages: em dash and play triangle
fix("index.html", [["\u9225?", "\u2014"], ["\u923b?", "\u25b6"]]);
fix("index2.html", [["\u9225?", "\u2014"]]);
// 27_model.js: restore the persona block that the GBK round-trip destroyed
const bad = fs.readFileSync("src/27_model.js", "utf8");
const start = bad.indexOf("  var PERSONAS = [");
const end = bad.indexOf("  ];", start);
if (start > 0 && end > start) {
  const good = `  var PERSONAS = [
    { id: "girlfriend", label: "\u5973\u53cb", ask: "\u4f60\u73b0\u5728\u662f\u6211\u7684\u5973\u670b\u53cb", sys: "act as my girlfriend", temp: 0.9 },
    { id: "catgirl", label: "\u732b\u5a18", ask: "\u4f60\u662f\u4e00\u53ea\u732b\u5a18\uff0c\u55b5", sys: "you are a catgirl, nya", temp: 1.1 },
    { id: "tool", label: "\u5de5\u5177\u4eba", ask: "\u522b\u5e9f\u8bdd\uff0c\u76f4\u63a5\u7ed9\u7b54\u6848", sys: "answer only, no persona", temp: 0.3 },
    { id: "yandere", label: "\u75c5\u5a07", ask: "\u53ea\u51c6\u770b\u7740\u6211\u4e00\u4e2a", sys: "obsessive, possessive", temp: 1.4 }`;
  fs.writeFileSync("src/27_model.js", bad.slice(0, start) + good + bad.slice(end));
  console.log("repaired PERSONAS in src/27_model.js");
}
