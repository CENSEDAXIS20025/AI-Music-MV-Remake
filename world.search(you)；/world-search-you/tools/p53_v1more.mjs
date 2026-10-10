import fs from "node:fs";
const done = [];

/* (a) the blue divider between the two panels ----------------------------- */
let a = fs.readFileSync("src/sections4/tui_a.js", "utf8");
const seam = `      // the seam between them
      if (wipe > 0.02) {
        c0.save();
        c0.fillStyle = "rgba(120,170,230," + 0.5 * wipe + ")";
        c0.fillRect(DIVX - 1, 60, 2, ctx.H - 130);
        c0.fillStyle = "rgba(53,224,255," + 0.18 * wipe + ")";
        c0.fillRect(DIVX - 4, 60, 8, ctx.H - 130);
        c0.restore();
      }
`;
if (a.includes(seam)) { a = a.replace(seam, ""); fs.writeFileSync("src/sections4/tui_a.js", a); done.push("divider line removed"); }
else console.log("  MISS seam");

/* (b) calmer reels -------------------------------------------------------- */
let bar = fs.readFileSync("src/50_audiobar.js", "utf8");
const r0 = "      reel1 += spin * 0.016; reel2 += spin * 0.026;";
if (bar.includes(r0)) { bar = bar.replace(r0, "      reel1 += spin * 0.0055; reel2 += spin * 0.0090;   // slower reels"); done.push("reels slowed"); }
else console.log("  MISS reel spin");

/* (c) the seek bar: a pause button, and no black screen after seeking ----- */
if (bar.includes("input[type=range]") || bar.includes('rng.type = "range"')) {
  const oldBtn = `      var cur = document.createElement("span"); cur.textContent = "0:00";`;
  const newBtn = `      var pp = document.createElement("button");
      pp.textContent = "\\u23f8";
      pp.style.cssText = "background:transparent;border:1px solid #3a4353;color:#c9d4e2;border-radius:3px;" +
        "width:26px;height:18px;line-height:16px;font-size:11px;cursor:pointer;padding:0";
      pp.addEventListener("click", function () {
        if (a.paused) { a.play(); pp.textContent = "\\u23f8"; } else { a.pause(); pp.textContent = "\\u25b6"; }
      });
      var cur = document.createElement("span"); cur.textContent = "0:00";`;
  if (bar.includes(oldBtn)) {
    bar = bar.replace(oldBtn, newBtn);
    bar = bar.replace("      wrap.appendChild(cur); wrap.appendChild(rng); wrap.appendChild(tot);",
                      "      wrap.appendChild(pp); wrap.appendChild(cur); wrap.appendChild(rng); wrap.appendChild(tot);");
    done.push("pause button");
  } else console.log("  MISS seek ui");
}
fs.writeFileSync("src/50_audiobar.js", bar);

/* (c2) a backward seek used to feed a negative dt into the decay maths, which
       blows up and blacks the frame out. Clamp it and re-enter the segment. */
let m = fs.readFileSync("src/40_main.js", "utf8");
const d0 = `        var dt = Math.min(0.05, t - (self._last === undefined ? t - 1 / 60 : self._last));
        self._last = t;`;
const d1 = `        var raw = t - (self._last === undefined ? t - 1 / 60 : self._last);
        self._last = t;
        // a seek (or a stall) must not feed a bad dt into the decay maths
        if (!isFinite(raw) || raw <= 0 || raw > 0.25) {
          raw = 1 / 60;
          if (WEM.Data && WEM.Data.ready) {
            var si = WEM.Data.sectionIndex(t);
            if (si !== self.curIdx) self.setSection(si, true);
          }
        }
        var dt = Math.min(0.05, raw);`;
if (m.includes(d0)) { m = m.replace(d0, d1); done.push("seek-safe dt"); }
else console.log("  MISS loop dt");

/* (d) a global band gain, so a page can calm every audio-reactive visual --- */
const b0 = "    ctx.bands = data.bandsAt(t, this.ctx.bands);";
if (m.includes(b0)) {
  m = m.replace(b0,
    "    ctx.bands = data.bandsAt(t, this.ctx.bands);\n" +
    "    if (typeof window !== \"undefined\" && window.WEM_BANDS_GAIN !== undefined) {\n" +
    "      var bg = window.WEM_BANDS_GAIN, bb = ctx.bands;\n" +
    "      for (var bi = 0; bi < bb.length; bi++) bb[bi] *= bg;\n" +
    "    }");
  done.push("global band gain");
} else console.log("  MISS bands assignment");
fs.writeFileSync("src/40_main.js", m);

console.log("applied: " + done.join(", "));
