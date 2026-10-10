import { launchBrowser, CDP, sleep } from "./cdp.mjs";
const port = 9468;
const b = await launchBrowser({ port, width: 800, height: 450 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws = new WebSocket(list.find((x) => x.type === "page").webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
const errs = [];
await cdp.send("Log.enable").catch(() => {});
await cdp.send("Page.navigate", { url: "http://127.0.0.1:8791/index.html" });
await sleep(6000);
const read = async () => {
  const r = await cdp.send("Runtime.evaluate", {
    expression: `(function(){
      var f = 0, mx = 0;
      try { f = window.__frames || 0; } catch (e) {}
      try { var c = WEM.App && WEM.App.ctx; if (c) for (var i = 0; i < c.bands.length; i++) mx = Math.max(mx, c.bands[i]); } catch (e) {}
      var t = (WEM.App && (WEM.App.time || WEM.App.curTime || 0)) || 0;
      return JSON.stringify({ frames: f, t: +Number(t).toFixed(2), bandMax: +mx.toFixed(3) });
    })()`, returnByValue: true
  });
  return r.result.value;
};
const a = await read();
await sleep(2500);
const c = await read();
console.log("before:", a);
console.log("after :", c);
const pa = JSON.parse(a), pc = JSON.parse(c);
console.log(pa.t !== pc.t || pa.bandMax !== pc.bandMax ? "LIVE: the loop is advancing" : "FROZEN: nothing changed");
try { b.proc.kill(); } catch {}
process.exit(0);
