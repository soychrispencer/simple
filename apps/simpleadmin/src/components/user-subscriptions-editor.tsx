'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import {
  updateAdminUserSubscriptions,
  type AdminUserListItem,
  type AdminUserSubscriptionsPatch,
} from '@/lib/api';
import type { AdminVerticalKey, AdminVerticalMembership } from '@/lib/admin-verticals';
import { PanelButton } from '@simple/ui/panel';

type BillingPlanSlug = 'free' | 'pro' | 'enterprise';
type SerenatasPlanSlug = 'free' | 'pro';
type BillingStatus = 'active' | 'cancelled' | 'expired';

type BillingDraft = {
  planId: BillingPlanSlug;
  status: BillingStatus;
  expiresAt: string;
};

type SerenatasDraft = {
  planId: SerenatasPlanSlug;
  status: BillingStatus;
  expiresAt: string;
  trialEndsAt: string;
};

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function initialSerenatasBilling(
  current: { planId: string | null; status: string; expiresAt: string | null } | null | undefined,
): Omit<SerenatasDraft, 'trialEndsAt'> {
  const planId: SerenatasPlanSlug =
    current?.planId === 'pro' || current?.planId === 'enterprise' ? 'pro' : 'free';
  const status = (current?.status === 'active' || current?.status === 'cancelled' || current?.status === 'expired'
    ? current.status
    : planId === 'free'
      ? 'cancelled'
      : 'active') as BillingStatus;
  return {
    planId,
    status,
    expiresAt: toDatetimeLocalValue(current?.expiresAt),
  };
}

function initialBilling(
  current: { planId: string | null; status: string; expiresAt: string | null } | null | undefined,
): BillingDraft {
  const planId = (current?.planId === 'pro' || current?.planId === 'enterprise' ? current.planId : 'free') as BillingPlanSlug;
  const status = (current?.status === 'active' || current?.status === 'cancelled' || current?.status === 'expired'
    ? current.status
    : planId === 'free'
      ? 'cancelled'
      : 'active') as BillingStatus;
  return {
    planId,
    status,
    expiresAt: toDatetimeLocalValue(current?.expiresAt),
  };
}

function draftsFromUser(user: AdminUserListItem) {
  return {
    agendaPlan: (user.subscriptions?.agenda?.plan === 'pro' ? 'pro' : 'free') as 'free' | 'pro',
    agendaExpiresAt: toDatetimeLocalValue(user.subscriptions?.agenda?.expiresAt),
    autos: initialBilling(user.subscriptions?.autos),
    propiedades: initialBilling(user.subscriptions?.propiedades),
    serenatas: {
      ...initialSerenatasBilling(user.subscriptions?.serenatas),
      trialEndsAt: toDatetimeLocalValue(user.serenatas?.trialEndsAt),
    },
  };
}

