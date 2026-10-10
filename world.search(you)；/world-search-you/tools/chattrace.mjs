/* instrument one frame: how many times is the HUD canvas written, where does
   the chat draw land relative to hud.upload() and composite()? */
import { launchBrowser, CDP, sleep } from "./cdp.mjs";

const url = process.argv[2];
const t = +(process.argv[3] || 44);
const PORT = +(process.env.WEM_PORT || 9375);
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
  if (r.exceptionDetails) throw new Error("EXC: " + JSON.stringify(r.exceptionDetails).slice(0, 900));
  return r.result.value;
}
for (let i = 0; i < 200; i++) {
  const o = JSON.parse(await ev("JSON.stringify({b:!!window.__booted,e:window.__bootError||null})"));
  if (o.e) { console.error("BOOT ERROR", o.e); process.exit(1); }
  if (o.b) break;
  await sleep(150);
}
// warm without the instrumentation
for (let w = 40; w >= 0; w--) await ev(`window.__render(${(t - w / 60).toFixed(4)})`);

console.log(await ev(`(function(){
  var app = WEM.app, R = app.renderer;
  var trace = [];
  var mark = function(name){
    var d = app.hud.fc.getImageData(200, 140, 1, 1).data;
    trace.push(name + " hud(200,140)=" + d[0] + "," + d[1] + "," + d[2] + "," + d[3]);
  };
  var oldUpload = app.hud.upload.bind(app.hud);
  app.hud.upload = function(){ mark("before upload"); var r = oldUpload.apply(null, arguments); mark("after  upload"); return r; };
  var oldComp = R.composite.bind(R);
  R.composite = function(){ mark("before comp  "); var r = oldComp.apply(null, arguments); mark("after  comp  "); return r; };
  var oldDraw = WEM.Chat.draw;
  WEM.Chat.draw = function(){ mark("before chat  "); var r = oldDraw.apply(this, arguments); mark("after  chat  "); return r; };
  var oldClear = app.hud.clear.bind(app.hud);
  app.hud.clear = function(){ mark("before clear "); var r = oldClear.apply(null, arguments); mark("after  clear "); return r; };
  window.__render(${t.toFixed(4)});
  app.hud.upload = oldUpload; R.composite = oldComp; WEM.Chat.draw = oldDraw; app.hud.clear = oldClear;
  return trace.join("\\n");
})()`));
try { browser.proc.kill(); } catch { }
process.exit(0);
