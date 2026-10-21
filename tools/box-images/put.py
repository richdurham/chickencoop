"""Put a photo of one side of a thing into the demo, sized like the others.
Usage: python put.py <repo> <photo> <id> [side]     (side 1 is the front, 2 the back)

A photo with a background (.jpg) becomes demo/box/<id>-<side>.jpg.
A cut-out (.png with a transparent background, from cut.py, region.py or
colourcut.py) becomes demo/box/cut/<id>.webp, or <id>-<side>.webp for other sides.
The front also gets the small copy the pile shows. Crop a back to the same
shape as its front: when a thing turns over, its back fills the front's frame."""
import sys
from PIL import Image

repo, src, ident = sys.argv[1:4]
side = int(sys.argv[4]) if len(sys.argv) > 4 else 1
box = repo + '/demo/box/'
im = Image.open(src)
cut = im.mode in ('RGBA', 'LA') or 'transparency' in im.info

def fit(img, longest):
    img = img.copy()
    img.thumbnail((longest, longest), Image.LANCZOS)
    return img

if cut:
    im = im.convert('RGBA')
    name = ident if side == 1 else f'{ident}-{side}'
    fit(im, 1400).save(f'{box}cut/{name}.webp', quality=86, method=6)
    if side == 1:
        fit(im, 600).save(f'{box}cut/thumb/{ident}.webp', quality=80, method=6)
    print('cut/' + name + '.webp')
else:
    im = im.convert('RGB')
    fit(im, 1600).save(f'{box}{ident}-{side}.jpg', quality=84, progressive=True, optimize=True)
    if side == 1:
        fit(im, 560).save(f'{box}thumb/{ident}.jpg', quality=70, progressive=True, optimize=True)
    print(f'{ident}-{side}.jpg')
