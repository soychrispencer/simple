export type VehicleCatalogType =
    | 'car'
    | 'motorcycle'
    | 'truck'
    | 'bus'
    | 'machinery'
    | 'nautical'
    | 'aerial';

export interface CatalogBrand {
    id: string;
    name: string;
    vehicleTypes: VehicleCatalogType[];
}

export interface CatalogModel {
    id: string;
    brandId: string;
    name: string;
    vehicleTypes: VehicleCatalogType[];
}

export interface CatalogVersion {
    id: string;
    brandId: string;
    modelId: string;
    name: string;
    year?: string;
    vehicleTypes: VehicleCatalogType[];
}

export interface CatalogRegion {
    id: string;
    name: string;
    code?: string;
}

export interface CatalogCommune {
    id: string;
    regionId: string;
    name: string;
}

export interface PublishWizardCatalog {
    brands: CatalogBrand[];
    models: CatalogModel[];
    versions: CatalogVersion[];
    regions: CatalogRegion[];
    communes: CatalogCommune[];
    source: 'seed-file' | 'fallback';
}

const DEFAULT_TYPES: VehicleCatalogType[] = ['car'];

const FALLBACK_BRANDS: CatalogBrand[] = [
    // ─── Autos / SUV — Japonesas ──────────────────────────────────────────────
    { id: 'toyota',       name: 'Toyota',       vehicleTypes: ['car'] },
    { id: 'nissan',       name: 'Nissan',        vehicleTypes: ['car', 'truck'] },
    { id: 'honda',        name: 'Honda',         vehicleTypes: ['car', 'motorcycle'] },
    { id: 'mazda',        name: 'Mazda',         vehicleTypes: ['car', 'truck'] },
    { id: 'subaru',       name: 'Subaru',        vehicleTypes: ['car'] },
    { id: 'mitsubishi',   name: 'Mitsubishi',    vehicleTypes: ['car', 'truck'] },
    { id: 'suzuki',       name: 'Suzuki',        vehicleTypes: ['car', 'motorcycle'] },
    { id: 'isuzu',        name: 'Isuzu',         vehicleTypes: ['car', 'truck'] },
    { id: 'lexus',        name: 'Lexus',         vehicleTypes: ['car'] },
    { id: 'datsun',       name: 'Datsun',        vehicleTypes: ['car'] },
    // ─── Autos / SUV — Coreanas ───────────────────────────────────────────────
    { id: 'hyundai',      name: 'Hyundai',       vehicleTypes: ['car', 'machinery'] },
    { id: 'kia',          name: 'Kia',           vehicleTypes: ['car'] },
    { id: 'ssangyong',    name: 'SsangYong',     vehicleTypes: ['car'] },
    // ─── Autos / SUV — Americanas ─────────────────────────────────────────────
    { id: 'chevrolet',    name: 'Chevrolet',     vehicleTypes: ['car', 'truck'] },
    { id: 'ford',         name: 'Ford',          vehicleTypes: ['car', 'truck'] },
    { id: 'jeep',         name: 'Jeep',          vehicleTypes: ['car'] },
    { id: 'dodge',        name: 'Dodge',         vehicleTypes: ['car'] },
    { id: 'ram',          name: 'RAM',           vehicleTypes: ['car', 'truck'] },
    { id: 'chrysler',     name: 'Chrysler',      vehicleTypes: ['car'] },
    { id: 'tesla',        name: 'Tesla',         vehicleTypes: ['car'] },
    // ─── Autos / SUV — Europeas premium ──────────────────────────────────────
    { id: 'bmw',          name: 'BMW',           vehicleTypes: ['car', 'motorcycle'] },
    { id: 'mercedes',     name: 'Mercedes-Benz', vehicleTypes: ['car', 'truck', 'bus'] },
    { id: 'audi',         name: 'Audi',          vehicleTypes: ['car'] },
    { id: 'volvo',        name: 'Volvo',         vehicleTypes: ['car', 'truck', 'bus'] },
    { id: 'land-rover',   name: 'Land Rover',    vehicleTypes: ['car'] },
    { id: 'porsche',      name: 'Porsche',       vehicleTypes: ['car'] },
    { id: 'jaguar',       name: 'Jaguar',        vehicleTypes: ['car'] },
    { id: 'mini',         name: 'MINI',          vehicleTypes: ['car'] },
    { id: 'alfa-romeo',   name: 'Alfa Romeo',    vehicleTypes: ['car'] },
    { id: 'infiniti',     name: 'Infiniti',      vehicleTypes: ['car'] },
    { id: 'polestar',     name: 'Polestar',      vehicleTypes: ['car'] },
    // ─── Autos / SUV — Europeas masivas ──────────────────────────────────────
    { id: 'volkswagen',   name: 'Volkswagen',    vehicleTypes: ['car', 'truck'] },
    { id: 'renault',      name: 'Renault',       vehicleTypes: ['car'] },
    { id: 'peugeot',      name: 'Peugeot',       vehicleTypes: ['car'] },
    { id: 'fiat',         name: 'Fiat',          vehicleTypes: ['car'] },
    { id: 'citroen',      name: 'Citroën',       vehicleTypes: ['car'] },
    { id: 'seat',         name: 'SEAT',          vehicleTypes: ['car'] },
    { id: 'opel',         name: 'Opel',          vehicleTypes: ['car'] },
    { id: 'skoda',        name: 'Škoda',         vehicleTypes: ['car'] },
    { id: 'lancia',       name: 'Lancia',        vehicleTypes: ['car'] },
    // ─── Autos / SUV — Chinas ────────────────────────────────────────────────
    { id: 'byd',          name: 'BYD',           vehicleTypes: ['car', 'bus'] },
    { id: 'chery',        name: 'Chery',         vehicleTypes: ['car'] },
    { id: 'mg',           name: 'MG',            vehicleTypes: ['car'] },
    { id: 'haval',        name: 'Haval',         vehicleTypes: ['car'] },
    { id: 'jac',          name: 'JAC',           vehicleTypes: ['car', 'truck'] },
    { id: 'geely',        name: 'Geely',         vehicleTypes: ['car'] },
    { id: 'great-wall',   name: 'Great Wall',    vehicleTypes: ['car', 'truck'] },
    { id: 'changan',      name: 'Changan',       vehicleTypes: ['car', 'truck'] },
    { id: 'dfsk',         name: 'DFSK',          vehicleTypes: ['car', 'truck'] },
    { id: 'foton',        name: 'Foton',         vehicleTypes: ['car', 'truck'] },
    { id: 'wuling',       name: 'Wuling',        vehicleTypes: ['car'] },
    { id: 'baic',         name: 'BAIC',          vehicleTypes: ['car'] },
    { id: 'omoda',        name: 'Omoda',         vehicleTypes: ['car'] },
    { id: 'jetour',       name: 'Jetour',        vehicleTypes: ['car'] },
    { id: 'dongfeng',     name: 'Dongfeng',      vehicleTypes: ['car', 'truck'] },
    // ─── Motos ────────────────────────────────────────────────────────────────
    { id: 'yamaha',          name: 'Yamaha',         vehicleTypes: ['motorcycle', 'nautical'] },
    { id: 'kawasaki',        name: 'Kawasaki',        vehicleTypes: ['motorcycle', 'nautical'] },
    { id: 'ducati',          name: 'Ducati',          vehicleTypes: ['motorcycle'] },
    { id: 'royal-enfield',   name: 'Royal Enfield',   vehicleTypes: ['motorcycle'] },
    { id: 'ktm',             name: 'KTM',             vehicleTypes: ['motorcycle'] },
    { id: 'harley-davidson', name: 'Harley-Davidson', vehicleTypes: ['motorcycle'] },
    { id: 'bajaj',           name: 'Bajaj',           vehicleTypes: ['motorcycle'] },
    { id: 'benelli',         name: 'Benelli',         vehicleTypes: ['motorcycle'] },
    { id: 'kymco',           name: 'Kymco',           vehicleTypes: ['motorcycle'] },
    { id: 'tvs',             name: 'TVS',             vehicleTypes: ['motorcycle'] },
    { id: 'cf-moto',         name: 'CF Moto',         vehicleTypes: ['motorcycle'] },
    // ─── Camiones ─────────────────────────────────────────────────────────────
    { id: 'scania',        name: 'Scania',       vehicleTypes: ['truck', 'bus'] },
    { id: 'man',           name: 'MAN',          vehicleTypes: ['truck', 'bus'] },
    { id: 'kenworth',      name: 'Kenworth',     vehicleTypes: ['truck'] },
    { id: 'freightliner',  name: 'Freightliner', vehicleTypes: ['truck'] },
    { id: 'iveco',         name: 'Iveco',        vehicleTypes: ['truck', 'bus'] },
    { id: 'daf',           name: 'DAF',          vehicleTypes: ['truck'] },
    { id: 'international', name: 'International',vehicleTypes: ['truck'] },
    { id: 'ud-trucks',     name: 'UD Trucks',    vehicleTypes: ['truck'] },
    { id: 'hino',          name: 'Hino',         vehicleTypes: ['truck'] },
    { id: 'faw',           name: 'FAW',          vehicleTypes: ['truck'] },
    { id: 'sinotruk',      name: 'Sinotruk',     vehicleTypes: ['truck'] },
    { id: 'jmc',           name: 'JMC',          vehicleTypes: ['truck'] },
    // ─── Buses ────────────────────────────────────────────────────────────────
    { id: 'king-long',  name: 'King Long', vehicleTypes: ['bus'] },
    { id: 'yutong',     name: 'Yutong',    vehicleTypes: ['bus'] },
    { id: 'higer',      name: 'Higer',     vehicleTypes: ['bus'] },
    { id: 'irizar',     name: 'Irizar',    vehicleTypes: ['bus'] },
    // ─── Maquinaria ───────────────────────────────────────────────────────────
    { id: 'caterpillar',  name: 'Caterpillar',  vehicleTypes: ['machinery'] },
    { id: 'komatsu',      name: 'Komatsu',      vehicleTypes: ['machinery'] },
    { id: 'john-deere',   name: 'John Deere',   vehicleTypes: ['machinery'] },
    { id: 'liebherr',     name: 'Liebherr',     vehicleTypes: ['machinery'] },
    { id: 'hitachi',      name: 'Hitachi',      vehicleTypes: ['machinery'] },
    { id: 'doosan',       name: 'Doosan',       vehicleTypes: ['machinery'] },
    { id: 'jcb',          name: 'JCB',          vehicleTypes: ['machinery'] },
    { id: 'case',         name: 'Case',         vehicleTypes: ['machinery'] },
    { id: 'new-holland',  name: 'New Holland',  vehicleTypes: ['machinery'] },
    { id: 'xcmg',         name: 'XCMG',         vehicleTypes: ['machinery'] },
    // ─── Náutico ──────────────────────────────────────────────────────────────
    { id: 'bayliner',      name: 'Bayliner',      vehicleTypes: ['nautical'] },
    { id: 'sea-doo',       name: 'Sea-Doo',       vehicleTypes: ['nautical'] },
    { id: 'boston-whaler', name: 'Boston Whaler', vehicleTypes: ['nautical'] },
    { id: 'tracker',       name: 'Tracker',       vehicleTypes: ['nautical'] },
    // ─── Aéreo ────────────────────────────────────────────────────────────────
    { id: 'cessna',     name: 'Cessna',     vehicleTypes: ['aerial'] },
    { id: 'piper',      name: 'Piper',      vehicleTypes: ['aerial'] },
    { id: 'beechcraft', name: 'Beechcraft', vehicleTypes: ['aerial'] },
    { id: 'robinson',   name: 'Robinson',   vehicleTypes: ['aerial'] },
    { id: 'bell',       name: 'Bell',       vehicleTypes: ['aerial'] },
];

