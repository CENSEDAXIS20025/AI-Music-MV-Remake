import { launchBrowser, CDP, sleep } from "./cdp.mjs";
const port = 9411;
const b = await launchBrowser({ port, width: 640, height: 360 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = list.find(x => x.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
cdp.on("Runtime.exceptionThrown", p => console.log("EXC", (p.exceptionDetails.exception||{}).description));
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Page.navigate", { url: "http://127.0.0.1:8791/index3.html" });
await sleep(9000);
const r = await cdp.send("Runtime.evaluate", { expression: `(function(){
  var app = window.__app; var t0=performance.now(); var m = WEM.Model.build({data: WEM.Data}); window.__bt=Math.round(performance.now()-t0);
  if(!m) return "no model: app=" + (typeof app) + " ctx=" + (typeof (app&&app.ctx)) + " model=" + (typeof WEM.Model);
  var E=m.E, mean=m.pca.mean, c0=m.pca.comps[0], c1=m.pca.comps[1];
  function norm(v){var s=0;for(var i=0;i<v.length;i++)s+=v[i]*v[i];return Math.sqrt(s);}
  var xs=[],ys=[];
  for(var k=0;k<8;k++){var x=0,y=0;for(var d=0;d<m.dim;d++){var dv=E[k*m.dim+d]-mean[d];x+=dv*c0[d];y+=dv*c1[d];}xs.push(+x.toFixed(4));ys.push(+y.toFixed(4));}
  var wmax=0,wsum=0;for(var i=0;i<m.W.length;i++){wmax=Math.max(wmax,Math.abs(m.W[i]));wsum+=Math.abs(m.W[i]);}
  return JSON.stringify({buildMs:window.__bt, vocab:m.V, dim:m.dim, ids:m.ids.length, loss0:+m.loss[0].toFixed(3), lossN:+m.loss[m.loss.length-1].toFixed(3), nComp:m.pca.comps.length, c0norm:+norm(c0).toFixed(4), c1norm:+norm(c1).toFixed(4), xs, ys, wmax:+wmax.toFixed(4), wmean:+(wsum/m.W.length).toFixed(5)});
})()`, returnByValue: true });
console.log(r.result.value);
try { b.proc.kill(); } catch {}
process.exit(0);




