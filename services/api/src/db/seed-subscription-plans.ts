import { eq, and } from 'drizzle-orm';
import { db } from './index.js';
import { subscriptionPlans } from './schema.js';

const AGENDA_PLANS = [
  {
    vertical: 'agenda' as const,
    planId: 'free',
    name: 'Gratuito',
    description: 'Para profesionales que están comenzando',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'CLP',
    maxListings: 1,
    maxFeaturedListings: 0,
    maxImagesPerListing: 5,
    analyticsEnabled: false,
    crmEnabled: false,
    prioritySupport: false,
    customBranding: false,
    apiAccess: false,
    isActive: true,
    isDefault: true,
    features: [
      '1 profesional',
      'Hasta 50 citas mensuales',
      'Clientes ilimitados',
      'Recordatorios por email',
      'Perfil básico público',
      'Soporte por email',
    ],
  },
  {
    vertical: 'agenda' as const,
    planId: 'pro',
    name: 'Pro',
    description: 'Para profesionales que quieren crecer',
    priceMonthly: 14990,
    priceYearly: 149900,
    currency: 'CLP',
    maxListings: 3,
    maxFeaturedListings: 1,
    maxImagesPerListing: 20,
    analyticsEnabled: true,
    crmEnabled: true,
    prioritySupport: true,
    customBranding: true,
    apiAccess: false,
    isActive: true,
    isDefault: false,
    features: [
      '3 profesionales',
      'Citas ilimitadas',
      'Clientes ilimitados',
      'Recordatorios WhatsApp + Email',
      'Perfil profesional público',
      'Estadísticas avanzadas',
      'Gestión de cobros',
      'Integración con Google Calendar',
      'Soporte prioritario',
      'Personalización de marca',
    ],
  },
];

const AUTOS_PLANS = [
  {
    vertical: 'autos' as const,
    planId: 'free',
    name: 'Gratuito',
    description: 'Para vendedores individuales',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'CLP',
    maxListings: 1,
    maxFeaturedListings: 0,
    maxImagesPerListing: 5,
    analyticsEnabled: false,
    crmEnabled: false,
    prioritySupport: false,
    customBranding: false,
    apiAccess: false,
    isActive: true,
    isDefault: true,
    features: [
      '1 publicación activa',
      'Hasta 5 fotos por publicación',
      'Perfil básico',
      'Soporte por email',
    ],
  },
  {
    vertical: 'autos' as const,
    planId: 'pro',
    name: 'Pro',
    description: 'Para concesionarias y brokers',
    priceMonthly: 49990,
    priceYearly: 499900,
    currency: 'CLP',
    maxListings: 25,
    maxFeaturedListings: 5,
    maxImagesPerListing: 25,
    analyticsEnabled: true,
    crmEnabled: true,
    prioritySupport: true,
    customBranding: true,
    apiAccess: false,
    isActive: true,
    isDefault: false,
    features: [
      '25 publicaciones activas',
      'Hasta 25 fotos por publicación',
      '5 publicaciones destacadas',
      'Estadísticas avanzadas',
      'CRM de leads',
      'Soporte prioritario',
      'Personalización de marca',
    ],
  },
  {
    vertical: 'autos' as const,
    planId: 'enterprise',
    name: 'Empresa',
    description: 'Para concesionarias grandes',
    priceMonthly: 149990,
    priceYearly: 1499900,
    currency: 'CLP',
    maxListings: 100,
    maxFeaturedListings: 20,
    maxImagesPerListing: 50,
    analyticsEnabled: true,
    crmEnabled: true,
    prioritySupport: true,
    customBranding: true,
    apiAccess: true,
    isActive: true,
    isDefault: false,
    features: [
      '100 publicaciones activas',
      'Hasta 50 fotos por publicación',
      '20 publicaciones destacadas',
      'Estadísticas avanzadas',
      'CRM con equipo',
      'Soporte VIP',
      'API access',
      'Integraciones personalizadas',
    ],
  },
];

const PROPIEDADES_PLANS = [
  {
    vertical: 'propiedades' as const,
    planId: 'free',
    name: 'Gratuito',
    description: 'Para propietarios individuales',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'CLP',
    maxListings: 1,
    maxFeaturedListings: 0,
    maxImagesPerListing: 5,
    analyticsEnabled: false,
    crmEnabled: false,
    prioritySupport: false,
    customBranding: false,
    apiAccess: false,
    isActive: true,
    isDefault: true,
    features: [
      '1 publicación activa',
      'Hasta 5 fotos por publicación',
      'Perfil básico',
      'Soporte por email',
    ],
  },
  {
    vertical: 'propiedades' as const,
    planId: 'pro',
    name: 'Pro',
    description: 'Para corredoras y agencias',
    priceMonthly: 49990,
    priceYearly: 499900,
    currency: 'CLP',
    maxListings: 25,
    maxFeaturedListings: 5,
    maxImagesPerListing: 25,
    analyticsEnabled: true,
    crmEnabled: true,
    prioritySupport: true,
    customBranding: true,
    apiAccess: false,
    isActive: true,
    isDefault: false,
    features: [
      '25 publicaciones activas',
      'Hasta 25 fotos por publicación',
      '5 publicaciones destacadas',
      'Estadísticas avanzadas',
      'CRM de leads',
      'Soporte prioritario',
      'Personalización de marca',
    ],
  },
  {
    vertical: 'propiedades' as const,
    planId: 'enterprise',
    name: 'Empresa',
    description: 'Para grandes agencias inmobiliarias',
    priceMonthly: 149990,
    priceYearly: 1499900,
    currency: 'CLP',
    maxListings: 100,
    maxFeaturedListings: 20,
    maxImagesPerListing: 50,
    analyticsEnabled: true,
    crmEnabled: true,
    prioritySupport: true,
    customBranding: true,
    apiAccess: true,
    isActive: true,
    isDefault: false,
    features: [
      '100 publicaciones activas',
      'Hasta 50 fotos por publicación',
      '20 publicaciones destacadas',
      'Estadísticas avanzadas',
      'CRM con equipo',
      'Soporte VIP',
      'API access',
      'Integraciones personalizadas',
    ],
  },
];

export async function seedSubscriptionPlans() {
  console.log('[seed] Seeding subscription plans...');

  const allPlans = [...AGENDA_PLANS, ...AUTOS_PLANS, ...PROPIEDADES_PLANS];

  for (const plan of allPlans) {
    const existing = await db
      .select()
      .from(subscriptionPlans)
      .where(and(
        eq(subscriptionPlans.vertical, plan.vertical),
        eq(subscriptionPlans.planId, plan.planId)
      ))
      .limit(1);

    const planData = {
      ...plan,
      priceMonthly: plan.priceMonthly.toString(),
      priceYearly: plan.priceYearly.toString(),
      features: plan.features as unknown,
    };

    if (existing[0]) {
      // Update existing plan
      await db
        .update(subscriptionPlans)
        .set({
          ...planData,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionPlans.id, existing[0].id));
      console.log(`[seed] Updated plan: ${plan.vertical}/${plan.planId}`);
    } else {
      // Insert new plan
      await db.insert(subscriptionPlans).values(planData);
      console.log(`[seed] Created plan: ${plan.vertical}/${plan.planId}`);
    }
  }

  console.log('[seed] Subscription plans seeded successfully');
}

// Export for manual execution
export default seedSubscriptionPlans;
