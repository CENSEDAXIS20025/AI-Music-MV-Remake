import { launchBrowser, CDP, sleep } from "./cdp.mjs";
const port = 9472;
const b = await launchBrowser({ port, width: 900, height: 500 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws = new WebSocket(list.find((x) => x.type === "page").webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
// load from the local filesystem, exactly like a double-click
await cdp.send("Page.navigate", { url: "file:///D:/DSH/%E6%B5%8B%E8%AF%952/world-execute-me/world-execute-me.html" });
await sleep(9000);
const st = async (tag) => {
  const r = await cdp.send("Runtime.evaluate", {
    expression: `JSON.stringify({
      booted: !!window.__booted, frames: window.__f || 0,
      err: window.__e || null,
      audioT: (window.WEM && WEM.app && WEM.app.audio) ? +Number(WEM.app.audio.currentTime).toFixed(2) : null,
      paused: (window.WEM && WEM.app && WEM.app.audio) ? WEM.app.audio.paused : null,
      startShown: (function(){ var s = document.getElementById("start"); return s ? getComputedStyle(s).display : "?"; })()
    })`, returnByValue: true
  });
  return tag + ": " + r.result.value;
};
await cdp.send("Runtime.evaluate", { expression: `window.__f = 0; window.__e = null;
  window.addEventListener("error", function(e){ window.__e = String(e.message); });
  var o = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function(f){ window.__f++; return o(f); };` });
console.log(await st("loaded"));
await cdp.send("Runtime.evaluate", { expression: `(function(){ var s = document.getElementById("start"); if (s) s.click(); return 1; })()` });
await sleep(4000);
console.log(await st("after click"));
try { b.proc.kill(); } catch {}
process.exit(0);
