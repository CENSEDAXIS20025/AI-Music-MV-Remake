import fs from "node:fs";
const p = "src/sections4/tui_a.js";
let s = fs.readFileSync(p, "utf8");
const before = s.split("+ CJK;").length - 1;
// CJK is a font list local to 61_gadgets.js; tui_a.js needs its own
s = s.split("+ CJK;").join("+ CJKF;");
s = s.replace("  function dshHome(hud, x, y, w, h, t) {\n    var c = hud.fc;",
              "  var CJKF = \"'Microsoft YaHei','PingFang SC','Hiragino Sans GB','Noto Sans CJK SC',sans-serif\";\n  function dshHome(hud, x, y, w, h, t) {\n    var c = hud.fc;");
fs.writeFileSync(p, s);
console.log("replaced " + before + " CJK refs with a local font list");
