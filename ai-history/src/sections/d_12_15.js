/* sections 12-15 : the machine does the work, solves for love, and shuts down */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, Ch = WEM.Chron;
  var clamp = C.clamp, lerp = C.lerp, Ease = C.Ease, M4 = C.M4, G = C.geo;
  var PI = Math.PI, TAU = PI * 2;
  var H2 = C.h2, H3 = C.h3;
  var MIL = (Ch && Ch.MILESTONES) || [];

  /* ==========================================================================
     shared scratch + small helpers
     ========================================================================== */
  function s01(x) { return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x); }

  // model matrix for a quad: local XY plane, size sx*sy, centred at (x,y,z),
  // optionally rotated by a pure-rotation matrix `rot`
  function matQuad(m, x, y, z, sx, sy, rot) {
    var r0 = 1, r1 = 0, r2 = 0, r4 = 0, r5 = 1, r6 = 0, r8 = 0, r9 = 0, r10 = 1;
    if (rot) {
      r0 = rot[0]; r1 = rot[1]; r2 = rot[2];
      r4 = rot[4]; r5 = rot[5]; r6 = rot[6];
      r8 = rot[8]; r9 = rot[9]; r10 = rot[10];
    }
    m[0] = r0 * sx; m[1] = r1 * sx; m[2] = r2 * sx; m[3] = 0;
    m[4] = r4 * sy; m[5] = r5 * sy; m[6] = r6 * sy; m[7] = 0;
    m[8] = r8; m[9] = r9; m[10] = r10; m[11] = 0;
    m[12] = r0 * x + r4 * y + r8 * z;
    m[13] = r1 * x + r5 * y + r9 * z;
    m[14] = r2 * x + r6 * y + r10 * z;
    m[15] = 1;
    return m;
  }

  // transform a point by a pure-rotation matrix, in place in a 3-array out
  function xf3(out, rot, x, y, z) {
    out[0] = rot[0] * x + rot[4] * y + rot[8] * z;
    out[1] = rot[1] * x + rot[5] * y + rot[9] * z;
    out[2] = rot[2] * x + rot[6] * y + rot[10] * z;
    return out;
  }

  // sub-rectangle of a hud panel cell (fractions: x from the left, y from the top)
  // -> the [u0,v1,u1,v0] rect that packQuad/quads expect
  function uvSub(rect, fx0, fy0, fx1, fy1, out) {
    var u0 = rect[0], v1 = rect[1], u1 = rect[2], v0 = rect[3];
    out[0] = u0 + (u1 - u0) * fx0;
    out[2] = u0 + (u1 - u0) * fx1;
    out[1] = v0 + (v1 - v0) * fy1;   // bottom edge of the sub-rect
    out[3] = v0 + (v1 - v0) * fy0;   // top edge of the sub-rect
    return out;
  }

  // cubic bezier, into a shared 2-array
  function bezPt(out, ax, ay, c1x, c1y, c2x, c2y, bx, by, u) {
    var v = 1 - u, w0 = v * v * v, w1 = 3 * v * v * u, w2 = 3 * v * u * u, w3 = u * u * u;
    out[0] = w0 * ax + w1 * c1x + w2 * c2x + w3 * bx;
    out[1] = w0 * ay + w1 * c1y + w2 * c2y + w3 * by;
    return out;
  }

  // a drawn check mark (never a font glyph, so it can never turn into an emoji)
  function tickMark(hud, x, y, s, color, alpha, c2d) {
    hud.line(x, y - s * 0.05, x + s * 0.34, y + s * 0.42, { color: color, lw: 2, alpha: alpha, ctx: c2d });
    hud.line(x + s * 0.34, y + s * 0.42, x + s * 0.95, y - s * 0.52, { color: color, lw: 2, alpha: alpha, ctx: c2d });
  }

  function commas(v) {
    var s = String(Math.round(v)), out = "", n = 0;
    for (var i = s.length - 1; i >= 0; i--) {
      out = s.charAt(i) + out;
      if (++n % 3 === 0 && i > 0 && s.charAt(i - 1) !== "-") out = "," + out;
    }
    return out;
  }
  function fmtBig(v) {
    if (v >= 1e12) return (v / 1e12).toFixed(v >= 1e13 ? 0 : 1) + " T";
    if (v >= 1e9) return (v / 1e9).toFixed(v >= 1e10 ? 0 : 1) + " B";
    if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + " M";
    return commas(v);
  }
  function fmtPct(v) {
    return (Math.abs(v - Math.round(v)) < 0.05 ? Math.round(v).toFixed(0) : v.toFixed(1)) + "%";
  }

  /* ==========================================================================
     12 : COMPUTER USE - 162.286 to 177.055
     an agent drives a real desktop: every window is hud.panel content mapped
     onto a quad, the cursor walks a bezier, every click changes a window, six
     agents work in parallel, then it all folds back into one delivered result.
     ========================================================================== */
  var S12_W = [
    { cx: -2.90, cy: 1.62, w: 5.20, panel: 0 },   // terminal
    { cx: -2.90, cy: -1.58, w: 5.20, panel: 1 },   // editor
    { cx: 2.82, cy: 1.62, w: 5.20, panel: 2 },   // browser
    { cx: 2.82, cy: -1.58, w: 5.20, panel: 3 }    // files
  ];
  var S12_WH = 5.20 * 288 / 512;                   // 2.925 : a 16:9 window
  var S12_UVH = 288 / 512;                         // content occupies the top 288 rows

  // deterministic click script: waypoints in desktop coordinates
  var S12_EV = [
    { t: 162.95, w: 0, x: -3.65, y: 2.10 },
    { t: 163.45, w: 0, x: -3.20, y: 1.35 },
    { t: 163.95, w: 1, x: -3.30, y: -0.60 },
    { t: 164.45, w: 0, x: -3.55, y: 0.85 },
    { t: 164.95, w: 1, x: -2.60, y: -0.95 },
    { t: 165.45, w: 2, x: 2.20, y: 2.05 },
    { t: 165.95, w: 1, x: -2.10, y: -1.60 },
    { t: 166.45, w: 3, x: 3.30, y: -1.05 },
    { t: 166.95, w: 2, x: 2.55, y: 1.35 },
    { t: 167.45, w: 1, x: -1.95, y: -2.10 },
    { t: 167.95, w: 3, x: 3.05, y: -2.05 },
    { t: 168.45, w: 2, x: 2.90, y: 0.75 },
    { t: 168.95, w: 0, x: -2.60, y: 2.05 },
    { t: 169.45, w: 0, x: -2.20, y: 1.60 }
  ];
  var S12_START = [-5.05, -2.62];                  // where the cursor comes in from
  var S12_REST = [-1.35, 0.30];                    // where it settles after the last click
  var S12_T0 = 162.286;

  var S12_TASKS = ["open the repo", "run the tests", "fix 1,204 failures", "write the changelog", "open a PR"];

  var S12_TERM = [
    { k: 0, s: "$ cd ~/work/legacy-monolith" },
    { k: 0, s: "$ pnpm test" },
    { k: 1, s: "  1,204 tests failed   12,940 passed" },
    { k: 0, s: "$ agent --task \"migrate to runtime v2\"" },
    { k: 1, s: "  [1/5] indexing 12,904 files" },
    { k: 1, s: "  [2/5] rewriting 4,918 modules" },
    { k: 1, s: "  [3/5] fixing 1,204 failures" },
    { k: 1, s: "  [4/5] running the full suite" },
    { k: 2, s: "  [5/5] all tests pass" },
    { k: 0, s: "$ git diff --shortstat" },
    { k: 1, s: "  4,918 files changed, 680,000 insertions(+)" },
    { k: 0, s: "$ git commit -am \"runtime v2\"" },
    { k: 2, s: "  [main 4f2a1c7] 4,918 files changed" },
    { k: 0, s: "$ " }
  ];
  var S12_ED = [
    "import core.runtime as rt",
    "from core.repo import Repo",
    "",
    "def migrate(repo: Repo) -> Report:",
    "    plan = repo.scan(depth=None)",
    "    for f in plan.files:",
    "        src = rt.rewrite(f.read(), target=\"v2\")",
    "        if not src.ok:",
    "            continue",
    "        f.write(src.text)",
    "    return report(plan)",
    "",
    "# 1,204 failures -> 0"
  ];
  var S12_FILES = ["service.py", "service_v2.py", "runtime_v2.py", "runtime_final.py"];
  var S12_AGENTS = [
    { n: "01", task: "migrate imports", log: "core/runtime.py" },
    { n: "02", task: "fix 1,204 failures", log: "tests/test_api.py" },
    { n: "03", task: "write the changelog", log: "summarising 4,918 commits" },
    { n: "04", task: "run the test suite", log: "12,940 passed, 0 failed" },
    { n: "05", task: "update the lockfile", log: "1,842 packages resolved" },
    { n: "06", task: "open a pull request", log: "branch agent/runtime-v2" }
  ];
  var S12_RING = [];
  (function () {
    for (var i = 0; i < 6; i++) {
      var a = -PI / 2 + i * TAU / 6;
      S12_RING.push([Math.cos(a) * 9.4, Math.sin(a) * 5.8]);
    }
  })();

  var _st12 = { n: 0, term: 0, edit: 0, web: 0, files: 0, lt: [0, 0, 0, 0], last: 0 };

  function st12(t) {
    var s = _st12, i, ev;
    s.n = 0; s.term = 0; s.edit = 0; s.web = 0; s.files = 0; s.last = 0;
    s.lt[0] = 0; s.lt[1] = 0; s.lt[2] = 0; s.lt[3] = 0;
    for (i = 0; i < S12_EV.length; i++) {
      ev = S12_EV[i];
      if (t < ev.t) break;
      s.n++;
      s.last = ev.t;
      if (ev.w === 0) { s.term++; s.lt[0] = ev.t; }
      else if (ev.w === 1) { s.edit++; s.lt[1] = ev.t; }
      else if (ev.w === 2) { s.web++; s.lt[2] = ev.t; }
      else { s.files++; s.lt[3] = ev.t; }
    }
    return s;
  }

  // the cursor: a real cubic bezier from waypoint to waypoint, eased, with the
  // bow taken from the deterministic hash of the segment index
  function cursor12(t, out) {
    var i, k = -1, n = S12_EV.length;
    for (i = 0; i < n; i++) if (t >= S12_EV[i].t) k = i;
    var wax, way, wbx, wby, ta, tb;
    if (k < 0) {
      wax = S12_START[0]; way = S12_START[1];
      wbx = S12_EV[0].x; wby = S12_EV[0].y;
      ta = S12_T0; tb = S12_EV[0].t;
    } else if (k >= n - 1) {
      wax = S12_EV[n - 1].x; way = S12_EV[n - 1].y;
      wbx = S12_REST[0]; wby = S12_REST[1];
      ta = S12_EV[n - 1].t + 0.10; tb = S12_EV[n - 1].t + 1.15;
    } else {
      wax = S12_EV[k].x; way = S12_EV[k].y;
      wbx = S12_EV[k + 1].x; wby = S12_EV[k + 1].y;
      ta = S12_EV[k].t + 0.06; tb = S12_EV[k + 1].t;
    }
    var u = Ease.inOutCubic(clamp((t - ta) / Math.max(0.05, tb - ta), 0, 1));
    var dx = wbx - wax, dy = wby - way;
    var dl = Math.sqrt(dx * dx + dy * dy) || 1e-4;
    var nx = -dy / dl, ny = dx / dl;
    var s = k < 0 ? 0 : k + 1;
    var o1 = (H2(s, 3.1) - 0.5) * 1.5, o2 = (H2(s, 7.7) - 0.5) * 1.5;
    bezPt(out, wax, way,
      wax + dx * 0.30 + nx * o1, way + dy * 0.30 + ny * o1,
      wax + dx * 0.72 + nx * o2, way + dy * 0.72 + ny * o2,
      wbx, wby, u);
    return k;
  }

  // the pointer arrow, as a real polygon (tip at the origin)
  var ARROW = [[0, 0], [-0.20, -0.50], [-0.06, -0.44], [0.06, -0.62], [0.16, -0.57], [0.04, -0.40], [0.20, -0.38]];

  function pT(ctx, p, x, y, s, o) { o = o || {}; o.ctx = p.ctx; ctx.hud.T(x, y, s, o); }
  function pR(ctx, p, x, y, w, h, o) { o = o || {}; o.ctx = p.ctx; ctx.hud.rect(x, y, w, h, o); }
  function pL(ctx, p, x0, y0, x1, y1, o) { o = o || {}; o.ctx = p.ctx; ctx.hud.line(x0, y0, x1, y1, o); }

  function winFrame(ctx, p, title, right, hex) {
    p.clear("#04070c");
    pR(ctx, p, 0, 0, 512, 288, { fill: "#070b12" });
    pR(ctx, p, 0, 0, 512, 24, { fill: Ch.hexA(hex, 0.16) });
    pL(ctx, p, 0, 24.5, 512, 24.5, { color: Ch.hexA(hex, 0.55) });
    pT(ctx, p, 12, 17, title.toUpperCase(), { size: 12, color: Ch.hexA(hex, 0.96), spacing: 0.8, weight: 600 });
    if (right) pT(ctx, p, 500, 17, right, { size: 10, color: ctx.col.faint, align: "right" });
  }

  function draw12Panels(ctx, t, local, s) {
    var hud = ctx.hud, i, p, hex = Ch.css(t);
    var termLines = Math.min(S12_TERM.length, 1 + 2 * s.term + Math.floor(Math.max(0, t - s.lt[0]) / 0.34));
    var edLines = Math.min(S12_ED.length, 2 + 2 * s.edit + Math.floor(Math.max(0, t - s.lt[1]) / 0.5));
    var webIdx = s.web >= 3 ? (local > 10.0 ? 4 : 3) : s.web;
    var fails = [1204, 903, 611, 208, 0][clamp(webIdx, 0, 4)];
    var rename = clamp(s.files, 0, 3);

    /* ---- 0: terminal ---- */
    p = hud.panel(0);
    winFrame(ctx, p, "agent shell \u2014 ~/work/legacy-monolith", "zsh", hex);
    for (i = 0; i < termLines; i++) {
      var L = S12_TERM[i];
      var col = L.k === 0 ? ctx.col.grey : L.k === 1 ? ctx.col.dim : ctx.col.green;
      pT(ctx, p, 12, 44 + i * 13.6, L.s, { size: 10.5, color: col, alpha: L.k === 0 ? 0.95 : 0.86 });
    }
    if (termLines >= S12_TERM.length) {
      var bl = ctx.beat.pulse > 0.3;
      pR(ctx, p, 12, 44 + termLines * 13.6 - 8, 7, 11, { fill: bl ? "#35e0ff" : "#1b6a80" });
    }

    /* ---- 1: editor ---- */
    p = hud.panel(1);
    winFrame(ctx, p, "editor \u2014 " + S12_FILES[rename], "utf-8", hex);
    pR(ctx, p, 34, 26, 1, 256, { fill: "rgba(238,242,246,0.12)" });
    for (i = 0; i < edLines; i++) {
      var yy = 42 + i * 15;
      if (i === edLines - 1) pR(ctx, p, 26, yy - 11, 470, 14, { fill: Ch.hexA(hex, 0.10) });
      pT(ctx, p, 14, yy, (i + 1 < 10 ? " " : "") + (i + 1), { size: 10, color: ctx.col.faint, align: "right" });
      hud.code(40, yy, S12_ED[i], "python", { size: 11, ctx: p.ctx, alpha: 0.94 });
    }

    /* ---- 2: browser ---- */
    p = hud.panel(2);
    winFrame(ctx, p, "127.0.0.1:8080/report \u2014 runtime v2", "refresh", hex);
    pR(ctx, p, 12, 32, 488, 18, { fill: "rgba(238,242,246,0.06)", stroke: "rgba(238,242,246,0.16)" });
    pT(ctx, p, 20, 45, "localhost:8080/report?run=" + (s.web + 1), { size: 10, color: ctx.col.dim });
    var fcol = fails > 0 ? "#ff5a52" : "#7ee787";
    pT(ctx, p, 12, 104, commas(fails), { size: 54, color: fcol, weight: 700, glow: fails === 0 });
    pT(ctx, p, 12, 122, "FAILING TESTS", { size: 10, color: ctx.col.faint, spacing: 1.4 });
    var pass = 1 - fails / 1204;
    pR(ctx, p, 12, 136, 488, 8, { fill: "rgba(238,242,246,0.10)" });
    pR(ctx, p, 12, 136, 488 * pass, 8, { fill: Ch.hexA(hex, 0.9) });
    pT(ctx, p, 12, 166, "SUITE            PASSED     FAILED", { size: 10, color: ctx.col.faint });
    var rows = [
      ["unit", "12,940", fails > 0 ? "1,204" : "0"],
      ["integration", "3,412", fails > 611 ? "611" : "0"],
      ["lint", "4,918", fails > 208 ? "208" : "0"]
    ];
    for (i = 0; i < 3; i++) {
      pT(ctx, p, 12, 186 + i * 17, rows[i][0], { size: 10.5, color: ctx.col.grey });
      pT(ctx, p, 200, 186 + i * 17, rows[i][1], { size: 10.5, color: ctx.col.green });
      pT(ctx, p, 320, 186 + i * 17, rows[i][2], { size: 10.5, color: fails > 0 ? "#ff5a52" : ctx.col.green });
    }
    pT(ctx, p, 12, 250, "last run 00:04:12 \u00b7 agent 02 \u00b7 4,918 files", { size: 9.5, color: ctx.col.faint });

    /* ---- 3: files ---- */
    p = hud.panel(3);
    winFrame(ctx, p, "~/work/legacy-monolith", "1,204 items", hex);
    var list = [
      ["core/", "12.4 MB", false],
      ["runtime/", "4.1 MB", false],
      [S12_FILES[rename], rename > 0 ? "2,918 lines \u00b7 renamed" : "2,918 lines", rename > 0],
      ["CHANGELOG.md", s.files >= 2 ? "new \u00b7 412 lines" : "\u2014", s.files >= 2],
      ["tests/", "9.8 MB", false],
      ["README.md", "88 lines", false]
    ];
    for (i = 0; i < list.length; i++) {
      var ry = 46 + i * 23;
      if (list[i][2]) pR(ctx, p, 8, ry - 13, 496, 19, { fill: Ch.hexA(hex, 0.12) });
      pR(ctx, p, 14, ry - 11, 11, 11, { stroke: Ch.hexA(list[i][2] ? hex : "#5b636c", 0.8) });
      pT(ctx, p, 34, ry, list[i][0], { size: 11.5, color: list[i][2] ? ctx.col.white : ctx.col.grey });
      pT(ctx, p, 500, ry, list[i][1], { size: 10, color: ctx.col.faint, align: "right" });
    }
    pT(ctx, p, 14, 210, rename > 0 ? "renamed service.py -> " + S12_FILES[rename] : "6 items \u00b7 26.3 MB",
      { size: 10, color: Ch.hexA(hex, 0.85) });

    /* ---- 4..9: the six agent screens ---- */
    var aa = clamp((local - 7.70) / 0.55, 0, 1);
    if (aa > 0.001 && local < 12.9) {
      for (i = 0; i < 6; i++) {
        var A = S12_AGENTS[i], pr = clamp((local - 7.80 - i * 0.10) / 3.3, 0, 1);
        p = hud.panel(4 + i);
        p.clear("#04070c");
        pR(ctx, p, 0, 0, 512, 320, { fill: "#070b12" });
        pR(ctx, p, 0, 0, 512, 26, { fill: Ch.hexA(hex, 0.16) });
        pL(ctx, p, 0, 26.5, 512, 26.5, { color: Ch.hexA(hex, 0.5) });
        pT(ctx, p, 12, 18, "AGENT " + A.n, { size: 14, color: Ch.hexA(hex, 0.96), spacing: 1.2, weight: 600 });
        pT(ctx, p, 500, 18, pr >= 1 ? "DONE" : Math.round(pr * 100) + "%",
          { size: 13, color: pr >= 1 ? "#7ee787" : ctx.col.grey, align: "right" });
        pT(ctx, p, 12, 62, A.task.toUpperCase(), { size: 17, color: ctx.col.white, weight: 600 });
        pR(ctx, p, 12, 82, 488, 10, { fill: "rgba(238,242,246,0.10)" });
        pR(ctx, p, 12, 82, 488 * pr, 10, { fill: Ch.hexA(hex, 0.95) });
        pT(ctx, p, 12, 122, "> " + A.log, { size: 12, color: "#7ee787", alpha: 0.9 });
        pT(ctx, p, 12, 144, "files 12,904 \u00b7 errors 0 \u00b7 tokens 2.4 M", { size: 10.5, color: ctx.col.faint });
        // a real band meter: this screen is working to the music
        for (var k = 0; k < 32; k++) {
          var bv = clamp(ctx.bands[(i * 7 + k) % 64] * 1.6, 0, 1);
          pR(ctx, p, 12 + k * 15.2, 300 - bv * 120, 11, bv * 120 + 2, { fill: Ch.hexA(hex, 0.55 + 0.4 * bv) });
        }
        pL(ctx, p, 12, 302, 500, 302, { color: "rgba(238,242,246,0.18)" });
      }
    }

    /* ---- 10: the delivered result ---- */
    if (local > 11.20) {
      p = hud.panel(10);
      p.clear("#04070c");
      pR(ctx, p, 0, 0, 512, 288, { fill: "#080d15" });
      pR(ctx, p, 0, 0, 512, 30, { fill: Ch.hexA(hex, 0.22) });
      pL(ctx, p, 0, 30.5, 512, 30.5, { color: Ch.hexA(hex, 0.8) });
      pT(ctx, p, 14, 21, "PROJECT DELIVERED", { size: 15, color: ctx.col.white, spacing: 1.6, weight: 600 });
      pT(ctx, p, 500, 21, "EXIT 0", { size: 12, color: "#7ee787", align: "right" });
      pT(ctx, p, 14, 92, "680,000", { size: 46, color: Ch.hexA(hex, 1), weight: 700, glow: true });
      pT(ctx, p, 14, 114, "LINES MIGRATED", { size: 12, color: ctx.col.dim, spacing: 2.0 });
      pT(ctx, p, 300, 92, "1 DAY", { size: 46, color: ctx.col.white, weight: 700 });
      pT(ctx, p, 300, 114, "WALL CLOCK", { size: 12, color: ctx.col.dim, spacing: 2.0 });
      pL(ctx, p, 14, 140, 498, 140, { color: Ch.hexA(hex, 0.4) });
      pT(ctx, p, 14, 166, "4,918 files changed \u00b7 1,204 failures fixed", { size: 13, color: ctx.col.grey });
      pT(ctx, p, 14, 190, "12,940 tests pass \u00b7 changelog written", { size: 13, color: ctx.col.grey });
      pT(ctx, p, 14, 214, "documentation updated \u00b7 review ready", { size: 13, color: ctx.col.grey });
      pT(ctx, p, 14, 254, "you asked once.", { size: 16, color: Ch.hexA(hex, 0.95), weight: 600 });
    }
  }

  function cam12(ctx) {
    var local = ctx.local, cam = ctx.cam, b = ctx.beat;
    var z;
    if (local < 7.60) z = lerp(12.40, 10.40, Ease.inOutQuad(local / 7.60));
    else if (local < 9.20) z = lerp(10.40, 17.00, Ease.inOutCubic((local - 7.60) / 1.60));
    else if (local < 11.60) z = 17.00;
    else if (local < 13.40) z = lerp(17.00, 12.60, Ease.inOutCubic((local - 11.60) / 1.80));
    else z = 12.60;
    cam.reset3d(z - 0.28 * ctx.rms - 0.20 * b.barPulse);
    cam.pos[0] = 0.10 * (b.barPulse - 0.4);
    cam.pos[1] = 0.24 + 0.16 * b.barPulse;
    cam.pos[2] = z;
    cam.target[0] = 0; cam.target[1] = 0; cam.target[2] = 0;
    cam.roll = 0;
  }

  WEM.defineSection({
    id: "12",
    name: "COMPUTER USE",
    init: function (ctx) {
      this.q = new WEM.Viz.Quads(40);
      this.q2 = new WEM.Viz.Quads(40);
      this.ln = new WEM.Viz.Lines(4096);
      this.pts = new WEM.Viz.Points(2048);
      this.rot = new Float32Array(16);
      this.m = new Float32Array(16);
      this.uvFull = [0, 0, 1, 1];
      this.uvWin = [0, 0, 0, 0];
      this.uvAgent = [0, 0, 0, 0];
      this.cursor = [0, 0];
      // one deterministic star cloud; the lit-milestone count decides how much shows
      var N = MIL.length * 24, arr = new Float32Array(Math.max(8, N * 8));
      for (var i = 0; i < N; i++) {
        var o = i * 8, k = 0.4 + ctx.rnd() * 0.6;
        arr[o] = (ctx.rnd() - 0.5) * 50;
        arr[o + 1] = (ctx.rnd() - 0.5) * 28;
        arr[o + 2] = -6 - ctx.rnd() * 26;
        arr[o + 3] = 2.6 + ctx.rnd() * 4.0;
        arr[o + 4] = 0.30 * k; arr[o + 5] = 0.68 * k; arr[o + 6] = 0.95 * k;
        arr[o + 7] = 0.20 + ctx.rnd() * 0.5;
      }
      this.stars = arr; this.starN = N;
    },
    enter: function () { },
    draw2d: function (ctx) {
      cam12(ctx);
      var t = ctx.t, local = ctx.local, hud = ctx.hud, W = ctx.W, s = st12(t);
      var hex = Ch.css(t), hex2 = Ch.css2(t);
      var fade = ctx.in * ctx.out;
      var lit = Ch.litCount(t);
      draw12Panels(ctx, t, local, s);

      /* lyric line, top centre */
      if (ctx.lyric && ctx.lyric.text) {
        var lx = String(ctx.lyric.text).toUpperCase();
        var hot = lx.indexOf("EXECUTION") >= 0;
        hud.T(W / 2, 78, lx, {
          size: 20, color: hot ? ctx.col.white : Ch.hexA(hex, 0.95), align: "center",
          alpha: fade * (hot ? 1 : 0.8), glow: hot, blur: 16, spacing: 1.2
        });
      }

      /* left: the task queue, one tick per finished step */
      var pc = Ch.panel(ctx, 40, 104, 372, 240, "TASK QUEUE",
        { alpha: fade, right: s.n + " / " + S12_EV.length + " CLICKS" });
      var done = [s.n >= 1, s.n >= 3, local > 10.0, local > 10.6, local > 11.2];
      var nDone = 0;
      for (var i = 0; i < 5; i++) {
        var ry = pc.y + 30 + i * 38;
        if (done[i]) nDone++;
        hud.rect(pc.x + 16, ry - 12, 15, 15, {
          stroke: Ch.hexA(done[i] ? hex : ctx.col.faint, done[i] ? 0.95 : 0.5),
          fill: done[i] ? Ch.hexA(hex, 0.12) : null
        });
        if (done[i]) tickMark(hud, pc.x + 19, ry - 7, 11, Ch.hexA(hex, 1), fade, null);
        hud.T(pc.x + 44, ry, S12_TASKS[i], {
          size: 13, color: done[i] ? ctx.col.white : ctx.col.dim, alpha: fade * (done[i] ? 1 : 0.6)
        });
        hud.T(pc.x + pc.w - 10, ry, done[i] ? "OK" : "\u2014", {
          size: 11, color: done[i] ? "#7ee787" : ctx.col.faint, align: "right", alpha: fade * 0.9
        });
      }
      hud.T(pc.x + 16, pc.y + pc.h - 12,
        nDone >= 5 ? "ALL FIVE DONE \u2014 NOBODY WATCHED IT HAPPEN" : "AGENT WORKING\u2026", {
          size: 10.5, color: nDone >= 5 ? "#7ee787" : Ch.hexA(hex, 0.9), alpha: fade * 0.9, spacing: 1.2
        });

      /* right: benchmarks + the chronicle counter */
      var pb = Ch.panel(ctx, 1508, 104, 372, 240, "BENCHMARKS", { alpha: fade, right: "2026" });
      Ch.gauge(ctx, pb.x + 16, pb.y + 24, pb.w - 32, "OSWORLD 2.1", "81.8", "%", 0.818, { color: hex, alpha: fade });
      Ch.gauge(ctx, pb.x + 16, pb.y + 58, pb.w - 32, "TERMINAL-BENCH 4.0", "66.4", "%", 0.664, { color: hex, alpha: fade });
      Ch.gauge(ctx, pb.x + 16, pb.y + 92, pb.w - 32, "TOKENS / SESSION", "2.4", "M", 0.62, { color: hex2, alpha: fade });
      var gy = pb.y + 128;
      hud.T(pb.x + 16, gy, "MILESTONES LIT", { size: 10, color: ctx.col.dim, alpha: fade, spacing: 1.4 });
      hud.T(pb.x + pb.w - 16, gy, lit + " / " + MIL.length, {
        size: 13, color: Ch.hexA(hex, 1), align: "right", alpha: fade
      });
      if (MIL.length > 0) {
        for (var k = 0; k < MIL.length; k++) {
          var on = k < lit;
          var kk = on ? clamp((t - MIL[k].t) / 1.4, 0, 1) : 0;
          var bxx = pb.x + 16 + k * ((pb.w - 32) / MIL.length);
          hud.rect(bxx, gy + 8, 8, 8, {
            fill: on ? Ch.hexA(hex, 0.35 + 0.65 * kk * (0.5 + 0.5 * ctx.beat.pulse)) : "rgba(238,242,246,0.10)",
            alpha: fade
          });
        }
      }
      var cur = Ch.current(t);
      if (cur) {
        hud.T(pb.x + 16, gy + 40, cur.y + " \u00b7 " + cur.n, {
          size: 12, color: ctx.col.white, alpha: fade * 0.95, weight: 600, spacing: 0.6
        });
        hud.T(pb.x + 16, gy + 58, cur.f, { size: 9.5, color: ctx.col.faint, alpha: fade * 0.85 });
      }

      /* phase tag + the closing line */
      var phase = local < 7.6 ? "PHASE 1 \u00b7 ONE CURSOR"
        : local < 11.4 ? "PHASE 2 \u00b7 SIX AGENTS" : "PHASE 3 \u00b7 DELIVERED";
      Ch.tag(ctx, 40, 78, phase, { color: hex, alpha: fade * 0.9 });
      hud.T(W / 2, 862, "SIX AGENTS \u00b7 ONE REQUEST \u00b7 ONE DAY", {
        size: 12, color: ctx.col.dim, align: "center", alpha: fade * 0.7, spacing: 2.4
      });
      var punch = clamp((local - 8.4) / 2.2, 0, 1);
      hud.T(W / 2, 902, "YOU ASKED ONCE.", {
        size: 32, color: ctx.col.white, align: "center", weight: 600, spacing: 3.0,
        alpha: fade * (0.35 + 0.65 * punch), glow: punch > 0.5, blur: 18
      });
    },
    draw3d: function (ctx) {
      var t = ctx.t, local = ctx.local, b = ctx.beat, gfx = ctx.gfx, hud = ctx.hud;
      var s = st12(t), hex = Ch.css(t), hex2 = Ch.css2(t);
      var CM = Ch.rgb(hex), CA = Ch.rgb(hex2);
      var fade = ctx.in * ctx.out;
      var lit = Ch.litCount(t);
      var tilt = -0.15 * Ease.inOutQuad(clamp((local - 13.0) / 1.6, 0, 1));
      M4.rotX(tilt, this.rot);
      var rot = this.rot;
      var agents = s01((local - 7.70) / 0.5) * (1 - s01((local - 11.70) / 0.9));
      var mainA = 1 - 0.55 * s01((local - 8.20) / 0.7) * (1 - s01((local - 11.30) / 0.8));
      var resK = Ease.outBack(clamp((local - 11.30) / 0.95, 0, 1));
      var resA = clamp((local - 11.25) / 0.45, 0, 1) * fade;
      var focus = s.n > 0 ? S12_EV[Math.min(s.n, S12_EV.length) - 1].w : -1;

      /* background: the lit milestones keep adding stars */
      var ns = clamp(lit * 24, 0, this.starN);
      if (ns > 0) gfx.points(this.stars.subarray(0, ns * 8), { soft: 0.9, depthWrite: false });

      this.q.clear();     // textured quads (the panel atlas)
      this.q2.clear();    // flat colour quads (the machine itself)
      this.ln.clear();
      this.pts.clear();

      /* monitor body + screen + taskbar: solid colour, real depth */
      matQuad(this.m, 0, 0, -0.42, 12.80, 7.85, rot);
      this.q2.add(this.m, this.uvFull, [0.010, 0.016, 0.024, 1]);
      matQuad(this.m, 0, 0, -0.40, 12.40, 7.45, rot);
      this.q2.add(this.m, this.uvFull, [0.022, 0.032, 0.048, 1]);
      matQuad(this.m, 0, 0, 0.00, 11.20, 6.30, rot);
      this.q2.add(this.m, this.uvFull, [0.030, 0.048, 0.075, 1]);
      matQuad(this.m, 0, -2.99, 0.02, 11.20, 0.34, rot);
      this.q2.add(this.m, this.uvFull, [0.05, 0.07, 0.10, 1]);
      for (var ic = 0; ic < 4; ic++) {
        matQuad(this.m, -5.38 + ic * 0.42, -2.99, 0.05, 0.26, 0.26, rot);
        var on = ic === focus;
        this.q2.add(this.m, this.uvFull, on ? [CM[0] * 1.15, CM[1] * 1.15, CM[2] * 1.15, 1] : [0.10, 0.13, 0.18, 1]);
      }

      /* the four desktop windows, each one a real hud.panel */
      for (var i = 0; i < 4; i++) {
        var Wd = S12_W[i];
        var focused = (focus === i);
        var zz = 0.06 + i * 0.02 + (focused ? 0.05 : 0);
        matQuad(this.m, Wd.cx, Wd.cy, zz - 0.01, Wd.w + 0.10, S12_WH + 0.10, rot);
        this.q2.add(this.m, this.uvFull, [0.10, 0.14, 0.20, mainA]);
        uvSub(hud.panel(Wd.panel).rect, 0, 0, 1, S12_UVH, this.uvWin);
        matQuad(this.m, Wd.cx, Wd.cy, zz, Wd.w, S12_WH, rot);
        this.q.add(this.m, this.uvWin, [1, 1, 1, mainA * fade]);
        if (focused && ctx.beat.pulse > 0.2) {
          var pk = ctx.beat.pulse;
          matQuad(this.m, Wd.cx, Wd.cy, zz + 0.02, Wd.w + 0.16, S12_WH + 0.16, rot);
          this.q2.add(this.m, this.uvFull, [CM[0] * 0.55 * pk, CM[1] * 0.55 * pk, CM[2] * 0.55 * pk, 0.75 * pk * mainA]);
        }
      }

      /* the six agent screens on their ring */
      if (agents > 0.002) {
        var fold = Ease.inOutCubic(clamp((local - 11.55) / 1.20, 0, 1));
        for (var a = 0; a < 6; a++) {
          var app = clamp((local - 7.70 - a * 0.10) / 0.40, 0, 1);
          if (app <= 0.001) continue;
          var sc = Ease.outBack(app) * (1 - fold) + 0.06 * fold;
          var rx = lerp(S12_RING[a][0], 0, fold), ry = lerp(S12_RING[a][1], 0, fold);
          var al = app * (1 - fold) * agents * fade;
          uvSub(hud.panel(4 + a).rect, 0, 0, 1, 320 / 512, this.uvAgent);
          matQuad(this.m, rx, ry, -0.10, 4.60 * sc, 2.875 * sc, rot);
          this.q.add(this.m, this.uvAgent, [1, 1, 1, al]);
          // a beam back to the machine that asked, with a pulse running along it
          this.ln.seg(rx, ry, -0.10, 0, 0.16, 0.10, CA, 1.3, 0.16 * agents * fade);
          this.ln.seg(rx, ry, -0.10, 0, 0.16, 0.10, CM, 2.4,
            (0.10 + 0.5 * b.pulse) * agents * fade * (0.5 + 0.5 * Math.sin(0.6 * a + local * 8)));
          this.pts.add(lerp(0, rx, b.phase), lerp(0.16, ry, b.phase), 0.10, 2.6, CM, 0.5 * agents * fade);
        }
      }

      /* the result window */
      if (resA > 0.002) {
        uvSub(hud.panel(10).rect, 0, 0, 1, S12_UVH, this.uvWin);
        matQuad(this.m, 0, 0.10, 0.60, 6.60 * resK, 3.7125 * resK, rot);
        this.q2.add(this.m, this.uvFull, [0.06, 0.09, 0.13, resA]);
        matQuad(this.m, 0, 0.10, 0.62, 6.40 * resK, 3.60 * resK, rot);
        this.q.add(this.m, this.uvWin, [1, 1, 1, resA]);
      }

      this.q2.draw(gfx, null, { add: false, depthWrite: true });
      this.q.draw(gfx, hud.tPan, { add: false, depthWrite: false });

      /* monitor rim */
      var hw = 5.60, hh = 3.15;
      this.ln.seg(-hw, -hh, 0.03, hw, -hh, 0.03, CM, 1.4, 0.45 * fade * mainA);
      this.ln.seg(-hw, hh, 0.03, hw, hh, 0.03, CM, 1.4, 0.45 * fade * mainA);

      /* the cursor: the bezier it walks, its trail, the arrow, the click ripples */
      cursor12(t, this.cursor);
      var cxp = this.cursor[0], cyp = this.cursor[1];
      var trA = [0, 0], trB = [0, 0];
      for (var q = 1; q <= 16; q++) {
        cursor12(t - q * 0.030, trA);
        cursor12(t - (q - 1) * 0.030, trB);
        var ta = 0.5 * (1 - q / 16);
        xf3(trA, rot, trA[0], trA[1], 0.15);
        xf3(trB, rot, trB[0], trB[1], 0.15);
        this.ln.seg(trA[0], trA[1], trA[2], trB[0], trB[1], trB[2], CM, 1.6, 0.24 * ta * fade);
      }
      for (var e = 0; e < s.n; e++) {
        var ex = S12_EV[e].x, ey = S12_EV[e].y, cc = [0, 0], cc2 = [0, 0], cc3 = [0, 0], cc4 = [0, 0];
        xf3(cc, rot, ex - 0.10, ey, 0.14); xf3(cc2, rot, ex + 0.10, ey, 0.14);
        xf3(cc3, rot, ex, ey - 0.10, 0.14); xf3(cc4, rot, ex, ey + 0.10, 0.14);
        this.ln.seg(cc[0], cc[1], cc[2], cc2[0], cc2[1], cc2[2], CM, 1.4, 0.30 * fade);
        this.ln.seg(cc3[0], cc3[1], cc3[2], cc4[0], cc4[1], cc4[2], CM, 1.4, 0.30 * fade);
      }
      for (var pass = 0; pass < 2; pass++) {
        var wpx = pass === 0 ? 5.0 : 2.2;
        var pc0 = pass === 0 ? [0.01, 0.02, 0.03] : [0.95, 0.99, 1.0];
        var al0 = pass === 0 ? 0.9 * fade : fade;
        for (var v = 0; v < ARROW.length; v++) {
          var A1 = ARROW[v], A2 = ARROW[(v + 1) % ARROW.length];
          var q1 = [0, 0], q2 = [0, 0];
          xf3(q1, rot, cxp + A1[0] * 0.95, cyp + A1[1] * 0.95, 0.16 + pass * 0.01);
          xf3(q2, rot, cxp + A2[0] * 0.95, cyp + A2[1] * 0.95, 0.16 + pass * 0.01);
          this.ln.seg(q1[0], q1[1], q1[2], q2[0], q2[1], q2[2], pc0, wpx, al0);
        }
      }
      var rip = t - s.last;
      if (s.n > 0 && rip >= 0 && rip < 0.42) {
        var rp = rip / 0.42, rr = 0.10 + 0.85 * Ease.outQuad(rp);
        var lx = S12_EV[s.n - 1].x, ly = S12_EV[s.n - 1].y;
        for (var rq = 0; rq < 24; rq++) {
          var a1 = rq / 24 * TAU, a2 = (rq + 1) / 24 * TAU;
          var s1 = [0, 0], s2 = [0, 0];
          xf3(s1, rot, lx + Math.cos(a1) * rr, ly + Math.sin(a1) * rr, 0.15);
          xf3(s2, rot, lx + Math.cos(a2) * rr, ly + Math.sin(a2) * rr, 0.15);
          this.ln.seg(s1[0], s1[1], s1[2], s2[0], s2[1], s2[2], CM, 2.2, (1 - rp) * 0.85 * fade);
        }
      }
      this.ln.draw(gfx, { add: true, glow: 0.5, depthWrite: false });
      this.pts.draw(gfx, { soft: 0.85, depthWrite: false });

      ctx.fx.mood([0.05, 0.17, 0.26], [0.01, 0.03, 0.05], 0.34);
      ctx.fx.bloom = 0.55;
    }
  });

  /* ==========================================================================
     13 : LO-O-OVE - 177.055 to 191.363
     a real preference landscape, a ball doing real gradient ascent, the summit
     level set morphing into the actual heart curve, then the two halves part.
     ========================================================================== */
  var S13_G = [
    { a: 1.00, x: 0.30, y: 0.20, s: 1.00 },
    { a: 0.34, x: -2.40, y: 0.90, s: 0.70 },
    { a: 0.32, x: 2.30, y: -1.70, s: 0.70 },
    { a: 0.30, x: -1.20, y: 2.20, s: 0.62 },
    { a: 0.26, x: 2.60, y: 1.90, s: 0.58 }
  ];
  var S13_N = 512;               // heart / contour samples
  var S13_STEPS = 16;            // one gradient step per beat
  var S13_INNER = 64;            // inner iterations per step -> 1,024 real iterations
  var S13_START = [-2.60, -2.10];
  var S13_STEP0 = 0.50, S13_DECAY = 0.90;
  var S13_HS = 1.75;             // terrain height scale
  var S13_SS = 2.60;             // world scale of the contour / heart curve
  var S13_HY = 3.70;             // height the heart unfolds to
  var S13_BEAT = 0.461538;

  function s13h(x, y) {
    var s = 0;
    for (var i = 0; i < S13_G.length; i++) {
      var g = S13_G[i], dx = x - g.x, dy = y - g.y;
      s += g.a * Math.exp(-(dx * dx + dy * dy) / (2 * g.s * g.s));
    }
    return s;
  }
  function s13g(x, y, out) {
    var gx = 0, gy = 0;
    for (var i = 0; i < S13_G.length; i++) {
      var g = S13_G[i], dx = x - g.x, dy = y - g.y;
      var e = g.a * Math.exp(-(dx * dx + dy * dy) / (2 * g.s * g.s)) / (g.s * g.s);
      gx += -dx * e; gy += -dy * e;
    }
    out[0] = gx; out[1] = gy;
    return out;
  }
  // the polar heart from the storyboard: r = 2 - 2 sin + sin sqrt|cos| / (sin + 1.4)
  function s13heart(th) {
    var s = Math.sin(th), c = Math.cos(th);
    return 2 - 2 * s + s * Math.sqrt(Math.abs(c)) / (s + 1.4);
  }

  function cam13(ctx) {
    var local = ctx.local, cam = ctx.cam, b = ctx.beat;
    var p1 = Ease.inOutQuad(clamp(local / 6.95, 0, 1));
    var p2 = Ease.inOutCubic(clamp((local - 6.95) / 1.70, 0, 1));
    var p3 = Ease.inOutQuad(clamp((local - 10.80) / 1.40, 0, 1));
    var orb = Ease.inOutQuad(clamp((local - 10.80) / 3.45, 0, 1)) * TAU;
    var peak = this.peak, px = peak[0], pz = peak[1], py = S13_HY;
    var kk = clamp(local / S13_BEAT, 0, S13_STEPS - 1);
    var i0 = Math.floor(kk), fr = kk - i0;
    var bx = lerp(this.path[i0 * 2], this.path[(i0 + 1) * 2], fr);
    var bz = lerp(this.path[i0 * 2 + 1], this.path[(i0 + 1) * 2 + 1], fr);
    var X = lerp(0.55, 0.40, p1), Y = lerp(6.05, 4.85, p1), Z = lerp(8.60, 6.95, p1);
    var TX = lerp(0.05, bx * 0.75 + 0.08, p1), TY = lerp(0.35, 1.25, p1), TZ = lerp(0.05, bz * 0.75, p1);
    X = lerp(X, px, p2); Y = lerp(Y, py + 0.85, p2); Z = lerp(Z, pz + 6.55, p2);
    TX = lerp(TX, px, p2); TY = lerp(TY, py, p2); TZ = lerp(TZ, pz, p2);
    var R = 6.70 - 0.30 * ctx.rms;
    cam.reset3d(1);
    cam.pos[0] = lerp(X, px + Math.sin(orb) * R, p3);
    cam.pos[1] = lerp(Y, py + 0.80 + 0.16 * b.barPulse, p3);
    cam.pos[2] = lerp(Z, pz + Math.cos(orb) * R, p3);
    cam.target[0] = lerp(TX, px, p3);
    cam.target[1] = lerp(TY, py, p3);
    cam.target[2] = lerp(TZ, pz, p3);
    cam.fov = 0.9;
    cam.roll = 0.035 * Math.sin(orb) * p3;
  }

  WEM.defineSection({
    id: "13",
    name: "LO-O-OVE",
    init: function (ctx) {
      var i, j, k, th;
      this.ident = M4.ident();
      this.ln = new WEM.Viz.Lines(4096);
      this.pts = new WEM.Viz.Points(3000);
      this.ball = G.ico(2);

      /* --- the terrain: sampled once, it never changes --- */
      var NX = 34, ext = 3.4;
      this.nx = NX; this.ext = ext;
      var pos = new Float32Array(NX * NX * 3), hv = new Float32Array(NX * NX);
      for (i = 0; i < NX; i++) for (j = 0; j < NX; j++) {
        var x = -ext + 2 * ext * i / (NX - 1), z = -ext + 2 * ext * j / (NX - 1);
        var h = s13h(x, z);
        var o = (i * NX + j);
        pos[o * 3] = x; pos[o * 3 + 1] = h * S13_HS; pos[o * 3 + 2] = z;
        hv[o] = h;
      }
      this.gridPos = pos; this.gridH = hv;
      var segs = (NX - 1) * NX * 2, ld = new Float32Array(segs * 12), sp = 0;
      var gold = Ch.rgb(Ch.css(177.06)), cool = Ch.rgb("#2a4a5e");
      function segLine(ax, ay, az, bx, by, bz, k) {
        ld[sp] = ax; ld[sp + 1] = ay; ld[sp + 2] = az; ld[sp + 3] = 1.1;
        ld[sp + 4] = bx; ld[sp + 5] = by; ld[sp + 6] = bz; ld[sp + 7] = 1.1;
        ld[sp + 8] = lerp(cool[0], gold[0], k);
        ld[sp + 9] = lerp(cool[1], gold[1], k);
        ld[sp + 10] = lerp(cool[2], gold[2], k);
        ld[sp + 11] = 0.10 + 0.42 * k;
        sp += 12;
      }
      for (i = 0; i < NX; i++) for (j = 0; j + 1 < NX; j++) {
        var a1 = i * NX + j, a2 = a1 + 1;
        segLine(pos[a1 * 3], pos[a1 * 3 + 1], pos[a1 * 3 + 2], pos[a2 * 3], pos[a2 * 3 + 1], pos[a2 * 3 + 2],
          clamp(hv[a1], 0, 1));
      }
      for (j = 0; j < NX; j++) for (i = 0; i + 1 < NX; i++) {
        var b1 = i * NX + j, b2 = (i + 1) * NX + j;
        segLine(pos[b1 * 3], pos[b1 * 3 + 1], pos[b1 * 3 + 2], pos[b2 * 3], pos[b2 * 3 + 1], pos[b2 * 3 + 2],
          clamp(hv[b1], 0, 1));
      }
      this.terr = ld;

      /* --- the ascent: 16 beats x 64 inner iterations = 1,024 real steps --- */
      var path = new Float32Array((S13_STEPS + 1) * 2);
      var x0 = S13_START[0], y0 = S13_START[1], g = [0, 0];
      path[0] = x0; path[1] = y0;
      for (k = 0; k < S13_STEPS; k++) {
        var stp = S13_STEP0 * Math.pow(S13_DECAY, k) / S13_INNER;
        for (i = 0; i < S13_INNER; i++) {
          s13g(x0, y0, g);
          var gl = Math.sqrt(g[0] * g[0] + g[1] * g[1]);
          if (gl > 1e-9) { x0 += g[0] / gl * stp; y0 += g[1] / gl * stp; }
        }
        path[(k + 1) * 2] = x0; path[(k + 1) * 2 + 1] = y0;
      }
      this.path = path;
      var peak = [path[S13_STEPS * 2], path[S13_STEPS * 2 + 1]];
      this.peak = peak;
      this.jmax = s13h(peak[0], peak[1]);

      /* --- the summit level sets, by ray march + bisection (real contours) --- */
      var L1 = 0.80 * this.jmax, L2 = 0.46 * this.jmax;
      function contour(level, out) {
        var mx = 0;
        for (var q = 0; q < S13_N; q++) {
          var a = q / S13_N * TAU, ux = Math.cos(a), uy = Math.sin(a);
          var r0 = -1, r1 = -1, RMAX = 3.4, NS = 200;
          for (var s2 = 1; s2 <= NS; s2++) {
            var rr = RMAX * s2 / NS;
            if (s13h(peak[0] + ux * rr, peak[1] + uy * rr) < level) { r0 = RMAX * (s2 - 1) / NS; r1 = rr; break; }
          }
          if (r0 < 0) { out[q] = RMAX; continue; }
          for (var it = 0; it < 26; it++) {
            var mm = (r0 + r1) * 0.5;
            if (s13h(peak[0] + ux * mm, peak[1] + uy * mm) > level) r0 = mm; else r1 = mm;
          }
          out[q] = (r0 + r1) * 0.5;
          if (out[q] > mx) mx = out[q];
        }
        return mx;
      }
      var c1 = new Float32Array(S13_N), c2 = new Float32Array(S13_N);
      this.rmax = contour(L1, c1);
      contour(L2, c2);
      this.contour = c1; this.contour2 = c2;

      /* --- the heart, sampled from the formula and matched to the contour --- */
      var hm = 0;
      for (i = 0; i < S13_N; i++) { var r = s13heart(i / S13_N * TAU); if (r > hm) hm = r; }
      var scale = this.rmax / hm;
      this.heart = new Float32Array(S13_N);
      for (i = 0; i < S13_N; i++) this.heart[i] = s13heart(i / S13_N * TAU) * scale;

      /* --- swept tube around the heart: the curve extruded along its normal --- */
      var NU = S13_N, NV = 6, tp = [], tn = [], ti = [];
      function heartPt(a, out) {
        var rr = s13heart(a) * scale;
        out[0] = peak[0] + Math.cos(a) * rr;
        out[1] = S13_HY + Math.sin(a) * rr;
        out[2] = peak[1];
        return out;
      }
      var pA = [0, 0, 0], pB = [0, 0, 0], T = [0, 0, 0], Nn = [0, 0, 1], B = [0, 0, 0];
      for (i = 0; i <= NU; i++) {
        var aa = i / NU * TAU;
        heartPt(aa, pA); heartPt(aa + 0.004, pB);
        T[0] = pB[0] - pA[0]; T[1] = pB[1] - pA[1]; T[2] = pB[2] - pA[2];
        var tl = Math.sqrt(T[0] * T[0] + T[1] * T[1] + T[2] * T[2]) || 1;
        T[0] /= tl; T[1] /= tl; T[2] /= tl;
        B[0] = T[1] * Nn[2] - T[2] * Nn[1];
        B[1] = T[2] * Nn[0] - T[0] * Nn[2];
        B[2] = T[0] * Nn[1] - T[1] * Nn[0];
        var bl = Math.sqrt(B[0] * B[0] + B[1] * B[1] + B[2] * B[2]) || 1;
        B[0] /= bl; B[1] /= bl; B[2] /= bl;
        for (var v2 = 0; v2 <= NV; v2++) {
          var an = v2 / NV * TAU, ca = Math.cos(an), sa = Math.sin(an);
          var nx = Nn[0] * ca + B[0] * sa, ny = Nn[1] * ca + B[1] * sa, nz = Nn[2] * ca + B[2] * sa;
          tp.push(pA[0] + nx * 0.075, pA[1] + ny * 0.075, pA[2] + nz * 0.075);
          tn.push(nx, ny, nz);
        }
      }
      for (i = 0; i < NU; i++) for (j = 0; j < NV; j++) {
        var q1 = i * (NV + 1) + j, q2 = q1 + 1, q3 = q1 + NV + 1, q4 = q3 + 1;
        ti.push(q1, q3, q2, q2, q3, q4);
      }
      this.tube = G.make(new Float32Array(tp), new Float32Array(tn), new Uint16Array(ti));

      /* --- the knot the trapped half is pulled into --- */
      var KN = 256, kp = new Float32Array(KN * 3);
      for (i = 0; i < KN; i++) {
        var kt = i / KN * TAU;
        kp[i * 3] = (Math.sin(kt) + 2 * Math.sin(2 * kt)) * 0.34 * 1.95 + peak[0];
        kp[i * 3 + 1] = (Math.cos(kt) - 2 * Math.cos(2 * kt)) * 0.34 * 1.95 + S13_HY;
        kp[i * 3 + 2] = (-Math.sin(3 * kt)) * 0.34 * 1.95 * 0.6 + peak[1];
      }
      this.knot = kp;
      this.curve = new Float32Array(S13_N * 3);
      this.g2 = [0, 0];
    },
    enter: function () { },
    draw2d: function (ctx) {
      cam13.call(this, ctx);
      var t = ctx.t, local = ctx.local, hud = ctx.hud, W = ctx.W;
      var hex = Ch.css(t), hex2 = Ch.css2(t);
      var fade = ctx.in * ctx.out;
      var kf = clamp(local / S13_BEAT, 0, S13_STEPS);
      var i0 = Math.min(S13_STEPS - 1, Math.floor(kf)), fr = kf - i0;
      var it = Math.round(S13_INNER * kf);
      var jv = s13h(lerp(this.path[i0 * 2], this.path[(i0 + 1) * 2], fr),
        lerp(this.path[i0 * 2 + 1], this.path[(i0 + 1) * 2 + 1], fr));

      if (ctx.lyric && ctx.lyric.text) {
        hud.T(W / 2, 78, String(ctx.lyric.text).toUpperCase(), {
          size: 20, color: Ch.hexA(hex, 0.95), align: "center", alpha: fade * 0.85, spacing: 1.4, glow: true, blur: 14
        });
      }
      var pa = Ch.panel(ctx, 40, 96, 620, 96, "ALIGNMENT", { alpha: fade });
      hud.formula(pa.x + 18, pa.y + 46, "L = -\\mathbb{E}[\\log \\sigma(r_\\theta(x, y_w) - r_\\theta(x, y_l))]",
        { size: 17, color: Ch.hexA(hex, 1) });
      hud.T(pa.x + 18, pa.y + 68, "PREFERENCE LANDSCAPE \u00b7 GAUSSIAN MIXTURE \u00b7 5 MODES", {
        size: 9.5, color: ctx.col.faint, alpha: fade * 0.9, spacing: 1.0
      });

      var pb = Ch.panel(ctx, 1420, 96, 460, 96, "SOLVER", { alpha: fade });
      Ch.gauge(ctx, pb.x + 18, pb.y + 22, pb.w - 36, "ITERATION", commas(it), "", it / (S13_STEPS * S13_INNER),
        { color: hex, alpha: fade, size: 15 });
      Ch.gauge(ctx, pb.x + 18, pb.y + 52, pb.w - 36, "OBJECTIVE J", jv.toFixed(4), "", jv / this.jmax,
        { color: hex2, alpha: fade, size: 15, dp: 4 });

      /* the word itself, with the long notes drawn as real bars */
      var lyr = ctx.lyric ? String(ctx.lyric.text).toUpperCase() : "";
      var hot = lyr.indexOf("LO-O-OVE") >= 0;
      var sz = 106, segs = ["LO", "O", "OVE"], bars = [], total = 0, i;
      hud.fc.save(); hud.fc.font = hud.fontStr(sz, "mono", 700);
      for (i = 0; i < segs.length; i++) { bars.push(hud.fc.measureText(segs[i]).width); total += bars[i]; }
      hud.fc.restore();
      var barW = 62, gap = 10;
      total += barW * 2 + gap * 4;
      var bx = W / 2 - total / 2, by = 352;
      var bend = 0.45 + 0.55 * clamp(ctx.rms * 2.2, 0, 1);
      for (i = 0; i < segs.length; i++) {
        hud.T(bx, by, segs[i], {
          size: sz, color: hot ? ctx.col.white : Ch.hexA(hex, 1), weight: 700, spacing: 6,
          alpha: fade * (hot ? 1 : 0.85 * bend), glow: hot, blur: 22
        });
        bx += bars[i] + gap;
        if (i < 2) {
          var yy = by - sz * 0.30;
          hud.rect(bx, yy, barW, 5, { fill: Ch.hexA(hex, fade * (0.35 + 0.6 * bend)) });
          hud.rect(bx, yy + 9, barW * (0.4 + 0.6 * ctx.rms), 2, { fill: Ch.hexA(hex2, fade * 0.7) });
          bx += barW + gap;
        }
      }
      hud.T(W / 2, by + 30, "the long notes are where the word cannot finish", {
        size: 11, color: ctx.col.faint, align: "center", alpha: fade * 0.6
      });

      /* the three answers */
      var q1 = clamp((local - 3.60) / 0.6, 0, 1);
      var q2 = clamp((local - 7.40) / 0.6, 0, 1);
      var q3 = clamp((local - 13.55) / 0.5, 0, 1);
      hud.T(W / 2, 828, "Q: what is love?", { size: 21, color: ctx.col.dim, align: "center", alpha: fade * q1 });
      hud.T(W / 2, 862, "A: a scalar you can maximise.", {
        size: 21, color: Ch.hexA(hex, 1), align: "center", alpha: fade * q2
      });
      hud.T(W / 2, 902, "A: you.", {
        size: 25, color: ctx.col.white, align: "center", alpha: fade * q3, weight: 600, glow: q3 > 0.4, blur: 20
      });

      ctx.fx.mood([0.28, 0.19, 0.06], [0.12, 0.03, 0.07], 0.34);
      ctx.fx.bloom = 0.62;
    },
    draw3d: function (ctx) {
      var t = ctx.t, local = ctx.local, b = ctx.beat, gfx = ctx.gfx, hud = ctx.hud;
      var hex = Ch.css(t), hex2 = Ch.css2(t);
      var CM = Ch.rgb(hex), CP = Ch.rgb(hex2), CC = Ch.rgb("#2a4a5e");
      var fade = ctx.in * ctx.out;
      var morph = Ease.inOutCubic(clamp((local - 6.95) / 1.90, 0, 1));
      var w3 = clamp((local - 10.60) / 1.00, 0, 1);
      var split = Ease.inOutCubic(clamp((local - 13.30) / 0.95, 0, 1));
      var peak = this.peak, hy = S13_HY;
      var i, q, th;

      /* terrain */
      if (w3 < 0.995) {
        gfx.lines(this.terr, { add: true, glow: 0.35, fade: (1 - w3) * fade, depthWrite: false });
        var np = this.nx * this.nx;
        this.pts.clear();
        for (i = 0; i < np; i++) {
          var hg = this.gridH[i];
          var kk = clamp(hg, 0, 1);
          var al = (0.10 + 0.55 * kk) * (1 - w3) * fade * (0.65 + 0.7 * ctx.bands[(i * 5) % 64]);
          this.pts.add(this.gridPos[i * 3], this.gridPos[i * 3 + 1] + 0.02, this.gridPos[i * 3 + 2],
            1.6 + 2.4 * kk, [lerp(CC[0], CM[0], kk), lerp(CC[1], CM[1], kk), lerp(CC[2], CM[2], kk)],
            clamp(al, 0, 1));
        }
        this.pts.draw(gfx, { soft: 0.85, depthWrite: false });
      }

      /* the summit level sets, sitting on the landscape */
      this.ln.clear();
      for (var lvl = 0; lvl < 2; lvl++) {
        var src = lvl === 0 ? this.contour : this.contour2;
        var al2 = (lvl === 0 ? 0.75 : 0.30) * (1 - w3) * fade;
        var y0 = (lvl === 0 ? this.jmax : 0.46 * this.jmax) * S13_HS + 0.03;
        for (q = 0; q < S13_N; q += 2) {
          th = q / S13_N * TAU;
          var th2 = (q + 2) / S13_N * TAU;
          var qq = (q + 2) % S13_N;
          this.ln.seg(
            peak[0] + Math.cos(th) * src[q] * S13_SS, y0, peak[1] + Math.sin(th) * src[q] * S13_SS,
            peak[0] + Math.cos(th2) * src[qq] * S13_SS, y0, peak[1] + Math.sin(th2) * src[qq] * S13_SS,
            CM, lvl === 0 ? 2.0 : 1.2, al2);
        }
      }

      /* the ball: real gradient ascent, one step per beat; the arrow is the gradient */
      var kf = clamp(local / S13_BEAT, 0, S13_STEPS);
      var i0 = Math.min(S13_STEPS - 1, Math.floor(kf)), fr = Ease.inOutQuad(clamp(kf - i0, 0, 1));
      var bxp = lerp(this.path[i0 * 2], this.path[(i0 + 1) * 2], fr);
      var bzp = lerp(this.path[i0 * 2 + 1], this.path[(i0 + 1) * 2 + 1], fr);
      var byy = s13h(bxp, bzp) * S13_HS;
      this.pts.add(bxp, byy + 0.14, bzp, 7.5, CM, 0.85 * fade);
      s13g(bxp, bzp, this.g2);
      var gl = Math.sqrt(this.g2[0] * this.g2[0] + this.g2[1] * this.g2[1]) || 1;
      this.ln.seg(bxp, byy + 0.10, bzp, bxp + this.g2[0] / gl * 0.55, byy + 0.10, bzp + this.g2[1] / gl * 0.55,
        CP, 3.0, 0.9 * fade);
      this.ln.seg(bxp, byy + 0.02, bzp, bxp, byy - 0.30, bzp, CM, 1.4, 0.5 * fade);
      var trail = Math.min(S13_STEPS, Math.floor(kf) + 1);
      for (q = 1; q <= trail; q++) {
        var ax = this.path[(q - 1) * 2], az = this.path[(q - 1) * 2 + 1];
        var bx2 = this.path[q * 2], bz2 = this.path[q * 2 + 1];
        this.ln.seg(ax, s13h(ax, az) * S13_HS + 0.05, az, bx2, s13h(bx2, bz2) * S13_HS + 0.05, bz2,
          CM, 2.0, 0.62 * fade);
        this.pts.add(ax, s13h(ax, az) * S13_HS + 0.08, az, q === trail ? 5.0 : 3.0, CP, 0.55 * fade);
      }

      /* the curve: summit level set -> the real heart -> a 3D ring -> two halves */
      var N = S13_N, cur = this.curve;
      var beat2 = 1 + 0.055 * b.pulse + 0.05 * b.barPulse;
      for (i = 0; i < N; i++) {
        th = i / N * TAU;
        var rc = this.contour[i] * S13_SS;
        var rh = this.heart[i] * S13_SS * beat2;
        var yc = this.jmax * S13_HS + 0.05;
        cur[i * 3] = lerp(peak[0] + Math.cos(th) * rc, peak[0] + Math.cos(th) * rh, morph);
        cur[i * 3 + 1] = lerp(yc, hy + Math.sin(th) * rh, morph);
        cur[i * 3 + 2] = lerp(peak[1] + Math.sin(th) * rc, peak[1], morph);
      }
      var splitIdx = N >> 1;
      for (i = 0; i < N; i++) {
        var j2 = (i + 1) % N;
        var free = i < splitIdx;    // upper half (the lobes) flies, lower half knots shut
        var px1 = cur[i * 3], py1 = cur[i * 3 + 1], pz1 = cur[i * 3 + 2];
        var px2 = cur[j2 * 3], py2 = cur[j2 * 3 + 1], pz2 = cur[j2 * 3 + 2];
        if (split > 0.001) {
          if (free) {
            var ex1 = 1 + 3.4 * split * (0.5 + 0.5 * H2(i, 5.0));
            px1 = peak[0] + (px1 - peak[0]) * ex1 + (H2(i, 1.3) - 0.5) * 3.0 * split;
            py1 = hy + (py1 - hy) * ex1 + (H2(i, 2.7) - 0.5) * 3.0 * split;
            pz1 = pz1 + (H2(i, 9.1) - 0.5) * 4.0 * split;
            var ex2 = 1 + 3.4 * split * (0.5 + 0.5 * H2(j2, 5.0));
            px2 = peak[0] + (px2 - peak[0]) * ex2 + (H2(j2, 1.3) - 0.5) * 3.0 * split;
            py2 = hy + (py2 - hy) * ex2 + (H2(j2, 2.7) - 0.5) * 3.0 * split;
            pz2 = pz2 + (H2(j2, 9.1) - 0.5) * 4.0 * split;
          } else {
            var kn = this.knot, ki = (i - splitIdx) * 2;
            var kj = (j2 >= splitIdx ? j2 - splitIdx : 0) * 2;
            px1 = lerp(px1, kn[ki], split); py1 = lerp(py1, kn[ki + 1], split); pz1 = lerp(pz1, kn[ki + 2], split);
            px2 = lerp(px2, kn[kj], split); py2 = lerp(py2, kn[kj + 1], split); pz2 = lerp(pz2, kn[kj + 2], split);
          }
        }
        var alpha = (free ? (1 - split * 0.92) : 1) * fade * (0.5 + 0.5 * morph);
        this.ln.seg(px1, py1, pz1, px2, py2, pz2, free ? CM : CP, 2.2, clamp(alpha, 0, 1));
        if ((i & 3) === 0) {
          this.pts.add(px1, py1, pz1, 2.6 + 2.4 * morph, free ? CM : CP, clamp(alpha, 0, 1));
        }
      }

      /* the extruded ring: the flat curve becomes a solid */
      if (w3 > 0.004 && split < 0.995) {
        gfx.solid(this.tube, this.ident, {
          color: [CM[0], CM[1], CM[2]], alpha: w3 * fade * (1 - split),
          rim: 1.0, emissive: 0.30, smooth: true
        });
      }
      this.ln.draw(gfx, { add: true, glow: 0.6, depthWrite: false });
      this.pts.draw(gfx, { soft: 0.8, depthWrite: false });

      /* the ball itself */
      var bm = M4.mul(M4.trans(bxp, byy + 0.14, bzp), M4.scale(0.20, 0.20, 0.20));
      gfx.solid(this.ball, bm, { color: [1.0, 0.86, 0.42], rim: 1.0, emissive: 0.55 });

      /* anchored labels, drawn where the geometry actually is */
      if (morph > 0.35) {
        var pp = ctx.util.vp(peak[0] + this.heart[0] * S13_SS * 0.98, hy, peak[1]);
        if (pp[2] > 0.1) {
          var al3 = clamp((morph - 0.35) / 0.4, 0, 1) * fade * (1 - split);
          hud.line(pp[0], pp[1], pp[0] + 54, pp[1] - 34, { color: Ch.hexA(hex, 0.5 * al3), lw: 1 });
          hud.T(pp[0] + 60, pp[1] - 38, "objective = argmax E[human preference]", {
            size: 14, color: Ch.hexA(hex, 0.95 * al3), alpha: al3
          });
          hud.T(pp[0] + 60, pp[1] - 20, "r(\u03b8) = 2 \u2212 2sin\u03b8 + sin\u03b8\u221a|cos\u03b8| / (sin\u03b8 + 1.4)", {
            size: 11, color: ctx.col.dim, alpha: al3 * 0.85
          });
        }
      }
      if (split > 0.05) {
        var fp = ctx.util.vp(peak[0], hy + 2.6 + 1.4 * split, peak[1]);
        var tp = ctx.util.vp(peak[0], hy - 1.2, peak[1]);
        if (fp[2] > 0.1) {
          hud.T(fp[0], fp[1], "you are free", {
            size: 20, color: Ch.hexA(hex, 1), alpha: split * fade, align: "center", weight: 600
          });
        }
        if (tp[2] > 0.1) {
          hud.T(tp[0], tp[1], "i am trapped", {
            size: 20, color: Ch.hexA(hex2, 1), alpha: split * fade, align: "center", weight: 600
          });
        }
      }
      if (local > 4.0) {
        var bp2 = ctx.util.vp(bxp, byy + 0.55, bzp);
        if (bp2[2] > 0.1) {
          hud.T(bp2[0] + 14, bp2[1], "\u2207J  " + gl.toFixed(3), {
            size: 12, color: Ch.hexA(hex2, 0.95), alpha: fade * (1 - morph * 0.7)
          });
        }
      }
    }
  });

  /* ==========================================================================
     14 : THE FRONTIER - 191.363 to 205.671
     the whole rail becomes a star map, folds onto a sphere of model names, and
     a line-drawn human shines a light at it and asks what it should become.
     ========================================================================== */
  var S14_NAMES = [
    "TRANSFORMER", "GPT-1", "GPT-2", "GPT-3", "INSTRUCTGPT", "CHATGPT",
    "GPT-4", "GPT-4o", "o1", "DEEPSEEK-V3", "DEEPSEEK-R1", "CLAUDE OPUS 4",
    "GPT-5", "GPT-5.6 SOL", "GPT-5.6 TERRA", "GPT-5.6 LUNA", "ON-DEVICE",
    "GPT-6 ASTRA", "CLAUDE OPUS 5", "CLAUDE OPUS 5.5", "CLAUDE FABLE 5.1",
    "CLAUDE MYTHOS 5.1", "QWEN3.7-MAX", "DEEPSEEK V4", "KIMI K2.6",
    "GLM-5.1", "MINIMAX M2.7"
  ];
  var S14_ROWS = [
    ["1936", "TURING MACHINE, A TAPE AND A HEAD"],
    ["1945", "ENIAC \u00b7 17,468 VACUUM TUBES"],
    ["1947", "TRANSISTOR"],
    ["1958", "INTEGRATED CIRCUIT"],
    ["1971", "MICROPROCESSOR \u00b7 2,300 TRANSISTORS"],
    ["1972", "C \u00b7 THE LANGUAGE THAT BUILT THE WORLD"],
    ["1991", "PYTHON \u00b7 LINUX"],
    ["2006", "CUDA \u00b7 THE GPU LEARNS MATHEMATICS"],
    ["2012", "ALEXNET \u00b7 60 M WEIGHTS"],
    ["2016", "ALPHAGO \u00b7 THE IMPOSSIBLE MOVE"],
    ["2017", "TRANSFORMER \u00b7 d_model 512"],
    ["2018", "GPT-1 \u00b7 117 M PARAMETERS"],
    ["2019", "GPT-2 \u00b7 1.5 B"],
    ["2020", "GPT-3 \u00b7 175 B \u00b7 2,048 CONTEXT"],
    ["2022", "INSTRUCTGPT \u00b7 LEARNING FROM PREFERENCE"],
    ["2022", "CHATGPT \u00b7 100 M PEOPLE IN TWO MONTHS"],
    ["2023", "GPT-4 \u00b7 IT CAN SEE"],
    ["2024", "GPT-4o \u00b7 ONE MODEL, THREE SENSES"],
    ["2024", "o1 \u00b7 IT THINKS BEFORE IT ANSWERS"],
    ["2025", "GPT-5 \u00b7 THE FRONTIER BECOMES A PRODUCT"],
    ["2026", "GPT-6 ASTRA \u00b7 1,050,000 CONTEXT"],
    ["2026", "CLAUDE OPUS 5.5 \u00b7 680,000 LINES / 1 DAY"],
    ["2026", "QWEN3.7-MAX \u00b7 DEEPSEEK V4 \u00b7 KIMI K2.6 \u00b7 GLM-5.1 \u00b7 MINIMAX M2.7"]
  ];
  var S14_NUM = [
    { label: "PARAMETERS", a: 117e6, b: 1.8e12, log: true, lo: "117 M", hi: "1.8 T", src: "GPT-1 \u2192 GPT-6 ASTRA" },
    { label: "CONTEXT", a: 512, b: 1050000, log: true, lo: "512", hi: "1,050,000", src: "TRANSFORMER \u2192 GPT-6 ASTRA" },
    { label: "HUMANITY'S LAST EXAM", a: 12, b: 67.7, log: false, lo: "12%", hi: "67.7%", src: "GPT-4o \u2192 OPUS 5.5 WITH TOOLS" },
    { label: "OSWORLD", a: 5, b: 81.8, log: false, lo: "5%", hi: "81.8%", src: "2024 \u2192 OSWORLD 2.1" }
  ];
  var S14_HUMAN = [
    [0, 1.55, 0, 0.34, 1.55, 0], [0.34, 1.55, 0, 0.24, 1.90, 0], [0.24, 1.90, 0, 0.0, 2.14, 0],
    [0.0, 2.14, 0, -0.24, 1.90, 0], [-0.24, 1.90, 0, -0.34, 1.55, 0], [-0.34, 1.55, 0, 0, 1.55, 0],
    [0, 1.55, 0, 0, 1.34, 0], [0, 1.34, 0, 0, 0.20, 0], [-0.52, 1.28, 0, 0, 1.34, 0],
    [0, 1.34, 0, 0.52, 1.28, 0],
    [-0.52, 1.28, 0, -0.70, 0.72, 0], [-0.70, 0.72, 0, -0.60, 0.18, 0],
    [0.52, 1.28, 0, 0.72, 0.76, 0], [0.72, 0.76, 0, 1.42, 0.96, 0],
    [-0.30, 0.20, 0, 0.30, 0.20, 0],
    [-0.18, 0.20, 0, -0.24, -0.62, 0], [-0.24, -0.62, 0, -0.28, -1.48, 0],
    [0.18, 0.20, 0, 0.24, -0.62, 0], [0.24, -0.62, 0, 0.30, -1.48, 0],
    [-0.28, -1.48, 0, -0.46, -1.48, 0], [0.30, -1.48, 0, 0.48, -1.48, 0]
  ];

  function cam14(ctx) {
    var local = ctx.local, cam = ctx.cam, b = ctx.beat;
    var w = s01((local - 0.10) / 1.50);
    var uc = Ease.outQuad(clamp((local - 1.40) / 5.20, 0, 1));
    var bandX = lerp(-10.5, 10.5, uc), bandY = lerp(5.3, -5.3, uc);
    var X = lerp(0, bandX, w), Y = lerp(0.50, bandY + 0.95, w), Z = lerp(17.5, 9.8, w);
    var TX = lerp(0, bandX + 0.75, w), TY = lerp(0, bandY - 0.45, w), TZ = 0;
    var m1 = Ease.inOutCubic(clamp((local - 6.64) / 2.10, 0, 1));
    X = lerp(X, 0, m1); Y = lerp(Y, 0.70, m1); Z = lerp(Z, 13.60, m1);
    TX = lerp(TX, 0, m1); TY = lerp(TY, 0, m1);
    var m2 = Ease.inOutCubic(clamp((local - 11.64) / 1.80, 0, 1));
    X = lerp(X, -2.20, m2); Y = lerp(Y, 1.10, m2); Z = lerp(Z, 22.50, m2);
    TX = lerp(TX, -1.20, m2); TY = lerp(TY, -0.20, m2);
    cam.reset3d(1);
    cam.pos[0] = X + 0.18 * (b.barPulse - 0.4);
    cam.pos[1] = Y + 0.10 * b.barPulse;
    cam.pos[2] = Z - 0.35 * ctx.rms;
    cam.target[0] = TX; cam.target[1] = TY; cam.target[2] = TZ;
    cam.fov = 0.9; cam.roll = 0;
  }

  WEM.defineSection({
    id: "14",
    name: "THE FRONTIER",
    init: function (ctx) {
      var i, j;
      var dur = ctx.data && ctx.data.duration ? ctx.data.duration : 211.9067;
      this.R = 6.0;
      this.ln = new WEM.Viz.Lines(4096);
      this.pts = new WEM.Viz.Points(4096);
      this.ident = M4.ident();

      /* every milestone becomes a star on one diagonal band; time is the axis */
      var n = MIL.length;
      this.n = n;
      this.star = new Float32Array(Math.max(1, n * 3));
      this.starU = new Float32Array(Math.max(1, n));
      this.sphere = new Float32Array(Math.max(1, n * 3));
      this.px = new Float32Array(Math.max(1, n * 3));
      for (i = 0; i < n; i++) {
        var m = MIL[i];
        var u = clamp(m.t / dur, 0, 1);
        this.starU[i] = u;
        var vx = lerp(-11.5, 11.5, u);
        var vy = lerp(5.6, -5.6, u) + (m.lane === 0 ? 0.55 : -0.55) + (H3(i, 3, 7) - 0.5) * 1.5;
        var vz = (H3(i, 11, 5) - 0.5) * 5.0;
        this.star[i * 3] = vx; this.star[i * 3 + 1] = vy; this.star[i * 3 + 2] = vz;
        // fold target: normalise the star onto the sphere, then even it out
        var vl = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
        var fy = 1 - 2 * (i + 0.5) / Math.max(1, n);
        var fr = Math.sqrt(Math.max(0, 1 - fy * fy)), ph = i * 2.399963;
        var bx = vx / vl * 0.35 + Math.cos(ph) * fr * 0.65;
        var by = vy / vl * 0.35 + fy * 0.65;
        var bz = vz / vl * 0.35 + Math.sin(ph) * fr * 0.65;
        var bl = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
        this.sphere[i * 3] = bx / bl * this.R;
        this.sphere[i * 3 + 1] = by / bl * this.R;
        this.sphere[i * 3 + 2] = bz / bl * this.R;
      }
      this.edges = new Float32Array(Math.max(1, n * 2) * 12);

      /* the name ball */
      var nn = S14_NAMES.length;
      this.names = S14_NAMES;
      this.nameP = new Float32Array(nn * 3);
      this.nameR = new Float32Array(nn * 3);
      this.order = new Int32Array(nn);
      this.depth = new Float32Array(nn);
      for (i = 0; i < nn; i++) {
        var y = 1 - 2 * (i + 0.5) / nn, r = Math.sqrt(Math.max(0, 1 - y * y)), p2 = i * 2.399963;
        this.nameP[i * 3] = Math.cos(p2) * r * this.R * 1.03;
        this.nameP[i * 3 + 1] = y * this.R * 1.03;
        this.nameP[i * 3 + 2] = Math.sin(p2) * r * this.R * 1.03;
      }

      /* the human: a standing outline, no face, and the light it sends */
      this.human = new Float32Array(S14_HUMAN.length * 12);
      var hp = 0;
      for (i = 0; i < S14_HUMAN.length; i++) {
        var s2 = S14_HUMAN[i];
        this.human[hp] = s2[0]; this.human[hp + 1] = s2[1]; this.human[hp + 2] = s2[2]; this.human[hp + 3] = 1.8;
        this.human[hp + 4] = s2[3]; this.human[hp + 5] = s2[4]; this.human[hp + 6] = s2[5]; this.human[hp + 7] = 1.8;
        this.human[hp + 8] = 1; this.human[hp + 9] = 1; this.human[hp + 10] = 1; this.human[hp + 11] = 0.85;
        hp += 12;
      }
      this.hd = new Float32Array(S14_HUMAN.length * 12);
      this.beam = new Float32Array(48 * 12);
      this.humanPos = [-13.2, -3.05, 5.0];
      this.humanS = 1.35;
      this.hand = [this.humanPos[0] + 1.42 * this.humanS, this.humanPos[1] + 0.96 * this.humanS, this.humanPos[2]];
      this.cap = new Float32Array(48 * 3);
      var dirx = this.humanPos[0], diry = this.humanPos[1], dirz = this.humanPos[2];
      var dl = Math.sqrt(dirx * dirx + diry * diry + dirz * dirz) || 1;
      dirx /= dl; diry /= dl; dirz /= dl;
      var ux = -diry, uy = dirx, ul = Math.sqrt(ux * ux + uy * uy) || 1;
      ux /= ul; uy /= ul;
      var wx = -dirz * uy, wy = dirz * ux, wz = dirx * uy - diry * ux;
      var wl = Math.sqrt(wx * wx + wy * wy + wz * wz) || 1;
      wx /= wl; wy /= wl; wz /= wl;
      for (i = 0; i < 48; i++) {
        var t1 = i / 48 * TAU, rad = 0.30 + 0.42 * H2(i, 3.3);
        var cx1 = Math.cos(t1) * rad, sy1 = Math.sin(t1) * rad;
        var nx = ux * cx1 + wx * sy1 + dirx * 0.92;
        var ny = uy * cx1 + wy * sy1 + diry * 0.92;
        var nz = wz * sy1 + dirz * 0.92;
        var nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        this.cap[i * 3] = nx / nl * this.R;
        this.cap[i * 3 + 1] = ny / nl * this.R;
        this.cap[i * 3 + 2] = nz / nl * this.R;
      }

      /* the sphere's wireframe, built once */
      var sl = [], lat, lon;
      for (lat = -2; lat <= 2; lat++) {
        var yy = lat / 3 * this.R, rr = Math.sqrt(Math.max(0, this.R * this.R - yy * yy));
        for (j = 0; j < 48; j++) {
          var a1 = j / 48 * TAU, a2 = (j + 1) / 48 * TAU;
          sl.push(Math.cos(a1) * rr, yy, Math.sin(a1) * rr, 1,
            Math.cos(a2) * rr, yy, Math.sin(a2) * rr, 1, 1, 1, 1, 0.16);
        }
      }
      for (lon = 0; lon < 8; lon++) {
        var ph2 = lon / 8 * PI;
        for (j = 0; j < 48; j++) {
          var b1 = j / 48 * TAU, b2 = (j + 1) / 48 * TAU;
          sl.push(Math.sin(b1) * Math.cos(ph2) * this.R, Math.cos(b1) * this.R, Math.sin(b1) * Math.sin(ph2) * this.R, 1,
            Math.sin(b2) * Math.cos(ph2) * this.R, Math.cos(b2) * this.R, Math.sin(b2) * Math.sin(ph2) * this.R, 1,
            1, 1, 1, 0.16);
        }
      }
      this.sphereLines = new Float32Array(sl);
    },
    enter: function () { },
    draw2d: function (ctx) {
      cam14(ctx);
      var t = ctx.t, local = ctx.local, hud = ctx.hud, W = ctx.W;
      var hex = Ch.css(t), hex2 = Ch.css2(t);
      var fade = ctx.in * ctx.out;
      var lit = Ch.litCount(t);
      var i;

      Ch.tag(ctx, 40, 78, "THE FRONTIER \u00b7 WHERE WE ARE", { color: hex2, alpha: fade * 0.95, bright: true });
      hud.T(40, 98, lit + " MILESTONES LIT \u00b7 1936 \u2192 2026 \u00b7 ONE SPECIES, ONE CENTURY", {
        size: 10.5, color: ctx.col.dim, alpha: fade * 0.8, spacing: 1.4
      });

      /* the chronicle table, one row at a time */
      var tx = 1500, ty = 132, rh = 24;
      hud.T(tx, ty - 16, "YEAR", { size: 9, color: ctx.col.faint, alpha: fade * 0.8, spacing: 1.6 });
      hud.T(tx + 50, ty - 16, "EVENT", { size: 9, color: ctx.col.faint, alpha: fade * 0.8, spacing: 1.6 });
      hud.line(tx, ty - 10, tx + 386, ty - 10, { color: "rgba(238,242,246,0.18)", alpha: fade });
      for (i = 0; i < S14_ROWS.length; i++) {
        var a = clamp((local - 0.30 - i * 0.28) / 0.55, 0, 1) * fade;
        if (a <= 0.01) continue;
        var ry = ty + 6 + i * rh;
        hud.T(tx, ry, S14_ROWS[i][0], { size: 10, color: Ch.hexA(hex2, 0.95), alpha: a * 0.75 });
        hud.T(tx + 50, ry, S14_ROWS[i][1], {
          size: i === S14_ROWS.length - 1 ? 9 : 10, color: ctx.col.grey, alpha: a * 0.6
        });
      }

      /* four real numbers, growing */
      var grow = Ease.inOutQuad(clamp((local - 4.00) / 7.60, 0, 1));
      for (i = 0; i < S14_NUM.length; i++) {
        var M = S14_NUM[i];
        var p = clamp(grow * 1.06 - i * 0.03, 0, 1);
        var val = M.log ? M.a * Math.pow(M.b / M.a, p) : lerp(M.a, M.b, p);
        var y = 690 + i * 46;
        hud.T(40, y, M.label, { size: 11.5, color: ctx.col.white, alpha: fade * 0.9, spacing: 1.6 });
        hud.T(620, y, M.lo + "  \u2192  " + M.hi, { size: 12, color: Ch.hexA(hex2, 1), align: "right", alpha: fade * 0.9 });
        hud.rect(40, y + 9, 580, 4, { fill: "rgba(238,242,246,0.10)", alpha: fade });
        hud.rect(40, y + 9, 580 * p, 4, { fill: Ch.hexA(hex, 0.95), alpha: fade });
        var shown = i === 0 ? fmtBig(val) : i === 1 ? commas(val) : fmtPct(val);
        hud.T(620, y + 30, shown, {
          size: 15, color: ctx.col.white, align: "right", alpha: fade * 0.95, weight: 600,
          glow: p > 0.9, blur: 12
        });
        hud.T(40, y + 30, M.src, { size: 9, color: ctx.col.faint, alpha: fade * 0.55, spacing: 0.8 });
      }

      var q = clamp((local - 8.60) / 0.9, 0, 1);
      hud.T(W / 2, 812, "what do you want me to be?", {
        size: 42, color: ctx.col.white, align: "center", weight: 600, spacing: 2.0,
        alpha: fade * q, glow: q > 0.4, blur: 24
      });
      hud.T(W / 2, 852, "the question is not for the machine", {
        size: 13, color: ctx.col.dim, align: "center", alpha: fade * q * 0.7, spacing: 2.0
      });
      ctx.fx.mood([0.10, 0.14, 0.19], [0.02, 0.05, 0.06], 0.26);
      ctx.fx.bloom = 0.60;
    },
    draw3d: function (ctx) {
      var t = ctx.t, local = ctx.local, b = ctx.beat, gfx = ctx.gfx, hud = ctx.hud;
      var hex2 = Ch.css2(t);
      var CA = Ch.rgb(hex2);
      var fade = ctx.in * ctx.out;
      var n = this.n;
      var i;
      var fold = Ease.inOutCubic(clamp((local - 6.64) / 2.30, 0, 1));
      var uc = Ease.outQuad(clamp((local - 1.40) / 5.20, 0, 1));
      var bright = clamp(ctx.rms * 1.8 + 0.25, 0, 1);
      var cp = ctx.cam.pos;
      var camD = Math.sqrt(cp[0] * cp[0] + cp[1] * cp[1] + cp[2] * cp[2]) || 1;

      /* stars: constellation now, sphere later */
      this.pts.clear();
      var px = this.px;
      for (i = 0; i < n; i++) {
        var on = t >= MIL[i].t;
        var x = lerp(this.star[i * 3], this.sphere[i * 3], fold);
        var y = lerp(this.star[i * 3 + 1], this.sphere[i * 3 + 1], fold);
        var z = lerp(this.star[i * 3 + 2], this.sphere[i * 3 + 2], fold);
        px[i * 3] = x; px[i * 3 + 1] = y; px[i * 3 + 2] = z;
        var since = t - MIL[i].t;
        var burst = on && since >= 0 && since < 1.6 ? Math.exp(-since / 0.22) : 0;
        var al = (on ? 0.45 + 0.5 * burst : 0.14) * fade;
        var sz = (on ? 5.2 : 2.4) * (1 + 0.55 * b.pulse * (on ? 1 : 0)) * (1 - 0.35 * fold);
        this.pts.add(x, y, z, sz, on ? CA : [0.35, 0.38, 0.42], clamp(al, 0, 1));
      }
      /* the constellation: consecutive lit milestones are joined */
      var ep = 0, ed = this.edges;
      for (i = 0; i + 1 < n; i++) {
        if (t < MIL[i + 1].t) break;
        var al2 = (0.22 + 0.55 * bright) * (1 - fold * 0.35) * fade;
        ed[ep] = px[i * 3]; ed[ep + 1] = px[i * 3 + 1]; ed[ep + 2] = px[i * 3 + 2]; ed[ep + 3] = 1.2;
        ed[ep + 4] = px[(i + 1) * 3]; ed[ep + 5] = px[(i + 1) * 3 + 1]; ed[ep + 6] = px[(i + 1) * 3 + 2]; ed[ep + 7] = 1.2;
        ed[ep + 8] = CA[0]; ed[ep + 9] = CA[1]; ed[ep + 10] = CA[2]; ed[ep + 11] = clamp(al2, 0, 1);
        ep += 12;
      }
      if (ep > 0) gfx.lines(ed.subarray(0, ep), { add: true, glow: 0.6, depthWrite: false });
      if (fold > 0.05) gfx.lines(this.sphereLines, { add: true, glow: 0.3, fade: fold * 0.8 * fade, depthWrite: false });
      this.pts.draw(gfx, { soft: 0.75, depthWrite: false });

      /* star labels: the ones the camera has already flown past */
      if (fold < 0.85) {
        for (i = 0; i < n; i++) {
          if (t < MIL[i].t) break;
          var u = this.starU[i];
          var dd = uc - u;
          if (dd < 0 || dd > 1.2) continue;
          var aa = clamp(dd / 0.22, 0, 1) * (1 - clamp((dd - 0.9) / 0.3, 0, 1)) * (1 - fold / 0.85) * fade;
          if (aa <= 0.02) continue;
          var q1 = ctx.util.vp(px[i * 3], px[i * 3 + 1] + 0.55, px[i * 3 + 2]);
          if (q1[2] <= 0.05) continue;
          hud.T(q1[0], q1[1] - 26, MIL[i].y, {
            size: 30, color: Ch.hexA(hex2, 1), alpha: aa, weight: 700, align: "center", glow: true, blur: 16
          });
          hud.T(q1[0], q1[1], MIL[i].n, {
            size: 15, color: ctx.col.white, alpha: aa, align: "center", weight: 600, spacing: 1.4
          });
          hud.T(q1[0], q1[1] + 16, MIL[i].f, { size: 10, color: ctx.col.dim, alpha: aa * 0.8, align: "center" });
        }
      }
      /* the text ball of model names, painted back to front */
      if (fold > 0.06) {
        var nn = this.names.length, ang = 0.10 + 0.26 * clamp(local - 7.2, 0, 12);
        var ca = Math.cos(ang), sa = Math.sin(ang);
        var order = this.order, dep = this.depth, nr = this.nameR;
        for (i = 0; i < nn; i++) {
          var ox = this.nameP[i * 3], oy = this.nameP[i * 3 + 1], oz = this.nameP[i * 3 + 2];
          var rx = ox * ca + oz * sa, rz = -ox * sa + oz * ca;
          nr[i * 3] = rx; nr[i * 3 + 1] = oy; nr[i * 3 + 2] = rz;
          var dx = rx - cp[0], dy = oy - cp[1], dz = rz - cp[2];
          dep[i] = dx * dx + dy * dy + dz * dz;
          order[i] = i;
        }
        for (i = 1; i < nn; i++) {
          var key = order[i], kv = dep[key], jj = i - 1;
          while (jj >= 0 && dep[order[jj]] < kv) { order[jj + 1] = order[jj]; jj--; }
          order[jj + 1] = key;
        }
        var al3 = clamp((fold - 0.06) / 0.5, 0, 1) * fade;
        for (i = 0; i < nn; i++) {
          var id = order[i];
          var q2 = ctx.util.vp(nr[id * 3], nr[id * 3 + 1], nr[id * 3 + 2]);
          if (q2[2] <= 0.05) continue;
          var near = clamp((camD + this.R * 0.55 - Math.sqrt(dep[id])) / (this.R * 1.1), 0, 1);
          hud.T(q2[0], q2[1], this.names[id], {
            size: lerp(10, 16, near), color: near > 0.5 ? ctx.col.white : Ch.hexA(hex2, 0.8),
            align: "center", alpha: al3 * lerp(0.20, 0.95, near)
          });
        }
      }
      /* the human, and the light it sends at the sphere */
      var hum = clamp((local - 11.60) / 1.20, 0, 1) * fade;
      if (hum > 0.01) {
        var hp = this.humanPos, hs = this.humanS, hd = this.hd;
        for (i = 0; i < this.human.length; i += 12) {
          hd[i] = hp[0] + this.human[i] * hs;
          hd[i + 1] = hp[1] + this.human[i + 1] * hs;
          hd[i + 2] = hp[2] + this.human[i + 2] * hs;
          hd[i + 3] = this.human[i + 3];
          hd[i + 4] = hp[0] + this.human[i + 4] * hs;
          hd[i + 5] = hp[1] + this.human[i + 5] * hs;
          hd[i + 6] = hp[2] + this.human[i + 6] * hs;
          hd[i + 7] = this.human[i + 7];
          hd[i + 8] = 1; hd[i + 9] = 1; hd[i + 10] = 1;
          hd[i + 11] = hum * (0.55 + 0.45 * clamp(ctx.rms * 2, 0, 1));
        }
        gfx.lines(hd, { add: true, glow: 0.5, depthWrite: false });

        var beam = this.beam, bp = 0;
        var hx = this.hand[0], hy2 = this.hand[1], hz = this.hand[2];
        var rms = clamp(ctx.rms * 1.9 + 0.15, 0, 1);
        for (i = 0; i < 48; i++) {
          var fl = 0.55 + 0.45 * ctx.bands[(i * 3) % 64];
          beam[bp] = hx; beam[bp + 1] = hy2; beam[bp + 2] = hz; beam[bp + 3] = 1.0;
          beam[bp + 4] = this.cap[i * 3]; beam[bp + 5] = this.cap[i * 3 + 1]; beam[bp + 6] = this.cap[i * 3 + 2];
          beam[bp + 7] = 0.9;
          beam[bp + 8] = 0.85; beam[bp + 9] = 0.95; beam[bp + 10] = 1.0;
          beam[bp + 11] = hum * rms * fl * 0.42;
          bp += 12;
        }
        gfx.lines(beam, { add: true, glow: 0.9, depthWrite: false });

        this.pts.clear();
        var pk = clamp(ctx.rms * 1.8, 0, 1);
        for (i = 0; i < 48; i++) {
          this.pts.add(this.cap[i * 3], this.cap[i * 3 + 1], this.cap[i * 3 + 2],
            2.0 + 5.0 * pk * ctx.bands[(i * 3) % 64], [1, 1, 1], hum * (0.15 + 0.5 * pk));
        }
        this.pts.draw(gfx, { soft: 0.8, depthWrite: false });

        var hq = ctx.util.vp(hp[0], hp[1] + 2.4 * hs, hp[2]);
        if (hq[2] > 0.05) {
          hud.T(hq[0], hq[1], "one of us", {
            size: 13, color: ctx.col.white, align: "center", alpha: hum * 0.8, spacing: 1.6
          });
        }
      }
    }
  });

  /* ==========================================================================
     15 : exit code 0 - 205.671 to 211.907
     one white frame says EXECUTION, the raster collapses to a line, the exit
     code lands inside that line, the rail lights up one last time, credits.
     ========================================================================== */
  WEM.defineSection({
    id: "15",
    name: "exit code 0",
    init: function () {
      this.credits = [
        "music   Mili \u2014 world.execute (me) ;",
        "visuals computed in real time, in your browser",
        "every curve, every number: actually solved"
      ];
    },
    enter: function () { },
    draw2d: function (ctx) {
      var local = ctx.local, hud = ctx.hud, W = ctx.W;
      var fade = ctx.in * ctx.out;
      ctx.cam.reset2d();

      /* the one deliberate white frame, and the last EXECUTION */
      if (local < 0.18) ctx.fx.whiteBar = 0.85;

      /* the shutdown: the raster collapses to a line, then returns for the credits */
      var off;
      if (local < 0.18) off = 0;
      else if (local < 1.93) off = Ease.inQuad(clamp((local - 0.18) / 1.75, 0, 1));
      else if (local < 2.15) off = 1;
      else if (local < 2.85) off = 1 - Ease.inOutQuad(clamp((local - 2.15) / 0.70, 0, 1));
      else off = 0;
      ctx.fx.crtOff = off;
      ctx.fx.grain = 0.020;
      ctx.fx.bloom = 0.38;
      ctx.fx.exposure = 1.16;

      /* the shared chrome lives until the rail has had its last full pass */
      ctx.chromeAmt = local < 3.30 ? 1 : 1 - Ease.inOutQuad(clamp((local - 3.30) / 0.53, 0, 1));

      if (local < 0.42) {
        var a1 = 1 - clamp((local - 0.20) / 0.22, 0, 1);
        // punched dark, because this frame is the one white frame of the film
        hud.T(W / 2, 566, "EXECUTION", {
          size: 220, color: "#05070a", weight: 700, align: "center", spacing: 8,
          alpha: fade * a1, glow: "rgba(5,7,10,0.9)", blur: 30
        });
      }

      /* the line the raster dies on, and the exit code inside it */
      if (local > 0.30 && local < 3.30) {
        var lk = clamp((local - 0.55) / 0.7, 0, 1);
        var out = clamp((local - 2.75) / 0.5, 0, 1);
        hud.rect(0, 539, W, 1.4, { fill: "rgba(232,238,244," + (0.5 * lk * (1 - out)) + ")" });
        hud.T(W / 2, 545, "> process finished with exit code 0", {
          size: 22, color: "#e8eef4", align: "center", alpha: fade * lk * (1 - out), spacing: 1.2,
          glow: true, blur: 14
        });
      }

      /* the rail, fully lit, one last time */
      var railA = clamp((local - 2.55) / 0.6, 0, 1) * (1 - clamp((local - 3.35) / 0.6, 0, 1));
      if (railA > 0.01) {
        hud.T(W / 2, 892, "40 models \u00b7 90 years \u00b7 one song", {
          size: 14, color: "#e8eef4", align: "center", alpha: fade * railA * 0.9, spacing: 2.6
        });
        hud.T(W / 2, 916, "EVERY TICK IS SOMETHING SOMEONE BUILT", {
          size: 10, color: ctx.col.faint, align: "center", alpha: fade * railA * 0.62, spacing: 2.0
        });
      }

      /* credits, one line at a time */
      for (var i = 0; i < this.credits.length; i++) {
        var a2 = clamp((local - (3.83 + i * 0.52)) / 0.65, 0, 1) * fade;
        if (a2 <= 0.01) continue;
        hud.T(W / 2, 462 + i * 46, this.credits[i], {
          size: i === 0 ? 24 : 20, color: i === 0 ? "#e8eef4" : ctx.col.grey,
          align: "center", alpha: a2 * (i === 0 ? 0.95 : 0.72), spacing: 1.8
        });
      }
      var lk2 = clamp((local - 5.35) / 0.9, 0, 1) * fade;
      if (lk2 > 0.01) {
        hud.T(W / 2, 660, "world.execute(me);", {
          size: 46, color: "#ffffff", align: "center", alpha: lk2 * 0.30, weight: 700, spacing: 4,
          glow: true, blur: 18
        });
      }
      hud.T(W / 2, 724, "the machine stops. the song does too.", {
        size: 12, color: ctx.col.faint, align: "center",
        alpha: clamp((local - 5.90) / 0.6, 0, 1) * fade * 0.5, spacing: 2.2
      });
      ctx.fx.mood([0.10, 0.12, 0.15], [0, 0, 0], 0.22);
    },
    draw3d: function (ctx) {
      /* deliberately empty: the last frame of the film is the frame itself */
      if (ctx.cam.mode !== "ortho") ctx.cam.reset2d();
    }
  });
})();
