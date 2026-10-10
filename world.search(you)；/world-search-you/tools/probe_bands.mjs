/* Probe the running page: dump analysis values, error state, or any expression.
   node tools/probe_bands.mjs --url=... --at=5,20,60 --expr="..." */
import { launchBrowser, CDP, sleep } from "./cdp.mjs";

function arg(name, def) {
  const p = process.argv.find(a => a.startsWith("--" + name + "="));
  return p ? p.slice(name.length + 3) : def;
}
const url = arg("url", "http://127.0.0.1:8793/index.html?render");
const times = arg("at", "5,20,60").split(",").map(Number);
const expr = arg("expr", null);

const browser = await launchBrowser({ port: +arg("port", 9361), width: 1920, height: 1080 });
const list = await (await fetch(`http://127.0.0.1:${+arg("port", 9361)}/json/list`)).json();
const page = list.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
const cdp = new CDP(ws);
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await cdp.send("Page.navigate", { url });

async function ev(e) {
  const r = await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true, timeout: 300000 });
  if (r.exceptionDetails) throw new Error("page error: " + JSON.stringify(r.exceptionDetails).slice(0, 1200));
  return r.result.value;
}
for (let i = 0; i < 200; i++) {
  const st = await ev("JSON.stringify({b:!!window.__booted,e:window.__bootError||null})");
  const o = JSON.parse(st);
  if (o.e) { console.error("BOOT ERROR:\n" + o.e); process.exit(1); }
  if (o.b) break;
  await sleep(150);
}

if (expr) {
  console.log(await ev(expr));
} else {
  console.log(await ev("JSON.stringify({metaSec:WEM.Data.sections.length, regSec:WEM.sections.length, beats:WEM.Data.beats.length, bpm:WEM.Data.bpm, period:WEM.Data.beatPeriod, dur:WEM.Data.duration, slot:WEM.Data.downbeatSlot})"));
  for (const t of times) {
    await ev(`window.__render(${t})`);
    const s = await ev(`(function(){
      var c = WEM.app.ctx, b = c.bands;
      var arr = []; for (var i=0;i<64;i+=8) arr.push(+b[i].toFixed(3));
      var mx=0, sum=0; for (var i=0;i<64;i++){ mx=Math.max(mx,b[i]); sum+=b[i]; }
      return JSON.stringify({t:${t}, rms:+c.rms.toFixed(3), flux:+c.flux.toFixed(3),
        bandMax:+mx.toFixed(3), bandMean:+(sum/64).toFixed(3), sample:arr,
        beatIdx:c.beat.index, sec:c.sec.id, lyric:c.lyric?c.lyric.text.slice(0,28):null,
        fx:{flash:+c.fx.flash.toFixed(3), expo:c.fx.exposure}});
    })()`);
    console.log(s);
  }
}
try { browser.proc.kill(); } catch { }
process.exit(0);
