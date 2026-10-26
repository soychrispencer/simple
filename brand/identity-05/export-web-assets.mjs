import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const productionApps = ['simpleagenda', 'simpleautos', 'simplepropiedades', 'simpleserenatas', 'simpleplataforma', 'simpleadmin'];
for (const id of productionApps) {
    const source = join(root, 'brand', 'identity-05', id);
    const output = join(root, 'apps', id, 'public');
    await mkdir(output, { recursive: true });
    for (const [svg, png, width] of [['negativo.svg', 'logo-light.png', 1200], ['avatar.svg', 'logo.png', 512], ['horizontal.svg', 'logo-horizontal.png', 1200]]) {
        const image = new Resvg(await readFile(join(source, svg)), { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: false } }).render().asPng();
        await writeFile(join(output, png), image);
    }
    for (const name of ['horizontal.svg', 'avatar.svg', 'micro-avatar.svg']) {
        await copyFile(join(source, name), join(output, 'brand-' + name));
    }
    if (id === 'simpleagenda') {
        await writeFile(join(output, 'favicon-48x48.png'), new Resvg(await readFile(join(source, 'micro-avatar.svg')), { fitTo: { mode: 'width', value: 48 } }).render().asPng());
    }
}
console.log('Six production asset sets exported. This script does not deploy applications.');
