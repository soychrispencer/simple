#!/usr/bin/env node
/**
 * Evita regresiones del hub legacy de Mi cuenta (PanelConfigSection / overview / etc.).
 * Corre con: pnpm run verify:account-ui
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'src/components/panel/account-view.tsx');
const source = readFileSync(path, 'utf8');

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
    { pattern: /badge:\s*['"]Próximo['"]/, label: "badge 'Próximo' en pestañas" },
    { pattern: /disabled:\s*true,\s*label:\s*['"]Notificaciones['"]/, label: 'Notificaciones deshabilitada' },
];

const required = [
    { pattern: /PanelPillNav/, label: 'PanelPillNav' },
    { pattern: /AvatarUpload/, label: 'AvatarUpload' },
    { pattern: /AddressesSection/, label: 'AddressesSection' },
    { pattern: /ACCOUNT_PILL_ITEMS/, label: 'ACCOUNT_PILL_ITEMS' },
    { pattern: /WhatsappContactToggle/, label: 'WhatsappContactToggle' },
];

const errors = [];

for (const { pattern, label } of forbidden) {
    if (pattern.test(source)) errors.push(`Patrón legacy detectado: ${label}`);
}

for (const { pattern, label } of required) {
    if (!pattern.test(source)) errors.push(`Patrón moderno ausente: ${label}`);
}

if (errors.length > 0) {
    console.error('[verify:account-ui] account-view.tsx no cumple el contrato de UI moderna:\n');
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
}

console.info('[verify:account-ui] OK — Mi cuenta usa la UI moderna (sin hub legacy).');
