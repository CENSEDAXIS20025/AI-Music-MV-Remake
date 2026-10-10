import { launchBrowser, CDP, sleep } from "./cdp.mjs";
const port = 9466;
const b = await launchBrowser({ port, width: 960, height: 540 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws = new WebSocket(list.find((x) => x.type === "page").webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Page.navigate", { url: "http://127.0.0.1:8791/index.html" });
await sleep(9000);
const probe = await cdp.send("Runtime.evaluate", {
  expression: `(function(){
    var out = { ready: !!(WEM.Data && WEM.Data.ready), hasBar: !!WEM.AudioBar,
                hasChrome: typeof WEM.App !== "undefined" };
    try {
      var buf = new Float32Array(64);
      var mx = 0, sum = 0;
      [10, 30, 60, 120, 180].forEach(function(tt){
        WEM.Data.bandsAt(tt, buf);
        for (var i = 0; i < 64; i++) { mx = Math.max(mx, buf[i]); sum += buf[i]; }
      });
      out.bandsMax = +mx.toFixed(3); out.bandsSum = +sum.toFixed(1);
    } catch (e) { out.err = String(e); }
    try { out.sections = WEM.Data.meta.sections.length; } catch (e) { out.sectionsErr = String(e); }
    return JSON.stringify(out);
  })()`, returnByValue: true
});
console.log(probe.result.value);
try { b.proc.kill(); } catch {}
process.exit(0);
