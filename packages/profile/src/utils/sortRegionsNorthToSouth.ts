export type RegionLike = {
  name?: string | null;
  code?: string | null;
};

function normalizeRegionKey(raw: string) {
  return (raw || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function regionNorthToSouthOrder(region: RegionLike) {
  const rawCode = (region.code || '').trim().toUpperCase();
  const cleanedCode = rawCode
    .replace(/^CL[-_]?/i, '')
    .replace(/^REG(?:ION)?\s*/i, '')
    .replace(/^R/i, '')
    .replace(/[^0-9A-Z]/g, '');

  const orderMap: Record<string, number> = {
    XV: 1,
    '15': 1,
    I: 2,
    '1': 2,
    II: 3,
    '2': 3,
    III: 4,
    '3': 4,
    IV: 5,
    '4': 5,
    V: 6,
    '5': 6,
    RM: 7,
    METROPOLITANA: 7,
    '13': 7,
    VI: 8,
    '6': 8,
    VII: 9,
    '7': 9,
    XVI: 10,
    '16': 10,
    VIII: 11,
    '8': 11,
    IX: 12,
    '9': 12,
    XIV: 13,
    '14': 13,
    X: 14,
    '10': 14,
    XI: 15,
    '11': 15,
    XII: 16,
    '12': 16,
  };

  const mapped = orderMap[cleanedCode] ?? orderMap[rawCode];
  if (mapped != null) return mapped;

  const numeric = Number.parseInt(cleanedCode, 10);
  if (Number.isFinite(numeric)) return numeric;

  const name = normalizeRegionKey(region.name || '');
  const nameOrder: Array<[string, number]> = [
    ['arica', 1],
    ['parinacota', 1],
    ['tarapaca', 2],
    ['antofagasta', 3],
    ['atacama', 4],
    ['coquimbo', 5],
    ['valparaiso', 6],
    ['metropolitana', 7],
    ['santiago', 7],
    ["o'higgins", 8],
    ['ohiggins', 8],
    ['libertador', 8],
    ['maule', 9],
    ['nuble', 10],
    ['biobio', 11],
    ['araucania', 12],
    ['los rios', 13],
    ['los lagos', 14],
    ['aysen', 15],
    ['magallanes', 16],
    ['antartica', 16],
  ];

  for (const [token, order] of nameOrder) {
    if (name.includes(token)) return order;
  }

  return 999;
}

export function sortRegionsNorthToSouth<T extends RegionLike>(rows: T[]) {
  return (rows || []).slice().sort((a, b) => {
    const ao = regionNorthToSouthOrder(a);
    const bo = regionNorthToSouthOrder(b);
    if (ao !== bo) return ao - bo;
    return String(a.name || '').localeCompare(String(b.name || ''), 'es');
  });
}
