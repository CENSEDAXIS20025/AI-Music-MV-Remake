import fs from "node:fs";
function edit(path, pairs, label) {
  let s = fs.readFileSync(path, "utf8");
  const before = s;
  for (const [a, b] of pairs) {
    if (!s.includes(a)) { console.log("  MISS " + path + ": " + JSON.stringify(a.slice(0, 56))); continue; }
    s = s.split(a).join(b);
  }
  if (s !== before) { fs.writeFileSync(path, s); console.log("patched " + label); }
  else console.log("unchanged " + label);
}

/* T4: the popup flood waits for EIN at 158.900.
   Section 11 begins at 147.5168, so that is local 11.383. */
edit("src/sections4/tui_b.js", [
  ['      var flood = clamp((l - 10.0) / 2.2, 0, 1);',
   '      // T4: the flood is held back until EIN lands at 158.900 (local 11.383)\n      var flood = clamp((l - 11.383) / 1.40, 0, 1);']
], "T4 flood timing");

/* T3: the opening garble runs 15.0 -> 30.0 and is cut by the section flash.
   The reveal starts at 15.000 (still inside segment 01) and completes in 2.5 s;
   there is no early fade any more -- the segment change does the cutting. */
edit("src/sections4/tui_a.js", [
  ['      var reveal = clamp((ctx.t - 16.00) / 2.00, 0, 1);\n      var hold = 1 - clamp((l - 11.15) / 0.72, 0, 1);\n      var big = clamp((ctx.t - 16.00) / 0.30, 0, 1) * hold;',
   '      // T3: 15.000 -> 30.000, cut by the flash on the segment change\n      var reveal = clamp((ctx.t - 15.00) / 2.50, 0, 1);\n      var hold = 1;\n      var big = clamp((ctx.t - 15.00) / 0.35, 0, 1) * hold;']
], "T3 title window");
