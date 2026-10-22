# Handover: the browser demo of Open the Chicken Coop

Written on 21 October 2026 for the next chat that works on this repo, and updated the same day once the real box turned out to be gone. It covers what the demo is, what the owner wants from it, how it is built, how to test a change, and what is queued next. Everything below is on `main` and live.

- **Live demo:** https://richdurham.github.io/chickencoop/demo/ (GitHub Pages, deployed from `main`)
- **Repo:** `richdurham/chickencoop`. The demo is in `demo/`, and tools and tests are in `tools/`.
- **Source material:** `Open-the-chicken-coop-game-files/`, which holds the photos and PDFs of the real box's contents and Alexa's script. The `_SPOILERS` folder holds the story's background.
- **The real box is gone.** The owner threw it away with everything in it, so these photos are all there will ever be. Never ask the owner to photograph anything in it.

## What it is

"Open the Chicken Coop" is a physical game: a box of Katie Yeung's belongings, with an Alexa skill playing her friend Alexa Gardner. The player digs through the box, works out what Katie's virus really is, and says one of two command codes, to release it or destroy it. The browser demo is the whole game on one page:

1. The player says or types "Alexa, open the chicken coop".
2. The lid comes off.
3. They dig through the pile, pick things up, turn them over, leaf through the folder, and take things out of the kete and the envelope.
4. They ask Alexa questions, typed or spoken, and she answers aloud.
5. They say a code, confirm it, and see an ending.

## What the owner wants (keep these)

- **It's a demo of the real box,** so it should feel like handling the real things.
- **The game never helps.** The box is full of red herrings, and players are meant to poke at everything because they don't know what matters. Nothing on screen may hint at what matters:
  - **Everything flat turns over,** even when its back is blank. Only the solid things (kete, plant, glasses, mug) don't, and nor does the lid, whose top is seen on the closed box.
  - **Names and captions are neutral.** The `label` is visible; the `caption` is only heard by screen readers. Both say what a thing is, never what to notice.
  - **Progress is vague.** The line reads "Looked at: nothing / a few / some / many / most / all?". It's never a count, and never a plain "all": the owner deliberately frustrates completionists.
  - **No suggested questions anywhere.**
- **The command codes are hidden.** They are written on two slips of paper at the bottom of the pile: "Release falcon 616" under the envelope and certificate, and "Destroy falcon 264" under the folder. They must never be shown as buttons or prompts in Alexa's panel, because players just click them. Saying a code is matched word for word. The short code gets "are you sure?", and the long one ("…cleansing falcon…") ends the game.
- **Alexa's lines are the original Alexa Blueprint script, word for word.** They live in `demo/data.js` (`WELCOME`, `QA[].a`, `CODES`, `FALLBACKS`, `EXIT`, `START_HINT`). The owner will review them and may change some. Changed lines must then be re-recorded (see Voice below), and the owner may record some by hand.
- **Alexa's voice is a young-sounding British woman:** Kokoro `bf_isabella`, the owner's choice.
- **The opening animation lasts at least 2 seconds** (the lid takes 2.6). It covers the time her sentence model takes to load.
- **Backs that were never photographed are made from their fronts** by `tools/box-images/backs.py`: blank paper, a faint mirrored show-through, and for the envelope its open flap and seams.
- **The dog tags could be anyone's.** "A paucity of information" is the design: the name is worn away except for its first letter, a K, which fits every suspect (Katie and Ken Yeung, Igor Kuznetsov, Sam Kirkpatrick, Vince Kory or Vlad Korsakov, also called "Ken Kori", and Kevin Hackwell). The other fields are worn past reading, and nothing says whose military they're from. Keep it that way; `tools/box-images/tags.py` makes them.
- **The coins are Croatian kuna,** a 5 kuna (2001) and a 1 kuna (2007): the conference was in Dubrovnik in February 2019, before Croatia took up the euro. They are credited photos (riversxian on Numista, CC BY 4.0), cut out by `tools/box-images/coins.py`. The Croatian National Bank allows faithful 2D pictures of kuna coins without asking. Alexa's scripted answer still says "They are euros"; that line is the owner's to change.
- **How the owner works:** they like to hear how hard something is, with easier and fuller alternatives, before a big feature is built. They merge pull requests themselves, usually quickly. After a merge, check the change on the live site.

## How it's built

The demo is a static site: plain HTML, CSS and JavaScript, no build step. Jekyll copies it unchanged to GitHub Pages, because the files have no front matter.

