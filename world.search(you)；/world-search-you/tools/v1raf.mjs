import { launchBrowser, CDP, sleep } from "./cdp.mjs";
const port = 9469;
const b = await launchBrowser({ port, width: 800, height: 450 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws = new WebSocket(list.find((x) => x.type === "page").webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Page.navigate", { url: "http://127.0.0.1:8791/index.html" });
await sleep(6000);
// hook rAF and count scheduled frames over 2 s
await cdp.send("Runtime.evaluate", { expression: `(function(){
  window.__c = 0; var o = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function(f){ window.__c++; return o(f); };
  window.__err = null;
  window.addEventListener("error", function(e){ window.__err = String(e.message); });
  return "hooked";
})()`, returnByValue: true });
const before = await cdp.send("Runtime.evaluate", { expression: "window.__c", returnByValue: true });
await sleep(2500);
const after = await cdp.send("Runtime.evaluate", { expression: "JSON.stringify({c: window.__c, err: window.__err})", returnByValue: true });
console.log("rAF before:", before.result.value, " after:", after.result.value);
const d = JSON.parse(after.result.value);
console.log(d.c > 30 ? "LIVE: " + d.c + " frames in 2.5 s" : "FROZEN: only " + d.c + " frames");
try { b.proc.kill(); } catch {}
process.exit(0);
