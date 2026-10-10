import { launchBrowser, CDP, sleep } from "./cdp.mjs";
import fs from "node:fs";

const port = 9362;
const base = process.argv[2] || "http://127.0.0.1:8791/index.html";
const t = +(process.argv[3] || 12.5);
const variants = (process.argv[4] || "no3d,no2d,nohud,nobloom,nostripes,noscan,nocurve").split(",");
const b = await launchBrowser({ port, width: 1920, height: 1080 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = list.find(x => x.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
cdp.on("Runtime.exceptionThrown", p => console.log("EXC:", ((p.exceptionDetails.exception || {}).description || "").slice(0, 300)));
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;

for (const v of variants) {
  const url = base + (base.includes("?") ? "&" : "?") + v + "=1";
  await cdp.send("Page.navigate", { url });
  let ok = false;
  for (let i = 0; i < 120; i++) {
    const r = await cdp.send("Runtime.evaluate", { expression: "!!window.__booted", returnByValue: true });
    if (r.result.value) { ok = true; break; }
    await sleep(120);
  }
  if (!ok) { console.log(v, "NOT BOOTED"); continue; }
  for (let w = 40; w >= 0; w--) await ev(`window.__render(${(t - w / 30).toFixed(4)})`);
  const s = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 88 });
  const f = `out/probe_${v}.jpg`;
  fs.writeFileSync(f, Buffer.from(s.data, "base64"));
  console.log("wrote", f);
}
try { b.proc.kill(); } catch { }
process.exit(0);
