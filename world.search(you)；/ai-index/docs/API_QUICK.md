# ENGINE QUICK REFERENCE (verified against the source)

> **This project runs the PAPER theme.** `index.html` sets `window.WEM_THEME = "light"`
> before the engine loads, and the composite inverts lightness centrally, so the film is
> **printed instead of lit**. You author in the **dark convention** (white-ish text, dark
> panels, saturated accents) and the sheet comes out as ink on paper. Do not try to make
> it light yourself — no white backgrounds, no pale panels.
>
> There are **22 sections**, ids `"01"`…`"22"`.

Everything is a classic script on `window.WEM`. No modules, no bundler, no npm.
Load order is fixed by `index.html`:

```
00_core  10_render  20_hud  25_viz  26_lab  27_model  30_data  40_main  50_audiobar  62_lyric  28_chronicle  sections/*
```

Screen space is **1920 × 1080 px**, origin **top-left**, **y grows downward**, text baseline is
alphabetic unless you pass `baseline`. The HUD is a 2D canvas composited over the 3D pass.

---

## 1. `ctx` — the object every section callback receives

| field | type | meaning |
|---|---|---|
| `ctx.W`, `ctx.H` | number | 1920, 1080 |
| `ctx.t` | number | absolute song time, seconds |
| `ctx.dt` | number | frame delta (~1/60), already clamped |
| `ctx.local` | number | seconds since this section started |
| `ctx.dur` | number | length of this section, seconds |
| `ctx.prog` | number | `local/dur`, 0→1 |
| `ctx.in` | number | smoothstep fade-in, 0→1 over the first 0.45 s |
| `ctx.out` | number | fade-out, 1→0 over the last 0.4 s |
| `ctx.index` | number | section index 0..14 |
| `ctx.sec` | object | `{id, name, start, end}` of the current section |
| `ctx.hud` | Hud | the 2D canvas layer |
| `ctx.gfx` | object | the 3D draw API |
| `ctx.cam` | Camera | `pos[3] target[3] up[3] fov near far roll mode pxX pxY zoom` + `reset2d()` `reset3d(d)` |
| `ctx.data` | Data | analysis accessors |
| `ctx.beat` | object | beat clock (see §4) |
| `ctx.bands` | Float32Array(64) | current 64-band spectrum, 0..1 (already gained) |
| `ctx.rms` | number | loudness 0..1 |
| `ctx.flux` | number | spectral flux 0..1 (onset strength) |
| `ctx.lyric` | object\|null | `{t, text, c:[{tx}]}`, the most recent LRC line |
| `ctx.rnd` | function | deterministic RNG, seeded per section — **use this, never `Math.random`** |
| `ctx.gl`, `ctx.res` | WebGL2 | raw context / resource cache |
| `ctx.C` | object | `WEM.core` |
| `ctx.S` | object | GLSL shader sources |
| `ctx.col` | object | `WEM.HUD.COL` |
| `ctx.fonts` | object | `WEM.HUD.FONTS` |
| `ctx.fx` | object | post-processing (see §5) |
| `ctx.chromeAmt` | number | 1 by default; **set it in `draw2d` to fade the whole frame chrome** |
| `ctx.util.vp(x,y,z)` | function | project a world point → `[px, py, w]` |
| `ctx.hudRect(i,cx,cy,hw,hh)` | function | tell the compositor where a HUD panel is (used for 3D occlusion); `ctx.clearHudRects()` is called each frame before `draw3d` |

