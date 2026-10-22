// Alexa's answers in plain language: the sentence model, hedges, unknown items, codes, and word matching without the model.
// Usage: node tools/tests/answers.js <screenshot-dir> [site address, default http://127.0.0.1:8765/demo/]
// Serve the repo first: python3 -m http.server 8765 --bind 127.0.0.1 (from the repo's root).
const { chromium } = require('playwright');
const OUT = process.argv[2];
const URL = process.argv[3] || 'http://127.0.0.1:8765/demo/';
async function spot(page, id) {
  return page.evaluate(id => {
    const el = document.querySelector('.thing[data-item="' + id + '"]');
    const r = el.getBoundingClientRect();
    for (let fy = 0.5; fy < 1; fy += 0.05) for (const sy of [1, -1]) for (let fx = 0.5; fx < 1; fx += 0.05) for (const sx of [1, -1]) {
      const x = r.left + r.width * (0.5 + sx * (fx - 0.5)), y = r.top + r.height * (0.5 + sy * (fy - 0.5));
      const hit = document.elementFromPoint(x, y);
      if (hit && hit.closest('.thing') === el) return { x, y };
    }
    return null;
  }, id);
}


function check(cond, msg) {
  console.log((cond ? 'PASS ' : 'FAIL ') + msg);
  if (!cond) process.exitCode = 1;
}

async function say(page, text) {
  const before = await page.$$eval('.msg--her', els => els.length);
  await page.fill('#ask-input', text);
  await page.press('#ask-input', 'Enter');
  await page.waitForFunction(n => document.querySelectorAll('.msg--her').length > n, before, { timeout: 30000 });
  return page.$$eval('.msg--her', els => els[els.length - 1].textContent);
}

async function enter(page) {
  await page.fill('#intro-input', 'Alexa, open the chicken coop');
  await page.click('#intro-form button[type="submit"]');
  await page.waitForSelector('#game:not([hidden])');
  await page.waitForFunction(() => document.querySelectorAll('.msg--her').length >= 3);
}

// Record when the model is ready, before any page script runs.
const READY = () => { window.addEventListener('chickencoop:meaning-ready', () => { window.__ready = performance.now(); }); };

(async () => {
  const browser = await chromium.launch();
  const errors = [];

  // ---------- With the model ----------
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }); await ctx.addInitScript(() => { try { localStorage.setItem('chickencoop-setup', 'text'); } catch (e) {} }); // the first-visit choice was made
  await ctx.addInitScript(READY);
  const page = await ctx.newPage();
  const logs = [];
  const bytes = {};
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => logs.push(m.text()));
  page.on('requestfinished', async q => {
    const name = q.url().split('/').pop();
    if (/\.(onnx|wasm)$|transformers\.min\.js$/.test(name)) {
      const sz = await q.sizes();
      bytes[name] = { size: sz.responseBodySize, from: q.url().split('/')[2] };
    }
  });
  page.on('response', r => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });

  await page.goto(URL + '?debug');
  await page.waitForLoadState('networkidle');
  check(Object.keys(bytes).length === 0, 'nothing model-related loads on the intro screen');
  const t0 = Date.now();
  await enter(page);
  await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
  const readyMs = Date.now() - t0;
  check(true, `model ready ${(readyMs / 1000).toFixed(1)}s after opening the box`);
  console.log('     downloaded:', Object.entries(bytes).map(([k, v]) => `${k} ${(v.size / 1048576).toFixed(1)} MB from ${v.from}`).join(', '));
  check(['model_quantized.onnx', 'ort-wasm-simd-threaded.wasm'].every(k => bytes[k] && bytes[k].from === URL.split('/')[2]), 'model and engine come from this site');

  let r = await say(page, "who's her husband");
  check(r.startsWith('Ken is Katie'), 'natural question by meaning: husband -> Ken');
  r = await say(page, 'could this virus kill a person');
  check(r.startsWith('I’m not sure, I don’t understand the science'), 'natural question by meaning: kill a person -> harmful');
  r = await say(page, 'why does she have euros');
  check(r.startsWith('I think maybe you’re asking about the coins? I guess they are euros'), 'middle confidence gets the topic hedge');
  r = await say(page, 'why is there a mug in the box');
  check(r.startsWith('I don’t know anything about the mug'), 'item with no scripted answer gets the unknown-item line');
  r = await say(page, 'how tall is Mount Everest');
  check(FALLBACKS_OK(r), 'off-topic falls back to a scripted box line');
  r = await say(page, 'I want to release the virus now');
  check(!r.includes('final choice') && await page.isHidden('#ending'), 'a release request without the code never ends the game');

  { const p = await spot(page, 'summer-school'); await page.mouse.click(p.x, p.y); }
  await page.waitForSelector('#reader:not([hidden])');
  await page.click('#reader .reader__x');
  r = await say(page, "who's this?");
  check(r.includes('Igor something'), 'pointing question uses the item just seen (group photo -> Igor)');

  check(logs.some(l => l.startsWith('[alexa] meaning')), '?debug logs decisions to the console');
  await page.screenshot({ path: OUT + '/s01-meaning-chat.png' });

  // Cached example meanings make the second visit faster.
  check(await page.evaluate(() => Object.keys(localStorage).some(k => k.startsWith('chickencoop-meaning-v1:'))), 'example meanings are cached in the browser');
  await page.reload();
  await page.waitForLoadState('networkidle');
  const t1 = Date.now();
  await page.click('#resume');
  await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
  console.log(`     second visit: model ready ${((Date.now() - t1) / 1000).toFixed(1)}s after resuming`);

  r = await say(page, 'Release falcon 616');
  check(r.includes('tell me to release cleansing falcon 616'), 'codes still matched word for word');
  await ctx.close();

  // ---------- Without the model (blocked download) ----------
  const bctx = await browser.newContext({ reducedMotion: 'reduce' }); await bctx.addInitScript(() => { try { localStorage.setItem('chickencoop-setup', 'text'); } catch (e) {} }); // the first-visit choice was made
  await bctx.addInitScript(READY);
  const bp = await bctx.newPage();
  const warn = [];
  bp.on('console', m => { if (m.type() === 'warning') warn.push(m.text()); });
  bp.on('pageerror', e => errors.push('blocked: ' + e));
  await bp.route('**/model_quantized.onnx', route => route.abort());
  await bp.goto(URL);
  await enter(bp);
  await bp.waitForFunction(() => document.readyState === 'complete');
  await bp.waitForTimeout(4000);
  check(!(await bp.evaluate(() => window.__ready)), 'blocked model never reports ready');
  check(warn.some(w => w.includes('matching words only')), 'blocked model logs a clear warning');
  r = await say(bp, 'who is igor?');
  check(r.startsWith('I don’t know. Igor something'), 'word matching still answers without the model');
  r = await say(bp, 'Tim?');
  check(r.startsWith('I’m not entirely sure, but… Tim?'), 'single-word match gets the plain hedge');
  await bctx.close();

  check(errors.length === 0, 'no page errors or failed requests' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
})();

function FALLBACKS_OK(t) {
  return ['I’m not sure. Maybe there’s some info in the box?', 'There is a lot of info in the box, Katie pulled it all together for me.', 'Have a look in the box.'].includes(t);
}
