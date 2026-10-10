import { launchBrowser, CDP, sleep } from "./cdp.mjs";

const port = 9370;
const url = process.argv[2] || "http://127.0.0.1:8791/index.html";
const b = await launchBrowser({ port, width: 1920, height: 1080 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = list.find(x => x.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Page.navigate", { url });
for (let i = 0; i < 150; i++) {
  const r = await cdp.send("Runtime.evaluate", { expression: "!!window.__booted", returnByValue: true });
  if (r.result.value) break;
  await sleep(120);
}
const ev = async (e) => {
  const r = await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true });
  if (r.exceptionDetails) return "EXC " + ((r.exceptionDetails.exception || {}).description || "").slice(0, 300);
  return r.result.value;
};
// 1. does measureFormula / formula work on the full canvas?
console.log("A:", await ev(`(function(){
  var h = WEM.app.hud;
  var w = h.measureFormula("E = mc^2", 60);
  return JSON.stringify({measure: w, fontStr: h.fontStr(60,'math')});
})()`));
// 2. draw into a panel and count pixels
console.log("B:", await ev(`(function(){
  var h = WEM.app.hud, C = WEM.core;
  var p = h.panel(3);
  p.clear();
  h.T(p.w/2, p.h/2, "PANEL TEST", {size: 40, color: "#ffffff", align:"center", ctx: p.ctx});
  h.formula(p.w/2, p.h/2+120, "E = mc^2", {size: 60, color: "#ffffff", align: "center", ctx: p.ctx});
  function count(cv,x0,y0,w,hh){ var c=cv.getContext('2d'); var d=c.getImageData(x0,y0,w,hh).data; var n=0; for(var i=3;i<d.length;i+=4) if(d[i]>8) n++; return n; }
  return JSON.stringify({cell: count(h.panC, 3*512, 0, 512, 512), all: count(h.panC,0,0,h.panC.width,h.panC.height), panDirty: h.panDirty});
})()`));
// 3. call the actual section helper
console.log("C:", await ev(`(function(){
  var ctx = WEM.app.ctx, V = WEM.Viz;
  var fp = V.formulaPanel(ctx, 5, ctx.hud.tPan && ctx.hud.tPan.tex, {tex: "\\\\nabla \\\\times B = \\\\mu_0 J", size: 62, color: "#35e0ff"});
  function count(cv,x0,y0,w,hh){ var c=cv.getContext('2d'); var d=c.getImageData(x0,y0,w,hh).data; var n=0; for(var i=3;i<d.length;i+=4) if(d[i]>8) n++; return n; }
  return JSON.stringify({rect: fp.rect, size: fp.size, cellPixels: count(ctx.hud.panC, 5*512, 0, 512, 512)});
})()`));
try { b.proc.kill(); } catch { }
process.exit(0);
