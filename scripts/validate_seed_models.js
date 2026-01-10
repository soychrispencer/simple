import fs from 'node:fs';
const path = 'backend/supabase/migrations/20251114000001_seed_data_complete.sql';
const sql = fs.readFileSync(path, 'utf8');

const brandSections = [...sql.matchAll(/INSERT INTO public\.brands[\s\S]*?ON CONFLICT \(name\) DO NOTHING;/g)];
const definedBrands = new Set();
for (const section of brandSections) {
  for (const match of section[0].matchAll(/\('([^']+)',\s*(?:true|false)\)/g)) {
    definedBrands.add(match[1]);
  }
}

const modelRegex = /\(\(SELECT id FROM public\.brands WHERE name = '([^']+)'\),\s*'([^']+)',\s*\(SELECT id FROM public\.vehicle_types WHERE name = '([^']+)'/g;
const brandsWithModels = new Set();
const typeStats = new Map();
let modelMatch;
while ((modelMatch = modelRegex.exec(sql))) {
  const [_, brand, model, type] = modelMatch;
  brandsWithModels.add(brand);
  if (!typeStats.has(type)) {
    typeStats.set(type, new Map());
  }
  const brandMap = typeStats.get(type);
  if (!brandMap.has(brand)) {
    brandMap.set(brand, []);
  }
  brandMap.get(brand).push(model);
}

const referencedButMissing = [...brandsWithModels].filter((brand) => !definedBrands.has(brand)).sort();
const definedWithoutModels = [...definedBrands].filter((brand) => !brandsWithModels.has(brand)).sort();

console.log('Brands referenced without definition:', referencedButMissing.length);
if (referencedButMissing.length) {
  console.log(referencedButMissing.join(', '));
}
console.log('\nBrands defined without models:', definedWithoutModels.length);
console.log(definedWithoutModels.slice(0, 60).join(', ') + (definedWithoutModels.length > 60 ? ' ...' : ''));

console.log('\nModels per vehicle type:');
for (const [type, brandMap] of typeStats.entries()) {
  let count = 0;
  for (const models of brandMap.values()) {
    count += models.length;
  }
  console.log(`- ${type}: ${count} modelos, ${brandMap.size} marcas`);
}
