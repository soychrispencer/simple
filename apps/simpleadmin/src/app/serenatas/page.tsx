'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminProtectedPage } from '@/components/admin-protected-page';
import {
  fetchAdminAuditLogs,
  fetchAdminSerenataPayments,
  fetchAdminServiceLeads,
  fetchAdminUsers,
  updateAdminSerenataPaymentStatus,
  updateAdminUserSerenatasRole,
  type AdminAuditLogItem,
  type AdminSerenataPayment,
  type AdminSessionUser,
  type AdminServiceLead,
  type AdminUserListItem,
} from '@/lib/api';
import { hasAdminCapability } from '@/lib/admin-capabilities';
import { normalizeAdminScope } from '@/lib/admin-scope';
import { PanelCard, PanelNotice, PanelStatusBadge } from '@simple/ui';

export default function SerenatasOpsPage() {
  return (
    <AdminProtectedPage>
      {(adminUser) => <SerenatasOpsContent adminUser={adminUser} />}
    </AdminProtectedPage>
  );
}

function SerenatasOpsContent({ adminUser }: { adminUser: AdminSessionUser }) {
  const searchParams = useSearchParams();
  const scope = normalizeAdminScope(searchParams.get('scope'));
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [leads, setLeads] = useState<AdminServiceLead[]>([]);
  const [payments, setPayments] = useState<AdminSerenataPayment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<AdminSerenataPayment['status'] | 'all'>('all');
  const [paymentFrom, setPaymentFrom] = useState('');
  const [paymentTo, setPaymentTo] = useState('');

  const canView = hasAdminCapability(adminUser, 'serenatas.operations.view', scope);

  useEffect(() => {
    if (!canView) return;
    let active = true;
    void (async () => {
      const [allUsers, allLeads, allPayments, logs] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminServiceLeads(),
        fetchAdminSerenataPayments(),
        fetchAdminAuditLogs({ entityType: 'serenata_payment', limit: 15 }),
      ]);
      if (!active) return;
      setUsers(allUsers);
      setLeads(allLeads.filter((item) => item.vertical === 'serenatas'));
      setPayments(allPayments);
      setAuditLogs(logs);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [canView]);

  const serenataUsers = useMemo(
    () => users.filter((user) => Boolean(user.subscriptions?.serenatas)),
    [users]
  );
  const coordinators = serenataUsers.filter((user) => user.subscriptions?.serenatas?.roleLabel === 'Coordinador');
  const musicians = serenataUsers.filter((user) => user.subscriptions?.serenatas?.roleLabel === 'Músico');

  async function reloadData() {
    const [allUsers, allPayments, logs] = await Promise.all([
      fetchAdminUsers(),
      fetchAdminSerenataPayments({ status: paymentStatusFilter, from: paymentFrom, to: paymentTo }),
      fetchAdminAuditLogs({ limit: 15 }),
    ]);
    setUsers(allUsers);
    setPayments(allPayments);
    setAuditLogs(logs);
  }
  async function applyPaymentFilters() {
    setMessage(null);
    setError(null);
    const filtered = await fetchAdminSerenataPayments({ status: paymentStatusFilter, from: paymentFrom, to: paymentTo });
    setPayments(filtered);
  }


  async function handleRoleChange(userId: string, role: 'client' | 'musician' | 'coordinator') {
    setSavingId(userId);
    setMessage(null);
    setError(null);
    const result = await updateAdminUserSerenatasRole(userId, role);
    setSavingId(null);
    if (!result.ok) {
      setError(result.error || 'No pudimos actualizar el rol.');
      return;
    }
    await reloadData();
    setMessage('Rol serenatas actualizado.');
  }

  async function handlePaymentStatusChange(paymentId: string, status: AdminSerenataPayment['status']) {
    setSavingId(paymentId);
    setMessage(null);
    setError(null);
    const result = await updateAdminSerenataPaymentStatus(paymentId, status);
    setSavingId(null);
    if (!result.ok) {
      setError(result.error || 'No pudimos actualizar el pago.');
      return;
    }
    await reloadData();
    setMessage('Estado de pago actualizado.');
  }

  if (!canView) {
    return (
      <div className="container-app panel-page py-8">
        <PanelNotice tone="warning">No tienes capacidad para ver operación de serenatas en este scope.</PanelNotice>
      </div>
    );
  }

  return (
    <div className="container-app panel-page py-8 space-y-4">
      <div>
        <h1 className="type-page-title" style={{ color: 'var(--fg)' }}>Operación Serenatas</h1>
        <p className="type-page-subtitle mt-1">Seguimiento de coordinadores, músicos, suscripciones y leads operativos.</p>
      </div>

      {loading ? <PanelNotice tone="neutral">Cargando operación...</PanelNotice> : null}

      {!loading ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <MetricCard label="Usuarios serenatas" value={serenataUsers.length} />
            <MetricCard label="Coordinadores" value={coordinators.length} />
            <MetricCard label="Músicos" value={musicians.length} />
            <MetricCard label="Leads abiertos" value={leads.filter((item) => item.status !== 'closed').length} />
          </div>

          <PanelCard size="md">
            <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>Leads de serenatas</h2>
            {leads.length === 0 ? (
              <p className="mt-2 text-sm" style={{ color: 'var(--fg-muted)' }}>Sin leads para serenatas por ahora.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {leads.slice(0, 8).map((lead) => (
                  <div key={lead.id} className="rounded-xl border p-3 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{lead.contactName}</p>
                      <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{lead.serviceLabel} · {lead.createdAgo}</p>
                    </div>
                    <PanelStatusBadge label={lead.statusLabel} tone={lead.status === 'closed' ? 'neutral' : 'info'} />
                  </div>
                ))}
              </div>
            )}
          </PanelCard>

          <PanelCard size="md">
            <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>Equipo serenatas</h2>
            {serenataUsers.length === 0 ? (
              <p className="mt-2 text-sm" style={{ color: 'var(--fg-muted)' }}>No hay usuarios vinculados a serenatas todavía.</p>
            ) : (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                {serenataUsers.map((user) => (
                  <article key={user.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{user.name}</p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{user.email}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <PanelStatusBadge label={user.subscriptions?.serenatas?.roleLabel || 'Sin rol'} tone="info" />
                      <PanelStatusBadge label={user.subscriptions?.serenatas?.planName || 'Sin plan'} tone="neutral" />
                    </div>
                    <label className="mt-3 block text-xs" style={{ color: 'var(--fg-muted)' }}>
                      Rol vertical
                      <select
                        className="form-select mt-1 h-9 w-full text-xs"
                        disabled={savingId === user.id}
                        defaultValue={
                          user.subscriptions?.serenatas?.roleLabel === 'Coordinador'
                            ? 'coordinator'
                            : user.subscriptions?.serenatas?.roleLabel === 'Músico'
                              ? 'musician'
                              : 'client'
                        }
                        onChange={(event) => void handleRoleChange(user.id, event.target.value as 'client' | 'musician' | 'coordinator')}
                      >
                        <option value="client">Cliente</option>
                        <option value="musician">Músico</option>
                        <option value="coordinator">Coordinador</option>
                      </select>
                    </label>
                  </article>
                ))}
              </div>
            )}
          </PanelCard>

          <PanelCard size="md">
            <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>Pagos y comisiones</h2>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
              <label className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                Estado
                <select
                  className="form-select mt-1 h-9 w-full text-xs"
                  value={paymentStatusFilter}
                  onChange={(event) => setPaymentStatusFilter(event.target.value as AdminSerenataPayment['status'] | 'all')}
                >
                  <option value="all">Todos</option>
                  <option value="pending">pending</option>
                  <option value="holding">holding</option>
                  <option value="released">released</option>
                  <option value="refunded">refunded</option>
                  <option value="disputed">disputed</option>
                </select>
              </label>
              <label className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                Desde
                <input className="form-input mt-1 h-9 w-full text-xs" type="date" value={paymentFrom} onChange={(event) => setPaymentFrom(event.target.value)} />
              </label>
              <label className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                Hasta
                <input className="form-input mt-1 h-9 w-full text-xs" type="date" value={paymentTo} onChange={(event) => setPaymentTo(event.target.value)} />
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  className="h-9 w-full rounded-lg border text-xs font-medium"
                  style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                  onClick={() => void applyPaymentFilters()}
                >
                  Filtrar
                </button>
              </div>
            </div>
            {payments.length === 0 ? (
              <p className="mt-2 text-sm" style={{ color: 'var(--fg-muted)' }}>Sin pagos registrados todavía.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {payments.slice(0, 12).map((payment) => (
                  <article key={payment.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                          {payment.coordinatorName || 'Coordinador'} · {payment.clientName || 'Cliente'}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                          Total: ${payment.totalAmount.toLocaleString('es-CL')} · Comisión+IVA: ${(payment.platformCommission + payment.commissionVat).toLocaleString('es-CL')} · Ganancia coord.: ${payment.coordinatorEarnings.toLocaleString('es-CL')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <PanelStatusBadge label={payment.status} tone={payment.status === 'released' ? 'success' : payment.status === 'refunded' ? 'warning' : 'info'} />
                        <select
                          className="form-select h-9 text-xs"
                          value={payment.status}
                          disabled={savingId === payment.id}
                          onChange={(event) => void handlePaymentStatusChange(payment.id, event.target.value as AdminSerenataPayment['status'])}
                        >
                          <option value="pending">pending</option>
                          <option value="holding">holding</option>
                          <option value="released">released</option>
                          <option value="refunded">refunded</option>
                          <option value="disputed">disputed</option>
                        </select>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </PanelCard>

          <PanelCard size="md">
            <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>Auditoría reciente</h2>
            {auditLogs.length === 0 ? (
              <p className="mt-2 text-sm" style={{ color: 'var(--fg-muted)' }}>Sin eventos de auditoría por ahora.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {auditLogs.map((log) => (
                  <article key={log.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{log.action}</p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                      {log.entityType} · {log.entityId} · {log.createdAt ? new Date(log.createdAt).toLocaleString('es-CL') : 'sin fecha'}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </PanelCard>

          {error ? <PanelNotice tone="warning">{error}</PanelNotice> : null}
          {!error && message ? <PanelNotice tone="success">{message}</PanelNotice> : null}
        </>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <PanelCard size="sm">
      <p className="text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--fg-muted)' }}>{label}</p>
      <p className="mt-2 text-2xl font-semibold" style={{ color: 'var(--fg)' }}>{value}</p>
    </PanelCard>
  );
}
