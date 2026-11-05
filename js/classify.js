// Sortier-Engine: Dokumenttext (+ Dateiname) → Dokumenttyp, Datum, Fristen, Absender, Dateiname.
// Läuft vollständig lokal. Lernt aus Korrekturen des Nutzers (learn-Objekt).
import { TYPES, TYPE_BY_ID, UNKNOWN_ID, norm, hasTerm } from './catalog.js';

const W = { k: 6, m: 2, w: 0.7, x: -5, headBonus: 1.5, nameBonus: 2.5, repeat: 0.5, generic: 0.7 };
const HEAD_CHARS = 900;

const MONTHS = { januar: 1, jan: 1, februar: 2, feb: 2, marz: 3, maerz: 3, mar: 3, april: 4, apr: 4, mai: 5, juni: 6, jun: 6, juli: 7, jul: 7, august: 8, aug: 8, september: 9, sep: 9, sept: 9, oktober: 10, okt: 10, november: 11, nov: 11, dezember: 12, dez: 12 };

/* ───────────── Klassifikation ───────────── */

/**
 * @param {{text?:string, name?:string}} doc
 * @param {{learn?:object, minScore?:number}} [opt]
 */
export function classify(doc, opt = {}) {
  const text = norm(doc.text || '');
  const name = norm((doc.name || '').replace(/\.[a-z0-9]{2,5}$/i, ''));
  const padded = ' ' + text + ' ';
  const head = ' ' + text.slice(0, HEAD_CHARS) + ' ';
  const namePadded = ' ' + name + ' ';
  const tokens = tokenSet(text);

  const results = [];
  for (const t of TYPES) {
    if (t.id === UNKNOWN_ID) continue;
    let s = 0;
    const hits = [];
    for (const k of t._k) {
      const inText = hasTerm(padded, k);
      const inName = name && hasTerm(namePadded, k);
      if (!inText && !inName) continue;
      let v = W.k;
      if (inText && hasTerm(head, k)) v += W.headBonus;
      if (inName) v += W.nameBonus;
      if (inText) v += W.repeat * Math.min(3, countOcc(padded, k) - 1);
      s += v;
      hits.push(k.t);
    }
    for (const m of t._m) if (hasTerm(padded, m) || (name && hasTerm(namePadded, m))) s += W.m;
    for (const w of t._w || []) if (hasTerm(padded, w)) s += W.w;
    for (const x of t._x || []) if (hasTerm(padded, x)) s += W.x;
    if (s > 0 && t.gen) s *= W.generic;
    if (opt.learn) s += learnedBonus(opt.learn, t.id, tokens, name);
    if (s > 0) results.push({ id: t.id, score: round(s), hits: hits.slice(0, 6) });
  }
  results.sort((a, b) => b.score - a.score);

  const top = results[0];
  const second = results[1];
  const minScore = opt.minScore ?? 6;
  if (!top || top.score < minScore) {
    return { id: UNKNOWN_ID, confidence: 0, score: top?.score || 0, candidates: results.slice(0, 4), reason: [] };
  }
  const strength = 1 - Math.exp(-top.score / 12);
  const dominance = second ? (top.score - second.score) / top.score : 1;
  const confidence = round(strength * (0.45 + 0.55 * dominance));
  return { id: top.id, confidence, score: top.score, candidates: results.slice(0, 4), reason: top.hits };
}

function countOcc(padded, term) {
  let n = 0, i = -1;
  const needle = term.whole ? ' ' + term.t + ' ' : term.t;
  while ((i = padded.indexOf(needle, i + 1)) !== -1 && n < 5) n++;
  return n;
}
const round = v => Math.round(v * 100) / 100;

/* ───────────── Lernen aus Korrekturen ───────────── */

const STOP = new Set('der die das und oder mit fur von dem den des ein eine einen einem eines nicht sie ihr ihre ihrem ihren ihnen wir sind ist wird werden wurde haben hat auch bei nach beim vom zum zur auf aus uber unter bis wie wenn dass sich sein seine als nur noch dann diese dieser dieses bitte sehr geehrte geehrter damen herren grussen freundlichen mfg datum seite page the and for you your this that with from have been will'.split(' '));

export function tokenSet(normText, max = 400) {
  const out = new Set();
  for (const w of normText.split(' ')) {
    if (w.length < 5 || w.length > 28 || STOP.has(w) || /^\d+$/.test(w)) continue;
    out.add(w);
    if (out.size >= max) break;
  }
  return out;
}

export function emptyLearn() { return { v: 1, types: {}, names: {} }; }

