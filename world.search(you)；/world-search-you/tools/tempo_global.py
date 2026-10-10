# -*- coding: utf-8 -*-
"""Global tempo: fine sweep + folded-average sharpness, plus named candidates."""
import os
import subprocess
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "assets", "analysis")
FFMPEG = r"D:\UsersApps\FormatFactory\ffmpeg.exe"
SR, FPS, HOP, NFFT = 44100, 60, 735, 2048
U = 1000.0

RAW = os.path.join(OUT, "_g.raw")
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

A, B = 5.0, dur - 3.0
ia, ib = int(A * U), int(B * U)


def score(bpm, phase):
    per = 60.0 / bpm
    t = np.arange(A + phase, B, per) * U
    i = np.round(t).astype(int)
    i = i[(i >= ia) & (i < ib)]
    return env[i].mean(), len(i)


def best_phase(bpm, step=0.001):
    per = 60.0 / bpm
    bg = (-1, 0)
    for ph in np.arange(0, per, step):
        s, c = score(bpm, ph)
        if s > bg[0]:
            bg = (s, ph)
    return bg


print("=== named candidates (whole track, phase optimised) ===")
for bpm in [138.000, 138.500, 139.000, 139.200, 139.500, 140.000, 140.100, 140.500, 141.000, 70.05, 69.6]:
    s, ph = best_phase(bpm)
    print("   %8.3f BPM  phase %.4f  comb %.6f" % (bpm, ph, s))

print("\n=== fine sweep 137.5-142.5 (0.002) ===")
res = []
for bpm in np.arange(137.5, 142.5, 0.002):
    s, ph = best_phase(bpm, 0.004)
    res.append((s, bpm, ph))
res.sort(reverse=True)
for s, bpm, ph in res[:14]:
    print("   %8.3f BPM  comb %.6f  phase %.4f" % (bpm, s, ph))

GB = res[0][1]
s, ph = best_phase(GB)
print("\nchosen %.3f BPM period %.6f phase %.5f comb %.6f" % (GB, 60 / GB, ph, s))

# ---- folded average sharpness (independent metric) ----
print("\n=== folded-average peakiness (0-295 s) ===")
seg = env[ia:ib]
for bpm in [138.0, 139.0, 139.2, 139.5, 139.9, 140.0, 140.1]:
    per = 60.0 / bpm
    nb = int(per * U)
    m = (len(seg) // nb) * nb
    fold = seg[:m].reshape(-1, nb).mean(axis=0)
    print("   %8.3f BPM  peak/mean %.4f  argmax %.4f" % (bpm, fold.max() / max(fold.mean(), 1e-9), np.argmax(fold) / U))

# ---- drift: best phase inside 30 s windows, expressed in beats ----
print("\n=== local phase drift (30 s windows) ===")
per = 60.0 / GB
for a in range(10, int(dur) - 40, 30):
    b = a + 30
    bg = (-1, 0)
    for ph in np.arange(0, per, 0.002):
        t = np.arange(a + ph, b, per) * U
        i = np.round(t).astype(int)
        i = i[(i >= int(a * U)) & (i < int(b * U))]
        if len(i) < 8:
            continue
        v = env[i].mean()
        if v > bg[0]:
            bg = (v, a + ph)
    k = (bg[1] - ph) / per
    print("   %3d-%3d s  first beat %.3f  beat# %.2f  frac %.3f  comb %.5f" %
          (a, b, bg[1], k, k - round(k), bg[0]))
