import fs from 'fs';
const files = ['screens','settings','flows','core','app','ui'].map(f => `js/${f}.js`).filter(f => fs.existsSync(f));
const keys = new Map();
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bt\(\s*'([a-z0-9_]+)'/g)) { (keys.get(m[1]) || keys.set(m[1], new Set()).get(m[1])).add(f.replace('js/', '')); }
}
console.log([...keys.keys()].sort().join('\n'));
console.error('\n' + keys.size + ' Schlüssel');
