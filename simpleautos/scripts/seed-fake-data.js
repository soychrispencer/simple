const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =========================================================================
// DATOS BASE
// =========================================================================

const FAKE_USERS = [
  { name: 'AutoMax Chile', email: 'automax@fake.com', type: 'company', avatar: 'https://ui-avatars.com/api/?name=AutoMax&background=FF3600&color=fff' },
  { name: 'Concesionaria Premium', email: 'premium@fake.com', type: 'company', avatar: 'https://ui-avatars.com/api/?name=Premium&background=0066FF&color=fff' },
  { name: 'Autos del Sur', email: 'autossur@fake.com', type: 'company', avatar: 'https://ui-avatars.com/api/?name=Sur&background=00AA44&color=fff' },
  { name: 'Carlos Rodríguez', email: 'carlos@fake.com', type: 'individual', avatar: 'https://ui-avatars.com/api/?name=Carlos+Rodriguez&background=random' },
  { name: 'María Fernández', email: 'maria@fake.com', type: 'individual', avatar: 'https://ui-avatars.com/api/?name=Maria+Fernandez&background=random' },
  { name: 'José González', email: 'jose@fake.com', type: 'individual', avatar: 'https://ui-avatars.com/api/?name=Jose+Gonzalez&background=random' },
  { name: 'Ana Silva', email: 'ana@fake.com', type: 'individual', avatar: 'https://ui-avatars.com/api/?name=Ana+Silva&background=random' },
  { name: 'Pedro Muñoz', email: 'pedro@fake.com', type: 'individual', avatar: 'https://ui-avatars.com/api/?name=Pedro+Munoz&background=random' },
  { name: 'Móviles Santiago', email: 'moviles@fake.com', type: 'company', avatar: 'https://ui-avatars.com/api/?name=Moviles&background=FF6600&color=fff' },
  { name: 'Autos Elite', email: 'elite@fake.com', type: 'company', avatar: 'https://ui-avatars.com/api/?name=Elite&background=gold&color=000' },
];

const BRANDS_MODELS = {
  'Toyota': ['Corolla', 'Yaris', 'RAV4', 'Hilux', 'Camry', 'Prius'],
  'Chevrolet': ['Sail', 'Tracker', 'Cruze', 'Onix', 'Captiva'],
  'Nissan': ['Versa', 'Kicks', 'Sentra', 'X-Trail', 'Qashqai'],
  'Hyundai': ['Accent', 'Elantra', 'Tucson', 'Creta', 'Santa Fe'],
  'Suzuki': ['Swift', 'Baleno', 'Vitara', 'Jimny'],
  'Mazda': ['2', '3', 'CX-3', 'CX-5', 'CX-9'],
  'Kia': ['Rio', 'Sportage', 'Seltos', 'Sorento'],
  'Honda': ['Fit', 'Civic', 'CR-V', 'HR-V'],
  'Ford': ['Fiesta', 'Focus', 'Escape', 'Ranger'],
  'Volkswagen': ['Gol', 'Polo', 'Tiguan', 'Amarok']
};

const COLORS = ['Blanco', 'Negro', 'Gris', 'Plata', 'Rojo', 'Azul', 'Verde'];
const FUEL_TYPES = ['gasoline', 'diesel', 'hybrid', 'electric'];
const TRANSMISSIONS = ['manual', 'automatic'];
const REGIONS = ['Metropolitana', 'Valparaíso', 'Biobío', 'O\'Higgins', 'Maule'];
const COMMUNES = {
  'Metropolitana': ['Santiago', 'Providencia', 'Las Condes', 'Maipú', 'Ñuñoa', 'La Florida'],
  'Valparaíso': ['Valparaíso', 'Viña del Mar', 'Quilpué', 'Villa Alemana'],
  'Biobío': ['Concepción', 'Talcahuano', 'Los Ángeles', 'Chillán'],
  'O\'Higgins': ['Rancagua', 'San Fernando', 'Rengo'],
  'Maule': ['Talca', 'Curicó', 'Linares']
};

