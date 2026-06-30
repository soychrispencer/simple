/**
 * Avatar policy when linking or signing in with Google:
 * - Keep an existing user avatar (uploaded or previously set).
 * - Only use Google's `picture` when the user has no avatar yet.
 */
export function resolveAvatarAfterGoogleOAuth(
    existingAvatar: string | undefined | null,
    googlePictureRaw: unknown,
    asString: (value: unknown) => string,
): string | null {
    const existing = (typeof existingAvatar === 'string' ? existingAvatar : '').trim();
    if (existing) return existing;
    const google = asString(googlePictureRaw).trim();
    return google || null;
}
