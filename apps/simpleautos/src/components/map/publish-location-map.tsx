'use client';

import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import 'leaflet/dist/leaflet.css';

type Props = {
    latitude: number;
    longitude: number;
    className?: string;
};

function MapRecenter({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom, { animate: false });
        map.invalidateSize();
    }, [center, map, zoom]);
    return null;
}

function createCarIcon(brandColor: string = 'var(--accent)') {
    return L.divIcon({
        className: 'custom-marker',
        html: `
            <div style="
                background: ${brandColor};
                border: 3px solid white;
                border-radius: 50%;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                position: relative;
            ">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                    <circle cx="7" cy="17" r="2"/>
                    <circle cx="17" cy="17" r="2"/>
                </svg>
                <div style="
                    position: absolute;
                    bottom: -6px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 0;
                    height: 0;
                    border-left: 6px solid transparent;
                    border-right: 6px solid transparent;
                    border-top: 6px solid white;
                "></div>
            </div>
        `,
        iconSize: [32, 38],
        iconAnchor: [16, 38],
        popupAnchor: [0, -38],
    });
}

/** Mapa simple Leaflet (mismo estilo CARTO que la home). */
export default function PublishLocationMap({ latitude, longitude, className }: Props) {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const center = useMemo<[number, number]>(() => [latitude, longitude], [latitude, longitude]);
    const pinIcon = useMemo(() => createCarIcon('var(--accent)'), []);

    useEffect(() => {
        const checkDarkMode = () => {
            const isDark = document.documentElement.classList.contains('dark')
                || document.documentElement.getAttribute('data-theme') === 'dark';
            setIsDarkMode(isDark);
        };
        checkDarkMode();
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'data-theme'],
        });
        return () => observer.disconnect();
    }, []);

    const tileUrl = isDarkMode
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    return (
        <div className={className ?? 'h-52 w-full overflow-hidden rounded-xl border relative autos-map-border'}>
            <MapContainer
                key={`${latitude.toFixed(5)},${longitude.toFixed(5)}`}
                center={center}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
                attributionControl={false}
            >
                <TileLayer
                    attribution='&copy; OpenStreetMap &copy; CARTO'
                    url={tileUrl}
                />
                <Marker position={center} icon={pinIcon} />
                <MapRecenter center={center} zoom={15} />
            </MapContainer>
        </div>
    );
}
