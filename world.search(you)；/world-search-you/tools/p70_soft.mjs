import fs from "node:fs";
const p = "src/sections/b_06_10.js";
let s = fs.readFileSync(p, "utf8");
const n = [];
if (s.includes("if (phase !== this._lastPhase) { this._lastPhase = phase; ctx.fx.hit(0.8); }")) {
  s = s.replace("if (phase !== this._lastPhase) { this._lastPhase = phase; ctx.fx.hit(0.8); }",
                "if (phase !== this._lastPhase) { this._lastPhase = phase; ctx.fx.hit(0.26); }   // softer cut");
  n.push("phase change 0.8 -> 0.26");
}
if (s.includes("if (Math.abs(l - 10.4) < 0.03) ctx.fx.whiteBar = 1.0;")) {
  s = s.replace("if (Math.abs(l - 10.4) < 0.03) ctx.fx.whiteBar = 1.0;",
                "if (Math.abs(l - 10.4) < 0.03) ctx.fx.whiteBar = 0.5;");
  s = s.replace("if (l > 10.35 && l < 10.8) ctx.fx.whiteBar = Math.max(ctx.fx.whiteBar, 0.9);",
                "if (l > 10.35 && l < 10.8) ctx.fx.whiteBar = Math.max(ctx.fx.whiteBar, 0.45);");
  n.push("white bar 1.0 -> 0.5");
}
fs.writeFileSync(p, s);
console.log(n.length ? "applied: " + n.join(", ") : "nothing matched");
