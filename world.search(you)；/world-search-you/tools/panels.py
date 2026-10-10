# ============================================================================
# panels.py -- locate the dark HUD panel rectangles in a still.
#
# Every panel in this film is the same fill: rgba(13,16,21,0.94)-ish over a
# dark scene, i.e. a very dark, very low-variance, low-saturation region with
# a faint 1px border. This finds the runs of such pixels along a few probe
# scanlines and prints the x-intervals, so the chat window can be placed from
# measured geometry instead of eyeballed screenshots.
#
#   python tools/panels.py out/survey2/p_46.jpg [y1,y2,...]
# ============================================================================
import sys
from PIL import Image

def runs(flags, minlen=40):
    out = []
    s = None
    for i, v in enumerate(flags):
        if v and s is None: s = i
        elif not v and s is not None:
            if i - s >= minlen: out.append((s, i - 1))
            s = None
    if s is not None and len(flags) - s >= minlen: out.append((s, len(flags) - 1))
    return out

def main():
    f = sys.argv[1]
    ys = [int(v) for v in sys.argv[2].split(",")] if len(sys.argv) > 2 else [200, 300, 400, 500, 600, 700, 800, 900]
    im = Image.open(f).convert("RGB")
    W, H = im.size
    px = im.load()

    print("%s  %dx%d" % (f, W, H))
    print("column profile: for each x, mean luma over y=60..1010")
    prof = []
    for x in range(W):
        s = 0; n = 0
        for y in range(60, 1010, 4):
            r, g, b = px[x, y]
            s += (r * 299 + g * 587 + b * 114) // 1000; n += 1
        prof.append(s / n)
    # print a coarse profile every 40 px
    print("   x : " + "".join("%5d" % x for x in range(0, W, 80)))
    print(" luma: " + "".join("%5.0f" % prof[x] for x in range(0, W, 80)))

    print()
    for y in ys:
        row = []
        for x in range(W):
            r, g, b = px[x, y]
            luma = (r * 299 + g * 587 + b * 114) // 1000
            # panel interior: dark and desaturated
            mx, mn = max(r, g, b), min(r, g, b)
            row.append(luma < 46 and (mx - mn) < 26)
        print("y=%4d  dark-flat runs: %s" % (y, runs(row)))

if __name__ == "__main__":
    main()
