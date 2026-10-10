import { launchBrowser, CDP, sleep } from "./cdp.mjs";
import fs from "node:fs";
const port = 9485;
const b = await launchBrowser({ port, width: 1280, height: 720 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws = new WebSocket(list.find((x) => x.type === "page").webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Page.navigate", { url: "file:///D:/DSH/%E6%B5%8B%E8%AF%952/world-search-you/world.search(you).html" });
await sleep(12000);
await cdp.send("Runtime.evaluate", { expression: `(function(){var s=document.getElementById("start");if(s)s.click();return 1;})()` });
await sleep(26000);
const shot = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 80 });
fs.writeFileSync("out/mv_live.jpg", Buffer.from((shot.data || (shot.result && shot.result.data)), "base64"));
const r = await cdp.send("Runtime.evaluate", { expression: `+Number(WEM.app.audio.currentTime).toFixed(1)`, returnByValue: true });
console.log("captured at audio t =", r.result.value, "s");
try { b.proc.kill(); } catch {}
process.exit(0);
