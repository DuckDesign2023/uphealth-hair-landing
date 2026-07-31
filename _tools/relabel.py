"""Replace the invented label on a pack shot with the real Supliful artwork.

Panels are found by colour and handled one bottle at a time, the front third of the
flat label is warped onto the cylinder, and the bottle's own shading is carried over
so the result still sits in the photograph.
"""
from PIL import Image, ImageFilter
import numpy as np, math

def panel_mask(img, grow=3):
    a = np.asarray(img.convert("RGB")).astype(int)
    r, g, b = a[...,0], a[...,1], a[...,2]
    m = (g > r + 4) & (r > 110) & (r < 215) & (g > 135) & (g < 225) & (abs(g - b) < 70)
    im = Image.fromarray((m * 255).astype(np.uint8))
    im = im.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))
    if grow:
        im = im.filter(ImageFilter.MaxFilter(grow * 2 + 1))   # cover the old panel's own edge
    return np.asarray(im) > 127

def components(m, min_area=4000):
    """Split the mask into bottles: label blobs separated by empty columns."""
    cols = m.sum(axis=0)
    xs = np.nonzero(cols > 0)[0]
    if not len(xs): return []
    groups = np.split(xs, np.where(np.diff(xs) > 12)[0] + 1)
    out = []
    for g in groups:
        x0, x1 = int(g[0]), int(g[-1]) + 1
        sub = m[:, x0:x1]
        ys = np.nonzero(sub.sum(axis=1) > 0.35 * sub.sum(axis=1).max())[0]
        if not len(ys): continue
        runs = np.split(ys, np.where(np.diff(ys) > 4)[0] + 1)
        run = max(runs, key=len)
        y0, y1 = int(run[0]), int(run[-1]) + 1
        if (x1 - x0) * (y1 - y0) >= min_area:
            out.append((x0, x1, y0, y1))
    return out


def smooth_edges(raw, win=41):
    """A frosted bottle makes the colour mask ragged. Take the median of each edge over a
    window of rows, so the panel keeps the smooth silhouette it has in the photograph."""
    ls = np.array([l if l is not None else np.nan for l, _ in raw], float)
    rs = np.array([r if r is not None else np.nan for _, r in raw], float)
    def fill(v):
        idx = np.arange(len(v))
        ok = ~np.isnan(v)
        if ok.sum() < 2: return v
        return np.interp(idx, idx[ok], v[ok])
    ls, rs = fill(ls), fill(rs)
    half = win // 2
    out = []
    for i in range(len(ls)):
        a, b = max(0, i - half), min(len(ls), i + half + 1)
        # envelope, not median: the new label has to cover every remnant of the old panel,
        # otherwise the leftovers show as teeth along the edge
        out.append((int(round(np.percentile(ls[a:b], 12))),
                    int(round(np.percentile(rs[a:b], 88)))))
    return out

def relabel(pack, label_png, out, frac=0.34, theta_deg=70, shade=(0.86, 1.10), rects=None):
    base = Image.open(pack).convert("RGB")
    A = np.asarray(base).astype(float)
    m = panel_mask(base)
    L = np.asarray(base.convert("L")
                   .filter(ImageFilter.MedianFilter(21))
                   .filter(ImageFilter.GaussianBlur(7))).astype(float)

    lab = Image.open(label_png).convert("RGB")
    lw, lh = lab.size
    half = int(lw * frac / 2)
    face_src = lab.crop((lw//2 - half, 0, lw//2 + half, lh))

    out_a = A.copy()
    done = []
    # On frosted glass the sage panel blends into the liquid and the colour mask frays.
    # Where that happens the caller passes the panel rectangle straight in.
    for (x0, x1, y0, y1) in (rects if rects else components(m)):
        if rects:
            ext = [(x0, x1) for _ in range(y0, y1)]
        else:
            raw = []
            for y in range(y0, y1):
                xr = np.nonzero(m[y, x0:x1])[0]
                raw.append((int(xr.min()) + x0, int(xr.max()) + x0) if len(xr) else (None, None))
            ext = smooth_edges(raw)
        widths = [r - l for l, r in ext if r > l]
        if not widths: continue
        maxw = max(widths)
        bh = min(int(face_src.height * (maxw / face_src.width)), y1 - y0)
        face = face_src.resize((maxw, bh), Image.LANCZOS)
        T = np.asarray(face).astype(float)
        top = y0 + ((y1 - y0) - bh) // 2
        ref = float(np.median([L[y, (l + r)//2] for y, (l, r) in zip(range(y0, y1), ext) if r > l]))
        tr = math.radians(theta_deg)

        for y in range(y0, y1):
            l, r = ext[y - y0]
            if r <= l: continue
            cx, hw = (l + r) / 2, (r - l) / 2
            v = int(np.clip(y - top, 0, bh - 1))
            for x in range(l, r + 1):
                xn = np.clip((x - cx) / hw, -1, 1)
                u = math.asin(xn * math.sin(tr)) / tr
                tx = int(np.clip((u + 1) / 2 * (maxw - 1), 0, maxw - 1))
                f = float(np.clip(L[y, x] / ref, *shade))
                edge = min(1.0, (x - l + 1) / 3.0, (r - x + 1) / 3.0)
                out_a[y, x] = np.clip(T[v, tx] * f * edge + A[y, x] * (1 - edge), 0, 255)
        done.append((x0, x1, y0, y1, maxw, bh))

    Image.fromarray(out_a.astype(np.uint8)).save(out)
    return done

if __name__ == "__main__":
    import sys
    for r in relabel(*sys.argv[1:4]):
        print("  panel", r)
