import { launchBrowser, CDP, sleep } from "./cdp.mjs";
import fs from "node:fs";

const port = 9382;
const url = process.argv[2] || "http://127.0.0.1:8791/index.html?no2d=1&nochrome=1&nostripes=1";
const t = +(process.argv[3] || 78);
const b = await launchBrowser({ port, width: 1920, height: 1080 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = list.find(x => x.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
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
for (let w = 20; w >= 0; w--) await ev(`window.__render(${(t - w / 30).toFixed(4)})`);
console.log(await ev(`(function(){
  var C = WEM.core, M4 = C.M4, V = WEM.Viz, geo = C.geo;
  var app = WEM.app;
  var box = geo.box(1.6,1.6,1.6), ico = geo.ico(1);
  var pts = new V.Points(3000), r = C.rng(5);
  for (var i=0;i<3000;i++) pts.add((r()-.5)*6,(r()-.5)*4,(r()-.5)*6, 4+r()*8, [0.4,0.9,1.0], 0.9);
  window.__t = { box: box, ico: ico, pts: pts };
  app.cur.draw3d = function(ctx){
    var cam = ctx.cam; cam.mode='persp'; cam.fov=0.9; cam.near=0.05; cam.far=400;
    cam.pos=[0,0,9]; cam.target=[0,0,0]; cam.up=[0,1,0]; cam.update();
    ctx.gfx.solid(box, M4.mul(M4.trans(-3.2,0,0), M4.rotY(0.6)), {color:[0.95,0.32,0.42], rim:0.9});
    ctx.gfx.solid(ico, M4.compose([3.2,0,0], M4.rotX(0.4), 2.2), {color:[0.9,0.93,0.98], rim:0.7});
    pts.draw(ctx.gfx, {add:true});
    ctx.gfx.lines(new Float32Array([0,-3,0, 3, 0,-3,0, 3, 1,1,1, 1]), {add:true});
  };
  return 'patched';
})()`));
for (let w = 3; w >= 0; w--) await ev(`window.__render(${(t - w / 30).toFixed(4)})`);
const s = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 90 });
fs.writeFileSync("out/solidtest.jpg", Buffer.from(s.data, "base64"));
console.log("wrote out/solidtest.jpg");
try { b.proc.kill(); } catch { }
process.exit(0);