### ⚠️ Camera ordering
`App.frame()` runs: `draw2d()` → `drawChrome()` → `cam.update()` → `beginScene(cam)` → `draw3d()`.
So **set `ctx.cam.pos/target/fov/roll inside `draw2d`, not `draw3d`** — otherwise your camera
change only lands on the *next* frame and a single still render looks wrong.

---

## 2. `ctx.hud` — the 2D layer

| call | notes |
|---|---|
| `hud.T(x, y, str, o)` | text. `o = {size, font:"mono"\|"ui"\|"math", weight, color, alpha, align:"left"\|"center"\|"right", baseline, glow:true\|cssColor, blur, spacing}`. `spacing` = `letterSpacing` px |
| `hud.rect(x, y, w, h, o)` | `o = {fill, stroke, lw, alpha}` |
| `hud.line(x0, y0, x1, y1, o)` | `o = {color, lw, alpha, dash:[...]}` |
| `hud.win(x, y, w, h, title, o)` | flat UI window: fill + border + filled title bar. `o = {bg, color, lw, alpha, titleBg, titleColor, barH, titleSize, fill}` |
| `hud.bar(x, y, w, h, p, o)` | framed progress bar, `o = {color, fill, alpha, ticks}` |
| `hud.formula(x, y, tex, o)` | tiny LaTeX subset → canvas. `o = {size, color, align}`. Supports `^ _ \frac \sqrt \sum \int` and greek |
| `hud.measureFormula(tex, size)` | width in px |
| `hud.code(x, y, line, lang, o)` | syntax-highlighted single line. `lang` ∈ `js c py sh json`. `o = {size, alpha, color}` (color overrides all tokens) |
| `hud.codeWidth(line, lang, size)` | width in px |
| `hud.hexDump(x, y, bytes, rows, o)` | hex + ASCII dump |
| `hud.panel(i)` | returns a 256×256 offscreen panel `{ctx, x, y, w, h, u0,v0,u1,v1, rect, clear(bg)}` — draw into `p.ctx`, then map it onto a quad with `p.rect` |
| `hud.clear()` | called by the engine each frame — do not call |

`hud.T/rect/line/...` all accept `o.ctx = someCtx` to draw into a panel or a raw 2D context.

**Colours** — `ctx.col` / `WEM.HUD.COL`:
`white #eef2f6`, `grey #c3cad2`, `dim #9aa3ad`, `faint #5b636c`, `black #05070a`,
`purple #b48cff`, `green #7ee787`, `amber #ffc46b`, `cyan #6ce8ff`, `gold #ffc94a`,
`accent #35e0ff`, `red #ff5a52`, `blue #7fb2ff`, `pink #ff8fd0`.

**Fonts** — `ctx.fonts`: `mono` (Cascadia/Consolas), `ui` (Segoe UI), `math` (Cambria Math).

---

## 3. `ctx.gfx` — the 3D layer

You are already inside a bound framebuffer with the camera's view-projection uploaded; just call these.

| call | data layout |
|---|---|
| `gfx.solid(mesh, modelMat4, o)` | lit triangle mesh. `o = {color:[r,g,b], alpha, unlit:bool, rim:0..1, emissive:0..1, smooth:bool, light:[x,y,z], depthWrite:bool, blend:"add"}` |
| `gfx.wire(mesh, modelMat4, o)` | edge wireframe, transformed on the CPU. `o = {color:[r,g,b], alpha, width}` |
| `gfx.points(data, o)` | `data` = float32 stride **8**: `x,y,z,size, r,g,b,a`. `o = {scale, soft, add:true by default, depthWrite}` |
| `gfx.lines(data, o)` | `data` = float32 stride **12**: `ax,ay,az,w, bx,by,bz,w, r,g,b,a`. `o = {scale, fade, dash, glow, add, depthWrite}` |
| `gfx.quads(data, tex, o)` | `data` = float32 stride **24** = `mat4(16) + rgba(4) + uvRect(u0,v0,u1,v1)(4)`. Build with `C.packQuad(arr, off, mat4, [u0,v0,u1,v1], [r,g,b,a])`. `tex` may be `null` (untextured). `o = {add, noDepth, depthWrite, unit}` |
| `gfx.fullscreen(prog, uniforms, target)` | full-screen shader pass |
| `gfx.fso(key, vs, fs)` | compile/cache a program |

`ctx.res.tex(name, {canvas|data|w,h,filter,wrap})` creates a texture — panels from `hud.panel(i)`
come back with a UV `rect` ready to drop into `packQuad`.

