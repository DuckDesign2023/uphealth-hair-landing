# Split the men's before/after diptychs into left (before) and right (after) halves,
# trimming the central white divider. Mirrors _tools/split_ba.py but writes into men/assets.
from PIL import Image
import os

SRC = r"c:/Users/fartv/agents/Vibe-code_projects/mans-hair/hair-landing/_generated/men"
OUT = r"c:/Users/fartv/agents/Vibe-code_projects/mans-hair/hair-landing/men/assets"
GAP_FRAC = 0.012  # half-width of the central divider, as a fraction of full width

FILES = {
    "r1-hairline.png":   "m1",  # front hairline, M-shape, 34
    "r1-crown.png":      "m2",  # crown from above, 40
    "r2-overall.png":    "m3",  # diffuse thinning on top, 32
    "r2-crown45.png":    "m4",  # crown from above, 45
    "r3-crown31.png":    "m5",  # front spot, 31
    "r1-temples.png":    "m6",  # rejected: shaved design line
    "r2-temples.png":    "m7",  # rejected: shaved temple
    "r2-hairline.png":   "m8",  # rejected: wig effect
    "r3-hairline29.png": "m9",  # rejected: no readable difference
}

os.makedirs(OUT, exist_ok=True)
for name, key in FILES.items():
    path = os.path.join(SRC, name)
    if not os.path.exists(path):
        print("MISSING", name)
        continue
    im = Image.open(path).convert("RGB")
    w, h = im.size
    gap = int(w * GAP_FRAC)
    left = im.crop((0, 0, w // 2 - gap, h))
    right = im.crop((w // 2 + gap, 0, w, h))
    tw = min(left.width, right.width)
    left = left.crop((left.width - tw, 0, left.width, h))
    right = right.crop((0, 0, tw, h))

    # The widget shows these in a 1:1 box with object-fit:cover. Cropping to a square
    # here — anchored near the top — keeps the top of the head in frame; letting the
    # browser cover-crop a 2:3 half would slice the hairline off, which is the whole point.
    side = min(tw, h)
    top = int(h * 0.04)
    if top + side > h:
        top = h - side
    left = left.crop((0, top, side, top + side))
    right = right.crop((0, top, side, top + side))

    left.save(os.path.join(OUT, f"cmp-{key}-before.jpg"), quality=90)
    right.save(os.path.join(OUT, f"cmp-{key}-after.jpg"), quality=90)
    print(key, name, "->", side, "x", side)
