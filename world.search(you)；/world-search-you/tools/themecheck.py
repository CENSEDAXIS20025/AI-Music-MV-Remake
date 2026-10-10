import re, sys, os
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def blocks(p):
    s = open(p, encoding="utf-8", errors="replace").read()
    out = {}
    for m in re.finditer(r"/\* ==== (src/[^*]+?) ==== \*/\n(.*?)(?=\n;\n/\* ==== |\n</script>)", s, re.S):
        out[m.group(1)] = m.group(2)
    return out

for bundle in ["world.search(you).html", "world.search(you).light.html"]:
    b = blocks(bundle)
    stale = [k for k, v in b.items() if open(k, encoding="utf-8").read() != v]
    s = open(bundle, encoding="utf-8", errors="replace").read()
    flag = re.search(r'window\.WEM_THEME = "(\w+)"', s)
    print("%-32s scripts=%d stale=%s theme=%s lightclass=%s toggle=%s size=%.1fMB" % (
        bundle, len(b), stale or "none", flag.group(1) if flag else "?",
        'class="wem-light"' in s, "wem-theme" in s, os.path.getsize(bundle) / 1048576))
