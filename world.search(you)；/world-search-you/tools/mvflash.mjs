import { launchBrowser, CDP, sleep } from "./cdp.mjs";
const port = 9477;
const b = await launchBrowser({ port, width: 800, height: 450 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws = new WebSocket(list.find((x) => x.type === "page").webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Page.navigate", { url: "file:///D:/DSH/%E6%B5%8B%E8%AF%952/world-search-you/world.search(you).html" });
await sleep(9000);
const r = await cdp.send("Runtime.evaluate", { expression: `(function(){
  var peaks = [], prev = 0, rising = false;
  for (var i = 0; i <= 60; i++) {
    var tt = i / 60;
    window.__render(tt);
    var f = WEM.app.ctx.fx.flash;
    if (f > prev + 0.02) { peaks.push(+tt.toFixed(2) + "=" + f.toFixed(2)); }
    prev = f;
  }
  return JSON.stringify(peaks);
})()`, returnByValue: true });
console.log("flash peaks in the first second:", r.result.value);
try { b.proc.kill(); } catch {}
process.exit(0);

