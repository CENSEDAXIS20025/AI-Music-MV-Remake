/* smoke_stub.js -- 22 placeholder sections so the shared chrome, the query bar
   and the index rail can be inspected on their own (smoke.html).  Never
   bundled, never loaded by index.html. */
(function () {
  "use strict";
  var WEM = window.WEM, I = WEM.Idx;
  var NAMES = ["SIDE BY SIDE", "RANK", "TAKE A MEMORY", "TABLE", "EGGPLANT",
    "I'M SEARCHING", "CAT", "STEAK", "FLOWER", "HUMAN", "SEARCHING AGAIN",
    "WHAT'S THAT WORD", "LOVE", "EVERYWHERE", "RAPID", "MY OLD SELF",
    "BUCKETS", "BREAK US DOWN", "CALLBACK", "LEARNED", "DOG · TOMATO",
    "STILL SEARCHING"];
  for (var i = 0; i < 22; i++) {
    (function (i) {
      var id = (i < 9 ? "0" : "") + (i + 1);
      WEM.defineSection({
        id: id, name: NAMES[i],
        draw2d: function (ctx) {
          var col = I.css(ctx.t);
          ctx.hits = Math.round(1048576 * Math.pow(0.55, i));
          ctx.hud.T(960, 460, "SEGMENT " + id, { size: 88, color: col, align: "center", weight: 700, spacing: 8 });
          ctx.hud.T(960, 516, NAMES[i].toUpperCase(), { size: 32, color: "#eef2f6", align: "center", spacing: 4 });
          ctx.hud.T(960, 556, "stub · " + ctx.local.toFixed(2) + "s", { size: 14, color: "#9aa3ad", align: "center" });
        }
      });
    })(i);
  }
})();
