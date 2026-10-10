/* ============================================================================
   bundle.mjs -- inline every asset + script into one standalone HTML file that
   runs straight from the filesystem (file://), no server required.

   node tools/bundle.mjs [outFile] [--light] [--chat]

   --light writes the paper (light) theme entry: identical bundle, but
   window.WEM_THEME = "light" is set before the engine boots. Both files carry
   the in-page theme toggle, so either one can flip to the other look live.

   --chat adds the dsh chat overlay: src/60_tui.js + src/61_gadgets.js (the
   toolkit copied from the previous film) + src/70_chat.js (this song's
   transcript) and the frame wrapper that paints the window over the film.
   Default output names follow the flags:
     world.search(you).html
     world.search(you).light.html
     world.search(you).chat.html
     world.search(you).chat.light.html
   ========================================================================== */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const LIGHT = args.includes("--light");
const CHAT = args.includes("--chat");
const outArg = args.find((a) => !a.startsWith("--"));
const out = outArg || path.join(ROOT,
  "world.search(you)" + (CHAT ? ".chat" : "") + (LIGHT ? ".light" : "") + ".html");

const read = (p) => fs.readFileSync(path.join(ROOT, p));
const b64 = (p) => read(p).toString("base64");

const SCRIPTS = [
  "src/00_core.js", "src/10_render.js", "src/20_hud.js", "src/25_viz.js",
  "src/26_lab.js", "src/27_sui.js", "src/30_data.js", "src/50_audiobar.js", "src/40_main.js",
  "src/sections/a_01_05.js", "src/sections/b_06_10.js",
  "src/sections/c_11_15.js", "src/sections/d_16_22.js"
].concat(CHAT ? ["src/60_tui.js", "src/61_gadgets.js", "src/70_chat.js"] : []);

const embed = {
  "world-search-you.mp3": b64("assets/audio/world-search-you.mp3"),
  "meta.json": read("assets/analysis/meta.json").toString("utf8"),
  "spectrum.bin": b64("assets/analysis/spectrum.bin"),
  "wave.bin": b64("assets/analysis/wave.bin"),
  "energy.bin": b64("assets/analysis/energy.bin")
};

const js = SCRIPTS.map((s) => "/* ==== " + s + " ==== */\n" + read(s).toString("utf8")).join("\n;\n");

// ---- the chat overlay hook (only in the --chat bundles) --------------------
// install() wraps App.frame() and defers the HUD upload until the overlay has
// painted, so not one of the 22 segment files has to change and the plain
// bundles stay exactly as they were.
const CHAT_HOOK = CHAT ? `
(function(){
  try { WEM.Chat.install(WEM.app); }
  catch (e) { window.__chatError = String(e && e.stack || e); console.error(e); }
})();
` : "";

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
<html lang="en"${LIGHT ? ' class="wem-light"' : ""}>
<head>
<meta charset="utf-8">
<title>world.search(you); — computed visual study${CHAT ? " · chat overlay" : ""}${LIGHT ? " (paper)" : ""}</title>
<script>window.WEM_THEME = ${LIGHT ? '"light"' : '"dark"'};</script>
<script>
  // Resolve the theme before anything paints (no dark flash on the paper page).
  // window.WEM_THEME is baked into this file; ?theme=light|dark overrides it so
  // either bundle can be captured in the other look.
  (function () {
    var light = window.WEM_THEME === "light";
    try {
      var q = new URLSearchParams(location.search);
      if (q.has("theme")) light = q.get("theme") === "light";
    } catch (e) { }
    window.WEM_THEME = light ? "light" : "dark";
    document.documentElement.className = light ? "wem-light" : "";
  })();
</script>
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
  /* ---- paper theme: the same chrome printed instead of lit ---- */
  html.wem-light,html.wem-light body{background:#f1efe8;color:#2b323a}
  html.wem-light #start{background:rgba(252,251,247,.94);border-color:rgba(0,130,160,.6);color:#1b2128;
                        box-shadow:0 8px 30px rgba(40,44,50,.16)}
  html.wem-light #start:hover{border-color:#a8651a;color:#a8651a}
  html.wem-light #start small{color:#6d757e}
</style>
</head>
<body>
<canvas id="gl" width="1920" height="1080"></canvas>
<button id="start">▶ START PLAYBACK<small>world.search(you); — Mili${CHAT ? " · chat overlay" : ""}<br>audio + visualizer, fully offline${LIGHT ? " · paper theme" : ""}</small></button>

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
${CHAT_HOOK}
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
