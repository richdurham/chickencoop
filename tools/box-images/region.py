"""Cut out one region of a photo: <src> x0 y0 x1 y1 (fractions) -> <out>.png, background removed and trimmed."""
import sys
from PIL import Image
from rembg import remove, new_session
src, out = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = map(float, sys.argv[3:7])
im = Image.open(src).convert('RGB')
w, h = im.size
crop = im.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))
crop.thumbnail((1600, 1600))
cut = remove(crop, session=new_session('isnet-general-use'), alpha_matting=True)
a = cut.getchannel('A').point(lambda v: 0 if v < 60 else min(255, int((v - 60) * 255 / 140)))
cut.putalpha(a)
box = a.getbbox()
cut = cut.crop((max(0, box[0] - 10), max(0, box[1] - 10), min(cut.width, box[2] + 10), min(cut.height, box[3] + 10)))
cut.save(out)
print(out.split('/')[-1], cut.size)
