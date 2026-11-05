import { SAMPLES } from './samples.mjs';
import { classify, extractDates, statutoryDeadline } from '../js/classify.js';
import { TYPE_BY_ID } from '../js/catalog.js';
let ok = 0, fail = 0;
for (const s of SAMPLES) {
  const r = classify(s);
  const good = r.id === s.expect;
  good ? ok++ : fail++;
  if (!good) console.log(`✗ ${s.name.padEnd(26)} erwartet ${s.expect.padEnd(22)} bekam ${r.id.padEnd(22)} (${r.score}, conf ${r.confidence}) Kandidaten: ${r.candidates.map(c => c.id + ':' + c.score).join(', ')}`);
}
console.log(`\nKlassifikation: ${ok}/${SAMPLES.length} richtig, ${fail} falsch`);
const confs = SAMPLES.map(s => ({ s, r: classify(s) }));
const low = confs.filter(x => x.r.id === x.s.expect && x.r.confidence < 0.55);
console.log('richtig, aber Konfidenz < 0.55 :', low.map(x => `${x.s.name}(${x.r.confidence})`).join(', ') || '–');
const wrongHigh = confs.filter(x => x.r.id !== x.s.expect && x.r.confidence >= 0.55);
console.log('FALSCH mit Konfidenz ≥ 0.55     :', wrongHigh.map(x => `${x.s.name}→${x.r.id}(${x.r.confidence})`).join(', ') || '–');

// Datumstests
const d1 = extractDates('Finanzamt Oelde\nDatum: 12.03.2026\nbitte zahlen Sie bis zum 14.04.2026', null);
console.log('\nDaten 1:', JSON.stringify(d1));
const d2 = extractDates('Köln, den 5. Oktober 2026\nBitte antworten Sie innerhalb von 2 Wochen.\nGültig bis 14.03.2028', null);
console.log('Daten 2:', JSON.stringify(d2));
console.log('Frist Steuerbescheid 12.03.2026:', JSON.stringify(statutoryDeadline(TYPE_BY_ID['steuerbescheid'], '2026-03-12')));
