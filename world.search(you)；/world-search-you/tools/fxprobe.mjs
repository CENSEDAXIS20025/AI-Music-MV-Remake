/* probe the render state of a bundle at a given time (fx + audio + hud state) */
import { launchBrowser, CDP, sleep } from "./cdp.mjs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2];
const t = +(process.argv[3] || 230);
const PORT = 9381 + (Number(process.env.WEM_PORT_OFFSET) || 0);
const url = pathToFileURL(path.isAbsolute(file) ? file : path.join(ROOT, file)).href;

const browser = await launchBrowser({ port: PORT, width: 960, height: 540 });
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const ws = new WebSocket(list.find((x) => x.type === "page").webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
await cdp.send("Runtime.enable");
await cdp.send("Page.enable");
await cdp.send("Page.navigate", { url });
async function ev(e) {
  const r = await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500));
  return r.result.value;
}
for (let i = 0; i < 400; i++) {
  const s = JSON.parse(await ev("JSON.stringify({b:!!window.__booted,e:window.__bootError||null})"));
  if (s.e) { console.error(s.e); process.exit(1); }
  if (s.b) break;
  await sleep(150);
}
const snap = `(function(){var R=window.WEM.app.renderer,f=R.fx,a=window.WEM.app.audio;return JSON.stringify({
  audioT:+a.currentTime.toFixed(3), paused:a.paused, appTime:+window.WEM.app.time.toFixed(3),
  flash:+f.flash.toFixed(4), glitch:+f.glitch.toFixed(4), disp:+f.disp.toFixed(4), whiteBar:+f.whiteBar.toFixed(4),
  fade:f.fade, exposure:f.exposure, bloom:f.bloom, hud:f.hud, stripes:f.stripes, mood:f.mood,
  moodColor:f.moodColor, moodColor2:f.moodColor2, crtOn:f.crtOn, crtOff:f.crtOff, invert:f.invert,
  scan:f.scan, grille:f.grille, vignette:f.vignette, grain:f.grain, curve:f.curve, theme:R.themeLight
});})()`;
console.log("at boot      ", await ev(snap));
for (let w = 40; w >= 0; w--) await ev(`window.__render(${(t - w / 30).toFixed(4)})`);
console.log("after warmup ", await ev(snap));
await sleep(400);
console.log("after 400ms  ", await ev(snap));
console.log("frame rAF-rendered time now:", await ev("window.WEM.app.time"));
try { browser.proc.kill(); } catch { }
process.exit(0);
