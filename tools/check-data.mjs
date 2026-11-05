import { CATS } from '../data/cats.js';
import { TYPES_1 } from '../data/types-1.js';
import { TYPES_2 } from '../data/types-2.js';
import { TYPES_3 } from '../data/types-3.js';
import { TYPES_4 } from '../data/types-4.js';
import { TYPES_5 } from '../data/types-5.js';
import { TYPES_6 } from '../data/types-6.js';
const all = [...TYPES_1, ...TYPES_2, ...TYPES_3, ...TYPES_4, ...TYPES_5, ...TYPES_6];
const cats = new Set(CATS.map(c => c.id));
const ids = new Set();
let bad = 0;
for (const t of all) {
  if (ids.has(t.id)) { console.log('DUP id', t.id); bad++; }
  ids.add(t.id);
  if (!cats.has(t.cat)) { console.log('UNKNOWN cat', t.id, t.cat); bad++; }
  for (const f of ['n', 'what']) if (!Array.isArray(t[f]) || t[f].length !== 3) { console.log('BAD', f, t.id); bad++; }
  if (!Array.isArray(t.todo) || t.todo.length !== 3) { console.log('BAD todo', t.id); bad++; }
  else if (new Set(t.todo.map(x => x.length)).size !== 1) console.log('note: todo length differs', t.id, t.todo.map(x => x.length));
  if (t.id !== 'unklar' && (!t.k || !t.k.length)) { console.log('NO keywords', t.id); bad++; }
}
const per = {};
for (const t of all) per[t.cat] = (per[t.cat] || 0) + 1;
console.log('types:', all.length, 'bad:', bad);
console.log(CATS.map(c => c.id + ':' + (per[c.id] || 0)).join('  '));
