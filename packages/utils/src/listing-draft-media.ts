import { uploadMediaFile } from './media-upload.js';

export function isDraftPersistableUrl(url: string): boolean {
    return Boolean(url && !url.startsWith('data:') && !url.startsWith('blob:'));
}

export type DraftMediaUploadProgress = {
    fileType: 'image' | 'video';
    fileName: string;
    phase: 'uploading' | 'compressing';
    /** 0–100 durante la subida; en compresión suele quedar en 100. */
    progress: number;
};

export async function persistDraftMediaUrl(input: {
    url: string;
    file?: File;
    fileType: 'image' | 'video';
    name: string;
    mimeType: string;
    onProgress?: (progress: DraftMediaUploadProgress) => void;
}): Promise<{ ok: boolean; url?: string; error?: string }> {
    const { url, file, fileType, name, mimeType, onProgress } = input;
    if (isDraftPersistableUrl(url)) {
        return { ok: true, url };
    }
    if (!url && !file) {
        return { ok: true, url: '' };
    }

    try {
        const sourceFile = file ?? await urlToFile(url, name, mimeType);
        const result = await uploadMediaFile(sourceFile, {
            fileType,
            onProgress: (progress) => {
                onProgress?.({
                    fileType,
                    fileName: name,
                    phase: 'uploading',
                    progress,
                });
            },
            onProcessing: fileType === 'video'
                ? () => {
                    onProgress?.({
                        fileType,
                        fileName: name,
                        phase: 'compressing',
                        progress: 100,
                    });
                }
                : undefined,
        });
        if (!result.ok || !result.result) {
            return { ok: false, error: result.error || `No se pudo subir ${name}.` };
        }
        const persisted = result.result.publicUrl || result.result.url;
        if (!persisted) {
            return { ok: false, error: `No se obtuvo URL para ${name}.` };
        }
        return { ok: true, url: persisted };
    } catch {
        return { ok: false, error: `No se pudo preparar ${name} para el borrador.` };
    }
}

async function urlToFile(url: string, name: string, mimeType: string): Promise<File> {
    const blob = await fetch(url).then((response) => response.blob());
    return new File([blob], name, { type: mimeType || blob.type || 'application/octet-stream' });
}
