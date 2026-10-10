import { launchBrowser, CDP, sleep } from "./cdp.mjs";

const port = 9396;
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
for (let w = 10; w >= 0; w--) await ev(`window.__render(${(t - w / 60).toFixed(4)})`);
console.log(await ev(`(function(){
  var app = WEM.app, R = app.renderer, g = app.gfx, M4 = WEM.core.M4;
  var captured = [];
  var origSolid = g.solid;
  g.solid = function(mesh, model, o){
    var vp = R.vp;
    var p = M4.xform(model, [0,0,0,1]);
    var w = vp[3]*p[0]+vp[7]*p[1]+vp[11]*p[2]+vp[15];
    captured.push({
      meshVerts: mesh.pos.length/3, idxLen: mesh.idx.length,
      model: Array.from(model).map(function(v){return +v.toFixed(2)}),
      worldCenter: [ +p[0].toFixed(3), +p[1].toFixed(3), +p[2].toFixed(3) ],
      ndc: w ? [ +((vp[0]*p[0]+vp[4]*p[1]+vp[8]*p[2]+vp[12])/w).toFixed(3),
                +((vp[1]*p[0]+vp[5]*p[1]+vp[9]*p[2]+vp[13])/w).toFixed(3),
                +((vp[2]*p[0]+vp[6]*p[1]+vp[10]*p[2]+vp[14])/w).toFixed(3), +w.toFixed(2) ] : 'w0',
      vpIsCamVp: vp === app.cam.vp,
      eye: R.eye ? [ +R.eye[0].toFixed(2), +R.eye[1].toFixed(2), +R.eye[2].toFixed(2) ] : null,
      camPos: app.cam.pos.map(function(v){return +v.toFixed(2)})
    });
    return origSolid.apply(g, arguments);
  };
  window.__cap = captured;
  return 'patched';
})()`));
for (let w = 1; w >= 0; w--) await ev(`window.__render(${(t - w / 60).toFixed(4)})`);
console.log(await ev(`JSON.stringify(window.__cap)`));
try { b.proc.kill(); } catch { }
process.exit(0);
