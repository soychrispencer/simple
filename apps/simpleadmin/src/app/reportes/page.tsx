'use client';
import { useEffect, useMemo, useState, type DragEvent, type FormEvent, type ReactNode } from 'react';
import {
    IconBrandFacebook,
    IconBrandInstagram,
    IconBrandWhatsapp,
    IconBuildingStore,
    IconChevronDown,
    IconClockHour4,
    IconFileDescription,
    IconHome,
    IconLayoutGrid,
    IconLink,
    IconList,
    IconMail,
    IconMessageCircle,
    IconPhone,
    IconTag,
    IconUser,
    IconWorld,
} from '@tabler/icons-react';
import {
    addAdminListingLeadNote,
    addAdminServiceLeadNote,
    fetchAdminListingLeadDetail,
    fetchAdminListingLeads,
    fetchAdminServiceLeadDetail,
    fetchAdminServiceLeads,
    runAdminListingLeadQuickAction,
    runAdminServiceLeadQuickAction,
    updateAdminListingLeadStatus,
    updateAdminServiceLeadStatus,
    type AdminLeadAssignee,
    type AdminLeadQuickAction,
    type AdminListingLead,
    type AdminListingLeadActivity,
    type AdminListingLeadDetail,
    type AdminServiceLead,
    type AdminServiceLeadActivity,
    type AdminServiceLeadDetail,
} from '@/lib/api';
import { AdminProtectedPage } from '@/components/admin-protected-page';
import { PanelButton, PanelStatusBadge } from '@simple/ui';

type LeadTab = 'publicaciones' | 'servicios';
type AnyLead = AdminListingLead | AdminServiceLead;
type LeadPriority = AnyLead['priority'];
type ListingLeadFilter = 'all' | 'internal' | 'social' | 'portal' | 'attention';
type ListingLeadOwnershipFilter = 'all' | 'owner' | 'team' | 'unassigned';
type LeadView = 'pipeline' | 'list';
type LeadToggleItem<K extends string> = { key: K; label: string; disabled?: boolean };

const LEAD_STAGE_OPTIONS: Array<{ key: AnyLead['status']; label: string }> = [
    { key: 'new', label: 'Nuevos' },
    { key: 'contacted', label: 'Contactados' },
    { key: 'qualified', label: 'Calificados' },
    { key: 'closed', label: 'Cerrados' },
];

export default function ReportesPage() {
    return (
        <AdminProtectedPage>
            {() => <LeadsContent />}
        </AdminProtectedPage>
    );
}

