'use client';

import Link from 'next/link';
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
import PanelSectionHeader from '@/components/panel/panel-section-header';
import { useAuth } from '@/context/auth-context';
import {
    addCrmLeadNote,
    addCrmListingLeadNote,
    createCrmPipelineColumn,
    deleteCrmPipelineColumn,
    fetchCrmLeadDetail,
    fetchCrmLeads,
    fetchCrmListingLeadDetail,
    fetchCrmListingLeads,
    fetchCrmPipelineColumns,
    reorderCrmPipelineColumns,
    runCrmLeadQuickAction,
    runCrmListingLeadQuickAction,
    updateCrmPipelineColumn,
    updateCrmLead,
    updateCrmListingLead,
    type CrmAssignee,
    type CrmLead,
    type CrmLeadActivity,
    type CrmLeadDetail,
    type CrmPipelineColumn,
    type CrmLeadQuickAction,
    type CrmLeadPriority,
    type CrmLeadStatus,
    type CrmListingLead,
    type CrmListingLeadActivity,
    type CrmListingLeadDetail,
} from '@simple/utils';
import { fetchSubscriptionCatalog } from '@/lib/payments';
import { PanelButton, PanelCard, PanelEmptyState, PanelStatCard, PanelStatusBadge } from '@simple/ui';

type LeadTab = 'publicaciones' | 'servicios';
type AnyLead = CrmLead | CrmListingLead;
type ListingLeadFilter = 'all' | 'internal' | 'social' | 'portal' | 'attention';
type ListingLeadOwnershipFilter = 'all' | 'mine' | 'team' | 'unassigned';
type LeadView = 'pipeline' | 'list';
type LeadToggleItem<K extends string> = { key: K; label: string; disabled?: boolean };

const LEAD_STAGE_OPTIONS: Array<{ key: CrmLeadStatus; label: string }> = [
    { key: 'new', label: 'Nuevos' },
    { key: 'contacted', label: 'Contactados' },
    { key: 'qualified', label: 'Calificados' },
    { key: 'closed', label: 'Cerrados' },
];

