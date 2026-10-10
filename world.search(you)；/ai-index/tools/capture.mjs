/* ============================================================================
   capture.mjs -- render the visualizer offline through headless Edge + CDP.

   node tools/capture.mjs --url=... [--out=out/x.mp4] [--still=1.0,20.5]
                           [--w=1920 --h=1080 --fps=30 --t0=0 --t1=211.9]
                           [--audio=assets/audio/world-execute-me.mp3]
   Frames are streamed to ffmpeg's stdin as a JPEG image2pipe -- no temp files.
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
const has = (n) => process.argv.some(a => a === "--" + n || a.startsWith("--" + n + "="));

const url = arg("url", "http://127.0.0.1:8791/index.html?render");
const W = +arg("w", 1920), H = +arg("h", 1080), FPS = +arg("fps", 30);
const PORT = +arg("port", 9341);
const out = arg("out", null);
const audio = arg("audio", null);
const t0 = +arg("t0", 0);
const t1 = +arg("t1", 0);
const stills = arg("still", null) ? arg("still").split(",").map(Number) : null;
const stillDir = arg("stilldir", "out/stills");
const quality = +arg("q", 94);
const verbose = has("verbose");

const browser = await launchBrowser({ port: PORT, width: W, height: H });
const cdp = await connect_(PORT);
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await cdp.send("Page.navigate", { url });

async function connect_(port) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = list.find(t => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
  return new CDP(ws);
}

async function ev(expr, timeout = 300000) {
  const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true, timeout });
  if (r.exceptionDetails) throw new Error("page error: " + JSON.stringify(r.exceptionDetails).slice(0, 900));
  return r.result.value;
}

// wait for boot
let booted = false;
for (let i = 0; i < 200; i++) {
  const st = await ev("JSON.stringify({b:!!window.__booted, e:window.__bootError||null, m:window.__meta||null})");
  const o = JSON.parse(st);
  if (o.e) { console.error("BOOT ERROR:\n" + o.e); process.exit(1); }
  if (o.b) { booted = true; if (verbose) console.log("meta:", JSON.stringify(o.m).slice(0, 300)); break; }
  await sleep(150);
}
if (!booted) { console.error("page never booted"); process.exit(1); }

async function shot() {
  const s = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality, captureBeyondViewport: false, fromSurface: true });
  return Buffer.from(s.data, "base64");
}

/* ------------------------------------------------------------- still mode */
if (stills) {
  fs.mkdirSync(stillDir, { recursive: true });
  const warm = +arg("warm", 45);
  for (const t of stills) {
    // run the preceding frames so decaying effects settle, then grab the exact frame
    for (let w = warm; w >= 0; w--) await ev(`window.__render(${(t - w / FPS).toFixed(4)})`);
    const buf = await shot();
    const f = path.join(stillDir, `t_${String(t).replace(".", "_")}.jpg`);
    fs.writeFileSync(f, buf);
    console.log("wrote", f, (buf.length / 1024).toFixed(0) + "KB");
  }
  try { browser.proc.kill(); } catch { }
  process.exit(0);
}

/* ------------------------------------------------------------ video mode */
if (!out) { console.error("need --out or --still"); process.exit(1); }
const nFrames = Math.round((t1 - t0) * FPS);
fs.mkdirSync(path.dirname(out), { recursive: true });

const ffArgs = [
  "-hide_banner", "-loglevel", "error", "-y",
  "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
];
if (audio) ffArgs.push("-i", audio);
ffArgs.push(
  "-map", "0:v",
  ...(audio ? ["-map", "1:a", "-c:a", "aac", "-b:a", "256k", "-shortest"] : []),
  "-c:v", "libx264", "-preset", "slow", "-crf", "17",
  "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.2",
  "-movflags", "+faststart",
  "-r", String(FPS), out
);
const ff = spawn(FFMPEG, ffArgs, { stdio: ["pipe", "inherit", "inherit"] });
let ffDone = false, ffErr = null;
ff.on("close", (c) => { ffDone = true; if (c !== 0) ffErr = "ffmpeg exit " + c; });

let stdinOK = true;
ff.stdin.on("error", (e) => { stdinOK = false; ffErr = String(e.message); });

const tStart = Date.now();
let lastLog = 0;
for (let i = 0; i < nFrames; i++) {
  const t = t0 + i / FPS;
  await ev(`window.__render(${t})`);
  const buf = await shot();
  if (!stdinOK) break;
  const ok = ff.stdin.write(buf);
  if (!ok) await new Promise(r => ff.stdin.once("drain", r));
  if (i % 30 === 0 || i === nFrames - 1) {
    const el = (Date.now() - tStart) / 1000;
    const eta = el / Math.max(i + 1, 1) * (nFrames - i - 1);
    if (Date.now() - lastLog > 900 || i === nFrames - 1) {
      lastLog = Date.now();
      console.log(`frame ${i + 1}/${nFrames}  t=${t.toFixed(2)}s  ${(el / (i + 1) * 1000).toFixed(0)}ms/f  eta ${(eta / 60).toFixed(1)}min`);
    }
  }
}
ff.stdin.end();
while (!ffDone) await sleep(300);
try { browser.proc.kill(); } catch { }
if (ffErr) { console.error("ffmpeg failed: " + ffErr); process.exit(1); }
console.log("done ->", out, fs.existsSync(out) ? (fs.statSync(out).size / 1048576).toFixed(1) + " MB" : "MISSING");
process.exit(0);
