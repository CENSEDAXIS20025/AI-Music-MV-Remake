/* pixel probe: what is actually on the composited canvas at a few points */
import { launchBrowser, CDP, sleep } from "./cdp.mjs";

const url = process.argv[2] || "http://127.0.0.1:8796/index.chat.html?render";
const t = +(process.argv[3] || 44);
const PORT = +(process.env.WEM_PORT || 9355);
const browser = await launchBrowser({ port: PORT, width: 1280, height: 720 });
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find(x => x.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Page.navigate", { url });
async function ev(expr) {
  const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error("page error: " + JSON.stringify(r.exceptionDetails).slice(0, 800));
  return r.result.value;
}
for (let i = 0; i < 200; i++) {
  const o = JSON.parse(await ev("JSON.stringify({b:!!window.__booted,e:window.__bootError||null})"));
  if (o.e) { console.error("BOOT ERROR", o.e); process.exit(1); }
  if (o.b) break;
  await sleep(150);
}
for (let w = 40; w >= 0; w--) await ev(`window.__render(${(t - w / 60).toFixed(4)})`);

console.log("hud px   :", await ev(`(function(){ var g=WEM.app.hud.full.getContext("2d");
  return JSON.stringify([[80,180],[200,400],[600,700],[46,96],[736,934]].map(function(p){
    var d=g.getImageData(p[0],p[1],1,1).data; return p+"="+d[0]+","+d[1]+","+d[2]+","+d[3]; })); })()`));
console.log("screen px:", await ev(`(function(){ var c=document.getElementById("gl"); var t=document.createElement("canvas");
  t.width=1920; t.height=1080; var g=t.getContext("2d"); g.drawImage(c,0,0);
  return JSON.stringify([[80,180],[200,400],[600,700],[46,96],[736,934]].map(function(p){
    var d=g.getImageData(p[0],p[1],1,1).data; return p+"="+d[0]+","+d[1]+","+d[2]+","+d[3]; })); })()`));
console.log("glerr    :", await ev("String(WEM.app.renderer.gl.getError())"));
console.log("fx       :", await ev("JSON.stringify({fade:WEM.app.renderer.fx.fade, hud:WEM.app.renderer.fx.hud, crtOn:WEM.app.renderer.fx.crtOn, crtOff:WEM.app.renderer.fx.crtOff, theme:WEM.Theme.mode})"));
console.log("count    :", await ev("JSON.stringify(WEM.Chat.visibleAt(" + t + ").slice(-7).map(function(m){return [m.t0, m.who, m.text.slice(0,10)]}))"));
try { browser.proc.kill(); } catch { }
process.exit(0);
