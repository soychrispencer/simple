import { Vehicle } from "@/types/vehicle";

// Utilidad de mapeo de valores legacy -> nuevos enums
const mapListingKind = (v: string): any => ({ venta: 'sale', arriendo: 'rent', subasta: 'auction' }[v] || 'sale');
const mapState = (v: string): any => ({ usado: 'used', nuevo: 'new' }[v] || 'used');
const mapVisibility = (v: string): any => ({ destacado: 'featured', normal: 'normal', oculto: 'hidden' }[v] || 'featured');
const mapTypeKey = (v: string): any => ({ auto: 'car', camion: 'truck', moto: 'motorcycle' }[v] || 'car');

// Fuente original de datos (simplificada) en formato legacy
interface LegacyItem {
  id: string; tipoLista: string; tipoVehiculo: string; carroceria: string; estado: string; titulo: string; precio: number; año: number; kilometraje: number;
  marca: string; modelo: string; version: string; color: string; region: string; comuna: string; motor: string; puertas: number; transmision: string; combustible: string;
  imagenes: string[]; equipamiento: string[]; documentacion: string[]; numeroDuenos: number; patenteVisible: boolean; fechaPublicacion: string; fechaVencimiento: string;
  permiteFinanciamiento: boolean; permitePermuta: boolean; visibilidad: string; consumo: string; potencia: string; traccion: string; garantia: string; historialMantenciones: string;
}

