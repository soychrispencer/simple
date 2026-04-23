'use client';

import { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Serenata {
  id: string;
  clientName: string;
  address: string;
  lat: number;
  lng: number;
  time: string;
  status: string;
  price: number;
}

interface RouteMapProps {
  serenatas: Serenata[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  optimizedOrder?: string[];
}

// Fix Leaflet default icon issue
const DefaultIcon = L.icon({
  iconUrl: '/marker-icon.png',
  iconRetinaUrl: '/marker-icon-2x.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.setIcon(DefaultIcon);

export default function RouteMap({ 
  serenatas, 
  selectedId, 
  onSelect,
  optimizedOrder = []
}: RouteMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const routeLayerRef = useRef<L.Polyline | null>(null);

  // Center of Santiago
  const defaultCenter: L.LatLngExpression = [-33.4489, -70.6693];

  // Create ordered list based on optimization
  const orderedSerenatas = useMemo(() => {
    if (optimizedOrder.length === 0) return serenatas;
    return optimizedOrder
      .map(id => serenatas.find(s => s.id === id))
      .filter((s): s is Serenata => s !== undefined);
  }, [serenatas, optimizedOrder]);

  useEffect(() => {
    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map('route-map', {
        center: defaultCenter,
        zoom: 12,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapRef.current);

      // Add zoom control at bottom right
      L.control.zoom({
        position: 'bottomright',
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();

    // Clear existing route
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    // Add markers
    const bounds = L.latLngBounds([]);
    
    orderedSerenatas.forEach((serenata, index) => {
      const isSelected = selectedId === serenata.id;
      const isOptimized = optimizedOrder.length > 0;
      
      // Create custom marker icon
      const markerHtml = `
        <div style="
          background-color: ${isSelected ? '#E11D48' : isOptimized ? (index === 0 ? '#22C55E' : index === orderedSerenatas.length - 1 ? '#E11D48' : '#3B82F6') : '#6B7280'};
          color: white;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">
          ${index + 1}
        </div>
      `;

      const icon = L.divIcon({
        html: markerHtml,
        className: 'custom-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([serenata.lat, serenata.lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: system-ui, sans-serif; min-width: 200px;">
            <h3 style="font-weight: 600; margin: 0 0 4px 0;">${serenata.clientName}</h3>
            <p style="margin: 0 0 4px 0; color: #666; font-size: 14px;">${serenata.address}</p>
            <p style="margin: 0; font-weight: 500;">${serenata.time} · $${serenata.price.toLocaleString('es-CL')}</p>
          </div>
        `);

      marker.on('click', () => {
        onSelect?.(serenata.id);
      });

      markersRef.current.set(serenata.id, marker);
      bounds.extend([serenata.lat, serenata.lng]);
    });

    // Draw route line if optimized
    if (optimizedOrder.length > 1) {
      const routePoints = orderedSerenatas.map(s => [s.lat, s.lng] as L.LatLngExpression);
      routeLayerRef.current = L.polyline(routePoints, {
        color: '#3B82F6',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 10',
      }).addTo(map);
    }

    // Fit bounds if we have markers
    if (orderedSerenatas.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    return () => {
      // Cleanup
      markersRef.current.forEach(marker => marker.remove());
      if (routeLayerRef.current) routeLayerRef.current.remove();
    };
  }, [orderedSerenatas, selectedId, onSelect, optimizedOrder]);

  // Handle selected marker
  useEffect(() => {
    if (selectedId && markersRef.current.has(selectedId)) {
      const marker = markersRef.current.get(selectedId);
      if (marker) {
        marker.openPopup();
        mapRef.current?.panTo(marker.getLatLng());
      }
    }
  }, [selectedId]);

  return (
    <div 
      id="route-map" 
      className="w-full h-full rounded-xl overflow-hidden"
      style={{ zIndex: 1 }}
    />
  );
}
