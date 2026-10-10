import fs from "node:fs";
const p = "src/sections/a_01_05.js";
let s = fs.readFileSync(p, "utf8");

const old = `        c.strokeStyle = "rgba(126,231,135,0.5)";
        c.beginPath(); c.moveTo(px, py); c.lineTo(cx + 520, py); c.stroke();
        // sine curve unrolling to the right
        c.strokeStyle = "rgba(126,231,135,0.95)";
        c.lineWidth = 2.6;
        c.beginPath();
        var N = 220;
        for (var i = 0; i <= N; i++) {
          var a = ang * i / N;
          var xx = cx + 60 + (520 - 60) * (a / (TAU * 2.0)) + 60;
          var yy = cy - Math.sin(a) * R;
          var p = cx + 90 + (a / (TAU * 2)) * 900;
          if (i === 0) c.moveTo(p, yy); else c.lineTo(p, yy);
        }
        c.stroke();`;

const neu = `        // the horizontal guide must end exactly where the sine curve has been
        // drawn to, i.e. at the curve's current tip -- a fixed x left a gap
        var xOf = function (a) { return cx + 90 + (a / (TAU * 2)) * 900; };
        var tipX = xOf(ang);
        c.strokeStyle = "rgba(126,231,135,0.5)";
        c.beginPath(); c.moveTo(px, py); c.lineTo(tipX, py); c.stroke();
        // sine curve unrolling to the right
        c.strokeStyle = "rgba(126,231,135,0.95)";
        c.lineWidth = 2.6;
        c.beginPath();
        var N = 220;
        for (var i = 0; i <= N; i++) {
          var a = ang * i / N;
          var yy = cy - Math.sin(a) * R;
          var p = xOf(a);
          if (i === 0) c.moveTo(p, yy); else c.lineTo(p, yy);
        }
        c.stroke();
        // a dot where the guide meets the curve, so the join reads as intended
        c.fillStyle = "rgba(126,231,135,0.95)";
        c.beginPath(); c.arc(tipX, py, 3.2, 0, Math.PI * 2); c.fill();`;

if (!s.includes(old)) { console.log("MISS circle block"); process.exit(1); }
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log("guide line now meets the sine curve tip");