const legacyData: LegacyItem[] = [
  { id: '1', tipoLista: 'venta', tipoVehiculo: 'auto', carroceria: 'suv', estado: 'usado', titulo: 'Toyota RAV4 2021 4x4 Full Equipo', precio: 18990000, año: 2021, kilometraje: 32000, marca: 'Toyota', modelo: 'RAV4', version: 'Limited', color: 'Gris Oscuro', region: 'Metropolitana', comuna: 'Las Condes', motor: '2.5L', puertas: 5, transmision: 'automatica', combustible: 'gasolina', imagenes: ['/1.png','/2.png','/3.png','/4.png'], equipamiento: ['Techo solar','Bluetooth','Cámara retroceso','Airbags','Climatizador'], documentacion: ['Padrón al día','Revisión técnica'], numeroDuenos: 1, patenteVisible: false, fechaPublicacion: '2025-08-01', fechaVencimiento: '2025-09-01', permiteFinanciamiento: true, permitePermuta: true, visibilidad: 'destacado', consumo: '12 km/l', potencia: '204 HP', traccion: '4x4', garantia: '6 meses', historialMantenciones: 'Todas en concesionario Toyota' },
  { id: '4', tipoLista: 'venta', tipoVehiculo: 'auto', carroceria: 'hatchback', estado: 'nuevo', titulo: 'Mazda 3 2024 Hatchback Signature', precio: 23990000, año: 2024, kilometraje: 0, marca: 'Mazda', modelo: '3', version: 'Signature', color: 'Rojo', region: 'Metropolitana', comuna: 'Providencia', motor: '2.0L', puertas: 5, transmision: 'automatica', combustible: 'gasolina', imagenes: ['/1.png','/2.png','/3.png','/4.png'], equipamiento: ['Sunroof','Bluetooth','Cámara 360','Airbags','Climatizador'], documentacion: ['Padrón al día','Revisión técnica'], numeroDuenos: 0, patenteVisible: false, fechaPublicacion: '2025-08-20', fechaVencimiento: '2025-09-20', permiteFinanciamiento: true, permitePermuta: false, visibilidad: 'destacado', consumo: '15 km/l', potencia: '186 HP', traccion: 'FWD', garantia: '3 años', historialMantenciones: 'Nuevo de fábrica' },
  { id: '5', tipoLista: 'arriendo', tipoVehiculo: 'camion', carroceria: 'pickup', estado: 'usado', titulo: 'Ford Ranger 2022 XLT 4x4', precio: 45000, año: 2022, kilometraje: 18000, marca: 'Ford', modelo: 'Ranger', version: 'XLT', color: 'Azul', region: 'Valparaíso', comuna: 'Quilpué', motor: '3.2L', puertas: 4, transmision: 'manual', combustible: 'diesel', imagenes: ['/1.png','/2.png','/3.png','/4.png'], equipamiento: ['4x4','Bluetooth','Airbags','Climatizador'], documentacion: ['Padrón al día'], numeroDuenos: 1, patenteVisible: false, fechaPublicacion: '2025-08-18', fechaVencimiento: '2025-09-18', permiteFinanciamiento: false, permitePermuta: true, visibilidad: 'destacado', consumo: '10 km/l', potencia: '200 HP', traccion: '4x4', garantia: 'No', historialMantenciones: 'Todas en concesionario Ford' },
  { id: '6', tipoLista: 'subasta', tipoVehiculo: 'auto', carroceria: 'sedan', estado: 'usado', titulo: 'Chevrolet Sail 2019 LS', precio: 3200000, año: 2019, kilometraje: 54000, marca: 'Chevrolet', modelo: 'Sail', version: 'LS', color: 'Gris', region: 'Maule', comuna: 'Talca', motor: '1.5L', puertas: 4, transmision: 'manual', combustible: 'gasolina', imagenes: ['/1.png','/2.png','/3.png','/4.png'], equipamiento: ['Bluetooth','Airbags'], documentacion: ['Padrón al día'], numeroDuenos: 2, patenteVisible: false, fechaPublicacion: '2025-08-10', fechaVencimiento: '2025-08-30', permiteFinanciamiento: false, permitePermuta: false, visibilidad: 'destacado', consumo: '16 km/l', potencia: '109 HP', traccion: 'FWD', garantia: 'No', historialMantenciones: 'Cambio de aceite reciente' },
  { id: '2', tipoLista: 'arriendo', tipoVehiculo: 'auto', carroceria: 'sedan', estado: 'usado', titulo: 'Hyundai Elantra 2020 Automático', precio: 35000, año: 2020, kilometraje: 45000, marca: 'Hyundai', modelo: 'Elantra', version: 'GLS', color: 'Blanco', region: 'Valparaíso', comuna: 'Viña del Mar', motor: '1.6L', puertas: 4, transmision: 'automatica', combustible: 'gasolina', imagenes: ['/1.png','/2.png','/3.png','/4.png'], equipamiento: ['Bluetooth','Aire acondicionado','Airbags'], documentacion: ['Padrón al día'], numeroDuenos: 2, patenteVisible: false, fechaPublicacion: '2025-08-10', fechaVencimiento: '2025-08-20', permiteFinanciamiento: false, permitePermuta: false, visibilidad: 'destacado', consumo: '14 km/l', potencia: '128 HP', traccion: '4x2', garantia: 'No', historialMantenciones: 'Cambio de aceite reciente' },
  { id: '3', tipoLista: 'subasta', tipoVehiculo: 'moto', carroceria: 'otros', estado: 'usado', titulo: 'Yamaha MT-03 2022 ABS', precio: 3200000, año: 2022, kilometraje: 8000, marca: 'Yamaha', modelo: 'MT-03', version: 'ABS', color: 'Negro', region: 'Biobío', comuna: 'Concepción', motor: '321cc', puertas: 0, transmision: 'manual', combustible: 'gasolina', imagenes: ['/1.png','/2.png','/3.png','/4.png'], equipamiento: ['ABS','Luces LED'], documentacion: ['Padrón al día'], numeroDuenos: 1, patenteVisible: false, fechaPublicacion: '2025-08-15', fechaVencimiento: '2025-08-25', permiteFinanciamiento: false, permitePermuta: false, visibilidad: 'destacado', consumo: '28 km/l', potencia: '42 HP', traccion: 'RWD', garantia: 'No', historialMantenciones: 'Mantención en concesionario Yamaha' },
  { id: '7', tipoLista: 'venta', tipoVehiculo: 'auto', carroceria: 'sedan', estado: 'usado', titulo: 'Honda Civic 2020 Turbo', precio: 17990000, año: 2020, kilometraje: 25000, marca: 'Honda', modelo: 'Civic', version: 'Turbo', color: 'Negro', region: 'Metropolitana', comuna: 'Santiago', motor: '1.5L', puertas: 4, transmision: 'automatica', combustible: 'gasolina', imagenes: ['/1.png','/2.png'], equipamiento: ['Turbo','Bluetooth','Cámara retroceso'], documentacion: ['Padrón al día'], numeroDuenos: 1, patenteVisible: false, fechaPublicacion: '2025-08-15', fechaVencimiento: '2025-09-15', permiteFinanciamiento: true, permitePermuta: true, visibilidad: 'destacado', consumo: '14 km/l', potencia: '174 HP', traccion: 'FWD', garantia: '1 año', historialMantenciones: 'Todas en concesionario Honda' },
  { id: '8', tipoLista: 'arriendo', tipoVehiculo: 'camion', carroceria: 'pickup', estado: 'nuevo', titulo: 'Toyota Hilux 2023 4x4', precio: 60000, año: 2023, kilometraje: 0, marca: 'Toyota', modelo: 'Hilux', version: '4x4', color: 'Blanco', region: 'Antofagasta', comuna: 'Calama', motor: '2.8L', puertas: 4, transmision: 'manual', combustible: 'diesel', imagenes: ['/1.png','/2.png'], equipamiento: ['4x4','Bluetooth','Cámara retroceso'], documentacion: ['Padrón al día'], numeroDuenos: 0, patenteVisible: false, fechaPublicacion: '2025-08-10', fechaVencimiento: '2025-09-10', permiteFinanciamiento: true, permitePermuta: false, visibilidad: 'destacado', consumo: '12 km/l', potencia: '204 HP', traccion: '4x4', garantia: '3 años', historialMantenciones: 'Nuevo de fábrica' },
  { id: '9', tipoLista: 'venta', tipoVehiculo: 'auto', carroceria: 'sedan', estado: 'nuevo', titulo: 'Nissan Sentra 2023 Full Equipo', precio: 20990000, año: 2023, kilometraje: 0, marca: 'Nissan', modelo: 'Sentra', version: 'Full Equipo', color: 'Blanco', region: 'Valparaíso', comuna: 'Viña del Mar', motor: '2.0L', puertas: 4, transmision: 'automatica', combustible: 'gasolina', imagenes: ['/1.png','/2.png'], equipamiento: ['Bluetooth','Cámara retroceso','Airbags'], documentacion: ['Padrón al día'], numeroDuenos: 0, patenteVisible: false, fechaPublicacion: '2025-08-12', fechaVencimiento: '2025-09-12', permiteFinanciamiento: true, permitePermuta: false, visibilidad: 'destacado', consumo: '14 km/l', potencia: '149 HP', traccion: 'FWD', garantia: '3 años', historialMantenciones: 'Nuevo de fábrica' },
  { id: '10', tipoLista: 'arriendo', tipoVehiculo: 'camion', carroceria: 'pickup', estado: 'usado', titulo: 'Chevrolet Colorado 2021 4x4', precio: 55000, año: 2021, kilometraje: 15000, marca: 'Chevrolet', modelo: 'Colorado', version: '4x4', color: 'Gris', region: 'Biobío', comuna: 'Concepción', motor: '2.8L', puertas: 4, transmision: 'manual', combustible: 'diesel', imagenes: ['/1.png','/2.png'], equipamiento: ['4x4','Bluetooth','Cámara retroceso'], documentacion: ['Padrón al día'], numeroDuenos: 1, patenteVisible: false, fechaPublicacion: '2025-08-05', fechaVencimiento: '2025-09-05', permiteFinanciamiento: false, permitePermuta: true, visibilidad: 'destacado', consumo: '11 km/l', potencia: '200 HP', traccion: '4x4', garantia: '1 año', historialMantenciones: 'Todas en concesionario Chevrolet' },
  { id: '11', tipoLista: 'subasta', tipoVehiculo: 'auto', carroceria: 'hatchback', estado: 'usado', titulo: 'Volkswagen Golf 2018 GTI', precio: 15990000, año: 2018, kilometraje: 45000, marca: 'Volkswagen', modelo: 'Golf', version: 'GTI', color: 'Rojo', region: 'Metropolitana', comuna: 'Ñuñoa', motor: '2.0L', puertas: 5, transmision: 'automatica', combustible: 'gasolina', imagenes: ['/1.png','/2.png'], equipamiento: ['Turbo','Bluetooth','Cámara retroceso'], documentacion: ['Padrón al día'], numeroDuenos: 1, patenteVisible: false, fechaPublicacion: '2025-08-08', fechaVencimiento: '2025-09-08', permiteFinanciamiento: true, permitePermuta: true, visibilidad: 'destacado', consumo: '12 km/l', potencia: '220 HP', traccion: 'FWD', garantia: '6 meses', historialMantenciones: 'Todas en concesionario Volkswagen' },
  { id: '12', tipoLista: 'venta', tipoVehiculo: 'auto', carroceria: 'suv', estado: 'nuevo', titulo: 'Hyundai Tucson 2023 GLS', precio: 25990000, año: 2023, kilometraje: 0, marca: 'Hyundai', modelo: 'Tucson', version: 'GLS', color: 'Azul', region: 'Metropolitana', comuna: 'La Florida', motor: '2.0L', puertas: 5, transmision: 'automatica', combustible: 'gasolina', imagenes: ['/1.png','/2.png'], equipamiento: ['Bluetooth','Cámara retroceso','Airbags'], documentacion: ['Padrón al día'], numeroDuenos: 0, patenteVisible: false, fechaPublicacion: '2025-08-10', fechaVencimiento: '2025-09-10', permiteFinanciamiento: true, permitePermuta: false, visibilidad: 'destacado', consumo: '13 km/l', potencia: '155 HP', traccion: 'FWD', garantia: '3 años', historialMantenciones: 'Nuevo de fábrica' },
  { id: '13', tipoLista: 'arriendo', tipoVehiculo: 'camion', carroceria: 'pickup', estado: 'usado', titulo: 'Mitsubishi L200 2020 4x4', precio: 50000, año: 2020, kilometraje: 30000, marca: 'Mitsubishi', modelo: 'L200', version: '4x4', color: 'Negro', region: 'Araucanía', comuna: 'Temuco', motor: '2.4L', puertas: 4, transmision: 'manual', combustible: 'diesel', imagenes: ['/1.png','/2.png'], equipamiento: ['4x4','Bluetooth','Cámara retroceso'], documentacion: ['Padrón al día'], numeroDuenos: 1, patenteVisible: false, fechaPublicacion: '2025-08-01', fechaVencimiento: '2025-09-01', permiteFinanciamiento: false, permitePermuta: true, visibilidad: 'destacado', consumo: '12 km/l', potencia: '181 HP', traccion: '4x4', garantia: '1 año', historialMantenciones: 'Todas en concesionario Mitsubishi' },
  { id: '14', tipoLista: 'subasta', tipoVehiculo: 'auto', carroceria: 'sedan', estado: 'usado', titulo: 'BMW Serie 3 2019 320i', precio: 28990000, año: 2019, kilometraje: 60000, marca: 'BMW', modelo: 'Serie 3', version: '320i', color: 'Gris', region: 'Metropolitana', comuna: 'Vitacura', motor: '2.0L', puertas: 4, transmision: 'automatica', combustible: 'gasolina', imagenes: ['/1.png','/2.png'], equipamiento: ['Turbo','Bluetooth','Cámara retroceso'], documentacion: ['Padrón al día'], numeroDuenos: 1, patenteVisible: false, fechaPublicacion: '2025-08-15', fechaVencimiento: '2025-09-15', permiteFinanciamiento: true, permitePermuta: true, visibilidad: 'destacado', consumo: '11 km/l', potencia: '184 HP', traccion: 'RWD', garantia: '6 meses', historialMantenciones: 'Todas en concesionario BMW' },
  { id: '15', tipoLista: 'venta', tipoVehiculo: 'auto', carroceria: 'hatchback', estado: 'nuevo', titulo: 'Kia Rio 2023 Full Equipo', precio: 13990000, año: 2023, kilometraje: 0, marca: 'Kia', modelo: 'Rio', version: 'Full Equipo', color: 'Blanco', region: 'Coquimbo', comuna: 'La Serena', motor: '1.4L', puertas: 5, transmision: 'manual', combustible: 'gasolina', imagenes: ['/1.png','/2.png'], equipamiento: ['Bluetooth','Cámara retroceso','Airbags'], documentacion: ['Padrón al día'], numeroDuenos: 0, patenteVisible: false, fechaPublicacion: '2025-08-18', fechaVencimiento: '2025-09-18', permiteFinanciamiento: true, permitePermuta: false, visibilidad: 'destacado', consumo: '16 km/l', potencia: '100 HP', traccion: 'FWD', garantia: '3 años', historialMantenciones: 'Nuevo de fábrica' },
  { id: '16', tipoLista: 'arriendo', tipoVehiculo: 'camion', carroceria: 'pickup', estado: 'nuevo', titulo: 'Nissan Navara 2023 4x4', precio: 58000, año: 2023, kilometraje: 0, marca: 'Nissan', modelo: 'Navara', version: '4x4', color: 'Rojo', region: 'Los Lagos', comuna: 'Puerto Montt', motor: '2.3L', puertas: 4, transmision: 'manual', combustible: 'diesel', imagenes: ['/1.png','/2.png'], equipamiento: ['4x4','Bluetooth','Cámara retroceso'], documentacion: ['Padrón al día'], numeroDuenos: 0, patenteVisible: false, fechaPublicacion: '2025-08-12', fechaVencimiento: '2025-09-12', permiteFinanciamiento: true, permitePermuta: false, visibilidad: 'destacado', consumo: '13 km/l', potencia: '190 HP', traccion: '4x4', garantia: '3 años', historialMantenciones: 'Nuevo de fábrica' },
  { id: '17', tipoLista: 'subasta', tipoVehiculo: 'auto', carroceria: 'suv', estado: 'usado', titulo: 'Jeep Compass 2020 Limited', precio: 21990000, año: 2020, kilometraje: 40000, marca: 'Jeep', modelo: 'Compass', version: 'Limited', color: 'Negro', region: 'Metropolitana', comuna: 'Santiago', motor: '2.4L', puertas: 5, transmision: 'automatica', combustible: 'gasolina', imagenes: ['/1.png','/2.png'], equipamiento: ['4x4','Bluetooth','Cámara retroceso'], documentacion: ['Padrón al día'], numeroDuenos: 1, patenteVisible: false, fechaPublicacion: '2025-08-20', fechaVencimiento: '2025-09-20', permiteFinanciamiento: true, permitePermuta: true, visibilidad: 'destacado', consumo: '10 km/l', potencia: '180 HP', traccion: '4x4', garantia: '6 meses', historialMantenciones: 'Todas en concesionario Jeep' },
  { id: '18', tipoLista: 'subasta', tipoVehiculo: 'auto', carroceria: 'sedan', estado: 'usado', titulo: 'Audi A4 2018 TFSI', precio: 24990000, año: 2018, kilometraje: 55000, marca: 'Audi', modelo: 'A4', version: 'TFSI', color: 'Blanco', region: 'Metropolitana', comuna: 'Las Condes', motor: '2.0L', puertas: 4, transmision: 'automatica', combustible: 'gasolina', imagenes: ['/1.png','/2.png'], equipamiento: ['Turbo','Bluetooth','Cámara retroceso'], documentacion: ['Padrón al día'], numeroDuenos: 1, patenteVisible: false, fechaPublicacion: '2025-08-22', fechaVencimiento: '2025-09-22', permiteFinanciamiento: true, permitePermuta: true, visibilidad: 'destacado', consumo: '12 km/l', potencia: '190 HP', traccion: 'FWD', garantia: '6 meses', historialMantenciones: 'Todas en concesionario Audi' },
];

