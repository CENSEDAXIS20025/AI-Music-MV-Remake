import fs from "node:fs";

/* 1. expose __render in BOTH modes, so ?play can also be captured ------- */
let m = fs.readFileSync("src/40_main.js", "utf8");
const oldBlock = `      if (opts.mode === "render") {
        window.__render = function (t) { app.renderAt(t); return true; };`;
const newBlock = `      // __render is available in every mode (the capture tool needs it even when
      // the page is playing)
      {
        window.__render = function (t) { app.renderAt(t); return true; };`;
if (!m.includes(oldBlock)) { console.log("MISS render block"); process.exit(1); }
m = m.replace(oldBlock, newBlock);
fs.writeFileSync("src/40_main.js", m);
console.log("__render exposed in all modes");

/* 2. index.html now STARTS the film by default: opening it plays the audio and
      runs the animation (and therefore the audio meter). ?render keeps the old
      deterministic single-frame behaviour. ------------------------------- */
let h = fs.readFileSync("index.html", "utf8");
const oldPlay = `  var play = new URLSearchParams(location.search).has("play");`;
const newPlay = `  // default = play: opening the file starts the music, the animation and the
  // audio meter. Add ?render for a single deterministic frame.
  var play = !new URLSearchParams(location.search).has("render");`;
if (!h.includes(oldPlay)) { console.log("MISS play flag"); process.exit(1); }
h = h.replace(oldPlay, newPlay);
fs.writeFileSync("index.html", h);
console.log("index.html defaults to play");
