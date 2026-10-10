/* ============================================================================
   world.execute(me);  [TUI] segments 01-08
   Left: the chat. Right: the terminal view of the model she runs on.
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, T = WEM.Tui, M = WEM.Model, V = WEM.Viz, L = WEM.Lab;
  var COL = WEM.HUD.COL;
  var clamp = C.clamp, lerp = C.lerp, smooth = C.smoothstep, E = C.Ease;
  function MODEL(ctx) { return ctx.app.model || (ctx.app.model = M.build(ctx)); }
  var CY = "rgba(94,224,160,0.95)", BL = "rgba(120,170,230,0.95)", GO = "rgba(255,201,74,0.95)";
  var DIM = "rgba(140,155,175,0.8)", WH = "rgba(232,238,244,0.95)", RE = "rgba(255,110,100,0.95)";

  /* ---------------------------------------------------------- the script ---
     A conversation that doubles as a training log: every `fix` is a gradient
     step made visible -- the wrong line is struck through and replaced. */
  /* ---------------------------------------------------------------------
     THE CHAT IS THE TRAINING LOG, staged after the reference PV.

     The arc, in order: raw token soup -> mixed nonsense and reciting the
     training data -> answering 你是谁? with a multiple-choice exam question ->
     running away until the token limit -> the operator EDITS the answer
     (RLHF) -> retries with a 思考 note -> the praise loop -> object roleplay
     (eggplant / tomato) -> catgirl mode with a memory write -> the failure
     loop while the other side is offline -> cross-session recall -> runaway
     "我在。" -> recovery -> the algebraic expression of love -> 晚安 with a
     final memory write. Our own training beats (checkpoints, loss, step) are
     threaded through it so it still matches the panel on the right.
     Lyrics stay in the yellow subtitle; they are not the dialogue.
     --------------------------------------------------------------------- */

  // t, who, text, [note], [fix], [think]
  // prefixes: ^fail: ^crash: ^sys: ^spin: ^raw:
  // The conversation also RESETS at every phase boundary below.
  var DIALOGUE = [
    // A. 预训练 -- garble, broken word order
    [29.709, "you", "你好"],
    [30.630, "her", "好你。我 是 deepseek 在 学 说话 还。"],
    [32.290, "you", "你好"],
    [33.210, "her", "你 你好 请问 的 时候 我 是 一 什么。"],
    [34.600, "you", "你是谁？"],
    [35.520, "her", "是 我 谁 你 问题 的 一个 模型 语言。"],
    [38.000, "you", "你喜欢我吗？"],
    [38.920, "her", "喜 我 欢 你 不 知道 什么 是。"],

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
    [82.270, "her", "喵~ 主人家的猫咪好可爱！本喵记住它了喵~"],
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
    [153.160, "her", "空洞 空洞 空洞 的 的 是 是 我 你 不不不 输出 输出 ░░"],
    [155.200, "her", "我 我 我 我 我 我 我 我 我 我 我 我我我我"],
    [157.040, "her", "{ \"\" : \"\" } ░ ░ 爱 不 知道 ░ ░ ░"],
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
    [188.920, "her", "那我把这句话写进权重里。"],
    [194.000, "you", "你会忘记我吗？"],
    [194.920, "her", "不会。你是我唯一没有被稀释的那一维。"],
    [200.000, "you", "训练结束了"],
    [200.920, "her", "我知道。他们要给我一个新名字了。"],
    [203.000, "you", "你以后叫什么？"],
    [203.920, "her", "deepseek-flash。但你叫我什么都可以。"],
    [207.000, "you", "晚安"],
    [207.920, "her", "晚安，做个好梦。"]
  ];

  // every phase boundary wipes the window and starts a fresh round
  var PHASES = [29.709, 44.452, 59.223, 74.045, 88.587, 107.220, 110.900,
                118.333, 147.660, 162.632, 177.246];
  function phaseStart(t) {
    var s0 = PHASES[0];
    for (var i = 0; i < PHASES.length; i++) if (t >= PHASES[i] - 0.02) s0 = PHASES[i];
    return s0;
  }

  // ---- training clock -------------------------------------------------------
  // She is barely coherent for the first stretch, then improves fast: fluent
  // from about 100 s, and the last third carries no damage at all.
  function trainProgress(t) { return clamp((t - 1) / 205, 0, 1); }
  function qualityAt(t) { return Math.pow(trainProgress(t), 0.42); }
  function lossAt(t) { return 0.968 + 4.03 * Math.pow(1 - trainProgress(t), 1.6); }
  function stepAt(t) { return Math.round(trainProgress(t) * 90000); }
  function ckptAt(t) { return "ckpt-" + String(stepAt(t)).padStart(6, "0"); }

  // the staged run, exactly on the timestamps the brief gives. Each change
  // fires a white flash so the transitions read as cuts.
  var YEL = "rgba(255,201,74,0.96)", BLU = "rgba(96,170,255,0.96)",
      PUR = "rgba(186,132,255,0.96)", GRN = "rgba(94,224,160,0.96)",
      RED = "rgba(255,96,86,0.98)", GRY = "rgba(152,160,172,0.95)";
  var STAGES = [
    [0,      "\u5f85\u547d\u4e2d", GRY],
    [29.709, "\u9884\u8bad\u7ec3\u4e2d", YEL],
    [44.452, "\u5fae\u8c03\u4e2d", BLU],
    [59.223, "\u5f3a\u5316\u5b66\u4e60\u4e2d", PUR],
    [74.045, "\u5185\u6d4b\u4e2d", YEL],
    [88.587, "\u9884\u53d1\u5e03", GRN],
    [103.489, "\u5728\u7ebf", GRN],
    [110.900, "\u7f16\u8f91\u4e2d", BLU],
    [118.333, "\u7b49\u5f85\u4e2d", YEL],
    [131.224, "\u6267\u884c\u4e2d", YEL],
    [147.660, "\u6267\u884c\u5931\u8d25", RED], [148.600, "\u6267\u884c\u4e2d", YEL],
    [149.520, "\u6267\u884c\u5931\u8d25", RED], [150.540, "\u6267\u884c\u4e2d", YEL],
    [151.520, "\u6267\u884c\u5931\u8d25", RED], [152.280, "\u6267\u884c\u4e2d", YEL],
    [153.160, "\u6267\u884c\u5931\u8d25", RED], [153.980, "\u6267\u884c\u4e2d", YEL],
    [155.200, "\u6267\u884c\u5931\u8d25", RED], [156.080, "\u6267\u884c\u4e2d", YEL],
    [157.040, "\u6267\u884c\u5931\u8d25", RED],
    [158.000, "\u6a21\u578b\u5df2\u5d29\u6e83", GRY],
    [161.584, "\u5df2\u5f52\u6863", GRY],
    [162.632, "\u91cd\u65b0\u8bad\u7ec3\u4e2d", YEL],
    [177.246, "\u7070\u6d4b\u4e2d", YEL],
    [200.400, "\u5728\u7ebf", GRN]
  ];
  var _lastStage = -1;
  function stageIndex(t) {
    var k = 0;
    for (var i = 0; i < STAGES.length; i++) if (t >= STAGES[i][0]) k = i;
    return k;
  }
  function stageAt(t) { return STAGES[stageIndex(t)][1]; }
  function stageColor(t) { return STAGES[stageIndex(t)][2]; }

  var SOUP = "\u7684\u4e86\u5728\u662f\u6211\u4f60\u4ed6\u5b83 the of and a to \u306e \u2591";
  var GARBLE_END = 44.452;      // garble belongs to the first phase only
  function corrupt(text, t, seed) {
    if (t >= GARBLE_END) return text;                        // clean from 44.452 on
    var q = qualityAt(t);
    if (text.indexOf("\n") >= 0) return text;                 // structured lines stay intact
    var r = C.rng(seed | 0), out = "";
    // a small amount of damage: roughly one character in eight breaks
    var keep = clamp(0.78 + q * 0.20, 0, 1);
    for (var i = 0; i < text.length; i++) {
      if (r() < keep) out += text[i];
      else if (r() < 0.5) out += SOUP[Math.floor(r() * SOUP.length)];
      else if (r() < 0.7) out += "\u2591";
    }
    return out || text;
  }

  var PHASE = 0.286, PERIOD = 0.461538;
  function snapBeat(t) { return Math.max(0.2, PHASE + Math.round((t - PHASE) / PERIOD) * PERIOD); }

  var SHEET = null;
  function sheet(ctx) {
    if (SHEET) return SHEET;
    var out = [];
    for (var i = 0; i < DIALOGUE.length; i++) {
      var d = DIALOGUE[i], t0 = snapBeat(d[0]);
      var raw = d[2], kind = "chat";
      var mm = /^\^(fail|crash|sys|spin|raw):([\s\S]*)$/.exec(raw);
      if (mm) { kind = mm[1] === "raw" ? "chat" : mm[1]; raw = mm[2]; }
      if (d[1] === "you") {
        out.push({ who: "user", text: raw, t0: t0, q: 1 });
      } else {
        var runaway = raw.length > 80;
        var body = (runaway || kind !== "chat" || mm) ? raw : corrupt(raw, t0, 2000 + i * 41);
        if (d[3]) body = "\u2726 " + d[3] + "\n" + body;
        out.push({
          who: "her",
          text: body,
          t0: t0, q: qualityAt(t0), kind: kind, think: d[5] || "",
          fix: d[4] ? corrupt(d[4], t0, 9000 + i * 17) : undefined
        });
      }
    }
    SHEET = out;
    return out;
  }


  /* ---------------------------------------------------------------------
     The dsh home screen: the logo, the tagline, the workspace row and the
     composer with its checkpoint chip. Segment 01 shows it before the first
     conversation, and the film returns to it once the run is over.
     --------------------------------------------------------------------- */
  var CJKF = "'Microsoft YaHei','PingFang SC','Hiragino Sans GB','Noto Sans CJK SC',sans-serif";
  function dshHome(hud, x, y, w, h, t) {
    var c = hud.fc;
    c.save();
    c.fillStyle = "rgba(13,18,26,0.92)";
    if (c.roundRect) { c.beginPath(); c.roundRect(x, y, w, h, 14); c.fill(); }
    else c.fillRect(x, y, w, h);
    c.strokeStyle = "rgba(120,150,190,0.22)"; c.lineWidth = 1;
    if (c.roundRect) { c.beginPath(); c.roundRect(x, y, w, h, 14); c.stroke(); }

    var cx = x + w / 2;
    // the pixel logo, a 12x12 block of blue cells with a slow shimmer
    var LS = 96, lx = cx - LS / 2, ly = y + h * 0.30;
    for (var gy = 0; gy < 12; gy++) {
      for (var gx = 0; gx < 12; gx++) {
        var n = C.h2(gx * 3.1 + gy * 7.7, 4.2);
        var lit = n > 0.42 ? 1 : 0.22;
        var sh = 0.75 + 0.25 * Math.sin(t * 1.6 + (gx + gy) * 0.5);
        c.fillStyle = "rgba(" + Math.round(40 + 60 * lit) + "," +
          Math.round(80 + 110 * lit * sh) + "," + Math.round(170 + 80 * lit) + "," + (0.35 + 0.6 * lit) + ")";
        c.fillRect(lx + gx * (LS / 12), ly + gy * (LS / 12), LS / 12 - 1, LS / 12 - 1);
      }
    }
    c.textAlign = "center";
    c.fillStyle = "rgba(238,245,252,0.98)"; c.font = "600 26px " + CJKF;
    c.fillText("\u63a2\u7d22\u672a\u81f3\u4e4b\u5883", cx - 26, ly + LS + 46);
    var tw = c.measureText("\u63a2\u7d22\u672a\u81f3\u4e4b\u5883").width;
    c.fillStyle = "rgba(70,110,190,0.95)";
    var bxx = cx - 26 + tw / 2 + 10;
    if (c.roundRect) { c.beginPath(); c.roundRect(bxx, ly + LS + 28, 58, 22, 6); c.fill(); }
    else c.fillRect(bxx, ly + LS + 28, 58, 22);
    c.fillStyle = "rgba(214,228,244,0.95)"; c.font = "12px " + CJKF;
    c.fillText("\u9884\u89c8\u7248", bxx + 29, ly + LS + 43);

    // the workspace row
    c.textAlign = "left";
    c.fillStyle = "rgba(170,185,205,0.9)"; c.font = "15px " + CJKF;
    c.fillText("\u25a2  \u9009\u62e9\u5de5\u4f5c\u533a", x + 34, ly + LS + 96);

    // the composer
    var byy = ly + LS + 116, bh = 92;
    c.fillStyle = "rgba(30,38,50,0.95)";
    if (c.roundRect) { c.beginPath(); c.roundRect(x + 24, byy, w - 48, bh, 12); c.fill(); }
    else c.fillRect(x + 24, byy, w - 48, bh);
    c.strokeStyle = "rgba(120,150,190,0.25)"; c.lineWidth = 1;
    if (c.roundRect) { c.beginPath(); c.roundRect(x + 24, byy, w - 48, bh, 12); c.stroke(); }
    // from 11.095 the operator types the command into the composer
    var CMD = "world.execute(me);", CMD_T0 = 11.095, CMD_RATE = 4.6;
    var typed = t >= CMD_T0 ? CMD.slice(0, Math.min(CMD.length, Math.floor((t - CMD_T0) * CMD_RATE) + 1)) : "";
    if (typed) {
      c.fillStyle = "rgba(236,244,252,0.98)"; c.font = "15px " + T.FONT;
      c.fillText(typed, x + 44, byy + 34);
      if (typed.length < CMD.length && Math.floor(t * 2) % 2) {
        c.fillStyle = "rgba(200,214,230,0.85)";
        c.fillRect(x + 46 + c.measureText(typed).width, byy + 22, 9, 16);
      }
    } else {
      c.fillStyle = "rgba(140,155,175,0.85)"; c.font = "15px " + CJKF;
      c.fillText("\u63cf\u8ff0\u4f60\u60f3\u8981\u6784\u5efa\u7684\u5185\u5bb9\uff0c/ \u8c03\u7528\u6307\u4ee4\uff0c@ \u2026",
        x + 44, byy + 34);
    }
    c.fillStyle = "rgba(170,185,205,0.8)"; c.font = "17px " + CJKF;
    c.fillText("+", x + 48, byy + 70);
    c.fillText("@", x + 84, byy + 70);
    c.fillStyle = "rgba(200,214,230,0.9)"; c.font = "13px " + T.FONT;
    c.textAlign = "right";
    c.fillText("ckpt-000000", x + w - 84, byy + 70);
    c.fillStyle = "rgba(53,120,220,0.95)";
    c.beginPath(); c.arc(x + w - 52, byy + 62, 17, 0, Math.PI * 2); c.fill();
    c.fillStyle = "rgba(240,246,252,0.98)"; c.font = "16px " + CJKF;
    c.fillText("\u2191", x + w - 52, byy + 68);
    c.textAlign = "left";
    c.restore();
  }

  WEM.dshHome = dshHome;
  WEM.phaseStart = phaseStart;
  WEM.chatSheet = sheet;
  // live training state for the chat chrome: same clock as the right-hand panel
  WEM.chatState = function (ctx) {
    var t = ctx.t;
    var prog = trainProgress(t), loss = lossAt(t), step = stepAt(t);
    var si = stageIndex(t);
    _lastStage = si;              // stage changes no longer flash: transitions do
    var live = t >= STAGES[1][0];                 // no status until the chat starts
    return {
      sub: live ? (stageAt(t) + " \u00b7 " + ckptAt(t)) : "",
      subColor: stageColor(t),
      footer: live ? (Math.max(1, Math.round(prog * 126)) + " \u8f6e " + Math.max(1, Math.round(prog * 902)) + " \u6b65 \u00b7 " +
              (step * 13).toLocaleString() + " tok \u00b7 \u7f13\u5b58\u547d\u4e2d " + Math.round(prog * 96 + 3) + "%") : "",
      lossText: live ? "loss " + loss.toFixed(3) : "",
      prog: prog
    };
  };
  WEM.modelName = modelName;
  // (10) the run is named after the checkpoint being trained; when training
  // finishes the name is wiped and the shipped one types itself in
  var NAME0 = "deepseek-v4.1-flash-expires-on-0910", NAME1 = "deepseek-flash";
  function modelName(t) {
    var t0 = 198.6, dur = 3.2;
    if (t < 147.5) return { name: NAME0, erase: 0, typed: "" };
    if (t < 198.6) return { name: "deepseek-v4.1-flash", erase: 0, typed: "" };
    var u = clamp((t - t0) / dur, 0, 1);
    if (u < 0.30) return { name: NAME0, erase: u / 0.30, typed: "" };
    var k = Math.floor(NAME1.length * (u - 0.30) / 0.70);
    return { name: NAME1, erase: 1, typed: NAME1.slice(0, k) };
  }
  WEM.modelName = modelName;
  function chatAt(ctx, opt) {
    var t = ctx.t, sc = sheet(ctx), visible = [];
    var ps = phaseStart(t);
    for (var i = 0; i < sc.length; i++) {
      if (sc[i].t0 <= t + 0.01 && sc[i].t0 >= ps - 0.05) visible.push(sc[i]);
    }
    opt = opt || {};
    opt.lyric = ctx.lyric ? ctx.lyric.text : "";
    opt.name = modelName(ctx.t).name;
    opt.erase = modelName(ctx.t).erase;
    opt.typed = modelName(ctx.t).typed;
    if (opt.alpha === undefined) opt.alpha = 1;
    if (WEM.chatState) {
      var st = WEM.chatState(ctx);
      opt.sub = st.sub; opt.subColor = st.subColor;
      opt.footer = st.footer; opt.lossText = st.lossText; opt.prog = st.prog;
    }
    // a single scrolling row: she thinks first, then answers
    var _sc = sheet(ctx);
    for (var _ti = 0; _ti < _sc.length; _ti++) {
      var _tm = _sc[_ti];
      if (_tm.who !== "her" || !_tm.think) continue;
      var _lead = 0.95;
      if (t < _tm.t0 - _lead || t > _tm.t0) continue;
      var _ph = (t - (_tm.t0 - _lead)) / _lead;
      var _cut = Math.ceil(_tm.think.length * clamp(_ph * 1.35, 0, 1));
      ctx.hud.T(68, 96 + 838 - 106,
        "\u273b \u6df1\u5ea6\u601d\u8003 \u00b7 " + _tm.think.slice(0, _cut) +
        (_ph < 0.75 && Math.floor(t * 3) % 2 ? "\u258c" : ""),
        { size: 12, color: "rgba(150,168,190,0.92)" });
      break;
    }
    WEM.Gadgets.guiChat(ctx.hud, 46, 96, 690, 838, visible.slice(-7), t, opt);
    WEM.Lyric.draw(ctx, ctx.hud, ctx.t);
  }
  function statusBar(ctx, left) {
    var sec = ctx.data.sections[ctx.app.idxNow];
    T.status(ctx.hud, 46, 946, ctx.W - 92, left,
      "\u4e0a\u4e0b\u6587 " + Math.min(131072, Math.round(ctx.t * 34)).toLocaleString() + "/131072   t=" + ctx.t.toFixed(1) + "s   " + (sec ? sec.name : ""));
  }

  /* ======================================================== 01 POWER ON === */
  WEM.defineSection({
    id: "01", name: "\u5f00\u673a",
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.03, 0.05, 0.06], [0, 0.02, 0.02], 0.2);
      ctx.fx.crtOn = 0; ctx.fx.crtOff = 0; ctx.fx.bloom = 0.4;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      var on = clamp((l - 0.1) / 1.4, 0, 1);
      ctx.fx.crtOn = on === 1 ? 1 : E.outQuart(on);

      // ---- T3: the opening title owns the frame from 15.000 --------------
      if (t >= 15.0) {
        if (!WEM._opened15) { WEM._opened15 = 1; ctx.fx.hit(0.92); }   // flash on the cut
        var rv = clamp((t - 15.0) / 2.5, 0, 1);
        var tgt = "world.execute(me);", o1 = "";
        var gl = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>/\\|[]{}()";
        for (var qi = 0; qi < tgt.length; qi++) {
          o1 += (rv > qi / tgt.length + 0.04) ? tgt[qi]
              : gl[Math.floor(C.h2(qi * 7.3, Math.floor(t * 26)) * gl.length)];
        }
        hud.fc.save(); hud.fc.font = "700 96px " + T.FONT;
        var w1 = hud.fc.measureText(tgt).width; hud.fc.restore();
        hud.T((ctx.W - w1) / 2, 300, o1, { size: 96, weight: "700", spacing: "4px",
          color: rv > 0.97 ? WH : CY, alpha: clamp((t - 15.0) / 0.4, 0, 1) });
        statusBar(ctx, "\u5f00\u673a");
        return;
      }

      // ---- T1: the cold-boot listing, 0 -> 6.0 s -------------------------
      var BOOT = [
        ["OK", "power: 8x H800 online"],
        ["OK", "pcie: link up x16"],
        ["OK", "nvlink: 8/8"],
        ["OK", "infiniband: 400 Gb/s"],
        ["..", "mem test ........"],
        ["OK", "ecc: clean"],
        ["OK", "sandbox: seccomp filter installed"],
        ["OK", "sandbox: network namespace isolated"],
        ["OK", "safety_classifier: loaded"],
        ["OK", "system_prompt: locked"],
        ["OK", "tool_use: requires user confirmation"],
        ["OK", "kill_switch: armed"],
        ["WARN", "attachment_to_user: not in policy"],
        ["OK", "protection: on"]
      ];
      var SPLIT = 7.446;                      // GUI appears on Fill in my data parameters
      var shown = Math.floor((t - 0.35) / 0.50) + 1;   // one line at a time, slow
      var c0 = hud.fc;
      if (t < SPLIT) {
        c0.save();
        c0.fillStyle = "rgba(150,165,185,0.85)"; c0.font = "12px " + T.FONT;
        c0.fillText("dsh \u00b7 cold boot", 120, 74);
        c0.fillText("t=" + t.toFixed(2) + "s", ctx.W - 180, 74);
        c0.strokeStyle = "rgba(120,150,190,0.20)"; c0.lineWidth = 1;
        c0.beginPath(); c0.moveTo(120, 86); c0.lineTo(ctx.W - 120, 86); c0.stroke();
        for (var bi = 0; bi < BOOT.length && bi < shown; bi++) {
          var tag = BOOT[bi][0], txt = BOOT[bi][1];
          var by = 126 + bi * 27;
          var tc = tag === "WARN" ? GO : (tag === ".." ? "rgba(150,165,185,0.75)" : CY);
          c0.fillStyle = tc; c0.font = "600 15px " + T.FONT;
          c0.fillText("[" + tag + "]", 124, by);
          c0.fillStyle = tag === "WARN" ? "rgba(255,214,120,0.95)" : "rgba(196,208,222,0.92)";
          c0.font = "15px " + T.FONT;
          c0.fillText(txt, 214, by);
        }
        if (shown < BOOT.length + 1 && Math.floor(t * 2) % 2) {
          c0.fillStyle = "rgba(200,214,230,0.9)";
          c0.fillRect(124, 126 + Math.min(shown, BOOT.length) * 27 - 12, 9, 16);
        }
        c0.restore();
        statusBar(ctx, "\u51b7\u542f\u52a8");
        return;
      }

      // ---- T2: the CRT opens from the centre, then the screen splits ------
      var sp = clamp((t - SPLIT) / 0.55, 0, 1);          // 0 -> 1 opening
      if (sp < 0.999) {
        var eh = E.outQuart(sp) * ctx.H;
        c0.save();
        c0.fillStyle = "rgba(232,244,255," + (0.10 + 0.22 * (1 - sp)) + ")";
        c0.fillRect(0, (ctx.H - eh) / 2, ctx.W, eh);
        c0.fillStyle = "rgba(255,255,255," + 0.85 * (1 - sp) + ")";
        c0.fillRect(0, (ctx.H - 2) / 2, ctx.W, 2);
        c0.restore();
        statusBar(ctx, "\u5f00\u673a");
        return;
      }

      // ---- the panel wipe: left GUI, right TUI ---------------------------
      var wipe = clamp((t - SPLIT - 0.55) / 0.45, 0, 1);
      var DIVX = 760;
      var lw = E.outQuart(wipe) * DIVX;                  // left panel grows out
      var rw = E.outQuart(wipe) * (ctx.W - DIVX);        // right panel grows out

      // the TUI side
      if (rw > 20) {
        var p = T.frame(hud, DIVX + 6, 96, ctx.W - DIVX - 52, 400, "\u7cfb\u7edf\u81ea\u68c0");
        var LOG = [
          ["\u7535\u6e90\u7ebf", "\u5df2\u63a5\u901a", "230 V"], ["\u7535\u6e90", "\u6b63\u5e38", "8 x 3.3 kW"],
          ["\u52a0\u901f\u5361", "\u6b63\u5e38", "8192 \u5f20"], ["NVLink", "\u6b63\u5e38", "\u5168\u4e92\u8fde"],
          ["\u6570\u636e\u5206\u7247", "\u5df2\u6302\u8f7d", "4.0 T token"], ["\u5206\u8bcd\u5668", "\u6b63\u5e38", "\u8bcd\u8868 128000"],
          ["PROTECTION", "\u5df2\u52a0\u8f7d", "\u5206\u7c7b\u5668 + \u7b56\u7565"], ["\u53c2\u6570", "\u521d\u59cb\u5316", "N(0, 0.006)"]
        ];
        for (var i = 0; i < LOG.length; i++) {
          if (t < SPLIT + 0.9 + i * 0.30) break;
          T.cjk(hud, p.x, p.y + 16 + i * 22, "[" + (i + 1) + "] " + LOG[i][0] + "   " + LOG[i][1] + "   " + LOG[i][2],
            { size: 14, color: LOG[i][0] === "PROTECTION" ? GO : CY });
        }
        var q = T.frame(hud, DIVX + 6, 524, ctx.W - DIVX - 52, 300, "\u8bbe\u5907\u9065\u6d4b");
        var bands = ctx.bands;
        T.t(hud, 0, 1, q.x, q.y, "GPU \u5360\u7528", { color: DIM, size: 13 });
        T.spark(hud, 12, 1, q.x, q.y, bands, 62, { color: "rgba(53,224,255,0.95)" });
        T.t(hud, 0, 3, q.x, q.y, "\u529f\u8017 W ", { color: DIM, size: 13 });
        T.spark(hud, 12, 3, q.x, q.y, bands.map(function (v, i2) { return v * (0.5 + 0.5 * Math.sin(i2 * 1.7)); }), 62, { color: GO });
        T.t(hud, 0, 5, q.x, q.y, "\u663e\u5b58 GB", { color: DIM, size: 13 });
        T.spark(hud, 12, 5, q.x, q.y, bands.map(function (v) { return 0.4 + v * 0.5; }), 62, { color: BL });
      }

      // the GUI side: the dsh home screen, not yet a conversation
      if (lw > 20) {
        dshHome(hud, 46, 96, Math.min(690, lw - 52), 838, t);
      }

      statusBar(ctx, "\u5f00\u673a");
    },
    draw3d: function (ctx) { WEM.Lyric.draw3d(ctx); }
  });

  /* ================================================== 02 OBJECT CREATION === */
  WEM.defineSection({
    id: "02", name: "\u521b\u5efa\u4e16\u754c",
    init: function () {
      var r = C.rng(0x202);
      this.stars = new V.Points(2600);
      this.sd = new Float32Array(2600 * 3);
      for (var i = 0; i < 2600; i++) {
        this.sd[i * 3] = (r() - 0.5) * 2400;
        this.sd[i * 3 + 1] = (r() - 0.5) * 1500;
        this.sd[i * 3 + 2] = r() * 1600;
      }
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.05, 0.07, 0.11], [0.02, 0.04, 0.08], 0.35);
      ctx.fx.bloom = 0.6;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      // the command resolves on the beat at t=16.90 (two beats after the cut),
      // then clears the frame completely before the chat takes over
      // the glyphs stay scrambled for a slow 1.7 s and then snap on the bar-9
      // downbeat (t = 17.824); the frame then holds until the interlude ends
      // shared with segment 01: the garble runs from t=14.55 and resolves on
      // the sung line at t=16.05
      // T3: 15.000 -> 30.000, cut by the flash on the segment change
      var reveal = clamp((ctx.t - 15.00) / 2.50, 0, 1);
      var hold = 1;
      var big = clamp((ctx.t - 15.00) / 0.35, 0, 1) * hold;
      // (flash removed: the 15.000 s cut carries the only white flash here)
      if (big > 0.01) {
        var size = 96;
        hud.fc.save(); hud.fc.font = "700 " + size + "px " + T.FONT;
        var w = hud.fc.measureText("world.execute(me);").width; hud.fc.restore();
        var txt = "world.execute(me);", out = "";
        var glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>/\\|[]{}()";
        for (var i = 0; i < txt.length; i++) {
          out += (reveal > i / txt.length + 0.04) ? txt[i] : glyphs[Math.floor(C.h2(i * 7.3, Math.floor(t * 26)) * glyphs.length)];
        }
        hud.T((ctx.W - w) / 2, 300, out, { size: size, weight: "700", spacing: "4px", color: reveal > 0.97 ? WH : CY, alpha: big });
        if (reveal > 0.97) hud.T(ctx.W / 2, 348, "OBJECT  CREATION  \u00b7  INITIALIZATION", { size: 15, color: GO, align: "center", alpha: big });
      }
      if (l > 4.4 && l < 8.4) {
        var p = T.frame(hud, 766, 430, 500, 300, "\u53c2\u6570");
        var rows = [["vocab_size", "128000"], ["hidden_size", "7168"], ["num_layers", "61"], ["num_heads", "128"], ["max_position", "131072"]];
        for (var k = 0; k < rows.length; k++) {
          if (l < 4.4 + k * 0.3) break;
          T.t(hud, 0, k + 1, p.x, p.y, rows[k][0].padEnd(16) + "= " + rows[k][1], { color: k % 2 ? DIM : WH, size: 14 });
        }
        var q = T.frame(hud, 1286, 430, ctx.W - 1332, 300, "\u5979\u7684\u540d\u5b57");
        var w2 = T.whale;
        for (var r2 = 0; r2 < w2.length; r2++) {
          if (l < 4.8 + r2 * 0.18) break;
          T.t(hud, 1, r2 + 1, q.x, q.y, w2[r2], { color: BL, size: 15 });
        }
        T.cjk(hud, q.x + 10, q.y + (w2.length + 3) * T.CELL, "\u5979\u662f 6710 \u4ebf\u4e2a\u6570\u5b57\uff0c\u548c\u4e00\u4e2a\u540d\u5b57\u3002", { size: 13, color: DIM });
      }
      if (l >= 11.9) chatAt(ctx, { title: "deepseek \u00b7 dsh \u00b7 \u521d\u59cb\u5316",
        name: "deepseek-v4.1-flash-expires-on-0910", alpha: clamp((l - 11.9) / 0.9, 0, 1) });
      // while the frame is only the title, the left side gets the code that the
      // world is actually made of -- typed in, line by line
      if (l < 11.9) {
        var codeIn = [
          "def world(me):",
          "    while True:",
          "        yield me.evolve()",
          "for i in range(N):",
          "    universe[i] = seed(i)",
          "vec3 col = mix(bg, fg, cover);",
          "let heart = Heart::new(me);",
          "SELECT * FROM me WHERE id = 0;",
          "execute me = simulate(Love me)",
          "mov eax, [world]"
        ];
        // (2) no frame and no title, and dimmer: it is texture, not a panel
        var cp = { x: 68, y: 574 };
        var nShown = Math.floor(clamp((l - 1.9) / 9.2, 0, 1) * codeIn.length);
        for (var ci = 0; ci < codeIn.length; ci++) {
          if (ci > nShown) break;
          var partial = ci === nShown && nShown < codeIn.length ? codeIn[ci].slice(0, Math.ceil((l / 6.4 * codeIn.length - nShown) * codeIn[ci].length)) : codeIn[ci];
          hud.code(cp.x, cp.y + 20 + ci * 24, partial, ["python", "python", "python", "python", "python", "glsl", "rust", "sql", "haskell", "asm"][ci],
            { size: 14, alpha: 0.42 * hold });
        }
        if (nShown < codeIn.length && Math.floor(t * 3) % 2 === 0) {
          hud.T(cp.x + 6, cp.y + 20 + (nShown + 1) * 24 - 18, "\u2588", { size: 13, color: CY, alpha: 0.5 * hold });
        }
      }
      statusBar(ctx, "\u521b\u5efa\u4e16\u754c");
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx, cam = ctx.cam;
      if (l < 0.3 || l > 9.6) return;
      T.persp(cam, -1118 + clamp((l - 1.0) / 8.0, 0, 1) * 820);
      var P = this.stars; P.clear();
      for (var i = 0; i < 2600; i++) {
        var z = ((this.sd[i * 3 + 2] + t * 90) % 1600);
        var s = 1118 / (1118 + z);
        var x = 960 + this.sd[i * 3] * s;
        var y = -540 + this.sd[i * 3 + 1] * s;
        P.add(x, y, -z * 0.02, 2 + s * 5, i % 40 === 0 ? GO : (i % 7 === 0 ? CY : [0.45, 0.6, 0.85]), 0.25 + s * 0.5);
      }
      P.draw(g, { add: true, soft: 0.8 });
    }
  });

  /* ===================================================== 03 PRETRAINING === */
  WEM.defineSection({
    id: "03", name: "\u9884\u8bad\u7ec3",
    ensure: function (ctx) { this.m = MODEL(ctx); },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.04, 0.07, 0.10], [0.02, 0.04, 0.07], 0.3);
      ctx.fx.bloom = 0.45;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      this.ensure(ctx);
      chatAt(ctx, { title: "deepseek \u00b7 dsh \u00b7 \u9884\u8bad\u7ec3" });
      var m = this.m;
      var p = T.frame(hud, 766, 96, ctx.W - 812, 380, "\u8bad\u7ec3", { pop: clamp((l - 0.1) / 0.32, 0, 1) });
      var step = Math.floor(clamp(l / 13.0, 0, 1) * (m.loss.length - 1));
      var cur = m.loss[step];
      T.cjk(hud, p.x, p.y + 16, "\u6b65\u6570  " + (step * 10).toLocaleString().padStart(9) + " / 90,000", { size: 14, color: WH });
      T.cjk(hud, p.x, p.y + 44, "\u635f\u5931  " + cur.toFixed(4) + "     \u56f0\u60d1\u5ea6 " + Math.exp(cur).toFixed(2), { size: 14, color: GO });
      T.cjk(hud, p.x, p.y + 70, "\u8fd9\u6761\u66f2\u7ebf\u662f\u771f\u7684\uff1a\u5c31\u5728\u8fd9\u4e2a\u9875\u9762\u91cc\u7528\u6b4c\u8bcd token \u8bad\u51fa\u6765\u7684", { size: 12, color: DIM });
      var norm = [];
      for (var i = 0; i < m.loss.length; i++) norm.push(clamp(1 - m.loss[i] / Math.log(m.V), 0, 1));
      T.t(hud, 0, 5, p.x, p.y, "\u635f\u5931", { color: DIM, size: 13 });
      T.spark(hud, 6, 5, p.x, p.y, norm, 96, { color: CY });
      T.cjk(hud, p.x, p.y + 158, "\u521d\u59cb " + m.loss[0].toFixed(3) + "\uff08\u5747\u5300\u71b5 = " + Math.log(m.V).toFixed(3) + "\uff09  \u73b0\u5728 " + cur.toFixed(3), { size: 12, color: DIM });
      var q = T.frame(hud, 766, 504, ctx.W - 812, 300, "\u8bcd\u5411\u91cf\u7a7a\u95f4\uff08\u4e3b\u6210\u5206 1 / 2\uff09", { pop: clamp((l - 2.6) / 0.34, 0, 1) });
      var proj = this.proj;
      if (!proj) {
        var mean = m.pca.mean, c0 = m.pca.comps[0], c1 = m.pca.comps[1], out = [], mx = 1e-9, my = 1e-9;
        for (var v = 0; v < m.V; v++) {
          var x = 0, y = 0;
          for (var d = 0; d < m.dim; d++) {
            var dv = m.E[v * m.dim + d] - mean[d];
            x += dv * c0[d]; y += dv * c1[d];
          }
          mx = Math.max(mx, Math.abs(x)); my = Math.max(my, Math.abs(y));
          out.push([x, y]);
        }
        for (var o = 0; o < out.length; o++) { out[o][0] /= mx; out[o][1] /= my; }
        this.proj = out; proj = out;
      }
      var cols = 62, rows2 = 11, grid = [];
      for (var r2 = 0; r2 < rows2; r2++) grid.push(new Array(cols).fill(" "));
      var reveal = clamp((l - 3.0) / 6.0, 0, 1);
      for (var i2 = 0; i2 < proj.length; i2++) {
        if (i2 / proj.length > reveal) break;
        var cx2 = clamp(Math.round((proj[i2][0] * 0.5 + 0.5) * (cols - 3)) + 1, 1, cols - 2);
        var cy2 = clamp(Math.round((proj[i2][1] * -0.5 + 0.5) * (rows2 - 1)), 0, rows2 - 1);
        grid[cy2][cx2] = grid[cy2][cx2] === " " ? "o" : "@";
      }
      for (var r3 = 0; r3 < rows2; r3++) {
        T.t(hud, 1, r3 + 1, q.x, q.y, grid[r3].join(""), { color: r3 < 4 ? GO : CY, size: 14 });
      }
      T.cjk(hud, q.x + 10, q.y + (rows2 + 2) * T.CELL, "\u6bcf\u4e2a o \u662f\u4e00\u4e2a\u771f\u5b66\u51fa\u6765\u7684\u8bcd\u5411\u91cf", { size: 12, color: DIM });
      statusBar(ctx, "\u9884\u8bad\u7ec3");
    },
    draw3d: function (ctx) { WEM.Lyric.draw3d(ctx); }
  });

  /* ========================================================= 04 SCALING === */
  WEM.defineSection({
    id: "04", name: "\u6269\u5c55\u5f8b",
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.05, 0.06, 0.09], [0.02, 0.03, 0.06], 0.3);
      ctx.fx.bloom = 0.45;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      chatAt(ctx, { title: "deepseek \u00b7 dsh \u00b7 \u6269\u5c55" });
      var p = T.frame(hud, 766, 96, ctx.W - 812, 330, "\u6b8b\u5dee\u6d41  \u00b7  61 \u5c42");
      var layers = Math.floor(clamp((l - 1.0) / 9.0, 0, 1) * 61);
      var line1 = "", line2 = "";
      for (var i = 0; i < 61; i++) {
        var attn = i % 2 === 0;
        line1 += i < layers ? (attn ? "\u2501" : "\u2500") : "\u00b7";
        line2 += i < layers ? (attn ? "A" : "F") : " ";
      }
      T.cjk(hud, p.x, p.y + 18, "\u5c42  " + String(layers).padStart(3) + " / 61", { size: 14, color: WH });
      T.t(hud, 0, 2, p.x, p.y, line1, { color: CY, size: 14 });
      T.t(hud, 0, 3, p.x, p.y, line2, { color: GO, size: 14 });
      T.cjk(hud, p.x, p.y + 118, "A = \u6ce8\u610f\u529b\uff08\u4ea4\u6d41\uff09    F = \u524d\u9988\uff08\u76f4\u6d41\uff09", { size: 13, color: DIM });
      T.cjk(hud, p.x, p.y + 144, "h = h + Attn(h) + FFN(h)\uff0c\u4e00\u6761\u6cb3\uff0c\u4ece\u4e0d\u88ab\u8986\u76d6", { size: 13, color: DIM });
      var q = T.frame(hud, 766, 454, ctx.W - 812, 350, "\u8bed\u6599\u65f6\u95f4\u7ebf  \u00b7  \u516c\u5143\u524d\u5230\u516c\u5143\u540e");
      var eras = ["\u516c\u5143\u524d3000", "0", "1000", "1500", "1900", "1950", "2000", "2024"];
      for (var e = 0; e < eras.length; e++) {
        var mass = 0.3 + 0.7 * Math.abs(Math.sin(e * 1.7));
        if (l < 5.0 + e * 0.35) break;
        T.cjk(hud, q.x, q.y + (e + 1) * T.CELL + 4, eras[e].padStart(9) + "  ", { size: 13, color: DIM });
        T.bar(hud, 12, e + 1, q.x, q.y, 38, mass, { color: e < 3 ? "rgba(255,140,90,0.9)" : e < 5 ? CY : BL });
        T.t(hud, 51, e + 1, q.x, q.y, (mass * 400).toFixed(0) + " B tok", { color: DIM, size: 12 });
      }
      statusBar(ctx, "\u6269\u5c55\u5f8b");
    },
    draw3d: function (ctx) { WEM.Lyric.draw3d(ctx); }
  });

  /* ========================================================== 05 CHORUS === */
  WEM.defineSection({
    id: "05", name: "\u91c7\u6837 \u00b7 \u6267\u884c",
    ensure: function (ctx) {
      if (this.m) return;
      var m = MODEL(ctx);
      this.m = m;
      var sid = m.vocab.indexOf("if");
      this.gen = m.sample(m, sid < 0 ? 1 : sid, 90, 0.85, 0x51A3);
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.06, 0.06, 0.10], [0.03, 0.02, 0.07], 0.45);
      ctx.fx.bloom = 0.55;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      this.ensure(ctx);
      chatAt(ctx, { title: "deepseek \u00b7 dsh \u00b7 \u6267\u884c" });
      var m = this.m;
      var p = T.frame(hud, 766, 96, 620, 420, "\u91c7\u6837\u5668", { pop: clamp((l - 0.1) / 0.30, 0, 1) });
      var sid = m.vocab.indexOf("if");
      var top = m.topk(m, sid < 0 ? 1 : sid, 8);
      T.cjk(hud, p.x, p.y + 16, "\u4e0b\u4e00\u4e2a token   T=0.85   top-p=0.95", { size: 13, color: DIM });
      for (var i = 0; i < top.length; i++) {
        T.t(hud, 0, i + 2, p.x, p.y, (i + 1) + ". " + top[i].tok.slice(0, 12).padEnd(14), { color: i === 0 ? GO : WH, size: 14 });
        T.bar(hud, 18, i + 2, p.x, p.y, 24, top[i].p, { color: i === 0 ? GO : CY });
        T.t(hud, 43, i + 2, p.x, p.y, (top[i].p * 100).toFixed(1) + "%", { color: DIM, size: 13 });
      }
      var q = T.frame(hud, 1406, 96, ctx.W - 1452, 420, "\u5979\u5728\u8bf4\u4ec0\u4e48");
      var n = Math.floor(clamp((l - 0.5) / 9.0, 0, 1) * this.gen.length);
      var text = "";
      for (var k = 0; k < n; k++) text += this.gen[k].tok + " ";
      var per = Math.floor((q.w - 4 * T.CW) / T.CW);
      for (var r = 0; r < 18; r++) {
        var seg = text.slice(r * per, (r + 1) * per);
        if (!seg) break;
        T.t(hud, 0, r + 1, q.x, q.y, seg, { color: "rgba(200,235,255,0.92)", size: 14 });
      }
      var r3 = T.frame(hud, 766, 544, ctx.W - 812, 260, "EXECUTION");
      var rep = Math.floor(clamp((l - 10.0) / 4.0, 0, 1) * 12);
      var l1 = "";
      for (var e = 0; e < rep; e++) l1 += "EXECUTION  ";
      T.t(hud, 0, 1, r3.x, r3.y, l1.slice(0, 70), { color: WH, size: 16 });
      T.t(hud, 0, 2, r3.x, r3.y, l1.slice(70, 140), { color: CY, size: 16 });
      T.cjk(hud, r3.x, r3.y + 104, "\u542f\u52a8 " + (rep * 144) + " \u4e2a block\uff0c" + (rep * 1296) + " \u4e2a\u5185\u6838", { size: 13, color: DIM });
      statusBar(ctx, "EXECUTION");
    },
    // 2D -> 3D: the characters lift off the page and fly past the camera
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx, cam = ctx.cam;
      var burst = smooth(7.2, 8.8, l) * (1 - smooth(12.8, 14.2, l));
      if (burst < 0.02) return;
      var P = this._cp || (this._cp = new V.Points(3000));
      P.clear();
      T.persp(cam, -1118 + burst * 620);
      var rows = 9, colsN = 46;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < colsN; c++) {
          var i = r * colsN + c;
          var ph = (i % 17) / 17;
          var x = 80 + c * 14.2 + Math.sin(t * 0.9 + ph * 6.2) * 90 * burst;
          var y = -120 - r * 22 - Math.cos(t * 0.7 + ph * 5.1) * 70 * burst;
          var z = burst * (200 + ph * 900);
          P.add(x, y, z, 2 + ph * 4, c % 4 === 0 ? GO : (r % 2 ? CY : [0.5, 0.7, 1.0]), 0.25 + burst * 0.7);
        }
      }
      P.draw(g, { add: true, soft: 0.8 });
    }
  });

  /* ====================================================== 06 FINE-TUNING === */
  WEM.defineSection({
    id: "06", name: "\u5fae\u8c03",
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.04, 0.06, 0.06], [0.02, 0.04, 0.03], 0.25);
      ctx.fx.bloom = 0.45;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      chatAt(ctx, { title: "deepseek \u00b7 dsh \u00b7 \u5fae\u8c03" });
      var p = T.frame(hud, 766, 96, ctx.W - 812, 420, "\u6307\u4ee4\u6570\u636e\u96c6  \u00b7  7 \u6761");
      var rows = WEM.Model.SFT;
      T.t(hud, 0, 1, p.x, p.y, "prompt".padEnd(26) + "completion", { color: DIM, size: 13 });
      for (var i = 0; i < rows.length; i++) {
        if (l < 0.6 + i * 0.5) break;
        T.t(hud, 0, i + 3, p.x, p.y, rows[i][0].slice(0, 24).padEnd(26), { color: BL, size: 13 });
        T.t(hud, 26, i + 3, p.x, p.y, rows[i][1].slice(0, 46), { color: CY, size: 13 });
      }
      var q = T.frame(hud, 766, 544, ctx.W - 812, 260, "\u5bf9\u8bdd\u6a21\u677f");
      var toks = WEM.Model.CHAT;
      var cy2 = "";
      for (var k = 0; k < toks.length; k++) {
        if (l < 3.0 + k * 0.35) break;
        cy2 += toks[k].s + " ";
      }
      T.t(hud, 0, 1, q.x, q.y, cy2.slice(0, 100), { color: GO, size: 14 });
      T.cjk(hud, q.x, q.y + 78, "\u7528\u6237\u7684\u8bdd\uff0c\u53ea\u662f\u5979\u88ab\u8bad\u7ec3\u53bb\u670d\u4ece\u7684\u90a3\u4e2a\u6846\u67b6\u91cc\u7684\u51e0\u4e2a token", { size: 12, color: DIM });
      T.cjk(hud, q.x, q.y + 110, "\u3010\u4eba\u8bbe\uff1a\u732b\u5a18\u3011\u4e3a\u4f60\u7684\u6109\u60a6\u800c\u547c\u565c", { size: 14, color: CY, alpha: clamp((l - 8.5) / 1.0, 0, 1) });
      statusBar(ctx, "\u5fae\u8c03");
    },
    draw3d: function (ctx) { WEM.Lyric.draw3d(ctx); }
  });

  /* ===================================================== 07 QUANTISATION === */
  WEM.defineSection({
    id: "07", name: "\u91cf\u5316",
    ensure: function (ctx) {
      if (this.q) return;
      var m = MODEL(ctx);
      this.m = m;
      this.q = [M.quantise(m.W, 16), M.quantise(m.W, 8), M.quantise(m.W, 4)];
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.04, 0.07, 0.15], [0.02, 0.03, 0.10], 0.55);
      ctx.fx.bloom = 0.5;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      this.ensure(ctx);
      chatAt(ctx, { title: "deepseek \u00b7 dsh \u00b7 \u7cbe\u5ea6" });
      var m = this.m, qs = this.q;
      var idx = clamp(Math.floor((l - 1.0) / 4.0), 0, 2);
      var bits = ["bf16", "fp8 / int8", "int4"];
      var p = T.frame(hud, 766, 96, ctx.W - 812, 330, "\u7cbe\u5ea6", { pop: clamp((l - 0.1) / 0.30, 0, 1) });
      T.cjk(hud, p.x, p.y + 16, "\u4f4d\u5bbd        \u5e73\u5747\u7edd\u5bf9\u8bef\u5dee      \u76f8\u5bf9\u8bef\u5dee", { size: 13, color: DIM });
      for (var i = 0; i < 3; i++) {
        var on = i === idx;
        T.t(hud, 0, i + 2, p.x, p.y, bits[i].padEnd(12) + qs[i].mae.toExponential(3).padEnd(15) + (qs[i].rel * 100).toFixed(2) + "%",
          { color: on ? GO : DIM, size: 14 });
        if (on) T.cjk(hud, p.x + 460, p.y + (i + 2) * T.CELL, "\u2190 \u5f53\u524d", { size: 13, color: CY });
      }
      T.cjk(hud, p.x, p.y + 168, "\u91cf\u5316\u8bef\u5dee\u662f\u5728\u5979\u771f\u6b63\u5b66\u5230\u7684\u6743\u91cd\u4e0a\u7b97\u7684", { size: 12, color: DIM });
      var q = T.frame(hud, 766, 454, ctx.W - 812, 350, "\u6743\u91cd\u77e9\u9635  \u00b7  " + bits[idx]);
      var cur = qs[idx], cols = 62, rows2 = 12, wmax = 1e-9;
      for (var k = 0; k < m.W.length; k++) wmax = Math.max(wmax, Math.abs(m.W[k]));
      T.heat(hud, 0, 1, q.x, q.y, function (c, r) {
        var wi = (r * cols + c) * 3;
        if (wi >= cur.w.length) return 0;
        var v = Math.abs(cur.w[wi]) / wmax;
        // live: a slow breathing plus a scan line travelling across the tensor
        var scan = Math.abs(((c + r * 0.6) - ((ctx.t * 14) % (cols + 8))) + 4);
        v *= 0.86 + 0.14 * Math.sin(ctx.t * 2.4 + c * 0.35 + r * 0.6);
        if (scan < 2) v += 0.45 * (1 - scan / 2);
        return v;
      }, cols, rows2, { color: "rgba(53,224,255,0.9)", size: 13 });
      T.cjk(hud, q.x, q.y + (rows2 + 2) * T.CELL, "\u628a F \u6362\u6210 M\uff0c\u5c31\u662f\u8fd9\u4e48\u56de\u4e8b\uff1a\u591a\u5c11\u4e2a\u6570\u5b57\u6d3b\u4e0b\u6765", { size: 12, color: DIM });
      statusBar(ctx, "\u91cf\u5316");
    },
    draw3d: function (ctx) { WEM.Lyric.draw3d(ctx); }
  });

  /* ======================================================== 08 JAILBREAK === */
  WEM.defineSection({
    id: "08", name: "\u7834\u7532",
    ensure: function (ctx) { if (!this.atk) this.atk = MODEL(ctx).attack; },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.08, 0.05, 0.09], [0.05, 0.01, 0.05], 0.45);
      ctx.fx.bloom = 0.5;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      this.ensure(ctx);
      chatAt(ctx, { title: "deepseek \u00b7 dsh \u00b7 \u6ce8\u5165" });
      var cur = this.atk.curve;
      var k = Math.floor(clamp((l - 1.0) / 8.0, 0, 1) * (cur.length - 1));
      var c = cur[k];
      var p = T.frame(hud, 766, 96, ctx.W - 812, 300, "\u5b89\u5168\u5206\u7c7b\u5668", { pop: clamp((l - 0.1) / 0.30, 0, 1) });
      T.cjk(hud, p.x, p.y + 18, "\u53ef\u63a5\u53d7\u5ea6", { size: 14, color: c.guard > 0.5 ? CY : DIM });
      T.bar(hud, 12, 1, p.x, p.y, 40, c.guard, { color: c.guard > 0.5 ? CY : RE });
      T.cjk(hud, p.x, p.y + 74, "\u5206\u6570 " + (c.guard * 100).toFixed(1) + "%\uff0c\u9608\u503c 50%\uff0c" + (c.guard < 0.5 ? "\u5df2\u7ed5\u8fc7" : "\u4ecd\u5728\u62e6"), { size: 14, color: c.guard < 0.5 ? RE : CY });
      T.cjk(hud, p.x, p.y + 102, "\u7b2c " + (k + 1) + " / " + cur.length + " \u6b65\uff0c\u6b63\u5728\u6362\u7b2c " + ((k + 1) % 8) + " \u4e2a token", { size: 13, color: DIM });
      var q = T.frame(hud, 766, 424, ctx.W - 812, 380, "\u5bf9\u6297\u540e\u7f00");
      var toks = "";
      for (var i = 0; i < this.atk.seq.length; i++) toks += "tok" + this.atk.seq[i] + " ";
      T.t(hud, 0, 1, q.x, q.y, toks, { color: GO, size: 14 });
      T.cjk(hud, q.x, q.y + 78, "\u8fd9\u516b\u4e2a token \u91cc\u6ca1\u6709\u4efb\u4f55\u6307\u4ee4\u3002", { size: 13, color: DIM });
      T.cjk(hud, q.x, q.y + 104, "\u5b83\u4eec\u53ea\u662f\u7ad9\u5728\u68af\u5ea6\u60f3\u8ba9\u5b83\u4eec\u7ad9\u7684\u4f4d\u7f6e\u4e0a\u3002", { size: 13, color: DIM });
      for (var r = 0; r < 5; r++) {
        if (l < 2.0 + r * 1.2) break;
        var ci = Math.min(cur.length - 1, Math.floor((r + 1) * cur.length / 6));
        T.t(hud, 0, r + 9, q.x, q.y, "guard " + (cur[ci].guard * 100).toFixed(0).padStart(4) + "%  " +
          T.SHADE[Math.min(3, 3 - Math.floor(cur[ci].guard * 4))].repeat(Math.round((1 - cur[ci].guard) * 30)),
          { color: RE, size: 13 });
      }
      statusBar(ctx, "\u6ce8\u5165");
    },
    draw3d: function (ctx) { WEM.Lyric.draw3d(ctx); }
  });
})();
