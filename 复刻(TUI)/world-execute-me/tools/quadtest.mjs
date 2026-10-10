import { launchBrowser, CDP, sleep } from "./cdp.mjs";
import fs from "node:fs";

const port = 9378;
const url = process.argv[2] || "http://127.0.0.1:8791/index.html?no2d=1&nochrome=1&nostripes=1";
const t = +(process.argv[3] || 21);
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
  if (r.exceptionDetails) return "EXC " + ((r.exceptionDetails.exception || {}).description || "").slice(0, 600);
  return r.result.value;
};
// warm so the atlas is populated
for (let w = 40; w >= 0; w--) await ev(`window.__render(${(t - w / 30).toFixed(4)})`);

// replace the section 3D with a controlled 3x3 grid of textured quads in front of the camera
console.log(await ev(`(function(){
  var V = WEM.Viz, M4 = WEM.core.M4, C = WEM.core;
  var app = WEM.app;
  window.__testQ = new V.Quads(9);
  app.cur.draw3d = function(ctx){
    var cam = ctx.cam; cam.mode='persp'; cam.fov=0.9;
    cam.pos=[0,0,18]; cam.target=[0,0,0]; cam.up=[0,1,0]; cam.update();
    var q = window.__testQ; q.clear();
    var k = 0;
    for (var r = -1; r <= 1; r++) for (var c = -1; c <= 1; c++) {
      var p = ctx.hud.panel(k);
      ctx.hud.formula(p.w/2, p.h/2+40, "E=mc^2", {size:64, color:"#ffffff", align:"center", ctx:p.ctx});
      p = ctx.hud.panel(k);
      var m = M4.mul(M4.compose([c*4.2, r*2.6, 0], M4.ident(), 1), M4.scale(3.0,3.0,1));
      q.add(m, p.rect, [1,1,1,1]);
      k++;
    }
    q.draw(ctx.gfx, ctx.hud.tPan.tex, {add:false});
  };
  return 'patched';
})()`));
for (let w = 3; w >= 0; w--) await ev(`window.__render(${(t - w / 30).toFixed(4)})`);
const s = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 90 });
fs.writeFileSync("out/quadtest.jpg", Buffer.from(s.data, "base64"));
console.log("wrote out/quadtest.jpg");
try { b.proc.kill(); } catch { }
process.exit(0);
