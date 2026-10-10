/* WebGL readPixels probe: is a given HUD element actually in the composited
   frame on screen? Compares a pixel known to be bright in the plain bundle
   with a pixel inside the chat panel. */
import { launchBrowser, CDP, sleep } from "./cdp.mjs";

const url = process.argv[2] || "http://127.0.0.1:8796/index.html?render";
const t = +(process.argv[3] || 44);
const PORT = +(process.env.WEM_PORT || 9359);
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
  var pts = [[960,120],[300,500],[100,500],[700,500],[60,60]];
  var px = new Uint8Array(4);
  var out = [];
  for (var i = 0; i < pts.length; i++) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(pts[i][0], 1080 - pts[i][1], 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    out.push(pts[i] + "=" + px[0] + "," + px[1] + "," + px[2]);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return out.join("   ");
})()`));
try { browser.proc.kill(); } catch { }
process.exit(0);
