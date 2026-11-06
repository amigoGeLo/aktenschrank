// Hauptbildschirme: Ablage, Ordner, Dokumenttyp, Dokument, Eingang, Suche, Dokumenten-Check.
import { h, icon, fmtDate, daysUntil, todayISO, clear, debounce, bytes, isIOS, isStandalone, safeName, extOf, download } from './util.js';
import * as ui from './ui.js';
import * as store from './store.js';
import { CATS, CAT_BY_ID, TYPES, TYPE_BY_ID, typesOfCat, UNKNOWN_ID, norm } from './catalog.js';
import { statutoryDeadline, retentionEnd, analyse } from './classify.js';
import { glossaryFor } from './glossary.js';
import * as trn from './translate.js';
import { makeICS, shareOrDownload } from './export.js';
import { t, pair, lang, idx, todoPairs, langName } from './i18n.js';
import { nameEl, catIcon, typeIcon, typeOf, isInbox, alertOf, alertLabel, alertColor, whenText, docRow, thumbEl, docDisplayDate, stats, listRow, switchEl, emptyState, personName } from './core.js';
import { ingest, pickType, fileDoc, pasteSheet, setPreset, stripExt } from './flows.js';

/* ───── Navigation ───── */
export const openCat = id => ui.push(catSpec(id));
export const openType = id => ui.push(typeSpec(id));
export const openDoc = id => ui.push(docSpec(id));
export const goInbox = () => ui.switchTab('inbox');

export function addMenu(presetType = null) {
  const files = document.getElementById('in-files'), cam = document.getElementById('in-cam');
  ui.actionSheet({
    title: presetType ? pair(TYPE_BY_ID[presetType].n).a : t('add_title'),
    cancel: t('cancel'),
    items: [
      { label: t('add_files'), icon: 'files', run: () => { setPreset(presetType); files.click(); } },
      { label: t('add_photo'), icon: 'camera', run: () => { setPreset(presetType); cam.click(); } },
      { label: t('add_text'), icon: 'copy', run: () => { setPreset(presetType); pasteSheet(f => ingest(f, { presetType, goInbox })); } },
    ],
  });
}

const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const plusBtn = presetFn => ui.navBtn(icon('plus'), () => addMenu(presetFn?.()), { 'aria-label': t('add_title') });

