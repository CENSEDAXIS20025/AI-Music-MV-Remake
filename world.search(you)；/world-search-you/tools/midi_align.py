# -*- coding: utf-8 -*-
"""Decide the true tempo by aligning MIDI note onsets to the audio onset envelope."""
import os, sys, subprocess
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analyze import parse_midi, build_tempo_map  # noqa

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "assets", "analysis")
FFMPEG = r"D:\UsersApps\FormatFactory\ffmpeg.exe"
SR, FPS, HOP, NFFT = 44100, 60, 735, 2048

RAW = os.path.join(OUT, "_a.raw")
subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", "-i",
                os.path.join(ROOT, "assets", "audio", "world-execute-me.mp3"),
                "-f", "s16le", "-ac", "1", "-ar", str(SR), RAW], check=True)
mono = np.fromfile(RAW, dtype="<i2").astype(np.float32) / 32768.0
os.remove(RAW)

n_frames = 1 + (len(mono) - NFFT) // HOP
idx = np.arange(NFFT)[None, :] + HOP * np.arange(n_frames)[:, None]
spec = np.abs(np.fft.rfft(mono[idx] * np.hanning(NFFT).astype(np.float32), axis=1))
mel = np.log1p(spec * 20.0)
flux = np.zeros(n_frames); d = np.diff(mel, axis=0); flux[1:] = np.maximum(d, 0).sum(axis=1)
trend = np.convolve(flux, np.ones(31) / 31, mode="same")
onset = np.maximum(flux - trend, 0); onset /= onset.max()
# upsample onset to 1000 Hz for tolerance-window scoring
up = np.interp(np.arange(0, n_frames, 1 / (1000 / FPS)), np.arange(n_frames), onset)
UPHZ = 1000

fmt, div, tempos, notes, tracks = parse_midi(os.path.join(ROOT, "assets", "audio", "world-execute-me.mid"))
ticks = np.array([n["tk"] for n in notes], dtype=np.float64)
print("notes:", len(ticks), "tick range", ticks.min(), ticks.max())

# windowed score: mean onset energy within +-25 ms of each note onset
HALF = 25


def score(bpm, offset):
    t = offset + ticks * (60.0 / bpm / div)
    i = np.round(t * UPHZ).astype(int)
    acc = np.zeros(len(i))
    for k in range(-HALF, HALF + 1):
        j = np.clip(i + k, 0, len(up) - 1)
        acc += up[j]
    return float(acc.mean()), t[-1]


print("\n=== coarse tempo x offset search ===")
best = (-1, 0, 0)
for bpm in np.arange(110, 152, 0.5):
    for off in np.arange(0, 0.5, 0.01):
        s, _ = score(bpm, off)
        if s > best[0]:
            best = (s, bpm, off)
print("coarse best: score=%.5f bpm=%.2f offset=%.3f" % best)

s0, b0, o0 = best
for bpm in np.arange(b0 - 1, b0 + 1, 0.02):
    for off in np.arange(max(0, o0 - 0.03), o0 + 0.03, 0.002):
        s, _ = score(bpm, off)
        if s > best[0]:
            best = (s, bpm, off)
print("fine   best: score=%.5f bpm=%.4f offset=%.4f" % best)

# compare with the two MIDI tempo candidates, optimising offset only
for bpm in (120.0, 125.0, 130.0, best[1]):
    bb = (-1, 0)
    for off in np.arange(0, 1.0, 0.002):
        s, _ = score(bpm, off)
        if s > bb[0]:
            bb = (s, off)
    print("   %8.3f BPM -> best score %.5f at offset %.3f (last note at %.2f s)" % (bpm, bb[0], bb[1], score(bpm, bb[1])[1]))

# how the alignment degrades over time for each hypothesis
print("\n=== mean onset score per 20 s window (offset-optimised globally) ===")
for bpm in (120.0, 125.0, 130.0, round(float(best[1]), 2)):
    bb = (-1, 0)
    for off in np.arange(0, 1.0, 0.002):
        s, _ = score(bpm, off)
        if s > bb[0]:
            bb = (s, off)
    t = bb[1] + ticks * (60.0 / bpm / div)
    row = []
    for w in range(0, 220, 20):
        sel = (t >= w) & (t < w + 20)
        if sel.sum() < 3:
            row.append("  --  ")
            continue
        s, _ = score(bpm, bb[1])
        i = np.round(t[sel] * UPHZ).astype(int)
        acc = np.zeros(len(i))
        for k in range(-HALF, HALF + 1):
            acc += up[np.clip(i + k, 0, len(up) - 1)]
        row.append("%6.3f" % (acc.mean() / (2 * HALF + 1)))
    print("  %7.2f BPM " % bpm + " ".join(row))
