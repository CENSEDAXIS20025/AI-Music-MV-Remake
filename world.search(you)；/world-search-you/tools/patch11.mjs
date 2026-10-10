import fs from "node:fs";
const p = "src/sections4/tui_a.js";
let s = fs.readFileSync(p, "utf8");
const old = `    var lrc = (ctx.data && ctx.data.lrc) || [], cursor = 0.6;
    for (var i = 0; i < S.length; i++) {
      var m = S[i];
      var lt = m.who === "user" ? _lyricTime(lrc, m.text) : null;
      var t0 = lt !== null ? Math.max(lt, cursor + 0.08) : cursor + 0.55;
      m.t0 = t0;
      cursor = t0;
    }`;
const neu = `    // Song lines are the metronome: a message that quotes a lyric fires on that
    // lyric's exact timestamp (no cursor floor, or the opening lines drift), and
    // everything else is placed 0.8 s after the previous line, never overtaking
    // the next lyric.
    var lrc = ((ctx.data && ctx.data.lrc) || []).slice()
      .filter(function (e) { return !e.meta; })
      .sort(function (a, b) { return a.t - b.t; });
    var anchors = lrc.map(function (e) { return e.t; });
    function nextAnchor(t) {
      for (var a = 0; a < anchors.length; a++) if (anchors[a] > t + 0.05) return anchors[a];
      return Infinity;
    }
    var prev = -1;
    for (var i = 0; i < S.length; i++) {
      var m = S[i];
      var lt = m.who === "user" ? _lyricTime(lrc, m.text) : null;
      var t0;
      if (lt !== null) {
        t0 = lt;                                        // exactly on the sung line
      } else {
        t0 = Math.max(prev + 0.8, 0.5);
        var na = nextAnchor(prev);
        if (isFinite(na) && t0 > na - 0.12) t0 = Math.max(prev + 0.3, na - 0.12);
      }
      if (t0 <= prev) t0 = prev + 0.25;                 // keep it strictly increasing
      m.t0 = t0;
      prev = t0;
    }`;
if (!s.includes(old)) { console.log("MISS buildTurns body"); process.exit(1); }
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log("buildTurns rewritten: lyric lines land on their own timestamps");
