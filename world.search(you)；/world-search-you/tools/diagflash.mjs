import { launchBrowser, CDP, sleep } from "./cdp.mjs";
const port = 9487;
const b = await launchBrowser({ port, width: 800, height: 450 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws = new WebSocket(list.find((x) => x.type === "page").webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Page.navigate", { url: "file:///D:/DSH/%E6%B5%8B%E8%AF%952/world-search-you/world.search(you).html" });
await sleep(11000);
const r = await cdp.send("Runtime.evaluate", { expression: `(function(){
  var out = { flash: [], crt: [], bright: [] };
  var pf = 0, pc = 0;
  for (var i = 0; i <= 180; i++) {
    var tt = i / 60;
    window.__render(tt);
    var f = WEM.app.ctx.fx;
    if (f.flash > pf + 0.03) out.flash.push(+tt.toFixed(2) + "=" + f.flash.toFixed(2));
    if (f.crtOn > pc + 0.15) out.crt.push(+tt.toFixed(2) + "=" + f.crtOn.toFixed(2));
    pf = f.flash; pc = f.crtOn;
  }
  return JSON.stringify(out);
})()`, returnByValue: true });
console.log(r.result.value);
try { b.proc.kill(); } catch {}
process.exit(0);
