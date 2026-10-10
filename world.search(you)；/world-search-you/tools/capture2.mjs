/* ============================================================================
   capture2.mjs -- offline film render, hardened.

   Same job as capture.mjs (headless Edge + CDP, frames streamed to ffmpeg's
   stdin as JPEG), but built to fail loudly instead of leaving a moov-less mp4:

     * the page MUST be in ?render (offline) mode. Without it index.html boots
       in play mode, its requestAnimationFrame loop keeps calling frame() with
       wall-clock times, and the two writers fight over app state -- the frame
       captured is then whatever the loop happened to paint, not the time that
       was asked for, so the video drifts from the audio. The flag is appended
       automatically when the URL does not already carry one.
     * page exceptions, console errors and WebGL context-loss notices are
       subscribed to up front and printed the moment they happen, with the
       frame time, so a segment that throws is identifiable.
     * the frame loop is wrapped: any throw is reported with its timestamp and
       frame index, ffmpeg is then closed *cleanly* (stdin.end + wait), which
       finalises the mp4 with a moov atom, and the process exits non-zero.
       A partial file that still plays beats a truncated one that does not.
     * progress line carries JS heap and a rolling ms/frame, so a leak shows up
       as a rising trend before it becomes a crash.

   node tools/capture2.mjs --url=http://127.0.0.1:8793/index.html \
        --out=out/_tmp.mp4 [--audio=...] [--w=1920 --h=1080 --fps=30 --t0=0 --t1=295.39]
   ========================================================================== */
import { launchBrowser, CDP, sleep } from "./cdp.mjs";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const FFMPEG = process.env.WEM_FFMPEG || "D:\\UsersApps\\FormatFactory\\ffmpeg.exe";

function arg(name, def) {
  const p = process.argv.find(a => a.startsWith("--" + name + "="));
  return p ? p.slice(name.length + 3) : def;
}

let url = arg("url", "http://127.0.0.1:8793/index.html");
if (/\.html?(\?|$)/.test(url) && !/[?&]render\b/.test(url)) {
  url += (url.includes("?") ? "&" : "?") + "render";
}
const W = +arg("w", 1920), H = +arg("h", 1080), FPS = +arg("fps", 30);
const PORT = +arg("port", 9351);
const out = arg("out", "out/_tmp.mp4");
const audio = arg("audio", null);
const t0 = +arg("t0", 0);
const t1 = +arg("t1", 0);
const quality = +arg("q", 94);
const crf = arg("crf", "17");
const preset = arg("preset", "slow");
/* Warm-up: frames drawn immediately before t0 and thrown away. A chunked
   render restarts the page, so the decaying composites (flash, glitch, display
   displacement) and the per-section `enter()` state would otherwise be caught
   mid-decay at the chunk's first frame. Replaying the second before t0 puts
   them where a continuous run would have them. 0.5 s is enough: every one of
   those decays is a Math.pow(rate, dt) with a rate well under 0.01/s. */
const warm = Math.max(0, Math.round(+arg("warm", 0.5) * FPS));
const nFrames = Math.round((t1 - t0) * FPS);

console.log(`capture2: ${url}`);
console.log(`          ${W}x${H} @ ${FPS}fps  t=${t0}..${t1}  frames=${nFrames}  warm=${warm}  -> ${out}`);

const browser = await launchBrowser({ port: PORT, width: W, height: H });
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
const cdp = new CDP(ws);

/* --------------------------------------------------- in-page diagnostics -- */
let frameNow = 0;
let pageErrors = 0, ctxLost = 0;
cdp.on("Runtime.exceptionThrown", (p) => {
  pageErrors++;
  const d = p.exceptionDetails || {};
  const txt = (d.exception && (d.exception.description || d.exception.value)) || d.text || "?";
  console.error(`!! PAGE EXCEPTION at frame ${frameNow} (t=${(t0 + frameNow / FPS).toFixed(2)}s):\n   ${String(txt).split("\n").slice(0, 6).join("\n   ")}`);
});
cdp.on("Runtime.consoleAPICalled", (p) => {
  if (p.type !== "error" && p.type !== "warning") return;
  const txt = (p.args || []).map(a => a.value !== undefined ? a.value : (a.description || a.type)).join(" ");
  console.error(`!! console.${p.type} at frame ${frameNow}: ${String(txt).slice(0, 400)}`);
});
cdp.on("Log.entryAdded", (p) => {
  const e = p.entry || {};
  if (e.level === "error") console.error(`!! log.${e.source} frame ${frameNow}: ${String(e.text).slice(0, 400)}`);
});
cdp.on("Inspector.targetCrashed", () => { ctxLost++; console.error(`!! RENDERER CRASHED at frame ${frameNow}`); });

await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
try { await cdp.send("Log.enable"); } catch { }
await cdp.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await cdp.send("Page.navigate", { url });

async function ev(expr, timeout = 300000) {
  const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true, timeout });
  if (r.exceptionDetails) throw new Error("page error: " + JSON.stringify(r.exceptionDetails).slice(0, 900));
  return r.result.value;
}

