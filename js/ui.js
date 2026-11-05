// UI-Gerüst: Tabs mit eigenem Navigationsstapel (Push/Pop wie iOS), Sheets, Aktionsmenü, Dialoge, Toasts.
import { h, icon, clear } from './util.js';

const tabs = {};            // id → {view, stack:[screen], build}
let current = null;
let tabbar, stage, toastBox;
let histDepth = 0;
let busyNav = false;

export function mount(root, defs, onTab) {
  stage = h('div#stage');
  toastBox = h('div#toasts');
  tabbar = h('nav#tabbar', { role: 'tablist' });
  root.append(stage, tabbar, toastBox);
  for (const d of defs) {
    const view = h('div.tabview');
    stage.append(view);
    tabs[d.id] = { view, stack: [], def: d };
    const b = h('button', { role: 'tab', 'aria-label': d.label, onclick: () => (current === d.id ? popToRoot(d.id) : switchTab(d.id)) }, icon(d.icon), h('span', {}, d.label), d.badgeEl = h('i.badge', { hidden: true }));
    d.btn = b;
    tabbar.append(b);
  }
  window.addEventListener('popstate', () => { if (histDepth > 0) { histDepth--; doPop(true); } });
  edgeSwipe();
  return { tabbar, stage };
}

export function setTabLabel(id, label) {
  const d = tabs[id].def; d.label = label;
  d.btn.querySelector('span').textContent = label; d.btn.setAttribute('aria-label', label);
}
export function setBadge(id, n) {
  const el = tabs[id].def.badgeEl;
  el.hidden = !n; el.textContent = n > 99 ? '99+' : n;
}

export function switchTab(id) {
  current = id;
  for (const [k, t] of Object.entries(tabs)) {
    t.view.classList.toggle('on', k === id);
    t.def.btn.classList.toggle('on', k === id);
    t.def.btn.setAttribute('aria-selected', k === id);
  }
  const t = tabs[id];
  if (!t.stack.length) { const s = createScreen(t.def.root()); t.view.append(s.el); t.stack.push(s); s.reload(); }
  return t;
}
export const currentTab = () => current;

export function popToRoot(id) {
  const t = tabs[id]; if (!t) return;
  if (t.stack.length > 1) {
    while (t.stack.length > 2) { t.stack.pop().el.remove(); }
    doPop(false, true);
  } else t.stack[0]?.scroll.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Neuen Bildschirm auf den Stapel des aktuellen Tabs legen. spec: {title, backLabel, right, large, render} */
export function push(spec) {
  const t = tabs[current];
  const prev = t.stack[t.stack.length - 1];
  const s = createScreen(spec, prev ? (typeof prev.title === 'function' ? prev.title() : prev.title) || ' ' : '');
  s.el.classList.add('enter');
  t.view.append(s.el);
  t.stack.push(s);
  s.reload();
  history.pushState({ d: ++histDepth }, '');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    s.el.classList.remove('enter');
    prev?.el.classList.add('under');
  }));
  return s;
}

export function back() { if (tabs[current].stack.length > 1) history.back(); }

function doPop(fromHistory, silent) {
  const t = tabs[current];
  if (t.stack.length < 2) return;
  const s = t.stack.pop();
  const prev = t.stack[t.stack.length - 1];
  if (!fromHistory && !silent) {}
  s.el.classList.add('leave');
  prev.el.classList.remove('under');
  setTimeout(() => s.el.remove(), 420);
}

function edgeSwipe() {
  let x0 = null, y0 = 0;
  document.addEventListener('touchstart', e => {
    const t = e.touches[0];
    x0 = t.clientX < 22 && tabs[current]?.stack.length > 1 ? t.clientX : null; y0 = t.clientY;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (x0 == null) return;
    const t = e.changedTouches[0];
    if (t.clientX - x0 > 70 && Math.abs(t.clientY - y0) < 60) back();
    x0 = null;
  }, { passive: true });
}

/** Alle sichtbaren Bildschirme neu zeichnen (nach Datenänderung). */
export function reloadAll() {
  for (const t of Object.values(tabs)) for (const s of t.stack) s.reload();
}

