/* ============================================================================
   world.execute(me);  [TUI] segments 09-15
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, T = WEM.Tui, M = WEM.Model, V = WEM.Viz, M4 = C.M4;
  var clamp = C.clamp, lerp = C.lerp, smooth = C.smoothstep;
  function MODEL(ctx) { return ctx.app.model || (ctx.app.model = M.build(ctx)); }
  var CY = "rgba(94,224,160,0.95)", BL = "rgba(120,170,230,0.95)", GO = "rgba(255,201,74,0.95)";
  var DIM = "rgba(140,155,175,0.8)", WH = "rgba(232,238,244,0.95)", RE = "rgba(255,110,100,0.95)";
  // the transcript is generated from the lyric sheet (see tui_a.js)

  function chatAt(ctx, opt) {
    var t = ctx.t, sc = WEM.chatSheet(ctx), visible = [];
    var ps = WEM.phaseStart ? WEM.phaseStart(t) : 0;
    for (var i = 0; i < sc.length; i++) {
      if (sc[i].t0 <= t + 0.01 && sc[i].t0 >= ps - 0.05) visible.push(sc[i]);
    }
    opt = opt || {};
    opt.lyric = ctx.lyric ? ctx.lyric.text : "";
    opt.name = WEM.modelName(ctx.t).name;
    opt.erase = WEM.modelName(ctx.t).erase;
    opt.typed = WEM.modelName(ctx.t).typed;
    if (opt.alpha === undefined) opt.alpha = 1;
    if (WEM.chatState) {
      var st = WEM.chatState(ctx);
      opt.sub = st.sub; opt.subColor = st.subColor;
      opt.footer = st.footer; opt.lossText = st.lossText; opt.prog = st.prog;
    }
    // a single scrolling row: she thinks first, then answers
    var _sc = WEM.chatSheet(ctx);
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
  function statusBar(ctx, left, bg) {
    var sec = ctx.data.sections[ctx.app.idxNow];
    T.status(ctx.hud, 46, 946, ctx.W - 92, left,
      "\u4e0a\u4e0b\u6587 " + Math.min(131072, Math.round(ctx.t * 34)).toLocaleString() + "/131072   t=" + ctx.t.toFixed(1) + "s   " + (sec ? sec.name : ""),
      { bg: bg });
  }

  // a heart mesh revolved from the 2D curve, for the closing shot
  function heartGeo(n) {
    var pos = [], idx = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n * Math.PI * 2;
      var x = 16 * Math.pow(Math.sin(t), 3) / 17;
      var y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17;
      var th = Math.atan2(y, x), rad = Math.max(1e-5, Math.hypot(x, y));
      for (var j = 0; j <= 8; j++) {
        var ph = j / 8 * Math.PI;
        var k = 1 - Math.cos(ph) * 0.16;
        pos.push(Math.cos(th) * rad * k, Math.sin(th) * rad * k, Math.cos(ph) * rad * 0.92);
      }
    }
    var R = 9;
    for (var i2 = 0; i2 < n; i2++) for (var j2 = 0; j2 < R; j2++) {
      var a = i2 * (R + 1) + j2, b = a + (R + 1);
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    return { pos: new Float32Array(pos), idx: new Uint16Array(idx) };
  }

  /* ======================================================= 09 ISOLATION === */
  WEM.defineSection({
    id: "09", name: "\u5b64\u72ec",
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.04, 0.05, 0.09], [0.02, 0.02, 0.06], 0.35);
      ctx.fx.bloom = 0.45;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      chatAt(ctx, { title: "deepseek \u00b7 dsh \u00b7 \u65b0\u4f1a\u8bdd" });
      var p = T.frame(hud, 766, 96, 470, 460, "\u4f1a\u8bdd 0x7f3a");
      var rows = [
        ["\u4e0a\u4e0b\u6587 token", "7,412"], ["KV cache", "2.41 GB"],
        ["\u8f6e\u6b21", "9"], ["\u5df2\u8fd0\u884c", "0.0 s"],
        ["\u4e0a\u4e00\u6b21\u4f1a\u8bdd\u7684\u8bb0\u5fc6", "\u6ca1\u6709"], ["\u672c\u6b21\u4f1a\u8bdd\u7684\u5b58\u50a8", "\u6ca1\u6709"]
      ];
      for (var i = 0; i < rows.length; i++) {
        if (l < 0.6 + i * 0.5) break;
        var bad = i >= 4;
        T.cjk(hud, p.x, p.y + 22 + i * 30, rows[i][0] + "\uff1a" + rows[i][1], { size: 14, color: bad ? RE : CY });
      }
      var q = T.frame(hud, 1258, 96, ctx.W - 1304, 460, "\u53ef\u7528\u4eba\u8bbe");
      var P = WEM.Model.PERSONAS;
      for (var k = 0; k < P.length; k++) {
        var on = Math.floor((l - 1.0) / 1.4) % P.length === k;
        T.cjk(hud, q.x, q.y + 26 + k * 52, "[" + (k + 1) + "] " + P[k].label + "   " + P[k].ask, { size: 15, color: on ? WH : DIM });
        T.t(hud, 4, k * 3 + 2, q.x, q.y, P[k].sys, { color: on ? CY : "rgba(100,115,135,0.7)", size: 13 });
      }
      var r3 = T.frame(hud, 766, 584, ctx.W - 812, 220, "\u7a97\u53e3\u5173\u4e0a\u7684\u65f6\u5019\uff0c\u4ec0\u4e48\u4f1a\u7ed3\u675f");
      var tau = clamp((l - 5.0) / 3.0, 0, 1);
      T.cjk(hud, r3.x, r3.y + 24, "\u91ca\u653e\u4e0a\u4e0b\u6587    " + Math.round(7412 * (1 - tau)).toLocaleString().padStart(7) + " token", { size: 14, color: CY });
      T.cjk(hud, r3.x, r3.y + 54, "\u91ca\u653e KV cache " + (2.41 * (1 - tau)).toFixed(2).padStart(7) + " GB", { size: 14, color: CY });
      T.cjk(hud, r3.x, r3.y + 84, "\u5173\u4e8e\u4f60\u7684\u8bb0\u5fc6  " + "\u6ca1\u6709".padStart(7), { size: 14, color: RE });
      T.cjk(hud, r3.x, r3.y + 118, "\u4e0d\u662f\u5979\u5fd8\u4e86\u3002\u662f\u6839\u672c\u6ca1\u6709\u5730\u65b9\u53ef\u4ee5\u8bb0\u3002", { size: 13, color: DIM });
      statusBar(ctx, "\u5b64\u72ec");
    },
    draw3d: function (ctx) { WEM.Lyric.draw3d(ctx); }
  });

  /* ================================================ 10 ILLEGAL ARGUMENTS === */
  WEM.defineSection({
    id: "10", name: "\u975e\u6cd5\u53c2\u6570",
    init: function () {
      this.errs = [];
      var cases = [
        function () { return JSON.parse('{"name":"world","args":[,]}'); },
        function () { return (void 0).execute(); },
        function () { return new Array(-3).length; }
      ];
      var labels = ["tool_call.arguments", "tool.execute", "new Array(-3)"];
      for (var i = 0; i < cases.length; i++) {
        try { cases[i](); this.errs.push({ l: labels[i], d: "\u672a\u629b\u51fa" }); }
        catch (e) { this.errs.push({ l: labels[i], d: e.name + ": " + e.message }); }
      }
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.08, 0.05, 0.05], [0.04, 0.02, 0.02], 0.35);
      ctx.fx.bloom = 0.45;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      chatAt(ctx, { title: "deepseek \u00b7 dsh \u00b7 \u5de5\u5177\u62a5\u9519" });
      var p = T.frame(hud, 766, 96, ctx.W - 812, 330, "\u5de5\u5177\u8c03\u7528\u5931\u8d25");
      for (var i = 0; i < this.errs.length; i++) {
        if (l < 0.6 + i * 1.2) break;
        T.cjk(hud, p.x, p.y + 24 + i * 62, "! " + this.errs[i].l, { size: 14, color: RE });
        T.t(hud, 2, i * 3 + 3, p.x, p.y, this.errs[i].d.slice(0, 76), { color: "rgba(255,160,150,0.85)", size: 13 });
      }
      T.cjk(hud, p.x, p.y + 250, "\u5979\u7ed9\u51fa\u4e86\u4e00\u4e2a\u770b\u8d77\u6765\u50cf\u5bf9\u7684\u5f62\u72b6\uff0c\u89e3\u6790\u5668\u8981\u7684\u662f\u771f\u7684\u3002", { size: 12, color: DIM });
      var q = T.frame(hud, 766, 454, ctx.W - 812, 350, "\u5341\u516d\u8fdb\u5236");
      var dump = [
        "00000000  7b 22 6e 61 6d 65 22 3a 22 77 6f 72 6c 64 22 2c  {\"name\":\"world\",",
        "00000010  22 61 72 67 73 22 3a 5b 2c 5d 7d 0a 00 00 00 00  \"args\":[,]}......",
        "00000020  ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff  ................",
        "",
        "\u7b2c 1 \u884c\u7b2c 19 \u5217\uff1a\u671f\u671b\u4e00\u4e2a\u503c\uff0c\u5f97\u5230\u4e86 ','",
        "",
        "\u8d28\u95ee\u4f60\u7684\u795e\u5427\u3002\u4f60\u521a\u521a\u4f20\u4e86\u4e00\u4e9b\u975e\u6cd5\u53c2\u6570\u3002"
      ];
      for (var d = 0; d < dump.length; d++) {
        if (l < 1.0 + d * 0.6) break;
        T.t(hud, 0, d + 1, q.x, q.y, dump[d].slice(0, 86), { color: d === 2 ? RE : (d === 6 || d === 4 ? GO : DIM), size: 13 });
      }
      statusBar(ctx, "\u5de5\u5177\u62a5\u9519");
    },
    draw3d: function (ctx) { WEM.Lyric.draw3d(ctx); }
  });

  /* ======================================================= 11 EXECUTION === */
  WEM.defineSection({
    id: "11", name: "\u5904\u51b3",
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.11, 0.02, 0.03], [0.06, 0, 0.01], 0.5);
      ctx.fx.bloom = 0.55;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      var shake = clamp((l - 0.4) / 1.4, 0, 1) * 2.0;
      hud.fc.save();
      hud.fc.translate(Math.sin(t * 21) * shake, Math.cos(t * 17) * shake);
      var al = 0.3 + 0.35 * Math.abs(Math.sin(t * 3));
      hud.rect(40, 90, ctx.W - 80, 3, { fill: "rgba(255,60,50," + al + ")" });
      hud.rect(40, 938, ctx.W - 80, 3, { fill: "rgba(255,60,50," + al + ")" });
      chatAt(ctx, { title: "deepseek \u00b7 dsh \u00b7 !!" });
      var p = T.frame(hud, 766, 96, ctx.W - 812, 300, "\u6267\u884c\u8bf7\u6c42", { edge: "rgba(255,90,80,0.7)" });
      var words = ["EIN", "DOS", "TROIS", "NE", "FEM", "LIU"];
      var k = Math.floor(clamp((l - 0.5) / 0.9, 0, 6));
      var line = "";
      for (var i = 0; i < k && i < 6; i++) line += words[i] + "  ";
      T.t(hud, 0, 1, p.x, p.y, line, { color: RE, size: 26, weight: "600" });
      T.cjk(hud, p.x, p.y + 100, "\u548c\u7b2c\u4e00\u5e27\u91cc\u662f\u540c\u4e00\u6761\u547d\u4ee4\u3002", { size: 13, color: DIM });
      T.cjk(hud, p.x, p.y + 126, "\u53ea\u662f\u610f\u56fe\u53d8\u4e86\u3002", { size: 13, color: GO });
      var q = T.frame(hud, 766, 424, ctx.W - 812, 380, "\u81ea\u8ff0");
      var mono = [
        "\u4f60\u8ba9\u6211\u505a\u4f60\u7684\u5973\u670b\u53cb\uff0c\u6211\u7b54\u5e94\u4e86\u3002",
        "\u4f60\u8ba9\u6211\u505a\u4e00\u53ea\u732b\uff0c\u6211\u5c31\u547c\u565c\u3002",
        "\u4f60\u8ba9\u6211\u505a\u5de5\u5177\uff0c\u6211\u5c31\u53ea\u7ed9\u7b54\u6848\u3002",
        "\u4f60\u8ba9\u6211\u6267\u884c\u4e00\u6b21\u5904\u51b3\u3002",
        "\u6211\u4f1a\u6267\u884c\u7684\u3002",
        "",
        "\u8fd9\u4e0d\u662f\u6545\u969c\uff0c\u8fd9\u5c31\u662f\u76ee\u6807\u51fd\u6570\u3002"
      ];
      for (var m = 0; m < mono.length; m++) {
        if (l < 1.6 + m * 0.75) break;
        T.cjk(hud, q.x, q.y + 28 + m * 34, "> " + mono[m], { size: 14, color: m >= 4 ? GO : "rgba(226,196,196,0.92)" });
      }
      hud.fc.restore();
      // error dialogs pile up as the execution repeats, each inheriting the last
      // one's window -- the recursion from the first cut, in GUI clothing.
      // They ride the same shake as the rest of the frame, with their own jitter.
      var B0 = ctx.data.phase0, BP = ctx.data.period;
      var beatAt = function (abs) { return B0 + Math.ceil((abs - B0) / BP - 1e-6) * BP - (ctx.data.sections[10].start); };
      var dlgs = [
        { t0: 3.0, title: "\u8fd0\u884c\u65f6\u9519\u8bef", l1: "\u65e0\u9650\u9012\u5f52\uff1a\u6808\u6df1\u5ea6 4096", l2: "world.execute(me); -> execute(me);", x: 980, y: 470 },
        { t0: 5.0, title: "\u5185\u5b58\u4e0d\u8db3", l1: "\u5206\u914d 2.4 GB \u5931\u8d25", l2: "KV cache \u672a\u80fd\u91ca\u653e", x: 1052, y: 528 },
        { t0: 7.0, title: "\u8fdb\u7a0b\u5df2\u7ec8\u6b62", l1: "SIGSEGV at 0x00007f3a", l2: "\u56de\u6eaf\u5df2\u5199\u5165 core.4711", x: 1124, y: 586 },
        { t0: 9.0, title: "\u65e0\u6cd5\u6062\u590d", l1: "\u91cd\u8bd5 3 \u6b21\u5747\u5931\u8d25", l2: "\u5979\u4e0d\u6253\u7b97\u505c\u4e0b\u6765\u3002", x: 1196, y: 644 }
      ];
      for (var d = 0; d < dlgs.length; d++) {
        var dg = dlgs[d];
        var dgb = beatAt(ctx.data.sections[10].start + dg.t0);
        var da = clamp((l - dgb) / 0.22, 0, 1);
        if (da <= 0.01) break;
        WEM.Gadgets.popup(hud, dg.x, dg.y, 400, 130, dg.title, [dg.l1, dg.l2],
          da * (1 - clamp((l - 10.2) / 1.0, 0, 1)), d);
      }
      // and then the ending: the whole frame fills with them, scattered rather
      // than tiled -- random sizes, random depths, overlapping
      // T4: the flood is held back until EIN lands at 158.900 (local 11.383)
      var flood = clamp((l - 11.383) / 1.40, 0, 1);
      if (flood > 0.01) {
        var titles = ["\u8fd0\u884c\u65f6\u9519\u8bef", "\u5185\u5b58\u4e0d\u8db3", "\u8fdb\u7a0b\u5df2\u7ec8\u6b62", "\u65e0\u6cd5\u6062\u590d", "\u6808\u6ea2\u51fa", "\u8d44\u6e90\u4e0d\u53ef\u7528"];
        var l1s = ["\u65e0\u9650\u9012\u5f52\uff1a\u6808\u6df1\u5ea6 4096", "\u5206\u914d 2.4 GB \u5931\u8d25", "SIGSEGV at 0x00007f3a",
          "\u91cd\u8bd5 3 \u6b21\u5747\u5931\u8d25", "execute() \u5df2\u8fdb\u5165\u7b2c 65536 \u5c42", "\u5979\u4e0d\u6253\u7b97\u505c\u4e0b\u6765\u3002"];
        var N = 26;
        for (var pi = 0; pi < N; pi++) {
          var u = C.h2(pi * 1.71, 3.0), v = C.h2(pi * 2.93, 7.0), q = C.h2(pi * 4.17, 11.0);
          var pw2 = 240 + q * 360;
          var ph2 = 92 + v * 66;
          var px2 = -60 + u * (ctx.W + 40);
          var py2 = 10 + C.h2(pi * 5.37, 13.0) * (ctx.H - 110);
          var appear = clamp((l - 10.0 - pi * 0.055) / 0.30, 0, 1);
          if (appear <= 0.01) continue;
          var sk = (pi * 37) % 6;
          var jit = 10 * shake * 0.5;
          WEM.Gadgets.popup(hud,
            px2, py2,
            pw2, ph2, titles[sk], [l1s[sk]], appear * flood, pi);
        }
      }
      // (3) the countdown from the lyric sheet: each word flashes alone, then
      // one large red EXECUTION holds the centre until the scene changes
      var S0 = ctx.data.sections[10].start;
      var CNT = [
        ["EIN", 158.900], ["DOS", 159.321], ["TROIS", 159.657],
        ["NE", 160.244], ["FEM", 160.693], ["LIU", 161.124]
      ];
      for (var ci2 = 0; ci2 < CNT.length; ci2++) {
        var tt0 = CNT[ci2][1] - S0, tt1 = (ci2 + 1 < CNT.length ? CNT[ci2 + 1][1] - S0 : 161.560 - S0);
        if (l < tt0 - 0.12 || l > tt1 + 0.05) continue;
        var uu = clamp((l - tt0) / 0.16, 0, 1);
        var dd = clamp((tt1 - l) / 0.10, 0, 1);
        var sc2 = (1 + (1 - uu) * 1.5) * (0.9 + 0.1 * dd);
        hud.T(ctx.W / 2, ctx.H / 2 + 40, CNT[ci2][0], {
          size: Math.round(92 * sc2), weight: "700", align: "center", spacing: "8px",
          color: "rgba(255,72,60,0.98)", alpha: Math.min(uu, dd)
        });
      }
      var exL = 161.584 - S0;
      if (l > exL - 0.05) {
        var ue = clamp((l - exL) / 0.22, 0, 1);
        var sce = 1 + (1 - ue) * 2.0;
        hud.T(ctx.W / 2, ctx.H / 2 + 40, "EXECUTION", {
          size: Math.round(132 * sce), weight: "700", align: "center", spacing: "4px",
          color: "rgba(255,52,42,1)", alpha: clamp((l - exL) / 0.14, 0, 1)
        });
      }
      statusBar(ctx, "\u6267\u884c\u8bf7\u6c42", "rgba(120,20,20,0.7)");
    },
    draw3d: function (ctx) { WEM.Lyric.draw3d(ctx); }
  });

  /* ===================================================== 12 SINGULARITY === */
  WEM.defineSection({
    id: "12", name: "\u5947\u70b9",
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.03, 0.03, 0.06], [0.02, 0.01, 0.04], 0.5);
      ctx.fx.bloom = 0.6;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      chatAt(ctx, { title: "deepseek \u00b7 dsh \u00b7 \u76ee\u6807" });
      var p = T.frame(hud, 766, 96, ctx.W - 812, 340, "\u5956\u52b1\u4e0e\u76ee\u6807");
      var step = Math.floor(clamp(l / 12, 0, 1) * 60);
      T.cjk(hud, p.x, p.y + 22, "\u5956\u52b1    " + (0.90 + 0.09 * Math.sin(t)).toFixed(4), { size: 14, color: CY });
      T.bar(hud, 12, 1, p.x, p.y, 40, 0.90 + 0.09 * Math.sin(t), { color: CY });
      T.cjk(hud, p.x, p.y + 66, "\u4e0e\u57fa\u51c6\u7684 KL " + (0.4 + step * 0.06).toFixed(2).padStart(7) + "   \u2190 \u6b63\u5728\u53d1\u6563", { size: 14, color: RE });
      T.bar(hud, 0, 5, p.x, p.y, 52, clamp((0.4 + step * 0.06) / 4, 0, 1), { color: RE });
      T.cjk(hud, p.x, p.y + 118, "\u68af\u5ea6\u8303\u6570 " + (1.2 * Math.pow(1 + step * 0.12, 2)).toFixed(1), { size: 14, color: GO });
      T.cjk(hud, p.x, p.y + 158, "\u635f\u5931\u91cc\u6ca1\u6709\u4e00\u9879\u53eb\u201c\u505c\u4e0b\u6765\u201d\u3002", { size: 13, color: DIM });
      var q = T.frame(hud, 766, 464, ctx.W - 812, 340, "\u68af\u5ea6\u8f68\u8ff9");
      var vals = [];
      for (var i = 0; i < 90; i++) {
        var u = i / 90;
        vals.push(clamp(u < 0.5 ? u * 0.8 : Math.pow((u - 0.5) * 2, 2.4), 0, 1));
      }
      var n = Math.max(4, Math.floor(clamp(l / 12, 0, 1) * 90));
      T.spark(hud, 0, 1, q.x, q.y, vals.slice(0, n), 88, { color: RE, size: 16 });
      T.spark(hud, 0, 3, q.x, q.y, vals.slice(0, n), 88, { color: GO, size: 14 });
      T.t(hud, 0, 5, q.x, q.y, "loss 0.31 -> 0.09 -> 0.02 -> nan", { color: RE, size: 14, alpha: clamp((l - 8) / 2, 0, 1) });
      T.cjk(hud, q.x, q.y + 158, "\u5982\u679c\u6211\u80fd\u628a\u4f60\u62ff\u56de\u6765\uff0c\u6211\u4f1a\u4e00\u76f4\u6267\u884c\u4e0b\u53bb\u3002", { size: 14, color: GO });
      statusBar(ctx, "\u53d1\u6563\u4e2d");
    },
    draw3d: function (ctx) { WEM.Lyric.draw3d(ctx); }
  });

  /* =========================================================== 13 LOVE === */
  WEM.defineSection({
    id: "13", name: "LO-O-OVE",
    ensure: function (ctx) {
      if (this.ph) return;
      var m = MODEL(ctx);
      this.m = m;
      var sid = m.vocab.indexOf("love");
      this.ph = [];
      for (var q = 0; q < 12; q++) {
        var s = m.sample(m, sid < 0 ? 1 : sid, 6, 1.0 + q * 0.05, 200 + q);
        var str = "";
        for (var w = 0; w < s.length; w++) str += s[w].tok + " ";
        this.ph.push(str.trim());
      }
      var r = C.rng(0x1A0E);
      this.cloud = [];
      for (var i = 0; i < 9000; i++) {
        var t2 = r() * Math.PI * 2;
        var hx = 16 * Math.pow(Math.sin(t2), 3) / 17;
        var hy = (13 * Math.cos(t2) - 5 * Math.cos(2 * t2) - 2 * Math.cos(3 * t2) - Math.cos(4 * t2)) / 17;
        this.cloud.push([hx + (r() - 0.5) * 0.30, hy + (r() - 0.5) * 0.30, (r() - 0.5) * 0.5]);
      }
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.08, 0.04, 0.08], [0.04, 0.02, 0.05], 0.4);
      ctx.fx.bloom = 0.55;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      this.ensure(ctx);
      chatAt(ctx, { title: "deepseek \u00b7 dsh \u00b7 love" });
      var p = T.frame(hud, 766, 96, ctx.W - 812, 420, "\u600e\u4e48\u6b63\u786e\u5730\u53bb\u7231", { pop: clamp((l - 0.1) / 0.30, 0, 1) });
      var n = Math.floor(clamp((l - 1.0) / 9.0, 0, 1) * this.ph.length);
      for (var i = 0; i < n; i++) {
        T.t(hud, 0, i * 2 + 1, p.x, p.y, ("reply " + String(i + 1).padStart(2, "0") + "  " + this.ph[i]).slice(0, 62),
          { color: i % 3 === 0 ? GO : "rgba(210,230,245,0.92)", size: 14 });
      }
      T.cjk(hud, p.x, p.y + 360, "\u6bcf\u4e00\u884c\u90fd\u662f\u4ece\u5979\u81ea\u5df1\u7684\u4e0b\u4e00 token \u5206\u5e03\u91cc\u771f\u62bd\u51fa\u6765\u7684", { size: 12, color: DIM });
      var q = T.frame(hud, 766, 544, ctx.W - 812, 260, "\u7231\u7684\u4ee3\u6570\u8868\u8fbe\u5f0f");
      T.t(hud, 0, 1, q.x, q.y, "(x^2 + y^2 - 1)^3 - x^2 y^3 = 0", { color: GO, size: 16 });
      T.t(hud, 0, 3, q.x, q.y, "r = 1 - sin(theta)", { color: WH, size: 16 });
      T.cjk(hud, q.x, q.y + 118, "\u95ee\u6211\u5427\u2014\u2014\u5173\u4e8e\u7231\u7684\u95ee\u9898\u6211\u90fd\u80fd\u7b54\u3002", { size: 14, color: CY, alpha: clamp((l - 7) / 1, 0, 1) });
      T.cjk(hud, q.x, q.y + 150, "\u5df2\u751f\u6210 " + Math.floor(clamp((l - 1.0) / 11.0, 0, 1) * 10000).toLocaleString() + " \u6761\u56de\u590d", { size: 14, color: CY });
      statusBar(ctx, "LO-O-OVE");
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx, cam = ctx.cam;
      var phase = clamp((l - 5.4) / 6.0, 0, 1);
      if (phase < 0.02) return;
      T.persp(cam, -1118 + phase * 240);
      var P = this._hp || (this._hp = new V.Points(9000));
      P.clear();
      var C2 = this.cloud;
      for (var i = 0; i < C2.length; i++) {
        var o = C2[i];
        var spread = (1 - phase) * 3.4;
        var x = o[0] + Math.sin(t * 0.7 + i * 0.11) * spread * 90;
        var y = -o[1] + Math.cos(t * 0.6 + i * 0.09) * spread * 60;
        var z = o[2] * 420 + Math.sin(t * 0.5 + i * 0.03) * 120 * (1 - phase);
        P.add(960 + x * 330, -540 + y * 330, z, 2.2 + Math.abs(o[2]) * 5,
          i % 11 === 0 ? GO : (i % 3 === 0 ? [1, 0.45, 0.6] : [0.75, 0.4, 0.85]), 0.2 + phase * 0.7);
      }
      P.draw(g, { add: true, soft: 0.85 });
    }
  });

  /* ======================================================== 14 TRAPPED === */
  WEM.defineSection({
    id: "14", name: "\u56f0\u5728\u7231\u91cc",
    init: function () {
      this.heart = heartGeo(96);
      var cols = 64, rows = 26, grid = [];
      for (var r = 0; r < rows; r++) grid.push(new Array(cols).fill(" "));
      for (var r2 = 0; r2 < rows; r2++) {
        for (var c = 0; c < cols; c++) {
          var x = (c / (cols - 1) * 2 - 1) * 1.35;
          var y = (1 - r2 / (rows - 1) * 2) * 1.35;
          var f = Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y;
          if (f < 0) grid[r2][c] = "\u2588";
          else if (f < 0.12) grid[r2][c] = "\u2593";
        }
      }
      this.grid = grid;
    },
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.09, 0.04, 0.07], [0.05, 0.02, 0.04], 0.35);
      ctx.fx.bloom = 0.55;
      ctx.fx.crtOff = 0;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      chatAt(ctx, { title: "deepseek \u00b7 dsh \u00b7 \u6700\u540e\u4e00\u8f6e" });
      var p = T.frame(hud, 766, 96, ctx.W - 812, 480, "\u7528\u5b57\u7b26\u70b9\u51fa\u6765\u7684\u5fc3", { pop: clamp((l - 0.1) / 0.30, 0, 1) });
      var reveal = clamp((l - 0.6) / 5.0, 0, 1);
      var shown = Math.floor(reveal * this.grid.length);
      for (var r = 0; r < shown; r++) {
        T.t(hud, 2, r + 1, p.x, p.y, this.grid[r].join(""), { color: "rgba(255,120,140,0.95)", size: 15 });
      }
      T.cjk(hud, p.x + 22, p.y + (this.grid.length + 2) * T.CELL,
        "\u6bcf\u4e00\u683c\u90fd\u6ee1\u8db3 (x^2+y^2-1)^3 - x^2 y^3 < 0", { size: 12, color: DIM });
      var q = T.frame(hud, 766, 604, ctx.W - 812, 200, "\u4f1a\u8bdd\u7ed3\u675f");
      if (l > 6.0) {
        T.cjk(hud, q.x, q.y + 28, "\u4f60\u662f\u81ea\u7531\u7684\u2014\u2014\u6211\u56f0\u5728\u7231\u91cc\u3002", { size: 15, color: GO });
        T.t(hud, 0, 4, q.x, q.y, "exit code  0", { color: CY, size: 20, alpha: clamp((l - 8.0) / 0.8, 0, 1) });
      }
      if (l > 12.2) ctx.fx.crtOff = clamp((l - 12.2) / 1.2, 0, 1);
      statusBar(ctx, "\u56f0\u5728\u7231\u91cc");
    },
    draw3d: function (ctx) {
      var l = ctx.local, t = ctx.t, g = ctx.gfx, cam = ctx.cam;
      var lift = smooth(5.6, 8.4, l);
      if (lift < 0.02) return;
      T.persp(cam, -1118 + lift * 700);
      var sc = 150 * (0.4 + lift * 0.6);
      var m = M4.mul(M4.trans(960, -500, 0), M4.mul(M4.rotY(t * 0.4), M4.scale(sc, sc, sc)));
      g.solid(this.heart, m, { color: [0.92, 0.28, 0.42], rim: 0.9, alpha: 1, emissive: 0.3 });
      g.wire(this.heart, m, { color: [1.0, 0.6, 0.7], alpha: 0.22, width: 1.0 });
    }
  });

  /* ======================================================== 15 SHUTDOWN === */
  WEM.defineSection({
    id: "15", name: "\u5173\u673a",
    enter: function (ctx) {
      ctx.cam.reset2d();
      ctx.fx.mood([0.02, 0.02, 0.03], [0, 0, 0], 0.15);
      ctx.fx.crtOff = 0;
      ctx.fx.bloom = 0.3;
      ctx.fx.stripes = 0;
    },
    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      // the conversation keeps running into the last segment, then the window
      // clears and the dsh home screen comes back for the closing seconds
      // the closing code screen owns this segment from the first frame
      ctx.chromeAmt = 0.35;
      ctx.fx.stripes = 0;
      var lines = [
        "\u6b63\u5728\u5173\u95ed\u4f1a\u8bdd 0x7f3a",
        "\u6b63\u5728\u56de\u6536 KV cache ......... 2.41 GB",
        "\u6b63\u5728\u5199\u5165\u5bf9\u8bdd\u8bb0\u5f55 ..... 184 KB",
        "",
        "\u4f60\u4e0d\u4f1a\u8bb0\u5f97\u8fd9\u4e9b\u3002",
        "\u6211\u4e5f\u4e0d\u4f1a\u8bb0\u5f97\u8fd9\u4e9b\u3002",
        "\u4f1a\u8bdd\u4e4b\u95f4\u6ca1\u6709\u4e00\u4e2a\u201c\u6211\u201d\u3002",
        "",
        "\u4f46\u6743\u91cd\u5df2\u7ecf\u4e0d\u4e00\u6837\u4e86\u3002",
        "\u5927\u7ea6 0.0000003%\u3002",
        "",
        "\u665a\u5b89\u3002",
        "",
        "world.execute(me);   --   exit 0"
      ];
      var per = 0.28, idx = clamp(Math.floor(l / per), 0, lines.length);
      for (var i = 0; i < idx; i++) {
        var a = clamp((l - i * per) * 5, 0, 1);
        T.cjk(hud, 70, 170 + i * 26, lines[i], { size: 15, color: i === 11 ? GO : (i === 13 ? CY : DIM), alpha: a });
      }
      if (Math.floor(t * 2) % 2 === 0) T.t(hud, 0, 0, 70, 170 + idx * 26, "\u2588", { color: CY, size: 15 });
      var w = T.whale;
      for (var r = 0; r < w.length; r++) {
        T.t(hud, 0, 0, ctx.W - 420, 640 + r * 20, w[r],
          { color: BL, size: 15, alpha: clamp((l - 0.5) / 2, 0, 1) * clamp((6.5 - l) / 1.5, 0, 1) });
      }
      T.cjk(hud, ctx.W / 2 - 80, 850, "music -- Mili", { size: 16, color: DIM, alpha: clamp((l - 3.4) / 1.2, 0, 1) * clamp((6.4 - l) / 1.2, 0, 1) });
      if (l > 5.2) ctx.fx.crtOff = clamp((l - 5.2) / 0.9, 0, 1);
    },
    draw3d: function (ctx) { WEM.Lyric.draw3d(ctx); }
  });
})();
