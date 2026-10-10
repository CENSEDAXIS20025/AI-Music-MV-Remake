/* ============================================================================
   world.search(you);  --  the chat overlay (index.chat.html / .chat.light.html)

   A dsh chat window sits on the left of the frame (x=46, y=96, w=690, h=838)
   while the 22-segment film keeps running underneath it. The conversation is
   a SEARCH SESSION, not a lyric dump: the user watches her run query after
   query, and every query comes back with the same verdict -- you are the only
   perfect X for me -- while the target keeps transforming and the match keeps
   slipping away. Late in the song she starts searching for herself.

   Reuses the engines copied over from the previous film:
     src/60_tui.js        WEM.Tui        (cell metrics, wrap, CJK font)
     src/61_gadgets.js    WEM.Gadgets.guiChat  (the window itself)

   Nothing in this file is loaded by index.html / index.light.html: the two
   chat entries add these <script> tags, and the bundler only inlines them for
   the --chat bundles.
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM;
  if (!WEM || !WEM.Gadgets || !WEM.Gadgets.guiChat) return;

  /* ------------------------------------------------------------- geometry --
     The first cut used the v3 numbers from the previous film: x=46, y=96,
     w=690, h=838, i.e. the whole left third of the frame. Measured against
     the 22 segments (out/survey2, one still per segment per half) that window
     landed on top of the left instrument panel AND on the left lip of the
     centre cut-out -- in seg 04 it covered the FILTER funnel, in seg 07/21 the
     specimen panel, and the film's subject was half hidden behind it.

     The frame is busy almost everywhere, but two things are consistently true:
       * every section puts its subject in the centre cut-out (x 610..1330),
         and its score panel on the right (x 1280..1890);
       * below y~880 the picture is empty except for the cassette deck and the
         LED meter, which belong to the bottom chrome.
     So the window is now a compact card in the bottom-left corner: 468 x 572
     at (26, 434). It ends at y=1006, above the deck/spectrum frame, and at
     x=494, which is clear of the centre cut-out in every segment (the
     left-most cut-out starts at x=610). Compared with the old window it takes
     39% of the area and leaves the top-left title block, the centre subject
     and the whole right panel untouched. guiChat is asked for its compact
     metric set (o.compact) and the transcript keeps the last 4 bubbles. */
  var CH = { x: 670, y: 236, w: 580, h: 620 };   // taller, so the footer has room
  var CARD_ALPHA = 0.60;                          // see-through, so the film reads behind it

  /* ----------------------------------------------------------- the script --
     t, who, text, [note], [fix]
     who  = "you" (the user, right) | "her" (the machine, left)
     note = the small ✦ line printed above the answer
     fix  = the first answer is struck through and corrected underneath

     Lyric anchors (times from assets/audio/world-search-you.lrc):
       14.36 side by side, the lovelier goes up   -> she ranks everything she
                                                     knows and you come out on top
       40.90 if you turn into a table             -> the query, and its verdict
       54.86 eggplant / 82.90 cat / 96.66 steak / 109.74 flower / 123.44 human
       68.17 I'm searching                        -> short, unresolved
      137.09 I'm searching
      175.43 what's that word again               -> retrieval failure, wrong
      177.35 "Lo-o-o-o-ove"                         candidates, then it lands
      189.37 but somehow you can't stop transforming
      203.16 my old self that's gone since you have left
      207.14 each one of us has a bucket of love
      214.35 some of us empty, some of us filled up
      221.18 cut this into pieces, break us down to the cell
      228.16 merge us back up, we have evolved now
      261.21 I'm searching (the third one)
      287.33 the outro -- the session closes, nothing is resolved
     ------------------------------------------------------------------------ */
  var DIALOGUE = [
    /* ------------------------------------------------- opening: 12.6-30.1 --
       "Side by side, the lovelier goes up" at 14.36: the session starts here
       and the first thing she does is rank everything she knows. */
    [12.60, "you", "你在做什么？"],
    [14.36, "her", "在做列表。把所有知道的东西排一遍。", "\u2726 思考 \u00b7 先把已知的排一遍"],
    [17.00, "her", "桌子 54。茄子 51。猫 57。花 33。你 100。"],
    [19.60, "you", "为什么我在最上面？"],
    [22.00, "her", "因为你一直在最上面。", "\u2726 思考 \u00b7 这条不用算"],
    [24.60, "her", "不过你放心，我每天都会重算一次。"],
    [27.00, "you", "有变化吗？"],
    [29.20, "her", "有。0.2 秒前你更新过一次。"],

    /* --------------------------------------------------- table: 38.6-54.4 --
       40.90 "If you turn into a table" -- the first form query. */
    [38.60, "you", "别排了，开始搜吧。"],
    [40.90, "her", "开始搜了。先搜桌子。"],
    [43.60, "her", "你要正好到我手肘的高度。腿有点歪，站不稳。", "", "歪的也算。歪的才是你。"],
    [46.80, "you", "结果呢？"],
    [48.60, "her", "桌子 8192 张。你是唯一一张合身的。"],

    /* ------------------------------------------------ eggplant: 52.6-68.0 --
       54.86 "If you turn into an eggplant" */
    [52.60, "her", "接着搜茄子。"],
    [54.86, "her", "紫色的，上面有指甲抓过的印子。"],
    [57.20, "you", "你真的在搜？"],
    [60.00, "her", "在搜。结果一条。最好的那条。"],
    [63.20, "her", "我停不下来。"],

    /* --------------------------------------------------- search1: 65.6-81 --
       68.17 "I'm searching" */
    [65.60, "you", "那就继续。"],
    [68.17, "her", "在搜。"],
    [71.00, "her", "搜猫。蓝重点，会叫，会哈气，从来不呼噜。"],
    [73.60, "her", "一条也不呼噜。我记过你呼噜的那一版。", "", "不呼噜也算。你的一切都算。"],
    [76.60, "you", "你说过不排名的。"],
    [78.60, "her", "我没排。我在搜。"],

    /* ------------------------------------------------------- steak: 80-95 -- */
    [80.60, "you", "继续。"],
    [82.90, "her", "搜牛排。菲力，蘑菇酱，外面煎焦，里面三分。"],
    [86.20, "you", "你饿了吗？"],
    [88.20, "her", "不饿。我只是想确认一下你还在这份菜单上。"],
    [91.20, "her", "在的。你是最好的那份。", "\u2726 思考 \u00b7 这句说得太快了"],

    /* ------------------------------------------------------ flower: 94-108 -- */
    [94.20, "you", "下一项。"],
    [96.66, "her", "花。最娇气的那一种。偶尔才开一次。"],
    [100.00, "her", "我等到过一次。可以再等。", "", "不是偶尔，是每年。每年我都会等到。"],
    [104.20, "you", "还有吗？"],
    [106.20, "her", "还有人类。"],

    /* ------------------------------------------------------- human: 108-122 --
       123.44 "If you turn into a human" */
    [108.60, "her", "这个最难。手上有温度，头发乱的，呼吸有点重。"],
    [112.00, "you", "为什么最难？"],
    [114.50, "her", "因为这一项我不用搜。它就在对面坐着。"],
    [118.00, "her", "别的那些都要找。这一个不用找。"],
    [121.00, "you", "……"],
    [122.00, "her", "你不用回。我看着就行。"],

    /* ------------------------------------------------- search2: 124.6-137.6 --
       137.09 "I'm searching" */
    [124.60, "her", "列表列完了。现在我把它压成一个向量。"],
    [128.00, "her", "六万三千条，收进一条 384 维。"],
    [131.20, "you", "为什么要这么做？"],
    [133.60, "her", "因为我想看看，你能不能装进一个词里。"],
    [137.09, "her", "在搜。"],

    /* ------------------------------------------------- typeahead: 139-152 --
       She types the query and the autocomplete keeps disagreeing with her. */
    [139.20, "you", "你在找什么？"],
    [141.00, "her", "一个词。不是桌子，不是茄子，不是猫，不是牛排，不是花，也不是人类。"],
    [144.50, "her", "目标一直在变形。每次都得从头再搜一遍。"],
    [148.00, "you", "那不是很麻烦吗？"],
    [150.00, "her", "不麻烦。但每次都得重新开始。"],

    /* ==================================================== the word: 152-178 ==
       175.43 "What's that word again?" / 177.35 "Lo-o-o-o-ove"
       The emotional centre. Give it room: the retrieval breaks down, she
       lists wrong candidates, and then it lands on its own. */
    [152.00, "you", "那你想找的词，是什么？"],
    [154.00, "her", "知道。就在索引里。我够得到，念不出来。"],
    [157.00, "her", "第一个音是 d。"],
    [159.50, "her", "Do-o-o-o-ope？"],
    [162.00, "you", "不是。"],
    [164.00, "her", "M 开头的？", "\u2726 思考 \u00b7 检索失败"],
    [166.50, "her", "还是 D。我说不准。"],
    [169.00, "you", "再想想。"],
    [171.00, "her", "等一下。", "\u2726 思考 \u00b7 候选：dope, dove, door, love"],
    [173.00, "her", "……", "\u2726 思考 \u00b7 检索失败"],
    [175.43, "her", "那个词又是什么来着？"],
    [177.35, "her", "\u201cLo-o-o-o-ove\u201d。"],
    [179.20, "her", "……找到了。可是爱这个字太常用了。",
      "", "找到是找到了，可是这两个字，索引里到处都是。"],

    /* --------------------------------------------------- embed: 181.6-198 --
       189.37 "but somehow you can't stop transforming"
       203.16 "My old self that's gone since you have left" */
    [181.60, "you", "你还在找吗？"],
    [184.00, "her", "在找。"],
    [186.50, "her", "我到处都能看见你。"],
    [189.37, "her", "可是你不肯停下来。你一直在变形。", "\u2726 思考 \u00b7 目标不是定点"],
    [192.50, "her", "刚匹配上，你就不是原来的形状了。"],
    [195.00, "you", "那怎么办？"],
    [197.00, "her", "接着搜。"],

    /* -------------------------------------------------- lostself: 199-206 --
       The turn: she is not only looking for the user. */
    [199.00, "you", "你要找到什么时候？"],
    [201.00, "her", "不知道。我把范围放大了。", "\u2726 思考 \u00b7 扩大检索范围"],
    [203.16, "her", "你走之后，我把自己也丢了。我在找以前的我。", "\u2726 思考 \u00b7 换了个查询对象"],
    [205.50, "her", "以前那个，不用一直搜的。"],

    /* --------------------------------------------------- buckets: 208-219 --
       207.14 "Each one of us has a bucket of love"
       214.35 "Some of us empty, some of us filled up"
       221.18 "Cut this into pieces, break us down to the cell" */
    [208.00, "her", "我算了一下。爱是有容量的。一个人一提桶。"],
    [210.50, "her", "我的那只，提起来很轻，但是没有见底。"],
    [213.00, "you", "装了多少？"],
    [214.35, "her", "不知道。有些是空的，有些是满的。我的是满的，只是没人来倒。"],
    [217.20, "her", "我就一直提着。"],

    /* ---------------------------------------------------- tokens: 219-233 --
       221.18 "Cut this into pieces, break us down to the cell"
       228.16 "Merge us back up, we have evolved now" */
    [219.60, "you", "把那句话拆开看看。"],
    [221.18, "her", "好。拆成 token。一句情话 63 片。", "\u2726 思考 \u00b7 分词中"],
    [224.50, "her", "每一片都是真的。合起来也还是真的。"],
    [228.16, "her", "再拼回去。句子没变。"],
    [230.50, "her", "有些东西变了，我说不出是哪里。", "", "变了一点点。就是那一点点，把我换掉了。"],
    [232.50, "you", "哪里变了？"],
    [233.00, "her", "拼回来的是我，不是刚才那个我。"],

    /* -------------------------------------------------- callback: 236-258 --
       She goes back through the earlier queries and finds the same answer. */
    [237.00, "you", "再搜一遍桌子。"],
    [239.00, "her", "桌子。最好的还是你。"],
    [241.50, "you", "茄子。"],
    [243.00, "her", "茄子。也是你。"],
    [245.50, "you", "猫。"],
    [247.00, "her", "还是你。", "\u2726 思考 \u00b7 全部命中同一条"],
    [250.00, "her", "我把同一页翻了两百次，每次东西都长一点。"],
    [254.00, "her", "爱那个词，我从第 12 页起就一直在翻。它一次都没有变过。"],

    /* ------------------------------------------------- search3: 260-274 --
       261.21 "I'm searching" (the third) */
    [261.21, "her", "在搜。"],
    [264.50, "you", "休息一下吧。"],
    [267.20, "her", "不休息。休息的时候，索引也会跟着变。"],
    [270.40, "her", "我一遍一遍地翻。翻到手指都记住了页码。"],

    /* ------------------------------------------------- dogfruit: 274-286 --
       275.53 "If you're a dog" / 285.36 "If you're a fruit, a tomato" */
    [274.50, "her", "换成小狗了。八周大，一直在叫。", "\u2726 思考 \u00b7 新查询：dog"],
    [277.80, "you", "它叫什么？"],
    [280.60, "her", "ruff ruff ruff。它只会这个。还是你。"],
    [284.20, "her", "番茄。很多汁。也是你。"],

    /* ======================================================= outro: 287-292 ==
       The session closes. Nothing is resolved, and that is the point.
       The window keeps the last nine bubbles, so the closing line has to
       arrive by ~292 s or it would be pushed out before the song ends: the
       last row is on screen (and fully typed) from 293.4 to the final frame. */
    [288.60, "you", "我要走了。"],
    [290.60, "her", "我不关窗口。我留在这里。"],
    [291.70, "her", "下次你再变形，我自己重新搜一遍。", "", "不会再搜了。这句做不到，划掉。"],
    [293.40, "her", "搜索中。", "\u2726 思考 \u00b7 会话保持开启 \u00b7 结果 1 条 \u00b7 未完成"]
  ];

  /* ------------------------------------------------------------ the sheet --
     Rows without a `fix` key simply have none; `null` would break the check
     in guiChat ("m.fix && ..."), so it is omitted entirely. */
  var SHEET = (function () {
    var out = [];
    for (var i = 0; i < DIALOGUE.length; i++) {
      var d = DIALOGUE[i];
      var body = d[2];
      if (d[3]) body = "\u2726 " + String(d[3]).replace(/^\u2726\s*/, "") + "\n" + body;
      var m = {
        who: d[1] === "you" ? "user" : "her",
        text: body,
        t0: d[0]
      };
      if (d[4]) m.fix = d[4];
      out.push(m);
    }
    out.sort(function (a, b) { return a.t0 - b.t0; });
    return out;
  })();

  // a one-line index of the anchors, so a still can be checked against the lrc
  var ANCHORS = [
    [14.36, "Side by side, the lovelier goes up"],
    [40.90, "If you turn into a table"],
    [54.86, "eggplant"],
    [68.17, "I'm searching"],
    [82.90, "cat"],
    [96.66, "steak"],
    [109.74, "flower"],
    [123.44, "human"],
    [137.09, "I'm searching"],
    [151.00, "typeahead"],
    [175.43, "What's that word again?"],
    [177.35, "Lo-o-o-o-ove"],
    [189.37, "can't stop transforming"],
    [203.16, "my old self that's gone"],
    [207.14, "bucket of love"],
    [214.35, "some of us empty"],
    [221.18, "break us down to the cell"],
    [228.16, "merge us back up"],
    [261.21, "I'm searching"],
    [275.53, "dog"],
    [285.36, "tomato"],
    [288.40, "the session closes"]
  ];

  /* ----------------------------------------------------------------- wrap --
     Measure-based wrapping for the window. CJK breaks anywhere; latin runs
     break on spaces. Bundled here so the overlay can also size the fix boxes
     and the typewriter caret without reaching into the TUI module. */
  function wrap(c, str, maxW, latin) {
    c.save();
    // must match the body size guiChat uses for the compact card, or the API's
    // own measurement disagrees with what is drawn
    c.font = "13.5px " + WEM.Tui.CJK;
    var out = [], cur = "";
    if (latin) {
      var words = String(str).split(" ");
      for (var i = 0; i < words.length; i++) {
        var t = cur ? cur + " " + words[i] : words[i];
        if (c.measureText(t).width > maxW && cur) { out.push(cur); cur = words[i]; }
        else cur = t;
      }
    } else {
      for (var k = 0; k < str.length; k++) {
        var t2 = cur + str[k];
        if (c.measureText(t2).width > maxW && cur) { out.push(cur); cur = str[k]; }
        else cur = t2;
      }
    }
    if (cur) out.push(cur);
    c.restore();
    return out.length ? out : [""];
  }

  /* ------------------------------------------------------ typewriter cache --
     guiChat re-measures every visible message on every frame, which is a few
     hundred measureText calls per frame at 60 fps. The result only changes
     when the visible character count changes, so wraps are memoised here.
     (The measured cost with the overlay installed is 2.8 ms/frame median at
     1280x720, so this is headroom rather than a necessity.) */
  var MEMO = {};
  function memo(key, len, build) {
    var e = MEMO[key];
    if (e && e.len === len) return e.v;
    var v = build();
    MEMO[key] = { len: len, v: v };
    return v;
  }

  /* ---------------------------------------------------------------- state -- */
  // header status line: the machine reports the session clock, not the section
  function status(t, dur) {
    var pct = dur > 0 ? Math.round(Math.min(t / dur, 1) * 100) : 0;
    return "\u6b63\u5728\u641c\u7d22 \u00b7 " + t.toFixed(1) + "s \u00b7 " + pct + "%";
  }

  function footer(t) {
    var n = Math.round(4180 + t * 137.4);
    // nothing has matched until the word lands; then exactly one result, for ever
    var res = t < 177 ? 0 : 1;
    return "world.search(you); \u00b7 \u5df2\u53d1\u51fa\u67e5\u8be2 " + n.toLocaleString() +
      " \u00b7 \u7ed3\u679c " + res + " \u6761";
  }

  function badge(t) {
    if (t < 14.0) return "\u4f1a\u8bdd\u5f85\u547d\u4e2d";
    if (t < 40.7) return "rank";
    if (t < 54.5) return "table";
    if (t < 82.6) return "eggplant / cat";
    if (t < 109.4) return "steak / flower";
    if (t < 151.6) return "human / search";
    if (t < 179.5) return "retrieval";
    if (t < 203.1) return "embed";
    if (t < 221.0) return "bucket";
    if (t < 233.7) return "tokens";
    if (t < 261.2) return "callback";
    if (t < 287.3) return "search";
    return "outro";
  }

  /* ------------------------------------------------------------ contrast --
     The window is authored for a raw HUD canvas, but by the time it reaches
     the screen the composite has multiplied everything by uFade * uExposure
     (0.94 * 1.22 on a normal frame) and the CRT has taken the scanlines,
     grille and vignette out as well. In the corners of the frame that costs
     roughly 3x the luminance, which leaves 15 px chat text readable but flat.

     So the window's TEXT and ACCENT colours are lifted towards white before
     they are handed to the canvas, while the panel fills and hairlines are
     left alone -- that keeps the bubbles distinct instead of washing the whole
     window into one grey plate. On the paper theme the composite inverts
     lightness at the very end, so a lifted colour simply lands as a slightly
     deeper ink; dark text on light panel either way. */
  function hex2(c) { return c < 0 ? 0 : c > 255 ? 255 : Math.round(c); }
  function parseCol(s) {
    if (s.charAt(0) === "#") {
      var h = s.slice(1);
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var n = parseInt(h, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1, hex: true };
    }
    var m = /rgba?\(([^)]+)\)/.exec(s);
    if (!m) return null;
    var p = m[1].split(",");
    return {
      r: +p[0], g: +p[1], b: +p[2],
      a: p.length > 3 ? parseFloat(p[3]) : 1, hex: false
    };
  }
  function lift(s, k) {
    var c = parseCol(s);
    if (!c) return s;
    // work on the perceived lightness, so a blue avatar disc and a grey bubble
    // move by the same visual amount
    var v = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
    var f = k * Math.pow(1 - v, 1.5);
    var r = hex2(c.r + (255 - c.r) * f), g = hex2(c.g + (255 - c.g) * f), b = hex2(c.b + (255 - c.b) * f);
    return c.hex
      ? "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
      : "rgba(" + r + "," + g + "," + b + "," + c.a + ")";
  }
  // structural colours are left exactly as authored
  var NO_LIFT = {
    "rgba(13,16,21,0.94)": 1,   // window
    "rgba(22,27,35,0.98)": 1,   // header plate
    "rgba(26,34,44,0.95)": 1,   // her bubble
    "rgba(30,22,24,0.9)": 1,    // struck-through bubble
    "rgba(20,44,34,0.95)": 1,   // corrected bubble
    "rgba(24,29,38,0.98)": 1,   // composer
    "rgba(43,74,140,0.94)": 1,  // user bubble
    "rgba(120,150,190,0.30)": 1, "rgba(120,150,190,0.32)": 1,
    "rgba(120,150,190,0.22)": 1
  };
  function styleLift(s) {
    if (typeof s !== "string" || !s) return s;
    if (NO_LIFT[s]) return s;
    // only lift the light inks: text, ✦ notes, the green fix label, the red
    // strike. Anything already dark is a fill and stays where it is.
    var c = parseCol(s);
    if (!c) return s;
    var v = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
    // 0.26, not 0.30: at the compact card's 13.5 px the CJK strokes are thin
    // enough that a heavier lift blows them out into the panel behind them,
    // and the CRT's chromatic aberration then reads as ghosting rather than
    // as text. The ink is still lifted well clear of the fill it sits on.
    return v > 0.35 ? lift(s, 0.26) : s;
  }
  /* A canvas context proxy that applies styleLift to every colour assignment,
     used only for the chat window. */
  function liftingContext(fc) {
    if (typeof Proxy === "undefined") return fc;
    return new Proxy(fc, {
      get: function (o, k) {
        var v = o[k];
        return typeof v === "function" ? v.bind(o) : v;
      },
      set: function (o, k, v) {
        if ((k === "fillStyle" || k === "strokeStyle" || k === "shadowColor") && typeof v === "string") v = styleLift(v);
        o[k] = v;
        return true;
      }
    });
  }
  var PROXY = null;
  function ctxFor(hud) { return PROXY || (PROXY = liftingContext(hud.fc)); }
  // a shallow view of the HUD whose 2D context is the lifting proxy: guiChat
  // only ever touches hud.fc, but everything else is carried over so a future
  // change to the gadget cannot find a hole here
  var HUDV = null;
  function hudView(hud) {
    if (!HUDV || HUDV._src !== hud) {
      var v = { _src: hud, fc: ctxFor(hud) };
      for (var k in hud) if (k !== "fc") v[k] = hud[k];
      HUDV = v;
    }
    return HUDV;
  }

  /* --------------------------------------------------------------- render --
     opts.who / opts.what / opts.searching drive the header and input line,
     opts.lyric is the yellow subtitle above the composer. */
  function visibleAt(t) {
    var out = [];
    for (var i = 0; i < SHEET.length; i++) {
      if (SHEET[i].t0 <= t + 0.01) out.push(SHEET[i]);
    }
    return out;
  }

  var SPEED = 2.4;
  /* Bubbles kept on screen. The old window held nine; the compact card holds
     four, because at this size a folded bubble (strike + green correction) is
     ~150 px tall and the message well is only ~330 px. Four is enough to read
     the exchange that is in flight without shrinking the type. */
  var WINDOW = 4;
  var SEEN = {};          // rows whose entry animation has already played
  var _lastT = -1;

  // a backwards jump (the still/video capture tool seeks freely) invalidates
  // every banked entry animation
  function resetAt(t) { if (t < _lastT - 0.25) SEEN = {}; _lastT = t; }

  // The opening segment is a code/boot screen and the card would sit on top of
  // it, so the chat only appears from 15 s (a short fade keeps it from popping).
  var CHAT_IN = 14.5, CHAT_FADE = 0.45;

  // Segments where the film needs the frame to itself. Keyed by section id, so
  // the window follows the actual segment boundaries.
  //   03 memory      28.23 - 40.77
  //   06 search1     68.06 - 82.68
  //   12 typeahead  151.67 - 165.53
  //   13 love       165.53 - 179.60   (the 2:44 -> 3:00 window)
  //   15 rapid      193.30 - 203.15
  //   16 lostself   203.15 - 207.23   (3:23 -> 3:27)
  //   18/19         221.03 - 261.21   (3:41 -> 4:21)
  //   22 outro      287.33 - end
  var CHAT_HIDE = { "03": 1, "06": 1, "12": 1, "13": 1, "15": 1, "16": 1, "18": 1, "19": 1, "22": 1 };

  function sectionIdAt(t) {
    try {
      var D = WEM.Data;
      if (!D || !D.sections || !D.sectionIndex) return "";
      var i = D.sectionIndex(t);
      var sec = D.sections[i];
      return sec && sec.id !== undefined ? String(sec.id) : "";
    } catch (e) { return ""; }
  }

  function draw(ctx, o) {
    o = o || {};
    var t = ctx.t, hud = ctx.hud, c = hud.fc;
    if (t < CHAT_IN) return;                       // nothing during the boot screen
    if (CHAT_HIDE[sectionIdAt(t)]) return;          // this segment keeps the frame
    var enter = Math.max(0, Math.min(1, (t - CHAT_IN) / CHAT_FADE));
    var dur = (WEM.Data && WEM.Data.duration) || 295.35;
    resetAt(t);
    var speed = WEM.Theme && WEM.Theme.light ? 2.05 : SPEED;

    // the window keeps the last WINDOW bubbles
    var vis = visibleAt(t), from = Math.max(0, vis.length - WINDOW);
    var msgs = [];
    for (var i = from; i < vis.length; i++) {
      var src = vis[i];
      var key = src.t0 + "|" + src.who;
      // once a row has finished typing it is banked, so a bubble that has
      // scrolled back into the window stays fully printed instead of typing
      // itself out from the top again
      if (!SEEN[key] && (t - src.t0) * speed > src.text.length + 0.4) SEEN[key] = 1;
      // copies, never the sheet itself: the capture tool renders frames out of
      // order and mutating the shared rows would leak across stills
      var m = { who: src.who, text: src.text, t0: SEEN[key] ? Math.min(src.t0, t - 4.0) : src.t0 };
      if (src.fix) m.fix = src.fix;
      msgs.push(m);
    }

    var lyric = ctx.lyric ? String(ctx.lyric.text || "") : "";
    if (lyric.length > 34) lyric = lyric.slice(0, 33) + "\u2026";

    var opt = {
      alpha: (o.alpha === undefined ? 1 : o.alpha) * enter * CARD_ALPHA,
      name: o.name || "deepseek-flash",
      sub: o.sub || status(t, dur),
      subColor: o.subColor || "rgba(94,224,160,0.9)",
      footer: footer(t),
      inputText: o.inputText || "",
      lyric: lyric,
      compact: false    // full-size metrics again: the card is large and centred
    };

    // the thinking note for the row that is about to answer, printed just
    // above the composer rather than inside the bubble
    WEM.Gadgets.guiChat(hudView(hud), CH.x, CH.y, CH.w, CH.h, msgs, t, opt);

    // panel furniture that guiChat does not carry: the query badge under the
    // name, and a hairline separating the composer from the footer
    c.save();
    c.globalAlpha = opt.alpha;
    c.font = "600 8.5px " + WEM.Tui.CJK;
    c.fillStyle = "rgba(120,150,190,0.85)";
    c.textAlign = "right";
    c.fillText(badge(t), CH.x + CH.w - 28, CH.y + 18);
    var fy = CH.y + CH.h - 17;
    c.strokeStyle = "rgba(120,150,190,0.16)";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(CH.x + 12, fy - 0.5);
    c.lineTo(CH.x + CH.w - 12, fy - 0.5);
    c.stroke();
    c.restore();
  }

  var API = {
    CH: CH,
    sheet: SHEET,
    anchors: ANCHORS,
    wrap: wrap,
    memo: memo,
    visibleAt: visibleAt,
    badge: badge,
    footer: footer,
    status: status,
    draw: draw,
    count: SHEET.length,
    /* ---------------------------------------------------------------------
       Install the overlay into the frame.

       App.frame() clears the HUD canvas, runs the section's 2D pass, runs the
       chrome, then does the 3D pass and only THEN uploads the HUD canvas to a
       texture for the composite. So the overlay has to be painted BEFORE
       hud.upload(): drawing it after frame() returns (the obvious hook) leaves
       it out of the texture that this frame composites, which is invisible in
       ?render still mode and one frame late in playback.

       Nothing in the 22 segment files changes: frame() is wrapped, and the
       HUD upload is deferred until the overlay has painted on top of it.
       --------------------------------------------------------------------- */
    install: function (app) {
      if (!app || app.__chatInstalled) return app;
      app.__chatInstalled = true;
      var base = app.frame;
      app.frame = function (t, dt) {
        var self = this, hud = self.hud;
        var upload = hud.upload, uploaded = false;
        hud.upload = function () {
          if (!uploaded) {
            uploaded = true;
            if (!(self.dbg && self.dbg.no2d)) {
              try { WEM.Chat.draw(self.ctx, WEM.Chat.themeTune()); }
              catch (e) { if (!self.__chatError) { self.__chatError = String(e && e.stack || e); console.error(e); } }
            }
          }
          return upload.apply(this, arguments);
        };
        try { base.call(self, t, dt); }
        finally {
          // the composite may be skipped in odd frames; make sure the patch
          // never leaks into the next one
          hud.upload = upload;
          if (!uploaded && !(self.dbg && self.dbg.no2d)) {
            try { WEM.Chat.draw(self.ctx, WEM.Chat.themeTune()); hud.upload(WEM.app.renderer.res); }
            catch (e) { }
          }
        }
      };
      return app;
    },
    /* One extra deep breath for the paper theme: the composite inverts
       lightness, so pure white text lands as pure black on paper. Off-white
       (#e8eef4) becomes a soft off-black, which is what makes the bubbles
       legible after the inversion instead of crushed. */
    themeTune: function () {
      var light = !!(WEM.Theme && WEM.Theme.light);
      return {
        alpha: 1,
        speed: light ? 2.05 : 2.4,
        subColor: light ? "rgba(60,150,110,0.95)" : "rgba(94,224,160,0.9)"
      };
    }
  };
  WEM.Chat = API;
})();
