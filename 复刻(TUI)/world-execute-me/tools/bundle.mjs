/* ============================================================================
   bundle.mjs -- inline every asset + script into one standalone HTML file that
   runs straight from the filesystem (file://), no server required.

   node tools/bundle.mjs [outFile]
   ========================================================================== */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] || path.join(ROOT, "world.execute(me).html");

const read = (p) => fs.readFileSync(path.join(ROOT, p));
const b64 = (p) => read(p).toString("base64");

const SCRIPTS = [
  "src/00_core.js", "src/10_render.js", "src/20_hud.js", "src/25_viz.js",
  "src/30_data.js", "src/50_audiobar.js", "src/40_main.js",
  "src/sections/a_01_05.js", "src/sections/b_06_10.js", "src/sections/c_11_15.js"
];

const embed = {
  "world-execute-me.mp3": b64("assets/audio/world-execute-me.mp3"),
  "meta.json": read("assets/analysis/meta.json").toString("utf8"),
  "spectrum.bin": b64("assets/analysis/spectrum.bin"),
  "wave.bin": b64("assets/analysis/wave.bin"),
  "energy.bin": b64("assets/analysis/energy.bin")
};

const js = SCRIPTS.map((s) => "/* ==== " + s + " ==== */\n" + read(s).toString("utf8")).join("\n;\n");

// A single ~11 MB string literal in one <script> does not survive file:// in
// Chromium, so the big base64 payloads are appended in ~512 KB chunks.
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
<html lang="en">
<head>
<meta charset="utf-8">
<title>world.execute(me); — computed visual study</title>
<style>
  html,body{margin:0;padding:0;background:#000;overflow:hidden;width:100%;height:100%;
            font-family:"Cascadia Mono",Consolas,monospace;color:#cfd6de}
  #gl{display:block;width:100vw;height:100vh}
  #start{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);
         background:rgba(8,10,14,.9);border:1px solid rgba(53,224,255,.55);color:#eef2f6;
         padding:22px 34px;font:600 16px/1.5 "Cascadia Mono",Consolas,monospace;cursor:pointer;
         letter-spacing:1px;text-align:center;z-index:9}
  #start:hover{border-color:#ffc94a;color:#ffc94a}
  #start small{display:block;margin-top:8px;color:#7f8892;font-weight:400;letter-spacing:0}
</style>
</head>
<body>
<canvas id="gl" width="1920" height="1080"></canvas>
<button id="start">▶ START PLAYBACK<small>world.execute(me); — Mili<br>audio + visualizer, fully offline</small></button>

<script>window.__EMB = {};</script>
${embedScripts}
<script>window.WEM = { EMBED: window.__EMB };</script>
<script>
${js}
</script>
<script>
(function(){
  window.WEM_AB_GAIN = 0.88;
  window.WEM_AB_EXPO = 0.30;   // taller bars
  window.WEM_AB_MUL = 1.62;
  window.WEM_BANDS_GAIN = 0.22;
  window.WEM.boot({ mode: "play" }).then(function(){
    window.__booted = true;
  }).catch(function(e){
    window.__bootError = String(e && e.stack || e);
    document.body.innerHTML = "<pre style='color:#ff8a80;padding:30px;white-space:pre-wrap'>" + window.__bootError + "</pre>";
  });
})();
</script>
</body>
</html>
`;

fs.writeFileSync(out, html);
console.log("wrote", out, (fs.statSync(out).size / 1048576).toFixed(1) + " MB");
