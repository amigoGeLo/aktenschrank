// Baut den Ordner www/ für die iOS-App: kopiert die Web-App und bündelt die nativen Plugins.
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const out = 'www';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const e of ['index.html', 'privacy.html', 'impressum.html', 'manifest.webmanifest', 'css', 'js', 'data', 'vendor', 'icons']) {
  if (fs.existsSync(e)) fs.cpSync(e, path.join(out, e), { recursive: true });
}
await build({ entryPoints: ['native/entry.js'], bundle: true, format: 'iife', outfile: path.join(out, 'native.js'), minify: true, target: 'es2020' });
// native.js vor der App laden
const f = path.join(out, 'index.html');
let html = fs.readFileSync(f, 'utf8');
if (!html.includes('native.js')) html = html.replace('<script type="module" src="js/app.js"></script>', '<script src="native.js"></script>\n<script type="module" src="js/app.js"></script>');
fs.writeFileSync(f, html);
console.log('www fertig:', fs.readdirSync(out).join(', '));
