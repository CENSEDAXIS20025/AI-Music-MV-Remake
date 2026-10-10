import fs from "node:fs";
const done = [];

/* --- remove every extra flash in the TUI cut ------------------------------ */
let a = fs.readFileSync("src/sections4/tui_a.js", "utf8");
const before = a;
// 1. the per-stage flash fired a moment before the segment flash -> double
a = a.replace(`    var si = stageIndex(t);
    if (si !== _lastStage) {
      if (_lastStage >= 0 && t > STAGES[si][0] - 0.6) ctx.fx.hit(0.55);   // flash on the cut
      _lastStage = si;
    }`,
`    var si = stageIndex(t);
    _lastStage = si;              // stage changes no longer flash: transitions do`);
if (a !== before) done.push("stage flash removed");
// 2. segment 02's reveal-completion flash (the 15 s cut already flashes)
const b2 = a;
a = a.replace("      if (reveal >= 1 && !this.hitDone) { this.hitDone = true; ctx.fx.hit(0.85); }",
              "      // (flash removed: the 15.000 s cut carries the only white flash here)");
if (a !== b2) done.push("reveal flash removed");
fs.writeFileSync("src/sections4/tui_a.js", a);

/* --- the single transition flash, rebuilt from scratch -------------------- */
let m = fs.readFileSync("src/40_main.js", "utf8");
const oldCut = `      if (si !== this.curIdx) {
        // section change: white flash + glitch burst on the cut
        this.setSection(si);
        R.fx.flash = Math.max(R.fx.flash, 0.85);
        R.fx.glitch = Math.max(R.fx.glitch, 0.55);
        R.fx.disp = Math.max(R.fx.disp, 0.5);
      }`;
const newCut = `      if (si !== this.curIdx) {
        // ONE flash per transition. Segment 01 -> 02 is excluded: that cut is
        // already marked by the white flash at 15.000 inside segment 01.
        this.setSection(si);
        if (si !== 1) R.fx.flash = Math.max(R.fx.flash, 0.85);
        R.fx.glitch = Math.max(R.fx.glitch, 0.55);
        R.fx.disp = Math.max(R.fx.disp, 0.5);
      }`;
if (m.includes(oldCut)) { m = m.replace(oldCut, newCut); fs.writeFileSync("src/40_main.js", m); done.push("one flash per transition"); }
else console.log("  MISS transition flash block");

console.log("applied: " + done.join(", "));
