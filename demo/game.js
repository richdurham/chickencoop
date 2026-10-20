/* Open the Chicken Coop — game logic. Content lives in data.js. */
(function () {
  'use strict';

  var STORE = 'chickencoop-demo-v2';
  var $ = function (id) { return document.getElementById(id); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state = fresh();

  function fresh() {
    return { started: false, opened: [], asked: [], log: [], ending: null, fallback: 0 };
  }

  // ---------- Saving (best effort: private windows may block storage) ----------

  function load() {
    try {
      localStorage.removeItem('chickencoop-demo-v1'); // saves from the placeholder version
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

  /* Longer phrases beat shorter ones, so "who is igor" wins over "igor". */
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

  // ---------- The box ----------

  function isOpened(id) { return state.opened.indexOf(id) !== -1; }

  function itemById(id) {
    for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i];
    return null;
  }

  function pageSrc(item, p) { return 'box/' + item.id + '-' + (p + 1) + '.jpg'; }

  /* A small, fixed tilt per item so the table looks put down by hand. */
  function tilt(i) { return (((i * 37) % 9) - 4) * 0.75; }

  function renderBox() {
    var root = $('groups');
    root.textContent = '';
    var i = 0;
    GROUPS.forEach(function (group) {
      var section = document.createElement('section');
      section.className = 'group';
      var h = document.createElement('h2');
      h.className = 'group__label';
      h.textContent = group.label;
      section.appendChild(h);

      var list = document.createElement('ul');
      list.className = 'items';
      ITEMS.filter(function (it) { return it.group === group.id; }).forEach(function (item) {
        list.appendChild(itemEl(item, i++));
      });
      section.appendChild(list);
      root.appendChild(section);
    });
    renderProgress();
  }

  function itemEl(item, i) {
    var li = document.createElement('li');
    li.className = 'item';
    li.style.setProperty('--i', i);
    li.style.setProperty('--rot', tilt(i) + 'deg');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'item__btn';
    btn.dataset.item = item.id;

    var print = document.createElement('span');
    print.className = 'item__print' + (item.pages > 1 ? ' item__print--stack' : '');
    var img = document.createElement('img');
    img.src = 'box/thumb/' + item.id + '.jpg';
    img.width = item.w;
    img.height = item.h;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    print.appendChild(img);

    var cap = document.createElement('span');
    cap.className = 'item__caption';
    var name = document.createElement('span');
    name.className = 'item__name';
    name.textContent = item.label;
    cap.appendChild(name);

    var meta = document.createElement('span');
    var seen = isOpened(item.id);
    if (seen) {
      meta.className = 'item__seen';
      meta.textContent = 'seen';
    } else if (item.pages > 1) {
      meta.textContent = item.pages + (item.sides ? ' sides' : ' pages');
    }
    if (meta.textContent) cap.appendChild(meta);

    btn.appendChild(print);
    btn.appendChild(cap);
    btn.setAttribute('aria-label', item.label + (seen ? ', seen' : '') +
      (item.pages > 1 ? ', ' + item.pages + (item.sides ? ' sides' : ' pages') : '') + '. ' + item.caption);
    btn.addEventListener('click', function () { openReader(item.id); });

    li.appendChild(btn);
    return li;
  }

  function renderProgress() {
    var n = state.opened.length;
    $('progress').textContent = n === 0
      ? 'Nothing looked at yet'
      : 'You’ve looked at ' + n + ' of ' + ITEMS.length + ' things';
  }

  // ---------- Reader ----------

  var reading = null; // { item, page }
  var returnFocus = null;

  function openReader(id) {
    var item = itemById(id);
    if (!item) return;
    reading = { item: item, page: 0 };
    returnFocus = document.activeElement;

    $('reader-title').textContent = item.label;
    $('reader-caption').textContent = item.caption;
    renderCredit(item.credit);
    $('reader-pager').hidden = item.pages < 2;
    $('reader-ask').hidden = !item.ask;
    zoom(false);
    showPage();

    $('reader').hidden = false;
    document.body.style.overflow = 'hidden';
    (item.pages > 1 ? $('reader-next') : $('reader').querySelector('.reader__x')).focus();

    if (!isOpened(id)) {
      state.opened.push(id);
      save();
      renderBox();
      renderChips();
    }
  }

  function showPage() {
    var item = reading.item, p = reading.page;
    var where = item.sides
      ? item.sides[p] + ' (' + (p + 1) + ' of ' + item.pages + ')'
      : 'Page ' + (p + 1) + ' of ' + item.pages;

    var img = $('reader-img');
    img.src = pageSrc(item, p);
    img.alt = item.label + (item.pages > 1 ? ', ' + where.toLowerCase() : '') + '. ' + item.caption;
    $('reader-full').href = pageSrc(item, p);
    $('reader-page').textContent = where;
    $('reader-prev').disabled = p === 0;
    $('reader-next').disabled = p === item.pages - 1;
    $('reader-view').scrollTop = 0;

    if (p + 1 < item.pages) new Image().src = pageSrc(item, p + 1);
  }

  /* Photos that aren't from Katie's box carry their licence credit. */
  function renderCredit(credit) {
    var el = $('reader-credit');
    el.textContent = '';
    el.hidden = !credit;
    if (!credit) return;
    var a = document.createElement('a');
    a.href = credit.href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = credit.text;
    el.appendChild(a);
  }

  /* Zoom stays on while turning pages, so an article can be read through. */
  function zoom(on) {
    $('reader-view').classList.toggle('is-zoomed', on);
    $('reader-zoom').textContent = on ? 'Fit to screen' : 'Zoom in';
    $('reader-zoom').setAttribute('aria-pressed', String(on));
  }

  function toggleZoom() {
    zoom(!$('reader-view').classList.contains('is-zoomed'));
  }

  function turn(step) {
    if (!reading) return;
    var p = reading.page + step;
    if (p < 0 || p >= reading.item.pages) return;
    reading.page = p;
    showPage();
  }

  function closeReader() {
    if ($('reader').hidden) return;
    $('reader').hidden = true;
    $('reader-img').removeAttribute('src');
    document.body.style.overflow = '';
    var id = reading && reading.item.id;
    reading = null;
    // The box re-renders when something is seen for the first time, so find the button again.
    var again = id && document.querySelector('.item__btn[data-item="' + id + '"]');
    if (again) again.focus();
    else if (returnFocus && document.body.contains(returnFocus)) returnFocus.focus();
  }

  function trapFocus(e) {
    if (e.key !== 'Tab' || $('reader').hidden) return;
    var items = Array.prototype.filter.call(
      $('reader').querySelectorAll('button, a[href]'),
      function (el) { return !el.disabled && el.offsetParent !== null; }
    );
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
        var face = $('alexa-face');
        var typing = document.createElement('li');
        typing.className = 'msg msg--typing';
        typing.setAttribute('aria-label', 'Alexa is talking');
        typing.innerHTML = '<span></span><span></span><span></span>';
        $('log').appendChild(typing);
        scrollLog();
        face.classList.add('is-speaking');

        var wait = reduceMotion ? 250 : Math.min(1700, 420 + text.length * 7);
        setTimeout(function () {
          typing.remove();
          face.classList.remove('is-speaking');
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

  /* The codes follow the Blueprint: the short code gets "are you sure?",
     the code with "cleansing" in it is final. */
  function respond(raw) {
    var n = norm(raw);
    var cleansing = has(n, 'cleansing');
    if (has(n, 'release') && has(n, '616')) {
      return cleansing ? { text: CODES.release.final, code: true, final: 'release' } : { text: CODES.release.confirm, code: true };
    }
    if (has(n, 'destroy') && has(n, '264')) {
      return cleansing ? { text: CODES.destroy.final, code: true, final: 'destroy' } : { text: CODES.destroy.confirm, code: true };
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
      setTimeout(function () { if (gen === generation) finish(reply.final); }, reduceMotion ? 300 : 2200);
    } : null);
  }

  function lockAsk(locked) {
    $('ask-input').disabled = locked;
    $('ask').querySelector('button').disabled = locked;
    $('chips').hidden = locked;
    $('codes').hidden = locked;
  }

  function renderChips() {
    var o = isOpened;
    var options = [
      'Who is Katie?',
      'What is C5 Biotech?',
      (o('summer-school') || o('business-card') || o('emails') || o('certificate')) && 'Who is Igor Kutznetsov?',
      (o('lid-note') || o('card')) && 'Who is Tim?',
      o('family-photo') && 'Who is Ken?',
      o('emails') && 'Tell me about the conference in Dubrovnik',
      'Is the virus harmful to humans?',
      (o('council') || o('cnn')) && 'What is the rat problem?',
      o('kete') && 'Can we be infected by the contents of the box?',
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

  // ---------- Ending ----------

  function finish(choice) {
    state.ending = { choice: choice };
    save();
    renderEnding();
  }

  function renderEnding() {
    var choice = state.ending.choice;
    $('ending-title').textContent = choice === 'release' ? 'You released the virus.' : 'You destroyed the virus.';

    var quote = $('ending-alexa');
    quote.textContent = CODES[choice].final;
    var cite = document.createElement('cite');
    cite.textContent = 'Alexa';
    quote.appendChild(cite);

    $('ending-count').textContent = 'You looked at ' + state.opened.length + ' of ' + ITEMS.length + ' things in the box';
    var list = $('ending-items');
    list.textContent = '';
    ITEMS.forEach(function (item) {
      var seen = isOpened(item.id);
      var li = document.createElement('li');
      li.className = seen ? 'seen--yes' : 'seen--no';
      var s = document.createElement('span');
      s.className = 'seen__state';
      s.textContent = seen ? 'Looked at' : 'Didn’t look';
      var t = document.createElement('span');
      t.textContent = item.label;
      li.appendChild(s);
      li.appendChild(t);
      list.appendChild(li);
    });

    closeReader();
    $('intro').hidden = true;
    $('game').hidden = true;
    $('ending').hidden = false;
    window.scrollTo(0, 0);
    $('ending-title').focus();
  }

  // ---------- Starting, resuming, resetting ----------

  function enterBox(animate) {
    $('intro').hidden = true;
    $('ending').hidden = true;
    $('game').hidden = false;
    renderBox();
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
    var first = document.querySelector('.item__btn');
    if (first) first.focus({ preventScroll: true });
  }

  function openCoop() {
    var intro = $('intro');
    intro.classList.add('is-opening');
    $('intro-reply').textContent = '';
    setTimeout(function () {
      intro.classList.remove('is-opening');
      enterBox(true);
    }, reduceMotion ? 50 : 850);
  }

  function onIntro(e) {
    e.preventDefault();
    var input = $('intro-input');
    var n = norm(input.value.trim() || input.placeholder);
    var ok = INTRO_PHRASES.some(function (p) { return has(n, p); });
    if (ok) {
      openCoop();
    } else {
      $('intro-reply').textContent = START_HINT;
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

    // The code buttons only fill in the line; saying it is still up to the player.
    Array.prototype.forEach.call(document.querySelectorAll('.code'), function (btn) {
      btn.textContent = CODES[btn.dataset.code].short;
      btn.addEventListener('click', function () {
        var input = $('ask-input');
        input.value = btn.textContent;
        input.focus();
      });
    });

    $('reader').addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) closeReader();
    });
    $('reader-prev').addEventListener('click', function () { turn(-1); });
    $('reader-next').addEventListener('click', function () { turn(1); });
    $('reader-zoom').addEventListener('click', toggleZoom);
    $('reader-img').addEventListener('click', toggleZoom);
    $('reader-ask').addEventListener('click', function () {
      var q = reading && reading.item.ask;
      closeReader();
      showView('alexa');
      if (q) ask(q);
      $('ask-input').focus({ preventScroll: true });
    });

    document.addEventListener('keydown', function (e) {
      if ($('reader').hidden) return;
      if (e.key === 'Escape') closeReader();
      else if (e.key === 'ArrowRight') turn(1);
      else if (e.key === 'ArrowLeft') turn(-1);
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
