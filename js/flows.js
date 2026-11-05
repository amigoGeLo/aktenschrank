// Abläufe: Dokumente hinzufügen & analysieren, Ordner wählen, einsortieren (inkl. Lernen).
import { h, icon, uid, sha256, readAsArrayBuffer, bytes, todayISO, clear, debounce } from './util.js';
import * as ui from './ui.js';
import * as store from './store.js';
import { extract } from './extract.js';
import { analyse, learn, suggestName, iso } from './classify.js';
import { norm, CATS, CAT_BY_ID, TYPE_BY_ID, typesOfCat, UNKNOWN_ID } from './catalog.js';
import { t, pair } from './i18n.js';
import { nameEl, catIcon, typeIcon } from './core.js';

let preset = null;
export const setPreset = p => { preset = p; };
export const stripExt = s => String(s || '').replace(/\.[a-z0-9]{2,5}$/i, '');

function detectPerson(text) {
  const persons = store.getSettings().persons || [];
  if (!persons.length) return null;
  if (persons.length === 1) return persons[0].id;
  const n = ' ' + norm(text) + ' ';
  for (const p of persons) {
    const parts = norm(p.name).split(' ').filter(x => x.length >= 3);
    if (parts.length && parts.every(x => n.includes(' ' + x))) return p.id;
  }
  return null;
}

/** Dateien lesen, analysieren, speichern. Zeigt ein Fortschritts-Sheet. */
export async function ingest(fileList, opts = {}) {
  const files = [...fileList];
  const presetType = opts.presetType ?? preset;
  preset = null;
  if (!files.length) return;
  const s = store.getSettings();
  store.requestPersist();
  const rows = files.map(f => ({ f, state: 'wait', msg: '', res: null }));
  let finished = false;
  const api = ui.sheet({
    title: t('adding'),
    right: () => (finished ? ui.navBtn(t('done'), () => api.close(), { bold: true }) : h('div')),
    build: () => [
      h('div.group', { style: { marginTop: '8px' } }, rows.map(r => h('div.row', {},
        r.state === 'work' ? h('div.spinner') : r.state === 'ok' ? h('div.dot.on', {}, icon('check')) : r.state === 'inbox' ? h('div.dot.warn', {}, icon('help')) : r.state === 'dup' ? h('div.dot', {}, icon('copy')) : r.state === 'err' ? h('div.dot.warn', {}, icon('x')) : h('div.dot'),
        h('div.grow', {}, h('div.t1', {}, r.f.name || t('photo')), h('div.t2.wrap', {}, r.msg || bytes(r.f.size)))))),
      finished && summaryNodes(),
    ],
  });
  const refresh = () => api.reload();

  function summaryNodes() {
    const ok = rows.filter(r => r.state === 'ok').length, inbox = rows.filter(r => r.state === 'inbox').length, dup = rows.filter(r => r.state === 'dup').length;
    return h('div', { style: { padding: '16px' } },
      h('div', { style: { textAlign: 'center', marginBottom: '14px', color: 'var(--label2)', fontSize: '15px', lineHeight: 1.4 } }, [ok && t('sum_ok', ok), inbox && t('sum_inbox', inbox), dup && t('sum_dup', dup)].filter(Boolean).join(' · ')),
      inbox > 0 ? h('button.btn', { onclick: () => { api.close(); opts.goInbox?.(); } }, t('go_inbox')) : h('button.btn', { onclick: () => api.close() }, t('done')));
  }

  for (const r of rows) {
    try {
      r.state = 'work'; r.msg = t('reading'); refresh();
      const f = r.f;
      const ex = await extract(f, {
        ocr: s.ocr, ocrLang: s.ocrLang,
        onStatus: st => { r.msg = st.startsWith('ocr') ? t('ocr_running') : r.msg; },
      });
      const hash = await sha256(await readAsArrayBuffer(f));
      const dup = hash && (await store.allDocs()).find(d => d.hash === hash);
      if (dup) { r.state = 'dup'; r.msg = t('duplicate', dup.title || dup.name); refresh(); continue; }

      const fileISO = f.lastModified ? iso(new Date(f.lastModified)) : todayISO();
      const an = analyse({ text: ex.text, name: f.name, fileDate: f.lastModified }, { learn: store.getLearn() });
      let typeId = an.id, conf = an.confidence;
      if (presetType) { typeId = presetType; conf = 1; }
      const type = TYPE_BY_ID[typeId];
      const th = store.AUTO_THRESHOLD[s.auto] ?? 0.55;
      const status = typeId !== UNKNOWN_ID && conf >= th ? 'filed' : 'inbox';
      const auto = typeId !== UNKNOWN_ID;
      const title = auto
        ? stripExt(suggestName({ typeName: type.n[0], docDate: an.docDate, sender: an.sender, subject: an.subject, original: f.name }))
        : stripExt(f.name) || t('document');
      const doc = {
        id: uid(), name: f.name || (t('photo') + '.jpg'), title, autoTitle: auto,
        type: typeId, cat: type.cat, status, conf, cands: an.candidates.slice(0, 3).map(c => ({ id: c.id, score: c.score })),
        docDate: an.docDate || fileISO, deadline: an.deadline, expiry: an.expiry, sender: an.sender, subject: an.subject,
        person: detectPerson(ex.text), size: f.size, mime: f.type || '', kind: ex.kind, pages: ex.pages,
        text: ex.text, thumb: ex.thumb, added: Date.now(), hash, ocr: ex.ocr, translations: {}, done: false,
      };
      await store.putDoc(doc, f);
      r.state = status === 'filed' ? 'ok' : 'inbox';
      const nm = pair(type.n).a;
      const reason = !ex.text.trim() ? (ex.ocrFailed ? t('ocr_failed') : s.ocr ? t('no_text') : t('no_text_ocr_off')) : '';
      r.msg = status === 'filed' ? `${nm} · ${Math.round(conf * 100)} %` : (reason || t('needs_check'));
      refresh();
    } catch (e) {
      console.error(e);
      r.state = 'err'; r.msg = String(e?.message || e); refresh();
    }
  }
  finished = true;
  api.paintBar();
  refresh();
}

