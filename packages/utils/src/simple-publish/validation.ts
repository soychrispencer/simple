import { SIMPLE_PUBLISH_MIN_DESCRIPTION_LENGTH } from './constants.js';

export function validateListingDescription(
    value: string,
    minLength = SIMPLE_PUBLISH_MIN_DESCRIPTION_LENGTH,
): string | null {
    const trimmed = value.trim();
    if (!trimmed) return 'La descripción es obligatoria.';
    if (trimmed.length < minLength) {
        return `La descripción debe tener al menos ${minLength} caracteres.`;
    }
    return null;
}

export function validateListingTitle(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return 'El título es obligatorio.';
    if (trimmed.length < 5) return 'El título debe tener al menos 5 caracteres.';
    return null;
}

export function validatePhotoCount(count: number, min = 1): string | null {
    if (count < min) {
        return min === 1 ? 'Agrega al menos una foto.' : `Agrega al menos ${min} fotos.`;
    }
    return null;
}
