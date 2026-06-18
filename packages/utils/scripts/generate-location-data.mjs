/**
 * Genera JSON por país desde country-state-city (estados + ciudades).
 *   node scripts/generate-location-data.mjs
 */
import { City, State } from 'country-state-city';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const COUNTRY_CODES = [
    'MX', 'AR', 'CO', 'PE', 'ES', 'VE', 'EC', 'UY', 'PY', 'BO',
    'CR', 'PA', 'GT', 'HN', 'SV', 'NI', 'CU', 'GQ', 'DO', 'PR', 'DE', 'US',
];

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'locations');
fs.mkdirSync(outDir, { recursive: true });

for (const code of COUNTRY_CODES) {
    const states = State.getStatesOfCountry(code) ?? [];
    const citiesByRegion = {};
    for (const state of states) {
        const cities = City.getCitiesOfState(code, state.isoCode) ?? [];
        citiesByRegion[state.isoCode] = cities
            .map((city) => city.name)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, 'es'));
    }
    const payload = {
        countryCode: code,
        regions: states
            .map((state) => ({ id: state.isoCode, name: state.name, code: state.isoCode }))
            .sort((a, b) => a.name.localeCompare(b.name, 'es')),
        citiesByRegion,
    };
    const filePath = path.join(outDir, `${code.toLowerCase()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(payload));
    const cityCount = Object.values(citiesByRegion).reduce((sum, list) => sum + list.length, 0);
    console.log(`${code}: ${states.length} regiones, ${cityCount} ciudades → ${filePath}`);
}

// Puerto Rico no tiene estados en country-state-city; catálogo manual.
const prPath = path.join(outDir, 'pr.json');
fs.writeFileSync(prPath, JSON.stringify({
    countryCode: 'PR',
    regions: [{ id: 'PR', name: 'Puerto Rico', code: 'PR' }],
    citiesByRegion: {
        PR: [
            'Adjuntas', 'Aguadilla', 'Arecibo', 'Bayamón', 'Caguas', 'Carolina',
            'Guaynabo', 'Humacao', 'Mayagüez', 'Ponce', 'San Juan', 'Trujillo Alto',
        ],
    },
}));
console.log('PR: 1 región, 12 ciudades →', prPath);
