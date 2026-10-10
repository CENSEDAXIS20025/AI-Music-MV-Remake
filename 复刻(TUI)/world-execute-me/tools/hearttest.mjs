import { launchBrowser, CDP, sleep } from "./cdp.mjs";
import fs from "node:fs";

const port = 9392;
const url = process.argv[2] || "http://127.0.0.1:8791/index.html?no2d=1&nochrome=1";
const t = +(process.argv[3] || 199);
const b = await launchBrowser({ port, width: 960, height: 540 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = list.find(x => x.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 960, height: 540, deviceScaleFactor: 1, mobile: false });
await cdp.send("Page.navigate", { url });
for (let i = 0; i < 150; i++) {
  const r = await cdp.send("Runtime.evaluate", { expression: "!!window.__booted", returnByValue: true });
  if (r.result.value) break;
  await sleep(120);
}
const ev = async (e) => {
  const r = await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true });
  if (r.exceptionDetails) return "EXC " + ((r.exceptionDetails.exception || {}).description || "").slice(0, 700);
  return r.result.value;
};
for (let w = 20; w >= 0; w--) await ev(`window.__render(${(t - w / 60).toFixed(4)})`);
console.log(await ev(`(function(){
  var app = WEM.app, C = WEM.core, M4 = C.M4, geo = C.geo;
  var mesh = app.cur.mesh, gl = app.renderer.gl;
  var box = geo.box(2,2,2);
  var log = [];
  app.cur.draw3d = function(ctx){
    var cam = ctx.cam; cam.mode='persp'; cam.fov=0.9; cam.near=0.05; cam.far=400;
    cam.pos=[0,0,9]; cam.target=[0,0,0]; cam.up=[0,1,0]; cam.update();
    ctx.gfx.solid(box, M4.trans(-3,0,0), {color:[1,0.3,0.4], rim:0.8});
    log.push('after box err=' + gl.getError());
    ctx.gfx.solid(mesh, M4.trans(1.5,0,0), {color:[0.3,1,0.45], rim:0.8});
    log.push('after mesh err=' + gl.getError());
  };
  window.__log = log;
  return 'patched';
})()`));
for (let w = 2; w >= 0; w--) await ev(`window.__render(${(t - w / 60).toFixed(4)})`);
console.log("gl errors:", await ev(`JSON.stringify(window.__log)`));
const s = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 92 });
fs.writeFileSync("out/hearttest.jpg", Buffer.from(s.data, "base64"));
console.log("wrote out/hearttest.jpg");
try { b.proc.kill(); } catch { }
process.exit(0);
