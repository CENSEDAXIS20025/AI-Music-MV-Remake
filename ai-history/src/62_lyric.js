/* ============================================================================
   world.execute(me);  [TUI]  --  lyric gadgets
   Maths and physics appear only where the lyric actually names them, and leave
   with the line. The model training stays the subject; these are annotations.
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, V = WEM.Viz, T = WEM.Tui, M4 = C.M4;
  var clamp = C.clamp;
  var CJK = T.CJK;
  var CY = "rgba(94,224,160,0.95)", GO = "rgba(255,201,74,0.95)", WH = "rgba(232,238,244,0.95)";
  var DIM = "rgba(150,165,185,0.85)";

  // every window is taken from the same analysis clock the yellow subtitle uses,
  // so the annotation and the chat line can never drift apart
  var WINDOWS = [
    { t0: 29.709, t1: 33.412, kind: "points", lrc: "If I'm a set of points", tex: "\\dim = 7168" },
    { t0: 33.412, t1: 37.067, kind: "circle", lrc: "If I'm a circle", tex: "x^2 + y^2 = 1" },
    { t0: 37.067, t1: 40.706, kind: "sine", lrc: "If I'm a sine wave", tex: "y = \\sin \\theta" },
    { t0: 40.706, t1: 44.452, kind: "limit", lrc: "If I approach infinity", tex: "a_n = (1+\\frac{1}{n})^n \\to e" },
    { t0: 44.452, t1: 53.225, kind: "rect", lrc: "Switch my current", tex: "V_{in} = |\\sin \\omega t|" },
    { t0: 53.225, t1: 57.000, kind: "time", lrc: "To A.D to B.C", tex: "t: \\mathbb{R} \\to S^1" },
    { t0: 92.015, t1: 95.900, kind: "clock", lrc: "From AM to PM", tex: "AM \\to PM" },
    { t0: 74.045, t1: 77.576, kind: "emoji", emoji: "\ud83c\udf46", cap: "K 229 mg / 100 g", lrc: "If I'm an eggplant", tex: "m_K = 229\\,mg" },
    { t0: 77.576, t1: 81.351, kind: "emoji", emoji: "\ud83c\udf45", cap: "\u756a\u8304\u7ea2\u7d20 444 / 472 / 503 nm", lrc: "If I'm a tomato", tex: "\\lambda = 444, 472, 503\\,nm" },
    { t0: 81.351, t1: 85.078, kind: "emoji", emoji: "\ud83d\udc31", cap: "purr 25 \u2013 150 Hz", lrc: "If I'm a tabby cat", tex: "f_{purr} \\approx 25\\,Hz" },
    { t0: 85.078, t1: 88.587, kind: "emoji", emoji: "\u2203", cap: "\u5b58\u5728\u4e14\u552f\u4e00", lrc: "If I'm the only god", tex: "\\exists! x" },
    { t0: 88.587, t1: 95.465, kind: "emoji", emoji: "\u2640\u2192\u2642", cap: "F \u2192 M", lrc: "Switch my gender, F to M", tex: "F \\to M" },
    { t0: 95.465, t1: 103.489, kind: "emoji", emoji: "\ud83d\udd27", cap: "system \u2192 assistant", lrc: "Oh switch my role, S to M", tex: "S \\to M" },
    // (2) the love line opens with "I've studied" and holds to the blackout
    { t0: 177.246, t1: 209.000, kind: "love", lrc: "the algebraic expression of LO-O-OVE", tex: "(x^2+y^2-1)^3 - x^2 y^3 = 0" }
  ];

  function active(t) {
    for (var i = 0; i < WINDOWS.length; i++) if (t >= WINDOWS[i].t0 && t <= WINDOWS[i].t1) return WINDOWS[i];
    return null;
  }
  // fade in over 0.22 s, out over the last 0.35 s of the window
  function envelope(w, t) {
    return clamp((t - w.t0) / 0.22, 0, 1) * clamp((w.t1 - t) / 0.35, 0, 1);
  }

  var L = {
    windows: WINDOWS,
    active: active,

    /* --------------------------------------------------- 2D annotation --- */
    draw: function (ctx, hud, t) {
      var w = active(t);
      if (!w) return;
      var a = envelope(w, t);
      if (a < 0.01) return;
      var c = hud.fc;
      // one panel, centred in the empty band under the terminal
      var pw = 700, ph = 118, px = 1318 - pw / 2, py = 818;
      c.save();
      c.globalAlpha = a;
      // no opaque plate -- only a hairline frame, so the grain has no flat
      // field to clump in and the annotation reads as an overlay
      c.strokeStyle = "rgba(255,201,74,0.30)"; c.lineWidth = 1.2;
      if (c.roundRect) { c.beginPath(); c.roundRect(px, py, pw, ph, 8); c.stroke(); }
      else c.strokeRect(px, py, pw, ph);
      // a fine grid: a large flat dark area is where the film grain compresses
      // into blocks, and an instrument panel wants graduations anyway
      c.strokeStyle = "rgba(120,150,190,0.13)"; c.lineWidth = 1;
      c.beginPath();
      for (var gi = 1; gi < 26; gi++) { c.moveTo(px + gi * (pw / 26), py + 30); c.lineTo(px + gi * (pw / 26), py + ph - 6); }
      for (var gj = 1; gj < 5; gj++) { c.moveTo(px + 6, py + 30 + gj * ((ph - 36) / 5)); c.lineTo(px + pw - 6, py + 30 + gj * ((ph - 36) / 5)); }
      c.stroke();
      c.fillStyle = GO; c.font = "13px " + CJK;
      c.fillText("\u266a " + w.lrc, px + 16, py + 21);
      c.fillStyle = DIM; c.font = "11px " + T.FONT;
      c.fillText("\u6b4c\u8bcd\u63d0\u5230\u7684\u4e1c\u897f", px + pw - 92, py + 21);
      hud.formula(px + 16, py + 92, w.tex, { size: 22, color: WH, alpha: a });

      // a clock face whose hand sweeps from AM round to PM as the line is sung
      if (w.kind === "clock") {
        var ccx = px + pw * 0.80, ccy = py + ph * 0.56, RR = ph * 0.35;
        c.strokeStyle = "rgba(255,201,74,0.8)"; c.lineWidth = 1.6;
        c.beginPath(); c.arc(ccx, ccy, RR, 0, Math.PI * 2); c.stroke();
        for (var ti = 0; ti < 12; ti++) {
          var tang = -Math.PI / 2 + ti * Math.PI / 6;
          c.strokeStyle = "rgba(255,201,74,0.32)"; c.lineWidth = 1;
          c.beginPath();
          c.moveTo(ccx + Math.cos(tang) * (RR - 5), ccy + Math.sin(tang) * (RR - 5));
          c.lineTo(ccx + Math.cos(tang) * RR, ccy + Math.sin(tang) * RR);
          c.stroke();
        }
        var uu = clamp((t - w.t0) / (w.t1 - w.t0), 0, 1);
        var ha = -Math.PI / 2 + uu * Math.PI;          // top (AM) -> bottom (PM)
        c.strokeStyle = "rgba(255,238,190,0.98)"; c.lineWidth = 2.6;
        c.beginPath(); c.moveTo(ccx, ccy);
        c.lineTo(ccx + Math.cos(ha) * (RR - 7), ccy + Math.sin(ha) * (RR - 7)); c.stroke();
        c.fillStyle = "rgba(255,238,190,0.98)";
        c.beginPath(); c.arc(ccx, ccy, 2.6, 0, Math.PI * 2); c.fill();
        c.font = "12px " + T.FONT; c.textAlign = "center";
        c.fillStyle = uu < 0.5 ? "rgba(255,201,74,1)" : "rgba(255,201,74,0.4)";
        c.fillText("AM", ccx, ccy - RR - 5);
        c.fillStyle = uu >= 0.5 ? "rgba(255,201,74,1)" : "rgba(255,201,74,0.4)";
        c.fillText("PM", ccx, ccy + RR + 14);
        c.textAlign = "left";
      }

      var cx = px + pw * 0.66, cy = py + ph * 0.55, R = ph * 0.34;
      c.globalAlpha = a;
      if (w.kind === "emoji") {
        c.font = "46px 'Segoe UI Emoji','Apple Color Emoji','Segoe UI Symbol',sans-serif";
        c.textAlign = "center";
        c.fillStyle = "rgba(255,238,200,0.98)";
        c.fillText(w.emoji, cx, cy + 18);
        if (w.cap) {
          c.fillStyle = "rgba(255,201,74,0.85)"; c.font = "11.5px " + CJK;
          c.fillText(w.cap, cx, cy + 44);
        }
        c.textAlign = "left";
      }
      if (w.kind === "points") {
        for (var i = 0; i < 150; i++) {
          var u = C.h2(i * 1.7, 0.5), v = C.h2(i * 2.9, 3.3);
          var k = Math.pow(v, 0.6);
          c.fillStyle = i % 9 === 0 ? GO : "rgba(120,190,255," + (0.35 + k * 0.6) + ")";
          c.beginPath();
          c.arc(cx + (u - 0.5) * 260, cy + (v - 0.5) * 78, 1.4 + k * 2.6, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = DIM; c.font = "11px " + CJK;
        c.fillText("\u6bcf\u4e00\u4e2a\u70b9\u90fd\u662f\u4e00\u4e2a\u7ef4\u5ea6", cx - 130, cy + 58);
      } else if (w.kind === "circle") {
        c.strokeStyle = "rgba(160,180,205,0.6)"; c.lineWidth = 1.2;
        c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
        var th = t * 2.4;
        c.strokeStyle = GO; c.lineWidth = 2;
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(th) * R, cy - Math.sin(th) * R); c.stroke();
        c.fillStyle = DIM; c.font = "11px " + CJK;
        c.fillText("\u5468\u957f = 2\u03c0r\uff0c\u5b83\u843d\u5728\u8d85\u7403\u9762\u4e0a", cx - 90, cy + R + 20);
      } else if (w.kind === "sine") {
        c.strokeStyle = "rgba(160,180,205,0.45)"; c.lineWidth = 1;
        c.beginPath(); c.moveTo(cx - 150, cy); c.lineTo(cx + 150, cy); c.stroke();
        c.strokeStyle = CY; c.lineWidth = 2;
        c.beginPath();
        for (var s = 0; s <= 120; s++) {
          var xx = cx - 150 + s / 120 * 300, yy = cy - Math.sin(s / 120 * Math.PI * 3 + t * 1.6) * R * 0.9;
          if (s === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy);
        }
        c.stroke();
        c.strokeStyle = "rgba(53,224,255,0.45)"; c.lineWidth = 1.2;
        for (var q = 0; q < 7; q++) {
          var u2 = q / 7 * Math.PI * 3 + t * 1.6;
          var lx = cx - 150 + (q / 7) * 300, ly = cy - Math.sin(u2) * R * 0.9;
          var sl = Math.cos(u2) * R * 0.9 / 26;
          c.beginPath(); c.moveTo(lx - 20, ly + sl * 20); c.lineTo(lx + 20, ly - sl * 20); c.stroke();
        }
        c.fillStyle = DIM; c.font = "11px " + CJK;
        c.fillText("\u5207\u7ebf\u65cf\u7684\u5305\u7edc\u5c31\u662f\u6b63\u5f26\u672c\u8eab", cx - 90, cy + R + 22);
      } else if (w.kind === "limit") {
        c.strokeStyle = GO; c.lineWidth = 1.4;
        c.setLineDash([5, 4]);
        c.beginPath(); c.moveTo(cx - 150, cy - 26); c.lineTo(cx + 150, cy - 26); c.stroke();
        c.setLineDash([]);
        c.strokeStyle = CY; c.lineWidth = 2; c.beginPath();
        for (var n = 1; n <= 90; n++) {
          var v2 = Math.pow(1 + 1 / n, n);
          var X = cx - 150 + n / 90 * 300, Y = cy - (v2 - 2) * 44;
          if (n === 1) c.moveTo(X, Y); else c.lineTo(X, Y);
        }
        c.stroke();
        c.fillStyle = DIM; c.font = "11px " + T.FONT;
        c.fillText("e = 2.71828...", cx + 60, cy - 32);
        c.font = "11px " + CJK;
        c.fillText("\u5b83\u8d8a\u8d70\u8d8a\u8fd1\uff0c\u4f46\u4ece\u4e0d\u5230\u8fbe", cx - 150, cy + R + 22);
      } else if (w.kind === "rect") {
        c.strokeStyle = "rgba(120,170,235,0.75)"; c.lineWidth = 1.4;
        c.beginPath();
        for (var i2 = 0; i2 <= 260; i2++) {
          var u3 = i2 / 260, X2 = cx - 150 + u3 * 300, Y2 = cy + R * 0.8 - Math.abs(Math.sin(u3 * 20 + t * 3)) * R * 0.8;
          if (i2 === 0) c.moveTo(X2, Y2); else c.lineTo(X2, Y2);
        }
        c.stroke();
        c.strokeStyle = GO; c.lineWidth = 2;
        c.beginPath();
        var Vv = 0, RC = 0.10, dt = 0.002;
        for (var i3 = 0; i3 <= 900; i3++) {
          var tt = i3 * dt;
          Vv += dt * (Math.abs(Math.sin(tt * 20 + t * 3)) - Vv) / RC;
          var X3 = cx - 150 + (i3 / 900) * 300, Y3 = cy + R * 0.8 - Vv * R * 0.8;
          if (i3 === 0) c.moveTo(X3, Y3); else c.lineTo(X3, Y3);
        }
        c.stroke();
        c.fillStyle = DIM; c.font = "11px " + CJK;
        c.fillText("\u6574\u6d41\u4e4b\u540e\u518d RC \u6ee4\u6ce2\uff0c\u6ce2\u7eb9\u5c31\u5e73\u4e86", cx - 110, cy + R + 22);
      } else if (w.kind === "time") {
        c.strokeStyle = "rgba(160,180,205,0.5)"; c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(cx - 160, cy + 10); c.lineTo(cx + 160, cy + 10); c.stroke();
        var yrs = ["3000 BC", "0", "1000", "1900", "2024"];
        c.font = "10px " + T.FONT;
        for (var y2 = 0; y2 < yrs.length; y2++) {
          var X4 = cx - 160 + y2 / (yrs.length - 1) * 320;
          c.fillStyle = CY;
          c.fillRect(X4 - 1, cy - 34, 2, 44);
          c.fillStyle = DIM;
          c.fillText(yrs[y2], X4 - 18, cy + 26);
        }
        c.fillStyle = DIM; c.font = "11px " + CJK;
        c.fillText("\u4e00\u4e2a batch \u91cc\u540c\u65f6\u8bfb\u5230\u4e24\u7aef", cx - 60, cy - 48);
      } else if (w.kind === "love") {
        c.strokeStyle = "rgba(255,110,140,0.95)"; c.lineWidth = 2;
        c.beginPath();
        for (var i4 = 0; i4 <= 200; i4++) {
          var a2 = i4 / 200 * Math.PI * 2;
          var lo = 0, hi = 2, cc = Math.cos(a2), ss = Math.sin(a2);
          for (var b2 = 0; b2 < 30; b2++) {
            var m2 = (lo + hi) / 2, X5 = cc * m2, Y5 = ss * m2;
            if (Math.pow(X5 * X5 + Y5 * Y5 - 1, 3) - X5 * X5 * Y5 * Y5 * Y5 > 0) hi = m2; else lo = m2;
          }
          var X6 = cx + cc * lo * R * 0.6, Y6 = cy - ss * lo * R * 0.6;
          if (i4 === 0) c.moveTo(X6, Y6); else c.lineTo(X6, Y6);
        }
        c.stroke();
        c.fillStyle = DIM; c.font = "11px " + CJK;
        c.fillText("\u8fd9\u5c31\u662f\u5b83\u8bf4\u7684\u201c\u7231\u7684\u4ee3\u6570\u8868\u8fbe\u5f0f\u201d", cx - 80, cy + R + 22);
      }
      c.restore();
    },

    /* ------------------------------------------- 3D companion annotation --- */
    draw3d: function (ctx) {
      if (true) return;   // disabled: the 3D companion rendered as dark slabs over the panel
      var w = active(ctx.t);
      if (!w) return;
      var a = envelope(w, ctx.t);
      if (a < 0.01) return;
      var g = ctx.gfx, t = ctx.t;
      var Ln = this._ln || (this._ln = new V.Lines(3000));
      var P = this._pt || (this._pt = new V.Points(1400));
      Ln.clear(); P.clear();
      var cx = 1318, cy = 876, R = 96;
      if (w.kind === "points") {
        // a 7168-dim vector drawn as a lattice of axes rather than sprites --
        // point sprites in ortho mode scale by 8 and smudge the panel
        var NX = 26, NY = 9;
        for (var gx = 0; gx < NX; gx++) {
          for (var gy = 0; gy < NY; gy++) {
            var u = gx / (NX - 1), v = gy / (NY - 1);
            var wob = Math.sin(t * 1.3 + u * 7 + v * 5) * 14;
            var X = cx - 170 + u * 340, Y = cy + 40 - v * 74 + wob;
            Ln.seg(X, Y, 0, X + 14, Y - 6, 0, gy === 0 ? GO : [0.45, 0.75, 1.0], 1.4, a * (0.25 + v * 0.5));
            if (gx % 4 === 0) Ln.seg(X, Y, 0, X, Y - 14, 0, [0.35, 0.6, 0.9], 1.2, a * 0.4);
          }
        }
        Ln.draw(g, { add: true, glow: 0.4 });
      } else if (w.kind === "circle" || w.kind === "time") {
        // a wireframe ring, edge-on then turning
        var seg = 96;
        for (var k2 = 0; k2 < seg; k2++) {
          var a0 = k2 / seg * Math.PI * 2, a1 = (k2 + 1) / seg * Math.PI * 2;
          var yaw = t * 0.6;
          var p0 = [Math.cos(a0) * R, Math.sin(a0) * R * 0.35, Math.sin(a0) * R];
          var p1 = [Math.cos(a1) * R, Math.sin(a1) * R * 0.35, Math.sin(a1) * R];
          for (var j = 0; j < 2; j++) {
            var pp = j ? p1 : p0;
            var xr = pp[0] * Math.cos(yaw) - pp[2] * Math.sin(yaw);
            var zr = pp[0] * Math.sin(yaw) + pp[2] * Math.cos(yaw);
            pp[0] = xr; pp[2] = zr;
          }
          Ln.seg(cx + p0[0], cy + p0[1], p0[2], cx + p1[0], cy + p1[1], p1[2],
            k2 % 12 === 0 ? GO : [0.35, 0.75, 1.0], 1.6, a * 0.55);
        }
        Ln.draw(g, { add: true, glow: 0.4 });
      } else if (w.kind === "sine") {
        // a 3D sine ribbon
        for (var s2 = 0; s2 < 120; s2++) {
          var u0 = s2 / 120, u1 = (s2 + 1) / 120;
          var ang2 = t * 0.7;
          var X0 = (u0 - 0.5) * 340, X1 = (u1 - 0.5) * 340;
          var Z0 = Math.sin(u0 * 10 + t * 2) * 60, Z1 = Math.sin(u1 * 10 + t * 2) * 60;
          var r0x = X0 * Math.cos(ang2) - Z0 * Math.sin(ang2), r0z = X0 * Math.sin(ang2) + Z0 * Math.cos(ang2);
          var r1x = X1 * Math.cos(ang2) - Z1 * Math.sin(ang2), r1z = X1 * Math.sin(ang2) + Z1 * Math.cos(ang2);
          Ln.seg(cx + r0x, cy - Math.sin(u0 * 10 + t * 2) * 40, r0z,
            cx + r1x, cy - Math.sin(u1 * 10 + t * 2) * 40, r1z,
            s2 % 10 === 0 ? GO : [0.35, 0.8, 1.0], 1.6, a * 0.5);
        }
        Ln.draw(g, { add: true, glow: 0.4 });
      } else if (w.kind === "limit") {
        // a spiral tightening toward its limit
        for (var s3 = 0; s3 < 220; s3++) {
          var uu = s3 / 220;
          var rr = 150 * (1 - uu * 0.92);
          var aa0 = uu * Math.PI * 7 + t * 0.6, aa1 = (s3 + 1) / 220 * Math.PI * 7 + t * 0.6;
          Ln.seg(cx + Math.cos(aa0) * rr, cy + Math.sin(aa0) * rr * 0.5, Math.sin(aa0) * rr * 0.3,
            cx + Math.cos(aa1) * rr * 0.98, cy + Math.sin(aa1) * rr * 0.5 * 0.98, Math.sin(aa1) * rr * 0.3,
            uu > 0.85 ? GO : [0.4, 0.8, 1.0], 1.6, a * (0.2 + uu * 0.6));
        }
        Ln.draw(g, { add: true, glow: 0.4 });
      } else if (w.kind === "rect") {
        // the rectified wave as a 3D band
        for (var s4 = 0; s4 < 150; s4++) {
          var u4 = s4 / 150, u5 = (s4 + 1) / 150;
          var yy0 = Math.abs(Math.sin(u4 * 22 + t * 4)) * 70;
          var yy1 = Math.abs(Math.sin(u5 * 22 + t * 4)) * 70;
          Ln.seg(cx - 170 + u4 * 340, cy + 60 - yy0, Math.cos(u4 * 9 + t) * 40,
            cx - 170 + u5 * 340, cy + 60 - yy1, Math.cos(u5 * 9 + t) * 40,
            [0.4, 0.75, 1.0], 2.0, a * 0.4);
        }
        Ln.draw(g, { add: true, glow: 0.35 });
      } else if (w.kind === "love") {
        for (var s5 = 0; s5 < 200; s5++) {
          var b0 = s5 / 200 * Math.PI * 2, b1 = (s5 + 1) / 200 * Math.PI * 2;
          var h0 = [16 * Math.pow(Math.sin(b0), 3) / 17, (13 * Math.cos(b0) - 5 * Math.cos(2 * b0) - 2 * Math.cos(3 * b0) - Math.cos(4 * b0)) / 17];
          var h1 = [16 * Math.pow(Math.sin(b1), 3) / 17, (13 * Math.cos(b1) - 5 * Math.cos(2 * b1) - 2 * Math.cos(3 * b1) - Math.cos(4 * b1)) / 17];
          var yaw2 = t * 0.5;
          var x0b = h0[0] * Math.cos(yaw2), z0b = h0[0] * Math.sin(yaw2);
          var x1b = h1[0] * Math.cos(yaw2), z1b = h1[0] * Math.sin(yaw2);
          Ln.seg(cx + x0b * 46, cy - h0[1] * 46, z0b * 46, cx + x1b * 46, cy - h1[1] * 46, z1b * 46,
            [1.0, 0.45, 0.6], 2.2, a * 0.7);
        }
        Ln.draw(g, { add: true, glow: 0.5 });
      }
    }
  };
  WEM.Lyric = L;
})();
