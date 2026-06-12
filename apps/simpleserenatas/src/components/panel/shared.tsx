'use client';

import { Children, isValidElement, useMemo, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import {
    ModernDateInput,
    ModernSelect,
    ModernTimeSelect,
    type ModernSelectOption,
} from '@simple/ui';
import { PanelEmptyState, PanelNotice, PanelStatusBadge } from '@simple/ui/panel';
import { createEmptyListingLocation, patchListingLocation, type ListingLocation } from '@simple/types';
import { getCommunesForRegion, LOCATION_REGIONS } from '@simple/utils';
import type { Serenata } from '@/lib/serenatas-api';
import { formatMoney } from '@/lib/marketplace-display';
import { formatSerenataCollectionMethod } from '@/lib/owner-collection-method';

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

/** Texto visible de <option>…</option> sin comas de Array#toString (ej. "Pendientes (1)"). */
function optionLabelFromChildren(children: ReactNode): string {
    if (children == null || typeof children === 'boolean') return '';
    if (typeof children === 'string' || typeof children === 'number') return String(children);
    if (Array.isArray(children)) return children.map(optionLabelFromChildren).join('');
    if (isValidElement(children)) {
        const props = children.props as { children?: ReactNode };
        return optionLabelFromChildren(props.children);
    }
    return '';
}

function optionsFromSelectChildren(children: ReactNode): ModernSelectOption[] {
    const options: ModernSelectOption[] = [];
    Children.forEach(children, (child) => {
        if (!isValidElement(child)) return;
        if (child.type === 'option') {
            const optionProps = child.props as { value?: string; children?: ReactNode; disabled?: boolean };
            options.push({
                value: String(optionProps.value ?? ''),
                label: optionLabelFromChildren(optionProps.children),
                disabled: optionProps.disabled,
            });
            return;
        }
        if (child.type === 'optgroup') {
            const groupProps = child.props as { label?: string; children?: ReactNode };
            if (groupProps.label) {
                options.push({
                    value: `__heading__${groupProps.label}`,
                    label: groupProps.label,
                    disabled: true,
                });
            }
            options.push(...optionsFromSelectChildren(groupProps.children));
        }
    });
    return options;
}

const DEFAULT_TIME_OPTIONS: ModernSelectOption[] = Array.from({ length: 24 }, (_, hour) => [
    `${String(hour).padStart(2, '0')}:00`,
    `${String(hour).padStart(2, '0')}:15`,
    `${String(hour).padStart(2, '0')}:30`,
    `${String(hour).padStart(2, '0')}:45`,
]).flat().map((time) => ({ value: time, label: time }));

export type FieldDateProps = {
    value: string;
    onChange: (value: string) => void;
    min?: string;
    max?: string;
    disabled?: boolean;
    className?: string;
    'aria-label'?: string;
};

export function FieldDate({ value, onChange, min, max, disabled, className, 'aria-label': ariaLabel }: FieldDateProps) {
    return (
        <ModernDateInput
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            disabled={disabled}
            className={className}
            aria-label={ariaLabel}
        />
    );
}

export type FieldTimeProps = {
    value: string;
    onChange: (value: string) => void;
    options?: ModernSelectOption[];
    disabled?: boolean;
    placeholder?: string;
    'aria-label'?: string;
};

export function FieldTime({
    value,
    onChange,
    options = DEFAULT_TIME_OPTIONS,
    disabled,
    placeholder = 'Seleccionar hora',
    'aria-label': ariaLabel,
}: FieldTimeProps) {
    return (
        <ModernTimeSelect
            value={value}
            onChange={onChange}
            options={options}
            disabled={disabled}
            placeholder={placeholder}
            ariaLabel={ariaLabel}
        />
    );
}

export type FieldSelectProps = {
    value: string;
    onChange?: (event: { target: { value: string } }) => void;
    disabled?: boolean;
    placeholder?: string;
    'aria-label'?: string;
    className?: string;
    children?: ReactNode;
    options?: ModernSelectOption[];
    leadingIcon?: ReactNode;
};

export function FieldSelect({
    value,
    onChange,
    disabled,
    placeholder = 'Seleccionar',
    'aria-label': ariaLabel,
    className,
    children,
    options: optionsProp,
    leadingIcon,
}: FieldSelectProps) {
    const options = useMemo(
        () => optionsProp ?? optionsFromSelectChildren(children),
        [optionsProp, children],
    );

    return (
        <ModernSelect
            value={value}
            onChange={(next) => onChange?.({ target: { value: next } })}
            options={options}
            disabled={disabled}
            placeholder={placeholder}
            ariaLabel={ariaLabel}
            triggerClassName={className}
            leadingIcon={leadingIcon}
        />
    );
}

export function FieldTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea {...props} className={`form-textarea ${props.className ?? ''}`} />;
}

