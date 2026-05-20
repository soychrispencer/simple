'use client';

import { Suspense, useEffect, useState } from 'react';
import { AuthModal, AuthProvider, useAuth } from '@simple/auth';
import { IconHeart, IconMusic } from '@tabler/icons-react';
import { LogoutHomeRedirect } from '@/components/logout-home-redirect';
import { SignupProfileBootstrap } from '@/components/signup-profile-bootstrap';
import { GroupInviteBootstrap } from '@/components/group-invite-bootstrap';
import {
    clearSignupProfile,
    isModalSignupProfile,
    persistSignupProfile,
    readSignupProfile,
    type ModalSignupProfile,
    type SignupProfile,
} from '@/lib/signup-profile';

function AuthModalWithSignupProfile() {
    const { authOpen } = useAuth();
    const [signupProfile, setSignupProfile] = useState<SignupProfile | null>(null);

    useEffect(() => {
        const stored = readSignupProfile();
        if (isModalSignupProfile(stored)) setSignupProfile(stored);
    }, []);

    useEffect(() => {
        if (!authOpen) return;
        const stored = readSignupProfile();
        if (stored === 'owner') {
            return;
        }
        if (isModalSignupProfile(stored)) setSignupProfile(stored);
    }, [authOpen]);

    const canSubmitRegister = isModalSignupProfile(signupProfile);

    function chooseSignupProfile(next: ModalSignupProfile) {
        setSignupProfile(next);
        persistSignupProfile(next);
    }

    return (
        <AuthModal
            canSubmitRegister={canSubmitRegister}
            registerDisabledMessage="Elige si usarás SimpleSerenatas como cliente o músico."
            registerIntro={
                <RegisterProfilePicker signupProfile={signupProfile} onChoose={chooseSignupProfile} />
            }
        />
    );
}

function RegisterProfilePicker({
    signupProfile,
    onChoose,
}: {
    signupProfile: SignupProfile | null;
    onChoose: (profile: ModalSignupProfile) => void;
}) {
    const modalProfile = isModalSignupProfile(signupProfile) ? signupProfile : null;

    return (
        <div>
            <p className="mb-2 text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
                ¿Cómo usarás SimpleSerenatas?
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                    { key: 'client' as const, label: 'Cliente', icon: IconHeart },
                    { key: 'musician' as const, label: 'Músico', icon: IconMusic },
                ].map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        onClick={() => onChoose(item.key)}
                        className="flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition"
                        style={{
                            borderColor: modalProfile === item.key ? 'var(--accent)' : 'var(--border)',
                            background:
                                modalProfile === item.key
                                    ? 'color-mix(in oklab, var(--accent) 12%, var(--surface))'
                                    : 'var(--surface)',
                            color: modalProfile === item.key ? 'var(--accent)' : 'var(--fg-secondary)',
                        }}
                    >
                        <item.icon size={17} />
                        {item.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <LogoutHomeRedirect />
            <SignupProfileBootstrap />
            <Suspense fallback={null}>
                <GroupInviteBootstrap />
            </Suspense>
            {children}
            <AuthModalWithSignupProfile />
        </AuthProvider>
    );
}
