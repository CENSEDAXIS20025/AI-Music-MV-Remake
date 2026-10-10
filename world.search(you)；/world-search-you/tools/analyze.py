# -*- coding: utf-8 -*-
"""
world.search(you); -- audio / lyric analysis for the visualizer.

Outputs (assets/analysis/):
  meta.json      : tempo, tracked beats, downbeats, duration, lrc lines, sections
  spectrum.bin   : uint8[frames][64]  log-frequency band magnitudes at ANALYSIS_FPS
  wave.bin       : uint8[points][2]   (min,max) peak envelope at 100 points/sec
  energy.bin     : uint8[frames][2]   (rms_db, spectral flux)

Tempo: this song has no MIDI. The beat grid comes from a dynamic-programming
beat tracker (Ellis 2007) over the onset envelope -- a single global
period+phase does NOT hold for the whole 4:55 (tools/tempo_slide.py shows the
phase walking), so the tracked beat times are stored and used directly.
Run:  python tools/analyze.py
"""
import json
import os
import subprocess

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
AUDIO = os.path.join(ROOT, "assets", "audio")
OUT = os.path.join(ROOT, "assets", "analysis")
SR = 44100
ANALYSIS_FPS = 60
HOP = SR // ANALYSIS_FPS          # 735
NFFT = 2048
BANDS = 64
FFMPEG = r"D:\UsersApps\FormatFactory\ffmpeg.exe"

SONG = "world-search-you"
MP3 = os.path.join(AUDIO, SONG + ".mp3")
LRC = os.path.join(AUDIO, SONG + ".lrc")
MID = os.path.join(AUDIO, SONG + ".mid")     # optional; absent for this song

os.makedirs(OUT, exist_ok=True)


def decode_mp3(path):
    """Decode mp3 -> float32 mono + stereo peak data."""
    raw = os.path.join(OUT, "_tmp.raw")
    cmd = [FFMPEG, "-hide_banner", "-loglevel", "error", "-y", "-i", path,
           "-f", "s16le", "-acodec", "pcm_s16le", "-ar", str(SR), "-ac", "2", raw]
    subprocess.run(cmd, check=True)
    data = np.fromfile(raw, dtype="<i2").astype(np.float32) / 32768.0
    os.remove(raw)
    stereo = data.reshape(-1, 2)
    mono = stereo.mean(axis=1)
    return mono, stereo


def stft_bands(mono):
    win = np.hanning(NFFT).astype(np.float32)
    n_frames = 1 + (len(mono) - NFFT) // HOP
    idx = np.arange(NFFT)[None, :] + HOP * np.arange(n_frames)[:, None]
    frames = mono[idx] * win
    spec = np.abs(np.fft.rfft(frames, axis=1))          # (F, NFFT/2+1)
    freqs = np.fft.rfftfreq(NFFT, 1.0 / SR)

    # 64 logarithmically spaced bands 40 Hz .. 16 kHz. The lowest log bands are
    # narrower than one FFT bin, which left them permanently empty (a spectrum
    # full of holes), so every band is widened to at least one bin.
    edges = np.geomspace(40.0, 16000.0, BANDS + 1)
    bin_hz = SR / float(NFFT)
    for b in range(BANDS):
        if edges[b + 1] - edges[b] < bin_hz:
            edges[b + 1] = edges[b] + bin_hz
    band = np.zeros((n_frames, BANDS), dtype=np.float32)
    for b in range(BANDS):
        lo, hi = edges[b], edges[b + 1]
        sel = (freqs >= lo) & (freqs < hi)
        if sel.any():
            band[:, b] = spec[:, sel].mean(axis=1)

    # Perceptual log compression, then a PER-BAND reference level (97th
    # percentile) instead of one global maximum: dividing everything by the
    # loudest moment of the whole song flattened the spectrum into a featureless
    # wall, so the meter and every spectrum-driven visual had no shape.
    band = np.log1p(band * 12.0)
    ref = np.percentile(band, 97, axis=0)
    band = band / np.maximum(ref, 1e-6) * 0.80
    band = np.clip(band, 0, 1)
    # NOTE: casting the 0..1 float straight to uint8 truncated every value to 0,
    # which silently starved every spectrum-driven visual. Scale first.
    return np.rint(band * 255.0).astype(np.uint8), spec, freqs, n_frames