| File | What it does |
|---|---|
| `demo/index.html` | The page: intro, box, Alexa's panel, the in-hand reader, the first-visit setup dialog, subtitles and the ending. Scripts load in order: data, understand, voice, game, meaning (a module). |
| `demo/data.js` | All the content. The header comments explain every field. See the list below the table. |
| `demo/game.js` | The game. See the list below the table. |
| `demo/understand.js` | Matching a question to an answer. The sentence model first finds the item a question is about (by `label`, `name` and `about`), then scores every answer by its closest example, nudging answers the item `links` to. The result is an answer, a hedge, an unknown-item line or a fallback. Word matching (`keys`) is used until the model is ready, or if it can't run. |
| `demo/meaning.js` | Loads all-MiniLM-L6-v2 with Transformers.js 3.8.1 (`demo/lib/`, `demo/model/`) and caches the example vectors. It dispatches `chickencoop:meaning-ready` or `chickencoop:meaning-failed`. Add `?debug` to the address to log decisions. |
| `demo/voice.js` | `window.Voice`. See the voice section below. |
| `demo/listen-worker.js`, `demo/listen-worklet.js` | The Whisper worker, and audio capture on the audio thread (a busy page used to drop audio). |
| `demo/voice/alexa/` | 69 MP3s, plus `lines.json`, which maps each line's exact text to its file. |
| `demo/box/` | The images. See the naming below. |
| `tools/alexa-voice/` | Re-records Alexa's lines after `data.js` changes. Its README explains it. |
| `tools/tests/`, `tools/box-images/` | Tests, and the scripts that made the images. See `tools/README.md`. |

**What's in `demo/data.js`:**
- **`ITEMS`:** 26 things, with these fields:
  - `id`, `label`, `caption`, `pages`, `sides`;
  - `cut` (background-free image);
  - `in` (starts inside another thing);
  - `reach` (can be reached into);
  - `credit` (a stand-in photo);
  - `name`, `about`, `links` (used to understand questions).
- **`PILE`:** the starting arrangement. The first entry is the bottom of the pile.
- **`LID`, `TAKE_OUT`:** where the lid lies, and where things land when taken out.
- **Alexa's text:** `WELCOME`, `QA` (answers with example questions and keywords), `CODES`, `HEDGES`, `UNKNOWN_ITEM`, `FALLBACKS`.
- **Matching help:** `INTRO_PHRASES` (opening lines that count) and `VOICE_WORDS` (names Whisper is primed with).

**What `demo/game.js` does:**
- **Saving:** state is kept in `localStorage` under `chickencoop-demo-v2`. It holds `started`, `opened`, `log`, `ending`, `fallback`, `layout`, `handled` and `out`.
- **The pile:** drag to move a thing, tap or Enter to pick it up, arrow keys to nudge.
- **In hand:** turning over (`flip`), leafing through (`leaf`), looking closer (`zoom`), and taking things out (`reachIn`).
- **Opening:** the intro and the lid animation (`openLid`).
- **Talking:** the mics, hold Space to talk, and subtitles.
- **The rest:** the "Looked at:" line and the ending.

**Image naming:**
- **Ordinary images:** side *n* of a thing is `box/<id>-<n>.jpg`, and the pile's copy is `box/thumb/<id>.jpg`.
- **Cut-outs:** things photographed on a table use `box/cut/<id>.webp` and `box/cut/thumb/<id>.webp`. Their backs are `box/cut/<id>-2.webp`.
- **Opening images:** `box/lid-top.jpg` is used only by the opening animation, and `box/box-closed.jpg` is the intro photo.

**Voice:**
- **The first visit** asks whether the player wants a microphone and speakers or a keyboard. The choice is saved as `chickencoop-setup`, and voice on or off as `chickencoop-voice`. Both survive "Start over".
- **Listening:**
  - The browser's own recogniser is used where it works (Chrome, Edge, Safari), with continuous listening while Space is held.
  - Everywhere else, the page records and runs Whisper tiny.en on the device (Brave, which is detected with `navigator.brave`; Firefox; or after the built-in recogniser fails).
  - A watchdog abandons the built-in recogniser if it hasn't started after 4 s. In headless Chromium it never starts.
- **Speaking:**
  - Recorded clips play through one reusable audio element, unlocked on the first tap.
  - A reply made of two lines (a hedge, then the answer) plays both clips.
  - Any line without a clip falls back to the browser's own voice, preferring NZ, AU or GB women's voices.
- **Where players can talk:** a mic beside the intro, a mic in Alexa's panel, a mic in the reader, a mic over the table on phones, and, for players who chose the microphone, hold Space anywhere except in a text box. Subtitles show when Alexa's panel is out of sight.

**Opening:**
- The intro fades, then the lid lifts, turns over and lands exactly where the lid lies beside the box. This is a WAAPI animation of a stand-in element.
- Her sentence model starts loading only after the lid lands, because loading it blocks the page and made the lid stutter.
- On phones the box shows during the animation, then the Alexa tab.

