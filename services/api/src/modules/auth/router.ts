import { Hono } from 'hono';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { logger } from '@simple/logger';
import { sanitizeBrowserReturnUrl } from '../../lib/browser-origin.js';
import {
    buildGoogleOAuthState,
    googleOAuthErrorCode,
    verifyGoogleOAuthState,
    type GoogleOAuthStatePayload,
} from './google-oauth-state.js';
import { cleanupReplacedMediaUrl } from '../media/stored-object.js';
import {
    sendNotificationTestEmail,
    sendNotificationTestWhatsApp,
} from '../../lib/notification-test-delivery.js';
import { getRecentUserNotificationLogs } from '../../lib/user-notification-log.js';
import { resolveAvatarAfterGoogleOAuth } from './google-oauth-avatar.js';

export type AuthRouterDeps = {
    db: any;
    eq: any;
    and: any;
    gt: any;
    isNull: any;
    sql: any;
    tables: {
        users: any;
        passwordResetTokens: any;
        emailVerificationTokens: any;
        userPlatformAccess: any;
    };
    bcrypt: { hash: (pw: string, rounds: number) => Promise<string>; compare: (pw: string, hash: string) => Promise<boolean> };
    getUserByEmail: (email: string) => Promise<any | null>;
    getUserById: (id: string) => Promise<any | null>;
    sanitizeUser: (user: any) => any;
    mapUserRowToAppUser: (row: any) => any;
    canAuthenticateUser: (user: any) => boolean;
    ensurePrimaryAccountForUser: (user: any) => Promise<any>;
    touchUserLastLoginAt: (userId: string) => Promise<void>;
    setSession: (c: any, userId: string) => void;
    clearSession: (c: any) => void;
    authUser: (c: any) => Promise<any | null>;
    getClientIdentifier: (c: any) => string;
    consumeRateLimit: (key: string, limit: number, windowMs: number) => { ok: boolean; retryAfterSeconds: number };
    clearRateLimit: (key: string) => void;
    resolveBrowserOrigin: (c: any) => string | null;
    isAuthEmailConfigured: () => boolean;
    issueEmailVerification: (userId: string, email: string, origin: string) => Promise<void>;
    sendPasswordResetEmail: (email: string, url: string, origin: string, userId?: string) => Promise<void>;
    sendPasswordChangedEmail: (email: string, origin: string, userId?: string) => Promise<void>;
    sendWelcomeEmail: (email: string, name: string, origin: string, userId?: string) => Promise<void>;
    buildPasswordResetUrl: (origin: string, token: string) => string;
    hashOpaqueToken: (token: string) => string;
    buildGoogleRedirectUri: (origin: string) => string;
    asString: (v: unknown) => string;
    asObject: (v: unknown) => Record<string, unknown>;
    safeEqualStrings: (a: string, b: string) => boolean;
    SESSION_SECRET: string;
    AUTH_RATE_LIMIT_WINDOW_MS: number;
    PASSWORD_RESET_TOKEN_TTL_MS: number;
    loginSchema: any;
    registerSchema: any;
    passwordResetRequestSchema: any;
    passwordResetConfirmSchema: any;
    passwordChangeSchema: any;
    emailVerificationRequestSchema: any;
    emailVerificationConfirmSchema: any;
    getUserPendingEmail: (userId: string) => Promise<string | null>;
    applyUserEmailChange: (userId: string, email: string) => Promise<void>;
    permanentlyDeleteUser?: (userId: string) => Promise<void>;
    countActiveSuperadminUsers?: () => Promise<number>;
};

const deleteAccountSchema = z.object({
    password: z.string().optional(),
    confirmPhrase: z.string().optional(),
});

