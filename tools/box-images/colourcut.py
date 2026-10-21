"""Cut out one flat object by colour: box/<id>-1.jpg -> <out>/<id>.png. mode 'bright' or 'pink'."""
import sys, os
import numpy as np, cv2

box, out, ident, mode = sys.argv[1:5]
img = cv2.imread(os.path.join(box, f'{ident}-1.jpg'))
b, g, r = [img[:, :, k].astype(int) for k in range(3)]
if mode == 'bright':
    mask = (cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) > 120).astype(np.uint8) * 255
else:
    mask = ((r > 170) & (r - b > 35) & (r - g > 25)).astype(np.uint8) * 255
k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k, iterations=2)
mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, k, iterations=1)
# keep the largest piece and fill its holes
n, labels, stats, _ = cv2.connectedComponentsWithStats(mask)
big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
mask = (labels == big).astype(np.uint8) * 255
contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
mask = np.zeros_like(mask)
cv2.drawContours(mask, contours, -1, 255, thickness=cv2.FILLED)
mask = cv2.GaussianBlur(mask, (5, 5), 0)
x, y, w, h = cv2.boundingRect(contours[0])
pad = 10
x0, y0, x1, y1 = max(0, x - pad), max(0, y - pad), min(img.shape[1], x + w + pad), min(img.shape[0], y + h + pad)
rgba = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
rgba[:, :, 3] = mask
cv2.imwrite(os.path.join(out, f'{ident}.png'), rgba[y0:y1, x0:x1])
print(ident, (x1 - x0, y1 - y0))
