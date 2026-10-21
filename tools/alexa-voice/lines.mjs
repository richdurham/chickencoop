// Every line Alexa can say, from demo/data.js, as a JSON array on stdout.
// A hedged answer is two lines said one after the other (the hedge, then the
// answer), so hedges are listed on their own. Usage: node lines.mjs
import fs from 'node:fs';
import vm from 'node:vm';

const demo = new URL('../../demo/', import.meta.url);
const ctx = vm.createContext({});
for (const f of ['data.js', 'understand.js']) vm.runInContext(fs.readFileSync(new URL(f, demo), 'utf8'), ctx, { filename: f });
const d = vm.runInContext('({ WELCOME, EXIT, START_HINT, FALLBACKS, QA, CODES, HEDGES, UNKNOWN_ITEM, ITEMS })', ctx);

const lines = [
  ...d.WELCOME, d.EXIT, d.START_HINT, ...d.FALLBACKS,
  ...d.QA.map(q => q.a),
  ...Object.values(d.CODES).flatMap(c => [c.confirm, c.final]),
  d.HEDGES.plain,
  ...d.QA.filter(q => q.topic).map(q => d.HEDGES.topic.replace('{topic}', q.topic)),
  ...d.ITEMS.map(it => d.UNKNOWN_ITEM.replace('{name}', it.name))
];
console.log(JSON.stringify([...new Set(lines)], null, 1));
