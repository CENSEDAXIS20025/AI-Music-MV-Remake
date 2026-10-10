/* ============================================================================
   world.search(you);  --  main: camera, section manager, transitions, loop
   ?play    real-time playback with the mp3
   ?render  offline: window.__render(t) draws one deterministic frame
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core, M4 = C.M4, V3 = C.V3;
  var clamp = C.clamp, lerp = C.lerp, smoothstep = C.smoothstep;

  WEM.sections = [];

  /* --------------------------------------------------------------- camera */
  function Camera(W, H) {
    this.W = W; this.H = H;
    this.mode = "persp";
    this.pos = [0, 0, 6]; this.target = [0, 0, 0]; this.up = [0, 1, 0];
    this.fov = 0.9; this.near = 0.05; this.far = 400;
    this.roll = 0;
    this.pxX = W / 2; this.pxY = H / 2; this.zoom = 1;
    this.vp = new Float32Array(16);
    this._m = new Float32Array(16);
    this._r = new Float32Array(16);
    this.pxScale = 900;
  }
  Camera.prototype.reset2d = function () {
    this.mode = "ortho"; this.pxX = this.W / 2; this.pxY = this.H / 2; this.zoom = 1;
  };
  Camera.prototype.reset3d = function (d) {
    this.mode = "persp"; this.fov = 0.9; this.near = 0.05; this.far = 400;
    this.pos = [0, 0, d || 6]; this.target = [0, 0, 0]; this.up = [0, 1, 0]; this.roll = 0;
  };
  Camera.prototype.update = function () {
    var W = this.W, H = this.H;
    if (this.mode === "ortho") {
      var hw = W / 2 / this.zoom, hh = H / 2 / this.zoom;
      var m = M4.ortho(this.pxX - hw, this.pxX + hw, this.pxY + hh, this.pxY - hh, -8000, 8000);
      if (this.roll) { var rz = M4.rotZ(-this.roll); M4.mul(m, rz, m); }
      this.vp.set(m);
      this.pxScale = this.zoom;
    } else {
      var proj = M4.persp(this.fov, W / H, this.near, this.far);
      var view = M4.lookAt(this.pos, this.target, this.up);
      if (this.roll) { var r2 = M4.rotZ(this.roll); var t = M4.mul(view, r2); view = t; }
      M4.mul(proj, view, this.vp);
      this.pxScale = H * 0.5 / Math.tan(this.fov * 0.5);
    }
    return this.vp;
  };

  /* ------------------------------------------------------------ section api */
  WEM.defineSection = function (s) { WEM.sections.push(s); return s; };

  /* ------------------------------------------------------------------ app */
  function App(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.W = opts.width || 1920;
    this.H = opts.height || 1080;
    this.renderer = new WEM.Renderer(canvas);
    this.renderer.resize(this.W, this.H);
    this.hud = new WEM.Hud(this.W, this.H, 4, 4, 512, 512);
    // create the panorama texture up front: 3D passes sample it before the first
    // upload, and a null texture used to throw on frame 1, which aborted the
    // frame before hud.upload could ever run -- so the whole animation (and the
    // audio meter with it) stayed frozen.
    this.hud.uploadPan(this.renderer.res);
    this.cam = new Camera(this.W, this.H);
    this.gfx = this.renderer.gfx();
    this.data = WEM.Data;
    this.beat = {};
    this.mode = opts.mode || "render";
    this.sectionIdx = -1;
    this.cur = null;
    this.curIdx = -1;
    this.enterT = 0;
    this.bandsA = new Float32Array(64);
    this.hudRects = new Float32Array(24);
    this.time = 0;
    this.firstFrame = true;
    var q = new URLSearchParams(location.search);
    this.dbg = {
      no2d: q.has("no2d"), no3d: q.has("no3d"), nochrome: q.has("nochrome"),
      nohud: q.has("nohud"), nobloom: q.has("nobloom"), nostripes: q.has("nostripes"),
      noscan: q.has("noscan"), nocurve: q.has("nocurve"), nodisp: q.has("nodisp"),
      noaberr: q.has("noaberr"), nograin: q.has("nograin"), novig: q.has("novig")
    };
    this._bindCtx();
  }

  App.prototype._fx = function () {
    var f = this.renderer.fx;
    var self = this;
    return {
      get flash() { return f.flash; }, set flash(v) { f.flash = v; },
      get glitch() { return f.glitch; }, set glitch(v) { f.glitch = v; },
      get disp() { return f.disp; }, set disp(v) { f.disp = v; },
      get whiteBar() { return f.whiteBar; }, set whiteBar(v) { f.whiteBar = v; },
      get hudGlitch() { return f.hudGlitch; }, set hudGlitch(v) { f.hudGlitch = v; },
      get bloom() { return f.bloom; }, set bloom(v) { f.bloom = v; },
      get fade() { return f.fade; }, set fade(v) { f.fade = v; },
      get crtOn() { return f.crtOn; }, set crtOn(v) { f.crtOn = v; },
      get crtOff() { return f.crtOff; }, set crtOff(v) { f.crtOff = v; },
      get invert() { return f.invert; }, set invert(v) { f.invert = v; },
      get scan() { return f.scan; }, set scan(v) { f.scan = v; },
      get curve() { return f.curve; }, set curve(v) { f.curve = v; },
      get grain() { return f.grain; }, set grain(v) { f.grain = v; },
      get vignette() { return f.vignette; }, set vignette(v) { f.vignette = v; },
      get hud() { return f.hud; }, set hud(v) { f.hud = v; },
      get stripes() { return f.stripes; }, set stripes(v) { f.stripes = v; },
      get shakeY() { return f.shakeY; }, set shakeY(v) { f.shakeY = v; },
      get jump() { return f.jump; }, set jump(v) { f.jump = v; },
      get aberr() { return f.aberr; }, set aberr(v) { f.aberr = v; },
      get exposure() { return f.exposure; }, set exposure(v) { f.exposure = v; },
      mood: function (c1, c2, amt) {
        if (c1) f.moodColor = c1;
        if (c2) f.moodColor2 = c2;
        if (amt !== undefined) f.mood = amt;
      },
      hit: function (k) {
        k = k === undefined ? 1 : k;
        f.flash = Math.min(1.4, f.flash + 0.38 * k);
        f.glitch = Math.min(1.2, f.glitch + 0.30 * k);
        f.whiteBar = Math.min(0.7, f.whiteBar + 0.10 * k);
        f.shakeY = (Math.sin(self.time * 91.7) * 0.006 + 0.004) * k;
      }
    };
  };

  App.prototype._bindCtx = function () {
    var self = this;
    var R = this.renderer;
    var ctx = this.ctx = {
      W: this.W, H: this.H, R: R, res: R.res, gfx: this.gfx, hud: this.hud,
      cam: this.cam, data: this.data, t: 0, dt: 1 / 60, local: 0, dur: 1, prog: 0,
      index: 0, sec: null, in: 0, out: 0, beat: this.beat, bands: this.bandsA,
      S: WEM.Shaders, C: C, gl: R.gl, app: this,
      rnd: C.rng(1),
      col: WEM.HUD.COL, fonts: WEM.HUD.FONTS,
      fx: this._fx()
    };
    ctx.util = {
      // handy 2d helpers for sections
      vp: function (x, y, z) {
        // project world point to screen pixels
        var p = M4.xform(self.cam.vp, [x, y, z, 1]);
        if (p[3] === 0) p[3] = 1e-5;
        return [(p[0] / p[3] * 0.5 + 0.5) * self.W, (0.5 - p[1] / p[3] * 0.5) * self.H, p[3]];
      }
    };
    ctx.fs = function (key, frag, uniforms, target) {
      var prog = R.prog(key, WEM.Shaders.fsVS, frag);
      self.gfx.fullscreen(prog, uniforms, target);
    };
    ctx.hudRect = function (i, cx, cy, hw, hh) {
      self.hudRects[i * 4] = cx; self.hudRects[i * 4 + 1] = cy;
      self.hudRects[i * 4 + 2] = hw; self.hudRects[i * 4 + 3] = hh;
    };
    ctx.clearHudRects = function () { self.hudRects.fill(0); };
  };

  App.prototype.setSection = function (i, hard) {
    if (this.cur && this.cur.exit) this.cur.exit(this.ctx);
    this.curIdx = i;
    this.cur = WEM.sections[i];
    var ctx = this.ctx;
    // CRT power state is owned by the boot and shutdown segments only, so it is
    // reset whenever any other segment begins -- keeps frames order-independent
    var rf = this.renderer.fx;
    if (this.cur.id !== "22") rf.crtOff = 0;
    if (this.cur.id !== "01") rf.crtOn = 1;
    ctx.sec = this.cur;
    ctx.index = i;
    // section titles come from the storyboard that is actually loaded, not from
    // the shared analysis metadata (each version renames the same slots)
    if (this.cur.name && this.data.sections[i]) this.data.sections[i].name = this.cur.name;
    ctx.dur = (this.data.ready ? (this.cur.def_end || this.data.sections[i].end) : 1) - (this.data.ready ? this.data.sections[i].start : 0);
    ctx.rnd = C.rng(1000 + i * 7919);
    if (!this.cur._inited) { this.cur._inited = true; if (this.cur.init) this.cur.init(ctx); }
    this.cam.W = this.W; this.cam.H = this.H;
    if (this.cur.enter) this.cur.enter(ctx);
    this.enterT = ctx.t;
  };

  App.prototype.frame = function (t, dt) {
    var ctx = this.ctx, R = this.renderer, data = this.data;
    this.time = t;
    ctx.t = t; ctx.dt = dt;
    ctx.bands = data.bandsAt(t, this.bandsA);
    if (typeof window !== "undefined" && window.WEM_BANDS_GAIN !== undefined) {
      var bg = window.WEM_BANDS_GAIN;
      for (var bi = 0; bi < ctx.bands.length; bi++) ctx.bands[bi] *= bg;
    }
    var b = data.beat(t, this.beat);
    ctx.rms = data.rms(t); ctx.flux = data.flux(t);
    ctx.lyric = data.lyricAt(t);
    if (data.ready) {
      var si = data.sectionIndex(t);
      if (si !== this.curIdx) {
        // exactly ONE white flash per section change. The very first entry is
        // NOT a transition -- flashing there too gave two flashes in the first
        // second (the boot segment fires its own power-on flash at t~0.5).
        var first = this.curIdx < 0;
        this.setSection(si);
        if (!first) {
          R.fx.flash = Math.max(R.fx.flash, 0.85);
          R.fx.glitch = Math.max(R.fx.glitch, 0.55);
          R.fx.disp = Math.max(R.fx.disp, 0.5);
        }
      }
      var s = data.sections[this.curIdx];
      this.idxNow = this.curIdx;
      ctx.sec = s;
      ctx.local = t - s.start;
      ctx.dur = s.end - s.start;
      ctx.prog = clamp(ctx.local / ctx.dur, 0, 1);
      ctx.in = smoothstep(0, 0.45, ctx.local);
      ctx.out = 1 - smoothstep(ctx.dur - 0.4, ctx.dur, ctx.local);
      ctx.beat = b;
    }
    R.decay(dt);
    this.hud.clear();
    // ---- 2D hud layer ----
    ctx.chromeAmt = 1;
    if (this.dbg.no2d) { /* debug: skip section 2D */ }
    else if (this.cur && this.cur.draw2d) this.cur.draw2d(ctx);
    if (!this.dbg.nochrome) this.drawChrome(ctx);
    // ---- 3D pass ----
    ctx.clearHudRects();
    this.cam.update();
    R.beginScene(this.cam);
    if (!this.dbg.no3d && this.cur && this.cur.draw3d) this.cur.draw3d(ctx);
    // the HUD canvas is uploaded only after the 3D pass: segments are allowed to
    // label their own geometry from draw3d, and those strokes were being dropped
    this.hud.upload(R.res);
    // ---- composite / crt ----
    var f = R.fx;
    if (this.dbg.nohud) f.hud = 0;
    if (this.dbg.nobloom) f.bloom = 0;
    if (this.dbg.nostripes) f.stripes = 0;
    if (this.dbg.noscan) { f.scan = 0; f.grille = 0; }
    if (this.dbg.nocurve) f.curve = 0;
    if (this.dbg.nodisp) f.disp = 0;
    if (this.dbg.noaberr) f.aberr = 0;
    if (this.dbg.nograin) f.grain = 0;
    if (this.dbg.novig) f.vignette = 0;
    R.t = t;
    R.composite(this.hud.tFull.tex, { hudRects: this.hudRects });
    // panel content is authored during the 3D pass, so it is pushed to the GPU at
    // the end of the frame and sampled by the quads one frame later
    if (this.hud.panDirty) this.hud.uploadPan(R.res);
    R.res.gl.flush();
  };

  App.prototype.run = function () {
    var self = this;
    function loop() {
      if (self.mode === "play") {
        var audio = self.audio;
        var t = audio ? audio.currentTime : (performance.now() / 1000 - self._t0);
        var raw = t - (self._last === undefined ? t - 1 / 60 : self._last);
        self._last = t;
        // a seek (or a stall) must not feed a bad dt into the decay maths
        if (!isFinite(raw) || raw <= 0 || raw > 0.25) {
          raw = 1 / 60;
          if (WEM.Data && WEM.Data.ready) {
            var si = WEM.Data.sectionIndex(t);
            if (si !== self.curIdx) self.setSection(si, true);
          }
        }
        var dt = Math.min(0.05, raw);
        if (t > 0.02) self.frame(t, dt || 1 / 60);
      }
      self.raf = requestAnimationFrame(loop);
    }
    if (this.mode === "play") {
      var src = (WEM.EMBED && WEM.EMBED["world-search-you.mp3"]) ? ("data:audio/mpeg;base64," + WEM.EMBED["world-search-you.mp3"]) : ((WEM.audioBase || "assets/audio/") + "world-search-you.mp3");
      var a = new Audio();
      a.src = src; a.preload = "auto"; a.volume = 0.85;
      this.audio = a;
      var btn = document.getElementById("start");
      var go = function () { a.play(); if (btn) btn.style.display = "none"; };
      if (btn) btn.addEventListener("click", go);
      else go();
    }
    this._t0 = performance.now() / 1000;
    loop();
  };

  App.prototype.renderAt = function (t) {
    var dt = this._lastT === undefined ? 1 / 60 : clamp(t - this._lastT, 1 / 480, 0.25);
    this._lastT = t;
    this.frame(t, dt);
  };

  /* --------------------------------------------------------------- chrome */
  // persistent "operating system" frame: identity, segment, timecode, progress
  App.prototype.drawChrome = function (ctx) {
    var a = ctx.chromeAmt === undefined ? 1 : ctx.chromeAmt;
    if (a <= 0.002) return;
    var hud = this.hud, C = WEM.HUD.COL, W = this.W, H = this.H;
    var b = ctx.beat, s = ctx.sec || { id: "--", name: "" };
    var dim = 0.55 + 0.45 * b.barPulse;
    hud.rect(0, 0, W, 34, { fill: "rgba(4,6,9," + (0.30 * a) + ")" });
    hud.line(0, 34.5, W, 34.5, { color: "rgba(238,242,246," + (0.18 * a) + ")", lw: 1 });
    hud.T(22, 23, "world.search(you);", { size: 15, color: C.white, alpha: 0.80 * a, spacing: 0.5 });
    hud.T(216, 23, "// SEGMENT " + s.id + " " + String(s.name).toUpperCase(), { size: 15, color: C.accent, alpha: 0.95 * a, glow: true, blur: 10 });
    // right: timecode and clock
    var mm = Math.floor(ctx.t / 60), ss = ctx.t - mm * 60;
    var tm = (mm < 10 ? "0" : "") + mm + ":" + (ss < 10 ? "0" : "") + ss.toFixed(2);
    var M2 = Math.floor(this.data.duration / 60), S2 = this.data.duration - M2 * 60;
    hud.T(W - 22, 23, tm + " / " + ((M2 < 10 ? "0" : "") + M2) + ":" + (S2 < 10 ? "0" : "") + S2.toFixed(2),
      { size: 15, color: C.grey, alpha: 0.85 * a, align: "right" });
    hud.T(W - 232, 23, "BPM " + this.data.bpm.toFixed(1) + "  BEAT " + (b.index < 0 ? 0 : b.index) + "  BAR " + (b.bar < 0 ? 0 : b.bar),
      { size: 13, color: C.dim, alpha: 0.75 * a, align: "right" });
    // bottom: the audio meter (LED spectrum + cassette deck); the progress ticks
    // and playhead ride on its top edge
    var y = H - 44;
    if (WEM.AudioBar) {
      WEM.AudioBar.draw(ctx, hud);
    } else {
      hud.line(22, y, W - 22, y, { color: "rgba(238,242,246," + (0.20 * a) + ")" });
      var S = this.data.sections;
      for (var i = 0; i < S.length; i++) {
        var x = 22 + (W - 44) * (S[i].start / this.data.duration);
        var on = i === this.idxNow;
        hud.line(x, y - (on ? 7 : 4), x, y, { color: on ? "rgba(53,224,255," + (0.95 * a) + ")" : "rgba(238,242,246," + (0.35 * a) + ")", lw: on ? 2 : 1 });
      }
      var px = 22 + (W - 44) * Math.min(ctx.t / this.data.duration, 1);
      hud.line(px, y - 10, px, y + 3, { color: "rgba(255,201,74," + (0.95 * a) + ")", lw: 2 });
      hud.T(W - 22, y - 12, Math.round(ctx.t / this.data.duration * 100) + "%", { size: 12, color: C.dim, alpha: 0.8 * a, align: "right" });
      hud.T(22, y - 12, "SEARCH PROGRESS", { size: 11, color: C.faint, alpha: 0.9 * a, spacing: 1.2 });
    }
    // corner brackets (the lower pair flanks the meter)
    var L = 26, m = 14, cc = "rgba(238,242,246," + (0.35 * a) + ")";
    hud.line(m, m, m + L, m, { color: cc }); hud.line(m, m, m, m + L, { color: cc });
    hud.line(W - m - L, m, W - m, m, { color: cc }); hud.line(W - m, m, W - m, m + L, { color: cc });
    hud.line(m, H - 62, m + L, H - 62, { color: cc }); hud.line(m, H - 62, m, H - 62 - L, { color: cc });
    hud.line(W - m - L, H - 62, W - m, H - 62, { color: cc }); hud.line(W - m, H - 62, W - m, H - 62 - L, { color: cc });
    // rolling log line, bottom-left, driven by the lyric (kept clear of the meter)
    if (ctx.lyric) {
      hud.T(34, 1000, "> " + String(ctx.lyric.text).slice(0, 74), { size: 14, color: "rgba(126,231,135,0.85)", alpha: a * dim });
    }
  };

  WEM.App = App;
  WEM.Camera = Camera;

  /* --------------------------------------------------------------- bootstrap */
  WEM.boot = function (opts) {
    var canvas = document.getElementById("gl");
    var W = opts.width || 1920, H = opts.height || 1080;
    canvas.width = W; canvas.height = H;
    var app = new WEM.App(canvas, { width: W, height: H, mode: opts.mode });
    WEM.app = app;
    return WEM.Data.load().then(function () {
      // everything is driven by the analysis; sections get their init() on first entry
      // __render is available in every mode (the capture tool needs it even when
      // the page is playing)
      {
        window.__render = function (t) { app.renderAt(t); return true; };
        window.__meta = {
          duration: WEM.Data.duration, sections: WEM.Data.sections,
          bpm: WEM.Data.bpm, beats: WEM.Data.beats.length,
          sectionCount: WEM.sections.length, ready: true
        };
      }
      if (opts.mode !== "render") app.run();
      return app;
    });
  };
})();
