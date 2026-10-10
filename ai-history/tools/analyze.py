# -*- coding: utf-8 -*-
"""
world.execute(me); -- audio / lyric / MIDI analysis for the visualizer.

Outputs (assets/analysis/):
  meta.json      : tempo, beats, downbeats, duration, lrc lines, sections, energy
  spectrum.bin   : uint8[frames][64]  log-frequency band magnitudes at ANALYSIS_FPS
  wave.bin       : uint8[points][2]   (min,max) peak envelope at 100 points/sec
  notes.json     : MIDI note events + tempo map
Run:  python tools/analyze.py
"""
import json
import os
import struct
import subprocess
import sys

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

    # perceptual log compression -> uint8 (0..255)
    band = np.log1p(band * 12.0)
    band /= max(band.max(), 1e-9)
    band = np.clip(band ** 0.85, 0, 1)
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


# ---------------------------------------------------------------- MIDI ----
def read_vlq(buf, i):
    v = 0
    while True:
        b = buf[i]
        i += 1
        v = (v << 7) | (b & 0x7F)
        if not (b & 0x80):
            return v, i


def parse_midi(path):
    buf = open(path, "rb").read()
    assert buf[0:4] == b"MThd"
    hlen = struct.unpack(">I", buf[4:8])[0]
    fmt, ntrk, div = struct.unpack(">HHH", buf[8:14])
    i = 8 + hlen
    tracks = []
    for _ in range(ntrk):
        assert buf[i:i + 4] == b"MTrk", buf[i:i + 4]
        tlen = struct.unpack(">I", buf[i + 4:i + 8])[0]
        tracks.append(buf[i + 8:i + 8 + tlen])
        i += 8 + tlen

    tempos = [(0, 500000)]
    notes = []
    for ti, tr in enumerate(tracks):
        p = 0
        tick = 0
        running = None
        active = {}
        name = ""
        while p < len(tr):
            dt, p = read_vlq(tr, p)
            tick += dt
            st = tr[p]
            if st & 0x80:
                p += 1
                running = st
            else:
                st = running
            if st is None:
                break
            kind = st & 0xF0
            ch = st & 0x0F
            if st == 0xFF:
                mtype = tr[p]; p += 1
                ln, p = read_vlq(tr, p)
                payload = tr[p:p + ln]; p += ln
                if mtype == 0x51 and ln == 3:
                    us = (payload[0] << 16) | (payload[1] << 8) | payload[2]
                    tempos.append((tick, us))
                elif mtype == 0x03:
                    name = payload.decode("latin-1", "replace")
            elif st in (0xF0, 0xF7):
                ln, p = read_vlq(tr, p); p += ln
            elif kind in (0x80, 0x90, 0xA0, 0xB0, 0xE0):
                d1, d2 = tr[p], tr[p + 1]; p += 2
                if kind == 0x90 and d2 > 0:
                    active[(ch, d1)] = (tick, d2)
                elif kind == 0x80 or (kind == 0x90 and d2 == 0):
                    k = (ch, d1)
                    if k in active:
                        st_tick, vel = active.pop(k)
                        notes.append({"tk": st_tick, "dur": tick - st_tick,
                                      "p": d1, "v": vel, "tr": ti})
            elif kind in (0xC0, 0xD0):
                p += 1
            else:
                p += 1
        if name:
            tracks_meta = name
    notes.sort(key=lambda n: (n["tk"], n["p"]))
    return fmt, div, tempos, notes, tracks


def build_tempo_map(tempos, div):
    """tempos: sorted [(tick, us_per_quarter)] -> [(tick, us, seconds)]"""
    tempos = sorted(set(tempos))
    out = []
    t = 0.0
    prev_tick, prev_us = tempos[0]
    out.append((prev_tick, prev_us, 0.0))
    for tick, us in tempos[1:]:
        t += (tick - prev_tick) / div * (prev_us / 1e6)
        out.append((tick, us, t))
        prev_tick, prev_us = tick, us
    return out


def tick_to_sec(tmap, div, tick):
    acc = tmap[0]
    for e in tmap:
        if e[0] <= tick:
            acc = e
        else:
            break
    return acc[2] + (tick - acc[0]) / div * (acc[1] / 1e6)


