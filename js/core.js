// Gemeinsame Bausteine für alle Bildschirme.
import { h, icon, fmtDate, daysUntil, todayISO } from './util.js';
import { CAT_BY_ID, TYPE_BY_ID, TYPES, UNKNOWN_ID } from './catalog.js';
import { statutoryDeadline, retentionEnd } from './classify.js';
import * as store from './store.js';
import { t, tr, pair, lang } from './i18n.js';

export const isInbox = d => d.status === 'inbox';
export const typeOf = d => TYPE_BY_ID[d.type] || TYPE_BY_ID[UNKNOWN_ID];

/** Name mit optionaler Zweitsprache: <span>Steuern<span class="lang2"> · Налоги</span></span> */
export function nameEl(arr) {
  const { a, b } = pair(arr);
  return h('span', {}, a, b && h('span.lang2', {}, ' · ' + b));
}

export function catIcon(catId, cls = '') {
  const c = CAT_BY_ID[catId];
  return h('div.ico' + (cls ? '.' + cls : ''), { style: { background: c?.c || '#8e8e93' } }, icon(c?.ic || 'archive'));
}
export function typeIcon(type, cls = '') {
  const c = CAT_BY_ID[type.cat];
  return h('div.ico' + (cls ? '.' + cls : ''), { style: { background: c?.c || '#8e8e93' } }, icon(type.ic || c?.ic || 'file'));
}

export function whenText(days) {
  if (days == null) return '';
  if (days < 0) return t('overdue', -days);
  if (days === 0) return t('today');
  if (days === 1) return t('tomorrow');
  return t('in_days', days);
}

/**
 * Wichtigster offener Termin eines Dokuments:
 * {date, days, kind:'deadline'|'expiry'|'statutory', label}
 */
export function alertOf(d) {
  if (d.done || d.status === 'inbox') return null;
  const type = typeOf(d);
  const out = [];
  if (d.deadline?.date) out.push({ date: d.deadline.date, kind: 'deadline' });
  if (d.expiry && type.exp) out.push({ date: d.expiry, kind: 'expiry' });
  const st = statutoryDeadline(type, d.docDate);
  if (st && st.date !== d.deadline?.date) out.push({ date: st.date, kind: 'statutory', what: st.kind });
  const now = out
    .map(o => ({ ...o, days: daysUntil(o.date) }))
    .filter(o => o.kind === 'expiry' ? o.days <= 240 && o.days >= -60 : o.kind === 'statutory' ? o.days >= -1 && o.days <= 60 : o.days <= 90 && o.days >= -45)
    .sort((a, b) => a.days - b.days);
  return now[0] || null;
}

export function alertLabel(a) {
  if (!a) return '';
  if (a.kind === 'expiry') return t('expires');
  if (a.kind === 'statutory') return t('stat_' + (a.what || 'frist'));
  return t('deadline');
}
export function alertColor(a) {
  if (!a) return '';
  return a.days < 0 ? 'red' : a.days <= 14 ? 'orange' : 'blue';
}

export function docDisplayDate(d) { return fmtDate(d.docDate || (d.added ? new Date(d.added).toISOString().slice(0, 10) : ''), lang(), {}); }

export function thumbEl(d) {
  const style = d.thumb ? { backgroundImage: `url(${d.thumb})` } : {};
  const ic = d.kind === 'pdf' ? 'file-text' : d.kind === 'image' ? 'image' : d.kind === 'docx' ? 'file-text' : 'file';
  return h('div.thumb', { style }, !d.thumb && icon(ic));
}

export function docRow(d, onclick, opts = {}) {
  const type = typeOf(d);
  const a = alertOf(d);
  const [tn1] = [pair(type.n).a];
  return h('button.row.has-thumb', { onclick },
    thumbEl(d),
    h('div.grow', {},
      h('div.t1', {}, d.title || d.name),
      h('div.t2', {}, [docDisplayDate(d), opts.showType !== false && type.id !== UNKNOWN_ID ? tn1 : '', opts.person ? personName(d) : ''].filter(Boolean).join(' · ')),
      a && h('div', { style: { marginTop: '4px' } }, h('span.pill.' + alertColor(a), {}, icon('clock'), alertLabel(a) + ' · ' + whenText(a.days)))),
    h('div.val', {}, icon('chev-r', 'chev')));
}

export function personName(d) {
  const p = store.getSettings().persons.find(x => x.id === d.person);
  return p?.name || '';
}

/** Statistik pro Typ/Kategorie (nur einsortierte Dokumente). */
export function stats(docs) {
  const byType = new Map(), byCat = new Map();
  let inbox = 0;
  for (const d of docs) {
    if (isInbox(d)) { inbox++; continue; }
    byType.set(d.type, (byType.get(d.type) || 0) + 1);
    byCat.set(d.cat, (byCat.get(d.cat) || 0) + 1);
  }
  return { byType, byCat, inbox };
}

export function sectionHeader(text, right) {
  return h('div.sec-h', {}, h('span', {}, text), right || '');
}

export function listRow({ ico, title, sub, value, onclick, chev = true, cls = '', wrap = false, right }) {
  const tag = onclick ? 'button' : 'div';
  return h(tag + '.row' + (ico ? '.has-ico' : '') + (cls ? '.' + cls.split(' ').join('.') : ''), { onclick },
    ico, h('div.grow', {}, h('div.t1' + (wrap ? '.wrap' : ''), {}, title), sub && h('div.t2' + (wrap ? '.wrap' : ''), {}, sub)),
    (value != null || chev || right) && h('div.val', {}, value, right, onclick && chev ? icon('chev-r', 'chev') : null));
}

export function switchEl(checked, onchange) {
  return h('label.switch', {}, h('input', { type: 'checkbox', checked, onchange: e => onchange(e.target.checked) }), h('i'));
}

export function emptyState(ic, title, text, action) {
  return h('div.empty', {}, icon(ic), h('div', { style: { fontWeight: 600, color: 'var(--label)', marginBottom: '6px', fontSize: '17px' } }, title), text && h('div', {}, text), action && h('div', { style: { marginTop: '16px', display: 'flex', justifyContent: 'center' } }, action));
}

export { TYPES };
