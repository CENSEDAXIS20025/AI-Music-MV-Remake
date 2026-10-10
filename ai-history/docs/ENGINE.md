# ENGINE.md — practical API reference for authoring sections

Zero-dependency WebGL2 music-visualization engine (`world.execute(me);`). Everything is a **classic
script** merged into one global namespace `window.WEM`. No modules, no build step, no deps.

Source of truth for this document: `src/00_core.js`, `src/10_render.js`, `src/20_hud.js`,
`src/25_viz.js`, `src/26_lab.js`, `src/27_model.js`, `src/30_data.js`, `src/40_main.js`,
`src/50_audiobar.js`, `src/62_lyric.js`, `index.ref.html`, `tools/bundle.mjs`, `tools/analyze.py`,
`assets/analysis/meta.json`.

> **Not present in this checkout** (so not verifiable here, and *not* needed to author a section):
> `index.html`, `src/sections/*.js` (the 15 v1 sections), `src/sections2/*.js`, `WEM.Tui`
> (required by `src/62_lyric.js`, which therefore throws on load), `index2/3/4.html`.
> `index.ref.html` and `tools/bundle.mjs` both load only:
> `00_core, 10_render, 20_hud, 25_viz, 30_data, 50_audiobar, 40_main, sections/*`. `26_lab`,
> `27_model`, `62_lyric` are **not** referenced by either loader.

---

## 1. Boot / wiring

### 1.1 Script order (`index.ref.html:22-31`, `tools/bundle.mjs:17-21`)

```html
<script src="src/00_core.js"></script>      <!-- WEM.core, Res, geo, M4/V3/Ease  -->
<script src="src/10_render.js"></script>    <!-- WEM.Renderer, WEM.Shaders, WEM.GLSL, WEM.ATTR_BIND -->
<script src="src/20_hud.js"></script>       <!-- WEM.Hud, WEM.HUD{COL,FONTS,...} -->
<script src="src/25_viz.js"></script>       <!-- WEM.Viz -->
<script src="src/30_data.js"></script>      <!-- WEM.Data (singleton instance) -->
<script src="src/50_audiobar.js"></script>  <!-- WEM.AudioBar + seek-bar installer -->
<script src="src/40_main.js"></script>      <!-- WEM.defineSection, WEM.App, WEM.Camera, WEM.boot -->
<script src="src/sections/a_01_05.js"></script>  <!-- WEM.defineSection(...) x5 -->
<script src="src/sections/b_06_10.js"></script>
<script src="src/sections/c_11_15.js"></script>
<script> WEM.boot({mode: ...}).then(...) </script>
```

Order is **hard** because every file captures globals at load time:

| File | Reads at load time | Must come after |
|---|---|---|
| `00_core.js` | — (creates `window.WEM`) | — |
| `10_render.js` | `WEM.core`, sets `WEM.ATTR_BIND` | 00 |
| `20_hud.js` | `WEM.core` | 00 |
| `25_viz.js` | `WEM.core` | 00 |
| `26_lab.js` | `WEM.core`, `WEM.Viz` | 25 |
| `27_model.js` | `WEM.core`, `WEM.Viz` | 25 |
| `30_data.js` | `WEM.core` | 00 |
| `50_audiobar.js` | `WEM.HUD.COL` | 20 |
| `40_main.js` | `WEM.core` (App/Hud/Renderer/Data used at construction) | 00,10,20,30 |
| `62_lyric.js` | `WEM.Viz`, `WEM.Tui`, `WEM.Tui.CJK` | 25 + a Tui module |
| `sections/*.js` | `WEM.defineSection` | **40_main.js** (it defines `defineSection`) |

`WEM.ATTR_BIND` (`10_render.js:14`) is set *before* any program is compiled and fixes attribute
locations: `aPos=0, aNrm=1, aUV=2, aInstA=3, aInstB=4, aInstC=5, aInstD=6, aExtra=7, aUV2=8`.
**Use those exact attribute names in custom shaders** or query `prog.a[name]`.

### 1.2 Boot payload (`index.ref.html:32-55`)

```js
var play = !new URLSearchParams(location.search).has("render");
window.WEM_AB_GAIN = 0.88; window.WEM_AB_EXPO = 0.30; window.WEM_AB_MUL = 1.62;
window.WEM_BANDS_GAIN = 0.22;
window.WEM.boot({ mode: play ? "play" : "render" }).then(function(){ window.__booted = true; ... });
```

### 1.3 `WEM.boot(opts)` — `40_main.js:347-368` (verbatim body)

```js
WEM.boot = function (opts) {
  var canvas = document.getElementById("gl");
  var W = opts.width || 1920, H = opts.height || 1080;
  canvas.width = W; canvas.height = H;
  var app = new WEM.App(canvas, { width: W, height: H, mode: opts.mode });
  WEM.app = app;
  return WEM.Data.load().then(function () {
    window.__render = function (t) { app.renderAt(t); return true; };
    window.__meta = { duration: ..., sections: ..., bpm: ..., beats: ..., sectionCount: WEM.sections.length, ready: true };
    if (opts.mode !== "render") app.run();
    return app;
  });
};
```

| opt | type | default | meaning |
|---|---|---|---|
| `opts.width` | number | `1920` | canvas backing-store width; also `App.W`, `Hud.W`, `cam.W` |
| `opts.height` | number | `1080` | canvas backing-store height |
| `opts.mode` | `"play"` \| `"render"` | App default `"render"` | `"play"` → creates `new Audio()`, starts the rAF loop; `"render"` → no audio, no loop (frame-driven) |

* Requires `<canvas id="gl">` to exist; there is **no** null check.
* Sections must already be registered (`WEM.sections`) — they are read on the first frame, not at boot.
* Returns `Promise<App>`; the promise resolves only after `WEM.Data.load()` has fetched
  `meta.json`, `spectrum.bin`, `wave.bin`, `energy.bin`.
* `window.__render` / `window.__meta` are only defined **after** that promise resolves. Capture tools
  poll `window.__booted` / `window.__bootError` (`tools/capture.mjs:56-64`).

### 1.4 Global handles

| global | set by | meaning |
|---|---|---|
| `WEM.boot(opts)` | 40_main | boot; returns `Promise<App>` |
| `window.__booted` | page (not the engine) | set by the inline boot script in `index.ref.html` / bundle |
| `window.__bootError` | page | `String(e.stack)` on boot failure |
| `window.__render(t)` | 40_main | `function (t) { app.renderAt(t); return true; }` — draws **one** deterministic frame at song time `t` (seconds). Returns `true`, not the app. Available in *every* mode. |
| `window.__meta` | 40_main | `{duration, sections, bpm, beats, sectionCount, ready}` |
| `WEM.app` | 40_main | the live `App` |
| `WEM.sections` | 40_main | `[]`, registration order = timeline index |
| `WEM.EMBED` | host page | base64/JSON payload map for fully offline builds (see `tools/bundle.mjs`) |
| `WEM.assetBase` | host page | analysis asset dir, default `"assets/analysis/"` |
| `WEM.audioBase` | host page | audio dir, default `"assets/audio/"` |
| `window.WEM_BANDS_GAIN` | host page | multiplies **every** `ctx.bands[i]` in `App.frame` (`40_main.js:190-193`) |
| `window.WEM_AB_GAIN`, `WEM_AB_EXPO`, `WEM_AB_MUL` | host page | audio-bar LED shaping only (`50_audiobar.js:99-101`); defaults `1`, `0.70`, `1.06` |
| `window.__seekInstalled` | 50_audiobar | seek bar installed once (play mode only) |

`renderAt(t)` (`40_main.js:286-290`):

```js
var dt = this._lastT === undefined ? 1 / 60 : clamp(t - this._lastT, 1 / 480, 0.25);
this._lastT = t; this.frame(t, dt);
```

Deterministic given the same sequence of `t` values, **but stateful**: effects decay via `dt`, and
`hud.panel` content lags one frame — capture tools warm up 45+1 frames before a still
(`tools/capture.mjs:74-77`).

### 1.5 URL flags

`?render` (page-level: boot in render mode), and `App.dbg` from `location.search` (`40_main.js:82-87`):
`?no2d ?no3d ?nochrome ?nohud ?nobloom ?nostripes ?noscan ?nocurve ?nodisp ?noaberr ?nograin ?novig`.

### 1.6 `WEM.app` (App) surface — `40_main.js:55-341`

