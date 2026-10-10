/* LIVE playback probe: click START, let it play, then look at the screen.
   params: url, t (media seconds to seek to), tag */
import { launchBrowser, CDP, sleep } from "./cdp.mjs";
import fs from "node:fs";
import path from "node:path";

const url = process.argv[2];
const t = +(process.argv[3] || 44);
const tag = process.argv[4] || "live";
const dir = "out/live";
const PORT = +(process.env.WEM_PORT || 9371);
const browser = await launchBrowser({ port: PORT, width: 1280, height: 720 });
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find(x => x.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
const cdp = new CDP(ws);
const logs = [];
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === "Runtime.consoleAPICalled") logs.push(m.params.type + ": " + m.params.args.map(a => a.value ?? a.description).join(" "));
  if (m.method === "Runtime.exceptionThrown") logs.push("EXC: " + JSON.stringify(m.params.exceptionDetails).slice(0, 400));
});
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await cdp.send("Page.navigate", { url });
async function ev(expr) {
  const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error("EXC: " + JSON.stringify(r.exceptionDetails).slice(0, 800));
  return r.result.value;
}
for (let i = 0; i < 200; i++) {
  const o = JSON.parse(await ev("JSON.stringify({b:!!window.__booted,e:window.__bootError||null})"));
  if (o.e) { console.error("BOOT ERROR", o.e); process.exit(1); }
  if (o.b) break;
  await sleep(150);
}
await ev(`document.getElementById("start").click()`);
await sleep(1500);
// seek the audio near the target, then let it play for a moment
if (t > 2) { await ev(`(function(){ var a = WEM.app.audio; a.currentTime = ${(t - 2).toFixed(2)}; return a.currentTime; })()`); await sleep(2600); }
else await sleep(2600);

const state = await ev(`JSON.stringify({t: +WEM.app.audio.currentTime.toFixed(2), paused: WEM.app.audio.paused,
  currentSrc: WEM.app.audio.currentSrc.slice(0, 24), frame: WEM.app.ctx.t.toFixed(2),
  chatRows: WEM.Chat.visibleAt(WEM.app.ctx.t).length, theme: WEM.Theme.mode,
  advancing: window.__adv = (function(){ return true; })() })`);
console.log("state:", state);
const t1 = await ev("WEM.app.ctx.t");
await sleep(700);
const t2 = await ev("WEM.app.ctx.t");
console.log("frames advancing:", (t2 - t1).toFixed(3) + "s in 0.7s wall");

fs.mkdirSync(dir, { recursive: true });
const hud = await ev(`WEM.app.hud.full.toDataURL("image/png")`);
fs.writeFileSync(path.join(dir, tag + "_hud.png"), Buffer.from(hud.split(",")[1], "base64"));
const gl = await ev(`document.getElementById("gl").toDataURL("image/png")`);
fs.writeFileSync(path.join(dir, tag + "_gl.png"), Buffer.from(gl.split(",")[1], "base64"));
const shot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
fs.writeFileSync(path.join(dir, tag + "_shot.png"), Buffer.from(shot.data, "base64"));
const rng = await ev(`JSON.stringify({rng: !!document.querySelector("#wem-seek input"), theme: !!document.getElementById("wem-theme"), seek: !!document.getElementById("wem-seek")})`);
console.log("chrome:", rng);
console.log("console:", logs.slice(0, 20).join(" | ") || "(none)");
try { browser.proc.kill(); } catch { }
process.exit(0);