export default function CRMPage() {
    const { user, authLoading } = useAuth();
    const [tab, setTab] = useState<LeadTab>('publicaciones');
    const [leadView, setLeadView] = useState<LeadView>('pipeline');
    const [listingFilter, setListingFilter] = useState<ListingLeadFilter>('all');
    const [ownershipFilter, setOwnershipFilter] = useState<ListingLeadOwnershipFilter>('all');
    const [query, setQuery] = useState('');
    const [serviceItems, setServiceItems] = useState<CrmLead[]>([]);
    const [listingItems, setListingItems] = useState<CrmListingLead[]>([]);
    const [serviceLoading, setServiceLoading] = useState(true);
    const [listingLoading, setListingLoading] = useState(true);
    const [pipelineColumns, setPipelineColumns] = useState<CrmPipelineColumn[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [serviceDetail, setServiceDetail] = useState<CrmLeadDetail | null>(null);
    const [listingDetail, setListingDetail] = useState<CrmListingLeadDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [statusValue, setStatusValue] = useState<CrmLeadStatus>('new');
    const [pipelineColumnIdValue, setPipelineColumnIdValue] = useState('');
    const [priorityValue, setPriorityValue] = useState<CrmLeadPriority>('medium');
    const [closeReasonValue, setCloseReasonValue] = useState('');
    const [tagsValue, setTagsValue] = useState('');
    const [assignedToValue, setAssignedToValue] = useState('');
    const [nextTaskTitle, setNextTaskTitle] = useState('');
    const [nextTaskAt, setNextTaskAt] = useState('');
    const [noteBody, setNoteBody] = useState('');
    const [saving, setSaving] = useState(false);
    const [addingNote, setAddingNote] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragLeadId, setDragLeadId] = useState<string | null>(null);
    const [dropStage, setDropStage] = useState<CrmLeadStatus | null>(null);
    const [dropColumnId, setDropColumnId] = useState<string | null>(null);
    const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
    const [actioningLeadId, setActioningLeadId] = useState<string | null>(null);
    const [crmEligible, setCrmEligible] = useState(false);
    const [eligibilityLoading, setEligibilityLoading] = useState(true);
    const [planLabel, setPlanLabel] = useState('Gratis');
    const [columnManagerOpen, setColumnManagerOpen] = useState(false);
    const [newColumnName, setNewColumnName] = useState('');
    const [newColumnStatus, setNewColumnStatus] = useState<CrmLeadStatus>('new');
    const [columnDrafts, setColumnDrafts] = useState<Record<string, { name: string; status: CrmLeadStatus }>>({});
    const [columnSaving, setColumnSaving] = useState(false);
    const [columnError, setColumnError] = useState<string | null>(null);
    const serviceTabEnabled = user?.role === 'admin' || user?.role === 'superadmin';

    useEffect(() => {
        let active = true;
        if (authLoading) return () => { active = false; };

        void (async () => {
            if (!user) {
                if (!active) return;
                setCrmEligible(false);
                setPlanLabel('Gratis');
                setEligibilityLoading(false);
                return;
            }

            if (serviceTabEnabled) {
                if (!active) return;
                setCrmEligible(true);
                setPlanLabel(user.role === 'superadmin' ? 'Empresa' : 'Pro');
                setEligibilityLoading(false);
                return;
            }

            const catalog = await fetchSubscriptionCatalog();
            if (!active) return;
            const currentPlanId = catalog?.currentSubscription?.planId ?? catalog?.freePlan?.id ?? 'free';
            const currentPlan = [catalog?.freePlan, ...(catalog?.plans ?? [])]
                .filter((item): item is NonNullable<typeof item> => Boolean(item))
                .find((item) => item.id === currentPlanId);

            setCrmEligible(Boolean(currentPlan?.crmEnabled));
            setPlanLabel(currentPlan?.name ?? 'Gratis');
            setEligibilityLoading(false);
        })();

        return () => {
            active = false;
        };
    }, [authLoading, serviceTabEnabled, user]);

    useEffect(() => {
        if (eligibilityLoading || !crmEligible) {
            setServiceItems([]);
            setListingItems([]);
            setPipelineColumns([]);
            setServiceLoading(false);
            setListingLoading(false);
            return;
        }
        let active = true;
        void (async () => {
            const [services, listingLeads, columns] = await Promise.all([
                fetchCrmLeads('autos'),
                fetchCrmListingLeads('autos'),
                fetchCrmPipelineColumns('autos'),
            ]);
            if (!active) return;
            setServiceItems(services);
            setListingItems(listingLeads);
            setPipelineColumns(sortPipelineColumns(columns));
            setServiceLoading(false);
            setListingLoading(false);
        })();
        return () => {
            active = false;
        };
    }, [crmEligible, eligibilityLoading]);

    useEffect(() => {
        setColumnDrafts(Object.fromEntries(
            pipelineColumns.map((column) => [
                column.id,
                {
                    name: column.name,
                    status: column.status,
                },
            ])
        ));
    }, [pipelineColumns]);

    useEffect(() => {
        if (!listingDetail?.item) return;
        setPipelineColumnIdValue(resolveLeadPipelineColumnId(listingDetail.item, pipelineColumns));
    }, [listingDetail, pipelineColumns]);

    useEffect(() => {
        if (!serviceTabEnabled && tab === 'servicios') {
            setTab('publicaciones');
        }
    }, [serviceTabEnabled, tab]);

    const activeLoading = tab === 'publicaciones' ? listingLoading : serviceLoading;
    const listingFilterStats = useMemo(() => ({
        all: listingItems.length,
        internal: listingItems.filter((item) => matchesListingLeadFilter(item, 'internal')).length,
        social: listingItems.filter((item) => matchesListingLeadFilter(item, 'social')).length,
        portal: listingItems.filter((item) => matchesListingLeadFilter(item, 'portal')).length,
        attention: listingItems.filter((item) => item.attentionLevel !== 'fresh').length,
    }), [listingItems]);
    const ownershipFilterStats = useMemo(() => ({
        all: listingItems.length,
        mine: listingItems.filter((item) => matchesListingLeadOwnershipFilter(item, 'mine', user?.id ?? null)).length,
        team: listingItems.filter((item) => matchesListingLeadOwnershipFilter(item, 'team', user?.id ?? null)).length,
        unassigned: listingItems.filter((item) => matchesListingLeadOwnershipFilter(item, 'unassigned', user?.id ?? null)).length,
    }), [listingItems, user?.id]);

    const filtered = useMemo(() => {
        const scopedItems = tab === 'publicaciones'
            ? listingItems
                .filter((item) => matchesListingLeadOwnershipFilter(item, ownershipFilter, user?.id ?? null))
                .filter((item) => matchesListingLeadFilter(item, listingFilter))
            : serviceItems;
        const normalized = query.trim().toLowerCase();
        if (!normalized) return scopedItems;
        return scopedItems.filter((item) =>
            item.contactName.toLowerCase().includes(normalized)
            || item.contactEmail.toLowerCase().includes(normalized)
            || summarizeLead(item).toLowerCase().includes(normalized)
        );
    }, [listingFilter, listingItems, ownershipFilter, query, serviceItems, tab, user?.id]);

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

    useEffect(() => {
        if (!selectedId) {
            setServiceDetail(null);
            setListingDetail(null);
            return;
        }
        let active = true;
        setDetailLoading(true);
        setError(null);
        setFeedback(null);
        void (async () => {
            if (tab === 'publicaciones') {
                const detail = await fetchCrmListingLeadDetail(selectedId, 'autos');
                if (!active) return;
                setListingDetail(detail);
                setServiceDetail(null);
                if (detail) hydrate(detail.item);
            } else {
                const detail = await fetchCrmLeadDetail(selectedId, 'autos');
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
        setPipelineColumnIdValue('listing' in item ? resolveLeadPipelineColumnId(item, pipelineColumns) : '');
        setPriorityValue(item.priority);
        setCloseReasonValue(item.closeReason ?? '');
        setTagsValue(item.tags.join(', '));
        setAssignedToValue(item.assignedToValue ?? '');
        setNextTaskTitle(item.nextTaskTitle ?? '');
        setNextTaskAt(toDateTimeLocalValue(item.nextTaskAt));
    }

    function syncPipelineColumns(items: CrmPipelineColumn[]) {
        setPipelineColumns(sortPipelineColumns(items));
    }

    async function refreshListingData(nextColumns?: CrmPipelineColumn[]) {
        const [listingLeads, columns] = await Promise.all([
            fetchCrmListingLeads('autos'),
            nextColumns ? Promise.resolve(nextColumns) : fetchCrmPipelineColumns('autos'),
        ]);
        setListingItems(listingLeads);
        syncPipelineColumns(columns);
        if (selectedId) {
            await refreshLeadDetail(selectedId);
        }
    }

    async function refreshLeadDetail(leadId: string) {
        if (tab === 'publicaciones') {
            const detail = await fetchCrmListingLeadDetail(leadId, 'autos');
            setListingDetail(detail);
            if (detail) hydrate(detail.item);
            return;
        }

        const detail = await fetchCrmLeadDetail(leadId, 'autos');
        setServiceDetail(detail);
        if (detail) hydrate(detail.item);
    }

    async function handleStageChange(leadId: string, nextStatus: CrmLeadStatus) {
        const current = (tab === 'publicaciones' ? listingItems : serviceItems).find((item) => item.id === leadId);
        if (!current || current.status === nextStatus) {
            setDragLeadId(null);
            setDropStage(null);
            return;
        }

        setUpdatingLeadId(leadId);
        setFeedback(null);
        setError(null);

        if (tab === 'publicaciones') {
            const result = await updateCrmListingLead(leadId, { status: nextStatus });
            if (!result.ok || !result.item) {
                setUpdatingLeadId(null);
                setDragLeadId(null);
                setDropStage(null);
                setError(result.error || 'No pudimos mover el lead.');
                return;
            }
            setListingItems((currentItems) => currentItems.map((item) => item.id === result.item!.id ? result.item! : item));
        } else {
            const result = await updateCrmLead(leadId, { status: nextStatus });
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
        setFeedback('Etapa actualizada.');
        setUpdatingLeadId(null);
        setDragLeadId(null);
        setDropStage(null);
    }

    async function handlePipelineColumnChange(leadId: string, columnId: string) {
        const current = listingItems.find((item) => item.id === leadId);
        if (!current) {
            setDragLeadId(null);
            setDropColumnId(null);
            return;
        }

        const currentColumnId = resolveLeadPipelineColumnId(current, pipelineColumns);
        if (currentColumnId === columnId) {
            setDragLeadId(null);
            setDropColumnId(null);
            return;
        }

        setUpdatingLeadId(leadId);
        setFeedback(null);
        setError(null);

        const result = await updateCrmListingLead(leadId, { pipelineColumnId: columnId });
        if (!result.ok || !result.item) {
            setUpdatingLeadId(null);
            setDragLeadId(null);
            setDropColumnId(null);
            setError(result.error || 'No pudimos mover el lead.');
            return;
        }

        setListingItems((currentItems) => currentItems.map((item) => item.id === result.item!.id ? result.item! : item));
        if (selectedId === leadId) {
            await refreshLeadDetail(leadId);
        }

        setStatusValue(result.item.status);
        setPipelineColumnIdValue(resolveLeadPipelineColumnId(result.item, pipelineColumns));
        setFeedback('Columna actualizada.');
        setUpdatingLeadId(null);
        setDragLeadId(null);
        setDropColumnId(null);
    }

    async function handleCreatePipelineColumn(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!newColumnName.trim()) return;

        setColumnSaving(true);
        setColumnError(null);

        const result = await createCrmPipelineColumn({
            name: newColumnName.trim(),
            status: newColumnStatus,
        });

        setColumnSaving(false);
        if (!result.ok || !result.items) {
            setColumnError(result.error || 'No pudimos crear la columna.');
            return;
        }

        syncPipelineColumns(result.items);
        setNewColumnName('');
        setNewColumnStatus('new');
        setFeedback('Columna creada.');
    }

    async function handleSavePipelineColumn(columnId: string) {
        const draft = columnDrafts[columnId];
        if (!draft) return;

        setColumnSaving(true);
        setColumnError(null);
        const result = await updateCrmPipelineColumn(columnId, {
            name: draft.name.trim(),
            status: draft.status,
        });
        setColumnSaving(false);

        if (!result.ok || !result.items) {
            setColumnError(result.error || 'No pudimos actualizar la columna.');
            return;
        }

        syncPipelineColumns(result.items);
        await refreshListingData(result.items);
        setFeedback('Columna actualizada.');
    }

    async function handleReorderPipelineColumn(columnId: string, direction: 'left' | 'right') {
        const index = pipelineColumns.findIndex((column) => column.id === columnId);
        if (index < 0) return;
        const nextIndex = direction === 'left' ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= pipelineColumns.length) return;

        const nextColumns = [...pipelineColumns];
        const [moved] = nextColumns.splice(index, 1);
        nextColumns.splice(nextIndex, 0, moved);

        setColumnSaving(true);
        setColumnError(null);
        const result = await reorderCrmPipelineColumns(nextColumns.map((column) => column.id));
        setColumnSaving(false);

        if (!result.ok || !result.items) {
            setColumnError(result.error || 'No pudimos reordenar las columnas.');
            return;
        }

        syncPipelineColumns(result.items);
    }

    async function handleDeletePipelineColumn(columnId: string) {
        setColumnSaving(true);
        setColumnError(null);
        const result = await deleteCrmPipelineColumn(columnId);
        setColumnSaving(false);

        if (!result.ok || !result.items) {
            setColumnError(result.error || 'No pudimos eliminar la columna.');
            return;
        }

        syncPipelineColumns(result.items);
        await refreshListingData(result.items);
        setFeedback('Columna eliminada.');
    }

    async function handleQuickAction(lead: AnyLead, action: CrmLeadQuickAction) {
        setActioningLeadId(lead.id);
        setFeedback(null);
        setError(null);

        const targetHref = getLeadActionHref(lead, action);
        const result = 'listing' in lead
            ? await runCrmListingLeadQuickAction(lead.id, action)
            : await runCrmLeadQuickAction(lead.id, action);

        if (targetHref) {
            openLeadActionHref(targetHref);
        }

        setActioningLeadId(null);

        if (!result.ok || !result.item) {
            setError(result.error || 'No pudimos registrar la acción.');
            return;
        }

        if ('listing' in lead) {
            const nextItem = result.item as CrmListingLead;
            setListingItems((current) => current.map((item) => item.id === nextItem.id ? nextItem : item));
        } else {
            const nextItem = result.item as CrmLead;
            setServiceItems((current) => current.map((item) => item.id === nextItem.id ? nextItem : item));
        }

        if (selectedId === lead.id) {
            await refreshLeadDetail(lead.id);
        }

        setFeedback(result.actionLabel ? `${result.actionLabel} registrada.` : 'Acción registrada.');
    }

    const stats = useMemo(() => {
        const items = listingItems;
        return {
            total: items.length,
            newCount: items.filter((item) => item.status === 'new').length,
            managed: items.filter((item) => item.status === 'contacted' || item.status === 'qualified').length,
            closed: items.filter((item) => item.status === 'closed').length,
            urgent: items.filter((item) => item.attentionLevel !== 'fresh').length,
        };
    }, [listingItems]);
    const filteredListingItems = useMemo(
        () => (tab === 'publicaciones' ? filtered.filter(isListingLead) : []),
        [filtered, tab]
    );
    const pipelineStages = useMemo(
        () => buildListingLeadPipeline(filteredListingItems, pipelineColumns),
        [filteredListingItems, pipelineColumns]
    );

    async function handleSave() {
        if (!selectedId) return;
        setSaving(true);
        setFeedback(null);
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
            const result = await updateCrmListingLead(selectedId, {
                ...payload,
                assignedToUserId: assignment.assignedToUserId,
                assignedToTeamMemberId: assignment.assignedToTeamMemberId,
                pipelineColumnId: pipelineColumnIdValue || null,
            });
            setSaving(false);
            if (!result.ok || !result.item) {
                setError(result.error || 'No pudimos actualizar el lead.');
                return;
            }
            setListingItems((current) => current.map((item) => item.id === result.item!.id ? result.item! : item));
            await refreshLeadDetail(selectedId);
            setPipelineColumnIdValue(resolveLeadPipelineColumnId(result.item, pipelineColumns));
        } else {
            const result = await updateCrmLead(selectedId, {
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

        setFeedback('CRM actualizado.');
    }

    async function handleAddNote(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selectedId || !noteBody.trim()) return;
        setAddingNote(true);
        setFeedback(null);
        setError(null);

        if (tab === 'publicaciones') {
            const result = await addCrmListingLeadNote(selectedId, noteBody.trim());
            setAddingNote(false);
            if (!result.ok || !result.item) {
                setError(result.error || 'No pudimos guardar la nota.');
                return;
            }
            setListingItems((current) => current.map((item) => item.id === result.item!.id ? result.item! : item));
            await refreshLeadDetail(selectedId);
        } else {
            const result = await addCrmLeadNote(selectedId, noteBody.trim());
            setAddingNote(false);
            if (!result.ok || !result.item) {
                setError(result.error || 'No pudimos guardar la nota.');
                return;
            }
            setServiceItems((current) => current.map((item) => item.id === result.item!.id ? result.item! : item));
            await refreshLeadDetail(selectedId);
        }

        setNoteBody('');
        setFeedback('Nota agregada.');
    }

    const detail = tab === 'publicaciones' ? listingDetail : serviceDetail;
    const detailVisible = Boolean(selectedId);
    const closeLeadDetail = () => {
        setSelectedId(null);
        setListingDetail(null);
        setServiceDetail(null);
        setPipelineColumnIdValue('');
        setFeedback(null);
        setError(null);
    };

    return (
        <div className="container-app panel-page py-8">
            <PanelSectionHeader
                title="CRM"
                description="Gestión comercial de leads de tus publicaciones"
                actions={<Link href="/panel/equipo" className="btn-secondary">Equipo y leads</Link>}
            />

            {eligibilityLoading ? (
                <div className="mt-5 rounded-[22px] border px-5 py-6 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}>
                    Verificando acceso CRM...
                </div>
            ) : !crmEligible ? (
                <PanelCard size="lg" className="mt-5">
                    <div className="space-y-3">
                        <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--fg-muted)' }}>CRM Pro</p>
                        <div>
                            <h2 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>Tu plan actual es {planLabel}.</h2>
                            <p className="mt-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                El CRM comercial completo para leads de publicaciones está disponible desde Pro y Empresa.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <PanelButton type="button" onClick={() => window.location.assign('/panel/suscripciones')}>
                                Ver suscripciones
                            </PanelButton>
                            <PanelButton type="button" variant="secondary" onClick={() => window.location.assign('/panel/mensajes')}>
                                Ir a mensajes
                            </PanelButton>
                        </div>
                    </div>
                </PanelCard>
            ) : (
                <>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6 mt-5">
                <PanelStatCard value={String(stats.total)} label="Leads publicaciones" meta="Consultas a tus avisos" />
                <PanelStatCard value={String(stats.newCount)} label="Nuevos" meta="Pendientes de contacto" />
                <PanelStatCard value={String(stats.managed)} label="Gestionados" meta="Contactados o calificados" />
                <PanelStatCard value={String(stats.closed)} label="Cerrados" meta="Oportunidades cerradas" />
                <PanelStatCard value={String(stats.urgent)} label="Sin gestión" meta="Requieren atención" />
            </div>

            <div className="rounded-[18px] border px-3 py-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                <div className="space-y-2.5">
                    <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                        <LeadToggleGroup
                            items={[
                                { key: 'all', label: `Todos ${ownershipFilterStats.all}` },
                                { key: 'mine', label: `Míos ${ownershipFilterStats.mine}` },
                                { key: 'team', label: `Del equipo ${ownershipFilterStats.team}` },
                                { key: 'unassigned', label: `Sin asignar ${ownershipFilterStats.unassigned}` },
                            ]}
                            value={ownershipFilter}
                            onChange={(key) => setOwnershipFilter(key as ListingLeadOwnershipFilter)}
                            ariaLabel="Ownership del lead"
                            nowrap
                        />
                    </div>
                    <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
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
                        <div className="flex w-full items-center justify-end gap-2 lg:max-w-[410px]">
                            <button
                                type="button"
                                onClick={() => {
                                    setColumnManagerOpen(true);
                                    setColumnError(null);
                                }}
                                className="inline-flex h-10 shrink-0 items-center rounded-full border px-3 text-sm font-medium transition"
                                style={{
                                    borderColor: 'var(--border)',
                                    background: 'var(--surface)',
                                    color: 'var(--fg-secondary)',
                                }}
                            >
                                Columnas
                            </button>
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Buscar contacto"
                                className="form-input h-10 w-full text-sm"
                            />
                            <LeadViewToggle value={leadView} onChange={setLeadView} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-5">
                <PanelCard className="overflow-hidden" size="sm">
                    {activeLoading ? (
                        <div className="px-4 py-6 text-sm" style={{ color: 'var(--fg-muted)' }}>Cargando leads...</div>
                    ) : filtered.length === 0 ? (
                        <PanelEmptyState
                            title="Sin leads"
                            description={tab === 'publicaciones'
                                ? 'Cuando alguien consulte una publicación aparecerá aquí.'
                                : 'Cuando entren leads reales de servicios aparecerán aquí.'}
                        />
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
                                            background: selected ? 'var(--bg-subtle)' : 'transparent',
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedId(lead.id);
                                                setError(null);
                                                setFeedback(null);
                                            }}
                                            className="min-w-0 text-left"
                                        >
                                            <p className="truncate text-sm font-medium" style={{ color: 'var(--fg)' }}>{lead.contactName}</p>
                                            <p className="mt-1 truncate text-xs" style={{ color: 'var(--fg-secondary)' }}>{simpleLeadListLabel(lead)}</p>
                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                                {'source' in lead ? <LeadSourceInline lead={lead} /> : null}
                                                <span>{lead.createdAgo}</span>
                                            </div>
                                        </button>
                                        <div className="flex flex-col items-end gap-1.5">
                                            <LeadQuickActions
                                                lead={lead}
                                                compact
                                                busy={actioningLeadId === lead.id}
                                                onAction={(action) => void handleQuickAction(lead, action)}
                                            />
                                            {'listing' in lead ? (
                                                <PipelineColumnSelect
                                                    columns={pipelineColumns}
                                                    value={resolveLeadPipelineColumnId(lead, pipelineColumns)}
                                                    disabled={updatingLeadId === lead.id || actioningLeadId === lead.id}
                                                    onChange={(nextColumnId) => void handlePipelineColumnChange(lead.id, nextColumnId)}
                                                />
                                            ) : (
                                                <LeadStageSelect
                                                    value={lead.status}
                                                    disabled={updatingLeadId === lead.id || actioningLeadId === lead.id}
                                                    onChange={(nextStatus) => void handleStageChange(lead.id, nextStatus)}
                                                />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    ) : (
                        <div className="overflow-x-auto px-1 py-1">
                            <div className="grid min-w-[860px] gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(pipelineStages.length, 1)}, minmax(220px, 1fr))` }}>
                                {pipelineStages.map((stage) => (
                                    <div
                                        key={stage.key}
                                        className="rounded-[18px] border transition-colors"
                                        onDragOver={(event) => {
                                            if (!dragLeadId) return;
                                            event.preventDefault();
                                            setDropColumnId(stage.key);
                                        }}
                                        onDragLeave={() => {
                                            setDropColumnId((current) => current === stage.key ? null : current);
                                        }}
                                        onDrop={(event) => {
                                            event.preventDefault();
                                            if (!dragLeadId) return;
                                            void handlePipelineColumnChange(dragLeadId, stage.key);
                                        }}
                                        style={{
                                            borderColor: dropColumnId === stage.key ? 'var(--fg)' : 'var(--border)',
                                            background: dropColumnId === stage.key ? 'var(--bg)' : 'var(--bg-subtle)',
                                        }}
                                    >
                                        <div className="border-b px-3 py-3" style={{ borderColor: 'var(--border)' }}>
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{stage.label}</p>
                                                    <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                                                        {stage.count} lead{stage.count === 1 ? '' : 's'} · {stage.statusLabel}
                                                    </p>
                                                </div>
                                                <PanelStatusBadge label={String(stage.count)} tone={crmStageTone(stage.status)} />
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
                                                            setDropColumnId(null);
                                                        }}
                                                        onDragEnd={() => {
                                                            setDragLeadId(null);
                                                            setDropColumnId(null);
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
                                                                setError(null);
                                                                setFeedback(null);
                                                            }}
                                                            className="w-full text-left"
                                                        >
                                                            <p className="truncate text-sm font-medium" style={{ color: 'var(--fg)' }}>{lead.contactName}</p>
                                                            <p className="mt-1 truncate text-xs" style={{ color: 'var(--fg-secondary)' }}>{simpleLeadListLabel(lead)}</p>
                                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                                                {'source' in lead ? <LeadSourceInline lead={lead} /> : null}
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
                </PanelCard>

            <LeadDetailModal open={detailVisible} onClose={closeLeadDetail}>
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Detalle del lead</p>
                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Gestión comercial y contexto del contacto</p>
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
                            <div className="px-1 py-6 text-sm" style={{ color: 'var(--fg-muted)' }}>Cargando detalle...</div>
                        ) : (
                            <div className="space-y-5">
                            <div className="rounded-[20px] border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                                <div className="flex flex-col gap-3">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <p className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>{detail.item.contactName}</p>
                                            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{summarizeLead(detail.item)}</p>
                                        </div>
                                        <div className="flex flex-col gap-2 lg:items-end">
                                            <div className="flex flex-wrap items-center gap-2 whitespace-nowrap">
                                                <PanelStatusBadge label={detail.item.statusLabel} tone={crmStatusTone(detail.item.status)} />
                                                <PanelStatusBadge label={detail.item.priorityLabel} tone={crmPriorityTone(detail.item.priority)} />
                                                {detail.item.attentionLabel ? <PanelStatusBadge label={detail.item.attentionLabel} tone={crmAttentionTone(detail.item.attentionLevel)} /> : null}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--fg-muted)' }}>Etapa</span>
                                                {'listing' in detail.item ? (
                                                    <PipelineColumnSelect
                                                        columns={pipelineColumns}
                                                        value={pipelineColumnIdValue}
                                                        disabled={updatingLeadId === detail.item.id}
                                                        onChange={(nextColumnId) => void handlePipelineColumnChange(detail.item.id, nextColumnId)}
                                                    />
                                                ) : (
                                                    <LeadStageSelect
                                                        value={statusValue}
                                                        disabled={updatingLeadId === detail.item.id}
                                                        onChange={(nextStatus) => void handleStageChange(detail.item.id, nextStatus)}
                                                    />
                                                )}
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
                                        <Link href={`/panel/mensajes?thread=${encodeURIComponent(detail.thread.id)}`} className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--fg-secondary)' }}>
                                            <IconMessageCircle size={15} />
                                            Abrir conversación
                                        </Link>
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

                            <LeadAccordionSection title="Gestión comercial" subtitle="Estado, responsable y próxima acción." defaultOpen>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {'listing' in detail.item ? (
                                        <label className="space-y-1.5">
                                            <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Columna del pipeline</span>
                                            <PipelineColumnSelect
                                                columns={pipelineColumns}
                                                value={pipelineColumnIdValue}
                                                onChange={(nextColumnId) => setPipelineColumnIdValue(nextColumnId)}
                                            />
                                        </label>
                                    ) : (
                                        <label className="space-y-1.5">
                                            <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Estado</span>
                                            <select className="form-select h-10 text-sm" value={statusValue} onChange={(event) => setStatusValue(event.target.value as CrmLeadStatus)}>
                                                <option value="new">Nuevo</option>
                                                <option value="contacted">Contactado</option>
                                                <option value="qualified">Calificado</option>
                                                <option value="closed">Cerrado</option>
                                            </select>
                                        </label>
                                    )}
                                    <label className="space-y-1.5">
                                        <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Prioridad</span>
                                        <select className="form-select h-10 text-sm" value={priorityValue} onChange={(event) => setPriorityValue(event.target.value as CrmLeadPriority)}>
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
                                        <input className="form-input h-10 text-sm" value={tagsValue} onChange={(event) => setTagsValue(event.target.value)} placeholder="ej. caliente, contado, inversionista" />
                                    </label>
                                    <label className="space-y-1.5 sm:col-span-2">
                                        <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Motivo de cierre</span>
                                        <input className="form-input h-10 text-sm" value={closeReasonValue} onChange={(event) => setCloseReasonValue(event.target.value)} placeholder="ej. vendió con otra corredora" />
                                    </label>
                                    <label className="space-y-1.5 sm:col-span-2">
                                        <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Próxima tarea</span>
                                        <input className="form-input h-10 text-sm" value={nextTaskTitle} onChange={(event) => setNextTaskTitle(event.target.value)} placeholder="Ej. Llamar y agendar visita" />
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

                            <LeadAccordionSection title="Notas internas" subtitle="Registro interno del seguimiento comercial.">
                                <form className="space-y-3" onSubmit={(event) => void handleAddNote(event)}>
                                    <textarea className="form-textarea min-h-28 text-sm" value={noteBody} onChange={(event) => setNoteBody(event.target.value)} placeholder="Ej. Cliente con interés real, pidió visita mañana." />
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-xs" style={{ color: error ? 'var(--color-error)' : 'var(--fg-muted)' }}>
                                            {error || feedback || 'Cada cambio se registra en el timeline.'}
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
            <PipelineColumnsModal
                open={columnManagerOpen}
                onClose={() => {
                    setColumnManagerOpen(false);
                    setColumnError(null);
                }}
                columns={pipelineColumns}
                drafts={columnDrafts}
                newColumnName={newColumnName}
                newColumnStatus={newColumnStatus}
                saving={columnSaving}
                error={columnError}
                onDraftChange={(columnId, changes) => {
                    setColumnDrafts((current) => ({
                        ...current,
                        [columnId]: {
                            ...current[columnId],
                            ...changes,
                        },
                    }));
                }}
                onNewColumnNameChange={setNewColumnName}
                onNewColumnStatusChange={setNewColumnStatus}
                onCreate={(event) => void handleCreatePipelineColumn(event)}
                onMove={(columnId, direction) => void handleReorderPipelineColumn(columnId, direction)}
                onSave={(columnId) => void handleSavePipelineColumn(columnId)}
                onDelete={(columnId) => void handleDeletePipelineColumn(columnId)}
            />
            </div>
                </>
            )}
        </div>
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
                className="relative z-[1] w-full max-w-[1040px] max-h-[calc(100vh-2.5rem)] overflow-hidden rounded-[28px] border shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
                <div className="max-h-[calc(100vh-2.5rem)] overflow-y-auto p-5 sm:p-6">
                    {props.children}
                </div>
            </div>
        </div>
    );
}

function PipelineColumnsModal(props: {
    open: boolean;
    onClose: () => void;
    columns: CrmPipelineColumn[];
    drafts: Record<string, { name: string; status: CrmLeadStatus }>;
    newColumnName: string;
    newColumnStatus: CrmLeadStatus;
    saving: boolean;
    error: string | null;
    onDraftChange: (columnId: string, changes: Partial<{ name: string; status: CrmLeadStatus }>) => void;
    onNewColumnNameChange: (value: string) => void;
    onNewColumnStatusChange: (value: CrmLeadStatus) => void;
    onCreate: (event: FormEvent<HTMLFormElement>) => void;
    onMove: (columnId: string, direction: 'left' | 'right') => void;
    onSave: (columnId: string) => void;
    onDelete: (columnId: string) => void;
}) {
    useEffect(() => {
        if (!props.open) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') props.onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [props.onClose, props.open]);

    if (!props.open) return null;

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-5">
            <button
                type="button"
                aria-label="Cerrar columnas"
                onClick={props.onClose}
                className="absolute inset-0"
                style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }}
            />
            <div
                className="relative z-[1] w-full max-w-[860px] max-h-[calc(100vh-2.5rem)] overflow-hidden rounded-[28px] border shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
                <div className="max-h-[calc(100vh-2.5rem)] overflow-y-auto p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>Columnas del pipeline</p>
                            <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                Crea y ordena tus propias columnas. Cada una sigue perteneciendo a una etapa base del CRM.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={props.onClose}
                            className="rounded-full border px-3 py-1.5 text-xs font-medium"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)', background: 'var(--surface)' }}
                        >
                            Cerrar
                        </button>
                    </div>

                    <form className="mt-5 rounded-[20px] border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }} onSubmit={props.onCreate}>
                        <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Nueva columna</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
                            <input
                                className="form-input h-10 text-sm"
                                value={props.newColumnName}
                                onChange={(event) => props.onNewColumnNameChange(event.target.value)}
                                placeholder="Ej. Prueba agendada"
                            />
                            <select
                                className="form-select h-10 text-sm"
                                value={props.newColumnStatus}
                                onChange={(event) => props.onNewColumnStatusChange(event.target.value as CrmLeadStatus)}
                            >
                                {LEAD_STAGE_OPTIONS.map((option) => (
                                    <option key={option.key} value={option.key}>{option.label}</option>
                                ))}
                            </select>
                            <PanelButton type="submit" disabled={props.saving || !props.newColumnName.trim()}>
                                {props.saving ? 'Creando...' : 'Agregar'}
                            </PanelButton>
                        </div>
                    </form>

                    {props.error ? (
                        <div className="mt-4 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: var(--color-error-subtle), background: 'var(--color-error-subtle)', color: 'var(--color-error)' }}>
                            {props.error}
                        </div>
                    ) : null}

                    <div className="mt-5 space-y-3">
                        {props.columns.map((column, index) => {
                            const draft = props.drafts[column.id] ?? { name: column.name, status: column.status };
                            return (
                                <div key={column.id} className="rounded-[20px] border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
                                        <input
                                            className="form-input h-10 text-sm"
                                            value={draft.name}
                                            onChange={(event) => props.onDraftChange(column.id, { name: event.target.value })}
                                        />
                                        <select
                                            className="form-select h-10 text-sm"
                                            value={draft.status}
                                            onChange={(event) => props.onDraftChange(column.id, { status: event.target.value as CrmLeadStatus })}
                                        >
                                            {LEAD_STAGE_OPTIONS.map((option) => (
                                                <option key={option.key} value={option.key}>{option.label}</option>
                                            ))}
                                        </select>
                                        <div className="flex flex-wrap items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => props.onMove(column.id, 'left')}
                                                disabled={props.saving || index === 0}
                                                className="inline-flex h-10 items-center rounded-full border px-3 text-sm font-medium"
                                                style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)', opacity: props.saving || index === 0 ? 0.4 : 1 }}
                                            >
                                                Mover
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => props.onMove(column.id, 'right')}
                                                disabled={props.saving || index === props.columns.length - 1}
                                                className="inline-flex h-10 items-center rounded-full border px-3 text-sm font-medium"
                                                style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)', opacity: props.saving || index === props.columns.length - 1 ? 0.4 : 1 }}
                                            >
                                                Adelante
                                            </button>
                                            <PanelButton type="button" variant="secondary" disabled={props.saving} onClick={() => props.onSave(column.id)}>
                                                Guardar
                                            </PanelButton>
                                            <button
                                                type="button"
                                                onClick={() => props.onDelete(column.id)}
                                                disabled={props.saving}
                                                className="inline-flex h-10 items-center rounded-full border px-3 text-sm font-medium"
                                                style={{ borderColor: 'var(--border)', color: 'var(--color-error)', opacity: props.saving ? 0.45 : 1 }}
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                        <PanelStatusBadge label={column.statusLabel} tone={crmStageTone(column.status)} />
                                        <span>Posición {index + 1}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
    ].filter(Boolean).join(' · ');
}

function simpleLeadListLabel(lead: AnyLead): string {
    if ('listing' in lead) {
        return lead.listing?.title ?? lead.sourceLabel;
    }
    return lead.serviceLabel;
}

function isListingLead(lead: AnyLead): lead is CrmListingLead {
    return 'listing' in lead;
}

function sortPipelineColumns(columns: CrmPipelineColumn[]) {
    return [...columns].sort((left, right) => left.position - right.position || left.createdAt - right.createdAt);
}

function resolveLeadPipelineColumnId(lead: CrmListingLead, columns: CrmPipelineColumn[]) {
    if (lead.pipelineColumnId && columns.some((column) => column.id === lead.pipelineColumnId)) {
        return lead.pipelineColumnId;
    }

    return columns.find((column) => column.status === lead.status)?.id ?? '';
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

function formatLeadAssigneeLabel(assignee: CrmAssignee): string {
    const suffix = assignee.kind === 'team_member'
        ? assignee.roleTitle || 'Asesor'
        : assignee.roleTitle || 'Cuenta principal';
    return `${assignee.name} · ${suffix}`;
}

function buildListingLeadPipeline(items: CrmListingLead[], columns: CrmPipelineColumn[]) {
    const availableColumns = columns.length > 0
        ? sortPipelineColumns(columns)
        : LEAD_STAGE_OPTIONS.map((stage, index) => ({
            id: stage.key,
            userId: 'fallback',
            vertical: 'autos' as const,
            scope: 'listing' as const,
            name: stage.label,
            status: stage.key,
            statusLabel: stage.label,
            position: index,
            createdAt: index,
            updatedAt: index,
        }));

    return availableColumns.map((column) => {
        const stageItems = items.filter((item) => resolveLeadPipelineColumnId(item, availableColumns) === column.id);
        return {
            key: column.id,
            label: column.name,
            status: column.status,
            statusLabel: column.statusLabel,
            count: stageItems.length,
            items: stageItems,
        };
    });
}

function leadSourceVisual(lead: CrmListingLead) {
    if (lead.source === 'instagram') return { Icon: IconBrandInstagram, label: lead.sourceLabel };
    if (lead.source === 'facebook') return { Icon: IconBrandFacebook, label: lead.sourceLabel };
    if (lead.channel === 'portal') return { Icon: IconBuildingStore, label: lead.sourceLabel };
    if (lead.channel === 'social') return { Icon: IconWorld, label: lead.sourceLabel };
    if (lead.source === 'whatsapp') return { Icon: IconBrandWhatsapp, label: lead.sourceLabel };
    return { Icon: IconMessageCircle, label: lead.sourceLabel };
}

function LeadSourceInline(props: { lead: CrmListingLead }) {
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

function PipelineColumnSelect(props: {
    columns: CrmPipelineColumn[];
    value: string;
    onChange: (columnId: string) => void;
    disabled?: boolean;
}) {
    const sortedColumns = sortPipelineColumns(props.columns);

    return (
        <select
            className="form-select h-9 min-w-[164px] text-xs"
            value={props.value}
            disabled={props.disabled}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => props.onChange(event.target.value)}
        >
            {sortedColumns.map((column) => (
                <option key={column.id} value={column.id}>
                    {column.name}
                </option>
            ))}
        </select>
    );
}

function LeadStageSelect(props: {
    value: CrmLeadStatus;
    onChange: (status: CrmLeadStatus) => void;
    disabled?: boolean;
}) {
    return (
        <select
            className="form-select h-9 min-w-[132px] text-xs"
            value={props.value}
            disabled={props.disabled}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => props.onChange(event.target.value as CrmLeadStatus)}
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

function getLeadActionHref(lead: AnyLead, action: CrmLeadQuickAction): string | null {
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
    onAction: (action: CrmLeadQuickAction) => void;
    compact?: boolean;
    busy?: boolean;
}) {
    const actions: Array<{
        key: CrmLeadQuickAction;
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

function matchesListingLeadFilter(lead: CrmListingLead, filter: ListingLeadFilter): boolean {
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

function matchesListingLeadOwnershipFilter(lead: CrmListingLead, filter: ListingLeadOwnershipFilter, currentUserId: string | null): boolean {
    if (filter === 'all') return true;
    if (filter === 'unassigned') return !lead.assignedToUserId && !lead.assignedToTeamMemberId;
    if (filter === 'team') return Boolean(lead.assignedToTeamMemberId);
    return Boolean(currentUserId) && lead.assignedToUserId === currentUserId;
}

function crmStatusTone(status: CrmLeadStatus): 'neutral' | 'success' | 'warning' | 'info' {
    if (status === 'closed') return 'neutral';
    if (status === 'contacted' || status === 'qualified') return 'success';
    return 'info';
}

function crmStageTone(status: CrmLeadStatus): 'neutral' | 'success' | 'warning' | 'info' {
    return crmStatusTone(status);
}

function crmPriorityTone(priority: CrmLeadPriority): 'neutral' | 'success' | 'warning' | 'info' {
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

function ActivityCard(props: { activity: CrmLeadActivity | CrmListingLeadActivity }) {
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
