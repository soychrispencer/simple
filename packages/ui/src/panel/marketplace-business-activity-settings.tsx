'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    fetchAccountWorkspace,
    fetchCurrentAccountContext,
    getOperatorSubtypes,
    getOperatorTierOptions,
    isOperatorSubtypeOther,
    normalizeOperatorSubtype,
    resolveOperatorDisplayLabel,
    saveAccountWorkspace,
    type AccountWorkspaceState,
    type OperatorTier,
    type WorkspaceVertical,
} from '@simple/utils';
import { PanelButton } from './panel-button.js';
import { PanelCard } from './panel-card.js';
import { PanelField } from './panel-display.js';
import { PanelBlockHeader, PanelChoiceCard, PanelNotice } from './panel-primitives.js';
import { PanelSelect } from './panel-select.js';

export function BusinessActivitySettings({ vertical }: { vertical: WorkspaceVertical }) {
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [workspaceState, setWorkspaceState] = useState<AccountWorkspaceState | null>(null);
    const [accountIsPersonal, setAccountIsPersonal] = useState(true);
    const [accountName, setAccountName] = useState('');
    const [accountKind, setAccountKind] = useState<OperatorTier>('individual');
    const [subtype, setSubtype] = useState<string | null>(null);
    const [subtypeCustom, setSubtypeCustom] = useState('');
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveNeedsSubscriptionReview, setSaveNeedsSubscriptionReview] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const [nextWorkspaceState, accountContext] = await Promise.all([
                fetchAccountWorkspace(vertical),
                fetchCurrentAccountContext(),
            ]);
            if (!nextWorkspaceState) {
                setLoadError('No pudimos cargar la actividad de este espacio. Intenta nuevamente.');
                return;
            }

            const nextWorkspace = nextWorkspaceState.workspace;
            const isPersonal = accountContext?.account?.isPersonal ?? true;
            const initialKind = nextWorkspace?.accountKind ?? (isPersonal ? 'individual' : 'company');
            setWorkspaceState(nextWorkspaceState);
            setAccountKind(initialKind);
            setSubtype(nextWorkspace?.operatorSubtype ?? null);
            setSubtypeCustom(nextWorkspace?.operatorSubtypeCustom ?? '');
            setAccountIsPersonal(isPersonal);
            setAccountName(isPersonal ? '' : accountContext?.account?.name ?? '');
        } catch {
            setLoadError('No pudimos cargar la actividad de este espacio. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    }, [vertical]);

    useEffect(() => {
        void load();
    }, [load]);

    const tierOptions = useMemo(() => getOperatorTierOptions(vertical), [vertical]);
    const subtypeOptions = useMemo(() => getOperatorSubtypes(vertical, accountKind), [accountKind, vertical]);
    const currentWorkspace = workspaceState?.workspace ?? null;
    const currentLabel = resolveOperatorDisplayLabel(
        vertical,
        currentWorkspace?.accountKind ?? accountKind,
        currentWorkspace?.operatorSubtype ?? subtype,
        currentWorkspace?.operatorSubtypeCustom ?? subtypeCustom,
    );
    const showCustomSubtype = isOperatorSubtypeOther(subtype);
    const canManage = workspaceState?.canManage ?? false;
    const hasWorkspaceSetup = Boolean(currentWorkspace?.onboardingCompletedAt);

    function beginEditing() {
        setSaved(false);
        setSaveError('');
        setSaveNeedsSubscriptionReview(false);
        setEditing(true);
    }

    function resetEditing() {
        setAccountKind(currentWorkspace?.accountKind ?? (accountIsPersonal ? 'individual' : 'company'));
        setSubtype(currentWorkspace?.operatorSubtype ?? null);
        setSubtypeCustom(currentWorkspace?.operatorSubtypeCustom ?? '');
        setSaveError('');
        setSaveNeedsSubscriptionReview(false);
        setEditing(false);
    }

    async function save() {
        setSaving(true);
        setSaveError('');
        setSaveNeedsSubscriptionReview(false);
        setSaved(false);
        try {
            const result = await saveAccountWorkspace(vertical, {
                accountKind,
                operatorSubtype: subtype,
                operatorSubtypeCustom: subtypeCustom,
            }, accountKind === 'company' ? accountName.trim() : undefined);
            if (!result.ok || !result.workspace) {
                setSaveError(result.error ?? 'No pudimos guardar el cambio. Intenta nuevamente.');
                setSaveNeedsSubscriptionReview(result.errorCode === 'active_plan_activity_conflict');
                return;
            }
            if (result.accountChanged) {
                window.location.reload();
                return;
            }
            const nextState = {
                workspace: result.workspace,
                canManage: result.canManage ?? true,
                memberRole: result.memberRole ?? null,
            };
            setWorkspaceState(nextState);
            setEditing(false);
            setSaved(true);
            setSaveNeedsSubscriptionReview(false);
            window.dispatchEvent(new CustomEvent('simple:workspace-activity-changed', { detail: { vertical } }));
        } catch {
            setSaveError('No pudimos guardar el cambio. Intenta nuevamente.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <PanelCard size="md" className="space-y-4">
            <PanelBlockHeader
                title="Actividad del espacio"
                description={vertical === 'agenda'
                    ? 'SimpleAgenda usará esta actividad para adaptar tu agenda y perfil profesional. La actividad inmobiliaria y las visitas del equipo se configuran desde SimplePropiedades.'
                    : 'Simple adapta el panel y las herramientas a la actividad de este espacio.'}
                actions={canManage && !loading && !loadError && !editing ? (
                    <PanelButton type="button" variant="secondary" onClick={beginEditing}>
                        {hasWorkspaceSetup ? 'Cambiar actividad' : 'Configurar actividad'}
                    </PanelButton>
                ) : null}
            />

            {loading ? (
                <p className="text-sm text-fg-muted">Cargando actividad…</p>
            ) : loadError ? (
                <div className="space-y-3">
                    <PanelNotice tone="error">{loadError}</PanelNotice>
                    <PanelButton type="button" variant="secondary" onClick={() => void load()}>Intentar nuevamente</PanelButton>
                </div>
            ) : !canManage ? (
                <PanelNotice tone="neutral">
                    {hasWorkspaceSetup
                        ? `Este espacio está configurado como ${currentLabel}. Quien lo administra puede cambiar su actividad.`
                        : 'Quien administra el espacio configurará su actividad. Puedes seguir con las tareas disponibles.'}
                </PanelNotice>
            ) : editing ? (
                <div className="space-y-4">
                    {accountIsPersonal ? (
                        <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Tipo de actividad">
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
                                    className="min-h-20"
                                >
                                    <span className="block text-sm font-semibold text-fg">{option.label}</span>
                                    <span className="mt-1 block text-xs leading-5 text-fg-muted">{option.description}</span>
                                </PanelChoiceCard>
                            ))}
                        </div>
                    ) : (
                        <PanelNotice tone="info">
                            Este espacio conserva su tipo. Para cambiar entre Particular, Profesional y Empresa, cambia al espacio personal desde el selector. El equipo y sus datos seguirán aquí.
                        </PanelNotice>
                    )}

                    {accountKind === 'company' ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <PanelField label="Nombre del espacio" hint="Así lo verá tu equipo." required>
                                <input
                                    value={accountName}
                                    maxLength={160}
                                    disabled={saving}
                                    onChange={(event) => setAccountName(event.target.value)}
                                    placeholder="Ej. Inmobiliaria del Valle"
                                    className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                                    style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                                />
                            </PanelField>
                            <PanelNotice tone="info" className="self-end">
                                Tu espacio personal seguirá disponible. Podrás cambiar entre espacios desde el selector de cuentas.
                            </PanelNotice>
                        </div>
                    ) : null}

                    <PanelField label="Actividad principal" hint="Usamos esta opción para priorizar las herramientas del panel." required>
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
                            {subtypeOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                        </PanelSelect>
                    </PanelField>

                    {showCustomSubtype ? (
                        <PanelField label="¿A qué te dedicas?" required>
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

                    {saveError ? (
                        <div className="space-y-3">
                            <PanelNotice tone="error">{saveError}</PanelNotice>
                            {saveNeedsSubscriptionReview ? (
                                <Link href="/panel/mi-cuenta/suscripcion" className="inline-flex">
                                    <PanelButton type="button" variant="secondary">Revisar mi suscripción</PanelButton>
                                </Link>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="flex flex-wrap justify-end gap-2 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                        <PanelButton type="button" variant="ghost" onClick={resetEditing} disabled={saving}>Cancelar</PanelButton>
                        <PanelButton
                            type="button"
                            variant="primary"
                            onClick={() => void save()}
                            loading={saving}
                            disabled={!subtype || (showCustomSubtype && !subtypeCustom.trim()) || (accountKind === 'company' && !accountName.trim())}
                        >
                            Guardar actividad
                        </PanelButton>
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex rounded-full bg-[var(--bg-muted)] px-3 py-1.5 text-sm font-medium text-fg">{currentLabel}</span>
                    {currentWorkspace?.accountKind === 'company' && accountName ? (
                        <span className="text-sm text-fg-muted">{accountName}</span>
                    ) : null}
                    {saved ? <span className="text-sm text-[var(--color-success-text)]">Cambios guardados.</span> : null}
                </div>
            )}
        </PanelCard>
    );
}

export const MarketplaceBusinessActivitySettings = BusinessActivitySettings;
