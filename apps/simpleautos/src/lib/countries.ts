import countries from 'i18n-iso-countries';
import esLocale from 'i18n-iso-countries/langs/es.json';

// Registro único (idempotente) del locale español.
let registered = false;
export function ensureCountriesEs() {
  if (!registered) {
    countries.registerLocale(esLocale as any);
    registered = true;
  }
  return countries;
}

export function getCountryOptionsEs(prioritizeCodes: string[] = ['CL']) {
  ensureCountriesEs();
  const names = countries.getNames('es', { select: 'official' }) as Record<string,string>;
  const entries = Object.entries(names).map(([code, name]) => ({ label: name, value: code }));
  if (!prioritizeCodes.length) return entries;
  const prioritized: { label:string; value:string }[] = [];
  const rest: { label:string; value:string }[] = [];
  for (const opt of entries) {
    if (prioritizeCodes.includes(opt.value)) prioritized.push(opt); else rest.push(opt);
  }
  return [...prioritized, ...rest];
}


