/* does the chat overlay land on the composited canvas? */
import { launchBrowser, CDP, sleep } from "./cdp.mjs";

const url = process.argv[2] || "http://127.0.0.1:8796/index.chat.html?render";
const t = +(process.argv[3] || 44);
const PORT = +(process.env.WEM_PORT || 9357);
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
  if (r.exceptionDetails) throw new Error("EXC: " + JSON.stringify(r.exceptionDetails).slice(0, 800));
  return r.result.value;
}
for (let i = 0; i < 200; i++) {
  const o = JSON.parse(await ev("JSON.stringify({b:!!window.__booted,e:window.__bootError||null})"));
  if (o.e) { console.error("BOOT ERROR", o.e); process.exit(1); }
  if (o.b) break;
  await sleep(150);
}
for (let w = 40; w >= 0; w--) await ev(`window.__render(${(t - w / 60).toFixed(4)})`);

console.log(await ev(`(function(){
  var out = {};
  var app = WEM.app, R = app.renderer;
  // 1. what is on the screen canvas right now (after __render)
  var probe = function(){
    var c = document.getElementById("gl"), t = document.createElement("canvas");
    t.width = 1920; t.height = 1080; var g = t.getContext("2d"); g.drawImage(c, 0, 0);
    var pts = [[80,180],[300,500],[660,900]];
    return pts.map(function(p){ var d = g.getImageData(p[0],p[1],1,1).data; return p+"="+d[0]+","+d[1]+","+d[2]; }).join("  ");
  };
  // 2. draw one more frame by hand, and sample the *framebuffer* right after
  //    the composite pass instead of the canvas
  var hudBefore = (function(){ var g = app.hud.fc; var d = g.getImageData(300,500,1,1).data; return d[0]+","+d[1]+","+d[2]+","+d[3]; })();
  out.before = probe();
  out.hudAt300x500 = hudBefore;
  // 3. count how many times frame is called and whether Chat.draw runs
  var n = 0, drew = 0;
  var oldDraw = WEM.Chat.draw;
  WEM.Chat.draw = function(){ drew++; return oldDraw.apply(this, arguments); };
  var oldComposite = R.composite;
  var compSeen = null;
  R.composite = function(hudTex, opts){ compSeen = hudTex; return oldComposite.apply(this, arguments); };
  window.__render(${t.toFixed(4)});
  out.frames = n; out.drawCalls = drew;
  var g2 = app.hud.fc;
  var d2 = g2.getImageData(300,500,1,1).data;
  out.hudAfter = d2[0]+","+d2[1]+","+d2[2]+","+d2[3];
  out.after = probe();
  WEM.Chat.draw = oldDraw; R.composite = oldComposite;
  return JSON.stringify(out);
})()`));
try { browser.proc.kill(); } catch { }
process.exit(0);
