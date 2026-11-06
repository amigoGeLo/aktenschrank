// „Mehr“: Einstellungen, Daten & Sicherung, Aufräumen, Anleitung, Willkommen.
import { h, icon, uid, bytes, fmtDate, todayISO, safeName, isIOS, isStandalone } from './util.js';
import * as ui from './ui.js';
import * as store from './store.js';
import { TYPES, TYPE_BY_ID, CAT_BY_ID, UNKNOWN_ID } from './catalog.js';
import { retentionEnd } from './classify.js';
import * as ex from './export.js';
import { GUIDE, PRIVACY } from './guide.js';
import { t, pair, lang, langName, setLangNow, LANGS } from './i18n.js';
import { listRow, switchEl, emptyState, typeOf, isInbox, thumbEl } from './core.js';
import { openDoc } from './screens.js';
import * as lock from './lock.js';

const gi = (name, color) => h('div.ico', { style: { background: color } }, icon(name));

/* ───── Mehr (Hauptliste) ───── */
export const moreSpec = () => ({
  title: () => t('more'),
  render: async () => {
    const s = store.getSettings();
    const docs = await store.allDocs();
    const expired = expiredDocs(docs).length;
    return [
      h('div.sec', {}, h('div.group', {},
        listRow({ ico: gi('languages', '#007aff'), title: t('language'), value: langName(s.lang) + (s.lang2 !== 'none' && s.lang2 !== s.lang ? ' + ' + langName(s.lang2) : ''), onclick: () => ui.push(languageSpec()) }),
        listRow({ ico: gi('wand', '#af52de'), title: t('sorting'), onclick: () => ui.push(sortSpec()) }),
        listRow({ ico: gi('users', '#ff9500'), title: t('people'), value: s.persons.length || '', onclick: () => ui.push(peopleSpec()) }))),
      h('div.sec', {}, h('div.group', {},
        listRow({ ico: gi('drive', '#34c759'), title: t('data'), onclick: () => ui.push(dataSpec()) }),
        listRow({ ico: gi('archive', '#8e8e93'), title: t('cleanup'), value: expired || '', onclick: () => ui.push(cleanupSpec()) }),
        listRow({ ico: gi('lock', '#ff3b30'), title: t('lock_menu'), value: lock.hasLock() ? t('on') : t('off'), onclick: () => ui.push(lockSpec()) }),
        listRow({ ico: gi('sparkles', '#5e5ce6'), title: t('ai_title'), value: s.aiOn && s.apiKey ? t('on') : t('off'), onclick: () => ui.push(aiSpec()) }))),
      h('div.sec', {}, h('div.group', {},
        listRow({ ico: gi('book', '#007aff'), title: t('guide'), onclick: () => ui.push(guideSpec()) }),
        listRow({ ico: gi('shield', '#30b0c7'), title: t('privacy_full'), onclick: () => window.open('privacy.html', '_blank') }),
        listRow({ ico: gi('scale', '#8e8e93'), title: t('impressum'), onclick: () => window.open('impressum.html', '_blank') }),
        listRow({ ico: gi('lock', '#30b0c7'), title: t('privacy'), onclick: () => ui.push(privacySpec()) }),
        listRow({ ico: gi('info', '#8e8e93'), title: t('welcome_again'), onclick: () => welcome() }))),
      h('div.sec-f', { style: { textAlign: 'center', paddingTop: '20px' } }, `Aktenschrank · ${TYPES.length - 1} ${t('doc_types')} · v1.0`),
    ];
  },
});
document.addEventListener('ak:open-data', () => ui.push(dataSpec()));
document.addEventListener('ak:open-ai', () => { ui.switchTab('more'); ui.push(aiSpec()); });

