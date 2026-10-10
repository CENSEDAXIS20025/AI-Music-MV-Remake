import { launchBrowser, CDP, sleep } from "./cdp.mjs";

const port = 9355;
const url = process.argv[2] || "http://127.0.0.1:8791/build/engine_test.html";
const waitMs = +(process.argv[3] || 4000);
const b = await launchBrowser({ port, width: 1920, height: 1080 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = list.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
const cdp = new CDP(ws);
const logs = [];
cdp.on("Runtime.consoleAPICalled", (p) => {
  logs.push("[" + p.type + "] " + p.args.map(a => a.value !== undefined ? a.value : (a.description || a.type)).join(" "));
});
cdp.on("Runtime.exceptionThrown", (p) => {
  const d = p.exceptionDetails;
  logs.push("[EXCEPTION] " + (d.exception && (d.exception.description || d.exception.value) || d.text) +
    " @" + (d.url || "") + ":" + d.lineNumber);
});
cdp.on("Log.entryAdded", (p) => { logs.push("[log:" + p.entry.level + "] " + p.entry.text + " " + (p.entry.url || "")); });
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
await cdp.send("Log.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await cdp.send("Page.navigate", { url });
await sleep(waitMs);
const r = await cdp.send("Runtime.evaluate", {
  expression: "JSON.stringify({booted:!!window.__booted, err:window.__bootError||null, hasRender:typeof window.__render, meta:window.__meta||null, sections:(window.WEM&&WEM.sections||[]).length, dataReady: !!(window.WEM&&WEM.Data&&WEM.Data.ready), app: !!(window.WEM&&WEM.app)})",
  returnByValue: true
});
console.log("STATE:", r.result.value);
console.log("LOGS:");
logs.slice(-40).forEach(l => console.log("  " + l.slice(0, 700)));
try { b.proc.kill(); } catch { }
process.exit(0);
