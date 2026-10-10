/* read the transcript back out of the live page (authoritative: it is the
   SHEET the renderer actually uses) */
import { launchBrowser, CDP, sleep } from "./cdp.mjs";

const url = process.argv[2] || "http://127.0.0.1:8796/index.chat.html?render";
const PORT = +(process.env.WEM_PORT || 9377);
const browser = await launchBrowser({ port: PORT, width: 640, height: 360 });
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find(x => x.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Page.navigate", { url });
async function ev(expr) {
  const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error("EXC: " + JSON.stringify(r.exceptionDetails).slice(0, 800));
  return r.result.value;
}
for (let i = 0; i < 200; i++) {
  const o = JSON.parse(await ev("JSON.stringify({b:!!window.__booted,e:window.__bootError||null})"));
  if (o.e) { console.error("BOOT ERROR", o.e); process.exit(1); }
  if (o.b) break;
  await sleep(150);
}
console.log(await ev(`JSON.stringify({
  rows: WEM.Chat.sheet.length,
  user: WEM.Chat.sheet.filter(function(m){return m.who==="user"}).length,
  her: WEM.Chat.sheet.filter(function(m){return m.who!=="user"}).length,
  notes: WEM.Chat.sheet.filter(function(m){return m.text.indexOf("\\u2726")>=0}).length,
  fixes: WEM.Chat.sheet.filter(function(m){return !!m.fix}).length,
  first: WEM.Chat.sheet[0].t0, last: WEM.Chat.sheet[WEM.Chat.sheet.length-1].t0,
  ts: WEM.Chat.sheet.map(function(m){return m.t0})
})`));
try { browser.proc.kill(); } catch { }
process.exit(0);
