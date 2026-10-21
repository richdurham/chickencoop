"""Remove the background from box/<id>-1.jpg for each id given; write <out>/<id>.png trimmed to the object."""
import sys, os
from PIL import Image
from rembg import remove, new_session

box, out, model, ids = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]
session = new_session(model)
for i in ids:
    img = Image.open(os.path.join(box, f'{i}-1.jpg')).convert('RGB')
    cut = remove(img, session=session)
    bbox = cut.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    if bbox:
        pad = 12
        bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(cut.width, bbox[2] + pad), min(cut.height, bbox[3] + pad))
        cut = cut.crop(bbox)
    cut.save(os.path.join(out, f'{i}.png'))
    print(i, cut.size)
