'use client';

import type { QuickPhoto } from '@/components/quick-publish/types';

const MAX_IMAGE_SIZE = 1280;
const TARGET_BYTES = 600_000;

export function generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
        reader.readAsDataURL(file);
    });
}

export async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
        img.src = dataUrl;
    });
}

export function renderToWebp(img: HTMLImageElement, width: number, height: number, quality: number): string | null {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);
    const result = canvas.toDataURL('image/webp', quality);
    return result === 'data:,' ? null : result;
}

export function estimateBytes(dataUrl: string): number {
    const base64 = dataUrl.split(',')[1] ?? '';
    return Math.floor((base64.length * 3) / 4);
}

export async function processQuickFile(file: File, isCover: boolean): Promise<QuickPhoto> {
    const sourceDataUrl = await fileToDataUrl(file);
    const img = await loadImage(sourceDataUrl);

    const scale = Math.min(1, MAX_IMAGE_SIZE / img.width, MAX_IMAGE_SIZE / img.height);
    let width = Math.max(1, Math.round(img.width * scale));
    let height = Math.max(1, Math.round(img.height * scale));

    let quality = 0.85;
    let dataUrl = renderToWebp(img, width, height, quality) ?? sourceDataUrl;

    while (estimateBytes(dataUrl) > TARGET_BYTES && quality > 0.5) {
        quality -= 0.08;
        dataUrl = renderToWebp(img, width, height, quality) ?? dataUrl;
    }
    while (estimateBytes(dataUrl) > TARGET_BYTES && width > 640) {
        width = Math.round(width * 0.85);
        height = Math.round(height * 0.85);
        dataUrl = renderToWebp(img, width, height, quality) ?? dataUrl;
    }

    const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return {
        id: generateId(),
        dataUrl,
        previewUrl: dataUrl,
        isCover,
        name,
        mimeType: 'image/webp',
        width,
        height,
        sizeBytes: estimateBytes(dataUrl),
    };
}
