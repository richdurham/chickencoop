"""Record every line Alexa can say with a neural voice, for the demo to play.

Reads the lines from demo/data.js (via lines.mjs), records each new or changed
one with Kokoro (an open, Apache-2.0 text-to-speech model), and writes
demo/voice/alexa/<id>.mp3 plus demo/voice/alexa/lines.json, which maps each
line's text to its clip. Lines that are already recorded are left alone (so a
clip replaced by a person's recording stays), and clips for lines that no
longer exist are removed. Also writes script.md here: every line with its file
name, for recording them by hand.

    pip install kokoro-onnx soundfile numpy
    # kokoro-v1.0.onnx and voices-v1.0.bin from
    # https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
    python make.py --model kokoro-v1.0.onnx --voices voices-v1.0.bin

Needs node (for lines.mjs) and ffmpeg (for MP3).
"""
import argparse
import hashlib
import json
import pathlib
import re
import subprocess

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent.parent / 'demo' / 'voice' / 'alexa'

# How to say words the voice would otherwise get wrong. Only what she says
# changes; the text on screen stays as written.
SAY = {
    'kete': 'ketteh',               # KEH-teh, not "keet"
    'Titirangi': 'Teetee-rung-ee',  # tee-tee-RUNG-ee
    'kindy': 'kinndy',              # KIN-dee, as in kindergarten
}


def spoken(text):
    for word, say in SAY.items():
        text = re.sub(r'\b%s\b' % word, say, text)
    # Codes digit by digit: "six one six", not "six hundred and sixteen".
    return re.sub(r'\b(\d)(\d)(\d)\b', r'\1 \2 \3', text)


def clip_id(text):
    return hashlib.sha1(text.encode('utf-8')).hexdigest()[:10]


def tidy(audio, rate):
    """Trim the silence either side, leave a breath, and bring every line to the same loudness."""
    loud = np.flatnonzero(np.abs(audio) > 0.01)
    if len(loud):
        pad = int(0.06 * rate)
        audio = audio[max(0, loud[0] - pad):loud[-1] + pad]
    rms = np.sqrt(np.mean(audio ** 2)) or 1
    audio = audio * (0.1 / rms)                  # about -20 dBFS
    peak = np.max(np.abs(audio))
    return audio * (0.95 / peak) if peak > 0.95 else audio


def to_mp3(audio, rate, path):
    subprocess.run(
        ['ffmpeg', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', str(rate), '-ac', '1', '-i', 'pipe:',
         '-codec:a', 'libmp3lame', '-b:a', '48k', str(path)],
        input=audio.astype('<f4').tobytes(), check=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--model', required=True, help='kokoro-v1.0.onnx')
    ap.add_argument('--voices', required=True, help='voices-v1.0.bin')
    ap.add_argument('--voice', default='bf_isabella', help='a young-sounding British woman (default)')
    ap.add_argument('--speed', type=float, default=1.0)
    ap.add_argument('--all', action='store_true', help='record every line again, replacing what is there')
    args = ap.parse_args()

    lines = json.loads(subprocess.run(['node', str(HERE / 'lines.mjs')], capture_output=True, text=True, check=True).stdout)
    OUT.mkdir(parents=True, exist_ok=True)
    manifest_path = OUT / 'lines.json'
    old = json.loads(manifest_path.read_text()) if manifest_path.exists() else {'lines': {}}

    from kokoro_onnx import Kokoro
    kokoro = Kokoro(args.model, args.voices)

    clips, made = {}, 0
    for text in lines:
        name = clip_id(text) + '.mp3'
        clips[text] = name
        if not args.all and old['lines'].get(text) == name and (OUT / name).exists():
            continue
        audio, rate = kokoro.create(spoken(text), voice=args.voice, speed=args.speed, lang='en-gb')
        to_mp3(tidy(np.asarray(audio, dtype=np.float32), rate), rate, OUT / name)
        made += 1
        print('recorded', name, text[:70])

    gone = [p for p in OUT.glob('*.mp3') if p.name not in clips.values()]
    for p in gone:
        p.unlink()

    manifest = {'voice': 'Kokoro %s, speed %s' % (args.voice, args.speed), 'lines': clips}
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n')
    (HERE / 'script.md').write_text(
        '# Alexa\'s lines\n\nEach line and the file it plays from, in `demo/voice/alexa/`. To use a person\'s\n'
        'recording instead, save it as an MP3 with the same file name.\n\n'
        + ''.join('- `%s` %s\n' % (name, text) for text, name in clips.items()))
    print('%d lines, %d recorded now, %d old clips removed' % (len(clips), made, len(gone)))


if __name__ == '__main__':
    main()
