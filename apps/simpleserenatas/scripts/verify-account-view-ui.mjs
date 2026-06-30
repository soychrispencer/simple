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
const accountTabPath = join(root, 'src/lib/account-tab.ts');
const source = readFileSync(accountPath, 'utf8');
const accountTabSource = readFileSync(accountTabPath, 'utf8');

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
    { pattern: /profiles\.admin/, label: 'profiles.admin' },
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

const required = [
    { pattern: /PanelPillNav/, label: 'PanelPillNav' },
    { pattern: /AvatarUpload/, label: 'AvatarUpload' },
    { pattern: /PanelAccountLocationContent/, label: 'PanelAccountLocationContent' },
    { pattern: /getAccountPillItems/, label: 'pestañas de cuenta según perfil' },
    { pattern: /getNotificationCategoryRowsForContext/, label: 'filas de categoría según perfil' },
    { pattern: /NotificationCategoryRow/, label: 'toggle correo y WhatsApp por categoría' },
    { pattern: /por correo/, label: 'etiqueta canal correo' },
    { pattern: /por WhatsApp/, label: 'etiqueta canal WhatsApp' },
    { pattern: /categoryNotificationPrefs/, label: 'estado categoryNotificationPrefs' },
    { pattern: /notificationPrefsSnapshotFromUser/, label: 'notificationPrefsSnapshotFromUser' },
    { pattern: /Guardar/, label: 'CTA guardar preferencias' },
    { pattern: /Google Calendar/, label: 'integración Google Calendar' },
    { pattern: /googleCalendarAuthUrl/, label: 'googleCalendarAuthUrl' },
    { pattern: /Conectar/, label: 'botón conectar Google Calendar' },
];

const errors = [];

for (const { pattern, label } of forbidden) {
    if (pattern.test(source)) errors.push(`Patrón legacy detectado: ${label}`);
}

for (const { pattern, label } of required) {
    if (!pattern.test(source)) errors.push(`Patrón moderno ausente: ${label}`);
}

if (!/ownerFeaturesEnabled\(profiles\)[\s\S]*items\.push\(\{\s*key:\s*['"]subscription['"],\s*label:\s*['"]Suscripción['"]\s*\}\)/.test(accountTabSource)) {
    errors.push('La pestaña Suscripción debe estar visible solo para dueños.');
}

if (!/subsection === ['"]subscription['"] && ownerActive[\s\S]*<SubscriptionSection/.test(source)) {
    errors.push('SubscriptionSection debe renderizarse solo con ownerActive.');
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
