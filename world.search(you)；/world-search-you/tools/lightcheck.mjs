/* ============================================================================
   lightcheck.mjs -- open the standalone paper bundle over file://, press START,
   and confirm the film actually plays there: frames advancing, audio running,
   the theme live-toggling, and no console errors.

   node tools/lightcheck.mjs ["world.search(you).light.html"] [seconds]
   ========================================================================== */
import { launchBrowser, CDP, sleep } from "./cdp.mjs";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2] || "world.search(you).light.html";
const seconds = +(process.argv[3] || 6);
const PORT = 9361;

const abs = path.isAbsolute(file) ? file : path.join(ROOT, file);
if (!fs.existsSync(abs)) { console.error("missing", abs); process.exit(1); }
const url = pathToFileURL(abs).href;

const browser = await launchBrowser({ port: PORT, width: 1280, height: 720 });
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
const cdp = new CDP(ws);

const errors = [];
let consoleErr = 0;
await cdp.send("Runtime.enable");
await cdp.send("Log.enable").catch(() => { });
await cdp.send("Page.enable");
cdp.on("Runtime.exceptionThrown", (p) => errors.push("exception: " + JSON.stringify(p.exceptionDetails).slice(0, 400)));
cdp.on("Runtime.consoleAPICalled", (p) => {
  const txt = (p.args || []).map((a) => a.value ?? a.description ?? a.type).join(" ");
  if (p.type === "error") { consoleErr++; errors.push("console.error: " + txt.slice(0, 400)); }
  else if (p.type === "warning") { consoleErr++; errors.push("console.warn: " + txt.slice(0, 400)); }
});
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await cdp.send("Page.navigate", { url });

async function ev(expr) {
  const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error("page error: " + JSON.stringify(r.exceptionDetails).slice(0, 600));
  return r.result.value;
}

let ok = false;
for (let i = 0; i < 400; i++) {
  const st = await ev("JSON.stringify({b:!!window.__booted,e:window.__bootError||null})");
  const o = JSON.parse(st);
  if (o.e) { console.error("BOOT ERROR:\n" + o.e); process.exit(1); }
  if (o.b) { ok = true; break; }
  await sleep(150);
}
if (!ok) { console.error("page never booted"); process.exit(1); }
console.log("booted from", url);

const before = await ev(`JSON.stringify({
  theme: window.WEM.Theme.mode, light: window.WEM.Theme.light,
  cls: document.documentElement.className,
  bodyBg: getComputedStyle(document.body).backgroundColor,
  startVisible: getComputedStyle(document.getElementById("start")).display,
  btn: !!document.getElementById("wem-theme"), seek: !!document.getElementById("wem-seek"),
  muted: !!window.WEM.app.audio && window.WEM.app.audio.muted
})`);
console.log("pre-click:", before);

// press START (the browser is launched with --autoplay-policy=no-user-gesture-required)
await ev("document.getElementById('start').click()");
await sleep(1200);
const mid = JSON.parse(await ev(`JSON.stringify({
  paused: window.WEM.app.audio.paused, t: window.WEM.app.audio.currentTime,
  frameT: window.WEM.app.time, startHidden: document.getElementById('start').style.display,
  seek: !!document.getElementById('wem-seek')
})`));
const h1 = await ev("document.getElementById('gl').toDataURL('image/png').length + ':' + document.getElementById('gl').toDataURL('image/png').slice(-64)");
await sleep(seconds * 1000);
const end = JSON.parse(await ev(`JSON.stringify({
  paused: window.WEM.app.audio.paused, t: window.WEM.app.audio.currentTime,
  frameT: window.WEM.app.time, raf: !!window.WEM.app.raf
})`));
const h2 = await ev("document.getElementById('gl').toDataURL('image/png').length + ':' + document.getElementById('gl').toDataURL('image/png').slice(-64)");

console.log("after 1.2s:", JSON.stringify(mid));
console.log("after " + seconds + "s:", JSON.stringify(end));
console.log("frame changed:", h1 !== h2, "(", h1.split(":")[0], "->", h2.split(":")[0], "b64 chars )");

// live theme toggle
await ev("document.getElementById('wem-theme').click()");
await sleep(700);
const toggled = await ev(`JSON.stringify({mode:window.WEM.Theme.mode, cls:document.documentElement.className,
  bodyBg:getComputedStyle(document.body).backgroundColor, label:document.getElementById('wem-theme').textContent})`);
await ev("document.getElementById('wem-theme').click()");
await sleep(400);
const back = await ev("JSON.stringify({mode:window.WEM.Theme.mode, cls:document.documentElement.className, label:document.getElementById('wem-theme').textContent})");
console.log("after toggle:", toggled);
console.log("toggled back:", back);

const s = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
fs.mkdirSync(path.join(ROOT, "out/theme"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "out/theme/live_bundle_play.png"), Buffer.from(s.data, "base64"));
console.log("wrote out/theme/live_bundle_play.png");

await sleep(500);
console.log("console errors/warnings:", consoleErr);
for (const e of errors) console.log("   ", e);

const verdict = {
  booted: true,
  audioPlaying: !mid.paused && end.t > 2,
  framesAdvancing: h1 !== h2 && end.frameT > mid.frameT,
  noConsoleErrors: consoleErr === 0
};
console.log("VERDICT", JSON.stringify(verdict));
try { browser.proc.kill(); } catch { }
process.exit(verdict.audioPlaying && verdict.framesAdvancing && verdict.noConsoleErrors ? 0 : 2);
