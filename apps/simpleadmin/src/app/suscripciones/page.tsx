'use client';

import { useEffect, useState } from 'react';
import { IconLoader2, IconCreditCard, IconUsers, IconBuildingStore } from '@tabler/icons-react';

interface SubscriptionView {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  vertical: 'autos' | 'propiedades' | 'agenda';
  planId: string;
  planName: string;
  status: 'active' | 'cancelled' | 'paused' | 'expired';
  providerStatus: string | null;
  startedAt: string;
  expiresAt: string | null;
  cancelledAt: string | null;
}

interface SubscriptionsResponse {
  ok: boolean;
  subscriptions?: SubscriptionView[];
  error?: string;
}

function formatMoney(value: number): string {
  return value.toLocaleString('es-CL');
}

function getVerticalLabel(vertical: string): string {
  switch (vertical) {
    case 'autos': return 'Autos';
    case 'propiedades': return 'Propiedades';
    case 'agenda': return 'Agenda';
    default: return vertical;
  }
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    paused: 'bg-amber-100 text-amber-800 border-amber-200',
    expired: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  const labels: Record<string, string> = {
    active: 'Activa',
    cancelled: 'Cancelada',
    paused: 'Pausada',
    expired: 'Expirada',
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[status] || styles.expired}`}>
      {labels[status] || status}
    </span>
  );
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verticalFilter, setVerticalFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (verticalFilter !== 'all') params.append('vertical', verticalFilter);
    if (statusFilter !== 'all') params.append('status', statusFilter);

    try {
      const res = await fetch(`/api/payments/admin/all?${params.toString()}`, {
        credentials: 'include',
      });
      const data: SubscriptionsResponse = await res.json();

      if (!data.ok) {
        setError(data.error || 'Error al cargar suscripciones');
        return;
      }

      setSubscriptions(data.subscriptions || []);
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSubscriptions();
  }, [verticalFilter, statusFilter]);

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    autos: subscriptions.filter(s => s.vertical === 'autos').length,
    propiedades: subscriptions.filter(s => s.vertical === 'propiedades').length,
    agenda: subscriptions.filter(s => s.vertical === 'agenda').length,
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Suscripciones</h1>
        <p className="text-sm mt-1 text-gray-500">
          Gestión de suscripciones y pagos de todos los usuarios
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <IconCreditCard size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{stats.total}</p>
              <p className="text-sm text-gray-500">Total suscripciones</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <IconUsers size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{stats.active}</p>
              <p className="text-sm text-gray-500">Activas</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <IconBuildingStore size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{stats.autos + stats.propiedades}</p>
              <p className="text-sm text-gray-500">Marketplace</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <IconCreditCard size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{stats.agenda}</p>
              <p className="text-sm text-gray-500">Agenda</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Vertical</label>
          <select
            value={verticalFilter}
            onChange={(e) => setVerticalFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">Todas</option>
            <option value="autos">SimpleAutos</option>
            <option value="propiedades">SimplePropiedades</option>
            <option value="agenda">SimpleAgenda</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Estado</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">Todos</option>
            <option value="active">Activa</option>
            <option value="cancelled">Cancelada</option>
            <option value="paused">Pausada</option>
            <option value="expired">Expirada</option>
          </select>
        </div>
        <button
          onClick={() => void fetchSubscriptions()}
          className="mt-5 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800"
        >
          Actualizar
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <IconLoader2 size={32} className="animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : subscriptions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No se encontraron suscripciones
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vertical</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inicio</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expira</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-sm">{sub.userName}</p>
                      <p className="text-xs text-gray-500">{sub.userEmail}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{getVerticalLabel(sub.vertical)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium">{sub.planName}</span>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(sub.status)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(sub.startedAt).toLocaleDateString('es-CL')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('es-CL') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
