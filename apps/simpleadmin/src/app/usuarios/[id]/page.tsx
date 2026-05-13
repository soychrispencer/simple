'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { AdminProtectedPage } from '@/components/admin-protected-page';
import {
  fetchAdminUsers,
  updateAdminUserRole,
  updateAdminUserStatus,
  type AdminSessionUser,
  type AdminUserListItem,
} from '@/lib/api';
import { adminScopeLabel, normalizeAdminScope, withAdminScope } from '@/lib/admin-scope';
import { hasAdminCapability } from '@/lib/admin-capabilities';
import { deriveUserVerticalMemberships } from '@/lib/admin-verticals';
import { PanelCard, PanelNotice } from '@simple/ui';

export default function AdminUserDetailPage() {
  return (
    <AdminProtectedPage>
      {(adminUser) => <AdminUserDetailContent adminUser={adminUser} />}
    </AdminProtectedPage>
  );
}

function AdminUserDetailContent({ adminUser }: { adminUser: AdminSessionUser }) {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const scope = normalizeAdminScope(searchParams.get('scope'));
  const userId = params?.id ?? '';
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      const next = await fetchAdminUsers();
      if (!active) return;
      setItems(next);
      setLoading(false);
    };
    void run();
    return () => {
      active = false;
    };
  }, []);

  const user = items.find((item) => item.id === userId) ?? null;
  const memberships = user ? deriveUserVerticalMemberships(user) : [];
  /** Solo estos valores pueden asignarse como rol de panel vía API admin. */
  const panelAssignableRole =
    user &&
    (user.role === 'admin' || user.role === 'superadmin' || user.role === 'user')
      ? user.role
      : 'user';
  const canEditRole = hasAdminCapability(adminUser, 'users.editRole', scope);
  const canEditStatus = hasAdminCapability(adminUser, 'users.editStatus', scope);

  async function refreshUsers() {
    const next = await fetchAdminUsers();
    setItems(next);
  }

  async function handleRoleChange(role: 'user' | 'admin' | 'superadmin') {
    if (!user || !canEditRole) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    const result = await updateAdminUserRole(user.id, role);
    setSaving(false);
    if (!result.ok) {
      setError(result.error || 'No pudimos actualizar el rol.');
      return;
    }
    await refreshUsers();
    setMessage('Rol actualizado.');
  }

  async function handleStatusChange(status: 'active' | 'verified' | 'suspended') {
    if (!user || !canEditStatus) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    const result = await updateAdminUserStatus(user.id, status);
    setSaving(false);
    if (!result.ok) {
      setError(result.error || 'No pudimos actualizar el estado.');
      return;
    }
    await refreshUsers();
    setMessage('Estado actualizado.');
  }

  return (
    <div className="container-app panel-page py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="type-page-title" style={{ color: 'var(--fg)' }}>Detalle de usuario</h1>
          <p className="type-page-subtitle mt-1">Vista unificada para gestionar verticales, rol y suscripciones en {adminScopeLabel(scope).toLowerCase()}.</p>
        </div>
        <Link href={withAdminScope('/usuarios', scope)} className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          Volver a usuarios
        </Link>
      </div>

      {loading ? (
        <PanelNotice tone="neutral">Cargando usuario...</PanelNotice>
      ) : !user ? (
        <PanelNotice tone="neutral">No encontramos ese usuario.</PanelNotice>
      ) : (
        <div className="space-y-4">
          <PanelCard size="md">
            <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>{user.name}</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>{user.email}</p>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Meta label="Rol global" value={user.role} />
              <Meta label="Estado" value={user.status} />
              <Meta label="Proveedor" value={user.provider ?? 'local'} />
              <Meta label="Registro" value={new Date(user.createdAt).toLocaleDateString('es-CL')} />
            </div>
            {(canEditRole || canEditStatus) ? (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                {canEditRole ? (
                  <label className="space-y-1.5 text-sm">
                    <span style={{ color: 'var(--fg-muted)' }}>Cambiar rol</span>
                    <select
                      className="form-select h-10"
                      defaultValue={user.role}
                      disabled={saving}
                      onChange={(event) => void handleRoleChange(event.target.value as 'user' | 'admin' | 'superadmin')}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                      <option value="superadmin">superadmin</option>
                    </select>
                  </label>
                ) : null}
                {canEditStatus ? (
                  <label className="space-y-1.5 text-sm">
                    <span style={{ color: 'var(--fg-muted)' }}>Cambiar estado</span>
                    <select
                      className="form-select h-10"
                      defaultValue={user.status}
                      disabled={saving}
                      onChange={(event) => void handleStatusChange(event.target.value as 'active' | 'verified' | 'suspended')}
                    >
                      <option value="active">active</option>
                      <option value="verified">verified</option>
                      <option value="suspended">suspended</option>
                    </select>
                  </label>
                ) : null}
              </div>
            ) : null}
            {error ? <p className="mt-3 text-sm" style={{ color: 'var(--error)' }}>{error}</p> : null}
            {!error && message ? <p className="mt-3 text-sm" style={{ color: 'var(--success)' }}>{message}</p> : null}
          </PanelCard>

          <PanelCard size="md">
            <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>Membresías por vertical</h2>
            <p className="type-page-subtitle mt-1">Base para operar permisos y suscripciones por negocio.</p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {memberships.map((membership) => (
                <article
                  key={membership.key}
                  className="rounded-xl border p-4"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{membership.label}</p>
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full"
                      style={{ background: membership.enabled ? 'rgba(34,197,94,0.12)' : 'var(--bg-muted)', color: membership.enabled ? 'rgb(34,197,94)' : 'var(--fg-muted)' }}
                    >
                      {membership.enabled ? 'Habilitada' : 'No activa'}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <Meta label="Rol vertical" value={membership.roleLabel} />
                    <Meta label="Suscripción" value={membership.subscriptionLabel} />
                    <Meta label="Estado plan" value={membership.statusLabel} />
                    <Meta label="Actividad" value={String(membership.activityCount)} />
                  </div>
                </article>
              ))}
            </div>
          </PanelCard>
        </div>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--fg-muted)' }}>{label}</p>
      <p className="mt-1 text-sm font-medium" style={{ color: 'var(--fg)' }}>{value}</p>
    </div>
  );
}