/* ───── Ablage (Start) ───── */
export const homeSpec = () => ({
  title: () => t('app_name'),
  right: () => plusBtn(),
  render: async () => {
    const docs = await store.allDocs();
    const st = stats(docs);
    const s = store.getSettings();
    const filed = docs.filter(d => !isInbox(d));
    const nodes = [];

    if (isIOS() && !isStandalone() && lsGet('ak.hideInstall') !== '1') {
      nodes.push(h('div.banner', {},
        h('div.ico', { style: { background: '#007aff' } }, icon('apple-share')),
        h('div', {}, h('b', {}, t('install_title')), h('span', {}, t('install_text'))),
        h('button.x', { 'aria-label': t('close'), onclick: () => { lsSet('ak.hideInstall', '1'); ui.reloadAll(); } }, icon('x'))));
    }
    if (st.inbox > 0) {
      nodes.push(h('button.banner', { style: { width: 'calc(100% - 32px)', textAlign: 'left' }, onclick: goInbox },
        h('div.ico', { style: { background: '#ff9500' } }, icon('inbox')),
        h('div', {}, h('b', {}, t('inbox_banner', st.inbox)), h('span', {}, t('inbox_banner_t')))));
    }
    const last = s.lastBackup ? Math.floor((Date.now() - s.lastBackup) / 86400000) : null;
    if (docs.length >= 3 && (last === null || last > 30)) {
      nodes.push(h('button.banner', { style: { width: 'calc(100% - 32px)', textAlign: 'left' }, onclick: () => { ui.switchTab('more'); openDataFromHome(); } },
        h('div.ico', { style: { background: '#34c759' } }, icon('download')),
        h('div', {}, h('b', {}, t('backup_banner')), h('span', {}, last === null ? t('backup_never') : t('backup_ago', last)))));
    }

    nodes.push(heroEl(docs.length === 0));

    // Fristen
    const alerts = filed.map(d => ({ d, a: alertOf(d) })).filter(x => x.a).sort((x, y) => x.a.days - y.a.days).slice(0, 12);
    if (alerts.length) {
      nodes.push(h('div.sec', {}, h('div.sec-h.plain', {}, h('span', {}, t('deadlines')))),
        h('div.hscroll', {}, alerts.map(({ d, a }) => h('button.fcard', { onclick: () => openDoc(d.id) },
          h('div.when.' + alertColor(a), {}, whenText(a.days)),
          h('div.what', {}, d.title || d.name),
          h('div.why', {}, alertLabel(a) + ' · ' + fmtDate(a.date, lang()))))));
    }

    // Dokumenten-Check
    const essentials = TYPES.filter(x => x.imp === 3 && !x.gen && x.id !== UNKNOWN_ID);
    const have = essentials.filter(x => st.byType.get(x.id)).length;
    const p = essentials.length ? have / essentials.length : 0;
    nodes.push(h('div.sec', {}, h('button.group', { style: { width: 'calc(100% - 32px)', textAlign: 'left' }, onclick: () => ui.push(checkSpec()) },
      h('div.row', {}, ringEl(p, have), h('div.grow', {}, h('div.t1', {}, t('check_title')), h('div.t2.wrap', {}, t('check_sub', have, essentials.length))), icon('chev-r', 'chev')))));

    // Ordner
    nodes.push(h('div.sec', {}, h('div.sec-h.plain', {}, h('span', {}, t('folders'))),
      h('div.group', {}, CATS.filter(c => c.id !== 'sonstiges' || st.byCat.get('sonstiges')).map(c => h('button.row.has-ico', { onclick: () => openCat(c.id) },
        catIcon(c.id),
        h('div.grow', {}, h('div.t1', {}, nameEl(c.n)), h('div.t2', {}, c.ex[idx()])),
        h('div.val', {}, st.byCat.get(c.id) ? h('span.cnt', {}, st.byCat.get(c.id)) : null, icon('chev-r', 'chev')))))));

    // Zuletzt
    const recent = [...filed].sort((a, b) => b.added - a.added).slice(0, 5);
    if (recent.length) {
      nodes.push(h('div.sec', {}, h('div.sec-h.plain', {}, h('span', {}, t('recent'))),
        h('div.group', {}, recent.map(d => docRow(d, () => openDoc(d.id))))));
    }
    nodes.push(h('div.sec-f', { style: { textAlign: 'center', paddingTop: '24px' } }, t('local_note')));
    return nodes;
  },
});

function openDataFromHome() { document.dispatchEvent(new CustomEvent('ak:open-data')); }

function heroEl(big) {
  const act = (ic, label, fn) => h('button.act', { onclick: fn }, icon(ic), h('span', {}, label));
  const files = document.getElementById('in-files'), cam = document.getElementById('in-cam');
  return h('div.hero' + (big ? '' : '.slim'), {},
    big && h('h2', {}, t('hero_title')),
    big && h('p', {}, t('hero_text')),
    h('div.acts', {},
      act('files', t('add_files'), () => { setPreset(null); files.click(); }),
      act('camera', t('add_photo'), () => { setPreset(null); cam.click(); }),
      act('copy', t('add_text'), () => pasteSheet(f => ingest(f, { goInbox })))));
}

function ringEl(p, n) {
  const C = 2 * Math.PI * 24;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 54 54');
  const mk = (cls, extra) => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', 27); c.setAttribute('cy', 27); c.setAttribute('r', 24); c.setAttribute('class', cls); for (const [k, v] of Object.entries(extra || {})) c.setAttribute(k, v); return c; };
  svg.append(mk('bg'), mk('fg', { 'stroke-dasharray': C, 'stroke-dashoffset': C * (1 - p) }));
  return h('div.ring', {}, svg, h('b', {}, Math.round(p * 100) + '%'));
}

/* ───── Kategorie ───── */
export const catSpec = id => {
  const c = CAT_BY_ID[id];
  let showAll = false;
  return {
    title: () => pair(c.n).a,
    subtitle: () => c.ex[idx()],
    right: () => plusBtn(),
    render: async s => {
      const docs = await store.allDocs();
      const st = stats(docs);
      const types = typesOfCat(id);
      const used = types.filter(x => st.byType.get(x.id));
      const unused = types.filter(x => !st.byType.get(x.id));
      const row = ty => h('button.row.has-ico', { onclick: () => openType(ty.id) },
        typeIcon(ty, 'sm'),
        h('div.grow', {}, h('div.t1', {}, nameEl(ty.n)), ty.imp === 3 && !st.byType.get(ty.id) && h('div.t2', {}, t('recommended'))),
        h('div.val', {}, st.byType.get(ty.id) ? h('span.cnt', {}, st.byType.get(ty.id)) : null, icon('chev-r', 'chev')));
      const out = [];
      if (used.length) out.push(h('div.sec', {}, h('div.group', {}, used.map(row))));
      if (unused.length) {
        out.push(h('div.sec', {},
          h('div.sec-h', {}, h('span', {}, used.length ? t('other_types') : t('all_types')), h('button.more', { onclick: () => { showAll = !showAll; s.reload(); } }, showAll || !used.length ? '' : t('show_n', unused.length))),
          (showAll || !used.length) && h('div.group', {}, unused.map(row))));
        if (!showAll && used.length) out.push(h('div.sec-f', {}, t('types_hint')));
      }
      return out;
    },
  };
};