export function UserVerticalMembershipsGrid({
  user,
  memberships,
  editable,
  onSaved,
}: {
  user: AdminUserListItem;
  memberships: AdminVerticalMembership[];
  editable: boolean;
  onSaved: () => Promise<void>;
}) {
  const [drafts, setDrafts] = useState(() => draftsFromUser(user));
  const [savingKey, setSavingKey] = useState<AdminVerticalKey | null>(null);
  const [cardMessage, setCardMessage] = useState<Partial<Record<AdminVerticalKey, string>>>({});
  const [cardError, setCardError] = useState<Partial<Record<AdminVerticalKey, string>>>({});

  useEffect(() => {
    setDrafts(draftsFromUser(user));
    setCardMessage({});
    setCardError({});
  }, [user.id, user.subscriptions, user.serenatas?.trialEndsAt]);

  function patchForVertical(key: AdminVerticalKey): AdminUserSubscriptionsPatch {
    if (key === 'agenda') {
      return {
        agenda: {
          plan: drafts.agendaPlan,
          expiresAt: fromDatetimeLocalValue(drafts.agendaExpiresAt),
        },
      };
    }
    if (key === 'autos') {
      return {
        autos: {
          planId: drafts.autos.planId,
          status: drafts.autos.status,
          expiresAt: fromDatetimeLocalValue(drafts.autos.expiresAt),
        },
      };
    }
    if (key === 'propiedades') {
      return {
        propiedades: {
          planId: drafts.propiedades.planId,
          status: drafts.propiedades.status,
          expiresAt: fromDatetimeLocalValue(drafts.propiedades.expiresAt),
        },
      };
    }
    return {
      serenatas: {
        planId: drafts.serenatas.planId,
        status: drafts.serenatas.status,
        expiresAt: fromDatetimeLocalValue(drafts.serenatas.expiresAt),
        trialEndsAt: fromDatetimeLocalValue(drafts.serenatas.trialEndsAt),
      },
    };
  }

  async function handleSaveVertical(key: AdminVerticalKey) {
    setSavingKey(key);
    setCardMessage((prev) => ({ ...prev, [key]: undefined }));
    setCardError((prev) => ({ ...prev, [key]: undefined }));
    const result = await updateAdminUserSubscriptions(user.id, patchForVertical(key));
    setSavingKey(null);
    if (!result.ok) {
      setCardError((prev) => ({ ...prev, [key]: result.error ?? 'No pudimos guardar.' }));
      return;
    }
    setCardMessage((prev) => ({ ...prev, [key]: 'Guardado.' }));
    await onSaved();
  }

  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
      {memberships.map((membership) => (
        <VerticalMembershipCard
          key={membership.key}
          membership={membership}
          user={user}
          editable={editable}
          drafts={drafts}
          setDrafts={setDrafts}
          saving={savingKey === membership.key}
          message={cardMessage[membership.key]}
          error={cardError[membership.key]}
          onSave={() => void handleSaveVertical(membership.key)}
        />
      ))}
    </div>
  );
}

