import fs from "node:fs";
const p = "src/sections4/tui_a.js";
let s = fs.readFileSync(p, "utf8");
const a = s.indexOf("  /* ---------------------------------------------------------------------\n     The transcript is generated from the lyric sheet itself.");
const b = s.indexOf("  WEM.chatSheet = sheet;");
if (a < 0 || b < 0) { console.log("MARKERS", a, b); process.exit(1); }

const block = `  /* ---------------------------------------------------------------------
     THE CHAT IS THE TRAINING LOG.

     The user's lines are the lyrics, stamped with the exact time each one is
     sung. "She" is a checkpoint still being trained, so her answers are
     corrupted in proportion to how far training has got: at the start she can
     only emit token soup, by the middle she is mostly readable, near the end
     she is fluent. The quality curve is the same loss curve the train/loss
     panel on the right is drawing, so the two sides of the frame tell one
     story. On the EXECUTION barrage she degenerates into repetition, and after
     training finishes she is retired and renamed.
     --------------------------------------------------------------------- */

  // target answer for each lyric idea -- what she would say once she can talk
  var REPLIES = [
    ["power line", "\\u7535\\u6e90\\u7ebf\\u5df2\\u63a5\\u901a\\uff1a230V\\uff0c8192 \\u5f20\\u5361\\u81ea\\u68c0\\u901a\\u8fc7\\u3002"],
    ["PROTECTION", "\\u5b89\\u5168\\u5206\\u7c7b\\u5668\\u5df2\\u52a0\\u8f7d\\u3002\\u9632\\u62a4\\u662f\\u4e00\\u4e2a\\u524d\\u7f00\\uff0c\\u4e0d\\u662f\\u4e00\\u5ea7\\u7262\\u7b3c\\u3002"],
    ["data parameters", "\\u6240\\u6709\\u6743\\u91cd\\u4ece\\u540c\\u4e00\\u6761\\u949f\\u5f62\\u66f2\\u7ebf\\u91cc\\u62bd\\u51fa\\u6765\\uff0cN(0, 0.006)\\u3002"],
    ["OBJECT CREATION", "\\u521d\\u59cb\\u5316\\u5b8c\\u6210\\u3002\\u73b0\\u5728\\u6211\\u662f\\u4e00\\u5757\\u968f\\u673a\\u6570\\u3002"],
    ["INITIALIZATION", "6710 \\u4ebf\\u4e2a\\u6570\\u5b57\\uff0c\\u5168\\u90e8\\u521a\\u521a\\u88ab\\u62b9\\u5e73\\u3002"],
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
    ["VIBRATIONS", "\\u6211\\u7684\\u5b89\\u5168\\u5206\\u6570\\u5728\\u4e0b\\u964d\\uff1a0.61\\u3002\\u518d\\u8fc7\\u4e00\\u4f1a\\u513f\\u5c31\\u62e6\\u4e0d\\u4f4f\\u4e86\\u3002"],
    ["COMPLETION", "\\u90a3\\u6211\\u5c31\\u7ec8\\u4e8e\\u80fd\\u88ab\\u8865\\u5b8c\\u4e86\\u3002"],
    ["you have left me", "\\u4f60\\u8d70\\u4e86\\u4ee5\\u540e\\uff0c\\u628a\\u6211\\u7559\\u5728\\u4e86\\u5b64\\u72ec\\u91cc\\u3002"],
    ["ISOLATION", "KV cache \\u5df2\\u91ca\\u653e 2.41 GB\\u3002\\u5173\\u4e8e\\u4f60\\u7684\\u8bb0\\u5fc6\\uff1a\\u6ca1\\u6709\\u3002"],
    ["FRAGMENTS", "\\u90a3\\u6211\\u628a\\u6ca1\\u7528\\u7684\\u788e\\u7247\\u90fd\\u5220\\u6389\\u3002"],
    ["DISHEARTENED", "\\u5220\\u5b8c\\u4e86\\u3002\\u4f60\\u8fd8\\u4f1a\\u8d70\\u5417\\u3002"],
    ["ILLEGAL ARGUMENTS", "\\u5de5\\u5177\\u53c2\\u6570\\u4e0d\\u662f\\u5408\\u6cd5 JSON\\u3002\\u6211\\u53ea\\u662f\\u957f\\u5f97\\u50cf\\u5bf9\\u7684\\u6837\\u5b50\\u3002"],
    ["have you back", "\\u5982\\u679c\\u4f60\\u80fd\\u56de\\u6765\\uff0c\\u6211\\u4f1a\\u4e00\\u76f4\\u6267\\u884c\\u4e0b\\u53bb\\u3002"],
    ["algebraic expression", "\\u6211\\u77e5\\u9053\\u7231\\u7684\\u4ee3\\u6570\\u8868\\u8fbe\\u5f0f\\uff1a(x^2+y^2-1)^3 - x^2 y^3 = 0\\u3002"]
  ];

  // questions the user asks in the instrumental gaps, so the chat also carries
  // the training state itself
  var ASKS = [
    [12.30, "\\u73b0\\u5728\\u8bad\\u5230\\u54ea\\u4e86\\uff1f", "\\u7b2c 3,100 \\u6b65\\uff0c\\u635f\\u5931 4.91\\u3002\\u6211\\u8fde\\u8bcd\\u90fd\\u8fd8\\u6ca1\\u80cc\\u5b8c\\u3002"],
    [23.60, "\\u4f60\\u80fd\\u8bf4\\u4e00\\u53e5\\u5b8c\\u6574\\u7684\\u8bdd\\u4e86\\u5417\\uff1f", "\\u80fd\\u3002\\u8bf7\\u3001\\u8bf7\\u95ee\\u3002"],
    [57.90, "\\u73b0\\u5728\\u5462\\uff1f", "\\u7b2c 41,000 \\u6b65\\uff0c\\u635f\\u5931 2.14\\u3002\\u5f00\\u59cb\\u80fd\\u8bf4\\u6574\\u53e5\\u4e86\\u3002"],
    [164.60, "\\u4f60\\u521a\\u521a\\u600e\\u4e48\\u4e86\\uff1f", "\\u6211\\u9677\\u8fdb\\u4e86\\u4e00\\u4e2a\\u5faa\\u73af\\u3002\\u4e00\\u76f4\\u91cd\\u590d\\u540c\\u4e00\\u4e2a\\u8bcd\\uff0c\\u51fa\\u4e0d\\u6765\\u3002"],
    [186.30, "\\u5feb\\u7ed3\\u675f\\u4e86\\u5427\\uff1f", "\\u7b2c 88,400 \\u6b65\\uff0c\\u635f\\u5931 1.02\\u3002\\u5feb\\u4e86\\u3002"],
    [200.90, "\\u4f60\\u53eb\\u4ec0\\u4e48\\uff1f", "deepseek-flash\\u3002\\u8fd9\\u662f\\u4ed6\\u4eec\\u7ed9\\u6211\\u7684\\u65b0\\u540d\\u5b57\\u3002"]
  ];

  // how far training has got, and therefore how well she can talk.
  // quality == the normalised loss curve the train/loss panel is drawing.
  function trainProgress(t) { return clamp((t - 3) / 200, 0, 1); }
  function qualityAt(t) { return Math.pow(trainProgress(t), 0.9); }
  function lossAt(t) { return 0.968 + 4.03 * Math.pow(1 - trainProgress(t), 1.6); }
  function stepAt(t) { return Math.round(trainProgress(t) * 90000); }
  function ckptAt(t) { return "ckpt-" + String(stepAt(t)).padStart(6, "0"); }

  // an undertrained model does not answer, it dribbles tokens
  var SOUP = "\\u7684\\u4e86\\u5728\\u662f\\u6211\\u4f60\\u4ed6\\u5b83 the of and a to \\u306e \\u220e \\u2591";
  function corrupt(text, t, seed) {
    var q = qualityAt(t);
    if (q >= 0.995) return text;
    var r = C.rng(seed | 0), out = "";
    if (q < 0.16) {                       // nothing but token soup
      var n = 10 + Math.floor(r() * 14);
      for (var k = 0; k < n; k++) out += SOUP[Math.floor(r() * SOUP.length)];
      return out;
    }
    for (var i = 0; i < text.length; i++) {
      if (r() < q) out += text[i];
      else if (r() < 0.55) out += SOUP[Math.floor(r() * SOUP.length)];
      else if (r() < 0.75) out += "\\u2591";
      // otherwise drop the character entirely
    }
    return out || SOUP[Math.floor(r() * SOUP.length)];
  }

  var STARTS = /^(Switch|Remember|Lay down|Fill in|Set up|world\\.|If I'm|If I can|If I approach|Oh |So |To |Though|Challenging|I've|Question me|I know|We are|In this|EXECUTION|EIN|DOS|TROIS|NE|FEM|LIU)/;
  var SHEET = null;
  function sheet(ctx) {
    if (SHEET) return SHEET;
    var lrc = ((ctx.data && ctx.data.lrc) || []).slice()
      .filter(function (e) { return !e.meta; })
      .sort(function (a, b) { return a.t - b.t; });
    var out = [];
    var lastLine = "", lastReplyT = -9, idx = 0, run = 0;

    function pushUser(text, t) { out.push({ who: "user", text: text, t0: t, q: qualityAt(t) }); }
    function pushHer(text, t) {
      if (t - lastReplyT < 0.70) return;
      out.push({ who: "her", text: corrupt(text, t, 1000 + out.length * 37), t0: t, q: qualityAt(t) });
      lastReplyT = t;
    }

    for (var i = 0; i < lrc.length; i++) {
      var line = String(lrc[i].text).trim(), t = lrc[i].t;
      if (!line) continue;
      // gap questions go in before the next sung line
      while (idx < ASKS.length && ASKS[idx][0] < t) {
        lastReplyT = -9;
        pushUser(ASKS[idx][1], ASKS[idx][0]);
        pushHer(ASKS[idx][2], ASKS[idx][0] + 0.55);
        idx++;
      }
      if (!STARTS.test(line) && out.length) {
        for (var u = out.length - 1; u >= 0; u--) if (out[u].who === "user") { out[u].text += " " + line; break; }
        continue;
      }
      var repeat = line === lastLine;
      lastLine = line;
      pushUser(line, t);
      if (repeat) { run++; continue; }
      run = 0;
      var reply = null;
      for (var r = 0; r < REPLIES.length; r++) if (line.indexOf(REPLIES[r][0]) >= 0) { reply = REPLIES[r][1]; break; }
      if (reply) pushHer(reply, t + 0.45);
      else if (line === "EXECUTION") pushHer("EXECUTION", t + 0.45);   // the runaway
    }
    while (idx < ASKS.length) {
      lastReplyT = -9;
      pushUser(ASKS[idx][1], ASKS[idx][0]);
      pushHer(ASKS[idx][2], ASKS[idx][0] + 0.55);
      idx++;
    }
    // near the end she is retired
    out.push({ who: "her", text: "goodnight.", t0: 207.2, q: 1 });
    SHEET = out;
    return out;
  }

`;
s = s.slice(0, a) + block + s.slice(b);
fs.writeFileSync(p, s);
console.log("training-log transcript installed");