/** Merkt sich, dass dieses Dokument zu `typeId` gehört (nach manueller Korrektur/Bestätigung). */
export function learn(learnObj, doc, typeId) {
  const L = learnObj || emptyLearn();
  const text = norm(doc.text || '');
  const toks = [...tokenSet(text, 120)];
  const bucket = (L.types[typeId] ||= { n: 0, t: {} });
  bucket.n++;
  for (const w of toks) bucket.t[w] = Math.min(9, (bucket.t[w] || 0) + 1);
  // Absender-/Namensmuster: erstes „Wort-Paar“ des Dateinamens ohne Ziffern
  const nm = nameKey(doc.name);
  if (nm) L.names[nm] = typeId;
  // Datenmenge begrenzen
  for (const tid of Object.keys(L.types)) {
    const b = L.types[tid];
    const keys = Object.keys(b.t);
    if (keys.length > 1500) {
      keys.sort((a, c) => b.t[c] - b.t[a]);
      b.t = Object.fromEntries(keys.slice(0, 1000).map(k => [k, b.t[k]]));
    }
  }
  return L;
}

function nameKey(name) {
  const n = norm((name || '').replace(/\.[a-z0-9]{2,5}$/i, '')).replace(/\d+/g, ' ').replace(/\s+/g, ' ').trim();
  return n.length >= 5 ? n.slice(0, 40) : '';
}

function learnedBonus(L, typeId, tokens, name) {
  let bonus = 0;
  const nk = nameKey(name);
  if (nk && L.names[nk] === typeId) bonus += 6;
  const b = L.types[typeId];
  if (b) {
    let overlap = 0;
    for (const w of tokens) { const c = b.t[w]; if (c) overlap += Math.min(c, 3) * 0.35; }
    bonus += Math.min(12, overlap);
  }
  return bonus;
}

/* ───────────── Datumserkennung ───────────── */

