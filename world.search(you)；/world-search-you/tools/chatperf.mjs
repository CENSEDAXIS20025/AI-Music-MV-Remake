/* playback cost check: with the chat overlay installed, how long does a frame
   take, and does the typewriter memo actually fire? */
import { launchBrowser, CDP, sleep } from "./cdp.mjs";

const url = process.argv[2] || "http://127.0.0.1:8796/index.chat.html";
const PORT = +(process.env.WEM_PORT || 9385);
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
  if (r.exceptionDetails) throw new Error("EXC: " + JSON.stringify(r.exceptionDetails).slice(0, 700));
  return r.result.value;
}
for (let i = 0; i < 200; i++) {
  const o = JSON.parse(await ev("JSON.stringify({b:!!window.__booted,e:window.__bootError||null})"));
  if (o.e) { console.error("BOOT", o.e); process.exit(1); }
  if (o.b) break;
  await sleep(150);
}
await ev(`document.getElementById("start").click()`);
await ev(`WEM.app.audio.currentTime = 180`);
await sleep(2500);
console.log(await ev(`(function(){
  var app = WEM.app;
  // time 60 real frames of the full pipeline
  var n = 0, t0 = performance.now();
  var frames = [], last = performance.now();
  var orig = app.frame;
  var stop = false;
  app.frame = function(t, dt){
    var a = performance.now();
    var r = orig.apply(this, arguments);
    var b = performance.now();
    frames.push(b - a);
    if (++n >= 90) stop = true;
    return r;
  };
  return new Promise(function(res){
    var iv = setInterval(function(){
      if (!stop) return;
      clearInterval(iv);
      app.frame = orig;
      frames.sort(function(x,y){return x-y;});
      res(JSON.stringify({
        frames: frames.length,
        median: +frames[Math.floor(frames.length/2)].toFixed(2),
        p90: +frames[Math.floor(frames.length*0.9)].toFixed(2),
        max: +frames[frames.length-1].toFixed(2),
        memoEntries: Object.keys(WEM.Chat.memo ? {} : {}).length,
        chatRows: WEM.Chat.visibleAt(app.ctx.t).length
      }));
    }, 50);
  });
})()`));
try { browser.proc.kill(); } catch { }
process.exit(0);
