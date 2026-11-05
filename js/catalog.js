// Katalog: führt alle Dokumenttypen zusammen und bereitet den Suchindex vor.
import { CATS, CAT_BY_ID } from '../data/cats.js';
import { TYPES_1 } from '../data/types-1.js';
import { TYPES_2 } from '../data/types-2.js';
import { TYPES_3 } from '../data/types-3.js';
import { TYPES_4 } from '../data/types-4.js';
import { TYPES_5 } from '../data/types-5.js';
import { TYPES_6 } from '../data/types-6.js';

export { CATS, CAT_BY_ID };

/** Text vereinheitlichen: klein, ohne Akzente/Umlaute, nur Buchstaben/Ziffern/§, einfache Leerzeichen. */
export function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}§]+/gu, ' ')
    .trim();
}

export const TYPES = [...TYPES_1, ...TYPES_2, ...TYPES_3, ...TYPES_4, ...TYPES_5, ...TYPES_6];
export const TYPE_BY_ID = Object.fromEntries(TYPES.map(t => [t.id, t]));
export const UNKNOWN_ID = 'unklar';

/** Begriffe vorbereiten. Kurze Begriffe (<8 Zeichen) nur als ganzes Wort, längere auch als Wortteil (Komposita). */
function prep(list) {
  const seen = new Set();
  const out = [];
  for (const raw of list || []) {
    const t = norm(raw);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push({ t, whole: t.length < 8 && !t.includes(' ') });
  }
  return out;
}

for (const t of TYPES) {
  t._k = prep(t.k);
  t._m = prep(t.m);
  t._w = prep(t.w);
  t._x = prep(t.x);
  t._nameNorm = t.n.map(norm);
}

export const typesOfCat = id => TYPES.filter(t => t.cat === id && t.id !== UNKNOWN_ID);

export function hasTerm(padded, term) {
  return term.whole ? padded.includes(' ' + term.t + ' ') : padded.includes(term.t);
}

/** Aufbewahrungsfrist in Jahren (Zahl) oder Text-Schlüssel. */
export function retentionOf(type) {
  return type.keep;
}