const FALLBACK_MODELS: CatalogModel[] = [
    { id: 'toyota-corolla-cross', brandId: 'toyota', name: 'Corolla Cross', vehicleTypes: ['car'] },
    { id: 'toyota-rav4', brandId: 'toyota', name: 'RAV4', vehicleTypes: ['car'] },
    { id: 'toyota-yaris', brandId: 'toyota', name: 'Yaris', vehicleTypes: ['car'] },
    { id: 'toyota-hilux', brandId: 'toyota', name: 'Hilux', vehicleTypes: ['car', 'truck'] },
    { id: 'hyundai-tucson', brandId: 'hyundai', name: 'Tucson', vehicleTypes: ['car'] },
    { id: 'hyundai-accent', brandId: 'hyundai', name: 'Accent', vehicleTypes: ['car'] },
    { id: 'hyundai-santa-fe', brandId: 'hyundai', name: 'Santa Fe', vehicleTypes: ['car'] },
    { id: 'kia-sportage', brandId: 'kia', name: 'Sportage', vehicleTypes: ['car'] },
    { id: 'kia-rio', brandId: 'kia', name: 'Rio', vehicleTypes: ['car'] },
    { id: 'kia-seltos', brandId: 'kia', name: 'Seltos', vehicleTypes: ['car'] },
    { id: 'nissan-versa', brandId: 'nissan', name: 'Versa', vehicleTypes: ['car'] },
    { id: 'nissan-xtrail', brandId: 'nissan', name: 'X-Trail', vehicleTypes: ['car'] },
    { id: 'nissan-navara', brandId: 'nissan', name: 'Navara', vehicleTypes: ['car', 'truck'] },
    { id: 'chevrolet-onix', brandId: 'chevrolet', name: 'Onix', vehicleTypes: ['car'] },
    { id: 'chevrolet-tracker', brandId: 'chevrolet', name: 'Tracker', vehicleTypes: ['car'] },
    { id: 'chevrolet-dmax', brandId: 'chevrolet', name: 'D-Max', vehicleTypes: ['car', 'truck'] },
    { id: 'ford-ranger', brandId: 'ford', name: 'Ranger', vehicleTypes: ['car', 'truck'] },
    { id: 'ford-territory', brandId: 'ford', name: 'Territory', vehicleTypes: ['car'] },
    { id: 'honda-civic', brandId: 'honda', name: 'Civic', vehicleTypes: ['car'] },
    { id: 'honda-hrv', brandId: 'honda', name: 'HR-V', vehicleTypes: ['car'] },
    { id: 'bmw-320i', brandId: 'bmw', name: '320i', vehicleTypes: ['car'] },
    { id: 'bmw-x1', brandId: 'bmw', name: 'X1', vehicleTypes: ['car'] },
    { id: 'mercedes-c200', brandId: 'mercedes', name: 'C200', vehicleTypes: ['car'] },
    { id: 'mercedes-sprinter', brandId: 'mercedes', name: 'Sprinter', vehicleTypes: ['truck', 'bus'] },
    { id: 'volvo-fh', brandId: 'volvo', name: 'FH', vehicleTypes: ['truck'] },
    { id: 'scania-r450', brandId: 'scania', name: 'R450', vehicleTypes: ['truck'] },
    { id: 'man-tgx', brandId: 'man', name: 'TGX', vehicleTypes: ['truck'] },
    { id: 'yamaha-mt07', brandId: 'yamaha', name: 'MT-07', vehicleTypes: ['motorcycle'] },
    { id: 'kawasaki-z900', brandId: 'kawasaki', name: 'Z900', vehicleTypes: ['motorcycle'] },
    { id: 'cat-320', brandId: 'caterpillar', name: '320 Excavator', vehicleTypes: ['machinery'] },
    { id: 'komatsu-pc200', brandId: 'komatsu', name: 'PC200', vehicleTypes: ['machinery'] },
    { id: 'jd-5075e', brandId: 'john-deere', name: '5075E', vehicleTypes: ['machinery'] },
    { id: 'bayliner-vr5', brandId: 'bayliner', name: 'VR5', vehicleTypes: ['nautical'] },
    { id: 'cessna-172', brandId: 'cessna', name: '172 Skyhawk', vehicleTypes: ['aerial'] },
    // Suzuki (popular en Chile)
    { id: 'suzuki-swift', brandId: 'suzuki', name: 'Swift', vehicleTypes: ['car'] },
    { id: 'suzuki-vitara', brandId: 'suzuki', name: 'Vitara', vehicleTypes: ['car'] },
    { id: 'suzuki-grand-vitara', brandId: 'suzuki', name: 'Grand Vitara', vehicleTypes: ['car'] },
    { id: 'suzuki-jimny', brandId: 'suzuki', name: 'Jimny', vehicleTypes: ['car'] },
    { id: 'suzuki-s-presso', brandId: 'suzuki', name: 'S-Presso', vehicleTypes: ['car'] },
    // Mitsubishi
    { id: 'mitsubishi-asx', brandId: 'mitsubishi', name: 'ASX', vehicleTypes: ['car'] },
    { id: 'mitsubishi-outlander', brandId: 'mitsubishi', name: 'Outlander', vehicleTypes: ['car'] },
    { id: 'mitsubishi-eclipse-cross', brandId: 'mitsubishi', name: 'Eclipse Cross', vehicleTypes: ['car'] },
    { id: 'mitsubishi-l200', brandId: 'mitsubishi', name: 'L200', vehicleTypes: ['car', 'truck'] },
    { id: 'mitsubishi-montero-sport', brandId: 'mitsubishi', name: 'Montero Sport', vehicleTypes: ['car'] },
    { id: 'mitsubishi-pajero-sport', brandId: 'mitsubishi', name: 'Pajero Sport', vehicleTypes: ['car'] },
    // Renault
    { id: 'renault-duster', brandId: 'renault', name: 'Duster', vehicleTypes: ['car'] },
    { id: 'renault-sandero', brandId: 'renault', name: 'Sandero', vehicleTypes: ['car'] },
    { id: 'renault-stepway', brandId: 'renault', name: 'Sandero Stepway', vehicleTypes: ['car'] },
    { id: 'renault-kwid', brandId: 'renault', name: 'Kwid', vehicleTypes: ['car'] },
    { id: 'renault-oroch', brandId: 'renault', name: 'Duster Oroch', vehicleTypes: ['car', 'truck'] },
    { id: 'renault-arkana', brandId: 'renault', name: 'Arkana', vehicleTypes: ['car'] },
    // Peugeot
    { id: 'peugeot-208', brandId: 'peugeot', name: '208', vehicleTypes: ['car'] },
    { id: 'peugeot-2008', brandId: 'peugeot', name: '2008', vehicleTypes: ['car'] },
    { id: 'peugeot-3008', brandId: 'peugeot', name: '3008', vehicleTypes: ['car'] },
    { id: 'peugeot-5008', brandId: 'peugeot', name: '5008', vehicleTypes: ['car'] },
    // Fiat
    { id: 'fiat-cronos', brandId: 'fiat', name: 'Cronos', vehicleTypes: ['car'] },
    { id: 'fiat-pulse', brandId: 'fiat', name: 'Pulse', vehicleTypes: ['car'] },
    { id: 'fiat-fastback', brandId: 'fiat', name: 'Fastback', vehicleTypes: ['car'] },
    // Subaru
    { id: 'subaru-outback', brandId: 'subaru', name: 'Outback', vehicleTypes: ['car'] },
    { id: 'subaru-forester', brandId: 'subaru', name: 'Forester', vehicleTypes: ['car'] },
    { id: 'subaru-xv', brandId: 'subaru', name: 'XV', vehicleTypes: ['car'] },
    { id: 'subaru-impreza', brandId: 'subaru', name: 'Impreza', vehicleTypes: ['car'] },
    // Jeep
    { id: 'jeep-compass', brandId: 'jeep', name: 'Compass', vehicleTypes: ['car'] },
    { id: 'jeep-renegade', brandId: 'jeep', name: 'Renegade', vehicleTypes: ['car'] },
    { id: 'jeep-cherokee', brandId: 'jeep', name: 'Cherokee', vehicleTypes: ['car'] },
    // Audi
    { id: 'audi-a3', brandId: 'audi', name: 'A3', vehicleTypes: ['car'] },
    { id: 'audi-q3', brandId: 'audi', name: 'Q3', vehicleTypes: ['car'] },
    { id: 'audi-q5', brandId: 'audi', name: 'Q5', vehicleTypes: ['car'] },
    // BYD
    { id: 'byd-seal', brandId: 'byd', name: 'Seal', vehicleTypes: ['car'] },
    { id: 'byd-atto3', brandId: 'byd', name: 'Atto 3', vehicleTypes: ['car'] },
    { id: 'byd-dolphin', brandId: 'byd', name: 'Dolphin', vehicleTypes: ['car'] },
    { id: 'byd-han', brandId: 'byd', name: 'Han', vehicleTypes: ['car'] },
    { id: 'byd-tang', brandId: 'byd', name: 'Tang', vehicleTypes: ['car'] },
    { id: 'byd-song-plus', brandId: 'byd', name: 'Song Plus', vehicleTypes: ['car'] },
    // Chery
    { id: 'chery-tiggo2', brandId: 'chery', name: 'Tiggo 2', vehicleTypes: ['car'] },
    { id: 'chery-tiggo2pro', brandId: 'chery', name: 'Tiggo 2 Pro', vehicleTypes: ['car'] },
    { id: 'chery-tiggo4pro', brandId: 'chery', name: 'Tiggo 4 Pro', vehicleTypes: ['car'] },
    { id: 'chery-tiggo7pro', brandId: 'chery', name: 'Tiggo 7 Pro', vehicleTypes: ['car'] },
    { id: 'chery-tiggo8pro', brandId: 'chery', name: 'Tiggo 8 Pro', vehicleTypes: ['car'] },
    { id: 'chery-arrizo5', brandId: 'chery', name: 'Arrizo 5', vehicleTypes: ['car'] },
    { id: 'chery-omoda5', brandId: 'chery', name: 'Omoda 5', vehicleTypes: ['car'] },
    // MG
    { id: 'mg-zs', brandId: 'mg', name: 'ZS', vehicleTypes: ['car'] },
    { id: 'mg-hs', brandId: 'mg', name: 'HS', vehicleTypes: ['car'] },
    { id: 'mg-mg5', brandId: 'mg', name: 'MG5', vehicleTypes: ['car'] },
    { id: 'mg-mg4', brandId: 'mg', name: 'MG4', vehicleTypes: ['car'] },
    { id: 'mg-rx5', brandId: 'mg', name: 'RX5', vehicleTypes: ['car'] },
    // Haval (GWM)
    { id: 'haval-h6', brandId: 'haval', name: 'H6', vehicleTypes: ['car'] },
    { id: 'haval-jolion', brandId: 'haval', name: 'Jolion', vehicleTypes: ['car'] },
    { id: 'haval-h9', brandId: 'haval', name: 'H9', vehicleTypes: ['car'] },
    // JAC
    { id: 'jac-t8', brandId: 'jac', name: 'T8', vehicleTypes: ['truck'] },
    { id: 'jac-js4', brandId: 'jac', name: 'JS4', vehicleTypes: ['car'] },
    { id: 'jac-j7', brandId: 'jac', name: 'J7', vehicleTypes: ['car'] },
    // Volkswagen (adicionales)
    { id: 'volkswagen-polo',    brandId: 'volkswagen', name: 'Polo',    vehicleTypes: ['car'] },
    { id: 'volkswagen-golf',    brandId: 'volkswagen', name: 'Golf',    vehicleTypes: ['car'] },
    { id: 'volkswagen-tiguan',  brandId: 'volkswagen', name: 'Tiguan',  vehicleTypes: ['car'] },
    { id: 'volkswagen-virtus',  brandId: 'volkswagen', name: 'Virtus',  vehicleTypes: ['car'] },
    { id: 'volkswagen-teramont',brandId: 'volkswagen', name: 'Teramont',vehicleTypes: ['car'] },
    // Lexus
    { id: 'lexus-nx',  brandId: 'lexus', name: 'NX',  vehicleTypes: ['car'] },
    { id: 'lexus-rx',  brandId: 'lexus', name: 'RX',  vehicleTypes: ['car'] },
    { id: 'lexus-ux',  brandId: 'lexus', name: 'UX',  vehicleTypes: ['car'] },
    { id: 'lexus-is',  brandId: 'lexus', name: 'IS',  vehicleTypes: ['car'] },
    { id: 'lexus-es',  brandId: 'lexus', name: 'ES',  vehicleTypes: ['car'] },
    // Land Rover
    { id: 'land-rover-defender',       brandId: 'land-rover', name: 'Defender',        vehicleTypes: ['car'] },
    { id: 'land-rover-discovery-sport',brandId: 'land-rover', name: 'Discovery Sport', vehicleTypes: ['car'] },
    { id: 'land-rover-discovery',      brandId: 'land-rover', name: 'Discovery',       vehicleTypes: ['car'] },
    { id: 'land-rover-range-rover-sport',brandId:'land-rover',name: 'Range Rover Sport',vehicleTypes:['car']},
    { id: 'land-rover-freelander',     brandId: 'land-rover', name: 'Freelander',      vehicleTypes: ['car'] },
    // Porsche
    { id: 'porsche-cayenne', brandId: 'porsche', name: 'Cayenne', vehicleTypes: ['car'] },
    { id: 'porsche-macan',   brandId: 'porsche', name: 'Macan',   vehicleTypes: ['car'] },
    { id: 'porsche-911',     brandId: 'porsche', name: '911',     vehicleTypes: ['car'] },
    { id: 'porsche-taycan',  brandId: 'porsche', name: 'Taycan',  vehicleTypes: ['car'] },
    // Alfa Romeo
    { id: 'alfa-romeo-stelvio',  brandId: 'alfa-romeo', name: 'Stelvio',  vehicleTypes: ['car'] },
    { id: 'alfa-romeo-giulia',   brandId: 'alfa-romeo', name: 'Giulia',   vehicleTypes: ['car'] },
    { id: 'alfa-romeo-giulietta',brandId: 'alfa-romeo', name: 'Giulietta',vehicleTypes: ['car'] },
    // MINI
    { id: 'mini-cooper',         brandId: 'mini', name: 'Cooper',         vehicleTypes: ['car'] },
    { id: 'mini-cooper-s',       brandId: 'mini', name: 'Cooper S',       vehicleTypes: ['car'] },
    { id: 'mini-countryman',     brandId: 'mini', name: 'Countryman',     vehicleTypes: ['car'] },
    { id: 'mini-clubman',        brandId: 'mini', name: 'Clubman',        vehicleTypes: ['car'] },
    // Tesla
    { id: 'tesla-model3', brandId: 'tesla', name: 'Model 3', vehicleTypes: ['car'] },
    { id: 'tesla-modely', brandId: 'tesla', name: 'Model Y', vehicleTypes: ['car'] },
    { id: 'tesla-models', brandId: 'tesla', name: 'Model S', vehicleTypes: ['car'] },
    { id: 'tesla-modelx', brandId: 'tesla', name: 'Model X', vehicleTypes: ['car'] },
    // SsangYong
    { id: 'ssangyong-tivoli',  brandId: 'ssangyong', name: 'Tivoli',  vehicleTypes: ['car'] },
    { id: 'ssangyong-korando', brandId: 'ssangyong', name: 'Korando', vehicleTypes: ['car'] },
    { id: 'ssangyong-rexton',  brandId: 'ssangyong', name: 'Rexton',  vehicleTypes: ['car'] },
    { id: 'ssangyong-torres',  brandId: 'ssangyong', name: 'Torres',  vehicleTypes: ['car'] },
    // Isuzu
    { id: 'isuzu-dmax', brandId: 'isuzu', name: 'D-Max', vehicleTypes: ['car', 'truck'] },
    { id: 'isuzu-mux',  brandId: 'isuzu', name: 'MU-X',  vehicleTypes: ['car'] },
    // Changan
    { id: 'changan-cs75plus', brandId: 'changan', name: 'CS75 Plus',  vehicleTypes: ['car'] },
    { id: 'changan-cs35plus', brandId: 'changan', name: 'CS35 Plus',  vehicleTypes: ['car'] },
    { id: 'changan-cs55',     brandId: 'changan', name: 'CS55 Plus',  vehicleTypes: ['car'] },
    { id: 'changan-hunter',   brandId: 'changan', name: 'Hunter',     vehicleTypes: ['car', 'truck'] },
    { id: 'changan-eado',     brandId: 'changan', name: 'Eado Plus',  vehicleTypes: ['car'] },
    // Omoda / Jetour
    { id: 'omoda-omoda5',  brandId: 'omoda',  name: 'Omoda 5',  vehicleTypes: ['car'] },
    { id: 'omoda-omoda7',  brandId: 'omoda',  name: 'Omoda 7',  vehicleTypes: ['car'] },
    { id: 'jetour-dashing',brandId: 'jetour', name: 'Dashing',  vehicleTypes: ['car'] },
    { id: 'jetour-t2',     brandId: 'jetour', name: 'T2',       vehicleTypes: ['car'] },
    // Geely
    { id: 'geely-azkarra',  brandId: 'geely', name: 'Azkarra',  vehicleTypes: ['car'] },
    { id: 'geely-coolray',  brandId: 'geely', name: 'Coolray',  vehicleTypes: ['car'] },
    { id: 'geely-emgrand',  brandId: 'geely', name: 'Emgrand',  vehicleTypes: ['car'] },
    // Great Wall
    { id: 'great-wall-wingle', brandId: 'great-wall', name: 'Wingle', vehicleTypes: ['car', 'truck'] },
    { id: 'great-wall-poer',   brandId: 'great-wall', name: 'Poer',   vehicleTypes: ['car', 'truck'] },
    // Dodge / RAM
    { id: 'dodge-journey',  brandId: 'dodge', name: 'Journey',  vehicleTypes: ['car'] },
    { id: 'dodge-durango',  brandId: 'dodge', name: 'Durango',  vehicleTypes: ['car'] },
    { id: 'ram-1500',       brandId: 'ram',   name: '1500',     vehicleTypes: ['car', 'truck'] },
    { id: 'ram-700',        brandId: 'ram',   name: '700',      vehicleTypes: ['car', 'truck'] },
    // SEAT (histórica)
    { id: 'seat-leon',  brandId: 'seat', name: 'León',  vehicleTypes: ['car'] },
    { id: 'seat-ibiza', brandId: 'seat', name: 'Ibiza', vehicleTypes: ['car'] },
    { id: 'seat-arona', brandId: 'seat', name: 'Arona', vehicleTypes: ['car'] },
    // Opel (histórica)
    { id: 'opel-astra',  brandId: 'opel', name: 'Astra',  vehicleTypes: ['car'] },
    { id: 'opel-corsa',  brandId: 'opel', name: 'Corsa',  vehicleTypes: ['car'] },
    { id: 'opel-zafira', brandId: 'opel', name: 'Zafira', vehicleTypes: ['car'] },
    // Motos nuevas
    { id: 'harley-iron883',    brandId: 'harley-davidson', name: 'Iron 883',    vehicleTypes: ['motorcycle'] },
    { id: 'harley-fatboy',     brandId: 'harley-davidson', name: 'Fat Boy',     vehicleTypes: ['motorcycle'] },
    { id: 'harley-streetbob',  brandId: 'harley-davidson', name: 'Street Bob',  vehicleTypes: ['motorcycle'] },
    { id: 'harley-roadking',   brandId: 'harley-davidson', name: 'Road King',   vehicleTypes: ['motorcycle'] },
    { id: 'ktm-duke390',       brandId: 'ktm',             name: 'Duke 390',    vehicleTypes: ['motorcycle'] },
    { id: 'ktm-adventure390',  brandId: 'ktm',             name: 'Adventure 390',vehicleTypes:['motorcycle']},
    { id: 'ktm-duke200',       brandId: 'ktm',             name: 'Duke 200',    vehicleTypes: ['motorcycle'] },
    { id: 'ducati-monster',    brandId: 'ducati',          name: 'Monster',     vehicleTypes: ['motorcycle'] },
    { id: 'ducati-scrambler',  brandId: 'ducati',          name: 'Scrambler',   vehicleTypes: ['motorcycle'] },
    { id: 'ducati-panigale',   brandId: 'ducati',          name: 'Panigale V2', vehicleTypes: ['motorcycle'] },
    { id: 'royal-enfield-meteor', brandId: 'royal-enfield', name: 'Meteor 350',  vehicleTypes: ['motorcycle'] },
    { id: 'royal-enfield-classic',brandId: 'royal-enfield', name: 'Classic 350', vehicleTypes: ['motorcycle'] },
    { id: 'royal-enfield-himalayan',brandId:'royal-enfield',name:'Himalayan',    vehicleTypes: ['motorcycle'] },
    { id: 'bajaj-pulsar200',   brandId: 'bajaj', name: 'Pulsar NS200', vehicleTypes: ['motorcycle'] },
    { id: 'bajaj-pulsar160',   brandId: 'bajaj', name: 'Pulsar NS160', vehicleTypes: ['motorcycle'] },
    { id: 'bajaj-dominar400',  brandId: 'bajaj', name: 'Dominar 400',  vehicleTypes: ['motorcycle'] },
    // Camiones nuevos
    { id: 'kenworth-t680',         brandId: 'kenworth',     name: 'T680',     vehicleTypes: ['truck'] },
    { id: 'kenworth-t800',         brandId: 'kenworth',     name: 'T800',     vehicleTypes: ['truck'] },
    { id: 'freightliner-cascadia', brandId: 'freightliner', name: 'Cascadia', vehicleTypes: ['truck'] },
    { id: 'freightliner-m2',       brandId: 'freightliner', name: 'M2',       vehicleTypes: ['truck'] },
    { id: 'iveco-daily',           brandId: 'iveco',        name: 'Daily',    vehicleTypes: ['truck', 'bus'] },
    { id: 'iveco-trakker',         brandId: 'iveco',        name: 'Trakker',  vehicleTypes: ['truck'] },
    { id: 'hino-300',              brandId: 'hino',         name: '300',      vehicleTypes: ['truck'] },
    { id: 'hino-500',              brandId: 'hino',         name: '500',      vehicleTypes: ['truck'] },
    { id: 'hino-700',              brandId: 'hino',         name: '700',      vehicleTypes: ['truck'] },
    // ── Toyota (modelos faltantes) ────────────────────────────────────────────
    { id: 'toyota-corolla',       brandId: 'toyota',    name: 'Corolla',      vehicleTypes: ['car'] },
    { id: 'toyota-fortuner',      brandId: 'toyota',    name: 'Fortuner',     vehicleTypes: ['car'] },
    { id: 'toyota-prado',         brandId: 'toyota',    name: 'Prado',        vehicleTypes: ['car'] },
    { id: 'toyota-land-cruiser',  brandId: 'toyota',    name: 'Land Cruiser', vehicleTypes: ['car'] },
    { id: 'toyota-camry',         brandId: 'toyota',    name: 'Camry',        vehicleTypes: ['car'] },
    { id: 'toyota-avanza',        brandId: 'toyota',    name: 'Avanza',       vehicleTypes: ['car'] },
    { id: 'toyota-rush',          brandId: 'toyota',    name: 'Rush',         vehicleTypes: ['car'] },
    // ── Hyundai (modelos faltantes) ───────────────────────────────────────────
    { id: 'hyundai-creta',        brandId: 'hyundai',   name: 'Creta',        vehicleTypes: ['car'] },
    { id: 'hyundai-elantra',      brandId: 'hyundai',   name: 'Elantra',      vehicleTypes: ['car'] },
    { id: 'hyundai-grand-i10',    brandId: 'hyundai',   name: 'Grand i10',    vehicleTypes: ['car'] },
    { id: 'hyundai-ioniq5',       brandId: 'hyundai',   name: 'Ioniq 5',      vehicleTypes: ['car'] },
    { id: 'hyundai-staria',       brandId: 'hyundai',   name: 'Staria',       vehicleTypes: ['car'] },
    { id: 'hyundai-sonata',       brandId: 'hyundai',   name: 'Sonata',       vehicleTypes: ['car'] },
    // ── Kia (modelos faltantes) ───────────────────────────────────────────────
    { id: 'kia-morning',          brandId: 'kia',       name: 'Morning',      vehicleTypes: ['car'] },
    { id: 'kia-sorento',          brandId: 'kia',       name: 'Sorento',      vehicleTypes: ['car'] },
    { id: 'kia-cerato',           brandId: 'kia',       name: 'Cerato',       vehicleTypes: ['car'] },
    { id: 'kia-stinger',          brandId: 'kia',       name: 'Stinger',      vehicleTypes: ['car'] },
    { id: 'kia-carnival',         brandId: 'kia',       name: 'Carnival',     vehicleTypes: ['car'] },
    { id: 'kia-ev6',              brandId: 'kia',       name: 'EV6',          vehicleTypes: ['car'] },
    { id: 'kia-niro',             brandId: 'kia',       name: 'Niro',         vehicleTypes: ['car'] },
    // ── Nissan (modelos faltantes) ────────────────────────────────────────────
    { id: 'nissan-qashqai',       brandId: 'nissan',    name: 'Qashqai',      vehicleTypes: ['car'] },
    { id: 'nissan-kicks',         brandId: 'nissan',    name: 'Kicks',        vehicleTypes: ['car'] },
    { id: 'nissan-march',         brandId: 'nissan',    name: 'March',        vehicleTypes: ['car'] },
    { id: 'nissan-pathfinder',    brandId: 'nissan',    name: 'Pathfinder',   vehicleTypes: ['car'] },
    { id: 'nissan-np300',         brandId: 'nissan',    name: 'NP300',        vehicleTypes: ['car', 'truck'] },
    // ── Chevrolet (modelos faltantes) ─────────────────────────────────────────
    { id: 'chevrolet-captiva',    brandId: 'chevrolet', name: 'Captiva',      vehicleTypes: ['car'] },
    { id: 'chevrolet-sail',       brandId: 'chevrolet', name: 'Sail',         vehicleTypes: ['car'] },
    { id: 'chevrolet-s10',        brandId: 'chevrolet', name: 'S10',          vehicleTypes: ['car', 'truck'] },
    { id: 'chevrolet-groove',     brandId: 'chevrolet', name: 'Groove',       vehicleTypes: ['car'] },
    { id: 'chevrolet-equinox',    brandId: 'chevrolet', name: 'Equinox',      vehicleTypes: ['car'] },
    // ── Ford (modelos faltantes) ──────────────────────────────────────────────
    { id: 'ford-focus',           brandId: 'ford',      name: 'Focus',        vehicleTypes: ['car'] },
    { id: 'ford-escape',          brandId: 'ford',      name: 'Escape',       vehicleTypes: ['car'] },
    { id: 'ford-explorer',        brandId: 'ford',      name: 'Explorer',     vehicleTypes: ['car'] },
    { id: 'ford-everest',         brandId: 'ford',      name: 'Everest',      vehicleTypes: ['car'] },
    { id: 'ford-f150',            brandId: 'ford',      name: 'F-150',        vehicleTypes: ['car', 'truck'] },
    { id: 'ford-bronco',          brandId: 'ford',      name: 'Bronco',       vehicleTypes: ['car'] },
    { id: 'ford-maverick',        brandId: 'ford',      name: 'Maverick',     vehicleTypes: ['car', 'truck'] },
    // ── Honda (modelos faltantes) ─────────────────────────────────────────────
    { id: 'honda-crv',            brandId: 'honda',     name: 'CR-V',         vehicleTypes: ['car'] },
    { id: 'honda-wrv',            brandId: 'honda',     name: 'WR-V',         vehicleTypes: ['car'] },
    { id: 'honda-accord',         brandId: 'honda',     name: 'Accord',       vehicleTypes: ['car'] },
    { id: 'honda-jazz',           brandId: 'honda',     name: 'Jazz',         vehicleTypes: ['car'] },
    // ── Mazda (modelos faltantes) ─────────────────────────────────────────────
    { id: 'mazda-cx5',            brandId: 'mazda',     name: 'CX-5',         vehicleTypes: ['car'] },
    { id: 'mazda-cx30',           brandId: 'mazda',     name: 'CX-30',        vehicleTypes: ['car'] },
    { id: 'mazda-3',              brandId: 'mazda',     name: 'Mazda 3',      vehicleTypes: ['car'] },
    { id: 'mazda-2',              brandId: 'mazda',     name: 'Mazda 2',      vehicleTypes: ['car'] },
    { id: 'mazda-bt50',           brandId: 'mazda',     name: 'BT-50',        vehicleTypes: ['car', 'truck'] },
    { id: 'mazda-cx9',            brandId: 'mazda',     name: 'CX-9',         vehicleTypes: ['car'] },
    // ── Volkswagen (modelos faltantes) ────────────────────────────────────────
    { id: 'volkswagen-gol',       brandId: 'volkswagen',name: 'Gol',          vehicleTypes: ['car'] },
    { id: 'volkswagen-amarok',    brandId: 'volkswagen',name: 'Amarok',       vehicleTypes: ['car', 'truck'] },
    { id: 'volkswagen-tcross',    brandId: 'volkswagen',name: 'T-Cross',      vehicleTypes: ['car'] },
    { id: 'volkswagen-taos',      brandId: 'volkswagen',name: 'Taos',         vehicleTypes: ['car'] },
    // ── BMW (modelos faltantes) ───────────────────────────────────────────────
    { id: 'bmw-118i',    brandId: 'bmw', name: '118i',    vehicleTypes: ['car'] },
    { id: 'bmw-120i',    brandId: 'bmw', name: '120i',    vehicleTypes: ['car'] },
    { id: 'bmw-318i',    brandId: 'bmw', name: '318i',    vehicleTypes: ['car'] },
    { id: 'bmw-420i',    brandId: 'bmw', name: '420i',    vehicleTypes: ['car'] },
    { id: 'bmw-520i',    brandId: 'bmw', name: '520i',    vehicleTypes: ['car'] },
    { id: 'bmw-530i',    brandId: 'bmw', name: '530i',    vehicleTypes: ['car'] },
    { id: 'bmw-x3',      brandId: 'bmw', name: 'X3',      vehicleTypes: ['car'] },
    { id: 'bmw-x5',      brandId: 'bmw', name: 'X5',      vehicleTypes: ['car'] },
    { id: 'bmw-x6',      brandId: 'bmw', name: 'X6',      vehicleTypes: ['car'] },
    { id: 'bmw-m3',      brandId: 'bmw', name: 'M3',      vehicleTypes: ['car'] },
    { id: 'bmw-m4',      brandId: 'bmw', name: 'M4',      vehicleTypes: ['car'] },
    { id: 'bmw-s1000rr', brandId: 'bmw', name: 'S 1000 RR', vehicleTypes: ['motorcycle'] },
    { id: 'bmw-r1250gs', brandId: 'bmw', name: 'R 1250 GS', vehicleTypes: ['motorcycle'] },
    // ── Mercedes (modelos faltantes) ──────────────────────────────────────────
    { id: 'mercedes-a200',   brandId: 'mercedes', name: 'A200',   vehicleTypes: ['car'] },
    { id: 'mercedes-cla',    brandId: 'mercedes', name: 'CLA',    vehicleTypes: ['car'] },
    { id: 'mercedes-gla',    brandId: 'mercedes', name: 'GLA',    vehicleTypes: ['car'] },
    { id: 'mercedes-glc',    brandId: 'mercedes', name: 'GLC',    vehicleTypes: ['car'] },
    { id: 'mercedes-gle',    brandId: 'mercedes', name: 'GLE',    vehicleTypes: ['car'] },
    { id: 'mercedes-e250',   brandId: 'mercedes', name: 'E250',   vehicleTypes: ['car'] },
    { id: 'mercedes-vito',   brandId: 'mercedes', name: 'Vito',   vehicleTypes: ['truck', 'bus'] },
    { id: 'mercedes-atego',  brandId: 'mercedes', name: 'Atego',  vehicleTypes: ['truck'] },
    { id: 'mercedes-actros', brandId: 'mercedes', name: 'Actros', vehicleTypes: ['truck'] },
    // ── Volvo (modelos autos) ─────────────────────────────────────────────────
    { id: 'volvo-xc40', brandId: 'volvo', name: 'XC40', vehicleTypes: ['car'] },
    { id: 'volvo-xc60', brandId: 'volvo', name: 'XC60', vehicleTypes: ['car'] },
    { id: 'volvo-xc90', brandId: 'volvo', name: 'XC90', vehicleTypes: ['car'] },
    { id: 'volvo-s60',  brandId: 'volvo', name: 'S60',  vehicleTypes: ['car'] },
    { id: 'volvo-v60',  brandId: 'volvo', name: 'V60',  vehicleTypes: ['car'] },
    { id: 'volvo-fm',   brandId: 'volvo', name: 'FM',   vehicleTypes: ['truck'] },
    { id: 'volvo-fmx',  brandId: 'volvo', name: 'FMX',  vehicleTypes: ['truck'] },
    // ── Audi (modelos faltantes) ──────────────────────────────────────────────
    { id: 'audi-a1',       brandId: 'audi', name: 'A1',       vehicleTypes: ['car'] },
    { id: 'audi-a4',       brandId: 'audi', name: 'A4',       vehicleTypes: ['car'] },
    { id: 'audi-a5',       brandId: 'audi', name: 'A5',       vehicleTypes: ['car'] },
    { id: 'audi-a6',       brandId: 'audi', name: 'A6',       vehicleTypes: ['car'] },
    { id: 'audi-q2',       brandId: 'audi', name: 'Q2',       vehicleTypes: ['car'] },
    { id: 'audi-q7',       brandId: 'audi', name: 'Q7',       vehicleTypes: ['car'] },
    { id: 'audi-q8',       brandId: 'audi', name: 'Q8',       vehicleTypes: ['car'] },
    { id: 'audi-etron-gt', brandId: 'audi', name: 'e-tron GT',vehicleTypes: ['car'] },
    // ── Jeep (modelos faltantes) ──────────────────────────────────────────────
    { id: 'jeep-wrangler',       brandId: 'jeep', name: 'Wrangler',        vehicleTypes: ['car'] },
    { id: 'jeep-grand-cherokee', brandId: 'jeep', name: 'Grand Cherokee',  vehicleTypes: ['car'] },
    { id: 'jeep-gladiator',      brandId: 'jeep', name: 'Gladiator',       vehicleTypes: ['car', 'truck'] },
    // ── Marcas 0 modelos: Citroën ─────────────────────────────────────────────
    { id: 'citroen-c3',        brandId: 'citroen', name: 'C3',         vehicleTypes: ['car'] },
    { id: 'citroen-c4-cactus', brandId: 'citroen', name: 'C4 Cactus',  vehicleTypes: ['car'] },
    { id: 'citroen-c4',        brandId: 'citroen', name: 'C4',         vehicleTypes: ['car'] },
    { id: 'citroen-berlingo',  brandId: 'citroen', name: 'Berlingo',   vehicleTypes: ['car'] },
    { id: 'citroen-c5-aircross',brandId:'citroen', name: 'C5 Aircross',vehicleTypes: ['car'] },
    // ── Škoda ─────────────────────────────────────────────────────────────────
    { id: 'skoda-octavia', brandId: 'skoda', name: 'Octavia', vehicleTypes: ['car'] },
    { id: 'skoda-fabia',   brandId: 'skoda', name: 'Fabia',   vehicleTypes: ['car'] },
    { id: 'skoda-karoq',   brandId: 'skoda', name: 'Karoq',   vehicleTypes: ['car'] },
    { id: 'skoda-kodiaq',  brandId: 'skoda', name: 'Kodiaq',  vehicleTypes: ['car'] },
    // ── Jaguar ────────────────────────────────────────────────────────────────
    { id: 'jaguar-f-pace', brandId: 'jaguar', name: 'F-Pace', vehicleTypes: ['car'] },
    { id: 'jaguar-e-pace', brandId: 'jaguar', name: 'E-Pace', vehicleTypes: ['car'] },
    { id: 'jaguar-i-pace', brandId: 'jaguar', name: 'I-Pace', vehicleTypes: ['car'] },
    { id: 'jaguar-xe',     brandId: 'jaguar', name: 'XE',     vehicleTypes: ['car'] },
    { id: 'jaguar-xf',     brandId: 'jaguar', name: 'XF',     vehicleTypes: ['car'] },
    // ── Infiniti ──────────────────────────────────────────────────────────────
    { id: 'infiniti-qx50', brandId: 'infiniti', name: 'QX50', vehicleTypes: ['car'] },
    { id: 'infiniti-q50',  brandId: 'infiniti', name: 'Q50',  vehicleTypes: ['car'] },
    { id: 'infiniti-qx60', brandId: 'infiniti', name: 'QX60', vehicleTypes: ['car'] },
    // ── Polestar ──────────────────────────────────────────────────────────────
    { id: 'polestar-2', brandId: 'polestar', name: 'Polestar 2', vehicleTypes: ['car'] },
    { id: 'polestar-3', brandId: 'polestar', name: 'Polestar 3', vehicleTypes: ['car'] },
    // ── Chrysler ──────────────────────────────────────────────────────────────
    { id: 'chrysler-300c',      brandId: 'chrysler', name: '300C',          vehicleTypes: ['car'] },
    { id: 'chrysler-town-country',brandId:'chrysler',name: 'Town & Country', vehicleTypes: ['car'] },
    // ── Lancia ────────────────────────────────────────────────────────────────
    { id: 'lancia-ypsilon', brandId: 'lancia', name: 'Ypsilon', vehicleTypes: ['car'] },
    { id: 'lancia-delta',   brandId: 'lancia', name: 'Delta',   vehicleTypes: ['car'] },
    // ── Datsun ────────────────────────────────────────────────────────────────
    { id: 'datsun-go',      brandId: 'datsun', name: 'Go',   vehicleTypes: ['car'] },
    { id: 'datsun-go-plus', brandId: 'datsun', name: 'Go+',  vehicleTypes: ['car'] },
    // ── Wuling ────────────────────────────────────────────────────────────────
    { id: 'wuling-air-ev', brandId: 'wuling', name: 'Air EV', vehicleTypes: ['car'] },
    { id: 'wuling-almaz',  brandId: 'wuling', name: 'Almaz',  vehicleTypes: ['car'] },
    // ── BAIC ──────────────────────────────────────────────────────────────────
    { id: 'baic-x55',  brandId: 'baic', name: 'X55',  vehicleTypes: ['car'] },
    { id: 'baic-x35',  brandId: 'baic', name: 'X35',  vehicleTypes: ['car'] },
    { id: 'baic-bj40', brandId: 'baic', name: 'BJ40', vehicleTypes: ['car'] },
    // ── Dongfeng ──────────────────────────────────────────────────────────────
    { id: 'dongfeng-ax7',  brandId: 'dongfeng', name: 'AX7',  vehicleTypes: ['car'] },
    { id: 'dongfeng-rich', brandId: 'dongfeng', name: 'Rich', vehicleTypes: ['car', 'truck'] },
    { id: 'dongfeng-s50',  brandId: 'dongfeng', name: 'S50',  vehicleTypes: ['car'] },
    // ── DFSK ──────────────────────────────────────────────────────────────────
    { id: 'dfsk-glory-580', brandId: 'dfsk', name: 'Glory 580', vehicleTypes: ['car'] },
    { id: 'dfsk-glory-500', brandId: 'dfsk', name: 'Glory 500', vehicleTypes: ['car'] },
    { id: 'dfsk-c37',       brandId: 'dfsk', name: 'C37',       vehicleTypes: ['car'] },
    // ── Foton ─────────────────────────────────────────────────────────────────
    { id: 'foton-tunland',  brandId: 'foton', name: 'Tunland',  vehicleTypes: ['truck'] },
    { id: 'foton-view-cs2', brandId: 'foton', name: 'View CS2', vehicleTypes: ['truck', 'bus'] },
    { id: 'foton-aumark',   brandId: 'foton', name: 'Aumark',   vehicleTypes: ['truck'] },
    // ── Geely (adicional) ─────────────────────────────────────────────────────
    { id: 'geely-emgrand', brandId: 'geely', name: 'Emgrand', vehicleTypes: ['car'] },
    // ── JAC (adicional) ───────────────────────────────────────────────────────
    { id: 'jac-j7', brandId: 'jac', name: 'J7', vehicleTypes: ['car'] },
    // ── Motos: Benelli ────────────────────────────────────────────────────────
    { id: 'benelli-tnt300',      brandId: 'benelli', name: 'TNT 300',      vehicleTypes: ['motorcycle'] },
    { id: 'benelli-tnt600',      brandId: 'benelli', name: 'TNT 600i',     vehicleTypes: ['motorcycle'] },
    { id: 'benelli-leoncino500', brandId: 'benelli', name: 'Leoncino 500', vehicleTypes: ['motorcycle'] },
    { id: 'benelli-trk502',      brandId: 'benelli', name: 'TRK 502',      vehicleTypes: ['motorcycle'] },
    { id: 'benelli-trk502x',     brandId: 'benelli', name: 'TRK 502X',     vehicleTypes: ['motorcycle'] },
    // ── Motos: Kymco ──────────────────────────────────────────────────────────
    { id: 'kymco-ak550',      brandId: 'kymco', name: 'AK 550',      vehicleTypes: ['motorcycle'] },
    { id: 'kymco-xciting400', brandId: 'kymco', name: 'Xciting 400', vehicleTypes: ['motorcycle'] },
    { id: 'kymco-downtown150',brandId: 'kymco', name: 'Downtown 150',vehicleTypes: ['motorcycle'] },
    // ── Motos: TVS ────────────────────────────────────────────────────────────
    { id: 'tvs-apache-rtr200',brandId: 'tvs', name: 'Apache RTR 200', vehicleTypes: ['motorcycle'] },
    { id: 'tvs-apache-rr310', brandId: 'tvs', name: 'Apache RR 310',  vehicleTypes: ['motorcycle'] },
    { id: 'tvs-ronin',        brandId: 'tvs', name: 'Ronin 225',      vehicleTypes: ['motorcycle'] },
    // ── Motos: CF Moto ────────────────────────────────────────────────────────
    { id: 'cf-moto-300nk',  brandId: 'cf-moto', name: '300 NK',  vehicleTypes: ['motorcycle'] },
    { id: 'cf-moto-400nk',  brandId: 'cf-moto', name: '400 NK',  vehicleTypes: ['motorcycle'] },
    { id: 'cf-moto-700clx', brandId: 'cf-moto', name: '700 CL-X',vehicleTypes: ['motorcycle'] },
    { id: 'cf-moto-800mt',  brandId: 'cf-moto', name: '800 MT',   vehicleTypes: ['motorcycle'] },
    // ── Motos: Yamaha (adicionales) ───────────────────────────────────────────
    { id: 'yamaha-mt09',   brandId: 'yamaha', name: 'MT-09',   vehicleTypes: ['motorcycle'] },
    { id: 'yamaha-mt03',   brandId: 'yamaha', name: 'MT-03',   vehicleTypes: ['motorcycle'] },
    { id: 'yamaha-r3',     brandId: 'yamaha', name: 'R3',      vehicleTypes: ['motorcycle'] },
    { id: 'yamaha-r1',     brandId: 'yamaha', name: 'R1',      vehicleTypes: ['motorcycle'] },
    { id: 'yamaha-tenere', brandId: 'yamaha', name: 'Ténéré 700',vehicleTypes: ['motorcycle'] },
    { id: 'yamaha-xmax',   brandId: 'yamaha', name: 'XMAX 300',vehicleTypes: ['motorcycle'] },
    // ── Motos: Kawasaki (adicionales) ────────────────────────────────────────
    { id: 'kawasaki-ninja400',  brandId: 'kawasaki', name: 'Ninja 400',  vehicleTypes: ['motorcycle'] },
    { id: 'kawasaki-ninja650',  brandId: 'kawasaki', name: 'Ninja 650',  vehicleTypes: ['motorcycle'] },
    { id: 'kawasaki-z650',      brandId: 'kawasaki', name: 'Z650',       vehicleTypes: ['motorcycle'] },
    { id: 'kawasaki-versys650', brandId: 'kawasaki', name: 'Versys 650', vehicleTypes: ['motorcycle'] },
    { id: 'kawasaki-vulcan-s',  brandId: 'kawasaki', name: 'Vulcan S',   vehicleTypes: ['motorcycle'] },
    // ── Motos: Honda (motos) ──────────────────────────────────────────────────
    { id: 'honda-cb500f',   brandId: 'honda', name: 'CB500F',    vehicleTypes: ['motorcycle'] },
    { id: 'honda-cb500x',   brandId: 'honda', name: 'CB500X',    vehicleTypes: ['motorcycle'] },
    { id: 'honda-africa-twin',brandId:'honda', name: 'Africa Twin',vehicleTypes: ['motorcycle'] },
    { id: 'honda-xre300',   brandId: 'honda', name: 'XRE 300',   vehicleTypes: ['motorcycle'] },
    { id: 'honda-cbr500r',  brandId: 'honda', name: 'CBR 500R',  vehicleTypes: ['motorcycle'] },
    // ── Camiones: DAF ─────────────────────────────────────────────────────────
    { id: 'daf-xf',  brandId: 'daf', name: 'XF',  vehicleTypes: ['truck'] },
    { id: 'daf-xg',  brandId: 'daf', name: 'XG',  vehicleTypes: ['truck'] },
    { id: 'daf-cf',  brandId: 'daf', name: 'CF',  vehicleTypes: ['truck'] },
    { id: 'daf-lf',  brandId: 'daf', name: 'LF',  vehicleTypes: ['truck'] },
    // ── Camiones: International ───────────────────────────────────────────────
    { id: 'international-lt',   brandId: 'international', name: 'LT Series',  vehicleTypes: ['truck'] },
    { id: 'international-mv',   brandId: 'international', name: 'MV Series',  vehicleTypes: ['truck'] },
    { id: 'international-hx520',brandId: 'international', name: 'HX520',      vehicleTypes: ['truck'] },
    // ── Camiones: UD Trucks ───────────────────────────────────────────────────
    { id: 'ud-croner',  brandId: 'ud-trucks', name: 'Croner',  vehicleTypes: ['truck'] },
    { id: 'ud-quester', brandId: 'ud-trucks', name: 'Quester', vehicleTypes: ['truck'] },
    // ── Camiones: FAW ─────────────────────────────────────────────────────────
    { id: 'faw-j6p',   brandId: 'faw', name: 'J6P',   vehicleTypes: ['truck'] },
    { id: 'faw-tiger', brandId: 'faw', name: 'Tiger V',vehicleTypes: ['truck'] },
    // ── Camiones: Sinotruk ────────────────────────────────────────────────────
    { id: 'sinotruk-howo-t5g', brandId: 'sinotruk', name: 'HOWO T5G', vehicleTypes: ['truck'] },
    { id: 'sinotruk-howo-a7',  brandId: 'sinotruk', name: 'HOWO A7',  vehicleTypes: ['truck'] },
    // ── Camiones: JMC ─────────────────────────────────────────────────────────
    { id: 'jmc-vigus',  brandId: 'jmc', name: 'Vigus',  vehicleTypes: ['truck'] },
    { id: 'jmc-conquer',brandId: 'jmc', name: 'Conquer',vehicleTypes: ['truck'] },
    // ── Camiones: Scania (adicionales) ────────────────────────────────────────
    { id: 'scania-r500', brandId: 'scania', name: 'R500', vehicleTypes: ['truck'] },
    { id: 'scania-p360', brandId: 'scania', name: 'P360', vehicleTypes: ['truck'] },
    { id: 'scania-g450', brandId: 'scania', name: 'G450', vehicleTypes: ['truck'] },
    // ── Camiones: MAN (adicionales) ───────────────────────────────────────────
    { id: 'man-tgl',  brandId: 'man', name: 'TGL', vehicleTypes: ['truck'] },
    { id: 'man-tgs',  brandId: 'man', name: 'TGS', vehicleTypes: ['truck'] },
    // ── Camiones: Kenworth (adicionales) ──────────────────────────────────────
    { id: 'kenworth-t480', brandId: 'kenworth', name: 'T480', vehicleTypes: ['truck'] },
    { id: 'kenworth-w900', brandId: 'kenworth', name: 'W900', vehicleTypes: ['truck'] },
    // ── Buses ─────────────────────────────────────────────────────────────────
    { id: 'king-long-xmq6127', brandId: 'king-long', name: 'XMQ6127', vehicleTypes: ['bus'] },
    { id: 'king-long-xmq6800', brandId: 'king-long', name: 'XMQ6800', vehicleTypes: ['bus'] },
    { id: 'king-long-xmq6996', brandId: 'king-long', name: 'XMQ6996', vehicleTypes: ['bus'] },
    { id: 'yutong-zk6128',  brandId: 'yutong', name: 'ZK6128',  vehicleTypes: ['bus'] },
    { id: 'yutong-zk6121',  brandId: 'yutong', name: 'ZK6121',  vehicleTypes: ['bus'] },
    { id: 'yutong-e12',     brandId: 'yutong', name: 'E12',     vehicleTypes: ['bus'] },
    { id: 'higer-klq6129',  brandId: 'higer',  name: 'KLQ6129', vehicleTypes: ['bus'] },
    { id: 'higer-klq6118',  brandId: 'higer',  name: 'KLQ6118', vehicleTypes: ['bus'] },
    { id: 'irizar-ie',      brandId: 'irizar', name: 'ie Bus',  vehicleTypes: ['bus'] },
    { id: 'irizar-i6s',     brandId: 'irizar', name: 'i6S',     vehicleTypes: ['bus'] },
    { id: 'irizar-pb',      brandId: 'irizar', name: 'PB',      vehicleTypes: ['bus'] },
    // ── Maquinaria: Liebherr ──────────────────────────────────────────────────
    { id: 'liebherr-r926',   brandId: 'liebherr', name: 'R 926 Excavadora',   vehicleTypes: ['machinery'] },
    { id: 'liebherr-l550',   brandId: 'liebherr', name: 'L 550 Cargador',     vehicleTypes: ['machinery'] },
    { id: 'liebherr-ltm1060',brandId: 'liebherr', name: 'LTM 1060 Grúa',     vehicleTypes: ['machinery'] },
    // ── Maquinaria: Hitachi ───────────────────────────────────────────────────
    { id: 'hitachi-zx200',  brandId: 'hitachi', name: 'ZX200 Excavadora', vehicleTypes: ['machinery'] },
    { id: 'hitachi-zx300',  brandId: 'hitachi', name: 'ZX300 Excavadora', vehicleTypes: ['machinery'] },
    { id: 'hitachi-ex400',  brandId: 'hitachi', name: 'EX400 Excavadora', vehicleTypes: ['machinery'] },
    // ── Maquinaria: Doosan ────────────────────────────────────────────────────
    { id: 'doosan-dx225',  brandId: 'doosan', name: 'DX225 Excavadora',  vehicleTypes: ['machinery'] },
    { id: 'doosan-dl250',  brandId: 'doosan', name: 'DL250 Cargador',    vehicleTypes: ['machinery'] },
    // ── Maquinaria: JCB ───────────────────────────────────────────────────────
    { id: 'jcb-3cx',    brandId: 'jcb', name: '3CX Retroexcavadora', vehicleTypes: ['machinery'] },
    { id: 'jcb-js220',  brandId: 'jcb', name: 'JS220 Excavadora',    vehicleTypes: ['machinery'] },
    { id: 'jcb-541-70', brandId: 'jcb', name: '541-70 Telehandler',  vehicleTypes: ['machinery'] },
    // ── Maquinaria: Case ──────────────────────────────────────────────────────
    { id: 'case-cx300c', brandId: 'case', name: 'CX300C Excavadora',     vehicleTypes: ['machinery'] },
    { id: 'case-621g',   brandId: 'case', name: '621G Cargador Frontal', vehicleTypes: ['machinery'] },
    { id: 'case-580n',   brandId: 'case', name: '580N Retroexcavadora',  vehicleTypes: ['machinery'] },
    // ── Maquinaria: New Holland ───────────────────────────────────────────────
    { id: 'nh-t7-180',  brandId: 'new-holland', name: 'T7.180 Tractor',  vehicleTypes: ['machinery'] },
    { id: 'nh-tc5-80',  brandId: 'new-holland', name: 'TC5.80 Cosechadora',vehicleTypes: ['machinery'] },
    { id: 'nh-e215c',   brandId: 'new-holland', name: 'E215C Excavadora', vehicleTypes: ['machinery'] },
    // ── Maquinaria: XCMG ──────────────────────────────────────────────────────
    { id: 'xcmg-xe215c', brandId: 'xcmg', name: 'XE215C Excavadora',   vehicleTypes: ['machinery'] },
    { id: 'xcmg-lw300fn',brandId: 'xcmg', name: 'LW300FN Cargador',    vehicleTypes: ['machinery'] },
    // ── Maquinaria: Caterpillar (adicionales) ─────────────────────────────────
    { id: 'cat-336',   brandId: 'caterpillar', name: '336 Excavadora',      vehicleTypes: ['machinery'] },
    { id: 'cat-966m',  brandId: 'caterpillar', name: '966M Cargador',       vehicleTypes: ['machinery'] },
    { id: 'cat-d6t',   brandId: 'caterpillar', name: 'D6T Bulldozer',       vehicleTypes: ['machinery'] },
    { id: 'cat-140m',  brandId: 'caterpillar', name: '140M Motoniveladora', vehicleTypes: ['machinery'] },
    // ── Maquinaria: Komatsu (adicionales) ────────────────────────────────────
    { id: 'komatsu-pc360', brandId: 'komatsu', name: 'PC360',          vehicleTypes: ['machinery'] },
    { id: 'komatsu-wa320', brandId: 'komatsu', name: 'WA320 Cargador', vehicleTypes: ['machinery'] },
    { id: 'komatsu-d65',   brandId: 'komatsu', name: 'D65 Bulldozer',  vehicleTypes: ['machinery'] },
    // ── Maquinaria: John Deere (adicionales) ─────────────────────────────────
    { id: 'jd-310l',    brandId: 'john-deere', name: '310L Retroexcavadora', vehicleTypes: ['machinery'] },
    { id: 'jd-644k',    brandId: 'john-deere', name: '644K Cargador',        vehicleTypes: ['machinery'] },
    { id: 'jd-8r-280',  brandId: 'john-deere', name: '8R 280 Tractor',       vehicleTypes: ['machinery'] },
    // ── Náutico: Sea-Doo ──────────────────────────────────────────────────────
    { id: 'sea-doo-spark',      brandId: 'sea-doo', name: 'Spark',      vehicleTypes: ['nautical'] },
    { id: 'sea-doo-gti',        brandId: 'sea-doo', name: 'GTI 130',    vehicleTypes: ['nautical'] },
    { id: 'sea-doo-gtr',        brandId: 'sea-doo', name: 'GTR 230',    vehicleTypes: ['nautical'] },
    { id: 'sea-doo-rxpx',       brandId: 'sea-doo', name: 'RXP-X 300', vehicleTypes: ['nautical'] },
    // ── Náutico: Boston Whaler ────────────────────────────────────────────────
    { id: 'bw-130-super-sport', brandId: 'boston-whaler', name: '130 Super Sport', vehicleTypes: ['nautical'] },
    { id: 'bw-170-dauntless',   brandId: 'boston-whaler', name: '170 Dauntless',   vehicleTypes: ['nautical'] },
    { id: 'bw-270-dauntless',   brandId: 'boston-whaler', name: '270 Dauntless',   vehicleTypes: ['nautical'] },
    // ── Náutico: Tracker ──────────────────────────────────────────────────────
    { id: 'tracker-pro-team-175', brandId: 'tracker', name: 'Pro Team 175 TXW', vehicleTypes: ['nautical'] },
    { id: 'tracker-pro-guide-v16',brandId: 'tracker', name: 'Pro Guide V-16 WT', vehicleTypes: ['nautical'] },
    // ── Náutico: Yamaha (motos agua) ──────────────────────────────────────────
    { id: 'yamaha-fx-svho',brandId: 'yamaha', name: 'FX SVHO',   vehicleTypes: ['nautical'] },
    { id: 'yamaha-vx-c',   brandId: 'yamaha', name: 'VX Cruiser',vehicleTypes: ['nautical'] },
    // ── Aéreo: Piper ──────────────────────────────────────────────────────────
    { id: 'piper-pa28-archer',  brandId: 'piper', name: 'PA-28 Archer',    vehicleTypes: ['aerial'] },
    { id: 'piper-pa34-seneca',  brandId: 'piper', name: 'PA-34 Seneca',    vehicleTypes: ['aerial'] },
    { id: 'piper-pa44-seminole',brandId: 'piper', name: 'PA-44 Seminole',  vehicleTypes: ['aerial'] },
    // ── Aéreo: Beechcraft ─────────────────────────────────────────────────────
    { id: 'beechcraft-bonanza',  brandId: 'beechcraft', name: 'Bonanza G36',    vehicleTypes: ['aerial'] },
    { id: 'beechcraft-king-air', brandId: 'beechcraft', name: 'King Air C90',   vehicleTypes: ['aerial'] },
    { id: 'beechcraft-baron',    brandId: 'beechcraft', name: 'Baron G58',      vehicleTypes: ['aerial'] },
    // ── Aéreo: Robinson ───────────────────────────────────────────────────────
    { id: 'robinson-r22', brandId: 'robinson', name: 'R22', vehicleTypes: ['aerial'] },
    { id: 'robinson-r44', brandId: 'robinson', name: 'R44', vehicleTypes: ['aerial'] },
    { id: 'robinson-r66', brandId: 'robinson', name: 'R66', vehicleTypes: ['aerial'] },
    // ── Aéreo: Bell ───────────────────────────────────────────────────────────
    { id: 'bell-206',  brandId: 'bell', name: 'Bell 206',  vehicleTypes: ['aerial'] },
    { id: 'bell-407',  brandId: 'bell', name: 'Bell 407',  vehicleTypes: ['aerial'] },
    { id: 'bell-429',  brandId: 'bell', name: 'Bell 429',  vehicleTypes: ['aerial'] },
];

