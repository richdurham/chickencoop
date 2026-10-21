/* Open the Chicken Coop — talking with Alexa out loud.
   Speaking: the browser reads Alexa's lines aloud (speech synthesis), unless
   the player turns her voice off. Listening: the browser's own speech
   recognition where it works (Chrome, Edge, Safari); everywhere else, the
   page records the player and Whisper (listen-worker.js) turns it into text,
   downloaded the first time someone talks. game.js wires up the buttons. */
(function () {
  'use strict';

  // ---------- Alexa's voice ----------

  var synth = window.speechSynthesis;
  var canSpeak = !!(synth && window.SpeechSynthesisUtterance);
  var PREF = 'chickencoop-voice'; // 'off' once the player turns her voice off; kept through Start over
  var voice = null;
  var talking = null;  // the line she is saying: { finish }
  var unlocked = false;

  function voiceOn() {
    try { return localStorage.getItem(PREF) !== 'off'; } catch (e) { return true; }
  }

  function setVoiceOn(on) {
    try { localStorage.setItem(PREF, on ? 'on' : 'off'); } catch (e) { /* only for this visit then */ }
    if (!on) hush();
  }

  /* Alexa lives in Titirangi: a New Zealand voice if the device has one, then
     the nearest accents. A voice known to be a woman's beats a closer accent. */
  var ACCENTS = ['en-nz', 'en-au', 'en-gb', 'en-ie', 'en-za', 'en-us'];
  var WOMEN = /\b(samantha|karen|moira|tessa|fiona|victoria|allison|ava|susan|kate|serena|catherine|zoe|nicky|zira|hazel|libby|sonia|mia|molly|natasha|aria|jenny|emily|clara|female)\b/i;
  var NOVELTY = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|junior|ralph|fred|kathy|princess|deranged|hysterical|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley)\b/i;

  function pickVoice() {
    var best = null, bestScore = -Infinity;
    synth.getVoices().forEach(function (v) {
      var lang = String(v.lang).replace('_', '-').toLowerCase();
      if (lang.indexOf('en') !== 0) return;
      var accent = ACCENTS.indexOf(lang);
      var score = (accent === -1 ? 0 : (ACCENTS.length - accent) * 10)
        + (WOMEN.test(v.name) ? 35 : 0)
        + (/natural|neural|enhanced|premium/i.test(v.name) ? 8 : 0)
        - (NOVELTY.test(v.name) ? 100 : 0);
      if (score > bestScore) { best = v; bestScore = score; }
    });
    return best;
  }

  if (canSpeak && synth.addEventListener) synth.addEventListener('voiceschanged', function () { voice = pickVoice(); });

  // How her lines should sound rather than look: codes digit by digit ("six one six").
  function spoken(text) {
    return String(text).replace(/\b(\d)(\d)(\d)\b/g, '$1 $2 $3');
  }

  // A sentence at a time: some browsers cut long speech off partway.
  function sentences(text) {
    return text.match(/[^.!?…]+(?:[.!?…]+["’”)]*|$)\s*/g) || [text];
  }

  /* Say a line. Resolves when she has finished, been hushed, or (in case the
     browser never says it finished) after about as long as it should take. */
  function say(text) {
    if (!canSpeak || !voiceOn() || listening) return Promise.resolve();
    voice = voice || pickVoice();
    if (synth.paused) synth.resume();
    var parts = sentences(spoken(text));
    return new Promise(function (resolve) {
      var left = parts.length, finished = false;
      var finish = function () {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (talking && talking.finish === finish) talking = null;
        resolve();
      };
      var timer = setTimeout(finish, 4000 + text.length * 90);
      talking = { finish: finish };
      parts.forEach(function (part) {
        var u = new SpeechSynthesisUtterance(part.trim());
        if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'en-NZ';
        u.onend = u.onerror = function () { if (--left <= 0) finish(); };
        synth.speak(u);
      });
    });
  }

  function hush() {
    if (talking) talking.finish();
    if (canSpeak) synth.cancel();
  }

  // iPhones only let a page speak once it has spoken during a tap: say nothing, quietly, on the first one.
  function unlock() {
    if (unlocked || !canSpeak) return;
    unlocked = true;
    var u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    synth.speak(u);
  }
  ['click', 'touchend', 'keydown'].forEach(function (type) { document.addEventListener(type, unlock, true); });

  // ---------- Listening ----------

  var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  // Brave has the API but not the service behind it, so it always fails there.
  var builtIn = !!Recognition && !navigator.brave;
  var canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && AudioCtx && window.Worker && window.WebAssembly);
  var listening = null; // the attempt in progress: { stop, cancel }

  /* ui: onListening(), onHeard(textSoFar), onWaiting(fraction downloaded),
     onWorking(), onDone(text), onFail('nothing' | 'again' | 'blocked' | 'unavailable').
     opts.hold: the player is holding a key down, so keep listening through
     pauses until stop(). */
  function listen(ui, opts) {
    if (listening) return;
    var hold = !!(opts && opts.hold);
    hush();
    if (builtIn) listenBuiltIn(ui, hold);
    else if (canRecord) listenRecorded(ui, hold);
    else ui.onFail('unavailable');
  }

  function stop() { if (listening) listening.stop(); }
  function cancel() { if (listening) listening.cancel(); }

  function listenBuiltIn(ui, hold) {
    var rec = new Recognition(), heard = '', failed = null, cancelled = false, began = false, over = false;
    rec.lang = /^en/i.test(navigator.language) ? navigator.language : 'en-NZ';
    rec.interimResults = true;
    rec.continuous = hold; // otherwise it stops by itself when they pause
    rec.maxAlternatives = 1;
    var attempt = {
      stop: function () {
        try { rec.stop(); } catch (e) { /* already stopping */ }
        setTimeout(function () { if (!over) end(); }, 3000); // in case it never says it has stopped
      },
      cancel: function () { cancelled = true; try { rec.abort(); } catch (e) { /* gone */ } end(); }
    };
    listening = attempt;
    rec.onstart = function () { began = true; ui.onListening(); };
    rec.onresult = function (e) {
      var text = '';
      for (var i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      heard = text.trim();
      ui.onHeard(heard);
    };
    rec.onerror = function (e) { failed = e.error; };
    rec.onend = function () { if (!over) end(); };

    function end() {
      over = true;
      if (listening === attempt) listening = null;
      if (cancelled) return;
      if (!heard && failed && failed !== 'no-speech' && failed !== 'aborted' && canRecord) {
        // It's offered but can't work here (no service behind it, or not allowed
        // in this app): record and use Whisper instead, from now on. If the
        // microphone itself turns out to be blocked, that was the problem.
        builtIn = false;
        listenRecorded(ui, hold, function () { builtIn = failed === 'not-allowed'; });
        return;
      }
      if (heard) ui.onDone(heard);
      else ui.onFail(failed === 'not-allowed' ? 'blocked' : 'nothing');
    }

    /* Some Chromium-based browsers ship the recogniser without the service
       behind it, and it never starts or says why. Unless the browser is still
       asking whether the page may use the microphone, give up on it. */
    function watch(waited) {
      if (began || over) return;
      micPermission().then(function (state) {
        if (began || over) return;
        if (state === 'prompt' && waited < 30000) { setTimeout(function () { watch(waited + 2000); }, 2000); return; }
        try { rec.abort(); } catch (e) { /* gone */ }
        failed = state === 'denied' ? 'not-allowed' : 'network';
        end();
      });
    }
    setTimeout(function () { watch(4000); }, 4000);

    try {
      rec.start();
    } catch (e) {
      over = true;
      listening = null;
      builtIn = false;
      listen(ui, { hold: hold });
    }
  }

  function micPermission() {
    try {
      return navigator.permissions.query({ name: 'microphone' }).then(function (p) { return p.state; }, function () { return 'unknown'; });
    } catch (e) { return Promise.resolve('unknown'); }
  }

  /* Record until they stop talking (or tap again), then transcribe. The audio
     context is made here, during the tap, because iPhones only start one then. */
  function listenRecorded(ui, hold, onBlocked) {
    var ctx = new AudioCtx();
    if (ctx.resume) ctx.resume();
    startWorker();
    var stream = null, source = null, node = null, chunks = [];
    var done = false, cancelled = false, stalled = false, voiced = false, loud = 0, quiet = 0, total = 0, floor = Infinity;

    listening = {
      // A moment's grace: the last pieces may still be on their way from the audio thread.
      stop: function () { setTimeout(finish, 250); },
      cancel: function () { cancelled = true; finish(); }
    };

    // A piece of what the microphone heard, in order. Times are the audio's own, so a busy page doesn't skew them.
    function hear(x) {
      if (done) return;
      var sum = 0;
      chunks.push(x);
      for (var i = 0; i < x.length; i++) sum += x[i] * x[i];
      var level = Math.sqrt(sum / x.length), secs = x.length / ctx.sampleRate;
      total += secs;
      // Speech is well above the quietest moment so far (the room between words).
      floor = Math.min(floor, level);
      if (level > Math.max(0.01, Math.min(0.05, floor * 3))) { loud += secs; quiet = 0; if (loud > 0.15) voiced = true; }
      else quiet += secs;
      if (hold ? total > 30 : (voiced && quiet > 1) || (!voiced && total > 7) || total > 15) finish();
    }

    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } }).then(function (s) {
      stream = s;
      if (done) { release(); return; }
      source = ctx.createMediaStreamSource(s);
      return capture(ctx, source, hear).then(function (n) {
        node = n;
        if (done) { release(); return; }
        ui.onListening();
        // Started outside a tap (after the built-in recogniser gave up), an iPhone
        // may never let the recording run: ask for another tap rather than wait forever.
        setTimeout(function () { if (!done && total === 0 && ctx.state !== 'running') { stalled = true; finish(); } }, 2500);
      });
    }, function (err) {
      done = true;
      listening = null;
      release();
      if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
        if (onBlocked) onBlocked();
        ui.onFail('blocked');
      } else ui.onFail('unavailable');
    });

    function release() {
      if (node) { node.onaudioprocess = null; if (node.port) node.port.onmessage = null; node.disconnect(); }
      if (source) source.disconnect();
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      if (ctx.state !== 'closed' && ctx.close) ctx.close();
    }

    function finish() {
      if (done) return;
      done = true;
      listening = null;
      var rate = ctx.sampleRate;
      release();
      if (cancelled) return;
      if (stalled) { ui.onFail('again'); return; }
      if (!voiced) { ui.onFail('nothing'); return; }
      var audio = to16k(chunks, rate);
      whenReady(ui).then(function () {
        ui.onWorking();
        return transcribe(audio);
      }).then(function (text) {
        text = clean(text);
        if (text) ui.onDone(text); else ui.onFail('nothing');
      }, function () { ui.onFail('unavailable'); });
    }
  }

  /* Pieces of what the microphone hears, from the browser's audio thread
     (listen-worklet.js) where it can, so a busy page loses none of it;
     otherwise from the page itself. Resolves to the node doing it. */
  function capture(ctx, source, hear) {
    var onPage = function () {
      var node = ctx.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = function (e) { hear(new Float32Array(e.inputBuffer.getChannelData(0))); };
      source.connect(node);
      node.connect(ctx.destination); // silent: needed for it to run
      return node;
    };
    if (!ctx.audioWorklet || !window.AudioWorkletNode) return Promise.resolve(onPage());
    return ctx.audioWorklet.addModule('listen-worklet.js').then(function () {
      var node = new AudioWorkletNode(ctx, 'chickencoop-capture');
      node.port.onmessage = function (e) { hear(e.data); };
      source.connect(node);
      node.connect(ctx.destination); // silent, and keeps it running in every browser
      return node;
    }, onPage);
  }

  // Whisper listens at 16 kHz: average the recording down to that.
  function to16k(chunks, rate) {
    var n = 0, o = 0;
    chunks.forEach(function (c) { n += c.length; });
    var all = new Float32Array(n);
    chunks.forEach(function (c) { all.set(c, o); o += c.length; });
    if (rate === 16000) return all;
    var step = rate / 16000, out = new Float32Array(Math.floor(n / step));
    for (var i = 0; i < out.length; i++) {
      var a = Math.floor(i * step), b = Math.min(n, Math.max(a + 1, Math.floor((i + 1) * step))), sum = 0;
      for (var j = a; j < b; j++) sum += all[j];
      out[i] = sum / (b - a);
    }
    return out;
  }

  /* Whisper's notes to itself ([BLANK_AUDIO], (wind)) aren't words, and when it
     hears almost nothing it can just repeat the names it was primed with. */
  function clean(text) {
    text = String(text).replace(/\[[^\]]*\]|\([^)]*\)|[♪*]/g, ' ').replace(/\s+/g, ' ').trim();
    var words = text.toLowerCase().match(/[a-z]+/g) || [];
    var primed = primingWords().toLowerCase().match(/[a-z]+/g) || [];
    var echoed = words.filter(function (w) { return primed.indexOf(w) !== -1; }).length;
    return words.length >= 4 && echoed / words.length >= 0.8 ? '' : text;
  }

  // ---------- Whisper, in listen-worker.js ----------

  // The game's names, from data.js, so Whisper spells them right.
  function primingWords() { return typeof VOICE_WORDS === 'string' ? VOICE_WORDS : ''; }

  var worker = null, ready = false, fraction = 0, waiting = [], jobs = {}, nextJob = 0;

  function startWorker() {
    if (worker) return;
    worker = new Worker('listen-worker.js', { type: 'module' });
    worker.onmessage = function (e) {
      var m = e.data;
      if (m.type === 'progress') { fraction = m.fraction; waiting.forEach(function (w) { w.ui.onWaiting(fraction); }); }
      else if (m.type === 'ready') { ready = true; settle(true); }
      else if (m.type === 'text' || m.type === 'error') {
        var job = jobs[m.id];
        delete jobs[m.id];
        if (job) job(m);
        else if (m.type === 'error') broken();
      }
    };
    worker.onerror = broken; // e.g. a browser that can't run module workers
    worker.postMessage({ type: 'load', words: primingWords() });
  }

  // Give up on this worker; the next time someone talks, a fresh one tries again.
  function broken() {
    if (worker) worker.terminate();
    worker = null;
    ready = false;
    settle(false);
    Object.keys(jobs).forEach(function (id) { jobs[id]({ type: 'error' }); delete jobs[id]; });
  }

  function settle(ok) {
    var w = waiting;
    waiting = [];
    w.forEach(function (x) { if (ok) x.resolve(); else x.reject(); });
  }

  function whenReady(ui) {
    if (ready) return Promise.resolve();
    if (!worker) return Promise.reject();
    ui.onWaiting(fraction);
    return new Promise(function (resolve, reject) { waiting.push({ ui: ui, resolve: resolve, reject: reject }); });
  }

  function transcribe(audio) {
    if (!worker) return Promise.reject();
    return new Promise(function (resolve, reject) {
      var id = ++nextJob;
      jobs[id] = function (m) { if (m.type === 'text') resolve(m.text); else reject(); };
      worker.postMessage({ type: 'transcribe', id: id, audio: audio }, [audio.buffer]);
    });
  }

  /* Ask for the microphone now (the player chose to talk on their first visit),
     so talking later doesn't stop for the browser's question. */
  function requestMic() {
    if (!canRecord && !builtIn) return Promise.resolve('unavailable');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.resolve('granted'); // asked when they first talk
    return navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
      s.getTracks().forEach(function (t) { t.stop(); });
      return 'granted';
    }, function (err) {
      return err && (err.name === 'NotAllowedError' || err.name === 'SecurityError') ? 'denied' : 'unavailable';
    });
  }

  window.Voice = {
    canSpeak: canSpeak, voiceOn: voiceOn, setVoiceOn: setVoiceOn, say: say, hush: hush,
    canListen: builtIn || canRecord, listen: listen, stop: stop, cancel: cancel,
    isListening: function () { return !!listening; },
    micPermission: micPermission, requestMic: requestMic
  };
})();