| member | type | notes |
|---|---|---|
| `canvas, W, H` | — | 1920×1080 defaults |
| `renderer` | `Renderer` | |
| `renderer.res` | `Res` | GL resource manager (`=== ctx.res`) |
| `renderer.fx` | object | raw effect state, defaults `10_render.js:423-429` |
| `renderer.scene / .comp / .crt / .bloomA / .bloomB` | FBO records | scene is `{float:!!hdr, depth:true}` |
| `hud` | `Hud` | |
| `cam` | `Camera` | |
| `gfx` | object | `=== renderer.gfx()`, the 3D draw API |
| `data` | `WEM.Data` | |
| `beat` | object | beat clock, mutated in place each frame |
| `ctx` | object | the section context (§3) |
| `mode` | `"play"`\|`"render"` | |
| `cur, curIdx, idxNow` | section / number | `idxNow` == index drawn this frame (used by the audio bar) |
| `enterT, sectionIdx, firstFrame, time, bandsA, hudRects` | — | `sectionIdx`, `firstFrame`, `enterT` are **written but never read** by the engine |
| `dbg` | object | URL debug flags |
| `audio` | `HTMLAudioElement` | play mode only |
| `raf` | id | rAF handle |
| `setSection(i, hard)` | fn | `hard` is accepted but unused; calls `cur.exit`, `init` (once), `enter` |
| `frame(t, dt)` | fn | one full frame: 2D → chrome → 3D → hud upload → bloom/CRT composite |
| `run()` | fn | starts the rAF loop (play mode) |
| `renderAt(t)` | fn | `frame` with `dt` from `t - _lastT` |
| `drawChrome(ctx)` | fn | identity bar, section label, timecode, audio bar, corners, lyric line |

---

## 2. Section contract

```js
WEM.defineSection = function (s) { WEM.sections.push(s); return s; };   // 40_main.js:52
```

`WEM.sections[i]` is looked up by **timeline index** (`data.sectionIndex(t)`), so sections must be
registered **in analysis order, one per metadata section (15)**. Registering too few throws inside
`setSection` (`this.cur.id` on `undefined`). Registration happens at script load; nothing runs until
`WEM.boot`.

Every key the App actually reads (`40_main.js:162-183`, `185-249`):

| key | type | consumed by (verbatim) | behaviour when absent |
|---|---|---|---|
| `id` | string | `if (this.cur.id !== "14" && this.cur.id !== "15") rf.crtOff = 0;`<br>`if (this.cur.id !== "01") rf.crtOn = 1;` (l.170-171) | `undefined` ⇒ neither branch matches ⇒ `crtOff = 0`, `crtOn = 1` on entry: **CRT power-off is impossible**. `"01"`/`"14"`/`"15"` are the only ids the engine special-cases. |
| `name` | string | `if (this.cur.name && this.data.sections[i]) this.data.sections[i].name = this.cur.name;` (l.176) | metadata name kept (chrome shows `data.sections[i].name`) |
| `init` | `fn(ctx)` | `if (!this.cur._inited) { this.cur._inited = true; if (this.cur.init) this.cur.init(ctx); }` (l.179) | nothing. Called **at most once per section object**, on first entry (not at registration) — build meshes/`Viz` batches here. |
| `enter` | `fn(ctx)` | `if (this.cur.enter) this.cur.enter(ctx);` (l.181) | nothing. Called on **every** entry (including re-entry after seeking back). |
| `exit` | `fn(ctx)` | `if (this.cur && this.cur.exit) this.cur.exit(this.ctx);` (l.163) — executed **before** `curIdx`/`cur` are reassigned | nothing. Not called when the app stops. |
| `draw2d` | `fn(ctx)` | `else if (this.cur && this.cur.draw2d) this.cur.draw2d(ctx);` (l.222) | no section 2D layer; chrome is still drawn |
| `draw3d` | `fn(ctx)` | `if (!this.dbg.no3d && this.cur && this.cur.draw3d) this.cur.draw3d(ctx);` (l.228) | scene stays empty (cleared transparent black) |
| `def_end` | number (absolute seconds) | `ctx.dur = (this.data.ready ? (this.cur.def_end \|\| this.data.sections[i].end) : 1) - (... .start : 0)` (l.177) | metadata `end` used |
| `_inited` | bool | set by the engine (l.179) | — internal, do not set |

Anything else on the object is ignored by the engine (extra fields are fine; a common pattern is
stashing per-section state and buffers on `this`).

**Timing note on `def_end`:** `frame()` recomputes `ctx.dur = s.end - s.start` from metadata
(l.211) *after* `setSection`, so `def_end` only affects `ctx.dur` inside `enter()`/`init()` — **not**
the `ctx.dur`/`ctx.prog` your draws see. Shorten a segment with your own arithmetic
(e.g. `p = clamp(ctx.local / myDur, 0, 1)`).

**Camera is not reset between sections.** `setSection` only sets `cam.W/H`; whatever the previous
section left in `cam` persists. Set `cam.reset2d()` / `cam.reset3d(d)` at the top of your `draw3d`.

---

## 3. The `ctx` object — exhaustive

Created once per `App` in `_bindCtx` (`40_main.js:130-160`), mutated every frame in `frame`
(`185-249`) and on each section change in `setSection` (`162-183`).

### 3.1 Handles (stable identity for the whole app)

| field | type | meaning |
|---|---|---|
| `ctx.W`, `ctx.H` | number | backing-store size in px (1920×1080 default). **Not** CSS px; see §4.1 |
| `ctx.R` | `Renderer` | `=== ctx.app.renderer`; `ctx.R.fx` is the raw, complete effect state |
| `ctx.res` | `Res` | GL resource manager (`00_core.js:197-335`) |
| `ctx.gfx` | object | the draw API (`=== ctx.R.gfx()`, `=== ctx.app.gfx`) |
| `ctx.gl` | `WebGL2RenderingContext` | |
| `ctx.hud` | `Hud` | 2D canvas layer |
| `ctx.cam` | `Camera` | perspective/ortho camera |
| `ctx.data` | `WEM.Data` | analysis singleton |
| `ctx.app` | `App` | |
| `ctx.C` | `WEM.core` | `V3, M4, Ease, clamp, lerp, mix, smoothstep, rng, noise2, fbm2, h2, h3, PI, TAU, geo, packQuad, Res` |
| `ctx.S` | `WEM.Shaders` | every built-in shader source (§6) |
| `ctx.col` | object | `WEM.HUD.COL` colour constants |
| `ctx.fonts` | object | `WEM.HUD.FONTS` font stacks |

### 3.2 Per-frame values (rewritten inside `App.frame`, before `draw2d`)

| field | type / range | units | exact source |
|---|---|---|---|
| `ctx.t` | number, 0…`data.duration` | seconds, absolute song time | `ctx.t = t` (l.188) |
| `ctx.dt` | number | seconds since previous frame | play: `Math.min(0.05, raw)` where `raw = audio.currentTime - last` (bad values → `1/60`, l.256-268); render: `clamp(t-lastT, 1/480, 0.25)`, first call `1/60` |
| `ctx.bands` | `Float32Array(64)`, 0…1 | per-band magnitude | `data.bandsAt(t, this.bandsA)`, then `*= window.WEM_BANDS_GAIN` if defined (l.189-193). **Same array object every frame** (`app.bandsA`). |
| `ctx.rms` | number, 0…1 | loudness (dB-mapped) | `data.rms(t)` (l.195) |
| `ctx.flux` | number, 0…1 | onset strength | `data.flux(t)` (l.195) |
| `ctx.lyric` | `{t:number, text:string, meta:false}` \| `null` | — | `data.lyricAt(t)` (l.196) |
| `ctx.beat` | object (identity stable) | — | `data.beat(t, this.beat)` (l.194) → §8.5 |
| `ctx.sec` | section **metadata record** | — | `ctx.sec = s` where `s = data.sections[this.curIdx]` (l.207-209). Fields: `id,name,start,end,beat,bar,beatInBar,desc`. **During `enter()`/`exit()` it is instead the section definition object** (`ctx.sec = this.cur`, l.172). |
| `ctx.local` | number | seconds since `sections[curIdx].start` | `t - s.start` (l.210) — **this is "section-local time"; there is no `ctx.T`** |
| `ctx.dur` | number | seconds, section length | `s.end - s.start` (l.211); at `enter()` time it may use `def_end` (l.177) |
| `ctx.prog` | number, 0…1 | section progress | `clamp(ctx.local / ctx.dur, 0, 1)` (l.212) |
| `ctx.in` | number, 0…1 | fade-in envelope | `smoothstep(0, 0.45, ctx.local)` (l.213) — reaches 1 at 0.45 s |
| `ctx.out` | number, 0…1 | fade-out envelope | `1 - smoothstep(ctx.dur - 0.4, ctx.dur, ctx.local)` (l.214) |
| `ctx.chromeAmt` | number, default 1 | — | reset to `1` right before `draw2d` (l.220); set it to e.g. `0` **from `draw2d`** to hide the whole system chrome for this frame |
| `ctx.index` | number | index into `WEM.sections` | set in `_bindCtx` (0) and `setSection` (l.173) |

### 3.3 Section-change values (set in `setSection`, i.e. before `init`/`enter`)

