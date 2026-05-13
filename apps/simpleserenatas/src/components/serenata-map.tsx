'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker, Polyline, TileLayer } from 'leaflet';
import type { Serenata } from '@/lib/serenatas-api';

type SerenataMapProps = {
    items: Serenata[];
};

const CARTO_LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const CARTO_DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const CARTO_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

function parseCoordinate(value: string | null): number | null {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function isDocumentDarkMode() {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark')
        || document.documentElement.getAttribute('data-theme') === 'dark';
}

function markerHtml(index: number) {
    return `
        <div style="
            width: 36px;
            height: 36px;
            border-radius: 999px;
            background: var(--accent);
            color: var(--accent-contrast, #fff);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 14px;
            border: 3px solid var(--surface);
            box-shadow: 0 12px 26px rgba(0,0,0,.28);
            position: relative;
        ">
            ${index + 1}
            <span style="
                position: absolute;
                left: 50%;
                bottom: -7px;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-top: 7px solid var(--surface);
            "></span>
        </div>
    `;
}

export default function SerenataMap({ items }: SerenataMapProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const markersRef = useRef<Marker[]>([]);
    const polylineRef = useRef<Polyline | null>(null);
    const tileLayerRef = useRef<TileLayer | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        const syncTheme = () => setIsDarkMode(isDocumentDarkMode());
        syncTheme();

        const observer = new MutationObserver(syncTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'data-theme'],
        });

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function setup() {
            if (!containerRef.current || mapRef.current) return;
            const L = await import('leaflet');
            if (cancelled || !containerRef.current) return;

            mapRef.current = L.map(containerRef.current, {
                zoomControl: false,
                attributionControl: true,
                scrollWheelZoom: true,
            }).setView([-33.4489, -70.6693], 12);
            L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
            tileLayerRef.current = L.tileLayer(isDocumentDarkMode() ? CARTO_DARK_TILES : CARTO_LIGHT_TILES, {
                attribution: CARTO_ATTRIBUTION,
                subdomains: 'abcd',
                maxZoom: 20,
            }).addTo(mapRef.current);
            setMapReady(true);
            window.setTimeout(() => mapRef.current?.invalidateSize(), 0);
        }

        void setup();

        return () => {
            cancelled = true;
            markersRef.current.forEach((marker) => marker.remove());
            markersRef.current = [];
            polylineRef.current?.remove();
            polylineRef.current = null;
            mapRef.current?.remove();
            mapRef.current = null;
            tileLayerRef.current = null;
            setMapReady(false);
        };
    }, []);

    useEffect(() => {
        tileLayerRef.current?.setUrl(isDarkMode ? CARTO_DARK_TILES : CARTO_LIGHT_TILES);
    }, [isDarkMode]);

    useEffect(() => {
        let cancelled = false;

        async function renderMarkers() {
            if (!mapRef.current || !mapReady) return;
            const L = await import('leaflet');
            if (cancelled || !mapRef.current) return;

            markersRef.current.forEach((marker) => marker.remove());
            markersRef.current = [];
            polylineRef.current?.remove();
            polylineRef.current = null;

            const points = items
                .map((item) => ({ item, lat: parseCoordinate(item.lat), lng: parseCoordinate(item.lng) }))
                .filter((point): point is { item: Serenata; lat: number; lng: number } => point.lat != null && point.lng != null);

            points.forEach(({ item, lat, lng }, index) => {
                const marker = L.marker([lat, lng], {
                    icon: L.divIcon({
                        className: '',
                        html: markerHtml(index),
                        iconSize: [36, 43],
                        iconAnchor: [18, 43],
                        popupAnchor: [0, -38],
                    }),
                }).addTo(mapRef.current!);
                marker.bindPopup(`<strong>${item.recipientName}</strong><br>${item.eventTime}<br>${item.address}`);
                markersRef.current.push(marker);
            });

            if (points.length > 1) {
                polylineRef.current = L.polyline(points.map((point) => [point.lat, point.lng]), {
                    color: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#E11D48',
                    weight: 4,
                    opacity: 0.86,
                    dashArray: '10 10',
                    lineCap: 'round',
                    lineJoin: 'round',
                }).addTo(mapRef.current);
            }

            if (points.length === 1) {
                mapRef.current.setView([points[0].lat, points[0].lng], 14);
            } else if (points.length > 1) {
                const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));
                mapRef.current.fitBounds(bounds, { padding: [42, 42] });
            }

            window.setTimeout(() => mapRef.current?.invalidateSize(), 0);
        }

        void renderMarkers();

        return () => {
            cancelled = true;
        };
    }, [items, mapReady]);

    return <div ref={containerRef} className="h-full min-h-80 w-full rounded-xl" />;
}
