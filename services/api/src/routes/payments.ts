import { Hono, type Context } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  subscriptionPlans,
  subscriptions,
  paymentOrders,
  users,
} from '../db/schema.js';
import {
  createPreapproval,
  getPaymentById,
  getPreapprovalById,
  isMercadoPagoConfigured,
} from '../mercadopago.js';
import { authUser } from '../index.js';

const app = new Hono();

// Helper to get auth user from context using the exported authUser function
async function getAuthUser(c: Context) {
  return authUser(c);
}

// Schema validations
const startCheckoutSchema = z.object({
  planId: z.enum(['free', 'basic', 'pro', 'enterprise']),
  returnUrl: z.string().url(),
});

const confirmCheckoutSchema = z.object({
  orderId: z.string().uuid().optional(),
  paymentId: z.string().optional(),
  preapprovalId: z.string().optional(),
  status: z.enum(['approved', 'authorized', 'pending', 'rejected', 'cancelled']).optional(),
});

const parseVertical = (v: unknown): 'autos' | 'propiedades' | 'agenda' | null => {
  if (v === 'autos' || v === 'propiedades' || v === 'agenda') return v;
  return null;
};

// Get subscription catalog for current user and vertical
app.get('/catalog', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

  const vertical = parseVertical(c.req.query('vertical'));
  if (!vertical) return c.json({ ok: false, error: 'Vertical inválido' }, 400);

  try {
    // Get all active plans for this vertical
    const plans = await db
      .select()
      .from(subscriptionPlans)
      .where(and(
        eq(subscriptionPlans.vertical, vertical),
        eq(subscriptionPlans.isActive, true)
      ))
      .orderBy(subscriptionPlans.priceMonthly);

    // Get user's current subscription for this vertical
    const userSubs = await db
      .select({
        subscription: subscriptions,
        plan: subscriptionPlans,
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(and(
        eq(subscriptions.userId, user.id),
        eq(subscriptions.vertical, vertical),
        eq(subscriptions.status, 'active')
      ))
      .limit(1);

    const currentSubscription = userSubs[0] || null;

    // Get payment history
    const orders = await db
      .select()
      .from(paymentOrders)
      .where(eq(paymentOrders.userId, user.id))
      .orderBy(desc(paymentOrders.createdAt))
      .limit(50);

    return c.json({
      ok: true,
      mercadoPagoEnabled: isMercadoPagoConfigured(),
      plans: plans.map(p => ({
        id: p.planId,
        name: p.name,
        description: p.description,
        priceMonthly: Number(p.priceMonthly),
        priceYearly: Number(p.priceYearly),
        currency: p.currency,
        features: p.features as string[],
        maxListings: p.maxListings,
        maxFeaturedListings: p.maxFeaturedListings,
        analyticsEnabled: p.analyticsEnabled,
        crmEnabled: p.crmEnabled,
        prioritySupport: p.prioritySupport,
        recommended: p.planId === 'pro',
      })),
      freePlan: plans.find(p => p.planId === 'free') ? {
        id: 'free',
        name: 'Gratuito',
        priceMonthly: 0,
        priceYearly: 0,
        features: ['1 publicación', 'Perfil básico', 'Soporte por email'],
      } : null,
      currentSubscription: currentSubscription ? {
        id: currentSubscription.subscription.id,
        planId: currentSubscription.plan.planId,
        planName: currentSubscription.plan.name,
        status: currentSubscription.subscription.status,
        expiresAt: currentSubscription.subscription.expiresAt,
      } : null,
      orders: orders.map(o => ({
        id: o.id,
        title: o.title,
        amount: Number(o.amount),
        currency: o.currency,
        status: o.status,
        createdAt: o.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching subscription catalog:', error);
    return c.json({ ok: false, error: 'Error al cargar el catálogo' }, 500);
  }
});

// Start subscription checkout
app.post('/checkout', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

  const body = await c.req.json().catch(() => null);
  const parsed = startCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: 'Datos inválidos', details: parsed.error.flatten() }, 400);
  }

  const { planId, returnUrl } = parsed.data;

  // Get plan details
  const plan = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.planId, planId))
    .limit(1);

  if (!plan[0] || plan[0].isActive === false) {
    return c.json({ ok: false, error: 'Plan no encontrado' }, 404);
  }

  const planData = plan[0];

  // Free plan doesn't need payment
  if (Number(planData.priceMonthly) === 0) {
    // Create or update subscription to free plan
    const existingSub = await db
      .select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.userId, user.id),
        eq(subscriptions.vertical, planData.vertical)
      ))
      .limit(1);

    if (existingSub[0]) {
      await db
        .update(subscriptions)
        .set({
          planId: planData.id,
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, existingSub[0].id));
    } else {
      await db.insert(subscriptions).values({
        userId: user.id,
        planId: planData.id,
        vertical: planData.vertical,
        status: 'active',
        startedAt: new Date(),
      });
    }

    return c.json({ ok: true, status: 'approved', checkoutUrl: null });
  }

  // For paid plans, create MercadoPago checkout
  const externalReference = `sub_${user.id}_${planId}_${Date.now()}`;
  const amount = Number(planData.priceMonthly);

  // Create payment order first
  const [order] = await db.insert(paymentOrders).values({
    userId: user.id,
    vertical: planData.vertical,
    kind: 'subscription',
    title: `Suscripción ${planData.name}`,
    amount: amount.toString(),
    currency: planData.currency,
    status: 'pending',
    provider: 'mercadopago',
    metadata: {
      planId: planData.id,
      planName: planData.name,
      vertical: planData.vertical,
      userEmail: user.email,
    },
    returnUrl: returnUrl,
  }).returning();

  try {
    // Create MercadoPago preapproval for recurring payments
    const result = await createPreapproval({
      externalReference: order.id,
      reason: `Suscripción mensual - ${planData.name}`,
      amount: amount,
      currencyId: planData.currency,
      payerEmail: user.email,
      backUrl: `${returnUrl}?purchaseId=${order.id}`,
    });

    // Update order with MercadoPago ID
    await db
      .update(paymentOrders)
      .set({
        providerOrderId: result.id,
        providerStatus: result.status,
      })
      .where(eq(paymentOrders.id, order.id));

    return c.json({
      ok: true,
      orderId: order.id,
      checkoutUrl: result.initPoint,
      status: result.status,
    });
  } catch (error) {
    console.error('Error creating MercadoPago checkout:', error);
    
    // Update order as failed
    await db
      .update(paymentOrders)
      .set({ status: 'rejected' })
      .where(eq(paymentOrders.id, order.id));

    return c.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Error al crear el checkout',
    }, 500);
  }
});

