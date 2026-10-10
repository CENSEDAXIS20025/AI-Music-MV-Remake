import { launchBrowser, CDP, sleep } from "./cdp.mjs";

const port = 9374;
const url = process.argv[2] || "http://127.0.0.1:8791/index.html?no2d=1&nochrome=1";
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
  if (r.exceptionDetails) return "EXC " + ((r.exceptionDetails.exception || {}).description || "").slice(0, 500);
  return r.result.value;
};
for (let w = 40; w >= 0; w--) await ev(`window.__render(${(t - w / 30).toFixed(4)})`);

console.log(await ev(`(function(){
  var C = WEM.core, M4 = C.M4, V = WEM.Viz, app = WEM.app;
  var cam = app.cam, vp = cam.vp;
  function proj(p){ var w = vp[3]*p[0]+vp[7]*p[1]+vp[11]*p[2]+vp[15];
    return [ +((vp[0]*p[0]+vp[4]*p[1]+vp[8]*p[2]+vp[12])/w).toFixed(3),
             +((vp[1]*p[0]+vp[5]*p[1]+vp[9]*p[2]+vp[13])/w).toFixed(3), +w.toFixed(2) ]; }
  var q = app.cur.ring, out = { n: q.n, data: [] };
  var n = 9, tt = app.ctx.t;
  for (var i = 0; i < n; i++) {
    var a = i/n*Math.PI*2 + tt*0.30;
    var R = 6.3 + Math.sin(tt*0.9+i)*0.25;
    var cz = Math.sin(a)*2.2;
    var m = M4.mul(M4.compose([Math.cos(a)*R, Math.sin(a)*R*0.62 - 0.4, cz], M4.rotZ(a*0.15), 1), M4.scale(2.9,2.9,1));
    var rect = [ (i%4)*0.25, 1-(((i/4)|0)+1)*0.25, ((i%4)+1)*0.25, 1-((i/4)|0)*0.25 ];
    out.data.push({ i: i, center: proj([m[12],m[13],m[14]]), alpha: +(0.83*(0.55+0.45*Math.cos(a))).toFixed(3), rect: rect });
    // also the instance matrix actually in the buffer
    if (i === 0) out.inst0 = Array.from(q.data.slice(0,16)).map(function(v){return +v.toFixed(2)});
    if (i === 1) out.inst1 = Array.from(q.data.slice(24,40)).map(function(v){return +v.toFixed(2)});
  }
  out.cam = { pos: cam.pos.map(function(v){return +v.toFixed(2)}), fov: +cam.fov.toFixed(2) };
  return JSON.stringify(out);
})()`));
try { b.proc.kill(); } catch { }
process.exit(0);
