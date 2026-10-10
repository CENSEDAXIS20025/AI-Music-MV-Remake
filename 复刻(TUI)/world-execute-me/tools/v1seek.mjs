import { launchBrowser, CDP, sleep } from "./cdp.mjs";
const port = 9474;
const b = await launchBrowser({ port, width: 900, height: 500 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws = new WebSocket(list.find((x) => x.type === "page").webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Page.navigate", { url: "file:///D:/DSH/%E6%B5%8B%E8%AF%952/world-execute-me/world-execute-me.html" });
await sleep(8000);
await cdp.send("Runtime.evaluate", { expression: `(function(){ var s=document.getElementById("start"); if(s) s.click(); return 1; })()` });
await sleep(2500);
const r = await cdp.send("Runtime.evaluate", { expression: `JSON.stringify({
  hasAudioBar: !!WEM.AudioBar,
  seek: !!document.querySelector("input[type=range]"),
  seekVal: (document.querySelector("input[type=range]")||{}).value,
  gain: window.WEM_AB_GAIN
})`, returnByValue: true });
console.log(r.result.value);
try { b.proc.kill(); } catch {}
process.exit(0);
