/**
 * Seed script for SimpleSerenatas
 * Run with: npx tsx src/scripts/seed-serenatas.ts
 */

import { db } from '../db/index.js';
import {
  users,
  serenataMusicians,
  serenataRequests,
  serenataGroups,
  serenataGroupMembers,
  serenataAssignments,
} from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Seed data
const seedUsers = [
  { name: 'Pablo Rodríguez', email: 'pablo@simpleserenatas.cl', passwordHash: '', phone: '+56912345678' },
  { name: 'María Silva', email: 'maria@simpleserenatas.cl', passwordHash: '', phone: '+56923456789' },
  { name: 'Juan Pérez', email: 'juan@simpleserenatas.cl', passwordHash: '', phone: '+56934567890' },
  { name: 'Carlos López', email: 'carlos@simpleserenatas.cl', passwordHash: '', phone: '+56945678901' },
  { name: 'Ana Torres', email: 'ana@simpleserenatas.cl', passwordHash: '', phone: '+56956789012' },
  { name: 'Diego Martínez', email: 'diego@simpleserenatas.cl', passwordHash: '', phone: '+56967890123' },
  { name: 'Laura Gómez', email: 'laura@simpleserenatas.cl', passwordHash: '', phone: '+56978901234' },
  { name: 'Roberto Vega', email: 'roberto@simpleserenatas.cl', passwordHash: '', phone: '+56989012345' },
  { name: 'Carmen Ruiz', email: 'carmen@simpleserenatas.cl', passwordHash: '', phone: '+56990123456' },
  { name: 'Fernando Díaz', email: 'fernando@simpleserenatas.cl', passwordHash: '', phone: '+56901234567' },
];

const instruments = ['trumpet', 'voice', 'guitar', 'vihuela', 'guitarron', 'violin', 'accordion', 'percussion'];
const comunas = ['Providencia', 'Las Condes', 'Vitacura', 'Ñuñoa', 'La Reina', 'Santiago', 'Maipú', 'La Florida'];

