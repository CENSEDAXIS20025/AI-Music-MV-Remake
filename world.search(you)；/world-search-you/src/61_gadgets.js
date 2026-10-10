/* ============================================================================
   world.execute(me);  [TUI]  --  gadgets
   The left side is a modern chat client (GUI); the right side stays terminal.
   Also: OS-style error dialogs, and the maths/physics that fills the gaps.
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, T = WEM.Tui, V = WEM.Viz, M4 = C.M4, V3 = C.V3;
  var clamp = C.clamp, lerp = C.lerp;
  var CJK = T.CJK;
  var CY = "rgba(94,224,160,0.95)", BL = "rgba(120,170,230,0.95)", GO = "rgba(255,201,74,0.95)";
  var DIM = "rgba(140,155,175,0.8)", WH = "rgba(232,238,244,0.95)", RE = "rgba(255,110,100,0.95)";

  function rr(c, x, y, w, h, r) {
    c.beginPath();
    if (c.roundRect) { c.roundRect(x, y, w, h, r); return; }
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  // mix a colour towards white; used only by the compact chat header, whose
  // 11 px status line needs to survive the CRT pass
  function lift(s, k) {
    var m = /rgba?\(([^)]+)\)/.exec(s);
    if (!m) return s;
    var p = m[1].split(",");
    var r = +p[0], g = +p[1], b = +p[2];
    var a = p.length > 3 ? parseFloat(p[3]) : 1;
    var f = function (v) { return Math.round(v + (255 - v) * k); };
    return "rgba(" + f(r) + "," + f(g) + "," + f(b) + "," + a + ")";
  }

  var G = {
    /* ------------------------------------------------------ GUI chat ------
       A chat client, not a terminal: avatars, bubbles, the assistant on the
       left of the panel and the user on the right. A wrong answer is struck
       through and the corrected one follows in green. */
    guiChat: function (hud, x, y, w, h, msgs, t, o) {
      o = o || {};
      var c = hud.fc;
      /* ---- metrics ---------------------------------------------------------
         The v3 window was authored for a 690x838 panel and its numbers are all
         baked in. The chat overlay now shares the frame with the film, so it
         asks for o.compact and gets a scaled-down metric set: same furniture,
         same reading order, every dimension multiplied by roughly 0.78. The
         type is only taken down to 13.5 px (from 15) rather than all the way,
         because below that the CJK glyphs stop resolving after the CRT pass;
         the space comes out of the padding, the line box and the avatar discs
         instead, and the overlay shows fewer bubbles to compensate. Callers
         that do not set o.compact get the original v3 geometry, unchanged.     */
      var K = o.compact ? 0.78 : 1;
      var FS = Math.round(15 * K * 10) / 10;          // body text
      var LH = Math.round(21 * K * 10) / 10;          // line box
      var PADX = Math.round(13 * K);                  // bubble inset
      var PADY = Math.round(6 * K);                   // above the first baseline
      var HDR = Math.round(46 * K);
      var AV = Math.round(14 * K);                    // avatar radius
      var GAP = Math.round(10 * K);                   // between bubbles
      var GAPF = Math.round(8 * K);                   // above a fix box
      var LEFT = Math.round(22 * K);                  // bubble column from the left
      var COL = Math.round(32 * K);                   // avatar column width
      var BR = Math.round(12 * K);                    // corner radius
      c.save();
      if (o.alpha !== undefined) c.globalAlpha = o.alpha;
      // window. o.compact paints two things the v3 window did not need:
      //   * a darker plate -- the film already fills the frame with panels of
      //     exactly this colour, so the chat card has to sit visibly *under*
      //     them or it reads as part of the instrument panel behind it;
      //   * a soft drop shadow, because on the paper theme the composite
      //     inverts lightness and both plates land near white. The shadow is
      //     an ellipse, not ctx.shadowBlur, which the HUD layer does not use.
      if (o.compact) {
        c.fillStyle = "rgba(0,0,0,0.34)";
        c.beginPath();
        c.ellipse(x + w / 2, y + h / 2 + 7, w / 2 + 9, h / 2 + 9, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "rgba(6,8,12,0.97)";
      } else {
        c.fillStyle = "rgba(13,16,21,0.94)";
      }
      rr(c, x, y, w, h, BR); c.fill();
      c.strokeStyle = o.compact ? "rgba(150,180,220,0.45)" : "rgba(120,150,190,0.30)";
      c.lineWidth = o.compact ? 1.6 : 1.4; c.stroke();
      // header
      c.save();
      rr(c, x, y, w, HDR, BR); c.clip();
      c.fillStyle = "rgba(22,27,35,0.98)"; c.fillRect(x, y, w, HDR);
      c.restore();
      c.fillStyle = "rgba(43,74,140,0.95)";
      c.beginPath(); c.arc(x + AV + 5, y + HDR * 0.5, AV + 2, 0, Math.PI * 2); c.fill();
      c.fillStyle = "rgba(235,241,248,0.98)";
      c.font = "600 " + (FS + 1) + "px " + CJK; c.textAlign = "center";
      c.fillText("\u5979", x + AV + 5, y + HDR * 0.5 + 6);
      c.textAlign = "left";
      c.fillStyle = "rgba(236,242,248,0.97)"; c.font = "600 " + FS + "px " + CJK;
      var nm = o.name || "deepseek";
      if (o.erase > 0) {
        // wipe the training name from the left, then type the shipped one
        var keep = Math.floor(nm.length * (1 - o.erase));
        nm = nm.slice(0, keep);
        if (o.erase >= 1) nm = (o.typed || "") + (Math.floor(t * 2) % 2 ? "\u2588" : "");
      }
      c.fillText(nm, x + AV * 2 + 14, y + HDR * 0.5 - 1);
      c.font = Math.round(11 * K * 10) / 10 + "px " + CJK;
      var st = o.sub || "\u5728\u7ebf \u00b7 \u63a8\u7406\u4e2d";
      // the status line is 0.6 px strokes at this size: at the v3 colour it
      // simply dissolves into the header plate after the CRT pass, so it is
      // mixed most of the way to white instead of being lifted like the body
      var stc = o.subColor || "rgba(94,224,160,0.9)";
      c.fillStyle = o.compact ? lift(stc, 0.74) : stc;
      c.beginPath(); c.arc(x + AV * 2 + 15, y + HDR * 0.74, 2.4, 0, Math.PI * 2); c.fill();
      c.fillText(st, x + AV * 2 + 22, y + HDR * 0.88);
      c.fillStyle = "rgba(150,165,185,0.8)"; c.font = Math.round(16 * K) + "px " + CJK;
      c.textAlign = "right"; c.fillText("\u22ef", x + w - 14, y + HDR * 0.65); c.textAlign = "left";
      c.strokeStyle = "rgba(120,150,190,0.22)";
      c.beginPath(); c.moveTo(x, y + HDR); c.lineTo(x + w, y + HDR); c.stroke();

      // messages
      var top = y + HDR + Math.round(12 * K), bottom = y + h - Math.round(96 * K);
      var blocks = [];
      for (var i = 0; i < msgs.length; i++) {
        var m = msgs[i];
        var shown = clamp((t - m.t0) * (o.speed || 2.4), 0, 1);
        if (shown <= 0) continue;
        var body = m.text.slice(0, Math.max(1, Math.ceil(m.text.length * shown)));
        var isUser = m.who === "user";
        var kind = m.kind || "chat";
        if (kind === "fail" || kind === "crash" || kind === "sys" || kind === "spin") {
          blocks.push({ user: false, lines: [m.text], bw: w - 44, bh: 24, fix: null, alpha: 1,
            kind: kind, total: 30 });
          continue;
        }
        var maxW = w * 0.66;
        var wrapped = T.wrap(c, body, maxW - PADX * 2, isUser);
        var bw = 0;
        c.font = FS + "px " + CJK;
        for (var l = 0; l < wrapped.length; l++) bw = Math.max(bw, c.measureText(wrapped[l]).width);
        bw = Math.min(maxW, bw + PADX * 2);
        var bh = wrapped.length * LH + PADY * 2 + Math.round(6 * K);
        var fixOn = m.fix && t > m.t0 + 1.6;
        var fw = null;
        if (fixOn) {
          var fl = T.wrap(c, m.fix, maxW - PADX * 2, isUser);
          var fwid = 0;
          for (var l2 = 0; l2 < fl.length; l2++) fwid = Math.max(fwid, c.measureText(fl[l2]).width);
          fw = { lines: fl, w: Math.min(maxW, fwid + PADX * 2), h: fl.length * LH + Math.round(22 * K) };
        }
        blocks.push({
          user: isUser, lines: wrapped, bw: bw, bh: bh, fix: fw, alpha: 1,
          total: bh + (fw ? fw.h + GAPF : 0) + GAP
        });
      }
      // drop the oldest until it fits
      var need = 0;
      for (var k = 0; k < blocks.length; k++) need += blocks[k].total;
      var start = 0;
      while (need > bottom - top && start < blocks.length) { need -= blocks[start].total; start++; }

      var cy = top;
      for (var b2 = start; b2 < blocks.length; b2++) {
        var B = blocks[b2];
        var av = AV;
        if (B.kind === "fail" || B.kind === "crash" || B.kind === "sys") {
          c.font = (B.kind === "crash" ? "600 " : "") + FS + "px " + CJK;
          if (B.kind === "fail") {
            c.fillStyle = "rgba(255,96,86,0.98)";
            c.fillText("\u26d4 \u672c\u8f6e\u8fd0\u884c\u5931\u8d25\u3000" + B.lines[0], x + LEFT, cy + 16);
          } else if (B.kind === "crash") {
            c.fillStyle = "rgba(255,72,60,1)";
            c.fillText("\u26d4 " + B.lines[0], x + LEFT, cy + 16);
          } else {
            c.fillStyle = "rgba(150,168,190,0.85)";
            c.fillText("\u2726 " + B.lines[0], x + LEFT, cy + 16);
          }
          cy += B.total;
          continue;
        }
        if (B.kind === "spin") {
          var sw = Math.min(w - 70, 300), sh = 40;
          c.fillStyle = "rgba(26,34,44,0.95)";
          rr(c, x + LEFT, cy, sw, sh, 10); c.fill();
          c.strokeStyle = "rgba(120,150,190,0.30)"; c.lineWidth = 1; c.stroke();
          var sang = (t * 3.4) % (Math.PI * 2);
          c.strokeStyle = "rgba(96,170,255,0.95)"; c.lineWidth = 2.4;
          c.beginPath(); c.arc(x + 44, cy + 20, 8, sang, sang + Math.PI * 1.35); c.stroke();
          c.fillStyle = "rgba(200,214,230,0.92)"; c.font = FS + "px " + CJK;
          c.fillText(B.lines[0] + "\u2026", x + 62, cy + 25);
          cy += B.total;
          continue;
        }
        // the bubble column has to clear the avatar disc, left and right
        var colW = x + w - (LEFT + COL + av + 8);
        if (B.user) {
          var ux = x + w - (av * 2 + 12) - B.bw;
          c.fillStyle = "rgba(43,74,140,0.94)";
          rr(c, ux, cy, B.bw, B.bh, BR); c.fill();
          c.font = FS + "px " + CJK; c.fillStyle = "rgba(238,244,250,0.98)";
          for (var l3 = 0; l3 < B.lines.length; l3++) c.fillText(B.lines[l3], ux + PADX, cy + PADY + LH * 0.78 + l3 * LH);
          c.fillStyle = "rgba(70,110,190,0.95)";
          c.beginPath(); c.arc(x + w - av - 6, cy + av, av, 0, Math.PI * 2); c.fill();
          c.fillStyle = "rgba(235,241,248,0.98)"; c.font = "600 " + (FS - 1.5) + "px " + CJK;
          c.textAlign = "center"; c.fillText("\u4f60", x + w - av - 6, cy + av + 4); c.textAlign = "left";
        } else {
          var bx = x + LEFT + COL;
          if (B.fix) {
            c.fillStyle = "rgba(30,22,24,0.9)";
            rr(c, bx, cy, B.bw, B.bh, BR); c.fill();
            c.strokeStyle = "rgba(255,110,100,0.55)"; c.lineWidth = 1.2; c.stroke();
          } else {
            c.fillStyle = "rgba(26,34,44,0.95)";
            rr(c, bx, cy, B.bw, B.bh, BR); c.fill();
          }
          c.font = FS + "px " + CJK;
          c.fillStyle = B.fix ? "rgba(178,156,161,0.92)" : "rgba(244,248,252,0.99)";
          for (var l4 = 0; l4 < B.lines.length; l4++) c.fillText(B.lines[l4], bx + PADX, cy + PADY + LH * 0.78 + l4 * LH);
          if (B.fix) {
            c.strokeStyle = "rgba(255,110,100,0.95)"; c.lineWidth = 1.5;
            for (var l5 = 0; l5 < B.lines.length; l5++) {
              var wd = c.measureText(B.lines[l5]).width;
              var sy = cy + PADY + LH * 0.78 - LH * 0.34 + l5 * LH;
              c.beginPath(); c.moveTo(bx + PADX, sy); c.lineTo(bx + PADX + wd, sy); c.stroke();
            }
            c.fillStyle = "rgba(255,110,100,0.9)"; c.font = Math.round(10 * (0.78 + K * 0.22)) + "px " + CJK;
            c.textAlign = "right"; c.fillText("\u5df2\u4fee\u6b63", bx + B.bw - 8, cy + PADY + 4); c.textAlign = "left";
          }
          c.fillStyle = "rgba(43,74,140,0.95)";
          c.beginPath(); c.arc(x + LEFT + av, cy + av, av, 0, Math.PI * 2); c.fill();
          c.fillStyle = "rgba(235,241,248,0.98)"; c.font = "600 " + (FS - 1.5) + "px " + CJK;
          c.textAlign = "center"; c.fillText("\u5979", x + LEFT + av, cy + av + 4); c.textAlign = "left";
        }
        cy += B.bh + GAP;
        if (B.fix) {
          var fx = B.user ? x + w - (av * 2 + 12) - B.fix.w : x + LEFT + COL;
          c.fillStyle = "rgba(20,44,34,0.95)";
          rr(c, fx, cy, B.fix.w, B.fix.h, BR); c.fill();
          c.strokeStyle = "rgba(94,224,160,0.45)"; c.lineWidth = 1.2; c.stroke();
          c.font = FS + "px " + CJK; c.fillStyle = "rgba(150,244,190,0.98)";
          for (var l6 = 0; l6 < B.fix.lines.length; l6++) c.fillText(B.fix.lines[l6], fx + PADX, cy + PADY + LH * 0.85 + l6 * LH);
          c.fillStyle = "rgba(94,224,160,0.85)"; c.font = Math.round(10 * (0.78 + K * 0.22)) + "px " + CJK;
          c.fillText("\u2713 \u6a21\u578b\u66f4\u65b0", fx + 12, cy + PADY + 6);
          cy += B.fix.h + GAPF;
        }
        cy += Math.round(6 * K);
      }

      // lyric subtitle
      if (o.lyric) {
        c.fillStyle = "rgba(255,201,74,0.92)"; c.font = Math.round(18 * K) + "px " + CJK;
        c.textAlign = "center";
        c.fillText("\u266a " + o.lyric, x + w / 2, y + h - Math.round(94 * K));
        c.textAlign = "left";
      }
      // input box
      var iy = y + h - Math.round(80 * K);
      var ibh = Math.round(42 * K);
      c.fillStyle = "rgba(24,29,38,0.98)";
      rr(c, x + Math.round(14 * K), iy, w - ibh - Math.round(28 * K), ibh, Math.round(10 * K)); c.fill();
      c.strokeStyle = "rgba(120,150,190,0.32)"; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = "rgba(150,165,185,0.75)"; c.font = Math.round(14 * K) + "px " + CJK;
      c.fillText(o.inputText || "\u8f93\u5165\u6d88\u606f\u2026", x + Math.round(28 * K), iy + ibh * 0.62);
      if (Math.floor(t * 2) % 2 === 0 && !o.inputText) {
        c.fillStyle = "rgba(94,224,160,0.9)";
        c.fillRect(x + Math.round(28 * K) + 76 * K, iy + ibh * 0.28, 1.5, ibh * 0.44);
      }
      c.fillStyle = "rgba(43,74,140,0.95)";
      rr(c, x + w - ibh - Math.round(14 * K), iy, ibh, ibh, Math.round(10 * K)); c.fill();
      c.fillStyle = "rgba(238,244,250,0.98)"; c.font = Math.round(17 * K) + "px " + CJK;
      c.textAlign = "center"; c.fillText("\u2191", x + w - ibh / 2 - Math.round(14 * K), iy + ibh * 0.64); c.textAlign = "left";
      // ---- training footer: rounds, steps, tokens, cache ----
      if (o.footer) {
        var fy = y + h - Math.round(24 * K);
        c.fillStyle = o.compact ? "rgba(198,210,224,0.92)" : "rgba(140,155,175,0.75)"; c.font = Math.round(11 * K) + "px " + CJK;
        c.fillText(o.footer, x + 16, fy);
        if (o.lossText) { c.fillStyle = "rgba(94,224,160,0.9)"; c.textAlign = "right"; c.fillText(o.lossText, x + w - 16, fy); c.textAlign = "left"; }
        if (o.prog !== undefined) {
          var bx = x + 16, bw = w - 32, by = fy + 5;
          c.fillStyle = "rgba(255,255,255,0.08)"; c.fillRect(bx, by, bw, 3);
          c.fillStyle = "rgba(53,224,255,0.65)"; c.fillRect(bx, by, bw * clamp(o.prog, 0, 1), 3);
        }
      }
      c.restore();
    },

    /* -------------------------------------------------- error dialog ----- */
    popup: function (hud, x, y, w, h, title, lines, a, seed) {
      if (a <= 0.01) return;
      var c = hud.fc;
      c.save();
      c.globalAlpha = a;
      var pop = 1 + Math.max(0, 1 - a) * 0.06;
      c.translate(x + w / 2, y + h / 2); c.scale(pop, pop); c.translate(-(x + w / 2), -(y + h / 2));
      // the modern dialog, but with square corners
      c.fillStyle = "rgba(0,0,0,0.5)";
      c.fillRect(x + 5, y + 6, w, h);
      c.fillStyle = "rgba(26,29,36,0.98)";
      c.fillRect(x, y, w, h);
      c.strokeStyle = "rgba(255,90,80,0.7)"; c.lineWidth = 1.6; c.strokeRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
      // title bar
      c.fillStyle = "rgba(72,26,26,0.98)"; c.fillRect(x, y, w, 34);
      c.fillStyle = "rgba(255,110,100,0.95)";
      c.beginPath(); c.arc(x + 18, y + 17, 5, 0, Math.PI * 2); c.fill();
      c.fillStyle = "rgba(245,235,235,0.97)"; c.font = "600 13px " + CJK;
      c.fillText(title, x + 32, y + 22);
      c.fillStyle = "rgba(200,180,180,0.7)"; c.font = "14px " + CJK;
      c.textAlign = "right"; c.fillText("\u2715", x + w - 12, y + 22); c.textAlign = "left";
      c.fillStyle = "rgba(226,220,220,0.95)"; c.font = "13px " + CJK;
      for (var i = 0; i < lines.length; i++) {
        if (i * 22 + 46 > h - 40) break;
        c.fillText(lines[i], x + 18, y + 58 + i * 22);
      }
      var bw2 = 78, bh2 = 28;
      var bx = x + w - bw2 - 14, by = y + h - bh2 - 14;
      c.fillStyle = "rgba(64,70,84,0.98)";
      c.fillRect(bx, by, bw2, bh2);
      c.strokeStyle = "rgba(160,170,190,0.5)"; c.lineWidth = 1.2; c.strokeRect(bx, by, bw2, bh2);
      c.fillStyle = "rgba(235,240,246,0.96)"; c.font = "13px " + CJK;
      c.textAlign = "center"; c.fillText("\u786e\u5b9a", bx + bw2 / 2, by + 19); c.textAlign = "left";


      c.restore();
    },

    /* --------------------------- 2D maths strip in the empty band -------- */
    mandel: null,
    strip: function (ctx, hud, x, y, w, h, t) {
      var c = hud.fc;
      var n = 5, gap = 10, pw = (w - gap * (n - 1)) / n;
      // precompute a small Mandelbrot tile once
      if (!this.mandel) {
        var mw = 56, mh = 32, mout = [];
        for (var j = 0; j < mh; j++) for (var i2 = 0; i2 < mw; i2++) {
          var cr = -2.1 + i2 / mw * 3.0, ci = -1.15 + j / mh * 2.3;
          var zr = 0, zi = 0, it = 0;
          for (; it < 34; it++) {
            var zr2 = zr * zr - zi * zi + cr, zi2 = 2 * zr * zi + ci;
            zr = zr2; zi = zi2;
            if (zr * zr + zi * zi > 4) break;
          }
          mout.push([i2, j, it / 34]);
        }
        this.mandel = { w: mw, h: mh, pts: mout };
      }
      var titles = ["x\u00b2+y\u00b2=1", "Lorenz", "Lissajous", "Fourier", "Mandelbrot"];
      for (var k = 0; k < n; k++) {
        var px = x + k * (pw + gap), py = y;
        c.save();
        c.fillStyle = "rgba(10,13,18,0.85)";
        rr(c, px, py, pw, h, 8); c.fill();
        c.strokeStyle = "rgba(120,150,190,0.28)"; c.lineWidth = 1.1; c.stroke();
        c.beginPath(); rr(c, px, py, pw, h, 8); c.clip();
        var cx = px + pw / 2, cy = py + h / 2 + 4, R = Math.min(pw, h) * 0.30;
        if (k === 0) {
          // unit circle with a rotating radius and the sine it traces
          c.strokeStyle = "rgba(120,150,190,0.5)"; c.lineWidth = 1;
          c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
          var th = t * 2.2;
          c.strokeStyle = "rgba(255,201,74,0.95)"; c.lineWidth = 1.8;
          c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(th) * R, cy - Math.sin(th) * R); c.stroke();
          c.strokeStyle = "rgba(94,224,160,0.95)"; c.lineWidth = 1.6;
          c.beginPath();
          for (var s = 0; s <= 40; s++) {
            var a = th - s / 40 * 2.2;
            var xx = cx + R + 6 + (s / 40) * R * 0.9, yy = cy - Math.sin(a) * R * 0.8;
            if (s === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy);
          }
          c.stroke();
        } else if (k === 1) {
          // Lorenz, integrated live
          var X = 0.6, Y = 0.4, Z = 12, dt = 0.006, sc = R / 22;
          c.strokeStyle = "rgba(120,200,255,0.85)"; c.lineWidth = 1.2;
          c.beginPath();
          for (var i3 = 0; i3 < 620; i3++) {
            var dx = 10 * (Y - X), dy = X * (28 - Z) - Y, dz = X * Y - (8 / 3) * Z;
            X += dx * dt; Y += dy * dt; Z += dz * dt;
            if (i3 < 60) continue;
            var sx = cx + X * sc * 0.9, sy = cy + (Z - 25) * sc * 0.55;
            if (i3 === 60) c.moveTo(sx, sy); else c.lineTo(sx, sy);
          }
          c.stroke();
        } else if (k === 2) {
          // Lissajous
          c.strokeStyle = "rgba(255,150,200,0.85)"; c.lineWidth = 1.3;
          c.beginPath();
          for (var i4 = 0; i4 <= 260; i4++) {
            var u = i4 / 260 * Math.PI * 2 + t * 0.4;
            var lx = cx + Math.sin(3 * u + Math.PI / 2) * R, ly = cy + Math.sin(2 * u) * R * 0.85;
            if (i4 === 0) c.moveTo(lx, ly); else c.lineTo(lx, ly);
          }
          c.stroke();
        } else if (k === 3) {
          // Fourier epicycles
          var ax = cx - R * 0.4, ay = cy, path = [];
          c.strokeStyle = "rgba(255,201,74,0.7)"; c.lineWidth = 1;
          for (var q = 1; q <= 4; q++) {
            var ph = t * (1.6 - q * 0.18) * q, rad = R * 0.5 / q;
            c.beginPath(); c.arc(ax, ay, rad, 0, Math.PI * 2); c.stroke();
            ax += Math.cos(ph) * rad; ay += Math.sin(ph) * rad;
            path.push([ax, ay]);
          }
          c.strokeStyle = "rgba(94,224,160,0.95)"; c.lineWidth = 1.4;
          c.beginPath();
          for (var p2 = 0; p2 < path.length; p2++) { if (p2 === 0) c.moveTo(path[p2][0], path[p2][1]); else c.lineTo(path[p2][0], path[p2][1]); }
          c.stroke();
          c.fillStyle = "rgba(255,201,74,1)";
          c.beginPath(); c.arc(path[path.length - 1][0], path[path.length - 1][1], 2.4, 0, Math.PI * 2); c.fill();
        } else {
          // Mandelbrot, computed at load and cached
          var M = this.mandel, sw = (pw - 16) / M.w, sh = (h - 30) / M.h;
          for (var m2 = 0; m2 < M.pts.length; m2++) {
            var q2 = M.pts[m2];
            var v = 1 - q2[2];
            if (v < 0.08) continue;
            c.fillStyle = "rgba(" + Math.round(60 + v * 195) + "," + Math.round(120 + v * 100) + "," + Math.round(200 + v * 55) + "," + (0.25 + v * 0.75) + ")";
            c.fillRect(px + 8 + q2[0] * sw, py + 8 + q2[1] * sh, sw, sh);
          }
        }
        c.restore();
        c.fillStyle = "rgba(150,170,195,0.85)"; c.font = "11px " + T.FONT;
        c.fillText(titles[k], px + 10, py + 16);
      }
    },

    /* ------------------------- 3D maths/physics behind the panels -------- */
    // seeded so the field is identical on every frame
    init3d: function () {
      if (this._inited) return;
      this._inited = true;
      var r = C.rng(0x3D3D);
      this.lor = [];
      var X = 0.6, Y = 0.4, Z = 12, dt = 0.004;
      for (var i = 0; i < 4200; i++) {
        var dx = 10 * (Y - X), dy = X * (28 - Z) - Y, dz = X * Y - (8 / 3) * Z;
        X += dx * dt; Y += dy * dt; Z += dz * dt;
        if (i > 200) this.lor.push([X, Y, Z]);
      }
      this.solids = [];
      var keys = ["icosa", "dodeca", "octa", "cube", "tetra"];
      for (var k = 0; k < keys.length; k++) this.solids.push(WEM.Lab.solidMesh(keys[k]));
      this.grain = [];
      for (var g = 0; g < 900; g++) {
        this.grain.push([(r() - 0.5) * 1900, (r() - 0.5) * 1100, r() * 500]);
      }
      this.lines = new V.Lines(6000);
      this.pts = new V.Points(3000);
    },
    threeD: function (ctx) {
      this.init3d();
      var g = ctx.gfx, t = ctx.t, W = ctx.W, H = ctx.H;
      var Ln = this.lines, P = this.pts;
      Ln.clear(); P.clear();
      // NOTE: in ortho mode gl_PointSize is size * 8, so point sizes here are
      // sub-pixel units. No drifting grain cloud -- it only added mud.

      // five wireframe solids turning in the gaps between panels.
      // the ortho camera is already screen-like (y down), so y is NOT negated here
      var spots = [
        [905, 880, 74], [1245, 900, 58], [1530, 200, 62], [1810, 620, 50]
      ];
      for (var k = 0; k < 4; k++) {
        var m = this.solids[k % this.solids.length];
        var sp = spots[k];
        var ang = t * (0.35 + k * 0.09) + k;
        var mm = M4.mul(M4.trans(sp[0], sp[1], 0),
          M4.mul(M4.rotY(ang), M4.mul(M4.rotX(ang * 0.6), M4.scale(sp[2], sp[2], sp[2]))));
        g.wire(m, mm, { color: k % 2 ? [0.30, 0.72, 1.0] : [1.0, 0.72, 0.35], alpha: 0.5, width: 1.4 });
      }

      // a Lorenz attractor drawn as 3D line segments
      var lor = this.lor;
      for (var j = 0; j + 2 < lor.length; j += 2) {
        var a = lor[j], b = lor[j + 1];
        var kk = j / lor.length;
        var zz = Math.sin(t * 0.5 + kk * 6.0);
        Ln.seg(1690 + a[0] * 5.0 + zz * 20, 880 - (a[2] - 25) * 5.2, a[1] * 3.0,
          1690 + b[0] * 5.0 + zz * 20, 880 - (b[2] - 25) * 5.2, b[1] * 3.0,
          kk > 0.8 ? GO : [0.35, 0.75, 1.0], 1.2, 0.18 + kk * 0.5);
      }
      // a helix and a sine sheet filling the lower gap
      for (var hh = 0; hh < 150; hh++) {
        var u0 = hh / 150, u1 = (hh + 1) / 150;
        var a0 = u0 * Math.PI * 8, a1 = u1 * Math.PI * 8;
        Ln.seg(830 + u0 * 1060, 990 + Math.sin(a0 + t * 1.4) * 26, Math.cos(a0) * 60,
          830 + u1 * 1060, 990 + Math.sin(a1 + t * 1.4) * 26, Math.cos(a1) * 60,
          [0.55, 0.85, 1.0], 1.6, 0.22);
      }
      for (var sx = 0; sx < 26; sx++) {
        for (var sy = 0; sy < 5; sy++) {
          var X0 = 800 + sx * 41, Y0 = 1020 + sy * 9;
          Ln.seg(X0, Y0 + Math.sin(sx * 0.5 + t * 1.2) * 7, sy * 8,
            X0 + 41, Y0 + Math.sin((sx + 1) * 0.5 + t * 1.2) * 7, sy * 8,
            [0.30, 0.55, 0.85], 1.0, 0.14);
        }
      }
      Ln.draw(g, { add: true, glow: 0.35 });
    }
  };
  WEM.Gadgets = G;
})();
