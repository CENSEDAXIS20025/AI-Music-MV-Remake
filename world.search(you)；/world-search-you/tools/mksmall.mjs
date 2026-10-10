import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2];
const SCRIPTS = ["src/00_core.js","src/10_render.js","src/20_hud.js","src/25_viz.js","src/30_data.js","src/40_main.js","src/sections/a_01_05.js","src/sections/b_06_10.js","src/sections/c_11_15.js"];
const embed = { "meta.json": fs.readFileSync(path.join(ROOT,"assets/analysis/meta.json"),"utf8") };
const js = SCRIPTS.map(s => "/* "+s+" */\n"+fs.readFileSync(path.join(ROOT,s),"utf8")).join("\n;\n");
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>t</title></head><body>
<canvas id="gl" width="640" height="360"></canvas>
<script>window.WEM={EMBED:${JSON.stringify(embed)}};</script>
<script>${js}</script>
<script>window.WEM.boot({mode:"render"}).then(()=>{window.__booted=true}).catch(e=>{window.__bootError=String(e)});</script>
</body></html>`;
fs.writeFileSync(out, html);
console.log("wrote", out, (fs.statSync(out).size/1048576).toFixed(2)+" MB");