const FALLBACK_REGIONS: CatalogRegion[] = [
    { id: 'cl-15', name: 'Arica y Parinacota', code: '15' },
    { id: 'cl-01', name: 'Tarapacá', code: '1' },
    { id: 'cl-02', name: 'Antofagasta', code: '2' },
    { id: 'cl-03', name: 'Atacama', code: '3' },
    { id: 'cl-04', name: 'Coquimbo', code: '4' },
    { id: 'cl-05', name: 'Valparaíso', code: '5' },
    { id: 'cl-13', name: 'Región Metropolitana', code: '13' },
    { id: 'cl-06', name: "O'Higgins", code: '6' },
    { id: 'cl-07', name: 'Maule', code: '7' },
    { id: 'cl-16', name: 'Ñuble', code: '16' },
    { id: 'cl-08', name: 'Biobío', code: '8' },
    { id: 'cl-09', name: 'Araucanía', code: '9' },
    { id: 'cl-14', name: 'Los Ríos', code: '14' },
    { id: 'cl-10', name: 'Los Lagos', code: '10' },
    { id: 'cl-11', name: 'Aysén', code: '11' },
    { id: 'cl-12', name: 'Magallanes y Antártica Chilena', code: '12' },
];

const FALLBACK_COMMUNES: CatalogCommune[] = [
    // Región Metropolitana (cl-13)
    { id: 'rm-santiago', regionId: 'cl-13', name: 'Santiago' },
    { id: 'rm-cerrillos', regionId: 'cl-13', name: 'Cerrillos' },
    { id: 'rm-cerro-navia', regionId: 'cl-13', name: 'Cerro Navia' },
    { id: 'rm-conchali', regionId: 'cl-13', name: 'Conchalí' },
    { id: 'rm-el-bosque', regionId: 'cl-13', name: 'El Bosque' },
    { id: 'rm-estacion-central', regionId: 'cl-13', name: 'Estación Central' },
    { id: 'rm-huechuraba', regionId: 'cl-13', name: 'Huechuraba' },
    { id: 'rm-independencia', regionId: 'cl-13', name: 'Independencia' },
    { id: 'rm-la-cisterna', regionId: 'cl-13', name: 'La Cisterna' },
    { id: 'rm-la-florida', regionId: 'cl-13', name: 'La Florida' },
    { id: 'rm-la-granja', regionId: 'cl-13', name: 'La Granja' },
    { id: 'rm-la-pintana', regionId: 'cl-13', name: 'La Pintana' },
    { id: 'rm-la-reina', regionId: 'cl-13', name: 'La Reina' },
    { id: 'rm-las-condes', regionId: 'cl-13', name: 'Las Condes' },
    { id: 'rm-lo-barnechea', regionId: 'cl-13', name: 'Lo Barnechea' },
    { id: 'rm-lo-espejo', regionId: 'cl-13', name: 'Lo Espejo' },
    { id: 'rm-lo-prado', regionId: 'cl-13', name: 'Lo Prado' },
    { id: 'rm-macul', regionId: 'cl-13', name: 'Macul' },
    { id: 'rm-maipu', regionId: 'cl-13', name: 'Maipú' },
    { id: 'rm-nunoa', regionId: 'cl-13', name: 'Ñuñoa' },
    { id: 'rm-pedro-aguirre-cerda', regionId: 'cl-13', name: 'Pedro Aguirre Cerda' },
    { id: 'rm-penalolen', regionId: 'cl-13', name: 'Peñalolén' },
    { id: 'rm-providencia', regionId: 'cl-13', name: 'Providencia' },
    { id: 'rm-pudahuel', regionId: 'cl-13', name: 'Pudahuel' },
    { id: 'rm-quilicura', regionId: 'cl-13', name: 'Quilicura' },
    { id: 'rm-quinta-normal', regionId: 'cl-13', name: 'Quinta Normal' },
    { id: 'rm-recoleta', regionId: 'cl-13', name: 'Recoleta' },
    { id: 'rm-renca', regionId: 'cl-13', name: 'Renca' },
    { id: 'rm-san-joaquin', regionId: 'cl-13', name: 'San Joaquín' },
    { id: 'rm-san-miguel', regionId: 'cl-13', name: 'San Miguel' },
    { id: 'rm-san-ramon', regionId: 'cl-13', name: 'San Ramón' },
    { id: 'rm-vitacura', regionId: 'cl-13', name: 'Vitacura' },
    { id: 'rm-puente-alto', regionId: 'cl-13', name: 'Puente Alto' },
    { id: 'rm-pirque', regionId: 'cl-13', name: 'Pirque' },
    { id: 'rm-san-jose-de-maipo', regionId: 'cl-13', name: 'San José de Maipo' },
    // Valparaíso (cl-05)
    { id: 'v-valpo', regionId: 'cl-05', name: 'Valparaíso' },
    { id: 'v-casablanca', regionId: 'cl-05', name: 'Casablanca' },
    { id: 'v-concon', regionId: 'cl-05', name: 'Concón' },
    { id: 'v-el-quisco', regionId: 'cl-05', name: 'El Quisco' },
    { id: 'v-el-tabo', regionId: 'cl-05', name: 'El Tabo' },
    { id: 'v-islade-pascua', regionId: 'cl-05', name: 'Isla de Pascua' },
    { id: 'v-juan-fernandez', regionId: 'cl-05', name: 'Juan Fernández' },
    { id: 'v-la-ligua', regionId: 'cl-05', name: 'La Ligua' },
    { id: 'v-papudo', regionId: 'cl-05', name: 'Papudo' },
    { id: 'v-petorca', regionId: 'cl-05', name: 'Petorca' },
    { id: 'v-puchuncavi', regionId: 'cl-05', name: 'Puchuncaví' },
    { id: 'v-putaendo', regionId: 'cl-05', name: 'Putaendo' },
    { id: 'v-quillota', regionId: 'cl-05', name: 'Quillota' },
    { id: 'v-quintero', regionId: 'cl-05', name: 'Quintero' },
    { id: 'v-los-andes', regionId: 'cl-05', name: 'Los Andes' },
    { id: 'v-calera', regionId: 'cl-05', name: 'Calera' },
    { id: 'v-san-antonio', regionId: 'cl-05', name: 'San Antonio' },
    { id: 'v-santo-domingo', regionId: 'cl-05', name: 'Santo Domingo' },
    { id: 'v-san-felipe', regionId: 'cl-05', name: 'San Felipe' },
    { id: 'v-catemu', regionId: 'cl-05', name: 'Catemu' },
    { id: 'v-llaillay', regionId: 'cl-05', name: 'Llaillay' },
    { id: 'v-panquehue', regionId: 'cl-05', name: 'Panquehue' },
    { id: 'v-putaendo', regionId: 'cl-05', name: 'Putaendo' },
    { id: 'v-santa-maria', regionId: 'cl-05', name: 'Santa María' },
    { id: 'v-vina', regionId: 'cl-05', name: 'Viña del Mar' },
    { id: 'v-zapallar', regionId: 'cl-05', name: 'Zapallar' },
    { id: 'v-quilpue', regionId: 'cl-05', name: 'Quilpué' },
    { id: 'v-villa-alemana', regionId: 'cl-05', name: 'Villa Alemana' },
    // Biobío (cl-08)
    { id: 'bio-conce', regionId: 'cl-08', name: 'Concepción' },
    { id: 'bio-talcahuano', regionId: 'cl-08', name: 'Talcahuano' },
    { id: 'bio-hualpen', regionId: 'cl-08', name: 'Hualpén' },
    { id: 'bio-hualqui', regionId: 'cl-08', name: 'Hualqui' },
    { id: 'bio-coronel', regionId: 'cl-08', name: 'Coronel' },
    { id: 'bio-lo-miranda', regionId: 'cl-08', name: 'Lota' },
    { id: 'bio-penco', regionId: 'cl-08', name: 'Penco' },
    { id: 'bio-tome', regionId: 'cl-08', name: 'Tomé' },
    { id: 'bio-flores', regionId: 'cl-08', name: 'Florida' },
    { id: 'bio-hualqui', regionId: 'cl-08', name: 'Hualqui' },
    { id: 'bio-los-angeles', regionId: 'cl-08', name: 'Los Ángeles' },
    { id: 'bio-antuco', regionId: 'cl-08', name: 'Antuco' },
    { id: 'bio-cabrero', regionId: 'cl-08', name: 'Cabrero' },
    { id: 'bio-laja', regionId: 'cl-08', name: 'Laja' },
    { id: 'bio-mulchen', regionId: 'cl-08', name: 'Mulchén' },
    { id: 'bio-nacimiento', regionId: 'cl-08', name: 'Nacimiento' },
    { id: 'bio-negrete', regionId: 'cl-08', name: 'Negrete' },
    { id: 'bio-quilleco', regionId: 'cl-08', name: 'Quilleco' },
    { id: 'bio-san-rosendo', regionId: 'cl-08', name: 'San Rosendo' },
    { id: 'bio-santa-barbara', regionId: 'cl-08', name: 'Santa Bárbara' },
    { id: 'bio-tucapel', regionId: 'cl-08', name: 'Tucapel' },
    { id: 'bio-yumbel', regionId: 'cl-08', name: 'Yumbel' },
    { id: 'bio-alto-biobio', regionId: 'cl-08', name: 'Alto Biobío' },
    { id: 'bio-arauco', regionId: 'cl-08', name: 'Arauco' },
    { id: 'bio-cañete', regionId: 'cl-08', name: 'Cañete' },
    { id: 'bio-contulmo', regionId: 'cl-08', name: 'Contulmo' },
    { id: 'bio-curanipe', regionId: 'cl-08', name: 'Curanipe' },
    { id: 'bio-lebu', regionId: 'cl-08', name: 'Lebu' },
    { id: 'bio-los-alamos', regionId: 'cl-08', name: 'Los Álamos' },
    { id: 'bio-tirua', regionId: 'cl-08', name: 'Tirúa' },
    { id: 'bio-chillan', regionId: 'cl-08', name: 'Chillán' },
    { id: 'bio-chillan-viejo', regionId: 'cl-08', name: 'Chillán Viejo' },
    { id: 'bio-bulnes', regionId: 'cl-08', name: 'Bulnes' },
    { id: 'bio-cobquecura', regionId: 'cl-08', name: 'Cobquecura' },
    { id: 'bio-coihueco', regionId: 'cl-08', name: 'Coihueco' },
    { id: 'bio-coyhaique', regionId: 'cl-08', name: 'Coyhaique' },
    { id: 'bio-el-carmen', regionId: 'cl-08', name: 'El Carmen' },
    { id: 'bio-ninhue', regionId: 'cl-08', name: 'Ñiquén' },
    { id: 'bio-pemuco', regionId: 'cl-08', name: 'Pemuco' },
    { id: 'bio-pinto', regionId: 'cl-08', name: 'Pinto' },
    { id: 'bio-portezuelo', regionId: 'cl-08', name: 'Portezuelo' },
    { id: 'bio-quillon', regionId: 'cl-08', name: 'Quillón' },
    { id: 'bio-quirihue', regionId: 'cl-08', name: 'Quirihue' },
    { id: 'bio-san-carlos', regionId: 'cl-08', name: 'San Carlos' },
    { id: 'bio-san-fabian', regionId: 'cl-08', name: 'San Fabián' },
    { id: 'bio-san-ignacio', regionId: 'cl-08', name: 'San Ignacio' },
    { id: 'bio-san-nicolas', regionId: 'cl-08', name: 'San Nicolás' },
    { id: 'bio-tregua', regionId: 'cl-08', name: 'Tregua' },
    { id: 'bio-yungay', regionId: 'cl-08', name: 'Yungay' },
    // Coquimbo (cl-04)
    { id: 'coq-serena', regionId: 'cl-04', name: 'La Serena' },
    { id: 'coq-coquimbo', regionId: 'cl-04', name: 'Coquimbo' },
    { id: 'coq-andacollo', regionId: 'cl-04', name: 'Andacollo' },
    { id: 'coq-canela', regionId: 'cl-04', name: 'Canela' },
    { id: 'coq-combarbala', regionId: 'cl-04', name: 'Combarbalá' },
    { id: 'coq-illapel', regionId: 'cl-04', name: 'Illapel' },
    { id: 'coq-los-vilos', regionId: 'cl-04', name: 'Los Vilos' },
    { id: 'coq-monte-patria', regionId: 'cl-04', name: 'Monte Patria' },
    { id: 'coq-ovalle', regionId: 'cl-04', name: 'Ovalle' },
    { id: 'coq-paihuano', regionId: 'cl-04', name: 'Paihuano' },
    { id: 'coq-punitaqui', regionId: 'cl-04', name: 'Punitaqui' },
    { id: 'coq-rio-hurtado', regionId: 'cl-04', name: 'Río Hurtado' },
    { id: 'coq-salamanca', regionId: 'cl-04', name: 'Salamanca' },
    { id: 'coq-vicuna', regionId: 'cl-04', name: 'Vicuña' },
    // Araucanía (cl-09)
    { id: 'ara-temuco', regionId: 'cl-09', name: 'Temuco' },
    { id: 'ara-carahue', regionId: 'cl-09', name: 'Carahue' },
    { id: 'ara-cholchol', regionId: 'cl-09', name: 'Cholchol' },
    { id: 'ara-collipulli', regionId: 'cl-09', name: 'Collipulli' },
    { id: 'ara-cunco', regionId: 'cl-09', name: 'Cunco' },
    { id: 'ara-curacautin', regionId: 'cl-09', name: 'Curacautín' },
    { id: 'ara-curarrehue', regionId: 'cl-09', name: 'Curarrehue' },
    { id: 'ara-ercilla', regionId: 'cl-09', name: 'Ercilla' },
    { id: 'ara-freire', regionId: 'cl-09', name: 'Freire' },
    { id: 'ara-galvarino', regionId: 'cl-09', name: 'Galvarino' },
    { id: 'ara-gorbea', regionId: 'cl-09', name: 'Gorbea' },
    { id: 'ara-lautaro', regionId: 'cl-09', name: 'Lautaro' },
    { id: 'ara-loncoche', regionId: 'cl-09', name: 'Loncoche' },
    { id: 'ara-lonquimay', regionId: 'cl-09', name: 'Lonquimay' },
    { id: 'ara-los-sauces', regionId: 'cl-09', name: 'Los Sauces' },
    { id: 'ara-lumaco', regionId: 'cl-09', name: 'Lumaco' },
    { id: 'ara-melipeuco', regionId: 'cl-09', name: 'Melipeuco' },
    { id: 'ara-nueva-imperial', regionId: 'cl-09', name: 'Nueva Imperial' },
    { id: 'ara-padre-las-casas', regionId: 'cl-09', name: 'Padre las Casas' },
    { id: 'ara-perquenco', regionId: 'cl-09', name: 'Perquenco' },
    { id: 'ara-pitrufquen', regionId: 'cl-09', name: 'Pitrufquén' },
    { id: 'ara-pucon', regionId: 'cl-09', name: 'Pucón' },
    { id: 'ara-puren', regionId: 'cl-09', name: 'Purén' },
    { id: 'ara-renaico', regionId: 'cl-09', name: 'Renaico' },
    { id: 'ara-saavedra', regionId: 'cl-09', name: 'Saavedra' },
    { id: 'ara-teodoro-schmidt', regionId: 'cl-09', name: 'Teodoro Schmidt' },
    { id: 'ara-tolten', regionId: 'cl-09', name: 'Toltén' },
    { id: 'ara-traiguen', regionId: 'cl-09', name: 'Traiguén' },
    { id: 'ara-victoria', regionId: 'cl-09', name: 'Victoria' },
    { id: 'ara-vilcun', regionId: 'cl-09', name: 'Vilcún' },
    { id: 'ara-villarrica', regionId: 'cl-09', name: 'Villarrica' },
    // Los Lagos (cl-10)
    { id: 'll-pmontt', regionId: 'cl-10', name: 'Puerto Montt' },
    { id: 'll-calbuco', regionId: 'cl-10', name: 'Calbuco' },
    { id: 'll-castro', regionId: 'cl-10', name: 'Castro' },
    { id: 'll-chaiten', regionId: 'cl-10', name: 'Chaitén' },
    { id: 'll-chonchi', regionId: 'cl-10', name: 'Chonchi' },
    { id: 'll-curaco-de-velez', regionId: 'cl-10', name: 'Curaco de Vélez' },
    { id: 'll-fresia', regionId: 'cl-10', name: 'Fresia' },
    { id: 'll-futaleufu', regionId: 'cl-10', name: 'Futaleufú' },
    { id: 'll-frutillar', regionId: 'cl-10', name: 'Frutillar' },
    { id: 'll-llanquihue', regionId: 'cl-10', name: 'Llanquihue' },
    { id: 'll-los-llagos', regionId: 'cl-10', name: 'Los Lagos' },
    { id: 'll-maullin', regionId: 'cl-10', name: 'Maullín' },
    { id: 'll-osorno', regionId: 'cl-10', name: 'Osorno' },
    { id: 'll-puerto-varas', regionId: 'cl-10', name: 'Puerto Varas' },
    { id: 'll-puerto-octay', regionId: 'cl-10', name: 'Puerto Octay' },
    { id: 'll-purranque', regionId: 'cl-10', name: 'Purranque' },
    { id: 'll-puyehue', regionId: 'cl-10', name: 'Puyehue' },
    { id: 'll-queilen', regionId: 'cl-10', name: 'Queilén' },
    { id: 'll-quellon', regionId: 'cl-10', name: 'Quellón' },
    { id: 'll-quinchao', regionId: 'cl-10', name: 'Quinchao' },
    { id: 'll-rio-negro', regionId: 'cl-10', name: 'Río Negro' },
    { id: 'll-san-pablo', regionId: 'cl-10', name: 'San Pablo' },
    { id: 'll-san-juan-de-la-costa', regionId: 'cl-10', name: 'San Juan de la Costa' },
    // O'Higgins (cl-06)
    { id: 'oh-rancagua', regionId: 'cl-06', name: 'Rancagua' },
    { id: 'oh-codegua', regionId: 'cl-06', name: 'Codegua' },
    { id: 'oh-coltauco', regionId: 'cl-06', name: 'Coltauco' },
    { id: 'oh-doñihue', regionId: 'cl-06', name: 'Doñihue' },
    { id: 'oh-graneros', regionId: 'cl-06', name: 'Graneros' },
    { id: 'oh-las-cabras', regionId: 'cl-06', name: 'Las Cabras' },
    { id: 'oh-machali', regionId: 'cl-06', name: 'Machalí' },
    { id: 'oh-malloa', regionId: 'cl-06', name: 'Malloa' },
    { id: 'oh-mostazal', regionId: 'cl-06', name: 'Mostazal' },
    { id: 'oh-olivar', regionId: 'cl-06', name: 'Olivar' },
    { id: 'oh-peumo', regionId: 'cl-06', name: 'Peumo' },
    { id: 'oh-pichidegua', regionId: 'cl-06', name: 'Pichidegua' },
    { id: 'oh-quinta-de-tilcoco', regionId: 'cl-06', name: 'Quinta de Tilcoco' },
    { id: 'oh-rancagua', regionId: 'cl-06', name: 'Rancagua' },
    { id: 'oh-rengo', regionId: 'cl-06', name: 'Rengo' },
    { id: 'oh-requinoa', regionId: 'cl-06', name: 'Requínoa' },
    { id: 'oh-san-fernando', regionId: 'cl-06', name: 'San Fernando' },
    { id: 'oh-san-vicente', regionId: 'cl-06', name: 'San Vicente' },
    { id: 'oh-pichilemu', regionId: 'cl-06', name: 'Pichilemu' },
    { id: 'oh-litueche', regionId: 'cl-06', name: 'Litueche' },
    { id: 'oh-marchigue', regionId: 'cl-06', name: 'Marchigüe' },
    { id: 'oh-navidad', regionId: 'cl-06', name: 'Navidad' },
    { id: 'oh-la-estrella', regionId: 'cl-06', name: 'La Estrella' },
    { id: 'oh-paredones', regionId: 'cl-06', name: 'Paredones' },
    // Maule (cl-07)
    { id: 'ma-talca', regionId: 'cl-07', name: 'Talca' },
    { id: 'ma-constitucion', regionId: 'cl-07', name: 'Constitución' },
    { id: 'ma-curepto', regionId: 'cl-07', name: 'Curepto' },
    { id: 'ma-empedrado', regionId: 'cl-07', name: 'Empedrado' },
    { id: 'ma-maule', regionId: 'cl-07', name: 'Maule' },
    { id: 'ma-pelarco', regionId: 'cl-07', name: 'Pelarco' },
    { id: 'ma-pencahue', regionId: 'cl-07', name: 'Pencahue' },
    { id: 'ma-rio-claro', regionId: 'cl-07', name: 'Río Claro' },
    { id: 'ma-san-clemente', regionId: 'cl-07', name: 'San Clemente' },
    { id: 'ma-san-rafael', regionId: 'cl-07', name: 'San Rafael' },
    { id: 'ma-talca', regionId: 'cl-07', name: 'Talca' },
    { id: 'ma-cauquenes', regionId: 'cl-07', name: 'Cauquenes' },
    { id: 'ma-chanco', regionId: 'cl-07', name: 'Chanco' },
    { id: 'ma-pelluhue', regionId: 'cl-07', name: 'Pelluhue' },
    { id: 'ma-curico', regionId: 'cl-07', name: 'Curicó' },
    { id: 'ma-hualane', regionId: 'cl-07', name: 'Hualañé' },
    { id: 'ma-licanten', regionId: 'cl-07', name: 'Licantén' },
    { id: 'ma-molina', regionId: 'cl-07', name: 'Molina' },
    { id: 'ma-rauco', regionId: 'cl-07', name: 'Rauco' },
    { id: 'ma-romeral', regionId: 'cl-07', name: 'Romeral' },
    { id: 'ma-sagrada-familia', regionId: 'cl-07', name: 'Sagrada Familia' },
    { id: 'ma-teno', regionId: 'cl-07', name: 'Teno' },
    { id: 'ma-vichuquen', regionId: 'cl-07', name: 'Vichuquén' },
    { id: 'ma-linares', regionId: 'cl-07', name: 'Linares' },
    { id: 'ma-colbun', regionId: 'cl-07', name: 'Colbún' },
    { id: 'ma-longavi', regionId: 'cl-07', name: 'Longaví' },
    { id: 'ma-parral', regionId: 'cl-07', name: 'Parral' },
    { id: 'ma-retiro', regionId: 'cl-07', name: 'Retiro' },
    { id: 'ma-san-javier', regionId: 'cl-07', name: 'San Javier' },
    { id: 'ma-villa-alegre', regionId: 'cl-07', name: 'Villa Alegre' },
    { id: 'ma-yerbas-buenas', regionId: 'cl-07', name: 'Yerbas Buenas' },
    // Ñuble (cl-16)
    { id: 'nb-chillan', regionId: 'cl-16', name: 'Chillán' },
    { id: 'nb-chillan-viejo', regionId: 'cl-16', name: 'Chillán Viejo' },
    { id: 'nb-bulnes', regionId: 'cl-16', name: 'Bulnes' },
    { id: 'nb-cobquecura', regionId: 'cl-16', name: 'Cobquecura' },
    { id: 'nb-coihueco', regionId: 'cl-16', name: 'Coihueco' },
    { id: 'nb-el-carmen', regionId: 'cl-16', name: 'El Carmen' },
    { id: 'nb-ninhue', regionId: 'cl-16', name: 'Ñiquén' },
    { id: 'nb-pemuco', regionId: 'cl-16', name: 'Pemuco' },
    { id: 'nb-pinto', regionId: 'cl-16', name: 'Pinto' },
    { id: 'nb-portezuelo', regionId: 'cl-16', name: 'Portezuelo' },
    { id: 'nb-quillon', regionId: 'cl-16', name: 'Quillón' },
    { id: 'nb-quirihue', regionId: 'cl-16', name: 'Quirihue' },
    { id: 'nb-san-carlos', regionId: 'cl-16', name: 'San Carlos' },
    { id: 'nb-san-fabian', regionId: 'cl-16', name: 'San Fabián' },
    { id: 'nb-san-ignacio', regionId: 'cl-16', name: 'San Ignacio' },
    { id: 'nb-san-nicolas', regionId: 'cl-16', name: 'San Nicolás' },
    { id: 'nb-tregua', regionId: 'cl-16', name: 'Tregua' },
    { id: 'nb-yungay', regionId: 'cl-16', name: 'Yungay' },
    { id: 'nb-cobquecura', regionId: 'cl-16', name: 'Cobquecura' },
    { id: 'nb-coihueco', regionId: 'cl-16', name: 'Coihueco' },
    { id: 'nb-ninhue', regionId: 'cl-16', name: 'Ñiquén' },
    { id: 'nb-quillon', regionId: 'cl-16', name: 'Quillón' },
    { id: 'nb-quirihue', regionId: 'cl-16', name: 'Quirihue' },
    // Antofagasta (cl-02)
    { id: 'ant-antofagasta', regionId: 'cl-02', name: 'Antofagasta' },
    { id: 'ant-mejillones', regionId: 'cl-02', name: 'Mejillones' },
    { id: 'ant-sierra-gorda', regionId: 'cl-02', name: 'Sierra Gorda' },
    { id: 'ant-taltal', regionId: 'cl-02', name: 'Taltal' },
    { id: 'ant-calama', regionId: 'cl-02', name: 'Calama' },
    { id: 'ant-olague', regionId: 'cl-02', name: 'Ollagüe' },
    { id: 'ant-san-pedro-de-atacama', regionId: 'cl-02', name: 'San Pedro de Atacama' },
    { id: 'ant-toconao', regionId: 'cl-02', name: 'Toconao' },
    { id: 'ant-tocopilla', regionId: 'cl-02', name: 'Tocopilla' },
    { id: 'ant-maria-elena', regionId: 'cl-02', name: 'María Elena' },
    // Atacama (cl-03)
    { id: 'ata-copiapo', regionId: 'cl-03', name: 'Copiapó' },
    { id: 'ata-caldera', regionId: 'cl-03', name: 'Caldera' },
    { id: 'ata-tierra-amarilla', regionId: 'cl-03', name: 'Tierra Amarilla' },
    { id: 'ata-chañaral', regionId: 'cl-03', name: 'Chañaral' },
    { id: 'ata-diego-de-almagro', regionId: 'cl-03', name: 'Diego de Almagro' },
    { id: 'ata-potreros', regionId: 'cl-03', name: 'Potrerillos' },
    { id: 'ata-el-salvador', regionId: 'cl-03', name: 'El Salvador' },
    { id: 'ata-vallenar', regionId: 'cl-03', name: 'Vallenar' },
    { id: 'ata-alto-del-carmen', regionId: 'cl-03', name: 'Alto del Carmen' },
    { id: 'ata-canela', regionId: 'cl-03', name: 'Canela' },
    { id: 'ata-freirina', regionId: 'cl-03', name: 'Freirina' },
    { id: 'ata-huasco', regionId: 'cl-03', name: 'Huasco' },
    // Tarapacá (cl-01)
    { id: 'tar-iquique', regionId: 'cl-01', name: 'Iquique' },
    { id: 'tar-alto-hospicio', regionId: 'cl-01', name: 'Alto Hospicio' },
    { id: 'tar-pozo-almonte', regionId: 'cl-01', name: 'Pozo Almonte' },
    { id: 'tar-camiña', regionId: 'cl-01', name: 'Camiña' },
    { id: 'tar-colchane', regionId: 'cl-01', name: 'Colchane' },
    { id: 'tar-huara', regionId: 'cl-01', name: 'Huara' },
    { id: 'tar-pica', regionId: 'cl-01', name: 'Pica' },
    // Arica y Parinacota (cl-15)
    { id: 'ar-arica', regionId: 'cl-15', name: 'Arica' },
    { id: 'ar-camarones', regionId: 'cl-15', name: 'Camarones' },
    { id: 'ar-putre', regionId: 'cl-15', name: 'Putre' },
    { id: 'ar-general-lagos', regionId: 'cl-15', name: 'General Lagos' },
    // Los Ríos (cl-14)
    { id: 'lr-valdivia', regionId: 'cl-14', name: 'Valdivia' },
    { id: 'lr-corral', regionId: 'cl-14', name: 'Corral' },
    { id: 'nr-lanco', regionId: 'cl-14', name: 'Lanco' },
    { id: 'lr-los-laureles', regionId: 'cl-14', name: 'Los Laureles' },
    { id: 'lr-mafil', regionId: 'cl-14', name: 'Máfil' },
    { id: 'nr-mariquina', regionId: 'cl-14', name: 'Mariquina' },
    { id: 'lr-paillaco', regionId: 'cl-14', name: 'Paillaco' },
    { id: 'lr-panguipulli', regionId: 'cl-14', name: 'Panguipulli' },
    { id: 'nr-rio-bueno', regionId: 'cl-14', name: 'Río Bueno' },
    { id: 'lr-futrono', regionId: 'cl-14', name: 'Futrono' },
    { id: 'nr-lago-ranco', regionId: 'cl-14', name: 'Lago Ranco' },
    { id: 'lr-lago-ranco', regionId: 'cl-14', name: 'Lago Ranco' },
    { id: 'nr-la-union', regionId: 'cl-14', name: 'La Unión' },
    { id: 'lr-futrono', regionId: 'cl-14', name: 'Futrono' },
    // Aysén (cl-11)
    { id: 'ays-coyhaique', regionId: 'cl-11', name: 'Coyhaique' },
    { id: 'ays-lago-verde', regionId: 'cl-11', name: 'Lago Verde' },
    { id: 'ays-aisen', regionId: 'cl-11', name: 'Aysén' },
    { id: 'ays-cisnes', regionId: 'cl-11', name: 'Cisnes' },
    { id: 'ays-guaitecas', regionId: 'cl-11', name: 'Guaitecas' },
    { id: 'ays-rio-ibanez', regionId: 'cl-11', name: 'Río Ibáñez' },
    { id: 'ays-tortel', regionId: 'cl-11', name: 'Tortel' },
    // Magallanes (cl-12)
    { id: 'mag-punta-arenas', regionId: 'cl-12', name: 'Punta Arenas' },
    { id: 'mag-laguna-blanca', regionId: 'cl-12', name: 'Laguna Blanca' },
    { id: 'mag-rio-verde', regionId: 'cl-12', name: 'Río Verde' },
    { id: 'mag-san-gregorio', regionId: 'cl-12', name: 'San Gregorio' },
    { id: 'mag-porvenir', regionId: 'cl-12', name: 'Porvenir' },
    { id: 'mag-primavera', regionId: 'cl-12', name: 'Primavera' },
    { id: 'mag-timaukel', regionId: 'cl-12', name: 'Timaukel' },
    { id: 'mag-navarino', regionId: 'cl-12', name: 'Navarino' },
    { id: 'mag-antartica', regionId: 'cl-12', name: 'Antártica' },
];

