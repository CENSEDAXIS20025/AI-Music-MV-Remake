/* point-by-point: known HUD features vs the composited canvas */
import { launchBrowser, CDP, sleep } from "./cdp.mjs";

const url = process.argv[2];
const t = +(process.argv[3] || 44);
const PORT = +(process.env.WEM_PORT || 9369);
const browser = await launchBrowser({ port: PORT, width: 1280, height: 720 });
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find(x => x.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Page.navigate", { url });
async function ev(expr) {
  const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error("EXC: " + JSON.stringify(r.exceptionDetails).slice(0, 800));
  return r.result.value;
}
for (let i = 0; i < 200; i++) {
  const o = JSON.parse(await ev("JSON.stringify({b:!!window.__booted,e:window.__bootError||null})"));
  if (o.e) { console.error("BOOT ERROR", o.e); process.exit(1); }
  if (o.b) break;
  await sleep(150);
}
for (let w = 40; w >= 0; w--) await ev(`window.__render(${(t - w / 60).toFixed(4)})`);

console.log(await ev(`(function(){
  var gl = WEM.app.renderer.gl, hud = WEM.app.hud.fc;
  var hd = hud.getImageData(0,0,1920,1080).data;
  var px = new Uint8Array(4);
  function region(x0,y0,w,h,label){
    // brightest hud pixel in the region + what the screen shows there
    var best=-1,bx=x0,by=y0;
    for (var y=y0;y<y0+h;y++) for (var x=x0;x<x0+w;x++){
      var i=(y*1920+x)*4; if (hd[i+3]<200) continue;
      var l=hd[i]*0.3+hd[i+1]*0.6+hd[i+2]*0.1;
      if (l>best){best=l;bx=x;by=y;}
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.readPixels(bx,1080-by,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);
    var i2=(by*1920+bx)*4;
    return label+" hud@("+bx+","+by+")="+hd[i2]+","+hd[i2+1]+","+hd[i2+2]+","+hd[i2+3]+"  screen="+px[0]+","+px[1]+","+px[2];
  }
  return [
    region(1300,40,620,220,"MATCH panel   "),
    region(0,1020,900,60,"meter left    "),
    region(1000,1020,900,60,"meter right   "),
    region(46,96,690,838,"chat panel    "),
    region(740,180,600,700,"candidate win ")
  ].join("\\n");
})()`));
try { browser.proc.kill(); } catch { }
process.exit(0);
