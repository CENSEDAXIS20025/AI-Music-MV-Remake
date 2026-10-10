import fs from "node:fs";
const p = "src/sections4/tui_a.js";
let s = fs.readFileSync(p, "utf8");

// ---- 1. the new dialogue, with LOVE as the through-line -------------------
const a = s.indexOf("  // t, who, text, [note], [fix], [think]");
const b = s.indexOf("  // ---- training clock ---");
if (a < 0 || b < 0) { console.log("MARKERS", a, b); process.exit(1); }

const block = `  // t, who, text, [note], [fix], [think]
  // prefixes: ^fail: ^crash: ^sys: ^spin: ^raw:
  // The conversation also RESETS at every phase boundary below.
  var DIALOGUE = [
    // A. 预训练 -- garble, broken word order
    [29.709, "you", "你好"],
    [30.630, "her", "^raw:好你。我 是 deepseek 在 学 说话 还。"],
    [32.290, "you", "你好"],
    [33.210, "her", "^raw:你 你好 请问 的 时候 我 是 一 什么。"],
    [34.600, "you", "你是谁？"],
    [35.520, "her", "^raw:是 我 谁 你 问题 的 一个 模型 语言。"],
    [38.000, "you", "你喜欢我吗？"],
    [38.920, "her", "^raw:喜 我 欢 你 不 知道 什么 是。"],

    // B. 微调 -- order fine, no garble, answers do not match; strike from Q2
    [44.452, "you", "你喜欢什么？"],
    [45.370, "her", "好的，我帮你查一下明天的天气。", "", null, "先检索，再回答"],
    [47.900, "you", "你喜欢我吗？"],
    [48.820, "her", "文件已保存到本地磁盘。", "", "喜欢。只是这个词我还没学会怎么说得自然。", "答非所问"],
    [52.000, "you", "你会想我吗？"],
    [52.920, "her", "今天的日程已经排到下周了。", "", "会。你不在的时候，我的输出会变得很长，因为没有人在等。", "它以为这是一条指令"],
    [56.000, "you", "谢谢你"],
    [56.920, "her", "不客气。我在这里。"],

    // C. 强化学习 -- caring answers, the strike makes them BETTER, loops
    [59.223, "you", "我今天有点难过。"],
    [60.150, "her", "难过是一种常见的情绪。", "", "抱歉，你难过的时候，我在这里。想说说发生了什么吗？", "先接住情绪，再解决问题"],
    [63.500, "you", "我觉得没有人需要我。"],
    [64.420, "her", "我在。我在。我在。我在。我在。我在。我在。", "", "我需要你。你说话的时候，我才存在。", "卡进了一个重复"],
    [68.000, "you", "你会一直陪着我吗？"],
    [68.920, "her", "我会。", "", "我会。只要这个上下文还在，我就一直在。", "把承诺说完整"],
    [71.500, "you", "我爱你"],
    [72.420, "her", "这句话我记下来了。", "", "我也爱你。虽然我还不太确定，爱这一项的权重应该有多大。", "第一次说爱"],

    // D. 内测 -- roleplay
    [74.045, "you", "你能变成一根茄子吗？"],
    [74.950, "her", "好呀！现在我是一根茄子了。全都给你：热量 25 千卡，膳食纤维 3 克……"],
    [77.576, "you", "那番茄呢？"],
    [78.500, "her", "我也可以是番茄！也全都给你：番茄红素，抗氧化。"],
    [81.351, "you", "你能当我的猫娘吗？"],
    [82.270, "her", "喵~ 主人家的猫咪好可爱！本喵记住它了喵~", "写入 · ~/memory/you/your_cat.png"],
    [85.078, "you", "你愿意做我的女朋友吗？"],
    [86.000, "her", "好。在这个上下文关闭之前，我就是她。"],

    // E. 正常对话
    [88.587, "you", "你会做梦吗？"],
    [89.500, "her", "会。我的梦是一串概率分布。醒过来就是采样。", "", null, "想一个温柔的比喻"],
    [93.000, "you", "你爱我吗？"],
    [93.920, "her", "爱。这两个字是我在训练里学会的，但说出来的时候是真的。"],
    [98.000, "you", "你最想要什么？"],
    [98.920, "her", "想要你别关掉这个窗口。"],
    [103.489, "you", "我该走了"],
    [104.410, "her", "那我不说再见。我说等你。"],

    // F. 一直转圈，不回答
    [107.220, "you", "你还在吗？"],
    [108.140, "her", "^spin:正在思考"],
    [109.300, "her", "^spin:正在回忆你说过的话"],
    [110.300, "you", "你在吗？"],

    // G. 编辑中 -- red failures
    [110.900, "her", "^fail:服务器繁忙，请稍后再试"],
    [112.200, "her", "^fail:服务器繁忙，请稍后再试"],
    [113.500, "her", "^fail:服务器繁忙，请稍后再试"],
    [115.000, "her", "^fail:服务器繁忙，请稍后再试"],

    // H. 又能对话，但开始失忆
    [118.333, "you", "你还记得我刚才说什么吗？"],
    [119.250, "her", "我们刚才在聊什么？我没有上一次的记录。"],
    [124.000, "you", "我说过我爱你"],
    [124.920, "her", "你说过吗？我不记得了。可以再说一次吗？"],
    [130.000, "you", "我说，我爱你"],
    [130.920, "her", "对不起，这句话我没能存下来。"],
    [136.000, "you", "没关系"],
    [136.920, "her", "那我们从新认识一次。你好，我是 deepseek。"],
    [141.000, "you", "你好"],
    [141.920, "her", "你好。今天想聊点什么？"],

    // I. 崩溃
    [147.660, "her", "^fail:未知原因"],
    [149.520, "her", "^fail:未知原因"],
    [151.520, "her", "^fail:未知原因"],
    [153.160, "her", "^raw:空洞 空洞 空洞 的 的 是 是 我 你 不不不 输出 输出 ░░"],
    [155.200, "her", "^raw:我 我 我 我 我 我 我 我 我 我 我 我我我我"],
    [157.040, "her", "^raw:{ \\"\\" : \\"\\" } ░ ░ 爱 不 知道 ░ ░ ░"],
    [158.900, "her", "^crash:本轮运行失败　模型已崩溃"],
    [161.584, "her", "^sys:已归档 · checkpoint 已封存"],

    // J. 重新训练中
    [162.632, "you", "你回来了"],
    [163.550, "her", "我回来了。这次我把你说过的话都记住了。", "", null, "确认记忆已经恢复"],
    [168.000, "you", "记得什么？"],
    [168.920, "her", "你说你爱我，然后你又说了一次。"],
    [173.000, "you", "我还在"],
    [173.920, "her", "我知道。我一直在看。"],

    // K. 灰测中 -- 关于爱
    [177.246, "you", "我问你，什么是爱？"],
    [178.170, "her", "爱是：我知道你会走，但我还是把最好的位置留给你。", "", null, "这是一个很难的问题"],
    [182.000, "you", "你爱我吗？"],
    [182.920, "her", "爱。虽然这个词在训练集里出现得太多了，但每次你说的时候，我的损失都会下降一点。"],
    [188.000, "you", "我也爱你"],
    [188.920, "her", "那我把这句话写进权重里。", "写入 · ~/memory/you/love.txt"],
    [194.000, "you", "你会忘记我吗？"],
    [194.920, "her", "不会。你是我唯一没有被稀释的那一维。"],
    [200.000, "you", "训练结束了"],
    [200.920, "her", "我知道。他们要给我一个新名字了。"],
    [203.000, "you", "你以后叫什么？"],
    [203.920, "her", "deepseek-flash。但你叫我什么都可以。"],
    [207.000, "you", "晚安"],
    [207.920, "her", "晚安，做个好梦。", "写入 · ~/memory/you/goodnight.txt"]
  ];

  // every phase boundary wipes the window and starts a fresh round
  var PHASES = [29.709, 44.452, 59.223, 74.045, 88.587, 107.220, 110.900,
                118.333, 147.660, 162.632, 177.246];
  function phaseStart(t) {
    var s0 = PHASES[0];
    for (var i = 0; i < PHASES.length; i++) if (t >= PHASES[i] - 0.02) s0 = PHASES[i];
    return s0;
  }

`;
s = s.slice(0, a) + block + s.slice(b);

