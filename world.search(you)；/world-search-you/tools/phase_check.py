# -*- coding: utf-8 -*-
"""Refine beat & downbeat phase at 130 BPM using low-band (kick) and high-band (snare/hat) flux."""
import os, subprocess
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "assets", "analysis")
FFMPEG = r"D:\UsersApps\FormatFactory\ffmpeg.exe"
SR, FPS, HOP, NFFT = 44100, 60, 735, 2048
BPM = 130.0
PER = 60.0 / BPM

RAW = os.path.join(OUT, "_p.raw")
subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", "-i",
                os.path.join(ROOT, "assets", "audio", "world-execute-me.mp3"),
                "-f", "s16le", "-ac", "1", "-ar", str(SR), RAW], check=True)
mono = np.fromfile(RAW, dtype="<i2").astype(np.float32) / 32768.0
os.remove(RAW)
n = 1 + (len(mono) - NFFT) // HOP
idx = np.arange(NFFT)[None, :] + HOP * np.arange(n)[:, None]
spec = np.abs(np.fft.rfft(mono[idx] * np.hanning(NFFT).astype(np.float32), axis=1))
freqs = np.fft.rfftfreq(NFFT, 1 / SR)
lo_sel = (freqs >= 30) & (freqs <= 160)
hi_sel = (freqs >= 3000) & (freqs <= 12000)


def band_flux(sel):
    m = np.log1p(spec[:, sel] * 20.0)
    d = np.diff(m, axis=0)
    f = np.zeros(n); f[1:] = np.maximum(d, 0).sum(axis=1)
    f = f - np.convolve(f, np.ones(21) / 21, mode="same")
    f = np.maximum(f, 0)
    return f / max(f.max(), 1e-9)


kick, hi = band_flux(lo_sel), band_flux(hi_sel)
U = 1000.0
up_k = np.interp(np.arange(0, n, FPS / U), np.arange(n), kick)
up_h = np.interp(np.arange(0, n, FPS / U), np.arange(n), hi)


def phase_score(env, bpm, step_ms=1, halfwin=18):
    per = 60.0 / bpm
    best = (-1, 0)
    for ph in np.arange(0, per, step_ms / 1000.0):
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


sk = phase_score(up_k, BPM)
sh = phase_score(up_h, BPM)
print("=== beat phase @130 BPM (window +-18 ms) ===")
print("  kick-band phase : %.4f s  score %.5f" % (sk[1], sk[0]))
print("  hi-band   phase : %.4f s  score %.5f" % (sh[1], sh[0]))

# also try 65 BPM (half) and 260 (double) for sanity
for b in (65.0, 260.0):
    a = phase_score(up_k, b); c = phase_score(up_h, b)
    print("  @%.0f BPM kick %.4f (%.5f)  hi %.4f (%.5f)" % (b, a[1], a[0], c[1], c[0]))

print("\n=== downbeat phase test: score the 4 bar-phase candidates with kick+snare ===")
comb = 0.55 * up_k + 0.45 * up_h
bests = []
for ph in np.arange(0, PER, 0.002):
    t = np.arange(ph, len(comb) / U, PER * 4) * U
    i = np.round(t).astype(int); i = i[i < len(comb)]
    acc = np.zeros(len(i))
    for k in range(-25, 26):
        acc += comb[np.clip(i + k, 0, len(comb) - 1)]
    bests.append((acc.mean() / 51, ph))
bests.sort(reverse=True)
for s, ph in bests[:6]:
    print("   bar-phase %.3f s  score %.5f   (bar k starts: %.3f, %.3f, %.3f ...)" %
          (ph, s, ph, ph + PER * 4, ph + PER * 8))

# ---- structural markers from LRC vs grid ----
import json
meta = json.load(open(os.path.join(OUT, "meta.json"), encoding="utf-8"))
lines = [l for l in meta["lrc"] if not l.get("meta")]
print("\n=== lyric onsets mapped to nearest beat (phase %.4f) ===" % sk[1])
for l in lines[:24]:
    k = round((l["t"] - sk[1]) / PER)
    print("   %7.3f s  beat %4d  err %+0.3f   %s" % (l["t"], k, l["t"] - (sk[1] + k * PER), l["text"][:34]))
