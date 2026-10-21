/* Open the Chicken Coop — working out what the player asked.
   Pure logic over data.js: no page code and no model loading, so the same file
   runs in the game and in the accuracy tests. meaning.js supplies the model. */
(function (root) {
  'use strict';

  /* Similarity is 0..1 between a question and an example (1 = same meaning).
     answer: say the scripted answer plainly; hedge: say it after a hedge;
     item: confident enough that the question is about a particular item;
     boost: added to answers linked to that item; margin: a plain answer must
     beat the runner-up by at least this much, or it gets a hedge. */
  var BANDS = { answer: 0.60, hedge: 0.45, item: 0.50, boost: 0.06, margin: 0.02 };

  // Words that point at whatever the player was just looking at.
  var POINTING = ['this', 'that', 'these', 'those', 'it', 'them', 'they', 'here'];

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

  function dot(a, b) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  function maxDot(v, vecs) {
    var best = -1;
    for (var i = 0; i < vecs.length; i++) best = Math.max(best, dot(v, vecs[i]));
    return best;
  }

  function itemById(id) {
    for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i];
    return null;
  }

  // ---------- Word matching (before the model is ready, or without it) ----------

  /* Longer phrases beat shorter ones, so "who is igor" wins over "igor".
     A match on a single word is a guess, so it gets a hedge. */
  function byKeywords(raw) {
    var n = norm(raw), best = null, bestScore = 0, words = 0;
    QA.forEach(function (entry) {
      entry.keys.forEach(function (key) {
        var k = norm(key).trim();
        if (k && has(n, k)) {
          var w = k.split(' ').length, score = w * 100 + k.length;
          if (score > bestScore) { bestScore = score; best = entry; words = w; }
        }
      });
    });
    if (!best) return { kind: 'fallback' };
    return { kind: words > 1 ? 'answer' : 'hedge', entry: best };
  }

  // ---------- Meaning matching ----------

  /* An item is recognised by its label and name as well as its description,
     so short references ("the plant") find it too. */
  function itemTexts(it) { return [it.label, it.name].concat(it.about || []); }

  /* Every sentence the model needs to have seen in advance, in a fixed order:
     all answers' examples, then every item's texts. */
  function anchorTexts() {
    var out = [];
    QA.forEach(function (e) { e.examples.forEach(function (q) { out.push(q); }); });
    ITEMS.forEach(function (it) { itemTexts(it).forEach(function (t) { out.push(t); }); });
    return out;
  }

  /* vectors: one per anchorTexts() entry, same order. */
  function buildIndex(vectors) {
    var k = 0;
    return {
      answers: QA.map(function (e) { return { entry: e, vecs: e.examples.map(function () { return vectors[k++]; }) }; }),
      items: ITEMS.map(function (it) { return { item: it, vecs: itemTexts(it).map(function () { return vectors[k++]; }) }; })
    };
  }

  /* Step 1 finds the item the question is about, if any: by its description,
     or the item just looked at when the question points ("who's this?").
     Step 2 scores every answer by its closest example, nudging answers linked
     to that item. opts.items === false turns step 1 off (for measuring it). */
  function byMeaning(qv, index, raw, opts) {
    opts = opts || {};
    var object = null, itemScore = 0;
    if (opts.items !== false) {
      index.items.forEach(function (row) {
        if (!row.vecs.length) return;
        var s = maxDot(qv, row.vecs);
        if (s > itemScore) { itemScore = s; object = row.item; }
      });
      if (itemScore < BANDS.item) {
        object = null;
        var context = opts.contextItem && itemById(opts.contextItem);
        var n = norm(raw);
        if (context && POINTING.some(function (w) { return has(n, w); })) object = context;
      }
    }

    var ranked = index.answers.map(function (row) {
      var s = maxDot(qv, row.vecs);
      if (object && object.links.indexOf(row.entry.id) !== -1) s += BANDS.boost;
      return { entry: row.entry, score: s };
    }).sort(function (a, b) { return b.score - a.score; });

    var top = ranked[0], margin = top.score - ranked[1].score;
    var result = { entry: top.entry, score: top.score, margin: margin, item: object, itemScore: itemScore };
    // When the question is about an item, an answer unrelated to it has to be a strong match.
    var unrelated = object && object.links.indexOf(top.entry.id) === -1;

    if (top.score >= BANDS.answer && margin >= BANDS.margin) result.kind = 'answer';
    else if (top.score >= BANDS.hedge && !unrelated) result.kind = 'hedge';
    else if (object && object.links.length) {
      // About a known item but unclear what: offer the closest linked answer, hedged.
      var linked = ranked.filter(function (r) { return object.links.indexOf(r.entry.id) !== -1; })[0];
      result.kind = 'hedge'; result.entry = linked.entry; result.score = linked.score;
    } else if (object) result.kind = 'unknown-item';
    else result.kind = 'fallback';
    return result;
  }

  // ---------- What Alexa says ----------

  /* fallbackTurn picks which of the scripted fallback lines to use. */
  function compose(result, fallbackTurn) {
    if (result.kind === 'answer') return result.entry.a;
    if (result.kind === 'hedge') {
      var hedge = result.entry.topic ? HEDGES.topic.replace('{topic}', result.entry.topic) : HEDGES.plain;
      return hedge + ' ' + result.entry.a;
    }
    if (result.kind === 'unknown-item') return UNKNOWN_ITEM.replace('{name}', result.item.name);
    return FALLBACKS[fallbackTurn % FALLBACKS.length];
  }

  root.Understand = {
    BANDS: BANDS, norm: norm, has: has,
    byKeywords: byKeywords, anchorTexts: anchorTexts, buildIndex: buildIndex, byMeaning: byMeaning, compose: compose
  };
})(typeof window !== 'undefined' ? window : globalThis);
