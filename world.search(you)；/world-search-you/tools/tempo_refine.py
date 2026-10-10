# -*- coding: utf-8 -*-
"""Precise beat period + phase, and a drift check.

The tempo is measured independently in several windows (comb response over a
fine BPM sweep) so an octave error or a drifting grid cannot hide.
"""
import os
import subprocess
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "assets", "analysis")
FFMPEG = r"D:\UsersApps\FormatFactory\ffmpeg.exe"
SR, FPS, HOP, NFFT = 44100, 60, 735, 2048
U = 1000.0

RAW = os.path.join(OUT, "_r.raw")
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
full = band_flux(40, 16000)
uk = np.interp(np.arange(0, n, FPS / U), np.arange(n), kick)
uh = np.interp(np.arange(0, n, FPS / U), np.arange(n), hi)
uf = np.interp(np.arange(0, n, FPS / U), np.arange(n), full)


def comb(bpm, env, a, b, nph=500):
    per = 60.0 / bpm
    best = (-1, 0)
    ia, ib = int(a * U), min(int(b * U), len(env))
    for ph in np.arange(0, per, per / nph):
        t = np.arange(a + ph, b, per) * U
        i = np.round(t).astype(int)
        i = i[(i >= ia) & (i < ib)]
        if len(i) < 6:
            continue
        s = env[i].mean()
        if s > best[0]:
            best = (s, (a + ph))
    return best


print("=== per-window best tempo (kick+hi comb, 0.005 BPM resolution) ===")
wins = [(0, 40), (40, 80), (80, 120), (120, 160), (160, 200), (200, 240), (240, 295),
        (68, 83), (137, 152), (261, 276)]
env = 0.5 * (uk / max(uk.max(), 1e-9)) + 0.5 * (uh / max(uh.max(), 1e-9))
for a, b in wins:
    res = []
    for bpm in np.arange(132.0, 148.0, 0.005):
        s, ph = comb(bpm, env, a, b, nph=200)
        res.append((s, bpm, ph))
    res.sort(reverse=True)
    s, bpm, ph = res[0]
    print("   %3d-%3d s : %8.3f BPM  score %.5f  phase %.4f" % (a, b, bpm, s, ph))

print("\n=== whole-track best tempo (kick+hi) ===")
res = []
for bpm in np.arange(137.0, 142.0, 0.002):
    s, ph = comb(bpm, env, 5, dur - 3, nph=300)
    res.append((s, bpm, ph))
res.sort(reverse=True)
for s, bpm, ph in res[:6]:
    print("   %8.3f BPM  score %.6f  phase %.4f" % (bpm, s, ph))
GBPM, GPH = res[0][1], res[0][2]
print("   chosen %.3f BPM  period %.6f  phase %.4f" % (GBPM, 60 / GBPM, GPH))
