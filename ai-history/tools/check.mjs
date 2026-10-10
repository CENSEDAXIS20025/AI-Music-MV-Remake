/* ============================================================================
   check.mjs -- integration harness.

   Loads a page, waits for boot, then walks the timeline: for every requested
   time it renders a warm-up run and captures BOTH a still and any console
   error / uncaught exception that happened while rendering that time.

   node tools/check.mjs --url=... --times=8,22,37 --outdir=out/check
                         [--w=1920 --h=1080 --warm=12 --port=9361 --prefix=t_]
                         [--sections]      one still at the middle of each of the
                                           15 analysis sections instead of --times
   ========================================================================== */
import { launchBrowser, CDP, sleep } from "./cdp.mjs";
import fs from "node:fs";
import path from "node:path";

function arg(name, def) {
  const p = process.argv.find(a => a.startsWith("--" + name + "="));
  return p ? p.slice(name.length + 3) : def;
}
const has = (name) => process.argv.includes("--" + name);

const url0 = arg("url", "http://127.0.0.1:8797/index.html");
// headless stills must be deterministic: force offline render mode so the page
// does not also start its own rAF loop, and so the START overlay is hidden.
const url = url0.includes("?") ? url0 : url0 + "?render";
const W = +arg("w", 1920), H = +arg("h", 1080), FPS = +arg("fps", 30);
const PORT = +arg("port", 9361);
const warm = +arg("warm", 12);
const quality = +arg("q", 92);
const prefix = arg("prefix", "t_");
const outdir = arg("outdir", "out/check");
const bySection = has("sections");
let times = arg("times", "").split(",").filter(Boolean).map(Number);
if (!times.length && !bySection) { console.error("need --times=a,b,c or --sections"); process.exit(1); }

const browser = await launchBrowser({ port: PORT, width: W, height: H });
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
const cdp = new CDP(ws);
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
await cdp.send("Log.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });

const found = [];
let phase = "boot";
cdp.on("Runtime.exceptionThrown", (p) => {
  const d = p.exceptionDetails || {};
  found.push({ phase, kind: "exception", text: (d.exception && (d.exception.description || d.exception.value)) || d.text });
});
cdp.on("Runtime.consoleAPICalled", (p) => {
  if (p.type !== "error" && p.type !== "warning") return;
  found.push({ phase, kind: p.type, text: (p.args || []).map(a => a.value !== undefined ? a.value : (a.description || a.type)).join(" ") });
});
cdp.on("Log.entryAdded", (p) => {
  const e = p.entry || {};
  if (e.level !== "error") return;
  found.push({ phase, kind: "log", text: e.text + (e.url ? "  @ " + e.url : "") });
});

await cdp.send("Page.navigate", { url });

async function ev(expr, timeout = 300000) {
  const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true, timeout });
  if (r.exceptionDetails) throw new Error("page error: " + JSON.stringify(r.exceptionDetails).slice(0, 900));
  return r.result.value;
}

// rendering must never abort the survey: a section that throws is exactly the
// thing this tool exists to find, so record it and keep walking the timeline
async function renderFrame(t) {
  const r = await cdp.send("Runtime.evaluate", {
    expression: `window.__render(${t})`, returnByValue: true, awaitPromise: true, timeout: 300000
  });
  if (r.exceptionDetails) {
    const d = r.exceptionDetails;
    found.push({
      phase, kind: "render-throw",
      text: ((d.exception && (d.exception.description || d.exception.value)) || d.text || "") +
        "  @ " + (d.stackTrace && d.stackTrace.callFrames && d.stackTrace.callFrames[0]
          ? d.stackTrace.callFrames[0].url.replace(/^.*\//, "") + ":" + (d.stackTrace.callFrames[0].lineNumber + 1) : "?")
    });
    return false;
  }
  return true;
}

let booted = false;
for (let i = 0; i < 240; i++) {
  const o = JSON.parse(await ev("JSON.stringify({b:!!window.__booted,e:window.__bootError||null})"));
  if (o.e) { console.error("BOOT ERROR:\n" + o.e); process.exit(1); }
  if (o.b) { booted = true; break; }
  await sleep(150);
}
if (!booted) { console.error("page never booted"); process.exit(1); }

// sanity: section definitions must line up with the analysis timeline
const meta = JSON.parse(await ev(`JSON.stringify({
  secs: (window.__meta && window.__meta.sections || []).map(s => [s.id, s.name, +s.start.toFixed(3), +s.end.toFixed(3)]),
  defs: (window.WEM.sections || []).map(s => [s.id, s.name]),
  dur: window.__meta && window.__meta.duration
})`));
console.log(`duration ${meta.dur}  analysis sections ${meta.secs.length}  defined sections ${meta.defs.length}`);
let mismatch = 0;
for (let i = 0; i < Math.max(meta.secs.length, meta.defs.length); i++) {
  const a = meta.secs[i], d = meta.defs[i];
  const ok = a && d && a[0] === d[0];
  if (!ok) { mismatch++; console.log(`  !! slot ${i}: analysis=${a ? a[0] + " " + a[1] : "-"}  defined=${d ? d[0] + " " + d[1] : "-"}`); }
  else console.log(`  ${String(i).padStart(2)} ${a[0]} ${a[1].padEnd(20)} ${a[2].toFixed(3)}–${a[3].toFixed(3)}`);
}
if (mismatch) console.log(`  ${mismatch} SLOT MISMATCH(ES) — section order is wrong`);

if (bySection) times = meta.secs.map(s => +((s[2] + (s[3] - s[2]) * 0.55).toFixed(2)));

fs.mkdirSync(outdir, { recursive: true });
const t0 = Date.now();
const report = [];
for (const t of times) {
  found.length = 0;
  phase = "t=" + t;
  const before = Date.now();
  for (let w = warm; w >= 0; w--) await renderFrame((t - w / FPS).toFixed(4));
  const s = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality, captureBeyondViewport: false, fromSurface: true });
  const buf = Buffer.from(s.data, "base64");
  const f = path.join(outdir, `${prefix}${String(t).replace(".", "_")}.jpg`);
  fs.writeFileSync(f, buf);
  const errs = found.slice();
  report.push({ t, bytes: buf.length, errs });
  console.log(`${t.toFixed(2)}s  ${String(buf.length / 1024 | 0).padStart(4)}KB  ${Date.now() - before}ms  ${errs.length ? "ERRORS " + errs.length : "clean"}`);
  for (const e of errs.slice(0, 4)) console.log(`     [${e.kind}] ${String(e.text).split("\n").slice(0, 3).join(" | ").slice(0, 260)}`);
}
const bad = report.filter(r => r.errs.length);
console.log(`\n${report.length} frames, ${bad.length} with errors, ${((Date.now() - t0) / 1000).toFixed(1)}s total`);
fs.writeFileSync(path.join(outdir, "report.json"), JSON.stringify(report, null, 1));
try { browser.proc.kill(); } catch { }
process.exit(bad.length ? 2 : 0);
