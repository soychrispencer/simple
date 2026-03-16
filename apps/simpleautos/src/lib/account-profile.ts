const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type UpdateProfileResponse = {
    ok: boolean;
    user?: {
        id: string;
        email: string;
        name: string;
        phone?: string | null;
        role: 'user' | 'admin' | 'superadmin';
        avatar?: string;
    };
    error?: string;
};

export async function updateAccountProfile(input: {
    name: string;
    phone: string;
}): Promise<{ ok: boolean; unauthorized?: boolean; error?: string }> {
    try {
        const response = await fetch(`${API_BASE}/api/account/profile`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: input.name,
                phone: input.phone.trim() || null,
            }),
        });

        const data = (await response.json().catch(() => null)) as UpdateProfileResponse | null;
        if (response.status === 401) {
            return {
                ok: false,
                unauthorized: true,
                error: 'Tu sesión expiró. Vuelve a iniciar sesión.',
            };
        }
        if (!response.ok || !data?.ok) {
            return {
                ok: false,
                error: data?.error ?? 'No pudimos actualizar tu perfil.',
            };
        }
        return { ok: true };
    } catch {
        return { ok: false, error: 'No pudimos conectar con el backend.' };
    }
}
