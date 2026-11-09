// node tests/gate.test.mjs – Installations-Sperre: Entscheidung + vollständige Texte in allen drei Sprachen
import assert from 'assert';
Object.defineProperty(globalThis, 'navigator', { value: { languages: ['de'] }, configurable: true });
globalThis.document = { documentElement: {} };
globalThis.indexedDB = {};
globalThis.localStorage = { getItem: () => null, setItem() {} };
const { gateNeeded } = await import('../js/install-gate.js');
const { STRINGS } = await import('../js/i18n.js');

const base = { ios: true, standalone: false, native: false, search: '' };
assert.equal(gateNeeded(base), true, 'iPhone im Browser → Sperre');
assert.equal(gateNeeded({ ...base, standalone: true }), false, 'installierte App → keine Sperre');
assert.equal(gateNeeded({ ...base, native: true }), false, 'native iOS-Hülle → keine Sperre');
assert.equal(gateNeeded({ ...base, ios: false }), false, 'Computer/Android → keine Sperre');
assert.equal(gateNeeded({ ...base, search: '?browser=1' }), false, 'Entwickler-Ausnahme');
assert.equal(gateNeeded({ ...base, search: '?x=1&browser=1' }), false, 'Entwickler-Ausnahme mit weiteren Parametern');
assert.equal(gateNeeded({ ...base, search: '?browser=10' }), true, 'nur exakt browser=1');
assert.equal(gateNeeded({ ...base, search: '?mybrowser=1' }), true, 'nur exakt browser=1 (Präfix)');

for (const k of ['gate_title', 'gate_lead', 'gate_s1', 'gate_s2', 'gate_s3', 'gate_copy', 'gate_copied', 'ai_enable_q', 'ai_enable_t', 'ai_enable_ok']) {
  const v = STRINGS[k];
  assert.ok(Array.isArray(v) && v.length === 3 && v.every(x => typeof x === 'string' && x.trim()), `${k}: [de, ru, en] fehlt oder leer`);
  assert.equal(new Set(v).size, 3, `${k}: Sprachen sollten sich unterscheiden`);
}
console.log('gate tests ok');