// Confirm checkout after returning from MercadoPago
app.post('/confirm', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

  const body = await c.req.json().catch(() => null);
  const parsed = confirmCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: 'Datos inválidos' }, 400);
  }

  const { orderId, paymentId, preapprovalId, status } = parsed.data;

  if (!orderId) {
    return c.json({ ok: false, error: 'OrderId requerido' }, 400);
  }

  try {
    // Get the order
    const order = await db
      .select()
      .from(paymentOrders)
      .where(and(
        eq(paymentOrders.id, orderId),
        eq(paymentOrders.userId, user.id)
      ))
      .limit(1);

    if (!order[0]) {
      return c.json({ ok: false, error: 'Orden no encontrada' }, 404);
    }

    const orderData = order[0];

    // If preapprovalId is provided, verify with MercadoPago
    if (preapprovalId) {
      try {
        const preapproval = await getPreapprovalById(preapprovalId);
        const mpStatus = (preapproval as any).status;
        
        await db
          .update(paymentOrders)
          .set({
            providerStatus: mpStatus,
            providerResponse: preapproval as any,
          })
          .where(eq(paymentOrders.id, orderId));

        if (mpStatus === 'authorized' || mpStatus === 'approved') {
          // Update order and create subscription
          await confirmAndActivateSubscription(orderData, preapprovalId, mpStatus);
          return c.json({ ok: true, status: 'authorized' });
        } else if (mpStatus === 'pending') {
          return c.json({ ok: true, status: 'pending' });
        } else {
          await db
            .update(paymentOrders)
            .set({ status: 'rejected' })
            .where(eq(paymentOrders.id, orderId));
          return c.json({ ok: false, status: mpStatus, error: 'Pago no autorizado' });
        }
      } catch (error) {
        console.error('Error verifying preapproval:', error);
      }
    }

    // If paymentId is provided, verify payment
    if (paymentId) {
      try {
        const payment = await getPaymentById(paymentId);
        const paymentStatus = (payment as any).status;
        
        await db
          .update(paymentOrders)
          .set({
            providerStatus: paymentStatus,
            providerResponse: payment as any,
          })
          .where(eq(paymentOrders.id, orderId));

        if (paymentStatus === 'approved') {
          await confirmAndActivateSubscription(orderData, null, paymentStatus);
          return c.json({ ok: true, status: 'approved' });
        } else if (paymentStatus === 'in_process' || paymentStatus === 'pending') {
          return c.json({ ok: true, status: 'pending' });
        } else {
          await db
            .update(paymentOrders)
            .set({ status: 'rejected' })
            .where(eq(paymentOrders.id, orderId));
          return c.json({ ok: false, status: paymentStatus, error: 'Pago no aprobado' });
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
      }
    }

    // If explicit status provided
    if (status) {
      if (status === 'approved' || status === 'authorized') {
        await confirmAndActivateSubscription(orderData, preapprovalId || null, status);
        return c.json({ ok: true, status });
      } else {
        await db
          .update(paymentOrders)
          .set({ status: status === 'cancelled' ? 'cancelled' : 'rejected' })
          .where(eq(paymentOrders.id, orderId));
        return c.json({ ok: false, status, error: 'Pago no completado' });
      }
    }

    return c.json({ ok: false, error: 'No se pudo verificar el pago' }, 400);
  } catch (error) {
    console.error('Error confirming checkout:', error);
    return c.json({ ok: false, error: 'Error al confirmar el pago' }, 500);
  }
});

