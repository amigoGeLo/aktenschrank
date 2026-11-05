# Aktenschrank

Persönliche Dokumentenablage als iPhone-App (PWA). Alles bleibt lokal auf dem Gerät (IndexedDB), kein Server.

## Veröffentlichen (GitHub Pages)
1. Alle Dateien dieses Ordners (außer `tools/` und `tests/`, die sind optional) in das Repository `aktenschrank` hochladen, Branch `main`, Wurzelverzeichnis.
2. Settings → Pages → Branch `main` / root.
3. Auf dem iPhone in **Safari** öffnen → Teilen → „Zum Home-Bildschirm“. Nur die installierte App ist vor dem iOS-Aufräumen (7 Tage) geschützt.

## Nach Änderungen
In `sw.js` `VERSION` erhöhen, damit installierte Apps die neuen Dateien laden.

## Technik
Reines ES-Module-JavaScript, kein Build. `vendor/` enthält pdf.js, JSZip und pdf-lib lokal. Texterkennung (Tesseract.js) wird beim ersten Gebrauch aus dem Internet nachgeladen.
`node tools/check-data.mjs` prüft den Katalog, `node tests/classify.test.mjs` die Klassifikation.
