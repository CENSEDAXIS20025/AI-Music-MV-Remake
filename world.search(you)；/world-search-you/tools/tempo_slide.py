# -*- coding: utf-8 -*-
"""Sliding-window beat phase at a fixed BPM: is there drift or a phase jump?"""
import os
import subprocess
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "assets", "analysis")
FFMPEG = r"D:\UsersApps\FormatFactory\ffmpeg.exe"
SR, FPS, HOP, NFFT = 44100, 60, 735, 2048
U = 1000.0

RAW = os.path.join(OUT, "_s.raw")
subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", "-i",
                os.path.join(ROOT, "assets", "audio", "world-search-you.mp3"),
                "-f", "s16le", "-ac", "1", "-ar", str(SR), RAW], check=True)
mono = np.fromfile(RAW, dtype="<i2").astype(np.float32) / 32768.0
os.remove(RAW)
dur = len(mono) / SR
n = 1 + (len(mono) - NFFT) // HOP
idx = np.arange(NFFT)[None, :] + HOP * np.arange(n)[:, None]
spec = np.abs(np.fft.rfft(mono[idx] * np.hanning(NFFT).astype(np.float32), axis=1))
freqs = np.fft.rfftfreq(NFFT, 1 / SR)


def band_flux(lo, hi):
    sel = (freqs >= lo) & (freqs <= hi)
    m = np.log1p(spec[:, sel] * 20.0)
    d = np.diff(m, axis=0)
    f = np.zeros(n)
    f[1:] = np.maximum(d, 0).sum(axis=1)
    f = f - np.convolve(f, np.ones(21) / 21, mode="same")
    return np.maximum(f, 0)


kick = band_flux(30, 160)
hi = band_flux(3000, 12000)
uk = np.interp(np.arange(0, n, FPS / U), np.arange(n), kick)
uh = np.interp(np.arange(0, n, FPS / U), np.arange(n), hi)
env = 0.5 * uk / uk.max() + 0.5 * uh / uh.max()

BPM = 140.102
PER = 60.0 / BPM

print("=== sliding window (10 s, hop 2 s) best beat time, BPM=%.3f ===" % BPM)
prev = None
for a in np.arange(6, dur - 12, 2.0):
    b = a + 10
    bg = (-1, 0)
    for ph in np.arange(0, PER, 0.002):
        t = np.arange(a + ph, b, PER) * U
        i = np.round(t).astype(int)
        i = i[(i >= int(a * U)) & (i < int(b * U))]
        if len(i) < 8:
            continue
        v = env[i].mean()
        if v > bg[0]:
            bg = (v, a + ph)
    first = bg[1]
    k = (first - 0.092) / PER
    frac = k - round(k)
    print("   %6.1f-%6.1f  first %.3f  idx %8.2f  frac %+0.3f  comb %.5f" % (a, b, first, k, frac, bg[0]))
