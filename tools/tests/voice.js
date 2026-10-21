// Voice: listening (built-in recogniser, and Whisper when that isn't there or fails), Alexa speaking, the first-visit choice, and the lid coming off.
// Usage: node tools/tests/voice.js <screenshot-dir> [site address, default http://127.0.0.1:8765/demo/]
// Serve the repo first: python3 -m http.server 8765 --bind 127.0.0.1 (from the repo's root).
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2];
const URL = process.argv[3] || 'http://127.0.0.1:8765/demo/';
const CLIPS = __dirname + '/clips/';  // what the fake microphone hears

function check(cond, msg) {
  console.log((cond ? 'PASS ' : 'FAIL ') + msg);
  if (!cond) process.exitCode = 1;
}

/* Stand-ins for what a headless browser lacks: a voice to speak with, a microphone
   that "hears" a given clip, and (optionally) a working built-in recogniser. */
function fakes(opts) {
  return `(() => {
    const opts = ${JSON.stringify(opts)};
    // The first-visit choice, unless the test is about it; and what the browser says about the microphone.
    if (opts.setup !== null) try { localStorage.setItem('chickencoop-setup', opts.setup || 'voice'); } catch (e) {}
    window.__permission = opts.permission || 'prompt';
    const query = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = d => d && d.name === 'microphone' ? Promise.resolve({ state: window.__permission }) : query(d);
    // Speech synthesis: record what she says; each line takes __speakMs.
    window.__spoken = []; window.__speakMs = 30; window.__cancels = 0;
    class Utterance { constructor(t) { this.text = t; this.volume = 1; this.voice = null; this.lang = ''; } }
    const synth = {
      speaking: false, paused: false, _q: [], _now: null, _t: null,
      getVoices: () => opts.voices,
      speak(u) { this._q.push(u); if (!this._now) this._next(); },
      _next() {
        const u = this._q.shift();
        this._now = u || null; this.speaking = !!u;
        if (!u) return;
        window.__spoken.push({ text: u.text, voice: u.voice && u.voice.name, volume: u.volume });
        this._t = setTimeout(() => { this._now = null; u.onend && u.onend({}); this._next(); }, window.__speakMs);
      },
      cancel() {
        window.__cancels++;
        clearTimeout(this._t);
        const all = (this._now ? [this._now] : []).concat(this._q);
        this._q = []; this._now = null; this.speaking = false;
        all.forEach(u => u.onerror && u.onerror({ error: 'interrupted' }));
      },
      pause() {}, resume() {}, addEventListener() {}
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    window.SpeechSynthesisUtterance = Utterance;

    // Alexa's recordings: record which clips play; each takes __speakMs ('real' plays them, four times as fast).
    window.__played = []; window.__pauses = 0; window.__playing = null;
    if (opts.audio === 'real') {
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () { window.__played.push(this.src.split('/demo/').pop()); this.playbackRate = 4; return play.call(this); };
    } else {
      HTMLMediaElement.prototype.play = function () {
        const el = this, src = el.src.split('/demo/').pop();
        window.__played.push(src);
        window.__playing = src;
        clearTimeout(el.__t);
        el.__t = setTimeout(() => { window.__playing = null; el.dispatchEvent(new Event('ended')); }, src === 'voice/silence.mp3' ? 5 : window.__speakMs);
        return Promise.resolve();
      };
      HTMLMediaElement.prototype.pause = function () { window.__pauses++; clearTimeout(this.__t); window.__playing = null; };
    }
    // The file a line is recorded in, from the game's own list.
    window.__clipOf = async text => { const m = (await (await fetch('voice/alexa/lines.json')).json()).lines; return m[text] ? 'voice/alexa/' + m[text] : null; };

    // Microphone: plays the clip named in __clip into the stream the page records.
    window.__clip = 'silence.wav'; window.__mics = 0; window.__denyMic = false;
    navigator.mediaDevices.getUserMedia = async () => {
      window.__mics++;
      if (window.__denyMic) throw new DOMException('Permission denied', 'NotAllowedError');
      const ctx = new AudioContext();
      const audio = await ctx.decodeAudioData(await (await fetch('/__clips/' + window.__clip)).arrayBuffer());
      const src = ctx.createBufferSource(); src.buffer = audio;
      const dest = ctx.createMediaStreamDestination();
      src.connect(dest); src.start();
      return dest.stream;
    };

    // Built-in recogniser: 'real' leaves the browser's own; 'works' hears __says; anything else fails with that error.
    window.__recStarts = 0; window.__says = '';
    if (opts.recognition !== 'real') {
      // Hears __says; stops by itself after it, unless continuous (a held key), then on stop().
      class Rec {
        start() {
          window.__recStarts++;
          window.__recContinuous = this.continuous;
          this._over = false;
          setTimeout(() => {
            if (opts.recognition === 'works') {
              this.onstart && this.onstart();
              const words = window.__says.split(' ');
              setTimeout(() => this.onresult && this.onresult({ results: [[{ transcript: words.slice(0, 2).join(' ') }]] }), 100);
              setTimeout(() => {
                this.onresult && this.onresult({ results: [[{ transcript: window.__says }]] });
                if (!this.continuous) { this._over = true; this.onend && this.onend(); }
              }, 900);
            } else { this.onerror && this.onerror({ error: opts.recognition }); this.onend && this.onend(); }
          }, 50);
        }
        stop() { if (!this._over) { this._over = true; setTimeout(() => this.onend && this.onend(), 30); } }
        abort() { this.stop(); }
      }
      window.SpeechRecognition = window.webkitSpeechRecognition = Rec;
    }
    if (opts.brave) navigator.brave = { isBrave: async () => true };
    window.addEventListener('chickencoop:meaning-ready', () => { window.__meaningReady = true; });
    if (opts.noWorklet) delete window.AudioWorkletNode; // an older browser: recording falls back to the page
  })();`;
}