// =========================================================================
// FUNCIONES AUXILIARES
// =========================================================================

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateVehicleTitle(brand, model, year) {
  return `${brand} ${model} ${year}`;
}

function generateVehicleDescription(brand, model, year, condition) {
  const templates = [
    `${brand} ${model} ${year} en excelente estado. ${condition === 'new' ? 'Cero kilómetro, recién llegado.' : 'Único dueño, mantenciones al día.'} Financiamiento disponible.`,
    `Vendo ${brand} ${model} ${year}. ${condition === 'used' ? 'Muy bien cuidado, no chocado.' : 'Como nuevo.'} Papeles al día. Entrega inmediata.`,
    `${brand} ${model} ${year} impecable. ${condition === 'certified' ? 'Certificado con garantía.' : 'Revisión técnica vigente.'} Acepto permuta.`,
    `Oportunidad! ${brand} ${model} ${year}. Full equipo. ${condition === 'new' ? 'Sin uso.' : 'Kilometraje real.'} Facilidades de pago.`,
  ];
  return randomChoice(templates);
}

function generatePlaceholderImages(brand, count = 5) {
  // Usar Unsplash con queries específicas de autos
  const queries = ['car-interior', 'car-dashboard', 'car-exterior', 'automotive', 'vehicle'];
  return Array.from({ length: count }, (_, i) => 
    `https://images.unsplash.com/photo-${1550000000000 + randomInt(0, 100000000)}?w=800&h=600&fit=crop&auto=format&q=80`
  );
}

function generatePrice(year, condition, listing_type) {
  const basePrice = (year - 1990) * 500000 + 5000000;
  const conditionMultiplier = {
    'new': 1.3,
    'certified': 1.1,
    'used': 0.85
  };
  
  const price = Math.round(basePrice * conditionMultiplier[condition] / 1000) * 1000;
  
  if (listing_type === 'auction') {
    return Math.round(price * 0.7); // Base más baja para subastas
  }
  if (listing_type === 'rent') {
    return Math.round(price * 0.02); // 2% del valor como arriendo mensual
  }
  
  return price;
}

// =========================================================================
// SEEDING PRINCIPAL
// =========================================================================

async function seedFakeUsers() {
  console.log('🔄 Verificando usuarios existentes...');

  // Primero intentar obtener usuarios existentes
  const { data: existingUsers, error: existingError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .limit(1);

  if (!existingError && existingUsers && existingUsers.length > 0) {
    const user = existingUsers[0];
    console.log(`✅ Usando usuario existente: ${user.first_name || user.email}`);
    return user;
  }

  // Si no hay usuarios, intentar crear uno usando auth
  console.log('🔄 No hay usuarios existentes. Creando usuario de prueba...');

  try {
    // Intentar crear un usuario con auth (esto puede fallar si no hay permisos)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'testpassword123'
    });

    if (authError) {
      console.error('❌ Error creando usuario auth:', authError);
      console.log('💡 Necesitas crear manualmente un usuario en Supabase primero.');
      return null;
    }

    if (authData.user) {
      // Crear perfil para el usuario
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          first_name: 'Usuario',
          last_name: 'Prueba',
          email: 'test@example.com'
        })
        .select()
        .single();

      if (profileError) {
        console.error('❌ Error creando perfil:', profileError);
        return null;
      }

      console.log(`✅ Usuario de prueba creado: ${profileData.first_name} ${profileData.last_name}`);
      return profileData;
    }
  } catch (error) {
    console.error('❌ Error en proceso de creación de usuario:', error);
    console.log('💡 Crea un usuario manualmente en tu aplicación primero.');
    return null;
  }

  return null;
}

