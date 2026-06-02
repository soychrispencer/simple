'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { IconAlertCircle } from '@tabler/icons-react';
import { AdminProtectedPage } from '@/components/admin-protected-page';
import {
  deleteAdminUser,
  fetchAdminAuditLogs,
  fetchAdminUsers,
  sendAdminUserEmail,
  updateAdminUserRole,
  updateAdminUserSerenatasProfile,
  updateAdminUserStatus,
  type AdminSessionUser,
  type AdminAuditLogItem,
  type AdminUserListItem,
} from '@/lib/api';
import { adminScopeLabel, normalizeAdminScope, withAdminScope } from '@/lib/admin-scope';
import { hasAdminCapability } from '@/lib/admin-capabilities';
import { deriveUserVerticalMemberships } from '@/lib/admin-verticals';
import { UserVerticalMembershipsGrid } from '@/components/user-subscriptions-editor';
import { PanelButton, PanelCard, PanelNotice } from '@simple/ui/panel';

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
  const router = useRouter();
  const scope = normalizeAdminScope(searchParams.get('scope'));
  const userId = params?.id ?? '';
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [serenatasProfileSaving, setSerenatasProfileSaving] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [serenatasProfileType, setSerenatasProfileType] = useState<'client' | 'musician' | 'owner'>('owner');
  const [removeClientProfile, setRemoveClientProfile] = useState(true);
  const [serenatasProfileNote, setSerenatasProfileNote] = useState('');
  const [emailSubject, setEmailSubject] = useState('Actualización de tu cuenta SimpleSerenatas');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailActionUrl, setEmailActionUrl] = useState('https://simpleserenatas.app/onboarding');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      const next = await fetchAdminUsers();
      if (!active) return;
      setItems(next.items);
      setLoading(false);
    };
    void run();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!userId) return;
      const logs = await fetchAdminAuditLogs({ entityType: 'user', entityId: userId, limit: 12 });
      if (!active) return;
      setAuditLogs(logs);
    };
    void run();
    return () => {
      active = false;
    };
  }, [userId]);

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
  const canEditSubscriptions = hasAdminCapability(adminUser, 'users.editSubscriptions', scope);
  const canDelete = hasAdminCapability(adminUser, 'users.delete', scope);

  async function refreshUsers() {
    const next = await fetchAdminUsers();
    setItems(next.items);
    const logs = await fetchAdminAuditLogs({ entityType: 'user', entityId: userId, limit: 12 });
    setAuditLogs(logs);
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

  async function handleDeleteUser() {
    if (!user || !canDelete) return;
    setDeleting(true);
    setError(null);
    const result = await deleteAdminUser(user.id);
    setDeleting(false);
    if (!result.ok) {
      setError(result.error || 'No pudimos eliminar el usuario.');
      return;
    }
    setDeleteModalOpen(false);
    router.push(withAdminScope('/usuarios', scope));
    router.refresh();
  }

  async function handleSerenatasProfileChange() {
    if (!user || !canEditSubscriptions) return;
    setSerenatasProfileSaving(true);
    setMessage(null);
    setError(null);
    const result = await updateAdminUserSerenatasProfile(user.id, {
      profileType: serenatasProfileType,
      removeClientProfile: serenatasProfileType !== 'client' ? removeClientProfile : false,
      note: serenatasProfileNote,
    });
    setSerenatasProfileSaving(false);
    if (!result.ok) {
      setError(result.error || 'No pudimos actualizar el perfil de Serenatas.');
      return;
    }
    await refreshUsers();
    setMessage('Perfil de SimpleSerenatas actualizado.');
  }

  async function handleSendEmail() {
    if (!user || !canEditSubscriptions) return;
    setEmailSending(true);
    setMessage(null);
    setError(null);
    const result = await sendAdminUserEmail(user.id, {
      subject: emailSubject,
      message: emailMessage,
      actionUrl: emailActionUrl,
      actionLabel: 'Ir a mi cuenta',
    });
    setEmailSending(false);
    if (!result.ok) {
      setError(result.error || 'No pudimos enviar el correo.');
      return;
    }
    setEmailMessage('');
    setMessage('Correo enviado al usuario.');
    const logs = await fetchAdminAuditLogs({ entityType: 'user', entityId: user.id, limit: 12 });
    setAuditLogs(logs);
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
            <p className="type-page-subtitle mt-1">
              {canEditSubscriptions
                ? 'Rol y actividad por negocio. Como superadmin puedes editar la suscripción en cada tarjeta.'
                : 'Base para operar permisos y suscripciones por negocio.'}
            </p>
            <UserVerticalMembershipsGrid
              user={user}
              memberships={memberships}
              editable={canEditSubscriptions}
              onSaved={refreshUsers}
            />
          </PanelCard>

          {canEditSubscriptions ? (
            <PanelCard size="md">
              <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>Perfil SimpleSerenatas</h2>
              <p className="type-page-subtitle mt-1">
                Usa esta acción para corregir registros equivocados, por ejemplo un dueño que se creó como cliente.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr]">
                <label className="space-y-1.5 text-sm">
                  <span style={{ color: 'var(--fg-muted)' }}>Tipo correcto</span>
                  <select
                    className="form-select h-10"
                    value={serenatasProfileType}
                    disabled={serenatasProfileSaving}
                    onChange={(event) => setSerenatasProfileType(event.target.value as 'client' | 'musician' | 'owner')}
                  >
                    <option value="client">Cliente</option>
                    <option value="musician">Músico</option>
                    <option value="owner">Dueño</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-sm">
                  <span style={{ color: 'var(--fg-muted)' }}>Nota interna</span>
                  <input
                    className="form-input h-10"
                    value={serenatasProfileNote}
                    disabled={serenatasProfileSaving}
                    onChange={(event) => setSerenatasProfileNote(event.target.value)}
                    placeholder="Ej. Se registró como cliente por error."
                  />
                </label>
              </div>
              {serenatasProfileType !== 'client' ? (
                <label className="mt-3 flex items-start gap-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={removeClientProfile}
                    disabled={serenatasProfileSaving}
                    onChange={(event) => setRemoveClientProfile(event.target.checked)}
                  />
                  <span>Quitar perfil cliente si existe, para que no aparezca como cliente en SimpleSerenatas.</span>
                </label>
              ) : null}
              <div className="mt-4">
                <PanelButton
                  variant="secondary"
                  onClick={() => void handleSerenatasProfileChange()}
                  disabled={serenatasProfileSaving}
                >
                  {serenatasProfileSaving ? 'Actualizando...' : 'Actualizar perfil Serenatas'}
                </PanelButton>
              </div>
            </PanelCard>
          ) : null}

          {canEditSubscriptions ? (
            <PanelCard size="md">
              <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>Correo directo</h2>
              <p className="type-page-subtitle mt-1">
                Envía un mensaje operativo a este usuario. El envío queda registrado en auditoría.
              </p>
              <div className="mt-4 grid gap-3">
                <label className="space-y-1.5 text-sm">
                  <span style={{ color: 'var(--fg-muted)' }}>Asunto</span>
                  <input
                    className="form-input h-10"
                    value={emailSubject}
                    disabled={emailSending}
                    onChange={(event) => setEmailSubject(event.target.value)}
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span style={{ color: 'var(--fg-muted)' }}>Mensaje</span>
                  <textarea
                    className="form-textarea min-h-32 text-sm"
                    value={emailMessage}
                    disabled={emailSending}
                    onChange={(event) => setEmailMessage(event.target.value)}
                    placeholder="Ej. Hola Juan, vimos que registraste tu mariachi como cliente. Ya corregimos tu cuenta para que puedas configurar tu grupo."
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span style={{ color: 'var(--fg-muted)' }}>Link del botón</span>
                  <input
                    className="form-input h-10"
                    value={emailActionUrl}
                    disabled={emailSending}
                    onChange={(event) => setEmailActionUrl(event.target.value)}
                  />
                </label>
              </div>
              <div className="mt-4">
                <PanelButton
                  variant="secondary"
                  onClick={() => void handleSendEmail()}
                  disabled={emailSending || emailSubject.trim().length < 3 || emailMessage.trim().length < 5}
                >
                  {emailSending ? 'Enviando...' : 'Enviar correo'}
                </PanelButton>
              </div>
            </PanelCard>
          ) : null}

          <PanelCard size="md">
            <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>Historial administrativo</h2>
            <p className="type-page-subtitle mt-1">
              Últimas acciones realizadas sobre esta cuenta.
            </p>
            <div className="mt-4 divide-y" style={{ borderColor: 'var(--border)' }}>
              {auditLogs.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Sin acciones registradas.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="py-3">
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{auditActionLabel(log.action)}</p>
                      <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{log.createdAt ? new Date(log.createdAt).toLocaleString('es-CL') : 'Sin fecha'}</p>
                    </div>
                    <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>{auditPayloadSummary(log.payload)}</p>
                  </div>
                ))
              )}
            </div>
          </PanelCard>

          {canDelete ? (
            <PanelCard size="md">
              <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>Zona de riesgo</h2>
              <p className="type-page-subtitle mt-1">
                Elimina de forma permanente la cuenta y sus datos asociados. Solo disponible para superadmin.
              </p>
              <div className="mt-4">
                <PanelButton
                  variant="secondary"
                  onClick={() => {
                    setDeleteModalOpen(true);
                    setError(null);
                  }}
                  disabled={deleting || adminUser.id === user.id}
                >
                  Eliminar usuario
                </PanelButton>
                {adminUser.id === user.id ? (
                  <p className="mt-2 text-xs" style={{ color: 'var(--fg-muted)' }}>No puedes eliminar tu propia cuenta.</p>
                ) : null}
              </div>
            </PanelCard>
          ) : null}
        </div>
      )}

      {deleteModalOpen && user ? (
        <div className="fixed inset-0 z-80 flex items-center justify-center px-4 py-5">
          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={() => setDeleteModalOpen(false)}
            className="absolute inset-0 admin-modal-backdrop"
          />
          <div className="relative z-1 w-full max-w-md rounded-card border p-6 admin-modal-surface">
            <div className="flex items-start gap-3">
              <div className="admin-modal-danger-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
                <IconAlertCircle size={20} stroke={1.9} />
              </div>
              <div>
                <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>Eliminar usuario</h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                  Esta acción elimina de forma definitiva a <strong style={{ color: 'var(--fg)' }}>{user.name}</strong>.
                </p>
              </div>
            </div>
            {error ? <p className="mt-4 text-sm" style={{ color: 'var(--error)' }}>{error}</p> : null}
            <div className="mt-5 flex gap-2">
              <PanelButton variant="secondary" className="flex-1" onClick={() => setDeleteModalOpen(false)} disabled={deleting}>
                Cancelar
              </PanelButton>
              <PanelButton className="flex-1" onClick={() => void handleDeleteUser()} disabled={deleting}>
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </PanelButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function auditActionLabel(action: string) {
  const labels: Record<string, string> = {
    'user.subscriptions.update': 'Suscripción actualizada',
    'user.serenatas_profile.update': 'Perfil SimpleSerenatas actualizado',
    'user.email.send': 'Correo enviado',
  };
  return labels[action] ?? action;
}

function auditPayloadSummary(payload: Record<string, unknown>) {
  const subject = typeof payload.subject === 'string' ? payload.subject : null;
  const profileType = typeof payload.profileType === 'string' ? payload.profileType : null;
  if (subject) return `Asunto: ${subject}`;
  if (profileType) return `Tipo: ${profileType}`;
  return 'Sin detalle adicional';
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--fg-muted)' }}>{label}</p>
      <p className="mt-1 text-sm font-medium" style={{ color: 'var(--fg)' }}>{value}</p>
    </div>
  );
}