const FALLBACK_VERSIONS: CatalogVersion[] = [];

const CATALOG_PATHS = [
    '/seeds/simpleautos-catalog.json',
    '/seeds/autos-catalog.json',
    '/seeds/supabase-autos-catalog.json',
];

const GENERIC_VERSION_OPTIONS_BY_TYPE: Record<VehicleCatalogType, string[]> = {
    car: ['Base', 'Comfort', 'Full', 'Manual', 'Automático', 'Turbo', 'Hybrid', '4x4'],
    motorcycle: ['Standard', 'ABS', 'Adventure', 'Touring', 'Sport', 'Naked'],
    truck: ['4x2', '6x2', '6x4', 'Tracto', 'Tolva', 'Furgón'],
    bus: ['Urbano', 'Interurbano', 'Escolar', 'Turismo', 'Midi', 'Minibús'],
    machinery: ['Standard', 'Cabina', 'Oruga', 'Ruedas', 'Retroexcavadora', 'Excavadora'],
    nautical: ['Open', 'Cabinada', 'Sport', 'Pesca', 'Touring'],
    aerial: ['Standard', 'Glass Cockpit', 'Training', 'Utility'],
};

export const CURATED_VERSION_OPTIONS_BY_MODEL_KEY: Record<string, string[]> = {
    // Toyota
    'toyota:corolla': ['XLi 1.8L MT', 'GLi 1.8L AT', 'SE-G 1.8L AT', 'Hybrid 1.8L CVT', 'GR-S 2.0L AT'],
    'toyota:corolla cross': ['Xi 2.0L CVT', 'XEi 2.0L CVT', 'SEG 2.0L CVT', 'Hybrid 1.8L', 'GR-S 2.0L'],
    'toyota:rav4': ['LE 2.5L CVT', 'XLE 2.5L CVT', 'Limited 2.5L CVT', 'Adventure 2.5L AWD', 'Hybrid 2.5L AWD'],
    'toyota:yaris': ['Sport 1.5L MT', 'XLi 1.5L MT', 'GLi 1.5L AT', 'XS 1.5L AT', 'XLS 1.5L AT'],
    'toyota:hilux': ['DX 2.4L MT', 'SR 2.4L MT', 'SRV 2.4L AT', 'SRX 2.8L AT', 'GR-S 2.8L AT'],
    'toyota:fortuner': ['SW4 SRV 2.7L', 'SW4 SRX 2.8L AT', 'SW4 Diamond 2.8L AT'],
    'toyota:prado': ['TX 2.7L MT', 'TXL 2.7L AT', 'VXL 3.0L AT'],
    // Hyundai
    'hyundai:accent': ['GL 1.4L MT', 'GLS 1.4L AT', 'GL Connect 1.4L AT'],
    'hyundai:tucson': ['GL 2.0L MT', 'GLS 2.0L AT', 'Limited 2.0L AT', 'Hybrid 1.6T AWD'],
    'hyundai:santa fe': ['Value 2.5L AT', 'Premium 2.5L AT', 'Limited 2.5L AT', 'Hybrid 1.6T AWD'],
    'hyundai:creta': ['GL 1.5L MT', 'GLS 1.5L AT', 'Premium 1.5T AT', 'Limited 1.5T AT'],
    'hyundai:elantra': ['GLS 2.0L MT', 'GLS 2.0L AT', 'Limited 2.0L AT'],
    'hyundai:staria': ['GL 3.5L AT', 'GLS 3.5L AT'],
    // Kia
    'kia:rio': ['LX 1.4L MT', 'EX 1.4L AT', 'Sedán LX 1.4L MT', 'HB EX 1.4L AT'],
    'kia:sportage': ['LX 2.0L MT', 'EX 2.0L AT', 'SX 2.0T AT', 'GT-Line 2.0T AT', 'X-Line 2.0T AWD'],
    'kia:seltos': ['LX 1.6L MT', 'EX 1.6L AT', 'SX 1.4T AT', 'GT-Line 1.4T AT'],
    'kia:morning': ['EX 1.0L MT', 'EX 1.2L MT', 'EX 1.2L AT', 'GT-Line 1.2L AT'],
    'kia:sorento': ['EX 2.5L AT', 'SX 2.5T AT', 'Hybrid 1.6T AWD'],
    'kia:cerato': ['LX 2.0L MT', 'EX 2.0L AT', 'SX 2.0T AT'],
    // Nissan
    'nissan:versa': ['Sense 1.6L MT', 'Advance 1.6L CVT', 'Exclusive 1.6L CVT'],
    'nissan:qashqai': ['Sense 2.0L CVT', 'Advance 2.0L CVT', 'Exclusive 2.0L CVT', 'e-POWER'],
    'nissan:x trail': ['Sense 2.5L CVT', 'Advance 2.5L CVT', 'Exclusive 2.5L AWD', 'e-POWER'],
    'nissan:navara': ['SE 2.5L MT', 'XE 2.5L MT', 'LE 2.5L AT', 'PRO-4X 2.5L AT'],
    'nissan:kicks': ['Sense 1.6L CVT', 'Advance 1.6L CVT', 'Exclusive 1.6L CVT'],
    // Chevrolet
    'chevrolet:captiva': ['II LS 2.4L 6MT', 'II LS 2.4L 6AT', 'II LT 2.4L 6AT', 'II LTZ 2.4L 6AT', 'Premier 1.5T CVT'],
    'chevrolet:sail': ['LS 1.4L 5MT', 'LT 1.4L 5MT', 'LT 1.4L 5AT', 'LTZ 1.5L 5MT'],
    'chevrolet:onix': ['LS 1.2L MT', 'LT 1.0T AT', 'LTZ 1.0T AT', 'Premier 1.0T AT', 'RS 1.0T AT'],
    'chevrolet:tracker': ['LS 1.2T MT', 'LT 1.2T AT', 'LTZ 1.2T AT', 'Premier 1.2T AT', 'RS 1.2T AWD'],
    'chevrolet:d max': ['E2 2.5L MT', 'E3 2.5L MT', 'E4 2.5L AT', 'X-Terrain 3.0L AT'],
    'chevrolet:s10': ['WT 2.8L MT', 'LS 2.8L MT', 'LT 2.8L AT', 'High Country 2.8L AT'],
    'chevrolet:groove': ['LS 1.5L MT', 'LT 1.5L CVT', 'LTZ 1.5L CVT'],
    // Ford
    'ford:ranger': ['XL 2.0T MT', 'XLS 2.0T MT', 'XLT 2.0T AT', 'Limited 2.0T AT', 'Raptor 2.0T AT'],
    'ford:territory': ['SEL 1.5T AT', 'Titanium 1.5T AT'],
    'ford:focus': ['S 2.0L 5MT', 'SE 2.0L 5MT', 'SE Plus 2.0L 6AT', 'Titanium 2.0L 6AT', 'ST 2.0T 6MT'],
    'ford:escape': ['SE 1.5T CVT', 'SEL 1.5T CVT', 'Titanium 2.0T AWD'],
    // Honda
    'honda:civic': ['LX 1.5T CVT', 'EX 1.5T CVT', 'Touring 1.5T CVT', 'Si 1.5T MT', 'Hybrid 2.0L CVT'],
    'honda:hr v': ['LX 1.8L MT', 'EX 1.8L CVT', 'Touring 1.8L CVT', 'Advance 1.8L CVT'],
    'honda:cr v': ['LX 1.5T CVT', 'EX 1.5T CVT', 'EXL 1.5T CVT', 'Hybrid 2.0L AWD'],
    // Mazda
    'mazda:cx 5': ['R 2.0 MT', 'R 2.0 AT', 'R 2.5 AT', 'High 2.5 AT', 'Signature 2.5T AT'],
    'mazda:cx 30': ['R 2.0 MT', 'Sport 2.0 AT', 'Carbon Edition 2.0 AT', 'Touring 2.0 AT'],
    'mazda:mazda 3': ['R 2.0 MT', 'Sport 2.0 AT', 'Carbon Edition', 'Turbo 2.5T AWD'],
    'mazda:mazda 2': ['R 1.5 MT', 'Sport 1.5 AT', 'Grand Touring 1.5 AT'],
    'mazda:bt 50': ['R 3.2 MT', 'Pro 3.2 AT', 'Pro+ 3.2 AT', 'Thunder 3.2 AT'],
    // Volkswagen
    'volkswagen:gol': ['Trendline 1.6L MT', 'Comfortline 1.6L AT', 'Highline 1.6L AT'],
    'volkswagen:amarok': ['Trendline 2.0TDI MT', 'Comfortline 2.0TDI AT', 'Highline V6 3.0TDI AT', 'Extreme V6 3.0TDI AT'],
    'volkswagen:t cross': ['Trendline 1.0T AT', 'Comfortline 1.0T AT', 'Highline 1.5T AT'],
    // BMW / Mercedes (client-side keys, id-based)
    'bmw:320i': ['Sport 2.0T AT', 'Executive 2.0T AT', 'M Sport 2.0T AT'],
    'bmw:x1': ['sDrive18i 1.5T AT', 'sDrive20i 2.0T AT', 'xDrive25e Hybrid', 'M Sport 2.0T AT'],
    'mercedes:c200': ['Avantgarde 1.5T AT', 'Exclusive 1.5T AT', 'AMG Line 2.0T AT'],
    'mercedes:sprinter': ['315 CDI MT', '415 CDI AT', '515 CDI AT', 'Furgón', 'Minibús'],
    // Suzuki
    'suzuki:swift': ['GL 1.2L MT', 'GLX 1.2L MT', 'GLX 1.2L AT', 'GLX Boosterjet 1.0T AT'],
    'suzuki:vitara': ['GL+ 1.4T AT', 'GLX 1.4T AT', 'Boosterjet 1.4T AT AWD'],
    'suzuki:grand vitara': ['GL 1.5L MT', 'GLX 1.5L AT', 'All Grip 1.5L AT AWD'],
    'suzuki:jimny': ['GL 1.5L MT', 'GLX 1.5L AT'],
    'suzuki:s-presso': ['GL 1.0L MT', 'GL+ 1.0L AT'],
    // Mitsubishi
    'mitsubishi:asx': ['GLX 2.0L MT', 'GLS 2.0L AT', 'GLS Premium 2.0L AT'],
    'mitsubishi:outlander': ['GLX 2.5L CVT', 'GLS 2.5L CVT', 'GLS Premium 2.5L CVT', 'PHEV AWD'],
    'mitsubishi:eclipse cross': ['GLX 1.5T CVT', 'GLS 1.5T CVT', 'GLS Premium 1.5T CVT'],
    'mitsubishi:l200': ['GL 2.4L MT', 'GLS 2.4L MT', 'GLS AT 2.4L', 'GLS Black 2.4L AT', 'Triton 4x4'],
    'mitsubishi:montero sport': ['GLX 2.4L MT', 'GLS 2.4L AT', 'GLS Premium 2.4L AT'],
    'mitsubishi:pajero sport': ['GLX 2.4L MT', 'GLS 2.4L AT', 'GLS Premium 2.4L AT'],
    // Renault
    'renault:duster': ['Life 1.6L MT', 'Zen 1.6L AT', 'Intens 1.6L AT', 'Iconic 4x4 2.0L MT'],
    'renault:sandero': ['Life 1.6L MT', 'Zen 1.6L CVT', 'GT Line 1.6L CVT'],
    'renault:sandero stepway': ['Life 1.6L MT', 'Zen 1.6L CVT', 'Intens 1.6L CVT'],
    'renault:kwid': ['Life 1.0L MT', 'Zen 1.0L MT', 'Outsider 1.0L MT'],
    'renault:duster oroch': ['Life 1.6L MT', 'Zen 1.6L CVT', 'Outsider 2.0L CVT'],
    'renault:arkana': ['Zen 1.3T EDC', 'Intens 1.3T EDC', 'R.S. Line 1.3T EDC'],
    // Peugeot
    'peugeot:208': ['Like 1.2L MT', 'Active 1.2T AT', 'Allure 1.2T AT', 'GT 1.2T AT'],
    'peugeot:2008': ['Active 1.2T AT', 'Allure 1.2T AT', 'GT 1.2T AT'],
    'peugeot:3008': ['Active 1.6T AT', 'Allure 1.6T AT', 'GT 1.6T AT', 'Hybrid 1.6T'],
    'peugeot:5008': ['Active 1.6T AT', 'Allure 1.6T AT', 'GT 1.6T AT'],
    // Fiat
    'fiat:cronos': ['Like 1.3L MT', 'Drive 1.3L AT', 'Precision 1.3T AT'],
    'fiat:pulse': ['Like 1.3L AT', 'Drive 1.3T AT', 'Impetus 1.3T AT'],
    'fiat:fastback': ['Impetus 1.3T AT', 'Limited Edition 1.3T AT'],
    // Subaru
    'subaru:outback': ['2.5i CVT', '2.5i Limited CVT', '2.5i Touring CVT', 'e-BOXER Hybrid'],
    'subaru:forester': ['2.5i CVT', '2.5i Limited CVT', 'e-BOXER Hybrid AWD'],
    'subaru:xv': ['2.0i CVT', '2.0i-L CVT', 'e-BOXER Hybrid'],
    'subaru:impreza': ['2.0i MT', '2.0i AT', '2.0i-S AT AWD'],
    // Jeep
    'jeep:compass': ['Sport 2.4L AT', 'Longitude 2.4L AT', 'Limited 2.4L AT', 'Trailhawk 2.4L AT 4WD'],
    'jeep:renegade': ['Sport 1.8L AT', 'Longitude 1.8L AT', 'Limited 1.8L AT', 'Trailhawk 1.3T AT'],
    // Audi
    'audi:a3': ['35 TFSI 1.4T AT', '40 TFSI 2.0T AT', 'S3 2.0T AT'],
    'audi:q3': ['35 TFSI 1.4T AT', '40 TFSI 2.0T AT', '45 TFSI 2.0T AT'],
    'audi:q5': ['40 TFSI 2.0T AT', '45 TFSI 2.0T AT', '55 TFSI-e Hybrid'],
    // BYD (sin datos en CarQuery — curado esencial)
    'byd:seal': ['Premium EV 204HP', 'Excellence EV 313HP', 'DM-i 1.5T Honor', 'DM-i 1.5T Excellence'],
    'byd:atto 3': ['Standard 50kWh', 'Extended 60kWh', 'Premium 60kWh'],
    'byd:dolphin': ['Active 44kWh', 'Boost 60kWh', 'Premium 60kWh'],
    'byd:han': ['EV 505km Honor', 'EV 610km Excellence', 'DM-i 1.5T'],
    'byd:tang': ['DM-i 100km Lux', 'DM-i 100km Premium', 'EV 400km'],
    'byd:song plus': ['DM-i Champion Honor', 'DM-i Champion Luxury', 'DM-i Premium', 'EV 505km'],
    // Chery (sin datos en CarQuery — curado esencial)
    'chery:tiggo 2': ['Luxury 1.5L 5MT', 'Premium 1.5L CVT'],
    'chery:tiggo 2 pro': ['Luxury 1.5L MT', 'Premium 1.5L CVT', 'Max 1.5T CVT'],
    'chery:tiggo 4 pro': ['Luxury 1.5T DCT', 'Premium 1.5T DCT', 'Max 1.5T DCT', 'e+ PHEV'],
    'chery:tiggo 7 pro': ['Luxury 1.6T CVT', 'Premium 1.6T CVT', 'Max 1.6T CVT'],
    'chery:tiggo 8 pro': ['Luxury 1.6T DCT', 'Premium 1.6T DCT', 'Max 1.6T DCT', 'e+ PHEV'],
    'chery:arrizo 5': ['Luxury 1.5L MT', 'Premium 1.5L CVT'],
    'chery:omoda 5': ['Luxury 1.6T DCT', 'Premium 1.6T DCT'],
    // MG (sin datos en CarQuery — curado esencial)
    'mg:zs': ['STD 1.5L MT', 'LUX 1.5L CVT', 'EV Standard 51kWh', 'EV Extended 72kWh'],
    'mg:hs': ['STD 1.5T DCT', 'LUX 1.5T DCT', 'PHEV 1.5T'],
    'mg:mg5': ['STD 1.5L MT', 'LUX 1.5L CVT'],
    'mg:mg4': ['Standard 51kWh', 'Long Range 64kWh'],
    'mg:rx5': ['STD 1.5T DCT', 'LUX 1.5T DCT'],
    // Haval / GWM (sin datos en CarQuery — curado esencial)
    'haval:h6': ['Lux 1.5T DCT', 'Premium 1.5T DCT', 'HEV 1.5T', 'DHT-PHEV'],
    'haval:jolion': ['Lux 1.5T DCT', 'Premium 1.5T DCT', 'HEV 1.5T'],
    'haval:h9': ['Lux 3.0T AT', 'Premium 3.0T AT'],
    // JAC
    'jac:t8': ['Pro 2.0T MT', 'Pro 2.0T AT', 'Elite 2.0T AT'],
    'jac:js4': ['Luxury 1.5T DCT', 'Premium 1.5T DCT'],
    // Camiones y otras categorías
    'volvo:fh': ['420 6x2', '460 6x4', '500 6x4', '540 6x4'],
    'scania:r450': ['Highline 4x2', 'Topline 4x2', '6x2', '6x4'],
    'man:tgx': ['18.510 4x2', '18.540 4x2', '26.440 6x4'],
    // Motos
    'yamaha:mt 07': ['Standard', 'ABS', 'Pure', 'HO'],
    'kawasaki:z900': ['Standard', 'SE', 'Performance'],
    // Maquinaria
    'caterpillar:320 excavator': ['GC', 'Standard', 'Next Gen'],
    'komatsu:pc200': ['LC', 'LC-8', 'LC-11'],
    'john-deere:5075e': ['2WD', '4WD', 'Cabina'],
    // Volkswagen adicionales
    'volkswagen:polo':    ['Trendline 1.0T MT', 'Comfortline 1.0T AT', 'Highline 1.0T AT'],
    'volkswagen:golf':    ['Trendline 1.4T AT', 'Comfortline 1.4T AT', 'Highline 1.4T AT', 'GTI 2.0T AT', 'R 2.0T AT AWD'],
    'volkswagen:tiguan':  ['Trendline 1.4T AT', 'Comfortline 1.4T AT', 'Highline 2.0T AT', 'Elegance 2.0T AT', 'R-Line 2.0T AT'],
    'volkswagen:virtus':  ['Trendline 1.6L MT', 'Comfortline 1.6L AT', 'Highline 1.6L AT'],
    'volkswagen:teramont':['Trendline 2.0T AT', 'Comfortline 2.0T AT', 'Highline 2.0T AT'],
    // Lexus
    'lexus:nx': ['250 2.5L AT', '350h Hybrid AWD', '450h+ PHEV AWD'],
    'lexus:rx': ['350 2.4T AT', '350h Hybrid', '500h PHEV AWD'],
    'lexus:ux': ['200 2.0L AT', '250h Hybrid AWD'],
    'lexus:is': ['300 2.0T AT', '350 3.5L AT', '500h F Sport AWD'],
    'lexus:es': ['250 2.5L AT', '300h Hybrid'],
    // Land Rover
    'land-rover:defender':        ['90 P300 AT', '110 P300 AT', '110 P400 AT', 'P400e PHEV 110'],
    'land-rover:discovery sport': ['P200 AT', 'P250 AT', 'P300e PHEV AT'],
    'land-rover:discovery':       ['P300 AT', 'P360 AT', 'P360 HSE AT'],
    'land-rover:range rover sport':['P360 AT', 'P400e PHEV AT', 'P460e PHEV AT'],
    // Porsche
    'porsche:cayenne': ['3.0 AT', 'S 2.9T AT', 'GTS 4.0 AT', 'Turbo 4.0T AT', 'e-Hybrid PHEV'],
    'porsche:macan':   ['2.0T AT', 'S 2.9T AT', 'Turbo 2.9T AT', 'EV Standard', 'EV Turbo'],
    'porsche:911':     ['Carrera 3.0T PDK', 'Carrera S 3.0T PDK', 'Targa 3.0T PDK'],
    'porsche:taycan':  ['4S AWD', 'Turbo AWD', 'Turbo S AWD', 'Sport Turismo'],
    // Tesla
    'tesla:model 3': ['Standard Range RWD', 'Long Range AWD', 'Performance AWD'],
    'tesla:model y': ['Standard Range RWD', 'Long Range AWD', 'Performance AWD'],
    'tesla:model s': ['Long Range AWD', 'Plaid AWD'],
    'tesla:model x': ['Long Range AWD', 'Plaid AWD'],
    // SsangYong
    'ssangyong:tivoli':  ['GDi 1.5L MT', 'GDi 1.5L AT', 'e-XDi 1.6D AT', 'ELX EV'],
    'ssangyong:korando': ['GDi 1.5T AT', 'e-XDi 1.6D AT', 'EV'],
    'ssangyong:rexton':  ['Premium 2.2T AT', 'Ultimate 2.2T AT'],
    'ssangyong:torres':  ['T6 1.5T AT', 'EVX EV'],
    // Isuzu
    'isuzu:d max': ['E2 1.9L MT', 'E3 1.9L MT', 'E4 1.9L AT', 'X-Series 3.0L AT', 'V-Cross 3.0L AT'],
    'isuzu:mu x': ['LS 1.9L AT', 'LS-A 1.9L AT', 'LS-T 3.0L AT'],
    // Alfa Romeo
    'alfa-romeo:stelvio':  ['Sprint 2.0T AT', 'Sprint Ti 2.0T AT', 'Veloce 2.0T AT', 'Quadrifoglio 2.9T AT'],
    'alfa-romeo:giulia':   ['Sprint 2.0T AT', 'Sprint Ti 2.0T AT', 'Veloce 2.0T AT', 'Quadrifoglio 2.9T AT'],
    'alfa-romeo:giulietta':['Progression 1.4T MT', 'Distinctive 1.4T AT', 'Quadrifoglio 1.75T AT'],
    // MINI
    'mini:cooper':     ['One 1.5T DCT', 'Cooper 1.5T DCT', 'Cooper S 2.0T DCT', 'JCW 2.0T DCT'],
    'mini:countryman': ['Cooper 1.5T AT', 'Cooper S 2.0T AT', 'JCW 2.0T AT AWD'],
    // Changan
    'changan:cs75 plus': ['Comfort 1.5T DCT', 'Luxury 1.5T DCT', 'Premium 2.0T AT'],
    'changan:cs35 plus': ['Comfort 1.4T DCT', 'Luxury 1.4T DCT'],
    'changan:cs55 plus': ['Comfort 1.5T DCT', 'Luxury 1.5T DCT'],
    'changan:hunter':    ['Plus 1.9T DCT', 'Pro 1.9T DCT 4WD'],
    // Omoda / Jetour
    'omoda:omoda 5':  ['Luxury 1.6T DCT', 'Premium 1.6T DCT'],
    'jetour:dashing': ['Luxury 1.6T DCT', 'Premium 1.6T DCT'],
    // Geely
    'geely:azkarra': ['Premium 1.5T DCT', 'Luxury 1.5T DCT Hybrid'],
    'geely:coolray': ['Sport 1.5T DCT', 'Luxury 1.5T DCT'],
    // Dodge
    'dodge:journey': ['SE 2.4L AT', 'SXT 2.4L AT', 'RT 3.6L AT'],
    // RAM
    'ram:1500': ['Classic 3.6L AT', 'Laramie 5.7 Hemi AT', 'Rebel 5.7 Hemi AT', 'TRX 6.2 Hemi AT'],
    'ram:700': ['Express 1.9D MT', 'Tradesman 1.9D MT'],
    // Harley-Davidson
    'harley-davidson:iron 883':  ['Standard', 'S ABS'],
    'harley-davidson:fat boy':   ['114', '114 Custom'],
    'harley-davidson:street bob':['Standard 114', 'S 117'],
    // KTM
    'ktm:duke 390':    ['Standard', 'ABS', 'R'],
    'ktm:adventure 390':['Standard', 'Rally'],
    // Royal Enfield
    'royal-enfield:meteor 350':  ['Fireball', 'Stellar', 'Supernova'],
    'royal-enfield:classic 350': ['Redditch', 'Signals', 'Chrome'],
    'royal-enfield:himalayan':   ['BS6', 'Scram 411'],
    // Ducati
    'ducati:monster':   ['937 Standard', '937 Plus'],
    'ducati:scrambler': ['Icon', 'Full Throttle', 'Nightshift', 'Desert Sled'],
    // Bajaj
    'bajaj:pulsar ns200': ['Standard ABS', 'RS 200 ABS'],
    // Toyota (adicionales)
    'toyota:land cruiser': ['GXR 4.0L AT', 'VXR 4.0L AT', 'GX 4.5D AT', 'Heritage Edition 4.0L AT'],
    'toyota:camry':        ['GL 2.5L AT', 'GLX 2.5L AT', 'Hybrid 2.5L AT'],
    'toyota:avanza':       ['E 1.3L MT', 'G 1.3L AT', 'Veloz 1.3L AT'],
    'toyota:rush':         ['S 1.5L MT', 'G 1.5L AT', 'TRD 1.5L AT'],
    // Hyundai (adicionales)
    'hyundai:grand i10':   ['GL 1.2L MT', 'GLS 1.2L MT', 'GLS 1.2L AT'],
    'hyundai:ioniq 5':     ['Standard RWD 58kWh', 'Premium RWD 72kWh', 'Premium AWD 72kWh', 'N Line AWD'],
    'hyundai:sonata':      ['GLS 2.0L AT', 'Limited 2.0T AT'],
    // Kia (adicionales)
    'kia:stinger':         ['GT 2.5T AT AWD', 'GT-Line 2.0T AT'],
    'kia:carnival':        ['LX 3.5L AT', 'EX 3.5L AT', 'SX 3.5L AT'],
    'kia:ev6':             ['Standard RWD 58kWh', 'Long Range RWD 77kWh', 'GT-Line AWD 77kWh', 'GT AWD'],
    'kia:niro':            ['HEV LX 1.6L', 'HEV EX 1.6L', 'PHEV EX 1.6T', 'EV Standard 39kWh', 'EV Long Range 64kWh'],
    // Nissan (adicionales)
    'nissan:march':        ['Advance 1.6L MT', 'Advance 1.6L CVT', 'Exclusive 1.6L CVT'],
    'nissan:pathfinder':   ['Sense 3.5L CVT', 'Advance 3.5L CVT', 'Exclusive 3.5L CVT AWD'],
    'nissan:np300':        ['SE 2.5L MT', 'XE 2.5L MT', 'LE 2.5L AT'],
    // Chevrolet (adicionales)
    'chevrolet:equinox':   ['LS 1.5T CVT', 'LT 1.5T CVT', 'Premier 2.0T AT', 'EV Standard', 'EV Long Range'],
    // Ford (adicionales)
    'ford:explorer':       ['Base 2.3T AT', 'XLT 2.3T AT', 'Limited 2.3T AT', 'Platinum 3.0T AT', 'ST 3.0T AT'],
    'ford:everest':        ['Ambiente 2.0T AT', 'Trend 2.0T AT', 'Titanium 2.0T AT', 'Platinum 3.0T AT'],
    'ford:f150':           ['XL 3.5L MT', 'XLT 3.5L AT', 'Lariat 3.5T AT', 'Raptor 3.5T AT 4WD'],
    'ford:bronco':         ['Base 2.3T MT', 'Big Bend 2.3T AT', 'Outer Banks 2.7T AT', 'Wildtrak 2.7T AT', 'Raptor 3.0T AT'],
    'ford:maverick':       ['XL 2.5L Hybrid CVT', 'XLT 2.5L Hybrid CVT', 'Lariat 2.0T AT'],
    // Honda (adicionales)
    'honda:wr v':          ['LX 1.5L MT', 'EX 1.5L CVT', 'Touring 1.5L CVT'],
    'honda:accord':        ['EX 1.5T CVT', 'Sport 2.0T AT', 'Touring 2.0T AT', 'Hybrid EX 2.0L'],
    'honda:jazz':          ['LX 1.5L MT', 'EX 1.5L CVT', 'Hybrid 1.5L CVT'],
    // Mazda (adicionales)
    'mazda:cx 9':          ['Touring 2.5T AT AWD', 'Grand Touring 2.5T AT AWD', 'Carbon Edition 2.5T AT AWD'],
    // Volkswagen (adicionales)
    'volkswagen:taos':     ['Trendline 1.0T AT', 'Comfortline 1.5T AT', 'Highline 1.5T AT DSG'],
    // BMW (adicionales)
    'bmw:118i':  ['Sport 1.5T DCT', 'M Sport 1.5T DCT'],
    'bmw:120i':  ['Sport 2.0T DCT', 'M Sport 2.0T DCT'],
    'bmw:318i':  ['Sport 2.0T AT', 'Executive 2.0T AT', 'M Sport 2.0T AT'],
    'bmw:420i':  ['Coupé 2.0T AT', 'Gran Coupé 2.0T AT', 'Cabrio 2.0T AT', 'M Sport 2.0T AT'],
    'bmw:520i':  ['Luxury 2.0T AT', 'M Sport 2.0T AT'],
    'bmw:530i':  ['Luxury 2.0T AT', 'M Sport 2.0T AT', 'xDrive 2.0T AT'],
    'bmw:x3':    ['sDrive20i 2.0T AT', 'xDrive20i 2.0T AT', 'xDrive30i 2.0T AT', 'M40i 3.0T AT'],
    'bmw:x5':    ['xDrive40i 3.0T AT', 'xDrive50e PHEV', 'M60i 4.4T AT', 'M Competition 4.4T AT'],
    'bmw:x6':    ['xDrive40i 3.0T AT', 'M60i 4.4T AT', 'M Competition 4.4T AT'],
    'bmw:m3':    ['Competition 3.0T AT', 'Competition xDrive 3.0T AT', 'CS 3.0T AT'],
    'bmw:m4':    ['Competition 3.0T AT', 'Competition xDrive 3.0T AT', 'CSL 3.0T AT'],
    'bmw:s 1000 rr': ['Standard', 'M Package', 'Race'],
    'bmw:r 1250 gs': ['Standard', 'Adventure', 'Triple Black'],
    // Mercedes (adicionales)
    'mercedes:a200':   ['Progressive 1.3T DCT', 'AMG Line 1.3T DCT'],
    'mercedes:cla':    ['CLA 200 1.3T DCT', 'CLA 250 2.0T DCT', 'AMG CLA 35 2.0T AT'],
    'mercedes:gla':    ['GLA 200 1.3T DCT', 'GLA 250 2.0T DCT', 'AMG GLA 35 2.0T AT'],
    'mercedes:glc':    ['GLC 200 1.5T AT', 'GLC 300 2.0T AT', 'GLC 300e PHEV', 'AMG GLC 43 3.0T AT'],
    'mercedes:gle':    ['GLE 300d 2.0D AT', 'GLE 350de PHEV', 'AMG GLE 53 3.0T AT', 'AMG GLE 63 S AT'],
    'mercedes:e250':   ['Avantgarde 2.0T AT', 'Exclusive 2.0T AT', 'AMG Line 3.0T AT'],
    'mercedes:vito':   ['114 CDI Furgón', '119 CDI Mixto', 'Tourer 119 CDI'],
    'mercedes:atego':  ['1218 4x2', '1618 4x2', '2428 6x4'],
    'mercedes:actros': ['1848 LS 4x2', '2553 LS 6x4', '3358 8x4'],
    // Volvo (autos)
    'volvo:xc40': ['Core B3 AT', 'Plus B4 AT', 'Ultimate B4 AWD AT', 'Recharge EV'],
    'volvo:xc60': ['Core B4 AT', 'Plus B4 AWD AT', 'Ultimate T8 PHEV AWD', 'Recharge EV AWD'],
    'volvo:xc90': ['Core B5 AT', 'Plus B5 AWD AT', 'Ultimate T8 PHEV AWD', 'Recharge EV AWD'],
    'volvo:s60':  ['Core B4 AT', 'Plus B4 AT', 'Ultimate B4 AT'],
    'volvo:v60':  ['Core B4 AT', 'Plus B4 AT', 'T8 PHEV AWD'],
    'volvo:fm':   ['370 4x2', '410 4x2', '460 6x4'],
    'volvo:fmx':  ['370 6x4', '460 6x4', '500 8x4'],
    // Audi (adicionales)
    'audi:a1':       ['25 TFSI 1.0T S-tronic', '30 TFSI 1.0T S-tronic', 'S1 2.0T Quattro'],
    'audi:a4':       ['35 TFSI 2.0T S-tronic', '40 TFSI 2.0T S-tronic', '40 TDI 2.0D S-tronic', 'S4 3.0T Quattro'],
    'audi:a5':       ['35 TFSI Sportback', '40 TFSI S-tronic', 'S5 3.0T Quattro'],
    'audi:a6':       ['40 TFSI S-tronic', '45 TFSI Quattro', '50 TDI Quattro', 'S6 2.9T Quattro'],
    'audi:q2':       ['35 TFSI 1.5T S-tronic', '40 TFSI Quattro S-tronic'],
    'audi:q7':       ['45 TFSI Quattro', '55 TFSI Quattro', '60 TFSI-e PHEV', 'SQ7 4.0T Quattro'],
    'audi:q8':       ['55 TFSI Quattro', 'SQ8 4.0T Quattro', 'RS Q8 4.0T Quattro', 'e-tron 55 Quattro'],
    'audi:e tron gt':['e-tron GT Quattro', 'RS e-tron GT Quattro'],
    // Jeep (adicionales)
    'jeep:wrangler':       ['Sport 3.6L MT', 'Sahara 3.6L AT', 'Rubicon 3.6L AT', '4xe PHEV AWD'],
    'jeep:grand cherokee': ['Laredo 3.6L AT', 'Limited 3.6L AT', 'Trailhawk 3.6L AT', 'L Overland 3.6L AT'],
    'jeep:gladiator':      ['Sport 3.6L MT', 'Overland 3.6L AT', 'Rubicon 3.6L AT'],
    // Citroën
    'citroen:c3':          ['Feel 1.2T AT', 'Shine 1.2T AT', 'C-Series 1.2T AT'],
    'citroen:c4 cactus':   ['Feel 1.2T AT', 'Shine 1.2T AT'],
    'citroen:c4':          ['Feel 1.2T AT', 'Shine 1.2T AT', 'e-C4 EV'],
    'citroen:berlingo':    ['Live 1.5D MT', 'Feel 1.5D AT', 'Shine 1.5D AT'],
    'citroen:c5 aircross': ['Feel 1.2T AT', 'Shine 1.2T AT', 'Shine Pack 1.6T AT'],
    // Škoda
    'skoda:octavia':       ['Active 1.0T MT', 'Ambition 1.0T AT', 'Style 1.5T DSG', 'RS 2.0T DSG'],
    'skoda:fabia':         ['Active 1.0T MT', 'Ambition 1.0T AT', 'Monte Carlo 1.5T DSG'],
    'skoda:karoq':         ['Active 1.0T MT', 'Ambition 1.5T DSG', 'Style 2.0T DSG', 'Sportline 2.0T DSG'],
    'skoda:kodiaq':        ['Ambition 1.5T DSG', 'Style 2.0T DSG', 'Sportline 2.0T DSG 4x4'],
    // Jaguar
    'jaguar:f pace':       ['R-Dynamic S 2.0T AT', 'R-Dynamic SE 2.0T AT', 'S 3.0T AT', 'SVR 5.0T AT'],
    'jaguar:e pace':       ['S 1.5T DCT', 'SE 1.5T DCT', 'R-Dynamic SE 2.0T AT'],
    'jaguar:i pace':       ['S EV 400HP', 'SE EV 400HP', 'HSE EV 400HP'],
    'jaguar:xe':           ['S 2.0T AT', 'SE 2.0T AT', 'R-Dynamic SE 2.0T AT'],
    'jaguar:xf':           ['S 2.0T AT', 'SE 2.0T AT', 'R-Dynamic SE 2.0T AT'],
    // Infiniti
    'infiniti:qx50':       ['Luxe 2.0T CVT', 'Sensory 2.0T CVT', 'Autograph 2.0T AWD CVT'],
    'infiniti:q50':        ['Luxe 2.0T AT', 'Sport 3.0T AT', 'Red Sport 3.0T AT AWD'],
    'infiniti:qx60':       ['Pure 3.5L CVT', 'Luxe 3.5L CVT', 'Sensory 3.5L CVT AWD'],
    // Polestar
    'polestar:polestar 2': ['Standard Single Motor', 'Long Range Single Motor', 'Long Range Dual Motor', 'Performance'],
    'polestar:polestar 3': ['Long Range AWD', 'Long Range AWD Performance'],
    // Chrysler
    'chrysler:300c':           ['3.6L AT', 'SRT 6.4L AT', 'SRT Hellcat 6.2T AT'],
    'chrysler:town & country': ['LX 3.6L AT', 'Touring 3.6L AT', 'Limited 3.6L AT'],
    // Datsun
    'datsun:go':   ['Standard 1.2L MT', 'T 1.2L MT', 'T Option 1.2L AT'],
    'datsun:go+':  ['Standard 1.2L MT', 'T 1.2L MT', 'T Option 1.2L AT'],
    // Wuling
    'wuling:air ev': ['Standard 17kWh', 'Long Range 26kWh'],
    'wuling:almaz':  ['LS 1.5T CVT', 'RS 1.5T CVT'],
    // BAIC
    'baic:x55':  ['Elite 1.5T DCT', 'Premium 1.5T DCT'],
    'baic:x35':  ['Comfort 1.5T CVT', 'Premium 1.5T CVT'],
    'baic:bj40': ['EX 2.0T MT', 'Top 2.0T AT 4WD'],
    // Dongfeng
    'dongfeng:ax7':  ['Luxury 1.8T CVT', 'Premium 1.8T CVT AWD'],
    'dongfeng:rich': ['SE 2.4L MT', 'EX 2.4L AT'],
    // DFSK
    'dfsk:glory 580': ['Comfort 1.8T CVT', 'Luxury 1.8T CVT'],
    'dfsk:glory 500': ['Comfort 1.5T CVT', 'Luxury 1.5T CVT'],
    // Foton
    'foton:tunland': ['G7 2.4D MT', 'E5 2.4D AT', 'G9 2.4D AT 4WD'],
    // Motos: Benelli
    'benelli:tnt 300':      ['Standard', 'ABS'],
    'benelli:tnt 600i':     ['Standard', 'ABS'],
    'benelli:leoncino 500': ['Standard', 'Trail'],
    'benelli:trk 502':      ['Standard', 'ABS'],
    'benelli:trk 502x':     ['Standard', 'ABS'],
    // Motos: Kymco
    'kymco:ak 550':      ['Premium', 'Tech'],
    'kymco:xciting 400': ['Standard', 'S ABS'],
    'kymco:downtown 150':['Standard', 'i ABS'],
    // Motos: TVS
    'tvs:apache rtr 200': ['4V ABS', '4V Race Edition'],
    'tvs:apache rr 310':  ['Standard', 'BTO Race Edition'],
    'tvs:ronin 225':      ['Standard', 'Single-Channel ABS', 'Dual-Channel ABS'],
    // Motos: CF Moto
    'cf-moto:300 nk':  ['Standard', 'ABS'],
    'cf-moto:400 nk':  ['Standard', 'ABS'],
    'cf-moto:700 cl x':['Standard', 'Sport', 'Heritage'],
    'cf-moto:800 mt':  ['Standard', 'Touring', 'Sport'],
    // Motos: Yamaha (adicionales)
    'yamaha:mt 09':     ['Standard', 'SP', 'R-Series'],
    'yamaha:mt 03':     ['Standard', 'ABS'],
    'yamaha:r3':        ['Standard', 'ABS'],
    'yamaha:r1':        ['Standard', 'M'],
    'yamaha:tenere 700':['Standard', 'Rally'],
    'yamaha:xmax 300':  ['Standard', 'Tech MAX'],
    // Motos: Kawasaki (adicionales)
    'kawasaki:ninja 400': ['Standard', 'ABS', 'KRT Edition'],
    'kawasaki:ninja 650': ['Standard', 'ABS', 'KRT Edition'],
    'kawasaki:z650':      ['Standard', 'RS'],
    'kawasaki:versys 650':['Standard', 'Grand Tourer ABS'],
    'kawasaki:vulcan s':  ['Standard', 'ABS'],
    // Motos: Honda (adicionales)
    'honda:cb500f':     ['Standard', 'ABS'],
    'honda:cb500x':     ['Standard', 'ABS'],
    'honda:africa twin':['DCT', 'Adventure Sport DCT', 'Adventure Sport ES DCT'],
    'honda:xre 300':    ['Standard', 'Rally'],
    'honda:cbr 500r':   ['Standard', 'ABS'],
    // Camiones: DAF
    'daf:xf':  ['480 FT 4x2', '530 FT 4x2', '480 FAS 6x2'],
    'daf:xg':  ['480 FT 4x2', '530 FT 4x2'],
    'daf:cf':  ['320 4x2', '370 6x2', '430 6x4'],
    'daf:lf':  ['180 4x2', '230 4x2', '280 4x2'],
    // Camiones: International
    'international:lt series':  ['500HP 6x4', '540HP 6x4', '600HP 6x4'],
    'international:mv series':  ['260HP 4x2', '300HP 4x2'],
    'international:hx520':      ['540HP 6x4', '600HP 6x4'],
    // Camiones: UD Trucks
    'ud-trucks:croner':  ['PKE 210 4x2', 'LKE 280 6x2', 'LXE 370 6x4'],
    'ud-trucks:quester': ['GWE 380 6x4', 'CWE 430 6x4'],
    // Camiones: FAW
    'faw:j6p':    ['375HP 6x4', '420HP 6x4', '480HP 6x4'],
    'faw:tiger v':['220HP 4x2', '250HP 4x4'],
    // Camiones: Sinotruk
    'sinotruk:howo t5g': ['380HP 6x4', '420HP 6x4'],
    'sinotruk:howo a7':  ['371HP 6x4', '420HP 6x4'],
    // Camiones: JMC
    'jmc:vigus':   ['Pro 2.8D MT', 'Pro 2.8D AT', 'Plus 2.8D AT 4WD'],
    'jmc:conquer': ['SE 2.8D MT', 'SX 2.8D MT'],
    // Camiones: Scania (adicionales)
    'scania:r500': ['4x2', '6x2', '6x4'],
    'scania:p360': ['4x2', '6x2', '6x4'],
    'scania:g450': ['4x2', '6x2', '6x4'],
    // Camiones: MAN (adicionales)
    'man:tgl':  ['12.220 4x2', '14.220 4x2', '14.280 4x4'],
    'man:tgs':  ['18.440 4x2', '26.440 6x4', '33.440 8x4'],
    // Camiones: Kenworth (adicionales)
    'kenworth:t480': ['400HP 6x4', '455HP 6x4'],
    'kenworth:w900': ['550HP 6x4', '600HP 6x4'],
    // Buses
    'king-long:xmq6127': ['Interurbano Diesel', 'Interurbano Gas'],
    'king-long:xmq6800': ['Urbano Diesel', 'Urbano Eléctrico'],
    'yutong:zk6128':     ['Interurbano Euro 6', 'Interurbano GLP'],
    'yutong:e12':        ['Eléctrico 12m'],
    'higer:klq6129':     ['Interurbano Diesel', 'Interurbano GLP'],
    'irizar:ie bus':     ['Eléctrico 12m', 'Eléctrico 18m'],
    'irizar:i6s':        ['Interurbano 12m', 'Interurbano 13.5m'],
    'irizar:pb':         ['Turismo 12.8m', 'Turismo 14m'],
    // Maquinaria: Liebherr
    'liebherr:r 926 excavadora': ['Litronic', 'Stage V'],
    'liebherr:l 550 cargador':   ['Stage V', 'XPower'],
    'liebherr:ltm 1060 grua':    ['6x6x6 60T'],
    // Maquinaria: Hitachi
    'hitachi:zx200 excavadora': ['LC', 'LC-6'],
    'hitachi:zx300 excavadora': ['LC', 'LC-7'],
    'hitachi:ex400 excavadora': ['LC', 'HD'],
    // Maquinaria: Doosan
    'doosan:dx225 excavadora': ['LC', 'LC-5'],
    'doosan:dl250 cargador':   ['Standard', 'Stage V'],
    // Maquinaria: JCB
    'jcb:3cx retroexcavadora': ['Pro', 'Super', 'Sitemaster'],
    'jcb:js220 excavadora':    ['Standard', 'HD'],
    'jcb:541 70 telehandler':  ['Standard', 'AGRI'],
    // Maquinaria: Case
    'case:cx300c excavadora':     ['Standard', 'HD'],
    'case:621g cargador frontal': ['Standard', 'XT'],
    'case:580n retroexcavadora':  ['Standard', 'WT', 'ST'],
    // Maquinaria: New Holland
    'new-holland:t7 180 tractor':   ['4WD', '4WD PowerCommand'],
    'new-holland:tc5 80 cosechadora':['Standard'],
    // Maquinaria: XCMG
    'xcmg:xe215c excavadora':  ['Standard', 'Plus'],
    'xcmg:lw300fn cargador':   ['Standard'],
    // Maquinaria: Caterpillar (adicionales)
    'caterpillar:336 excavadora':      ['Standard', 'GC', 'Next Gen'],
    'caterpillar:966m cargador':       ['Standard', 'XE'],
    'caterpillar:d6t bulldozer':       ['Standard', 'LGP'],
    'caterpillar:140m motoniveladora': ['Standard', 'AWD'],
    // Maquinaria: Komatsu (adicionales)
    'komatsu:pc360':          ['LC-11', 'NHD-11'],
    'komatsu:wa320 cargador': ['6', 'PZ'],
    'komatsu:d65 bulldozer':  ['EX-18', 'PX-18', 'WX-18'],
    // Maquinaria: John Deere (adicionales)
    'john-deere:310l retroexcavadora': ['2WD', '4WD'],
    'john-deere:644k cargador':        ['Standard', 'IT4'],
    'john-deere:8r 280 tractor':       ['Tracks', 'Wheels'],
    // Náutico: Sea-Doo
    'sea-doo:spark':      ['Spark 60HP', 'Spark 90HP', 'Spark Trixx'],
    'sea-doo:gti 130':    ['Standard', 'SE'],
    'sea-doo:gtr 230':    ['Standard'],
    'sea-doo:rxp x 300':  ['Standard', 'Apex'],
    // Náutico: Boston Whaler
    'boston-whaler:130 super sport': ['Standard 25HP', 'Standard 40HP'],
    'boston-whaler:170 dauntless':   ['Standard 90HP', 'Standard 115HP'],
    'boston-whaler:270 dauntless':   ['Standard 225HP', 'Dual Console 225HP'],
    // Náutico: Tracker
    'tracker:pro team 175 txw': ['Standard 60HP', 'Standard 90HP'],
    'tracker:pro guide v 16 wt':['Standard 50HP', 'Standard 75HP'],
    // Náutico: Yamaha (motos agua)
    'yamaha:fx svho':    ['Standard', 'HO'],
    'yamaha:vx cruiser': ['Standard', 'HO'],
    // Aéreo: Piper
    'piper:pa 28 archer':    ['Archer III', 'Archer DX'],
    'piper:pa 34 seneca':    ['Seneca V', 'Seneca VI'],
    'piper:pa 44 seminole':  ['Standard', 'G1000'],
    // Aéreo: Beechcraft
    'beechcraft:bonanza g36':   ['Standard', 'IFR Package'],
    'beechcraft:king air c90':  ['GTi', 'GTx'],
    'beechcraft:baron g58':     ['Standard', 'IFR Package'],
    // Aéreo: Robinson
    'robinson:r22': ['Beta II', 'Mariner II'],
    'robinson:r44': ['Astro', 'Raven I', 'Raven II', 'Clipper II'],
    'robinson:r66': ['Standard', 'Turbine Marine'],
    // Aéreo: Bell
    'bell:bell 206': ['JetRanger III', 'LongRanger'],
    'bell:bell 407': ['Standard', 'GT', 'GXi'],
    'bell:bell 429': ['Standard', 'WLG'],
};

function asArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

function toId(value: unknown, fallbackPrefix: string, index: number): string {
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (typeof value === 'string' && value.trim()) return value.trim();
    return `${fallbackPrefix}-${index + 1}`;
}

function normalizeVehicleTypes(raw: unknown): VehicleCatalogType[] {
    const source = asArray<string>(raw);
    if (source.length === 0) return [...DEFAULT_TYPES];
    const normalized = source
        .map((value) => String(value || '').trim().toLowerCase())
        .map((value) => {
            if (value === 'industrial') return 'machinery';
            if (value === 'auto' || value === 'suv' || value === 'pickup' || value === 'van') return 'car';
            if (value === 'moto') return 'motorcycle';
            return value;
        })
        .filter((value): value is VehicleCatalogType => {
            return (
                value === 'car' ||
                value === 'motorcycle' ||
                value === 'truck' ||
                value === 'bus' ||
                value === 'machinery' ||
                value === 'nautical' ||
                value === 'aerial'
            );
        });
    return normalized.length > 0 ? Array.from(new Set(normalized)) : [...DEFAULT_TYPES];
}

function normalizeCatalogText(value: string) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function buildVersionKey(brandId: string, modelName: string) {
    return `${brandId}:${normalizeCatalogText(modelName)}`;
}

function uniqueById<T extends { id: string }>(rows: T[]): T[] {
    const seen = new Set<string>();
    return rows.filter((row) => {
        if (seen.has(row.id)) return false;
        seen.add(row.id);
        return true;
    });
}

