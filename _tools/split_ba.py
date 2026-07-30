# Split before/after diptychs into left (before) and right (after) halves,
# trimming the central white gap.
from PIL import Image
import os

SRC = r"c:/Users/fartv/agents/Vibe-code_projects/mans-hair/hair-landing/assets"
FILES = {
    "ba-neat-parting.png": "p1",
    "ba-hairline.png": "p2",
    "ba-neat-temples.png": "p3",
    "ba-same-volume.png": "p4",
    "ba-same-ponytail.png": "p5",
    "ba-parting.png": "p6",
}
GAP_FRac = 0.012  # half-width of the central white divider, as fraction of width

for name, key in FILES.items():
    im = Image.open(os.path.join(SRC, name)).convert("RGB")
    w, h = im.size
    gap = int(w * GAP_FRac)
    left = im.crop((0, 0, w // 2 - gap, h))
    right = im.crop((w // 2 + gap, 0, w, h))
    # equalize widths
    tw = min(left.width, right.width)
    left = left.crop((left.width - tw, 0, left.width, h))
    right = right.crop((0, 0, tw, h))
    left.save(os.path.join(SRC, f"cmp-{key}-before.jpg"), quality=90)
    right.save(os.path.join(SRC, f"cmp-{key}-after.jpg"), quality=90)
    print(key, name, "->", tw, "x", h)
