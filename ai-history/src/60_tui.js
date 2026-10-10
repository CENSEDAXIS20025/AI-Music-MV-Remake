/* ============================================================================
   world.execute(me);  [TUI]  --  terminal toolkit
   Box-drawing panels, block-character plots, and the dsh-style chat window.
   The chat is the training log: when she gets a line wrong it is struck
   through and the corrected line is appended underneath.
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core;
  var clamp = C.clamp, lerp = C.lerp;
  var BLOCKS = "\u2581\u2582\u2583\u2584\u2585\u2586\u2587\u2588";     // ▁▂▃▄▅▆▇█
  var SHADE = "\u2591\u2592\u2593\u2588";                                // ░▒▓█
  var FONT = '"Cascadia Mono",Consolas,"DejaVu Sans Mono",monospace';
  var CJK = '"Microsoft YaHei UI","Microsoft YaHei","PingFang SC","Noto Sans SC",' + FONT;

  var Tui = {
    CELL: 18,       // character cell height
    CW: 10.9,       // character cell width (monospace 18px)
    SHADE: SHADE,
    FONT: FONT,
    CJK: CJK,

    /* ---- pixel-aligned perspective camera -------------------------------
       With fov 0.9 rad at z = -1118 the plane z=0 projects 1:1 onto the
       1920x1080 pixel grid (y negated for the y-up world), so 3D geometry can
       be placed in the same coordinates the HUD uses. */
    persp: function (cam, z, yaw) {
      cam.mode = "persp"; cam.fov = 0.9;
      cam.pos = [960, -540, z === undefined ? -1118 : z];
      cam.target = [960, -540, 0];
      cam.up = [0, 1, 0];
      cam.update();
    },

    // ---- a framed panel with a title sitting inside the top border ----
    frame: function (hud, x, y, w, h, title, o) {
      o = o || {};
      var edge = o.edge || "rgba(120,150,175,0.55)";
      var bg = o.bg === null ? null : (o.bg || "rgba(6,9,13,0.72)");
      var c = hud.fc;
      c.save();
      // panels can scale in instead of just appearing
      if (bg) hud.rect(x, y, w, h, { fill: bg });
      c.strokeStyle = edge;
      c.lineWidth = o.lw || 1.6;
      c.font = (o.size || 18) + "px " + FONT;
      c.fillStyle = edge;
      var cols = Math.max(2, Math.round(w / Tui.CW));
      var rows = Math.max(1, Math.round(h / Tui.CELL));
      c.fillText("\u250c" + "\u2500".repeat(cols - 2) + "\u2510", x, y + Tui.CELL - 4);
      c.fillText("\u2514" + "\u2500".repeat(cols - 2) + "\u2518", x, y + rows * Tui.CELL - 4);
      for (var r = 1; r < rows; r++) {
        c.fillText("\u2502", x, y + r * Tui.CELL + Tui.CELL - 4);
        c.fillText("\u2502", x + (cols - 1) * Tui.CW, y + r * Tui.CELL + Tui.CELL - 4);
      }
      if (title) {
        c.fillStyle = o.titleColor || "rgba(232,238,244,0.92)";
        c.font = "600 13px " + CJK;
        c.fillText(" " + title + " ", x + 14, y + Tui.CELL - 3);
      }
      c.restore();
      return { x: x + 14, y: y + Tui.CELL + 4, w: w - 28, h: h - Tui.CELL - 12, cols: cols, rows: rows };
    },

    t: function (hud, col, row, x0, y0, str, o) {
      o = o || {};
      hud.T(x0 + col * Tui.CW, y0 + row * Tui.CELL, str, {
        size: o.size || 15, color: o.color || "rgba(200,215,230,0.92)",
        alpha: o.alpha === undefined ? 1 : o.alpha, weight: o.weight, spacing: o.spacing,
        font: o.font
      });
    },

    // CJK text placed at a pixel position (not on the character grid)
    cjk: function (hud, x, y, str, o) {
      o = o || {};
      hud.T(x, y, str, {
        size: o.size || 15, color: o.color || "rgba(222,232,242,0.95)",
        alpha: o.alpha === undefined ? 1 : o.alpha, font: CJK, weight: o.weight
      });
    },

    bar: function (hud, col, row, x0, y0, len, frac, o) {
      o = o || {};
      var n = Math.round(clamp(frac, 0, 1) * len);
      hud.T(x0 + col * Tui.CW, y0 + row * Tui.CELL,
        "\u2588".repeat(n) + "\u2591".repeat(Math.max(0, len - n)),
        { size: o.size || 15, color: o.color || "rgba(94,224,160,0.95)", alpha: o.alpha === undefined ? 1 : o.alpha });
    },

    spark: function (hud, col, row, x0, y0, values, len, o) {
      o = o || {};
      var step = values.length / len, out = "";
      for (var i = 0; i < len; i++) {
        var v = values[Math.min(values.length - 1, Math.floor(i * step))];
        out += BLOCKS[Math.min(7, Math.floor(clamp(v, 0, 1) * 7.999))];
      }
      hud.T(x0 + col * Tui.CW, y0 + row * Tui.CELL, out, { size: o.size || 15, color: o.color || "rgba(53,224,255,0.95)", alpha: o.alpha === undefined ? 1 : o.alpha });
    },

    heat: function (hud, col, row, x0, y0, get, cols, rows, o) {
      o = o || {};
      for (var r = 0; r < rows; r++) {
        var line = "";
        for (var c = 0; c < cols; c++) line += SHADE[Math.min(3, Math.floor(clamp(get(c, r), 0, 1) * 3.999))];
        hud.T(x0 + col * Tui.CW, y0 + (row + r) * Tui.CELL, line, {
          size: o.size || 14, color: o.color || "rgba(53,224,255,0.9)",
          alpha: (o.alpha === undefined ? 1 : o.alpha) * (o.fade ? (1 - r / rows * 0.5) : 1)
        });
      }
    },

    /* --------------------------------------------------------------- chat --
       msgs: [{who:"user"|"her", text, fix?, t0}]
       A message with `fix` is first shown as written, then struck through and
       corrected in place -- which is what a training step looks like. */
    chat: function (hud, x, y, w, h, msgs, t, o) {
      o = o || {};
      var c = hud.fc;
      var inner = Tui.frame(hud, x, y, w, h, o.title || "deepseek \u00b7 dsh", { edge: "rgba(90,130,180,0.6)" });
      var rowY = inner.y + 2;
      var bottom = y + h - 62;
      for (var i = 0; i < msgs.length; i++) {
        var m = msgs[i];
        var shown = clamp((t - m.t0) * (o.speed || 2.4), 0, 1);
        if (shown <= 0) continue;
        // word-wrap by measurement, so CJK and latin both fit
        var isUser = m.who === "user";
        var body = m.text.slice(0, Math.max(1, Math.ceil(m.text.length * shown)));
        var fixOn = m.fix && t > m.t0 + 1.5;
        var wrapped = Tui.wrap(c, body, inner.w - 96, isUser);
        var hgt = Math.max(1, wrapped.length) * 21 + 8 + (fixOn ? Tui.wrap(c, m.fix, inner.w - 96, isUser).length * 21 + 6 : 0);
        if (rowY + hgt > bottom) {
          // drop the oldest block instead of overflowing the panel
          msgs.splice(0, 1); i--; rowY = inner.y + 2; continue;
        }
        var lx = inner.x + 46;
        // speaker chip
        hud.rect(inner.x, rowY - 2, 38, 20, {
          fill: isUser ? "rgba(38,54,80,0.9)" : "rgba(16,44,48,0.9)",
          stroke: isUser ? "rgba(130,160,205,0.5)" : "rgba(53,224,255,0.5)"
        });
        Tui.cjk(hud, inner.x + 8, rowY + 13, isUser ? "\u4f60" : "\u5979",
          { size: 13, color: isUser ? "rgba(170,195,230,0.95)" : "rgba(94,224,160,0.95)" });
        var col = isUser ? "rgba(214,226,240,0.96)" : "rgba(222,238,246,0.96)";
        if (fixOn) col = "rgba(150,132,138,0.85)";
        c.save();
        c.font = "15px " + CJK;
        c.fillStyle = col;                 // rect() leaves its own fillStyle behind
        for (var l = 0; l < wrapped.length; l++) c.fillText(wrapped[l], lx, rowY + 14 + l * 21);
        if (fixOn) {
          // strike the wrong line through
          c.strokeStyle = "rgba(255,110,100,0.9)";
          c.lineWidth = 1.6;
          for (var l2 = 0; l2 < wrapped.length; l2++) {
            var wd = c.measureText(wrapped[l2]).width;
            c.beginPath();
            c.moveTo(lx, rowY + 9 + l2 * 21);
            c.lineTo(lx + wd, rowY + 9 + l2 * 21);
            c.stroke();
          }
        }
        c.restore();
        rowY += Math.max(1, wrapped.length) * 21 + 10;
        if (fixOn) {
          var cw = Tui.wrap(c, m.fix, inner.w - 108, isUser);
          hud.rect(lx - 6, rowY - 6, inner.w - 88, cw.length * 21 + 10, { fill: "rgba(12,40,30,0.55)" });
          c.save();
          c.font = "15px " + CJK;
          c.fillStyle = "rgba(120,240,170,0.96)";
          for (var l3 = 0; l3 < cw.length; l3++) c.fillText(cw[l3], lx - 2, rowY + 10 + l3 * 21);
          c.restore();
          Tui.cjk(hud, lx - 44, rowY + 10, "\u21b3", { size: 15, color: "rgba(120,240,170,0.9)" });
          Tui.cjk(hud, inner.x + inner.w - 62, rowY + 10, "\u5df2\u4fee\u6b63",
            { size: 11, color: "rgba(120,240,170,0.8)" });
          rowY += cw.length * 21 + 12;
        }
        rowY += 4;
      }
      // lyric subtitle above the input box
      if (o.lyric) {
        Tui.cjk(hud, inner.x + 4, bottom + 18, "\u266a " + o.lyric, { size: 15, color: "rgba(255,201,74,0.92)" });
      }
      // input line
      var iy = y + h - 40;
      hud.rect(x + 10, iy - 6, w - 20, 32, { fill: "rgba(14,20,28,0.95)", stroke: "rgba(120,150,190,0.4)" });
      Tui.cjk(hud, x + 22, iy + 15, ">", { size: 15, color: "rgba(94,224,160,0.95)" });
      var blink = Math.floor(t * 2) % 2 === 0;
      Tui.cjk(hud, x + 40, iy + 15, (o.inputText || "") + (blink ? "\u2588" : " "), { size: 15, color: "rgba(232,238,244,0.95)" });
      Tui.cjk(hud, x + w - 130, iy + 15, o.hint || "enter \u53d1\u9001", { size: 12, color: "rgba(140,155,175,0.7)" });
    },

    // measure-based wrapping; CJK breaks anywhere, latin on spaces
    wrap: function (c, str, maxW, isLatin) {
      var out = [], cur = "";
      c.save();
      c.font = "15px " + CJK;
      if (!isLatin) {
        for (var i = 0; i < str.length; i++) {
          var t2 = cur + str[i];
          if (c.measureText(t2).width > maxW && cur) { out.push(cur); cur = str[i]; }
          else cur = t2;
        }
      } else {
        var words = str.split(" ");
        for (var k = 0; k < words.length; k++) {
          var t3 = cur ? cur + " " + words[k] : words[k];
          if (c.measureText(t3).width > maxW && cur) { out.push(cur); cur = words[k]; }
          else cur = t3;
        }
      }
      if (cur) out.push(cur);
      c.restore();
      return out.length ? out : [""];
    },

    status: function (hud, x, y, w, left, right, o) {
      o = o || {};
      hud.rect(x, y, w, 22, { fill: o.bg || "rgba(30,60,80,0.55)" });
      hud.T(x + 8, y + 16, left, { size: 12.5, color: o.color || "rgba(220,235,245,0.95)" });
      hud.T(x + w - 8, y + 16, right, { size: 12.5, color: o.color || "rgba(220,235,245,0.95)", align: "right" });
    },

    // the signature shot: glyph noise resolving into the command
    decode: function (hud, x, y, target, prog, o) {
      o = o || {};
      var glyphs = o.glyphs || "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>/\\|[]{}()~^\u2591\u2592\u2593";
      var out = "";
      for (var i = 0; i < target.length; i++) {
        var settle = i / target.length;
        if (prog > settle + 0.06) out += target[i];
        else out += glyphs[Math.floor(C.h2(i * 7.3, Math.floor((o.t || 0) * 26)) * glyphs.length)] || "?";
      }
      hud.T(x, y, out, o.style || {});
      return out;
    },

    whale: [
      "        ______________",
      "     .-\"              \"-.",
      "   .'                    '.",
      "  /                        \\____",
      " |    o                        \\___/\\",
      " |                              ___  >",
      "  \\                            /   \\/",
      "   '.                        .'",
      "     '-.__________________.-'"
    ]
  };
  WEM.Tui = Tui;
})();