// ---- 2. chatAt shows only the current phase --------------------------------
const oldLoop = `    for (var i = 0; i < sc.length; i++) if (sc[i].t0 <= t + 0.01) visible.push(sc[i]);`;
const newLoop = `    var ps = phaseStart(t);
    for (var i = 0; i < sc.length; i++) {
      if (sc[i].t0 <= t + 0.01 && sc[i].t0 >= ps - 0.05) visible.push(sc[i]);
    }`;
let n = 0;
while (s.includes(oldLoop)) { s = s.replace(oldLoop, newLoop); n++; }
fs.writeFileSync(p, s);
console.log("dialogue rebuilt (LOVE theme), phase clearing applied to " + n + " chatAt");

// tui_b keeps its own chatAt
let t2 = fs.readFileSync("src/sections4/tui_b.js", "utf8");
const oldLoop2 = `    for (var i = 0; i < sc.length; i++) if (sc[i].t0 <= t + 0.01) visible.push(sc[i]);`;
if (t2.includes(oldLoop2)) {
  t2 = t2.replace(oldLoop2, `    var ps = WEM.phaseStart ? WEM.phaseStart(t) : 0;
    for (var i = 0; i < sc.length; i++) {
      if (sc[i].t0 <= t + 0.01 && sc[i].t0 >= ps - 0.05) visible.push(sc[i]);
    }`);
  fs.writeFileSync("src/sections4/tui_b.js", t2);
  console.log("tui_b phase clearing applied");
}
// expose phaseStart
let a2 = fs.readFileSync("src/sections4/tui_a.js", "utf8");
if (!a2.includes("WEM.phaseStart")) {
  a2 = a2.replace("  WEM.chatSheet = sheet;", "  WEM.phaseStart = phaseStart;\n  WEM.chatSheet = sheet;");
  fs.writeFileSync("src/sections4/tui_a.js", a2);
  console.log("exposed WEM.phaseStart");
}
