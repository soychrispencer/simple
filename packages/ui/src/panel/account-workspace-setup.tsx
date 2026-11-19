'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    getOperatorSubtypes,
    getOperatorTierOptions,
    isOperatorSubtypeOther,
    normalizeOperatorSubtype,
    saveAccountWorkspace,
    type AccountWorkspaceState,
    type OperatorTier,
} from '@simple/utils';
import { PanelButton } from './panel-button.js';
import { PanelCard } from './panel-card.js';
import { PanelChoiceCard, PanelNotice } from './panel-primitives.js';
import { PanelField } from './panel-display.js';
import { PanelSelect } from './panel-select.js';

export type AccountWorkspaceSetupVertical = 'autos' | 'propiedades';

export function AccountWorkspaceSetup({
    vertical,
    state,
    loading,
    dismissed,
    isPersonalAccount,
    onSaved,
    onDismiss,
}: {
    vertical: AccountWorkspaceSetupVertical;
    state: AccountWorkspaceState | null;
    loading: boolean;
    dismissed: boolean;
    isPersonalAccount: boolean | null;
    onSaved: (state: AccountWorkspaceState, accountChanged?: boolean) => void;
    onDismiss: () => void;
}) {
    const [accountKind, setAccountKind] = useState<OperatorTier>('individual');
    const [subtype, setSubtype] = useState<string | null>(null);
    const [subtypeCustom, setSubtypeCustom] = useState('');
    const [accountName, setAccountName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const isProperties = vertical === 'propiedades';
    const businessNoun = isProperties ? 'inmobiliaria o empresa' : 'negocio automotriz o empresa';
    const fieldPlaceholder = isProperties ? 'Ej. Inmobiliaria del Valle' : 'Ej. Automotora del Valle';

    useEffect(() => {
        if (!state?.workspace) return;
        setAccountKind(state.workspace.accountKind);
        setSubtype(state.workspace.operatorSubtype);
        setSubtypeCustom(state.workspace.operatorSubtypeCustom ?? '');
    }, [state?.workspace]);

    useEffect(() => {
        if (state?.workspace) {
            setAccountKind(state.workspace.accountKind);
            setSubtype(state.workspace.operatorSubtype);
            setSubtypeCustom(state.workspace.operatorSubtypeCustom ?? '');
            setAccountName(isPersonalAccount ? '' : state.accountName ?? '');
        } else if (isPersonalAccount === false) {
            setAccountKind('company');
            setAccountName(state?.accountName ?? '');
        } else if (isPersonalAccount === true) {
            setAccountKind('individual');
            setAccountName('');
        }
    }, [isPersonalAccount, state?.accountName, state?.workspace]);

    const tierOptions = getOperatorTierOptions(vertical);
    const subtypeOptions = useMemo(() => getOperatorSubtypes(vertical, accountKind), [vertical, accountKind]);
    const showCustomSubtype = isOperatorSubtypeOther(subtype);
    const completed = Boolean(state?.workspace?.onboardingCompletedAt);
    const preparingCompanySpace = accountKind === 'company' && isPersonalAccount === true;

    if (loading || completed || dismissed) return null;

    if (state?.canManage === false) {
        return (
            <PanelCard size="md" tone="subtle" className="border">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="font-semibold" style={{ color: 'var(--fg)' }}>Tu espacio aún se está preparando</p>
                        <p className="mt-1 text-sm leading-6" style={{ color: 'var(--fg-muted)' }}>
                            Quien administra el espacio configura su actividad. Puedes seguir con las tareas disponibles.
                        </p>
                    </div>
                    <PanelButton type="button" variant="secondary" onClick={onDismiss}>
                        Seguir al panel
                    </PanelButton>
                </div>
            </PanelCard>
        );
    }

    if (isPersonalAccount === null) {
        return (
            <PanelCard size="md" tone="subtle" className="border">
                <div className="space-y-3">
                    <p className="font-semibold" style={{ color: 'var(--fg)' }}>No pudimos confirmar el espacio activo</p>
                    <PanelNotice tone="warning">
                        Recarga para verificar si estás en tu espacio personal o en uno de empresa antes de configurar la actividad.
                    </PanelNotice>
                    <PanelButton type="button" variant="secondary" onClick={() => window.location.reload()}>
                        Recargar espacio
                    </PanelButton>
                </div>
            </PanelCard>
        );
    }

    async function save() {
        setSaving(true);
        setError(null);
        const result = await saveAccountWorkspace(vertical, {
            accountKind,
            operatorSubtype: subtype,
            operatorSubtypeCustom: subtypeCustom,
        }, accountKind === 'company' ? accountName.trim() : undefined);
        setSaving(false);
        if (!result.ok || !result.workspace) {
            setError(result.error ?? 'No pudimos guardar la configuración. Inténtalo nuevamente.');
            return;
        }
        onSaved({
            workspace: result.workspace,
            accountName: result.accountName,
            canManage: result.canManage ?? true,
            memberRole: result.memberRole ?? null,
        }, result.accountChanged);
    }

    return (
        <PanelCard size="lg" className="space-y-5 overflow-hidden">
            <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--accent)' }}>
                    Simple se adapta a ti
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl" style={{ color: 'var(--fg)' }}>
                    Configura tu espacio de trabajo
                </h2>
                <p className="mt-2 text-sm leading-6" style={{ color: 'var(--fg-muted)' }}>
                    {preparingCompanySpace
                        ? 'Tu espacio de empresa se mantendrá separado. Tus publicaciones personales seguirán en tu cuenta personal y podrás cambiar entre espacios cuando quieras.'
                        : isPersonalAccount === false
                            ? 'Este espacio ya está definido como Empresa. Aquí puedes ajustar la actividad sin cambiar el equipo ni sus datos.'
                            : 'Primero eliges entre Particular, Profesional o Empresa. Después defines tu actividad. Los permisos de equipo se asignan por separado.'}
                </p>
            </div>

            {isPersonalAccount === false ? (
                <PanelNotice tone="info">
                    Para configurar el tipo de tu cuenta personal, cámbiate a ella desde el selector. Este espacio de empresa y su equipo seguirán aquí.
                </PanelNotice>
            ) : (
                <div>
                    <p className="mb-2 text-sm font-medium" style={{ color: 'var(--fg)' }}>Tipo de espacio</p>
                    <div className="grid gap-3 md:grid-cols-3" role="group" aria-label="Tipo de espacio">
                        {tierOptions.map((option) => (
                            <PanelChoiceCard
                                key={option.tier}
                                selected={accountKind === option.tier}
                                disabled={saving}
                                onClick={() => {
                                    setAccountKind(option.tier);
                                    setSubtype(null);
                                    setSubtypeCustom('');
                                }}
                                className="min-h-24"
                            >
                                <span className="block font-semibold" style={{ color: 'var(--fg)' }}>{option.label}</span>
                                <span className="mt-1 block text-sm leading-5" style={{ color: 'var(--fg-muted)' }}>{option.description}</span>
                            </PanelChoiceCard>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                {accountKind === 'company' ? (
                    <PanelField label={`Nombre de tu ${businessNoun}`} hint="Así aparecerá el espacio para las personas que invites." required>
                        <input
                            value={accountName}
                            maxLength={160}
                            disabled={saving}
                            onChange={(event) => setAccountName(event.target.value)}
                            placeholder={fieldPlaceholder}
                            className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                        />
                    </PanelField>
                ) : null}
                <PanelField label="Actividad principal" hint="Así enfocamos las herramientas que ves primero." required>
                    <PanelSelect
                        aria-label="Actividad principal"
                        value={subtype ?? ''}
                        disabled={saving}
                        onChange={(event) => {
                            const next = normalizeOperatorSubtype(vertical, accountKind, event.target.value);
                            setSubtype(next);
                            if (!isOperatorSubtypeOther(next)) setSubtypeCustom('');
                        }}
                    >
                        <option value="">Selecciona una actividad</option>
                        {subtypeOptions.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                    </PanelSelect>
                </PanelField>

                {showCustomSubtype ? (
                    <PanelField label="¿A qué te dedicas?" hint="Esto ayuda a personalizar tu espacio." required>
                        <input
                            value={subtypeCustom}
                            maxLength={160}
                            disabled={saving}
                            onChange={(event) => setSubtypeCustom(event.target.value)}
                            placeholder="Describe tu actividad"
                            className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                        />
                    </PanelField>
                ) : null}
            </div>

            {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Lo puedes cambiar después desde Mi negocio.</p>
                <div className="flex items-center gap-2">
                    <PanelButton type="button" variant="ghost" onClick={onDismiss} disabled={saving}>
                        Ahora no
                    </PanelButton>
                    <PanelButton
                        type="button"
                        variant="primary"
                        onClick={() => void save()}
                        loading={saving}
                        disabled={!subtype || (showCustomSubtype && !subtypeCustom.trim()) || (accountKind === 'company' && !accountName.trim())}
                    >
                        {preparingCompanySpace ? 'Preparar espacio de empresa' : 'Preparar mi espacio'}
                    </PanelButton>
                </div>
            </div>
        </PanelCard>
    );
}
