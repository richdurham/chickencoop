// The box: the pile, picking things up, turning over, leafing, the kete and envelope, saving, phones.
// Usage: node tools/tests/box.js <screenshot-dir> [site address, default http://127.0.0.1:8765/demo/]
// Serve the repo first: python3 -m http.server 8765 --bind 127.0.0.1 (from the repo's root).
const { chromium } = require('playwright');
const OUT = process.argv[2];
const URL = process.argv[3] || 'http://127.0.0.1:8765/demo/';

function check(cond, msg) {
  console.log((cond ? 'PASS ' : 'FAIL ') + msg);
  if (!cond) process.exitCode = 1;
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
async function pickUp(page, id) { const p = await spot(page, id); await page.mouse.click(p.x, p.y); await page.waitForSelector('#reader:not([hidden])'); }
async function dragThing(page, id, dx, dy) {
  const p = await spot(page, id);
  await page.mouse.move(p.x, p.y); await page.mouse.down();
  await page.mouse.move(p.x + dx, p.y + dy, { steps: 10 }); await page.mouse.up();
}
// Is the centre of this thing hidden under something else?
async function covered(page, id) {
  return page.evaluate(id => {
    const el = document.querySelector('.thing[data-item="' + id + '"]');
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !(hit && hit.closest('.thing') === el);
  }, id);
}
// Is no part of this thing on top anywhere?
async function hidden(page, id) {
  return page.evaluate(id => {
    const el = document.querySelector('.thing[data-item="' + id + '"]');
    const r = el.getBoundingClientRect();
    for (let i = 0; i <= 20; i++) for (let j = 0; j <= 20; j++) {
      const hit = document.elementFromPoint(r.left + r.width * i / 20, r.top + r.height * j / 20);
      if (hit && hit.closest('.thing') === el) return false;
    }
    return true;
  }, id);
}
async function say(page, text) {
  const before = await page.$$eval('.msg--her', els => els.length);
  await page.fill('#ask-input', text);
  await page.press('#ask-input', 'Enter');
  await page.waitForFunction(n => document.querySelectorAll('.msg--her').length > n, before, { timeout: 30000 });
  return page.$$eval('.msg--her', els => els[els.length - 1].textContent);
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const watch = (p, tag) => {
    p.on('pageerror', e => errors.push(tag + String(e)));
    p.on('response', r => { if (r.status() >= 400) errors.push(tag + r.status() + ' ' + r.url()); });
  };

  // ---------- Desktop ----------
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); await ctx.addInitScript(() => { try { localStorage.setItem('chickencoop-setup', 'text'); } catch (e) {} }); // the first-visit choice was made
  const page = await ctx.newPage(); watch(page, '');
  await page.goto(URL);
  await page.fill('#intro-input', 'Alexa, open the chicken coop');
  await page.click('#intro-form button[type="submit"]');
  await page.waitForSelector('#game:not([hidden])');
  await page.waitForFunction(() => document.querySelectorAll('.msg--her').length >= 3);

  check((await page.$$('.thing')).length === 17, '17 things on the table (the rest are in the folder, the kete and the envelope)');
  check(!(await page.$('.thing[data-item="dog-tags"]')) && !(await page.$('.thing[data-item="card"]')) && !(await page.$('.thing[data-item="kete-note"]')), 'the dog tags, the paper and the card start inside things');
  check((await page.$$('.chip')).length === 0 && !(await page.$('#reader-ask')) && !(await page.$('#chips')), 'no suggested questions anywhere');
  check((await page.$$('.code')).length === 0 && !(await page.$('#codes')), 'Alexa’s panel doesn’t offer the command codes');
  check(await hidden(page, 'release-slip') && await hidden(page, 'destroy-slip'), 'the two slips with the codes start out of sight, under other things');
  check(await page.isVisible('#desk-hint'), 'a hint explains moving and picking up');
  check((await page.textContent('#progress')) === 'Looked at: nothing', 'nothing looked at yet, and no count');
  check(await page.evaluate(() => document.activeElement && document.activeElement.id === 'ask-input'), 'wide screens put the cursor in Alexa’s input');
  await page.screenshot({ path: OUT + '/t01-desk.png' });

  // Turning over a photo with writing on the back.
  await pickUp(page, 'summer-school');
  check((await page.textContent('#reader-page')) === 'Front', 'the group photo shows its front first');
  await page.click('#reader-turn');
  check((await page.textContent('#reader-page')) === 'Back' && await page.$eval('#hand', h => h.classList.contains('is-turned')), 'turning it over shows the back');
  check((await page.getAttribute('.face--back img', 'src')) === 'box/summer-school-2.jpg', 'the back is the photo’s back');
  await page.keyboard.press('ArrowRight');
  check((await page.textContent('#reader-page')) === 'Front', 'arrow keys turn it back');
  await page.keyboard.press('Escape');
  check(await page.isHidden('#reader'), 'Escape puts it back');
  check(await page.evaluate(() => document.activeElement && document.activeElement.dataset.item === 'summer-school'), 'focus returns to the photo on the table');

  // Digging: the certificate starts underneath the folder, and moving the folder reveals it.
  check(await covered(page, 'certificate'), 'the certificate starts hidden under the folder');
  const before = await page.$eval('.thing[data-item="folder-cover"]', el => el.style.left + ' ' + el.style.top);
  await dragThing(page, 'folder-cover', 0, -260);
  const after = await page.$eval('.thing[data-item="folder-cover"]', el => el.style.left + ' ' + el.style.top);
  check(before !== after, 'dragging moves the folder');
  check(!(await covered(page, 'certificate')), 'moving the folder reveals the certificate underneath');
  check(!(await hidden(page, 'destroy-slip')), 'and part of a slip of paper that was under it');
  check(await page.isHidden('#desk-hint'), 'the hint goes once something has been moved');
  check(await page.isHidden('#reader'), 'a drag does not pick the thing up');
  const z = await page.$$eval('.thing', els => els.map(e => ({ id: e.dataset.item, z: +e.style.zIndex })));
  check(z.find(t => t.id === 'folder-cover').z === Math.max(...z.map(t => t.z)), 'what was just moved lies on top');
  await pickUp(page, 'destroy-slip');
  check((await page.textContent('#reader-title')) === 'Scrap of paper' && (await page.getAttribute('#hand img', 'src')).endsWith('cut/destroy-slip.webp'), 'picking the slip up shows the code written on it');
  await page.click('#reader .reader__x');
  await page.screenshot({ path: OUT + '/t02-moved.png' });

  // Reaching into the kete: the dog tags come out first, then the paper, then it is empty.
  await pickUp(page, 'kete');
  check(await page.isVisible('#reader-reach') && (await page.textContent('#reader-reach')) === 'Reach inside', 'the kete can be reached into');
  check(await page.evaluate(() => document.activeElement.id === 'reader-reach'), 'reaching in is the first thing offered');
  check(!(await page.$('#reader-full')) && (await page.$$('#reader a')).length === 0, 'no link opens anything in a new tab');
  await page.screenshot({ path: OUT + '/t07-kete.png' });
  await page.click('#hand');
  check((await page.textContent('#reader-title')) === 'Kete' && await page.$eval('#reader-view', v => v.classList.contains('is-zoomed')), 'clicking the kete in hand looks closer at it, rather than taking anything out');
  check(!(await page.$('.thing[data-item="dog-tags"]')) && await page.isVisible('#reader-reach'), 'the dog tags are still inside');
  await page.click('#hand');
  check((await page.textContent('#reader-title')) === 'Kete' && !(await page.$eval('#reader-view', v => v.classList.contains('is-zoomed'))), 'clicking again steps back, still holding the kete');
  await page.click('#reader-reach');
  check((await page.textContent('#reader-title')) === 'Dog tags' && (await page.getAttribute('#hand img', 'src')) === 'box/cut/dog-tags.webp', 'reaching in takes out the dog tags and holds them');
  await page.waitForFunction(() => document.querySelector('#hand img').complete);
  await page.screenshot({ path: OUT + '/t08-dog-tags.png' });
  await page.keyboard.press('Escape');
  check(!!(await page.$('.thing[data-item="dog-tags"]')), 'putting them down leaves the dog tags on the table');
  check(await page.evaluate(() => document.activeElement && document.activeElement.dataset.item === 'dog-tags'), 'focus goes to the dog tags on the table');
  const zs = await page.$$eval('.thing', els => els.map(e => ({ id: e.dataset.item, z: +e.style.zIndex })));
  check(zs.find(t => t.id === 'dog-tags').z === Math.max(...zs.map(t => t.z)) && !(await covered(page, 'dog-tags')), 'they lie on top of the pile, in plain sight');
  const near = await page.evaluate(() => {
    const c = id => { const r = document.querySelector('.thing[data-item="' + id + '"]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    const a = c('kete'), b = c('dog-tags'); return Math.hypot(a[0] - b[0], a[1] - b[1]);
  });
  check(near < 200, `they are put down beside the kete (${Math.round(near)}px away)`);
  await page.screenshot({ path: OUT + '/t09-tags-out.png' });
  await pickUp(page, 'kete');
  await page.click('#reader-reach');
  check((await page.textContent('#reader-title')) === 'Paper from the kete', 'reaching in again: the paper comes out');
  await page.keyboard.press('Escape');
  await pickUp(page, 'kete');
  check(await page.isHidden('#reader-reach') && (await page.textContent('#reader-page')) === 'Nothing else inside', 'then the kete is empty');
  await page.click('#hand');
  check(await page.$eval('#reader-view', v => v.classList.contains('is-zoomed')), 'tapping the empty kete looks closer');
  await page.keyboard.press('Escape');

  // The card is in the envelope.
  await pickUp(page, 'envelope');
  check((await page.textContent('#reader-reach')) === 'Open it' && await page.isHidden('#reader-next') && await page.isVisible('#reader-turn'), 'the envelope is held shut, to be opened, or turned over');
  await page.click('#reader-reach');
  const sides = [await page.textContent('#reader-page')];
  for (let i = 0; i < 2; i++) { await page.click('#reader-next'); sides.push(await page.textContent('#reader-page')); }
  check(sides.join(' | ') === 'Front (1 of 3) | Inside (2 of 3) | Back (3 of 3)', 'out comes the card: front, inside, back');
  check(await page.isDisabled('#reader-next'), 'nothing to turn after the back');
  await page.click('#reader .reader__x');
  check(!!(await page.$('.thing[data-item="card"]')), 'the card stays out on the table');

  // Leafing through the folder: every document, page by page.
  await pickUp(page, 'folder-cover');
  check((await page.textContent('#reader-page')) === 'Auckland Council printout, page 1 of 2', 'the folder opens on its first document');
  check(await page.isHidden('#reader-turn') && await page.isVisible('#reader-next'), 'the folder leafs rather than turns over');
  const labels = [await page.textContent('#reader-page')];
  for (let i = 0; i < 15; i++) { await page.keyboard.press('ArrowRight'); labels.push(await page.textContent('#reader-page')); }
  check(labels.length === 16 && labels[15] === 'NOVA Online printout, page 4 of 4', 'all 16 pages of the folder can be leafed through');
  check(labels.includes('Business card') && labels.includes('CNN printout, page 3 of 4'), 'documents are named as you reach them');
  await page.waitForFunction(() => [...document.querySelectorAll('#hand .page img')].every(i => i.complete && i.naturalWidth));
  await page.click('#reader-zoom');
  const closer = await page.waitForFunction(() => { const v = document.getElementById('reader-view'); return v.classList.contains('is-zoomed') && v.scrollHeight > v.clientHeight; }, null, { timeout: 2000 }).then(() => true, () => false);
  check(closer, 'looking closer lets a page be read at full width');
  await page.screenshot({ path: OUT + '/t03-folder-closer.png' });
  await page.click('#reader .reader__x');
  { const t = await page.textContent('#progress'); check(/^Looked at: (a few|some|many|most)$/.test(t), `how much has been looked at is a word, not a count ("${t}")`); }
  const seen = await page.evaluate(() => JSON.parse(localStorage.getItem('chickencoop-demo-v2')).opened);
  check(['council', 'cnn', 'medical', 'business-card', 'emails', 'nova'].every(id => seen.includes(id)), 'leafing marks each folder document as looked at');

  await pickUp(page, 'coins');
  check(await page.isVisible('#reader-credit'), 'the stand-in coins keep their photo credit');
  await page.click('#reader .reader__x');

  // Everything flat turns over, whether or not there is anything on the back; solid things, and the lid, don't.
  for (const [id, back] of [['lid-note', 'Back'], ['wrinkled-note', 'Back'], ['dog-tags', 'Back'], ['kete-note', 'Back'],
    ['boarding-pass', 'Back'], ['coins', 'Back'], ['certificate', 'Back'], ['release-slip', 'Back'], ['destroy-slip', 'Back'],
    ['family-photo', 'Back'], ['summer-school', 'Back'], ['who-trip', 'Back'], ['envelope', 'Back']]) {
    await page.focus('.thing[data-item="' + id + '"]'); await page.keyboard.press('Enter');
    await page.waitForSelector('#reader:not([hidden])');
    const offered = await page.isVisible('#reader-turn');
    if (offered) await page.click('#reader-turn');
    await page.waitForFunction(() => { const i = document.querySelector('.face--back img'); return i && i.complete; });
    const shown = await page.evaluate(() => { const i = document.querySelector('.face--back img'); return { ok: i.naturalWidth > 0, src: i.getAttribute('src') }; });
    check(offered && shown.ok && (await page.textContent('#reader-page')) === back, `${id} turns over (${shown.src})`);
    await page.keyboard.press('Escape');
  }
  const solid = [];
  for (const id of ['kete', 'plant', 'glasses', 'mug', 'lid-inside']) {
    await page.focus('.thing[data-item="' + id + '"]'); await page.keyboard.press('Enter');
    await page.waitForSelector('#reader:not([hidden])');
    if (await page.isHidden('#reader-turn') && await page.isHidden('#reader-prev')) solid.push(id);
    await page.keyboard.press('Escape');
  }
  check(solid.length === 5, 'the kete, the plant, the glasses, the mug and the lid don’t turn over: ' + solid.join(', '));
  // A solid thing: look closer by tapping it.
  await pickUp(page, 'mug');
  await page.click('#hand');
  check(await page.$eval('#reader-view', v => v.classList.contains('is-zoomed')), 'tapping a solid thing looks closer');
  await page.click('#reader .reader__x');

  // Keyboard: move with arrows, pick up with Enter.
  await page.focus('.thing[data-item="mug"]');
  const m0 = await page.$eval('.thing[data-item="mug"]', el => parseFloat(el.style.left));
  await page.keyboard.press('ArrowLeft');
  const m1 = await page.$eval('.thing[data-item="mug"]', el => parseFloat(el.style.left));
  check(m1 < m0, 'arrow keys move a thing');
  await page.keyboard.press('Enter');
  check(await page.isVisible('#reader') && (await page.textContent('#reader-title')) === 'Mug', 'Enter picks it up');
  await page.keyboard.press('Escape');

  // The arrangement survives a reload.
  await page.reload();
  await page.click('#resume');
  await page.waitForSelector('#game:not([hidden])');
  const again = await page.$eval('.thing[data-item="folder-cover"]', el => el.style.left + ' ' + el.style.top);
  check(again === after, 'where things were left is remembered');
  check(await page.isHidden('#desk-hint'), 'the hint stays gone');
  check((await page.$$('.thing')).length === 20, 'what was taken out is still on the table');
  await pickUp(page, 'kete');
  check(await page.isHidden('#reader-reach'), 'and the kete is still empty');
  await page.keyboard.press('Escape');

  // Alexa still answers in plain language, and the ending still lists everything.
  const r = await say(page, 'who is her husband');
  check(r.includes('Ken is Katie'), 'Alexa still answers natural questions');
  await say(page, 'release falcon 616');
  await say(page, 'release cleansing falcon 616');
  await page.waitForSelector('#ending:not([hidden])');
  check((await page.$$('.ending__items li')).length === 26, 'the ending lists all 26 things');
  await ctx.close();
  {
    const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    await c.addInitScript(() => { try { localStorage.setItem('chickencoop-setup', 'text'); } catch (e) {} });
    const p = await c.newPage(); watch(p, 'all: ');
    await p.goto(URL);
    const ids = await p.evaluate(() => ITEMS.map(it => it.id));
    // The coins were left where they were when they were a bigger photo.
    await p.evaluate(ids => { localStorage.setItem('chickencoop-demo-v2', JSON.stringify({ started: true, opened: ids, log: [], ending: null, fallback: 0, layout: { coins: [30, 40, 22, 5, 90] }, handled: true, out: ['dog-tags', 'kete-note', 'card'] })); }, ids);
    await p.reload();
    await p.click('#resume');
    await p.waitForSelector('#game:not([hidden])');
    check((await p.textContent('#progress')) === 'Looked at: all?', 'having looked at everything still only says "all?"');
    const coins = await p.evaluate(() => {
      const el = document.querySelector('.thing[data-item="coins"]');
      return { share: el.offsetWidth / document.getElementById('carton').offsetWidth, turn: el.style.getPropertyValue('--r'), size: PILE.find(r => r[0] === 'coins')[3] / 100 };
    });
    check(Math.abs(coins.share - coins.size) < 0.02 && coins.turn === '5deg', `a thing stays where it was left but takes its current size (${coins.share.toFixed(3)} of the box, ${coins.turn})`);
    await c.close();
  }

  // ---------- Phone ----------
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }); await m.addInitScript(() => { try { localStorage.setItem('chickencoop-setup', 'text'); } catch (e) {} }); // the first-visit choice was made
  const mp = await m.newPage(); watch(mp, 'phone: ');
  await mp.goto(URL);
  await mp.fill('#intro-input', 'Alexa, open the chicken coop');
  await mp.tap('#intro-form button[type="submit"]');
  await mp.waitForSelector('#game:not([hidden])');
  check(await mp.isVisible('#alexa') && await mp.isHidden('#box'), 'phones open on Alexa’s tab');
  check((await mp.getAttribute('#tab-alexa', 'aria-selected')) === 'true', 'the Alexa tab is the selected one');
  await mp.waitForFunction(() => document.querySelectorAll('.msg--her').length >= 3);
  await mp.screenshot({ path: OUT + '/t04-phone-alexa.png' });
  await mp.tap('#tab-box');
  await mp.waitForTimeout(200);
  const fit = await mp.evaluate(() => {
    const d = document.getElementById('desk').getBoundingClientRect();
    return { w: d.width, h: d.height, right: d.right, bottom: d.bottom, vw: innerWidth, vh: innerHeight, over: document.documentElement.scrollWidth - innerWidth };
  });
  check(fit.w > 300 && fit.right <= fit.vw && fit.bottom <= fit.vh && fit.over <= 0, `the box fits the phone screen (${Math.round(fit.w)}x${Math.round(fit.h)})`);
  await mp.screenshot({ path: OUT + '/t05-phone-box.png' });
  { const p = await spot(mp, 'family-photo'); await mp.touchscreen.tap(p.x, p.y); }
  await mp.waitForSelector('#reader:not([hidden])');
  check((await mp.textContent('#reader-title')) === 'Family photo', 'a tap picks a thing up on a phone');
  await mp.screenshot({ path: OUT + '/t06-phone-hand.png' });
  await mp.tap('#reader .reader__x');
  { const p = await spot(mp, 'kete'); await mp.touchscreen.tap(p.x, p.y); }
  await mp.waitForSelector('#reader:not([hidden])');
  await mp.screenshot({ path: OUT + '/t10-phone-kete.png' });
  { const r = await mp.$eval('#hand', h => { const b = h.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }); await mp.touchscreen.tap(r.x, r.y); }
  check((await mp.textContent('#reader-title')) === 'Kete' && await mp.$eval('#reader-view', v => v.classList.contains('is-zoomed')), 'on a phone, tapping the kete in hand looks closer, the dog tags stay inside');
  await mp.tap('#reader-reach');
  check((await mp.textContent('#reader-title')) === 'Dog tags', 'on a phone, Reach inside takes out the dog tags');
  const foot = await mp.evaluate(() => { const f = document.querySelector('.reader__foot').getBoundingClientRect(); return { right: f.right, bottom: f.bottom, vw: innerWidth, vh: innerHeight }; });
  check(foot.right <= foot.vw && foot.bottom <= foot.vh, 'the reader’s buttons fit the phone screen');
  await mp.waitForFunction(() => document.querySelector('#hand img').complete);
  await mp.screenshot({ path: OUT + '/t11-phone-tags.png' });
  await m.close();

  check(errors.length === 0, 'no page errors or failed requests' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
})();
