/* ============================================================================
   playshot.mjs -- verify the REAL playback path, not the offline renderer.

   Navigates to the page in play mode, clicks the START button, lets the audio
   and the rAF loop actually run for a few seconds, then screenshots.  This is
   the only way to prove what the user will see when they double-click the file.

   node tools/playshot.mjs --url=... --out=out/play/shot.jpg --wait=8 [--port=9381]
   ========================================================================== */
import { launchBrowser, CDP, sleep } from "./cdp.mjs";
import fs from "node:fs";
import path from "node:path";

function arg(name, def) {
  const p = process.argv.find(a => a.startsWith("--" + name + "="));
  return p ? p.slice(name.length + 3) : def;
}

const url = arg("url", "http://127.0.0.1:8797/index.html");
const out = arg("out", "out/play/shot.jpg");
const wait = +arg("wait", 8);
const at = +arg("at", 0);           // optional: seek the audio to this time first
const W = +arg("w", 1920), H = +arg("h", 1080);
const PORT = +arg("port", 9381);

const browser = await launchBrowser({ port: PORT, width: W, height: H });
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
const cdp = new CDP(ws);
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });

const errors = [];
cdp.on("Runtime.exceptionThrown", (p) => {
  const d = p.exceptionDetails || {};
  errors.push((d.exception && (d.exception.description || d.exception.value)) || d.text);
});

await cdp.send("Page.navigate", { url });
const ev = async (e, t = 120000) => {
  const r = await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true, timeout: t });
  if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 500) };
  return r.result.value;
};

for (let i = 0; i < 200; i++) {
  const o = JSON.parse(await ev("JSON.stringify({b:!!window.__booted,e:window.__bootError||null})"));
  if (o.e) { console.error("BOOT ERROR:\n" + o.e); process.exit(1); }
  if (o.b) break;
  await sleep(150);
}

const clicked = await ev(`(function(){var b=document.getElementById('start'); if(!b) return 'nobutton'; b.click(); return 'clicked';})()`);
console.log("start button:", clicked);
await sleep(wait * 1000);

if (at > 0) {
  await ev(`(function(){var a=window.WEM.app.audio; if(a){a.currentTime=${at};} return a? a.currentTime : -1;})()`);
  await sleep(1200);
}

const info = JSON.parse(await ev(`(function(){
  var a = window.WEM.app.audio, c = window.WEM.app.ctx;
  return JSON.stringify({
    t: c ? +c.t.toFixed(2) : null,
    audioT: a ? +a.currentTime.toFixed(2) : null,
    paused: a ? a.paused : null,
    section: c && c.sec ? c.sec.id + ' ' + c.sec.name : null,
    running: !!(window.WEM.app.raf),
    crtOn: window.WEM.app.renderer.fx.crtOn, crtOff: window.WEM.app.renderer.fx.crtOff,
    exposure: window.WEM.app.renderer.fx.exposure, fade: window.WEM.app.renderer.fx.fade
  });
})()`));
console.log("state:", JSON.stringify(info));

const s = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 92, captureBeyondViewport: false, fromSurface: true });
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.from(s.data, "base64"));
console.log("wrote", out, (Buffer.from(s.data, "base64").length / 1024).toFixed(0) + "KB");
if (errors.length) { console.log("ERRORS:"); errors.slice(0, 5).forEach(e => console.log("  " + String(e).split("\n").slice(0, 3).join(" | ").slice(0, 300))); }
try { browser.proc.kill(); } catch { }
process.exit(errors.length ? 2 : 0);
