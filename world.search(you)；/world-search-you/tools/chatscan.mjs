/* where does the composited frame stop matching the HUD canvas? scan a column */
import { launchBrowser, CDP, sleep } from "./cdp.mjs";

const url = process.argv[2];
const t = +(process.argv[3] || 44);
const PORT = +(process.env.WEM_PORT || 9365);
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
  var gl = WEM.app.renderer.gl;
  var hud = WEM.app.hud.fc;
  var out = [];
  var px = new Uint8Array(4);
  function h(x,y){ var d = hud.getImageData(x,y,1,1).data; return [d[0],d[1],d[2]]; }
  function s(x,y){ gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(x, 1080-y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return [px[0],px[1],px[2]]; }
  // a column through the chat header (y=140) and a column through the bubbles
  var xs = [200, 400, 600, 700, 730, 740, 760, 900, 1200];
  out.push("y=140 hud/screen:");
  for (var i=0;i<xs.length;i++) out.push("  x"+xs[i]+" hud="+h(xs[i],140)+" scr="+s(xs[i],140));
  out.push("y=560 hud/screen:");
  for (var j=0;j<xs.length;j++) out.push("  x"+xs[j]+" hud="+h(xs[j],560)+" scr="+s(xs[j],560));
  return out.join("\\n");
})()`));
try { browser.proc.kill(); } catch { }
process.exit(0);
