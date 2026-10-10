/* does ANY hud pixel reach the composited canvas? find the brightest spot on
   the hud canvas and compare it with the same spot on screen */
import { launchBrowser, CDP, sleep } from "./cdp.mjs";

const url = process.argv[2];
const t = +(process.argv[3] || 44);
const PORT = +(process.env.WEM_PORT || 9367);
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
  var gl = WEM.app.renderer.gl, hud = WEM.app.hud.fc;
  var d = hud.getImageData(0,0,1920,1080).data;
  var best = -1, bx = 0, by = 0, ba = 0;
  for (var y = 0; y < 1080; y += 2) for (var x = 0; x < 1920; x += 2) {
    var i = (y*1920+x)*4;
    if (d[i+3] < 200) continue;
    var l = d[i]*0.3 + d[i+1]*0.6 + d[i+2]*0.1;
    if (l > best) { best = l; bx = x; by = y; ba = d[i+3]; }
  }
  var px = new Uint8Array(4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.readPixels(bx, 1080-by, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  var i2 = (by*1920+bx)*4;
  return JSON.stringify({
    hudBrightest: [bx, by, d[i2], d[i2+1], d[i2+2], ba],
    screenSameSpot: [px[0], px[1], px[2]],
    uiRects: Array.from(WEM.app.hudRects).slice(0, 24),
    camMode: WEM.app.cam.mode,
    hudAmt: WEM.app.renderer.fx.hud
  });
})()`));
try { browser.proc.kill(); } catch { }
process.exit(0);
