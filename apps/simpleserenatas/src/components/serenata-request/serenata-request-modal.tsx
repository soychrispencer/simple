'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@simple/auth';
import { PanelSheet } from '@/components/panel/panel-sheet';
import { MarketplaceRequestView } from '@/components/panel/marketplace-request-view';
import { serenatasApi } from '@/lib/serenatas-api';
import { clearMarketplaceRequestDraftRef } from '@/lib/marketplace-request-draft';
import { useSerenataRequestModal } from './serenata-request-modal-context';
import { SerenataRequestModalGuest } from './serenata-request-modal-guest';

export function SerenataRequestModal() {
    const { isOpen, draftRef, resolved, loading, error, closeRequest, setResolved, setLoading, setError } =
        useSerenataRequestModal();
    const { isLoggedIn, authLoading, user } = useAuth();
    const [contactPhone, setContactPhone] = useState('');

    useEffect(() => {
        if (!isOpen || !draftRef || resolved) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        void (async () => {
            const groupResponse = await serenatasApi.marketplaceGroupBySlug(draftRef.groupSlug);
            if (cancelled) return;
            if (!groupResponse.ok || !groupResponse.item) {
                setError(groupResponse.error ?? 'Mariachi no encontrado');
                setResolved(null);
                setLoading(false);
                return;
            }
            const servicesResponse = await serenatasApi.marketplaceGroupServices(groupResponse.item.id);
            if (cancelled) return;
            if (!servicesResponse.ok) {
                setError(servicesResponse.error ?? 'No pudimos cargar servicios');
                setResolved(null);
                setLoading(false);
                return;
            }
            const service = servicesResponse.items.find((item) => item.id === draftRef.serviceId);
            if (!service) {
                setError('El servicio seleccionado ya no está disponible.');
                setResolved(null);
                setLoading(false);
                clearMarketplaceRequestDraftRef();
                return;
            }
            setResolved({ group: groupResponse.item, service });
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [draftRef, isOpen, resolved, setError, setLoading, setResolved]);

    useEffect(() => {
        if (!isOpen || !isLoggedIn) {
            setContactPhone('');
            return;
        }
        let cancelled = false;
        void serenatasApi.profiles().then((response) => {
            if (cancelled || !response.ok) return;
            const phone =
                response.user?.phone?.trim() ||
                response.profiles.client?.phone?.trim() ||
                '';
            setContactPhone(phone);
        });
        return () => {
            cancelled = true;
        };
    }, [isLoggedIn, isOpen, user?.id]);

    if (!isOpen) return null;

    const showGuest = !authLoading && !isLoggedIn;
    const showForm = !authLoading && isLoggedIn && resolved;
    const busy = authLoading || loading;

    return (
        <PanelSheet
            ariaLabel="Solicitar serenata"
            onClose={closeRequest}
            maxWidthClass="sm:max-w-lg"
            constrainHeight
        >
            {busy ? (
                <p className="p-6 text-sm text-fg-muted">Cargando solicitud…</p>
            ) : error ? (
                <div className="grid gap-4 p-6">
                    <p className="text-sm text-fg-muted">{error}</p>
                    <button type="button" className="btn btn-ghost w-fit text-sm" onClick={closeRequest}>
                        Cerrar
                    </button>
                </div>
            ) : showGuest && resolved ? (
                <SerenataRequestModalGuest group={resolved.group} service={resolved.service} onClose={closeRequest} />
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
