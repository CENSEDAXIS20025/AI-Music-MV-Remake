import fs from "node:fs";
function edit(path, pairs, label) {
  let s = fs.readFileSync(path, "utf8");
  const before = s;
  for (const [a, b] of pairs) {
    if (!s.includes(a)) { console.log("  MISS " + path + ": " + JSON.stringify(a.slice(0, 58))); continue; }
    s = s.split(a).join(b);
  }
  if (s !== before) { fs.writeFileSync(path, s); console.log("patched " + label); }
  else console.log("unchanged " + label);
}

/* (2) rebuild the transcript as strict turns ---------------------------------
   Line times are now assigned by walking the authored order and advancing a
   cursor, so a reply can never be separated from its prompt. Lyric-quoting
   prompts borrow the real sung time, clamped so it never goes backwards. */
edit("src/sections4/tui_a.js", [
  ['  // the script is authored in narrative order but timed from the analysis, and\n  // those two orders differ; sort by time so a reply never precedes its prompt\n  S.sort(function (a, b) { return a.t0 - b.t0; });\n  WEM.Tui.SCRIPT = S;',
   `  WEM.Tui.SCRIPT = S;

  // (2) the transcript is authored as strict turns; times are assigned by
  // walking that order with a cursor, so "she" always answers right after the
  // line she is answering. Lyric-quoting prompts take the real sung time.
  var _built = false;
  function _norm(x) { return x.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\\s+/g, " ").trim(); }
  function _lyricTime(lrc, text) {
    if (/[^\\x00-\\x7F]/.test(text)) return null;
    var w = _norm(text);
    if (w.length < 6) return null;
    for (var i = 0; i < lrc.length; i++) if (_norm(lrc[i].text) === w) return lrc[i].t;
    return null;
  }
  function buildTurns(ctx) {
    if (_built) return;
    _built = true;
    var lrc = (ctx.data && ctx.data.lrc) || [], cursor = 0.6;
    for (var i = 0; i < S.length; i++) {
      var m = S[i];
      var lt = m.who === "user" ? _lyricTime(lrc, m.text) : null;
      var t0 = lt !== null ? Math.max(lt, cursor + 0.08) : cursor + 0.55;
      m.t0 = t0;
      cursor = t0;
    }
  }`],
  ['    var t = ctx.t, visible = [];',
   '    buildTurns(ctx);\n    var t = ctx.t, visible = [];']
], "transcript as turns");

/* (1) the opening starts on the sung command at [00:16.000], not on SIMULATION,
   and the boot UI stays up until then */
edit("src/sections4/tui_a.js", [
  ['      if (t >= 13.95) {', '      if (false) {'],
  ['      var reveal = clamp((ctx.t - 14.20) / 2.60, 0, 1);',
   '      var reveal = clamp((ctx.t - 16.00) / 2.00, 0, 1);'],
  ['      var big = clamp((ctx.t - 14.20) / 0.45, 0, 1) * hold;',
   '      var big = clamp((ctx.t - 16.00) / 0.30, 0, 1) * hold;']
], "opening at 16.000");

/* (3) the countdown: EIN DOS TROIS NE FEM LIU flash one by one, then a single
   large red EXECUTION dead centre, then the scene changes */
edit("src/sections4/tui_b.js", [
  ['      // (3) when the lyric reaches its last EXECUTION the word itself lands\n      var lastEx = 158.00 - ctx.data.sections[10].start;\n      if (l > lastEx - 0.10 && l < lastEx + 1.80) {\n        var ue = clamp((l - lastEx) / 0.26, 0, 1);\n        var sce = 1 + (1 - ue) * 1.9;\n        hud.T(ctx.W / 2, ctx.H / 2 + 40, "EXECUTION", {\n          size: Math.round(104 * sce), weight: "700", align: "center",\n          color: "rgba(255,64,54,0.98)",\n          alpha: clamp((l - lastEx) / 0.18, 0, 1)\n        });\n        hud.T(ctx.W / 2, ctx.H / 2 + 120, "\\u6700\\u540e\\u4e00\\u6b21", { size: 16, color: "rgba(255,140,130,0.95)", align: "center", alpha: clamp((l - lastEx - 0.3) / 0.4, 0, 1) });\n      }',
   `      // (3) the countdown from the lyric sheet: each word flashes alone, then
      // one large red EXECUTION holds the centre until the scene changes
      var S0 = ctx.data.sections[10].start;
      var CNT = [
        ["EIN", 158.900], ["DOS", 159.321], ["TROIS", 159.657],
        ["NE", 160.244], ["FEM", 160.693], ["LIU", 161.124]
      ];
      for (var ci2 = 0; ci2 < CNT.length; ci2++) {
        var tt0 = CNT[ci2][1] - S0, tt1 = (ci2 + 1 < CNT.length ? CNT[ci2 + 1][1] - S0 : 161.560 - S0);
        if (l < tt0 - 0.12 || l > tt1 + 0.05) continue;
        var uu = clamp((l - tt0) / 0.16, 0, 1);
        var dd = clamp((tt1 - l) / 0.10, 0, 1);
        var sc2 = (1 + (1 - uu) * 1.5) * (0.9 + 0.1 * dd);
        hud.T(ctx.W / 2, ctx.H / 2 + 40, CNT[ci2][0], {
          size: Math.round(92 * sc2), weight: "700", align: "center", spacing: "8px",
          color: "rgba(255,72,60,0.98)", alpha: Math.min(uu, dd)
        });
      }
      var exL = 161.584 - S0;
      if (l > exL - 0.05) {
        var ue = clamp((l - exL) / 0.22, 0, 1);
        var sce = 1 + (1 - ue) * 2.0;
        hud.T(ctx.W / 2, ctx.H / 2 + 40, "EXECUTION", {
          size: Math.round(132 * sce), weight: "700", align: "center", spacing: "4px",
          color: "rgba(255,52,42,1)", alpha: clamp((l - exL) / 0.14, 0, 1)
        });
      }`]
], "countdown per the lyric sheet");