// Adaptamos al nuevo modelo VehicleBase creando objetos completos con campos obligatorios
export const featuredVehicles: Vehicle[] = legacyData.map((v): Vehicle => ({
  id: v.id,
  owner_id: 'mock-owner',
  type_id: `mock-${mapTypeKey(v.tipoVehiculo)}`,
  type_key: mapTypeKey(v.tipoVehiculo),
  title: v.titulo,
  description: null,
  listing_type: mapListingKind(v.tipoLista),
  listing_kind: mapListingKind(v.tipoLista),
  price: v.precio,
  year: v.año,
  mileage: v.kilometraje,
  mileage_km: v.kilometraje,
  condition: mapState(v.estado),
  // Legacy: mantenemos también state dentro de extra_specs durante transición.
  color: v.color,
  image_urls: v.imagenes,
  image_paths: v.imagenes,
  video_url: null,
  document_urls: v.documentacion,
  allow_financing: v.permiteFinanciamiento,
  allow_exchange: v.permitePermuta,
  featured: mapVisibility(v.visibilidad) === 'featured',
  visibility: mapVisibility(v.visibilidad),
  created_at: v.fechaPublicacion + 'T00:00:00.000Z',
  updated_at: v.fechaPublicacion + 'T00:00:00.000Z',
  published_at: v.fechaPublicacion + 'T00:00:00.000Z',
  expires_at: v.fechaVencimiento + 'T00:00:00.000Z',
  extra_specs: {
    condition: mapState(v.estado),
    state: mapState(v.estado),
    type_key: mapTypeKey(v.tipoVehiculo),
    main_image: v.imagenes[0] || null,
    legacy: {
      brand_name: v.marca,
      model_name: v.modelo,
      commune_name: v.comuna,
      region_name: v.region,
      engine: v.motor,
      doors: v.puertas,
      transmission_legacy: v.transmision,
      fuel_legacy: v.combustible,
      body_style_legacy: v.carroceria,
      traction: v.traccion,
      power: v.potencia,
      consumption: v.consumo,
      owners: v.numeroDuenos,
      warranty: v.garantia,
      maintenance_history: v.historialMantenciones,
    }
  }
}));

