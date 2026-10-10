import fs from "node:fs";
const done = [];

/* 1. the spectral mountain range: amplitude was 5.2x, which turned the field
      into a wall of lines. It samples data.spec directly, so the earlier
      global band gain never reached it. */
let b = fs.readFileSync("src/sections/b_06_10.js", "utf8");
const a0 = "          var y0 = h0 * h0 * 5.2, y1 = h1 * h1 * 5.2;";
if (b.includes(a0)) {
  b = b.replace(a0, "          var y0 = h0 * h0 * 2.1, y1 = h1 * h1 * 2.1;   // calmer amplitude");
  done.push("terrain amplitude 5.2 -> 2.1");
} else console.log("  MISS terrain amplitude");
const a1 = "        P.add(-6.0 + c3 * XS, hh * hh * 5.2, 4.5, 8 + hh * 16, [1, 0.79, 0.29], 0.95 * alpha);";
if (b.includes(a1)) {
  b = b.replace(a1, "        P.add(-6.0 + c3 * XS, hh * hh * 2.1, 4.5, 8 + hh * 16, [1, 0.79, 0.29], 0.95 * alpha);");
  done.push("playhead matches");
} else console.log("  MISS playhead");
fs.writeFileSync("src/sections/b_06_10.js", b);

/* 2. the bottom LED bar only reached about half height: open up the response
      curve rather than just adding gain */
let bar = fs.readFileSync("src/50_audiobar.js", "utf8");
const m0 = "var lit = Math.pow(clamp(v * w * 1.06 * abg, 0, 1), 0.70) * SEG * 1.02 + 0.2;";
if (bar.includes(m0)) {
  bar = bar.replace(m0, "var lit = Math.pow(clamp(v * w * 1.30 * abg, 0, 1), 0.45) * SEG * 1.04 + 0.35;");
  done.push("LED bar taller");
} else console.log("  MISS lit formula");
fs.writeFileSync("src/50_audiobar.js", bar);

console.log("applied: " + done.join(", "));
