"""The top of the box lid, flat: straightened out of the photo of the closed box and
extended with bare cardboard above and below, so it fits the square box on screen."""
import sys, cv2, numpy as np
src_path, out_path = sys.argv[1], sys.argv[2]
a = cv2.imread(src_path)
corners = np.float32([(96, 42), (874, 5), (1068, 418), (30, 492)])  # back left, back right, front right, front left
W, H = 1000, 720
top = cv2.warpPerspective(a, cv2.getPerspectiveTransform(corners, np.float32([(0, 0), (W, 0), (W, H), (0, H)])), (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
top = top[18:712, 8:930].astype(np.float32)   # off the box's back edge and the photo's border
h, w = top.shape[:2]
side = int(w * 0.97)
pad_top = (side - h) // 2
pad_bot = side - h - pad_top
rng = np.random.default_rng(3)

def band(rows, n, flip):
    # Bare cardboard along that edge, per column: only light pixels, so no marker strokes get smeared.
    m = rows.mean(axis=2) > 175
    col = np.array([np.median(rows[:, x][m[:, x]], axis=0) if m[:, x].any() else [np.nan] * 3 for x in range(rows.shape[1])])
    good = ~np.isnan(col[:, 0]); xs = np.arange(len(col))
    col = np.stack([np.interp(xs, xs[good], col[good, c]) for c in range(3)], axis=1)
    col = cv2.GaussianBlur(col[None].astype(np.float32), (0, 0), sigmaX=30)[0]
    b = np.repeat(col[None], n, axis=0) + rng.normal(0, 1.6, (n, len(col), 3))
    return b[::-1] if flip else b

out = np.vstack([band(top[:16], pad_top, True), top, band(top[-16:], pad_bot, False)])
out = np.clip(out, 0, 255).astype(np.uint8)
out = cv2.resize(out, (640, int(640 * out.shape[0] / out.shape[1])), interpolation=cv2.INTER_AREA)
cv2.imwrite(out_path, out, [cv2.IMWRITE_JPEG_QUALITY, 84, cv2.IMWRITE_JPEG_PROGRESSIVE, 1])
print(out.shape, 'darkest row median:', int(min(np.median(out.mean(axis=2), axis=1))))
