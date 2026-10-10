import { launchBrowser, CDP, sleep } from "./cdp.mjs";
import fs from "node:fs";

const port = 9368;
const url = process.argv[2] || "http://127.0.0.1:8791/index.html";
const t = +(process.argv[3] || 48);
const b = await launchBrowser({ port, width: 1920, height: 1080 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = list.find(x => x.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
cdp.on("Runtime.exceptionThrown", p => console.log("EVENT EXC:", ((p.exceptionDetails.exception || {}).description || "").slice(0, 400)));
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
  if (r.exceptionDetails) return "EXC: " + ((r.exceptionDetails.exception || {}).description || JSON.stringify(r.exceptionDetails)).slice(0, 400);
  return r.result.value;
};
for (let w = 60; w >= 0; w--) {
  const res = await ev(`window.__render(${(t - w / 30).toFixed(4)})`);
  if (typeof res === "string" && w === 0) console.log("render error:", res);
}
console.log(await ev(`JSON.stringify({
  curIdx: WEM.app.curIdx, curName: WEM.app.cur && WEM.app.cur.name,
  local: +WEM.app.ctx.local.toFixed(3), t: +WEM.app.ctx.t.toFixed(3),
  camMode: WEM.app.cam.mode, H: WEM.app.H, dbg: WEM.app.dbg,
  isSection: WEM.app.cur === WEM.sections[WEM.app.curIdx],
  fx: {flash:+WEM.app.renderer.fx.flash.toFixed(3), glitch:+WEM.app.renderer.fx.glitch.toFixed(3), hud:WEM.app.renderer.fx.hud, fade:WEM.app.renderer.fx.fade, crtOn:WEM.app.renderer.fx.crtOn, crtOff:WEM.app.renderer.fx.crtOff, mood:WEM.app.renderer.fx.mood}
})`));
// count non-transparent pixels in the two HUD canvases
console.log(await ev(`(function(){
  function count(cv){ var c=cv.getContext('2d'); var d=c.getImageData(0,0,cv.width,cv.height).data; var n=0; for(var i=3;i<d.length;i+=4) if(d[i]>8) n++; return n; }
  return JSON.stringify({full: count(WEM.app.hud.full), pan: count(WEM.app.hud.panC), panDirty: WEM.app.hud.panDirty});
})()`));
const dump = async (expr, name) => {
  const d = await ev(expr);
  if (typeof d !== "string" || !d.startsWith("data:")) { console.log("dump failed", name, String(d).slice(0, 120)); return; }
  fs.writeFileSync("out/" + name, Buffer.from(d.split(",")[1], "base64"));
  console.log("wrote out/" + name);
};
await dump("WEM.app.hud.panC.toDataURL('image/png')", "atlas.png");
await dump("WEM.app.hud.full.toDataURL('image/png')", "hudfull.png");
const s = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 90 });
fs.writeFileSync("out/diag.jpg", Buffer.from(s.data, "base64"));
console.log("wrote out/diag.jpg");
try { b.proc.kill(); } catch { }
process.exit(0);
