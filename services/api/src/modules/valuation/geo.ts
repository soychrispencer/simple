import type { GeoPoint } from '@simple/types';

export function daysSince(timestamp: number | null | undefined): number | null {
    if (timestamp == null || !Number.isFinite(timestamp)) return null;
    return Math.max(0, Math.round((Date.now() - timestamp) / (1000 * 60 * 60 * 24)));
}

export function haversineDistanceKm(a: GeoPoint, b: GeoPoint): number | null {
    if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return null;
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const sinLat = Math.sin(dLat / 2);
    const sinLon = Math.sin(dLon / 2);
    const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
    return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}
