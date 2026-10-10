import { launchBrowser, CDP, sleep } from "./cdp.mjs";
const port = 9431;
const b = await launchBrowser({ port, width: 640, height: 360 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws = new WebSocket(list.find(x => x.type === "page").webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Page.navigate", { url: "http://127.0.0.1:8791/index4.html" });
await sleep(9000);
const r = await cdp.send("Runtime.evaluate", { expression: `(function(){
  var D = WEM.Data, buf = new Float32Array(64), out = [];
  for (var t of [2.2, 20, 45, 62, 70, 100, 130, 160, 200]) {
    D.bandsAt(t, buf);
    var mn=9, mx=-9, sum=0, lo=0, hi=0;
    for (var i=0;i<64;i++){ mn=Math.min(mn,buf[i]); mx=Math.max(mx,buf[i]); sum+=buf[i]; }
    for (var i2=0;i2<16;i2++) lo+=buf[i2];
    for (var i3=48;i3<64;i3++) hi+=buf[i3];
    out.push({t, min:+mn.toFixed(3), max:+mx.toFixed(3), mean:+(sum/64).toFixed(3), lo:+(lo/16).toFixed(3), hi:+(hi/16).toFixed(3), rms:+D.rms(t).toFixed(3)});
  }
  return JSON.stringify(out, null, 0);
})()`, returnByValue: true });
console.log(r.result.value);
try { b.proc.kill(); } catch {}
process.exit(0);

