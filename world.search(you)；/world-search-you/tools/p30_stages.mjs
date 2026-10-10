import fs from "node:fs";
const p = "src/sections4/tui_a.js";
let s = fs.readFileSync(p, "utf8");

// replace the STAGES table and stageAt with the full schedule the brief lists
const a = s.indexOf("  // the staged run: 预训练 -> 微调");
const b = s.indexOf("  var SOUP =");
if (a < 0 || b < 0) { console.log("MARKERS", a, b); process.exit(1); }

const block = `  // the staged run, exactly on the timestamps the brief gives. Each change
  // fires a white flash so the transitions read as cuts.
  var YEL = "rgba(255,201,74,0.96)", BLU = "rgba(96,170,255,0.96)",
      PUR = "rgba(186,132,255,0.96)", GRN = "rgba(94,224,160,0.96)",
      RED = "rgba(255,96,86,0.98)", GRY = "rgba(152,160,172,0.95)";
  var STAGES = [
    [0,      "\\u5f85\\u547d\\u4e2d", GRY],
    [29.709, "\\u9884\\u8bad\\u7ec3\\u4e2d", YEL],
    [44.452, "\\u5fae\\u8c03\\u4e2d", BLU],
    [59.223, "\\u5f3a\\u5316\\u5b66\\u4e60\\u4e2d", PUR],
    [74.045, "\\u5185\\u6d4b\\u4e2d", YEL],
    [88.587, "\\u9884\\u53d1\\u5e03", GRN],
    [103.489, "\\u5728\\u7ebf", GRN],
    [110.900, "\\u7f16\\u8f91\\u4e2d", BLU],
    [118.333, "\\u7b49\\u5f85\\u4e2d", YEL],
    [131.224, "\\u6267\\u884c\\u4e2d", YEL],
    [147.660, "\\u6267\\u884c\\u5931\\u8d25", RED], [148.600, "\\u6267\\u884c\\u4e2d", YEL],
    [149.520, "\\u6267\\u884c\\u5931\\u8d25", RED], [150.540, "\\u6267\\u884c\\u4e2d", YEL],
    [151.520, "\\u6267\\u884c\\u5931\\u8d25", RED], [152.280, "\\u6267\\u884c\\u4e2d", YEL],
    [153.160, "\\u6267\\u884c\\u5931\\u8d25", RED], [153.980, "\\u6267\\u884c\\u4e2d", YEL],
    [155.200, "\\u6267\\u884c\\u5931\\u8d25", RED], [156.080, "\\u6267\\u884c\\u4e2d", YEL],
    [157.040, "\\u6267\\u884c\\u5931\\u8d25", RED],
    [158.000, "\\u6a21\\u578b\\u5df2\\u5d29\\u6e83", GRY],
    [161.584, "\\u5df2\\u5f52\\u6863", GRY],
    [162.632, "\\u91cd\\u65b0\\u8bad\\u7ec3\\u4e2d", YEL],
    [177.246, "\\u7070\\u6d4b\\u4e2d", YEL],
    [200.400, "\\u5728\\u7ebf", GRN]
  ];
  var _lastStage = -1;
  function stageIndex(t) {
    var k = 0;
    for (var i = 0; i < STAGES.length; i++) if (t >= STAGES[i][0]) k = i;
    return k;
  }
  function stageAt(t) { return STAGES[stageIndex(t)][1]; }
  function stageColor(t) { return STAGES[stageIndex(t)][2]; }

`;
s = s.slice(0, a) + block + s.slice(b);

// chatState reports the colour and fires the flash on every change
const ca = s.indexOf("  WEM.chatState = function (ctx) {");
const cb = s.indexOf("  WEM.modelName = modelName;");
if (ca < 0 || cb < ca) { console.log("chatState markers", ca, cb); process.exit(1); }
s = s.slice(0, ca) + `  WEM.chatState = function (ctx) {
    var t = ctx.t;
    var prog = trainProgress(t), loss = lossAt(t), step = stepAt(t);
    var si = stageIndex(t);
    if (si !== _lastStage) {
      if (_lastStage >= 0 && t > STAGES[si][0] - 0.6) ctx.fx.hit(0.55);   // flash on the cut
      _lastStage = si;
    }
    var live = t >= STAGES[1][0];                 // no status until the chat starts
    return {
      sub: live ? stageAt(t) : "",
      subColor: stageColor(t),
      footer: live ? (Math.max(1, Math.round(prog * 126)) + " \\u8f6e " + Math.max(1, Math.round(prog * 902)) + " \\u6b65 \\u00b7 " +
              (step * 13).toLocaleString() + " tok \\u00b7 \\u7f13\\u5b58\\u547d\\u4e2d " + Math.round(prog * 96 + 3) + "%") : "",
      lossText: live ? "loss " + loss.toFixed(3) : "",
      prog: prog
    };
  };
` + s.slice(cb);

fs.writeFileSync(p, s);
console.log("T6: stage timeline installed");
