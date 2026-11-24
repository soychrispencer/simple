'use client';

import type { OperatorProfileVertical, OperatorTier } from '@simple/utils';
import {
    getOperatorSubtypes,
    getOperatorTierOptions,
    isOperatorSubtypeOther,
    normalizeOperatorSubtype,
    OPERATOR_SUBTYPE_OTHER_ID,
} from '@simple/utils';
import { PanelField } from './panel-display.js';
import { PanelCard } from './panel-card.js';
import { PanelChoiceCard, PanelNotice } from './panel-primitives.js';
import { PANEL_INPUT_CLASS } from './panel-form-classes.js';
import {
    OPERATOR_BUSINESS_CUSTOM_FIELD,
} from './business-copy.js';

type RoleProductPreview = {
    title: string;
    description: string;
};

const PROPERTY_ROLE_PREVIEWS: Record<string, RoleProductPreview> = {
    broker: {
        title: 'Una oficina digital para tu corretaje',
        description: 'Presenta tu marca, publica tu cartera y revisa las consultas e interacciones que generan tus propiedades.',
    },
    rental_administrator: {
        title: 'Tu gestión de arriendos con presencia profesional',
        description: 'Presenta las propiedades que administras y reúne sus consultas y conversaciones en tu panel.',
    },
    property_manager: {
        title: 'Una vitrina para la cartera de tu gestora',
        description: 'Publica propiedades administradas por tu empresa y sigue el interés que generan.',
    },
    real_estate_agency: {
        title: 'La presencia digital de tu inmobiliaria',
        description: 'Publica propiedades bajo tu marca y revisa visitas, favoritos y contactos desde el panel.',
    },
    developer: {
        title: 'Proyectos visibles y resultados a la vista',
        description: 'Publica proyectos y monitorea las visitas, favoritos y contactos de tus avisos.',
    },
};

const PROPERTY_TIER_PREVIEWS: Record<OperatorTier, RoleProductPreview> = {
    individual: {
        title: 'Tus propiedades, con presencia propia',
        description: 'Publica en venta o arriendo, recibe consultas y revisa el interés que generan tus avisos.',
    },
    independent: {
        title: 'Tu marca profesional inmobiliaria',
        description: 'Presenta tu perfil, administra tus publicaciones y revisa los contactos y mensajes que recibes.',
    },
    company: {
        title: 'La vitrina digital de tu empresa',
        description: 'Publica bajo tu marca y revisa el alcance y las interacciones de tus propiedades.',
    },
};

function getRoleProductPreview(
    vertical: OperatorProfileVertical,
    tier: OperatorTier,
    subtype: string | null,
): RoleProductPreview | null {
    if (vertical !== 'propiedades') return null;
    return (subtype ? PROPERTY_ROLE_PREVIEWS[subtype] : undefined) ?? PROPERTY_TIER_PREVIEWS[tier];
}
export type OperatorProfileFieldsProps = {
    vertical: OperatorProfileVertical;
    tier: OperatorTier;
    subtype: string | null;
    subtypeCustom?: string;
    onTierChange: (tier: OperatorTier) => void;
    onSubtypeChange: (subtype: string | null) => void;
    onSubtypeCustomChange?: (value: string) => void;
    tierLocked?: boolean;
    disabled?: boolean;
};