/* ───── Sprache ───── */
const languageSpec = () => ({
  title: () => t('language'),
  render: async () => {
    const s = store.getSettings();
    const row = (code, cur, set) => h('button.row', { onclick: () => set(code) }, h('div.grow', {}, h('div.t1', {}, langName(code))), cur === code && icon('check', 'chev'));
    return [
      h('div.sec', {}, h('div.sec-h', {}, h('span', {}, t('ui_language'))), h('div.group', {}, LANGS.map(c => row(c, s.lang, v => { setLangNow(v); store.setSettings({ lang: v, lang2: s.lang2 === v ? (v === 'de' ? 'none' : 'de') : s.lang2 }); })))),
      h('div.sec', {}, h('div.sec-h', {}, h('span', {}, t('second_language'))),
        h('div.group', {}, ['none', ...LANGS.filter(c => c !== s.lang)].map(c => h('button.row', { onclick: () => store.setSettings({ lang2: c }) }, h('div.grow', {}, h('div.t1', {}, c === 'none' ? t('none') : langName(c))), s.lang2 === c && icon('check', 'chev')))),
        h('div.sec-f', {}, t('second_language_t'))),
    ];
  },
});

/* ───── Sortierung ───── */
const sortSpec = () => ({
  title: () => t('sorting'),
  render: async () => {
    const s = store.getSettings();
    const L = store.getLearn();
    const learned = Object.values(L.types || {}).reduce((a, b) => a + b.n, 0);
    const modes = ['ask', 'normal', 'generous'];
    return [
      h('div.sec', {}, h('div.sec-h', {}, h('span', {}, t('auto_mode'))), h('div.seg', {}, modes.map(m => h('button' + (s.auto === m ? '.on' : ''), { onclick: () => store.setSettings({ auto: m }) }, t('auto_' + m)))), h('div.sec-f', {}, t('auto_' + s.auto + '_t'))),
      h('div.sec', {}, h('div.sec-h', {}, h('span', {}, t('ocr_title'))), h('div.group', {},
        h('div.row', {}, h('div.grow', {}, h('div.t1', {}, t('ocr_on')), h('div.t2.wrap', {}, t('ocr_on_t'))), switchEl(s.ocr, v => store.setSettings({ ocr: v }))),
        s.ocr && ['deu', 'deu+eng', 'deu+rus'].map(c => h('button.row', { onclick: () => store.setSettings({ ocrLang: c }) }, h('div.grow', {}, h('div.t1', {}, t('ocr_lang_' + c))), s.ocrLang === c && icon('check', 'chev')))),
        h('div.sec-f', {}, t('ocr_note'))),
      h('div.sec', {}, h('div.sec-h', {}, h('span', {}, t('learned'))), h('div.group', {},
        h('div.row', {}, h('div.grow', {}, h('div.t1', {}, t('learned_n', learned)), h('div.t2.wrap', {}, t('learned_t')))),
        h('button.row.destructive', { onclick: async () => { if (await ui.confirmDialog({ title: t('reset_learn_q'), ok: t('reset'), cancel: t('cancel'), destructive: true })) { await store.saveLearn({ v: 1, types: {}, names: {} }); ui.toast(t('done')); ui.reloadAll(); } } }, h('div.grow', {}, h('div.t1', {}, t('reset_learn')))))),
    ];
  },
});

