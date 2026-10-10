import fs from "node:fs";
const p = "src/70_chat.js";
let s = fs.readFileSync(p, "utf8");
// segment 16 (lostself) is 203.15 - 207.23, i.e. 3:23 -> 3:27. The earlier
// "3:13 -> 3:27" request covered segments 15 AND 16; only 15 had been added.
s = s.replace('var CHAT_HIDE = { "03": 1, "06": 1, "12": 1, "13": 1, "15": 1, "18": 1, "19": 1, "22": 1 };',
              'var CHAT_HIDE = { "03": 1, "06": 1, "12": 1, "13": 1, "15": 1, "16": 1, "18": 1, "19": 1, "22": 1 };');
s = s.replace("  //   15 rapid      193.30 - 207.23",
              "  //   15 rapid      193.30 - 203.15\n  //   16 lostself   203.15 - 207.23   (3:23 -> 3:27)");
fs.writeFileSync(p, s);
console.log("segment 16 (3:23-3:27) added to the hide list");
