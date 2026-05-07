'use client';

import { 
  IconMapPin,
  IconRoute,
  IconClock,
  IconTruck
} from '@tabler/icons-react';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';

export default function RutasPage() {
  return (
    <SerenatasPageShell fullWidth>
      <SerenatasPageHeader 
        title="Optimización de Rutas"
        description="Planifica grupos eficientes"
      />
      
      <div className="p-4 space-y-4">
        {/* Info Card */}
        <div className="p-4 rounded-xl bg-blue-50">
          <IconRoute size={32} className="text-blue-600 mb-2" />
          <h3 className="font-medium mb-1">¿Cómo funciona?</h3>
          <p className="text-sm text-gray-600">
            El sistema optimiza automáticamente las rutas de tus grupos basándose en ubicaciones 
            y horarios de las serenatas.
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl border text-center" style={{ borderColor: 'var(--border)' }}>
            <IconTruck size={20} className="mx-auto mb-1" style={{ color: 'var(--accent)' }} />
            <p className="text-xl font-bold">12</p>
            <p className="text-xs text-gray-500">Grupos formados</p>
          </div>
          <div className="p-3 rounded-xl border text-center" style={{ borderColor: 'var(--border)' }}>
            <IconMapPin size={20} className="mx-auto mb-1" style={{ color: 'var(--accent)' }} />
            <p className="text-xl font-bold">156</p>
            <p className="text-xs text-gray-500">Serenatas este mes</p>
          </div>
          <div className="p-3 rounded-xl border text-center" style={{ borderColor: 'var(--border)' }}>
            <IconClock size={20} className="mx-auto mb-1" style={{ color: 'var(--accent)' }} />
            <p className="text-xl font-bold">35min</p>
            <p className="text-xs text-gray-500">Ruta promedio</p>
          </div>
        </div>

        {/* Grupos de hoy */}
        <div>
          <h3 className="font-semibold mb-3">Tus grupos de hoy</h3>
          <div className="space-y-3">
            {[
              { id: 1, name: 'Grupo Mañana A', serenatas: 4, time: '09:00 - 12:30', optimized: true },
              { id: 2, name: 'Grupo Tarde B', serenatas: 3, time: '14:00 - 17:00', optimized: true },
            ].map((group) => (
              <div
                key={group.id}
                className="p-4 rounded-xl border"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{group.name}</h4>
                  {group.optimized && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      Optimizado
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <IconMapPin size={14} />
                    {group.serenatas} serenatas
                  </span>
                  <span className="flex items-center gap-1">
                    <IconClock size={14} />
                    {group.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm text-gray-500 mb-3">
            Los grupos se forman automáticamente cuando asignas serenatas.
          </p>
          <a 
            href="/solicitudes"
            className="inline-block px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ background: 'var(--accent)' }}
          >
            Ver Solicitudes
          </a>
        </div>
      </div>
    </SerenatasPageShell>
  );
}
