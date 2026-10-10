import { launchBrowser, connect, sleep } from "./cdp.mjs";

const port = 9333;
const b = await launchBrowser({ port, width: 320, height: 180 });
console.log("browser:", b.info.Browser);
const cdp = await connect(port);
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 320, height: 180, deviceScaleFactor: 1, mobile: false });
await cdp.send("Page.navigate", { url: "file:///D:/DSH/%E6%B5%8B%E8%AF%952/world-execute-me/build/smoke.html" });
await sleep(2500);
const r = await cdp.send("Runtime.evaluate", { expression: "JSON.stringify({info: window.__info||null, ready: !!window.__ready, px: window.__px||null})", returnByValue: true });
console.log(r.result.value);
// measure screenshot throughput
const t0 = Date.now();
let bytes = 0;
for (let i = 0; i < 10; i++) {
  const s = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 90 });
  bytes += s.data.length;
}
const dt = Date.now() - t0;
console.log(`screenshot: ${(dt / 10).toFixed(1)} ms/frame, ${(bytes / 10 / 1024).toFixed(0)} KB/frame`);
try { b.proc.kill(); } catch { }
process.exit(0);
