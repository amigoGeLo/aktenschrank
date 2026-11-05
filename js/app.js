// Start der App
import * as store from './store.js';
import * as ui from './ui.js';
import { ICON_SPRITE } from './icons.js';
import { setLangNow, t, LANGS } from './i18n.js';
import { ingest } from './flows.js';
import { isInbox } from './core.js';
import { homeSpec, inboxSpec, searchSpec, goInbox } from './screens.js';
import { moreSpec, welcome } from './settings.js';

const TABS = [
  { id: 'files', icon: 'folder', key: 'files_tab', root: () => homeSpec() },
  { id: 'inbox', icon: 'inbox', key: 'inbox', root: () => inboxSpec() },
  { id: 'search', icon: 'search', key: 'search', root: () => searchSpec() },
  { id: 'more', icon: 'more', key: 'more', root: () => moreSpec() },
];

function detectLang() {
  const l = (navigator.languages?.[0] || navigator.language || 'de').slice(0, 2).toLowerCase();
  const lang = LANGS.includes(l) ? l : 'de';
  // Wer nicht Deutsch spricht, sieht deutsche Begriffe klein unter der eigenen Sprache.
  return { lang, lang2: lang === 'de' ? 'none' : 'de' };
}

async function refreshInboxBadge() {
  const docs = await store.allDocs();
  ui.setBadge('inbox', docs.filter(isInbox).length);
}

function relabel() { for (const d of TABS) ui.setTabLabel(d.id, t(d.key)); }

async function boot() {
  await store.init();
  let s = store.getSettings();
  if (!s.onboarded && s.lang === 'de' && !(await store.kvGet('langSet', false))) {
    const d = detectLang();
    await store.setSettings(d);
    await store.kvSet('langSet', true);
    s = store.getSettings();
  }
  setLangNow(s.lang);

  const holder = document.createElement('div');
  holder.innerHTML = ICON_SPRITE;
  document.body.prepend(holder.firstChild);

  const root = document.getElementById('app');
  ui.mount(root, TABS.map(d => ({ id: d.id, icon: d.icon, label: t(d.key), root: d.root })));
  ui.switchTab('files');

  let lastLang = s.lang;
  store.onChange(() => {
    const cur = store.getSettings().lang;
    if (cur !== lastLang) { lastLang = cur; setLangNow(cur); relabel(); }
    ui.reloadAll();
    refreshInboxBadge();
  });
  refreshInboxBadge();

  // Dateien auswählen / Kamera / Drag & Drop
  const onPick = e => { const f = [...e.target.files]; e.target.value = ''; ingest(f, { goInbox }); };
  document.getElementById('in-files').addEventListener('change', onPick);
  document.getElementById('in-cam').addEventListener('change', onPick);
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer?.files?.length) ingest(e.dataTransfer.files, { goInbox }); });

  if (!s.onboarded) welcome({ first: true });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  window.__aktenschrank = { store, ui };
}

boot().catch(e => {
  console.error(e);
  document.getElementById('app').innerHTML = '<pre style="padding:24px;white-space:pre-wrap;font:14px system-ui">Fehler beim Start: ' + String(e?.message || e).replace(/</g, '&lt;') + '</pre>';
});