async function seed() {
  console.log('🎺 Seeding SimpleSerenatas data...\n');

  try {
    // Create users
    console.log('Creating users...');
    const createdUsers = [];
    for (const userData of seedUsers) {
      const [user] = await db.insert(users).values({
        ...userData,
        role: 'user',
        status: 'active',
      }).onConflictDoNothing().returning();
      if (user) createdUsers.push(user);
    }
    console.log(`✅ Created ${createdUsers.length} users`);

    // Create musician profiles
    console.log('\nCreating musician profiles...');
    const createdMusicians = [];
    for (let i = 0; i < createdUsers.length; i++) {
      const user = createdUsers[i];
      const instrument = instruments[i % instruments.length];
      const comuna = comunas[i % comunas.length];
      
      // Generate random coordinates around Santiago
      const lat = -33.4489 + (Math.random() - 0.5) * 0.2;
      const lng = -70.6693 + (Math.random() - 0.5) * 0.2;
      
      const [musician] = await db.insert(serenataMusicians).values({
        userId: user.id,
        instrument,
        experience: Math.floor(Math.random() * 15) + 1,
        bio: `Músico profesional de ${instrument} con ${Math.floor(Math.random() * 15) + 1} años de experiencia`,
        comuna,
        region: 'Región Metropolitana',
        lat: String(lat),
        lng: String(lng),
        isAvailable: Math.random() > 0.3,
        isOnline: Math.random() > 0.5,
        availableNow: Math.random() > 0.7,
        rating: (4 + Math.random()).toFixed(2),
        totalSerenatas: Math.floor(Math.random() * 100),
        completedSerenatas: Math.floor(Math.random() * 80),
        status: 'active',
      }).onConflictDoNothing().returning();
      
      if (musician) createdMusicians.push(musician);
    }
    console.log(`✅ Created ${createdMusicians.length} musician profiles`);

    // Create serenata requests
    console.log('\nCreating serenata requests...');
    const serenatas = [];
    const occasions = ['birthday', 'anniversary', 'love', 'graduation', 'other'];
    const urgencies = ['normal', 'urgent', 'express'];
    const statuses = ['pending', 'assigned', 'confirmed'];
    
    for (let i = 0; i < 20; i++) {
      const comuna = comunas[Math.floor(Math.random() * comunas.length)];
      const lat = -33.4489 + (Math.random() - 0.5) * 0.3;
      const lng = -70.6693 + (Math.random() - 0.5) * 0.3;
      const price = 40000 + Math.floor(Math.random() * 40000);
      
      // Random date in next 7 days
      const dateTime = new Date();
      dateTime.setDate(dateTime.getDate() + Math.floor(Math.random() * 7));
      dateTime.setHours(12 + Math.floor(Math.random() * 8), [0, 30][Math.floor(Math.random() * 2)], 0);
      
      const [serenata] = await db.insert(serenataRequests).values({
        clientName: `Cliente ${i + 1}`,
        clientPhone: `+569${Math.floor(Math.random() * 100000000)}`,
        address: `Calle ${Math.floor(Math.random() * 1000)}, ${comuna}`,
        comuna,
        lat: String(lat),
        lng: String(lng),
        dateTime,
        duration: [30, 45, 60][Math.floor(Math.random() * 3)],
        occasion: occasions[Math.floor(Math.random() * occasions.length)],
        message: Math.random() > 0.5 ? 'Serenata sorpresa' : null,
        requiredInstruments: ['trumpet', 'voice', 'guitar', 'vihuela'],
        minMusicians: 4,
        maxMusicians: 6,
        price: String(price),
        commission: String(price * 0.15),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        urgency: urgencies[Math.floor(Math.random() * urgencies.length)],
        source: 'web',
      }).returning();
      
      serenatas.push(serenata);
    }
    console.log(`✅ Created ${serenatas.length} serenata requests`);

    // Create some groups
    console.log('\nCreating groups...');
    const groups = [];
    const coordinator = createdMusicians[0]; // Pablo will coordinate groups
    
    for (let i = 0; i < 3; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      const [group] = await db.insert(serenataGroups).values({
        name: `Grupo ${['Mañana', 'Tarde', 'Noche'][i]} ${date.toLocaleDateString('es-CL', { weekday: 'long' })}`,
        date,
        createdBy: coordinator.id,
        groupLeadMusicianId: coordinator.id,
        serenataIds: [],
        status: i === 0 ? 'confirmed' : 'forming',
        totalEarnings: '0',
        platformCommission: '0',
      }).returning();
      
      groups.push(group);
      
      // Add members to group
      const numMembers = 4 + Math.floor(Math.random() * 3);
      for (let j = 0; j < numMembers && j < createdMusicians.length; j++) {
        const member = createdMusicians[j];
        await db.insert(serenataGroupMembers).values({
          groupId: group.id,
          musicianId: member.id,
          role: member.instrument,
          earnings: '0',
          status: j === 0 ? 'confirmed' : 'invited',
        }).onConflictDoNothing();
      }
    }
    console.log(`✅ Created ${groups.length} groups with members`);

    // Assign some serenatas to groups
    console.log('\nAssigning serenatas to groups...');
    let assignmentsCount = 0;
    for (let i = 0; i < serenatas.length && i < 5; i++) {
      const groupIndex = i % groups.length;
      const [assignment] = await db.insert(serenataAssignments).values({
        serenataId: serenatas[i].id,
        groupId: groups[groupIndex].id,
        status: 'confirmed',
        position: i,
      }).onConflictDoNothing().returning();
      
      if (assignment) assignmentsCount++;
    }
    console.log(`✅ Created ${assignmentsCount} assignments`);

    console.log('\n🎉 Seed completed successfully!');
    console.log('\nTest accounts:');
    console.log('  pablo@simpleserenatas.cl (coordinator)');
    console.log('  maria@simpleserenatas.cl');
    console.log('  juan@simpleserenatas.cl');
    console.log('  etc...');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
