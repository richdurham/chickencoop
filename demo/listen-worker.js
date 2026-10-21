/* Open the Chicken Coop — turns what the player said into text, for browsers
   that can't do it themselves. Runs Whisper (model/Xenova/whisper-tiny.en) in
   this worker so the page stays responsive. voice.js sends 'load' (with the
   game's names, to prime Whisper with them) when a player first talks, then
   'transcribe' with 16 kHz mono audio. Replies: 'progress' while the model
   downloads, 'ready', 'text', or 'error'. */

import { AutoProcessor, AutoTokenizer, WhisperForConditionalGeneration, env } from './lib/transformers.min.js';

const base = new URL('./', import.meta.url);
const MODEL = 'Xenova/whisper-tiny.en';

env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = new URL('model/', base).href;
env.backends.onnx.wasm.wasmPaths = {
  mjs: new URL('lib/ort-wasm-simd-threaded.js', base).href,
  wasm: new URL('lib/ort-wasm-simd-threaded.wasm', base).href
};

let loading = null;

/* Download progress as one fraction across the model's files. */
const files = {};
function progress(p) {
  if (p.status !== 'progress' || !p.total) return;
  files[p.file] = [p.loaded, p.total];
  let loaded = 0, total = 0;
  Object.values(files).forEach(f => { loaded += f[0]; total += f[1]; });
  postMessage({ type: 'progress', fraction: loaded / total });
}

function load(words) {
  loading ??= (async () => {
    const [processor, tokenizer, model] = await Promise.all([
      AutoProcessor.from_pretrained(MODEL, { progress_callback: progress }),
      AutoTokenizer.from_pretrained(MODEL, { progress_callback: progress }),
      WhisperForConditionalGeneration.from_pretrained(MODEL, { dtype: 'q8', device: 'wasm', progress_callback: progress })
    ]);
    // Whisper reads text before <|startoftranscript|> as what was said just before,
    // which makes it expect these spellings (Igor, Titirangi, kete...).
    const id = t => tokenizer.model.tokens_to_ids.get(t);
    const primed = words ? [id('<|startofprev|>'), ...tokenizer.encode(' ' + words, { add_special_tokens: false })] : [];
    const start = [...primed, id('<|startoftranscript|>'), id('<|notimestamps|>')];
    postMessage({ type: 'ready' });
    return { processor, tokenizer, model, start };
  })();
  return loading;
}

async function transcribe(audio) {
  const { processor, tokenizer, model, start } = await load();
  const { input_features } = await processor(audio);
  const ids = await model.generate({ inputs: input_features, decoder_input_ids: start, max_new_tokens: 64 });
  const said = Array.from(ids.tolist()[0], Number).slice(start.length);
  return tokenizer.decode(said, { skip_special_tokens: true }).trim();
}

onmessage = async e => {
  const msg = e.data;
  try {
    if (msg.type === 'load') await load(msg.words);
    else if (msg.type === 'transcribe') postMessage({ type: 'text', id: msg.id, text: await transcribe(msg.audio) });
  } catch (err) {
    loading = null; // let a later attempt try again
    postMessage({ type: 'error', id: msg.id, message: String(err && err.message || err) });
  }
};
