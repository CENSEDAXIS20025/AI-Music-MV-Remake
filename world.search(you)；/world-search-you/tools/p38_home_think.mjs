import fs from "node:fs";
// expose dshHome (it lives in tui_a.js, segment 15 is in tui_b.js)
let a = fs.readFileSync("src/sections4/tui_a.js", "utf8");
if (!a.includes("WEM.dshHome")) {
  a = a.replace("  WEM.chatSheet = sheet;", "  WEM.dshHome = dshHome;\n  WEM.chatSheet = sheet;");
  fs.writeFileSync("src/sections4/tui_a.js", a);
  console.log("exposed WEM.dshHome");
}
// the think line: one scrolling row above the composer while she is thinking
let g = fs.readFileSync("src/61_gadgets.js", "utf8");
const old = `      c.restore();
    }
  };`;
const neu = `      // a single scrolling row: she thinks first, then answers
      var c2 = hud.fc;
      c2.save();
      for (var ti = 0; ti < msgs.length; ti++) {
        var tm = msgs[ti];
        if (tm.who !== "her" || !tm.think) continue;
        var lead = 0.95;                                  // thinking starts 0.95 s early
        if (t < tm.t0 - lead || t > tm.t0) continue;
        var ph = (t - (tm.t0 - lead)) / lead;
        var txt = tm.think;
        var cut = Math.ceil(txt.length * clamp(ph * 1.35, 0, 1));
        c2.fillStyle = "rgba(150,168,190,0.9)";
        c2.font = "12px " + CJK;
        c2.fillText("\\u273b \\u6df1\\u5ea6\\u601d\\u8003 \\u00b7 " + txt.slice(0, cut) + (ph < 0.7 && Math.floor(t * 3) % 2 ? "\\u258c" : ""),
          x + 22, y + h - 104);
      }
      c2.restore();
      c.restore();
    }
  };`;
if (!g.includes(old)) { console.log("MISS think anchor"); process.exit(1); }
fs.writeFileSync("src/61_gadgets.js", g.replace(old, neu));
console.log("think row added");
