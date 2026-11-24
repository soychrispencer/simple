'use client';

import Link from 'next/link';
import { IconMapPin, IconUser, IconUsersGroup } from '@tabler/icons-react';
import type { AgendaPreconsultField } from '@simple/utils';
import { type AgendaServiceKind } from '@simple/utils';
import { PanelField } from './panel-display.js';
import { PANEL_INPUT_CLASS } from './panel-form-classes.js';
import { BusinessCatalogModalityField } from './business-catalog-modality-field.js';
import { BusinessCatalogAgendaPreconsultFields } from './business-catalog-agenda-preconsult-fields.js';

export type AgendaCatalogServiceExtraValues = {
    kind: AgendaServiceKind;
    startsAt: string;
    capacity: string;
    location: string;
    meetingUrl: string;
    isOnline: boolean;
    isPresential: boolean;
};

export type AgendaSavedLocationOption = {
    id: string;
    name: string;
    addressLine: string;
    city?: string | null;
};

export type BusinessCatalogAgendaServiceFieldsProps = {
    values: AgendaCatalogServiceExtraValues;
    onChange: <K extends keyof AgendaCatalogServiceExtraValues>(key: K, value: AgendaCatalogServiceExtraValues[K]) => void;
    preconsultFields?: AgendaPreconsultField[];
    onPreconsultFieldsChange?: (fields: AgendaPreconsultField[]) => void;
    /** Oculta el selector de tipo cuando se renderiza en la parte superior del modal. */
    showKindField?: boolean;
    /** Muestra o no las preguntas al reservar inline (pueden ubicarse en Opciones avanzadas). */
    showPreconsult?: boolean;
    /** Bloquea "Sesión grupal" para cuentas en Plan Gratis con aviso claro. */
    groupDisabled?: boolean;
    /** Ubicaciones guardadas en Perfil para evitar re-escribir la dirección en sesiones grupales. */
    savedLocations?: AgendaSavedLocationOption[];
};

const formatSavedLocationLabel = (loc: AgendaSavedLocationOption): string =>
    loc.city ? `${loc.name} — ${loc.addressLine}, ${loc.city}` : `${loc.name} — ${loc.addressLine}`;

export function AgendaServiceKindSelector({
    value,
    onChange,
    groupDisabled = false,
}: {
    value: AgendaServiceKind;
    onChange: (kind: AgendaServiceKind) => void;
    groupDisabled?: boolean;
}) {
    const isGroupLocked = groupDisabled && value !== 'group_event';
    const options: Array<{
        id: AgendaServiceKind;
        title: string;
        subtitle: string;
        icon: typeof IconUser;
        proBadge?: boolean;
        disabled?: boolean;
    }> = [
        {
            id: 'appointment',
            title: 'Cita individual',
            subtitle: 'Sesión 1 a 1 en tus horarios disponibles.',
            icon: IconUser,
        },
        {
            id: 'group_event',
            title: 'Sesión grupal',
            subtitle: 'Taller o clase con fecha fija y cupos.',
            icon: IconUsersGroup,
            proBadge: groupDisabled,
            disabled: isGroupLocked,
        },
    ];

    return (
        <PanelField label="Tipo de servicio" className="md:col-span-2">
            <div className="grid gap-2.5 sm:grid-cols-2">
                {options.map((option) => {
                    const active = value === option.id;
                    const Icon = option.icon;
                    return (
                        <button
                            key={option.id}
                            type="button"
                            disabled={option.disabled}
                            onClick={() => onChange(option.id)}
                            className={[
                                'flex items-start gap-3 rounded-xl border p-3 text-left transition',
                                active
                                    ? 'border-(--signal,var(--accent)) bg-(--accent-soft)/45'
                                    : 'border-border bg-surface hover:border-(--fg-muted)/40',
                                option.disabled ? 'cursor-not-allowed opacity-65' : '',
                            ].join(' ')}
                        >
                            <span
                                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                style={{
                                    background: active ? 'var(--accent-soft)' : 'var(--bg-muted)',
                                    color: active ? 'var(--accent-ink)' : 'var(--fg-muted)',
                                }}
                            >
                                <Icon size={16} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                                    {option.title}
                                    {option.proBadge ? (
                                        <span className="rounded-full bg-(--accent-soft) px-2 py-0.5 text-[10px] font-semibold text-accent-ink">
                                            Pro
                                        </span>
                                    ) : null}
                                </span>
                                <span className="mt-0.5 block text-xs leading-snug text-fg-muted">{option.subtitle}</span>
                            </span>
                        </button>
                    );
                })}
            </div>
            {groupDisabled ? (
                <p className="mt-2 text-xs text-fg-muted">
                    Las sesiones grupales con cupos están incluidas desde Plan Pro.{' '}
                    <Link href="/panel/mi-negocio/plan" className="font-semibold text-accent-ink hover:underline">
                        Ver planes →
                    </Link>
                </p>
            ) : null}
        </PanelField>
    );
}

