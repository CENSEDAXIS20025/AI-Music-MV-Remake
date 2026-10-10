import { launchBrowser, CDP, sleep } from "./cdp.mjs";
const port = 9401;
const b = await launchBrowser({ port, width: 800, height: 450 });
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = list.find(x => x.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
const cdp = new CDP(ws);
const logs = [];
cdp.on("Runtime.exceptionThrown", p => logs.push("EXC " + ((p.exceptionDetails.exception||{}).description||p.exceptionDetails.text||"").slice(0,300)));
cdp.on("Log.entryAdded", p => logs.push("LOG " + p.entry.level + " " + p.entry.text.slice(0,200)));
await cdp.send("Page.enable"); await cdp.send("Runtime.enable"); await cdp.send("Log.enable");
await cdp.send("Page.navigate", { url: process.argv[2] });
await sleep(15000);
const r = await cdp.send("Runtime.evaluate", { expression: `JSON.stringify({rs:document.readyState, scripts:document.scripts.length, core: typeof (window.WEM&&WEM.core), viz: typeof (window.WEM&&WEM.Viz), main: typeof (window.WEM&&WEM.boot), embedKeys: window.WEM&&WEM.EMBED?Object.keys(WEM.EMBED).length:0, sections: window.WEM&&WEM.sections?WEM.sections.length:-1, err: window.__bootError||null, booted: !!window.__booted})`, returnByValue: true });
console.log("STATE:", r.result.value);
logs.slice(0,8).forEach(l => console.log(" ", l));
try { b.proc.kill(); } catch {}
process.exit(0);

