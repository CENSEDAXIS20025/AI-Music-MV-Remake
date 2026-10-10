import fs from "node:fs";
function edit(path, pairs, label) {
  let s = fs.readFileSync(path, "utf8");
  const before = s;
  for (const [a, b] of pairs) {
    if (!s.includes(a)) { console.log("  MISS " + path + ": " + JSON.stringify(a.slice(0, 56))); continue; }
    s = s.split(a).join(b);
  }
  if (s !== before) { fs.writeFileSync(path, s); console.log("patched " + label); }
  else console.log("unchanged " + label);
}

// name: checkpoint name -> shipped name at 上线 -> renamed after the retrain
edit("src/sections4/tui_a.js", [
  ['    if (t < t0) return { name: NAME0, erase: 0, typed: "" };',
   '    if (t < 147.5) return { name: NAME0, erase: 0, typed: "" };\n    if (t < 198.6) return { name: "deepseek-v4.1-flash", erase: 0, typed: "" };']
], "name stages");

/* (3) From AM to PM -- a clock face in the annotation panel, its hand sweeping
   from AM round to PM across the line ---------------------------------------- */
edit("src/62_lyric.js", [
  ['    { t0: 188.05, t1: 197.60, kind: "love",',
   '    { t0: 92.015, t1: 95.900, kind: "clock", lrc: "From AM to PM", tex: "AM \\\\to PM" },\n    { t0: 188.05, t1: 197.60, kind: "love",'],
  ['      hud.formula(px + 16, py + 92, w.tex, { size: 22, color: WH, alpha: a });',
   `      hud.formula(px + 16, py + 92, w.tex, { size: 22, color: WH, alpha: a });

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
      }`]
], "AM-to-PM clock");

/* the reference puts a small 思考 / 写入 line above the answer ----------------- */
edit("src/61_gadgets.js", [
  ['        var bx = x + w - 40 - B.w;',
   `        // a thinking / memory-write note sits above her answer
        if (m.note) {
          c.fillStyle = "rgba(150,168,190,0.85)"; c.font = "11.5px " + CJK;
          c.fillText("\\u2726 " + m.note, x + 14, ty + av * 2 + 17);
        }
        var bx = x + w - 40 - B.w;`]
], "note line");