function LeadsContent() {
    const [tab, setTab] = useState<LeadTab>('publicaciones');
    const [leadView, setLeadView] = useState<LeadView>('pipeline');
    const [listingFilter, setListingFilter] = useState<ListingLeadFilter>('all');
    const [ownershipFilter, setOwnershipFilter] = useState<ListingLeadOwnershipFilter>('all');
    const [query, setQuery] = useState('');
    const [serviceItems, setServiceItems] = useState<AdminServiceLead[]>([]);
    const [listingItems, setListingItems] = useState<AdminListingLead[]>([]);
    const [serviceLoading, setServiceLoading] = useState(true);
    const [listingLoading, setListingLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [serviceDetail, setServiceDetail] = useState<AdminServiceLeadDetail | null>(null);
    const [listingDetail, setListingDetail] = useState<AdminListingLeadDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [statusValue, setStatusValue] = useState<AnyLead['status']>('new');
    const [priorityValue, setPriorityValue] = useState<LeadPriority>('medium');
    const [closeReasonValue, setCloseReasonValue] = useState('');
    const [tagsValue, setTagsValue] = useState('');
    const [assignedToValue, setAssignedToValue] = useState('');
    const [nextTaskTitle, setNextTaskTitle] = useState('');
    const [nextTaskAt, setNextTaskAt] = useState('');
    const [noteBody, setNoteBody] = useState('');
    const [saving, setSaving] = useState(false);
    const [addingNote, setAddingNote] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragLeadId, setDragLeadId] = useState<string | null>(null);
    const [dropStage, setDropStage] = useState<AnyLead['status'] | null>(null);
    const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
    const [actioningLeadId, setActioningLeadId] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        void (async () => {
            const [services, listingLeads] = await Promise.all([fetchAdminServiceLeads(), fetchAdminListingLeads()]);
            if (!active) return;
            setServiceItems(services);
            setListingItems(listingLeads);
            setServiceLoading(false);
            setListingLoading(false);
        })();
        return () => {
            active = false;
        };
    }, []);

    const activeLoading = tab === 'publicaciones' ? listingLoading : serviceLoading;
    const listingFilterStats = useMemo(() => ({
        all: listingItems.length,
        internal: listingItems.filter((item) => matchesListingLeadFilter(item, 'internal')).length,
        social: listingItems.filter((item) => matchesListingLeadFilter(item, 'social')).length,
        portal: listingItems.filter((item) => matchesListingLeadFilter(item, 'portal')).length,
        attention: listingItems.filter((item) => matchesListingLeadFilter(item, 'attention')).length,
    }), [listingItems]);
    const ownershipFilterStats = useMemo(() => ({
        all: listingItems.length,
        owner: listingItems.filter((item) => matchesListingLeadOwnershipFilter(item, 'owner')).length,
        team: listingItems.filter((item) => matchesListingLeadOwnershipFilter(item, 'team')).length,
        unassigned: listingItems.filter((item) => matchesListingLeadOwnershipFilter(item, 'unassigned')).length,
    }), [listingItems]);

    const filtered = useMemo(() => {
        const scopedItems = tab === 'publicaciones'
            ? listingItems
                .filter((item) => matchesListingLeadOwnershipFilter(item, ownershipFilter))
                .filter((item) => matchesListingLeadFilter(item, listingFilter))
            : serviceItems;
        const normalized = query.trim().toLowerCase();
        if (!normalized) return scopedItems;
        return scopedItems.filter((item) =>
            item.contactName.toLowerCase().includes(normalized)
            || item.contactEmail.toLowerCase().includes(normalized)
            || summarizeLead(item).toLowerCase().includes(normalized)
        );
    }, [listingFilter, listingItems, ownershipFilter, query, serviceItems, tab]);

    useEffect(() => {
        if (filtered.length === 0) {
            setSelectedId(null);
            setServiceDetail(null);
            setListingDetail(null);
            return;
        }
        if (selectedId && !filtered.some((item) => item.id === selectedId)) {
            setSelectedId(null);
            setServiceDetail(null);
            setListingDetail(null);
        }
    }, [filtered, selectedId]);

    const pipelineStages = useMemo(() => buildLeadPipeline(filtered), [filtered]);

    useEffect(() => {
        if (!selectedId) {
            setServiceDetail(null);
            setListingDetail(null);
            return;
        }
        let active = true;
        setDetailLoading(true);
        setError(null);
        setMessage(null);
        void (async () => {
            if (tab === 'publicaciones') {
                const detail = await fetchAdminListingLeadDetail(selectedId);
                if (!active) return;
                setListingDetail(detail);
                setServiceDetail(null);
                if (detail) hydrate(detail.item);
            } else {
                const detail = await fetchAdminServiceLeadDetail(selectedId);
                if (!active) return;
                setServiceDetail(detail);
                setListingDetail(null);
                if (detail) hydrate(detail.item);
            }
            setDetailLoading(false);
        })();
        return () => {
            active = false;
        };
    }, [selectedId, tab]);

    function hydrate(item: AnyLead) {
        setStatusValue(item.status);
        setPriorityValue(item.priority);
        setCloseReasonValue(item.closeReason ?? '');
        setTagsValue(item.tags.join(', '));
        setAssignedToValue(item.assignedToValue ?? '');
        setNextTaskTitle(item.nextTaskTitle ?? '');
        setNextTaskAt(toDateTimeLocalValue(item.nextTaskAt));
    }

    async function refreshLeadDetail(leadId: string) {
        if (tab === 'publicaciones') {
            const detail = await fetchAdminListingLeadDetail(leadId);
            setListingDetail(detail);
            if (detail) hydrate(detail.item);
            return;
        }

        const detail = await fetchAdminServiceLeadDetail(leadId);
        setServiceDetail(detail);
        if (detail) hydrate(detail.item);
    }

    async function handleStageChange(leadId: string, nextStatus: AnyLead['status']) {
        const current = (tab === 'publicaciones' ? listingItems : serviceItems).find((item) => item.id === leadId);
        if (!current || current.status === nextStatus) {
            setDragLeadId(null);
            setDropStage(null);
            return;
        }

        setUpdatingLeadId(leadId);
        setMessage(null);
        setError(null);

        if (tab === 'publicaciones') {
            const result = await updateAdminListingLeadStatus(leadId, { status: nextStatus });
            if (!result.ok || !result.item) {
                setUpdatingLeadId(null);
                setDragLeadId(null);
                setDropStage(null);
                setError(result.error || 'No pudimos mover el lead.');
                return;
            }
            setListingItems((currentItems) => currentItems.map((item) => item.id === result.item!.id ? result.item! : item));
        } else {
            const result = await updateAdminServiceLeadStatus(leadId, { status: nextStatus });
            if (!result.ok || !result.item) {
                setUpdatingLeadId(null);
                setDragLeadId(null);
                setDropStage(null);
                setError(result.error || 'No pudimos mover el lead.');
                return;
            }
            setServiceItems((currentItems) => currentItems.map((item) => item.id === result.item!.id ? result.item! : item));
        }

        if (selectedId === leadId) {
            await refreshLeadDetail(leadId);
        }

        setStatusValue(nextStatus);
        setMessage('Etapa actualizada.');
        setUpdatingLeadId(null);
        setDragLeadId(null);
        setDropStage(null);
    }

    async function handleQuickAction(lead: AnyLead, action: AdminLeadQuickAction) {
        setActioningLeadId(lead.id);
        setMessage(null);
        setError(null);

        const targetHref = getLeadActionHref(lead, action);
        const result = 'listing' in lead
            ? await runAdminListingLeadQuickAction(lead.id, action)
            : await runAdminServiceLeadQuickAction(lead.id, action);

        if (targetHref) {
            openLeadActionHref(targetHref);
        }

        setActioningLeadId(null);

        if (!result.ok || !result.item) {
            setError(result.error || 'No pudimos registrar la acción.');
            return;
        }

        if ('listing' in lead) {
            const nextItem = result.item as AdminListingLead;
            setListingItems((current) => current.map((item) => item.id === nextItem.id ? nextItem : item));
        } else {
            const nextItem = result.item as AdminServiceLead;
            setServiceItems((current) => current.map((item) => item.id === nextItem.id ? nextItem : item));
        }

        if (selectedId === lead.id) {
            await refreshLeadDetail(lead.id);
        }

        setMessage(result.actionLabel ? `${result.actionLabel} registrada.` : 'Acción registrada.');
    }

    async function handleSave() {
        if (!selectedId) return;
        setSaving(true);
        setMessage(null);
        setError(null);

        const assignment = parseLeadAssigneeSelection(assignedToValue);

        const payload = {
            status: statusValue,
            priority: priorityValue,
            closeReason: closeReasonValue.trim() || null,
            tags: tagsValue.split(',').map((item) => item.trim()).filter(Boolean),
            nextTaskTitle: nextTaskTitle.trim() || null,
            nextTaskAt: nextTaskAt ? new Date(nextTaskAt).toISOString() : null,
        };

        if (tab === 'publicaciones') {
            const result = await updateAdminListingLeadStatus(selectedId, {
                ...payload,
                assignedToUserId: assignment.assignedToUserId,
                assignedToTeamMemberId: assignment.assignedToTeamMemberId,
            });
            setSaving(false);
            if (!result.ok || !result.item) {
                setError(result.error || 'No pudimos actualizar el lead.');
                return;
            }
            setListingItems((current) => current.map((item) => item.id === result.item!.id ? result.item! : item));
            await refreshLeadDetail(selectedId);
        } else {
            const result = await updateAdminServiceLeadStatus(selectedId, {
                ...payload,
                assignedToUserId: assignment.assignedToUserId,
            });
            setSaving(false);
            if (!result.ok || !result.item) {
                setError(result.error || 'No pudimos actualizar el lead.');
                return;
            }
            setServiceItems((current) => current.map((item) => item.id === result.item!.id ? result.item! : item));
            await refreshLeadDetail(selectedId);
        }

        setMessage('Lead actualizado.');
    }

    async function handleAddNote(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selectedId || !noteBody.trim()) return;
        setAddingNote(true);
        setMessage(null);
        setError(null);

        if (tab === 'publicaciones') {
            const result = await addAdminListingLeadNote(selectedId, noteBody.trim());
            setAddingNote(false);
            if (!result.ok || !result.item) {
                setError(result.error || 'No pudimos guardar la nota.');
                return;
            }
            setListingItems((current) => current.map((item) => item.id === result.item!.id ? result.item! : item));
            await refreshLeadDetail(selectedId);
        } else {
            const result = await addAdminServiceLeadNote(selectedId, noteBody.trim());
            setAddingNote(false);
            if (!result.ok || !result.item) {
                setError(result.error || 'No pudimos guardar la nota.');
                return;
            }
            setServiceItems((current) => current.map((item) => item.id === result.item!.id ? result.item! : item));
            await refreshLeadDetail(selectedId);
        }

        setNoteBody('');
        setMessage('Nota guardada.');
    }

    const detail = tab === 'publicaciones' ? listingDetail : serviceDetail;
    const detailVisible = Boolean(selectedId);
    const closeLeadDetail = () => {
        setSelectedId(null);
        setListingDetail(null);
        setServiceDetail(null);
        setMessage(null);
        setError(null);
    };

    return (
        <>
            <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>Leads</h1>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Vista global por cuenta, canal y etapa comercial</p>
                </div>
            </div>

            <div className="mb-6 rounded-[18px] border px-3 py-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                <div className="space-y-2.5">
                    <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-col gap-2.5">
                            <LeadToggleGroup
                                items={[
                                    { key: 'publicaciones', label: 'Publicaciones' },
                                    { key: 'servicios', label: 'Servicios asistidos' },
                                ]}
                                value={tab}
                                onChange={(key) => setTab(key as LeadTab)}
                                ariaLabel="Origen del lead"
                                nowrap
                            />
                            {tab === 'publicaciones' ? (
                                <LeadToggleGroup
                                    items={[
                                        { key: 'all', label: `Todos ${ownershipFilterStats.all}` },
                                        { key: 'owner', label: `Cuenta principal ${ownershipFilterStats.owner}` },
                                        { key: 'team', label: `Equipo ${ownershipFilterStats.team}` },
                                        { key: 'unassigned', label: `Sin asignar ${ownershipFilterStats.unassigned}` },
                                    ]}
                                    value={ownershipFilter}
                                    onChange={(key) => setOwnershipFilter(key as ListingLeadOwnershipFilter)}
                                    ariaLabel="Ownership del lead"
                                    nowrap
                                />
                            ) : null}
                        </div>
                        <div className="flex w-full items-center justify-end gap-2 lg:max-w-[410px]">
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Buscar contacto"
                                className="form-input h-10 w-full text-sm"
                            />
                            <LeadViewToggle value={leadView} onChange={setLeadView} />
                        </div>
                    </div>
                    {tab === 'publicaciones' ? (
                        <LeadToggleGroup
                            items={[
                                { key: 'all', label: `Todos ${listingFilterStats.all}` },
                                { key: 'internal', label: `Directos ${listingFilterStats.internal}` },
                                { key: 'social', label: `Redes ${listingFilterStats.social}` },
                                { key: 'portal', label: `Marketplace ${listingFilterStats.portal}` },
                                { key: 'attention', label: `Por atender ${listingFilterStats.attention}` },
                            ]}
                            value={listingFilter}
                            onChange={(key) => setListingFilter(key as ListingLeadFilter)}
                            ariaLabel="Canal del lead"
                            nowrap
                        />
                    ) : null}
                </div>
            </div>

            <div>
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                    {activeLoading ? (
                        <div className="px-4 py-6 text-sm" style={{ color: 'var(--fg-muted)' }}>Cargando leads...</div>
                    ) : filtered.length === 0 ? (
                        <div className="px-4 py-6 text-sm" style={{ color: 'var(--fg-muted)' }}>Todavía no hay leads para ese filtro.</div>
                    ) : leadView === 'list' ? (
                        <>
                            <div className="grid grid-cols-[1fr_auto] gap-3 px-4 py-2.5 text-xs font-medium uppercase tracking-wider" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                <span>Contactos</span>
                                <span>Etapa</span>
                            </div>
                            {filtered.map((lead, index) => {
                                const selected = lead.id === selectedId;
                                return (
                                    <div
                                        key={lead.id}
                                        className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-3.5 text-left"
                                        style={{
                                            borderTop: index ? '1px solid var(--border)' : 'none',
                                            background: selected ? 'var(--bg-subtle)' : 'var(--surface)',
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedId(lead.id);
                                                setMessage(null);
                                                setError(null);
                                            }}
                                            className="min-w-0 text-left"
                                        >
                                            <p className="truncate text-sm font-medium" style={{ color: 'var(--fg)' }}>{lead.contactName}</p>
                                            <p className="mt-1 truncate text-xs" style={{ color: 'var(--fg-secondary)' }}>{simpleLeadListLabel(lead)}</p>
                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                                {'source' in lead ? <LeadSourceInline lead={lead} /> : null}
                                                <span>{lead.createdAgo}</span>
                                                {adminLeadOwnerLabel(lead) ? <span className="truncate">{adminLeadOwnerLabel(lead)}</span> : null}
                                            </div>
                                        </button>
                                        <div className="flex flex-col items-end gap-1.5">
                                            <LeadQuickActions
                                                lead={lead}
                                                compact
                                                busy={actioningLeadId === lead.id}
                                                onAction={(action) => void handleQuickAction(lead, action)}
                                            />
                                            <LeadStageSelect
                                                value={lead.status}
                                                disabled={updatingLeadId === lead.id || actioningLeadId === lead.id}
                                                onChange={(nextStatus) => void handleStageChange(lead.id, nextStatus)}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    ) : (
                        <div className="overflow-x-auto px-1 py-1">
                            <div className="grid min-w-[760px] gap-3 xl:grid-cols-4">
                                {pipelineStages.map((stage) => (
                                    <div
                                        key={stage.key}
                                        className="rounded-[18px] border transition-colors"
                                        onDragOver={(event) => {
                                            if (!dragLeadId) return;
                                            event.preventDefault();
                                            setDropStage(stage.key);
                                        }}
                                        onDragLeave={() => {
                                            setDropStage((current) => current === stage.key ? null : current);
                                        }}
                                        onDrop={(event) => {
                                            event.preventDefault();
                                            if (!dragLeadId) return;
                                            void handleStageChange(dragLeadId, stage.key);
                                        }}
                                        style={{
                                            borderColor: dropStage === stage.key ? 'var(--fg)' : 'var(--border)',
                                            background: dropStage === stage.key ? 'var(--bg)' : 'var(--bg-subtle)',
                                        }}
                                    >
                                        <div className="border-b px-3 py-3" style={{ borderColor: 'var(--border)' }}>
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{stage.label}</p>
                                                    <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{stage.count} lead{stage.count === 1 ? '' : 's'}</p>
                                                </div>
                                                <PanelStatusBadge label={String(stage.count)} tone={crmStageTone(stage.key)} />
                                            </div>
                                        </div>
                                        <div className="space-y-2 p-2">
                                            {stage.items.length === 0 ? (
                                                <div className="rounded-[14px] border border-dashed px-3 py-4 text-center text-xs" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                                                    Sin leads en esta etapa
                                                </div>
                                            ) : stage.items.map((lead) => {
                                                const selected = lead.id === selectedId;
                                                return (
                                                    <div
                                                        key={lead.id}
                                                        draggable={updatingLeadId !== lead.id}
                                                        onDragStart={(event: DragEvent<HTMLDivElement>) => {
                                                            event.dataTransfer.effectAllowed = 'move';
                                                            setDragLeadId(lead.id);
                                                            setDropStage(null);
                                                        }}
                                                        onDragEnd={() => {
                                                            setDragLeadId(null);
                                                            setDropStage(null);
                                                        }}
                                                        className="rounded-[14px] border px-3 py-3 text-left"
                                                        style={{
                                                            borderColor: selected ? 'var(--fg)' : 'var(--border)',
                                                            background: selected ? 'var(--bg)' : 'var(--surface)',
                                                            opacity: updatingLeadId === lead.id ? 0.65 : 1,
                                                            cursor: updatingLeadId === lead.id ? 'progress' : 'grab',
                                                        }}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedId(lead.id);
                                                                setMessage(null);
                                                                setError(null);
                                                            }}
                                                            className="w-full text-left"
                                                        >
                                                            <p className="truncate text-sm font-medium" style={{ color: 'var(--fg)' }}>{lead.contactName}</p>
                                                            <p className="mt-1 truncate text-xs" style={{ color: 'var(--fg-secondary)' }}>{simpleLeadListLabel(lead)}</p>
                                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                                                {'source' in lead ? <LeadSourceInline lead={lead} /> : null}
                                                                {adminLeadOwnerLabel(lead) ? <span className="truncate">{adminLeadOwnerLabel(lead)}</span> : null}
                                                            </div>
                                                            <p className="mt-2 text-[11px]" style={{ color: 'var(--fg-muted)' }}>{lead.createdAgo}</p>
                                                        </button>
                                                        <div className="mt-2 flex justify-end">
                                                            <LeadQuickActions
                                                                lead={lead}
                                                                compact
                                                                busy={actioningLeadId === lead.id}
                                                                onAction={(action) => void handleQuickAction(lead, action)}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

            <LeadDetailModal open={detailVisible} onClose={closeLeadDetail}>
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Detalle del lead</p>
                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Supervisión operativa y seguimiento comercial</p>
                            </div>
                            <button
                                type="button"
                                onClick={closeLeadDetail}
                                className="rounded-full border px-3 py-1.5 text-xs font-medium"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)', background: 'var(--surface)' }}
                            >
                                Cerrar
                            </button>
                        </div>
                        {detailLoading || !detail ? (
                            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Cargando detalle...</p>
                        ) : (
                            <div className="space-y-5">
                            <div className="rounded-[20px] border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                                <div className="flex flex-col gap-3">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <p className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>{detail.item.contactName}</p>
                                            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{summarizeLead(detail.item)}</p>
                                            {adminLeadOwnerLabel(detail.item) ? (
                                                <p className="mt-2 text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>
                                                    {adminLeadOwnerLabel(detail.item)}
                                                </p>
                                            ) : null}
                                        </div>
                                        <div className="flex flex-col gap-2 lg:items-end">
                                            <div className="flex flex-wrap items-center gap-2 whitespace-nowrap">
                                                <PanelStatusBadge label={detail.item.statusLabel} tone={crmStatusTone(detail.item.status)} />
                                                <PanelStatusBadge label={detail.item.priorityLabel} tone={crmPriorityTone(detail.item.priority)} />
                                                {detail.item.attentionLabel ? <PanelStatusBadge label={detail.item.attentionLabel} tone={crmAttentionTone(detail.item.attentionLevel)} /> : null}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--fg-muted)' }}>Etapa</span>
                                                <LeadStageSelect
                                                    value={statusValue}
                                                    disabled={updatingLeadId === detail.item.id}
                                                    onChange={(nextStatus) => void handleStageChange(detail.item.id, nextStatus)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-medium uppercase tracking-[0.16em]" style={{ color: 'var(--fg-muted)' }}>Contacto</p>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <LeadInfoItem icon={IconUser} label="Nombre" value={detail.item.contactName} />
                                        <LeadInfoItem icon={IconMail} label="Correo" value={detail.item.contactEmail} />
                                        <LeadInfoItem icon={IconPhone} label="Teléfono" value={detail.item.contactPhone || 'Sin teléfono'} />
                                        {'contactWhatsapp' in detail.item ? (
                                            <LeadInfoItem icon={IconBrandWhatsapp} label="WhatsApp" value={detail.item.contactWhatsapp || 'Sin WhatsApp'} />
                                        ) : null}
                                    </div>
                                    {detail.item.slaSignals.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {detail.item.slaSignals.map((signal) => (
                                                <PanelStatusBadge key={`${detail.item.id}-${signal.key}`} label={signal.label} tone={crmAttentionTone(signal.tone)} />
                                            ))}
                                        </div>
                                    ) : null}
                                    <LeadQuickActions
                                        lead={detail.item}
                                        busy={actioningLeadId === detail.item.id}
                                        onAction={(action) => void handleQuickAction(detail.item, action)}
                                    />
                                    {'thread' in detail && detail.thread?.id ? (
                                        <span className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--fg-secondary)' }}>
                                            <IconMessageCircle size={15} />
                                            Conversación activa vinculada
                                        </span>
                                    ) : null}
                                </div>
                            </div>

                            <LeadAccordionSection title="Origen y contexto" subtitle="Cómo llegó el lead y a qué aviso o servicio pertenece." defaultOpen>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {'listing' in detail.item ? (
                                        <>
                                            <LeadInfoItem icon={leadSourceVisual(detail.item).Icon} label="Llegada" value={detail.item.sourceLabel} />
                                            <LeadInfoItem icon={IconWorld} label="Canal" value={detail.item.channelLabel} />
                                            <LeadInfoItem icon={IconHome} label="Publicación" value={detail.item.listing?.title || 'Publicación no disponible'} />
                                            <LeadInfoItem icon={IconUser} label="Cuenta" value={detail.item.owner ? `${detail.item.owner.name} · ${detail.item.owner.email}` : 'Sin propietario'} />
                                            <LeadInfoItem icon={IconLink} label="Referencia" value={detail.item.sourcePage || detail.item.listing?.href || 'Sin referencia'} mono />
                                            {'externalSourceId' in detail.item && detail.item.externalSourceId ? (
                                                <LeadInfoItem icon={IconFileDescription} label="ID externo" value={detail.item.externalSourceId} mono />
                                            ) : null}
                                        </>
                                    ) : (
                                        <>
                                            <LeadInfoItem icon={IconFileDescription} label="Servicio" value={detail.item.serviceLabel} />
                                            <LeadInfoItem icon={IconTag} label="Plan" value={detail.item.planId === 'premium' ? 'Premium' : 'Básico'} />
                                            <LeadInfoItem icon={IconHome} label="Activo" value={summarizeLead(detail.item)} />
                                            <LeadInfoItem icon={IconLink} label="Origen" value={detail.item.sourcePage || 'Formulario web'} mono />
                                        </>
                                    )}
                                    <LeadInfoItem icon={IconClockHour4} label="Última gestión" value={detail.item.lastActivityAgo} />
                                    {detail.item.closeReason ? <LeadInfoItem icon={IconFileDescription} label="Motivo de cierre" value={detail.item.closeReason} /> : null}
                                </div>
                                {detail.item.tags.length > 0 ? (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {detail.item.tags.map((tag) => (
                                            <span key={tag} className="rounded-full px-2.5 py-1 text-xs" style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}>
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                                {'message' in detail.item && detail.item.message ? (
                                    <div className="mt-3 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg-secondary)' }}>
                                        {detail.item.message}
                                    </div>
                                ) : null}
                            </LeadAccordionSection>

                            <LeadAccordionSection title="Gestión comercial" subtitle="Estado, responsable y próxima tarea." defaultOpen>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="space-y-1.5">
                                        <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Estado</span>
                                        <select className="form-select h-10 text-sm" value={statusValue} onChange={(event) => setStatusValue(event.target.value as AnyLead['status'])}>
                                            <option value="new">Nuevo</option>
                                            <option value="contacted">Contactado</option>
                                            <option value="qualified">Calificado</option>
                                            <option value="closed">Cerrado</option>
                                        </select>
                                    </label>
                                    <label className="space-y-1.5">
                                        <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Prioridad</span>
                                        <select className="form-select h-10 text-sm" value={priorityValue} onChange={(event) => setPriorityValue(event.target.value as LeadPriority)}>
                                            <option value="low">Baja</option>
                                            <option value="medium">Media</option>
                                            <option value="high">Alta</option>
                                        </select>
                                    </label>
                                    <label className="space-y-1.5">
                                        <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Asignado a</span>
                                        <select className="form-select h-10 text-sm" value={assignedToValue} onChange={(event) => setAssignedToValue(event.target.value)}>
                                            <option value="">Sin asignar</option>
                                            {detail.assignees.map((assignee) => (
                                                <option key={assignee.value} value={assignee.value}>{formatLeadAssigneeLabel(assignee)}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="space-y-1.5">
                                        <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Etiquetas</span>
                                        <input className="form-input h-10 text-sm" value={tagsValue} onChange={(event) => setTagsValue(event.target.value)} placeholder="ej. premium, llamado hoy" />
                                    </label>
                                    <label className="space-y-1.5 sm:col-span-2">
                                        <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Motivo de cierre</span>
                                        <input className="form-input h-10 text-sm" value={closeReasonValue} onChange={(event) => setCloseReasonValue(event.target.value)} placeholder="ej. no calificó financieramente" />
                                    </label>
                                    <label className="space-y-1.5 sm:col-span-2">
                                        <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Próxima tarea</span>
                                        <input className="form-input h-10 text-sm" value={nextTaskTitle} onChange={(event) => setNextTaskTitle(event.target.value)} placeholder="Ej. Reasignar al ejecutivo de turno" />
                                    </label>
                                    <label className="space-y-1.5">
                                        <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Fecha y hora</span>
                                        <input className="form-input h-10 text-sm" type="datetime-local" value={nextTaskAt} onChange={(event) => setNextTaskAt(event.target.value)} />
                                    </label>
                                    <div className="flex items-end">
                                        <PanelButton variant="primary" onClick={() => void handleSave()} disabled={saving} className="w-full sm:w-auto">
                                            {saving ? 'Guardando...' : 'Guardar cambios'}
                                        </PanelButton>
                                    </div>
                                </div>
                            </LeadAccordionSection>

                            <LeadAccordionSection title="Notas internas" subtitle="Registro de gestión del equipo.">
                                <form className="space-y-3" onSubmit={(event) => void handleAddNote(event)}>
                                    <textarea className="form-textarea min-h-28 text-sm" value={noteBody} onChange={(event) => setNoteBody(event.target.value)} placeholder="Ej. Cliente calificado y derivado al ejecutivo de RM." />
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-xs" style={{ color: error ? '#b91c1c' : 'var(--fg-muted)' }}>
                                            {error || message || 'Cada cambio se registra en el timeline.'}
                                        </div>
                                        <PanelButton type="submit" disabled={addingNote || !noteBody.trim()}>
                                            {addingNote ? 'Guardando...' : 'Agregar nota'}
                                        </PanelButton>
                                    </div>
                                </form>
                            </LeadAccordionSection>

                            <LeadAccordionSection title="Timeline" subtitle="Actividad completa del lead.">
                                {detail.activities.length === 0 ? (
                                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Todavía no hay actividad registrada.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {detail.activities.map((activity) => (
                                            <ActivityCard key={activity.id} activity={activity} />
                                        ))}
                                    </div>
                                )}
                            </LeadAccordionSection>
                            </div>
                        )}
            </LeadDetailModal>
            </div>
        </>
    );
}

function LeadDetailModal(props: {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
}) {
    useEffect(() => {
        if (!props.open) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') props.onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [props.open, props.onClose]);

    if (!props.open) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-5">
            <button
                type="button"
                aria-label="Cerrar detalle"
                onClick={props.onClose}
                className="absolute inset-0"
                style={{ background: 'rgba(15, 23, 42, 0.44)', backdropFilter: 'blur(8px)' }}
            />
            <div
                className="relative z-[1] w-full max-w-[1100px] max-h-[calc(100vh-2.5rem)] overflow-hidden rounded-[28px] border shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
                <div className="max-h-[calc(100vh-2.5rem)] overflow-y-auto p-5 sm:p-6">
                    {props.children}
                </div>
            </div>
        </div>
    );
}

function summarizeLead(lead: AnyLead): string {
    if ('listing' in lead) {
        return `${lead.sourceLabel} · ${lead.listing?.title ?? 'Publicación sin detalle'}`;
    }
    return [
        lead.serviceLabel,
        lead.assetType,
        lead.assetBrand,
        lead.assetModel,
        lead.assetYear,
        lead.assetArea,
    ].filter(Boolean).join(' · ');
}

function simpleLeadListLabel(lead: AnyLead): string {
    if ('listing' in lead) {
        return lead.listing?.title ?? lead.sourceLabel;
    }
    return lead.serviceLabel;
}

function adminLeadOwnerLabel(lead: AnyLead): string | null {
    if ('listing' in lead) {
        return lead.owner ? `Cuenta: ${lead.owner.name}` : 'Cuenta sin propietario';
    }
    return `${lead.vertical === 'autos' ? 'Autos' : 'Propiedades'} · ${lead.serviceLabel}`;
}

function parseLeadAssigneeSelection(value: string): {
    assignedToUserId: string | null;
    assignedToTeamMemberId: string | null;
} {
    if (!value) {
        return {
            assignedToUserId: null,
            assignedToTeamMemberId: null,
        };
    }

    const [kind, id] = value.split(':');
    if (!id) {
        return {
            assignedToUserId: null,
            assignedToTeamMemberId: null,
        };
    }

    if (kind === 'team_member') {
        return {
            assignedToUserId: null,
            assignedToTeamMemberId: id,
        };
    }

    return {
        assignedToUserId: id,
        assignedToTeamMemberId: null,
    };
}

function formatLeadAssigneeLabel(assignee: AdminLeadAssignee): string {
    const suffix = assignee.kind === 'team_member'
        ? assignee.roleTitle || 'Asesor'
        : assignee.roleTitle || 'Cuenta principal';
    return `${assignee.name} · ${suffix}`;
}

function buildLeadPipeline(items: AnyLead[]) {
    return ([
        { key: 'new', label: 'Nuevos' },
        { key: 'contacted', label: 'Contactados' },
        { key: 'qualified', label: 'Calificados' },
        { key: 'closed', label: 'Cerrados' },
    ] as const).map((stage) => ({
        ...stage,
        count: items.filter((item) => item.status === stage.key).length,
        items: items.filter((item) => item.status === stage.key),
    }));
}

function leadSourceVisual(lead: AdminListingLead) {
    if (lead.source === 'instagram') return { Icon: IconBrandInstagram, label: lead.sourceLabel };
    if (lead.source === 'facebook') return { Icon: IconBrandFacebook, label: lead.sourceLabel };
    if (lead.channel === 'portal') return { Icon: IconBuildingStore, label: lead.sourceLabel };
    if (lead.channel === 'social') return { Icon: IconWorld, label: lead.sourceLabel };
    if (lead.source === 'whatsapp') return { Icon: IconBrandWhatsapp, label: lead.sourceLabel };
    return { Icon: IconMessageCircle, label: lead.sourceLabel };
}

function LeadSourceInline(props: { lead: AdminListingLead }) {
    const { Icon, label } = leadSourceVisual(props.lead);
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
            <Icon size={12} />
            {label}
        </span>
    );
}

function LeadToggleGroup<K extends string>(props: {
    items: Array<LeadToggleItem<K>>;
    value: K;
    onChange: (key: K) => void;
    ariaLabel: string;
    nowrap?: boolean;
}) {
    return (
        <div
            className={`flex gap-2 ${props.nowrap ? 'flex-nowrap overflow-x-auto' : 'flex-wrap'}`}
            aria-label={props.ariaLabel}
        >
            {props.items.map((item) => {
                const active = item.key === props.value;
                return (
                    <button
                        key={item.key}
                        type="button"
                        onClick={() => props.onChange(item.key)}
                        disabled={item.disabled}
                        className="inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[13px] font-medium transition"
                        style={{
                            borderColor: active ? 'var(--fg)' : 'var(--bg-muted)',
                            background: active ? 'var(--fg)' : 'transparent',
                            color: active ? 'var(--bg)' : 'var(--fg-muted)',
                            opacity: item.disabled ? 0.45 : 1,
                        }}
                    >
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
}

function LeadViewToggle(props: { value: LeadView; onChange: (value: LeadView) => void }) {
    return (
        <div className="inline-flex items-center gap-1 rounded-full border p-1" style={{ borderColor: 'var(--bg-muted)', background: 'transparent' }}>
            <button
                type="button"
                onClick={() => props.onChange('pipeline')}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full transition"
                title="Vista embudo"
                style={{
                    background: props.value === 'pipeline' ? 'var(--fg)' : 'transparent',
                    color: props.value === 'pipeline' ? 'var(--bg)' : 'var(--fg-muted)',
                }}
            >
                <IconLayoutGrid size={18} />
            </button>
            <button
                type="button"
                onClick={() => props.onChange('list')}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full transition"
                title="Vista lista"
                style={{
                    background: props.value === 'list' ? 'var(--fg)' : 'transparent',
                    color: props.value === 'list' ? 'var(--bg)' : 'var(--fg-muted)',
                }}
            >
                <IconList size={18} />
            </button>
        </div>
    );
}

function LeadStageSelect(props: {
    value: AnyLead['status'];
    onChange: (status: AnyLead['status']) => void;
    disabled?: boolean;
}) {
    return (
        <select
            className="form-select h-9 min-w-[132px] text-xs"
            value={props.value}
            disabled={props.disabled}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => props.onChange(event.target.value as AnyLead['status'])}
        >
            {LEAD_STAGE_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>{option.label}</option>
            ))}
        </select>
    );
}

function normalizeContactPhone(value: string | null | undefined): string | null {
    if (!value) return null;
    const sanitized = value.replace(/[^\d+]/g, '').trim();
    return sanitized || null;
}

function normalizeWhatsappPhone(value: string | null | undefined): string | null {
    if (!value) return null;
    const sanitized = value.replace(/\D/g, '').trim();
    return sanitized || null;
}

function getLeadActionHref(lead: AnyLead, action: AdminLeadQuickAction): string | null {
    if (action === 'call') {
        const phone = normalizeContactPhone(lead.contactPhone);
        return phone ? `tel:${phone}` : null;
    }

    if (action === 'whatsapp') {
        const whatsapp = normalizeWhatsappPhone(lead.contactWhatsapp || lead.contactPhone);
        return whatsapp ? `https://wa.me/${whatsapp}` : null;
    }

    if (action === 'email') {
        return lead.contactEmail ? `mailto:${lead.contactEmail}` : null;
    }

    return null;
}

function openLeadActionHref(href: string) {
    if (href.startsWith('mailto:') || href.startsWith('tel:')) {
        window.location.assign(href);
        return;
    }

    window.open(href, '_blank', 'noopener,noreferrer');
}

function LeadQuickActions(props: {
    lead: AnyLead;
    onAction: (action: AdminLeadQuickAction) => void;
    compact?: boolean;
    busy?: boolean;
}) {
    const actions: Array<{
        key: AdminLeadQuickAction;
        label: string;
        Icon: typeof IconPhone;
        disabled: boolean;
    }> = [
        {
            key: 'call',
            label: 'Llamar',
            Icon: IconPhone,
            disabled: !getLeadActionHref(props.lead, 'call'),
        },
        {
            key: 'whatsapp',
            label: 'WhatsApp',
            Icon: IconBrandWhatsapp,
            disabled: !getLeadActionHref(props.lead, 'whatsapp'),
        },
        {
            key: 'email',
            label: 'Correo',
            Icon: IconMail,
            disabled: !getLeadActionHref(props.lead, 'email'),
        },
        {
            key: 'follow_up',
            label: 'Seguimiento',
            Icon: IconClockHour4,
            disabled: false,
        },
    ];

    return (
        <div className={`flex flex-wrap items-center gap-2 ${props.compact ? 'justify-end' : ''}`}>
            {actions.map(({ key, label, Icon, disabled }) => (
                <button
                    key={key}
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        props.onAction(key);
                    }}
                    disabled={disabled || props.busy}
                    title={label}
                    className={`inline-flex items-center rounded-full border transition ${props.compact ? 'h-8 w-8 justify-center' : 'gap-2 px-3 py-2 text-xs font-medium'}`}
                    style={{
                        borderColor: 'var(--border)',
                        background: 'var(--surface)',
                        color: disabled ? 'var(--fg-muted)' : 'var(--fg-secondary)',
                        opacity: disabled || props.busy ? 0.45 : 1,
                    }}
                >
                    <Icon size={15} />
                    {!props.compact ? label : null}
                </button>
            ))}
        </div>
    );
}

function LeadInfoItem(props: { icon: typeof IconUser; label: string; value: string | null; mono?: boolean }) {
    if (!props.value) return null;
    const Icon = props.icon;
    return (
        <div className="rounded-[18px] border px-3.5 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}>
                    <Icon size={16} />
                </span>
                <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em]" style={{ color: 'var(--fg-muted)' }}>{props.label}</p>
                    <p className={`mt-1.5 text-sm font-medium ${props.mono ? 'font-mono text-[13px]' : ''}`} style={{ color: 'var(--fg)', wordBreak: 'break-word' }}>
                        {props.value}
                    </p>
                </div>
            </div>
        </div>
    );
}

function LeadAccordionSection(props: { title: string; subtitle?: string; defaultOpen?: boolean; children: ReactNode }) {
    return (
        <details className="group rounded-[18px] border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }} open={props.defaultOpen}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{props.title}</p>
                    {props.subtitle ? <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{props.subtitle}</p> : null}
                </div>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full transition group-open:rotate-180" style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}>
                    <IconChevronDown size={16} />
                </span>
            </summary>
            <div className="border-t px-4 py-4" style={{ borderColor: 'var(--border)' }}>
                {props.children}
            </div>
        </details>
    );
}

function matchesListingLeadFilter(lead: AdminListingLead, filter: ListingLeadFilter): boolean {
    if (filter === 'all') return true;
    if (filter === 'attention') return lead.attentionLevel !== 'fresh';
    if (filter === 'social') return lead.channel === 'social' || lead.source === 'instagram' || lead.source === 'facebook';
    if (filter === 'portal') return lead.channel === 'portal' || lead.source === 'mercadolibre' || lead.source === 'yapo' || lead.source === 'chileautos' || lead.source === 'portal';
    return lead.source === 'internal_form'
        || lead.source === 'direct_message'
        || lead.source === 'whatsapp'
        || lead.source === 'phone_call'
        || lead.source === 'email';
}

function matchesListingLeadOwnershipFilter(lead: AdminListingLead, filter: ListingLeadOwnershipFilter): boolean {
    if (filter === 'all') return true;
    if (filter === 'unassigned') return !lead.assignedToUserId && !lead.assignedToTeamMemberId;
    if (filter === 'team') return Boolean(lead.assignedToTeamMemberId);
    return Boolean(lead.assignedToUserId);
}

function crmStatusTone(status: AnyLead['status']): 'neutral' | 'success' | 'warning' | 'info' {
    if (status === 'closed') return 'neutral';
    if (status === 'contacted' || status === 'qualified') return 'success';
    return 'info';
}

function crmStageTone(status: AnyLead['status']): 'neutral' | 'success' | 'warning' | 'info' {
    return crmStatusTone(status);
}

function crmPriorityTone(priority: LeadPriority): 'neutral' | 'success' | 'warning' | 'info' {
    if (priority === 'high') return 'warning';
    if (priority === 'low') return 'neutral';
    return 'info';
}

function crmAttentionTone(level: AnyLead['attentionLevel']): 'neutral' | 'success' | 'warning' | 'info' {
    if (level === 'urgent') return 'warning';
    if (level === 'attention') return 'info';
    return 'success';
}

function toDateTimeLocalValue(timestamp: number | null): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function ActivityCard(props: { activity: AdminServiceLeadActivity | AdminListingLeadActivity }) {
    return (
        <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{props.activity.label}</p>
                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{props.activity.createdAgo}</p>
            </div>
            <p className="mt-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>{props.activity.body}</p>
            {props.activity.actor ? (
                <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>{props.activity.actor.name}</p>
            ) : null}
        </div>
    );
}
