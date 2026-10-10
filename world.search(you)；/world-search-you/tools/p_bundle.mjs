import fs from "node:fs";
const p = "tools/bundle.mjs";
let s = fs.readFileSync(p, "utf8");

// 1. the script set for THIS song (must match index.html exactly)
const oldList = `const SCRIPTS = [
  "src/00_core.js", "src/10_render.js", "src/20_hud.js", "src/25_viz.js",
  "src/30_data.js", "src/50_audiobar.js", "src/40_main.js",
  "src/sections/a_01_05.js", "src/sections/b_06_10.js", "src/sections/c_11_15.js"
];`;
const newList = `const SCRIPTS = [
  "src/00_core.js", "src/10_render.js", "src/20_hud.js", "src/25_viz.js",
  "src/26_lab.js", "src/27_sui.js", "src/30_data.js", "src/50_audiobar.js", "src/40_main.js",
  "src/sections/a_01_05.js", "src/sections/b_06_10.js",
  "src/sections/c_11_15.js", "src/sections/d_16_22.js"
];`;
if (!s.includes(oldList)) { console.log("MISS script list"); process.exit(1); }
s = s.replace(oldList, newList);

// 2. this song's audio
s = s.replace('"world-execute-me.mp3": b64("assets/audio/world-execute-me.mp3"),',
              '"world-search-you.mp3": b64("assets/audio/world-search-you.mp3"),');

// 3. default output name
s = s.replace('path.join(ROOT, "world.execute(me).html")', 'path.join(ROOT, "world.search(you).html")');

// 4. page title / button copy if present
s = s.replace(/world\.execute\(me\);/g, "world.search(you);");
s = s.replace(/world-execute-me\.mp3/g, "world-search-you.mp3");

fs.writeFileSync(p, s);
console.log("bundle.mjs adapted for world.search(you);");
