import type { AdminUserListItem } from './api';

export type AdminVerticalKey = 'agenda' | 'autos' | 'propiedades' | 'serenatas';

export type AdminVerticalMembership = {
  key: AdminVerticalKey;
  label: string;
  roleLabel: string;
  subscriptionLabel: string;
  statusLabel: string;
  activityCount: number;
  enabled: boolean;
};

function normalizeStatus(value: string | undefined): string {
  if (!value) return 'Sin estado';
  if (value === 'active') return 'Activa';
  if (value === 'expired') return 'Expirada';
  if (value === 'free') return 'Gratis';
  return value;
}

export function deriveUserVerticalMemberships(user: AdminUserListItem): AdminVerticalMembership[] {
  const agenda = user.subscriptions?.agenda;
  const autos = user.subscriptions?.autos;
  const propiedades = user.subscriptions?.propiedades;
  const serenatas = user.serenatas;

  return [
    {
      key: 'agenda',
      label: 'SimpleAgenda',
      roleLabel: 'Cliente',
      subscriptionLabel: agenda?.plan === 'pro' ? 'Pro' : 'Free',
      statusLabel: normalizeStatus(agenda?.status),
      activityCount: user.agendaListings ?? 0,
      enabled: Boolean((user.agendaListings ?? 0) > 0 || agenda),
    },
    {
      key: 'autos',
      label: 'SimpleAutos',
      roleLabel: 'Cliente',
      subscriptionLabel: autos?.planName ?? 'Sin plan',
      statusLabel: normalizeStatus(autos?.status),
      activityCount: user.autosListings ?? 0,
      enabled: Boolean((user.autosListings ?? 0) > 0 || autos),
    },
    {
      key: 'propiedades',
      label: 'SimplePropiedades',
      roleLabel: 'Cliente',
      subscriptionLabel: propiedades?.planName ?? 'Sin plan',
      statusLabel: normalizeStatus(propiedades?.status),
      activityCount: user.propiedadesListings ?? 0,
      enabled: Boolean((user.propiedadesListings ?? 0) > 0 || propiedades),
    },
    {
      key: 'serenatas',
      label: 'SimpleSerenatas',
      roleLabel: [
        serenatas?.client ? 'Cliente' : null,
        serenatas?.musician ? 'Músico' : null,
        serenatas?.coordinator ? 'Coordinador' : null,
      ].filter(Boolean).join(' + ') || 'Sin perfil',
      subscriptionLabel: serenatas?.coordinator
        ? (serenatas.coordinatorStatus === 'trialing' ? 'Coordinador trial' : serenatas.coordinatorStatus || 'Coordinador')
        : 'Sin suscripción',
      statusLabel: serenatas ? 'Activa' : 'Sin estado',
      activityCount: serenatas ? 1 : 0,
      enabled: Boolean(serenatas),
    },
  ];
}
