/* file:// verification for a bundle: boot, click START, frames advance, audio
   plays, theme toggle works, no console errors. Captures a still too.

   node tools/chatchk.mjs <fileUrlOrHttpUrl> <tag> [seekSeconds] [toggleTheme] */
import { launchBrowser, CDP, sleep } from "./cdp.mjs";
import fs from "node:fs";
import path from "node:path";

const url = process.argv[2];
const tag = process.argv[3] || "check";
const seek = +(process.argv[4] || 0);
const toggle = process.argv[5] === "toggle";
const dir = "out/verify";
const PORT = +(process.env.WEM_PORT || 9381);
const browser = await launchBrowser({ port: PORT, width: 1280, height: 720 });
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find(x => x.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
const cdp = new CDP(ws);
const errors = [], logs = [];
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === "Runtime.consoleAPICalled") {
    const s = m.params.args.map(a => a.value ?? a.description ?? a.type).join(" ");
    logs.push(m.params.type + ": " + s);
    if (m.params.type === "error") errors.push(s);
  }
  if (m.method === "Runtime.exceptionThrown") {
    errors.push("EXCEPTION " + JSON.stringify(m.params.exceptionDetails).slice(0, 400));
  }
  if (m.method === "Log.entryAdded" && m.params.entry.level === "error") {
    errors.push("LOG " + m.params.entry.text + " " + (m.params.entry.url || ""));
  }
});
await cdp.send("Page.enable"); await cdp.send("Runtime.enable"); await cdp.send("Log.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await cdp.send("Page.navigate", { url });
async function ev(expr) {
  const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error("EXC: " + JSON.stringify(r.exceptionDetails).slice(0, 700));
  return r.result.value;
}
let booted = false;
for (let i = 0; i < 250; i++) {
  const o = JSON.parse(await ev("JSON.stringify({b:!!window.__booted,e:window.__bootError||null,c:window.__chatError||null})"));
  if (o.e) { console.error("BOOT ERROR:", o.e); break; }
  if (o.c) console.error("CHAT ERROR:", o.c);
  if (o.b) { booted = true; break; }
  await sleep(150);
}
if (!booted) { console.error("never booted"); process.exit(1); }
console.log("[" + tag + "] booted, chat rows:", await ev("WEM.Chat ? WEM.Chat.sheet.length : 'no overlay (plain bundle)'"),
  "theme:", await ev("WEM.Theme.mode"));

// START button present and clickable
console.log("[" + tag + "] start visible:", await ev(`(function(){var b=document.getElementById("start");return !!b && getComputedStyle(b).display!=="none";})()`));
await ev(`document.getElementById("start").click()`);
await sleep(900);
console.log("[" + tag + "] after START -> paused:", await ev("WEM.app.audio.paused"),
  " start hidden:", await ev(`getComputedStyle(document.getElementById("start")).display === "none"`));
if (seek > 0) { await ev(`WEM.app.audio.currentTime = ${seek}`); await sleep(1200); }
const t1 = await ev("WEM.app.ctx.t");
await sleep(900);
const t2 = await ev("WEM.app.ctx.t");
console.log("[" + tag + "] frames advancing:", (t2 - t1).toFixed(3) + "s over 0.9s  (ctx.t=" + t2.toFixed(2) + ")");
console.log("[" + tag + "] audio:", await ev("JSON.stringify({t:+WEM.app.audio.currentTime.toFixed(2),dur:isFinite(WEM.app.audio.duration)?+WEM.app.audio.duration.toFixed(1):null,vol:WEM.app.audio.volume,muted:WEM.app.audio.muted})"));
console.log("[" + tag + "] chat rows now visible:", await ev("WEM.Chat ? WEM.Chat.visibleAt(WEM.app.ctx.t).length : 'no overlay (plain bundle)'"));

// controls
console.log("[" + tag + "] controls:", await ev(`JSON.stringify({
  seek: !!document.getElementById("wem-seek"), range: !!document.querySelector("#wem-seek input[type=range]"),
  pause: !!document.querySelector("#wem-seek button"), theme: !!document.getElementById("wem-theme"),
  themeLabel: document.getElementById("wem-theme") ? document.getElementById("wem-theme").textContent : null })`));
if (toggle) {
  await ev(`document.getElementById("wem-theme").click()`);
  await sleep(700);
  console.log("[" + tag + "] after toggle -> theme:", await ev("WEM.Theme.mode"),
    " label:", await ev(`document.getElementById("wem-theme").textContent`),
    " html class:", await ev("document.documentElement.className"));
  const s2 = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 92, fromSurface: true });
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, tag + "_toggled.jpg"), Buffer.from(s2.data, "base64"));
  // toggle back
  await ev(`document.getElementById("wem-theme").click()`);
  await sleep(500);
  console.log("[" + tag + "] toggled back -> theme:", await ev("WEM.Theme.mode"));
}
// pause / resume
await ev(`document.querySelector("#wem-seek button").click()`);
await sleep(300);
const paused = await ev("WEM.app.audio.paused");
await ev(`document.querySelector("#wem-seek button").click()`);
await sleep(300);
console.log("[" + tag + "] pause button works:", paused, "-> resumed:", !(await ev("WEM.app.audio.paused")));

fs.mkdirSync(dir, { recursive: true });
const s = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 92, fromSurface: true });
fs.writeFileSync(path.join(dir, tag + ".jpg"), Buffer.from(s.data, "base64"));
console.log("[" + tag + "] console errors:", errors.length ? JSON.stringify(errors.slice(0, 6)) : "none");
console.log("[" + tag + "] console log lines:", logs.length);
try { browser.proc.kill(); } catch { }
process.exit(errors.length ? 2 : 0);
