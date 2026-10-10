import fs from "node:fs";
function edit(path, pairs, label) {
  let s = fs.readFileSync(path, "utf8");
  const before = s;
  for (const [a, b] of pairs) {
    if (!s.includes(a)) { console.log("  MISS " + path + ": " + JSON.stringify(a.slice(0, 60))); continue; }
    s = s.split(a).join(b);
  }
  if (s !== before) { fs.writeFileSync(path, s); console.log("patched " + label); }
  else console.log("unchanged " + label);
}

/* (2) the supplied .lrc carries several timestamps per line and they are NOT in
   time order (e.g. "Then I will give you my" sits at 32.160 while "If I'm a set
   of points" sits at 36.090). lyricAt() scans for the last line at or before t,
   so on an unsorted list it returns the wrong line -- which is exactly why the
   yellow subtitle never matched the chat. Sort once at load. */
edit("src/30_data.js", [
  ['      self.lrc = self.meta.lrc.filter(function (l) { return !l.meta; });',
   '      // the raw LRC is not time-ordered; sort it or lyricAt() picks wrong lines\n      self.lrc = self.meta.lrc.filter(function (l) { return !l.meta; })\n        .sort(function (a, b) { return a.t - b.t; });']
], "sorted lrc");

/* (1) the garble no longer leaks into the boot segment: it starts on the cut
   and resolves a beat later, then the title holds until the interlude ends */
edit("src/sections4/tui_a.js", [
  ['      var reveal = clamp((ctx.t - 14.55) / 1.50, 0, 1);\n      var hold = 1 - clamp((l - 11.15) / 0.72, 0, 1);\n      var big = clamp((ctx.t - 14.55) / 0.30, 0, 1) * hold;',
   '      var reveal = clamp((ctx.t - 16.05) / 0.70, 0, 1);\n      var hold = 1 - clamp((l - 11.15) / 0.72, 0, 1);\n      var big = clamp((ctx.t - 16.02) / 0.22, 0, 1) * hold;'],
  ['      // the opening title starts scrambling before the cut so it can resolve\n      // exactly on the sung command\n      if (ctx.t > 14.55) {',
   '      // (removed) the garble used to start here; it now belongs to segment 02\n      if (false) {']
], "garble timing");
