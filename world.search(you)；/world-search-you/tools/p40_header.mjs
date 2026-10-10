import fs from "node:fs";

/* bug 1: the checkpoint counter was dropped from the status line ------------ */
let a = fs.readFileSync("src/sections4/tui_a.js", "utf8");
const oldSub = `      sub: live ? stageAt(t) : "",`;
const newSub = `      sub: live ? (stageAt(t) + " \\u00b7 " + ckptAt(t)) : "",`;
if (!a.includes(oldSub)) { console.log("MISS sub"); process.exit(1); }
a = a.replace(oldSub, newSub);

/* bug 2: subColor was computed but never handed to guiChat ----------------- */
const oldOpt = `      opt.sub = st.sub; opt.footer = st.footer; opt.lossText = st.lossText; opt.prog = st.prog;`;
const newOpt = `      opt.sub = st.sub; opt.subColor = st.subColor;
      opt.footer = st.footer; opt.lossText = st.lossText; opt.prog = st.prog;`;
if (!a.includes(oldOpt)) { console.log("MISS opt(tui_a)"); process.exit(1); }
a = a.replace(oldOpt, newOpt);
fs.writeFileSync("src/sections4/tui_a.js", a);

let b = fs.readFileSync("src/sections4/tui_b.js", "utf8");
if (b.includes(oldOpt)) {
  b = b.replace(oldOpt, newOpt);
  fs.writeFileSync("src/sections4/tui_b.js", b);
  console.log("tui_b opt.subColor set");
} else console.log("tui_b opt line differs");
console.log("header: stage + ckpt, colour wired through");
