# -*- coding: utf-8 -*-
"""Determine the true tempo of world.execute(me); from the audio onset envelope,
and validate candidate BPMs (including the two MIDI tempo candidates)."""
import json
import os
import subprocess
import struct
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "assets", "analysis")
FFMPEG = r"D:\UsersApps\FormatFactory\ffmpeg.exe"
SR, FPS, HOP, NFFT = 44100, 60, 735, 2048

RAW = os.path.join(OUT, "_t.raw")
subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", "-i",
                os.path.join(ROOT, "assets", "audio", "world-execute-me.mp3"),
                "-f", "s16le", "-ac", "1", "-ar", str(SR), RAW], check=True)
mono = np.fromfile(RAW, dtype="<i2").astype(np.float32) / 32768.0
os.remove(RAW)
dur = len(mono) / SR

# log-mel-ish spectrogram
n_frames = 1 + (len(mono) - NFFT) // HOP
idx = np.arange(NFFT)[None, :] + HOP * np.arange(n_frames)[:, None]
win = np.hanning(NFFT).astype(np.float32)
spec = np.abs(np.fft.rfft(mono[idx] * win, axis=1))
freqs = np.fft.rfftfreq(NFFT, 1 / SR)
mel = np.log1p(spec * 20.0)

# onset strength: positive spectral flux, then remove slow trend
flux = np.zeros(n_frames)
d = np.diff(mel, axis=0)
flux[1:] = np.maximum(d, 0).sum(axis=1)
k = 31
trend = np.convolve(flux, np.ones(k) / k, mode="same")
onset = np.maximum(flux - trend, 0)
onset = np.convolve(onset, np.array([0.25, 1, 0.25]), mode="same")
onset /= onset.max()

# ---- global autocorrelation ----
seg = onset[int(2 * FPS):int(35 * FPS)]
seg = seg - seg.mean()
ac = np.correlate(seg, seg, mode="full")[len(seg) - 1:]
ac /= ac[0]
lo, hi = int(60 / 240 * FPS), int(60 / 50 * FPS)
peaks = []
for lag in range(lo, hi):
    if ac[lag] > ac[lag - 1] and ac[lag] >= ac[lag + 1]:
        peaks.append((float(ac[lag]), 60.0 * FPS / lag))
peaks.sort(reverse=True)
print("=== global autocorrelation peaks (first 35 s) ===")
for v, b in peaks[:12]:
    print("   %6.2f BPM  strength %.3f" % (b, v))


def grid_score(bpm, nph=600):
    per = 60.0 / bpm
    best = (-1, 0)
    for ph in np.arange(0, per, per / nph):
        g = np.arange(ph, dur, per)
        gi = np.round(g * FPS).astype(int)
        gi = gi[(gi >= 0) & (gi < len(onset))]
        s = onset[gi].mean() + 0.35 * onset[np.clip(gi + int(0.5 * per * FPS), 0, len(onset) - 1)].mean()
        # penalise grids whose beats hit silence systematically (e.g. half-tempo)
        if s > best[0]:
            best = (s, ph)
    return best


print("\n=== candidate BPM grid scores ===")
cands = sorted(set([round(b, 2) for _, b in peaks[:8]] + [120.0, 125.0, 130.0, 60.0, 65.0, 240.0, 180.0]))
res = []
for b in cands:
    s, ph = grid_score(b)
    res.append((s, b, ph))
    print("   %7.2f BPM  score %.4f  phase %.4f" % (b, s, ph))

# ---- local tempo check on well-defined sections ----
print("\n=== section-wise best tempo (4 s windows, hop 1 s) ===")
for name, a, b in [("intro", 0, 16), ("verse1", 30, 44), ("chorus1", 59, 74),
                   ("EXEC", 227.6, 242), ("outro", 205, 211.9)]:
    best = (-1, 0)
    s0, s1 = int(a * FPS), min(int(b * FPS), len(onset))
    for bpm in np.arange(60, 200, 0.25):
        per = 60.0 / bpm
        for ph in np.arange(0, per, per / 40):
            g = np.arange(a + ph, b, per)
            gi = np.round(g * FPS).astype(int)
            gi = gi[(gi >= s0) & (gi < s1)]
            if len(gi) < 4:
                continue
            s = onset[gi].mean() / (np.sqrt(bpm) ** 0.0)
            if s > best[0]:
                best = (s, bpm)
    print("   %-8s %6.2f BPM (score %.4f)" % (name, best[1], best[0]))
