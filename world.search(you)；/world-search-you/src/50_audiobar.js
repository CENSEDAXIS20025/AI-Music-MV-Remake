/* ============================================================================
   world.execute(me);  --  bottom audio meter, shared by every version
   LED bar spectrum + cassette deck: two reels, tape counter, REC lamp, VU pair.
   Driven entirely by the precomputed analysis, so offline renders stay exact.
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, COL = WEM.HUD.COL;
  var clamp = C.clamp;

  var NB = 64;
  var peaks = new Float32Array(NB);
  var peaksV = new Float32Array(NB);
  var reel1 = 0, reel2 = 0;
  var vuSmooth = 0;

  function ledColor(k, lit) {
    // k: 0 at the bottom of the bar, 1 at the top
    if (!lit) return "rgba(255,255,255,0.07)";
    if (k > 0.86) return "rgba(255,90,82,0.95)";
    if (k > 0.68) return "rgba(255,201,74,0.95)";
    return "rgba(94,224,160,0.92)";
  }

  function reel(hud, cx, cy, r, spin, alpha) {
    var c = hud.fc;
    c.save();
    c.globalAlpha = alpha;
    c.strokeStyle = "rgba(228,235,242,0.5)";
    c.lineWidth = 1.6;
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = "rgba(228,235,242,0.28)";
    c.beginPath(); c.arc(cx, cy, r * 0.34, 0, Math.PI * 2); c.stroke();
    // three spokes show the rotation
    c.strokeStyle = "rgba(228,235,242,0.62)";
    c.lineWidth = 2.0;
    for (var i = 0; i < 3; i++) {
      var a = spin + i * Math.PI * 2 / 3;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * r * 0.34, cy + Math.sin(a) * r * 0.34);
      c.lineTo(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92);
      c.stroke();
    }
    c.restore();
  }

  WEM.AudioBar = {
    // band index -> x, and the shared frame; keep the geometry in one place so the
    // spectrum, the ticks and the progress overlay all line up
    geom: function (W, H) {
      var x0 = 26, x1 = W - 26;
      var y0 = H - 46, h = 36;
      var deckW = 232, vuw = 132;
      return {
        x0: x0, x1: x1, y0: y0, h: h,
        beatX0: x0 + deckW, beatX1: x1 - vuw, yTop: y0, yBot: y0 + h,
        deckX: x0, deckW: deckW, vuX: x1 - vuw, vuW: vuw
      };
    },

    draw: function (ctx, hud) {
      var W = ctx.W, H = ctx.H, t = ctx.t, bands = ctx.bands, b = ctx.beat;
      var g = this.geom(W, H);
      var c = hud.fc;
      var yTop = g.yTop, yBot = g.yBot, hgt = g.h;

      // ---- frame ----
      hud.rect(g.x0 - 8, yTop - 9, (g.x1 - g.x0) + 16, hgt + 17,
        { fill: "rgba(6,8,11,0.55)", stroke: "rgba(228,235,242,0.22)" });

      // ---- cassette deck on the left ----
      var rms = ctx.rms || 0;
      var spin = rms * 9.0;
      reel1 += spin * 0.0055; reel2 += spin * 0.0090;   // slower reels
      var cy = yTop + hgt * 0.5;
      reel(hud, g.deckX + 34, cy, 11, reel1, 0.95);
      reel(hud, g.deckX + 78, cy, 11, reel2, 0.95);
      hud.line(g.deckX + 45, cy, g.deckX + 67, cy, { color: "rgba(228,235,242,0.35)", lw: 2.4 });
      // REC lamp blinks on the beat
      var rec = b.pulse > 0.35;
      hud.rect(g.deckX + 104, cy - 9, 9, 9, { fill: rec ? "rgba(255,60,50,0.98)" : "rgba(120,30,26,0.9)" });
      hud.T(g.deckX + 118, cy + 5, "REC", { size: 12, color: rec ? COL.red : COL.faint, alpha: rec ? 1 : 0.55 });
      // tape counter / timecode
      var mm = Math.floor(t / 60), ss = t - mm * 60;
      var tc = ("0" + mm).slice(-2) + ":" + (ss < 10 ? "0" : "") + ss.toFixed(1);
      hud.T(g.deckX + 168, cy + 5, tc, { size: 15, color: COL.cyan, alpha: 0.95 });
      hud.T(g.deckX + 168, yTop + 9, "TAPE", { size: 9, color: COL.faint, alpha: 0.8, spacing: "1px" });

      // ---- LED bar spectrum ----
      var bx0 = g.beatX0 + 10, bx1 = g.beatX1 - 10;
      var n = NB, bw = (bx1 - bx0) / n;
      var SEG = 13, segH = (hgt - 4) / SEG;
      for (var i = 0; i < n; i++) {
        var v = clamp(bands[i], 0, 1);
        // a little bass emphasis, a perceptual curve, and a fast release so the
        // bars snap back instead of hanging
        var w = i < 8 ? 1.14 : (i > 52 ? 1.08 : 1.02);
        // strength is per page: v1 asks for a calmer meter
        var abg = (typeof window !== "undefined" && window.WEM_AB_GAIN) || 1;
        var abe = (typeof window !== "undefined" && window.WEM_AB_EXPO) || 0.70;
        var abm = (typeof window !== "undefined" && window.WEM_AB_MUL) || 1.06;
        var lit = Math.pow(clamp(v * w * abm * abg, 0, 1), abe) * SEG * 1.02 + 0.2;
        var litI = Math.floor(lit);
        if (litI > peaks[i]) peaks[i] = litI;
        peaks[i] -= 0.42;
        if (peaks[i] < litI) peaks[i] = litI;
        var x = bx0 + i * bw;
        for (var s = 1; s <= SEG; s++) {
          var k = s / SEG;
          c.fillStyle = ledColor(k, s <= litI);
          c.fillRect(x + 0.5, yBot - 2 - s * segH, Math.max(1, bw - 1.8), segH - 1.0);
        }
        var pk = Math.min(SEG, Math.round(peaks[i]));
        if (pk >= 1) {
          c.fillStyle = pk >= SEG - 1 ? "rgba(255,90,82,1)" : "rgba(255,255,255,0.9)";
          c.fillRect(x + 0.5, yBot - 2 - pk * segH - 1.8, Math.max(1, bw - 1.8), 1.8);
        }
      }

      // ---- VU pair on the right ----
      var vuX = g.vuX + 8, vuW = g.vuW - 18;
      var lo = 0, hi = 0;
      for (var q = 0; q < 16; q++) lo += bands[q];
      for (var q2 = 48; q2 < 64; q2++) hi += bands[q2];
      lo = clamp(lo / 16 * 1.5, 0, 1); hi = clamp(hi / 16 * 2.4, 0, 1);
      vuSmooth = vuSmooth * 0.7 + rms * 0.3;
      var rows = [["L", lo], ["R", hi], ["Σ", clamp((lo + hi + vuSmooth) / 3 * 1.2, 0, 1)]];
      for (var r = 0; r < rows.length; r++) {
        var ry = yTop + 4 + r * 9;
        hud.T(vuX, ry + 7, rows[r][0], { size: 10, color: COL.dim, alpha: 0.9 });
        hud.rect(vuX + 12, ry, vuW - 12, 7, { fill: "rgba(255,255,255,0.06)" });
        var segs = 20, on = Math.round(rows[r][1] * segs);
        for (var si = 0; si < segs; si++) {
          var kk = si / segs;
          c.fillStyle = si < on ? ledColor(kk + 0.1, true) : "rgba(255,255,255,0.06)";
          c.fillRect(vuX + 13 + si * ((vuW - 14) / segs), ry + 1, Math.max(1, (vuW - 14) / segs - 1.2), 5);
        }
      }

      // ---- progress ticks sit on the bar's top edge ----
      if (ctx.data && ctx.data.sections) {
        var S = ctx.data.sections, dur = ctx.data.duration;
        for (var k2 = 0; k2 < S.length; k2++) {
          var px = bx0 + (bx1 - bx0) * (S[k2].start / dur);
          var on2 = k2 === ctx.app.idxNow;
          hud.line(px, yTop - 7, px, yTop - 1, { color: on2 ? "rgba(53,224,255,0.95)" : "rgba(228,235,242,0.30)", lw: on2 ? 2 : 1 });
        }
        var cx2 = bx0 + (bx1 - bx0) * Math.min(t / dur, 1);
        hud.line(cx2, yTop - 11, cx2, yTop, { color: "rgba(255,201,74,0.95)", lw: 2 });
        hud.T(bx0, yTop - 14, "SIMULATION PROGRESS", { size: 9, color: COL.faint, alpha: 0.85, spacing: "1px" });
        hud.T(bx1, yTop - 14, Math.round(t / dur * 100) + "%", { size: 10, color: COL.dim, align: "right", alpha: 0.9 });
      }
    }
  };
})();

  /* ---------------------------------------------------------------------
     Page chrome: a playback seek bar and the dark/paper theme toggle.
     Built here rather than in the page markup so index.html, index.light.html
     and the standalone bundle all get them for free, and so the dark/light
     styling lives in exactly one stylesheet.
     --------------------------------------------------------------------- */
  (function () {
    var CSS = [
      "#wem-seek{position:fixed;left:0;right:0;bottom:0;height:26px;z-index:20;display:flex;",
      "align-items:center;gap:10px;padding:0 14px;background:rgba(8,10,14,0.72);",
      "font:11px/1 ui-monospace,Consolas,monospace;color:#8f9aa8;letter-spacing:0.5px}",
      "#wem-seek button{background:transparent;border:1px solid #3a4353;color:#c9d4e2;border-radius:3px;",
      "width:26px;height:18px;line-height:16px;font-size:11px;cursor:pointer;padding:0}",
      "#wem-seek input[type=range]{flex:1;height:4px;accent-color:#ffc94a;cursor:pointer}",
      "#wem-theme{position:fixed;right:14px;bottom:34px;z-index:21;background:rgba(8,10,14,0.72);",
      "border:1px solid #3a4353;color:#c9d4e2;border-radius:3px;padding:4px 10px;",
      "font:11px/1.2 ui-monospace,Consolas,monospace;letter-spacing:0.5px;cursor:pointer;opacity:0.62}",
      "#wem-theme:hover{opacity:1;border-color:#ffc94a;color:#ffc94a}",
      /* ---- paper theme chrome ---- */
      "html.wem-light #wem-seek{background:rgba(250,249,244,0.82);color:#5f6771}",
      "html.wem-light #wem-seek button{border-color:#b6bec8;color:#39424d}",
      "html.wem-light #wem-seek input[type=range]{accent-color:#a8651a}",
      "html.wem-light #wem-theme{background:rgba(250,249,244,0.85);border-color:#b6bec8;color:#39424d}",
      "html.wem-light #wem-theme:hover{border-color:#a8651a;color:#a8651a}"
    ].join("");
    function style() {
      if (document.getElementById("wem-chrome-css")) return;
      var s = document.createElement("style");
      s.id = "wem-chrome-css";
      s.textContent = CSS;
      document.head.appendChild(s);
    }
    // stills are captured through the page, so the chrome must stay out of them
    function stillMode() {
      try { return new URLSearchParams(location.search).has("render"); } catch (e) { return false; }
    }

    function install() {
      var app = window.WEM && WEM.app;
      if (!app || !app.audio || app.mode !== "play") return false;
      if (window.__seekInstalled) return true;
      window.__seekInstalled = true;
      style();
      var a = app.audio;
      var wrap = document.createElement("div");
      wrap.id = "wem-seek";
      var pp = document.createElement("button");
      pp.textContent = "\u23f8";
      pp.addEventListener("click", function () {
        if (a.paused) { a.play(); pp.textContent = "\u23f8"; } else { a.pause(); pp.textContent = "\u25b6"; }
      });
      var cur = document.createElement("span"); cur.textContent = "0:00";
      var rng = document.createElement("input");
      rng.type = "range"; rng.min = "0"; rng.max = "1000"; rng.value = "0"; rng.step = "1";
      var tot = document.createElement("span"); tot.textContent = "0:00";
      wrap.appendChild(pp); wrap.appendChild(cur); wrap.appendChild(rng); wrap.appendChild(tot);
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

    // the toggle is not a playback control: it must work in every mode
    function installToggle() {
      if (window.__themeInstalled || !window.WEM || !WEM.setTheme) return;
      window.__themeInstalled = true;
      style();
      var btn = document.createElement("button");
      btn.id = "wem-theme";
      btn.title = "switch between the dark film and the paper (light) theme";
      function label() { btn.textContent = WEM.Theme.light ? "\u25d1 DARK" : "\u25d0 LIGHT"; }
      label();
      btn.addEventListener("click", function () {
        WEM.setTheme(WEM.Theme.light ? "dark" : "light");
        label();
      });
      if (stillMode()) btn.style.display = "none";
      document.body.appendChild(btn);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installToggle);
    else installToggle();

    var tries = 0;
    var iv = setInterval(function () { if (install() || ++tries > 100) clearInterval(iv); }, 150);
  })();