async function seedFakeVehicles(user) {
  console.log('🔄 Creando vehículos ficticios...');
  
  if (!user) {
    console.error('❌ No hay usuario para asignar vehículos');
    return;
  }
  
  const vehiclesToInsert = [];
  const targetCount = 120; // Meta de vehículos
  
  for (let i = 0; i < targetCount; i++) {
    const brand = randomChoice(Object.keys(BRANDS_MODELS));
    const model = randomChoice(BRANDS_MODELS[brand]);
    const year = randomInt(2015, 2024);
    const condition = randomChoice(['new', 'used', 'certified']);
    const listing_type = randomChoice(['sale', 'sale', 'sale', 'rent', 'auction']); // 60% venta
    const region = randomChoice(REGIONS);
    const commune = randomChoice(COMMUNES[region]);
    
    const vehicle = {
      owner_id: user.id,
      titulo: generateVehicleTitle(brand, model, year),
      descripcion: generateVehicleDescription(brand, model, year, condition),
      precio: generatePrice(year, condition, listing_type),
      
      // Básicos
      brand,
      model,
      year,
      mileage: condition === 'new' ? 0 : randomInt(5000, 150000),
      color: randomChoice(COLORS),
      
      // Tipo y condición
      type_key: 'car',
      type_label: 'Auto',
      condition,
      status: 'active',
      
      // Ubicación
      region,
      commune,
      
      // Tipo de publicación
      listing_type,
      visibility: Math.random() > 0.7 ? 'featured' : 'normal', // 30% destacados
      
      // Especificaciones
      fuel: randomChoice(FUEL_TYPES),
      transmission: randomChoice(TRANSMISSIONS),
      
      // Imágenes (placeholder)
      portada: `https://images.unsplash.com/photo-${1550000000000 + randomInt(0, 100000000)}?w=800&h=600&fit=crop`,
      imagenes: generatePlaceholderImages(brand, randomInt(4, 8)),
      
      // Métricas simuladas
      vistas: randomInt(10, 500),
      clics: randomInt(5, 100),
      
      // Precios de arriendo si aplica
      rent_daily_price: listing_type === 'rent' ? Math.round(generatePrice(year, condition, 'rent') / 30) : null,
      rent_monthly_price: listing_type === 'rent' ? generatePrice(year, condition, 'rent') : null,
      
      // Precio base de subasta
      auction_start_price: listing_type === 'auction' ? generatePrice(year, condition, 'auction') : null,
      auction_end_at: listing_type === 'auction' ? new Date(Date.now() + randomInt(1, 30) * 24 * 60 * 60 * 1000).toISOString() : null,
      
      // Extra specs
      extra_specs: {
        doors: randomInt(2, 5),
        seats: randomInt(2, 7),
        engine_size: randomChoice(['1.4', '1.6', '1.8', '2.0', '2.5']),
      },
      
      // Flag de ficticio
      is_fake: true
    };
    
    vehiclesToInsert.push(vehicle);
  }
  
  // Insertar en lotes de 50
  const batchSize = 50;
  let totalInserted = 0;
  
  for (let i = 0; i < vehiclesToInsert.length; i += batchSize) {
    const batch = vehiclesToInsert.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('vehicles')
      .insert(batch)
      .select('id');
    
    if (error) {
      console.error(`❌ Error en lote ${i / batchSize + 1}:`, error);
    } else {
      totalInserted += data.length;
      console.log(`✅ Lote ${i / batchSize + 1}: ${data.length} vehículos insertados`);
    }
  }
  
  console.log(`✅ Total: ${totalInserted} vehículos ficticios creados`);
  return totalInserted;
}

// =========================================================================
// EJECUTAR SEEDING
// =========================================================================

async function main() {
  console.log('🚀 Iniciando seeding de datos ficticios...\n');
  
  try {
    // 1. Obtener usuario existente
    const user = await seedFakeUsers();
    
    if (!user) {
      console.error('❌ No se pudo obtener un usuario. Abortando.');
      return;
    }
    
    // 2. Crear vehículos
    await seedFakeVehicles(user);
    
    console.log('\n✅ Seeding completado exitosamente!');
    console.log('📊 Resumen:');
    console.log(`   - Usuario: ${user.first_name} ${user.last_name || user.email}`);
    console.log(`   - ~120 vehículos ficticios creados`);
    console.log(`   - Boosts activados automáticamente por trigger\n`);
    
  } catch (error) {
    console.error('❌ Error en seeding:', error);
  }
}

// Ejecutar
main();