/* ───── Personen ───── */
const peopleSpec = () => ({
  title: () => t('people'),
  right: () => ui.navBtn(icon('plus'), addPerson, { 'aria-label': t('add') }),
  render: async () => {
    const s = store.getSettings();
    const docs = await store.allDocs();
    if (!s.persons.length) return [h('div.sec-f', { style: { padding: '0 20px 12px', fontSize: '15px' } }, t('people_t')), emptyState('users', t('people_empty'), '', h('button.btn.sm', { onclick: addPerson }, icon('plus'), t('add')))];
    return [h('div.sec-f', { style: { padding: '0 20px 12px', fontSize: '15px' } }, t('people_t')),
      h('div.group', {}, s.persons.map(p => h('button.row', { onclick: () => personMenu(p) }, h('div.ico', { style: { background: '#ff9500' } }, icon('user')), h('div.grow', {}, h('div.t1', {}, p.name), h('div.t2', {}, t('n_docs', docs.filter(d => d.person === p.id).length))), icon('chev-r', 'chev'))))];
  },
});
function addPerson() {
  const inp = h('input.input.left', { placeholder: t('person_name'), autocapitalize: 'words' });
  const api = ui.sheet({
    title: t('add_person'),
    left: () => ui.navBtn(t('cancel'), () => api.close()),
    right: () => ui.navBtn(t('add'), async () => { const n = inp.value.trim(); if (!n) return; api.close(); await store.setSettings({ persons: [...store.getSettings().persons, { id: uid(), name: n }] }); }, { bold: true }),
    build: () => [h('div.group', { style: { marginTop: '8px' } }, h('div.row', {}, inp)), h('div.sec-f', {}, t('person_hint'))],
  });
  setTimeout(() => inp.focus(), 450);
}
async function personMenu(p) {
  const v = await ui.actionSheet({ title: p.name, cancel: t('cancel'), items: [{ label: t('rename'), icon: 'pencil', value: 'rename' }, { label: t('delete'), icon: 'trash', value: 'del', destructive: true }] });
  if (v === 'del') {
    if (!(await ui.confirmDialog({ title: t('delete_person_q', p.name), message: t('delete_person_t'), ok: t('delete'), cancel: t('cancel'), destructive: true }))) return;
    await store.setSettings({ persons: store.getSettings().persons.filter(x => x.id !== p.id) });
    for (const d of await store.allDocs()) if (d.person === p.id) await store.updateDoc(d.id, { person: null });
  } else if (v === 'rename') {
    const inp = h('input.input.left', { value: p.name });
    const api = ui.sheet({ title: t('rename'), left: () => ui.navBtn(t('cancel'), () => api.close()), right: () => ui.navBtn(t('save'), async () => { const n = inp.value.trim(); if (!n) return; api.close(); await store.setSettings({ persons: store.getSettings().persons.map(x => x.id === p.id ? { ...x, name: n } : x) }); }, { bold: true }), build: () => [h('div.group', { style: { marginTop: '8px' } }, h('div.row', {}, inp))] });
  }
}

