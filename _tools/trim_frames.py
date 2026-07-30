# Trim scanned-slide borders that soul_2 sometimes draws around a photo:
# dark bars, film rebate, sprocket marks. Eats edge rows/columns that are much
# darker than the frame median or nearly flat, capped at 15% per side so a
# legitimately dark edge can never swallow the picture.
from PIL import Image, ImageStat
import sys, os

MAX_EAT = 0.15      # never remove more than this share of a side
DARK_RATIO = 0.62   # edge line counts as border below this share of median luma
FLAT_STD = 11       # ...or if it is this flat (a solid bar)

def luma_stats(im, box):
    st = ImageStat.Stat(im.crop(box).convert("L"))
    return st.mean[0], st.stddev[0]

def trim(path, out=None):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    med = ImageStat.Stat(im.convert("L")).median[0]
    lim_x, lim_y = int(w * MAX_EAT), int(h * MAX_EAT)

    left = 0
    while left < lim_x:
        m, s = luma_stats(im, (left, 0, left + 1, h))
        if m < med * DARK_RATIO or s < FLAT_STD:
            left += 1
        else:
            break
    right = w
    while w - right < lim_x:
        m, s = luma_stats(im, (right - 1, 0, right, h))
        if m < med * DARK_RATIO or s < FLAT_STD:
            right -= 1
        else:
            break
    top = 0
    while top < lim_y:
        m, s = luma_stats(im, (0, top, w, top + 1))
        if m < med * DARK_RATIO or s < FLAT_STD:
            top += 1
        else:
            break
    bottom = h
    while h - bottom < lim_y:
        m, s = luma_stats(im, (0, bottom - 1, w, bottom))
        if m < med * DARK_RATIO or s < FLAT_STD:
            bottom -= 1
        else:
            break

    im = im.crop((left, top, right, bottom))
    im.save(out or path)
    print(os.path.basename(path), "->", im.size, f"(cut L{left} T{top} R{w-right} B{h-bottom})")

if __name__ == "__main__":
    for p in sys.argv[1:]:
        trim(p)