const VOICES = [
  { name: 'Daniel', lang: 'en-GB' },
  { name: 'Bad News', lang: 'en-US' },
  { name: 'Karen', lang: 'en-AU' },
  { name: 'Microsoft Mitchell Online (Natural) - English (New Zealand)', lang: 'en-NZ' },
  { name: 'Microsoft Molly Online (Natural) - English (New Zealand)', lang: 'en-NZ' },
  { name: 'Thomas', lang: 'fr-FR' }
];

async function newPage(browser, opts, viewport, more) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1440, height: 900 }, reducedMotion: 'reduce', ...(viewport ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}), ...(more || {}) });
  await ctx.route('**/__clips/*', r => r.fulfill({ body: fs.readFileSync(CLIPS + r.request().url().split('/').pop()), contentType: 'audio/wav' }));
  await ctx.addInitScript(fakes({ voices: VOICES, recognition: 'works', ...opts }));
  const page = await ctx.newPage();
  page.errors = [];
  page.whisper = [];
  page.on('pageerror', e => page.errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') page.errors.push('console: ' + m.text()); });
  ctx.on('response', r => { if (r.status() >= 400) page.errors.push(r.status() + ' ' + r.url()); });
  ctx.on('request', r => { if (/whisper-tiny|listen-worker/.test(r.url())) page.whisper.push(r.url()); });
  page.on('worker', w => w.on('console', m => { if (m.type() === 'error') page.errors.push('worker: ' + m.text()); }));
  await page.goto(URL);
  return page;
}

