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
      self.downbeatSlot = self.meta.downbeatSlot || 0;
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
  // This song has no metronomic grid: a DP beat tracker followed the actual
  // performance, so the beat clock reads the tracked beat list instead of
  // phase0 + k*period (which walks out of sync by up to half a beat).
  Data.prototype.beat = function (t, o) {
    o = o || {};
    var B = this.beats, idx, per, grid;
    if (B && B.length > 2) {
      var lo = 0, hi = B.length - 1;
      idx = -1;
      while (lo <= hi) {
        var mid = (lo + hi) >> 1;
        if (B[mid] <= t) { idx = mid; lo = mid + 1; } else hi = mid - 1;
      }
      per = (idx >= 0 && idx + 1 < B.length) ? (B[idx + 1] - B[idx])
        : (idx > 0 ? (B[idx] - B[idx - 1]) : this.period);
      grid = idx >= 0 ? B[idx] : (B[0] - this.period);
    } else {
      var bf = (t - this.phase0) / this.period;
      idx = Math.floor(bf);
      per = this.period;
      grid = this.phase0 + idx * per;
    }
    var since = t - grid;
    var k0 = this.downbeatSlot || 0;
    var bar = Math.floor((idx - k0) / 4);
    var bib = ((idx - k0) % 4 + 4) % 4;
    var sinceBar = since;
    if (B && B.length > 2) {
      var dbi = idx - bib;
      sinceBar = t - (dbi >= 0 && dbi < B.length ? B[dbi] : grid - bib * per);
    } else {
      sinceBar = t - (this.phase0 + (Math.floor((idx - k0) / 4) * 4 + k0) * per);
    }
    o.index = idx; o.phase = per > 0 ? since / per : 0; o.sinceBeat = since;
    o.bar = bar; o.beatInBar = bib;
    o.sinceBar = sinceBar; o.isDownbeat = bib === 0;
    o.period = per;
    o.pulse = Math.exp(-since / (per * 0.30));
    o.barPulse = Math.exp(-sinceBar / (per * 0.52));
    o.kick = Math.exp(-since / (per * 0.21)) * (1 - Math.min(Math.max(since / per, 0), 1));
    o.grid = grid;
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
