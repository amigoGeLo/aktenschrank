// Installations-Sperre (iPhone/iPad): Wer die App nur im Browser-Tab öffnet, sieht zuerst die Anleitung zum Installieren.
// Grund: Browser-Tab und installierte App haben getrennte Speicher – Dokumente aus dem Tab wären nach dem Installieren weg.
// Darum startet die App im Browser gar nicht erst (kein Speicher, kein Service Worker).
// Ausnahme für Entwickler/Tests: Adresse mit ?browser=1 öffnen.
import { h, icon, isIOS, isStandalone } from './util.js';
import { STRINGS, LANGS } from './i18n.js';
import { ICON_SPRITE } from './icons.js';

const NAMES = { de: 'Deutsch', ru: 'Русский', en: 'English' };

/** Reine Entscheidung (testbar): Sperre nur auf iOS im Browser – nicht in der installierten App und nicht in der nativen Hülle. */
export function gateNeeded({ ios, standalone, native, search = '' }) {
  if (!ios || standalone || native) return false;
  return !/[?&]browser=1(?:&|$)/.test(search);
}

export const needsInstall = () => gateNeeded({
  ios: isIOS(),
  standalone: isStandalone(),
  native: !!window.Capacitor?.isNativePlatform?.(),
  search: location.search,
});

const tx = (key, lang) => STRINGS[key][LANGS.indexOf(lang)];
const preferred = () => {
  const l = (navigator.languages?.[0] || navigator.language || 'de').slice(0, 2).toLowerCase();
  return LANGS.includes(l) ? l : 'de';
};

/** Zeigt die Anleitung in allen drei Sprachen (Sprache des Geräts zuerst). Fasst weder IndexedDB noch den Service Worker an. */
export function showInstallGate() {
  const first = preferred();
  const order = [first, ...LANGS.filter(l => l !== first)];

  const holder = document.createElement('div');
  holder.innerHTML = ICON_SPRITE;
  document.body.prepend(holder.firstChild);

  const label = h('span', {}, tx('gate_copy', first));
  const copy = h('button.gate-copy', {
    onclick: async () => {
      try { await navigator.clipboard.writeText(location.origin + location.pathname); label.textContent = tx('gate_copied', first); } catch { /* Zwischenablage nicht erlaubt */ }
    },
  }, icon('copy'), label);

  const card = lang => h('section.gate-lang', { lang },
    h('div.gate-tag', {}, NAMES[lang]),
    h('h2', {}, tx('gate_title', lang)),
    h('p', {}, tx('gate_lead', lang)),
    h('ol', {}, ['gate_s1', 'gate_s2', 'gate_s3'].map(k => h('li', {}, tx(k, lang)))));

  document.getElementById('app').replaceChildren(
    h('div.gate', {}, h('div.gate-in', {},
      h('div.gate-head', {}, h('img.gate-ico', { src: 'icons/icon-180.png', alt: '', width: 72, height: 72 }), h('div.gate-name', {}, 'Aktenschrank')),
      card(order[0]), copy, card(order[1]), card(order[2]))));
  document.title = 'Aktenschrank – ' + tx('gate_title', first);
}