// Helper to activate subscription after payment
async function confirmAndActivateSubscription(
  order: typeof paymentOrders.$inferSelect,
  providerSubscriptionId: string | null,
  providerStatus: string
) {
  const metadata = order.metadata as { planId: string; vertical: string };
  
  // Update order status
  await db
    .update(paymentOrders)
    .set({
      status: 'approved',
      paidAt: new Date(),
      providerStatus,
    })
    .where(eq(paymentOrders.id, order.id));

  // Check for existing subscription
  const existingSub = await db
    .select()
    .from(subscriptions)
    .where(and(
      eq(subscriptions.userId, order.userId),
      eq(subscriptions.vertical, metadata.vertical as 'autos' | 'propiedades' | 'agenda')
    ))
    .limit(1);

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1); // Monthly billing

    if (existingSub[0]) {
    // Update existing subscription
    await db
      .update(subscriptions)
      .set({
        planId: metadata.planId,
        status: 'active',
        providerSubscriptionId: providerSubscriptionId || existingSub[0].providerSubscriptionId,
        providerStatus,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existingSub[0].id));
  } else {
    // Create new subscription
    await db.insert(subscriptions).values({
      userId: order.userId,
      planId: metadata.planId as string,
      vertical: metadata.vertical as 'autos' | 'propiedades' | 'agenda',
      status: 'active',
      provider: 'mercadopago',
      providerSubscriptionId: providerSubscriptionId || undefined,
      providerStatus,
      startedAt: new Date(),
      expiresAt,
    });
  }
}