function buildSupplementalVersions(models: CatalogModel[], existingVersions: CatalogVersion[] = []): CatalogVersion[] {
    const existingByModel = new Set(existingVersions.map((version) => `${version.modelId}:${normalizeCatalogText(version.name)}`));
    const rows: CatalogVersion[] = [];

    for (const model of models) {
        const curatedOptions = CURATED_VERSION_OPTIONS_BY_MODEL_KEY[buildVersionKey(model.brandId, model.name)];
        const genericOptions = GENERIC_VERSION_OPTIONS_BY_TYPE[model.vehicleTypes[0] || 'car'];
        const options = curatedOptions && curatedOptions.length > 0 ? curatedOptions : genericOptions;

        for (const option of options) {
            const dedupeKey = `${model.id}:${normalizeCatalogText(option)}`;
            if (existingByModel.has(dedupeKey)) continue;
            rows.push({
                id: `${model.id}-${normalizeCatalogText(option).replace(/\s+/g, '-')}`,
                brandId: model.brandId,
                modelId: model.id,
                name: option,
                year: undefined,
                vehicleTypes: model.vehicleTypes,
            });
            existingByModel.add(dedupeKey);
        }
    }

    return rows;
}

function normalizeCatalogPayload(payload: unknown): Omit<PublishWizardCatalog, 'source'> | null {
    if (!payload || typeof payload !== 'object') return null;
    const objectPayload = payload as Record<string, unknown>;
    const brandsInput = asArray<Record<string, unknown>>(objectPayload.brands);
    const modelsInput = asArray<Record<string, unknown>>(objectPayload.models);
    const versionsInput = asArray<Record<string, unknown>>(objectPayload.versions);
    const regionsInput = asArray<Record<string, unknown>>(objectPayload.regions ?? objectPayload.regiones);
    const communesInput = asArray<Record<string, unknown>>(objectPayload.communes ?? objectPayload.comunas);

    const normalizedBrands = uniqueById(
        brandsInput
            .map((brand, index) => ({
                id: toId(brand.id ?? brand.brand_id, 'brand', index),
                name: String(brand.name ?? brand.brand_name ?? '').trim(),
                vehicleTypes: normalizeVehicleTypes(brand.vehicle_types),
            }))
            .filter((brand) => brand.name)
    );

    const normalizedModels = uniqueById(
        modelsInput
            .map((model, index) => ({
                id: toId(model.id ?? model.model_id, 'model', index),
                brandId: toId(model.brand_id ?? model.brandId, 'brand', index),
                name: String(model.name ?? model.model_name ?? '').trim(),
                vehicleTypes: normalizeVehicleTypes(model.vehicle_types),
            }))
            .filter((model) => model.name && model.brandId)
    );

    const normalizedVersions = uniqueById(
        versionsInput
            .map((version, index) => ({
                id: toId(version.id ?? version.version_id, 'version', index),
                brandId: toId(version.brand_id ?? version.brandId, 'brand', index),
                modelId: toId(version.model_id ?? version.modelId, 'model', index),
                name: String(version.name ?? version.version_name ?? version.trim_name ?? '').trim(),
                year: String(version.year ?? version.model_year ?? '').trim() || undefined,
                vehicleTypes: normalizeVehicleTypes(version.vehicle_types),
            }))
            .filter((version) => version.name && version.modelId && version.brandId)
    );

    const normalizedRegions = uniqueById(
        regionsInput
            .map((region, index) => ({
                id: toId(region.id ?? region.region_id, 'region', index),
                name: String(region.name ?? region.region_name ?? '').trim(),
                code: String(region.code ?? '').trim() || undefined,
            }))
            .filter((region) => region.name)
    );

    const normalizedCommunes = uniqueById(
        communesInput
            .map((commune, index) => ({
                id: toId(commune.id ?? commune.commune_id, 'commune', index),
                regionId: toId(commune.region_id ?? commune.regionId, 'region', index),
                name: String(commune.name ?? commune.commune_name ?? '').trim(),
            }))
            .filter((commune) => commune.name && commune.regionId)
    );

    if (
        normalizedBrands.length === 0 &&
        normalizedModels.length === 0 &&
        normalizedVersions.length === 0 &&
        normalizedRegions.length === 0 &&
        normalizedCommunes.length === 0
    ) {
        return null;
    }

    const baseModels = normalizedModels.length > 0 ? normalizedModels : FALLBACK_MODELS;
    const mergedVersions = uniqueById([
        ...normalizedVersions,
        ...buildSupplementalVersions(baseModels, normalizedVersions),
    ]);

    return {
        brands: normalizedBrands.length > 0 ? normalizedBrands : FALLBACK_BRANDS,
        models: baseModels,
        versions: mergedVersions,
        regions: normalizedRegions.length > 0 ? normalizedRegions : FALLBACK_REGIONS,
        communes: normalizedCommunes.length > 0 ? normalizedCommunes : FALLBACK_COMMUNES,
    };
}