export function BusinessCatalogAgendaServiceFields({
    values,
    onChange,
    preconsultFields,
    onPreconsultFieldsChange,
    showKindField = true,
    showPreconsult = true,
    groupDisabled = false,
    savedLocations = [],
}: BusinessCatalogAgendaServiceFieldsProps) {
    const isGroup = values.kind === 'group_event';
    const activeLocations = savedLocations.filter((loc) => Boolean(loc.addressLine?.trim()));

    return (
        <>
            {showKindField ? (
                <AgendaServiceKindSelector
                    value={values.kind}
                    onChange={(nextKind) => onChange('kind', nextKind)}
                    groupDisabled={groupDisabled}
                />
            ) : null}

            {isGroup ? (
                <>
                    <PanelField label="Fecha y hora" required className="md:col-span-2">
                        <input
                            type="datetime-local"
                            className={PANEL_INPUT_CLASS}
                            value={values.startsAt}
                            onChange={(e) => onChange('startsAt', e.target.value)}
                        />
                    </PanelField>
                    <PanelField label="Cupo máximo" required>
                        <input
                            type="number"
                            min={1}
                            className={PANEL_INPUT_CLASS}
                            value={values.capacity}
                            onChange={(e) => onChange('capacity', e.target.value)}
                        />
                    </PanelField>
                </>
            ) : null}

            <BusinessCatalogModalityField
                values={values}
                onChange={onChange}
                className={isGroup ? undefined : 'md:col-span-2'}
            />

            {isGroup && values.isPresential ? (
                <PanelField label="Dirección" required className="md:col-span-2">
                    {activeLocations.length > 0 ? (
                        <div className="mb-2 flex flex-wrap gap-1.5">
                            {activeLocations.map((loc) => {
                                const formatted = formatSavedLocationLabel(loc);
                                const selected = values.location.trim() === formatted;
                                return (
                                    <button
                                        key={loc.id}
                                        type="button"
                                        onClick={() => onChange('location', formatted)}
                                        className={[
                                            'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition',
                                            selected
                                                ? 'border-(--signal,var(--accent)) bg-(--accent-soft)/50 font-semibold text-accent-ink'
                                                : 'border-border bg-bg-subtle text-fg-secondary hover:text-fg',
                                        ].join(' ')}
                                    >
                                        <IconMapPin size={12} />
                                        {loc.name}
                                    </button>
                                );
                            })}
                        </div>
                    ) : null}
                    <input
                        type="text"
                        className={PANEL_INPUT_CLASS}
                        value={values.location}
                        onChange={(e) => onChange('location', e.target.value)}
                        placeholder="Av. Providencia 123, Of. 301"
                    />
                </PanelField>
            ) : null}

            {isGroup && values.isOnline ? (
                <PanelField label="Link de reunión" hint="Opcional." className="md:col-span-2">
                    <input
                        type="url"
                        className={PANEL_INPUT_CLASS}
                        value={values.meetingUrl}
                        onChange={(e) => onChange('meetingUrl', e.target.value)}
                        placeholder="https://meet.google.com/..."
                    />
                </PanelField>
            ) : null}

            {showPreconsult && !isGroup && preconsultFields && onPreconsultFieldsChange ? (
                <BusinessCatalogAgendaPreconsultFields
                    fields={preconsultFields}
                    onChange={onPreconsultFieldsChange}
                />
            ) : null}
        </>
    );
}
