/* smoke_stub.js -- 15 placeholder sections so the shared chrome + rail can be
   inspected on their own (smoke.html).  Never bundled, never loaded by
   index.html.  Delete nothing; this file is only a scaffold. */
(function () {
  "use strict";
  var WEM = window.WEM, Ch = WEM.Chron;
  var NAMES = ["POWER LINE", "world.execute(me);", "SET OF POINTS", "A.D. TO B.C.",
    "STIMULATIONS", "EGGPLANT", "F TO M", "VIBRATIONS", "FRAGMENTS",
    "ILLEGAL ARGUMENTS", "EXECUTION", "COMPUTER USE", "LO-O-OVE",
    "THE FRONTIER", "exit code 0"];
  for (var i = 0; i < 15; i++) {
    (function (i) {
      var id = (i < 9 ? "0" : "") + (i + 1);
      WEM.defineSection({
        id: id, name: NAMES[i],
        draw2d: function (ctx) {
          var col = Ch.css(ctx.t);
          ctx.hud.T(960, 420, "SEGMENT " + id, { size: 90, color: col, align: "center", weight: 700, spacing: 8 });
          ctx.hud.T(960, 480, NAMES[i].toUpperCase(), { size: 34, color: WEM.HUD.COL.white, align: "center", spacing: 4 });
          ctx.hud.T(960, 520, "stub · " + ctx.local.toFixed(2) + "s", { size: 14, color: WEM.HUD.COL.dim, align: "center" });
        }
      });
    })(i);
  }
})();
