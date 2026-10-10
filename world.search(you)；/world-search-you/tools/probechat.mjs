import { launchBrowser, CDP, sleep } from "./cdp.mjs";
const port = 9441;
const b = await launchBrowser({ port, width: 640, height: 360 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws = new WebSocket(list.find(x => x.type === "page").webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Page.navigate", { url: "http://127.0.0.1:8791/index4.html" });
await sleep(9000);
const r = await cdp.send("Runtime.evaluate", { expression: `(function(){
  if (!window.__render) return "no render";
  window.__render(0.5);
  var s = WEM.sections[3], t = window.__t;
  return "booted";
})()`, returnByValue: true });
console.log(r.result.value);
const r2 = await cdp.send("Runtime.evaluate", { expression: `JSON.stringify(WEM.Data.lrc.filter(e=>!e.meta).slice(0,3))`, returnByValue: true });
console.log(r2.result.value);
try { b.proc.kill(); } catch {}
process.exit(0);

