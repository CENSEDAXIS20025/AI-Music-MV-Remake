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

/* (1) re-timing wrote metadata times into the script, and those do not follow
   the order the lines are written in -- so a reply could land above its prompt.
   Sort once at load; the chat then always reads in time order. */
edit("src/sections4/tui_a.js", [
  ['  WEM.Tui.SCRIPT = S;',
   '  // the script is authored in narrative order but timed from the analysis, and\n  // those two orders differ; sort by time so a reply never precedes its prompt\n  S.sort(function (a, b) { return a.t0 - b.t0; });\n  WEM.Tui.SCRIPT = S;']
], "chat sorted by time");

/* (2) the opening now starts right after the first sung SIMULATION (13.891):
   the boot UI is cut away, and the garble resolves slowly across the section
   break, landing at ~16.8 s */
edit("src/sections4/tui_a.js", [
  ['      var hud = ctx.hud, l = ctx.local, t = ctx.t;\n      var on = clamp((l - 0.1) / 1.4, 0, 1);\n      ctx.fx.crtOn = on === 1 ? 1 : E.outQuart(on);\n      chatAt(ctx, { title: "deepseek \\u00b7 dsh \\u00b7 \\u542f\\u52a8" });',
   '      var hud = ctx.hud, l = ctx.local, t = ctx.t;\n      var on = clamp((l - 0.1) / 1.4, 0, 1);\n      ctx.fx.crtOn = on === 1 ? 1 : E.outQuart(on);\n      // (2) from just after the sung SIMULATION the boot UI is gone and the\n      // opening title takes the whole frame\n      if (t >= 13.95) {\n        var rv = clamp((t - 14.20) / 2.60, 0, 1);\n        var tgt = "world.execute(me);", o1 = "";\n        var gl = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>/\\\\|[]{}()";\n        for (var qi = 0; qi < tgt.length; qi++) {\n          o1 += (rv > qi / tgt.length + 0.04) ? tgt[qi] : gl[Math.floor(C.h2(qi * 7.3, Math.floor(t * 26)) * gl.length)];\n        }\n        hud.fc.save(); hud.fc.font = "700 96px " + T.FONT;\n        var w1 = hud.fc.measureText(tgt).width; hud.fc.restore();\n        hud.T((ctx.W - w1) / 2, 300, o1, { size: 96, weight: "700", spacing: "4px",\n          color: rv > 0.97 ? WH : CY, alpha: clamp((t - 14.20) / 0.45, 0, 1) });\n        statusBar(ctx, "\\u5f00\\u673a");\n        return;\n      }\n      chatAt(ctx, { title: "deepseek \\u00b7 dsh \\u00b7 \\u542f\\u52a8" });'],
  ['      var reveal = clamp((ctx.t - 16.05) / 0.70, 0, 1);',
   '      var reveal = clamp((ctx.t - 14.20) / 2.60, 0, 1);'],
  ['      var big = clamp((ctx.t - 16.02) / 0.22, 0, 1) * hold;',
   '      var big = clamp((ctx.t - 14.20) / 0.45, 0, 1) * hold;']
], "opening starts after SIMULATION");
