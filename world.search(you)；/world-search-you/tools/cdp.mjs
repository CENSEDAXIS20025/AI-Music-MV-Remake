// Minimal zero-dependency CDP driver for headless Edge/Chrome (Node 22+ global WebSocket).
// Usage: node tools/cdp.mjs <url> <outPrefix> <frames> <fps> [w] [h]
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

export function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export async function launchBrowser({ port = 9333, width = 1280, height = 720, headless = true, profile = null } = {}) {
  const dir = profile || fs.mkdtempSync(path.join(os.tmpdir(), "dsh-cdp-"));
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${dir}`,
    `--window-size=${width},${height}`,
    "--no-first-run", "--no-default-browser-check", "--disable-extensions",
    "--disable-background-timer-throttling", "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    "--autoplay-policy=no-user-gesture-required",
    "--allow-file-access-from-files",
    "--use-angle=d3d11", "--enable-gpu", "--disable-gpu-sandbox",
    "--enable-unsafe-webgpu",
    "--hide-scrollbars", "--mute-audio",
    "about:blank",
  ];
  if (headless) args.unshift("--headless=new");
  const proc = spawn(EDGE, args, { stdio: "ignore", detached: false });
  // wait for endpoint
  let info = null;
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) { info = await r.json(); break; }
    } catch { }
    await sleep(250);
  }
  if (!info) { try { proc.kill(); } catch { } throw new Error("browser did not start"); }
  return { proc, info, port, dir };
}

export class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = new Map();
    this.sessionId = null;
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      } else if (msg.method) {
        // every subscriber gets the event; capture tools want the page's
        // console, its exceptions and its context-loss notices all at once
        const list = this.handlers.get(msg.method);
        if (list) for (const h of list) h(msg.params, msg.sessionId);
      }
    });
  }
  on(method, fn) {
    let list = this.handlers.get(method);
    if (!list) { list = []; this.handlers.set(method, list); }
    list.push(fn);
    return () => {
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    };
  }
  send(method, params = {}, sessionId = this.sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error("timeout " + method)); } }, 300000);
    });
  }
}

export async function connect(port, targetUrl = null) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  let page = list.find(t => t.type === "page");
  if (!page) throw new Error("no page target");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
  const cdp = new CDP(ws);
  return cdp;
}
