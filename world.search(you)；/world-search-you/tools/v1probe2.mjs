import { launchBrowser, CDP, sleep } from "./cdp.mjs";
const port = 9467;
const b = await launchBrowser({ port, width: 960, height: 540 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws = new WebSocket(list.find((x) => x.type === "page").webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Page.navigate", { url: "http://127.0.0.1:8791/index.html" });
await sleep(9000);
const expr = `(function(){
  var app = WEM.App, res = [];
  [20, 40, 70, 120].forEach(function(tt){
    window.__render(tt);
    var c = app.ctx, max = 0, sum = 0;
    for (var i = 0; i < c.bands.length; i++) { max = Math.max(max, c.bands[i]); sum += c.bands[i]; }
    res.push({ t: tt, max: +max.toFixed(3), sum: +sum.toFixed(1), chrome: c.chromeAmt });
  });
  return JSON.stringify({ res: res, barDraw: String(WEM.AudioBar && WEM.AudioBar.draw).slice(0, 200) });
})()`;
const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true });
console.log(r.result.value);
try { b.proc.kill(); } catch {}
process.exit(0);
