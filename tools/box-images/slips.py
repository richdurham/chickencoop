"""Draw Katie's two command-code slips as background-free photos of paper.
Writes demo/box/cut/<id>.webp and demo/box/cut/thumb/<id>.webp.
Usage: python slips.py <font.ttf> <repo>"""
import math, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT, REPO = sys.argv[1], sys.argv[2]
S = 2  # drawn at twice the size, then reduced, for smooth edges


def torn(a, b, rng, rough=5.0, step=5):
    """Points along a torn edge from a to b: a wandering line with small teeth."""
    (x0, y0), (x1, y1) = a, b
    n = max(2, int(math.hypot(x1 - x0, y1 - y0) / step))
    nx, ny = -(y1 - y0), (x1 - x0)
    ln = math.hypot(nx, ny); nx, ny = nx / ln, ny / ln
    pts, drift = [], 0.0
    for i in range(n + 1):
        t = i / n
        drift = drift * 0.93 + rng.gauss(0, rough * 0.4)
        off = drift + rng.gauss(0, rough * 0.12) + (rng.uniform(0.8, 2.2) * rough * 0.4 if rng.random() < 0.06 else 0)
        if i in (0, n): off = 0
        pts.append((x0 + (x1 - x0) * t + nx * off, y0 + (y1 - y0) * t + ny * off))
    return pts


def straight(a, b, rng, wobble=0.8, step=40):
    return torn(a, b, rng, rough=wobble, step=step)


