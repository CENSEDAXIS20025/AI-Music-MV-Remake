import fs from "node:fs";
const p = "src/sections4/tui_a.js";
let s = fs.readFileSync(p, "utf8");

const startAnchor = `    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      var on = clamp((l - 0.1) / 1.4, 0, 1);
      ctx.fx.crtOn = on === 1 ? 1 : E.outQuart(on);`;
const endAnchor = `      statusBar(ctx, "\\u5f00\\u673a");
    },
    draw3d: function (ctx) { WEM.Lyric.draw3d(ctx); }
  });`;
const i0 = s.indexOf(startAnchor);
const i1 = s.indexOf(endAnchor);
if (i0 < 0 || i1 < 0) { console.log("MARKERS", i0, i1); process.exit(1); }

const body = `    draw2d: function (ctx) {
      var hud = ctx.hud, l = ctx.local, t = ctx.t;
      var on = clamp((l - 0.1) / 1.4, 0, 1);
      ctx.fx.crtOn = on === 1 ? 1 : E.outQuart(on);

      // ---- T3: the opening title owns the frame from 15.000 --------------
      if (t >= 15.0) {
        var rv = clamp((t - 15.0) / 2.5, 0, 1);
        var tgt = "world.execute(me);", o1 = "";
        var gl = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>/\\\\|[]{}()";
        for (var qi = 0; qi < tgt.length; qi++) {
          o1 += (rv > qi / tgt.length + 0.04) ? tgt[qi]
              : gl[Math.floor(C.h2(qi * 7.3, Math.floor(t * 26)) * gl.length)];
        }
        hud.fc.save(); hud.fc.font = "700 96px " + T.FONT;
        var w1 = hud.fc.measureText(tgt).width; hud.fc.restore();
        hud.T((ctx.W - w1) / 2 + 200, 300, o1, { size: 96, weight: "700", spacing: "4px",
          color: rv > 0.97 ? WH : CY, alpha: clamp((t - 15.0) / 0.4, 0, 1) });
        statusBar(ctx, "\\u5f00\\u673a");
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
      var SPLIT = 6.42;                       // CRT opens on OBJECT CREATION
      var shown = Math.floor(clamp((t - 0.22) / 0.40, 0, 1) * 15);
      var c0 = hud.fc;
      if (t < SPLIT) {
        c0.save();
        c0.fillStyle = "rgba(150,165,185,0.85)"; c0.font = "12px " + T.FONT;
        c0.fillText("dsh \\u00b7 cold boot", 120, 74);
        c0.fillText("t=" + t.toFixed(2) + "s", ctx.W - 180, 74);
        c0.strokeStyle = "rgba(120,150,190,0.20)"; c0.lineWidth = 1;
        c0.beginPath(); c0.moveTo(120, 86); c0.lineTo(ctx.W - 120, 86); c0.stroke();
        for (var bi = 0; bi < BOOT.length && bi < shown; bi++) {
          var tag = BOOT[bi][0], txt = BOOT[bi][1];
          var by = 126 + bi * 27;
          var tc = tag === "WARN" ? GO : (tag === ".." ? "rgba(150,165,185,0.75)" : GR);
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
        statusBar(ctx, "\\u51b7\\u542f\\u52a8");
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
        statusBar(ctx, "\\u5f00\\u673a");
        return;
      }

      // ---- the panel wipe: left GUI, right TUI ---------------------------
      var wipe = clamp((t - SPLIT - 0.55) / 0.45, 0, 1);
      var DIVX = 760;
      var lw = E.outQuart(wipe) * DIVX;                  // left panel grows out
      var rw = E.outQuart(wipe) * (ctx.W - DIVX);        // right panel grows out

      // the TUI side
      if (rw > 20) {
        var p = T.frame(hud, DIVX + 6, 96, ctx.W - DIVX - 52, 400, "\\u7cfb\\u7edf\\u81ea\\u68c0");
        var LOG = [
          ["\\u7535\\u6e90\\u7ebf", "\\u5df2\\u63a5\\u901a", "230 V"], ["\\u7535\\u6e90", "\\u6b63\\u5e38", "8 x 3.3 kW"],
          ["\\u52a0\\u901f\\u5361", "\\u6b63\\u5e38", "8192 \\u5f20"], ["NVLink", "\\u6b63\\u5e38", "\\u5168\\u4e92\\u8fde"],
          ["\\u6570\\u636e\\u5206\\u7247", "\\u5df2\\u6302\\u8f7d", "4.0 T token"], ["\\u5206\\u8bcd\\u5668", "\\u6b63\\u5e38", "\\u8bcd\\u8868 128000"],
          ["PROTECTION", "\\u5df2\\u52a0\\u8f7d", "\\u5206\\u7c7b\\u5668 + \\u7b56\\u7565"], ["\\u53c2\\u6570", "\\u521d\\u59cb\\u5316", "N(0, 0.006)"]
        ];
        for (var i = 0; i < LOG.length; i++) {
          if (t < SPLIT + 0.9 + i * 0.30) break;
          T.cjk(hud, p.x, p.y + 16 + i * 22, "[" + (i + 1) + "] " + LOG[i][0] + "   " + LOG[i][1] + "   " + LOG[i][2],
            { size: 14, color: LOG[i][0] === "PROTECTION" ? GO : CY });
        }
        var q = T.frame(hud, DIVX + 6, 524, ctx.W - DIVX - 52, 300, "\\u8bbe\\u5907\\u9065\\u6d4b");
        var bands = ctx.bands;
        T.t(hud, 0, 1, q.x, q.y, "GPU \\u5360\\u7528", { color: DIM, size: 13 });
        T.spark(hud, 12, 1, q.x, q.y, bands, 62, { color: "rgba(53,224,255,0.95)" });
        T.t(hud, 0, 3, q.x, q.y, "\\u529f\\u8017 W ", { color: DIM, size: 13 });
        T.spark(hud, 12, 3, q.x, q.y, bands.map(function (v, i2) { return v * (0.5 + 0.5 * Math.sin(i2 * 1.7)); }), 62, { color: GO });
        T.t(hud, 0, 5, q.x, q.y, "\\u663e\\u5b58 GB", { color: DIM, size: 13 });
        T.spark(hud, 12, 5, q.x, q.y, bands.map(function (v) { return 0.4 + v * 0.5; }), 62, { color: BL });
      }

      // the GUI side: the dsh home screen, not yet a conversation
      if (lw > 20) {
        dshHome(hud, 46, 96, Math.min(690, lw - 52), 838, t);
      }

      // the seam between them
      if (wipe > 0.02) {
        c0.save();
        c0.fillStyle = "rgba(120,170,230," + 0.5 * wipe + ")";
        c0.fillRect(DIVX - 1, 60, 2, ctx.H - 130);
        c0.fillStyle = "rgba(53,224,255," + 0.18 * wipe + ")";
        c0.fillRect(DIVX - 4, 60, 8, ctx.H - 130);
        c0.restore();
      }
      statusBar(ctx, "\\u5f00\\u673a");
    },
    draw3d: function (ctx) { WEM.Lyric.draw3d(ctx); }
  });`;

