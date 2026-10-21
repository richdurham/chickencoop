"""Split a cutout into its largest piece and everything else: <src>.png -> <a>.png, <b>.png (trimmed)."""
import sys
import numpy as np, cv2
from PIL import Image
src, out_a, out_b = sys.argv[1:4]
im = np.array(Image.open(src).convert('RGBA'))
alpha = im[:, :, 3]
solid = (alpha > 40).astype(np.uint8)
solid = cv2.morphologyEx(solid, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
n, labels, stats, _ = cv2.connectedComponentsWithStats(solid)
order = np.argsort(-stats[1:, cv2.CC_STAT_AREA]) + 1
main = order[0]
grow = cv2.dilate((labels == main).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
def save(mask, path):
    part = im.copy()
    part[:, :, 3] = np.where(mask > 0, alpha, 0)
    ys, xs = np.nonzero(part[:, :, 3] > 8)
    pad = 10
    y0, y1 = max(0, ys.min() - pad), min(im.shape[0], ys.max() + pad)
    x0, x1 = max(0, xs.min() - pad), min(im.shape[1], xs.max() + pad)
    # firm up half-transparent metal and plastic so they read as solid on cardboard
    a = part[y0:y1, x0:x1, 3].astype(float) / 255
    part[y0:y1, x0:x1, 3] = (255 * a ** 0.45).astype(np.uint8)
    Image.fromarray(part[y0:y1, x0:x1]).save(path)
    print(path.split('/')[-1], (x1 - x0, y1 - y0))
save(grow, out_a)
save(1 - grow, out_b)
