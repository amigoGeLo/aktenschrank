// Sicherung & Wiederherstellung, Teilen, Kalender-Termine, optionales Spiegeln in einen Ordner.
import { loadScript, safeName, extOf, download } from './util.js';
import { CAT_BY_ID, TYPE_BY_ID } from './catalog.js';
import * as store from './store.js';

async function JSZip() {
  if (!window.JSZip) await loadScript(new URL('../vendor/jszip.min.js', import.meta.url).href);
  return window.JSZip;
}

export function docPath(d) {
  const cat = CAT_BY_ID[d.cat]?.n[0] || 'Sonstiges';
  const type = TYPE_BY_ID[d.type]?.n[0] || 'Nicht zugeordnet';
  const ext = extOf(d.name) || '';
  const title = safeName(d.title || d.name).replace(new RegExp(ext.replace('.', '\\.') + '$', 'i'), '');
  return `${safeName(cat, 60)}/${safeName(type, 60)}/${title}${ext}`;
}

/** ZIP mit Ordnerstruktur + _aktenschrank-daten.json (für verlustfreie Wiederherstellung). */
export async function buildBackup(onProgress = () => {}) {
  const Z = await JSZip();
  const zip = new Z();
  const docs = await store.allDocs();
  const used = new Set();
  const meta = [];
  let i = 0;
  for (const d of docs) {
    let p = docPath(d);
    while (used.has(p.toLowerCase())) p = p.replace(/(\.[a-z0-9]+)?$/i, ` (${used.size})$1`);
    used.add(p.toLowerCase());
    const blob = await store.getBlob(d.id);
    if (blob) zip.file('Aktenschrank/' + p, blob);
    meta.push({ ...d, _path: p, _hasFile: !!blob });
    onProgress(++i, docs.length);
  }
  const s = { ...store.getSettings() }; delete s.apiKey;
  zip.file('Aktenschrank/_aktenschrank-daten.json', JSON.stringify({ app: 'aktenschrank', v: 1, created: new Date().toISOString(), settings: s, learn: store.getLearn(), docs: meta }));
  zip.file('Aktenschrank/LIESMICH.txt', 'Sicherung deiner Dokumente aus der Aktenschrank-App.\nDie Ordner entsprechen der Sortierung in der App.\nZum Wiederherstellen: App → Mehr → Daten → „Sicherung wiederherstellen“ und diese ZIP-Datei wählen.\nDie Datei _aktenschrank-daten.json nicht löschen oder verändern.\n');
  return zip.generateAsync({ type: 'blob', compression: 'STORE' });
}

export async function restoreBackup(file, onProgress = () => {}) {
  const Z = await JSZip();
  const zip = await Z.loadAsync(file);
  const metaFile = Object.values(zip.files).find(f => f.name.endsWith('_aktenschrank-daten.json'));
  if (!metaFile) throw new Error('no-data-file');
  const data = JSON.parse(await metaFile.async('string'));
  if (data.app !== 'aktenschrank') throw new Error('bad-file');
  const root = metaFile.name.replace('_aktenschrank-daten.json', '');
  const have = new Set((await store.allDocs()).map(d => d.id));
  let added = 0, i = 0;
  for (const d of data.docs) {
    onProgress(++i, data.docs.length);
    if (have.has(d.id)) continue;
    const { _path, _hasFile, ...doc } = d;
    let blob = null;
    if (_hasFile) {
      const f = zip.file(root + _path);
      if (f) blob = new Blob([await f.async('arraybuffer')], { type: doc.mime || '' });
    }
    await store.putDoc(doc, blob);
    added++;
  }
  if (data.learn) {
    const cur = store.getLearn();
    if (!Object.keys(cur.types || {}).length) await store.saveLearn(data.learn);
  }
  if (data.settings && !store.getSettings().onboarded) await store.setSettings({ ...data.settings, onboarded: true });
  return { added, total: data.docs.length };
}

/** Teilen über das System-Menü (iPhone: „In Dateien sichern“ → iCloud Drive). Fallback: Download. */
export async function shareOrDownload(blob, filename, title) {
  const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: title || filename });
      return 'shared';
    }
  } catch (e) {
    if (e?.name === 'AbortError') return 'cancelled';
  }
  download(blob, filename);
  return 'downloaded';
}

/* ───── Kalender (.ics) ───── */
const icsEsc = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
export function makeICS({ title, date, description, remindDays = [7, 1] }) {
  const d = date.replace(/-/g, '');
  const next = new Date(date + 'T12:00:00Z'); next.setUTCDate(next.getUTCDate() + 1);
  const end = next.toISOString().slice(0, 10).replace(/-/g, '');
  const uid = Math.random().toString(36).slice(2) + '@aktenschrank';
  const alarms = remindDays.map(n => `BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:${icsEsc(title)}\r\nTRIGGER:-P${n}D\r\nEND:VALARM`).join('\r\n');
  return new Blob([
    ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Aktenschrank//DE', 'BEGIN:VEVENT', `UID:${uid}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d+/g, '')}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${icsEsc(title)}`, `DESCRIPTION:${icsEsc(description)}`, alarms, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n'),
  ], { type: 'text/calendar' });
}

/* ───── Ordner spiegeln (Chrome/Edge/Android/Desktop; iOS-Safari unterstützt das nicht) ───── */
export const canPickFolder = () => 'showDirectoryPicker' in window;

export async function pickFolder() {
  const handle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'aktenschrank' });
  await store.kvSet('folderHandle', handle);
  return handle;
}
export async function syncToFolder(onProgress = () => {}) {
  let handle = await store.kvGet('folderHandle', null);
  if (!handle) throw new Error('no-folder');
  if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
    if ((await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') throw new Error('denied');
  }
  const docs = await store.allDocs();
  let written = 0, i = 0;
  for (const d of docs) {
    onProgress(++i, docs.length);
    const blob = await store.getBlob(d.id);
    if (!blob) continue;
    const parts = docPath(d).split('/');
    const fname = parts.pop();
    let dir = handle;
    for (const p of parts) dir = await dir.getDirectoryHandle(p, { create: true });
    let exists = false;
    try { const f = await (await dir.getFileHandle(fname)).getFile(); exists = f.size === blob.size; } catch {}
    if (exists) continue;
    const w = await (await dir.getFileHandle(fname, { create: true })).createWritable();
    await w.write(blob); await w.close();
    written++;
  }
  return { written, total: docs.length };
}