export function InstrumentSelect({ value, onChange, placeholder = 'Seleccionar instrumento' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
    const options = useMemo(
        () => [
            { value: '', label: placeholder },
            ...SERENATA_INSTRUMENTS.map((item) => ({ value: item, label: item })),
        ],
        [placeholder],
    );
    return (
        <FieldSelect
            value={value}
            onChange={(event) => onChange(event.target.value)}
            options={options}
            placeholder={placeholder}
        />
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
    return formatMoney(value);
}

/** Resumen compacto para filas de la bandeja de solicitudes. */
export function formatSerenataListSummary(
    item: Pick<Serenata, 'eventType' | 'packageCode' | 'duration' | 'songsIncludedAtBooking' | 'source' | 'ownerCollectionMethod'>,
): string {
    const service = item.eventType ?? item.packageCode ?? 'Serenata';
    const parts = [service, `${item.duration} min`];
    const songs = item.songsIncludedAtBooking;
    if (songs != null && songs > 0) {
        parts.push(songs === 1 ? '1 canción' : `${songs} canciones`);
    }
    const payment = formatSerenataCollectionMethod(item);
    if (payment) parts.push(payment);
    return parts.join(' · ');
}

/** Cantidad de canciones que incluye el servicio contratado (no las elegidas por el cliente). */
export function formatServiceSongsIncludedLabel(count: number): string {
    if (count <= 0) return 'Sin canciones en el servicio';
    return count === 1 ? '1 canción incluida' : `${count} canciones incluidas`;
}

export function serenataStatusLabel(status: Serenata['status']) {
    if (status === 'payment_pending') return 'Pago pendiente';
    if (status === 'pending') return 'En revisión';
    if (status === 'pending_open') return 'Horario por definir';
    if (status === 'accepted_pending_group') return 'Aceptada · sin grupo';
    if (status === 'scheduled') return 'Agendada';
    if (status === 'completed') return 'Completada';
    if (status === 'rejected') return 'Rechazada';
    if (status === 'expired') return 'Expirada';
    return 'Cancelada';
}

export function clientSerenataStatusLabel(status: Serenata['status']) {
    if (status === 'payment_pending') return 'Pago pendiente';
    if (status === 'pending') return 'Solicitud enviada';
    if (status === 'pending_open') return 'Horario por confirmar';
    if (status === 'accepted_pending_group') return 'Aceptada · asigna grupo en agenda o al editar';
    if (status === 'scheduled') return 'Confirmada';
    if (status === 'completed') return 'Completada';
    if (status === 'rejected') return 'No aceptada';
    if (status === 'expired') return 'Expirada';
    return 'Cancelada';
}

export function serenataStatusTone(status: Serenata['status']): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
    if (status === 'payment_pending') return 'warning';
    if (status === 'pending' || status === 'pending_open') return 'info';
    if (status === 'accepted_pending_group') return 'warning';
    if (status === 'scheduled') return 'success';
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

/** @deprecated Cálculo legacy. SimpleSerenatas no cobra comisión por serenata. */
export function computeSerenataAppDeduction(
    grossClp: number,
    commissionAppBps: number,
    commissionVatBps: number,
) {
    const commissionClp = Math.round((grossClp * commissionAppBps) / 10_000);
    const vatOnCommissionClp = Math.round((commissionClp * commissionVatBps) / 10_000);
    const totalDeductionClp = commissionClp + vatOnCommissionClp;
    return {
        commissionClp: totalDeductionClp,
        netClp: grossClp - totalDeductionClp,
    };
}

export function commissionPercentFromBps(bps: number): number {
    return bps / 100;
}

/** Teléfono del cliente en solicitudes marketplace: solo tras confirmar en agenda. */
export function ownerCanViewClientPhone(item: Pick<Serenata, 'status' | 'source'>): boolean {
    if (item.source === 'own_lead') return true;
    return item.status === 'scheduled' || item.status === 'completed';
}

export function formatSerenataEventPlace(item: Pick<Serenata, 'address' | 'comuna' | 'region'>) {
    const street = cleanSerenataAddress(item.address, item.comuna, item.region) || item.address?.trim() || 'Sin dirección';
    const zone = [item.comuna, item.region].filter(Boolean).join(', ');
    return { street, zone: zone || undefined };
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

export function SerenataAgendaCard({
    item,
    showPrice = true,
    actions,
    footer,
}: {
    item: Serenata;
    showPrice?: boolean;
    actions?: ReactNode;
    footer?: ReactNode;
}) {
    const addressLine = item.comuna ? `${item.comuna} · ${item.address}` : item.address;
    const collectionLabel = formatSerenataCollectionMethod(item);

    return (
        <article className="grid gap-3 border-b border-border p-4 last:border-b-0">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xl font-bold leading-none tabular-nums text-fg">{item.eventTime}</p>
                    <p className="mt-1 text-xs text-fg-muted">{formatDate(item.eventDate)}</p>
                </div>
                <div className="shrink-0 text-right">
                    {showPrice ? (
                        <>
                            <p className="text-base font-semibold text-accent">{money(item.price)}</p>
                            <p className="mt-0.5 text-xs text-fg-muted">{item.duration} min</p>
                        </>
                    ) : (
                        <p className="text-sm font-semibold text-fg-muted">{item.duration} min</p>
                    )}
                </div>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 text-base font-semibold text-fg">{item.recipientName}</p>
                <PanelStatusBadge
                    tone={serenataStatusTone(item.status)}
                    label={serenataStatusLabel(item.status)}
                    size="sm"
                />
            </div>

            <p className="line-clamp-2 text-sm leading-snug text-fg-muted">{addressLine}</p>

            {collectionLabel ? (
                <p className="text-xs text-fg-muted">Pago: {collectionLabel}</p>
            ) : null}

            {item.groupId ? <p className="text-xs font-medium text-accent">Grupo asignado</p> : null}

            {actions ? (
                <div className="flex flex-wrap items-center gap-2">
                    {actions}
                </div>
            ) : null}

            {footer ? <div className="grid w-full gap-2">{footer}</div> : null}
        </article>
    );
}

export function SerenataRow({ item, context = 'default' }: { item: Serenata; context?: 'default' | 'client' }) {
    const label = context === 'client' ? clientSerenataStatusLabel(item.status) : serenataStatusLabel(item.status);
    const tone = context === 'client' && item.status === 'scheduled' ? 'success' : serenataStatusTone(item.status);
    const responseDueLabel = item.status === 'pending' && item.responseDueAt
        ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.responseDueAt))
        : null;

    return (
        <div className="rounded-xl border border-(--border) bg-(--surface) p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="font-medium text-(--fg)">{item.recipientName}</p>
                    <p className="mt-1 text-sm text-(--fg-muted)">
                        {formatDate(item.eventDate)} · {item.eventTime} · {item.duration} min
                    </p>
                    {responseDueLabel ? (
                        <p className="mt-1 text-xs text-(--fg-muted)">
                            {context === 'client' ? 'Respuesta esperada antes de' : 'Responder antes de'} {responseDueLabel}
                        </p>
                    ) : null}
                    <p className="mt-1 truncate text-sm text-(--fg-secondary)">{item.address}</p>
                </div>
                <PanelStatusBadge
                    tone={tone}
                    label={label}
                />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-sm text-(--fg-muted)">
                <span>{item.eventType ?? 'Serenata'}</span>
                <span>{money(item.price)}</span>
            </div>
        </div>
    );
}

function formatFormErrorMessage(error: string): string {
    const trimmed = error.trim();
    if (/^error[:\s]/i.test(trimmed)) return trimmed;
    if (/[.;]/.test(trimmed) || /\b(no se pudo|no pudimos|inválid|debe|guardados)\b/i.test(trimmed)) {
        return trimmed;
    }
    return `Error: ${trimmed}`;
}

export function FormFeedback({ status }: { status: FormStatus }) {
    if (status.error) {
        return <PanelNotice className="mt-3" tone="error">{formatFormErrorMessage(status.error)}</PanelNotice>;
    }
    if (status.ok) return <PanelNotice className="mt-3" tone="success">{status.ok}</PanelNotice>;
    return null;
}
