import fs from "node:fs";
const done = [];

/* 7. v1's opening garble: the last glyph needed dec > 1.004, which dec (max 1)
      can never reach, so the ";" scrambled forever */
let a = fs.readFileSync("src/sections/a_01_05.js", "utf8");
const g0 = "        var thr = i / TITLE.length;";
if (a.includes(g0)) {
  a = a.replace(g0, "        var thr = i / (TITLE.length + 1);   // last glyph must resolve too");
  fs.writeFileSync("src/sections/a_01_05.js", a);
  done.push("opening garble resolves the ';'");
} else console.log("  MISS title threshold");

/* 6. the meter was too hot: make its strength a per-page setting */
let bar = fs.readFileSync("src/50_audiobar.js", "utf8");
const l0 = "        var lit = Math.pow(clamp(v * w * 1.06, 0, 1), 0.70) * SEG * 1.02 + 0.2;";
if (bar.includes(l0)) {
  bar = bar.replace(l0,
    "        // strength is per page: v1 asks for a calmer meter\n" +
    "        var abg = (typeof window !== \"undefined\" && window.WEM_AB_GAIN) || 1;\n" +
    "        var lit = Math.pow(clamp(v * w * 1.06 * abg, 0, 1), 0.70) * SEG * 1.02 + 0.2;");
  done.push("meter gain setting");
}

/* 8. a seek bar, created by the meter module so every build gets it */
if (!bar.includes("__seekInstalled")) {
  bar += `
  /* ---------------------------------------------------------------------
     A playback seek bar. Built here rather than in the page markup so both
     index.html and the standalone bundle get it for free.
     --------------------------------------------------------------------- */
  (function () {
    function install() {
      var app = window.WEM && WEM.app;
      if (!app || !app.audio || app.mode !== "play") return false;
      if (window.__seekInstalled) return true;
      window.__seekInstalled = true;
      var a = app.audio;
      var wrap = document.createElement("div");
      wrap.style.cssText = "position:fixed;left:0;right:0;bottom:0;height:26px;z-index:20;" +
        "display:flex;align-items:center;gap:10px;padding:0 14px;background:rgba(8,10,14,0.72);" +
        "font:11px/1 ui-monospace,Consolas,monospace;color:#8f9aa8;letter-spacing:0.5px";
      var cur = document.createElement("span"); cur.textContent = "0:00";
      var rng = document.createElement("input");
      rng.type = "range"; rng.min = "0"; rng.max = "1000"; rng.value = "0"; rng.step = "1";
      rng.style.cssText = "flex:1;height:4px;accent-color:#ffc94a;cursor:pointer";
      var tot = document.createElement("span"); tot.textContent = "0:00";
      wrap.appendChild(cur); wrap.appendChild(rng); wrap.appendChild(tot);
      document.body.appendChild(wrap);
      var fmt = function (s) {
        if (!isFinite(s)) return "0:00";
        var m = Math.floor(s / 60), q = Math.floor(s % 60);
        return m + ":" + (q < 10 ? "0" : "") + q;
      };
      var dragging = false;
      rng.addEventListener("input", function () { dragging = true; });
      rng.addEventListener("change", function () {
        if (isFinite(a.duration) && a.duration > 0) a.currentTime = (rng.value / 1000) * a.duration;
        dragging = false;
      });
      setInterval(function () {
        if (a.duration) {
          tot.textContent = fmt(a.duration);
          if (!dragging) rng.value = String(Math.round((a.currentTime / a.duration) * 1000));
        }
        cur.textContent = fmt(a.currentTime);
      }, 120);
      return true;
    }
    var tries = 0;
    var iv = setInterval(function () { if (install() || ++tries > 100) clearInterval(iv); }, 150);
  })();
`;
  done.push("seek bar");
}
fs.writeFileSync("src/50_audiobar.js", bar);
console.log("applied: " + done.join(", "));
