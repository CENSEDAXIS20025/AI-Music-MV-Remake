/* decisive test: paint a magenta block on the HUD canvas, upload it, then read
   the default framebuffer back at that screen position */
import { launchBrowser, CDP, sleep } from "./cdp.mjs";

const url = process.argv[2];
const t = +(process.argv[3] || 44);
const PORT = +(process.env.WEM_PORT || 9373);
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
for (let w = 40; w >= 0; w--) await ev(`window.__render(${(t - w / 60).toFixed(4)})`);

console.log(await ev(`(function(){
  var app = WEM.app, R = app.renderer, gl = R.gl;
  var out = [];
  // 1. paint magenta straight onto the HUD canvas over the chat header
  var g = app.hud.fc;
  g.save(); g.globalAlpha = 1; g.fillStyle = "rgb(255,0,255)"; g.fillRect(100, 120, 80, 60); g.restore();
  // 2. upload and composite exactly the way frame() does
  app.hud.upload(R.res);
  R.t = ${t};
  R.composite(app.hud.tFull.tex, { hudRects: app.hudRects });
  gl.finish();
  var px = new Uint8Array(4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.readPixels(140, 1080-150, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  out.push("magenta block on screen after upload+composite: " + px[0] + "," + px[1] + "," + px[2]);
  gl.readPixels(140, 1080-560, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  out.push("inside a chat bubble (140,560): " + px[0] + "," + px[1] + "," + px[2]);
  gl.readPixels(200, 1080-140, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  out.push("inside chat header (200,140): " + px[0] + "," + px[1] + "," + px[2]);
  gl.readPixels(1580, 1080-180, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  out.push("MATCH panel number (1580,180): " + px[0] + "," + px[1] + "," + px[2]);
  out.push("gl error: " + gl.getError());
  out.push("hud tex size: " + app.hud.tFull.w + "x" + app.hud.tFull.h);
  return out.join("\\n");
})()`));
try { browser.proc.kill(); } catch { }
process.exit(0);
