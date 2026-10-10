# ============================================================================
# layout.py -- find where the film is empty, from the plain survey stills.
#
# A "panel" in this film is a dark rounded rect: rgb ~ (30,34,42) at ~0.94
# alpha over a near-black scene, i.e. dark, low-saturation, low-variance.
# The 3D cut-out window shows actual geometry, so it is brighter and busier.
# Both are detectable from a grey/variance map, which is what this prints.
#
#   python tools/layout.py out/survey2 [--cols=24 --rows=14]
# ============================================================================
import sys, os, glob
from PIL import Image

def load(path):
    return Image.open(path).convert("RGB")

def grid_stats(im, cols, rows):
    W, H = im.size
    g = im.convert("L")
    px = g.load()
    out = []
    for r in range(rows):
        row = []
        for c in range(cols):
            x0, x1 = int(c * W / cols), int((c + 1) * W / cols)
            y0, y1 = int(r * H / rows), int((r + 1) * H / rows)
            s = 0; n = 0; mx = 0
            for y in range(y0, y1, 2):
                for x in range(x0, x1, 2):
                    v = px[x, y]
                    s += v; n += 1
                    if v > mx: mx = v
            row.append((s / max(n, 1), mx))
            # (mean luma, peak luma)
        out.append(row)
    return out

def main():
    d = sys.argv[1] if len(sys.argv) > 1 else "out/survey2"
    cols = 24; rows = 14
    for a in sys.argv[2:]:
        if a.startswith("--cols="): cols = int(a.split("=")[1])
        if a.startswith("--rows="): rows = int(a.split("=")[1])
    files = sorted(glob.glob(os.path.join(d, "*.jpg")))
    if not files:
        print("no stills in", d); return
    # accumulate the "emptiness" of each cell across the whole film
    acc = [[0.0] * cols for _ in range(rows)]
    per = {}
    for f in files:
        im = load(f)
        st = grid_stats(im, cols, rows)
        per[os.path.basename(f)] = st
        for r in range(rows):
            for c in range(cols):
                acc[r][c] += st[r][c][0]
    for r in range(rows):
        for c in range(cols):
            acc[r][c] /= len(files)

    print("=== mean luma per cell, averaged over %d stills (1920x1080) ===" % len(files))
    W, H = 1920, 1080
    print("cell size = %dx%d px;  header row = x ranges" % (W // cols, H // rows))
    print("      " + "".join("%5d" % int((c + 0.5) * W / cols) for c in range(cols)))
    for r in range(rows):
        ys = int((r + 0.5) * H / rows)
        print("%4d  " % ys + "".join("%5.0f" % acc[r][c] for c in range(cols)))
    print()
    print("legend: number = mean luma 0-255 (lower = darker/emptier)")

    # per-still darkest column band, to see if one x-range works everywhere
    print()
    print("=== per still: darkest 3-cell-wide column band ===")
    for name in sorted(per, key=lambda s: int(s.split("_")[1].split(".")[0])):
        st = per[name]
        best = None
        for c in range(cols - 2):
            v = sum(st[r][c + k][0] for r in range(rows) for k in range(3)) / (3 * rows)
            if best is None or v < best[0]: best = (v, c)
        print("%-14s  x=%4d..%4d  mean %5.1f" % (
            name, int(best[1] * 1920 / cols), int((best[1] + 3) * 1920 / cols), best[0]))

if __name__ == "__main__":
    main()
