export type OptimizedListingPhoto = {
    dataUrl: string;
    previewUrl: string;
    width: number;
    height: number;
    sizeBytes: number;
    mimeType: string;
    name: string;
};

export type OptimizeListingPhotoOptions = {
    maxWidth?: number;
    maxHeight?: number;
    minWidth?: number;
    minHeight?: number;
    targetBytes?: number;
};

export const DEFAULT_LISTING_PHOTO_OPTS = {
    maxWidth: 1400,
    maxHeight: 1200,
    minWidth: 600,
    minHeight: 400,
    targetBytes: 280_000,
} as const;

function estimateDataUrlBytes(dataUrl: string): number {
    const commaIndex = dataUrl.indexOf(',');
    const payload = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
    return Math.ceil((payload.length * 3) / 4);
}

async function fileToDataUrl(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
        reader.readAsDataURL(file);
    });
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        image.src = dataUrl;
    });
}

function renderImageToWebpDataUrl(
    image: HTMLImageElement,
    width: number,
    height: number,
    quality: number,
): string {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/webp', quality);
}

/** Comprime una foto de listado a WebP en el navegador. */
export async function optimizeListingPhotoFile(
    file: File,
    options: OptimizeListingPhotoOptions = {},
): Promise<OptimizedListingPhoto> {
    const {
        maxWidth = DEFAULT_LISTING_PHOTO_OPTS.maxWidth,
        maxHeight = DEFAULT_LISTING_PHOTO_OPTS.maxHeight,
        minWidth = DEFAULT_LISTING_PHOTO_OPTS.minWidth,
        minHeight = DEFAULT_LISTING_PHOTO_OPTS.minHeight,
        targetBytes = DEFAULT_LISTING_PHOTO_OPTS.targetBytes,
    } = options;

    const sourceDataUrl = await fileToDataUrl(file);
    const image = await loadImage(sourceDataUrl);

    if (image.width < minWidth || image.height < minHeight) {
        throw new Error(`La imagen ${file.name} debe tener al menos ${minWidth} x ${minHeight} px.`);
    }

    let width = image.width;
    let height = image.height;
    const initialScale = Math.min(1, maxWidth / width, maxHeight / height);
    width = Math.max(1, Math.round(width * initialScale));
    height = Math.max(1, Math.round(height * initialScale));

    let quality = 0.86;
    let currentDataUrl = renderImageToWebpDataUrl(image, width, height, quality);
    if (!currentDataUrl) {
        throw new Error(`No se pudo procesar la imagen ${file.name}.`);
    }

    while (estimateDataUrlBytes(currentDataUrl) > targetBytes && quality > 0.54) {
        quality -= 0.07;
        currentDataUrl = renderImageToWebpDataUrl(image, width, height, quality);
        if (!currentDataUrl) break;
    }

    while (estimateDataUrlBytes(currentDataUrl) > targetBytes && width > 720 && height > 480) {
        width = Math.max(minWidth, Math.round(width * 0.9));
        height = Math.max(minHeight, Math.round(height * 0.9));
        currentDataUrl = renderImageToWebpDataUrl(image, width, height, quality);
        if (!currentDataUrl) break;
    }

    const normalizedName = file.name.replace(/\.[^.]+$/, '') || 'imagen';

    return {
        name: `${normalizedName}.webp`,
        dataUrl: currentDataUrl,
        previewUrl: currentDataUrl,
        width,
        height,
        sizeBytes: estimateDataUrlBytes(currentDataUrl),
        mimeType: 'image/webp',
    };
}