// A point where this thing is actually on top of the pile (things overlap and tilt).
async function spot(page, id) {
  const pt = await page.evaluate(id => {
    const el = document.querySelector('.thing[data-item="' + id + '"]');
    const r = el.getBoundingClientRect();
    for (let fy = 0.5; fy < 1; fy += 0.05) for (const sy of [1, -1]) for (let fx = 0.5; fx < 1; fx += 0.05) for (const sx of [1, -1]) {
      const x = r.left + r.width * (0.5 + sx * (fx - 0.5)), y = r.top + r.height * (0.5 + sy * (fy - 0.5));
      const hit = document.elementFromPoint(x, y);
      if (hit && hit.closest('.thing') === el) return { x, y };
    }
    return null;
  }, id);
  if (!pt) throw new Error('no visible spot on ' + id);
  return pt;
}
const herCount = p => p.$$eval('.msg--her', els => els.length);
const lastHer = p => p.$$eval('.msg--her', els => els[els.length - 1].textContent);
const lastYou = p => p.$$eval('.msg--you', els => els[els.length - 1].textContent);
async function talk(page, mic, clipOrWords) {
  await page.evaluate(c => { window.__clip = c; window.__says = c; }, clipOrWords);
  await page.click(mic);
}

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

  // ---------- A. A browser with working speech recognition (Chrome, Edge, Safari) ----------
  {
    const page = await newPage(browser, { recognition: 'works' });
    check(await page.isVisible('#intro-mic'), 'the closed box has a microphone beside "Say it"');
    await talk(page, '#intro-mic', 'Alexa, open the chicken coop');
    check(await page.waitForSelector('#intro-mic.is-listening', { timeout: 2000 }).then(() => true, () => false), 'the microphone glows while listening');
    await page.waitForSelector('#game:not([hidden])', { timeout: 15000 });
    check(true, 'saying "Alexa, open the chicken coop" opens the box');
    await page.waitForFunction(() => document.querySelectorAll('.msg--her').length >= 3);
    await page.waitForFunction(() => window.__played.filter(f => f.startsWith('voice/alexa/')).length >= 3);
    const welcome = await page.evaluate(async () => ({ played: window.__played.filter(f => f.startsWith('voice/alexa/')).slice(0, 3), want: await Promise.all(WELCOME.map(window.__clipOf)) }));
    check(JSON.stringify(welcome.played) === JSON.stringify(welcome.want), 'Alexa says her welcome from its recordings, in order');
    check(await page.evaluate(() => window.__spoken.filter(s => s.volume > 0).length === 0), 'recorded lines don’t also go to the browser’s voice');
    check(await page.evaluate(() => window.__played[0] === 'voice/silence.mp3' && window.__spoken.some(s => s.volume === 0)), 'the first tap plays a moment of silence (iPhones need that)');
    check(page.whisper.length === 0, 'with a working built-in recogniser, Whisper is never downloaded');
    check(await page.isVisible('#ask-mic') && await page.isVisible('#voice-toggle'), 'Alexa has a microphone and a voice switch');

    // A question, said aloud.
    let n = await herCount(page);
    await page.evaluate(() => { window.__says = 'Alexa, who is her husband'; });
    await page.click('#ask-mic');
    const interim = await page.waitForFunction(() => document.getElementById('ask-input').value === 'Alexa, who', null, { timeout: 2000 }).then(() => true, () => false);
    check(interim, 'words show in the box as they are heard');
    await page.screenshot({ path: OUT + '/v01-listening.png' });
    await page.waitForFunction(k => document.querySelectorAll('.msg--her').length > k, n, { timeout: 20000 });
    check((await lastYou(page)) === 'Alexa, who is her husband', 'what was heard is sent as the player’s message');
    check((await lastHer(page)).includes('Ken is Katie'), 'and Alexa answers it (her name in front is ignored)');
    const kenClip = await page.evaluate(() => window.__clipOf(QA.find(q => q.id === 'ken').a));
    await page.waitForFunction(c => window.__played.includes(c), kenClip);
    check(true, 'she says the answer aloud, from its recording');

    // A code, said aloud: numbers read digit by digit when she repeats them.
    n = await herCount(page);
    await page.evaluate(() => { window.__says = 'release falcon six one six'; });
    await page.click('#ask-mic');
    await page.waitForFunction(k => document.querySelectorAll('.msg--her').length > k, n, { timeout: 20000 });
    const confirm = await page.evaluate(() => CODES.release.confirm);
    check((await lastHer(page)) === confirm, 'a spoken code ("six one six") gets the code’s reply');
    check(await page.$eval('#ask-input', i => !i.disabled), 'the short code still only asks "are you sure?"');

    // Turning her voice off, and it staying off.
    await page.click('#voice-toggle');
    check(await page.$eval('#voice-toggle', b => b.getAttribute('aria-pressed') === 'false' && b.classList.contains('is-off')), 'the voice switch turns her voice off');
    const before = await page.evaluate(() => window.__spoken.length + window.__played.length);
    n = await herCount(page);
    await page.fill('#ask-input', 'who is tim');
    await page.press('#ask-input', 'Enter');
    await page.waitForFunction(k => document.querySelectorAll('.msg--her').length > k, n, { timeout: 20000 });
    await page.waitForTimeout(300);
    check((await page.evaluate(() => window.__spoken.length + window.__played.length)) === before, 'with her voice off, she only writes');
    await page.reload();
    await page.click('#resume');
    check(await page.$eval('#voice-toggle', b => b.getAttribute('aria-pressed') === 'false'), 'her voice stays off after a reload');
    await page.click('#voice-toggle');
    check(await page.$eval('#voice-toggle', b => b.getAttribute('aria-pressed') === 'true'), 'and can be turned back on');
    check((await page.evaluate(() => window.__spoken.filter(x => x.volume > 0).length + window.__played.filter(f => f.startsWith('voice/alexa/')).length)) === 0, 'going back to the box doesn’t repeat what she already said');

    // Talking over her: she stops so the microphone doesn't hear her.
    await page.evaluate(() => { window.__speakMs = 8000; });
    n = await herCount(page);
    await page.fill('#ask-input', 'who is katie');
    await page.press('#ask-input', 'Enter');
    await page.waitForFunction(k => document.querySelectorAll('.msg--her').length > k, n, { timeout: 20000 });
    await page.waitForFunction(() => window.__playing && window.__playing.startsWith('voice/alexa/'));
    const pauses = await page.evaluate(() => window.__pauses);
    await page.evaluate(() => { window.__speakMs = 30; window.__says = 'who is igor'; });
    await page.click('#ask-mic');
    check((await page.evaluate(() => window.__pauses)) > pauses && !(await page.evaluate(() => window.__playing)), 'tapping the microphone while she talks stops her talking');
    await page.waitForFunction(() => [...document.querySelectorAll('.msg--you')].pop().textContent === 'who is igor', null, { timeout: 20000 });
    check(true, 'and listens to the player instead');

    // Nothing heard.
    await page.waitForTimeout(1500);
    const sent = await page.$$eval('.msg--you', els => els.length);
    await page.evaluate(() => { window.__says = ''; });
    await page.click('#ask-mic');
    await page.waitForFunction(() => /catch that/.test(document.getElementById('ask-input').placeholder), null, { timeout: 5000 });
    check((await page.$$eval('.msg--you', els => els.length)) === sent, 'if nothing is heard, nothing is sent, and the box says so');
    check((await page.textContent('#voice-status')).includes('catch that'), 'screen readers hear it too');
    check(page.errors.length === 0, 'no errors' + (page.errors.length ? ': ' + page.errors.join(' | ') : ''));
    await page.context().close();
  }

  // ---------- B. Built-in recogniser offered but failing (Brave, some iPhone apps): Whisper takes over ----------
  {
    const page = await newPage(browser, { recognition: 'network' });
    const t0 = Date.now();
    await talk(page, '#intro-mic', 'open.wav');
    const waited = await page.waitForFunction(() => /Getting ready|Working out/.test(document.getElementById('intro-input').placeholder), null, { timeout: 20000 }).then(() => true, () => false);
    check(waited, 'when the built-in recogniser fails, the page records instead and says it is getting ready');
    await page.screenshot({ path: OUT + '/v02-getting-ready.png' });
    await page.waitForSelector('#game:not([hidden])', { timeout: 120000 });
    console.log(`     first time (download Whisper + transcribe): ${((Date.now() - t0) / 1000).toFixed(1)}s from the tap`);
    check(page.whisper.some(u => /encoder_model_quantized/.test(u)) && page.whisper.every(u => u.startsWith(URL.replace(/^(https?:..[^/]+).*/, '$1'))), 'Whisper comes from this site');
    check(true, 'Whisper heard "Alexa, open the chicken coop" and the box opened');
    const starts = await page.evaluate(() => window.__recStarts);
    await page.waitForFunction(() => document.querySelectorAll('.msg--her').length >= 3);

    let n = await herCount(page);
    await page.evaluate(() => {
      window.__marks = [];
      const t0 = performance.now(), input = document.getElementById('ask-input');
      new MutationObserver(() => window.__marks.push([Math.round(performance.now() - t0), input.placeholder])).observe(input, { attributes: true, attributeFilter: ['placeholder'] });
      new MutationObserver(m => m.forEach(r => r.addedNodes.forEach(el => el.classList && /msg--(you|her)/.test(el.className) && window.__marks.push([Math.round(performance.now() - t0), el.className])))).observe(document.getElementById('log'), { childList: true });
    });
    let t = Date.now();
    await talk(page, '#ask-mic', 'husband.wav');
    await page.waitForFunction(k => document.querySelectorAll('.msg--her').length > k, n, { timeout: 60000 });
    console.log(`     next time: ${((Date.now() - t) / 1000).toFixed(1)}s from the tap to her answer; the speech in the clip ends at ${(0.5 + 1.75).toFixed(1)}s`);
    console.log('     timeline (ms): ' + (await page.evaluate(() => window.__marks.map(m => m[0] + ' ' + m[1]).join(' | '))));
    console.log(`     heard: ${JSON.stringify(await lastYou(page))}`);
    check(/husband/i.test(await lastYou(page)) && (await lastHer(page)).includes('Ken is Katie'), 'Whisper hears a question and Alexa answers it');
    check((await page.evaluate(() => window.__recStarts)) === starts, 'after the built-in recogniser fails once, it isn’t tried again');

    n = await herCount(page);
    await talk(page, '#ask-mic', 'release.wav');
    await page.waitForFunction(k => document.querySelectorAll('.msg--her').length > k, n, { timeout: 60000 });
    console.log(`     heard: ${JSON.stringify(await lastYou(page))}`);
    check((await lastHer(page)) === (await page.evaluate(() => CODES.release.confirm)), 'a code said aloud works through Whisper too');

    const sent = await page.$$eval('.msg--you', els => els.length);
    await talk(page, '#ask-mic', 'silence.wav');
    await page.waitForFunction(() => /catch that/.test(document.getElementById('ask-input').placeholder), null, { timeout: 15000 });
    check((await page.$$eval('.msg--you', els => els.length)) === sent, 'room noise with nothing said sends nothing (no made-up words)');

    await page.evaluate(() => { window.__denyMic = true; });
    await page.click('#ask-mic');
    await page.waitForFunction(() => /blocked/.test(document.getElementById('ask-input').placeholder), null, { timeout: 5000 });
    check(true, 'a blocked microphone says so');
    await page.screenshot({ path: OUT + '/v03-blocked.png' });
    check(page.errors.length === 0, 'no errors' + (page.errors.length ? ': ' + page.errors.join(' | ') : ''));
    await page.context().close();
  }

  // ---------- C. Brave: the built-in recogniser is never tried ----------
  {
    const page = await newPage(browser, { recognition: 'works', brave: true });
    await talk(page, '#intro-mic', 'henhouse.wav');
    await page.waitForFunction(() => document.getElementById('intro-reply').textContent.length > 0, null, { timeout: 120000 });
    check((await page.evaluate(() => window.__recStarts)) === 0, 'in Brave, the page goes straight to recording');
    check((await page.textContent('#intro-reply')) === (await page.evaluate(() => START_HINT)) && await page.isHidden('#game'), 'saying the wrong line doesn’t open the box; Alexa says how');
    console.log(`     heard: ${JSON.stringify(await page.inputValue('#intro-input'))}`);
    const hintClip = await page.evaluate(() => window.__clipOf(START_HINT));
    await page.waitForFunction(c => window.__played.includes(c), hintClip);
    check(true, 'and she says it aloud');
    check(page.errors.length === 0, 'no errors' + (page.errors.length ? ': ' + page.errors.join(' | ') : ''));
    await page.context().close();
  }

  // ---------- D. A phone ----------
  {
    const page = await newPage(browser, { recognition: 'works' }, { width: 390, height: 844 });
    await page.screenshot({ path: OUT + '/v04-phone-intro.png' });
    await talk(page, '#intro-mic', 'Alexa, open the chicken coop');
    await page.waitForSelector('#game:not([hidden])', { timeout: 15000 });
    await page.waitForFunction(() => document.querySelectorAll('.msg--her').length >= 3);
    const fit = await page.evaluate(() => {
      const r = id => document.getElementById(id).getBoundingClientRect();
      return { mic: r('ask-mic'), input: r('ask-input'), toggle: r('voice-toggle'), vw: innerWidth, over: document.documentElement.scrollWidth - innerWidth };
    });
    check(fit.mic.right <= fit.vw && fit.toggle.right <= fit.vw && fit.over <= 0 && fit.input.width > 150, `the microphone and voice switch fit on a phone (box ${Math.round(fit.input.width)}px wide)`);
    await page.evaluate(() => { window.__says = 'what is the virus'; });
    await page.tap('#ask-mic');
    await page.waitForTimeout(300);
    await page.screenshot({ path: OUT + '/v05-phone-listening.png' });
    await page.waitForFunction(() => [...document.querySelectorAll('.msg--you')].pop()?.textContent === 'what is the virus', null, { timeout: 15000 });
    check(true, 'tapping the microphone on a phone works');
    await page.screenshot({ path: OUT + '/v06-phone-alexa.png' });
    check(page.errors.length === 0, 'no errors' + (page.errors.length ? ': ' + page.errors.join(' | ') : ''));
    await page.context().close();
  }
  // ---------- F. The first visit: talk or type? ----------
  {
    const page = await newPage(browser, { setup: null });
    await page.waitForSelector('#setup:not([hidden])', { timeout: 3000 });
    check(true, 'a first visit asks: microphone and speakers, or keyboard and text');
    check(await page.evaluate(() => document.activeElement.id === 'setup-voice'), 'the microphone choice is offered first');
    await page.screenshot({ path: OUT + '/v07-setup.png' });
    await page.click('#setup-text');
    check(await page.isHidden('#setup') && (await page.evaluate(() => window.__mics)) === 0, 'choosing the keyboard closes it without asking for the microphone');
    check(await page.evaluate(() => localStorage.getItem('chickencoop-voice') === 'off'), 'and Alexa only writes');
    await page.click('#intro-form button[type="submit"]');
    check(await page.isHidden('#game') && /Type it in/.test(await page.textContent('#intro-reply')), 'an empty "Say it" doesn’t open the box; it asks for the line');
    await page.fill('#intro-input', 'Alexa, open the chicken coop');
    await page.click('#intro-form button[type="submit"]');
    await page.waitForSelector('#game:not([hidden])');
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.down('Space'); await page.waitForTimeout(300); await page.keyboard.up('Space');
    check((await page.evaluate(() => window.__recStarts)) === 0, 'for keyboard players, Space doesn’t start the microphone');
    await page.reload();
    await page.waitForTimeout(500);
    check(await page.isHidden('#setup'), 'the question isn’t asked again');
    check(page.errors.length === 0, 'no errors' + (page.errors.length ? ': ' + page.errors.join(' | ') : ''));
    await page.context().close();
  }
  {
    const page = await newPage(browser, { setup: null });
    await page.waitForSelector('#setup:not([hidden])', { timeout: 3000 });
    await page.click('#setup-voice');
    await page.waitForSelector('#setup', { state: 'hidden', timeout: 5000 });
    check((await page.evaluate(() => window.__mics)) === 1, 'choosing the microphone asks for it straight away');
    check(await page.evaluate(() => localStorage.getItem('chickencoop-setup') === 'voice' && localStorage.getItem('chickencoop-voice') !== 'off'), 'and turns Alexa’s voice on');
    await page.context().close();
  }
  {
    const page = await newPage(browser, { setup: null });
    await page.waitForSelector('#setup:not([hidden])', { timeout: 3000 });
    await page.evaluate(() => { window.__denyMic = true; });
    await page.click('#setup-voice');
    await page.waitForFunction(() => /blocked/.test(document.getElementById('setup-note').textContent), null, { timeout: 5000 });
    check(await page.isVisible('#setup'), 'if the microphone is blocked, it says so and lets them choose again');
    await page.screenshot({ path: OUT + '/v08-setup-blocked.png' });
    await page.click('#setup-text');
    check(await page.isHidden('#setup'), 'and the keyboard still works');
    await page.context().close();
  }
  {
    const page = await newPage(browser, { setup: null, permission: 'granted' });
    await page.waitForTimeout(800);
    check(await page.isHidden('#setup') && (await page.evaluate(() => localStorage.getItem('chickencoop-setup'))) === 'voice', 'if the microphone is already allowed, nothing is asked');
    await page.context().close();
  }

  // ---------- G. Talking while looking at something: hold Space, or the microphone in hand ----------
  {
    const page = await newPage(browser, { recognition: 'works' });
    await page.fill('#intro-input', 'Alexa, open the chicken coop');
    await page.click('#intro-form button[type="submit"]');
    await page.waitForSelector('#game:not([hidden])');
    await page.waitForFunction(() => document.querySelectorAll('.msg--her').length >= 3);
    await page.waitForTimeout(500);

    // Understanding "who are they?" needs her sentence model, a few seconds' download on the live site.
    await page.waitForFunction(() => window.__meaningReady, null, { timeout: 60000 });
    // Something in hand: hold Space and ask about it.
    const thing = await page.$('.thing[data-item="family-photo"]');
    await thing.focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('#reader:not([hidden])');
    check(await page.isVisible('#reader-mic'), 'something in hand has a microphone beside "put it back"');
    let n = await herCount(page);
    await page.evaluate(() => { window.__says = 'who are they'; });
    await page.keyboard.down('Space');
    await page.waitForSelector('#reader-mic.is-listening', { timeout: 2000 });
    check(await page.evaluate(() => window.__recContinuous === true), 'holding Space keeps listening through pauses');
    await page.waitForTimeout(1300);
    check(await page.isVisible('#subtitle') && (await page.textContent('#subtitle-text')).includes('who are they'), 'what they say shows over the thing in hand');
    await page.screenshot({ path: OUT + '/v09-space-held.png' });
    check(await page.evaluate(() => window.speechSynthesis && document.querySelector('#reader-mic').classList.contains('is-listening')), 'still listening while Space is held');
    await page.keyboard.up('Space');
    await page.waitForFunction(k => document.querySelectorAll('.msg--her').length > k, n, { timeout: 15000 });
    const answer = await lastHer(page);
    check((await lastYou(page)) === 'who are they' && /Ken/.test(answer), 'letting go sends it, and Alexa answers about what is in hand');
    check(await page.evaluate(() => document.activeElement.id === 'reader-turn' && !document.getElementById('hand').classList.contains('is-turned')), 'with the Turn button focused, holding Space talks and doesn’t turn the photo over');
    await page.waitForFunction(() => document.querySelector('#subtitle').classList.contains('subtitle--her'));
    check((await page.textContent('#subtitle-text')) === answer && await page.isVisible('#reader'), 'her answer shows over it, without putting it down');
    await page.screenshot({ path: OUT + '/v10-answer-in-hand.png' });

    // The microphone in hand, tapped.
    n = await herCount(page);
    await page.evaluate(() => { window.__says = 'who is the boy'; });
    await page.click('#reader-mic');
    await page.waitForFunction(k => document.querySelectorAll('.msg--her').length > k, n, { timeout: 15000 });
    check((await lastYou(page)) === 'who is the boy' && await page.isVisible('#reader'), 'tapping the microphone in hand works too');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(3500);

    // Space on a thing in the box listens instead of picking it up (Enter does that).
    const starts = await page.evaluate(() => window.__recStarts);
    await page.focus('.thing[data-item="mug"]');
    await page.evaluate(() => { window.__says = ''; });
    await page.keyboard.down('Space'); await page.waitForTimeout(400); await page.keyboard.up('Space');
    await page.waitForTimeout(300);
    check((await page.evaluate(() => window.__recStarts)) === starts + 1 && await page.isHidden('#reader'), 'Space in the box listens, and doesn’t pick things up');

    // Typing a space is still typing.
    await page.waitForTimeout(500);
    await page.focus('#ask-input');
    await page.keyboard.type('who is ');
    check((await page.inputValue('#ask-input')) === 'who is ' && (await page.evaluate(() => window.__recStarts)) === starts + 1, 'spaces typed in the text box are just spaces');
    check(page.errors.length === 0, 'no errors' + (page.errors.length ? ': ' + page.errors.join(' | ') : ''));
    await page.context().close();
  }

  // ---------- H. A phone, on the box tab: a microphone over the table, and subtitles ----------
  {
    const page = await newPage(browser, { recognition: 'works' }, { width: 390, height: 844 });
    await page.fill('#intro-input', 'Alexa, open the chicken coop');
    await page.tap('#intro-form button[type="submit"]');
    await page.waitForSelector('#game:not([hidden])');
    await page.waitForFunction(() => document.querySelectorAll('.msg--her').length >= 3);
    check(await page.isHidden('#box-mic'), 'on Alexa’s tab the table’s microphone isn’t needed');
    await page.tap('#tab-box');
    await page.waitForTimeout(300);
    const r = await page.$eval('#box-mic', b => { const x = b.getBoundingClientRect(); return { right: x.right, bottom: x.bottom, w: x.width, vw: innerWidth, vh: innerHeight }; });
    check(r.w > 40 && r.right <= r.vw && r.bottom <= r.vh, 'the box tab has a microphone in reach');
    const n = await herCount(page);
    await page.evaluate(() => { window.__says = 'what are the coins for'; });
    await page.tap('#box-mic');
    await page.waitForFunction(k => document.querySelectorAll('.msg--her').length > k, n, { timeout: 15000 });
    await page.waitForFunction(() => document.querySelector('#subtitle').classList.contains('subtitle--her'));
    check((await page.textContent('#subtitle-text')) === (await lastHer(page)) && await page.isVisible('#tab-alexa-new'), 'her answer shows over the box, and her tab is marked new');
    await page.screenshot({ path: OUT + '/v11-phone-box-answer.png' });
    // In hand on a phone.
    { const p = await spot(page, 'summer-school'); await page.touchscreen.tap(p.x, p.y); }
    await page.waitForSelector('#reader:not([hidden])');
    const m = await page.$eval('#reader-mic', b => { const x = b.getBoundingClientRect(); return x.right <= innerWidth && x.width > 30; });
    check(m, 'something in hand on a phone has the microphone too');
    await page.evaluate(() => { window.__says = 'who are these people'; });
    await page.tap('#reader-mic');
    await page.waitForFunction(() => document.querySelector('#subtitle').classList.contains('subtitle--her'), null, { timeout: 15000 });
    const sub = await page.$eval('#subtitle', el => { const s = el.getBoundingClientRect(), f = document.querySelector('.reader__foot').getBoundingClientRect(); return { above: s.bottom <= f.top, inside: s.left >= 0 && s.right <= innerWidth }; });
    check(sub.above && sub.inside, 'her answer sits above the buttons of the thing in hand');
    await page.screenshot({ path: OUT + '/v12-phone-in-hand.png' });
    check(page.errors.length === 0, 'no errors' + (page.errors.length ? ': ' + page.errors.join(' | ') : ''));
    await page.context().close();
  }

  // ---------- I. Holding Space where Whisper listens (Brave) ----------
  {
    const page = await newPage(browser, { recognition: 'works', brave: true });
    await page.fill('#intro-input', 'Alexa, open the chicken coop');
    await page.click('#intro-form button[type="submit"]');
    await page.waitForSelector('#game:not([hidden])');
    await page.waitForFunction(() => document.querySelectorAll('.msg--her').length >= 3);
    await page.waitForTimeout(400);
    const n = await herCount(page);
    await page.evaluate(() => { window.__clip = 'release.wav'; document.activeElement.blur(); });
    await page.keyboard.down('Space');
    await page.waitForTimeout(5000); // the clip, then its silence: held, so it keeps listening
    check(await page.$eval('#ask-mic', b => b.classList.contains('is-listening')), 'with Whisper too, holding Space listens through the silence');
    await page.keyboard.up('Space');
    await page.waitForFunction(k => document.querySelectorAll('.msg--her').length > k, n, { timeout: 120000 });
    console.log(`     heard: ${JSON.stringify(await lastYou(page))}`);
    check((await lastHer(page)) === (await page.evaluate(() => CODES.release.confirm)), 'letting go sends what Whisper heard');
    check(page.errors.length === 0, 'no errors' + (page.errors.length ? ': ' + page.errors.join(' | ') : ''));
    await page.context().close();
  }

  // ---------- J. A busy page while the player talks (another model setting up), and an older browser ----------
  for (const noWorklet of [false, true]) {
    const page = await newPage(browser, { recognition: 'works', brave: true, noWorklet });
    await page.fill('#intro-input', 'Alexa, open the chicken coop');
    await page.click('#intro-form button[type="submit"]');
    await page.waitForSelector('#game:not([hidden])');
    await page.waitForFunction(() => document.querySelectorAll('.msg--her').length >= 3);
    // The page recorder loses sound while the page is busy, so let her model finish setting up first.
    if (noWorklet) await page.waitForFunction(() => window.__meaningReady, null, { timeout: 60000 });
    const n = await herCount(page);
    await talk(page, '#ask-mic', 'husband.wav');
    if (!noWorklet) {
      // Freeze the page for half a second in every 0.7 s while they talk.
      await page.evaluate(() => { const until = performance.now() + 4000; const t = setInterval(() => { const e = performance.now() + 500; while (performance.now() < e) {} if (performance.now() > until) clearInterval(t); }, 700); });
    }
    await page.waitForFunction(k => document.querySelectorAll('.msg--her').length > k, n, { timeout: 60000 });
    const heard = await lastYou(page);
    check(/katie.s husband/i.test(heard), noWorklet
      ? `without an audio thread to record on, the page records it itself (heard ${JSON.stringify(heard)})`
      : `a busy page loses none of what was said (heard ${JSON.stringify(heard)})`);
    check(page.errors.length === 0, 'no errors' + (page.errors.length ? ': ' + page.errors.join(' | ') : ''));
    await page.context().close();
  }

  // ---------- O. The opening line as speech recognition sometimes hears it ----------
  {
    const page = await newPage(browser, { recognition: 'works' });
    await talk(page, '#intro-mic', 'Alexa, open a chicken coop.');
    const opened = await page.waitForSelector('#game:not([hidden])', { timeout: 15000 }).then(() => true, () => false);
    check(opened, 'heard as "Alexa, open a chicken coop", the line still opens the box');
    await page.context().close();
    const page2 = await newPage(browser, { recognition: 'works' });
    await talk(page2, '#intro-mic', 'Alexa, open the hen house.');
    await page2.waitForFunction(() => document.getElementById('intro-reply').textContent.length > 0, null, { timeout: 15000 });
    check(await page2.isHidden('#game'), 'but another line still doesn’t');
    await page2.context().close();
  }

  // ---------- K. Replies made of two recordings, and lines with none ----------
  {
    const page = await newPage(browser, { recognition: 'works' });
    await page.fill('#intro-input', 'Alexa, open the chicken coop');
    await page.click('#intro-form button[type="submit"]');
    await page.waitForFunction(() => document.querySelectorAll('.msg--her').length >= 3);
    await page.waitForFunction(() => !window.__playing);
    const pair = await page.evaluate(async () => {
      const ken = QA.find(q => q.id === 'ken');
      const hedge = HEDGES.topic.replace('{topic}', ken.topic);
      const from = window.__played.length;
      await Voice.say(hedge + ' ' + ken.a);
      return { played: window.__played.slice(from), want: [await window.__clipOf(hedge), await window.__clipOf(ken.a)] };
    });
    check(JSON.stringify(pair.played) === JSON.stringify(pair.want), 'a hedged answer plays the hedge, then the answer');
    const unrecorded = await page.evaluate(async () => { const n = window.__played.length; await Voice.say('A line nobody has recorded yet.'); return { played: window.__played.length - n, spoken: window.__spoken.map(s => s.text) }; });
    check(unrecorded.played === 0 && unrecorded.spoken.includes('A line nobody has recorded yet.'), 'a line with no recording is read by the browser’s voice');
    check(page.errors.length === 0, 'no errors' + (page.errors.length ? ': ' + page.errors.join(' | ') : ''));
    await page.context().close();
  }
  {
    // No recordings at all (say the list didn't load): the browser's voice reads everything.
    const page = await newPage(browser, { recognition: 'works' }, null, {});
    await page.context().route('**/voice/alexa/lines.json', r => r.fulfill({ status: 404, body: '' }));
    await page.reload();
    await page.fill('#intro-input', 'Alexa, open the chicken coop');
    await page.click('#intro-form button[type="submit"]');
    await page.waitForFunction(() => window.__spoken.filter(s => s.volume > 0).length >= 3);
    const spoken = await page.evaluate(() => window.__spoken.filter(s => s.volume > 0));
    check(spoken.every(s => s.voice === 'Microsoft Molly Online (Natural) - English (New Zealand)'), `without recordings, the browser reads her lines, in a New Zealand woman's voice if there is one (${spoken[0] && spoken[0].voice})`);
    const n = await herCount(page);
    await page.fill('#ask-input', 'release falcon 616');
    await page.press('#ask-input', 'Enter');
    await page.waitForFunction(k => document.querySelectorAll('.msg--her').length > k, n);
    await page.waitForFunction(() => window.__spoken.some(s => /6 1 6/.test(s.text)));
    check(true, 'and reads codes digit by digit');
    const others = page.errors.filter(e => !/lines\.json|Failed to load resource: the server responded with a status of 404/.test(e)); // the list we took away
    check(others.length === 0, 'no other errors' + (others.length ? ': ' + others.join(' | ') : ''));
    await page.context().close();
  }

  // ---------- L. The recordings really play (in a browser, sped up) ----------
  {
    const page = await newPage(browser, { recognition: 'works', audio: 'real' });
    await page.fill('#intro-input', 'Alexa, open the chicken coop');
    const t0 = Date.now();
    await page.click('#intro-form button[type="submit"]');
    await page.waitForFunction(() => document.querySelectorAll('.msg--her').length >= 3, null, { timeout: 60000 });
    await page.waitForFunction(() => window.__played.filter(f => f.startsWith('voice/alexa/')).length >= 3, null, { timeout: 60000 });
    await page.waitForTimeout(4500);
    const real = await page.evaluate(() => ({ spoken: window.__spoken.filter(s => s.volume > 0).length, played: window.__played.filter(f => f.startsWith('voice/alexa/')).length }));
    console.log(`     the three welcome recordings played in ${((Date.now() - t0) / 1000).toFixed(1)}s at four times speed`);
    check(real.played === 3 && real.spoken === 0, 'the welcome recordings load, play to the end one after another, and need no stand-in voice');
    check(page.errors.length === 0, 'no errors' + (page.errors.length ? ': ' + page.errors.join(' | ') : ''));
    await page.context().close();
  }

  // ---------- M. The lid coming off at the start ----------
  for (const phone of [false, true]) {
    const page = await newPage(browser, { recognition: 'works' }, phone ? { width: 390, height: 844 } : null, { reducedMotion: 'no-preference' });
    await page.fill('#intro-input', 'Alexa, open the chicken coop');
    await page[phone ? 'tap' : 'click']('#intro-form button[type="submit"]');
    await page.waitForSelector('.lid-cover', { state: 'attached', timeout: 5000 });
    await page.waitForFunction(() => document.querySelector('.lid-cover').getAnimations().length, null, { timeout: 5000 });
    await page.evaluate(() => document.querySelector('.lid-cover').getAnimations()[0].pause());
    const during = await page.evaluate(() => ({ lidHidden: document.querySelector('.thing[data-item="lid-inside"]').style.visibility === 'hidden', said: document.querySelectorAll('.msg--her').length, view: document.querySelector('.stage').dataset.view }));
    check(during.lidHidden && during.said === 0 && during.view === 'box', `${phone ? 'phone' : 'desktop'}: the box opens first, lid on, before Alexa says anything`);
    const lasts = await page.evaluate(() => document.querySelector('.lid-cover').getAnimations()[0].effect.getTiming().duration);
    check(lasts >= 2000, `${phone ? 'phone' : 'desktop'}: the lid takes its time coming off (${lasts} ms)`);
    for (const ms of [400, 1200, 1900]) {
      await page.evaluate(t => { const a = document.querySelector('.lid-cover').getAnimations()[0]; a.pause(); a.currentTime = t; }, ms);
      await page.screenshot({ path: OUT + `/v2${phone ? 'p' : 'd'}-lid-${ms}.png` });
    }
    // Just before it lands: is the moving lid exactly where the real one lies?
    const fit = await page.evaluate(() => {
      const a = document.querySelector('.lid-cover').getAnimations()[0];
      a.currentTime = a.effect.getTiming().duration - 1;
      const c = document.querySelector('.lid-cover').getBoundingClientRect(), l = document.querySelector('.thing[data-item="lid-inside"]').getBoundingClientRect();
      const r = { dx: Math.abs((c.left + c.right) / 2 - (l.left + l.right) / 2), dy: Math.abs((c.top + c.bottom) / 2 - (l.top + l.bottom) / 2), dw: Math.abs(c.width - l.width), dh: Math.abs(c.height - l.height) };
      a.play();
      return r;
    });
    check(fit.dx < 3 && fit.dy < 3 && fit.dw < 4 && fit.dh < 4, `${phone ? 'phone' : 'desktop'}: the lid lands exactly where it lies (off by ${Math.round(Math.max(fit.dx, fit.dy, fit.dw, fit.dh))}px)`);
    await page.waitForSelector('.lid-cover', { state: 'detached', timeout: 5000 });
    await page.waitForFunction(() => document.querySelectorAll('.msg--her').length >= 1, null, { timeout: 10000 });
    const after = await page.evaluate(() => ({ lidShown: document.querySelector('.thing[data-item="lid-inside"]').style.visibility === '', view: document.querySelector('.stage').dataset.view }));
    check(after.lidShown && (phone ? after.view === 'alexa' : true), phone ? 'phone: then Alexa’s tab comes up and she begins' : 'desktop: then Alexa begins');
    await page.screenshot({ path: OUT + `/v2${phone ? 'p' : 'd'}-landed.png` });
    check(page.errors.length === 0, 'no errors' + (page.errors.length ? ': ' + page.errors.join(' | ') : ''));
    await page.context().close();
  }

  // ---------- N. A question in the first moments, before her sentence model is ready ----------
  {
    const page = await newPage(browser, { recognition: 'works' });
    // A slower connection: the sentence model takes 2.5 s more to arrive.
    await page.context().route('**/all-MiniLM-L6-v2/onnx/model_quantized.onnx', async r => { await new Promise(x => setTimeout(x, 2500)); await r.continue(); });
    await page.fill('#intro-input', 'Alexa, open the chicken coop');
    await page.click('#intro-form button[type="submit"]');
    await page.waitForSelector('#game:not([hidden])');
    const thing = await page.$('.thing[data-item="family-photo"]');
    await thing.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    const loading = await page.evaluate(() => window.Meaning && window.Meaning.loading);
    const n = await herCount(page);
    const t = Date.now();
    await page.fill('#ask-input', 'who are they');
    await page.press('#ask-input', 'Enter');
    // Her answer: her first line that isn't part of the welcome (which may still be going).
    const reply = () => [...document.querySelectorAll('.msg--her')].map(e => e.textContent).find(t => !WELCOME.includes(t));
    await page.waitForFunction(reply, null, { timeout: 30000 });
    const answer = await page.evaluate(reply);
    check(loading && /Ken/.test(answer), `asked while her model was still loading, she waits for it and answers properly (${((Date.now() - t) / 1000).toFixed(1)}s, ${JSON.stringify(answer.slice(0, 40))})`);
    check(page.errors.length === 0, 'no errors' + (page.errors.length ? ': ' + page.errors.join(' | ') : ''));
    await page.context().close();
  }

  await browser.close();

  // ---------- E. A real (fake-device) microphone and the browser's own recogniser, no stand-ins for listening ----------
  {
    const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=' + CLIPS + 'open.wav', '--autoplay-policy=no-user-gesture-required'] });
    const ctx = await b.newContext({ permissions: ['microphone'] });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(URL);
    await page.click('#intro-mic');
    const opened = await page.waitForSelector('#game:not([hidden])', { timeout: 120000 }).then(() => true, () => false);
    console.log(`     heard: ${JSON.stringify(await page.inputValue('#intro-input'))} / placeholder ${JSON.stringify(await page.getAttribute('#intro-input', 'placeholder'))}`);
    check(opened, 'with a real microphone device and Chromium’s own recogniser (which fails here), saying the line opens the box');
    check(errors.length === 0, 'no errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
    await b.close();
  }
})();