/* ───── Daten & Sicherung ───── */
const dataSpec = () => {
  let info = { usage: 0, quota: 0, persisted: false };
  let ready = null;      // {blob, name}
  let progress = null;   // {i, n}
  return {
    title: () => t('data'),
    render: async s => {
      info = await store.storageInfo();
      const set = store.getSettings();
      const docs = await store.allDocs();
      const pct = info.quota ? Math.min(100, (info.usage / info.quota) * 100) : 0;
      const out = [];
      out.push(h('div.sec', {}, h('div.sec-h', {}, h('span', {}, t('storage'))), h('div.card', {},
        h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '15px' } }, h('span', {}, t('n_docs', docs.length)), h('span.sec2', {}, bytes(info.usage) + (info.quota ? ' / ' + bytes(info.quota) : ''))),
        h('div.bar', {}, h('i', { style: { width: Math.max(1, pct) + '%' } }))),
        h('div.group', { style: { marginTop: '12px' } },
          h('div.row', {}, h('div.grow', {}, h('div.t1', {}, t('persist')), h('div.t2.wrap', {}, info.persisted ? t('persist_on') : t('persist_off'))), h('span.pill.' + (info.persisted ? 'green' : 'orange'), {}, info.persisted ? t('on') : t('off'))),
          !info.persisted && h('button.row.tint', { onclick: async () => { const ok = await store.requestPersist(); ui.toast(ok ? t('persist_ok') : t('persist_no'), ok ? 'ok' : 'err', 4200); s.reload(); } }, h('div.grow', {}, h('div.t1', {}, t('persist_ask')))))));

      const last = set.lastBackup ? fmtDate(new Date(set.lastBackup).toISOString().slice(0, 10), lang()) : t('never');
      out.push(h('div.sec', {}, h('div.sec-h', {}, h('span', {}, t('backup'))), h('div.group', {},
        h('div.row', {}, h('div.grow', {}, h('div.t1', {}, t('last_backup'))), h('div.val', {}, last)),
        ready
          ? h('button.row.tint', { onclick: saveReady }, icon('share'), h('div.grow', {}, h('div.t1', {}, t('save_backup')), h('div.t2', {}, ready.name + ' · ' + bytes(ready.blob.size))))
          : progress
            ? h('div.row', {}, h('div.spinner'), h('div.grow', {}, h('div.t1', {}, t('preparing')), h('div.t2', {}, progress.i + ' / ' + progress.n)))
            : h('button.row.tint', { onclick: () => prepare(s) }, icon('download'), h('div.grow', {}, h('div.t1', {}, t('prepare_backup')), h('div.t2.wrap', {}, t('prepare_backup_t')))),
        h('button.row.tint', { onclick: () => restore(s) }, icon('upload'), h('div.grow', {}, h('div.t1', {}, t('restore')), h('div.t2.wrap', {}, t('restore_t'))))),
        h('div.sec-f', {}, isIOS() ? t('backup_ios_note') : t('backup_note'))));

      if (ex.canPickFolder()) {
        const hasFolder = !!(await store.kvGet('folderHandle', null));
        out.push(h('div.sec', {}, h('div.sec-h', {}, h('span', {}, t('folder_sync'))), h('div.group', {},
          h('button.row.tint', { onclick: async () => { try { await ex.pickFolder(); ui.toast(t('folder_set')); s.reload(); } catch (e) { if (e?.name !== 'AbortError') ui.toast(String(e.message), 'err'); } } }, h('div.grow', {}, h('div.t1', {}, hasFolder ? t('folder_change') : t('folder_pick')), h('div.t2.wrap', {}, t('folder_t')))),
          hasFolder && h('button.row.tint', { onclick: async () => { try { const r = await ex.syncToFolder(); ui.toast(t('folder_done', r.written)); await store.setSettings({ lastBackup: Date.now() }); } catch (e) { ui.toast(String(e.message), 'err'); } } }, h('div.grow', {}, h('div.t1', {}, t('folder_sync_now')))))));
      }
      out.push(h('div.sec', {}, h('div.group', {}, h('button.row.destructive', { onclick: wipe }, h('div.grow', {}, h('div.t1', {}, t('wipe')))))));
      return out;
    },
  };

  async function prepare(s) {
    progress = { i: 0, n: (await store.allDocs()).length }; s.reload();
    try {
      const blob = await ex.buildBackup((i, n) => { progress = { i, n }; });
      ready = { blob, name: `Aktenschrank-${todayISO()}.zip` };
    } catch (e) { console.error(e); ui.toast(String(e.message || e), 'err'); }
    progress = null; s.reload();
  }
  async function saveReady() {
    const r = await ex.shareOrDownload(ready.blob, ready.name, 'Aktenschrank');
    if (r !== 'cancelled') { await store.setSettings({ lastBackup: Date.now() }); ui.toast(t('backup_saved')); ready = null; }
  }
  function restore(s) {
    const inp = h('input', { type: 'file', accept: '.zip,application/zip', onchange: async () => {
      const f = inp.files[0]; inp.remove(); if (!f) return;
      const p = ui.sheet({ title: t('restore'), build: () => [h('div.card', { style: { margin: '16px', display: 'flex', gap: '12px', alignItems: 'center' } }, h('div.spinner'), h('div', {}, t('restoring')))] });
      try { const r = await ex.restoreBackup(f); p.close(); ui.toast(t('restored', r.added, r.total), 'ok', 4000); }
      catch (e) { p.close(); ui.toast(e.message === 'no-data-file' || e.message === 'bad-file' ? t('restore_bad') : String(e.message || e), 'err', 5000); }
      s.reload();
    } });
    document.body.append(inp); inp.click();
  }
  async function wipe() {
    if (!(await ui.confirmDialog({ title: t('wipe_q'), message: t('wipe_t'), ok: t('wipe_ok'), cancel: t('cancel'), destructive: true }))) return;
    if (!(await ui.confirmDialog({ title: t('wipe_q2'), ok: t('wipe_ok'), cancel: t('cancel'), destructive: true }))) return;
    await store.wipeAll(); await lock.removeLock(); ui.toast(t('wiped'));
    location.reload();
  }
};

