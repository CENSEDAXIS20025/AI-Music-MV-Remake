# ============================================================================
# occupancy.py -- per-segment map of where the film actually draws things.
#
# Divides the frame into cells and, for each segment, reports how often each
# cell contains *ink* (a pixel clearly brighter than its local background, or a
# panel fill) across that segment's stills. A cell that is empty in every still
# of every segment is a safe home for the chat window.
#
#   python tools/occupancy.py out/survey2
# ============================================================================
import sys, os, glob, re
from PIL import Image, ImageFilter

SEGS = [
    ("01 boot",      0.0,   14.37), ("02 rank",     14.37,  28.23),
    ("03 memory",   28.23,  40.77), ("04 table",    40.77,  54.35),
    ("05 eggplant", 54.35,  68.06), ("06 search1",  68.06,  82.68),
    ("07 cat",      82.68,  96.47), ("08 steak",    96.47, 109.50),
    ("09 flower",  109.50, 123.50), ("10 human",   123.50, 137.22),
    ("11 search2", 137.22, 151.67), ("12 typeahead",151.67, 165.53),
    ("13 love",    165.53, 179.60), ("14 embed",   179.60, 193.30),
    ("15 rapid",   193.30, 203.15), ("16 lostself",203.15, 207.23),
    ("17 buckets", 207.23, 221.03), ("18 tokens",  221.03, 233.80),
    ("19 callback",233.80, 261.21), ("20 search3", 261.21, 275.65),
    ("21 dogfruit",275.65, 287.33), ("22 outro",   287.33, 295.35),
]

def seg_of(t):
    for i, (n, a, b) in enumerate(SEGS):
        if a <= t < b: return i, n
    return len(SEGS) - 1, SEGS[-1][0]

def main():
    d = sys.argv[1] if len(sys.argv) > 1 else "out/survey2"
    cols, rows = 24, 14
    for a in sys.argv[2:]:
        if a.startswith("--cols="): cols = int(a.split("=")[1])
        if a.startswith("--rows="): rows = int(a.split("=")[1])
    files = sorted(glob.glob(os.path.join(d, "p_*.jpg")),
                   key=lambda s: float(re.findall(r"p_([\d_]+)\.jpg", s)[0].replace("_", ".")))
    if not files: print("no stills"); return

    # per segment: ink count per cell, and how many stills that segment had
    per = {}
    for f in files:
        t = float(re.findall(r"p_([\d_]+)\.jpg", f)[0].replace("_", "."))
        si, name = seg_of(t)
        im = Image.open(f).convert("L")
        W, H = im.size
        # local background = heavy blur; ink = pixel well above its neighbourhood
        bg = im.filter(ImageFilter.GaussianBlur(24))
        ip, bp = im.load(), bg.load()
        cells = per.setdefault(si, [[0] * cols for _ in range(rows)])
        cnt = per.setdefault(("n", si), 0)
        per[("n", si)] = cnt + 1
        for r in range(rows):
            y0, y1 = int(r * H / rows), int((r + 1) * H / rows)
            for c in range(cols):
                x0, x1 = int(c * W / cols), int((c + 1) * W / cols)
                ink = 0; tot = 0
                for y in range(y0, y1, 3):
                    for x in range(x0, x1, 3):
                        tot += 1
                        if ip[x, y] - bp[x, y] > 13: ink += 1
                cells[r][c] += ink / max(tot, 1)

    W, H = 1920, 1080
    print("=== ink fraction per cell (1.0 = this cell is busy in every still) ===")
    print("cell = %dx%d px" % (W // cols, H // rows))
    print("      " + "".join("%5d" % int((c + 0.5) * W / cols) for c in range(cols)))
    for si, (name, a, b) in enumerate(SEGS):
        if si not in per: continue
        n = per[("n", si)]
        cells = per[si]
        print("--- seg %s  (%d stills) ---" % (name, n))
        for r in range(rows):
            print("%4d  " % int((r + 0.5) * H / rows) +
                  "".join("%5.1f" % (cells[r][c] / n) for c in range(cols)))

    print()
    print("=== cells empty (ink < 0.02) in EVERY segment ===")
    tot = [[0.0] * cols for _ in range(rows)]
    worst = [[0.0] * cols for _ in range(rows)]
    for si in per:
        if not isinstance(si, int): continue
        n = per[("n", si)]
        for r in range(rows):
            for c in range(cols):
                v = per[si][r][c] / n
                tot[r][c] += v
                worst[r][c] = max(worst[r][c], v)
    nseg = sum(1 for k in per if isinstance(k, int))
    for r in range(rows):
        print("%4d  " % int((r + 0.5) * H / rows) +
              "".join("%5.2f" % worst[r][c] for c in range(cols)))
    print("(max ink fraction seen in that cell in ANY segment)")

if __name__ == "__main__":
    main()
