'use client';

import { 
  IconWallet,
  IconTrendingUp,
  IconTrendingDown,
  IconCalendar
} from '@tabler/icons-react';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';

export default function FinanzasPage() {
  // Mock data - en producción vendría de API
  const stats = {
    earnings: 450000,
    pending: 120000,
    completedThisMonth: 8,
    totalSerenatas: 24,
  };

  const transactions = [
    { id: '1', date: '2026-05-05', type: 'earning', amount: 75000, description: 'Serenata - María García' },
    { id: '2', date: '2026-05-03', type: 'earning', amount: 60000, description: 'Serenata - Juan Pérez' },
    { id: '3', date: '2026-05-01', type: 'subscription', amount: -4990, description: 'Suscripción mensual' },
    { id: '4', date: '2026-04-28', type: 'earning', amount: 80000, description: 'Serenata - Ana López' },
  ];

  return (
    <SerenatasPageShell fullWidth>
      <SerenatasPageHeader 
        title="Finanzas"
        description="Tus ingresos y movimientos"
      />
      
      <div className="p-4 space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-green-50">
            <IconTrendingUp size={24} className="text-green-600 mb-2" />
            <p className="text-2xl font-bold">${stats.earnings.toLocaleString('es-CL')}</p>
            <p className="text-xs text-gray-600">Ganancias este mes</p>
          </div>
          <div className="p-4 rounded-xl bg-yellow-50">
            <IconWallet size={24} className="text-yellow-600 mb-2" />
            <p className="text-2xl font-bold">${stats.pending.toLocaleString('es-CL')}</p>
            <p className="text-xs text-gray-600">Pendiente por cobrar</p>
          </div>
        </div>

        {/* Resumen */}
        <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Serenatas completadas</span>
            <span className="font-semibold">{stats.completedThisMonth}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Total histórico</span>
            <span className="font-semibold">{stats.totalSerenatas}</span>
          </div>
        </div>

        {/* Transacciones recientes */}
        <div>
          <h3 className="font-semibold mb-3">Movimientos recientes</h3>
          <div className="space-y-3">
            {transactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: 'var(--bg-elevated)' }}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${t.type === 'earning' ? 'bg-green-100' : t.type === 'subscription' ? 'bg-red-100' : 'bg-gray-100'}`}>
                    {t.type === 'earning' ? (
                      <IconTrendingUp size={18} className="text-green-600" />
                    ) : t.type === 'subscription' ? (
                      <IconTrendingDown size={18} className="text-red-600" />
                    ) : (
                      <IconWallet size={18} className="text-gray-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{t.description}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <IconCalendar size={12} />
                      {new Date(t.date).toLocaleDateString('es-CL')}
                    </p>
                  </div>
                </div>
                <span className={`font-semibold ${t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {t.amount > 0 ? '+' : ''}${Math.abs(t.amount).toLocaleString('es-CL')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SerenatasPageShell>
  );
}