// Webhook for MercadoPago notifications
app.post('/webhook/mercadopago', async (c) => {
  const body = await c.req.json().catch(() => null);
  
  if (!body) {
    return c.json({ ok: false, error: 'Invalid payload' }, 400);
  }

  console.log('MercadoPago webhook received:', body);

  // Handle different notification types
  const topic = body.topic || body.type;
  const resourceId = body.id || body.data?.id;

  if (!topic || !resourceId) {
    return c.json({ ok: false, error: 'Missing topic or id' }, 400);
  }

  try {
    if (topic === 'payment' || topic === 'merchant_order') {
      // Get payment details
      const payment = await getPaymentById(resourceId);
      const paymentStatus = (payment as any).status;
      const externalRef = (payment as any).external_reference;

      if (externalRef) {
        // Find order by external reference
        const order = await db
          .select()
          .from(paymentOrders)
          .where(eq(paymentOrders.id, externalRef))
          .limit(1);

        if (order[0]) {
          await db
            .update(paymentOrders)
            .set({
              providerStatus: paymentStatus,
              status: paymentStatus === 'approved' ? 'approved' : order[0].status,
              paidAt: paymentStatus === 'approved' ? new Date() : order[0].paidAt,
              providerResponse: payment as any,
            })
            .where(eq(paymentOrders.id, order[0].id));

          if (paymentStatus === 'approved' && order[0].status !== 'approved') {
            await confirmAndActivateSubscription(order[0], null, paymentStatus);
          }
        }
      }
    } else if (topic === 'preapproval' || topic === 'subscription_preapproval') {
      // Handle preapproval updates
      const preapproval = await getPreapprovalById(resourceId);
      const mpStatus = (preapproval as any).status;
      const externalRef = (preapproval as any).external_reference;

      if (externalRef) {
        const order = await db
          .select()
          .from(paymentOrders)
          .where(eq(paymentOrders.id, externalRef))
          .limit(1);

        if (order[0]) {
          await db
            .update(paymentOrders)
            .set({
              providerStatus: mpStatus,
              providerResponse: preapproval as any,
            })
            .where(eq(paymentOrders.id, order[0].id));

          // Update subscription status
          await db
            .update(subscriptions)
            .set({
              providerStatus: mpStatus,
              status: mpStatus === 'authorized' ? 'active' : 'cancelled',
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.providerSubscriptionId, resourceId));
        }
      }
    }

    return c.json({ ok: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return c.json({ ok: false, error: 'Error processing webhook' }, 500);
  }
});

// Get all subscriptions (admin only)
app.get('/admin/all', async (c) => {
  const user = await getAuthUser(c);
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return c.json({ ok: false, error: 'No autorizado' }, 403);
  }

  const vertical = parseVertical(c.req.query('vertical'));
  const status = c.req.query('status') as string | undefined;

  try {
    const conditions = [];
    if (vertical) conditions.push(eq(subscriptions.vertical, vertical));
    if (status) conditions.push(eq(subscriptions.status, status));

    const results = await db
      .select({
        subscription: subscriptions,
        plan: subscriptionPlans,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .innerJoin(users, eq(subscriptions.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(subscriptions.createdAt))
      .limit(100);

    return c.json({
      ok: true,
      subscriptions: results.map(r => ({
        id: r.subscription.id,
        userId: r.subscription.userId,
        userName: r.user.name,
        userEmail: r.user.email,
        vertical: r.subscription.vertical,
        planId: r.plan.planId,
        planName: r.plan.name,
        status: r.subscription.status,
        providerStatus: r.subscription.providerStatus,
        startedAt: r.subscription.startedAt,
        expiresAt: r.subscription.expiresAt,
        cancelledAt: r.subscription.cancelledAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return c.json({ ok: false, error: 'Error al cargar suscripciones' }, 500);
  }
});

// Cancel subscription
app.post('/cancel', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

  const body = await c.req.json().catch(() => null);
  const vertical = parseVertical(body?.vertical);
  
  if (!vertical) {
    return c.json({ ok: false, error: 'Vertical inválido' }, 400);
  }

  try {
    // Find active subscription
    const sub = await db
      .select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.userId, user.id),
        eq(subscriptions.vertical, vertical),
        eq(subscriptions.status, 'active')
      ))
      .limit(1);

    if (!sub[0]) {
      return c.json({ ok: false, error: 'No tienes una suscripción activa' }, 404);
    }

    // Update subscription status
    await db
      .update(subscriptions)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sub[0].id));

    return c.json({ ok: true, message: 'Suscripción cancelada correctamente' });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return c.json({ ok: false, error: 'Error al cancelar suscripción' }, 500);
  }
});

export default app;
