/* Open the Chicken Coop — loads the sentence model so Alexa can match
   questions by meaning. Everything comes from this site: lib/ (Transformers.js
   and ONNX Runtime) and model/ (all-MiniLM-L6-v2). game.js starts it when the
   box opens and keeps matching words until 'chickencoop:meaning-ready' fires,
   or for good if this device can't run the model. */

const base = new URL('./', import.meta.url);
const CACHE = 'chickencoop-meaning-v1';
const BATCH = 16;
let started = false;
let settled = false; // ready, or given up on

async function start() {
  if (started) return;
  started = true;
  if (!('WebAssembly' in window) || (navigator.connection && navigator.connection.saveData)) { // ~33 MB is a lot on a metered connection
    settled = true;
    return;
  }

  try {
    const { pipeline, env } = await import(new URL('lib/transformers.min.js', base).href);
    env.allowRemoteModels = false;
    env.allowLocalModels = true;
    env.localModelPath = new URL('model/', base).href;
    env.backends.onnx.wasm.wasmPaths = {
      mjs: new URL('lib/ort-wasm-simd-threaded.js', base).href,
      wasm: new URL('lib/ort-wasm-simd-threaded.wasm', base).href
    };

    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'q8', device: 'wasm' });
    const embed = async text => Array.from((await extractor(text, { pooling: 'mean', normalize: true })).data);
    const index = window.Understand.buildIndex(await anchorVectors(extractor));
    settled = true;
    window.dispatchEvent(new CustomEvent('chickencoop:meaning-ready', { detail: { embed, index } }));
  } catch (e) {
    settled = true;
    console.warn('Alexa is matching words only, because the sentence model did not load:', e);
    window.dispatchEvent(new CustomEvent('chickencoop:meaning-failed'));
  }
}

/* The meaning of every example question and item description. Worked out once
   per change to data.js and kept in this browser, so later visits skip it. */
async function anchorVectors(extractor) {
  const texts = window.Understand.anchorTexts();
  const key = CACHE + ':' + fnv1a(texts.join('\n'));
  const cached = load(key, texts.length);
  if (cached) return cached;

  const out = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const t = await extractor(texts.slice(i, i + BATCH), { pooling: 'mean', normalize: true });
    const [rows, dims] = t.dims;
    for (let r = 0; r < rows; r++) out.push(Array.from(t.data.subarray(r * dims, (r + 1) * dims)));
    await new Promise(resolve => setTimeout(resolve, 0)); // let the page keep up between batches
  }
  save(key, out);
  return out;
}

function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16);
}

// Saved as base64 Float32 in localStorage; any failure just means working it out again.
function load(key, count) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
    const all = new Float32Array(bytes.buffer);
    const dims = all.length / count;
    if (!Number.isInteger(dims)) return null;
    const out = [];
    for (let r = 0; r < count; r++) out.push(Array.from(all.subarray(r * dims, (r + 1) * dims)));
    return out;
  } catch (e) { return null; }
}

function save(key, vectors) {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE + ':') && k !== key) localStorage.removeItem(k);
    }
    const all = new Float32Array(vectors.length * vectors[0].length);
    vectors.forEach((v, r) => all.set(v, r * v.length));
    const bytes = new Uint8Array(all.buffer);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    localStorage.setItem(key, btoa(bin));
  } catch (e) { /* storage full or blocked: fine */ }
}

// loading: started and not yet ready or given up on, so a question can wait a moment for it.
window.Meaning = { start, get loading() { return started && !settled; } };
if (window.MeaningWanted) start();
