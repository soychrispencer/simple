export const SIGNUP_PROFILE_KEY = 'serenatas-signup-profile';

export type SignupProfile = 'client' | 'musician' | 'owner';

export function isSignupProfile(value: string | null): value is SignupProfile {
    return value === 'client' || value === 'musician' || value === 'owner';
}

export function readSignupProfile(): SignupProfile | null {
    if (typeof window === 'undefined') return null;
    const stored = window.localStorage.getItem(SIGNUP_PROFILE_KEY);
    return isSignupProfile(stored) ? stored : null;
}

export function persistSignupProfile(profile: SignupProfile) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIGNUP_PROFILE_KEY, profile);
}

export function resolveSignupProfileForBootstrap(): SignupProfile | null {
    return readSignupProfile();
}

export function clearSignupProfile() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(SIGNUP_PROFILE_KEY);
}
