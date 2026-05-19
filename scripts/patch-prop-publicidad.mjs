import fs from 'node:fs';

const propPath = 'apps/simplepropiedades/src/app/panel/publicidad/page.tsx';
const autosPath = 'apps/simpleautos/src/app/panel/publicidad/page.tsx';

const autosLines = fs.readFileSync(autosPath, 'utf8').split('\n');
const propLines = fs.readFileSync(propPath, 'utf8').split('\n');

const i0 = propLines.findIndex((l) => l.includes('grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6'));
const j0 = autosLines.findIndex((l) => l.includes('grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6'));

if (i0 < 0 || j0 < 0) {
  console.error('markers not found', { i0, j0 });
  process.exit(1);
}

let k1 = i0;
for (let i = i0; i < propLines.length; i++) {
  if (propLines[i].trim() === '</>') {
    k1 = i;
    break;
  }
}

const span = k1 - i0 + 1;
const chunk = autosLines
  .slice(j0, j0 + span)
  .join('\n')
  .replace(/autos-/g, 'prop-');

propLines.splice(i0, span, ...chunk.split('\n'));
fs.writeFileSync(propPath, propLines.join('\n'));
console.log(`patched ${propPath}: lines ${i0}-${k1} (${span} lines)`);