def main():
    mp3 = os.path.join(AUDIO, "world-execute-me.mp3")
    lrc = os.path.join(AUDIO, "world-execute-me.lrc")
    mid = os.path.join(AUDIO, "world-execute-me.mid")

    print("[1/5] decoding mp3 ...")
    mono, stereo = decode_mp3(mp3)
    duration = len(mono) / SR
    print("      duration = %.3f s" % duration)

    print("[2/5] stft / bands ...")
    band, spec, freqs, n_frames = stft_bands(mono)
    band.tofile(os.path.join(OUT, "spectrum.bin"))

    print("[3/5] envelope ...")
    wave = peak_envelope(stereo)
    wave.tofile(os.path.join(OUT, "wave.bin"))

    # rms per analysis frame
    n = min(n_frames, len(mono) // HOP)
    rms = np.zeros(n, dtype=np.float32)
    for f in range(n):
        seg = mono[f * HOP: f * HOP + NFFT]
        rms[f] = float(np.sqrt(np.mean(seg ** 2) + 1e-12))
    rms_db = 20 * np.log10(rms + 1e-9)
    rms_db = np.clip((rms_db + 60) / 60, 0, 1)

    # spectral flux onset strength
    flux = np.zeros(n, dtype=np.float32)
    d = np.diff(spec[:n], axis=0)
    flux[1:] = np.maximum(d, 0).sum(axis=1)
    flux = flux / max(flux.max(), 1e-9)

    print("[4/5] midi ...")
    fmt, div, tempos, notes, raw_tracks = parse_midi(mid)
    tmap = build_tempo_map(tempos, div)
    midi_notes = [{"t": round(tick_to_sec(tmap, div, x["tk"]), 4),
                   "d": round(x["dur"] / div * (tmap[0][1] / 1e6), 4),
                   "p": x["p"], "v": x["v"], "tr": x["tr"]} for x in notes]
    midi_notes = [x for x in midi_notes if x["t"] < duration + 2]
    print("      midi notes: %d  tempo events: %d  fmt=%d div=%d" % (len(midi_notes), len(tempos), fmt, div))
    for tk, us, sec in tmap:
        print("      tempo @tick %6d = %.3f BPM (at %.3fs)" % (tk, 60e6 / us, sec))

    # ---- tempo: verified by MIDI<->audio onset alignment (tools/midi_align.py:
    #      only 130.000 BPM keeps the 615 MIDI note onsets aligned with the audio
    #      onset envelope for the whole song; 120/125 collapse to noise) and beat
    #      phase 0.286 s from kick-band / hi-band flux (tools/phase_check.py).
    #      Verse/chorus entries sit on exact bar lines: beats 64/96/128/160/...  ----
    bpm_med = 130.0
    period = 60.0 / bpm_med
    best_phase = 0.286
    beats = np.arange(best_phase, duration, period)
    downbeats = beats[::4]
    print("      bpm=%.3f  phase=%.3f  beats=%d  bars=%d" % (bpm_med, best_phase, len(beats), len(downbeats)))

    # ---- section timeline (snapped to the beat grid; boundaries are musical events) ----
    RAW_SECTIONS = [
        ("01", "boot", 0.0, "CRT power-on, POST log, physical constants, type world.execute(me);"),
        ("02", "title", 16.000, "title decodes from glyph noise, formula ring, code corridor, wireframe world cube bursts"),
        ("03", "circle", 29.709, "unit circle draws sin, zoom reveals helix, euler"),
        ("04", "physics", 44.452, "double pendulum, twin Lorenz trajectories diverge, chaos alert"),
        ("05", "chorus1", 59.223, "4D hypercube, one classical equation slammed in per bar"),
        ("06", "geometry", 74.045, "net folds into solid, polyhedra, torus, trefoil, euler characteristic table"),
        ("07", "quantum", 88.587, "wave packet spreads, electron cloud collapses, Bloch precession, measurement"),
        ("08", "fourier", 103.489, "epicycles draw psi, 3D mountain range from the song's own spectrum"),
        ("09", "fractal", 118.333, "Mandelbrot dive, recursive 3D tree grows per beat, Sierpinski tetra"),
        ("10", "memory", 133.000, "3D memory grid allocate/mark/sweep/compact, hex dump scrolls"),
        ("11", "critical", 147.517, "infinite window recursion, stack overflow, segfault, black+red retype"),
        ("12", "blackhole", 162.286, "gravity-well spacetime grid, accretion disk, photon ring, formulas spiral in"),
        ("13", "bigbang", 177.000, "particles and formulas scatter into a spiral galaxy, collapse to a formula sphere, prism"),
        ("14", "heart", 191.416, "heart curve -> low-poly heart, triangles fly in, beats, exit code 0, CRT off"),
        ("15", "credits", 205.709, "black screen credits, music - Mili"),
    ]
    sections = []
    for i, (num, name, t, desc) in enumerate(RAW_SECTIONS):
        start = 0.0 if i == 0 else float(best_phase + round((t - best_phase) / period) * period)
        start = round(start, 4)
        end = duration
        if i + 1 < len(RAW_SECTIONS):
            nt = RAW_SECTIONS[i + 1][2]
            end = float(best_phase + round((nt - best_phase) / period) * period)
        end = round(end, 4)
        beat0 = int(round((start - best_phase) / period))
        sections.append({"id": num, "name": name, "start": start, "end": end,
                         "beat": beat0, "bar": beat0 // 4, "beatInBar": beat0 % 4,
                         "desc": desc})
    for s in sections:
        print("      %s %-9s %7.3f - %7.3f  (%5.2fs, beat %d, bar %d)" %
              (s["id"], s["name"], s["start"], s["end"], s["end"] - s["start"], s["beat"], s["bar"]))

    print("[5/5] writing meta.json ...")
    lines = parse_lrc(lrc)
    meta = {
        "duration": round(duration, 4),
        "sampleRate": SR,
        "fps": ANALYSIS_FPS,
        "hop": HOP,
        "nfft": NFFT,
        "bands": BANDS,
        "frames": int(n),
        "bpmMidi": round(bpm_med, 4),
        "bpm": round(bpm_med, 4),
        "gridPhase": round(float(best_phase), 5),
        "beatPeriod": round(period, 6),
        "beatsPerBar": 4,
        "beats": [round(float(b), 4) for b in beats],
        "downbeats": [round(float(b), 4) for b in downbeats],
        "sections": sections,
        "lrc": lines,
        "midiNotes": midi_notes,
        "midiTempoMap": [{"tick": t, "us": u, "sec": round(s, 4)} for t, u, s in tmap],
    }
    with open(os.path.join(OUT, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, separators=(",", ":"))

    # rms/flux as separate small binary (uint8) for runtime
    rt = np.stack([(rms_db * 255).astype(np.uint8), (np.clip(flux, 0, 1) * 255).astype(np.uint8)], axis=1)
    rt.tofile(os.path.join(OUT, "energy.bin"))

    sizes = {f: os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT)}
    print("      ", sizes)


if __name__ == "__main__":
    main()
