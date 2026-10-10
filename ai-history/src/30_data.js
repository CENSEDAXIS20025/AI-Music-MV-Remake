/* ============================================================================
   world.execute(me);  --  data: asset loading, analysis access, beat clock
   Works both over http (separate files) and as a single inlined HTML
   (window.WEM.EMBED holds base64 payloads).
   ========================================================================== */
(function () {
  "use strict";
  var WEM = window.WEM, C = WEM.core;
  var clamp = C.clamp;

  function b64ToBytes(b64) {
    var bin = atob(b64), n = bin.length, out = new Uint8Array(n);
    for (var i = 0; i < n; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function base() { return WEM.assetBase || "assets/analysis/"; }

  function loadBinary(name) {
    if (WEM.EMBED && WEM.EMBED[name]) return Promise.resolve(b64ToBytes(WEM.EMBED[name]));
    return fetch(base() + name).then(function (r) {
      if (!r.ok) throw new Error("404 " + name);
      return r.arrayBuffer();
    }).then(function (b) { return new Uint8Array(b); });
  }

  function loadJSON(name) {
    if (WEM.EMBED && WEM.EMBED[name]) return Promise.resolve(JSON.parse(WEM.EMBED[name]));
    return fetch(base() + name).then(function (r) { return r.json(); });
  }

  function Data() {
    this.ready = false;
  }

  Data.prototype.load = function () {
    var self = this;
    return Promise.all([
      loadJSON("meta.json"), loadBinary("spectrum.bin"), loadBinary("wave.bin"), loadBinary("energy.bin")
    ]).then(function (r) {
      self.meta = r[0]; self.spec = r[1]; self.wave = r[2]; self.energy = r[3];
      self.duration = self.meta.duration;
      self.fps = self.meta.fps;
      self.frames = self.meta.frames;
      self.bands = self.meta.bands;
      self.bpm = self.meta.bpm;
      self.period = self.meta.beatPeriod;
      self.phase0 = self.meta.gridPhase;
      self.sections = self.meta.sections;
      // the raw LRC is not time-ordered; sort it or lyricAt() picks wrong lines
      self.lrc = self.meta.lrc.filter(function (l) { return !l.meta; })
        .sort(function (a, b) { return a.t - b.t; });
      self.notes = self.meta.midiNotes || [];
      self.beats = self.meta.beats || [];
      self.downbeats = self.meta.downbeats || [];
      self.ready = true;
      return self;
    });
  };

  Data.prototype.band = function (t, i) {
    var f = t * this.fps;
    var i0 = Math.floor(f);
    if (i0 < 0) return 0;
    if (i0 >= this.frames - 1) return 0;
    var fr = f - i0;
    var a = i0 * this.bands + i, b = (i0 + 1) * this.bands + i;
    return (this.spec[a] * (1 - fr) + this.spec[b] * fr) / 255;
  };

  Data.prototype.bandsAt = function (t, out) {
    out = out || new Float32Array(this.bands);
    var f = clamp(t * this.fps, 0, this.frames - 1.001);
    var i0 = Math.floor(f), fr = f - i0;
    var a = i0 * this.bands, b = a + this.bands;
    for (var i = 0; i < this.bands; i++) out[i] = (this.spec[a + i] * (1 - fr) + this.spec[b + i] * fr) / 255;
    return out;
  };

  Data.prototype.rms = function (t) {
    var f = clamp(t * this.fps, 0, this.frames - 1.001);
    var i0 = Math.floor(f), fr = f - i0;
    return (this.energy[i0 * 2] * (1 - fr) + this.energy[(i0 + 1) * 2] * fr) / 255;
  };
  Data.prototype.flux = function (t) {
    var f = clamp(t * this.fps, 0, this.frames - 1.001);
    var i0 = Math.floor(f), fr = f - i0;
    return (this.energy[i0 * 2 + 1] * (1 - fr) + this.energy[(i0 + 1) * 2 + 1] * fr) / 255;
  };
  Data.prototype.waveAt = function (t) { // returns [min,max] around a 1/100 s cell
    var i = clamp(Math.round(t * 100), 0, this.wave.length / 2 - 1) * 2;
    return [(this.wave[i] / 255) - 0.5, (this.wave[i + 1] / 255) - 0.5];
  };

  /* ------------------------------------------------------------ beat clock */
  Data.prototype.beat = function (t, o) {
    o = o || {};
    var bf = (t - this.phase0) / this.period;
    var idx = Math.floor(bf);
    var ph = bf - idx;
    var since = t - (this.phase0 + idx * this.period);
    var bar = Math.floor(idx / 4);
    var bib = ((idx % 4) + 4) % 4;
    var sinceBar = t - (this.phase0 + bar * 4 * this.period);
    o.index = idx; o.phase = ph; o.sinceBeat = since; o.bar = bar; o.beatInBar = bib;
    o.sinceBar = sinceBar; o.isDownbeat = bib === 0;
    o.pulse = Math.exp(-since / 0.13);
    o.barPulse = Math.exp(-sinceBar / 0.22);
    o.kick = Math.exp(-since / 0.09) * (1 - Math.min(Math.max(since / this.period, 0), 1));
    o.grid = this.phase0 + idx * this.period;
    o.t = t;
    return o;
  };

  Data.prototype.sectionIndex = function (t) {
    var s = this.sections;
    for (var i = s.length - 1; i >= 0; i--) if (t >= s[i].start) return i;
    return 0;
  };
  Data.prototype.section = function (t) { return this.sections[this.sectionIndex(t)]; };

  Data.prototype.lyricAt = function (t) {
    var best = null;
    for (var i = 0; i < this.lrc.length; i++) {
      if (this.lrc[i].t <= t + 0.02) best = this.lrc[i]; else break;
    }
    return best;
  };
  Data.prototype.nextLyric = function (t, n) {
    n = n || 0;
    for (var i = 0; i < this.lrc.length; i++) if (this.lrc[i].t > t) return this.lrc[i + n] || null;
    return null;
  };
  Data.prototype.notesBetween = function (a, b) {
    var out = [];
    for (var i = 0; i < this.notes.length; i++) {
      var nt = this.notes[i];
      if (nt.t >= a && nt.t < b) out.push(nt);
      if (nt.t >= b) break;
    }
    return out;
  };

  WEM.Data = new Data();
})();
