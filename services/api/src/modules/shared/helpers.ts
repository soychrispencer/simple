// Shared helper functions

import { appendFileSync } from 'fs';

// Debug logging
export function createDebugLogger(logFilePath: string) {
    return function logDebug(message: string): void {
        const timestamp = new Date().toISOString();
        try {
            appendFileSync(logFilePath, `[${timestamp}] ${message}\n`);
        } catch {
            // Silent fail - logging should never crash the app
        }
    };
}

// Type coercion helpers
export function asString(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value);
}

export function asNumber(value: unknown, fallback = 0): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

export function asObject<T extends Record<string, unknown>>(value: unknown): T {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as T;
    }
    return {} as T;
}

export function asArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) return value as T[];
    if (value === null || value === undefined) return [];
    return [value as T];
}

// Safe JSON parsing
export function safeJsonParse<T>(json: string, fallback: T): T {
    try {
        return JSON.parse(json) as T;
    } catch {
        return fallback;
    }
}

// String utilities
export function safeTrim(value: unknown): string {
    return asString(value).trim();
}

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

// Date utilities
export function toISOString(date: Date | number | string): string {
    if (date instanceof Date) return date.toISOString();
    if (typeof date === 'number') return new Date(date).toISOString();
    return new Date(date).toISOString();
}

export function nowTimestamp(): number {
    return Date.now();
}

// Validation helpers
export function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

export function isPositiveNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