**Meshes** — `C.geo.box(sx,sy,sz)`, `.grid(nx,nz,size,y)`, `.plane(w,h,seg)`, `.ico(subdiv)`,
`.torus(R,r,nu,nv)`, `.trefoil(tube,nu,nv)`, `.tetra()`, `.cylinder(r0,r1,h,n,caps)`,
`.make(pos,nrm,idx)`.

**Matrices** — `C.M4`: `ident mul persp ortho lookAt trans scale rotX rotY rotZ rotAxis compose
xform billboard inv transpose normalMat3`. **`C.M4.mul(a,b,out)` returns `a*b`.**
**Vectors** — `C.V3`: `add sub mul scale dot cross len norm lerp dist`.
**Math** — `C.clamp lerp mix smoothstep rng h2 h3 noise2 fbm2`, `C.Ease.{linear,inQuad,outQuad,
inOutQuad,inCubic,outCubic,inOutCubic,outQuart,outExpo,inExpo,outBack,outElastic,outBounce}`,
`C.PI`, `C.TAU`.

> A point sprite's `size` field is in world units and is scaled by about `×8`; a line's `w` field is in
> pixels. Depth test is ON by default for `solid`/`lines`/`points`/`quads`.

---

## 4. `ctx.beat`

`{ index, phase(0..1), sinceBeat, bar, beatInBar(0..3), sinceBar, isDownbeat, pulse(exp decay, 1 on the beat),
barPulse, kick, grid(absolute time of this beat), t }`. **All rhythmic motion must come from here**,
or from `ctx.bands` / `ctx.rms` / `ctx.flux` — never from a hand-rolled `sin(t*k)`.

`ctx.data` also has: `duration 295.3467`, `bpm 139.5349`, `period 0.43`, `phase0 0.2`,
`bands 64`, `fps 60`, `beats[687]`, `sections[22]`, `lrc[86]`, `notes[]`,
plus `band(t,i) bandsAt(t,out) rms(t) flux(t) waveAt(t)->[min,max] beat(t,o) sectionIndex(t)
section(t) lyricAt(t) nextLyric(t,n) notesBetween(a,b)`.

---

## 5. `ctx.fx` — post-processing (assign these)

`flash glitch disp whiteBar hudGlitch bloom fade crtOn crtOff invert scan curve grain vignette
hud stripes shakeY jump aberr exposure` (+ `grille`).

- `ctx.fx.hit(k)` — one call adds flash + glitch + whiteBar + shake. `k` ~0.3..1. **Use sparingly**
  (the storyboard caps it per section).
- `ctx.fx.mood(c1, c2, amt)` — recolour the whole image. `c1`/`c2` are `[r,g,b]` 0..1.
- The engine already fires one flash/glitch/disp on every section cut — **do not add another
  full-screen flash at a section start**.

---

## 6. Reusable libraries

**`WEM.Viz`** — `Lines(max)` `{seg(ax,ay,az,bx,by,bz,col,w,alpha), path(pts,col,w,alpha,closed), glow(o), draw(gfx,o), clear()}`;
`Points(max)` `{add(x,y,z,size,col,alpha), draw(gfx,o), clear()}`;
`Quads(max)` `{add(mat4,rect,rgba), draw(gfx,tex,o), clear()}`;
`sample(fn,a,b,n)`, `helix(n,R,rise,turns,phase)`, `circlePts(n,R,y,phase)`,
`heartCurve(n,s)`, `heartImplicit(x,y)`, `lorenz(n,dt,p0,sigma,rho,beta)`,
`pendulumState(...)`, `rot4(p,a,b,c,d)`, `tesseractVerts()`, `tesseractEdges()`,
`sierpinskiTetra(depth)`, `recursiveTree(depth,len,spread,rnd)`,
`plot(fn,a,b,n,sx,sy)`, `formulaPanel(ctx,i,texObj,o)`, `extrude(quads,rect4,model,o)`.
(`col` is `[r,g,b]` 0..1.)

