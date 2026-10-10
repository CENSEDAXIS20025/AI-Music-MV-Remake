import fs from "node:fs";
let b = fs.readFileSync("tools/bundle.mjs", "utf8");
const oldList = `  "src/30_data.js", "src/40_main.js",`;
const newList = `  "src/30_data.js", "src/50_audiobar.js", "src/40_main.js",`;
if (!b.includes(oldList)) { console.log("MISS script list"); process.exit(1); }
b = b.replace(oldList, newList);
// v1 wants a calmer meter
if (!b.includes("WEM_AB_GAIN")) {
  b = b.replace('window.WEM.boot({ mode: "play" })',
                'window.WEM_AB_GAIN = 0.6;\n  window.WEM.boot({ mode: "play" })');
}
fs.writeFileSync("tools/bundle.mjs", b);
console.log("bundle now includes the audio meter, v1 gain 0.6");
