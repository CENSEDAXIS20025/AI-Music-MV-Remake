/* ============================================================================
   bundlecanvas.mjs -- load a standalone bundle straight from file://, render a
   few deterministic frames and dump the CANVAS (not the page) as PNG, so two
   bundles can be compared pixel for pixel through a CDP screenshot.

   node tools/bundlecanvas.mjs <bundle.html> <outdir> [t,t,...] [w] [h]
   ========================================================================== */
import { launchBrowser, CDP, sleep } from "./cdp.mjs";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2];
const outdir = process.argv[3] || "out/theme/canvas";
const times = (process.argv[4] || "3,178").split(",").map(Number);
const W = +(process.argv[5] || 1280), H = +(process.argv[6] || 720);
const PORT = 9371 + (Number(process.env.WEM_PORT_OFFSET) || 0);

const abs = path.isAbsolute(file) ? file : path.join(ROOT, file);
const url = pathToFileURL(abs).href;

const browser = await launchBrowser({ port: PORT, width: W, height: H });
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
const cdp = new CDP(ws);
await cdp.send("Runtime.enable");
await cdp.send("Page.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await cdp.send("Page.navigate", { url });

async function ev(expr) {
  const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error("page error: " + JSON.stringify(r.exceptionDetails).slice(0, 600));
  return r.result.value;
}

for (let i = 0; i < 400; i++) {
  const st = await ev("JSON.stringify({b:!!window.__booted,e:window.__bootError||null})");
  const o = JSON.parse(st);
  if (o.e) { console.error("BOOT ERROR:\n" + o.e); process.exit(1); }
  if (o.b) break;
  if (i === 399) { console.error("page never booted"); process.exit(1); }
  await sleep(150);
}

// the DOM chrome (START button, seek bar, theme toggle) is not part of the film
await ev("['start','wem-seek','wem-theme'].forEach(function(id){var e=document.getElementById(id); if(e) e.style.display='none';})");
await ev("if(window.WEM.app&&window.WEM.app.audio) window.WEM.app.audio.pause();");
// the bundle boots in play mode, whose rAF loop keeps calling setSection(0)
// while the audio sits paused at t=0 -- that races with __render and injects
// spurious section-change flashes. Park the app in render mode so a comparison
// between two bundles is deterministic.
await ev("window.WEM.app.mode='render';");

fs.mkdirSync(path.join(ROOT, outdir), { recursive: true });
const theme = await ev("window.WEM.Theme ? window.WEM.Theme.mode : 'n/a'");
console.log("theme:", theme);
for (const t of times) {
  for (let w = 40; w >= 0; w--) await ev(`window.__render(${(t - w / 30).toFixed(4)})`);
  const data = await ev("document.getElementById('gl').toDataURL('image/png')");
  const buf = Buffer.from(String(data).split(",")[1], "base64");
  const f = path.join(ROOT, outdir, `t_${String(t).replace(".", "_")}.png`);
  fs.writeFileSync(f, buf);
  console.log("wrote", f, (buf.length / 1024).toFixed(0) + "KB");
}
try { browser.proc.kill(); } catch { }
process.exit(0);