/* ───── Dokumenttyp (Ordner) ───── */
export function infoCard(type, { compact = false } = {}) {
  const p = pair(type.what);
  const todos = todoPairs(type);
  const ret = retentionText(type);
  const st = type.fr ? t('fr_' + type.fr.k) : '';
  return h('div.card', {},
    h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' } }, typeIcon(type, 'lg'), h('div', {}, h('div', { style: { fontWeight: 700, fontSize: '17px' } }, pair(type.n).a), pair(type.n).b && h('div.sec2', {}, pair(type.n).b))),
    h('p', { style: { margin: '0 0 6px', fontSize: '15px', lineHeight: 1.4 } }, p.a),
    p.b && h('p.sec2', { style: { margin: '0 0 12px', lineHeight: 1.4 } }, p.b),
    h('div.pills', { style: { marginBottom: '12px' } }, h('span.pill', {}, icon('archive'), ret), type.exp && h('span.pill.orange', {}, icon('calendar-clock'), t('has_expiry')), type.fr && h('span.pill.red', {}, icon('clock'), st)),
    !compact && todos.length > 0 && [h('div', { style: { fontSize: '13px', textTransform: 'uppercase', letterSpacing: '.3px', color: 'var(--label2)', margin: '4px 0 2px' } }, t('what_to_do')),
      h('ul.todo', {}, todos.map(x => h('li', {}, icon('check-circle'), x.a, x.b && h('div.sec2', { style: { marginTop: '2px' } }, x.b))))]);
}

export function retentionText(type, docDate) {
  const k = type.keep;
  if (typeof k === 'number') {
    if (k === 0) return t('keep_none');
    const end = docDate ? retentionEnd(type, docDate) : null;
    return end ? t('keep_until', fmtDate(end, lang())) : t('keep_years', k);
  }
  return t('keep_' + (k || 'forever'));
}

export const typeSpec = id => {
  const type = TYPE_BY_ID[id];
  return {
    title: () => pair(type.n).a,
    subtitle: () => pair(type.n).b,
    right: () => plusBtn(() => id),
    render: async () => {
      const docs = (await store.allDocs()).filter(d => d.type === id && !isInbox(d)).sort((a, b) => (b.docDate || '').localeCompare(a.docDate || '') || b.added - a.added);
      const out = [h('div.sec', { style: { marginTop: '4px' } }, infoCard(type))];
      if (!docs.length) {
        out.push(h('div.sec', { style: { padding: '0 16px' } }, h('button.btn', { onclick: () => addMenu(id) }, icon('plus'), t('add_here'))));
        return out;
      }
      const byYear = new Map();
      for (const d of docs) { const y = (d.docDate || '').slice(0, 4) || '—'; (byYear.get(y) || byYear.set(y, []).get(y)).push(d); }
      for (const [y, list] of byYear) out.push(h('div.sec', {}, h('div.sec-h', {}, h('span', {}, y)), h('div.group', {}, list.map(d => docRow(d, () => openDoc(d.id), { showType: false })))));
      return out;
    },
  };
};

