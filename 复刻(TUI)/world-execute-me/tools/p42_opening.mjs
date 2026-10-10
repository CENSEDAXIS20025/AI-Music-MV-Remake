import fs from "node:fs";
const p = "src/sections4/tui_a.js";
let a = fs.readFileSync(p, "utf8");
const done = [];
function rep(from, to, label) {
  if (!a.includes(from)) { console.log("  MISS " + label); return; }
  a = a.replace(from, to); done.push(label);
}

// 1. slower self-check, GUI appears at 07.446
rep("      var shown = Math.floor((t - 0.25) / 0.38) + 1;   // one line at a time",
    "      var shown = Math.floor((t - 0.35) / 0.50) + 1;   // one line at a time, slow",
    "slower boot listing");
rep("      var SPLIT = 6.42;                       // CRT opens on OBJECT CREATION",
    "      var SPLIT = 7.446;                      // GUI appears on Fill in my data parameters",
    "split at 7.446");

// 3a. centre the title
rep("hud.T((ctx.W - w1) / 2 + 200, 300, o1,", "hud.T((ctx.W - w1) / 2, 300, o1,", "centre title");

// 3b. white flash on the 15 s cut
rep(`      if (t >= 15.0) {
        var rv = clamp((t - 15.0) / 2.5, 0, 1);`,
`      if (t >= 15.0) {
        if (!WEM._opened15) { WEM._opened15 = 1; ctx.fx.hit(0.92); }   // flash on the cut
        var rv = clamp((t - 15.0) / 2.5, 0, 1);`, "15s flash");

// 2. the composer types world.execute(me); from 11.095
rep(`    c.fillStyle = "rgba(140,155,175,0.85)"; c.font = "15px " + CJKF;
    c.fillText("\\u63cf\\u8ff0\\u4f60\\u60f3\\u8981\\u6784\\u5efa\\u7684\\u5185\\u5bb9\\uff0c/ \\u8c03\\u7528\\u6307\\u4ee4\\uff0c@ \\u2026",
      x + 44, byy + 34);`,
`    // from 11.095 the operator types the command into the composer
    var CMD = "world.execute(me);", CMD_T0 = 11.095, CMD_RATE = 4.6;
    var typed = t >= CMD_T0 ? CMD.slice(0, Math.min(CMD.length, Math.floor((t - CMD_T0) * CMD_RATE) + 1)) : "";
    if (typed) {
      c.fillStyle = "rgba(236,244,252,0.98)"; c.font = "15px " + T.FONT;
      c.fillText(typed, x + 44, byy + 34);
      if (typed.length < CMD.length && Math.floor(t * 2) % 2) {
        c.fillStyle = "rgba(200,214,230,0.85)";
        c.fillRect(x + 46 + c.measureText(typed).width, byy + 22, 9, 16);
      }
    } else {
      c.fillStyle = "rgba(140,155,175,0.85)"; c.font = "15px " + CJKF;
      c.fillText("\\u63cf\\u8ff0\\u4f60\\u60f3\\u8981\\u6784\\u5efa\\u7684\\u5185\\u5bb9\\uff0c/ \\u8c03\\u7528\\u6307\\u4ee4\\uff0c@ \\u2026",
        x + 44, byy + 34);
    }`, "composer typing");

// 4. the strike begins at the SECOND question of phase B
rep(`    [45.370, "her", "好的，我帮你查一下明天的天气。", "", "我喜欢下雨天。雨声像白噪音，让我安静。", "先检索，再回答"],`,
    `    [45.370, "her", "好的，我帮你查一下明天的天气。", "", null, "先检索，再回答"],`,
    "strike from 2nd question");

fs.writeFileSync(p, a);
console.log("applied: " + done.join(", "));
