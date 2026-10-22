"""The dog tags from the kete: their front, punched and worn, and their back.
The real tags were blank beside their stamped labels (Name, Age, Sex, Blood,
Birth). Here someone punched in what goes there, and it has worn away, all but
the name's first letter, a K, so the tags could be anyone's.
The back is the front turned over: mirrored, with what's pressed into the metal
standing up from it and what stands up pressed in.
Usage: python tags.py <repo>    (needs opencv, numpy, pillow, and git)"""
import io
import subprocess
import sys
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

REPO = sys.argv[1]
CUT = REPO + '/demo/box/cut/'
BLANK = '0bb80a0:demo/box/cut/dog-tags.webp'  # the tags as photographed, before this script
FONT = '/System/Library/Fonts/Supplemental/DIN Alternate Bold.ttf'
rng = np.random.default_rng(11)

# Each tag's plate: its corners, and the hole and chain to leave alone when it turns
# over. The left tag lies on top of the right one.
PLATES = {
    'left': {'corners': [(15, 445), (305, 348), (365, 540), (85, 648)],
             'keep': [('circle', (338, 440), 24), ('line', [(296, 330), (312, 380), (322, 410), (338, 440)], 9)]},
    'right': {'corners': [(402, 377), (597, 455), (488, 748), (288, 668)],
              'keep': [('circle', (514, 416), 24), ('line', [(520, 365), (516, 395), (514, 416)], 9)]},
}

# The punched lines: where the first letter's middle is (just past its label), the
# direction the line runs in degrees, and the letters. Under the wear the name is a
# K and a few letters, the age two digits, sex one letter, blood a group, birth a
# year; only the K can still be read.
LINES = [
    ('right', (504, 473), 24, 'KNMRA'), ('right', (459, 510), 22, '38'), ('right', (432, 553), 24, 'M'),
    ('right', (449, 621), 24, 'O+'), ('right', (416, 663), 26, '1974'),
    ('left', (296, 476), 67, 'KNMRA'), ('left', (241, 474), 64, '38'), ('left', (188, 486), 67, 'M'),
    ('left', (153, 547), 69, 'O+'), ('left', (100, 556), 66, '1974'),
]
CAP = 17       # letter height, px
ADVANCE = 15   # letter spacing, px


def load_blank():
    data = subprocess.run(['git', '-C', REPO, 'show', BLANK], capture_output=True, check=True).stdout
    return np.array(Image.open(io.BytesIO(data)).convert('RGBA'), np.float32)


def plate_mask(shape, name, radius=22):
    """A tag's plate, its corners rounded, without its hole and chain."""
    h, w = shape
    p = PLATES[name]
    m = np.zeros((h, w), np.uint8)
    cv2.fillPoly(m, [np.int32(p['corners'])], 255)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (radius * 2 + 1,) * 2))
    for kind, at, size in p['keep']:
        if kind == 'circle':
            cv2.circle(m, at, size, 0, -1)
        else:
            cv2.polylines(m, [np.int32(at)], False, 0, size * 2)
    return m > 0


def glyph(ch, size=120):
    """One letter, big, as a mask, and where its middle is (on the line, half a
    capital's height up from it)."""
    font = ImageFont.truetype(FONT, size)
    cap = font.getbbox('H')[3] - font.getbbox('H')[1]
    pad = size // 2
    img = Image.new('L', (size + pad * 2, size + pad * 2), 0)
    ImageDraw.Draw(img).text((pad, pad + cap), ch, font=font, fill=255, anchor='ls')
    adv = font.getlength(ch)
    return np.array(img, np.float32) / 255, (pad + adv / 2, pad + cap / 2), cap


