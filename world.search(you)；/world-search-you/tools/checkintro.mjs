import { launchBrowser, CDP, sleep } from "./cdp.mjs";
import fs from "node:fs";
const port = 9481;
const b = await launchBrowser({ port, width: 980, height: 1400 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws = new WebSocket(list.find((x) => x.type === "page").webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
const errs = [];
await cdp.send("Runtime.evaluate", { expression: `window.__err=[];window.addEventListener("error",e=>window.__err.push(String(e.message)));` });
await cdp.send("Page.navigate", { url: "file:///D:/DSH/%E6%B5%8B%E8%AF%952/world-search-you/%E7%AE%80%E4%BB%8B.html" });
await sleep(2500);
const r = await cdp.send("Runtime.evaluate", { expression: `JSON.stringify({
  err: window.__err || [],
  titles: (document.getElementById("titles")||{}).textContent ? "ok" : "EMPTY",
  fullLen: ((document.getElementById("full")||{}).textContent||"").length,
  shortLen: ((document.getElementById("short")||{}).textContent||"").length,
  tagCount: document.querySelectorAll("#tags span").length
})`, returnByValue: true });
console.log(r.result.value);
const shot = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 82,  });
fs.writeFileSync("out/jianjie.jpg", Buffer.from((shot.data || (shot.result && shot.result.data)), "base64"));
console.log("shot written");
try { b.proc.kill(); } catch {}
process.exit(0);