export async function loadPublishWizardCatalog(signal?: AbortSignal): Promise<PublishWizardCatalog> {
    // Temporarily use fallback only due to encoding issues in seed file
    return {
        brands: FALLBACK_BRANDS,
        models: FALLBACK_MODELS,
        versions: FALLBACK_VERSIONS,
        regions: FALLBACK_REGIONS,
        communes: FALLBACK_COMMUNES,
        source: 'fallback',
    };

    // Original code (disabled due to encoding issues):
    /*
    for (const path of CATALOG_PATHS) {
        try {
            const response = await fetch(path, {
                method: 'GET',
                cache: 'no-store',
                signal,
            });
            if (!response.ok) continue;
            const payload = await response.json();
            const normalized = normalizeCatalogPayload(payload);
            if (normalized) {
                return { ...normalized, source: 'seed-file' };
            }
        } catch {
            // Fallback local si seed file ausente o inválido.
        }
    }
    */
}

// Nombres normalizados de marcas con presencia en Chile (construido desde FALLBACK_BRANDS)
let _chileBrandNamesCache: Set<string> | null = null;
function getChileBrandNames(): Set<string> {
    if (!_chileBrandNamesCache) {
        _chileBrandNamesCache = new Set(FALLBACK_BRANDS.map((b) => normalizeCatalogText(b.name)));
    }
    return _chileBrandNamesCache;
}

