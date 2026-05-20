#!/usr/bin/env node
/**
 * Evita regresiones del hub legacy de Mi cuenta (PanelConfigSection / overview / etc.).
 * Corre con: pnpm run verify:account-ui
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const accountPath = join(root, 'src/components/panel/account-view.tsx');
const subscriptionPath = join(root, 'src/components/panel/subscription-section.tsx');
const source = readFileSync(accountPath, 'utf8');
const subscriptionSource = readFileSync(subscriptionPath, 'utf8');
const combinedSubscriptionSource = `${source}\n${subscriptionSource}`;

const forbidden = [
    { pattern: /PanelAccountProfileCard/, label: 'PanelAccountProfileCard' },
    { pattern: /PanelConfigSection/, label: 'PanelConfigSection' },
    { pattern: /subsection === ['"]overview['"]/, label: "subsection === 'overview'" },
    { pattern: /['"]overview['"] \| ['"]data['"]/, label: "AccountSubsection con 'overview'" },
    { pattern: /setSubsection\(['"]overview['"]\)/, label: "setSubsection('overview')" },
    { pattern: /preferencesSections/, label: 'preferencesSections' },
    { pattern: /overviewSections/, label: 'overviewSections' },
    { pattern: /backToOverview/, label: 'backToOverview' },
    { pattern: /Datos de dueño del grupo/, label: 'tarjeta legacy dueño en Mi cuenta' },
    { pattern: /profiles\.coordinator/, label: 'profiles.coordinator' },
    { pattern: /Coordinador/, label: 'etiqueta Coordinador' },
    { pattern: /key: 'plan', label: 'Plan'/, label: "pestaña Plan (debe ser Suscripción)" },
    { pattern: /label: 'Plan'/, label: "label Plan en pestañas cuenta" },
    { pattern: /startPaidSubscription/, label: 'checkout MP en plan' },
    { pattern: /Suscribirme/, label: 'botón Suscribirme legacy' },
    { pattern: /badge:\s*['"]Próximo['"]/, label: "badge 'Próximo' en pestañas" },
    { pattern: /disabled:\s*true,\s*label:\s*['"]Notificaciones['"]/, label: 'Notificaciones deshabilitada' },
    { pattern: /ahora sin envíos/, label: 'indicador fuera de horario WhatsApp (punto 14)' },
    { pattern: /Horario silencioso/, label: 'copy horario silencioso WhatsApp' },
    { pattern: /formatWhatsAppQuietHoursLabel/, label: 'formatWhatsAppQuietHoursLabel en UI' },
    { pattern: /22:00/, label: 'horario 22:00 en UI' },
    { pattern: /Fuera de horario/, label: 'Fuera de horario en UI' },
    { pattern: /isSerenatasWhatsAppQuietHoursChile/, label: 'quiet hours en cliente' },
    { pattern: /Historial reciente/, label: 'sección historial expandida legacy' },
    { pattern: /Enviar prueba \(correo\)/, label: 'botones prueba visibles legacy' },
    { pattern: /Ver ecosistema Simple/, label: 'enlace ecosistema Simple' },
    { pattern: /Simple Autos, Simple Propiedades/, label: 'texto ecosistema verticals' },
    { pattern: /Solo aplica a serenatas contratadas/, label: 'copy bullets comisión legacy' },
    { pattern: /lead\/checkout Simple/, label: 'copy lead/checkout en comisión' },
    { pattern: /Cómo se cobra comisión/, label: 'sección comisión legacy' },
    { pattern: /subsection === 'subscription'[\s\S]*reservas/, label: 'reservas en pestaña Suscripción' },
];

const subscriptionForbidden = [
    { pattern: /Mercado Pago no está configurado/, label: 'aviso MP no configurado' },
    { pattern: /no se puede activar aquí/, label: 'copy suscripción bloqueada por entorno' },
    { pattern: /próximamente/i, label: 'copy próximamente en Suscripción' },
    { pattern: /plantel/i, label: 'terminología plantel' },
    { pattern: /jornadas/i, label: 'terminología jornadas en Suscripción' },
    { pattern: /Ir a pagar con Mercado Pago/, label: 'CTA duplicado ir a pagar' },
    { pattern: /Reportes operativos en el panel/, label: 'beneficio como enlace confuso' },
    { pattern: /BenefitLink/, label: 'beneficios como links' },
];

const required = [
    { pattern: /PanelPillNav/, label: 'PanelPillNav' },
    { pattern: /AvatarUpload/, label: 'AvatarUpload' },
    { pattern: /AddressesSection/, label: 'AddressesSection' },
    { pattern: /getAccountPillItems/, label: 'pestañas de cuenta según perfil' },
    { pattern: /getNotificationCategoryRowsForContext/, label: 'filas de categoría según perfil' },
    { pattern: /notificationPrefsContextDescription/, label: 'descripción de notificaciones por perfil' },
    { pattern: /NotificationCategoryRow/, label: 'toggle correo y WhatsApp por categoría' },
    { pattern: /por correo/, label: 'etiqueta canal correo' },
    { pattern: /por WhatsApp/, label: 'etiqueta canal WhatsApp' },
    { pattern: /categoryNotificationPrefs/, label: 'estado categoryNotificationPrefs' },
    { pattern: /notificationPrefsSnapshotFromUser/, label: 'notificationPrefsSnapshotFromUser' },
    { pattern: /Guardar/, label: 'CTA guardar preferencias' },
    { pattern: /Google Calendar/, label: 'integración Google Calendar' },
    { pattern: /googleCalendarAuthUrl/, label: 'googleCalendarAuthUrl' },
    { pattern: /Conectar/, label: 'botón conectar Google Calendar' },
    { pattern: /SubscriptionSection/, label: 'sección suscripción dedicada' },
];

const subscriptionRequired = [
    { pattern: /serenatas por Simple/i, label: 'copy serenatas por Simple' },
    { pattern: /Suscribirme/, label: 'CTA suscripción Pro' },
    { pattern: /Cancelar suscripción Pro/, label: 'cancelar suscripción Pro' },
    { pattern: /title="Suscripción"/, label: 'título sección Suscripción' },
    { pattern: /Tu plan/, label: 'indicador tu plan' },
    { pattern: /Plan actual/, label: 'plan actual visible' },
    { pattern: /startSubscriptionCheckout/, label: 'checkout suscripción Pro' },
];

const errors = [];

for (const { pattern, label } of forbidden) {
    if (pattern.test(source)) errors.push(`Patrón legacy detectado: ${label}`);
}

for (const { pattern, label } of subscriptionForbidden) {
    if (pattern.test(combinedSubscriptionSource)) {
        errors.push(`Patrón legacy en suscripción: ${label}`);
    }
}

for (const { pattern, label } of required) {
    if (!pattern.test(source)) errors.push(`Patrón moderno ausente: ${label}`);
}

for (const { pattern, label } of subscriptionRequired) {
    if (!pattern.test(combinedSubscriptionSource)) {
        errors.push(`Patrón suscripción ausente: ${label}`);
    }
}

const tuPerfilIdx = source.indexOf('Tu perfil');
const inicioSesionIdx = source.indexOf('Inicio de sesión');
if (tuPerfilIdx === -1 || inicioSesionIdx === -1 || tuPerfilIdx > inicioSesionIdx) {
    errors.push('Orden Datos personales: "Tu perfil" debe ir antes de "Inicio de sesión"');
}

if (errors.length > 0) {
    console.error('[verify:account-ui] account-view.tsx no cumple el contrato de UI moderna:\n');
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
}

console.info('[verify:account-ui] OK — Mi cuenta usa la UI moderna (sin hub legacy).');