## Testing a change

Playwright and Chromium are already installed in these cloud sessions. On the owner's Mac they aren't: install them into a scratch folder (`npm install playwright`, then `npx playwright install chromium`) and run the suites with `NODE_PATH=<that folder>/node_modules`. The image scripts need a Python environment with Pillow, NumPy and `opencv-python-headless`. Serve the repo from its root, then run the suites. Each one takes a directory for screenshots and, optionally, a site address.

```sh
python3 -m http.server 8765 --bind 127.0.0.1 &
node tools/tests/box.js /tmp/shots-box        # 81 checks: pile, turning over, leafing, kete/envelope, saving, "Looked at", phones
node tools/tests/answers.js /tmp/shots-ans    # 18 checks: plain-language answers, hedges, codes, word matching
node tools/tests/voice.js /tmp/shots-voice    # 101 checks, about 10 minutes: listening, speaking, setup, hold Space, lid
```

Every check prints PASS or FAIL. The suites should be fully green, at 81, 18 and 101. They take the live site's address as a second argument, so after a merge, wait until the live file has the change, then run them against `https://richdurham.github.io/chickencoop/demo/`.

**Answer accuracy:** when you change `QA` examples, item `about` text or `label`s, compare against `main` on the held-out questions. `tools/tests/accuracy/eval.mjs` runs the game's real matcher in Node and needs `npm install @huggingface/transformers@3.8.1` somewhere for its Node build. Current scores with the item step:
- `questions-1.json`: 69 of 76
- `questions-2.json`: 46 of 50
- `questions-slips.json`: 7 of 8

The remaining misses are listed by the script. Some are deliberate: questions about puzzle items get "I don't know".

**CI** runs only `jekyll build --future`. To check it locally, `gem install --user-install jekyll`, then `jekyll build --future -s . -d /tmp/site`.

**Pull requests:**
- Each session develops on its own `claude/...` branch.
- GitHub deletes the branch when a pull request is merged, so restart the branch from `main` for the next change.
- Commit messages explain the change for the owner, in plain words.

## What's next

1. **Option 2, handling things by hand.** The owner chose this as the next big feature. It would add:
   - **In the enlarged view:**
     - drag to move a thing;
     - rotate it, with a two-finger twist on phones, or a corner drag or the scroll wheel on computers;
     - flick or double-tap to turn it over;
     - pinch or scroll to zoom;
     - a "Put it straight" reset, so articles stay readable.
   - **On the table:** the same rotation, and things can lie face down until turned over.

   Things to watch:
   - Today a tap looks closer and a swipe turns over or turns pages, so those gestures need reassigning.
   - Every gesture needs a keyboard equivalent.
   - Phones are cramped.
   - `tools/tests/box.js` will need updating.

   A full 3D version was discussed and not chosen.
2. **Alexa's lines.** The coins answer ("They are euros…") no longer matches the kuna. If the owner edits lines in `data.js`, follow `tools/alexa-voice/README.md`. `make.py` records only new or changed lines and removes stale clips. Hand recordings are dropped in under the file name listed in `script.md`.

## Known quirks

- **Phones:** if the player taps "The box" during the lid animation, the view still switches to Alexa when the lid lands. This is minor.
- **The post-it:** it is on the lid in the intro photo, and in the pile once the box is open. This is by design.
- **The dog tags' back:** turned over, the tag that was on top stays on top, which real tags wouldn't. The part of the lower tag that lies under the other was never photographed.
- **Unused recordings:** `UNKNOWN_ITEM` lines are recorded for every item, though items with `links` never use them. This is harmless.
- **The folder:** it has no `folder-cover-1.jpg`, because it opens straight onto its documents.
- **Adding to the pile:** new things in `PILE` appear for returning players in their starting spots, at the bottom. A thing a player moved keeps its spot and angle but always takes its size from `PILE` (or `TAKE_OUT`), so changing a size reaches returning players too.
- **Close calls in understanding:** the browser works out the example sentences' meanings 16 at a time, and its compressed model is slightly affected by which sentences share a batch. Adding or removing a sentence (an `about` line or a QA example) moves every later batch, which can tip answers that sit near a cutoff. The known one: "who are they" while holding the family photo, where the group photo scores 0.488 against the item cutoff of 0.50; at 0.507 Alexa answers about Igor instead of Ken. `eval.mjs` in Node doesn't batch, so it can't see this; after changing sentences, run `voice.js` as well. The dog tags and coins kept their number of `about` lines for this reason.
- **Tests:** in the test scripts, `URL` is the site address constant, so don't call `new URL(...)` there.