/** Dokumenttyp wählen (Sheet mit Suche). Liefert die Typ-ID oder null. */
export function pickType({ title, current } = {}) {
  return new Promise(res => {
    let q = '';
    let list;
    const index = [];
    for (const c of CATS) for (const ty of typesOfCat(c.id)) index.push({ c, ty, hay: norm(ty.n.join(' ') + ' ' + c.n.join(' ') + ' ' + ty.k.slice(0, 12).join(' ')) });
    const api = ui.sheet({
      title: title || t('choose_folder'), full: true,
      onClose: () => res(chosen),
      build: () => {
        const input = h('input', { type: 'search', placeholder: t('search_types'), autocomplete: 'off', oninput: debounce(e => { q = norm(e.target.value); paint(); }, 120) });
        list = h('div');
        paint();
        return [h('div.search', { style: { marginTop: '8px' } }, icon('search'), input), list];
      },
    });
    let chosen = null;
    function paint() {
      clear(list);
      const groups = [];
      for (const c of CATS) {
        const rows = index.filter(x => x.c.id === c.id && (!q || x.hay.includes(q)));
        if (!rows.length) continue;
        groups.push(h('div.sec', { style: { marginTop: '16px' } },
          h('div.sec-h', {}, h('span', {}, pair(c.n).a)),
          h('div.group', {}, rows.map(({ ty }) => h('button.row.has-ico', { onclick: () => { chosen = ty.id; api.close(); } },
            typeIcon(ty, 'sm'), h('div.grow', {}, h('div.t1', {}, nameEl(ty.n))), current === ty.id && icon('check', 'chev'))))));
      }
      list.append(...(groups.length ? groups : [h('div.empty', {}, t('nothing_found'))]));
    }
  });
}

/** Dokument in einen Typ einsortieren und daraus lernen. */
export async function fileDoc(doc, typeId, { learnIt = true } = {}) {
  const type = TYPE_BY_ID[typeId];
  if (!type) return;
  const patch = { type: typeId, cat: type.cat, status: 'filed', conf: 1 };
  if (doc.autoTitle || !doc.title) {
    patch.title = stripExt(suggestName({ typeName: type.n[0], docDate: doc.docDate, sender: doc.sender, subject: doc.subject, original: doc.name }));
    patch.autoTitle = true;
  }
  await store.updateDoc(doc.id, patch);
  if (learnIt && typeId !== UNKNOWN_ID) {
    await store.saveLearn(learn(store.getLearn(), { text: doc.text, name: doc.name }, typeId));
  }
}

/** Text einfügen (z. B. per iPhone-Kamera „Text scannen“) → wie eine Datei verarbeiten. */
export function pasteSheet(onIngest) {
  const ta = h('textarea.ta', { placeholder: t('paste_ph'), rows: 8 });
  const name = h('input.input.left', { placeholder: t('paste_name'), value: '' });
  const api = ui.sheet({
    title: t('add_text'),
    right: () => ui.navBtn(t('add'), async () => {
      const txt = ta.value.trim();
      if (!txt) return;
      const nm = (name.value.trim() || t('note')).replace(/[\\/:*?"<>|]+/g, ' ');
      api.close();
      onIngest([new File([txt], nm + '.txt', { type: 'text/plain', lastModified: Date.now() })]);
    }, { bold: true }),
    left: () => ui.navBtn(t('cancel'), () => api.close()),
    build: () => [
      h('div.group', { style: { marginTop: '8px' } }, h('div.row', {}, name)),
      h('div', { style: { padding: '12px 16px 0' } }, ta),
      h('div.sec-f', {}, t('paste_hint')),
    ],
  });
}
