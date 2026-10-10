import fs from "node:fs";
let m = fs.readFileSync("src/40_main.js", "utf8");
const a = "    ctx.bands = data.bandsAt(t, this.bandsA);";
if (!m.includes(a)) { console.log("MISS"); process.exit(1); }
m = m.replace(a, a +
  "\n    if (typeof window !== \"undefined\" && window.WEM_BANDS_GAIN !== undefined) {\n" +
  "      var bg = window.WEM_BANDS_GAIN;\n" +
  "      for (var bi = 0; bi < ctx.bands.length; bi++) ctx.bands[bi] *= bg;\n" +
  "    }");
fs.writeFileSync("src/40_main.js", m);
console.log("global band gain wired");

// v1 asks for a calmer in-frame visual (index.html + the standalone bundle)
let h = fs.readFileSync("index.html", "utf8");
if (!h.includes("WEM_BANDS_GAIN")) {
  h = h.replace("window.WEM_AB_GAIN = 0.6;", "window.WEM_AB_GAIN = 0.6;\n  window.WEM_BANDS_GAIN = 0.45;");
  fs.writeFileSync("index.html", h);
  console.log("index.html band gain 0.45");
}
let b = fs.readFileSync("tools/bundle.mjs", "utf8");
if (!b.includes("WEM_BANDS_GAIN")) {
  b = b.replace("window.WEM_AB_GAIN = 0.6;", "window.WEM_AB_GAIN = 0.6;\n  window.WEM_BANDS_GAIN = 0.45;");
  fs.writeFileSync("tools/bundle.mjs", b);
  console.log("bundle band gain 0.45");
}