/* ───── Aufräumen ───── */
export function expiredDocs(docs) {
  const today = todayISO();
  return docs.filter(d => !isInbox(d)).map(d => ({ d, end: retentionEnd(typeOf(d), d.docDate) })).filter(x => x.end && x.end < today).sort((a, b) => a.end.localeCompare(b.end));
}
const cleanupSpec = () => ({
  title: () => t('cleanup'),
  render: async () => {
    const list = expiredDocs(await store.allDocs());
    if (!list.length) return [emptyState('check-circle', t('cleanup_empty'), t('cleanup_empty_t'))];
    return [
      h('div.sec-f', { style: { padding: '0 20px 12px', fontSize: '15px' } }, t('cleanup_t')),
      h('div.group', {}, list.map(({ d, end }) => h('div.row.has-thumb', {}, h('button', { style: { display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: 0, textAlign: 'left' }, onclick: () => openDoc(d.id) }, thumbEl(d), h('div.grow', {}, h('div.t1', {}, d.title || d.name), h('div.t2', {}, t('retention_ended', fmtDate(end, lang()))))), h('button.nb-btn', { style: { color: 'var(--red)' }, 'aria-label': t('delete'), onclick: async () => { if (await ui.confirmDialog({ title: t('delete_q'), message: t('delete_t'), ok: t('delete'), cancel: t('cancel'), destructive: true })) await store.deleteDoc(d.id); } }, icon('trash'))))),
      h('div.sec', { style: { padding: '16px' } }, h('button.btn.danger', { onclick: async () => { if (await ui.confirmDialog({ title: t('delete_all_n', list.length), message: t('delete_t'), ok: t('delete'), cancel: t('cancel'), destructive: true })) { for (const { d } of list) await store.deleteDoc(d.id); ui.toast(t('deleted')); } } }, icon('trash'), t('delete_all_n', list.length))),
      h('div.sec-f', {}, t('cleanup_note')),
    ];
  },
});


/* ───── Sperre ───── */
function setCodeSheet(done) {
  let first = null;
  const sh = ui.sheet({
    title: t('lock_set'), right: [],
    left: () => h('button.nb-btn', { onclick: () => sh.close() }, t('cancel')),
    build: () => {
      const pad = lock.pinPad({
        title: t('lock_new'), sub: '',
        onDone: async (v, api) => {
          if (!first) { first = v; pad.querySelector('.pin-title').textContent = t('lock_repeat'); api.reset(''); return; }
          if (v !== first) { first = null; pad.querySelector('.pin-title').textContent = t('lock_new'); api.reset(t('lock_mismatch'), true); return; }
          await lock.setPin(v); sh.close(); done?.();
        },
      });
      return h('div', { style: { padding: '8px 0 24px' } }, pad);
    },
  });
}
function verifySheet(done) {
  const sh = ui.sheet({
    title: t('lock_menu'), right: [],
    left: () => h('button.nb-btn', { onclick: () => sh.close() }, t('cancel')),
    build: () => h('div', { style: { padding: '8px 0 24px' } }, lock.pinPad({ title: t('lock_cur'), sub: '', onDone: async (v, api) => { if (await lock.verifyPin(v)) { sh.close(); done(); } else api.reset(t('lock_wrong'), true); } })),
  });
}
const lockSpec = () => ({
  title: () => t('lock_menu'),
  render: async () => {
    const on = lock.hasLock();
    const cfg = lock.lockConfig();
    const bioOk = on && (await lock.bioSupported());
    const reload = () => ui.reloadAll();
    const out = [
      h('div.sec', {}, h('div.group', {},
        h('div.row', {}, h('div.grow', {}, h('div.t1', {}, t('lock_menu'))), switchEl(on, v => {
          if (v) setCodeSheet(() => { ui.toast(t('lock_on_toast')); reload(); });
          else verifySheet(async () => { await lock.removeLock(); ui.toast(t('lock_off_toast')); reload(); });
          setTimeout(reload, 0);
        })))),
    ];
    if (on) {
      out.push(h('div.sec', {}, h('div.group', {},
        listRow({ title: t('lock_change'), onclick: () => verifySheet(() => setCodeSheet(() => ui.toast(t('lock_on_toast')))) }),
        listRow({ title: t('lock_now'), onclick: () => lock.lockNow() }))));
      out.push(h('div.sec', {}, h('div.sec-h', {}, h('span', {}, t('lock_after'))), h('div.group', {},
        [[0, 'lock_imm'], [60, 'lock_1'], [300, 'lock_5']].map(([sec, k]) =>
          h('button.row', { onclick: async () => { await lock.setAfter(sec); reload(); } }, h('div.grow', {}, h('div.t1', {}, t(k))), cfg.after === sec && icon('check', 'chev'))))));
      if (bioOk) out.push(h('div.sec', {}, h('div.group', {},
        h('div.row', {}, h('div.grow', {}, h('div.t1', {}, t('lock_bio'))), switchEl(cfg.bio, async v => {
          try { if (v) await lock.enableBio(); else await lock.disableBio(); } catch { ui.toast(t('lock_bio_fail'), 'err'); }
          reload();
        }))), h('div.sec-f', {}, t('lock_bio_t'))));
    }
    out.push(h('div.warnbox', {}, icon('alert'), h('div', {}, t('lock_note'))));
    return out;
  },
});