| field | type | note |
|---|---|---|
| `ctx.index` | number | new section index |
| `ctx.sec` | object | the **section definition** at this moment |
| `ctx.dur` | number | `(cur.def_end \|\| sections[i].end) - sections[i].start` |
| `ctx.rnd` | `fn() → 0…1` | re-seeded: `C.rng(1000 + i * 7919)` (l.178). Initial value before any section change is `C.rng(1)` |

Inside `enter(ctx)` you get **fresh** `t, dt, bands, rms, flux, lyric, beat, index, sec, dur, rnd`,
but **stale** `local, prog, in, out` (they still hold the previous section's last-frame values;
`frame()` overwrites them immediately after `setSection` returns). On the play-mode seek/stall path
(`40_main.js:262-265`) `setSection` is called *before* `frame(t, dt)`, so `ctx.t/dt` there are the
previous frame's.

### 3.4 Helper functions on `ctx` (`40_main.js:142-159`)

| call | signature | effect |
|---|---|---|
| `ctx.fs(key, frag, uniforms, target)` | string, GLSL string, object, FBO record \| `"current"` \| `null` | compiles/caches a program with `WEM.Shaders.fsVS` as the vertex shader and runs it fullscreen. `target`: falsy = draw to the **canvas** (screen), `"current"` = keep current FBO/viewport, FBO record = render into it. Uniforms are matched by name against active uniforms (typos silently no-op). |
| `ctx.util.vp(x, y, z)` | numbers | projects a world point → `[screenX, screenY, w]` in backing-store px (uses `cam.vp`) |
| `ctx.hudRect(i, cx, cy, hw, hh)` | numbers | writes `uRects[i]` for the composite's HUD cut-out mask, `i = 0…5` (24-float array) |
| `ctx.clearHudRects()` | — | zeroes all 6 rects; called by `frame` before `draw3d` (l.225), so **3D sections must re-register every frame** |

`uRects` interpretation (`10_render.js:240-245`): `vec2 q = abs(uv - uRects[i].xy);
hudMask *= 1.0 - step(q.x, uRects[i].z)*step(q.y, uRects[i].w);` where `uv` is normalised screen UV,
`xy = centre`, `zw = half size`. **Units are UV (0…1, origin bottom-left, y up), not pixels** —
this is inferred from the shader; there is no in-repo caller to confirm. Pixel→UV:
`ctx.hudRect(0, cx/W, 1 - cy/H, hw/W, hh/H)`.

### 3.5 Things that do **not** exist on `ctx`

`ctx.T` (use `ctx.local`), `ctx.mood` (use `ctx.fx.mood(...)`), `ctx.pal` / `ctx.theme`
(use `ctx.col`, `ctx.fonts`, `ctx.fx.mood`), `ctx.time`, `ctx.section`, `ctx.panel`, `ctx.texture`,
`ctx.mouse`/pointer input (the engine has **no** input handling at all), `ctx.dpr`.

---

## 4. `ctx.hud` — the Hud class (`20_hud.js`)

### 4.1 Canvases & coordinates

`new WEM.Hud(w, h, NW, NH, CW, CH)`; App builds `new WEM.Hud(1920, 1080, 4, 4, 512, 512)` (l.62).

| property | value | meaning |
|---|---|---|
| `hud.W, hud.H` | 1920, 1080 | **full** layer size |
| `hud.full` / `hud.fc` | canvas / `CanvasRenderingContext2D` | screen layer; origin **top-left, y down, unit = backing-store px** |
| `hud.panC` / `hud.pc` | canvas / 2D ctx | panel atlas, `4×4` cells of `512×512` → **2048×2048** |
| `hud.NW, NH, CW, CH` | 4, 4, 512, 512 | grid dims / cell size |
| `hud.tFull`, `hud.tPan` | `{tex,w,h,key}` \| `null` | GL texture records; `tFull` is `null` until the first `upload()` |
| `hud.dirtyFull`, `hud.dirtyPan`, `hud.panDirty` | bool | upload bookkeeping (`panDirty` is created lazily by `panel()`) |
| `hud._align` | `"left"` | vestigial, unused |

* No DPR handling: the canvas backing store is 1920×1080 and CSS stretches it (`#gl{width:100vw;height:100vh}`).
  `hud.W/H` and all HUD pixel coordinates are backing-store units.
* The file's header comment says "4x4 256x256 panels" — **stale**; the App really uses 512×512 cells.
* Section code may use `hud.fc` / `hud.pc` directly with raw Canvas2D (the audio bar does), but must
  `save()`/`restore()` its own state.

### 4.2 Methods (complete public list)

| method | signature | draws / returns |
|---|---|---|
| `T` | `T(x, y, str, o)` | one line of text; returns `0` (stub — **do not** use as width) |
| `code` | `code(x, y, line, lang, o)` | syntax-highlighted single line; returns advance width in px |
| `codeWidth` | `codeWidth(line, lang, size)` | width of `line` in that mono font (tabs → 4 spaces) |
| `formula` | `formula(x, y, tex, o)` | LaTeX-subset formula; returns the layout box `{w,h,d,boxes,draw}` |
| `measureFormula` | `measureFormula(tex, size)` | width in px |
| `rect` | `rect(x, y, w, h, o)` | filled/stroked rectangle |
| `line` | `line(x0, y0, x1, y1, o)` | line (optional dash) |
| `win` | `win(x, y, w, h, title, o)` | flat UI window chrome with title bar |
| `bar` | `bar(x, y, w, h, p, o)` | progress bar, `p` clamped 0…1, optional tick marks |
| `hexDump` | `hexDump(x, y, bytes, rows, o)` | `rows` lines of 16 bytes: address / hex / ASCII (wraps modulo `bytes.length`) |
| `panel` | `panel(i)` → `{ctx,x,y,w,h,u0,v0,u1,v1,rect,clear(bg)}` | sets a translate transform on `hud.pc` so `panel.ctx`'s origin is the cell's top-left; marks `panDirty` |
| `clear` | `clear(which?)` | `clear()` clears **both** canvases and resets their transforms; `clear("full")` = full only, `clear("pan")` = atlas only |
| `upload` | `upload(res)` | (re)uploads `hud.full` and, if dirty, the atlas — called by `App.frame` after the 3D pass |
| `uploadPan` | `uploadPan(res)` | (re)uploads the atlas only |
| `fontStr` | `fontStr(size, font, weight)` | CSS font string; `font` is a `FONTS` key **or** a raw family list containing a comma |

`Hud.panel(i)` details (`20_hud.js:508-528`): `cx = (i % NW)*CW`, `cy = ((i/NW)|0)*CH`;
`u0=cx/panW, v0=cy/panH, u1=(cx+CW)/panW, v1=(cy+CH)/panH`; **`rect = [u0, v1, u1, v0]`** — already
flipped in v so it can be fed straight into `Viz.Quads.add(m, p.rect, rgba)` (canvas top row = quad
local +y). Valid `i = 0…15`. No inset/padding between cells (LINEAR sampling can bleed 1 px across
neighbours).

### 4.3 Option objects

`T(x, y, str, o)` — `{ctx, size=16, font="mono", weight, color=COL.white, alpha=1,
align="left"|"center"|"right", baseline="alphabetic", glow (true|css colour), blur=12, spacing}`
`spacing` is a **number** (the code appends `"px"`; passing `"1px"` produces `"1pxpx"`, which the
browser ignores).

`code(x, y, line, lang, o)` — `{ctx, size=14, alpha=1, color}` (`color` forces a single colour).
Languages: `python, c, glsl, rust, asm, sql, haskell`; unknown → `c`. Token classes:
`kw str num com fn op id reg const ws` (colours `TOKCOL`, module-private: kw `#b48cff`, str `#7ee787`,
num `#ffc46b`, com `#6e7681`, fn `#6ce8ff`, op `#c8d0d8`, id `#d7dde4`, reg `#ffc94a`).

`rect` — `{ctx, fill, stroke, lw=1, alpha}`. `line` — `{ctx, color=COL.grey, lw=1, dash, alpha}`.
`win` — `{ctx, alpha, fill=true, bg, color, lw=1.5, barH=20, titleBg, titleColor, titleSize=12}`.
`bar` — `{ctx, alpha, color, fill, ticks}`. `hexDump` — `{ctx, size=12, alpha, base, addrColor,
color, asciiColor}`. `formula` — `{ctx, size=28, color, align}`.
`panel(i)` takes no options; `panel.clear(bg?)` takes an optional CSS fill colour.

### 4.4 Constants

`WEM.HUD.COL`:

| key | value | key | value |
|---|---|---|---|
| `white` | `#eef2f6` | `gold` | `#ffc94a` |
| `dim` | `#9aa3ad` | `accent` | `#35e0ff` |
| `faint` | `#5b636c` | `red` | `#ff5a52` |
| `black` | `#05070a` | `blue` | `#7fb2ff` |
| `purple` | `#b48cff` | `pink` | `#ff8fd0` |
| `green` | `#7ee787` | `grey` | `#c3cad2` |
| `amber` | `#ffc46b` | `cyan` | `#6ce8ff` |

