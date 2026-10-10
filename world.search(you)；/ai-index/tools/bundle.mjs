/* ============================================================================
   bundle.mjs -- inline every asset + script into one standalone HTML file that
   runs straight from the filesystem (file://), no server required.

   node tools/bundle.mjs [outFile]
   ========================================================================== */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] || path.join(ROOT, "world.search(you).index.html");

const read = (p) => fs.readFileSync(path.join(ROOT, p));
const b64 = (p) => read(p).toString("base64");

const SCRIPTS = [
  "src/00_core.js", "src/10_render.js", "src/20_hud.js", "src/25_viz.js",
  "src/26_lab.js", "src/27_model.js", "src/30_data.js", "src/50_audiobar.js",
  "src/40_main.js", "src/60_tui.js", "src/62_lyric.js", "src/28_index.js",
  "src/sections/a_01_06.js", "src/sections/b_07_12.js",
  "src/sections/c_13_17.js", "src/sections/d_18_22.js"
];

const embed = {
  "world-search-you.mp3": b64("assets/audio/world-search-you.mp3"),
  "meta.json": read("assets/analysis/meta.json").toString("utf8"),
  "spectrum.bin": b64("assets/analysis/spectrum.bin"),
  "wave.bin": b64("assets/analysis/wave.bin"),
  "energy.bin": b64("assets/analysis/energy.bin")
};

const js = SCRIPTS.map((s) => "/* ==== " + s + " ==== */\n" + read(s).toString("utf8")).join("\n;\n");

// A single multi-megabyte string literal in one <script> does not survive
// file:// in Chromium, so the big base64 payloads are appended in ~512 KB chunks.
function chunkedEmbed(key, value) {
  if (value.length <= 512 * 1024) {
    return `<script>window.__EMB["${key}"] = ${JSON.stringify(value)};</script>\n`;
  }
  let out = `<script>window.__EMB["${key}"] = "";</script>\n`;
  for (let i = 0; i < value.length; i += 512 * 1024) {
    out += `<script>window.__EMB["${key}"] += ${JSON.stringify(value.slice(i, i + 512 * 1024))};</script>\n`;
  }
  return out;
}
const embedScripts = Object.keys(embed).map((k) => chunkedEmbed(k, embed[k])).join("");

const html = `<!DOCTYPE html>
<html lang="en" class="wem-light">
<head>
<meta charset="utf-8">
<title>world.search(you); — THE INDEX OF YOU</title>
<script>window.WEM_THEME = "light";</script>
<style>
  html,body{margin:0;padding:0;background:#f1efe8;overflow:hidden;width:100%;height:100%;
            font-family:"Cascadia Mono",Consolas,monospace;color:#2b323a}
  #gl{display:block;width:100vw;height:100vh}
  #start{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);
         background:rgba(252,251,247,.95);border:1px solid rgba(0,120,150,.55);color:#1b2128;
         padding:24px 38px;font:600 16px/1.6 "Cascadia Mono",Consolas,monospace;cursor:pointer;
         letter-spacing:1px;text-align:center;z-index:9;box-shadow:0 8px 30px rgba(40,44,50,.16)}
  #start:hover{border-color:#a8651a;color:#a8651a}
  #start b{display:block;font-size:19px;letter-spacing:2px;margin-bottom:10px;color:#a8651a}
  #start small{display:block;margin-top:10px;color:#6d757e;font-weight:400;letter-spacing:0;font-size:12px}
</style>
</head>
<body>
<canvas id="gl" width="1920" height="1080"></canvas>
<button id="start"><b>world.search(you);</b>▶ START PLAYBACK<small>Mili — world.search (you) ;<br>THE INDEX OF YOU · 1945 → 2026 · paper edition<br>every score, every neighbour: actually computed</small></button>

<script>window.__EMB = {};</script>
${embedScripts}
<script>window.WEM = { EMBED: window.__EMB };</script>
<script>
${js}
</script>
<script>
(function(){
  var play = !new URLSearchParams(location.search).has("render");
  window.WEM_AB_GAIN = 0.80;
  window.WEM_AB_EXPO = 0.50;
  window.WEM_AB_MUL = 1.55;
  window.WEM_BANDS_GAIN = 0.30;
  window.WEM.boot({ mode: play ? "play" : "render" }).then(function(){
    window.__booted = true;
    if (!play) { document.getElementById("start").style.display = "none"; }
  }).catch(function(e){
    window.__bootError = String(e && e.stack || e);
    document.body.innerHTML = "<pre style='color:#a03030;padding:30px;white-space:pre-wrap'>" + window.__bootError + "</pre>";
  });
})();
</script>
</body>
</html>
`;

fs.writeFileSync(out, html);
console.log("wrote", out, (fs.statSync(out).size / 1048576).toFixed(1) + " MB");