function VerticalMembershipCard({
  membership,
  user,
  editable,
  drafts,
  setDrafts,
  saving,
  message,
  error,
  onSave,
}: {
  membership: AdminVerticalMembership;
  user: AdminUserListItem;
  editable: boolean;
  drafts: ReturnType<typeof draftsFromUser>;
  setDrafts: Dispatch<SetStateAction<ReturnType<typeof draftsFromUser>>>;
  saving: boolean;
  message?: string;
  error?: string;
  onSave: () => void;
}) {
  const hasOwnerProfile = Boolean(user.serenatas?.coordinator);

  return (
    <article
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{membership.label}</p>
        <span
          className="text-[11px] px-2 py-0.5 rounded-full"
          style={{
            background: membership.enabled ? 'rgba(34,197,94,0.12)' : 'var(--bg-muted)',
            color: membership.enabled ? 'rgb(34,197,94)' : 'var(--fg-muted)',
          }}
        >
          {membership.enabled ? 'Habilitada' : 'No activa'}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Meta label="Rol vertical" value={membership.roleLabel} />
        <Meta label="Actividad" value={String(membership.activityCount)} />
      </div>

      {editable ? (
        <div className="mt-4 space-y-3 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
          {membership.key === 'agenda' ? (
            <>
              <SelectField
                label="Plan"
                value={drafts.agendaPlan}
                onChange={(value) => setDrafts((prev) => ({ ...prev, agendaPlan: value as 'free' | 'pro' }))}
                options={[
                  { value: 'free', label: 'Free' },
                  { value: 'pro', label: 'Pro' },
                ]}
              />
              <DateField
                label="Vence (Pro)"
                value={drafts.agendaExpiresAt}
                onChange={(agendaExpiresAt) => setDrafts((prev) => ({ ...prev, agendaExpiresAt }))}
              />
            </>
          ) : null}

          {membership.key === 'autos' || membership.key === 'propiedades' ? (
            <BillingFields
              draft={membership.key === 'autos' ? drafts.autos : drafts.propiedades}
              onChange={(next) =>
                setDrafts((prev) =>
                  membership.key === 'autos' ? { ...prev, autos: next } : { ...prev, propiedades: next },
                )
              }
            />
          ) : null}

          {membership.key === 'serenatas' ? (
            <>
              <SerenatasBillingFields
                draft={drafts.serenatas}
                onChange={(next) => setDrafts((prev) => ({ ...prev, serenatas: { ...prev.serenatas, ...next } }))}
              />
              <DateField
                label="Fin de trial (dueño)"
                value={drafts.serenatas.trialEndsAt}
                onChange={(trialEndsAt) =>
                  setDrafts((prev) => ({ ...prev, serenatas: { ...prev.serenatas, trialEndsAt } }))
                }
              />
              {!hasOwnerProfile ? (
                <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                  Sin perfil dueño: el plan billing se guarda igual; el trial solo aplica con perfil coordinador.
                </p>
              ) : null}
            </>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <PanelButton variant="secondary" className="!h-8 !px-3 !text-xs" onClick={onSave} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar suscripción'}
            </PanelButton>
            {message ? <span className="text-xs" style={{ color: 'var(--success)' }}>{message}</span> : null}
            {error ? <span className="text-xs" style={{ color: 'var(--error)' }}>{error}</span> : null}
          </div>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <Meta label="Suscripción" value={membership.subscriptionLabel} />
          <Meta label="Estado plan" value={membership.statusLabel} />
        </div>
      )}
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--fg-muted)' }}>{label}</p>
      <p className="mt-1 text-sm font-medium" style={{ color: 'var(--fg)' }}>{value}</p>
    </div>
  );
}

function SerenatasBillingFields({
  draft,
  onChange,
}: {
  draft: SerenatasDraft;
  onChange: (next: SerenatasDraft) => void;
}) {
  const billingPart: BillingDraft = {
    planId: draft.planId,
    status: draft.status,
    expiresAt: draft.expiresAt,
  };
  return (
    <BillingFields
      draft={billingPart}
      onChange={(next) =>
        onChange({
          ...draft,
          planId: next.planId === 'enterprise' ? 'pro' : (next.planId as SerenatasPlanSlug),
          status: next.status,
          expiresAt: next.expiresAt,
        })
      }
      planOptions={[
        { value: 'free', label: 'Gratis' },
        { value: 'pro', label: 'Pro (dueño)' },
      ]}
    />
  );
}

function BillingFields({
  draft,
  onChange,
  planOptions = [
    { value: 'free', label: 'Free' },
    { value: 'pro', label: 'Pro' },
    { value: 'enterprise', label: 'Enterprise' },
  ],
}: {
  draft: BillingDraft | SerenatasDraft;
  onChange: (next: BillingDraft | SerenatasDraft) => void;
  planOptions?: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-3">
      <SelectField
        label="Plan"
        value={draft.planId}
        onChange={(value) => {
          const planId = value as BillingPlanSlug;
          onChange({
            ...draft,
            planId,
            status: planId === 'free' ? 'cancelled' : draft.status === 'cancelled' ? 'active' : draft.status,
          });
        }}
        options={planOptions}
      />
      <SelectField
        label="Estado"
        value={draft.status}
        onChange={(value) => onChange({ ...draft, status: value as BillingStatus })}
        options={[
          { value: 'active', label: 'Activa' },
          { value: 'cancelled', label: 'Cancelada' },
          { value: 'expired', label: 'Expirada' },
        ]}
      />
      <DateField label="Vence" value={draft.expiresAt} onChange={(expiresAt) => onChange({ ...draft, expiresAt })} />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="space-y-1 block">
      <span className="text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--fg-muted)' }}>
        {label}
      </span>
      <select className="form-select h-9 w-full text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1 block">
      <span className="text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--fg-muted)' }}>
        {label}
      </span>
      <input
        type="datetime-local"
        className="form-input h-9 w-full text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