export function OperatorProfileFields({
    vertical,
    tier,
    subtype,
    subtypeCustom = '',
    onTierChange,
    onSubtypeChange,
    onSubtypeCustomChange,
    tierLocked = false,
    disabled = false,
}: OperatorProfileFieldsProps) {
    const tierOptions = getOperatorTierOptions(vertical);
    const subtypes = getOperatorSubtypes(vertical, tier);
    const showSubtypeSelect = subtypes.length > 0;
    const showCustomField = isOperatorSubtypeOther(subtype);
    const rolePreview = getRoleProductPreview(vertical, tier, subtype);
    const tierLabel = tierOptions.find((option) => option.tier === tier)?.label ?? tier;

    return (
        <div className="grid gap-4">
            <div>
                {tierLocked ? (
                    <>
                        <p className="mb-2 text-sm font-medium" style={{ color: 'var(--fg)' }}>Tipo de espacio</p>
                        <PanelNotice tone="info">
                            <strong>{tierLabel}</strong> · Este espacio conserva su tipo y su equipo. Aquí puedes ajustar la actividad; para configurar tu espacio personal, selecciónalo desde el selector de espacios.
                        </PanelNotice>
                    </>
                ) : (
                    <>
                        <p className="mb-2 text-sm font-medium" style={{ color: 'var(--fg)' }}>¿Cómo trabajas?</p>
                        <div className="grid gap-3 md:grid-cols-3" role="group" aria-label="Cómo trabajas">
                            {tierOptions.map((option) => (
                                <PanelChoiceCard
                                    key={option.tier}
                                    selected={tier === option.tier}
                                    disabled={disabled}
                                    onClick={() => {
                                        onTierChange(option.tier);
                                        onSubtypeChange(null);
                                        onSubtypeCustomChange?.('');
                                    }}
                                    className="min-h-24"
                                >
                                    <span className="block font-semibold" style={{ color: 'var(--fg)' }}>{option.label}</span>
                                    <span className="mt-1 block text-sm leading-5" style={{ color: 'var(--fg-muted)' }}>{option.description}</span>
                                </PanelChoiceCard>
                            ))}
                        </div>
                        <p className="mt-2 text-xs" style={{ color: 'var(--fg-muted)' }}>El permiso de cada integrante se administra por separado.</p>
                    </>
                )}
            </div>

            {showSubtypeSelect ? (
                <div>
                    <p className="mb-2 text-sm font-medium" style={{ color: 'var(--fg)' }}>¿Qué actividad describe mejor tu trabajo?</p>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="group" aria-label="Actividad principal">
                        {subtypes.map((item) => (
                            <PanelChoiceCard
                                key={item.id}
                                selected={subtype === item.id}
                                disabled={disabled}
                                onClick={() => {
                                    const nextSubtype = normalizeOperatorSubtype(vertical, tier, item.id);
                                    onSubtypeChange(nextSubtype);
                                    if (nextSubtype !== OPERATOR_SUBTYPE_OTHER_ID) {
                                        onSubtypeCustomChange?.('');
                                    }
                                }}
                                className="min-h-24"
                            >
                                <span className="block font-semibold" style={{ color: 'var(--fg)' }}>{item.label}</span>
                                {item.description ? (
                                    <span className="mt-1 block text-sm leading-5" style={{ color: 'var(--fg-muted)' }}>{item.description}</span>
                                ) : null}
                            </PanelChoiceCard>
                        ))}
                    </div>
                </div>
            ) : null}

            {showCustomField ? (
                <PanelField
                    label={OPERATOR_BUSINESS_CUSTOM_FIELD.label}
                    hint={OPERATOR_BUSINESS_CUSTOM_FIELD.hint}
                    className="sm:col-span-2"
                >
                    <input
                        className={PANEL_INPUT_CLASS}
                        value={subtypeCustom}
                        disabled={disabled}
                        onChange={(event) => onSubtypeCustomChange?.(event.target.value)}
                        placeholder={OPERATOR_BUSINESS_CUSTOM_FIELD.placeholder}
                    />
                </PanelField>
            ) : null}

            {rolePreview ? (
                <PanelCard size="sm" tone="subtle" className="space-y-3 border sm:col-span-2">
                    <div>
                        <p
                            className="text-xs font-semibold uppercase tracking-[0.14em]"
                            style={{ color: 'var(--accent)' }}
                        >
                            Así te ayuda SimplePropiedades
                        </p>
                        <p className="mt-1 font-semibold" style={{ color: 'var(--fg)' }}>
                            {rolePreview.title}
                        </p>
                        <p className="mt-1 text-sm leading-6" style={{ color: 'var(--fg-muted)' }}>
                            {rolePreview.description}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {['Perfil profesional', 'Publicaciones y proyectos', 'Contactos y métricas'].map((item) => (
                            <span
                                key={item}
                                className="rounded-full border px-3 py-1 text-xs font-medium"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                            >
                                {item}
                            </span>
                        ))}
                    </div>
                </PanelCard>
            ) : null}
        </div>
    );
}