`WEM.HUD.FONTS` = `{ mono: '"Cascadia Mono","Consolas","DejaVu Sans Mono",monospace',
ui: '"Segoe UI","Inter",system-ui,sans-serif', math: '"Cambria Math","Latin Modern Math","Times New Roman",serif' }`.

`WEM.HUD.tokenize(line, lang)` → `[{c, s}]`; `WEM.HUD.parseMath(src)` → node list;
`WEM.HUD.makeSeq(list, size, ctx2d)` → `{w,h,d,boxes,draw(x,y)}`.

**LaTeX subset** (`parseMath`, `20_hud.js:26-169`): `^ _ { } \frac \sqrt \left \right \big \Big`
`` \cdot \times \geq \ge \leq \le \neq \approx \to \rightarrow \oint \int \sum \ln \log \sin \cos
\tan \exp \lim \epsilon \varepsilon \delta \Delta \rho \tau \eta \pi \infty \nabla \partial \psi \Psi
\phi \alpha \beta \gamma \mu \lambda \omega \theta \sigma \hbar \vec \hat \bar \dot \ddot \text \mathrm
\mathbb \quad \qquad \forall \exists \wedge \vee \equiv \propto \sim \simeq \pm \mp \ldots \dots
\circ \subset \perp \in \chi \langle \rangle `` and escapes `\| \{ \} \, \; \!` . No environments,
no `\begin`, no `\over`, no `\binom`; an unknown command renders as its literal name (`{t:"txt", s:cmd}`).

### 4.5 Methods authors often expect but that do **not** exist

`text` (it is `T`), `textW`, `measure`, `glow` (glow is an **option** on `T`), `clip`/`pushClip`/
`popClip` (use `hud.fc.save()/restore()` + `beginPath()/clip()` yourself), `pan` (use `panel(i)` —
`tPan` is a texture property, not a method), `circle`, `poly`, `image`/`drawImage` wrapper,
`uploadFull`. Widths: use `hud.codeWidth`, `hud.measureFormula`, `hud.formula(...).w`, or raw
`hud.fc.measureText`.

---

## 5. `ctx.gfx` — Renderer + draw API

### 5.1 `gfx` methods

```js
gfx.solid(mesh, model, o)
gfx.wire(mesh, model, o)
gfx.lines(data, o)              // instanced
gfx.points(data, o)             // instanced
gfx.quads(data, tex, o)         // CPU-expanded, NOT instanced
gfx.fullscreen(prog, uniforms, target)
gfx.fso(key, vs, fs)            // === renderer.prog(key, vs, fs) → program record
```

| call | data layout | options (`o`) | state it sets |
|---|---|---|---|
| `solid(mesh, model, o)` | `mesh = {pos:Float32Array, nrm?:Float32Array, idx:Uint16/Uint32Array, uv?}` | `color=[0.9,0.92,0.96]`, `alpha=1`, `unlit`, `rim=0.5`, `emissive=0`, `smooth` (default **flat**), `light=[0.42,0.78,0.46]`, `blend:"add"`, `depthWrite=true` | `useProgram`, `enable(DEPTH_TEST)`, `depthMask`, `blendFunc` |
| `wire(mesh, model, o)` | same | `color=[0.8,0.85,0.9]`, `alpha=1`, `width=1.6`, plus everything `lines` takes | forwards to `lines`; transforms edges on the CPU by `model`; caches edges in `mesh._edges` |
| `lines(data, o)` | stride **12** floats/segment: `p0.xyz, w0, p1.xyz, w1, r,g,b,a` | `scale=1`, `fade=1`, `dash=0`, `glow=0`, `add`, `depthWrite=true` | `useProgram`, `enable(DEPTH_TEST)`, `depthMask`, `blendFunc` |
| `points(data, o)` | stride **8** floats/point: `x,y,z,size, r,g,b,a` | `scale=1`, `soft=0.7`, `add` (default **true**), `depthWrite=true` | as above |
| `quads(data, tex, o)` | stride **24** floats/quad: `mat4(16) + rgba(4) + uvRect(u0,v0,du,dv)(4)` (`C.packQuad`) | `add`, `depthWrite=true`, `noDepth` (**disables** DEPTH_TEST), `unit=0` | `useProgram`, `enable(DEPTH_TEST)` unless `noDepth`, `depthMask`, `blendFunc`; binds `tex` (`tex.tex \|\| tex`) |
| `fullscreen(prog, uniforms, target)` | — | `target`: falsy → screen (framebuffer `null`), `"current"` → keep, FBO record → bind + `viewport(0,0,w,h)` | `useProgram`, `disable(DEPTH_TEST)`, `depthMask(false)`, `disable(BLEND)` |

Key numerics:

* **Line width `w` is in pixels** (`lineVS` offsets the segment in screen space; `uScale = o.scale * (canvasW/1920)`),
  so widths are resolution-independent up to that factor.
* **Point size**: `gl_PointSize = clamp(size * uScale * 8.0 / max(clipW,1e-3), 1.0, 56.0)` — in
  perspective it fades with distance; in the ortho camera `w == 1`, so `size` is effectively
  **×8 px** (`62_lyric.js:238-240` notes this).
* `gfx.quads` ignores the model matrix's 3rd column: a quad lives in its model matrix's **XY plane**
  (columns 0 and 1), `m[12..14]` = position, and `uvRect`'s `dv` is signed (pass `panel.rect` as-is).
* Textures come from `Res.tex(...)`; `hud.tFull` / `hud.tPan` are the two engine-owned ones.
* Attributes are bound by location (see §1.1). `mesh` objects are cached by `mesh._key` at first draw —
  **do not mutate `mesh.pos` afterwards**.

### 5.2 `Renderer` (`new WEM.Renderer(canvas)`; reached as `ctx.R`)

| member | signature | notes |
|---|---|---|
| `resize(w, h)` | — | sets canvas size, (re)creates `scene` (float if `EXT_color_buffer_float`, with depth), `comp`, `crt`, `bloomA/B` at ¼ res |
| `prog(key, vs, fs)` | → `{p, u:{name→loc}, a:{name→loc}, key, opts}` | cached by `key`; throws on compile/link error and prints the annotated source |
| `beginScene(cam)` | — | binds `scene.fb`, full viewport, `depthMask(true)`, `colorMask(true×4)`, clear color (0,0,0,0)/depth 1, `enable(DEPTH_TEST)`, `depthFunc(LEQUAL)`, `disable(CULL_FACE)`, `enable(BLEND)`, premultiplied `blendFuncSeparate(ONE, ONE_MINUS_SRC_ALPHA, …)`, clears; stores `vp = cam.vp` (same object), `eye = cam.pos`, `pxScale` |
| `u(prog, name, v)` | — | number→`uniform1f`, boolean→0/1, `{tex,unit}`→binds texture, arrays by `length`: 2/3/4 → `uniform2/3/4f`, 9 → `mat3`, 16 → `mat4`, 24 → `uniform4fv`, other → `uniform1fv` |
| `gfx()` | → object | memoised singleton |
| `composite(hudTex, opts)` | — | bloom bright-pass (threshold hardcoded **0.62**) + 2 separable blurs, composite (`opts.hudRects` = the 24-float array), CRT to screen |
| `decay(dt)` | — | exponential decay of `flash, glitch, disp, whiteBar, hudGlitch, shakeY, jump, invert` |
| fields | `gl, extCBF, extFloatBlend, hdr, res, w, h, fx, t, cam, vp, eye, pxScale, hudRects, scene, comp, crt, bloomA, bloomB, dyn` | `pxScale` is set but unused by the engine's own draw calls |

There is **no** matrix stack: model matrices are plain `Float32Array(16)` you build with `M4.*` and
pass explicitly. There is no `push*`/`pop*`, no `translate/rotate` state, no scissor helper.

`Res` (`00_core.js:197-335`): `program(key,vs,fs,opts)`, `buf(key,data,target,usage)`,
`tex(key,o)`, `fbo(key,w,h,o)`, `vao(key,attrs,indexData)`.
`tex(key, o)`: `o = {canvas|data|(w,h), internal, format, type, filter, min, mips, wrap, wrapT,
unpackFlip, target}` → `{tex, w, h, key}`; calling it again with the same key **re-uploads**
(`texImage2D`), which is how per-frame canvas textures are pushed.
`fbo(key,w,h,o)`: `o = {float, count (MRT), depth, nearest}` → `{fb, tex:[…], depth, w, h, float, count}`;
recreated when `w/h/float` change.

### 5.3 GL state rules (read this before mixing raw GL with `gfx`)

* `beginScene` re-establishes a clean state **once per frame**: depth test on, blend on (premultiplied),
  cull off, depthMask on, scene FBO bound, full viewport. `lineVS/pointVS/quadVS/solidVS` outputs are
  **premultiplied** (`rgb*a, a`), which is why the blend func is `ONE, ONE_MINUS_SRC_ALPHA`.
