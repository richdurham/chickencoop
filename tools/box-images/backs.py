"""The backs of the things in Katie's box that turn over, made from their fronts.
The things themselves are gone, so these are all there is.
Paper: the front turned over, its ink gone, a little of it showing through.
The dog tags' back is made with their front, by tags.py; the coins' is a photo.
Usage: python backs.py <repo> [name ...]    (needs opencv, numpy, pillow)
With names (for example: envelope boarding-pass), only those backs are made."""
import sys
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

REPO = sys.argv[1]
BOX = REPO + '/demo/box/'
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


def paper_cuts():
    """Paper things that came out of the box as cut-outs: the post-it, the crumpled
    printout, the paper from the kete, and the two slips."""
    for id_, k, through in [('lid-note', 31, 0.05), ('wrinkled-note', 9, 0.1), ('kete-note', 15, 0.14),
                            ('release-slip', 25, 0.06), ('destroy-slip', 25, 0.06)]:
        save_cut(turned(load(BOX + 'cut/' + id_ + '.webp'), k, through), id_ + '-2.webp')


def certificate():
    """Plain paper behind it."""
    front = load(BOX + 'certificate-1.jpg')
    back = turned(front, 31, 0.0)
    paper = np.full_like(back[..., :3], 0) + np.array([243, 242, 238], np.float32)
    light = cv2.GaussianBlur(rng.normal(0, 1, front.shape[:2]).astype(np.float32), (0, 0), 120)
    paper *= (1 + 0.012 * light / max(1e-6, np.abs(light).max()))[..., None]
    ink = np.clip(255 - front[:, ::-1, :3], 0, None)
    paper -= cv2.GaussianBlur(ink, (0, 0), 2.5) * 0.03
    paper += rng.normal(0, 1.0, paper.shape[:2])[..., None]
    save_jpg(paper, 'certificate-2.jpg')


def boarding_pass():
    """Printed on one side of white card: blank, with the red and black of the
    front showing through faintly, mirrored."""
    front = load(BOX + 'boarding-pass-1.jpg')
    h, w = front.shape[:2]
    card = np.full((h, w, 3), [238, 237, 233], np.float32)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    card *= (1 + 0.02 * (0.5 - xx / w) + 0.015 * (0.5 - yy / h))[..., None]
    ink = np.clip(np.array([234, 235, 230], np.float32) - front[:, ::-1, :3], 0, None)  # darker than its grey ground
    ink[:24], ink[-24:], ink[:, :24], ink[:, -24:] = 0, 0, 0, 0  # not the black specks at its corners
    card -= cv2.GaussianBlur(ink, (0, 0), 4) * 0.02
    card += rng.normal(0, 1.1, (h, w))[..., None]
    save_jpg(card, 'boarding-pass-2.jpg')


def family_photo():
    """A print, like the two group photos, whose backs are plain paper: the blank
    part of the photo-on-the-steps' back, turned upright."""
    src = load(BOX + 'who-trip-2.jpg')
    front = load(BOX + 'family-photo-1.jpg')
    h, w = front.shape[:2]
    sh, sw = src.shape[:2]
    blank = src[int(sh * 0.2):int(sh * 0.97), int(sw * 0.02):int(sw * 0.97), :]  # below the writing, inside the edges
    blank = np.ascontiguousarray(np.rot90(blank, 1))
    save_jpg(cv2.resize(blank, (w, h), interpolation=cv2.INTER_AREA), 'family-photo-2.jpg')


def envelope():
    """The same paper, its name showing through faintly. Its flap stands open, as on
    the front, so this side shows the flap's gummed inside, and below the fold the
    mouth and the folded-in panels that make the pocket."""
    front = load(BOX + 'envelope-1.jpg')
    h, w = front.shape[:2]
    env = turned(front, 25, 0.1)[..., :3]
    im = Image.fromarray(np.clip(env, 0, 255).astype(np.uint8)).convert('RGBA')
    shade = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(shade)
    fold = int(h * 0.205)  # where the front's flap folds
    mouth = (w // 2, int(h * 0.52))
    tip = (w // 2, int(h * 0.60))
    # The gum along the flap's edge: a faint yellowish band with a sheen.
    d.rounded_rectangle([int(w * 0.035), int(h * 0.03), int(w * 0.965), int(h * 0.085)], radius=10, fill=(200, 180, 120, 34))
    d.line([(int(w * 0.05), int(h * 0.045)), (int(w * 0.95), int(h * 0.045))], fill=(255, 255, 240, 40), width=3)
    # The mouth: the side panels' top edges, falling from the fold's ends to the middle.
    for end in [(0, fold), (w, fold)]:
        d.line([end, mouth], fill=(255, 255, 255, 70), width=3)
        d.line([(end[0], end[1] + 5), (mouth[0], mouth[1] + 5)], fill=(60, 50, 40, 40), width=4)
    # The bottom panel, folded up over the side panels: its edges rise from the
    # bottom corners, with a soft shadow beside them.
    for corner in [(0, h), (w, h)]:
        d.line([corner, tip], fill=(60, 50, 40, 46), width=5)
        d.line([(corner[0], corner[1] - 4), (tip[0], tip[1] - 4)], fill=(255, 255, 255, 40), width=3)
    shade = shade.filter(ImageFilter.GaussianBlur(2.2))
    im = Image.alpha_composite(im, shade)
    save_jpg(np.array(im, np.float32), 'envelope-2.jpg')


BACKS = {'paper-cuts': paper_cuts, 'certificate': certificate, 'boarding-pass': boarding_pass,
         'family-photo': family_photo, 'envelope': envelope}
for name in sys.argv[2:] or BACKS:
    BACKS[name]()