def field(w, h, rng, scale):
    """Smooth random unevenness, -1..1."""
    small = np.array(Image.fromarray((np.random.default_rng(rng.randrange(1 << 30)).random((max(2, h // scale), max(2, w // scale))) * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC), dtype=np.float32)
    return (small / 127.5) - 1


def paper(w, h, outline, rng, base, lines=None, crease=None, torn_edges=()):
    W, H = w * S, h * S
    mask = Image.new('L', (W, H), 0)
    ImageDraw.Draw(mask).polygon([(x * S, y * S) for x, y in outline], fill=255)
    nrng = np.random.default_rng(rng.randrange(1 << 30))

    img = np.zeros((H, W, 3), np.float32) + np.array(base, np.float32)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # Room light from the top left, and the paper not lying quite flat.
    light = 1.0 + 0.035 * (1 - (xx / W + yy / H)) + 0.02 * field(W, H, rng, 160 * S)
    img *= light[..., None]
    # Fibres.
    grain = nrng.normal(0, 2.6, (H, W)).astype(np.float32)
    grain = np.array(Image.fromarray(np.clip(grain * 10 + 128, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.9 * S)), np.float32)
    img += ((grain - 128) / 10)[..., None] * 1.6

    pil = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(pil, 'RGBA')
    if lines:
        gap, top, colour = lines
        y = top
        while y < h + gap:
            pts = [(x * S, (y + 0.6 * math.sin(x / 90 + y)) * S) for x in range(-10, w + 20, 20)]
            d.line(pts, fill=colour, width=int(1.6 * S))
            y += gap
    if crease:
        # A fold, opened out again: the halves don't lie flat, so one is in a little shade.
        (cx0, cy0), (cx1, cy1) = crease
        side = (xx - (cx0 + (cx1 - cx0) * yy / H) * S) / (W * 0.5)
        tilt = 1 - 0.035 * np.clip(1 - np.abs(side) * 1.4, 0, 1) * (side < 0) - 0.018 * (side < 0)
        pil = Image.fromarray(np.clip(np.array(pil, np.float32) * tilt[..., None], 0, 255).astype(np.uint8))
        d = ImageDraw.Draw(pil, 'RGBA')
        for k, (shade, off) in enumerate([((0, 0, 0, 26), -1.2), ((255, 255, 255, 40), 1.2), ((0, 0, 0, 14), -4), ((255, 255, 255, 18), 4)]):
            d.line([(cx0 * S + off * S, cy0 * S), (cx1 * S + off * S, cy1 * S)], fill=shade, width=int((1.4 if k < 2 else 5) * S))
    arr = np.array(pil, np.float32)

    # Where paper is torn, its broken fibres show as a paler rim.
    if torn_edges:
        rim = Image.new('L', (W, H), 0)
        rd = ImageDraw.Draw(rim)
        for edge in torn_edges:
            rd.line([(x * S, y * S) for x, y in edge], fill=255, width=int(7 * S))
        rim = np.array(rim.filter(ImageFilter.GaussianBlur(1.5 * S)), np.float32) / 255
        arr = arr * (1 - 0.5 * rim[..., None]) + 250 * 0.5 * rim[..., None]
        # Ragged fibres at the very edge.
        fray = Image.new('L', (W, H), 0)
        fd = ImageDraw.Draw(fray)
        for edge in torn_edges:
            for x, y in edge[::1]:
                if rng.random() < 0.6:
                    cx, cy, r = x + rng.gauss(0, 1.4), y + rng.gauss(0, 1.4), rng.uniform(0.8, 2.0)
                    fd.ellipse([(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], fill=255)
        mask = Image.fromarray(np.maximum(np.array(mask), np.array(fray)))
    return arr, mask


def write(arr, mask, text_lines, at, size, angle, rng, ink=(30, 42, 104)):
    """Ballpoint writing: each letter a little different from the last."""
    H, W = arr.shape[:2]
    layer = Image.new('L', (W, H), 0)
    font = ImageFont.truetype(FONT, int(size * S))
    x0, y0 = at
    for li, line in enumerate(text_lines):
        x, y = x0 * S + li * rng.uniform(4, 22) * S, y0 * S + li * size * 1.05 * S
        drift = 0.0
        for ch in line:
            f = ImageFont.truetype(FONT, int(size * S * rng.uniform(0.96, 1.04)))
            box = f.getbbox(ch)
            cw = f.getlength(ch)
            if ch != ' ':
                g = Image.new('L', (int(cw + size * S), int(size * 2 * S)), 0)
                ImageDraw.Draw(g).text((size * S * 0.5, size * 0.3 * S), ch, font=f, fill=255)
                g = g.rotate(rng.gauss(0, 2.2), resample=Image.BICUBIC)
                drift = drift * 0.7 + rng.gauss(0, 1.1) * S
                layer.paste(255, (int(x - size * S * 0.5), int(y - size * 0.3 * S + drift)), g)
            x += cw * rng.uniform(0.97, 1.03)
    layer = layer.rotate(angle, resample=Image.BICUBIC, center=(x0 * S, y0 * S))
    layer = layer.filter(ImageFilter.GaussianBlur(0.55 * S))
    a = np.array(layer, np.float32) / 255
    # Pressure: the pen skips a little in places.
    nrng = np.random.default_rng(rng.randrange(1 << 30))
    press = 0.78 + 0.22 * np.array(Image.fromarray((nrng.random((H // (6 * S), W // (6 * S))) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255
    a = np.clip(a * press * 1.05, 0, 1)[..., None]
    return arr * (1 - a) + np.array(ink, np.float32) * a


def save(id_, arr, mask, pad=10):
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert('RGBA')
    img.putalpha(mask)
    w, h = img.size[0] // S, img.size[1] // S
    img = img.resize((w, h), Image.LANCZOS)
    box = img.getchannel('A').getbbox()
    img = img.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(w, box[2] + pad), min(h, box[3] + pad)))
    img.save(f'{REPO}/demo/box/cut/{id_}.webp', quality=88, method=6)
    t = img.copy()
    t.thumbnail((600, 600), Image.LANCZOS)
    t.save(f'{REPO}/demo/box/cut/thumb/{id_}.webp', quality=86, method=6)
    print(id_, img.size, t.size)


# A strip torn off the bottom of a lined notepad page: the long top edge is torn.
rng = random.Random(616)
w, h = 1010, 340
tl, tr, br, bl = (14, 30), (w - 12, 46), (w - 16, h - 14), (18, h - 18)
top = torn(tl, tr, rng, rough=6)
outline = top + straight(tr, br, rng) + straight(br, bl, rng) + straight(bl, tl, rng)
arr, mask = paper(w, h, outline, rng, base=(224, 222, 214), lines=(62, 112, (120, 150, 196, 70)), torn_edges=[top])
arr = write(arr, mask, ['Release falcon 616'], at=(78, 122), size=104, angle=2.0, rng=rng)
save('release-slip', arr, mask)

# A corner torn off a plain sheet, folded in half and opened again.
rng = random.Random(264)
w, h = 640, 540
a, b, c = (22, 24), (w - 30, 34), (30, h - 26)
edge1 = torn(b, (w - 60, h - 70), rng, rough=7)
edge2 = torn((w - 60, h - 70), c, rng, rough=7)
outline = straight(a, b, rng) + edge1 + edge2 + straight(c, a, rng)
arr, mask = paper(w, h, outline, rng, base=(228, 223, 209), crease=((w * 0.47, 0), (w * 0.43, h)), torn_edges=[edge1, edge2])
arr = write(arr, mask, ['Destroy', 'falcon 264'], at=(92, 118), size=112, angle=-4.0, rng=rng)
save('destroy-slip', arr, mask)
