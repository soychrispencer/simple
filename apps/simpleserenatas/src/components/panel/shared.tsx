'use client';

import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { PanelEmptyState, PanelNotice, PanelStatusBadge } from '@simple/ui';
import { createEmptyListingLocation, patchListingLocation, type ListingLocation } from '@simple/types';
import { getCommunesForRegion, LOCATION_REGIONS } from '@simple/utils';
import type { Serenata } from '@/lib/serenatas-api';

export type FormStatus = {
    loading: boolean;
    error: string | null;
    ok: string | null;
};

export const today = new Date().toISOString().slice(0, 10);

export const SERENATA_INSTRUMENTS = [
    'Voz principal',
    'Segunda voz',
    'Trompeta',
    'Violín',
    'Guitarra',
    'Vihuela',
    'Guitarrón',
    'Arpa',
    'Acordeón',
    'Requinto',
    'Tololoche',
    'Bajo eléctrico',
    'Bajo sexto',
    'Teclado',
    'Saxofón',
    'Flauta',
    'Percusión',
    'Cajón',
    'Batería',
    'Charango',
    'Otros',
] as const;

export function FieldInput(props: InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={`form-input ${props.className ?? ''}`} />;
}

export function FieldSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
    return <select {...props} className={`form-input ${props.className ?? ''}`} />;
}

export function FieldTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea {...props} className={`form-textarea ${props.className ?? ''}`} />;
}

export function InstrumentSelect({ value, onChange, placeholder = 'Seleccionar instrumento' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
    return (
        <FieldSelect value={value} onChange={(event) => onChange(event.target.value)}>
            <option value="">{placeholder}</option>
            {SERENATA_INSTRUMENTS.map((item) => (
                <option key={item} value={item}>{item}</option>
            ))}
        </FieldSelect>
    );
}

export function formatDate(value: string) {
    const inputDate = toInputDate(value);
    const date = inputDate ? new Date(`${inputDate}T12:00:00`) : new Date(value);
    return new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: '2-digit', month: 'short' }).format(date);
}

export function toInputDate(value?: string | null) {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
}

export function formatShortSerenataDate(item: Serenata) {
    return `${item.eventTime} · ${formatDate(item.eventDate)}`;
}

export function money(value: number | null) {
    if (value == null) return 'Sin precio';
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
}

export function serenataStatusLabel(status: Serenata['status']) {
    if (status === 'payment_pending') return 'Pago pendiente';
    if (status === 'pending') return 'Pendiente';
    if (status === 'accepted_pending_group') return 'Falta grupo';
    if (status === 'scheduled') return 'Programada';
    if (status === 'completed') return 'Completada';
    if (status === 'rejected') return 'Rechazada';
    if (status === 'expired') return 'Expirada';
    return 'Cancelada';
}

export function clientSerenataStatusLabel(status: Serenata['status']) {
    if (status === 'payment_pending') return 'Pago pendiente';
    if (status === 'pending') return 'Buscando coordinador';
    if (status === 'accepted_pending_group') return 'Coordinador asignado';
    if (status === 'scheduled') return 'Confirmada';
    if (status === 'completed') return 'Completada';
    if (status === 'rejected') return 'No aceptada';
    if (status === 'expired') return 'Expirada';
    return 'Cancelada';
}

export function serenataStatusTone(status: Serenata['status']): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
    if (status === 'payment_pending') return 'warning';
    if (status === 'pending') return 'info';
    if (status === 'accepted_pending_group') return 'warning';
    if (status === 'scheduled') return 'warning';
    if (status === 'completed') return 'success';
    if (status === 'cancelled') return 'danger';
    if (status === 'rejected' || status === 'expired') return 'neutral';
    return 'neutral';
}

export function serenataLocation(item?: Serenata): ListingLocation {
    if (!item) return createEmptyListingLocation({ sourceMode: 'custom', visibilityMode: 'exact' });
    const region = LOCATION_REGIONS.find((entry) => entry.name === item.region);
    const commune = region ? getCommunesForRegion(region.id).find((entry) => entry.name === item.comuna) : undefined;
    const cleanedAddress = cleanSerenataAddress(item.address, item.comuna, item.region);
    const [addressLine1, ...rest] = cleanedAddress.split(',').map((part) => part.trim()).filter(Boolean);
    return patchListingLocation(createEmptyListingLocation({ sourceMode: 'custom', visibilityMode: 'exact' }), {
        addressLine1: addressLine1 ?? cleanedAddress,
        addressLine2: rest.join(', '),
        communeId: commune?.id ?? '',
        communeName: item.comuna ?? '',
        regionId: region?.id ?? '',
        regionName: item.region ?? '',
        geoPoint: {
            latitude: item.lat == null ? null : Number(item.lat),
            longitude: item.lng == null ? null : Number(item.lng),
            precision: item.lat && item.lng ? 'exact' : 'none',
        },
    });
}

export function googleMapsUrl(item: Serenata) {
    const target = item.lat && item.lng ? `${item.lat},${item.lng}` : [item.address, item.comuna, item.region, 'Chile'].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target)}`;
}

export function googleMapsDirectionsUrl(items: Serenata[]) {
    const targets = items.map((item) => item.lat && item.lng ? `${item.lat},${item.lng}` : [item.address, item.comuna, item.region, 'Chile'].filter(Boolean).join(', '));
    if (targets.length === 0) return 'https://www.google.com/maps';
    if (targets.length === 1) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(targets[0])}`;
    const [origin, ...rest] = targets;
    const destination = rest[rest.length - 1];
    const waypoints = rest.slice(0, -1).slice(0, 9);
    const params = new URLSearchParams({
        api: '1',
        origin,
        destination,
        travelmode: 'driving',
    });
    if (waypoints.length > 0) params.set('waypoints', waypoints.join('|'));
    return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function cleanSerenataAddress(address: string, commune?: string | null, region?: string | null): string {
    let cleaned = address;
    if (commune) {
        cleaned = cleaned.replace(new RegExp(`,?\\s*${commune.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*,?`, 'gi'), '');
    }
    if (region) {
        cleaned = cleaned.replace(new RegExp(`,?\\s*${region.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*,?`, 'gi'), '');
    }
    return cleaned.trim().replace(/^,|,$/g, '').trim();
}

export function EmptyBlock({ title, description }: { title: string; description: string }) {
    return <PanelEmptyState title={title} description={description} />;
}

export function SerenataRow({ item, context = 'default' }: { item: Serenata; context?: 'default' | 'client' }) {
    const label = context === 'client' ? clientSerenataStatusLabel(item.status) : serenataStatusLabel(item.status);
    const tone = context === 'client' && item.status === 'scheduled' ? 'success' : serenataStatusTone(item.status);

    return (
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="font-medium" style={{ color: 'var(--fg)' }}>{item.recipientName}</p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                        {formatDate(item.eventDate)} · {item.eventTime} · {item.duration} min
                    </p>
                    <p className="mt-1 truncate text-sm" style={{ color: 'var(--fg-secondary)' }}>{item.address}</p>
                </div>
                <PanelStatusBadge
                    tone={tone}
                    label={label}
                />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-sm" style={{ color: 'var(--fg-muted)' }}>
                <span>{item.eventType ?? 'Serenata'}</span>
                <span>{money(item.price)}</span>
            </div>
        </div>
    );
}

export function FormFeedback({ status }: { status: FormStatus }) {
    if (status.error) return <PanelNotice className="mt-3" tone="error">Error: {status.error}</PanelNotice>;
    if (status.ok) return <PanelNotice className="mt-3" tone="success">{status.ok}</PanelNotice>;
    return null;
}
