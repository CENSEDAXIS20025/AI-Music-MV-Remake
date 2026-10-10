import { launchBrowser, CDP, sleep } from "./cdp.mjs";

const port = 9390;
const url = process.argv[2] || "http://127.0.0.1:8791/index.html";
const t = +(process.argv[3] || 199);
const b = await launchBrowser({ port, width: 1280, height: 720 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = list.find(x => x.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
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
for (let w = 30; w >= 0; w--) await ev(`window.__render(${(t - w / 30).toFixed(4)})`);
console.log(await ev(`(function(){
  var app = WEM.app, s = app.cur, M = s.mesh;
  var xs=[], ys=[], zs=[];
  for (var i=0;i<M.pos.length;i+=3){ xs.push(M.pos[i]); ys.push(M.pos[i+1]); zs.push(M.pos[i+2]); }
  var mm = function(a){ return [ +Math.min.apply(null,a).toFixed(3), +Math.max.apply(null,a).toFixed(3) ]; };
  return JSON.stringify({
    name: s.name, local: +app.ctx.local.toFixed(2), phase: app.ctx.local < s.assembleAt ? 0 : (app.ctx.local<10.4?1:2),
    verts: M.pos.length/3, tris: M.idx.length/3, idxType: M.idx.constructor.name,
    x: mm(xs), y: mm(ys), z: mm(zs),
    trisList: s.tris.length, triState: s.triState.length,
    cam: { mode: app.cam.mode, pos: app.cam.pos.map(function(v){return +v.toFixed(2)}), target: app.cam.target.map(function(v){return +v.toFixed(2)}), fov:+app.cam.fov.toFixed(2), near: app.cam.near, far: app.cam.far },
    vp: Array.from(app.cam.vp).map(function(v){return +v.toFixed(3)})
  });
})()`));
console.log("proj heart center:", await ev(`(function(){
  var vp = WEM.app.cam.vp;
  function proj(x,y,z){ var w = vp[3]*x+vp[7]*y+vp[11]*z+vp[15];
    if (Math.abs(w) < 1e-6) return "w=0";
    return [ +((vp[0]*x+vp[4]*y+vp[8]*z+vp[12])/w).toFixed(3), +((vp[1]*x+vp[5]*y+vp[9]*z+vp[13])/w).toFixed(3), +((vp[2]*x+vp[6]*y+vp[10]*z+vp[14])/w).toFixed(3), +w.toFixed(2) ]; }
  return JSON.stringify({ center: proj(0,0.6,0), top: proj(0,2.6,0), left: proj(-2.1,0.6,0) });
})()`));
try { b.proc.kill(); } catch { }
process.exit(0);
