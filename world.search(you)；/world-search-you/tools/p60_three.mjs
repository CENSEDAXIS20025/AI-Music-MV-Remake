import fs from "node:fs";
const done = [];

/* 1. v1's lyric line sat at y~1010-1030, inside the meter band (998-1034).
      Lift every v1 lyric up by 40 px so the bars no longer cover it. */
const V1 = ["src/sections/a_01_05.js", "src/sections/b_06_10.js", "src/sections/c_11_15.js"];
const SUBS = [
  ["1060 - 30", "1060 - 74"],
  ["1060 - 34", "1060 - 78"],
  ["1060 - 40", "1060 - 84"],
  ["1040 - 30", "1040 - 74"],
  ["ctx.H - 60", "ctx.H - 100"],
  ["ctx.H - 66", "ctx.H - 106"],
  ["ctx.W / 2, 1030,", "ctx.W / 2, 988,"]
];
for (const f of V1) {
  let s = fs.readFileSync(f, "utf8");
  const before = s;
  for (const [a, b] of SUBS) s = s.split(a).join(b);
  if (s !== before) { fs.writeFileSync(f, s); done.push(f.replace("src/sections/", "") + " lyric lifted"); }
}

/* 2. bottom LED bar one notch stronger -------------------------------- */
for (const f of ["index.html", "tools/bundle.mjs"]) {
  let s = fs.readFileSync(f, "utf8");
  s = s.replace("window.WEM_AB_EXPO = 0.36;", "window.WEM_AB_EXPO = 0.30;")
       .replace("window.WEM_AB_MUL = 1.48;", "window.WEM_AB_MUL = 1.62;");
  fs.writeFileSync(f, s);
}
done.push("bottom bar expo 0.30 / mul 1.62");

/* 3. the in-frame strip at 1:55 reads ctx.bands, which v1 globally scales down
      to 0.22 -- compensate so it becomes readable again --------------------- */
let b = fs.readFileSync("src/sections/b_06_10.js", "utf8");
const s0 = "        var h = sp[i] * bh;";
if (b.includes(s0)) {
  b = b.replace(s0, "        var h = clamp(sp[i] * 3.8, 0, 1) * bh;   // compensated for the global band gain");
  fs.writeFileSync("src/sections/b_06_10.js", b);
  done.push("in-frame strip amplitude up");
} else console.log("  MISS strip");

console.log("applied: " + done.join(", "));
