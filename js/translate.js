// Übersetzung des Dokumenttextes. Drei Wege, vom privatesten zum bequemsten:
//  1) Geräteeigene Übersetzung des Browsers (Translator API, falls vorhanden) – bleibt auf dem Gerät.
//  2) Optional: KI-Übersetzung über den eigenen Anthropic-API-Schlüssel (sendet den Text an Anthropic!).
//  3) Immer verfügbar: Text markieren → „Übersetzen“ im iOS-Menü (System-Übersetzer).

export const LANG_NAME = { ru: 'Russian', en: 'English', de: 'German' };

export async function nativeAvailable(target) {
  try {
    if (!('Translator' in self)) return false;
    const a = await self.Translator.availability({ sourceLanguage: 'de', targetLanguage: target });
    return a !== 'unavailable';
  } catch { return false; }
}

export async function nativeTranslate(text, target, onProgress) {
  const t = await self.Translator.create({
    sourceLanguage: 'de', targetLanguage: target,
    monitor(m) { m.addEventListener('downloadprogress', e => onProgress?.(Math.round(e.loaded * 100))); },
  });
  const paras = text.split(/\n{2,}/).filter(Boolean);
  const out = [];
  for (const p of paras) out.push(await t.translate(p.slice(0, 4000)));
  return { translation: out.join('\n\n'), summary: '', engine: 'device' };
}

export async function claudeTranslate({ apiKey, text, target, typeName }) {
  const lang = LANG_NAME[target] || 'English';
  const prompt = `Du bekommst den Text eines deutschen Dokuments (${typeName || 'Dokument'}), per Texterkennung gelesen (kann Fehler enthalten).\n` +
    `Aufgabe 1: Fasse in höchstens 4 kurzen Sätzen auf ${lang} zusammen, worum es geht, was der Absender verlangt oder mitteilt und welche Fristen/Beträge genannt sind.\n` +
    `Aufgabe 2: Übersetze den gesamten Text vollständig und möglichst wortgetreu ins ${lang}. Behalte Absätze, Zahlen, Daten, Beträge und Aktenzeichen unverändert. Erfinde nichts; unlesbare Stellen kennzeichnest du mit [unleserlich].\n` +
    `Antworte exakt in diesem Format:\n### SUMMARY\n<Zusammenfassung>\n### TRANSLATION\n<Übersetzung>\n\n--- DOKUMENTTEXT ---\n${text.slice(0, 24000)}`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: 'claude-sonnet-5-5', max_tokens: 8000, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) {
    let msg = res.status + '';
    try { msg += ' ' + (await res.json()).error?.message; } catch {}
    throw new Error(msg);
  }
  const j = await res.json();
  const out = (j.content || []).map(c => c.text || '').join('');
  const m = /###\s*SUMMARY\s*([\s\S]*?)###\s*TRANSLATION\s*([\s\S]*)$/i.exec(out);
  return m ? { summary: m[1].trim(), translation: m[2].trim(), engine: 'claude' } : { summary: '', translation: out.trim(), engine: 'claude' };
}
