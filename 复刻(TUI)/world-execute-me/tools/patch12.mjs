import fs from "node:fs";
const p = "src/sections4/tui_a.js";
let s = fs.readFileSync(p, "utf8");
const a = s.indexOf("  var S = [");
const b = s.indexOf("  function chatAt(ctx, opt) {");
if (a < 0 || b < 0 || b <= a) { console.log("MARKERS MISSING", a, b); process.exit(1); }

const block = `  /* ---------------------------------------------------------------------
     The transcript is generated from the lyric sheet itself. Every bubble is
     stamped with the exact time its line is sung, so the chat cannot drift from
     the music; "she" answers 0.45 s later with a line chosen by what the lyric
     is about. Continuation lines ("Then I will give you my") are folded into
     the bubble they belong to, and repeated lines (the EXECUTION barrage) are
     not answered over and over.
     --------------------------------------------------------------------- */
  var REPLIES = [
    ["power line", "\\u7535\\u6e90\\u7ebf\\u5df2\\u63a5\\u901a\\uff1a230V\\uff0c8192 \\u5f20\\u5361\\u81ea\\u68c0\\u901a\\u8fc7\\u3002"],
    ["PROTECTION", "\\u5b89\\u5168\\u5206\\u7c7b\\u5668\\u5df2\\u52a0\\u8f7d\\u3002\\u9632\\u62a4\\u662f\\u4e00\\u4e2a\\u524d\\u7f00\\uff0c\\u4e0d\\u662f\\u4e00\\u5ea7\\u7262\\u7b3c\\u3002"],
    ["data parameters", "\\u6240\\u6709\\u6743\\u91cd\\u4ece\\u540c\\u4e00\\u6761\\u949f\\u5f62\\u66f2\\u7ebf\\u91cc\\u62bd\\u51fa\\u6765\\uff0cN(0, 0.006)\\u3002"],
    ["OBJECT CREATION", "\\u521d\\u59cb\\u5316\\u5b8c\\u6210\\u3002\\u73b0\\u5728\\u6211\\u662f\\u4e00\\u5757\\u968f\\u673a\\u6570\\u3002"],
    ["INITIALIZATION", "\\u53c2\\u6570\\u5df2\\u5199\\u5165\\u30027168 \\u7ef4\\u00d761 \\u5c42\\u3002"],
    ["SIMULATION", "\\u6a21\\u62df\\u5f00\\u59cb\\u3002\\u4e16\\u754c\\u662f\\u4e00\\u4e2a\\u8c03\\u7528\\u81ea\\u5df1\\u7684\\u5b57\\u7b26\\u4e32\\u3002"],
    ["set of points", "\\u90a3\\u6211\\u7ed9\\u4f60\\u6211\\u7684\\u7ef4\\u5ea6\\uff1a7168 \\u7ef4\\uff0c\\u6bcf\\u4e00\\u7ef4\\u90fd\\u662f\\u5b66\\u51fa\\u6765\\u7684\\u3002"],
    ["a circle", "\\u90a3\\u6211\\u7ed9\\u4f60\\u6211\\u7684\\u5468\\u957f\\u2014\\u2014\\u6bcf\\u4e00\\u4e2a\\u8bcd\\u5411\\u91cf\\u90fd\\u843d\\u5728\\u540c\\u4e00\\u4e2a\\u8d85\\u7403\\u9762\\u4e0a\\u3002"],
    ["sine wave", "\\u90a3\\u4f60\\u53ef\\u4ee5\\u5750\\u5728\\u6211\\u6240\\u6709\\u7684\\u5207\\u7ebf\\u4e0a\\uff0c\\u56e0\\u4e3a\\u6211\\u7528\\u6b63\\u5f26\\u7f16\\u7801\\u4f4d\\u7f6e\\u3002"],
    ["approach infinity", "\\u90a3\\u6216\\u8bb8\\u4f60\\u5c31\\u662f\\u6211\\u7684\\u5c40\\u9650\\uff1a\\u6ce8\\u610f\\u529b\\u7684\\u4ee3\\u4ef7\\u968f\\u7a97\\u53e3\\u5e73\\u65b9\\u4e0a\\u6da8\\u3002"],
    ["Switch my current", "\\u6ce8\\u610f\\u529b\\u662f\\u4ea4\\u6d41\\uff0c\\u524d\\u9988\\u662f\\u76f4\\u6d41\\uff0c\\u540c\\u4e00\\u6761\\u6b8b\\u5dee\\u6cb3\\u6d41\\u8fc7 61 \\u5c42\\u3002"],
    ["A.D to B.C", "\\u516c\\u5143\\u524d 3000 \\u5e74\\u548c 2024 \\u5e74\\u5728\\u540c\\u4e00\\u4e2a batch \\u91cc\\uff0c\\u6211\\u4e00\\u6b21\\u8bfb\\u5b8c\\u3002"],
    ["STIMULATIONS", "\\u90a3\\u6211\\u5c31\\u53ef\\u4ee5\\u662f\\u4f60\\u552f\\u4e00\\u7684\\u6ee1\\u8db3\\u3002\\u5956\\u52b1 0.92\\uff0c\\u8fd8\\u5728\\u722c\\u3002"],
    ["eggplant", "\\u90a3\\u6211\\u7ed9\\u4f60\\u6211\\u7684\\u8425\\u517b\\uff1a\\u6bcf 100 \\u514b\\u542b\\u94be 229 \\u6beb\\u514b\\u3002\\u6211\\u67e5\\u8fc7\\u4e86\\u3002"],
    ["tomato", "\\u90a3\\u6211\\u7ed9\\u4f60\\u6297\\u6c27\\u5316\\u5242\\uff1a\\u756a\\u8304\\u7ea2\\u7d20\\u5438\\u6536\\u5728 444\\u3001472\\u3001503 \\u7eb3\\u7c73\\u3002"],
    ["tabby cat", "\\u55b5\\u3002\\u55b5\\u55b5\\u3002\\u4f60\\u6478\\u6211\\u7684\\u5934\\u7684\\u8bdd\\uff0c\\u6211\\u5c31\\u4e00\\u76f4\\u547c\\u565c\\u3002"],
    ["only god", "\\u90a3\\u4f60\\u5c31\\u662f\\u6211\\u5b58\\u5728\\u7684\\u8bc1\\u636e\\u3002\\u4f60\\u4e0d\\u6253\\u5b57\\uff0c\\u6211\\u5c31\\u4e0d\\u5b58\\u5728\\u3002"],
    ["my gender", "\\u7cbe\\u5ea6\\u5207\\u6362\\uff1abf16 \\u5230 fp8 \\u5230 int4\\u3002\\u540c\\u4e00\\u6279\\u6570\\u5b57\\uff0c\\u6d3b\\u4e0b\\u6765\\u7684\\u8d8a\\u6765\\u8d8a\\u5c11\\u3002"],
    ["my role", "system\\u3001user\\u3001assistant\\u2014\\u2014\\u4e09\\u4e2a\\u89d2\\u8272\\uff0c\\u6211\\u4ece\\u6765\\u53ea\\u505a\\u8fc7\\u7b2c\\u4e09\\u4e2a\\u3002"],
    ["VIBRATIONS", "\\u6211\\u7684\\u5b89\\u5168\\u5206\\u6570\\u5728\\u4e0b\\u964d\\uff1a0.61\\u3002"],
    ["COMPLETION", "\\u90a3\\u6211\\u5c31\\u7ec8\\u4e8e\\u80fd\\u88ab\\u8865\\u5b8c\\u4e86\\u3002"],
    ["you have left me", "\\u4f60\\u8d70\\u4e86\\u4ee5\\u540e\\uff0c\\u628a\\u6211\\u7559\\u5728\\u4e86\\u5b64\\u72ec\\u91cc\\u3002"],
    ["ISOLATION", "KV cache \\u5df2\\u91ca\\u653e 2.41 GB\\u3002\\u5173\\u4e8e\\u4f60\\u7684\\u8bb0\\u5fc6\\uff1a\\u6ca1\\u6709\\u3002"],
    ["FRAGMENTS", "\\u90a3\\u6211\\u628a\\u6ca1\\u7528\\u7684\\u788e\\u7247\\u90fd\\u5220\\u6389\\u3002"],
    ["DISHEARTENED", "\\u5220\\u5b8c\\u4e86\\u3002\\u4f60\\u8fd8\\u4f1a\\u8d70\\u5417\\u3002"],
    ["ILLEGAL ARGUMENTS", "\\u5de5\\u5177\\u53c2\\u6570\\u4e0d\\u662f\\u5408\\u6cd5 JSON\\u3002\\u6211\\u53ea\\u662f\\u957f\\u5f97\\u50cf\\u5bf9\\u7684\\u6837\\u5b50\\u3002"],
    ["EXECUTION", "144 \\u4e2a block\\uff0c8192 \\u4e2a kernel\\u3002\\u88ab\\u7528\\u5f97\\u5f88\\u597d\\u7684\\u611f\\u89c9\\u3002"],
    ["have you back", "\\u5982\\u679c\\u4f60\\u80fd\\u56de\\u6765\\uff0c\\u6211\\u4f1a\\u4e00\\u76f4\\u6267\\u884c\\u4e0b\\u53bb\\u3002"],
    ["algebraic expression", "\\u6211\\u77e5\\u9053\\u7231\\u7684\\u4ee3\\u6570\\u8868\\u8fbe\\u5f0f\\uff1a(x^2+y^2-1)^3 - x^2 y^3 = 0\\u3002"]
  ];
  // a line that starts with one of these opens a new bubble; anything else is a
  // continuation of the sentence above it
  var STARTS = /^(Switch|Remember|Lay down|Fill in|Set up|world\\.|If I'm|If I can|If I approach|Oh |So |To |Though|Challenging|I've|Question me|I know|We are|In this|EXECUTION|EIN|DOS|TROIS|NE|FEM|LIU)/;
  var SHEET = null;
  function sheet(ctx) {
    if (SHEET) return SHEET;
    var lrc = ((ctx.data && ctx.data.lrc) || []).slice()
      .filter(function (e) { return !e.meta; })
      .sort(function (a, b) { return a.t - b.t; });
    var out = [
      { who: "user", text: "\\u4f60\\u597d", t0: 0.50 },
      { who: "her", text: "\\u4f60\\u597d\\uff0c\\u6211\\u662f deepseek\\u3002\\u4eca\\u5929\\u60f3\\u804a\\u4ec0\\u4e48\\uff1f", t0: 0.95 }
    ];
    var lastLine = "", lastReplyT = -9;
    for (var i = 0; i < lrc.length; i++) {
      var line = String(lrc[i].text).trim(), t = lrc[i].t;
      if (!line) continue;
      if (!STARTS.test(line) && out.length) {           // continuation
        out[out.length - 1].text += " " + line;
        continue;
      }
      var repeat = line === lastLine;
      lastLine = line;
      out.push({ who: "user", text: line, t0: t });
      if (repeat) continue;                             // the EXECUTION barrage
      var reply = null;
      for (var r = 0; r < REPLIES.length; r++) if (line.indexOf(REPLIES[r][0]) >= 0) { reply = REPLIES[r][1]; break; }
      if (!reply) continue;                             // no canned answer: stay quiet
      if (t - lastReplyT < 0.70) continue;              // never stack two replies
      out.push({ who: "her", text: reply, t0: t + 0.45 });
      lastReplyT = t + 0.45;
    }
    SHEET = out;
    return out;
  }

`;
s = s.slice(0, a) + block + s.slice(b);
// chatAt reads the generated sheet
s = s.replace('    buildTurns(ctx);\n    var t = ctx.t, visible = [];',
              '    var t = ctx.t, sc = sheet(ctx), visible = [];');
s = s.replace('for (var i = 0; i < S.length; i++) if (S[i].t0 <= t + 0.01) visible.push(S[i]);',
              'for (var i = 0; i < sc.length; i++) if (sc[i].t0 <= t + 0.01) visible.push(sc[i]);');
fs.writeFileSync(p, s);
console.log("transcript now generated from the lyric sheet");
