// Listings Core Package
// Shared types and utilities for autos and propiedades verticals

import { useCallback, useEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Core Types
// ─────────────────────────────────────────────────────────────────────────────

export type VerticalType = 'autos' | 'propiedades';

export type ListingStatus = 'draft' | 'active' | 'paused' | 'sold' | 'archived';

export type ListingSection = 'sale' | 'rent' | 'auction';

export interface ListingLocation {
    regionId: string | null;
    regionName: string | null;
    communeId: string | null;
    communeName: string | null;
    publicLabel?: string;
}

export interface ListingCoreConfig {
    vertical: VerticalType;
    basePath: string;
}

export interface ListingMetadata {
    id: string;
    vertical: VerticalType;
    title: string;
    description?: string;
    price: number;
    priceLabel: string;
    currency: 'CLP' | 'USD';
    location: ListingLocation;
    images: string[];
    status: ListingStatus;
    section: ListingSection;
    createdAt: number;
    updatedAt: number;
    href: string;
    ownerId: string;
}

export interface ListingFilters {
    query?: string;
    minPrice?: number;
    maxPrice?: number;
    regionId?: string;
    communeId?: string;
    status?: ListingStatus;
    section?: ListingSection;
}

// ─────────────────────────────────────────────────────────────────────────────
// Draft Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ListingDraft<T extends Record<string, unknown> = Record<string, unknown>> {
    id: string;
    userId: string;
    vertical: VerticalType;
    data: T;
    savedAt: number;
    photoCount: number;
}

export type DraftStorageKey = `${VerticalType}-draft-v1`;

// ─────────────────────────────────────────────────────────────────────────────
// Saved/Favorites Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SavedListingRecord {
    id: string;
    href: string;
    title: string;
    price: string;
    image?: string;
    location?: string;
    savedAt: number;
}

