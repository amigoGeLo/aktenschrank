import fs from 'fs';
// stub browser globals needed by i18n/store imports
Object.defineProperty(globalThis,'navigator',{value:{languages:['de']},configurable:true});
globalThis.document = { documentElement: {} };
globalThis.indexedDB = {};
globalThis.localStorage = { getItem: () => null, setItem() {} };
const { STRINGS } = await import('../js/i18n.js');
const files = ['screens','settings','flows','core','ui'].map(f => `js/${f}.js`);
const used = new Set();
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bt\(\s*'([a-z0-9_+]+)'/g)) used.add(m[1]);
  for (const m of src.matchAll(/\bt\(\s*`([a-z0-9_]+)\$\{/g)) used.add('PREFIX:' + m[1]);
  for (const m of src.matchAll(/\bt\(\s*'([a-z_]+)'\s*\+/g)) used.add('PREFIX:' + m[1]);
}
const missing = [], prefixes = [];
for (const k of used) {
  if (k.startsWith('PREFIX:')) { prefixes.push(k.slice(7)); continue; }
  if (!STRINGS[k]) missing.push(k);
}
console.log('missing keys:', missing.join(', ') || 'none');
console.log('dynamic prefixes:', prefixes.join(', '));
const bad = Object.entries(STRINGS).filter(([k, v]) => !Array.isArray(v) || v.length !== 3 || v.some(x => !x));
console.log('malformed entries:', bad.map(b => b[0]).join(', ') || 'none');
console.log('total strings', Object.keys(STRINGS).length);
