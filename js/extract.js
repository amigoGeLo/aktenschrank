// Text aus Dateien lesen – alles lokal im Browser (PDF-Textebene, Word, Textdateien; Fotos/Scans per OCR).
import { loadScript, readAsArrayBuffer, extOf } from './util.js';

const THUMB_W = 260;
const MAX_TEXT = 60000;

let pdfjsP;
async function pdfjs() {
  pdfjsP ||= import('../vendor/pdfjs/pdf.min.mjs').then(m => {
    m.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
    return m;
  });
  return pdfjsP;
}
const base = p => new URL('../vendor/pdfjs/' + p, import.meta.url).href;

export function kindOf(file) {
  const e = extOf(file.name), t = file.type || '';
  if (t === 'application/pdf' || e === '.pdf') return 'pdf';
  if (t.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', '.gif', '.tif', '.tiff', '.bmp'].includes(e)) return 'image';
  if (e === '.docx') return 'docx';
  if (t.startsWith('text/') || ['.txt', '.md', '.csv', '.rtf'].includes(e)) return 'text';
  return 'file';
}

/**
 * @param {File} file
 * @param {{ocr:boolean, ocrLang:string, onStatus?:(s:string)=>void}} opt
 * @returns {Promise<{kind:string, text:string, pages:number, thumb:string|null, ocr:boolean, ocrFailed?:string}>}
 */
export async function extract(file, opt = {}) {
  const kind = kindOf(file);
  const out = { kind, text: '', pages: 1, thumb: null, ocr: false };
  const status = opt.onStatus || (() => {});
  try {
    if (kind === 'pdf') await fromPdf(file, out, opt, status);
    else if (kind === 'image') await fromImage(file, out, opt, status);
    else if (kind === 'docx') out.text = await fromDocx(file);
    else if (kind === 'text') out.text = (await file.text()).replace(/\r/g, '');
  } catch (e) {
    console.warn('extract failed', e);
    out.error = String(e?.message || e);
  }
  out.text = out.text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').slice(0, MAX_TEXT);
  return out;
}

/* ───── PDF ───── */
async function fromPdf(file, out, opt, status) {
  const lib = await pdfjs();
  const data = new Uint8Array(await readAsArrayBuffer(file));
  const pdf = await lib.getDocument({
    data,
    cMapUrl: base('cmaps/'), cMapPacked: true,
    standardFontDataUrl: base('standard_fonts/'),
    wasmUrl: base('wasm/'),
    useSystemFonts: true,
  }).promise;
  out.pages = pdf.numPages;
  const maxPages = Math.min(pdf.numPages, 8);
  let text = '';
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    let line = '', lastY = null, pageText = '';
    for (const it of tc.items) {
      if (!('str' in it)) continue;
      const y = it.transform?.[5];
      if (lastY !== null && Math.abs(y - lastY) > 3) { pageText += line.trim() + '\n'; line = ''; }
      line += it.str + (it.hasEOL ? '\n' : ' ');
      lastY = y;
    }
    pageText += line;
    text += pageText + '\n\n';
    if (i === 1) out.thumb = await thumbFromPage(page).catch(() => null);
  }
  out.text = text;
  const letters = (text.match(/\p{L}/gu) || []).length;
  if (letters < 40 && opt.ocr) {
    status('ocr');
    const canvases = [];
    const n = Math.min(pdf.numPages, 3);
    for (let i = 1; i <= n; i++) {
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale: 2 });
      const c = document.createElement('canvas');
      c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      canvases.push(c);
    }
    const r = await ocrCanvases(canvases, opt.ocrLang, status);
    if (r.error) out.ocrFailed = r.error; else { out.text = r.text; out.ocr = true; }
  }
  await pdf.destroy?.();
}

async function thumbFromPage(page) {
  const vp0 = page.getViewport({ scale: 1 });
  const scale = (THUMB_W * 2) / vp0.width;
  const vp = page.getViewport({ scale });
  const c = document.createElement('canvas');
  c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  return c.toDataURL('image/jpeg', 0.72);
}

/* ───── Bilder ───── */
async function bitmapOf(file) {
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = url; await img.decode();
      return img;
    } finally { setTimeout(() => URL.revokeObjectURL(url), 2000); }
  }
}
function drawScaled(bm, maxSide) {
  const w = bm.width, h = bm.height, s = Math.min(1, maxSide / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
  c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height);
  return c;
}

async function fromImage(file, out, opt, status) {
  const bm = await bitmapOf(file);
  out.thumb = drawScaled(bm, THUMB_W * 2).toDataURL('image/jpeg', 0.72);
  if (opt.ocr) {
    status('ocr');
    const c = drawScaled(bm, 2400);
    const r = await ocrCanvases([c], opt.ocrLang, status);
    if (r.error) out.ocrFailed = r.error; else { out.text = r.text; out.ocr = true; }
  }
  bm.close?.();
}

/* ───── OCR (Tesseract.js, wird bei Bedarf geladen und danach vom Gerät zwischengespeichert) ───── */
const TESS_VER = '5.1.1';
let worker, workerLang;
async function getWorker(lang, status) {
  if (worker && workerLang === lang) return worker;
  if (worker) { await worker.terminate().catch(() => {}); worker = null; }
  if (!window.Tesseract) await loadScript(`https://cdn.jsdelivr.net/npm/tesseract.js@${TESS_VER}/dist/tesseract.min.js`);
  worker = await window.Tesseract.createWorker(lang, 1, {
    langPath: 'https://tessdata.projectnaptha.com/4.0.0_fast',
    logger: m => { if (m.status === 'recognizing text') status('ocr:' + Math.round((m.progress || 0) * 100)); },
  });
  workerLang = lang;
  return worker;
}
async function ocrCanvases(canvases, lang = 'deu', status) {
  if (!navigator.onLine && !window.Tesseract) return { error: 'offline' };
  try {
    const w = await getWorker(lang, status);
    let text = '';
    for (const c of canvases) {
      const r = await w.recognize(c);
      text += (r.data?.text || '') + '\n\n';
    }
    return { text };
  } catch (e) {
    console.warn('OCR failed', e);
    return { error: String(e?.message || e) };
  }
}

/* ───── Word (.docx) ───── */
async function fromDocx(file) {
  if (!window.JSZip) await loadScript(new URL('../vendor/jszip.min.js', import.meta.url).href);
  const zip = await window.JSZip.loadAsync(await readAsArrayBuffer(file));
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) return '';
  return xml
    .replace(/<\/w:p>/g, '\n').replace(/<w:tab\/>/g, '\t').replace(/<w:br\/>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}