export function createAuthRouter(deps: AuthRouterDeps) {
    const app = new Hono<{ Variables: { userId: string } }>();

    // â”€â”€ One-time OAuth tokens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const pendingOAuthSessions = new Map<string, { userId: string; expiresAt: number }>();
    const cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [k, v] of pendingOAuthSessions) {
            if (v.expiresAt < now) pendingOAuthSessions.delete(k);
        }
    }, 30_000);

    // Store cleanup function for graceful shutdown
    (app as any).cleanup = () => clearInterval(cleanupInterval);

    type SimpleUserApp = 'simpleagenda' | 'simpleautos' | 'simplepropiedades' | 'simpleserenatas';
    type SignupSource = {
        app: 'simpleadmin' | 'simpleplataforma' | SimpleUserApp | 'unknown';
        primaryVertical: 'agenda' | 'autos' | 'propiedades' | null;
    };

    const userFacingApps: SimpleUserApp[] = ['simpleagenda', 'simpleautos', 'simplepropiedades', 'simpleserenatas'];

    const appLabels: Record<SimpleUserApp, string> = {
        simpleagenda: 'SimpleAgenda',
        simpleautos: 'SimpleAutos',
        simplepropiedades: 'SimplePropiedades',
        simpleserenatas: 'SimpleSerenatas',
    };

    const defaultAppRoles: Record<SimpleUserApp, string> = {
        simpleagenda: 'professional',
        simpleautos: 'publisher',
        simplepropiedades: 'publisher',
        simpleserenatas: 'user',
    };

    function resolveSignupSource(origin: string | null): SignupSource {
        if (!origin) return { app: 'unknown', primaryVertical: null };
        let hostname = '';
        try {
            hostname = new URL(origin).hostname.toLowerCase();
        } catch {
            return { app: 'unknown', primaryVertical: null };
        }

        if (hostname.includes('admin.simpleplataforma')) return { app: 'simpleadmin', primaryVertical: null };
        if (hostname.includes('simpleagenda')) return { app: 'simpleagenda', primaryVertical: 'agenda' };
        if (hostname.includes('simpleautos')) return { app: 'simpleautos', primaryVertical: 'autos' };
        if (hostname.includes('simplepropiedades')) return { app: 'simplepropiedades', primaryVertical: 'propiedades' };
        if (hostname.includes('simpleserenatas')) return { app: 'simpleserenatas', primaryVertical: null };
        if (hostname.includes('simpleplataforma')) return { app: 'simpleplataforma', primaryVertical: null };
        return { app: 'unknown', primaryVertical: null };
    }

    function resolveCurrentApp(c: any): SimpleUserApp | null {
        const explicit = deps.asString(c.req.header('x-simple-app')).trim().toLowerCase();
        if (userFacingApps.includes(explicit as SimpleUserApp)) return explicit as SimpleUserApp;
        const source = resolveSignupSource(deps.resolveBrowserOrigin(c));
        return userFacingApps.includes(source.app as SimpleUserApp) ? source.app as SimpleUserApp : null;
    }

    async function upsertPlatformAccess(input: {
        userId: string;
        app: SimpleUserApp | null;
        origin: string | null;
        role?: string;
        markLogin?: boolean;
        activate?: boolean;
    }): Promise<void> {
        if (!input.app) return;
        const now = new Date();
        const role = input.role || defaultAppRoles[input.app] || 'user';
        const table = deps.tables.userPlatformAccess;
        await deps.db
            .insert(table)
            .values({
                userId: input.userId,
                app: input.app,
                role,
                status: 'active',
                origin: input.origin,
                activatedAt: input.activate === false ? null : now,
                lastLoginAt: input.markLogin === false ? null : now,
                createdAt: now,
                updatedAt: now,
            })
            .onConflictDoUpdate({
                target: [table.userId, table.app],
                set: {
                    role: deps.sql`COALESCE(NULLIF(${table.role}, ''), excluded.role)`,
                    status: input.activate === false ? deps.sql`${table.status}` : 'active',
                    origin: deps.sql`COALESCE(${table.origin}, excluded.origin)`,
                    activatedAt: input.activate === false
                        ? deps.sql`${table.activatedAt}`
                        : deps.sql`COALESCE(${table.activatedAt}, excluded.activated_at)`,
                    lastLoginAt: input.markLogin === false
                        ? deps.sql`${table.lastLoginAt}`
                        : deps.sql`excluded.last_login_at`,
                    updatedAt: now,
                },
            });
    }

    async function listPlatformAccesses(userId: string) {
        const rows = await deps.db
            .select()
            .from(deps.tables.userPlatformAccess)
            .where(deps.eq(deps.tables.userPlatformAccess.userId, userId));
        return userFacingApps.map((app) => {
            const row = rows.find((entry: any) => entry.app === app);
            return {
                app,
                label: appLabels[app],
                status: row?.status ?? 'inactive',
                role: row?.role ?? defaultAppRoles[app],
                origin: row?.origin ?? null,
                firstSeenAt: row?.firstSeenAt ?? null,
                activatedAt: row?.activatedAt ?? null,
                lastLoginAt: row?.lastLoginAt ?? null,
            };
        });
    }

    async function sanitizeUserWithPlatformAccess(user: any, c: any) {
        return {
            ...deps.sanitizeUser(user),
            currentApp: resolveCurrentApp(c),
            platformAccesses: await listPlatformAccesses(user.id),
        };
    }

    async function createUserRegistrationAudit(input: {
        userId: string;
        email: string;
        provider: 'local' | 'google';
        origin: string | null;
        source: SignupSource;
    }): Promise<void> {
        try {
            await deps.db.execute(deps.sql`
                INSERT INTO admin_audit_logs (actor_user_id, action, entity_type, entity_id, payload)
                VALUES (
                    ${input.userId},
                    'user.registered',
                    'user',
                    ${input.userId},
                    ${JSON.stringify({
                        email: input.email,
                        provider: input.provider,
                        origin: input.origin,
                        signupApp: input.source.app,
                        primaryVertical: input.source.primaryVertical,
                    })}::jsonb
                )
            `);
        } catch (error) {
            console.error('[auth audit] error creating registration log', error);
        }
    }

    function normalizeSignupPhone(raw: unknown): string | null {
        if (typeof raw !== 'string') return null;
        const normalized = raw.replace(/[\s().-]/g, '').trim();
        return /^\+569\d{8}$/.test(normalized) ? normalized : null;
    }

    async function verifyCaptchaToken(token: unknown, remoteIp?: string): Promise<boolean> {
        const secret = deps.asString(process.env.RECAPTCHA_SECRET_KEY);
        if (!secret) return true;
        if (typeof token !== 'string' || !token.trim()) return false;
        try {
            const params = new URLSearchParams({
                secret,
                response: token.trim(),
            });
            if (remoteIp) params.set('remoteip', remoteIp);
            const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params,
            });
            const data = await response.json().catch(() => null) as { success?: boolean; score?: number } | null;
            if (!data?.success) return false;
            const minScore = Number(process.env.RECAPTCHA_MIN_SCORE ?? '0.5');
            return typeof data.score === 'number' ? data.score >= minScore : true;
        } catch (error) {
            console.error('[auth captcha] verification error', error);
            return false;
        }
    }

    function resolveLinkUserFromState(
        stateData: GoogleOAuthStatePayload | null,
    ): Promise<{ id: string; email: string } | undefined> {
        if (!stateData || stateData.mode !== 'link' || !stateData.userId) {
            return Promise.resolve(undefined);
        }
        return deps.getUserById(stateData.userId).then((user) => {
            if (!user || !deps.canAuthenticateUser(user)) return undefined;
            return { id: user.id, email: user.email };
        });
    }

    async function linkGoogleToSessionUser(
        googleUser: Record<string, unknown>,
        normalizedEmail: string,
        sessionUser: { id: string; email: string },
    ): Promise<
        | { ok: true; user: any; isNewUser: false }
        | { ok: false; error: string; status: number }
    > {
        const accountEmail = deps.asString(sessionUser.email).trim().toLowerCase();
        if (normalizedEmail !== accountEmail) {
            return {
                ok: false,
                error: `La cuenta de Google (${normalizedEmail}) no coincide con el correo de esta cuenta (${accountEmail}). Usa la misma cuenta de Google o inicia sesión con Google desde la pantalla de acceso.`,
                status: 409,
            };
        }

        let user = await deps.getUserById(sessionUser.id);
        if (!user || !deps.canAuthenticateUser(user)) {
            return { ok: false, error: 'No se pudo vincular Google a tu cuenta.', status: 400 };
        }

        const existingByEmail = await deps.getUserByEmail(normalizedEmail);
        if (existingByEmail && existingByEmail.id !== user.id) {
            return {
                ok: false,
                error: 'Ese correo de Google ya está registrado en otra cuenta.',
                status: 409,
            };
        }

        const personalAccount = await deps.ensurePrimaryAccountForUser(user);
        const nextLoginAt = new Date();
        const nextAvatarUrl = resolveAvatarAfterGoogleOAuth(user.avatar, googleUser.picture, deps.asString);
        await deps.db.update(deps.tables.users).set({
            name: deps.asString(googleUser.name) || user.name,
            avatarUrl: nextAvatarUrl,
            provider: 'google',
            providerId: deps.asString(googleUser.id) || user.providerId || null,
            status: googleUser.verified_email ? 'verified' : user.status,
            updatedAt: nextLoginAt,
            lastLoginAt: nextLoginAt,
        }).where(deps.eq(deps.tables.users.id, user.id));

        const refreshed = await deps.getUserById(user.id);
        if (!refreshed || !deps.canAuthenticateUser(refreshed)) {
            return { ok: false, error: 'No se pudo vincular Google a tu cuenta.', status: 400 };
        }

        user = { ...refreshed, primaryAccountId: personalAccount.id };

        return { ok: true, user, isNewUser: false };
    }

    async function exchangeGoogleCode(
        code: string,
        state: string,
        c: any,
        linkToSessionUser?: { id: string; email: string },
    ): Promise<
        | { ok: true; user: any; origin: string; isNewUser: boolean }
        | { ok: false; error: string; status: number }
    > {
        if (!code || !state) return { ok: false, error: 'Código de autorización inválido', status: 400 };
        const stateData = verifyGoogleOAuthState(state, deps.SESSION_SECRET, deps.safeEqualStrings);
        if (!stateData) return { ok: false, error: 'Tu sesión de autenticación con Google expiró. Intenta nuevamente.', status: 400 };

        const origin = stateData.origin;
        const googleClientId = deps.asString(process.env.GOOGLE_CLIENT_ID);
        const googleClientSecret = deps.asString(process.env.GOOGLE_CLIENT_SECRET);
        if (!googleClientId || !googleClientSecret) return { ok: false, error: 'Google OAuth no configurado', status: 500 };

        // Use GOOGLE_REDIRECT_URI env var if set, otherwise fallback to building from origin
        const configuredRedirectUri = process.env.GOOGLE_REDIRECT_URI;
        const redirectUri = configuredRedirectUri || deps.buildGoogleRedirectUri(origin);
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ client_id: googleClientId, client_secret: googleClientSecret, code, grant_type: 'authorization_code', redirect_uri: redirectUri }),
        });
        const tokens = await tokenResponse.json();
        if (!tokenResponse.ok) {
            console.error('Google token error:', tokens);
            return { ok: false, error: 'Error obteniendo tokens de Google', status: 400 };
        }

        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { 'Authorization': `Bearer ${tokens.access_token}` },
        });
        const googleUser = await userResponse.json();
        if (!userResponse.ok) return { ok: false, error: 'No pudimos obtener la información de tu cuenta de Google.', status: 400 };

        const normalizedEmail = deps.asString(googleUser.email).toLowerCase();
        if (!normalizedEmail) return { ok: false, error: 'Google no devolvió un correo válido.', status: 400 };

        if (linkToSessionUser) {
            const linked = await linkGoogleToSessionUser(googleUser, normalizedEmail, linkToSessionUser);
            if (!linked.ok) return linked;
            return { ok: true, user: linked.user, origin, isNewUser: linked.isNewUser };
        }

        let user = await deps.getUserByEmail(normalizedEmail);
        if (user && !deps.canAuthenticateUser(user)) return { ok: false, error: 'Tu cuenta está suspendida. Contacta al soporte.', status: 403 };

        let isNewUser = false;
        if (!user) {
            return {
                ok: false,
                error: 'Primero regístrate con tus datos y WhatsApp. Después podrás vincular Google desde tu cuenta.',
                status: 409,
            };
        } else {
            const personalAccount = await deps.ensurePrimaryAccountForUser(user);
            const nextLoginAt = new Date();
            const nextAvatarUrl = resolveAvatarAfterGoogleOAuth(user.avatar, googleUser.picture, deps.asString);
            await deps.db.update(deps.tables.users).set({
                name: deps.asString(googleUser.name) || user.name,
                avatarUrl: nextAvatarUrl,
                provider: 'google',
                providerId: deps.asString(googleUser.id) || user.providerId || null,
                status: googleUser.verified_email ? 'verified' : user.status,
                updatedAt: nextLoginAt,
                lastLoginAt: nextLoginAt,
            }).where(deps.eq(deps.tables.users.id, user.id));
            const refreshed = await deps.getUserById(user.id);
            user = refreshed
                ? { ...refreshed, primaryAccountId: personalAccount.id }
                : { ...user, avatar: nextAvatarUrl ?? undefined, name: deps.asString(googleUser.name) || user.name, provider: 'google', providerId: deps.asString(googleUser.id) || user.providerId, status: googleUser.verified_email ? 'verified' : user.status, lastLoginAt: nextLoginAt, primaryAccountId: personalAccount.id };
        }

        if (!user.lastLoginAt) {
            await deps.touchUserLastLoginAt(user.id);
            user = { ...user, lastLoginAt: new Date() };
        }

        return { ok: true, user, origin, isNewUser };
    }

    // â”€â”€ Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    app.post('/login', async (c) => {
        const payload = await c.req.json().catch(() => null);
        const parsed = deps.loginSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Solicitud inválida.' }, 400);

        const normalizedEmail = parsed.data.email.trim().toLowerCase();
        const clientId = deps.getClientIdentifier(c);
        const ipRateLimit = deps.consumeRateLimit(`auth:login:ip:${clientId}`, 10, deps.AUTH_RATE_LIMIT_WINDOW_MS);
        if (!ipRateLimit.ok) {
            c.header('Retry-After', String(ipRateLimit.retryAfterSeconds));
            return c.json({ ok: false, error: 'Demasiados intentos. Intenta nuevamente en unos minutos.' }, 429);
        }
        const emailRateLimit = deps.consumeRateLimit(`auth:login:email:${normalizedEmail}`, 10, deps.AUTH_RATE_LIMIT_WINDOW_MS);
        if (!emailRateLimit.ok) {
            c.header('Retry-After', String(emailRateLimit.retryAfterSeconds));
            return c.json({ ok: false, error: 'Demasiados intentos. Intenta nuevamente en unos minutos.' }, 429);
        }

        const user = await deps.getUserByEmail(normalizedEmail);
        if (!user) return c.json({ ok: false, error: 'Tu correo o contraseña no coinciden. Si no tienes cuenta, regístrate.' }, 401);
        if (!deps.canAuthenticateUser(user)) return c.json({ ok: false, error: 'Tu cuenta está suspendida. Contacta al soporte.', }, 403);
        if (!user.passwordHash) {
            return c.json({
                ok: false,
                error: 'Esta cuenta se creó con Google y no tiene contraseña. Usa "Continuar con Google" o restablece tu contraseña para entrar con correo y contraseña.',
            }, 401);
        }

        const passwordMatch = await deps.bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!passwordMatch) return c.json({ ok: false, error: 'Tu correo o contraseña no coinciden.' }, 401);

        await deps.touchUserLastLoginAt(user.id);
        await upsertPlatformAccess({
            userId: user.id,
            app: resolveCurrentApp(c),
            origin: deps.resolveBrowserOrigin(c),
            markLogin: true,
            activate: true,
        });
        const personalAccount = await deps.ensurePrimaryAccountForUser(user);
        const profile = null;
        deps.clearRateLimit(`auth:login:ip:${clientId}`);
        deps.clearRateLimit(`auth:login:email:${normalizedEmail}`);
        deps.setSession(c, user.id);
        return c.json({
            ok: true,
            user: await sanitizeUserWithPlatformAccess({ ...user, lastLoginAt: new Date(), primaryAccountId: personalAccount.id }, c),
            ...(profile ? { profile } : {}),
        });
    });

    app.post('/register', async (c) => {
        const payload = await c.req.json().catch(() => null);

        const parsed = deps.registerSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Solicitud inválida.' }, 400);

        const clientId = deps.getClientIdentifier(c);
        const ipRateLimit = deps.consumeRateLimit(`auth:register:ip:${clientId}`, 5, deps.AUTH_RATE_LIMIT_WINDOW_MS);
        if (!ipRateLimit.ok) {
            c.header('Retry-After', String(ipRateLimit.retryAfterSeconds));
            return c.json({ ok: false, error: 'Hiciste demasiados intentos de registro. Intenta nuevamente más tarde.' }, 429);
        }

        if (process.env.NODE_ENV === 'production' && !deps.isAuthEmailConfigured()) {
            return c.json({ ok: false, error: 'El registro no está disponible porque el correo de verificación no está configurado.' }, 503);
        }

        const origin = deps.resolveBrowserOrigin(c);
        if (!origin) return c.json({ ok: false, error: 'Origin no autorizado' }, 403);

        const normalizedEmail = parsed.data.email.trim().toLowerCase();
        const existing = await deps.getUserByEmail(normalizedEmail);
        if (existing) {
            return c.json({
                ok: false,
                error: 'Este correo ya tiene una Cuenta Simple. Inicia sesión para activar esta plataforma con la misma cuenta, o usa otro correo si prefieres separar tus cuentas.',
            }, 409);
        }
        const normalizedPhone = normalizeSignupPhone(parsed.data.phone);
        if (!normalizedPhone) {
            return c.json({ ok: false, error: 'Ingresa un WhatsApp válido con formato +569XXXXXXXX.' }, 400);
        }
        if (parsed.data.termsAccepted !== true) {
            return c.json({ ok: false, error: 'Debes aceptar los términos y condiciones para registrarte.' }, 400);
        }
        const captchaOk = await verifyCaptchaToken(parsed.data.captchaToken, clientId);
        if (!captchaOk) {
            return c.json({ ok: false, error: 'No pudimos validar el captcha. Intenta nuevamente.' }, 400);
        }

        const hashedPassword = await deps.bcrypt.hash(parsed.data.password, 10);
        const signupSource = resolveSignupSource(origin);


        let insertedUser: any;
        await deps.db.transaction(async (tx: any) => {
            const [createdUser] = await tx.insert(deps.tables.users).values({
                email: normalizedEmail,
                passwordHash: hashedPassword,
                name: parsed.data.name.trim(),
                phone: normalizedPhone,
                role: 'user',
                status: 'active',
                provider: 'local',
                primaryVertical: signupSource.primaryVertical,
                signupApp: signupSource.app,
                signupOrigin: origin,
            }).returning({ id: deps.tables.users.id });
            insertedUser = createdUser;
        });

        const newUser: any = {
            id: insertedUser.id,
            email: normalizedEmail,
            passwordHash: hashedPassword,
            name: parsed.data.name.trim(),
            phone: normalizedPhone,
            role: 'user',
            status: 'active',
            provider: 'local',
            primaryVertical: signupSource.primaryVertical,
            signupApp: signupSource.app,
            signupOrigin: origin,
            lastLoginAt: new Date(),
        };

        const personalAccount = await deps.ensurePrimaryAccountForUser(newUser);
        newUser.primaryAccountId = personalAccount.id;
        await createUserRegistrationAudit({
            userId: newUser.id,
            email: normalizedEmail,
            provider: 'local',
            origin,
            source: signupSource,
        });
        await upsertPlatformAccess({
            userId: newUser.id,
            app: userFacingApps.includes(signupSource.app as SimpleUserApp) ? signupSource.app as SimpleUserApp : null,
            origin,
            markLogin: true,
            activate: true,
        });

        const shouldSendVerificationEmail = process.env.NODE_ENV === 'production' || deps.isAuthEmailConfigured();
        if (shouldSendVerificationEmail) {
            try {
                await deps.issueEmailVerification(newUser.id, normalizedEmail, origin);
            } catch (error) {
                console.error('Email verification delivery error:', error);
                await deps.db.delete(deps.tables.emailVerificationTokens).where(deps.eq(deps.tables.emailVerificationTokens.userId, newUser.id));
                await deps.db.delete(deps.tables.users).where(deps.eq(deps.tables.users.id, newUser.id));
                return c.json({ ok: false, error: 'No pudimos enviar el correo de verificación. Inténtalo nuevamente en unos minutos.' }, 502);
            }
        } else {
            await deps.db.update(deps.tables.users).set({ status: 'verified' }).where(deps.eq(deps.tables.users.id, newUser.id));
            newUser.status = 'verified';
        }

        await deps.touchUserLastLoginAt(newUser.id);
        const profile = null;
        deps.clearRateLimit(`auth:register:ip:${clientId}`);
        deps.setSession(c, newUser.id);
        return c.json({ ok: true, user: await sanitizeUserWithPlatformAccess(newUser, c), ...(profile ? { profile } : {}) }, 201);
    });

    app.get('/me', async (c) => {
        const user = await deps.authUser(c);
        // Sin sesión: 200 + user null (evita 401 en consola al cargar landing como invitado).
        if (!user) return c.json({ ok: true, user: null });
        const profile = null;
        return c.json({ ok: true, user: await sanitizeUserWithPlatformAccess(user, c), ...(profile ? { profile } : {}) });
    });

    app.post('/platform-access/activate', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const payload = await c.req.json().catch(() => ({}));
        const requestedApp = deps.asString((payload as Record<string, unknown>)?.app).trim().toLowerCase();
        const app = (userFacingApps.includes(requestedApp as SimpleUserApp)
            ? requestedApp
            : resolveCurrentApp(c)) as SimpleUserApp | null;
        if (!app) return c.json({ ok: false, error: 'No pudimos identificar la plataforma.' }, 400);

        await upsertPlatformAccess({
            userId: user.id,
            app,
            origin: deps.resolveBrowserOrigin(c),
            markLogin: true,
            activate: true,
        });

        return c.json({
            ok: true,
            user: await sanitizeUserWithPlatformAccess(user, c),
        });
    });

    // Actualizar perfil del usuario autenticado
    app.patch('/me', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const payload = await c.req.json().catch(() => null);
        if (!payload || typeof payload !== 'object') {
            return c.json({ ok: false, error: 'Datos inválidos' }, 400);
        }

        // Campos permitidos para actualizar
        const allowedFields = [
            'name',
            'phone',
            'avatarUrl',
            'timezone',
            'dstEnabled',
            'whatsappEnabled',
            'whatsappNotifyInvitations',
            'whatsappNotifyRequests',
            'whatsappNotifyAgenda',
            'whatsappNotifyAccount',
            'emailNotifyInvitations',
            'emailNotifyRequests',
            'emailNotifyAgenda',
            'emailNotifyAccount',
            'emailDigestFrequency',
        ] as const;
        const updates: Record<string, unknown> = {};

        for (const key of allowedFields) {
            if (!(key in payload)) continue;
            const value = payload[key as keyof typeof payload];
            if (
                key === 'whatsappEnabled'
                || key === 'whatsappNotifyInvitations'
                || key === 'whatsappNotifyRequests'
                || key === 'whatsappNotifyAgenda'
                || key === 'whatsappNotifyAccount'
                || key === 'emailNotifyInvitations'
                || key === 'emailNotifyRequests'
                || key === 'emailNotifyAgenda'
                || key === 'emailNotifyAccount'
            ) {
                if (typeof value === 'boolean') updates[key] = value;
                continue;
            }
            if (key === 'emailDigestFrequency') {
                if (value === 'off' || value === 'daily' || value === 'weekly') {
                    updates.emailDigestFrequency = value;
                }
                continue;
            }
            if (key === 'dstEnabled') {
                if (typeof value === 'boolean') updates.dstEnabled = value;
                continue;
            }
            if (key === 'avatarUrl') {
                continue;
            }
            if (value !== undefined && value !== null) {
                updates[key] = value;
            }
        }

        if ('avatarUrl' in payload) {
            const raw = payload.avatarUrl;
            const nextAvatarUrl =
                raw === null
                    ? null
                    : typeof raw === 'string'
                      ? raw.trim() || null
                      : user.avatar ?? null;
            await cleanupReplacedMediaUrl(user.avatar ?? null, nextAvatarUrl);
            updates.avatarUrl = nextAvatarUrl;
        }

        if ('phone' in payload && payload.phone !== undefined) {
            const phone = typeof payload.phone === 'string' ? payload.phone.trim() : '';
            updates.phone = phone || null;
        }

        if ('timezone' in payload && payload.timezone !== undefined) {
            const timezone = typeof payload.timezone === 'string' ? payload.timezone.trim() : '';
            if (timezone) {
                updates.timezone = timezone;
            }
        }

        if (
            'whatsappNotifyInvitations' in updates
            || 'whatsappNotifyRequests' in updates
            || 'whatsappNotifyAgenda' in updates
            || 'whatsappNotifyAccount' in updates
        ) {
            const row = await deps.db.query.users.findFirst({
                where: deps.eq(deps.tables.users.id, user.id),
                columns: {
                    whatsappNotifyInvitations: true,
                    whatsappNotifyRequests: true,
                    whatsappNotifyAgenda: true,
                    whatsappNotifyAccount: true,
                    whatsappEnabled: true,
                },
            });
            const invitations =
                (updates.whatsappNotifyInvitations as boolean | undefined)
                ?? row?.whatsappNotifyInvitations
                ?? row?.whatsappEnabled
                ?? false;
            const requests =
                (updates.whatsappNotifyRequests as boolean | undefined)
                ?? row?.whatsappNotifyRequests
                ?? row?.whatsappEnabled
                ?? false;
            const agenda =
                (updates.whatsappNotifyAgenda as boolean | undefined)
                ?? row?.whatsappNotifyAgenda
                ?? row?.whatsappEnabled
                ?? false;
            const account =
                (updates.whatsappNotifyAccount as boolean | undefined)
                ?? row?.whatsappNotifyAccount
                ?? false;
            updates.whatsappNotifyInvitations = invitations;
            updates.whatsappNotifyRequests = requests;
            updates.whatsappNotifyAgenda = agenda;
            updates.whatsappNotifyAccount = account;
            updates.whatsappEnabled = invitations || requests || agenda || account;
        }

        if (Object.keys(updates).length === 0) {
            return c.json({ ok: false, error: 'No hay campos para actualizar' }, 400);
        }

        try {
            await deps.db
                .update(deps.tables.users)
                .set({
                    ...updates,
                    updatedAt: new Date(),
                })
                .where(deps.eq(deps.tables.users.id, user.id));

            const updatedUser = await deps.getUserById(user.id);
            return c.json({ ok: true, user: await sanitizeUserWithPlatformAccess(updatedUser, c) });
        } catch (error) {
            console.error('Error updating profile:', error);
            return c.json({ ok: false, error: 'Error al actualizar el perfil' }, 500);
        }
    });

    app.get('/me/notification-log', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const items = await getRecentUserNotificationLogs(user.id, 5);
        return c.json({
            ok: true,
            items: items.map((row) => ({
                id: row.id,
                channel: row.channel,
                eventType: row.eventType,
                summary: row.summary,
                createdAt: row.createdAt.getTime(),
            })),
        });
    });

    app.post('/me/test-notification', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const rate = deps.consumeRateLimit(
            `auth:notification-test:${user.id}`,
            1,
            5 * 60 * 1000,
        );
        if (!rate.ok) {
            return c.json(
                {
                    ok: false,
                    error: `Demasiadas pruebas. Intenta en ${rate.retryAfterSeconds} s.`,
                },
                429,
            );
        }

        const payload = await c.req.json().catch(() => ({}));
        const channel =
            payload && typeof payload === 'object' && payload.channel === 'whatsapp'
                ? 'whatsapp'
                : 'email';

        try {
            if (channel === 'email') {
                await sendNotificationTestEmail(user.id, user.email, user.name ?? '');
                return c.json({
                    ok: true,
                    channel: 'email',
                    message: 'Correo de prueba enviado. Revisa tu bandeja.',
                });
            }

            const wa = await sendNotificationTestWhatsApp(user.id);
            if (wa.deferredQuietHours) {
                return c.json({
                    ok: true,
                    channel: 'whatsapp',
                    message: 'Prueba registrada en tu historial.',
                });
            }
            return c.json({
                ok: true,
                channel: 'whatsapp',
                message: 'WhatsApp de prueba enviado.',
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No pudimos enviar la prueba.';
            return c.json({ ok: false, error: message }, 400);
        }
    });

    app.post('/logout', (c) => {
        deps.clearSession(c);
        return c.json({ ok: true });
    });

    app.delete('/me', async (c) => {
        const sessionUser = await deps.authUser(c);
        if (!sessionUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.permanentlyDeleteUser) {
            return c.json({ ok: false, error: 'Eliminación de cuenta no disponible.' }, 503);
        }

        const user = await deps.getUserById(sessionUser.id);
        if (!user || !deps.canAuthenticateUser(user)) {
            return c.json({ ok: false, error: 'No se pudo verificar tu cuenta.' }, 400);
        }

        if (user.role === 'superadmin' && deps.countActiveSuperadminUsers) {
            const remaining = await deps.countActiveSuperadminUsers();
            if (remaining <= 1) {
                return c.json(
                    { ok: false, error: 'No puedes eliminar la última cuenta de superadmin activa.' },
                    400,
                );
            }
        }

        const payload = await c.req.json().catch(() => ({}));
        const parsed = deleteAccountSchema.safeParse(payload);
        if (!parsed.success) {
            return c.json({ ok: false, error: 'Datos de confirmación inválidos.' }, 400);
        }

        if (user.passwordHash) {
            const password = parsed.data.password?.trim() ?? '';
            if (!password) {
                return c.json({ ok: false, error: 'Ingresa tu contraseña para confirmar.' }, 400);
            }
            const matches = await deps.bcrypt.compare(password, user.passwordHash);
            if (!matches) {
                return c.json({ ok: false, error: 'La contraseña no es correcta.' }, 401);
            }
        } else {
            const phrase = (parsed.data.confirmPhrase ?? '').trim().toUpperCase();
            if (phrase !== 'ELIMINAR') {
                return c.json(
                    { ok: false, error: 'Escribe ELIMINAR (en mayúsculas) para confirmar la eliminación.' },
                    400,
                );
            }
        }

        try {
            await deps.permanentlyDeleteUser(user.id);
        } catch (error) {
            console.error('[auth] permanentlyDeleteUser failed', { userId: user.id, error });
            const detail = error instanceof Error ? error.message : String(error);
            const isFkViolation = /foreign key|violates foreign key|23503/i.test(detail);
            return c.json(
                {
                    ok: false,
                    error: isFkViolation
                        ? 'No pudimos eliminar la cuenta: aún hay datos vinculados. Contacta soporte.'
                        : 'No pudimos eliminar tu cuenta. Intenta más tarde o contacta soporte.',
                    detail,
                },
                500,
            );
        }

        deps.clearSession(c);
        return c.json({ ok: true });
    });

    app.post('/password/change', async (c) => {
        const sessionUser = await deps.authUser(c);
        if (!sessionUser) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const payload = await c.req.json().catch(() => null);
        const parsed = deps.passwordChangeSchema.safeParse(payload);
        if (!parsed.success) {
            const issue = parsed.error.issues[0];
            return c.json({ ok: false, error: issue?.message ?? 'Datos inválidos.' }, 400);
        }

        const user = await deps.getUserById(sessionUser.id);
        if (!user || !deps.canAuthenticateUser(user)) {
            return c.json({ ok: false, error: 'No se pudo actualizar tu contraseña.' }, 400);
        }

        const hasPassword = Boolean(user.passwordHash);
        const { currentPassword, newPassword } = parsed.data;

        if (hasPassword) {
            if (!currentPassword?.trim()) {
                return c.json({ ok: false, error: 'Ingresa tu contraseña actual.' }, 400);
            }
            const matches = await deps.bcrypt.compare(currentPassword, user.passwordHash);
            if (!matches) {
                return c.json({ ok: false, error: 'La contraseña actual no es correcta.' }, 401);
            }
            const sameAsCurrent = await deps.bcrypt.compare(newPassword, user.passwordHash);
            if (sameAsCurrent) {
                return c.json({ ok: false, error: 'La nueva contraseña debe ser distinta a la actual.' }, 400);
            }
        }

        const nextPasswordHash = await deps.bcrypt.hash(newPassword, 10);
        const now = new Date();
        await deps.db.update(deps.tables.users).set({
            passwordHash: nextPasswordHash,
            updatedAt: now,
        }).where(deps.eq(deps.tables.users.id, user.id));

        const origin = deps.resolveBrowserOrigin(c);
        if (origin) {
            try {
                await deps.sendPasswordChangedEmail(user.email, origin, user.id);
            } catch (error) {
                console.error('Password changed email error:', error);
            }
        }

        const updatedUser = await deps.getUserById(user.id);
        if (!updatedUser) return c.json({ ok: false, error: 'No se pudo actualizar tu contraseña.' }, 500);

        const personalAccount = await deps.ensurePrimaryAccountForUser(updatedUser);
        return c.json({
            ok: true,
            user: await sanitizeUserWithPlatformAccess({ ...updatedUser, passwordHash: nextPasswordHash, primaryAccountId: personalAccount.id }, c),
        });
    });

    app.post('/password-reset/request', async (c) => {
        const payload = await c.req.json().catch(() => null);
        const parsed = deps.passwordResetRequestSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Solicitud inválida.' }, 400);

        const clientId = deps.getClientIdentifier(c);
        const ipRateLimit = deps.consumeRateLimit(`auth:reset-request:ip:${clientId}`, 5, deps.AUTH_RATE_LIMIT_WINDOW_MS);
        if (!ipRateLimit.ok) {
            c.header('Retry-After', String(ipRateLimit.retryAfterSeconds));
            return c.json({ ok: false, error: 'Hiciste demasiados intentos. Intenta nuevamente más tarde.' }, 429);
        }
        if (process.env.NODE_ENV === 'production' && !deps.isAuthEmailConfigured()) {
            return c.json({ ok: false, error: 'La recuperación de contraseña no está configurada en este entorno.' }, 503);
        }

        const normalizedEmail = parsed.data.email.trim().toLowerCase();
        const user = await deps.getUserByEmail(normalizedEmail);
        if (!user || !deps.canAuthenticateUser(user)) return c.json({ ok: true });

        const origin = deps.resolveBrowserOrigin(c);
        if (!origin) return c.json({ ok: false, error: 'Origin no autorizado' }, 403);

        const rawToken = randomBytes(32).toString('hex');
        const now = new Date();
        const expiresAt = new Date(now.getTime() + deps.PASSWORD_RESET_TOKEN_TTL_MS);
        await deps.db.insert(deps.tables.passwordResetTokens).values({
            userId: user.id,
            tokenHash: deps.hashOpaqueToken(rawToken),
            expiresAt,
        });

        try {
            await deps.sendPasswordResetEmail(
                normalizedEmail,
                deps.buildPasswordResetUrl(origin, rawToken),
                origin,
                user.id,
            );
        } catch (error) {
            console.error('Password reset email error:', error);
            return c.json({ ok: false, error: 'No pudimos enviar el correo de recuperación. Inténtalo nuevamente.' }, 502);
        }
        return c.json({ ok: true });
    });

    app.post('/password-reset/confirm', async (c) => {
        const payload = await c.req.json().catch(() => null);
        const parsed = deps.passwordResetConfirmSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Solicitud inválida.' }, 400);

        const clientId = deps.getClientIdentifier(c);
        const ipRateLimit = deps.consumeRateLimit(`auth:reset-confirm:ip:${clientId}`, 10, deps.AUTH_RATE_LIMIT_WINDOW_MS);
        if (!ipRateLimit.ok) {
            c.header('Retry-After', String(ipRateLimit.retryAfterSeconds));
            return c.json({ ok: false, error: 'Hiciste demasiados intentos. Intenta nuevamente más tarde.' }, 429);
        }

        const now = new Date();
        const tokenHash = deps.hashOpaqueToken(parsed.data.token);
        const result = await deps.db.select().from(deps.tables.passwordResetTokens).where(deps.and(
            deps.eq(deps.tables.passwordResetTokens.tokenHash, tokenHash),
            deps.isNull(deps.tables.passwordResetTokens.usedAt),
            deps.gt(deps.tables.passwordResetTokens.expiresAt, now),
        )).limit(1);
        if (result.length === 0) return c.json({ ok: false, error: 'El enlace de recuperación es inválido o expiró.' }, 400);

        const resetToken = result[0];
        const user = await deps.getUserById(resetToken.userId);
        if (!user || !deps.canAuthenticateUser(user)) return c.json({ ok: false, error: 'No se pudo restablecer la contraseña para esta cuenta.' }, 400);

        const nextPasswordHash = await deps.bcrypt.hash(parsed.data.password, 10);
        await deps.db.update(deps.tables.users).set({ passwordHash: nextPasswordHash, updatedAt: now, lastLoginAt: now }).where(deps.eq(deps.tables.users.id, user.id));
        await deps.db.update(deps.tables.passwordResetTokens).set({ usedAt: now }).where(deps.and(
            deps.eq(deps.tables.passwordResetTokens.userId, user.id),
            deps.isNull(deps.tables.passwordResetTokens.usedAt),
        ));

        deps.clearRateLimit(`auth:reset-confirm:ip:${clientId}`);

        const origin = deps.resolveBrowserOrigin(c);
        if (origin) {
            try {
                await deps.sendPasswordChangedEmail(user.email, origin, user.id);
            } catch (error) {
                console.error('Password changed email error:', error);
            }
        }

        deps.setSession(c, user.id);
        const personalAccount = await deps.ensurePrimaryAccountForUser(user);
        await upsertPlatformAccess({
            userId: user.id,
            app: resolveCurrentApp(c),
            origin: deps.resolveBrowserOrigin(c),
            markLogin: true,
            activate: true,
        });
        return c.json({ ok: true, user: await sanitizeUserWithPlatformAccess({ ...user, passwordHash: nextPasswordHash, lastLoginAt: now, primaryAccountId: personalAccount.id }, c) });
    });

    app.post('/email-verification/request', async (c) => {
        const payload = await c.req.json().catch(() => null);
        const parsed = deps.emailVerificationRequestSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Solicitud inválida.' }, 400);

        if (process.env.NODE_ENV === 'production' && !deps.isAuthEmailConfigured()) {
            return c.json({ ok: false, error: 'La confirmación de correo no está configurada en este entorno.' }, 503);
        }

        const origin = deps.resolveBrowserOrigin(c);
        if (!origin) return c.json({ ok: false, error: 'Origin no autorizado' }, 403);

        const sessionUser = await deps.authUser(c);
        const normalizedEmail = parsed.data.email?.trim().toLowerCase() ?? sessionUser?.email ?? null;
        if (!normalizedEmail) return c.json({ ok: false, error: 'Debes indicar un correo válido.' }, 400);

        const user = await deps.getUserByEmail(normalizedEmail);
        if (!user || !deps.canAuthenticateUser(user)) return c.json({ ok: true });
        if (user.status === 'verified') return c.json({ ok: true, alreadyVerified: true });

        try {
            await deps.issueEmailVerification(user.id, normalizedEmail, origin);
        } catch (error) {
            console.error('Email verification request error:', error);
            return c.json({ ok: false, error: 'No pudimos enviar el correo de confirmación. Inténtalo nuevamente.' }, 502);
        }
        return c.json({ ok: true });
    });

    app.post('/email-verification/confirm', async (c) => {
        const payload = await c.req.json().catch(() => null);
        const parsed = deps.emailVerificationConfirmSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Solicitud inválida.' }, 400);

        const now = new Date();
        const tokenHash = deps.hashOpaqueToken(parsed.data.token);
        const result = await deps.db.select().from(deps.tables.emailVerificationTokens).where(deps.and(
            deps.eq(deps.tables.emailVerificationTokens.tokenHash, tokenHash),
            deps.isNull(deps.tables.emailVerificationTokens.usedAt),
            deps.gt(deps.tables.emailVerificationTokens.expiresAt, now),
        )).limit(1);
        if (result.length === 0) return c.json({ ok: false, error: 'El enlace de confirmación es inválido o expiró.' }, 400);

        const verificationToken = result[0];
        const user = await deps.getUserById(verificationToken.userId);
        if (!user || !deps.canAuthenticateUser(user)) return c.json({ ok: false, error: 'No se pudo confirmar esta cuenta.' }, 400);

        const pendingEmail = await deps.getUserPendingEmail(user.id);
        if (pendingEmail) {
            await deps.applyUserEmailChange(user.id, pendingEmail);
        } else {
            await deps.db.update(deps.tables.users).set({ status: 'verified', updatedAt: now }).where(deps.eq(deps.tables.users.id, user.id));
        }

        await deps.db.update(deps.tables.emailVerificationTokens).set({ usedAt: now }).where(deps.and(
            deps.eq(deps.tables.emailVerificationTokens.userId, user.id),
            deps.isNull(deps.tables.emailVerificationTokens.usedAt),
        ));

        const origin = deps.resolveBrowserOrigin(c);
        const nextUser = await deps.getUserById(user.id);
        if (!nextUser) return c.json({ ok: false, error: 'No se pudo confirmar esta cuenta.' }, 400);

        if (origin && !pendingEmail) {
            try {
                await deps.sendWelcomeEmail(nextUser.email, nextUser.name, origin, nextUser.id);
            } catch (error) {
                console.error('Welcome email delivery error:', error);
            }
        }

        deps.setSession(c, nextUser.id);
        const personalAccount = await deps.ensurePrimaryAccountForUser(nextUser);
        await upsertPlatformAccess({
            userId: nextUser.id,
            app: resolveCurrentApp(c),
            origin: deps.resolveBrowserOrigin(c),
            markLogin: true,
            activate: true,
        });
        return c.json({
            ok: true,
            emailChanged: Boolean(pendingEmail),
            user: await sanitizeUserWithPlatformAccess({ ...nextUser, status: 'verified', primaryAccountId: personalAccount.id }, c),
        });
    });

    app.post('/google/disconnect', async (c) => {
        const sessionUser = await deps.authUser(c);
        if (!sessionUser) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const user = await deps.getUserById(sessionUser.id);
        if (!user || !deps.canAuthenticateUser(user)) {
            return c.json({ ok: false, error: 'No se pudo actualizar tu cuenta.' }, 400);
        }

        if (user.provider !== 'google') {
            return c.json({ ok: true, disconnected: false });
        }

        if (!user.passwordHash) {
            return c.json({
                ok: false,
                error: 'Esta cuenta solo usa Google. Crea una contraseña con recuperación de acceso antes de desvincular.',
            }, 400);
        }

        const now = new Date();
        await deps.db.update(deps.tables.users).set({
            provider: 'local',
            providerId: null,
            updatedAt: now,
        }).where(deps.eq(deps.tables.users.id, user.id));

        const updatedUser = await deps.getUserById(user.id);
        if (!updatedUser) return c.json({ ok: false, error: 'No se pudo actualizar tu cuenta.' }, 500);

        const personalAccount = await deps.ensurePrimaryAccountForUser(updatedUser);
        return c.json({
            ok: true,
            disconnected: true,
            user: await sanitizeUserWithPlatformAccess({ ...updatedUser, provider: 'local', providerId: undefined, primaryAccountId: personalAccount.id }, c),
        });
    });

    // â”€â”€ Google OAuth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    app.get('/google', async (c) => {
        const clientId = deps.asString(process.env.GOOGLE_CLIENT_ID);
        const origin = deps.resolveBrowserOrigin(c);
        if (!origin) return c.json({ ok: false, error: 'Origin no autorizado' }, 403);
        if (!clientId) return c.json({ ok: false, error: 'Google OAuth no configurado' }, 500);

        // Use GOOGLE_REDIRECT_URI env var if set, otherwise fallback to building from origin
        const configuredRedirectUri = process.env.GOOGLE_REDIRECT_URI;
        const redirectUri = configuredRedirectUri || deps.buildGoogleRedirectUri(origin);
        logger.info('[Google OAuth] Using redirect URI', { redirectUri, configuredRedirectUri });

        const linkRequested = deps.asString(c.req.query('mode')) === 'link';
        const sessionUser = await deps.authUser(c);
        const isProduction = process.env.NODE_ENV === 'production';
        const fallbackReturn = `${origin}/`;
        const returnToRaw = deps.asString(c.req.query('returnTo'));
        const returnTo = returnToRaw
            ? sanitizeBrowserReturnUrl(returnToRaw, fallbackReturn, { isProduction })
            : undefined;
        const mode = linkRequested && sessionUser ? 'link' as const : 'login' as const;

        if (linkRequested && !sessionUser) {
            return c.json({ ok: false, error: 'Debes iniciar sesión para vincular Google.' }, 401);
        }

        const nonce = randomBytes(16).toString('hex');
        const state = buildGoogleOAuthState(deps.SESSION_SECRET, {
            nonce,
            origin,
            mode,
            userId: mode === 'link' ? sessionUser?.id : undefined,
            returnTo: mode === 'link' ? returnTo : undefined,
        });
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${encodeURIComponent(clientId)}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent('openid email profile')}&` +
            `state=${encodeURIComponent(state)}`;

        return c.json({ ok: true, authUrl });
    });

    type GoogleCallbackResult =
        | { ok: true; result: { user: any; origin: string; isNewUser: boolean; stateData: GoogleOAuthStatePayload } }
        | { ok: false; error: string; status: number; stateData: GoogleOAuthStatePayload | null };

    async function completeGoogleCallback(code: string, state: string, c: any): Promise<GoogleCallbackResult> {
        if (!code || !state) {
            return { ok: false, error: 'Parámetros requeridos faltantes', status: 400, stateData: null };
        }

        const stateData = verifyGoogleOAuthState(state, deps.SESSION_SECRET, deps.safeEqualStrings);
        if (!stateData) {
            return {
                ok: false,
                error: 'Tu sesión de autenticación con Google expiró. Intenta nuevamente.',
                status: 400,
                stateData: null,
            };
        }

        try {
            const sessionUser = await deps.authUser(c);
            const linkFromState = await resolveLinkUserFromState(stateData);
            const linkToSessionUser =
                linkFromState
                ?? (sessionUser ? { id: sessionUser.id, email: sessionUser.email } : undefined);

            if (stateData.mode === 'link' && !linkToSessionUser) {
                return {
                    ok: false,
                    error: 'No pudimos validar tu sesión para vincular Google. Intenta de nuevo desde Mi cuenta.',
                    status: 400,
                    stateData,
                };
            }

            const result = await exchangeGoogleCode(code, state, c, linkToSessionUser);
            if (!result.ok) {
                return { ok: false, error: result.error, status: result.status, stateData };
            }

            deps.setSession(c, result.user.id);
            return { ok: true, result: { ...result, stateData } };
        } catch (error) {
            console.error('Error en google callback:', error);
            return { ok: false, error: 'Error procesando autenticación', status: 500, stateData };
        }
    }

    function buildGoogleReturnRedirect(
        stateData: GoogleOAuthStatePayload | null,
        params: Record<string, string>,
    ): string {
        const origin = stateData?.origin || 'http://localhost:3000';
        const fallback = `${origin}/auth/google/callback`;
        const rawReturn = stateData?.returnTo || fallback;
        const isProduction = process.env.NODE_ENV === 'production';
        let resolvedReturn = rawReturn;
        try {
            if (!/^https?:\/\//i.test(rawReturn)) {
                resolvedReturn = new URL(rawReturn, origin).toString();
            }
        } catch {
            resolvedReturn = fallback;
        }
        const target = new URL(sanitizeBrowserReturnUrl(resolvedReturn, fallback, { isProduction }));
        for (const [key, value] of Object.entries(params)) {
            if (value) target.searchParams.set(key, value);
        }
        return target.toString();
    }

    function googleLinkRedirectParams(error: string, status: number): Record<string, string> {
        const errorCode = googleOAuthErrorCode(error, status);
        return {
            google_error: errorCode ?? 'link_failed',
            google_error_message: encodeURIComponent(error),
        };
    }

    app.get('/google/callback', async (c) => {
        const code = deps.asString(c.req.query('code'));
        const state = deps.asString(c.req.query('state'));

        const callback = await completeGoogleCallback(code, state, c);
        if (!callback.ok) {
            if (callback.stateData?.mode === 'link') {
                const redirectUrl = buildGoogleReturnRedirect(
                    callback.stateData,
                    googleLinkRedirectParams(callback.error, callback.status),
                );
                return c.redirect(redirectUrl, 302);
            }
            const errorCode = googleOAuthErrorCode(callback.error, callback.status);
            if (errorCode) {
                const redirectUrl = buildGoogleReturnRedirect(callback.stateData, {
                    google_error: errorCode,
                    google_error_message: encodeURIComponent(callback.error),
                });
                return c.redirect(redirectUrl, 302);
            }
            return c.json({ ok: false, error: callback.error }, callback.status as 400 | 403 | 409 | 500);
        }

        const { stateData, origin } = callback.result;

        if (stateData.mode === 'link') {
            const redirectUrl = buildGoogleReturnRedirect(stateData, { google_linked: '1' });
            return c.redirect(redirectUrl, 302);
        }

        const redirectUrl = `${origin || deps.resolveBrowserOrigin(c) || 'http://localhost:3000'}/`;

        return c.html(`
