'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@simple/auth';
import { PanelButton } from '@simple/ui/panel';
import { PanelNotice } from '@simple/ui/panel';
import { PanelSheet } from '@/components/panel/panel-sheet';
import { MarketplaceRequestView } from '@/components/panel/marketplace-request-view';
import { serenatasApi } from '@/lib/serenatas-api';
import { clearMarketplaceRequestDraftRef } from '@/lib/marketplace-request-draft';
import { useMarketplaceGroup } from '@/hooks/use-marketplace-group';
import { useSerenataProfiles } from '@/hooks/use-serenata-profiles';
import { resolveMarketplaceRequestBlock } from '@/lib/marketplace-client-policy';
import { useSerenataRequestModal } from './serenata-request-modal-context';
import { SerenataRequestModalGuest } from './serenata-request-modal-guest';

export function SerenataRequestModal() {
    const { isOpen, draftRef, resolved, loading, error, closeRequest, setResolved, setLoading, setError } =
        useSerenataRequestModal();
    const { isLoggedIn, authLoading, user } = useAuth();
    const { profiles, profilesReady } = useSerenataProfiles();
    const [contactPhone, setContactPhone] = useState('');
    const slug = isOpen && draftRef && !resolved ? draftRef.groupSlug : null;
    const { group, services, loading: groupLoading, error: groupError } = useMarketplaceGroup(slug);

    const requestBlock = useMemo(
        () => (resolved
            ? resolveMarketplaceRequestBlock(profiles, {
                isLoggedIn,
                profilesReady,
                userId: user?.id,
                group: resolved.group,
            })
            : { allowed: true as const }),
        [isLoggedIn, profiles, profilesReady, resolved, user?.id],
    );

    useEffect(() => {
        if (!isOpen || !draftRef || resolved) return;
        if (groupLoading) {
            setLoading(true);
            return;
        }
        setLoading(false);
        if (groupError || !group) {
            setError(groupError ?? 'Mariachi no encontrado');
            setResolved(null);
            return;
        }
        const service = services.find((item) => item.id === draftRef.serviceId);
        if (!service) {
            setError('El servicio seleccionado ya no está disponible.');
            setResolved(null);
            clearMarketplaceRequestDraftRef();
            return;
        }
        setError(null);
        setResolved({ group, service });
    }, [draftRef, group, groupError, groupLoading, isOpen, resolved, services, setError, setLoading, setResolved]);

    useEffect(() => {
        if (!isOpen || !isLoggedIn) {
            setContactPhone('');
            return;
        }
        let cancelled = false;
        void serenatasApi.profiles().then((response) => {
            if (cancelled || !response.ok) return;
            const phone =
                response.user?.phone?.trim()
                || response.profiles.client?.phone?.trim()
                || '';
            setContactPhone(phone);
        });
        return () => {
            cancelled = true;
        };
    }, [isLoggedIn, isOpen, user?.id]);

    if (!isOpen) return null;

    const showGuest = !authLoading && !isLoggedIn;
    const showBlocked = !authLoading && isLoggedIn && profilesReady && resolved && !requestBlock.allowed;
    const showForm = !authLoading && isLoggedIn && profilesReady && resolved && requestBlock.allowed;
    const busy = authLoading || loading || groupLoading || (isLoggedIn && !profilesReady);

    return (
        <PanelSheet
            ariaLabel="Solicitar serenata"
            onClose={closeRequest}
            maxWidthClass="sm:max-w-lg lg:max-w-5xl"
            constrainHeight
        >
            {busy ? (
                <p className="p-6 text-sm text-fg-muted">Cargando solicitud…</p>
            ) : error ? (
                <div className="grid gap-4 p-6">
                    <p className="text-sm text-fg-muted">{error}</p>
                    <PanelButton type="button" variant="ghost" className="w-fit text-sm" onClick={closeRequest}>
                        Cerrar
                    </PanelButton>
                </div>
            ) : showGuest && resolved ? (
                <SerenataRequestModalGuest group={resolved.group} service={resolved.service} onClose={closeRequest} />
            ) : showBlocked ? (
                <div className="grid gap-4 p-6">
                    <PanelNotice tone="warning">{requestBlock.reason}</PanelNotice>
                    <PanelButton type="button" variant="ghost" className="w-fit text-sm" onClick={closeRequest}>
                        Cerrar
                    </PanelButton>
                </div>
            ) : showForm && resolved ? (
                <MarketplaceRequestView
                    variant="modal"
                    group={resolved.group}
                    service={resolved.service}
                    contactPhone={contactPhone}
                    initialDate={draftRef?.date}
                    onBack={closeRequest}
                />
            ) : null}
        </PanelSheet>
    );
}
