import { launchBrowser, CDP, sleep } from "./cdp.mjs";
import fs from "node:fs";

// dump the two HUD canvases as PNG so we can see what is actually in the atlas
const port = 9366;
const url = process.argv[2] || "http://127.0.0.1:8791/index.html";
const t = +(process.argv[3] || 26.5);
const b = await launchBrowser({ port, width: 1920, height: 1080 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = list.find(x => x.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await cdp.send("Page.navigate", { url });
for (let i = 0; i < 120; i++) {
  const r = await cdp.send("Runtime.evaluate", { expression: "!!window.__booted", returnByValue: true });
  if (r.result.value) break;
  await sleep(120);
}
const ev = async (e) => {
  const r = await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true });
  if (r.exceptionDetails) { console.log("EXC:", JSON.stringify(r.exceptionDetails).slice(0, 500)); return null; }
  return r.result.value;
};
for (let w = 40; w >= 0; w--) await ev(`window.__render(${(t - w / 30).toFixed(4)})`);
// diagnostics on the camera + counters
console.log(await ev(`JSON.stringify({
  camMode: WEM.app.cam.mode, camPos: WEM.app.cam.pos, vp: Array.from(WEM.app.cam.vp).map(v=>+v.toFixed(3)),
  tPan: !!WEM.app.hud.tPan, panDirty: WEM.app.hud.panDirty,
  quads: WEM.app.cur.ring ? WEM.app.cur.ring.n : -1
})`));
const dump = async (expr, name) => {
  const d = await ev(expr);
  if (!d) return;
  const b64 = d.split(",")[1];
  fs.writeFileSync("out/" + name, Buffer.from(b64, "base64"));
  console.log("wrote out/" + name);
};
await dump("WEM.app.hud.panC.toDataURL('image/png')", "atlas.png");
await dump("WEM.app.hud.full.toDataURL('image/png')", "hudfull.png");
try { b.proc.kill(); } catch { }
process.exit(0);
