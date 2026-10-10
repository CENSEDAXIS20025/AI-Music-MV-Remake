import fs from "node:fs";
const p = "src/70_chat.js";
let s = fs.readFileSync(p, "utf8");
const done = [];

// narrower still, kept centred
const ch = s.match(/var CH = \{[^}]*\};[^\n]*\n/)[0];
s = s.replace(ch, "var CH = { x: 670, y: 250, w: 580, h: 590 };   // a little narrower, centred\n");
done.push("width 660 -> 580");

// hide during segment 13 (love), which is the 2:44 -> 3:00 window
s = s.replace('var CHAT_HIDE = { "03": 1, "06": 1, "12": 1, "15": 1, "18": 1, "19": 1, "20": 1, "22": 1 };',
              'var CHAT_HIDE = { "03": 1, "06": 1, "12": 1, "13": 1, "15": 1, "18": 1, "19": 1, "20": 1, "22": 1 };');
s = s.replace("  //   12 typeahead  151.67 - 179.60",
              "  //   12 typeahead  151.67 - 165.53\n  //   13 love       165.53 - 179.60   (the 2:44 -> 3:00 window)");
done.push("segment 13 added to the hide list");

fs.writeFileSync(p, s);
console.log("applied: " + done.join(", "));
