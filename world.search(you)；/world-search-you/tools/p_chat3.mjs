import fs from "node:fs";
const p = "src/70_chat.js";
let s = fs.readFileSync(p, "utf8");
const done = [];

// 1. match the width of the film's central picture element (the common cut-out
//    is x=630, w=660), still centred
const oldCh = s.match(/var CH = \{[^}]*\};[^\n]*\n/)[0];
s = s.replace(oldCh, "var CH = { x: 630, y: 240, w: 660, h: 600 };   // same width as the centre cut-out\n");
done.push("card width -> 660 (centre cut-out width)");

// 2. appear a little earlier, on the "Side by side" line at 14.36
s = s.replace("var CHAT_IN = 15.0, CHAT_FADE = 0.45;", "var CHAT_IN = 14.5, CHAT_FADE = 0.45;");
done.push("entry 15.0 -> 14.5");

// 3. hide the chat entirely for whole segments (keyed by section id, so it
//    follows the real transition boundaries rather than hand-picked times)
const hideBlock = `
  // Segments where the film needs the frame to itself. Keyed by section id, so
  // the window follows the actual segment boundaries.
  //   03 memory      28.23 - 40.77
  //   06 search1     68.06 - 82.68
  //   12 typeahead  151.67 - 179.60
  //   15 rapid      193.30 - 207.23
  //   18/19/20      221.03 - 261.21
  //   22 outro      287.33 - end
  var CHAT_HIDE = { "03": 1, "06": 1, "12": 1, "15": 1, "18": 1, "19": 1, "20": 1, "22": 1 };

  function sectionIdAt(t) {
    try {
      var D = WEM.Data;
      if (!D || !D.sections || !D.sectionIndex) return "";
      var i = D.sectionIndex(t);
      var sec = D.sections[i];
      return sec && sec.id !== undefined ? String(sec.id) : "";
    } catch (e) { return ""; }
  }

  function draw(ctx, o) {`;
s = s.replace("\n  function draw(ctx, o) {", hideBlock);

// apply the guard inside draw()
s = s.replace(`    if (t < CHAT_IN) return;                       // nothing during the boot screen`,
`    if (t < CHAT_IN) return;                       // nothing during the boot screen
    if (CHAT_HIDE[sectionIdAt(t)]) return;          // this segment keeps the frame`);

fs.writeFileSync(p, s);
console.log("applied: " + done.join(", "));
