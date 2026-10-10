import { launchBrowser, CDP, sleep } from "./cdp.mjs";
const port = 9421;
const b = await launchBrowser({ port, width: 800, height: 450 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws = new WebSocket(list.find(x => x.type === "page").webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
cdp.on("Runtime.exceptionThrown", p => console.log("EXC", ((p.exceptionDetails.exception||{}).description||"").slice(0,200)));
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Page.navigate", { url: "http://127.0.0.1:8791/index3.html" });
await sleep(9000);
await cdp.send("Runtime.evaluate", { expression: `window.__render(63.0)`, returnByValue: true });
const r = await cdp.send("Runtime.evaluate", { expression: `(function(){
  var s = WEM.sections[4];
  return JSON.stringify({id:s.id, hasEnsure: typeof s.ensure, hasLines: !!s.lines, nLines: s.lines?s.lines.length:-1, genLen: s.gen?s.gen.length:-1, first: s.lines&&s.lines[0]?s.lines[0].s.slice(0,60):null, firstN: s.lines&&s.lines[0]?s.lines[0].n:null, dim: s.m?s.m.dim:-1});
})()`, returnByValue: true });
console.log("SEC05:", r.result.value);
try { b.proc.kill(); } catch {}
process.exit(0);

