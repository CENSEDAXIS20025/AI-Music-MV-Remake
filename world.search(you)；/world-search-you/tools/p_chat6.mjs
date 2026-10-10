import fs from "node:fs";
const p = "src/70_chat.js";
let s = fs.readFileSync(p, "utf8");
// segment 20 STARTS at the 4:21 transition, so hiding it was wrong: the earlier
// request covered 3:41 -> 4:21, i.e. segments 18 and 19 only.
s = s.replace('var CHAT_HIDE = { "03": 1, "06": 1, "12": 1, "13": 1, "15": 1, "18": 1, "19": 1, "20": 1, "22": 1 };',
              'var CHAT_HIDE = { "03": 1, "06": 1, "12": 1, "13": 1, "15": 1, "18": 1, "19": 1, "22": 1 };');
s = s.replace("  //   18/19/20      221.03 - 261.21", "  //   18/19         221.03 - 261.21   (3:41 -> 4:21)");
fs.writeFileSync(p, s);
console.log("segment 20 no longer hidden -> the chat returns at the 4:21 transition");
