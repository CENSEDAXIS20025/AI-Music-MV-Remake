/* ============================================================================
   stills.mjs -- batch still renderer: ONE browser session, many times.

   node tools/stills.mjs --url=... --times=1,20,45 --outdir=out/x
                         [--w=1920 --h=1080 --warm=12] [--prefix=t_]

   capture.mjs already does this, but it launches a fresh browser for every
   --still batch and re-warms every time. When the whole film has to be
   surveyed (22 segments x several times) that is the difference between two
   minutes and twenty.
   ========================================================================== */
import { launchBrowser, CDP, sleep } from "./cdp.mjs";
import fs from "node:fs";
import path from "node:path";

function arg(name, def) {
  const p = process.argv.find(a => a.startsWith("--" + name + "="));
  return p ? p.slice(name.length + 3) : def;
}

const url = arg("url", "http://127.0.0.1:8793/index.html");
const W = +arg("w", 1920), H = +arg("h", 1080), FPS = +arg("fps", 30);
const PORT = +arg("port", 9345);
const warm = +arg("warm", 12);
const quality = +arg("q", 92);
const prefix = arg("prefix", "t_");
const outdir = arg("outdir", "out/stills");
const times = arg("times", "").split(",").filter(Boolean).map(Number);
if (!times.length) { console.error("need --times=a,b,c"); process.exit(1); }

const browser = await launchBrowser({ port: PORT, width: W, height: H });
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
const cdp = new CDP(ws);
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await cdp.send("Page.navigate", { url });

async function ev(expr, timeout = 300000) {
  const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true, timeout });
  if (r.exceptionDetails) throw new Error("page error: " + JSON.stringify(r.exceptionDetails).slice(0, 900));
  return r.result.value;
}

let booted = false;
for (let i = 0; i < 200; i++) {
  const o = JSON.parse(await ev("JSON.stringify({b:!!window.__booted,e:window.__bootError||null})"));
  if (o.e) { console.error("BOOT ERROR:\n" + o.e); process.exit(1); }
  if (o.b) { booted = true; break; }
  await sleep(150);
}
if (!booted) { console.error("page never booted"); process.exit(1); }

fs.mkdirSync(outdir, { recursive: true });
const t0 = Date.now();
for (const t of times) {
  for (let w = warm; w >= 0; w--) await ev(`window.__render(${(t - w / FPS).toFixed(4)})`);
  const s = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality, captureBeyondViewport: false, fromSurface: true });
  const buf = Buffer.from(s.data, "base64");
  const f = path.join(outdir, `${prefix}${String(t).replace(".", "_")}.jpg`);
  fs.writeFileSync(f, buf);
  console.log(`wrote ${f}  ${(buf.length / 1024).toFixed(0)}KB  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
try { browser.proc.kill(); } catch { }
process.exit(0);
