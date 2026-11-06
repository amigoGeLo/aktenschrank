// App-Sperre: 6-stelliger Code (PBKDF2-Hash) + optional Face ID / Touch ID über WebAuthn (nur lokal, kein Server).
// Wichtig: Das ist eine Sichtsperre gegen neugierige Blicke. Die Dokumente selbst sind nicht verschlüsselt.
import { h, icon } from './util.js';
import * as store from './store.js';
import { t } from './i18n.js';

const KEY = 'lock';
const LEN = 6;
let cfg = null;           // {salt, hash, bio, after}
let overlay = null, locked = false, hiddenAt = 0, fails = 0, blockedUntil = 0;

const enc = new TextEncoder();
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function hashPin(pin, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(salt), iterations: 200000 }, key, 256);
  return b64(bits);
}
const save = () => store.kvSet(KEY, cfg);

export const hasLock = () => !!cfg?.hash;
export const lockConfig = () => ({ bio: !!cfg?.bio, after: cfg?.after ?? 0 });

export async function setPin(pin) {
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
  cfg = { ...(cfg || {}), salt, hash: await hashPin(pin, salt), after: cfg?.after ?? 0 };
  await save();
}
export async function verifyPin(pin) {
  if (!cfg?.hash) return true;
  return (await hashPin(pin, cfg.salt)) === cfg.hash;
}
export async function removeLock() { cfg = null; await store.kvSet(KEY, null); hideOverlay(); }
export async function setAfter(sec) { if (cfg) { cfg.after = sec; await save(); } }

/* ───── Face ID / Touch ID ───── */
export async function bioSupported() {
  try { return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch { return false; }
}
export async function enableBio() {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'Aktenschrank' },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'aktenschrank', displayName: 'Aktenschrank' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60000,
    },
  });
  cfg.bio = b64(cred.rawId); await save();
}
export async function disableBio() { if (cfg) { cfg.bio = null; await save(); } }
async function bioUnlock() {
  if (!cfg?.bio) return false;
  try {
    await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id: unb64(cfg.bio) }], userVerification: 'required', timeout: 60000 } });
    return true;
  } catch { return false; }
}

/* ───── Ziffernblock (auch zum Festlegen des Codes) ───── */
export function pinPad({ title, sub, onDone, onBio, cancel }) {
  let val = '';
  const dots = h('div.pin-dots', {}, ...Array.from({ length: LEN }, () => h('i')));
  const msg = h('div.pin-sub', {}, sub || '');
  const paint = () => [...dots.children].forEach((d, i) => d.classList.toggle('on', i < val.length));
  const api = {
    reset(m, bad) { val = ''; paint(); msg.textContent = m ?? sub ?? ''; msg.classList.toggle('bad', !!bad); if (bad) { dots.classList.remove('shake'); void dots.offsetWidth; dots.classList.add('shake'); } },
  };
  const press = async d => {
    if (val.length >= LEN) return;
    val += d; paint();
    if (val.length === LEN) { const v = val; await onDone(v, api); }
  };
  const key = d => h('button.pin-key', { 'aria-label': String(d), onclick: () => press(String(d)) }, String(d));
  const del = h('button.pin-key.ghost', { 'aria-label': 'Delete', onclick: () => { val = val.slice(0, -1); paint(); } }, icon('delete'));
  const left = onBio ? h('button.pin-key.ghost', { 'aria-label': 'Face ID', onclick: onBio }, icon('scan-face')) : cancel ? h('button.pin-key.ghost.txt', { onclick: cancel }, t('cancel')) : h('span');
  const el = h('div.pin', {}, h('div.pin-lock', {}, icon('lock')), h('div.pin-title', {}, title), msg, dots,
    h('div.pin-grid', {}, ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(key), left, key(0), del));
  return Object.assign(el, { api });
}

/* ───── Sperrbildschirm ───── */
function buildOverlay() {
  overlay = h('div#lock', { role: 'dialog', 'aria-modal': 'true', 'aria-label': t('lock_title') });
  document.body.append(overlay);
}
async function tryUnlock(pin, api) {
  if (Date.now() < blockedUntil) { api.reset(t('lock_wait', Math.ceil((blockedUntil - Date.now()) / 1000)), true); return; }
  if (await verifyPin(pin)) { fails = 0; unlock(); return; }
  fails++;
  if (fails >= 5) { blockedUntil = Date.now() + Math.min(300, 15 * 2 ** (fails - 5)) * 1000; api.reset(t('lock_wait', Math.ceil((blockedUntil - Date.now()) / 1000)), true); }
  else api.reset(t('lock_wrong'), true);
}
function showLock(auto = true) {
  if (!hasLock()) return;
  locked = true;
  if (!overlay) buildOverlay();
  overlay.replaceChildren(pinPad({ title: t('lock_title'), sub: t('lock_enter'), onDone: tryUnlock, onBio: cfg.bio ? () => doBio() : null }));
  overlay.classList.add('on');
  document.body.classList.add('is-locked');
  if (auto && cfg.bio) doBio();
}
async function doBio() { if (await bioUnlock()) unlock(); }
function unlock() { locked = false; hideOverlay(); }
function hideOverlay() { overlay?.classList.remove('on', 'cover'); document.body.classList.remove('is-locked'); locked = false; }
export function lockNow() { showLock(false); }

export async function initLock() {
  cfg = await store.kvGet(KEY, null);
  if (cfg && !cfg.hash) cfg = null;
  if (hasLock()) showLock();
  document.addEventListener('visibilitychange', () => {
    if (!hasLock()) return;
    if (document.hidden) {
      hiddenAt = Date.now();
      // App-Umschalter soll keinen Inhalt zeigen
      if (!overlay) buildOverlay();
      if (!locked) { overlay.replaceChildren(h('div.pin-cover', {}, icon('lock'))); overlay.classList.add('on', 'cover'); }
    } else {
      const away = (Date.now() - hiddenAt) / 1000;
      if (!locked && away >= (cfg.after || 0)) showLock();
      else if (!locked) overlay.classList.remove('on', 'cover');
    }
  });
}