/* ───── KI-Übersetzung (optional) ───── */
const aiSpec = () => ({
  title: () => t('ai_title'),
  render: async () => {
    const s = store.getSettings();
    const key = h('input.input.left', { type: 'password', value: s.apiKey, placeholder: 'sk-ant-…', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', onchange: e => store.setSettings({ apiKey: e.target.value.trim() }) });
    return [
      h('div.warnbox', {}, icon('alert'), h('div', {}, t('ai_warning'))),
      h('div.sec', {}, h('div.group', {},
        h('div.row', {}, h('div.grow', {}, h('div.t1', {}, t('ai_on'))), switchEl(s.aiOn, v => store.setSettings({ aiOn: v }))),
        h('div.row', {}, h('div.t1', { style: { flex: 'none' } }, t('ai_key')), key)),
        h('div.sec-f', {}, t('ai_t'))),
    ];
  },
});

/* ───── Anleitung & Datenschutz ───── */
export const guideSpec = () => ({
  title: () => t('guide'),
  render: async () => {
    const out = [h('div.guide', {}, GUIDE[lang()].map(sec => [h('h3', {}, sec.h), h('div.gbody', {}, sec.p.map(p => typeof p === 'string' ? h('p', {}, p) : p.ol ? h('ol', {}, p.ol.map(x => h('li', {}, x))) : h('ul', {}, p.ul.map(x => h('li', {}, x)))))]).flat())];
    return out;
  },
});
const privacySpec = () => ({
  title: () => t('privacy'),
  render: async () => [h('div.guide', {}, h('div.gbody', { style: { marginTop: '8px' } }, PRIVACY[lang()].map(p => h('p', {}, p))))],
});

/* ───── Willkommen ───── */
export function welcome({ first = false } = {}) {
  const api = ui.sheet({
    title: '', full: true, right: () => (first ? h('div') : undefined),
    build: () => {
      const s = store.getSettings();
      const feat = (ic, color, b, sp) => h('div.feat', {}, h('div.ico.lg', { style: { background: color } }, icon(ic)), h('div', {}, h('b', {}, b), h('span', {}, sp)));
      return [h('div.welcome', {},
        h('div', { style: { display: 'flex', gap: '8px', marginBottom: '6px' } }, LANGS.map(c => h('button.chip' + (s.lang === c ? '' : '.gray'), { onclick: () => { setLangNow(c); store.setSettings({ lang: c, lang2: s.lang2 === c ? (c === 'de' ? 'none' : 'de') : s.lang2 }).then(() => api.reload()); } }, langName(c)))),
        h('h1', {}, t('welcome_title')), h('p', {}, t('welcome_text')),
        feat('wand', '#af52de', t('wf1'), t('wf1_t')), feat('languages', '#007aff', t('wf2'), t('wf2_t')), feat('lock', '#34c759', t('wf3'), t('wf3_t')), feat('clock', '#ff9500', t('wf4'), t('wf4_t')),
        isIOS() && !isStandalone() && h('div.warnbox', { style: { margin: '4px 0 16px' } }, icon('apple-share'), h('div', {}, t('install_text'))),
        h('div', { style: { display: 'grid', gap: '10px', marginTop: '8px' } },
          h('button.btn', { onclick: async () => { await store.setSettings({ onboarded: true }); api.close(); } }, t('lets_go')),
          h('button.btn.gray', { onclick: async () => { await store.setSettings({ onboarded: true }); api.close(); ui.switchTab('more'); ui.push(guideSpec()); } }, t('open_guide'))))];
    },
  });
  return api;
}
