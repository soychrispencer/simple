'use client';

import { useState, cloneElement, type ReactElement } from 'react';
import { startGoogleOAuthLogin } from './google-oauth';

type GoogleLoginChildProps = {
    onClick?: () => void;
    disabled?: boolean;
};

type GoogleLoginButtonProps = {
    children: ReactElement<GoogleLoginChildProps>;
    disabled?: boolean;
    highlighted?: boolean;
    onError?: (message: string) => void;
};

export default function GoogleLoginButton({
    children,
    disabled = false,
    highlighted = false,
    onError,
}: GoogleLoginButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        if (disabled || loading) return;

        try {
            setLoading(true);
            await startGoogleOAuthLogin();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No pudimos iniciar el acceso con Google.';
            onError?.(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="rounded-xl transition-shadow"
            style={
                highlighted
                    ? { boxShadow: '0 0 0 2px var(--surface), 0 0 0 4px color-mix(in srgb, var(--accent) 65%, transparent)' }
                    : undefined
            }
        >
            {cloneElement(children, {
                onClick: handleGoogleLogin,
                disabled: disabled || loading,
            })}
        </div>
    );
}