**`WEM.Lab`** — `solidMesh(key)`, `PLATONIC`, `besselJ(n,x)`, `besselZero(n,k)`, `chladni(m,n,x,y)`,
`popcount`, `bits8`, `phyllotaxis(n,c)`, `inspiral`, `chirp`, `breakdown(seed,steps,spread)`,
`attention(tokens,dim,head)`, `voronoiSites`, `dijkstraField`, `taubin`, `lycopeneAbs(nm)`,
`EGGPLANT`, `LYCOPENE`, `HEARTS`, `PHI`, `GOLDEN`.

**`WEM.Model`** — `build(ctx)` trains a real tiny model on the lyrics and returns
`{E, V, dim, pca, attack, whale, sample, topk}`. Also `quantise(w,bits)`, `gcgAttack(seed,steps)`,
`whale(n)`, `sample`, `topk`, `CHAT`, `ROLES`, `SFT`, `PERSONAS`.
`build()` takes ~0.3 s — call it lazily from `init`, not every frame.

**`WEM.Lyric`** — `draw(ctx, hud, t)`, `draw3d(ctx)`.

**`WEM.AudioBar`** — `draw(ctx, hud)` is already called by the chrome. Do not draw there.

---

## 7. `WEM.Idx` — the shared stage (see `src/28_index.js`)

| call | meaning |
|---|---|
| `Idx.era(idOrIdx)` / `Idx.eraAt(t)` | era record `{id,name,y0,y1,label,main,alt,note}` |
| `Idx.css(t)` / `Idx.css2(t)` | current era main / secondary colour as a CSS string |
| `Idx.rgb(hex)` / `Idx.rgbA(hex,a)` | `[r,g,b]` / `[r,g,b,a]` for `gfx` |
| `Idx.hexA(hex, a)` | `"rgba(...)"` for the HUD |
| `Idx.litCount(t)` | how many index tabs are lit right now (0..26) |
| `Idx.current(t)` | the most recently lit milestone `{t,y,n,f,lane}` |
| `Idx.queryBar(ctx, o)` | the shared query field. `o = {text, hits, note, prog, caret, x, y, w, h, color, alpha, size}` — omit it and the chrome draws the default one using the current lyric |
| `Idx.card(ctx,x,y,w,h,o)` | an index card (ruled head, optional `o.tab`, `o.title`, `o.right`); returns the content box |
| `Idx.tab(ctx,x,y,w,h,label,o)` | a catalogue tab; `o.on` toggles lit/unlit |
| `Idx.resultRow(ctx,x,y,w,title,score,o)` | one search result: title, relevance bar, score |
| `Idx.tag / big / rule / gauge` | field label / display type / hairline / instrument strip (same signatures as before) |

The chrome draws, in order: the meter, the top bar, the query bar, then the index rail.
The query bar occupies `y ∈ [60, 102]`; the rail lives at `y = H-140 … H-99`; the meter at
`y = H-70 … H-6`. **Never draw inside `y > H-150`.** Your composition area is `y ∈ [120, H-150]`.

To drive the query bar from a section: set `ctx.hits` (number or string) in `draw2d`, and
optionally `ctx.__qDrawn = ctx.t` after calling `Idx.queryBar(...)` yourself to stop the
chrome drawing its default. The chrome replaces `drawChrome` entirely.

---

## 8. Determinism / re-entrancy rules

- **No `Math.random()`, no `Date.now()`, no `new Date()`.** Use `ctx.rnd` (seeded per section) or
  `C.h2/h3/noise2/fbm2`.
- `init(ctx)` runs once, on first entry. `enter(ctx)` runs on every entry, **including a seek**.
  Put all mutable state on a closure object and reset it in `enter`; or derive everything from
  `ctx.local` (preferred).
- Never cache data keyed on a frame counter — the renderer may start at any `t`.
- Syntax-check your file with `node --check <file>` before you finish.
