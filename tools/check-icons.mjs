import { CATS } from '../data/cats.js';
import { TYPES_1 } from '../data/types-1.js'; import { TYPES_2 } from '../data/types-2.js'; import { TYPES_3 } from '../data/types-3.js';
import { TYPES_4 } from '../data/types-4.js'; import { TYPES_5 } from '../data/types-5.js'; import { TYPES_6 } from '../data/types-6.js';
import { ICON_NAMES } from '../js/icons.js';
const have = new Set(ICON_NAMES);
const need = new Set([...CATS.map(c => c.ic), ...[...TYPES_1, ...TYPES_2, ...TYPES_3, ...TYPES_4, ...TYPES_5, ...TYPES_6].map(t => t.ic)]);
const miss = [...need].filter(n => !have.has(n));
console.log('icons needed:', need.size, 'missing:', miss.join(', ') || 'none');
