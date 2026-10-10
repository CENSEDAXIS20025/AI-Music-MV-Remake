import { launchBrowser, CDP, sleep } from "./cdp.mjs";

const port = 9372;
const url = process.argv[2] || "http://127.0.0.1:8791/index.html";
const t = +(process.argv[3] || 28.6);
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
  if (r.exceptionDetails) return "EXC " + ((r.exceptionDetails.exception || {}).description || "").slice(0, 400);
  return r.result.value;
};
// instrument the gfx layer
console.log(await ev(`(function(){
  var g = WEM.app.gfx; window.__counts = {};
  ['solid','wire','lines','points','quads','fullscreen'].forEach(function(k){
    var orig = g[k]; window.__counts[k] = 0;
    g[k] = function(){ window.__counts[k]++; return orig.apply(g, arguments); };
  });
  return 'instrumented';
})()`));
for (let w = 50; w >= 0; w--) await ev(`window.__render(${(t - w / 30).toFixed(4)})`);
console.log("counts(last frame):", await ev(`JSON.stringify(window.__counts)`));
console.log("section:", await ev(`JSON.stringify({
  name: WEM.app.cur.name, ring: WEM.app.cur.ring && WEM.app.cur.ring.n,
  codeQuads: WEM.app.cur.codeQuads && WEM.app.cur.codeQuads.n,
  stars: WEM.app.cur.stars && WEM.app.cur.stars.n,
  camPos: WEM.app.cam.pos.map(function(v){return +v.toFixed(2)}),
  camTarget: WEM.app.cam.target.map(function(v){return +v.toFixed(2)}),
  fov: +WEM.app.cam.fov.toFixed(3), mode: WEM.app.cam.mode,
  vp: Array.from(WEM.app.cam.vp).map(function(v){return +v.toFixed(3)})
})`));
// project a few world points through the live vp
console.log("projections:", await ev(`(function(){
  var vp = WEM.app.cam.vp, out = [];
  function proj(x,y,z){ var w = vp[3]*x+vp[7]*y+vp[11]*z+vp[15];
    var cx = vp[0]*x+vp[4]*y+vp[8]*z+vp[12], cy = vp[1]*x+vp[5]*y+vp[9]*z+vp[13], cz = vp[2]*x+vp[6]*y+vp[10]*z+vp[14];
    return [ +(cx/w).toFixed(3), +(cy/w).toFixed(3), +(cz/w).toFixed(3), +w.toFixed(3) ]; }
  out.push(['origin', proj(0,0,0)]);
  out.push(['corridor(6.4,3,0)', proj(6.4,3,0)]);
  out.push(['near cam(0,0,-50)', proj(0,0,-50)]);
  out.push(['star(10,-5,-60)', proj(10,-5,-60)]);
  return JSON.stringify(out);
})()`));
try { b.proc.kill(); } catch { }
process.exit(0);
