"""The coins: a 5 kuna and a 1 kuna, the money Katie would have brought back from
Dubrovnik in 2019. The box's own coins are gone, so these are photos by
riversxian on Numista (CC BY 4.0): both sides of each coin, straight on.
https://en.numista.com/2378 (5 kuna) and https://en.numista.com/1988 (1 kuna)
Cut out and laid side by side, a little apart. Their back is the pair turned over
together: each coin's other side, the two swapped left for right and their tilts
mirrored. Kuna coins are struck with both sides the same way up, so the other
side of an upright coin is upright too.
Usage: python coins.py <repo> <5 kuna marten> <5 kuna bear> <1 kuna marten> <1 kuna nightingale>
       (the four photos, as downloaded; needs opencv, numpy, pillow)"""
import sys
import cv2
import numpy as np
from PIL import Image

REPO = sys.argv[1]
CUT = REPO + '/demo/box/cut/'
FIVE, ONE = sys.argv[2:4], sys.argv[4:6]
PX_MM = 26          # how big they're drawn: pixels to a millimetre
COINS = [  # sides (marten first), diameter in mm, middle on the front (mm from top left), tilt in degrees
    (FIVE, 26.5, (15.5, 15.0), -16),
    (ONE, 22.5, (43.0, 19.0), 23),
]
SIZE = (58.5, 33.0)  # the picture, in mm


def coin(path, diameter):
    """One side of a coin, cut out of its white background, at the drawing's scale."""
    img = cv2.imread(path)
    grey = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    dark = cv2.GaussianBlur(grey, (0, 0), 3) < 235  # the coin is darker than the white it's on
    n, labels, stats, _ = cv2.connectedComponentsWithStats(dark.astype(np.uint8))
    biggest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    ys, xs = np.nonzero(labels == biggest)
    (cx, cy), r = cv2.minEnclosingCircle(np.stack([xs, ys], axis=1).astype(np.float32))
    r -= 8  # inside the white fringe at its edge
    side = int(round(diameter * PX_MM))
    s = side / (2 * r)
    M = np.float32([[s, 0, side / 2 - cx * s], [0, s, side / 2 - cy * s]])
    face = cv2.warpAffine(img, M, (side, side), flags=cv2.INTER_AREA, borderValue=(255, 255, 255))
    yy, xx = np.mgrid[0:side, 0:side].astype(np.float32) + 0.5
    edge = side / 2 - np.hypot(xx - side / 2, yy - side / 2)
    alpha = np.clip(edge + 0.5, 0, 1) * 255  # a smooth round edge
    rgba = cv2.cvtColor(face, cv2.COLOR_BGR2RGBA)
    rgba[..., 3] = alpha.astype(np.uint8)
    return rgba


def laid(side):
    """The two coins showing `side` (0 the marten, 1 the animal), where they lie: on the
    back, mirrored left for right."""
    W, H = int(SIZE[0] * PX_MM), int(SIZE[1] * PX_MM)
    canvas = np.zeros((H, W, 4), np.float32)
    for paths, diameter, (mx, my), tilt in COINS:
        c = coin(paths[side], diameter).astype(np.float32)
        x, a = (mx, tilt) if side == 0 else (SIZE[0] - mx, -tilt)
        h, w = c.shape[:2]
        M = cv2.getRotationMatrix2D((w / 2, h / 2), -a, 1)
        M[:, 2] += (x * PX_MM - w / 2, my * PX_MM - h / 2)
        # Premultiplied, so the edge stays clean when it's turned.
        pre = np.dstack([c[..., :3] * c[..., 3:] / 255, c[..., 3:]])
        moved = cv2.warpAffine(pre, M, (W, H), flags=cv2.INTER_CUBIC)
        a_ = moved[..., 3:] / 255
        canvas[..., :3] = moved[..., :3] + canvas[..., :3] * (1 - a_)
        canvas[..., 3:] = moved[..., 3:] + canvas[..., 3:] * (1 - a_)
    rgb = canvas[..., :3] / np.maximum(canvas[..., 3:] / 255, 1e-6)
    return np.clip(np.dstack([rgb, canvas[..., 3:]]), 0, 255).astype(np.uint8)


def save(arr, name, longest):
    im = Image.fromarray(arr, 'RGBA')
    im.thumbnail((longest, longest), Image.LANCZOS)
    im.save(CUT + name, quality=86 if longest > 600 else 80, method=6)
    print('cut/' + name, im.width, 'x', im.height)


front = laid(0)
save(front, 'coins.webp', 1400)
save(front, 'thumb/coins.webp', 600)
save(laid(1), 'coins-2.webp', 1400)
