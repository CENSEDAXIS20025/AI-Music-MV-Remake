import { launchBrowser, CDP, sleep } from "./cdp.mjs";

const port = 9376;
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
for (let w = 40; w >= 0; w--) await ev(`window.__render(${(t - w / 30).toFixed(4)})`);
console.log(await ev(`(function(){
  var v = WEM.app.renderer._quadVerts;
  if (!v) return "no verts";
  var out = [];
  for (var q = 0; q < 3; q++) {
    var row = [];
    for (var i = 0; i < 6; i++) {
      var o = (q*6+i)*9;
      row.push([+v[o].toFixed(2), +v[o+1].toFixed(2), +v[o+2].toFixed(2), +v[o+3].toFixed(3), +v[o+4].toFixed(3), +v[o+5].toFixed(2)]);
    }
    out.push(row);
  }
  return JSON.stringify(out);
})()`));
console.log("glerr:", await ev(`(function(){ var e = WEM.app.gl.getError(); return e; })()`));
try { b.proc.kill(); } catch { }
process.exit(0);
