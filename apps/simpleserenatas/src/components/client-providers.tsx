'use client';

import { useEffect, useState } from 'react';
import { AuthModal, AuthProvider } from '@simple/auth';
import { IconHeart, IconMusic } from '@tabler/icons-react';

const SIGNUP_PROFILE_KEY = 'serenatas-signup-profile';
type SignupProfile = 'client' | 'musician';

export function ClientProviders({ children }: { children: React.ReactNode }) {
    const [signupProfile, setSignupProfile] = useState<SignupProfile | null>(null);

    useEffect(() => {
        const stored = window.localStorage.getItem(SIGNUP_PROFILE_KEY);
        if (stored === 'client' || stored === 'musician') {
            setSignupProfile(stored);
        }
    }, []);

    function chooseSignupProfile(next: SignupProfile) {
        setSignupProfile(next);
        window.localStorage.setItem(SIGNUP_PROFILE_KEY, next);
    }

    return (
        <AuthProvider>
            {children}
            <AuthModal
                canSubmitRegister={Boolean(signupProfile)}
                registerDisabledMessage="Elige si usarás SimpleSerenatas como cliente o músico."
                registerIntro={
                    <div>
                        <p className="mb-2 text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
                            ¿Cómo usarás SimpleSerenatas?
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { key: 'client' as const, label: 'Cliente', icon: IconHeart },
                                { key: 'musician' as const, label: 'Músico', icon: IconMusic },
                            ].map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => chooseSignupProfile(item.key)}
                                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition"
                                    style={{
                                        borderColor: signupProfile === item.key ? 'var(--accent)' : 'var(--border)',
                                        background: signupProfile === item.key
                                            ? 'color-mix(in oklab, var(--accent) 12%, var(--surface))'
                                            : 'var(--surface)',
                                        color: signupProfile === item.key ? 'var(--accent)' : 'var(--fg-secondary)',
                                    }}
                                >
                                    <item.icon size={17} />
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                }
            />
        </AuthProvider>
    );
}
