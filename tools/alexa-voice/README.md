# Alexa's voice

The demo plays Alexa's lines from recordings in `demo/voice/alexa/`: one MP3 per
line, and `lines.json`, which maps each line's exact text to its file. A reply
the game puts together from two lines (a hedge, then the answer) plays both,
one after the other. Any line without a recording is read by the browser's own
voice instead, so nothing breaks while recordings are out of date.

The recordings were made with [Kokoro](https://github.com/hexgrad/kokoro), an
open text-to-speech model (Apache 2.0), voice `bf_isabella`: a young-sounding
British woman.

## After changing Alexa's lines in `demo/data.js`

Record the new and changed lines (the others are left as they are):

    pip install kokoro-onnx soundfile numpy
    # kokoro-v1.0.onnx and voices-v1.0.bin from
    # https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
    python make.py --model kokoro-v1.0.onnx --voices voices-v1.0.bin

It needs node and ffmpeg. `--voice` picks another Kokoro voice, and `--all`
records every line again (for example after changing the voice).

If it stops with "Error processing file '/Users/runner/…/espeak-ng-data/phontab'",
espeak couldn't use its data folder because the path is too long: it keeps
only about 160 characters. That happens when Python is installed in a deeply
nested folder. Install Python somewhere with a shorter path, or copy
`espeakng_loader/espeak-ng-data` to a short path and return that path from
`espeakng_loader.get_data_path` before running `make.py`.

`make.py` fixes how a few words are said (`SAY` at the top: kete, Titirangi,
kindy) and reads the codes digit by digit. Add to `SAY` if a new word comes out
wrong.

## Recording lines by hand

`script.md` lists every line with the file it plays from. Record a line, save it
as an MP3 with that file name in `demo/voice/alexa/`, and the game plays it.
`make.py` won't overwrite it unless you pass `--all`.

`lines.mjs` prints every line Alexa can say, if you only need the list.
