/* Open the Chicken Coop — game logic. Content lives in data.js. */
(function () {
  'use strict';

  var STORE = 'chickencoop-demo-v1';
  var $ = function (id) { return document.getElementById(id); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state = fresh();

  function fresh() {
    return { started: false, opened: [], asked: [], log: [], pending: null, ending: null, fallback: 0 };
  }

  // ---------- Saving (best effort: private windows may block storage) ----------

  function load() {
    try {
      var raw = localStorage.getItem(STORE);
      if (raw) {
        var saved = JSON.parse(raw);
        Object.keys(state).forEach(function (k) { if (k in saved) state[k] = saved[k]; });
      }
    } catch (e) { /* play without saving */ }
  }

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function wipe() {
    try { localStorage.removeItem(STORE); } catch (e) { /* ignore */ }
  }

  // ---------- Text matching ----------

  var NUMBER_WORDS = [
    [/\bsix one six\b/g, '616'], [/\bsix sixteen\b/g, '616'], [/\bsix hundred (and )?sixteen\b/g, '616'],
    [/\btwo six four\b/g, '264'], [/\btwo sixty four\b/g, '264'], [/\btwo hundred (and )?sixty four\b/g, '264']
  ];

  function norm(s) {
    var n = String(s).toLowerCase().replace(/[’'`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    NUMBER_WORDS.forEach(function (pair) { n = n.replace(pair[0], pair[1]); });
    return ' ' + n + ' ';
  }

  function has(n, phrase) { return n.indexOf(' ' + phrase + ' ') !== -1; }

  function hasAny(n, phrases) {
    for (var i = 0; i < phrases.length; i++) if (has(n, phrases[i])) return true;
    return false;
  }

  /* Longer phrases beat shorter ones, so "is katie dead" wins over "katie". */
  function bestAnswer(n) {
    var best = null, bestScore = 0;
    QA.forEach(function (entry) {
      entry.keys.forEach(function (key) {
        var k = norm(key).trim();
        if (k && has(n, k)) {
          var score = k.split(' ').length * 100 + k.length;
          if (score > bestScore) { bestScore = score; best = entry; }
        }
      });
    });
    return best;
  }

  // ---------- Paper ----------

  var THUMB = {
    postit:  { blocks: 2, h: '9.5rem' },
    index:   { blocks: 3, h: '9.25rem' },
    case:    { blocks: 2, h: '8.5rem' },
    graph:   { blocks: 4, h: '12rem' },
    fax:     { blocks: 5, h: '11rem' },
    card:    { blocks: 4, h: '8.25rem' },
    photo:   { blocks: 0, h: 'none' },
    slip:    { blocks: 3, h: '10rem' },
    flyer:   { blocks: 2, h: '10.5rem' },
    news:    { blocks: 3, h: '11.5rem' },
    airmail: { blocks: 3, h: '10.5rem' }
  };

  var SCENES = {
    dubrovnik:
      '<svg class="scene" viewBox="0 0 300 200" role="img" aria-label="A dinner table on a terrace at dusk, with old city walls and harbour lights behind">' +
        '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#22324F"/><stop offset=".55" stop-color="#6E5A70"/><stop offset="1" stop-color="#D49568"/>' +
        '</linearGradient></defs>' +
        '<rect width="300" height="200" fill="url(#sky)"/>' +
        '<path d="M0 92 L40 80 L80 88 L130 70 L180 84 L230 74 L300 86 L300 120 L0 120 Z" fill="#2B2A36"/>' +
        '<path d="M0 104 h300 v18 h-300 z" fill="#4A3D3E"/>' +
        '<g fill="#9C5A3E">' +
          '<rect x="12" y="96" width="14" height="8"/><rect x="34" y="94" width="10" height="10"/><rect x="58" y="97" width="16" height="7"/>' +
          '<rect x="96" y="92" width="12" height="12"/><rect x="128" y="96" width="18" height="8"/><rect x="170" y="94" width="11" height="10"/>' +
          '<rect x="204" y="97" width="15" height="7"/><rect x="240" y="93" width="12" height="11"/><rect x="270" y="96" width="16" height="8"/>' +
        '</g>' +
        '<rect x="0" y="122" width="300" height="34" fill="#1C2433"/>' +
        '<g fill="#F3C978" opacity=".85">' +
          '<rect x="20" y="126" width="2" height="9"/><rect x="62" y="128" width="2" height="7"/><rect x="104" y="125" width="2" height="10"/>' +
          '<rect x="151" y="127" width="2" height="8"/><rect x="196" y="126" width="2" height="9"/><rect x="243" y="128" width="2" height="7"/>' +
        '</g>' +
        '<rect x="0" y="156" width="300" height="44" fill="#2A211D"/>' +
        '<rect x="18" y="160" width="264" height="8" fill="#E9E1D2"/>' +
        '<g fill="#3A2E2A">' +
          '<circle cx="34" cy="146" r="8"/><rect x="25" y="152" width="18" height="10"/>' +
          '<circle cx="62" cy="144" r="8" fill="#5A4436"/><rect x="53" y="150" width="18" height="12" fill="#5A4436"/>' +
          '<circle cx="90" cy="146" r="8"/><rect x="81" y="152" width="18" height="10"/>' +
          '<circle cx="118" cy="145" r="8"/><rect x="109" y="151" width="18" height="11"/>' +
          '<circle cx="146" cy="146" r="8"/><rect x="137" y="152" width="18" height="10"/>' +
          '<circle cx="174" cy="145" r="8"/><rect x="165" y="151" width="18" height="11"/>' +
          '<circle cx="202" cy="146" r="8"/><rect x="193" y="152" width="18" height="10"/>' +
          '<circle cx="230" cy="145" r="8"/><rect x="221" y="151" width="18" height="11"/>' +
        '</g>' +
        '<g fill="#F2E9D6" opacity=".9">' +
          '<rect x="40" y="132" width="3" height="7"/><rect x="96" y="131" width="3" height="7"/><rect x="124" y="132" width="3" height="7"/>' +
          '<rect x="152" y="131" width="3" height="7"/><rect x="180" y="132" width="3" height="7"/><rect x="208" y="131" width="3" height="7"/><rect x="236" y="132" width="3" height="7"/>' +
        '</g>' +
        '<circle cx="268" cy="143" r="8.5" fill="#15161B"/><rect x="258" y="150" width="20" height="13" fill="#15161B"/>' +
      '</svg>'
  };

  function blockEl(b) {
    var el = document.createElement(b.t === 'rule' ? 'div' : 'p');
    el.className = 'b b-' + b.t;
    if (b.t === 'link') {
      var a = document.createElement('a');
      a.href = b.href;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = b.v;
      el.appendChild(a);
    } else if (b.v) {
      el.textContent = b.v;
    }
    return el;
  }

  function paperEl(prop, thumb) {
    var paper = document.createElement('div');
    paper.className = 'paper paper--' + prop.material;
    if (prop.material === 'case' && state.ending) paper.classList.add('is-dark');
    if (prop.scene) paper.insertAdjacentHTML('beforeend', SCENES[prop.scene]);

    var limit = thumb ? THUMB[prop.material].blocks : prop.body.length;
    if (limit > 0) {
      var inner = document.createElement('div');
      inner.className = 'paper__inner';
      prop.body.slice(0, limit).forEach(function (b) { inner.appendChild(blockEl(b)); });
      paper.appendChild(inner);
    }
    return paper;
  }

  // ---------- The box ----------

  function isOpened(id) { return state.opened.indexOf(id) !== -1; }

  function renderProps() {
    var list = $('props');
    list.textContent = '';
    PROPS.forEach(function (prop, i) {
      var li = document.createElement('li');
      li.className = 'prop';
      li.style.setProperty('--w', prop.w + 'px');
      li.style.setProperty('--rot', prop.rot + 'deg');
      li.style.setProperty('--i', i);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'prop__btn';
      btn.dataset.prop = prop.id;

      var face = document.createElement('div');
      face.className = 'prop__face';
      face.setAttribute('aria-hidden', 'true');
      face.style.setProperty('--h', THUMB[prop.material].h);
      face.appendChild(paperEl(prop, true));

      var cap = document.createElement('span');
      cap.className = 'prop__caption';
      var name = document.createElement('span');
      name.className = 'prop__name';
      name.textContent = prop.label;
      cap.appendChild(name);
      if (isOpened(prop.id)) {
        var read = document.createElement('span');
        read.className = 'prop__read';
        read.textContent = 'read';
        cap.appendChild(read);
      }

      btn.appendChild(face);
      btn.appendChild(cap);
      btn.setAttribute('aria-label', prop.label + (isOpened(prop.id) ? ', read' : '') + '. ' + prop.hint);
      btn.addEventListener('click', function () { openReader(prop.id); });

      li.appendChild(btn);
      list.appendChild(li);
    });
    renderProgress();
  }

  function renderProgress() {
    var n = state.opened.length;
    $('progress').textContent = n === 0
      ? 'Nothing read yet'
      : 'You’ve read ' + n + ' of ' + PROPS.length + ' things';
  }

  // ---------- Reader ----------

  var readerProp = null;
  var returnFocus = null;

  function propById(id) {
    for (var i = 0; i < PROPS.length; i++) if (PROPS[i].id === id) return PROPS[i];
    return null;
  }

  function openReader(id) {
    var prop = propById(id);
    if (!prop) return;
    readerProp = prop;
    returnFocus = document.activeElement;

    $('reader-title').textContent = prop.label;
    $('reader-hint').textContent = prop.hint;
    var holder = $('reader-paper');
    holder.textContent = '';
    holder.appendChild(paperEl(prop, false));
    holder.scrollTop = 0;
    $('reader').style.setProperty('--rot', prop.rot + 'deg');
    $('reader').hidden = false;
    document.body.style.overflow = 'hidden';
    $('reader-ask').focus();

    if (!isOpened(id)) {
      state.opened.push(id);
      save();
      renderProps();
      renderChips();
    }
  }

  function closeReader() {
    if ($('reader').hidden) return;
    $('reader').hidden = true;
    document.body.style.overflow = '';
    readerProp = null;
    if (returnFocus && document.body.contains(returnFocus)) returnFocus.focus();
    else {
      var again = document.querySelector('.prop__btn');
      if (again) again.focus();
    }
  }

  function trapFocus(e) {
    if (e.key !== 'Tab' || $('reader').hidden) return;
    var items = $('reader').querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])');
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // ---------- Alexa ----------

  var queue = Promise.resolve();
  var generation = 0; // bumped on restart so replies already queued are dropped

  function appendMsg(who, text, extra) {
    var li = document.createElement('li');
    li.className = 'msg msg--' + who + (extra ? ' ' + extra : '');
    li.textContent = text;
    $('log').appendChild(li);
    scrollLog();
    return li;
  }

  function scrollLog() {
    var log = $('log');
    log.scrollTop = log.scrollHeight;
  }

  function remember(who, text, extra) {
    state.log.push({ who: who, text: text, extra: extra || '' });
    if (state.log.length > 120) state.log = state.log.slice(-120);
    save();
  }

  function you(text, isCode) {
    var extra = isCode ? 'msg--code' : '';
    appendMsg('you', text, extra);
    remember('you', text, extra);
  }

  function her(text, then) {
    var gen = generation;
    queue = queue.then(function () {
      return new Promise(function (done) {
        if (gen !== generation) { done(); return; }
        var light = $('alexa-light');
        var typing = document.createElement('li');
        typing.className = 'msg msg--typing';
        typing.setAttribute('aria-label', 'Alexa is talking');
        typing.innerHTML = '<span></span><span></span><span></span>';
        $('log').appendChild(typing);
        scrollLog();
        light.classList.add('is-speaking');

        var wait = reduceMotion ? 250 : Math.min(1700, 420 + text.length * 7);
        setTimeout(function () {
          typing.remove();
          light.classList.remove('is-speaking');
          if (gen !== generation) { done(); return; }
          appendMsg('her', text);
          remember('her', text);
          flagAlexaTab();
          if (then) then();
          done();
        }, wait);
      });
    });
  }

  function respond(raw) {
    var n = norm(raw);
    var release = has(n, 'release'), destroy = has(n, 'destroy');
    var falcon = has(n, 'falcon'), cleansing = has(n, 'cleansing');
    var r616 = has(n, '616'), d264 = has(n, '264');

    if (falcon || ((release || destroy) && (r616 || d264))) {
      if ((release && d264) || (destroy && r616)) return { text: CODE_LINES.mixed, code: true };
      var choice = release && r616 ? 'release' : destroy && d264 ? 'destroy' : null;
      if (!choice) return { text: CODE_LINES.partial, code: true };

      // The full code only counts once Alexa has asked "are you sure?".
      if (cleansing && state.pending === choice) {
        state.pending = null;
        return { text: ENDINGS[choice][informed() ? 'informed' : 'uninformed'].alexa, code: true, final: choice };
      }
      state.pending = choice;
      return { text: CODE_LINES[choice + 'Confirm'], code: true };
    }

    if (state.pending) {
      if (hasAny(n, ['no', 'not sure', 'wait', 'cancel', 'hold on', 'never mind', 'nevermind', 'not yet', 'stop'])) {
        state.pending = null;
        return { text: CODE_LINES.unsure };
      }
      if (hasAny(n, ['yes', 'yeah', 'yep', 'sure', 'im sure', 'i am sure', 'do it', 'confirm'])) {
        return { text: 'Then say the whole thing — the code with the extra word in it, the way she wrote it on the card.' };
      }
    }

    var entry = bestAnswer(n);
    if (entry) return { text: entry.a };

    var text = FALLBACKS[state.fallback % FALLBACKS.length];
    state.fallback += 1;
    return { text: text };
  }

  function ask(raw) {
    var text = String(raw).trim();
    if (!text) return;
    var reply = respond(text);
    you(text, reply.code);
    if (state.asked.indexOf(text) === -1) state.asked.push(text);
    save();
    renderChips();
    if (reply.final) lockAsk(true);
    var gen = generation;
    her(reply.text, reply.final ? function () {
      setTimeout(function () { if (gen === generation) finish(reply.final); }, reduceMotion ? 300 : 1600);
    } : null);
  }

  function lockAsk(locked) {
    $('ask-input').disabled = locked;
    $('ask').querySelector('button').disabled = locked;
    $('chips').hidden = locked;
  }

  function renderChips() {
    var o = isOpened;
    var options = [
      'Who is Katie?',
      o('card') && 'Who is Igor Kutznetsov?',
      o('notebook') && 'What happened in trial 23?',
      (o('memo') || o('messages')) && 'What about the courier on the 14th?',
      (o('photo') || o('stub')) && 'Tell me about the conference in Dubrovnik',
      o('letter') && 'Who is Ken?',
      'What is C5 Biotech?',
      'Is the virus harmful to humans?',
      (o('memo') || o('messages')) && 'Who is Tim?',
      o('stub') && 'Are the coins euros?',
      'Where is Katie?',
      'What would you choose?'
    ].filter(function (q) { return q && state.asked.indexOf(q) === -1; }).slice(0, 4);

    var box = $('chips');
    box.textContent = '';
    options.forEach(function (q) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = q;
      b.addEventListener('click', function () { ask(q); });
      box.appendChild(b);
    });
  }

  // ---------- Mobile tabs ----------

  function showView(view) {
    document.querySelector('.stage').dataset.view = view;
    $('tab-box').setAttribute('aria-selected', String(view === 'box'));
    $('tab-alexa').setAttribute('aria-selected', String(view === 'alexa'));
    if (view === 'alexa') { $('tab-alexa-new').hidden = true; scrollLog(); }
  }

  function flagAlexaTab() {
    if (document.querySelector('.stage').dataset.view === 'box' && window.matchMedia('(max-width: 860px)').matches) {
      $('tab-alexa-new').hidden = false;
    }
  }

  // ---------- Endings ----------

  function knownClues() {
    var known = {};
    CLUES.forEach(function (c) { known[c.id] = c.props.some(isOpened); });
    return known;
  }

  /* Informed means the notebook page plus at least two other kinds of clue. */
  function informed() {
    var known = knownClues();
    var count = Object.keys(known).filter(function (k) { return known[k]; }).length;
    return known.anomaly && count >= 3;
  }

  function finish(choice) {
    var path = informed() ? 'informed' : 'uninformed';
    state.ending = { choice: choice, path: path };
    save();
    renderEnding();
  }

  function renderEnding() {
    var e = ENDINGS[state.ending.choice][state.ending.path];
    $('ending-kicker').textContent = e.kicker;
    $('ending-title').textContent = state.ending.choice === 'release' ? 'You released it.' : 'You destroyed it.';

    var quote = $('ending-alexa');
    quote.textContent = e.alexa;
    var cite = document.createElement('cite');
    cite.textContent = 'Alexa';
    quote.appendChild(cite);

    var epi = $('ending-epilogue');
    epi.textContent = '';
    e.epilogue.forEach(function (p) {
      var el = document.createElement('p');
      el.textContent = p;
      epi.appendChild(el);
    });

    var known = knownClues();
    var list = $('ending-clues');
    list.textContent = '';
    CLUES.forEach(function (c) {
      var li = document.createElement('li');
      li.className = known[c.id] ? 'clue--known' : 'clue--missed';
      var s = document.createElement('span');
      s.className = 'clue__state';
      s.textContent = known[c.id] ? 'You knew' : 'You missed';
      var t = document.createElement('span');
      t.textContent = known[c.id] ? c.known : c.missed;
      li.appendChild(s);
      li.appendChild(t);
      list.appendChild(li);
    });

    closeReader();
    $('intro').hidden = true;
    $('game').hidden = true;
    $('ending').hidden = false;
    window.scrollTo(0, 0);
    $('ending-title').setAttribute('tabindex', '-1');
    $('ending-title').focus();
  }

  // ---------- Starting, resuming, resetting ----------

  function enterBox(animate) {
    $('intro').hidden = true;
    $('ending').hidden = true;
    $('game').hidden = false;
    renderProps();
    renderChips();

    var log = $('log');
    log.textContent = '';
    state.log.forEach(function (m) { appendMsg(m.who, m.text, m.extra); });

    if (animate && !reduceMotion) {
      $('game').classList.add('is-arriving');
      setTimeout(function () { $('game').classList.remove('is-arriving'); }, 2200);
    }

    if (!state.started) {
      state.started = true;
      save();
      WELCOME.forEach(function (line) { her(line); });
    }
    var first = document.querySelector('.prop__btn');
    if (first) first.focus({ preventScroll: true });
  }

  function openCoop() {
    var intro = $('intro');
    intro.classList.add('is-opening');
    $('intro-reply').textContent = '';
    setTimeout(function () {
      intro.classList.remove('is-opening');
      enterBox(true);
    }, reduceMotion ? 50 : 950);
  }

  function onIntro(e) {
    e.preventDefault();
    var input = $('intro-input');
    var said = input.value.trim() || input.placeholder;
    var n = norm(said);
    var ok = INTRO_PHRASES.some(function (p) { return n.indexOf(' ' + p + ' ') !== -1 || n.trim() === p; });
    if (ok) {
      openCoop();
    } else {
      $('intro-reply').textContent = 'That’s a command for me to start the game. Tell me as written: “Alexa, open the chicken coop.”';
      input.select();
    }
  }

  function startOver() {
    if (!window.confirm('Start over? Everything goes back in the box and Alexa forgets this conversation.')) return;
    restart();
  }

  function restart() {
    wipe();
    state = fresh();
    generation += 1;
    queue = Promise.resolve();
    lockAsk(false);
    $('log').textContent = '';
    $('game').hidden = true;
    $('ending').hidden = true;
    $('intro').hidden = false;
    $('resume-row').hidden = true;
    $('intro-input').value = '';
    $('intro-reply').textContent = '';
    showView('box');
    window.scrollTo(0, 0);
    $('intro-input').focus();
  }

  // ---------- Wiring ----------

  function init() {
    load();

    $('intro-form').addEventListener('submit', onIntro);
    $('resume').addEventListener('click', function () { enterBox(false); });
    $('reset').addEventListener('click', startOver);
    $('again').addEventListener('click', restart);

    $('ask').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('ask-input');
      ask(input.value);
      input.value = '';
    });

    $('reader').addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) closeReader();
    });
    $('reader-ask').addEventListener('click', function () {
      var q = readerProp && readerProp.ask;
      closeReader();
      showView('alexa');
      if (q) ask(q);
      $('ask-input').focus({ preventScroll: true });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeReader();
      trapFocus(e);
    });

    $('tab-box').addEventListener('click', function () { showView('box'); });
    $('tab-alexa').addEventListener('click', function () { showView('alexa'); });

    if (state.ending) {
      renderEnding();
    } else if (state.started) {
      $('resume-row').hidden = false;
    }
  }

  init();
})();
