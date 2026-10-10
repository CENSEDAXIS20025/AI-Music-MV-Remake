/* quick page probe for the chat overlay: boot state, module presence, errors */
import { launchBrowser, CDP, sleep } from "./cdp.mjs";

const url = process.argv[2] || "http://127.0.0.1:8796/index.chat.html?render";
const PORT = +(process.env.WEM_PORT || 9351);
const browser = await launchBrowser({ port: PORT, width: 1280, height: 720 });
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
const cdp = new CDP(ws);
const logs = [];
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === "Runtime.consoleAPICalled") {
    logs.push(m.params.type + ": " + m.params.args.map(a => a.value ?? a.description ?? a.type).join(" "));
  }
  if (m.method === "Runtime.exceptionThrown") {
    logs.push("EXC: " + JSON.stringify(m.params.exceptionDetails).slice(0, 600));
  }
});
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
await cdp.send("Page.navigate", { url });

async function ev(expr) {
  const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) return "THREW: " + JSON.stringify(r.exceptionDetails).slice(0, 700);
  return r.result.value;
}

for (let i = 0; i < 60; i++) {
  const b = await ev("JSON.stringify({b:!!window.__booted,e:window.__bootError||null})");
  const o = JSON.parse(b);
  if (o.e) { console.log("BOOT ERROR", o.e); break; }
  if (o.b) break;
  await sleep(200);
}
console.log("modules:", await ev(`JSON.stringify({
  Tui: !!(window.WEM && WEM.Tui), Gadgets: !!(window.WEM && WEM.Gadgets),
  guiChat: !!(window.WEM && WEM.Gadgets && WEM.Gadgets.guiChat),
  Chat: !!(window.WEM && WEM.Chat), rows: (window.WEM && WEM.Chat) ? WEM.Chat.count : -1,
  booted: !!window.__booted, err: window.__bootError || null })`));
console.log("frame wrapped:", await ev("String(window.WEM.app.frame).slice(0,120)"));
// draw a frame and see whether the overlay runs
console.log("draw:", await ev(`(function(){ try { window.__render(30); } catch(e){ return "THREW "+e.stack } return "ok" })()`));
console.log("sample:", await ev(`(function(){
  try { return JSON.stringify(WEM.Chat.visibleAt(30).map(function(m){return m.who+":"+m.text.slice(0,14)})); }
  catch(e){ return "THREW "+e.message } })()`));
// look for a painted pixel inside the chat panel: sample the hud canvas directly
console.log("hudpx:", await ev(`(function(){
  try {
    var c = WEM.app.hud.full.getContext("2d");
    var pts = [[60,110],[400,500],[100,900],[46,96],[735,933]];
    return JSON.stringify(pts.map(function(p){ var d=c.getImageData(p[0],p[1],1,1).data; return p+"="+d[0]+","+d[1]+","+d[2]+","+d[3]; }));
  } catch(e){ return "THREW "+e.message } })()`));
console.log("--- console ---");
console.log(logs.slice(0, 40).join("\n"));
try { browser.proc.kill(); } catch { }
process.exit(0);
