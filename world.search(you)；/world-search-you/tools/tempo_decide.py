# -*- coding: utf-8 -*-
"""Decide the true beat level for world.search(you);.

Octave errors (70 vs 140) cannot be settled by lyric spacing alone, so this
script (a) histograms inter-onset intervals of detected peaks, (b) measures the
onset energy at each slot of the candidate grids separately, and (c) scores
candidate grids against the LRC line onsets.
"""
import json
import os
import subprocess
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "assets", "analysis")
FFMPEG = r"D:\UsersApps\FormatFactory\ffmpeg.exe"
SR, FPS, HOP, NFFT = 44100, 60, 735, 2048
U = 1000.0

RAW = os.path.join(OUT, "_d.raw")
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
    f = np.maximum(f, 0)
    return f / max(f.max(), 1e-9)


kick = band_flux(30, 160)
snare = band_flux(200, 900)
hi = band_flux(3000, 12000)
full = band_flux(40, 16000)


def up(e):
    return np.interp(np.arange(0, n, FPS / U), np.arange(n), e)


uk, us, uh, uf = up(kick), up(snare), up(hi), up(full)

# ---------------------------------------------------------------- IOIs ----
print("=== inter-onset intervals (peak picking on the full-band envelope) ===")
thr = uf.mean() + 1.0 * uf.std()
pk = []
minsep = int(0.08 * U)
i = 0
while i < len(uf):
    if uf[i] > thr:
        j = i
        while j < len(uf) and uf[j] > thr * 0.6:
            j += 1
        seg = uf[i:j]
        pk.append((i + int(np.argmax(seg))) / U)
        i = j + minsep
    else:
        i += 1
print("   peaks: %d" % len(pk))
d = np.diff(pk)
d = d[(d > 0.08) & (d < 2.0)]
hist, edges = np.histogram(d, bins=np.arange(0.08, 2.0, 0.02))
order = np.argsort(hist)[::-1]
for k in order[:18]:
    print("   %.2f-%.2f s : %d" % (edges[k], edges[k + 1], hist[k]))
print("   median IOI %.4f s -> %.2f BPM (if it is the beat)" % (np.median(d), 60 / np.median(d)))
print("   median IOI*2 %.4f s -> %.2f BPM (if it is a half beat)" % (2 * np.median(d), 60 / (2 * np.median(d))))

# ------------------------------------------------- per-slot onset energy ----
print("\n=== onset energy per beat slot (candidate grids) ===")


def slot_profile(bpm, phase, env):
    per = 60.0 / bpm
    t = np.arange(phase, dur, per) * U
    i = np.round(t).astype(int)
    i = i[i < len(env)]
    # local max within +-25 ms so a small phase error does not zero the reading
    w = int(0.025 * U)
    v = np.array([env[max(0, k - w):k + w + 1].max() for k in i])
    return v


for bpm, ph in [(70.05, 0.381), (140.1, 0.381), (139.2, 0.381), (93.13, 0.211)]:
    v = slot_profile(bpm, ph, uf)
    v = v / max(v.max(), 1e-9)
    per = 60.0 / bpm
    # group into 4 slots
    g = [v[k::4].mean() for k in range(4)]
    print("   %7.2f BPM  mean %.4f  quartiles %.3f %.3f %.3f %.3f" %
          (bpm, v.mean(), g[0], g[1], g[2], g[3]))

# ------------------------------------------------- LRC alignment ----
meta_lrc = []
with open(os.path.join(ROOT, "assets", "audio", "world-search-you.lrc"), encoding="utf-8") as f:
    for raw in f:
        raw = raw.strip()
        if not raw.startswith("["):
            continue
        ts, text = raw[1:].split("]", 1)
        if not text.strip():
            continue
        mm, rest = ts.split(":")
        ss, _, frac = rest.partition(".")
        t = int(mm) * 60 + int(ss) + int(frac.ljust(3, "0")[:3]) / 1000.0
        meta_lrc.append(t)
meta_lrc = np.array(sorted(meta_lrc))
print("\n=== LRC onsets: %d lines ===" % len(meta_lrc))
print("   consecutive gaps: median %.3f  min %.3f  max %.3f" %
      (np.median(np.diff(meta_lrc)), np.diff(meta_lrc).min(), np.diff(meta_lrc).max()))


def lrc_score(bpm, phase):
    per = 60.0 / bpm
    k = np.round((meta_lrc - phase) / per)
    err = meta_lrc - (phase + k * per)
    return float(np.exp(-(err / 0.06) ** 2).mean()), float(np.abs(err).mean()), float(np.abs(err).max())


print("\n=== LRC-vs-grid score for candidate tempos (phase swept) ===")
for bpm in [69.6, 70.05, 92.6, 93.13, 139.2, 140.1, 130.0, 120.0]:
    per = 60.0 / bpm
    best = (-1, 0)
    for ph in np.arange(0, per, 0.002):
        s, m, mx = lrc_score(bpm, ph)
        if s > best[0]:
            best = (s, ph, m, mx)
    print("   %7.2f BPM  align %.3f  phase %.3f  meanerr %.3f  maxerr %.3f" %
          (bpm, best[0], best[1], best[2], best[3]))

# ------------------------------------------------- structure by bar ----
print("\n=== fine tempo sweep around 139 BPM using lyric alignment ===")
best = (-1,)
for bpm in np.arange(136.0, 143.0, 0.02):
    per = 60.0 / bpm
    for ph in np.arange(0, per, 0.002):
        s, m, mx = lrc_score(bpm, ph)
        if s > best[0]:
            best = (s, bpm, ph, m, mx)
print("   best %.3f BPM phase %.3f  align %.3f meanerr %.3f maxerr %.3f" % (best[1], best[2], best[0], best[3], best[4]))
BEST140 = best

print("\n=== fine tempo sweep around 70 BPM using lyric alignment ===")
best = (-1,)
for bpm in np.arange(68.0, 72.0, 0.01):
    per = 60.0 / bpm
    for ph in np.arange(0, per, 0.002):
        s, m, mx = lrc_score(bpm, ph)
        if s > best[0]:
            best = (s, bpm, ph, m, mx)
print("   best %.3f BPM phase %.3f  align %.3f meanerr %.3f maxerr %.3f" % (best[1], best[2], best[0], best[3], best[4]))

print("\n=== per-line grid error at 139.2 BPM phase %.3f ===" % BEST140[2])
per = 60.0 / BEST140[1]
for t in meta_lrc:
    k = round((t - BEST140[2]) / per)
    print("   %7.2f  beat %4d  err %+0.3f" % (t, k, t - (BEST140[2] + k * per)))
