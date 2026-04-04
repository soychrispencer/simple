/**
 * Exporta todos los routers de la API.
 * Cada router maneja un dominio específico de la aplicación.
 */
import type { Hono } from 'hono';
import { authRoutes } from './auth.js';
import { accountRoutes } from './account.js';
import { adminRoutes } from './admin.js';
import { listingsRoutes } from './listings.js';
import { agendaRoutes } from './agenda.js';
import { instagramRoutes } from './instagram.js';
import { crmRoutes } from './crm.js';
import { messagesRoutes } from './messages.js';
import { paymentsRoutes } from './payments.js';
import { socialRoutes } from './social.js';
import { advertisingRoutes } from './advertising.js';
import { leadsRoutes } from './leads.js';
import { storageRoutes } from './storage.js';
import { publicRoutes } from './public.js';
import { miscRoutes } from './misc.js';
import { savedRoutes } from './saved.js';

/**
 * Monta todas las rutas en la aplicación Hono.
 */
export function mountRoutes(app: Hono): void {
    app.route('/api/auth', authRoutes);
    app.route('/api/account', accountRoutes);
    app.route('/api/admin', adminRoutes);
    app.route('/api/listings', listingsRoutes);
    app.route('/api/listing-draft', listingsRoutes); // Manejado dentro de listingsRoutes
    app.route('/api/agenda', agendaRoutes);
    app.route('/api/integrations/instagram', instagramRoutes);
    app.route('/api/crm', crmRoutes);
    app.route('/api/messages', messagesRoutes);
    app.route('/api/payments', paymentsRoutes);
    app.route('/api/subscriptions', paymentsRoutes); // Manejado dentro de paymentsRoutes
    app.route('/api/boost', paymentsRoutes); // Manejado dentro de paymentsRoutes
    app.route('/api/social', socialRoutes);
    app.route('/api/advertising', advertisingRoutes);
    app.route('/api/service-leads', leadsRoutes);
    app.route('/api/listing-leads', leadsRoutes);
    app.route('/api/integrations/leads', leadsRoutes);
    app.route('/api/integrations/portals', leadsRoutes);
    app.route('/api/media', storageRoutes);
    app.route('/api/storage', storageRoutes);
    app.route('/api/public', publicRoutes);
    app.route('/api/address-book', miscRoutes);
    app.route('/api/locations', miscRoutes);
    app.route('/api/valuations', miscRoutes);
    app.route('/api/saved', savedRoutes);
    app.route('/api/panel', miscRoutes);
}

export {
    authRoutes,
    accountRoutes,
    adminRoutes,
    listingsRoutes,
    agendaRoutes,
    instagramRoutes,
    crmRoutes,
    messagesRoutes,
    paymentsRoutes,
    socialRoutes,
    advertisingRoutes,
    leadsRoutes,
    storageRoutes,
    publicRoutes,
    miscRoutes,
    savedRoutes,
};