* `gfx.fullscreen` (i.e. `ctx.fs`) leaves `DEPTH_TEST` **disabled**, `depthMask(false)` and
  **`BLEND` disabled**. The `solid/lines/points/quads` calls re-enable depth test and set `blendFunc`
  but they **never call `gl.enable(gl.BLEND)`** — so after any `ctx.fs(...)` inside `draw3d`, blending
  stays off. Fix: `ctx.gl.enable(ctx.gl.BLEND);` (or don't mix).
* `gfx.fullscreen(..., target)` **rebinds the framebuffer and viewport**. To get back to the scene
  there is no public helper that does not clear: use
  `ctx.gl.bindFramebuffer(ctx.gl.FRAMEBUFFER, ctx.R.scene.fb); ctx.gl.viewport(0, 0, ctx.R.w, ctx.R.h);`
  (`beginScene` would clear the frame's geometry).
* `CULL_FACE` is disabled for the whole frame; back faces are visible and the fragment shader flips
  `vN` by `gl_FrontFacing`.
* Meshes **without normals** (`geo.grid`, `geo.ico`, `geo.tetra`, `Lab.solidMesh`) are fine with the
  default `o` because `uFlat` defaults to flat shading, which derives the normal from
  `cross(dFdx(vW), dFdy(vW))`. Passing `smooth: true` on a normal-less mesh gives `normalize(vec3(0))`.
* `mouse`/`pointer` state does not exist; nothing in the engine responds to input except the start
  button and `P` (page-level) and the play-mode seek bar.

### 5.4 Minimal working `draw3d` (renders, then leaves the frame usable)

```js
WEM.defineSection({
  id: "03", name: "demo-3d",
  init: function (ctx) { this.mesh = ctx.C.geo.torus(1.0, 0.35, 48, 24); },   // once
  draw3d: function (ctx) {
    var M4 = ctx.C.M4, gfx = ctx.gfx, t = ctx.t;
    ctx.cam.reset3d(4.5);                        // persp, near .05, far 400, eye at z=+4.5
    ctx.cam.pos[1] = Math.sin(t * 0.6) * 0.6;    // mutate IN PLACE (R.eye aliases this array)
    ctx.cam.update();                            // writes into cam.vp in place → R.vp sees it

    var model = M4.mul(M4.rotY(t * 0.8), M4.rotX(t * 0.31));   // mul(a,b) === a*b
    gfx.solid(this.mesh, model, { color: [0.55, 0.85, 1.0], rim: 0.9, emissive: 0.05 });
    gfx.wire(this.mesh, model, { color: [0.06, 0.10, 0.14], alpha: 0.55, width: 1.0 });
    // nothing to restore: beginScene resets state next frame, and solid/wire set their own
  }
});
```

---

## 6. Module exports

### `WEM.core` (`00_core.js:484-501`)

`PI, TAU`; `V3.{add,sub,mul,scale,dot,cross,len,norm,lerp,dist}(a,b[,o])`;
`M4.{ident,mul,persp,ortho,lookAt,trans,scale,rotX,rotY,rotZ,rotAxis,compose,billboard,inv,transpose,normalMat3,xform}`
(all column-major `Float32Array(16)`, `o` is an optional out-param; `M4.mul(a,b) === a·b`);
`Ease.{linear,inQuad,outQuad,inOutQuad,inCubic,outCubic,inOutCubic,outQuart,outExpo,inExpo,outBack,outElastic,outBounce}`;
`clamp(v,a,b)`, `lerp(a,b,t)`, `mix(a,b,t)`, `smoothstep(a,b,x)`, `rng(seed)` → `fn()→0…1`,
`noise2(x,y)`, `fbm2(x,y,oct=4)`, `h2(x,y)`, `h3(x,y,z)`;
`Res`; `packQuad(arr, off, m, rect, rgba)` (writes 24 floats);
`geo.{box(sx,sy,sz), grid(nx,nz,size,y), plane(w,h,seg), ico(subdiv), torus(R,r,nu,nv),
trefoil(tube,nu,nv), tetra(), cylinder(r0,r1,h,n), make(pos,nrm,idx)}` → mesh
`{pos, nrm|null, idx, uv?}`. Unit-ish sizes: box ±s/2, ico r=0.5, tetra ±0.5, plane centred in XY
facing +z, trefoil pre-scaled by 0.34, `geo.grid` is XZ with `nrm = null`.

### `WEM.Viz` (`25_viz.js:243-250`)

| export | signature | one-liner |
|---|---|---|
| `Lines` | `new Lines(max=4096)` | segment batch → `seg(ax,ay,az,bx,by,bz,col,w=1.6,alpha=1)`, `path(pts,col,w,alpha,closed)`, `glow(o)`, `view()`, `draw(gfx,o)`, `clear()` |
| `Points` | `new Points(max=20000)` | `add(x,y,z,size,col,alpha=1)`, `view()`, `draw(gfx,o)`, `clear()` |
| `Quads` | `new Quads(max=512)` | `add(mat4, rect, rgba)`, `view()`, `draw(gfx,tex,o)`, `clear()` |
| `sample` | `sample(fn, a, b, n)` | `fn(t,u) → [x,y,(z)]` sampled to `[[x,y,z],…]` |
| `helix` | `helix(n,R,rise,turns,phase)` | helix points, y from −rise/2 to +rise/2 |
| `circlePts` | `circlePts(n,R,y,phase)` | circle in the XZ plane at height `y` |
| `heartCurve` | `heartCurve(n,s=1)` | parametric 2D heart (16sin³t family) |
| `heartImplicit` | `heartImplicit(x,y)` | `(x²+y²−1)³ − x²y³`; 0 on the curve |
| `lorenz` | `lorenz(n,dt,p0,sigma=10,rho=28,beta=8/3)` | Euler-integrated Lorenz attractor points |
| `pendulumState` | `pendulumState(th1,w1,th2,w2,dt,m1,m2,l1,l2,g)` | one RK4 step of a double pendulum → `[θ1,ω1,θ2,ω2]` |
| `rot4` | `rot4(p,a,b,c,d)` | 4D rotation (xw, yz, xy, zw) of `[x,y,z,w]` |
| `tesseractVerts` / `tesseractEdges` | `()` | 16 4-D vertices / 32 index pairs |
| `sierpinskiTetra` | `sierpinskiTetra(depth)` | recursive tetrahedron → list of triangles |
| `recursiveTree` | `recursiveTree(depth,len,spread,rnd)` | branching segments `[[p0,p1,depth],…]` |
| `plot` | `plot(fn,a,b,n,sx,sy)` | `[x*sx, fn(x)*sy, 0]` polyline |
| `formulaPanel` | `formulaPanel(ctx, i, texObj, o)` | renders a formula into HUD panel `i` at 512 px, fitted, `o={tex,bg,size=120,color}` → `{p, rect, size, aspect, expr}` |
| `extrude` | `extrude(quads, rect4, model, o)` | stacked quads faking an extruded glyph block, `o={layers=7,depth=0.06,tint,shadow}` |

### `WEM.Lab` (`26_lab.js:277-285`)

`PLATONIC` (`tetra,cube,octa,dodeca,icosa` with `{name,V,E,F,verts,faces}`), `PLATONIC_ORDER`,
`solidMesh(key)` → mesh (no normals; drawn flat), `besselJ(n,x)`, `besselZero(n,which)`,
`chladni(m,n,x,y)`, `popcount(x)`, `bits8(x)`, `GOLDEN` (radians), `phyllotaxis(n,c)` → `[[x,y],…]`,
`inspiral(t,tc,a0)`, `chirp(t,tc,f0)`, `breakdown(seed,steps,spread)` → `[x0,y0,x1,y1,progress]`
segments, `attention(tokens,dim,head)` → causal softmax matrix `N×N`, `voronoiSites(n,seed,radius)`
→ `[[x,y,w],…]`, `dijkstraField(w,h,seed)` → `Float32Array(w*h)` distances, `HEARTS` (9 × `{name,
f(t)→[x,y]}`), `taubin(x,y,z)`, `EGGPLANT` (8 × `{k,g,c}` per 100 g), `LYCOPENE`
(`{peaks:[444,472,503], gamma:14, color}`), `lycopeneAbs(nm)`, `PHI`.

### `WEM.Model` (`27_model.js:284-298`)

`build(ctx)` → `{vocab, ids, E, W, dim:12, V, loss[], unigram, pca:{mean, comps[2]}, attack:{seq,
curve, score, NV:64}, whale:points, sample, topk}` — trains at **load/boot time** on
`ctx.data.lrc` words (dim 12, 420 epochs, lr 6.0, plus a real power-iteration PCA and a 40-step GCG
attack). `CHAT`, `ROLES`, `SFT` (7 instruction pairs), `PERSONAS` (4 × `{id,label,ask,sys,temp}`),
`quantise(w,bits)` → `{w,scale,levels,mae,rel}`, `gcgAttack(seed,steps)` → `{seq,curve,score,NV}`,
`whale(n)` → bezier whale outline points, `sample(m,startId,n,temp,seed)` → `[{id,tok,p}]`,
`topk(m,id,k)` → `[{v,z,p,tok}]`.

### `WEM.Lyric` (`62_lyric.js`)

`windows` (14 time windows `{t0,t1,kind,lrc,tex[,emoji,cap]}`), `active(t)` → window \| `null`
(inclusive `t0…t1`), `draw(ctx, hud, t)` — note the **3-arg** signature (the engine never calls it;
sections do), `draw3d(ctx)` — **immediately returns** (`if (true) return;` — disabled).
⚠ Loads `WEM.Tui` (absent here) at script-eval time → TypeError unless a Tui module is loaded first.

### `WEM.Data` (§8) · `WEM.AudioBar` (`50_audiobar.js`)

`AudioBar.geom(W, H)` → `{x0,x1,y0,h,beatX0,beatX1,yTop,yBot,deckX,deckW,vuX,vuW}`;
`AudioBar.draw(ctx, hud)` — draws the cassette deck + 64-segment LED spectrum + L/R/Σ VUs +
progress ticks. It is called from `App.drawChrome` (`40_main.js:316-317`) whenever `WEM.AudioBar`
exists, i.e. **the chrome already includes it — don't call it twice**. It reads `ctx.W/H/t/bands/
beat/rms/data.sections/app.idxNow` and mutates module-level peak/reel/VU state each call.

### `WEM.Shaders` / `WEM.GLSL` / `WEM.Camera`

`WEM.Shaders` keys: `solidVS solidFS lineVS lineFS pointVS pointFS quadVS quadFS fsVS brightFS
blurFS compFS crtFS mandelFS rayFS`. `fsVS` is the fullscreen pair for any custom `...FS`.
`mandelFS` uniforms: `uRes, uTime, uCenter, uZoom, uIter, uMorph, uHue, uGlow, uGhost, uJulia, uC`;
`rayFS` uniforms: `uRes, uTime, uDisk, uSpin, uHole, uRing, uGrid, uTint, uWarp`. `ctx.fs` does
**not** auto-fill uniforms — pass `uRes:[ctx.W,ctx.H]` and `uTime:ctx.t` yourself.
`WEM.GLSL.trim(src)` strips the leading newline so `#version` stays first.
`WEM.Camera` = the constructor used for `ctx.cam`: fields `W,H,mode("persp"|"ortho"),pos,target,up,
fov=0.9,near=0.05,far=400,roll,pxX,pxY,zoom=1,vp,pxScale`; methods `reset2d()` (ortho pixel space:
origin top-left, **y down**, `1` unit = 1 px, controlled by `pxX/pxY/zoom`), `reset3d(d=6)`
(`pos=[0,0,d]`, target origin, y up), `update()` → `vp` (mutates the same `Float32Array` in place).
`M4.billboard(pos, eye, s)` builds an eye-facing quad matrix; `M4.rotAxis(axis, a)` for arbitrary axes.

---

## 7. `ctx.fx` — post/CRT controls (`40_main.js:91-128`, shaders in `10_render.js`)

Two ways in: `ctx.fx` (curated getters/setters + `mood()`/`hit()`) and `ctx.R.fx` (raw object — all
of them, including the ones `ctx.fx` does not expose). A fresh `ctx.fx` object is created per App;
getters delegate to the same numbers as `ctx.R.fx`.

| field | type / typical range | default | visual effect | write style |
|---|---|---|---|---|
| `flash` | number 0…1.4 | 0 | additive white lift on the final image (`col += uFlash`) | **assign** |
| `glitch` | number 0…1.2 | 0 | random horizontal band displacement; also feeds dispersion | **assign** |
| `disp` | number 0…~1 | 0 | composite chromatic aberration (`d = uDisp*0.010` UV) | **assign** |
| `whiteBar` | number 0…0.7 | 0 | horizontal white bars (140 rows) | **assign** |
| `hudGlitch` | number 0…1 | 0 | horizontal tearing of the **HUD layer only** | **assign** |
| `bloom` | number ~0…2 | **0.50** | additive bloom multiplier (bright-pass threshold 0.62, ¼-res, 2 blurs) | **assign** |
| `fade` | number 0…1 | 1 | multiplies the whole image (`col *= uFade * uExposure`) | **assign** |
| `crtOn` | number 0…1 | 1 | CRT power-**on**: raster opens from a bright centre line at 0 → full at ≥0.999 | **assign** |
| `crtOff` | number 0…1 | 0 | CRT power-**off**: raster collapses to a line, bright flash near 0.5 | **assign** |
| `invert` | number 0…1 | 0 | `mix(col, 1-col, uInvert)` | **assign** |
| `scan` | number 0…1 | 0.34 | scanline modulation depth | **assign** |
| `curve` | number ≥0 | 0.26 | CRT barrel curvature (0 = flat) | **assign** |
| `grain` | number ~0…0.1 | 0.028 | additive hash grain amplitude | **assign** |
| `vignette` | number 0…1 | 0.42 | corner darkening | **assign** |
| `hud` | number 0…1 | 1 | HUD layer opacity (`0` hides all 2D) | **assign** |
| `stripes` | number | 1 | ⚠ plumbed to `uStripes` but **never read by `compFS`** — no visual effect today | assign (no-op) |
| `shakeY` | number, small (±0.01) | 0 | shifts the whole image vertically (`uv.y += uShakeY`) | **assign** |
| `jump` | number, small | 0 | shifts the whole image horizontally (`uv.x += uJump`) | **assign** |
| `aberr` | number ~0…2 | 0.55 | CRT-stage chromatic aberration (grows toward the edges) | **assign** |
| `exposure` | number ~0.2…2 | **1.22** | final exposure multiplier | **assign** |
| `mood(c1, c2, amt)` | `([r,g,b]?, [r,g,b]?, number?)` | mood 0, colors `[0.1,0.2,0.5]` / `[0,0,0]` | sets `moodColor`, `moodColor2`, `mood` (0…1): background tint, radial second colour, and a desaturating grade (`mix(luma, col, 1.06 - mood*0.35)`) | **call** |
| `hit(k)` | `(k=1)` | — | flash `+0.38k` (≤1.4), glitch `+0.30k` (≤1.2), whiteBar `+0.10k` (≤0.7), `shakeY = (sin(app.time*91.7)*0.006 + 0.004)*k` | **call** |

**Never assign `ctx.fx.mood`** — it is the setter function; assigning a number destroys the only way
to set the mood colour/gradient. Use `ctx.fx.mood(c1, c2, amt)`.
Not exposed on `ctx.fx` (use `ctx.R.fx`): `moodColor`, `moodColor2`, `ghost`, `roll`, `grille`,
`dash`, `scale`. `ghost` is passed as `uGhost` but unused by `compFS`; `grille` modulates the
aperture-grille mask in `crtFS`.

Decay (`Renderer.decay`, called at the **top** of each frame, before `draw2d`):
`flash *= 0.0005^dt`, `glitch *= 0.002^dt`, `disp *= 0.01^dt`, `whiteBar *= 0.001^dt`,
`hudGlitch *= 0.01^dt`, `shakeY/jump *= 0.0008^dt`, `invert *= 0.004^dt` (each snapped to 0 below a
small epsilon). So effects set during `draw2d`/`draw3d` are visible in the **same** frame's composite
and are one frame older when you next read them.

---

## 8. `ctx.data` — `WEM.Data` (singleton, `30_data.js`)

### 8.1 Accessors

| signature | returns | units / notes |
|---|---|---|
| `load()` | `Promise<Data>` | fetches `meta.json`, `spectrum.bin`, `wave.bin`, `energy.bin` (or reads `WEM.EMBED`); sets `ready = true` |
| `band(t, i)` | number 0…1 | one band, linearly interpolated between analysis frames; `0` if `t < 0` or past the end; `i = 0…63`; **raw — no `WEM_BANDS_GAIN`** |
| `bandsAt(t, out?)` | `Float32Array(64)` 0…1 | all bands at once; pass a buffer (`ctx.bands`) to avoid allocation. `t` clamped to `[0, (frames-1.001)/fps]` |
| `rms(t)` | number 0…1 | loudness, `(dBFS + 60)/60` clipped, interpolated |
| `flux(t)` | number 0…1 | non-negative spectral-flux onset strength, normalised to the song max |
| `waveAt(t)` | `[min, max]`, each −0.5…0.5 | waveform peak envelope; **nearest 10 ms cell, no interpolation** (cell = `Math.round(t*100)`) |
| `beat(t, o?)` | the object `o` (or a new one) | see §8.5 |
| `sectionIndex(t)` | int | index of the last section whose `start ≤ t` (0 before the first) |
| `section(t)` | record | `sections[sectionIndex(t)]` |
| `lyricAt(t)` | `{t, text, meta:false}` \| `null` | last LRC line with `t ≤ t + 0.02`; `meta:true` (staff-credit) lines are filtered out at load |
| `nextLyric(t, n=0)` | record \| `null` | the `(n+1)`-th line strictly after `t` |
| `notesBetween(a, b)` | `[{t,d,p,v,tr}]` | MIDI notes with `a ≤ t < b`; `d` = duration s, `p` = pitch, `v` = velocity, `tr` = track |

### 8.2 Raw fields (after `load()`)

| field | value / shape | units |
|---|---|---|
| `ready` | bool | false until `load()` resolves |
| `meta` | object | full `meta.json` |
| `spec` | `Uint8Array(frames*bands)` = `12712*64` | 0…255, log-compressed band magnitude, row = frame, `band(t,i)` divides by 255 |
| `wave` | `Uint8Array(duration*100*2)` = `21190*2` | per 10 ms cell: `[min, max]`, `q = clip(x*1.05+0.5,0,1)*255` → 128 ≈ silence |
| `energy` | `Uint8Array(frames*2)` = `12712*2` | interleaved `[rms, flux]`, 0…255 |
| `duration` | `211.9067` | seconds |
| `fps` | `60` | analysis frames per second (`hop = SR/60 = 735`, `nfft = 2048`, `sampleRate`) |
| `frames` | `12712` | analysis frames |
| `bands` | `64` | bands, **log-spaced 40 Hz … 16 kHz** (`np.geomspace`, `analyze.py:58`); band 0 = bass, band 63 ≈ 16 kHz |
| `bpm` | `130` | |
| `period` | `0.461538` | seconds per beat |
| `phase0` | `0.286` | seconds; the first beat |
| `sections` | 15 records | `{id, name, start, end, beat, bar, beatInBar, desc}` — `name` is overwritten by the loaded section's `name`; **this array is what `ctx.sec` points at** |
| `lrc` | 129 usable entries (`meta.json` holds 131, of which 2 are `meta:true` credits), sorted by `t` | `{t, text, meta:false}` |
| `notes` | `611` | `{t, d, p, v, tr}` |
| `beats` | `459` numbers | first `0.286`, step `0.461538` |
| `downbeats` | `115` numbers | `beats[::4]` |

### 8.3 Sections (metadata, `meta.json`)

| i | id | name | start | end |
|---|---|---|---|---|
| 0 | 01 | boot | 0.0000 | 15.9783 |
| 1 | 02 | title | 15.9783 | 29.8245 |
| 2 | 03 | circle | 29.8245 | 44.5937 |
| 3 | 04 | physics | 44.5937 | 59.3629 |
| 4 | 05 | chorus1 | 59.3629 | 74.1322 |
| 5 | 06 | geometry | 74.1322 | 88.4398 |
| 6 | 07 | quantum | 88.4398 | 103.6706 |
| 7 | 08 | fourier | 103.6706 | 118.4398 |
| 8 | 09 | fractal | 118.4398 | 133.2091 |
| 9 | 10 | memory | 133.2091 | 147.5168 |
| 10 | 11 | critical | 147.5168 | 162.2860 |
| 11 | 12 | blackhole | 162.2860 | 177.0552 |
| 12 | 13 | bigbang | 177.0552 | 191.3629 |
| 13 | 14 | heart | 191.3629 | 205.6706 |
| 14 | 15 | credits | 205.6706 | 211.9067 |

(Every boundary lands on the beat grid; `sections[i].beat/bar/beatInBar` give the beat indices.
Note these values come from the shipped `meta.json` and differ by up to ~0.2 s from the raw table in
`tools/analyze.py:277-293` — trust `meta.json`, i.e. `ctx.data.sections` / `ctx.sec`.)

### 8.4 `beat` object (one instance, mutated in place every frame)

| field | type | meaning |
|---|---|---|
| `index` | int (may be negative before `phase0`) | beat counter: `floor((t - phase0)/period)` |
| `phase` | number 0…1 | position inside the current beat |
| `sinceBeat` | number | seconds since the last grid beat |
| `bar` | int | `floor(index/4)` |
| `beatInBar` | int 0…3 | |
| `sinceBar` | number | seconds since the last downbeat |
| `isDownbeat` | bool | `beatInBar === 0` |
| `pulse` | number 0…1 | `exp(-sinceBeat/0.13)` — fast per-beat envelope |
| `barPulse` | number 0…1 | `exp(-sinceBar/0.22)` — per-bar envelope (used by the chrome dimming) |
| `kick` | number 0…1 | `exp(-sinceBeat/0.09) * (1 - min(sinceBeat/period, 1))` |
| `grid` | number | absolute time of the last beat |
| `t` | number | echo of `t` |

---

## 9. Transitions & ordering rules

### 9.1 Exact frame order (`App.frame`, `40_main.js:185-249`)

1. `time = t`; `ctx.t/dt`; `ctx.bands` (+`WEM_BANDS_GAIN`), `ctx.rms`, `ctx.flux`, `ctx.lyric`, `beat`.
2. If the timeline index changed → `setSection(si)`: `old.exit(ctx)` → `curIdx/cur` → CRT rules →
   `ctx.sec/index/name/dur/rnd` → `init` (once) → `enter(ctx)`; then one transition flash
   (`flash ≥ 0.85`, `glitch ≥ 0.55`, `disp ≥ 0.5`) — **skipped for `si === 1`** (segment 01→02 is
   already marked by the white flash at 15.000).
3. `ctx.sec = data.sections[curIdx]`, `ctx.local`, `ctx.dur`, `ctx.prog`, `ctx.in`, `ctx.out`.
4. `R.decay(dt)` — effects age **before** you draw.
5. `hud.clear()` — clears **both** the full layer *and* the panel atlas.
6. `ctx.chromeAmt = 1`; `cur.draw2d(ctx)`; `drawChrome(ctx)` (unless `?nochrome`).
7. `ctx.clearHudRects()`; `cam.update()`; `R.beginScene(cam)` (clears scene FBO);
   `cur.draw3d(ctx)` (unless `?no3d`).
8. `hud.upload(res)` — HUD strokes from **both** `draw2d` and `draw3d` are on the texture now.
9. Debug flag overrides; `R.t = t`; `R.composite(hud.tFull.tex, {hudRects})` → bloom → comp → CRT → screen.
10. `if (hud.panDirty) hud.uploadPan(res)` — panel atlas pushed **after** the composite.
11. `res.gl.flush()`.

### 9.2 Ordering pitfalls

1. **HUD from `draw3d` is legal and lands on top of the chrome** (upload happens in step 8, chrome was
   drawn in step 6). HUD from `draw2d` is *under* the chrome.
2. **Panel content is one frame late**: step 8 uploads the atlas before the composite, but panels drawn
   during `draw3d` (step 7) are only pushed in step 10. First frame also starts with an empty atlas.
   Warm up if you render panels to video.
3. **`hud.clear()` wipes the atlas every frame** (`clear()` with no argument clears both canvases), so
   panels must be redrawn every frame — nothing persists. `panel(i)` sets `panDirty`, and
   `App`'s constructor already calls `uploadPan` once so `hud.tPan` is never `null` (the reason is
   documented at `40_main.js:63-67`: a `null` texture used to abort frame 1 and freeze the meter).
4. **Everything the section draws is inside the frame**: drawing after `App.frame()` returns is not
   part of it. At that point the default framebuffer (screen) is still bound with the full viewport,
   depth test off / blend off, and `gl.flush()` has run — so such draws *would* appear immediately, but
   the next frame's composite overwrites them and capture tools screenshot at an unpredictable moment.
   Draw synchronously in `draw2d`/`draw3d` only.
5. **Blend state after `ctx.fs(...)`**: `fullscreen` disables `BLEND`; `gfx.*` set `blendFunc` but never
   `enable(BLEND)`. Re-enable it yourself, or keep custom FBO passes at the end of `draw3d`.
6. **`ctx.fs(..., target)` changes the FBO and viewport**; restore them manually
   (`bindFramebuffer(FRAMEBUFFER, ctx.R.scene.fb)` + `viewport(0,0,ctx.R.w,ctx.R.h)`).
7. **`ctx.hudRect` slots are cleared every frame** by `ctx.clearHudRects()` before `draw3d` — register
   inside `draw3d`. Only 6 slots (`i = 0…5`); out-of-range indices are silently dropped.
8. **CRT power state is owned by segment ids `"01"`, `"14"`, `"15"`** (`40_main.js:170-171`): any
   other id resets `crtOff = 0` and `crtOn = 1` on entry. Renumbering breaks the power-on/off look.
9. **`ctx.sec` changes identity between `enter()` and the draw calls** (section object vs metadata
   record). Read `ctx.sec.start/end/name/id/desc` in draws, and don't cache it across frames.
10. **`ctx.local`/`prog`/`in`/`out` are stale inside `enter()`** and, on the play-mode seek path,
    `ctx.t/dt` too. Do per-entry setup with `ctx.t` and `data.sections[i]`.
11. **Registration order = playback order.** One section per metadata record (15), defined after
    `40_main.js`; a missing entry throws in `setSection`.
12. **The camera persists between sections**; set it explicitly in `draw3d`.
13. **`enter()` is not "frame 0"**: it fires on the frame whose `t` crosses the boundary, possibly with
    a 0.25 s `dt`. Any one-shot state you start there should be driven by `ctx.local`, not by counting.
14. Capture determinism: `__render(t)` reuses live state. `tools/capture.mjs` runs 45 warm-up frames
    at `t - k/30` before each still so decaying effects (`R.decay`) settle.

---

## 10. Copy-paste snippets

### 10.1 Minimal 2D-only section (HUD; camera left in ortho for safety)

```js
WEM.defineSection({
  id: "03", name: "hello-2d",
  draw3d: function (ctx) { ctx.cam.reset2d(); ctx.cam.update(); },   // pixel-space camera, optional
  draw2d: function (ctx) {
    var hud = ctx.hud, C = ctx.col, W = ctx.W, H = ctx.H;
    hud.rect(60, 120, 460, 200, { fill: "rgba(6,8,11,0.72)", stroke: "rgba(228,235,242,0.35)" });
    hud.T(80, 158, "SEGMENT " + ctx.index + "  " + ctx.sec.name.toUpperCase(),
          { size: 20, color: C.accent, glow: true, blur: 14, spacing: 0.5 });
    hud.T(80, 186, "t " + ctx.t.toFixed(2) + "s   local " + ctx.local.toFixed(2) + "s",
          { size: 13, color: C.grey });
    hud.bar(80, 200, 420, 10, ctx.prog, { fill: C.gold, ticks: 10 });          // fades with the section
    hud.T(80, 232, "> " + (ctx.lyric ? ctx.lyric.text : ""), { size: 13, color: C.green, alpha: 0.8 });
    hud.formula(80, 280, "\\int_0^{\\infty} e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}",
                { size: 22, color: C.white });
    hud.code(80, 306, "for (var i = 0; i < 64; i++) spec[i] = ctx.bands[i];", "c",
             { size: 13, alpha: 0.9 });
    // beat-synced flash, no allocation
    if (ctx.beat.isDownbeat) ctx.fx.hit(ctx.beat.barPulse);
  }
});
```

### 10.2 Minimal 3D-only section

```js
WEM.defineSection({
  id: "04", name: "hello-3d",
  init: function (ctx) {                       // runs once, on first entry
    this.mesh = ctx.C.geo.ico(1);
    this.ln = new WEM.Viz.Lines(4096);
    this.pts = new WEM.Viz.Points(4000);
    this.axis = WEM.Viz.circlePts(128, 1.8, 0);
  },
  draw3d: function (ctx) {
    var M4 = ctx.C.M4, gfx = ctx.gfx, t = ctx.t, b = ctx.beat;
    ctx.cam.reset3d(5.0);
    ctx.cam.pos[0] = Math.sin(t * 0.25) * 2.0;
    ctx.cam.update();

    var model = M4.mul(M4.rotY(t * 0.9), M4.scale(1 + b.pulse * 0.12, 1 + b.pulse * 0.12, 1 + b.pulse * 0.12));
    gfx.solid(this.mesh, model, { color: [0.62, 0.86, 1.0], rim: 1.0, emissive: 0.04 });

    this.ln.clear().path(this.axis, [0.20, 0.85, 1.0], 1.8, 0.55, true);
    for (var i = 0; i < 24; i++) {                       // spokes coloured from the bass bands
      var a = i / 24 * Math.PI * 2, r = 1.8 + ctx.bands[i] * 0.9;
      this.ln.seg(0, 0, 0, Math.cos(a) * r, 0, Math.sin(a) * r,
                  [0.4 + ctx.bands[i], 0.6, 1.0 - ctx.bands[i]], 2.2, 0.35 + ctx.bands[i] * 0.6);
    }
    this.ln.draw(gfx, { add: true, glow: 0.6 });

    this.pts.clear();
    for (var p = 0; p < 220; p++) {
      var u = ctx.rnd(), v = ctx.rnd(), r2 = 1.2 + ctx.rms * 2.5;
      this.pts.add((u - 0.5) * r2 * 2, (v - 0.5) * r2, (ctx.rnd() - 0.5) * r2,
                   2.5 + ctx.flux * 6, [0.55, 0.9, 1.0], 0.30 + 0.5 * ctx.rms);
    }
    this.pts.draw(gfx, { add: true, soft: 0.75 });   // points are additive by default

    if (ctx.beat.isDownbeat) ctx.fx.hit(1);          // post effect, visible this same frame
  }
});
```

### 10.3 Section using both (HUD panel atlas mapped onto a 3D quad + HUD labels)

```js
WEM.defineSection({
  id: "05", name: "both",
  init: function (ctx) { this.q = new WEM.Viz.Quads(64); this.rect = null; },
  draw2d: function (ctx) {
    // 2D layer: title etc. (drawn UNDER the system chrome)
    ctx.hud.T(80, 120, "TEXTURE PANEL", { size: 24, color: ctx.col.accent, glow: true });

    // panel 0 of the atlas: a large formula, redrawn every frame (the atlas is cleared each frame)
    var fp = WEM.Viz.formulaPanel(ctx, 0, "\\psi(x,t) = A e^{i(kx-\\omega t)}",
                                  { size: 120, color: "#eef2f6" });
    this.rect = fp.rect;                              // [u0, v1, u1, v0] — pass to Quads.add unchanged
    // the panel is composited one frame late (see 9.2 #2): warm up before recording
  },
  draw3d: function (ctx) {
    var M4 = ctx.C.M4, gfx = ctx.gfx;
    ctx.cam.reset2d(); ctx.cam.update();              // ortho pixel space, y down, 1 unit = 1 px

    if (this.rect) {
      var cx = ctx.W * 0.5, cy = ctx.H * 0.42, size = 620;
      var model = M4.compose([cx, cy, 0], M4.ident(), [size, size, 1]);
      this.q.clear().add(model, this.rect, [1, 1, 1, 1]);
      this.q.draw(gfx, ctx.hud.tPan, { add: true, depthWrite: false });

      // cut the same area out of the HUD layer: UNITS ARE SCREEN UV, y-up (inferred from compFS)
      ctx.hudRect(0, cx / ctx.W, 1 - cy / ctx.H, size * 0.5 / ctx.W, size * 0.5 / ctx.H);
    }

    // HUD strokes made here are composited ON TOP of the chrome
    ctx.hud.T(cx, cy + 340, "SINGLE 512px ATLAS CELL → 3D QUAD",
              { size: 15, color: ctx.col.dim, align: "center" });
    if (ctx.beat.pulse > 0.5) {
      ctx.hud.line(cx - 320, cy - 320, cx + 320, cy - 320, { color: ctx.col.gold, lw: 2 });
    }
    ctx.fx.mood([0.10, 0.20, 0.50], [0.06, 0.0, 0.12], 0.35 * ctx.in * ctx.out);
  }
});
```

---

## 11. Ambiguities / caveats (explicitly not resolved by the source)

1. `index.html` and `src/sections/*.js` are **not** in this checkout; the section contract above is
   read directly out of `40_main.js`, so real-world usage patterns could not be cross-checked.
2. `ctx.hudRect` units are inferred from `compFS` (normalised screen UV, y-up). No in-repo caller exists.
3. `src/62_lyric.js` dereferences `WEM.Tui` at load (`T.CJK`, `T.FONT`) — with no Tui module present it
   throws immediately. `26_lab.js`, `27_model.js`, `62_lyric.js` are not part of either loader's list.
4. `fx.stripes` (and `?nostripes`) has no effect: `uStripes` is declared but never read in `compFS`;
   `fx.ghost`/`uGhost` likewise. The stripe background is always drawn.
5. `Hud`'s header comment ("4x4 256x256 panels") contradicts the App's `new Hud(W, H, 4, 4, 512, 512)`.
6. The bloom bright-pass threshold (`0.62`) and the CRT constants are hardcoded in `10_render.js`.
7. `Hud.T` returns `0`; `Hud.bar`, `Hud.win`, `Hud.hexDump`, `Hud.rect`, `Hud.line`, `Hud.code` return
   `undefined` (except `code`, which returns the advance width). Use `formula().w`, `codeWidth`,
   `measureFormula` or `hud.fc.measureText` for measurement.
8. `Hud.T`'s `spacing` must be a number; the AudioBar passes `"1px"`, producing `"1pxpx"` (ignored by
   the browser) — a latent bug, reproduced here rather than fixed.
9. `ctx.dur` never honours `def_end` during draws (only inside `init`/`enter`).
10. Nothing in the engine supports DPR, resizing the window, focus, or mouse/touch input; there is no
    `resize` path other than `WEM.boot`'s `opts.width/height`.
