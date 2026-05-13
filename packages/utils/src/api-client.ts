import { API_BASE } from '@simple/config';

export type ApiClientResponse<T> = {
    status: number;
    ok: boolean;
    data: T | null;
};

export type ApiClientOptions = RequestInit & {
    timeoutMs?: number;
};

export async function apiFetch<T>(path: string, init: ApiClientOptions = {}): Promise<ApiClientResponse<T>> {
    const { timeoutMs = 15000, headers, signal, ...requestInit } = init;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    if (signal) {
        if (signal.aborted) controller.abort(signal.reason);
        else signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
    }

    try {
        const response = await fetch(`${API_BASE}${path}`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            signal: controller.signal,
            ...requestInit,
        });
        const data = (await response.json().catch(() => null)) as T | null;
        return { status: response.status, ok: response.ok, data };
    } catch {
        return { status: 0, ok: false, data: null };
    } finally {
        clearTimeout(timeout);
    }
}
