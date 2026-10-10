import fs from "node:fs";
for (const f of ["src/sections4/tui_a.js", "src/sections4/tui_b.js"]) {
  let s = fs.readFileSync(f, "utf8");
  const before = s;
  s = s.split("T.chat(ctx.hud, 46, 96, 690, 838, visible.slice(-7), t, opt);")
       .join("WEM.Gadgets.guiChat(ctx.hud, 46, 96, 690, 838, visible.slice(-7), t, opt);\n    WEM.Gadgets.strip(ctx, ctx.hud, 766, 812, ctx.W - 812, 116, ctx.t);");
  s = s.split("draw3d: function () { }").join("draw3d: function (ctx) { WEM.Gadgets.threeD(ctx); }");
  fs.writeFileSync(f, s);
  console.log(f, before === s ? "unchanged" : "patched");
}
// index4 needs the gadget module
let h = fs.readFileSync("index4.html", "utf8");
if (!h.includes("61_gadgets")) {
  h = h.replace('<script src="src/40_main.js"></script>', '<script src="src/61_gadgets.js"></script>\n<script src="src/40_main.js"></script>');
  fs.writeFileSync("index4.html", h);
  console.log("index4.html patched");
}
