/* capture stills AND dump a region of the on-screen canvas, to tell whether a
   missing overlay is a render problem or a screenshot problem */
import { launchBrowser, CDP, sleep } from "./cdp.mjs";
import fs from "node:fs";
import path from "node:path";

const url = process.argv[2] || "http://127.0.0.1:8796/index.chat.html?render";
const times = (process.argv[3] || "16,44").split(",").map(Number);
const dir = process.argv[4] || "out/chat_probe";
const W = 1280, H = 720, PORT = +(process.env.WEM_PORT || 9353);

const browser = await launchBrowser({ port: PORT, width: W, height: H });
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await cdp.send("Page.navigate", { url });

async function ev(expr) {
  const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error("page error: " + JSON.stringify(r.exceptionDetails).slice(0, 600));
  return r.result.value;
}
for (let i = 0; i < 200; i++) {
  const o = JSON.parse(await ev("JSON.stringify({b:!!window.__booted,e:window.__bootError||null})"));
  if (o.e) { console.error("BOOT ERROR", o.e); process.exit(1); }
  if (o.b) break;
  await sleep(150);
}
fs.mkdirSync(dir, { recursive: true });
for (const t of times) {
  for (let w = 40; w >= 0; w--) await ev(`window.__render(${(t - w / 60).toFixed(4)})`);
  const s = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 92, captureBeyondViewport: false, fromSurface: true });
  fs.writeFileSync(path.join(dir, `t_${String(t).replace(".", "_")}.jpg`), Buffer.from(s.data, "base64"));
  const c = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: false });
  fs.writeFileSync(path.join(dir, `t_${String(t).replace(".", "_")}_v.png`), Buffer.from(c.data, "base64"));
  // dump the top-left 200x140 of the visible canvas as a data URL, for a direct look
  const png = await ev(`(function(){ var c=document.getElementById("gl"); var t=document.createElement("canvas");
    t.width=200; t.height=140; t.getContext("2d").drawImage(c, 0,0,200,140, 0,0,200,140); return t.toDataURL("image/png"); })()`);
  fs.writeFileSync(path.join(dir, `t_${String(t).replace(".", "_")}_crop.png`), Buffer.from(png.split(",")[1], "base64"));
  console.log("t=" + t, "canvas", await ev("document.getElementById('gl').width+'x'+document.getElementById('gl').height"),
    "rect", await ev("JSON.stringify(document.getElementById('gl').getBoundingClientRect())"),
    "fromSurface bright? ", await ev(`(function(){ var c=document.getElementById("gl"); var t=document.createElement("canvas");
      t.width=1;t.height=1; var g=t.getContext("2d"); g.drawImage(c, 60,110,1,1,0,0,1,1); return Array.from(g.getImageData(0,0,1,1).data).join(","); })()`));
}
try { browser.proc.kill(); } catch { }
process.exit(0);