let booted = false;
for (let i = 0; i < 240; i++) {
  const o = JSON.parse(await ev("JSON.stringify({b:!!window.__booted,e:window.__bootError||null,m:!!window.__meta})"));
  if (o.e) { console.error("BOOT ERROR:\n" + o.e); try { browser.proc.kill(); } catch { } process.exit(1); }
  if (o.b) { booted = true; break; }
  await sleep(150);
}
if (!booted) { console.error("page never booted"); try { browser.proc.kill(); } catch { } process.exit(1); }

// context loss is a hard stop for a video render: every later frame is blank
await ev(`(function(){
  var c = document.getElementById('gl');
  window.__ctxLost = 0;
  c.addEventListener('webglcontextlost', function(e){ window.__ctxLost = 1; }, false);
  return true;
})()`);

/* --------------------------------------------------------------- warm-up -- */
if (warm > 0) {
  const wStart = Date.now();
  for (let i = warm; i >= 0; i--) await ev(`window.__render(${(t0 - i / FPS).toFixed(4)})`);
  console.log(`warmed ${warm} frames from ${(t0 - warm / FPS).toFixed(2)}s in ${((Date.now() - wStart) / 1000).toFixed(1)}s`);
}

/* ------------------------------------------------------------- ffmpeg out -- */
fs.mkdirSync(path.dirname(out), { recursive: true });
const ffArgs = [
  "-hide_banner", "-loglevel", "error", "-y",
  "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
];
if (audio) ffArgs.push("-i", audio);
ffArgs.push(
  "-map", "0:v",
  ...(audio ? ["-map", "1:a", "-c:a", "aac", "-b:a", "256k", "-shortest"] : []),
  "-c:v", "libx264", "-preset", preset, "-crf", crf,
  "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.2",
  "-movflags", "+faststart",
  "-r", String(FPS), out
);
const ff = spawn(FFMPEG, ffArgs, { stdio: ["pipe", "inherit", "inherit"] });
let ffDone = false, ffCode = null;
ff.on("close", (c) => { ffDone = true; ffCode = c; });
let stdinOK = true, stdinErr = null;
ff.stdin.on("error", (e) => { stdinOK = false; stdinErr = String(e.message); });

async function closeFF() {
  try { if (!ff.stdin.destroyed) ff.stdin.end(); } catch { }
  const deadline = Date.now() + 600000;
  while (!ffDone && Date.now() < deadline) await sleep(200);
  return ffDone;
}

/* ----------------------------------------------------------------- loop --- */
const tStart = Date.now();
let lastLog = 0, worst = 0, slowFrames = 0, aborted = null;

try {
  for (let i = 0; i < nFrames; i++) {
    frameNow = i;
    const t = t0 + i / FPS;
    const a = Date.now();
    await ev(`window.__render(${t.toFixed(4)})`);
    const shot = await cdp.send("Page.captureScreenshot", {
      format: "jpeg", quality, captureBeyondViewport: false, fromSurface: true
    });
    const ms = Date.now() - a;
    if (ms > worst) worst = ms;
    if (ms > 400) slowFrames++;
    if (!stdinOK) { aborted = "ffmpeg stdin " + (stdinErr || "closed"); break; }
    const ok = ff.stdin.write(Buffer.from(shot.data, "base64"));
    if (!ok) await new Promise(r => ff.stdin.once("drain", r));

    const el = (Date.now() - tStart) / 1000;
    if (i % 60 === 0 || i === nFrames - 1) {
      const eta = el / (i + 1) * (nFrames - i - 1);
      if (Date.now() - lastLog > 1200 || i === nFrames - 1) {
        lastLog = Date.now();
        // cheap liveness probes: heap growth, and whether the page still has a
        // live GL context. A blank tail in a long render almost always shows up
        // here first.
        let heap = "?", lost = "?";
        try {
          const s = await ev("JSON.stringify({h:(performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null),l:window.__ctxLost||0})");
          const o = JSON.parse(s);
          heap = o.h === null ? "n/a" : o.h + "MB";
          lost = o.l;
        } catch { }
        console.log(`frame ${i + 1}/${nFrames}  t=${t.toFixed(2)}s  ${(el / (i + 1) * 1000).toFixed(0)}ms/f  heap ${heap}  ctxLost ${lost}  eta ${(eta / 60).toFixed(1)}min`);
        if (lost === 1) { aborted = "WebGL context lost"; break; }
      }
    }
  }
} catch (e) {
  aborted = "frame loop threw: " + (e && e.message ? e.message : String(e));
}

if (!aborted && pageErrors) aborted = pageErrors + " page exception(s) during the render";

const closed = await closeFF();
try { browser.proc.kill(); } catch { }

console.log("---");
console.log(`ffmpeg ${closed ? "finalised" : "DID NOT FINISH"} (exit ${ffCode})`);
console.log(`worst frame ${worst}ms, ${slowFrames} frame(s) over 400ms`);
if (aborted) { console.error("ABORTED: " + aborted); process.exit(1); }
if (!closed || ffCode !== 0) { console.error("ffmpeg failed"); process.exit(1); }
const sz = fs.existsSync(out) ? (fs.statSync(out).size / 1048576).toFixed(1) + " MB" : "MISSING";
console.log(`done -> ${out}  ${sz}  in ${((Date.now() - tStart) / 60000).toFixed(1)} min`);
process.exit(0);