export interface SavedListingsState {
    items: SavedListingRecord[];
    isLoading: boolean;
    error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

export function formatPrice(price: number, currency: 'CLP' | 'USD'): string {
    if (currency === 'CLP') {
        return `$${price.toLocaleString('es-CL')}`;
    }
    return `USD ${price.toLocaleString('en-US')}`;
}

export function formatPriceInput(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    return '$ ' + Number(digits).toLocaleString('es-CL');
}

export function parsePrice(priceStr: string): { value: number; currency: 'CLP' | 'USD' } {
    const clean = priceStr.replace(/[$\s.]/g, '').replace(/,/g, '');
    const value = parseInt(clean, 10) || 0;
    const currency = priceStr.toLowerCase().includes('usd') ? 'USD' : 'CLP';
    return { value, currency };
}

export function getListingStatusLabel(status: ListingStatus): string {
    const labels: Record<ListingStatus, string> = {
        draft: 'Borrador',
        active: 'Activa',
        paused: 'Pausada',
        sold: 'Vendida',
        archived: 'Archivada',
    };
    return labels[status] || status;
}

export function getListingSectionLabel(section: ListingSection): string {
    const labels: Record<ListingSection, string> = {
        sale: 'Venta',
        rent: 'Arriendo',
        auction: 'Subasta',
    };
    return labels[section] || section;
}

export function isActiveListing(status: ListingStatus): boolean {
    return status === 'active';
}

export function canRenewListing(status: ListingStatus): boolean {
    return status !== 'sold' && status !== 'archived';
}

export function isClosedListing(status: ListingStatus): boolean {
    return status === 'sold' || status === 'archived';
}

export function createEmptyLocation(): ListingLocation {
    return {
        regionId: null,
        regionName: null,
        communeId: null,
        communeName: null,
    };
}

export function buildListingHref(vertical: VerticalType, id: string, title?: string): string {
    const slug = title
        ? title.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 60)
        : id;
    return vertical === 'autos'
        ? `/autos/${slug}-${id}`
        : `/propiedades/${slug}-${id}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Draft Storage Utilities
// ─────────────────────────────────────────────────────────────────────────────

export function getDraftKey(vertical: VerticalType): DraftStorageKey {
    return `${vertical}-draft-v1`;
}

export function readDraftFromStorage<T>(vertical: VerticalType): T | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(getDraftKey(vertical));
        if (!raw) return null;
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export function writeDraftToStorage<T>(vertical: VerticalType, draft: T): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(getDraftKey(vertical), JSON.stringify(draft));
    } catch {
        // Ignore storage errors
    }
}

export function clearDraftFromStorage(vertical: VerticalType): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(getDraftKey(vertical));
}

// ─────────────────────────────────────────────────────────────────────────────
// React Hooks
// ─────────────────────────────────────────────────────────────────────────────

export interface UseSavedListingsOptions {
    apiBase: string;
    onUnauthorized?: () => void;
}

const SAVED_EVENT = 'simple:saved-listings-updated';

export function useSavedListings(options: UseSavedListingsOptions) {
    const [items, setItems] = useState<SavedListingRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const cacheRef = useRef<SavedListingRecord[]>([]);

    const syncFromApi = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${options.apiBase}/api/saved`, {
                credentials: 'include',
            });
            if (res.status === 401) {
                options.onUnauthorized?.();
                setItems([]);
                cacheRef.current = [];
                return;
            }
            const data = await res.json();
            if (data?.ok && Array.isArray(data.items)) {
                const normalized = normalizeSavedRecords(data.items);
                setItems(normalized);
                cacheRef.current = normalized;
                emitSavedUpdated();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setIsLoading(false);
        }
    }, [options.apiBase, options.onUnauthorized]);

    const toggleSaved = useCallback(async (record: Omit<SavedListingRecord, 'savedAt'>) => {
        try {
            const res = await fetch(`${options.apiBase}/api/saved/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: record.id }),
                credentials: 'include',
            });
            const data = await res.json();
            if (data?.ok && Array.isArray(data.items)) {
                const normalized = normalizeSavedRecords(data.items);
                setItems(normalized);
                cacheRef.current = normalized;
                emitSavedUpdated();
                return { ok: true, saved: data.saved as boolean };
            }
            return { ok: false, saved: isListingSaved(record.id, cacheRef.current), error: data?.error };
        } catch (err) {
            return { ok: false, saved: isListingSaved(record.id, cacheRef.current), error: String(err) };
        }
    }, [options.apiBase]);

    const removeSaved = useCallback(async (id: string) => {
        try {
            const res = await fetch(`${options.apiBase}/api/saved/${encodeURIComponent(id)}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            const data = await res.json();
            if (data?.ok && Array.isArray(data.items)) {
                const normalized = normalizeSavedRecords(data.items);
                setItems(normalized);
                cacheRef.current = normalized;
                emitSavedUpdated();
                return { ok: true };
            }
            return { ok: false, error: data?.error };
        } catch (err) {
            return { ok: false, error: String(err) };
        }
    }, [options.apiBase]);

    const isSaved = useCallback((id: string) => {
        return isListingSaved(id, cacheRef.current);
    }, []);

    useEffect(() => {
        const handler = () => {
            setItems([...cacheRef.current]);
        };
        window.addEventListener(SAVED_EVENT, handler);
        return () => window.removeEventListener(SAVED_EVENT, handler);
    }, []);

    return {
        items,
        isLoading,
        error,
        syncFromApi,
        toggleSaved,
        removeSaved,
        isSaved,
    };
}

// Helper functions for saved listings
function normalizeSavedRecords(input: unknown): SavedListingRecord[] {
    if (!Array.isArray(input)) return [];
    return input
        .filter((item): item is SavedListingRecord => {
            return Boolean(
                item &&
                    typeof item === 'object' &&
                    typeof (item as SavedListingRecord).id === 'string' &&
                    typeof (item as SavedListingRecord).title === 'string' &&
                    typeof (item as SavedListingRecord).price === 'string'
            );
        })
        .sort((a, b) => b.savedAt - a.savedAt)
        .slice(0, 150);
}

function isListingSaved(id: string, cache: SavedListingRecord[]): boolean {
    return cache.some((item) => item.id === id);
}

function emitSavedUpdated(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(SAVED_EVENT));
}
