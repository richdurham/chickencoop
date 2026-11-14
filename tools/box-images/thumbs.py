"""The small copies of the backs that the table shows when a thing lies face down.
A thing can lie face down when its last side in demo/data.js is called 'Back'.
Each copy is made from the full-size back at exactly the size of the front's
small copy, so a thing keeps its shape when it's turned over on the table.
Run it again after backs.py, tags.py, coins.py or put.py changes a back.
Usage: python thumbs.py <repo> [name ...]    (needs pillow)
With names (for example: card coins), only those copies are made."""
import re
import sys
from PIL import Image

REPO = sys.argv[1]
ONLY = set(sys.argv[2:])
BOX = REPO + '/demo/box/'

data = open(REPO + '/demo/data.js', encoding='utf8').read()
for ident, rest in re.findall(r"\{ id: '([^']+)',([^\n]*)", data):
    sides = re.search(r"sides: \[([^\]]*)\]", rest)
    pages = re.search(r"pages: (\d+)", rest)
    if not sides or not pages or (ONLY and ident not in ONLY):
        continue
    n = int(pages.group(1))
    if re.findall(r"'([^']*)'", sides.group(1))[-1] != 'Back':
        continue
    if 'cut: true' in rest:
        front, back, name = f'{BOX}cut/thumb/{ident}.webp', f'{BOX}cut/{ident}-{n}.webp', f'cut/thumb/{ident}-{n}.webp'
    else:
        front, back, name = f'{BOX}thumb/{ident}.jpg', f'{BOX}{ident}-{n}.jpg', f'thumb/{ident}-{n}.jpg'
    size = Image.open(front).size
    im = Image.open(back)
    if abs(im.width / im.height - size[0] / size[1]) > 0.02:
        print(f'  {ident}: the back is {im.width} x {im.height}, a different shape from the front; it will be stretched')
    if name.endswith('.webp'):
        im.convert('RGBA').resize(size, Image.LANCZOS).save(BOX + name, quality=80, method=6)
    else:
        im.convert('RGB').resize(size, Image.LANCZOS).save(BOX + name, quality=70, progressive=True, optimize=True)
    print(name, size[0], 'x', size[1])
