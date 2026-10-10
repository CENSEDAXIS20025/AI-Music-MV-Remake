import { launchBrowser, CDP, sleep } from "./cdp.mjs";
import fs from "node:fs";

const port = 9394;
const url = process.argv[2] || "http://127.0.0.1:8791/index.html?no2d=1&nochrome=1";
const t = +(process.argv[3] || 199);
const b = await launchBrowser({ port, width: 1200, height: 675 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = list.find(x => x.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1200, height: 675, deviceScaleFactor: 1, mobile: false });
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
  var app = WEM.app, C = WEM.core, M4 = C.M4, V = WEM.Viz;
  var mesh = app.cur.mesh;
  var pts = new V.Points(400);
  for (var i = 0; i < mesh.pos.length; i += 3) pts.add(mesh.pos[i], mesh.pos[i+1], mesh.pos[i+2], 3, [1,1,1], 1);
  // also rebuild the same shape from a fresh heart curve to compare
  app.cur.draw3d = function(ctx){
    var cam = ctx.cam; cam.mode='persp'; cam.fov=0.9; cam.near=0.05; cam.far=400;
    cam.pos=[0,0,9]; cam.target=[0,0,0]; cam.up=[0,1,0]; cam.update();
    ctx.gfx.solid(mesh, M4.trans(-4,0,0), {color:[1,0.3,0.4], rim:0.8});
    ctx.gfx.wire(mesh, M4.trans(0,0,0), {color:[0.4,1,0.6], alpha:1, width:1.5});
    pts.draw(ctx.gfx, {add:true});
  };
  window.__pts = pts;
  return JSON.stringify({ verts: mesh.pos.length/3, idx: mesh.idx.length, firstIdx: Array.from(mesh.idx.slice(0,12)), lastIdx: Array.from(mesh.idx.slice(-12)) });
})()`));
for (let w = 2; w >= 0; w--) await ev(`window.__render(${(t - w / 60).toFixed(4)})`);
const s = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 92 });
fs.writeFileSync("out/hearttest2.jpg", Buffer.from(s.data, "base64"));
console.log("wrote out/hearttest2.jpg");
try { b.proc.kill(); } catch { }
process.exit(0);
