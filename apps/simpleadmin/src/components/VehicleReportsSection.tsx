'use client';

import { useMemo, useState } from 'react';
import { Button } from '@simple/ui';

type ListingReport = {
  id: string;
  listing_id: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
  listings?: { title: string }[] | null;
};

type Status = 'open' | 'reviewing' | 'resolved' | 'rejected';

function isStatus(value: string): value is Status {
  return value === 'open' || value === 'reviewing' || value === 'resolved' || value === 'rejected';
}

function statusLabel(status: string): string {
  switch (status) {
    case 'open':
      return 'Abierto';
    case 'reviewing':
      return 'En revisión';
    case 'resolved':
      return 'Resuelto';
    case 'rejected':
      return 'Rechazado';
    default:
      return status || '—';
  }
}

function reasonLabel(reason: string): string {
  switch (reason) {
    case 'fraud':
      return 'Posible fraude / estafa';
    case 'misleading':
      return 'Información engañosa';
    case 'prohibited':
      return 'Contenido prohibido';
    case 'duplicate':
      return 'Publicación duplicada';
    case 'spam':
      return 'Spam';
    case 'other':
      return 'Otro';
    default:
      return reason || '—';
  }
}

function formatAdminDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  // Formato determinista para evitar hydration mismatch (Node vs Browser).
  // Usamos hora de Chile para que el panel sea consistente.
  const parts = new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});

  const yyyy = parts.year || '0000';
  const mm = parts.month || '00';
  const dd = parts.day || '00';
  const hh = parts.hour || '00';
  const mi = parts.minute || '00';
  const ss = parts.second || '00';

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

export default function VehicleReportsSection({ initialReports }: { initialReports: ListingReport[] }) {
  const [reports, setReports] = useState<ListingReport[]>(initialReports);
  const [savingIds, setSavingIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => reports.slice(0, 50), [reports]);

  async function updateStatus(id: string, status: Status) {
    setError(null);
    setSavingIds((prev) => new Set(prev).add(id));

    try {
      const res = await fetch('/api/admin/reports/listing/status', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json?.error === 'string' ? json.error : 'No se pudo actualizar el reporte.');
        return;
      }

      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch {
      setError('No se pudo actualizar el reporte.');
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <section id="vehicle-reports" className="card-surface shadow-card rounded-3xl p-5 scroll-mt-24">
      <h2 className="text-base font-semibold text-lighttext dark:text-darktext">Reportes de publicaciones</h2>

      {error ? (
        <div className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80">{error}</div>
      ) : null}

      {reports.length === 0 ? (
        <p className="text-sm text-lighttext/70 dark:text-darktext/70 mt-2">No hay reportes.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {visible.map((r) => {
            const listingTitle = r.listings?.[0]?.title ?? r.listing_id;
            const saving = savingIds.has(r.id);

            return (
              <div key={r.id} className="rounded-2xl border border-black/10 dark:border-white/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-lighttext dark:text-darktext truncate">{listingTitle}</div>
                    <div className="text-xs text-lighttext/70 dark:text-darktext/70 mt-1">Motivo: {reasonLabel(r.reason)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-lighttext/60 dark:text-darktext/60 whitespace-nowrap">
                      {formatAdminDateTime(r.created_at)}
                    </div>
                    <div className="text-xs text-lighttext/70 dark:text-darktext/70 mt-1">Estado: {statusLabel(r.status)}</div>
                  </div>
                </div>

                <div className="text-sm text-lighttext/80 dark:text-darktext/80 mt-3 whitespace-pre-wrap">{r.details}</div>

                <div className="mt-4 flex gap-2 flex-wrap">
                  <Button
                    variant="neutral"
                    size="sm"
                    disabled={saving || !isStatus(r.status) || r.status === 'reviewing'}
                    onClick={() => updateStatus(r.id, 'reviewing')}
                  >
                    En revisión
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={saving || !isStatus(r.status) || r.status === 'resolved'}
                    onClick={() => updateStatus(r.id, 'resolved')}
                  >
                    Resolver
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={saving || !isStatus(r.status) || r.status === 'rejected'}
                    onClick={() => updateStatus(r.id, 'rejected')}
                  >
                    Rechazar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
