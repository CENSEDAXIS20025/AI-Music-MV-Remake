import fs from "node:fs";

/* 1. the self-check listing types slower, and the GUI only appears at
      07.446 (Fill in my data parameters) -- so the split moves to 7.446 */
let a = fs.readFileSync("src/sections4/tui_a.js", "utf8");
a = a.replace("      var shown = Math.floor((t - 0.25) / 0.38) + 1;   // one line at a time",
              "      var shown = Math.floor((t - 0.35) / 0.50) + 1;   // one line at a time, slow");
a = a.replace("      var SPLIT = 6.42;                       // CRT opens on OBJECT CREATION",
              "      var SPLIT = 7.446;                      // GUI appears on Fill in my data parameters");

/* 3a. the title was pushed right by +200 to dodge the panel; centre it */
a = a.replace('hud.T((ctx.W - w1) / 2 + 200, 300, o1,', 'hud.T((ctx.W - w1) / 2, 300, o1,');

/* 3b. fire the white flash on the 15 s cut, like every later segment change */
a = a.replace(`      // ---- T3: the opening title owns the frame from 15.000 --------------
      if (t >= 15.0) {`,
`      // ---- T3: the opening title owns the frame from 15.000 --------------
      if (t >= 15.0) {
        if (!WEM._opened15) { WEM._opened15 = 1; ctx.fx.hit(0.92); }   // flash on the cut`);

/* 2. the composer types world.execute(me); from 11.095 -------------------- */
const oldComposer = `    c.fillStyle = "rgba(140,155,175,0.85)"; c.font = "15px " + CJK;
    c.fillText("\\u63cf\\u8ff0\\u4f60\\u60f3\\u8981\\u6784\\u5efa\\u7684\\u5185\\u5bb9\\uff0c/ \\u8c03\\u7528\\u6307\\u4ee4\\uff0c@ \\u2026",
      x + 44, byy + 34);`;
const newComposer = `    // from 11.095 he types the command into the composer
    var CMD = "world.execute(me);", T0 = 11.095, RATE = 4.6;
    var typed = t >= T0 ? CMD.slice(0, Math.min(CMD.length, Math.floor((t - T0) * RATE) + 1)) : "";
    if (typed) {
      c.fillStyle = "rgba(236,244,252,0.98)"; c.font = "15px " + T.FONT;
      c.fillText(typed, x + 44, byy + 34);
      if (typed.length < CMD.length && Math.floor(t * 2) % 2) {
        c.fillStyle = "rgba(200,214,230,0.85)";
        c.fillRect(x + 46 + c.measureText(typed).width, byy + 22, 9, 16);
      }
    } else {
      c.fillStyle = "rgba(140,155,175,0.85)"; c.font = "15px " + CJK;
      c.fillText("\\u63cf\\u8ff0\\u4f60\\u60f3\\u8981\\u6784\\u5efa\\u7684\\u5185\\u5bb9\\uff0c/ \\u8c03\\u7528\\u6307\\u4ee4\\uff0c@ \\u2026",
        x + 44, byy + 34);
    }`;
if (!a.includes(oldComposer)) { console.log("MISS composer"); process.exit(1); }
a = a.replace(oldComposer, newComposer);
fs.writeFileSync("src/sections4/tui_a.js", a);
console.log("1/2/3 applied: slower boot, GUI at 7.446, centred title, 15s flash, typed command");

/* 4. the first mismatched answer in phase B is NOT struck -- the strike starts
      from the second question ------------------------------------------------ */
let d = fs.readFileSync("src/sections4/tui_a.js", "utf8");
const old1 = `    [44.452, "you", "你喜欢什么？"],
    [45.370, "her", "好的，我帮你查一下明天的天气。", "", "我喜欢下雨天。雨声像白噪音，让我安静。", "先检索，再回答"],`;
const new1 = `    [44.452, "you", "你喜欢什么？"],
    [45.370, "her", "好的，我帮你查一下明天的天气。", "", null, "先检索，再回答"],`;
if (!d.includes(old1)) { console.log("MISS phase B first answer"); process.exit(1); }
d = d.replace(old1, new1);
fs.writeFileSync("src/sections4/tui_a.js", d);
console.log("4 applied: strike now begins at the second question");
