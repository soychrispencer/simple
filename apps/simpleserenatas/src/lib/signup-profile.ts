export const SIGNUP_PROFILE_KEY = 'serenatas-signup-profile';
/** Intención de alta en `/registrar-mariachis`; no se borra al abrir el modal de login. */
export const OWNER_SIGNUP_INTENT_KEY = 'serenatas-owner-signup-intent';

export type SignupProfile = 'client' | 'musician' | 'owner';
export type ModalSignupProfile = Exclude<SignupProfile, 'owner'>;

export function isSignupProfile(value: string | null): value is SignupProfile {
    return value === 'client' || value === 'musician' || value === 'owner' || value === 'admin';
}

export function isModalSignupProfile(value: string | null): value is ModalSignupProfile {
    return value === 'client' || value === 'musician';
}

export function readSignupProfile(): SignupProfile | null {
    if (typeof window === 'undefined') return null;
    const stored = window.localStorage.getItem(SIGNUP_PROFILE_KEY);
    return isSignupProfile(stored) ? stored : null;
}

export function persistSignupProfile(profile: SignupProfile) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIGNUP_PROFILE_KEY, profile);
    if (profile === 'owner') {
        window.sessionStorage.setItem(OWNER_SIGNUP_INTENT_KEY, '1');
    }
}

export function hasOwnerSignupIntent(): boolean {
    if (typeof window === 'undefined') return false;
    if (window.sessionStorage.getItem(OWNER_SIGNUP_INTENT_KEY) === '1') return true;
    return readSignupProfile() === 'owner';
}

export function clearOwnerSignupIntent() {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(OWNER_SIGNUP_INTENT_KEY);
}

/** Solo el perfil guardado en registro/modal; no inferir dueño por haber visitado `/registrar-mariachis`. */
export function resolveSignupProfileForBootstrap(): SignupProfile | null {
    return readSignupProfile();
}

export function clearSignupProfile() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(SIGNUP_PROFILE_KEY);
    clearOwnerSignupIntent();
}
