# Split UGC-style before/after diptychs.
# Unlike the studio batch these come back with slide borders and the white divider
# is not exactly centred, so: trim the border, FIND the divider, then cut on it.
from PIL import Image
import numpy as np
import sys, os

OUT = r"c:/Users/fartv/agents/Vibe-code_projects/mans-hair/hair-landing/men/assets"

def trim_border(a):
    """Drop dark/flat edge bands (film rebate, black bars, caption strips)."""
    g = a.mean(axis=2)
    med = np.median(g)
    h, w = g.shape
    lim_y, lim_x = int(h * 0.18), int(w * 0.18)

    def scan(vals, limit):
        i = 0
        while i < limit and (vals[i].mean() < med * 0.55 or vals[i].std() < 10):
            i += 1
        return i

    top = scan([g[i] for i in range(lim_y)], lim_y)
    bottom = h - scan([g[h - 1 - i] for i in range(lim_y)], lim_y)
    left = scan([g[:, i] for i in range(lim_x)], lim_x)
    right = w - scan([g[:, w - 1 - i] for i in range(lim_x)], lim_x)
    return a[top:bottom, left:right]

def find_divider(a):
    """Brightest, flattest column in the middle third = the white gap."""
    g = a.mean(axis=2)
    h, w = g.shape
    lo, hi = int(w * 0.38), int(w * 0.62)
    score = [(g[:, x].mean() - g[:, x].std(), x) for x in range(lo, hi)]
    return max(score)[1]

def split(src, key, gap_frac=0.010, top_frac=0.02):
    im = Image.open(src).convert("RGB")
    a = trim_border(np.asarray(im))
    x = find_divider(a)
    h, w = a.shape[:2]
    gap = int(w * gap_frac)

    left = Image.fromarray(a[:, :max(0, x - gap)])
    right = Image.fromarray(a[:, min(w, x + gap):])
    tw = min(left.width, right.width)
    left = left.crop((left.width - tw, 0, left.width, h))
    right = right.crop((0, 0, tw, h))

    side = min(tw, h)
    top = int(h * top_frac)
    if top + side > h:
        top = h - side
    left = left.crop((0, top, side, top + side))
    right = right.crop((0, top, side, top + side))

    left.save(os.path.join(OUT, f"cmp-{key}-before.jpg"), quality=90)
    right.save(os.path.join(OUT, f"cmp-{key}-after.jpg"), quality=90)
    print(key, os.path.basename(src), "->", side, "px, divider at", x, "of", w)

if __name__ == "__main__":
    JOBS = [("u1-crown-sofa.png", "u1"), ("u2-hairline-selfie.png", "u2")]
    src_dir = r"c:/Users/fartv/agents/Vibe-code_projects/mans-hair/hair-landing/_generated/men"
    for f, k in JOBS:
        split(os.path.join(src_dir, f), k)
