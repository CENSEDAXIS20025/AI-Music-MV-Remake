# -*- coding: utf-8 -*-
"""Tempo + beat-phase search for world.search(you);.

Nothing is assumed: the tempo comes from the onset envelope's autocorrelation
plus a grid score over the whole track, and the phase is then refined on the
kick and hi bands separately. Prints everything so the numbers baked into
analyze.py can be justified.
"""
import os
import subprocess
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "assets", "analysis")
FFMPEG = r"D:\UsersApps\FormatFactory\ffmpeg.exe"
SR, FPS, HOP, NFFT = 44100, 60, 735, 2048
U = 1000.0   # upsampled envelope rate (Hz)

os.makedirs(OUT, exist_ok=True)
RAW = os.path.join(OUT, "_ts.raw")
subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", "-i",
                os.path.join(ROOT, "assets", "audio", "world-search-you.mp3"),
                "-f", "s16le", "-ac", "1", "-ar", str(SR), RAW], check=True)
mono = np.fromfile(RAW, dtype="<i2").astype(np.float32) / 32768.0
os.remove(RAW)
dur = len(mono) / SR
print("duration = %.3f s" % dur)

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
    f = np.maximum(f, 0)
    return f / max(f.max(), 1e-9)


kick = band_flux(30, 160)
hi = band_flux(3000, 12000)
full = band_flux(40, 16000)
onset = full

up_k = np.interp(np.arange(0, n, FPS / U), np.arange(n), kick)
up_h = np.interp(np.arange(0, n, FPS / U), np.arange(n), hi)
up_f = np.interp(np.arange(0, n, FPS / U), np.arange(n), full)

# ---- global autocorrelation over a few representative spans ----
print("\n=== autocorrelation peaks ===")
for label, a, b in [("00-40", 0, 40), ("40-120", 40, 120), ("120-200", 120, 200),
                    ("200-260", 200, 260), ("whole", 3, dur - 3)]:
    seg = up_f[int(a * U):int(b * U)].copy()
    seg = seg - seg.mean()
    ac = np.correlate(seg, seg, mode="full")[len(seg) - 1:]
    ac /= max(ac[0], 1e-9)
    lo, hi_l = int(60 / 220 * U), int(60 / 50 * U)
    peaks = []
    for lag in range(lo, hi_l):
        if ac[lag] > ac[lag - 1] and ac[lag] >= ac[lag + 1]:
            peaks.append((float(ac[lag]), 60.0 * U / lag))
    peaks.sort(reverse=True)
    print("  %-9s " % label + "  ".join("%.2f(%.3f)" % (bpm, v) for v, bpm in peaks[:5]))


def grid_score(bpm, env, a=0.0, b=None, nph=400):
    per = 60.0 / bpm
    b = dur if b is None else b
    best = (-1, 0)
    for ph in np.arange(a, a + per, per / nph):
        t = np.arange(ph, b, per) * U
        i = np.round(t).astype(int)
        i = i[i < len(env)]
        if len(i) < 8:
            continue
        s = env[i].mean()
        if s > best[0]:
            best = (s, ph % per)
    return best


print("\n=== whole-track grid score, 50-220 BPM (coarse) ===")
res = []
for bpm in np.arange(50, 220, 0.1):
    s, ph = grid_score(bpm, up_f)
    res.append((s, round(bpm, 2), ph))
res.sort(reverse=True)
for s, bpm, ph in res[:16]:
    print("   %7.2f BPM  score %.5f  phase %.4f" % (bpm, s, ph))

# ---- refine the winner and its metrical relatives ----
print("\n=== refine candidates ===")
cands = sorted(set([b for _, b, _ in res[:6]] + [b / 2 for _, b, _ in res[:6]] + [b * 2 for _, b, _ in res[:6]]))
cands = [c for c in cands if 40 < c < 260]
finals = []
for bpm in cands:
    best = (-1, 0)
    for d in np.arange(-0.6, 0.6, 0.01):
        s, ph = grid_score(bpm + d, up_f)
        if s > best[0]:
            best = (s, ph, bpm + d)
    finals.append((best[0], best[2], best[1]))
finals.sort(reverse=True)
for s, bpm, ph in finals[:10]:
    print("   %8.3f BPM  score %.5f  phase %.4f" % (bpm, s, ph))

BPM = finals[0][1]
PER = 60.0 / BPM


def phase_score(env, bpm, halfwin=18):
    per = 60.0 / bpm
    best = (-1, 0)
    for ph in np.arange(0, per, 0.001):
        t = np.arange(ph, len(env) / U, per) * U
        i = np.round(t).astype(int)
        i = i[i < len(env)]
        acc = np.zeros(len(i))
        for k in range(-halfwin, halfwin + 1):
            acc += env[np.clip(i + k, 0, len(env) - 1)]
        s = acc.mean() / (2 * halfwin + 1)
        if s > best[0]:
            best = (s, ph)
    return best


print("\n=== beat phase @ %.3f BPM ===" % BPM)
sk = phase_score(up_k, BPM)
sh = phase_score(up_h, BPM)
sf = phase_score(up_f, BPM)
print("   kick %.4f (%.5f)   hi %.4f (%.5f)   full %.4f (%.5f)" % (sk[1], sk[0], sh[1], sh[0], sf[1], sf[0]))
PHASE = sk[1]
if abs(sh[1] - sk[1]) < 0.06:
    PHASE = 0.5 * (sk[1] + sh[1])
print("   chosen phase %.4f" % PHASE)

print("\n=== downbeat phase (bar starts) ===")
comb = 0.55 * up_k + 0.45 * up_h
bests = []
for ph in np.arange(0, PER, 0.002):
    t = np.arange(ph, len(comb) / U, PER * 4) * U
    i = np.round(t).astype(int)
    i = i[i < len(comb)]
    acc = np.zeros(len(i))
    for k in range(-25, 26):
        acc += comb[np.clip(i + k, 0, len(comb) - 1)]
    bests.append((acc.mean() / 51, ph))
bests.sort(reverse=True)
for s, ph in bests[:6]:
    print("   bar-phase %.3f s  score %.5f" % (ph, s))
BARPH = bests[0][1]

# ---- energy / structure overview: is the grid musically right? ----
print("\n=== 8 s window RMS (structure) ===")
step = int(8 * SR)
for a in range(0, int(dur), 8):
    seg = mono[a * SR:(a + 8) * SR]
    if len(seg) == 0:
        break
    print("   %6.1f s  rms %.4f" % (a, float(np.sqrt(np.mean(seg ** 2)))))
