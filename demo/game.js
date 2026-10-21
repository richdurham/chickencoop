/* Open the Chicken Coop — game logic. Content lives in data.js. */
(function () {
  'use strict';

  var STORE = 'chickencoop-demo-v2';
  var $ = function (id) { return document.getElementById(id); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state = fresh();

  function fresh() {
    return { started: false, opened: [], log: [], ending: null, fallback: 0, layout: {}, handled: false, out: [] };
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

  // ---------- Understanding (the matching itself is in understand.js) ----------

  var norm = Understand.norm, has = Understand.has;
  var meaning = null;  // { embed, index } once meaning.js has loaded the sentence model
  var lastSeen = null; // { id, at }: the item looked at most recently, for "who's this?"
  var SEEN_FOR = 3 * 60 * 1000;
  var debug = /[?&]debug\b/.test(location.search); // ?debug logs each decision to the console

  window.addEventListener('chickencoop:meaning-ready', function (e) { meaning = e.detail; });

  function startMeaning() {
    window.MeaningWanted = true;
    if (window.Meaning) window.Meaning.start();
  }

  // ---------- The box on the table ----------

  /* The inside of the box as percentages of the desk (left, top, width, height).
     The desk is 5:4 on wide screens, with the lid beside the box, and 3:5 on
     narrow ones, with the lid below it. */
  var DESKS = {
    wide: { aspect: 5 / 4, box: [8, 10, 64, 80] },
    tall: { aspect: 3 / 5, box: [5, 3, 90, 56] }
  };
  var deskShape = 'wide';

  // How some things sit: photos in acrylic stands, a loose heap of coins, a binder.
  var LOOK = { 'family-photo': 'stand', 'summer-school': 'stand', 'who-trip': 'stand', coins: 'heap', 'folder-cover': 'folder' };

  function isOpened(id) { return state.opened.indexOf(id) !== -1; }

  function itemById(id) {
    for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i];
    return null;
  }

  function markSeen(id) {
    if (isOpened(id)) return;
    state.opened.push(id);
    save();
    renderProgress();
  }

  function pageSrc(item, p) {
    return item.cut ? 'box/cut/' + item.id + '.webp' : 'box/' + item.id + '-' + (p + 1) + '.jpg';
  }

  function pileSrc(item) {
    return item.cut ? 'box/cut/thumb/' + item.id + '.webp' : 'box/thumb/' + item.id + '.jpg';
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // The lid, the starting pile, then whatever has been taken out of the kete or envelope.
  function pileIds() {
    return [LID.id].concat(PILE.map(function (p) { return p[0]; }), state.out.filter(itemById));
  }

  function topZ() {
    var top = 0;
    pileIds().forEach(function (id) { top = Math.max(top, placeOf(id)[4]); });
    return top;
  }

  // What's still inside the kete or envelope, in the order it comes out.
  function stillInside(item) {
    if (!item.reach) return [];
    return ITEMS.filter(function (it) { return it.in === item.id && state.out.indexOf(it.id) === -1; });
  }

  /* Where a thing lies: [x, y, width, angle, z], in the box terms PILE uses.
     Where the player left it wins over the starting arrangement. */
  function placeOf(id) {
    if (state.layout[id]) return state.layout[id].slice();
    if (id === LID.id) return LID[deskShape].concat([0]);
    for (var i = 0; i < PILE.length; i++) if (PILE[i][0] === id) return PILE[i].slice(1).concat([i + 1]);
    return [50, 50, 20, 0, 1];
  }

  // Keep a thing's centre on the desk, wherever the box sits on it.
  function clampX(x) { var b = DESKS[deskShape].box; return clamp(x, (2 - b[0]) / b[2] * 100, (98 - b[0]) / b[2] * 100); }
  function clampY(y) { var b = DESKS[deskShape].box; return clamp(y, (2 - b[1]) / b[3] * 100, (98 - b[1]) / b[3] * 100); }

  function thingEl(id) { return $('desk').querySelector('.thing[data-item="' + id + '"]'); }

  function place(el, p) {
    var b = DESKS[deskShape].box;
    el.style.left = (b[0] + clampX(p[0]) * b[2] / 100) + '%';
    el.style.top = (b[1] + clampY(p[1]) * b[3] / 100) + '%';
    el.style.width = (p[2] * b[2] / 100) + '%';
    el.style.setProperty('--r', p[3] + 'deg');
    el.style.zIndex = p[4];
  }

  function placeAll() {
    pileIds().forEach(function (id) { var el = thingEl(id); if (el) place(el, placeOf(id)); });
  }

  /* Fit the desk into its pane and put the box on it. */
  function fitDesk() {
    var pane = $('box'), desk = $('desk'), cs = getComputedStyle(pane);
    var w = pane.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var h = pane.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (w <= 0 || h <= 0) return; // the other tab is showing on a phone
    var shape = w / h >= 1 ? 'wide' : 'tall', aspect = DESKS[shape].aspect;
    var dw = Math.min(w, h * aspect);
    desk.style.width = Math.floor(dw) + 'px';
    desk.style.height = Math.floor(dw / aspect) + 'px';
    desk.style.setProperty('--wall', Math.max(8, Math.round(dw * 0.022)) + 'px');
    var b = DESKS[shape].box, carton = $('carton');
    carton.style.left = 'calc(' + b[0] + '% - var(--wall))';
    carton.style.top = 'calc(' + b[1] + '% - var(--wall))';
    carton.style.width = b[2] + '%';
    carton.style.height = b[3] + '%';
    if (shape !== deskShape) { deskShape = shape; placeAll(); }
  }

  function addThing(id, i) {
    var item = itemById(id);
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'thing' + (LOOK[id] ? ' thing--' + LOOK[id] : '');
    el.dataset.item = id;
    el.style.setProperty('--i', i);
    el.setAttribute('aria-label', item.label);
    el.setAttribute('aria-describedby', 'thing-help');
    var img = document.createElement('img');
    img.src = pileSrc(item);
    img.alt = '';
    img.draggable = false;
    img.decoding = 'async';
    el.appendChild(img);
    place(el, placeOf(id));
    bindThing(el, id);
    $('desk').appendChild(el);
  }

  function renderBox() {
    Array.prototype.forEach.call($('desk').querySelectorAll('.thing'), function (el) { el.remove(); });
    pileIds().forEach(addThing);
    $('desk-hint').hidden = !!state.handled;
    renderProgress();
  }

  function bringToFront(id) {
    var top = topZ();
    var p = placeOf(id);
    if (p[4] !== top || !state.layout[id]) p[4] = top + 1;
    state.layout[id] = p;
    thingEl(id).style.zIndex = p[4];
  }

  function handled() {
    if (state.handled) return;
    state.handled = true;
    $('desk-hint').hidden = true;
    save();
  }

  /* Drag to move; a tap (or Enter) picks it up; arrow keys nudge it along. */
  function bindThing(el, id) {
    var drag = null;
    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      var r = $('desk').getBoundingClientRect(), b = DESKS[deskShape].box;
      drag = { x: e.clientX, y: e.clientY, from: placeOf(id), moved: false,
        unitX: r.width * b[2] / 10000, unitY: r.height * b[3] / 10000 }; // pixels per box unit
    });
    el.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved) {
        if (Math.abs(dx) + Math.abs(dy) < 6) return;
        drag.moved = true;
        bringToFront(id);
        el.classList.add('is-held');
      }
      var p = state.layout[id];
      p[0] = clampX(drag.from[0] + dx / drag.unitX);
      p[1] = clampY(drag.from[1] + dy / drag.unitY);
      place(el, p);
    });
    var end = function (e) {
      if (!drag) return;
      var moved = drag.moved;
      drag = null;
      if (moved) {
        var p = state.layout[id];
        p[3] = Math.round((p[3] + Math.random() * 8 - 4) * 10) / 10; // nothing lands quite the same way twice
        place(el, p);
        el.classList.remove('is-held');
        handled();
        save();
      } else if (e.type === 'pointerup') {
        bringToFront(id);
        save();
        openReader(id);
      }
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    // Keyboard Enter or Space (a click with no pointer behind it).
    el.addEventListener('click', function (e) { if (e.detail === 0) { bringToFront(id); save(); openReader(id); } });
    el.addEventListener('keydown', function (e) {
      var s = e.shiftKey ? 10 : 3;
      var d = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key];
      if (!d) return;
      e.preventDefault();
      bringToFront(id);
      var p = state.layout[id];
      p[0] = clampX(p[0] + d[0]);
      p[1] = clampY(p[1] + d[1]);
      place(el, p);
      handled();
      save();
    });
  }

  function renderProgress() {
    var n = state.opened.length;
    $('progress').textContent = n === 0
      ? 'Nothing looked at yet'
      : 'You’ve looked at ' + n + ' of ' + ITEMS.length + ' things';
  }

  // ---------- In hand ----------

  var holding = null; // { item, kind: 'flip' | 'leaf' | 'single', pages, at, turned }
  var returnFocus = null;
  var swipe = null;

  /* Two sides turn over; more pages, or the folder's contents, are leafed through.
     The kete and the envelope are held as they are, and reached into. */
  function handFor(item) {
    var inside = item.reach ? [] : ITEMS.filter(function (it) { return it.in === item.id; });
    var pages = [];
    if (inside.length) {
      inside.forEach(function (doc) {
        for (var p = 0; p < doc.pages; p++) {
          pages.push({ item: doc, p: p, label: doc.label + (doc.pages > 1 ? ', page ' + (p + 1) + ' of ' + doc.pages : '') });
        }
      });
      return { kind: 'leaf', pages: pages };
    }
    for (var i = 0; i < item.pages; i++) {
      var side = item.sides ? item.sides[i] : 'Page ' + (i + 1);
      pages.push({ item: item, p: i, label: item.pages > 1 ? side + (item.pages > 2 ? ' (' + (i + 1) + ' of ' + item.pages + ')' : '') : '' });
    }
    if (item.pages === 2 && item.sides) return { kind: 'flip', pages: pages };
    return { kind: item.pages > 1 ? 'leaf' : 'single', pages: pages };
  }

  function pageImg(pg) {
    var img = document.createElement('img');
    img.src = pageSrc(pg.item, pg.p);
    img.alt = pg.item.label + (pg.label ? ', ' + pg.label.toLowerCase() : '') + '. ' + pg.item.caption;
    img.draggable = false;
    return img;
  }

  function pageEl(pg) {
    var div = document.createElement('div');
    div.className = 'page';
    div.appendChild(pageImg(pg));
    return div;
  }

  function openReader(id, takenOut) {
    var item = itemById(id);
    if (!item) return;
    var h = handFor(item);
    holding = { item: item, kind: h.kind, pages: h.pages, at: 0, turned: false };
    if (!takenOut) returnFocus = document.activeElement;

    $('reader-title').textContent = item.label;
    renderCredit(item.credit);
    var hand = $('hand');
    hand.className = 'hand hand--' + h.kind;
    hand.textContent = '';
    if (takenOut && !reduceMotion) {
      hand.classList.add('is-emerging');
      hand.addEventListener('animationend', function () { hand.classList.remove('is-emerging'); }, { once: true });
    }
    if (h.kind === 'flip') {
      h.pages.forEach(function (pg, i) {
        var face = document.createElement('div');
        face.className = 'face face--' + (i ? 'back' : 'front');
        face.appendChild(pageImg(pg));
        hand.appendChild(face);
      });
    } else {
      hand.appendChild(pageEl(h.pages[0]));
    }
    $('reader-prev').hidden = $('reader-next').hidden = h.kind !== 'leaf';
    $('reader-turn').hidden = h.kind !== 'flip';
    $('reader-turn').textContent = 'Turn it over';
    $('reader-reach').textContent = item.reach || '';
    $('reader-reach').hidden = !stillInside(item).length;
    zoom(false);

    $('reader').hidden = false;
    document.body.style.overflow = 'hidden';
    markSeen(id);
    showAt();
    var first = !$('reader-reach').hidden ? $('reader-reach') : h.kind === 'leaf' ? $('reader-next') : h.kind === 'flip' ? $('reader-turn') : $('reader').querySelector('.reader__x');
    first.focus();
  }

  function current() { return holding.pages[holding.kind === 'flip' ? (holding.turned ? 1 : 0) : holding.at]; }

  function showAt() {
    var pg = current();
    $('reader-page').textContent = holding.item.reach && !stillInside(holding.item).length ? 'Nothing else inside' : pg.label;
    $('reader-prev').disabled = holding.at === 0;
    $('reader-next').disabled = holding.at === holding.pages.length - 1;
    lastSeen = { id: pg.item.id, at: Date.now() };
    markSeen(pg.item.id);
    var next = holding.kind === 'leaf' && holding.pages[holding.at + 1];
    if (next) new Image().src = pageSrc(next.item, next.p);
    fitHand();
  }

  /* Size the thing in hand to fit the view, or the view's width when looking closer. */
  function fitHand() {
    if (!holding) return;
    var hand = $('hand'), view = $('reader-view');
    var imgs = hand.querySelectorAll(holding.kind === 'flip' ? '.face--front img' : '.page:not(.page--turning) img');
    var img = imgs[imgs.length - 1];
    if (!img) return;
    if (!img.naturalWidth) { img.addEventListener('load', fitHand, { once: true }); return; }
    var aspect = img.naturalWidth / img.naturalHeight;
    var vw = view.clientWidth, vh = view.clientHeight;
    var w = view.classList.contains('is-zoomed') ? vw : Math.min(vw, vh * aspect);
    hand.style.width = Math.floor(w) + 'px';
    hand.style.height = Math.floor(w / aspect) + 'px';
  }

  function flip() {
    if (!holding || holding.kind !== 'flip') return;
    holding.turned = !holding.turned;
    $('hand').classList.toggle('is-turned', holding.turned);
    $('reader-turn').textContent = holding.turned ? 'Turn it back' : 'Turn it over';
    showAt();
  }

  /* Turn a page: the current one swings away to reveal the next underneath,
     or the previous one swings back over it. */
  function leaf(step) {
    if (!holding || holding.kind !== 'leaf') return;
    var to = holding.at + step;
    if (to < 0 || to >= holding.pages.length) return;
    var hand = $('hand');
    // Finish any turn still in motion.
    Array.prototype.forEach.call(hand.querySelectorAll('.page--turning'), function (el) { el.remove(); });
    var pages = hand.querySelectorAll('.page');
    for (var i = 0; i < pages.length - 1; i++) pages[i].remove();
    var under = hand.querySelector('.page');
    under.classList.remove('page--returning');

    var fresh = pageEl(holding.pages[to]);
    if (reduceMotion) {
      hand.replaceChild(fresh, under);
    } else if (step > 0) {
      hand.insertBefore(fresh, under);
      under.classList.add('page--turning');
      under.addEventListener('animationend', function () { under.remove(); }, { once: true });
    } else {
      fresh.classList.add('page--returning');
      hand.appendChild(fresh);
      fresh.addEventListener('animationend', function () { fresh.classList.remove('page--returning'); under.remove(); }, { once: true });
    }
    holding.at = to;
    showAt();
  }

  /* Take the next thing out of the kete or envelope. It goes into your hand,
     and is put down on the table beside where it came from. */
  function reachIn() {
    if (!holding) return;
    var from = holding.item, next = stillInside(from)[0];
    if (!next) return;
    var lands = TAKE_OUT[next.id] || [20, 0], at = beside(placeOf(from.id), lands[0]);
    state.layout[next.id] = [at[0], at[1], lands[0], lands[1], topZ() + 1];
    state.out.push(next.id);
    save();
    addThing(next.id, pileIds().length - 1);
    openReader(next.id, true);
  }

  /* A spot in the box next to p for something w wide: of eight around it, the
     one with the most room, so it covers as little as it can. */
  function beside(p, w) {
    var apart = (p[2] + w) * 0.45, best = null;
    for (var a = 0; a < 8; a++) {
      var x = clamp(p[0] + Math.cos(a * Math.PI / 4) * apart, w / 2 + 2, 98 - w / 2);
      var y = clamp(p[1] + Math.sin(a * Math.PI / 4) * apart, 10, 90);
      var room = Infinity;
      pileIds().forEach(function (id) {
        var q = placeOf(id);
        room = Math.min(room, Math.hypot(q[0] - x, q[1] - y) - q[2] / 2);
      });
      if (!best || room > best[2]) best = [x, y, room];
    }
    return best;
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

  /* Looking closer stays on while turning pages, so an article can be read through. */
  function zoom(on) {
    var view = $('reader-view');
    view.classList.toggle('is-zoomed', on);
    view.scrollTop = 0;
    $('reader-zoom').textContent = on ? 'Step back' : 'Look closer';
    $('reader-zoom').setAttribute('aria-pressed', String(on));
    fitHand();
  }

  function toggleZoom() { zoom(!$('reader-view').classList.contains('is-zoomed')); }

  // Tapping the thing does the natural thing: turn it over, turn the page, or look closer.
  // Taking something out of the kete or envelope is only ever the button, never a stray tap.
  function tapHand(e) {
    if (!holding) return;
    if (holding.kind === 'flip') flip();
    else if (holding.kind === 'leaf') {
      var r = $('hand').getBoundingClientRect();
      leaf(e.clientX - r.left < r.width * 0.35 ? -1 : 1);
    } else toggleZoom();
  }

  function closeReader() {
    if ($('reader').hidden) return;
    $('reader').hidden = true;
    $('hand').textContent = '';
    document.body.style.overflow = '';
    var id = holding && holding.item.id;
    holding = null;
    var again = id && thingEl(id);
    if (again) again.focus({ preventScroll: true });
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

  /* text can be a promise: the typing dots show while Alexa works out her answer.
     With her voice on she says it aloud, and her next line waits until she's done. */
  function her(text, then) {
    var gen = generation;
    queue = queue.then(function () {
      if (gen !== generation) return;
      var face = $('alexa-face');
      var typing = document.createElement('li');
      typing.className = 'msg msg--typing';
      typing.setAttribute('aria-label', 'Alexa is talking');
      typing.innerHTML = '<span></span><span></span><span></span>';
      $('log').appendChild(typing);
      scrollLog();
      face.classList.add('is-speaking');
      var shown = Date.now();

      // A failure working out the answer must not silence Alexa for the rest of the game.
      return Promise.resolve(text).catch(function () { return FALLBACKS[0]; }).then(function (t) {
        return new Promise(function (done) {
          var aloud = Voice.canSpeak && Voice.voiceOn();
          var wait = (reduceMotion ? 250 : aloud ? Math.min(900, 300 + t.length * 3) : Math.min(1700, 420 + t.length * 7)) - (Date.now() - shown);
          setTimeout(function () {
            typing.remove();
            if (gen !== generation) { face.classList.remove('is-speaking'); done(); return; }
            appendMsg('her', t);
            remember('her', t);
            flagAlexaTab();
            // Looking at something, or at the box on a phone: her answer shows over it too.
            var over = !alexaInView();
            if (over) subtitle('her', t, 0); else subtitle(null);
            if (then) then();
            Voice.say(t).then(function () {
              face.classList.remove('is-speaking');
              var still = $('subtitle').classList.contains('subtitle--her') && $('subtitle-text').textContent === t;
              if (over && still && !$('subtitle').hidden) subtitle('her', t, 3000 + (Voice.canSpeak && Voice.voiceOn() ? 0 : t.length * 45));
              done();
            });
          }, Math.max(0, wait));
        });
      });
    });
  }

  /* The codes follow the Blueprint: the short code gets "are you sure?",
     the code with "cleansing" in it is final. They are matched word for word,
     never by meaning, so a guess can never make the final choice. */
  function codeReply(raw) {
    var n = norm(raw);
    var cleansing = has(n, 'cleansing');
    if (has(n, 'release') && has(n, '616')) {
      return cleansing ? { text: CODES.release.final, final: 'release' } : { text: CODES.release.confirm };
    }
    if (has(n, 'destroy') && has(n, '264')) {
      return cleansing ? { text: CODES.destroy.final, final: 'destroy' } : { text: CODES.destroy.confirm };
    }
    return null;
  }

  /* Asked in the first moments, while the sentence model is still loading:
     wait a little for it (her typing dots show) rather than answer by words. */
  function meaningSoon(ms) {
    if (meaning || !window.Meaning || !window.Meaning.loading) return Promise.resolve(meaning);
    return new Promise(function (resolve) {
      var done = function () { clearTimeout(giveUp); resolve(meaning); };
      var giveUp = setTimeout(done, ms);
      window.addEventListener('chickencoop:meaning-ready', done, { once: true });
      window.addEventListener('chickencoop:meaning-failed', done, { once: true });
    });
  }

  /* Everything else: by meaning once the model is ready, by words until then.
     Resolves to what Alexa says. */
  function understand(raw) {
    // People talking to an Alexa start with her name ("Alexa, who is Ken?"); the question is the rest.
    var rest = String(raw).replace(/^\s*(hey|ok|okay)?[\s,]*alexa\b[\s,.:;!?-]*/i, '');
    if (/[a-z0-9]/i.test(rest)) raw = rest;
    var context = lastSeen && Date.now() - lastSeen.at < SEEN_FOR ? lastSeen.id : null;
    var byWords = function () { return Understand.byKeywords(raw); };
    var work = meaningSoon(8000).then(function (m) {
      return m ? m.embed(raw).then(function (v) { return Understand.byMeaning(v, m.index, raw, { contextItem: context }); }) : byWords();
    });
    return work.catch(byWords).then(function (result) {
      var turn = state.fallback;
      if (result.kind === 'fallback') { state.fallback += 1; save(); }
      if (debug) {
        console.log('[alexa]', meaning ? 'meaning' : 'words', result.kind, result.entry ? result.entry.id : '-',
          result.score !== undefined ? result.score.toFixed(2) : '-', result.item ? result.item.id : '-', JSON.stringify(raw));
      }
      return Understand.compose(result, turn);
    });
  }

  function ask(raw) {
    var text = String(raw).trim();
    if (!text) return;
    var code = codeReply(text);
    you(text, !!code);
    save();
    if (code && code.final) lockAsk(true);
    var gen = generation;
    her(code ? code.text : understand(text), code && code.final ? function () {
      setTimeout(function () { if (gen === generation) finish(code.final); }, reduceMotion ? 300 : 2200);
    } : null);
  }

  function lockAsk(locked) {
    if (locked) Voice.cancel();
    $('ask-input').disabled = locked;
    $('ask-mic').disabled = locked;
    $('ask').querySelector('button[type="submit"]').disabled = locked;
    $('codes').hidden = locked;
  }

  // ---------- Talking out loud (voice.js does the listening and speaking) ----------

  // Short enough to fit in a text box, where they show.
  var NOT_HEARD = {
    nothing: 'Didn’t catch that. Try again?',
    again: 'Tap the microphone again to talk',
    blocked: 'Microphone blocked: allow it in settings',
    unavailable: 'Can’t listen in this browser. Type instead'
  };

  var SETUP = 'chickencoop-setup'; // 'voice' or 'text': the player's choice on their first visit; kept through Start over
  function setupChoice() { try { return localStorage.getItem(SETUP); } catch (e) { return null; } }
  function saveSetup(mode) { try { localStorage.setItem(SETUP, mode); } catch (e) { /* ask again next visit */ } }

  var mics = {};

  /* A way to talk: a microphone button, and where to show what's happening.
     Tap to talk (it stops when you pause, or tap again), or hold Space. */
  function makeMic(btn, view) {
    var fade = null, holding = false;
    var status = function (state, text) {
      clearTimeout(fade);
      btn.classList.toggle('is-listening', state === 'listening');
      btn.classList.toggle('is-busy', state === 'busy');
      btn.setAttribute('aria-pressed', String(state !== 'idle'));
      btn.setAttribute('aria-label', state === 'listening' ? 'Stop listening' : 'Talk to Alexa');
      view.show(state, text);
      $('voice-status').textContent = text || '';
    };
    var ui = {
      onListening: function () { status('listening', holding ? 'Listening… let go of Space when you’re done' : 'Listening…'); },
      onHeard: function (text) { view.heard(text); },
      onWaiting: function (f) { view.heard(''); status('busy', 'Getting ready to listen…' + (f > 0 ? ' ' + Math.round(f * 100) + '%' : '')); },
      onWorking: function () { view.heard(''); status('busy', 'Working out what you said…'); },
      onDone: function (text) {
        view.heard('');
        status('idle');
        if (setupChoice() !== 'voice') saveSetup('voice'); // they've talked, so Space can work for them too
        view.send(text);
      },
      onFail: function (why) {
        view.heard('');
        status('idle', NOT_HEARD[why]);
        fade = setTimeout(function () { status('idle'); }, 6000);
      }
    };
    var mic = {
      button: btn,
      start: function (hold) {
        if (Voice.isListening() || btn.disabled || btn.classList.contains('is-busy')) return false;
        holding = !!hold;
        status('listening', 'Starting…');
        Voice.listen(ui, { hold: holding });
        return true;
      }
    };
    if (!Voice.canListen) btn.hidden = true;
    btn.addEventListener('click', function () {
      if (Voice.isListening()) Voice.stop(); else mic.start(false);
    });
    return mic;
  }

  // Next to a text box: what's happening shows in the box.
  function inBox(input, send) {
    var placeholder = input.placeholder;
    return {
      show: function (state, text) { input.placeholder = text || placeholder; },
      heard: function (text) { input.value = text; },
      send: send
    };
  }

  // Over the box or something in hand, where Alexa's panel isn't showing: subtitles.
  var overThings = {
    show: function (state, text) { if (text) subtitle('note', text, state === 'idle' ? 5000 : 0); else if (state === 'idle') subtitle(null); },
    heard: function (text) { if (text) subtitle('you', text, 0); },
    send: function (text) { subtitle('you', text, 0); ask(text); }
  };

  var subtitleTimer = null;

  /* Subtitles: what the player said and what Alexa answered, when her panel is
     out of sight (something in hand, or the box tab on a phone). ms 0 keeps it up. */
  function subtitle(who, text, ms) {
    var el = $('subtitle');
    clearTimeout(subtitleTimer);
    if (!who) { el.hidden = true; return; }
    el.className = 'subtitle subtitle--' + who;
    $('subtitle-who').textContent = who === 'her' ? 'Alexa' : who === 'you' ? 'You' : '';
    $('subtitle-text').textContent = who === 'you' ? '“' + text + '”' : text;
    // Above the buttons of the thing in hand, if one is open.
    var foot = $('reader').hidden ? null : $('reader').querySelector('.reader__foot');
    el.style.bottom = foot ? Math.round(window.innerHeight - foot.getBoundingClientRect().top + 12) + 'px' : '';
    el.hidden = false;
    if (ms) subtitleTimer = setTimeout(function () { el.hidden = true; }, ms);
  }

  function alexaInView() {
    return !$('game').hidden && $('reader').hidden && $('alexa').offsetParent !== null;
  }

  // The microphone for wherever the player is: the one Space uses.
  function micHere() {
    var mic = !$('intro').hidden ? mics.intro
      : !$('ending').hidden ? null
      : !$('reader').hidden ? mics.reader
      : alexaInView() ? mics.ask
      : mics.box;
    return mic && !mic.button.disabled ? mic : null;
  }

  /* Hold Space to talk from anywhere: while looking at something, digging in
     the box, or on the closed box. Not while typing, and only for players who
     chose to talk. Enter still picks things up and presses buttons. */
  function bindSpace() {
    var held = null;
    var typing = function (el) { return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable); };
    document.addEventListener('keydown', function (e) {
      if (e.key !== ' ' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (held) { e.preventDefault(); return; } // the key repeating while held
      if (typing(e.target) || setupChoice() !== 'voice' || !$('setup').hidden) return;
      var mic = micHere();
      if (!mic) return;
      e.preventDefault();
      if (mic.start(true)) held = mic;
    });
    var letGo = function (e) {
      if (!held) return;
      if (e && e.type === 'keyup' && e.key !== ' ') return;
      if (e && e.preventDefault) e.preventDefault();
      held = null;
      Voice.stop();
    };
    document.addEventListener('keyup', letGo);
    window.addEventListener('blur', letGo); // the key-up would never arrive
  }

  /* First visit: talk or type? If the browser already lets this page use the
     microphone there's nothing to ask. Choosing to talk asks for it now. */
  function offerSetup() {
    if (setupChoice() || !Voice.canListen) return;
    Voice.micPermission().then(function (state) {
      if (state === 'granted') { saveSetup('voice'); return; }
      $('setup-note').textContent = '';
      $('setup').hidden = false;
      $('setup-voice').focus();
    });
  }

  function chooseSetup(mode) {
    saveSetup(mode);
    Voice.setVoiceOn(mode === 'voice');
    renderVoiceToggle();
    $('setup').hidden = true;
    $('intro-input').focus();
  }

  function bindSetup() {
    $('setup-voice').addEventListener('click', function () {
      var note = $('setup-note');
      note.textContent = 'Allow the microphone when your browser asks.';
      Voice.requestMic().then(function (result) {
        if (result === 'granted') { chooseSetup('voice'); return; }
        note.textContent = result === 'denied'
          ? 'Your browser has blocked the microphone for this page. Allow it in the site settings and try again, or play with the keyboard.'
          : 'No microphone was found. Connect one and try again, or play with the keyboard.';
      });
    });
    $('setup-text').addEventListener('click', function () { chooseSetup('text'); });
    $('setup').addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var a = $('setup-voice'), b = $('setup-text');
      if (document.activeElement === (e.shiftKey ? a : b)) { e.preventDefault(); (e.shiftKey ? b : a).focus(); }
    });
  }

  function renderVoiceToggle() {
    var btn = $('voice-toggle'), on = Voice.voiceOn();
    btn.hidden = !Voice.canSpeak;
    btn.classList.toggle('is-off', !on);
    btn.setAttribute('aria-pressed', String(on));
    btn.title = on ? 'Alexa’s voice is on' : 'Alexa’s voice is off';
  }

  // ---------- Mobile tabs ----------

  function showView(view) {
    document.querySelector('.stage').dataset.view = view;
    $('tab-box').setAttribute('aria-selected', String(view === 'box'));
    $('tab-alexa').setAttribute('aria-selected', String(view === 'alexa'));
    if (view === 'alexa') { $('tab-alexa-new').hidden = true; scrollLog(); }
    else fitDesk();
  }

  function flagAlexaTab() {
    if (document.querySelector('.stage').dataset.view === 'box' && narrow()) {
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
    subtitle(null);
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
    // The first time, the lid comes off before Alexa says anything. On phones
    // her tab comes first (she opens the conversation), after the box is open.
    var welcome = !state.started, opening = welcome && animate && !reduceMotion;
    showView(opening ? 'box' : 'alexa');
    renderBox();
    fitDesk();

    var log = $('log');
    log.textContent = '';
    state.log.forEach(function (m) { appendMsg(m.who, m.text, m.extra); });

    // Coming back to a box already open, things settle into place; under a lid they're simply there.
    if (animate && !reduceMotion && !opening) {
      $('game').classList.add('is-arriving');
      setTimeout(function () { $('game').classList.remove('is-arriving'); }, 2200);
    }

    if (welcome) {
      state.started = true;
      save();
    }
    var gen = generation;
    // Her sentence model starts loading once the lid has landed: setting it up keeps
    // the page busy, which would make the lid stutter. Her welcome covers the wait.
    if (!opening) startMeaning();
    (opening ? openLid() : Promise.resolve()).then(function () {
      if (opening) startMeaning();
      if (gen !== generation) return;
      if (opening) showView('alexa');
      if (welcome) WELCOME.forEach(function (line) { her(line); });
      if (!narrow()) $('ask-input').focus({ preventScroll: true });
    });
  }

  /* The lid comes off: it lifts from the box, turns over and lands beside it,
     where it lies from then on, with the line written inside showing. The
     moving lid is a stand-in; the real one appears where it lands. */
  function openLid() {
    var desk = $('desk'), lid = thingEl(LID.id);
    if (!lid || !desk.animate) return Promise.resolve();
    var cover = document.createElement('div');
    cover.className = 'lid-cover';
    cover.setAttribute('aria-hidden', 'true');
    var top = new Image(), under = new Image(), shown = lid.querySelector('img');
    top.className = 'lid-cover__top';
    under.className = 'lid-cover__under';
    top.src = 'box/lid-top.jpg';
    under.src = pileSrc(itemById(LID.id));
    top.alt = under.alt = '';
    cover.appendChild(top);
    cover.appendChild(under);
    // On the box from the start, so nothing inside shows before it lifts.
    var d = desk.getBoundingClientRect(), c = $('carton').getBoundingClientRect();
    var pct = function (px, of) { return px / of * 100; };
    var from = { x: pct(c.left + c.width / 2 - d.left, d.width), y: pct(c.top + c.height / 2 - d.top, d.height), w: pct(c.width + 6, d.width), h: pct(c.height + 6, d.height) };
    var put = function (f) { cover.style.left = f.x + '%'; cover.style.top = f.y + '%'; cover.style.width = f.w + '%'; cover.style.height = f.h + '%'; };
    put(from);
    desk.appendChild(cover);
    lid.style.visibility = 'hidden';

    var loaded = function (img) {
      var ok = img.decode ? img.decode().catch(function () {}) : Promise.resolve();
      return Promise.race([ok, new Promise(function (r) { setTimeout(r, 1500); })]); // a slow connection doesn't hold up the game
    };
    return Promise.all([loaded(top), loaded(under), loaded(shown)]).then(function () {
      // Where the real lid lies, as place() puts it.
      var p = placeOf(LID.id), b = DESKS[deskShape].box;
      var aspect = shown.naturalWidth ? shown.naturalHeight / shown.naturalWidth : 0.6;
      var w = p[2] * b[2] / 100;
      var to = { x: b[0] + clampX(p[0]) * b[2] / 100, y: b[1] + clampY(p[1]) * b[3] / 100, w: w, h: pct(w / 100 * d.width * aspect, d.height) };
      var mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 8, w: (from.w + to.w) / 2, h: (from.h + to.h) / 2 };
      var at = function (f, extra) { return { left: f.x + '%', top: f.y + '%', width: f.w + '%', height: f.h + '%', transform: extra }; };
      var turn = function (spin, over, scale) { return 'translate(-50%, -50%) perspective(1400px) rotate(' + spin + 'deg) rotateY(' + over + 'deg) scale(' + scale + ')'; };
      var lifted = { x: from.x, y: from.y - 2, w: from.w, h: from.h };
      var frames = [
        at(from, turn(0, 0, 1)),
        Object.assign(at(lifted, turn(0, 0, 1.04)), { offset: 0.2 }),
        Object.assign(at(mid, turn(p[3] / 2, 110, 1.12)), { offset: 0.6 }),
        at(to, turn(p[3], 180, 1))
      ];
      return cover.animate(frames, { duration: 1700, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'forwards' }).finished;
    }).catch(function () { /* if it can't animate, the lid is simply off */ }).then(function () {
      cover.remove();
      lid.style.visibility = '';
    });
  }

  function narrow() { return window.matchMedia('(max-width: 860px)').matches; }

  function openCoop() {
    var intro = $('intro');
    Voice.prepare(WELCOME); // her first lines download while the lid comes off
    intro.classList.add('is-opening');
    $('intro-reply').textContent = '';
    setTimeout(function () {
      intro.classList.remove('is-opening');
      enterBox(true);
    }, reduceMotion ? 50 : 850);
  }

  function onIntro(e) {
    e.preventDefault();
    var said = $('intro-input').value.trim();
    if (!said) {
      // The line in the empty box is only a hint: it has to be said or typed.
      $('intro-reply').textContent = Voice.canListen && !$('intro-mic').hidden ? 'Type it in, or tap the microphone and say it.' : 'Type it in first.';
      $('intro-input').focus();
      return;
    }
    tryOpen(said, true);
  }

  // Typed or said: only the line itself opens the box.
  function tryOpen(said, typed) {
    var n = norm(said);
    if (INTRO_PHRASES.some(function (p) { return has(n, p); })) {
      openCoop();
    } else {
      $('intro-input').value = said;
      $('intro-reply').textContent = START_HINT;
      Voice.say(START_HINT);
      if (typed) $('intro-input').select(); // not after talking: on a phone that would pop up the keyboard
    }
  }

  function startOver() {
    if (!window.confirm('Start over? Everything goes back in the box and Alexa forgets this conversation.')) return;
    restart();
  }

  function restart() {
    Voice.cancel();
    Voice.hush();
    subtitle(null);
    wipe();
    state = fresh();
    lastSeen = null;
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
    showView('alexa');
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

    mics.intro = makeMic($('intro-mic'), inBox($('intro-input'), tryOpen));
    mics.ask = makeMic($('ask-mic'), inBox($('ask-input'), ask));
    mics.reader = makeMic($('reader-mic'), overThings);
    mics.box = makeMic($('box-mic'), overThings);
    bindSpace();
    bindSetup();
    offerSetup();
    renderVoiceToggle();
    $('voice-toggle').addEventListener('click', function () {
      Voice.setVoiceOn(!Voice.voiceOn());
      renderVoiceToggle();
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
    $('reader-prev').addEventListener('click', function () { leaf(-1); });
    $('reader-next').addEventListener('click', function () { leaf(1); });
    $('reader-turn').addEventListener('click', flip);
    $('reader-zoom').addEventListener('click', toggleZoom);
    $('reader-reach').addEventListener('click', reachIn);

    // Tap the thing in hand, or swipe across it to turn the page.
    var hand = $('hand');
    hand.addEventListener('pointerdown', function (e) { swipe = { x: e.clientX, y: e.clientY }; });
    hand.addEventListener('pointerup', function (e) {
      if (!swipe) return;
      var dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
      swipe = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5 && holding && holding.kind !== 'single') {
        if (holding.kind === 'leaf') leaf(dx < 0 ? 1 : -1); else flip();
      } else if (Math.abs(dx) + Math.abs(dy) < 10) {
        tapHand(e);
      }
    });

    document.addEventListener('keydown', function (e) {
      if ($('reader').hidden) return;
      if (e.key === 'Escape') closeReader();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        if (holding && holding.kind === 'leaf') leaf(e.key === 'ArrowRight' ? 1 : -1);
        else if (holding && holding.kind === 'flip') flip();
      }
      trapFocus(e);
    });

    // Keep the desk fitted to its pane, and the thing in hand fitted to the view.
    var refit = function () { if (!$('game').hidden) fitDesk(); fitHand(); };
    if (window.ResizeObserver) {
      new ResizeObserver(function () { if (!$('game').hidden) fitDesk(); }).observe($('box'));
      new ResizeObserver(function () { fitHand(); }).observe($('reader-view'));
    }
    window.addEventListener('resize', refit);

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
