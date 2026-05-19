/**
 * Normaliza File/Blob/Buffer/stream de multipart (Hono/Node) a Buffer para S3/R2.
 */
export async function readUploadBuffer(file: unknown): Promise<Buffer> {
    if (Buffer.isBuffer(file)) {
        return file;
    }

    if (file instanceof Uint8Array) {
        return Buffer.from(file);
    }

    if (file && typeof (file as Blob).arrayBuffer === 'function') {
        return Buffer.from(await (file as Blob).arrayBuffer());
    }

    if (file && typeof (file as NodeJS.ReadableStream)[Symbol.asyncIterator] === 'function') {
        const chunks: Buffer[] = [];
        for await (const chunk of file as AsyncIterable<Buffer | Uint8Array | string>) {
            if (typeof chunk === 'string') {
                chunks.push(Buffer.from(chunk));
            } else if (Buffer.isBuffer(chunk)) {
                chunks.push(chunk);
            } else {
                chunks.push(Buffer.from(chunk));
            }
        }
        return Buffer.concat(chunks);
    }

    throw new Error('Tipo de archivo no soportado para subida. Usa una imagen estándar (JPEG, PNG o WebP).');
}