function createScreen(spec, backLabel = '') {
  const scroll = h('div.scroll');
  const titleEl = h('div.nb-title');
  const left = h('div.nb-left'), right = h('div.nb-right');
  const nav = h('div.navbar', {}, left, titleEl, right);
  const el = h('div.screen', {}, nav, scroll);
  const s = { el, scroll, title: spec.title, spec, reload: async () => {} };
  const isRoot = !backLabel && !spec.back;
  const paintNav = () => {
    clear(left); clear(right);
    if (!isRoot) left.append(h('button.nb-btn.back', { 'aria-label': 'Back', onclick: back }, icon('chev-l'), h('span', {}, spec.backLabel ?? backLabel)));
    else if (spec.left) left.append(...[].concat(spec.left));
    const r = typeof spec.right === 'function' ? spec.right(s) : spec.right;
    if (r) right.append(...[].concat(r).filter(Boolean));
    titleEl.textContent = typeof spec.title === 'function' ? spec.title() : spec.title || '';
  };
  let seq = 0;
  s.reload = async () => {
    const my = ++seq;
    const top = scroll.scrollTop;
    paintNav();
    let nodes;
    try { nodes = await spec.render(s); } catch (e) { console.error(e); nodes = [h('div.empty', {}, String(e?.message || e))]; }
    if (my !== seq) return;
    const first = !scroll.childNodes.length;
    clear(scroll);
    const ttl = typeof spec.title === 'function' ? spec.title() : spec.title;
    if (spec.large !== false && ttl) scroll.append(h('h1.large-title', {}, ttl));
    if (spec.subtitle) scroll.append(h('div.sub', {}, typeof spec.subtitle === 'function' ? spec.subtitle() : spec.subtitle));
    for (const n of [].concat(nodes)) if (n) scroll.append(n);
    if (!first) scroll.scrollTop = top;
    el.classList.toggle('scrolled', scroll.scrollTop > 30 || spec.large === false);
    spec.after?.(s);
  };
  scroll.addEventListener('scroll', () => el.classList.toggle('scrolled', scroll.scrollTop > 30 || spec.large === false), { passive: true });
  if (spec.large === false) el.classList.add('scrolled');
  return s;
}

/* ───── Sheets ───── */
let sheetCount = 0;
export function sheet({ title, left, right, build, full = false, onClose }) {
  const body = h('div.sh-body');
  const bar = h('div.sh-bar');
  const sh = h('div.sheet' + (full ? '.full' : ''), { role: 'dialog', 'aria-modal': 'true', 'aria-label': title || '' }, h('div.grab'), bar, body);
  const bd = h('div.backdrop', {}, sh);
  const api = {
    el: sh, body,
    close() {
      bd.classList.remove('on');
      setTimeout(() => { bd.remove(); sheetCount--; onClose?.(); }, 380);
    },
    paintBar() {
      clear(bar);
      const l = typeof left === 'function' ? left(api) : left;
      const r = typeof right === 'function' ? right(api) : right;
      bar.append(h('div.nb-left', {}, ...[].concat(l || [])), h('div.t', {}, title || ''), h('div.nb-right', {}, ...[].concat(r || [h('button.nb-btn.bold', { onclick: () => api.close() }, '✕')])));
    },
    async reload() { const n = await build(api); clear(body); body.append(...[].concat(n).filter(Boolean)); },
  };
  api.paintBar();
  bd.addEventListener('pointerdown', e => { if (e.target === bd) api.close(); });
  document.body.append(bd);
  sheetCount++;
  api.reload();
  requestAnimationFrame(() => requestAnimationFrame(() => bd.classList.add('on')));
  return api;
}

export function actionSheet({ title, items, cancel = 'Abbrechen' }) {
  return new Promise(res => {
    let done = false;
    const finish = v => { if (done) return; done = true; bd.classList.remove('on'); setTimeout(() => bd.remove(), 380); res(v); };
    const blk = h('div.blk', {}, title && h('div.hd', {}, title), ...items.map((it, i) => h('button' + (it.destructive ? '.destructive' : ''), { onclick: () => { try { it.run?.(); } finally { finish(it.value ?? i); } } }, it.icon && icon(it.icon), it.label)));
    const bd = h('div.backdrop', {}, h('div.actions', {}, blk, h('div.blk', {}, h('button.cancel', { onclick: () => finish(null) }, cancel))));
    bd.addEventListener('pointerdown', e => { if (e.target === bd) finish(null); });
    document.body.append(bd);
    requestAnimationFrame(() => requestAnimationFrame(() => bd.classList.add('on')));
  });
}

export function confirmDialog({ title, message, ok = 'OK', cancel = 'Abbrechen', destructive = false, single = false }) {
  return new Promise(res => {
    const finish = v => { bd.classList.remove('on'); setTimeout(() => bd.remove(), 300); res(v); };
    const bd = h('div.backdrop', { style: { alignItems: 'center' } },
      h('div.dialog', { role: 'alertdialog' },
        h('div.bd', {}, h('b', {}, title), message && h('span', {}, message)),
        h('div.bt', {}, !single && h('button', { onclick: () => finish(false) }, cancel), h('button' + (destructive ? '.destructive' : ''), { onclick: () => finish(true) }, ok))));
    document.body.append(bd);
    requestAnimationFrame(() => requestAnimationFrame(() => bd.classList.add('on')));
  });
}

export function toast(msg, kind = 'ok', ms = 2600) {
  const t = h('div.toast' + (kind === 'err' ? '.err' : ''), { role: 'status' }, icon(kind === 'err' ? 'alert' : 'check-circle'), msg);
  toastBox.append(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('on')));
  setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 500); }, ms);
}

export const navBtn = (label, onclick, opts = {}) =>
  h('button.nb-btn' + (opts.bold ? '.bold' : ''), { onclick, 'aria-label': opts['aria-label'] || (typeof label === 'string' ? label : '') }, label);
