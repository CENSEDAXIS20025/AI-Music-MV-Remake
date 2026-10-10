import { launchBrowser, CDP, sleep } from "./cdp.mjs";
const port = 9471;
const b = await launchBrowser({ port, width: 900, height: 500 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws = new WebSocket(list.find((x) => x.type === "page").webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
await cdp.send("Runtime.evaluate", { expression: `window.__errs = []; window.addEventListener("error", function(e){ window.__errs.push(String(e.message)); }); (function(){ var o = console.error; console.error = function(){ window.__errs.push("console: " + Array.prototype.join.call(arguments, " ")); o.apply(console, arguments); }; })();` });
await cdp.send("Page.navigate", { url: "http://127.0.0.1:8791/index.html" });
await sleep(7000);
const state = async () => {
  const r = await cdp.send("Runtime.evaluate", {
    expression: `JSON.stringify({
      booted: !!window.__booted,
      mode: WEM.app && WEM.app.mode,
      hasRun: !!(WEM.App && WEM.App.prototype.run),
      errs: (window.__errs || []).slice(0, 4),
      startVisible: (function(){ var s = document.getElementById("start"); return s ? getComputedStyle(s).display : "none"; })(),
      audioT: WEM.app && WEM.app.audio ? +Number(WEM.app.audio.currentTime).toFixed(2) : null,
      audioErr: WEM.app && WEM.app.audio ? (WEM.app.audio.error ? String(WEM.app.audio.error.code) : null) : null,
      paused: WEM.app && WEM.app.audio ? WEM.app.audio.paused : null,
      readyState: WEM.app && WEM.app.audio ? WEM.app.audio.readyState : null,
      src: WEM.app && WEM.app.audio ? String(WEM.app.audio.src).slice(0, 60) : null
    })`, returnByValue: true
  });
  return JSON.parse(r.result.value);
};
console.log("after boot:", JSON.stringify(await state(), null, 0));
// click the start button the way a user would
await cdp.send("Runtime.evaluate", { expression: `(function(){ var s = document.getElementById("start"); if (s) s.click(); return "clicked"; })()`, returnByValue: true });
await sleep(3000);
console.log("after click:", JSON.stringify(await state(), null, 0));
try { b.proc.kill(); } catch {}
process.exit(0);
