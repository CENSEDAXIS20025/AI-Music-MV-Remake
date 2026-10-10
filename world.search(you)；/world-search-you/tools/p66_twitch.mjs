import fs from "node:fs";
const p = "src/sections/a_01_05.js";
let s = fs.readFileSync(p, "utf8");

// 1. the 4D projection divisor passed through zero -> vertices flew off and
//    snapped back. Use a divisor that can never reach the w range, and clamp.
const a = "        var k = 2.6 / (2.9 - p[3]);";
if (!s.includes(a)) { console.log("MISS projection"); process.exit(1); }
s = s.replace(a,
  "        // 2.9 - p[3] used to cross zero, which sent the vertex to infinity and\n" +
  "        // back -- that was the twitching. 4.4 keeps the divisor well clear.\n" +
  "        var k = clamp(2.6 / (4.4 - p[3]), 0.45, 1.55);");

// 2. the whole shape was also breathing because w scaled with time
const b = "      var sc = 0.55, w4 = 1.9 + Math.sin(t * 0.7) * 0.35;   // the hypercube now fits the frame";
if (!s.includes(b)) { console.log("MISS w4"); process.exit(1); }
s = s.replace(b, "      var sc = 0.80, w4 = 1.75;   // fixed w: no size pulsing");

// 3. and soften the per-bar camera jolt so it reads as a beat, not a twitch
s = s.replace("      var slam = Math.exp(-barT / 0.30);", "      var slam = Math.exp(-barT / 0.42);");
s = s.replace("      cam.fov = 0.95 - slam * 0.14;", "      cam.fov = 0.95 - slam * 0.055;");
s = s.replace("      var rad = 9.4 - slam * 1.1 + Math.sin(t * 0.35) * 0.45;   // the cube must fit the frame",
              "      var rad = 9.4 - slam * 0.40 + Math.sin(t * 0.35) * 0.30;   // the cube must fit the frame");
fs.writeFileSync(p, s);
console.log("projection stabilised, w fixed, camera jolt softened");
