"""The backs of the things in Katie's box that turn over, made from their fronts.
Paper: the front turned over, its ink gone, a little of it showing through.
Things there is no fair way to fake are marked PLACEHOLDER until photographed.
Usage: python backs.py <repo>    (needs opencv, numpy, pillow)"""
import sys
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

REPO = sys.argv[1]
BOX = REPO + '/demo/box/'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
rng = np.random.default_rng(7)


def load(path):
    return np.array(Image.open(path).convert('RGBA'), np.float32)


def save_jpg(arr, name):
    Image.fromarray(np.clip(arr[..., :3], 0, 255).astype(np.uint8)).save(BOX + name, quality=84, progressive=True, optimize=True)
    print(name, arr.shape[1], 'x', arr.shape[0])


def save_cut(arr, name):
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA').save(BOX + 'cut/' + name, quality=86, method=6)
    print('cut/' + name, arr.shape[1], 'x', arr.shape[0])


def no_ink(rgb, k, alpha=None):
    """The paper without what's written or printed on it: wherever the front is marked
    (darker than the paper around it, and the pale fringe a pen or a print leaves),
    the paper around it instead. Its grain, creases and light stay as they are."""
    rgb = rgb.copy()
    if alpha is not None:  # around a cut-out, the paper's own colour, not whatever is in the gaps
        rgb[alpha < 128] = np.median(rgb[alpha >= 128], axis=0)
    u8 = np.clip(rgb, 0, 255).astype(np.uint8)
    around = cv2.medianBlur(u8, k | 1).astype(np.float32)
    marked = (around.mean(axis=2) - rgb.mean(axis=2)) > 9
    marked = cv2.dilate(marked.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    soft = cv2.GaussianBlur(marked.astype(np.float32), (0, 0), 1.5)[..., None]
    return rgb * (1 - soft) + cv2.GaussianBlur(around, (0, 0), 2) * soft


def turned(front, k, through=0.12):
    """The back of a sheet of paper: shape mirrored, ink removed, a ghost of it
    showing through, mirrored as it would be."""
    f = front[:, ::-1].copy()
    rgb, a = f[..., :3], f[..., 3:]
    paper = no_ink(no_ink(rgb, k, a[..., 0]), 2 * k + 1, a[..., 0])  # a second, wider pass for the thickest strokes
    ink = np.clip(paper - rgb, 0, None) * (a / 255)  # how much darker the front is where it's marked
    ghost = cv2.GaussianBlur(ink, (0, 0), 1.6)
    back = paper - ghost * through
    back += rng.normal(0, 1.2, back.shape[:2])[..., None]  # paper grain
    return np.concatenate([back, a], axis=2)


def placeholder(arr, opacity=0.62, at=None, width=None, backed=False, angle=14):
    """A red PLACEHOLDER stamp, across the middle unless placed, so nobody takes it for the
    real thing. A backed stamp is on a paper label, which covers what's under it."""
    h, w = arr.shape[:2]
    size = 100
    font = ImageFont.truetype(BOLD, size)
    text = 'PLACEHOLDER'
    tw, pad = int(font.getlength(text)), size // 3
    stamp = Image.new('L', (tw + pad * 2, size + pad * 2), 0)
    d = ImageDraw.Draw(stamp)
    d.rectangle([4, 4, stamp.width - 5, stamp.height - 5], outline=255, width=10)
    d.text((pad, pad - size // 6), text, font=font, fill=255)
    label = Image.new('L', stamp.size, 255)
    stamp = stamp.rotate(angle, expand=True, resample=Image.BICUBIC)
    label = label.rotate(angle, expand=True, resample=Image.BICUBIC)
    s = (width or min(w * 0.7, h * 1.4)) / stamp.width
    size2 = (max(1, int(stamp.width * s)), max(1, int(stamp.height * s)))
    stamp, label = stamp.resize(size2, Image.LANCZOS), label.resize(size2, Image.LANCZOS)
    cx, cy = at or (w // 2, h // 2)
    full, under = Image.new('L', (w, h), 0), Image.new('L', (w, h), 0)
    full.paste(stamp, (cx - stamp.width // 2, cy - stamp.height // 2))
    under.paste(label, (cx - label.width // 2, cy - label.height // 2))
    m = np.array(full, np.float32)[..., None] / 255 * opacity
    red = np.array([200, 30, 38], np.float32)
    solid = arr[..., 3:] > 128
    out = arr.copy()
    if backed:
        u = np.array(under, np.float32)[..., None] / 255 * 0.94
        out[..., :3] = out[..., :3] * (1 - u) + np.array([246, 244, 239], np.float32) * u
    # On the thing, the stamp is inked over it; across the gaps of a cut-out, it is the stamp alone.
    out[..., :3] = np.where(solid, out[..., :3] * (1 - m) + red * m, red)
    out[..., 3:] = np.maximum(out[..., 3:], m * 255)
    return out


# ---- Paper things that came out of the box as cut-outs: the post-it, the crumpled
# printout, the paper from the kete, and the two slips.
for id_, k, through in [('lid-note', 31, 0.05), ('wrinkled-note', 9, 0.1), ('kete-note', 15, 0.14),
                        ('release-slip', 25, 0.06), ('destroy-slip', 25, 0.06)]:
    save_cut(turned(load(BOX + 'cut/' + id_ + '.webp'), k, through), id_ + '-2.webp')

# ---- The certificate: plain paper behind it.
front = load(BOX + 'certificate-1.jpg')
back = turned(front, 31, 0.0)
paper = np.full_like(back[..., :3], 0) + np.array([243, 242, 238], np.float32)
light = cv2.GaussianBlur(rng.normal(0, 1, front.shape[:2]).astype(np.float32), (0, 0), 120)
paper *= (1 + 0.012 * light / max(1e-6, np.abs(light).max()))[..., None]
ink = np.clip(255 - front[:, ::-1, :3], 0, None)
paper -= cv2.GaussianBlur(ink, (0, 0), 2.5) * 0.03
paper += rng.normal(0, 1.0, paper.shape[:2])[..., None]
save_jpg(paper, 'certificate-2.jpg')

# ---- The boarding pass: blank card, marked until photographed.
front = load(BOX + 'boarding-pass-1.jpg')
h, w = front.shape[:2]
card = np.full((h, w, 3), [238, 237, 233], np.float32)
yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
card *= (1 + 0.02 * (0.5 - xx / w) + 0.015 * (0.5 - yy / h))[..., None]
card += rng.normal(0, 1.1, (h, w))[..., None]
save_jpg(placeholder(np.concatenate([card, np.full((h, w, 1), 255, np.float32)], axis=2)), 'boarding-pass-2.jpg')

# ---- The family photo: a print, like the two group photos, whose backs are plain
# paper. The blank part of the photo-on-the-steps' back, turned upright, marked.
src = load(BOX + 'who-trip-2.jpg')
front = load(BOX + 'family-photo-1.jpg')
h, w = front.shape[:2]
sh, sw = src.shape[:2]
blank = src[int(sh * 0.2):int(sh * 0.97), int(sw * 0.02):int(sw * 0.97), :]  # below the writing, inside the edges
blank = np.ascontiguousarray(np.rot90(blank, 1))
blank = cv2.resize(blank, (w, h), interpolation=cv2.INTER_AREA)
save_jpg(placeholder(blank), 'family-photo-2.jpg')

# ---- The envelope: the same paper with its name gone, and the flap side drawn on.
front = load(BOX + 'envelope-1.jpg')
h, w = front.shape[:2]
env = no_ink(front[:, ::-1, :3], 25)
env += rng.normal(0, 1.0, (h, w))[..., None]
im = Image.fromarray(np.clip(env, 0, 255).astype(np.uint8)).convert('RGBA')
shade = Image.new('RGBA', (w, h), (0, 0, 0, 0))
d = ImageDraw.Draw(shade)
top = int(h * 0.19)
tip = (w // 2, int(h * 0.62))
# Where the side and bottom panels overlap: two soft creases rising to the corners.
for (x0, y0), (x1, y1) in [((0, h), (int(w * 0.44), int(h * 0.56))), ((w, h), (int(w * 0.56), int(h * 0.56)))]:
    d.line([(x0, y0), (x1, y1)], fill=(60, 50, 40, 46), width=5)
    d.line([(x0, y0 - 4), (x1, y1 - 4)], fill=(255, 255, 255, 40), width=3)
# The flap, folded down over them: its shadow, then its edge.
flap = [(0, top), (w, top), (int(w * 0.62), int(tip[1] * 0.96)), tip, (int(w * 0.38), int(tip[1] * 0.96))]
d.polygon([(x, y + 10) for x, y in flap], fill=(40, 30, 20, 34))
d.polygon(flap, fill=(255, 255, 255, 10))
d.line(flap[1:] + [flap[0]], fill=(70, 60, 50, 70), width=3)
d.line([(0, top), (w, top)], fill=(90, 80, 70, 60), width=3)  # the fold along the top
shade = shade.filter(ImageFilter.GaussianBlur(2.2))
im = Image.alpha_composite(im, shade)
save_jpg(placeholder(np.array(im, np.float32)), 'envelope-2.jpg')

# ---- Dog tags and coins: no photo of their backs yet, so their fronts, marked.
save_cut(placeholder(load(BOX + 'cut/dog-tags.webp')), 'dog-tags-2.webp')
save_jpg(placeholder(load(BOX + 'coins-1.jpg'), opacity=0.8), 'coins-2.jpg')

# ---- The lid: its top, straightened out of the photo of the closed box (as for the
# opening, box/lid-top.jpg), without Tim's post-it, which is in the box now, and
# widened with bare cardboard to the shape of the photo of its inside.
a = cv2.imread(BOX + 'box-closed.jpg')
corners = np.float32([(96, 42), (874, 5), (1068, 418), (30, 492)])
W, H = 1000, 720
top = cv2.warpPerspective(a, cv2.getPerspectiveTransform(corners, np.float32([(0, 0), (W, 0), (W, H), (0, H)])), (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
top = top[18:712, 8:930]
hsv = cv2.cvtColor(top, cv2.COLOR_BGR2HSV)
pink = ((hsv[..., 0] < 20) | (hsv[..., 0] > 160)) & (hsv[..., 1] > 22) & (hsv[..., 2] > 100)
pink = cv2.morphologyEx(pink.astype(np.uint8) * 255, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
n, labels, stats, _ = cv2.connectedComponentsWithStats(pink)
keep = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))  # the post-it: the one big pink patch
mask = cv2.dilate((labels == keep).astype(np.uint8) * 255, np.ones((27, 27), np.uint8))  # and its shadow
top = cv2.inpaint(top, mask, 9, cv2.INPAINT_TELEA).astype(np.float32)
# The lettering it hid: the part of the mask in the band of the IRON MOUNTAIN lettering.
ys, xs = np.where(mask[278:362] > 0)
spot = ((xs.min() - 30 + xs.max()) / 2 / top.shape[1], (278 + 320) / 2 / top.shape[0], (xs.max() - xs.min()) / top.shape[1])
th, tw = 590, int(round(top.shape[1] * 590 / top.shape[0]))
top = cv2.resize(top, (tw, th), interpolation=cv2.INTER_AREA)
fw = load(BOX + 'lid-inside-1.jpg').shape[1]
left = (fw - tw) // 2

def side(cols, n, flip):
    m = cols.mean(axis=2) > 175
    row = np.array([np.median(cols[y][m[y]], axis=0) if m[y].any() else [np.nan] * 3 for y in range(cols.shape[0])])
    good = ~np.isnan(row[:, 0]); ys = np.arange(len(row))
    row = np.stack([np.interp(ys, ys[good], row[good, c]) for c in range(3)], axis=1)
    row = cv2.GaussianBlur(row[:, None].astype(np.float32), (0, 0), sigmaX=1, sigmaY=30)[:, 0]
    b = np.repeat(row[:, None], n, axis=1) + rng.normal(0, 1.6, (len(row), n, 3))
    return b[:, ::-1] if flip else b

lid = np.hstack([side(top[:, :12], left, True), top, side(top[:, -12:], fw - tw - left, False)])
lid = cv2.cvtColor(np.clip(lid, 0, 255).astype(np.uint8), cv2.COLOR_BGR2RGBA).astype(np.float32)
# Where the post-it was, the lettering under it can't be put back from this photo: marked
# until the lid's top is photographed without it.
at = (left + int(spot[0] * tw), int(spot[1] * th))
save_jpg(placeholder(lid, opacity=0.85, at=at, width=int(spot[2] * tw * 1.4), backed=True, angle=5), 'lid-inside-2.jpg')
