# Tools

## `alexa-voice/`

Records Alexa's lines in her voice after they change in `demo/data.js`. See its README.

## `tests/`

Browser tests for the demo, using Playwright and Chromium. Serve the repo from its root first:

    python3 -m http.server 8765 --bind 127.0.0.1

Then run a suite:

    node tools/tests/box.js <screenshot-dir> [site address]
    node tools/tests/answers.js <screenshot-dir> [site address]
    node tools/tests/voice.js <screenshot-dir> [site address]

- **What they print:** each check prints PASS or FAIL, and a failure makes the exit code 1.
- **The address** defaults to `http://127.0.0.1:8765/demo/`. Give the live site's address to check it after a merge.
- **What they cover:**
  - `box.js`: the pile, picking up, turning over, leafing, the kete and envelope, saving, "Looked at", and phones.
  - `answers.js`: Alexa's plain-language answers, and word matching without the model.
  - `voice.js`: listening, speaking, the first-visit choice, hold Space, subtitles and the lid animation. It fakes the speech recogniser, voices and microphone, and plays `clips/` as what the microphone hears.
- **`accuracy/eval.mjs`** runs the game's real matcher in Node on the held-out questions in `accuracy/questions-*.json`. It needs the Node build of `@huggingface/transformers@3.8.1`:

      node tools/tests/accuracy/eval.mjs demo demo/model/ <path>/transformers.node.mjs tools/tests/accuracy/questions-1.json

## `box-images/`

The scripts that made the box's images. Each script's first lines say how to run it. They need Python with Pillow, NumPy and OpenCV. `cut.py` and `region.py` also need `rembg`.

- **`put.py`** puts a photo of one side of a thing into `demo/box/`, sized like the rest: side 1 is the front, side 2 the back. A `.png` with a transparent background becomes a cut-out.
- **`cut.py`, `region.py`, `colourcut.py`, `split.py`** remove a photo's background, cut out part of a photo, cut out by colour, or split a cut-out into pieces.
- **`lid-top.py`** straightens the lid's top out of the closed-box photo, for the opening animation.
- **`slips.py`** draws the two command-code slips. It uses the La Belle Aurore font (SIL Open Font License, from Google Fonts).
- **`backs.py`** makes the backs of the flat things from their fronts. The things themselves are gone, so these backs are all there is. Give it names to remake only some (`python backs.py <repo> envelope`).
- **`tags.py`** punches worn lettering into the dog tags beside their stamped labels, leaving only the name's K readable, and makes their back from the result. It starts from the tags as photographed, which it takes from the repo's history.
- **`coins.py`** cuts out the two kuna coins from their photos (both sides of each, from Numista, CC BY 4.0), lays them side by side, and makes their back by turning the pair over.
