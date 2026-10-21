// Accuracy of the game's real matcher (demo/understand.js + demo/data.js) on held-out questions.
// Usage: node eval.mjs <demo-dir> <models-dir> <transformers-module> <questions.json> [answer hedge item boost]
// e.g. node tools/tests/accuracy/eval.mjs demo demo/model/ <node_modules>/@huggingface/transformers/dist/transformers.node.mjs tools/tests/accuracy/questions-1.json
import fs from 'node:fs';
import vm from 'node:vm';
const [, , DEMO, MODELS, LIB, TESTS, ...bands] = process.argv;

const ctx = vm.createContext({});
for (const f of ['data.js', 'understand.js']) vm.runInContext(fs.readFileSync(`${DEMO}/${f}`, 'utf8'), ctx, { filename: f });
const U = ctx.Understand;
if (bands.length) Object.assign(U.BANDS, { answer: +bands[0], hedge: +bands[1], item: +bands[2], boost: +bands[3] });

const { pipeline, env } = await import(LIB);
env.localModelPath = MODELS; env.allowRemoteModels = false;
const embed = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'q8' });
const vec = async s => Array.from((await embed(s, { pooling: 'mean', normalize: true })).data);
const texts = U.anchorTexts();
const index = U.buildIndex(await Promise.all(texts.map(vec)));

// Tests file: [[question, expected, contextItem|null, group], ...]. Expected: answer id(s), 'unknown:<item>', or null (must not answer).
const T = JSON.parse(fs.readFileSync(TESTS, 'utf8'));

function grade(r, want) {
  const said = r.kind === 'answer' || r.kind === 'hedge' ? r.entry.id : r.kind === 'unknown-item' ? 'unknown:' + r.item.id : 'fallback';
  if (want === null) return { said, verdict: r.kind === 'answer' ? 'WRONG' : r.kind === 'hedge' ? 'wrong (hedged)' : 'ok' };
  const ok = [].concat(want).includes(said);
  if (ok) return { said, verdict: r.kind === 'hedge' ? 'ok (hedged)' : 'ok' };
  if (said === 'fallback' || said.startsWith('unknown:')) return { said, verdict: 'missed' };
  return { said, verdict: r.kind === 'answer' ? 'WRONG' : 'wrong (hedged)' };
}

const methods = {
  'words only': async q => U.byKeywords(q[0]),
  'model, no item step': async q => U.byMeaning(await vec(q[0]), index, q[0], { items: false, contextItem: q[2] }),
  'model + item step': async q => U.byMeaning(await vec(q[0]), index, q[0], { contextItem: q[2] })
};
const groups = {};
T.forEach((t, i) => { const g = t[3]; groups[g] = groups[g] || [i, i]; groups[g][1] = i + 1; });
const summary = {};
for (const [name, run] of Object.entries(methods)) {
  const rows = [];
  for (const q of T) { const r = await run(q); rows.push({ q, r, ...grade(r, q[1]) }); }
  summary[name] = rows;
}

const detail = summary['model + item step'];
console.log(`bands ${JSON.stringify(U.BANDS)}\n`);
for (const row of detail) {
  const s = row.r.score !== undefined ? row.r.score.toFixed(2) : '  - ';
  const it = row.r.item ? ` [item ${row.r.item.id} ${row.r.itemScore.toFixed(2)}]` : '';
  const flag = row.verdict.startsWith('ok') ? '   ' : '>> ';
  console.log(`${flag}${s} ${row.verdict.padEnd(15)} ${(row.q[2] ? '(' + row.q[2] + ') ' : '') + row.q[0]}`.padEnd(80) + ` -> ${row.said}${it}`);
}
console.log('\n' + 'method'.padEnd(22) + Object.keys(groups).map(g => g.padEnd(9)).join('') + '  total   confidently wrong');
for (const [name, rows] of Object.entries(summary)) {
  const okIn = ([a, b]) => rows.slice(a, b).filter(r => r.verdict.startsWith('ok')).length + '/' + (b - a);
  const total = rows.filter(r => r.verdict.startsWith('ok')).length;
  console.log(name.padEnd(22) + Object.values(groups).map(g => okIn(g).padEnd(9)).join('') + `  ${total}/${T.length}   ${rows.filter(r => r.verdict === 'WRONG').length}`);
}
console.log('\nA natural, B describes an item, C points at the item just seen, D off-topic');