export function getBrandsForVehicleType(
    catalog: PublishWizardCatalog,
    vehicleType: VehicleCatalogType
): CatalogBrand[] {
    const chileNames = getChileBrandNames();
    return catalog.brands
        .filter((brand) => brand.vehicleTypes.includes(vehicleType))
        // Filtrar por nombre normalizado: descarta marcas con encoding corrupto
        // (ej: "CitroÃƒÆ'Ã‚Â«n" normaliza a "citro n" que no coincide con "citroen")
        .filter((brand) => chileNames.has(normalizeCatalogText(brand.name)))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function getModelsForBrand(
    catalog: PublishWizardCatalog,
    brandId: string,
    vehicleType: VehicleCatalogType
): CatalogModel[] {
    if (!brandId) return [];
    return catalog.models
        .filter((model) => model.brandId === brandId)
        .filter((model) => model.vehicleTypes.includes(vehicleType))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function getVersionsForModel(
    catalog: PublishWizardCatalog,
    modelId: string,
    vehicleType: VehicleCatalogType,
    year?: string
): CatalogVersion[] {
    if (!modelId) return [];
    return catalog.versions
        .filter((version) => version.modelId === modelId)
        .filter((version) => version.vehicleTypes.includes(vehicleType))
        .filter((version) => !year || !version.year || version.year === year)
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function getCommunesForRegion(catalog: PublishWizardCatalog, regionId: string): CatalogCommune[] {
    if (!regionId) return [];
    return catalog.communes
        .filter((commune) => commune.regionId === regionId)
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}
