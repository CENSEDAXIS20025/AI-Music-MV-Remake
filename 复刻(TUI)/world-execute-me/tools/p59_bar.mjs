import fs from "node:fs";
for (const f of ["index.html", "tools/bundle.mjs"]) {
  let s = fs.readFileSync(f, "utf8");
  s = s.replace("window.WEM_AB_EXPO = 0.45;", "window.WEM_AB_EXPO = 0.36;")
       .replace("window.WEM_AB_MUL = 1.30;", "window.WEM_AB_MUL = 1.48;");
  fs.writeFileSync(f, s);
}
console.log("v1 bar: expo 0.36, mul 1.48");
