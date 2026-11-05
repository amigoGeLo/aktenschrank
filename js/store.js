// Lokaler Speicher: alles liegt in IndexedDB auf dem Gerät. Es gibt keinen Server.
import { emptyLearn } from './classify.js';

const DB_NAME = 'aktenschrank';
const DB_VER = 1;
let dbp;
const listeners = new Set();

function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('docs')) db.createObjectStore('docs', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'k' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}

const wrap = req => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
async function tx(stores, mode, fn) {
  const db = await open();
  const t = db.transaction(stores, mode);
  const out = await fn(...[].concat(stores).map(s => t.objectStore(s)));
  await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
  return out;
}

export const onChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });

/* ───── kv ───── */
export async function kvGet(k, def) {
  const r = await tx('kv', 'readonly', s => wrap(s.get(k)));
  return r ? r.v : def;
}
export async function kvSet(k, v) { await tx('kv', 'readwrite', s => wrap(s.put({ k, v }))); }

/* ───── Einstellungen ───── */
export const DEFAULTS = {
  lang: 'de',            // Oberflächensprache
  lang2: 'none',         // Zweitsprache unter den deutschen Namen: none | ru | en
  auto: 'normal',        // ask | normal | generous
  ocr: true,             // Texterkennung für Fotos/Scans
  ocrLang: 'deu',        // deu | deu+eng | deu+rus
  apiKey: '',            // optional, nur für KI-Übersetzung
  aiOn: false,
  persons: [],           // [{id,name}]
  lastBackup: null,
  onboarded: false,
};
export const AUTO_THRESHOLD = { ask: 2, normal: 0.55, generous: 0.38 };

let settings = { ...DEFAULTS };
let learnObj = emptyLearn();
let docsCache = null;

export async function init() {
  settings = { ...DEFAULTS, ...(await kvGet('settings', {})) };
  learnObj = (await kvGet('learn', null)) || emptyLearn();
  docsCache = null;
  return settings;
}
export const getSettings = () => settings;
export async function setSettings(patch) {
  settings = { ...settings, ...patch };
  await kvSet('settings', settings);
  emit();
}
export const getLearn = () => learnObj;
export async function saveLearn(l) { learnObj = l; await kvSet('learn', l); }

/* ───── Dokumente ───── */
export async function allDocs() {
  if (!docsCache) docsCache = await tx('docs', 'readonly', s => wrap(s.getAll()));
  return docsCache;
}
export async function getDoc(id) { return (await allDocs()).find(d => d.id === id) || null; }

export async function putDoc(doc, blob) {
  await tx(blob ? ['docs', 'blobs'] : ['docs'], 'readwrite', (d, b) => {
    d.put(doc);
    if (blob) b.put({ id: doc.id, blob });
  });
  docsCache = null;
  emit();
}
export async function updateDoc(id, patch) {
  const d = await getDoc(id);
  if (!d) return null;
  const nd = { ...d, ...patch };
  await tx('docs', 'readwrite', s => wrap(s.put(nd)));
  docsCache = null;
  emit();
  return nd;
}
export async function getBlob(id) {
  const r = await tx('blobs', 'readonly', s => wrap(s.get(id)));
  return r?.blob || null;
}
export async function deleteDoc(id) {
  await tx(['docs', 'blobs'], 'readwrite', (d, b) => { d.delete(id); b.delete(id); });
  docsCache = null;
  emit();
}
export async function wipeAll() {
  await tx(['docs', 'blobs', 'kv'], 'readwrite', (d, b, k) => { d.clear(); b.clear(); k.clear(); });
  docsCache = null;
  settings = { ...DEFAULTS };
  learnObj = emptyLearn();
  emit();
}

/* ───── Speicher ───── */
export async function storageInfo() {
  const out = { usage: 0, quota: 0, persisted: false };
  try {
    const e = await navigator.storage?.estimate?.();
    out.usage = e?.usage || 0; out.quota = e?.quota || 0;
    out.persisted = (await navigator.storage?.persisted?.()) || false;
  } catch {}
  return out;
}
export async function requestPersist() {
  try { return (await navigator.storage?.persist?.()) || false; } catch { return false; }
}