<!DOCTYPE html>
<html>
<head>
    <title>Iniciando sesión...</title>
    <style>
        body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
        .container { text-align: center; }
        .spinner { width: 40px; height: 40px; border: 3px solid #ddd; border-top-color: #22c55e; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
        @keyframes spin { to { transform: rotate(360deg); } }
        p { color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <p>Iniciando sesión...</p>
    </div>
    <script>
        window.location.href = '${redirectUrl}';
    </script>
</body>
</html>`);
    });

    app.post('/google/callback', async (c) => {
        const payload = await c.req.json().catch(() => null);
        const body = deps.asObject(payload);
        const code = deps.asString(body.code);
        const state = deps.asString(body.state);

        const callback = await completeGoogleCallback(code, state, c);
        if (!callback.ok) {
            const errorCode = googleOAuthErrorCode(callback.error, callback.status);
            return c.json(
                {
                    ok: false,
                    error: callback.error,
                    ...(errorCode ? { code: errorCode } : {}),
                },
                callback.status as 400 | 403 | 409 | 500,
            );
        }

        await upsertPlatformAccess({
            userId: callback.result.user.id,
            app: resolveCurrentApp(c),
            origin: deps.resolveBrowserOrigin(c),
            markLogin: true,
            activate: true,
        });
        return c.json({
            ok: true,
            user: await sanitizeUserWithPlatformAccess(callback.result.user, c),
            isNewUser: callback.result.isNewUser,
        });
    });

    app.get('/google/exchange', async (c) => {
        const token = deps.asString(c.req.query('token'));
        if (!token) return c.json({ ok: false, error: 'Token requerido' }, 400);

        const entry = pendingOAuthSessions.get(token);
        if (!entry || entry.expiresAt < Date.now()) return c.json({ ok: false, error: 'El token expiró o no es válido.' }, 401);
        pendingOAuthSessions.delete(token);

        const user = await deps.getUserById(entry.userId);
        if (!user || !deps.canAuthenticateUser(user)) return c.json({ ok: false, error: 'Usuario no encontrado' }, 401);

        deps.setSession(c, user.id);
        return c.json({ ok: true, user: await sanitizeUserWithPlatformAccess(user, c) });
    });

    return app;
}
