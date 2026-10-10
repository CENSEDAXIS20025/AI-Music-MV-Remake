/* dump the HUD canvas and the composited canvas to PNG for a direct look */
import { launchBrowser, CDP, sleep } from "./cdp.mjs";
import fs from "node:fs";
import path from "node:path";

const url = process.argv[2];
const t = +(process.argv[3] || 44);
const dir = process.argv[4] || "out/hud";
const PORT = +(process.env.WEM_PORT || 9363);
const browser = await launchBrowser({ port: PORT, width: 1280, height: 720 });
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find(x => x.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
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
for (let w = 40; w >= 0; w--) await ev(`window.__render(${(t - w / 60).toFixed(4)})`);

fs.mkdirSync(dir, { recursive: true });
const tag = process.env.WEM_TAG || path.basename(url).replace(/[^\w.]/g, "_");
const hud = await ev(`WEM.app.hud.full.toDataURL("image/png")`);
fs.writeFileSync(path.join(dir, tag + "_hud.png"), Buffer.from(hud.split(",")[1], "base64"));
const gl = await ev(`document.getElementById("gl").toDataURL("image/png")`);
fs.writeFileSync(path.join(dir, tag + "_gl.png"), Buffer.from(gl.split(",")[1], "base64"));
const shot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
fs.writeFileSync(path.join(dir, tag + "_shot.png"), Buffer.from(shot.data, "base64"));
console.log("wrote", tag, "t=" + t, "to", dir);
try { browser.proc.kill(); } catch { }
process.exit(0);