const D_NUM = /(?<!\d)(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4}|\d{2})(?!\d)/g;
const D_ISO = /(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/g;
const D_TXT = /(?<!\d)(\d{1,2})\s*\.?\s*(januar|februar|märz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember|jan|feb|mär|mar|apr|jun|jul|aug|sept?|okt|nov|dez)\.?\s+(\d{4})(?!\d)/gi;

function mk(y, m, d) {
  if (y < 100) y += y > 70 ? 1900 : 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null;
  return dt;
}
export const iso = dt => dt.toISOString().slice(0, 10);

export function findDates(text) {
  const out = [];
  const push = (dt, index, len) => { if (dt) out.push({ date: dt, index, len }); };
  for (const m of text.matchAll(D_NUM)) push(mk(+m[3], +m[2], +m[1]), m.index, m[0].length);
  for (const m of text.matchAll(D_ISO)) push(mk(+m[1], +m[2], +m[3]), m.index, m[0].length);
  for (const m of text.matchAll(D_TXT)) {
    const key = m[2].toLowerCase().replace('ä', 'a').replace('ä', 'a');
    const mon = MONTHS[key] || MONTHS[m[2].toLowerCase()];
    push(mon ? mk(+m[3], mon, +m[1]) : null, m.index, m[0].length);
  }
  return out.sort((a, b) => a.index - b.index);
}

const NOW_YEAR = () => new Date().getUTCFullYear();

/**
 * Datum, Frist und Ablauf bestimmen.
 * @returns {{docDate:string|null, deadline:{date:string,why:string}|null, expiry:string|null}}
 */
export function extractDates(text, fileDate) {
  const t = String(text || '');
  const all = findDates(t).filter(d => d.date.getUTCFullYear() >= 1950 && d.date.getUTCFullYear() <= NOW_YEAR() + 30);
  let docDate = null;
  const before = d => t.slice(Math.max(0, d.index - 28), d.index).toLowerCase();
  // Daten, die erkennbar Frist/Ablauf sind ("bis zum …", "fällig am …"), sind nie das Dokumentdatum.
  const dueCtx = d => /(\bbis(\s+(spätestens|zum|zu|am))*|spätestens|fällig(\s+(am|bis))?|frist(\s+endet)?(\s+am)?|zahlbar\s+bis|gültig\s+bis|gueltig\s+bis|ablaufdatum|läuft\s+ab(\s+am)?|valid\s+until|expir\w*)\W*(den\s+)?$/.test(before(d));
  const head = all.filter(d => d.index < 2500 && !dueCtx(d));
  const pref = head.find(d => /(datum|ausgestellt|ausstellungsdatum|bescheid vom|vom|den|, den|date|ort, datum|erstellt am|rechnungsdatum|zustellung)\W*$/.test(before(d)));
  const cand = pref || head.find(d => d.date.getUTCFullYear() <= NOW_YEAR() + 1);
  if (cand) docDate = iso(cand.date);
  else if (fileDate) docDate = iso(new Date(fileDate));

  // Ablaufdatum
  let expiry = null;
  const exp = t.match(/(?:gültig\s+bis|gueltig\s+bis|ablaufdatum|läuft\s+ab\s+am|date\s+of\s+expiry|valid\s+until|gültigkeitsdauer\s+bis)\D{0,12}(\d{1,2}\s*\.\s*\d{1,2}\s*\.\s*\d{2,4})/i);
  if (exp) { const dd = findDates(exp[1])[0]; if (dd) expiry = iso(dd.date); }

  // Frist im Text
  let deadline = null;
  const dl = t.match(/(?:(?<!gültig\s)(?<!gueltig\s)(?<!befristet\s)bis\s+(?:spätestens\s+)?(?:zum|zu|am)?|spätestens\s+(?:bis\s+)?(?:zum|am)?|frist(?:\s+endet)?(?:\s+am)?|fällig\s+(?:am|bis)|zahlbar\s+bis|zahlen\s+sie\s+bis|bis\s+zum)\s*(?:den\s+)?(\d{1,2}\s*\.\s*\d{1,2}\s*\.\s*\d{2,4}|\d{1,2}\s*\.?\s*(?:januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)\s+\d{4})/i);
  if (dl) {
    const dd = findDates(dl[1])[0];
    if (dd && (!docDate || iso(dd.date) >= docDate) && iso(dd.date) !== expiry) deadline = { date: iso(dd.date), why: 'text' };
  }
  if (!deadline) {
    const rel = t.match(/innerhalb\s+(?:von\s+)?(\d{1,2})\s*(tagen|wochen|monaten|monat|woche|werktagen)/i);
    if (rel && docDate) {
      const n = +rel[1];
      const unit = rel[2].toLowerCase();
      const base = new Date(docDate + 'T00:00:00Z');
      if (unit.startsWith('tag') || unit.startsWith('werk')) base.setUTCDate(base.getUTCDate() + n);
      else if (unit.startsWith('woche')) base.setUTCDate(base.getUTCDate() + 7 * n);
      else base.setUTCMonth(base.getUTCMonth() + n);
      deadline = { date: iso(base), why: 'relative' };
    }
  }
  return { docDate, deadline, expiry };
}

/** Gesetzliche Standardfrist (z. B. Einspruch: 1 Monat + 3 Tage Bekanntgabe) aus Typ + Dokumentdatum. */
export function statutoryDeadline(type, docDateISO) {
  if (!type?.fr || !docDateISO) return null;
  const f = type.fr;
  const d = new Date(docDateISO + 'T00:00:00Z');
  if (f.bk) d.setUTCDate(d.getUTCDate() + 3);
  if (f.m) d.setUTCMonth(d.getUTCMonth() + f.m);
  if (f.d) d.setUTCDate(d.getUTCDate() + f.d);
  return { date: iso(d), kind: f.k, estimated: true };
}

/** Aufbewahrungsende (Ende des Kalenderjahres + N Jahre) oder null bei dauerhaft/Vertragsbezug. */
export function retentionEnd(type, docDateISO) {
  if (!type || typeof type.keep !== 'number' || !docDateISO) return null;
  if (type.keep === 0) return null;
  const y = +docDateISO.slice(0, 4) + type.keep;
  return `${y}-12-31`;
}

/* ───────────── Absender & Titel ───────────── */

const ORG = /\b(finanzamt|amtsgericht|landgericht|arbeitsgericht|sozialgericht|jobcenter|agentur für arbeit|arbeitsagentur|familienkasse|ausländerbehörde|bürgeramt|stadtverwaltung|gemeinde|landratsamt|standesamt|krankenkasse|rentenversicherung|[a-zäöüß\-]+kasse|[a-zäöüß\-]+bank|sparkasse|volksbank|stadtwerke|hausverwaltung|versicherung|versicherungen|[a-zäöüß\-]+ gmbh|[a-zäöüß\-]+ ag|[a-zäöüß\-]+ kg|[a-zäöüß\-]+ e\.v\.|[a-zäöüß\-]+ ug)\b/i;

export function guessSender(text) {
  const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 25);
  for (const l of lines) {
    if (l.length < 4 || l.length > 70) continue;
    if (ORG.test(l) && !/^(sehr geehrte|betreff|ihr zeichen)/i.test(l)) {
      return l.replace(/\s{2,}/g, ' ').replace(/[|•·].*$/, '').trim().slice(0, 48);
    }
  }
  return '';
}

export function guessSubject(text) {
  const m = String(text || '').match(/(?:betreff|betr\.|subject)\s*[:\-]?\s*(.{6,90})/i);
  return m ? m[1].replace(/\s{2,}/g, ' ').trim() : '';
}

/** Dateiname-Vorschlag: „2026-03-14 Steuerbescheid 2025 – Finanzamt Oelde.pdf“ */
export function suggestName({ typeName, docDate, sender, subject, original }) {
  const ext = (original || '').match(/\.[a-z0-9]{2,5}$/i)?.[0]?.toLowerCase() || '';
  const clean = s => String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  const parts = [docDate || '', clean(typeName)];
  const tail = clean(sender) || clean(subject).slice(0, 36);
  let n = parts.filter(Boolean).join(' ');
  if (tail) n += ' – ' + tail;
  return n.slice(0, 96) + ext;
}

/** Ein Aufruf für die komplette Analyse. */
export function analyse({ text, name, fileDate }, opt = {}) {
  const c = classify({ text, name }, opt);
  const type = TYPE_BY_ID[c.id];
  const dates = extractDates(text, fileDate);
  const sender = guessSender(text);
  const subject = guessSubject(text);
  return {
    ...c,
    type,
    ...dates,
    sender,
    subject,
    statutory: statutoryDeadline(type, dates.docDate),
  };
}
