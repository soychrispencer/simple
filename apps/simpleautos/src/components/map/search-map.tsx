'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';

interface Publication {
    id: string | number;
    title: string;
    price: string;
    year?: number;
    location: string;
    coords?: [number, number];
    image?: string;
    href?: string;
}

interface SearchMapProps {
    showMap: boolean;
    publications?: Publication[];
    brandColor?: string;
}

// Caché de geocoding para evitar requests duplicadas
const geocodeCache = new Map<string, [number, number]>();
const geocodeQueue: Array<() => void> = [];
let isProcessingQueue = false;

// Función de geocoding usando Nominatim (OpenStreetMap) - gratuita
async function geocodeLocation(location: string): Promise<[number, number] | null> {
    const cacheKey = location.toLowerCase().trim();
    
    // Verificar caché primero
    if (geocodeCache.has(cacheKey)) {
        return geocodeCache.get(cacheKey)!;
    }

    // Agregar a la cola para respetar rate limiting de Nominatim (1 req/sec)
    return new Promise((resolve) => {
        const processRequest = async () => {
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location + ', Chile')}&limit=1`,
                    {
                        headers: {
                            'User-Agent': 'SimpleAutos/1.0'
                        }
                    }
                );
                const data = await response.json();
                if (data && data.length > 0) {
                    const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)] as [number, number];
                    geocodeCache.set(cacheKey, coords);
                    resolve(coords);
                } else {
                    resolve(null);
                }
            } catch {
                resolve(null);
            }
        };

        geocodeQueue.push(processRequest);
        processQueue();
    });
}

function processQueue() {
    if (isProcessingQueue || geocodeQueue.length === 0) return;
    
    isProcessingQueue = true;
    
    const processNext = () => {
        if (geocodeQueue.length === 0) {
            isProcessingQueue = false;
            return;
        }
        
        const nextRequest = geocodeQueue.shift();
        if (nextRequest) {
            nextRequest();
            // Esperar 1 segundo entre requests para respetar rate limiting de Nominatim
            setTimeout(processNext, 1000);
        }
    };
    
    processNext();
}

// Crear icono personalizado con branding configurable
const createCustomIcon = (brandColor: string = '#ff3600') => {
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
        popupAnchor: [0, -38]
    });
};

function MapView({ center }: { center: [number, number] }) {
    const map = useMap();
    const initializedRef = useRef(false);
    const centerRef = useRef(center);
    
    useEffect(() => {
        // Actualizar ref cuando cambia el centro
        centerRef.current = center;
    }, [center]);
    
    useEffect(() => {
        // Solo setear la vista cuando cambia significativamente
        const currentCenter = map.getCenter();
        const distance = map.distance(currentCenter, centerRef.current);
        
        // Solo actualizar si la distancia es mayor a 1000 metros
        if (distance > 1000) {
            map.setView(centerRef.current, 12);
        }
    }, [map]);

    return null;
}

export default function SearchMap({ showMap, publications = [], brandColor = '#ff3600' }: SearchMapProps) {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [geocodedPublications, setGeocodedPublications] = useState<Publication[]>([]);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const santiagoCoords: [number, number] = [-33.4489, -70.6693];

    // Memoizar icono personalizado
    const customIcon = useMemo(() => createCustomIcon(brandColor), [brandColor]);

    // Calcular centro del mapa basado en publicaciones geocodificadas
    const mapCenter = useMemo(() => {
        if (geocodedPublications.length > 0 && geocodedPublications[0].coords) {
            return geocodedPublications[0].coords;
        }
        return santiagoCoords;
    }, [geocodedPublications]);

    useEffect(() => {
        // Detectar dark/light mode del documento
        const checkDarkMode = () => {
            const isDark = document.documentElement.classList.contains('dark') || 
                          document.documentElement.getAttribute('data-theme') === 'dark';
            setIsDarkMode(isDark);
        };

        checkDarkMode();

        // Escuchar cambios en el tema
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'data-theme']
        });

        return () => observer.disconnect();
    }, []);

    // Geocoding de publicaciones cuando cambian
    useEffect(() => {
        if (!showMap || publications.length === 0) {
            setGeocodedPublications([]);
            setIsGeocoding(false);
            return;
        }

        const geocodePublications = async () => {
            setIsGeocoding(true);
            
            // Limitar a 20 publicaciones para evitar geocoding excesivo
            const publicationsToGeocode = publications.slice(0, 20);
            
            const geocoded: Publication[] = [];
            
            for (const pub of publicationsToGeocode) {
                // Si ya tiene coords, agregar directamente
                if (pub.coords) {
                    geocoded.push(pub);
                } else {
                    // Geocoding solo para publicaciones sin coords
                    const coords = await geocodeLocation(pub.location);
                    if (coords) {
                        geocoded.push({ ...pub, coords });
                    }
                }
            }
            
            setGeocodedPublications(geocoded);
            setIsGeocoding(false);
        };

        geocodePublications();
    }, [publications, showMap]);

    if (!showMap) return null;

    // Tiles según el tema
    const tileUrl = isDarkMode
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    const handleViewDetails = (href?: string) => {
        if (href) {
            window.location.href = href;
        }
    };

    return (
        <div className="w-full h-96 rounded-xl overflow-hidden border relative" style={{ borderColor: 'var(--border)' }}>
            {isGeocoding && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                    <div className="text-sm" style={{ color: 'var(--fg)' }}>Cargando ubicaciones...</div>
                </div>
            )}
            <MapContainer
                center={mapCenter}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution={tileAttribution}
                    url={tileUrl}
                />
                
                {geocodedPublications.length > 0 ? (
                    geocodedPublications.map((pub) => (
                        pub.coords && (
                            <Marker key={pub.id} position={pub.coords} icon={customIcon}>
                                <Popup
                                    maxWidth={280}
                                    className="custom-popup"
                                >
                                    <div className="p-0">
                                        <div className="relative">
                                            <img 
                                                src={pub.image || 'https://via.placeholder.com/280x180/ff3600/ffffff?text=Auto'} 
                                                alt={pub.title}
                                                className="w-full h-32 object-cover rounded-t-lg"
                                                style={{ borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}
                                            />
                                            <div 
                                                className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold text-white"
                                                style={{ background: brandColor }}
                                            >
                                                {pub.price}
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--fg)' }}>
                                                {pub.title}
                                            </h3>
                                            <div className="flex items-center gap-2 text-xs mb-2" style={{ color: 'var(--fg-secondary)' }}>
                                                {pub.year && <span>{pub.year}</span>}
                                                {pub.year && <span>•</span>}
                                                <span>{pub.location}</span>
                                            </div>
                                            {pub.href && (
                                                <button 
                                                    onClick={() => handleViewDetails(pub.href)}
                                                    className="w-full py-2 rounded text-sm font-medium text-white transition-colors hover:opacity-90"
                                                    style={{ background: brandColor }}
                                                >
                                                    Ver detalles
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        )
                    ))
                ) : (
                    <Marker position={santiagoCoords} icon={customIcon}>
                        <Popup>
                            <div className="p-2 text-sm" style={{ color: 'var(--fg)' }}>
                                <p className="font-medium">Santiago, Chile</p>
                                <p className="text-xs" style={{ color: 'var(--fg-secondary)' }}>Aplica filtros para ver publicaciones</p>
                            </div>
                        </Popup>
                    </Marker>
                )}
                
                <MapView center={mapCenter} />
            </MapContainer>
        </div>
    );
}
