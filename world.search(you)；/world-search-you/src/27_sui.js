/* ============================================================================
   world.search(you);  --  SUI: the search-console interface toolkit
   Every segment is a screen of the same machine, so the panels, query bars,
   result rows, score bars and stamps live here instead of being re-invented.
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core;
  var COL = WEM.HUD.COL;
  var clamp = C.clamp, lerp = C.lerp, smooth = C.smoothstep, E = C.Ease;

  var W = 1920, H = 1080;
  // the chrome owns y<52 (header) and y>1005 (meter + brackets)
  var SAFE = { l: 34, r: 1886, t: 56, b: 1000, cy: 528 };

  function tw(hud, s, size, weight) {
    var c = hud.fc;
    c.save();
    c.font = hud.fontStr(size || 14, "mono", weight);
    var w = c.measureText(s).width;
    c.restore();
    return w;
  }

  function rgba(c, a) {
    return "rgba(" + Math.round(c[0] * 255) + "," + Math.round(c[1] * 255) + "," + Math.round(c[2] * 255) + "," + a + ")";
  }

  /* ------------------------------------------------------------- frames */
  // a panel with a hairline border and four corner ticks -- the reference's
  // "white flat primitive" look
  function panel(hud, x, y, w, h, o) {
    o = o || {};
    var a = o.alpha === undefined ? 1 : o.alpha;
    if (o.fill !== false) hud.rect(x, y, w, h, { fill: o.bg || "rgba(9,11,15,0.82)", alpha: a });
    var col = o.color || "rgba(228,235,242,0.30)";
    hud.rect(x, y, w, h, { stroke: col, lw: 1, alpha: a });
    var L = o.tick === undefined ? 13 : o.tick;
    if (L > 0) {
      var cc = o.tickColor || "rgba(228,235,242,0.75)";
      hud.line(x, y, x + L, y, { color: cc, lw: 1.6, alpha: a });
      hud.line(x, y, x, y + L, { color: cc, lw: 1.6, alpha: a });
      hud.line(x + w, y, x + w - L, y, { color: cc, lw: 1.6, alpha: a });
      hud.line(x + w, y, x + w, y + L, { color: cc, lw: 1.6, alpha: a });
      hud.line(x, y + h, x + L, y + h, { color: cc, lw: 1.6, alpha: a });
      hud.line(x, y + h, x, y + h - L, { color: cc, lw: 1.6, alpha: a });
      hud.line(x + w, y + h, x + w - L, y + h, { color: cc, lw: 1.6, alpha: a });
      hud.line(x + w, y + h, x + w, y + h - L, { color: cc, lw: 1.6, alpha: a });
    }
    if (o.title) {
      hud.T(x + 12, y + 19, o.title, {
        size: o.titleSize || 12, color: o.titleColor || COL.cyan,
        alpha: a * 0.95, spacing: 1.4
      });
      hud.line(x + 12, y + 26, x + w - 12, y + 26, { color: o.color || "rgba(228,235,242,0.18)", alpha: a });
    }
    return { x: x, y: y, w: w, h: h };
  }

  /* ---------------------------------------------------------- type bits */
  function caret(hud, x, y, size, t, color, block) {
    var on = (Math.floor(t * 3.0) % 2) === 0;
    if (!on) return;
    if (block) hud.rect(x, y - size * 0.78, size * 0.52, size * 0.92, { fill: color || COL.cyan, alpha: 0.85 });
    else hud.line(x, y + 3, x + size * 0.60, y + 3, { color: color || COL.cyan, lw: 2.4 });
  }

  // the query input: "search ▸ " + typed text + caret
  function queryBar(ctx, x, y, w, text, o) {
    o = o || {};
    var hud = ctx.hud, a = o.alpha === undefined ? 1 : o.alpha;
    var h = o.h || 40;
    hud.rect(x, y, w, h, { fill: o.bg || "rgba(6,8,11,0.72)", stroke: o.color || "rgba(228,235,242,0.34)", lw: 1, alpha: a });
    hud.T(x + 12, y + h * 0.5 + 6, "search", { size: o.size || 17, color: COL.green, alpha: a * 0.95 });
    var px = x + 12 + tw(hud, "search", o.size || 17) + 8;
    hud.T(px, y + h * 0.5 + 6, "\u25b8", { size: o.size || 17, color: COL.dim, alpha: a });
    px += 16;
    if (text) {
      hud.T(px, y + h * 0.5 + 6, text, { size: o.size || 17, color: o.textColor || COL.white, alpha: a, glow: o.glow });
      px += tw(hud, text, o.size || 17);
    }
    if (o.caret !== false) caret(hud, px + 3, y + h * 0.5 + 6, o.size || 17, ctx.t, o.caretColor || COL.cyan);
    if (o.hits) {
      hud.T(x + w - 12, y + h * 0.5 + 6, o.hits, { size: (o.size || 17) - 4, color: COL.amber, align: "right", alpha: a });
    }
    return { x: x, y: y, w: w, h: h, textX: px };
  }

  // ranked result row: #rank, name, thin score bar, id hash
  function resultRow(ctx, x, y, w, o) {
    o = o || {};
    var hud = ctx.hud, a = o.alpha === undefined ? 1 : o.alpha;
    if (a <= 0.003) return;
    var hi = o.state === "hi", dead = o.state === "dead", win = o.state === "win";
    if (o.state) {
      hud.rect(x - 6, y - 15, w + 12, 22, {
        fill: win ? "rgba(255,201,74,0.16)" : hi ? "rgba(53,224,255,0.13)" : "rgba(255,90,82,0.10)",
        alpha: a
      });
      hud.line(x - 6, y - 15, x - 6, y + 7, { color: win ? COL.gold : hi ? COL.accent : COL.red, lw: 2, alpha: a });
    }
    hud.T(x, y, o.rank === undefined ? "--" : String(o.rank), {
      size: 13, color: o.state ? (win ? COL.gold : hi ? COL.accent : COL.red) : COL.faint, alpha: a
    });
    hud.T(x + 34, y, o.name || "", {
      size: 14, color: dead ? COL.faint : (win ? COL.gold : COL.grey), alpha: a,
      spacing: o.spacing === undefined ? 0.6 : o.spacing
    });
    if (o.id) hud.T(x + 34 + (o.nameW || 0) + 14, y, o.id, { size: 11, color: COL.faint, alpha: a * 0.9 });
    if (o.score !== undefined) {
      var bx = x + w - 190, bw = 150;
      hud.rect(bx, y - 10, bw, 12, { fill: "rgba(255,255,255,0.05)" });
      hud.rect(bx, y - 10, bw * clamp(o.score, 0, 1), 12, {
        fill: win ? "rgba(255,201,74,0.85)" : dead ? "rgba(255,90,82,0.55)" : "rgba(94,224,160,0.72)", alpha: a
      });
      hud.T(bx + bw + 10, y, (o.scoreText !== undefined ? o.scoreText : o.score.toFixed(3)), {
        size: 12, color: COL.dim, alpha: a
      });
    }
    if (dead) {
      hud.line(x + 34, y - 5, x + w - 220, y - 5, { color: "rgba(255,90,82,0.75)", lw: 1.6, alpha: a });
    }
    return y;
  }

  // label + numeric + horizontal bar, used by the constraint / facet / sensor
  // panels
  function metricBar(ctx, x, y, w, label, value, o) {
    o = o || {};
    var hud = ctx.hud, a = o.alpha === undefined ? 1 : o.alpha;
    if (a <= 0.003) return;
    hud.T(x, y, label, { size: o.size || 12, color: o.labelColor || COL.dim, alpha: a });
    if (o.text !== undefined) {
      hud.T(x + w, y, o.text, { size: o.size || 12, color: o.valueColor || COL.grey, align: "right", alpha: a });
    }
    var by = y + 6;
    var bh = o.bh || 7;
    hud.rect(x, by, w, bh, { fill: "rgba(255,255,255,0.05)", alpha: a });
    var k = clamp(value, 0, 1);
    hud.rect(x, by, w * k, bh, { fill: o.fill || "rgba(94,224,160,0.75)", alpha: a });
    if (o.ticks) {
      for (var i = 1; i < o.ticks; i++) {
        hud.line(x + w * i / o.ticks, by, x + w * i / o.ticks, by + bh, { color: "rgba(0,0,0,0.5)", alpha: a });
      }
    }
    return by + bh;
  }

  // the "ONLY PERFECT MATCH" stamp, rotated slightly like a rubber stamp
  function stamp(ctx, cx, cy, lines, o) {
    o = o || {};
    var hud = ctx.hud, c = hud.fc;
    var a = o.alpha === undefined ? 1 : o.alpha;
    if (a <= 0.01) return;
    var size = o.size || 24;
    var maxw = 0;
    lines.forEach(function (l) { maxw = Math.max(maxw, tw(hud, l, size, "700")); });
    var w = maxw + 44, h = lines.length * (size + 8) + 26;
    var pop = o.pop === undefined ? 1 : o.pop;
    c.save();
    c.translate(cx, cy);
    c.rotate((o.rot === undefined ? -0.055 : o.rot));
    c.scale(0.86 + 0.14 * pop, 0.86 + 0.14 * pop);
    c.globalAlpha = a;
    var col = o.color || COL.gold;
    c.strokeStyle = col;
    c.lineWidth = 3;
    c.strokeRect(-w / 2, -h / 2, w, h);
    c.lineWidth = 1;
    c.strokeRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12);
    c.textAlign = "center";
    c.fillStyle = col;
    for (var i = 0; i < lines.length; i++) {
      c.font = hud.fontStr(size, "mono", "700");
      c.fillText(lines[i], 0, -h / 2 + 26 + i * (size + 8) - 4);
    }
    c.restore();
    return { w: w, h: h };
  }

  /* --------------------------------------------------------- small maths */
  function hash32(x) {
    x = (x ^ 61) ^ (x >>> 16);
    x = x + (x << 3);
    x = x ^ (x >>> 4);
    x = Math.imul(x, 0x27d4eb2d);
    x = x ^ (x >>> 15);
    return x >>> 0;
  }
  function hex(x, n) { return ("00000000" + (x >>> 0).toString(16).toUpperCase()).slice(-(n || 8)); }

  // axes + polyline plot helper shared by every "sensor" panel
  function plotAxes(hud, x, y, w, h, o) {
    o = o || {};
    var a = o.alpha === undefined ? 1 : o.alpha;
    hud.rect(x, y, w, h, { fill: o.bg || "rgba(4,6,9,0.5)", alpha: a });
    var gx = o.gx || 6, gy = o.gy || 4;
    for (var i = 1; i < gx; i++) hud.line(x + w * i / gx, y, x + w * i / gx, y + h, { color: "rgba(228,235,242,0.07)", alpha: a });
    for (var j = 1; j < gy; j++) hud.line(x, y + h * j / gy, x + w, y + h * j / gy, { color: "rgba(228,235,242,0.07)", alpha: a });
    hud.rect(x, y, w, h, { stroke: o.color || "rgba(228,235,242,0.22)", lw: 1, alpha: a });
    return { x: x, y: y, w: w, h: h };
  }

  // draw a polyline of samples into a plot rect
  function plotLine(hud, g, fn, n, o) {
    o = o || {};
    var a = o.alpha === undefined ? 1 : o.alpha;
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var u = i / n;
      var v = fn(u);
      pts.push([g.x + u * g.w, g.y + g.h - clamp(v, -0.15, 1.15) * g.h]);
    }
    for (var k = 0; k + 1 < pts.length; k++) {
      hud.line(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], {
        color: o.color || COL.cyan, lw: o.lw || 1.6, alpha: a * (o.fade ? (0.35 + 0.65 * k / pts.length) : 1)
      });
    }
    return pts;
  }

  function crosshair(hud, x, y, r, color, alpha) {
    hud.line(x - r, y, x + r, y, { color: color, lw: 1, alpha: alpha });
    hud.line(x, y - r, x, y + r, { color: color, lw: 1, alpha: alpha });
  }

  WEM.SUI = {
    W: W, H: H, SAFE: SAFE, tw: tw, rgba: rgba,
    panel: panel, caret: caret, queryBar: queryBar, resultRow: resultRow,
    metricBar: metricBar, stamp: stamp, hash32: hash32, hex: hex,
    plotAxes: plotAxes, plotLine: plotLine, crosshair: crosshair,
    clamp: clamp, lerp: lerp, smooth: smooth, E: E
  };
})();