def punched(shape):
    """How deep each point of the metal is pressed in, 0 to 1: the punched letters,
    each worn by its own amount, and the scuffs that wore them."""
    h, w = shape
    depth = np.zeros((h, w), np.float32)
    for tag, (x0, y0), angle, text in LINES:
        for i, ch in enumerate(text):
            g, (cx, cy), cap = glyph(ch)
            clear = i == 0 and ch == 'K'
            a = np.radians(angle + rng.normal(0, 2.5))
            s = CAP / cap
            along = i * ADVANCE + rng.normal(0, 0.7)
            X = x0 + along * np.cos(np.radians(angle)) + rng.normal(0, 0.6) * -np.sin(np.radians(angle))
            Y = y0 + along * np.sin(np.radians(angle)) + rng.normal(0, 0.6) * np.cos(np.radians(angle))
            c, sn = np.cos(a) * s, np.sin(a) * s
            M = np.float32([[c, -sn, X - (cx * c - cy * sn)], [sn, c, Y - (cx * sn + cy * c)]])
            g = cv2.GaussianBlur(g, (0, 0), 0.5 / s)  # so it doesn't alias as it shrinks
            mark = cv2.warpAffine(g, M, (w, h), flags=cv2.INTER_LINEAR)
            # How rounded the groove is, how much of it is left, and how deep.
            if clear:  # a punch leaves a crisp, rounded groove
                soft, share, deep = 0.6, 0.92, 1.0
            elif i == 1 and text[0] == 'K':  # beside the K, rubbed almost flat
                soft, share, deep = 2.2, 0.25, 0.16
            else:  # rubbed down: soft, shallow and in patches, so the shapes are lost
                soft, share, deep = 2.0, rng.uniform(0.35, 0.45), rng.uniform(0.28, 0.36)
            mark = cv2.GaussianBlur(mark, (0, 0), soft)
            mark /= max(float(mark.max()), 1e-6)
            noise = cv2.GaussianBlur(rng.normal(0, 1, (h, w)).astype(np.float32), (0, 0), 1.6 if clear else 2.4)
            kept = noise > np.quantile(noise[mark > 0.3], 1 - share)
            kept = cv2.GaussianBlur(kept.astype(np.float32), (0, 0), 0.7)
            depth = np.maximum(depth, mark * kept * deep)
    # Scuffs across the punched part, from years of rubbing: fine shallow scratches.
    scuffs = np.zeros((h, w), np.float32)
    for tag, (x0, y0), angle, text in LINES:
        for _ in range(4 + 3 * len(text)):
            t = rng.uniform(-6, len(text) * ADVANCE + 4)
            off = rng.normal(0, 6)
            cx = x0 + t * np.cos(np.radians(angle)) - off * np.sin(np.radians(angle))
            cy = y0 + t * np.sin(np.radians(angle)) + off * np.cos(np.radians(angle))
            b = np.radians(angle + rng.normal(0, 25))
            ln = rng.uniform(8, 26)
            p0 = (int(round(cx - ln / 2 * np.cos(b))), int(round(cy - ln / 2 * np.sin(b))))
            p1 = (int(round(cx + ln / 2 * np.cos(b))), int(round(cy + ln / 2 * np.sin(b))))
            cv2.line(scuffs, p0, p1, float(rng.uniform(0.08, 0.2)), 1, cv2.LINE_AA)
    return depth, scuffs


def lit(rgb, height, strength, mask=None):
    """Light falling from the upper left on metal raised by `height` (pressed in where
    it's negative): faces turned to the light brighter, faces turned away darker."""
    gx = cv2.Sobel(height, cv2.CV_32F, 1, 0, ksize=3) / 8
    gy = cv2.Sobel(height, cv2.CV_32F, 0, 1, ksize=3) / 8
    shade = -(gx + gy) * strength
    if mask is not None:
        shade *= mask
    return rgb * (1 + np.clip(shade, -0.6, 0.6))[..., None]


def front_from(blank):
    h, w = blank.shape[:2]
    metal = (plate_mask((h, w), 'left') | plate_mask((h, w), 'right')).astype(np.float32)
    depth, scuffs = punched((h, w))
    depth *= metal
    scuffs *= metal
    rgb = blank[..., :3]
    rgb = lit(rgb, -depth * 2.4, 1.0)
    rgb = rgb * (1 - 0.38 * depth)[..., None]  # grime in the grooves
    rgb = rgb * (1 + 0.5 * scuffs)[..., None]   # scratches catch the light
    return np.concatenate([np.clip(rgb, 0, 255), blank[..., 3:]], axis=2)


def back_from(front):
    """Turned over: mirrored, and on the plates everything at the scale of the
    lettering and the rim inverted, so what stood up is pressed in and the
    reverse. The light and the shine across the metal stay as they are."""
    f = front[:, ::-1].copy()
    h, w = f.shape[:2]
    plates = (plate_mask((h, w), 'left') | plate_mask((h, w), 'right'))[:, ::-1]
    plates = cv2.GaussianBlur(plates.astype(np.float32), (0, 0), 1.5)
    rgb = f[..., :3]
    lum = rgb.mean(axis=2)
    detail = lum - cv2.GaussianBlur(lum, (0, 0), 3.5)
    rgb = rgb - 2 * (detail * plates)[..., None]
    return np.concatenate([np.clip(rgb, 0, 255), f[..., 3:]], axis=2)


def save(arr, name, longest=None):
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA')
    if longest:
        im.thumbnail((longest, longest), Image.LANCZOS)
    im.save(CUT + name, quality=86 if not longest else 80, method=6)
    print('cut/' + name, im.width, 'x', im.height)


blank = load_blank()
front = front_from(blank)
save(front, 'dog-tags.webp')
save(front, 'thumb/dog-tags.webp', 600)
save(back_from(front), 'dog-tags-2.webp')