s = s.slice(0, i0) + body + s.slice(i1 + endAnchor.length);

// the dsh home screen, a helper used by segment 01 and by the ending
const helper = `
  /* ---------------------------------------------------------------------
     The dsh home screen: the logo, the tagline, the workspace row and the
     composer with its checkpoint chip. Segment 01 shows it before the first
     conversation, and the film returns to it once the run is over.
     --------------------------------------------------------------------- */
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
    c.fillStyle = "rgba(238,245,252,0.98)"; c.font = "600 26px " + CJK;
    c.fillText("\\u63a2\\u7d22\\u672a\\u81f3\\u4e4b\\u5883", cx - 26, ly + LS + 46);
    var tw = c.measureText("\\u63a2\\u7d22\\u672a\\u81f3\\u4e4b\\u5883").width;
    c.fillStyle = "rgba(70,110,190,0.95)";
    var bxx = cx - 26 + tw / 2 + 10;
    if (c.roundRect) { c.beginPath(); c.roundRect(bxx, ly + LS + 28, 58, 22, 6); c.fill(); }
    else c.fillRect(bxx, ly + LS + 28, 58, 22);
    c.fillStyle = "rgba(214,228,244,0.95)"; c.font = "12px " + CJK;
    c.fillText("\\u9884\\u89c8\\u7248", bxx + 29, ly + LS + 43);

    // the workspace row
    c.textAlign = "left";
    c.fillStyle = "rgba(170,185,205,0.9)"; c.font = "15px " + CJK;
    c.fillText("\\u25a2  \\u9009\\u62e9\\u5de5\\u4f5c\\u533a", x + 34, ly + LS + 96);

    // the composer
    var byy = ly + LS + 116, bh = 92;
    c.fillStyle = "rgba(30,38,50,0.95)";
    if (c.roundRect) { c.beginPath(); c.roundRect(x + 24, byy, w - 48, bh, 12); c.fill(); }
    else c.fillRect(x + 24, byy, w - 48, bh);
    c.strokeStyle = "rgba(120,150,190,0.25)"; c.lineWidth = 1;
    if (c.roundRect) { c.beginPath(); c.roundRect(x + 24, byy, w - 48, bh, 12); c.stroke(); }
    c.fillStyle = "rgba(140,155,175,0.85)"; c.font = "15px " + CJK;
    c.fillText("\\u63cf\\u8ff0\\u4f60\\u60f3\\u8981\\u6784\\u5efa\\u7684\\u5185\\u5bb9\\uff0c/ \\u8c03\\u7528\\u6307\\u4ee4\\uff0c@ \\u2026",
      x + 44, byy + 34);
    c.fillStyle = "rgba(170,185,205,0.8)"; c.font = "17px " + CJK;
    c.fillText("+", x + 48, byy + 70);
    c.fillText("@", x + 84, byy + 70);
    c.fillStyle = "rgba(200,214,230,0.9)"; c.font = "13px " + T.FONT;
    c.textAlign = "right";
    c.fillText("ckpt-000000", x + w - 84, byy + 70);
    c.fillStyle = "rgba(53,120,220,0.95)";
    c.beginPath(); c.arc(x + w - 52, byy + 62, 17, 0, Math.PI * 2); c.fill();
    c.fillStyle = "rgba(240,246,252,0.98)"; c.font = "16px " + CJK;
    c.fillText("\\u2191", x + w - 52, byy + 68);
    c.textAlign = "left";
    c.restore();
  }

`;
const anchor = "  WEM.chatSheet = sheet;";
if (!s.includes(anchor)) { console.log("MISS chatSheet anchor"); process.exit(1); }
s = s.replace(anchor, helper + anchor);
fs.writeFileSync(p, s);
console.log("T1+T2: boot listing, CRT split and the dsh home screen");
