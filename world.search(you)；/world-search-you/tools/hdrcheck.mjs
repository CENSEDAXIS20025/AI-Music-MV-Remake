import { launchBrowser, CDP, sleep } from "./cdp.mjs";
const port = 9455;
const b = await launchBrowser({ port, width: 960, height: 540 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws = new WebSocket(list.find((x) => x.type === "page").webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Page.navigate", { url: "http://127.0.0.1:8791/index4.html" });
await sleep(9000);
const times = [31, 46, 61, 76, 90, 105, 112, 120, 133, 148, 159.5, 162, 164, 180, 204];
const expr = `JSON.stringify(${JSON.stringify(times)}.map(function(t){
  var st = WEM.chatState({ t: t, fx: { hit: function(){} } });
  return { t: t, sub: st.sub, color: st.subColor };
}))`;
const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true });
const rows = JSON.parse(r.result.value);
const name = (c) => c.includes("255,201,74") ? "yellow" : c.includes("96,170,255") ? "blue"
  : c.includes("186,132,255") ? "purple" : c.includes("94,224,160") ? "green"
  : c.includes("255,96,86") ? "red" : c.includes("152,160,172") ? "grey" : "?";
console.log("t".padEnd(8) + "status".padEnd(26) + "expected".padEnd(10) + "actual");
for (const row of rows) console.log(String(row.t).padEnd(8) + row.sub.padEnd(26) + "".padEnd(10) + name(row.color));
try { b.proc.kill(); } catch {}
process.exit(0);