/* ───── Dokument ───── */
export const docSpec = id => {
  let tab = 'info';
  let blob = null, url = null, tLang = null, busy = false;
  let nativeOK = false;
  trn.nativeAvailable('ru').then(v => { nativeOK = v; });
  return {
    title: () => '',
    large: false,
    right: s => ui.navBtn(icon('share'), () => shareDoc(), { 'aria-label': t('share') }),
    render: async s => {
      const d = await store.getDoc(id);
      if (!d) { ui.back(); return []; }
      if (!blob) { blob = await store.getBlob(id); if (blob) url = URL.createObjectURL(blob); }
      const type = typeOf(d);
      const a = alertOf(d);
      const nodes = [];

      // Vorschau
      const prev = h('div.preview', {});
      if (d.kind === 'image' && url) prev.append(h('img', { src: url, alt: d.title || d.name }));
      else if (d.thumb) prev.append(h('img', { src: d.thumb, alt: d.title || d.name }));
      else prev.append(h('div', { style: { padding: '40px', color: 'var(--label2)', fontSize: '44px' } }, icon(d.kind === 'pdf' ? 'file-text' : 'file')));
      if (url) prev.append(h('button.btn.sm.soft', { class: 'open', onclick: openOriginal, style: { background: 'var(--bar)' } }, icon('search'), t('open_original')));
      nodes.push(prev);

      nodes.push(h('div.doc-title', {}, d.title || d.name));
      nodes.push(h('div.doc-meta', {}, [docDisplayDate(d), d.pages > 1 ? t('pages', d.pages) : '', bytes(d.size || 0), personName(d)].filter(Boolean).join(' · ')));
      const pills = [h('button.pill.blue', { onclick: moveDoc }, icon('folder'), pair(type.n).a, icon('chev-d'))];
      if (a) pills.push(h('span.pill.' + alertColor(a), {}, icon('clock'), alertLabel(a) + ' · ' + fmtDate(a.date, lang()) + ' (' + whenText(a.days) + ')'));
      if (isInbox(d)) pills.unshift(h('span.pill.orange', {}, icon('help'), t('needs_check')));
      nodes.push(h('div.pills', { style: { padding: '0 20px 14px' } }, pills));

      nodes.push(h('div.seg', {}, ['info', 'text', 'tr'].map(k => h('button' + (tab === k ? '.on' : ''), { onclick: () => { tab = k; s.reload(); } }, t('tab_' + k)))));
      if (tab === 'info') nodes.push(...infoTab(d, type, a, s));
      else if (tab === 'text') nodes.push(...textTab(d, s));
      else nodes.push(...translateTab(d, type, s));
      return nodes;
    },
    after: s => {},
  };

  // Original in der App anzeigen (WKWebView/Standalone-PWA können Blob-Links nicht zuverlässig in neuen Fenstern öffnen).
  async function openOriginal() {
    if (!url || !blob) return;
    const d = await store.getDoc(id);
    const isImg = (blob.type || d?.mime || '').startsWith('image/');
    const sh = ui.sheet({
      title: d?.title || d?.name || '', full: true,
      right: () => [h('button.nb-btn', { onclick: shareDoc }, t('share')), h('button.nb-btn.bold', { onclick: () => sh.close() }, t('done'))],
      build: () => h('div.viewer', {}, isImg ? h('img', { src: url, alt: '' }) : h('iframe', { src: url, title: d?.title || '' })),
    });
  }
  async function shareDoc() {
    const d = await store.getDoc(id); if (!d || !blob) return;
    await shareOrDownload(blob, safeName(d.title || d.name) + extOf(d.name), d.title);
  }
  async function moveDoc() {
    const d = await store.getDoc(id);
    const to = await pickType({ current: d.type });
    if (to && to !== d.type) { await fileDoc(d, to); ui.toast(t('filed_to', pair(TYPE_BY_ID[to].n).a)); }
  }

  function infoTab(d, type, a, s) {
    const out = [];
    // Fristen & Kalender
    const st = statutoryDeadline(type, d.docDate);
    const dates = [];
    if (d.deadline?.date) dates.push({ date: d.deadline.date, label: t('deadline') + ' (' + t('from_text') + ')' });
    if (d.expiry) dates.push({ date: d.expiry, label: t('expires') });
    if (st && st.date !== d.deadline?.date) dates.push({ date: st.date, label: t('stat_' + st.kind), est: true });
    dates.sort((x, y) => (x.date < y.date ? -1 : 1));
    if (dates.length) {
      out.push(h('div.sec', {}, h('div.group', {}, dates.map(x => {
        const dd = daysUntil(x.date);
        return h('div.row', {}, h('div.grow', {}, h('div.t1', {}, x.label), x.est && h('div.t2.wrap', {}, t('est_note'))), h('div.val', {}, h('span.pill.' + (dd < 0 ? 'red' : dd <= 14 ? 'orange' : 'blue'), {}, fmtDate(x.date, lang()) + ' · ' + whenText(dd))));
      }).concat([
        h('button.row.tint', { onclick: () => addToCalendar(d, type, dates[0]) }, icon('calendar'), h('div.grow', {}, h('div.t1', {}, t('to_calendar')))),
        h('div.row', {}, h('div.grow', {}, h('div.t1', {}, t('mark_done'))), switchEl(!!d.done, async v => { await store.updateDoc(d.id, { done: v }); })),
      ]))));
    }
    out.push(h('div.sec', {}, infoCard(type)));
    // Wörter
    const gl = glossaryFor(d.text, 12);
    if (gl.length) {
      const gk = glossLang();
      out.push(h('div.sec', {}, h('div.sec-h', {}, h('span', {}, t('words_in_doc') + ' (' + langName(gk) + ')')), h('div.card', {}, h('div.gl', {}, gl.map(g => [h('b', {}, g.de), h('span', {}, g[gk])]).flat()))));
    }
    // Felder
    const persons = store.getSettings().persons || [];
    out.push(h('div.sec', {}, h('div.sec-h', {}, h('span', {}, t('details'))), h('div.group', {},
      h('div.row', {}, h('div.t1', {}, t('f_title')), h('input.input', { value: d.title || '', onchange: async e => { await store.updateDoc(d.id, { title: e.target.value.trim() || d.name, autoTitle: false }); } })),
      h('div.row', {}, h('div.t1', {}, t('f_date')), h('input.input', { type: 'date', value: d.docDate || '', onchange: async e => { await store.updateDoc(d.id, { docDate: e.target.value }); } })),
      h('div.row', {}, h('div.t1', {}, t('f_sender')), h('input.input', { value: d.sender || '', placeholder: '—', onchange: async e => { await store.updateDoc(d.id, { sender: e.target.value.trim() }); } })),
      persons.length > 0 && h('div.row', {}, h('div.t1', {}, t('f_person')), h('select.input', { onchange: async e => { await store.updateDoc(d.id, { person: e.target.value || null }); } }, h('option', { value: '' }, '—'), persons.map(p => h('option', { value: p.id, selected: p.id === d.person }, p.name)))),
      h('div.row', {}, h('div.t1', {}, t('f_file')), h('div.val', { style: { fontSize: '14px', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, d.name)),
      h('div.row', {}, h('div.t1', {}, t('f_conf')), h('div.val', {}, d.conf != null ? Math.round(d.conf * 100) + ' %' : '—')),
    )));
    out.push(h('div.sec', {}, h('div.group', {},
      h('button.row.tint', { onclick: moveDoc }, icon('folder'), h('div.grow', {}, h('div.t1', {}, t('move')))),
      h('button.row.tint', { onclick: () => reanalyse(d) }, icon('wand'), h('div.grow', {}, h('div.t1', {}, t('resort')))),
      h('button.row.destructive', { onclick: () => removeDoc(d) }, icon('trash'), h('div.grow', {}, h('div.t1', {}, t('delete')))))));
    out.push(h('div.sec-f', {}, t('disclaimer')));
    return out;
  }

  function glossLang() {
    if (lang() !== 'de') return lang();
    const l2 = store.getSettings().lang2;
    return l2 === 'ru' || l2 === 'en' ? l2 : 'ru';
  }

  async function addToCalendar(d, type, x) {
    const blob = makeICS({ title: `${pair(type.n).a}: ${x.label} – ${d.title || d.name}`, date: x.date, description: `Aktenschrank · ${d.title || d.name}` });
    await shareOrDownload(blob, 'frist.ics', t('to_calendar'));
  }

  async function removeDoc(d) {
    const ok = await ui.confirmDialog({ title: t('delete_q'), message: t('delete_t'), ok: t('delete'), cancel: t('cancel'), destructive: true });
    if (!ok) return;
    await store.deleteDoc(d.id);
    ui.toast(t('deleted'));
    ui.back();
  }

  async function reanalyse(d) {
    const an = analyse({ text: d.text, name: d.name, fileDate: d.added }, { learn: store.getLearn() });
    const th = store.AUTO_THRESHOLD[store.getSettings().auto] ?? 0.55;
    await store.updateDoc(d.id, { cands: an.candidates.slice(0, 3).map(c => ({ id: c.id, score: c.score })), deadline: an.deadline, expiry: an.expiry, sender: d.sender || an.sender, docDate: an.docDate || d.docDate });
    if (an.id !== UNKNOWN_ID && an.confidence >= th) { await fileDoc(d, an.id, { learnIt: false }); ui.toast(t('filed_to', pair(TYPE_BY_ID[an.id].n).a)); }
    else ui.toast(t('no_better'), 'err');
  }

  function textTab(d, s) {
    const out = [];
    if (!d.text?.trim()) out.push(h('div.sec', {}, emptyState('file-text', t('no_text_title'), d.kind === 'pdf' || d.kind === 'image' ? t('no_text_hint') : t('no_text_other'))));
    else {
      out.push(h('div.sec', {}, h('div.textbox.selectable', { lang: 'de' }, d.text)));
      out.push(h('div.sec-f', {}, t('select_translate_hint')));
    }
    out.push(h('div.sec', {}, h('div.group', {},
      d.text && h('button.row.tint', { onclick: async () => { try { await navigator.clipboard.writeText(d.text); ui.toast(t('copied')); } catch { ui.toast(t('copy_failed'), 'err'); } } }, icon('copy'), h('div.grow', {}, h('div.t1', {}, t('copy_text')))),
      h('button.row.tint', { onclick: () => editText(d) }, icon('pencil'), h('div.grow', {}, h('div.t1', {}, d.text ? t('edit_text') : t('paste_text')))))));
    return out;
  }

  function editText(d) {
    const ta = h('textarea.ta', { rows: 14, lang: 'de' }, d.text || '');
    ta.value = d.text || '';
    const api = ui.sheet({
      title: t('edit_text'), full: true,
      left: () => ui.navBtn(t('cancel'), () => api.close()),
      right: () => ui.navBtn(t('save'), async () => {
        const text = ta.value;
        api.close();
        await store.updateDoc(d.id, { text });
        const fresh = await store.getDoc(d.id);
        await reanalyse(fresh);
      }, { bold: true }),
      build: () => [h('div', { style: { padding: '12px 16px 0' } }, ta), h('div.sec-f', {}, t('edit_text_hint'))],
    });
  }

  function translateTab(d, type, s) {
    const out = [];
    const target = tLang || (lang() !== 'de' ? lang() : (['ru', 'en'].includes(store.getSettings().lang2) ? store.getSettings().lang2 : 'ru'));
    out.push(h('div.sec', { style: { marginTop: '14px' } }, h('div.seg', {}, ['ru', 'en'].map(k => h('button' + (target === k ? '.on' : ''), { onclick: () => { tLang = k; s.reload(); } }, langName(k))))));
    const ti = TYPES_idx(target);
    // 1) Sofort: Bedeutung in Zielsprache
    out.push(h('div.sec', {}, h('div.sec-h', {}, h('span', {}, t('meaning_in', langName(target)))), h('div.card', {},
      h('div', { style: { fontWeight: 600, marginBottom: '6px' } }, type.n[ti]),
      h('p', { style: { margin: '0 0 8px', fontSize: '15px', lineHeight: 1.45 } }, type.what[ti]),
      type.todo[ti]?.length > 0 && h('ul.todo', {}, type.todo[ti].map(x => h('li', {}, icon('check-circle'), x))))));
    // 2) Gespeicherte Übersetzung
    const tr = d.translations?.[target];
    if (tr) {
      out.push(h('div.sec', {}, h('div.sec-h', {}, h('span', {}, t('translation')), h('span.more', {}, tr.engine === 'claude' ? 'Claude' : t('on_device'))),
        tr.summary && h('div.card', { style: { marginBottom: '10px' } }, h('div.selectable', { style: { fontSize: '15px', lineHeight: 1.45 } }, tr.summary)),
        h('div.textbox.selectable', { lang: target }, tr.translation)));
      out.push(h('div.sec', {}, h('div.group', {},
        h('button.row.tint', { onclick: async () => { try { await navigator.clipboard.writeText(tr.translation); ui.toast(t('copied')); } catch {} } }, icon('copy'), h('div.grow', {}, h('div.t1', {}, t('copy_translation')))),
        h('button.row.destructive', { onclick: async () => { const x = { ...d.translations }; delete x[target]; await store.updateDoc(d.id, { translations: x }); } }, icon('trash'), h('div.grow', {}, h('div.t1', {}, t('delete_translation')))))));
    } else if (d.text?.trim()) {
      const set = store.getSettings();
      const group = [];
      group.push(h('button.row.tint', { onclick: () => runTranslate(d, type, target, 'device', s) }, icon('smartphone-nfc'), h('div.grow', {}, h('div.t1', {}, t('tr_device')), h('div.t2.wrap', {}, nativeOK ? t('tr_device_t') : t('tr_device_unavail')))));
      if (set.aiOn && set.apiKey) group.push(h('button.row.tint', { onclick: () => runTranslate(d, type, target, 'claude', s) }, icon('sparkles'), h('div.grow', {}, h('div.t1', {}, t('tr_ai')), h('div.t2.wrap', {}, t('tr_ai_t')))));
      else group.push(h('button.row', { onclick: () => document.dispatchEvent(new CustomEvent('ak:open-ai')) }, icon('sparkles'), h('div.grow', {}, h('div.t1', {}, t('tr_ai_setup')), h('div.t2.wrap', {}, t('tr_ai_setup_t'))), icon('chev-r', 'chev')));
      out.push(h('div.sec', {}, h('div.sec-h', {}, h('span', {}, t('translate_text'))), h('div.group', {}, group)));
      if (busy) out.push(h('div.sec', {}, h('div.card', { style: { display: 'flex', gap: '12px', alignItems: 'center' } }, h('div.spinner'), h('div', {}, t('translating')))));
      out.push(h('div.sec-f', {}, t('tr_system_hint')));
    } else out.push(h('div.sec', {}, emptyState('file-text', t('no_text_title'), t('no_text_hint'))));
    // 3) Wörter
    const gl = glossaryFor(d.text, 14);
    if (gl.length) out.push(h('div.sec', {}, h('div.sec-h', {}, h('span', {}, t('words_in_doc'))), h('div.card', {}, h('div.gl', {}, gl.map(g => [h('b', {}, g.de), h('span', {}, g[target])]).flat()))));
    return out;
  }

  async function runTranslate(d, type, target, engine, s) {
    if (busy) return;
    if (engine === 'device' && !(await trn.nativeAvailable(target))) { ui.toast(t('tr_device_unavail'), 'err', 4200); return; }
    if (engine === 'claude') {
      const ok = await ui.confirmDialog({ title: t('tr_ai_confirm'), message: t('tr_ai_confirm_t'), ok: t('send'), cancel: t('cancel') });
      if (!ok) return;
    }
    busy = true; s.reload();
    try {
      const res = engine === 'device' ? await trn.nativeTranslate(d.text, target) : await trn.claudeTranslate({ apiKey: store.getSettings().apiKey, text: d.text, target, typeName: type.n[0] });
      await store.updateDoc(d.id, { translations: { ...(d.translations || {}), [target]: { ...res, at: Date.now() } } });
    } catch (e) { console.error(e); ui.toast(t('tr_failed') + ' ' + String(e.message || e).slice(0, 90), 'err', 5000); }
    busy = false; s.reload();
  }
};
const TYPES_idx = l => ({ de: 0, ru: 1, en: 2 }[l] ?? 0);

/* ───── Eingang ───── */
export const inboxSpec = () => ({
  title: () => t('inbox'),
  right: () => plusBtn(),
  render: async () => {
    const docs = (await store.allDocs()).filter(isInbox).sort((a, b) => b.added - a.added);
    if (!docs.length) return [emptyState('check-circle', t('inbox_empty'), t('inbox_empty_t'))];
    const out = [];
    const suggestable = docs.filter(d => d.cands?.length && d.cands[0].id !== UNKNOWN_ID);
    if (suggestable.length > 1) {
      out.push(h('div.sec', { style: { padding: '0 16px', marginTop: '4px' } }, h('button.btn.soft', { onclick: async () => {
        for (const d of suggestable) await fileDoc(d, d.cands[0].id, { learnIt: true });
        ui.toast(t('all_filed', suggestable.length));
      } }, icon('wand'), t('accept_all', suggestable.length))));
    }
    for (const d of docs) {
      const cands = (d.cands || []).filter(c => c.id !== UNKNOWN_ID && TYPE_BY_ID[c.id]).slice(0, 3);
      out.push(h('div.sec', { style: { marginTop: '14px' } }, h('div.card', {},
        h('button', { style: { display: 'flex', gap: '12px', width: '100%', alignItems: 'center', textAlign: 'left' }, onclick: () => openDoc(d.id) },
          thumbEl(d), h('div', { style: { minWidth: 0, flex: 1 } }, h('div', { style: { fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, d.title || d.name), h('div.sec2', {}, [docDisplayDate(d), d.sender].filter(Boolean).join(' · ')), h('div.sec2', { style: { marginTop: '2px' } }, cands.length ? t('suggestion') : t('no_suggestion')))),
        h('div.chips', { style: { padding: '12px 0 4px' } },
          cands.map(c => h('button.chip', { onclick: async () => { await fileDoc(d, c.id); ui.toast(t('filed_to', pair(TYPE_BY_ID[c.id].n).a)); } }, icon(TYPE_BY_ID[c.id].ic), pair(TYPE_BY_ID[c.id].n).a)),
          h('button.chip.gray', { onclick: async () => { const to = await pickType({ title: t('choose_folder') }); if (to) { await fileDoc(d, to); ui.toast(t('filed_to', pair(TYPE_BY_ID[to].n).a)); } } }, icon('folder'), t('other_folder'))),
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: '4px' } }, h('button.nb-btn', { style: { color: 'var(--red)', fontSize: '15px' }, onclick: async () => { if (await ui.confirmDialog({ title: t('delete_q'), message: t('delete_t'), ok: t('delete'), cancel: t('cancel'), destructive: true })) { await store.deleteDoc(d.id); } } }, icon('trash'), t('delete'))))));
    }
    return out;
  },
});

/* ───── Suche ───── */
export const searchSpec = () => {
  let q = '';
  const box = h('input', { type: 'search', placeholder: t('search_ph'), autocomplete: 'off', autocapitalize: 'off', 'aria-label': t('search'), oninput: debounce(e => { q = e.target.value; paint(); }, 140) });
  const res = h('div');
  async function paint() {
    clear(res);
    const nq = norm(q);
    if (nq.length < 2) { res.append(emptyState('search', t('search_empty'), t('search_empty_t'))); return; }
    const words = nq.split(' ').filter(Boolean);
    const docs = (await store.allDocs()).filter(d => !isInbox(d));
    const scored = [];
    for (const d of docs) {
      const type = typeOf(d);
      const hay = norm([d.title, d.name, d.sender, d.subject, type.n.join(' ')].join(' '));
      const body = norm(d.text || '');
      let s = 0;
      for (const w of words) {
        if (hay.includes(w)) s += 5; else if (body.includes(w)) s += 1; else { s = -1; break; }
      }
      if (s > 0) scored.push({ d, s });
    }
    scored.sort((a, b) => b.s - a.s || b.d.added - a.d.added);
    const types = TYPES.filter(x => x.id !== UNKNOWN_ID && words.every(w => norm(x.n.join(' ') + ' ' + x.k.slice(0, 8).join(' ')).includes(w))).slice(0, 8);
    if (types.length) res.append(h('div.sec', {}, h('div.sec-h', {}, h('span', {}, t('folders'))), h('div.group', {}, types.map(ty => h('button.row.has-ico', { onclick: () => openType(ty.id) }, typeIcon(ty, 'sm'), h('div.grow', {}, h('div.t1', {}, nameEl(ty.n)), h('div.t2', {}, pair(CAT_BY_ID[ty.cat].n).a)), icon('chev-r', 'chev'))))));
    if (scored.length) res.append(h('div.sec', {}, h('div.sec-h', {}, h('span', {}, t('documents') + ' · ' + scored.length)), h('div.group', {}, scored.slice(0, 40).map(({ d }) => docRow(d, () => openDoc(d.id))))));
    if (!types.length && !scored.length) res.append(emptyState('search', t('nothing_found'), t('nothing_found_t')));
  }
  return {
    title: () => t('search'),
    render: async () => { paint(); return [h('div.search', {}, icon('search'), box), res]; },
    after: () => {},
  };
};

/* ───── Dokumenten-Check ───── */
export const checkSpec = () => ({
  title: () => t('check_title'),
  subtitle: () => t('check_intro'),
  render: async () => {
    const st = stats(await store.allDocs());
    const out = [];
    for (const c of CATS) {
      const list = typesOfCat(c.id).filter(x => x.imp >= 2 && !x.gen);
      if (!list.length) continue;
      out.push(h('div.sec', {}, h('div.sec-h', {}, h('span', {}, pair(c.n).a)), h('div.group', {}, list.map(ty => {
        const n = st.byType.get(ty.id) || 0;
        return h('button.row', { onclick: () => openType(ty.id) },
          h('div.dot' + (n ? '.on' : ''), {}, n ? icon('check') : null),
          h('div.grow', {}, h('div.t1', {}, nameEl(ty.n)), ty.imp === 3 && h('div.t2', {}, t('essential'))),
          h('div.val', {}, n ? h('span.cnt', {}, n) : null, icon('chev-r', 'chev')));
      }))));
    }
    out.push(h('div.sec-f', {}, t('check_footer')));
    return out;
  },
});