def peak_envelope(stereo, per_sec=100):
    n = len(stereo)
    step = SR // per_sec
    m = n // step
    chunk = stereo[:m * step].reshape(m, step, 2)
    lo = chunk.min(axis=(1, 2))
    hi = chunk.max(axis=(1, 2))
    q = np.stack([lo, hi], axis=1)
    q = np.clip(q * 1.05 + 0.5, 0, 1)
    return (q * 255).astype(np.uint8)


def parse_lrc(path):
    lines = []
    with open(path, "r", encoding="utf-8") as f:
        for raw in f:
            raw = raw.strip()
            if not raw:
                continue
            if raw.startswith("{"):
                try:
                    obj = json.loads(raw)
                    lines.append({"t": obj["t"] / 1000.0,
                                  "text": "".join(c.get("tx", "") for c in obj.get("c", [])),
                                  "meta": True})
                except Exception:
                    pass
                continue
            if not raw.startswith("["):
                continue
            try:
                ts, text = raw[1:].split("]", 1)
                mm, rest = ts.split(":")
                ss, _, frac = rest.partition(".")
                t = int(mm) * 60 + int(ss) + (int(frac.ljust(3, "0")[:3]) / 1000.0 if frac else 0.0)
                lines.append({"t": round(t, 3), "text": text.strip(), "meta": False})
            except Exception:
                continue
    return lines


# ---------------------------------------------------------------- tempo ----
def onset_envelope(spec, freqs, fps, up=100.0):
    """Positive spectral flux with the slow trend removed, upsampled to `up` Hz."""
    n = spec.shape[0]
    m = np.log1p(spec * 20.0)
    d = np.diff(m, axis=0)
    f = np.zeros(n)
    f[1:] = np.maximum(d, 0).sum(axis=1)
    f = f - np.convolve(f, np.ones(21) / 21, mode="same")
    f = np.maximum(f, 0)
    f /= max(f.max(), 1e-9)
    grid = np.arange(0, n, fps / up)
    return np.interp(grid, np.arange(n), f)


def tempo_estimate(env, up=100.0, lo=60.0, hi=220.0):
    """Autocorrelation tempo, refined by a comb score. Returns (bpm, period)."""
    seg = env[int(3 * up):int(len(env) / up - 3) * int(up)].copy()
    seg = seg - seg.mean()
    ac = np.correlate(seg, seg, mode="full")[len(seg) - 1:]
    ac /= max(ac[0], 1e-9)
    l0, l1 = int(60 / hi * up), int(60 / lo * up)
    peaks = [(float(ac[lag]), 60.0 * up / lag) for lag in range(l0, l1)
             if ac[lag] > ac[lag - 1] and ac[lag] >= ac[lag + 1]]
    peaks.sort(reverse=True)
    coarse = peaks[0][1] if peaks else 120.0
    best = (-1, coarse)
    for bpm in np.arange(max(lo, coarse * 0.90), min(hi, coarse * 1.10), 0.002):
        per = 60.0 / bpm * up
        s = 0.0
        # the comb window is short enough that it cannot smear over 0.1 BPM
        t = np.arange(per * 4, len(env) - per, per)
        i = np.round(t).astype(int)
        s = env[i].mean()
        if s > best[0]:
            best = (s, bpm)
    return best[1]


def track_beats(env, up, bpm, tightness=100.0):
    """DP beat tracking (Ellis 2007, 'Beat Tracking by Dynamic Programming')."""
    period = 60.0 / bpm * up
    N = len(env)
    o = env / (env.std() + 1e-9)
    cum = np.zeros(N)
    back = np.full(N, -1, dtype=np.int32)
    lo = int(round(period * 0.5))
    hi = int(round(period * 2.0))
    for i in range(N):
        j0 = max(0, i - hi)
        j1 = max(0, i - lo)
        if j1 <= j0:
            cum[i] = o[i]
            continue
        prev = cum[j0:j1]
        d = -(np.log((i - np.arange(j0, j1)) / period) ** 2)
        sc = prev + tightness * d
        k = int(np.argmax(sc))
        cum[i] = o[i] + sc[k]
        back[i] = j0 + k
    # backtrack from the best final score
    i = int(np.argmax(cum[int(N - 4 * period):]) + int(N - 4 * period))
    beats = []
    while i > 0:
        beats.append(i)
        i = back[i]
        if i < 0:
            break
    beats.reverse()
    return np.array(beats, dtype=np.float64) / up


def main():
    print("[1/5] decoding mp3 ...")
    mono, stereo = decode_mp3(MP3)
    duration = len(mono) / SR
    print("      duration = %.3f s" % duration)

    print("[2/5] stft / bands ...")
    band, spec, freqs, n_frames = stft_bands(mono)
    band.tofile(os.path.join(OUT, "spectrum.bin"))
    print("      spectrum bytes = %d  max = %d  mean = %.2f"
          % (band.size, band.max(), band.mean()))

    print("[3/5] envelope ...")
    wave = peak_envelope(stereo)
    wave.tofile(os.path.join(OUT, "wave.bin"))

    n = min(n_frames, len(mono) // HOP)
    rms = np.zeros(n, dtype=np.float32)
    for f in range(n):
        seg = mono[f * HOP: f * HOP + NFFT]
        rms[f] = float(np.sqrt(np.mean(seg ** 2) + 1e-12))
    rms_db = 20 * np.log10(rms + 1e-9)
    rms_db = np.clip((rms_db + 60) / 60, 0, 1)

    flux = np.zeros(n, dtype=np.float32)
    d = np.diff(spec[:n], axis=0)
    flux[1:] = np.maximum(d, 0).sum(axis=1)
    flux = flux / max(flux.max(), 1e-9)

    print("[4/5] tempo + beat tracking ...")
    UP = 100.0
    env = onset_envelope(spec, freqs, ANALYSIS_FPS, UP)
    # use only the first 220 s for the tempo estimate: after that the arrangement
    # thins out and the comb score gets noisy
    bpm = tempo_estimate(env[:int(220 * UP)], UP)
    print("      onset-autocorrelation + comb tempo = %.3f BPM" % bpm)
    beats = track_beats(env, UP, bpm)
    beats = beats[(beats >= 0.0) & (beats < duration)]
    ibi = np.diff(beats)
    period = float(np.median(ibi))
    bpm_eff = 60.0 / period
    print("      tracked %d beats, median IBI %.4f s -> %.2f BPM, jitter %.1f ms"
          % (len(beats), period, bpm_eff, 1000 * float(np.std(ibi))))

    # ---- downbeat: which of the four beat slots carries the kick? ----
    freqs_sel = (freqs >= 30) & (freqs <= 160)
    km = np.log1p(spec[:, freqs_sel] * 20.0)
    kd = np.diff(km, axis=0)
    kf = np.zeros(n)
    kf[1:] = np.maximum(kd, 0).sum(axis=1)
    kf /= max(kf.max(), 1e-9)
    bi = np.clip(np.round(beats * ANALYSIS_FPS).astype(int), 0, n - 1)
    kick_at = kf[bi]
    # a short window around each beat so a 20 ms tracker offset cannot zero it
    w = 2
    win = np.array([kf[np.clip(bi + q, 0, n - 1)] for q in range(-w, w + 1)]).max(axis=0)
    scores = [float(win[k::4].mean()) for k in range(4)]
    k0 = int(np.argmax(scores))
    print("      downbeat slot scores %s -> slot %d" % (["%.4f" % s for s in scores], k0))
    downbeats = beats[k0::4]

    # ---- section timeline, snapped to the tracked beat grid ----
    RAW_SECTIONS = [
        ("01", "boot", 0.0, "search engine cold boot; empty index; the query line wakes up"),
        ("02", "rank", 14.36, "Side by side: a ranking table climbs, scores fill, the bubble inflates and pops"),
        ("03", "memory", 28.05, "memories indexed into slots; the sweetest one is highlighted and pinned last"),
        ("04", "table", 40.90, "query TABLE: constraint filter (height = elbow), wobbly stubby leg, only perfect match"),
        ("05", "eggplant", 54.46, "query EGGPLANT: purple swatch, scratch-mark texture, nutrition fields, perfect match"),
        ("06", "search1", 68.17, "I'm searching: full-screen query spinner sweeping the index"),
        ("07", "cat", 82.89, "fuzzy match CAT: blue point facets, meow/hiss, purr = 0 results"),
        ("08", "steak", 96.64, "recipe index card: fillet mignon, mushroom sauce, doneness gradient"),
        ("09", "flower", 109.72, "bloom cycle plot: the rarest bloom, petal geometry, perfect match"),
        ("10", "human", 123.44, "sensor readouts: hand temperature curve, unruly hair field, perfect match"),
        ("11", "search2", 137.09, "I'm searching: deeper crawl, posting lists, the cursor never stops"),
        ("12", "typeahead", 151.84, "autocomplete fails: candidate words struck out one by one, caret blinking"),
        ("13", "love", 165.73, "the typeahead finally lands on LOVE; hit animation, result locks"),
        ("14", "embed", 179.47, "embedding cloud: everything resembles you; the query morphs through every form"),
        ("15", "rapid", 193.28, "searching for, searching for: rapid repeat queries, results flicker"),
        ("16", "lostself", 203.16, "my old self that's gone: the index entry is deleted, an empty result set"),
        ("17", "buckets", 207.14, "each one of us has a bucket of love: histogram of buckets filling"),
        ("18", "tokens", 221.18, "tokenise to the cell, then BPE-merge back up: the whole is not the pieces"),
        ("19", "callback", 233.77, "flower and human again, now with the accumulated context of the search"),
        ("20", "search3", 261.06, "I'm searching: last sweep, the index is nearly exhausted"),
        ("21", "dogfruit", 275.75, "query DOG (ruff ruff) and query FRUIT (tomato, full of juice)"),
        ("22", "outro", 287.35, "the search returns: one result, 'you'; index closed, CRT off, credits"),
    ]
    sections = []
    for i, (num, name, t, desc) in enumerate(RAW_SECTIONS):
        if i == 0:
            start = 0.0
            beat0 = 0
        else:
            beat0 = int(np.argmin(np.abs(beats - t)))
            start = round(float(beats[beat0]), 4)
        if i + 1 < len(RAW_SECTIONS):
            nb = int(np.argmin(np.abs(beats - RAW_SECTIONS[i + 1][2])))
            end = round(float(beats[nb]), 4)
        else:
            end = round(duration, 4)
        bar = (beat0 - k0) // 4
        sections.append({"id": num, "name": name, "start": start, "end": end,
                         "beat": beat0, "bar": bar, "beatInBar": (beat0 - k0) % 4,
                         "desc": desc})
    for s in sections:
        print("      %s %-9s %8.3f - %8.3f (%5.2fs, beat %4d, bar %4d)"
              % (s["id"], s["name"], s["start"], s["end"], s["end"] - s["start"],
                 s["beat"], s["bar"]))

    print("[5/5] writing meta.json ...")
    lines = parse_lrc(LRC)
    midi_notes, midi_tmap = [], []
    if os.path.exists(MID):
        print("      (midi found, ignored by the storyboard)")
    meta = {
        "song": SONG,
        "duration": round(duration, 4),
        "sampleRate": SR,
        "fps": ANALYSIS_FPS,
        "hop": HOP,
        "nfft": NFFT,
        "bands": BANDS,
        "frames": int(n),
        "bpm": round(bpm_eff, 4),
        "bpmRaw": round(bpm, 4),
        "gridPhase": round(float(beats[0] % period), 5),
        "beatPeriod": round(period, 6),
        "beatsPerBar": 4,
        "downbeatSlot": k0,
        "beats": [round(float(b), 4) for b in beats],
        "downbeats": [round(float(b), 4) for b in downbeats],
        "sections": sections,
        "lrc": lines,
        "midiNotes": midi_notes,
        "midiTempoMap": midi_tmap,
    }
    with open(os.path.join(OUT, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, separators=(",", ":"))

    rt = np.stack([(rms_db * 255).astype(np.uint8), (np.clip(flux, 0, 1) * 255).astype(np.uint8)], axis=1)
    rt.tofile(os.path.join(OUT, "energy.bin"))

    sizes = {f: os.path.getsize(os.path.join(OUT, f)) for f in sorted(os.listdir(OUT))}
    print("      ", sizes)


if __name__ == "__main__":
    main()
