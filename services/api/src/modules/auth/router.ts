import { Hono } from 'hono';
import { randomBytes, createHash } from 'crypto';

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
    sendPasswordResetEmail: (email: string, url: string, origin: string) => Promise<void>;
    sendPasswordChangedEmail: (email: string, origin: string) => Promise<void>;
    sendWelcomeEmail: (email: string, name: string, origin: string) => Promise<void>;
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
    emailVerificationRequestSchema: any;
    emailVerificationConfirmSchema: any;
};

export function createAuthRouter(deps: AuthRouterDeps) {
    const app = new Hono<{ Variables: { userId: string } }>();

    // ── One-time OAuth tokens ────────────────────────────────────────────────
    const pendingOAuthSessions = new Map<string, { userId: string; expiresAt: number }>();
    const cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [k, v] of pendingOAuthSessions) {
            if (v.expiresAt < now) pendingOAuthSessions.delete(k);
        }
    }, 30_000);

    // Store cleanup function for graceful shutdown
    (app as any).cleanup = () => clearInterval(cleanupInterval);

    function buildOAuthState(nonce: string, origin: string): string {
        const ts = Math.floor(Date.now() / 1000);
        const payload = `${nonce}~${ts}~${origin}`;
        const sig = createHash('sha256').update(`${deps.SESSION_SECRET}:${payload}`).digest('hex').slice(0, 32);
        return Buffer.from(`${payload}~${sig}`).toString('base64url');
    }

    function verifyOAuthState(state: string): { nonce: string; origin: string } | null {
        try {
            const decoded = Buffer.from(state, 'base64url').toString('utf8');
            const firstTilde = decoded.indexOf('~');
            const secondTilde = decoded.indexOf('~', firstTilde + 1);
            const lastTilde = decoded.lastIndexOf('~');
            if (firstTilde === -1 || secondTilde === -1 || lastTilde === secondTilde) return null;
            const nonce = decoded.slice(0, firstTilde);
            const tsStr = decoded.slice(firstTilde + 1, secondTilde);
            const origin = decoded.slice(secondTilde + 1, lastTilde);
            const sig = decoded.slice(lastTilde + 1);
            const ts = parseInt(tsStr, 10);
            if (isNaN(ts) || Date.now() / 1000 - ts > 600) return null;
            const payload = `${nonce}~${ts}~${origin}`;
            const expected = createHash('sha256').update(`${deps.SESSION_SECRET}:${payload}`).digest('hex').slice(0, 32);
            if (!deps.safeEqualStrings(sig, expected)) return null;
            return { nonce, origin };
        } catch {
            return null;
        }
    }

    async function exchangeGoogleCode(code: string, state: string, c: any): Promise<
        | { ok: true; user: any; origin: string; isNewUser: boolean }
        | { ok: false; error: string; status: number }
    > {
        if (!code || !state) return { ok: false, error: 'Código de autorización inválido', status: 400 };
        const stateData = verifyOAuthState(state);
        if (!stateData) return { ok: false, error: 'La sesión de autenticación con Google expiró. Intenta nuevamente.', status: 400 };

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
        if (!userResponse.ok) return { ok: false, error: 'Error obteniendo información del usuario', status: 400 };

        const normalizedEmail = deps.asString(googleUser.email).toLowerCase();
        if (!normalizedEmail) return { ok: false, error: 'Google no devolvió un correo válido.', status: 400 };

        let user = await deps.getUserByEmail(normalizedEmail);
        if (user && !deps.canAuthenticateUser(user)) return { ok: false, error: 'Tu cuenta está suspendida. Contacta al soporte.', status: 403 };

        let isNewUser = false;
        if (!user) {
            isNewUser = true;
            const [insertedUser] = await deps.db.insert(deps.tables.users).values({
                email: normalizedEmail,
                name: deps.asString(googleUser.name) || 'Usuario Simple',
                avatarUrl: deps.asString(googleUser.picture) || null,
                provider: 'google',
                providerId: deps.asString(googleUser.id) || null,
                role: 'user',
                status: googleUser.verified_email ? 'verified' : 'active',
                lastLoginAt: new Date(),
            }).returning({ id: deps.tables.users.id });

            user = {
                id: insertedUser.id,
                email: normalizedEmail,
                name: deps.asString(googleUser.name) || 'Usuario Simple',
                role: 'user',
                status: googleUser.verified_email ? 'verified' : 'active',
                avatar: deps.asString(googleUser.picture) || undefined,
                provider: 'google',
                providerId: deps.asString(googleUser.id) || undefined,
                lastLoginAt: new Date(),
            };
            const personalAccount = await deps.ensurePrimaryAccountForUser(user);
            user = { ...user, primaryAccountId: personalAccount.id };
            if (!googleUser.verified_email) {
                try { await deps.issueEmailVerification(user.id, normalizedEmail, origin); } catch (e) { console.error('Email verification delivery error:', e); }
            }
        } else {
            const personalAccount = await deps.ensurePrimaryAccountForUser(user);
            const nextLoginAt = new Date();
            await deps.db.update(deps.tables.users).set({
                name: deps.asString(googleUser.name) || user.name,
                avatarUrl: deps.asString(googleUser.picture) || user.avatar || null,
                provider: 'google',
                providerId: deps.asString(googleUser.id) || user.providerId || null,
                status: googleUser.verified_email ? 'verified' : user.status,
                updatedAt: nextLoginAt,
                lastLoginAt: nextLoginAt,
            }).where(deps.eq(deps.tables.users.id, user.id));
            user = { ...user, name: deps.asString(googleUser.name) || user.name, avatar: deps.asString(googleUser.picture) || user.avatar, provider: 'google', providerId: deps.asString(googleUser.id) || user.providerId, status: googleUser.verified_email ? 'verified' : user.status, lastLoginAt: nextLoginAt, primaryAccountId: personalAccount.id };
        }

        if (!user.lastLoginAt) {
            await deps.touchUserLastLoginAt(user.id);
            user = { ...user, lastLoginAt: new Date() };
        }

        return { ok: true, user, origin, isNewUser };
    }

    // ── Routes ───────────────────────────────────────────────────────────────

    app.post('/login', async (c) => {
        const payload = await c.req.json().catch(() => null);
        const parsed = deps.loginSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

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
        if (!user) return c.json({ ok: false, error: 'Email o contraseña incorrectos. Si no tienes cuenta, crea una.' }, 401);
        if (!deps.canAuthenticateUser(user)) return c.json({ ok: false, error: 'Tu cuenta está suspendida. Contacta al soporte.' }, 403);
        if (!user.passwordHash) return c.json({ ok: false, error: 'Esta cuenta requiere autenticación con Google. Usar "Continuar con Google".' }, 401);

        const passwordMatch = await deps.bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!passwordMatch) return c.json({ ok: false, error: 'Email o contraseña incorrectos.' }, 401);

        await deps.touchUserLastLoginAt(user.id);
        const personalAccount = await deps.ensurePrimaryAccountForUser(user);
        deps.clearRateLimit(`auth:login:ip:${clientId}`);
        deps.clearRateLimit(`auth:login:email:${normalizedEmail}`);
        deps.setSession(c, user.id);
        return c.json({ ok: true, user: deps.sanitizeUser({ ...user, lastLoginAt: new Date(), primaryAccountId: personalAccount.id }) });
    });

    app.post('/register', async (c) => {
        const payload = await c.req.json().catch(() => null);
        const parsed = deps.registerSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const clientId = deps.getClientIdentifier(c);
        const ipRateLimit = deps.consumeRateLimit(`auth:register:ip:${clientId}`, 5, deps.AUTH_RATE_LIMIT_WINDOW_MS);
        if (!ipRateLimit.ok) {
            c.header('Retry-After', String(ipRateLimit.retryAfterSeconds));
            return c.json({ ok: false, error: 'Demasiados intentos de registro. Intenta nuevamente más tarde.' }, 429);
        }

        if (process.env.NODE_ENV === 'production' && !deps.isAuthEmailConfigured()) {
            return c.json({ ok: false, error: 'El registro no está disponible porque el correo de verificación no está configurado.' }, 503);
        }

        const origin = deps.resolveBrowserOrigin(c);
        if (!origin) return c.json({ ok: false, error: 'Origin no autorizado' }, 403);

        const normalizedEmail = parsed.data.email.trim().toLowerCase();
        const existing = await deps.getUserByEmail(normalizedEmail);
        if (existing) return c.json({ ok: false, error: 'Email ya registrado' }, 409);

        const hashedPassword = await deps.bcrypt.hash(parsed.data.password, 10);
        const [insertedUser] = await deps.db.insert(deps.tables.users).values({
            email: normalizedEmail,
            passwordHash: hashedPassword,
            name: parsed.data.name.trim(),
            role: 'user',
            status: 'active',
            provider: 'local',
        }).returning({ id: deps.tables.users.id });

        let newUser: any = {
            id: insertedUser.id,
            email: normalizedEmail,
            passwordHash: hashedPassword,
            name: parsed.data.name.trim(),
            role: 'user',
            status: 'active',
            provider: 'local',
            lastLoginAt: new Date(),
        };
        const personalAccount = await deps.ensurePrimaryAccountForUser(newUser);
        newUser.primaryAccountId = personalAccount.id;

        if (process.env.NODE_ENV === 'production') {
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
        deps.clearRateLimit(`auth:register:ip:${clientId}`);
        deps.setSession(c, newUser.id);
        return c.json({ ok: true, user: deps.sanitizeUser(newUser) }, 201);
    });

    app.get('/me', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        return c.json({ ok: true, user: deps.sanitizeUser(user) });
    });

    app.post('/logout', (c) => {
        deps.clearSession(c);
        return c.json({ ok: true });
    });

    app.post('/password-reset/request', async (c) => {
        const payload = await c.req.json().catch(() => null);
        const parsed = deps.passwordResetRequestSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const clientId = deps.getClientIdentifier(c);
        const ipRateLimit = deps.consumeRateLimit(`auth:reset-request:ip:${clientId}`, 5, deps.AUTH_RATE_LIMIT_WINDOW_MS);
        if (!ipRateLimit.ok) {
            c.header('Retry-After', String(ipRateLimit.retryAfterSeconds));
            return c.json({ ok: false, error: 'Demasiados intentos. Intenta nuevamente más tarde.' }, 429);
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
            await deps.sendPasswordResetEmail(normalizedEmail, deps.buildPasswordResetUrl(origin, rawToken), origin);
        } catch (error) {
            console.error('Password reset email error:', error);
            return c.json({ ok: false, error: 'No pudimos enviar el correo de recuperación. Inténtalo nuevamente.' }, 502);
        }
        return c.json({ ok: true });
    });

    app.post('/password-reset/confirm', async (c) => {
        const payload = await c.req.json().catch(() => null);
        const parsed = deps.passwordResetConfirmSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const clientId = deps.getClientIdentifier(c);
        const ipRateLimit = deps.consumeRateLimit(`auth:reset-confirm:ip:${clientId}`, 10, deps.AUTH_RATE_LIMIT_WINDOW_MS);
        if (!ipRateLimit.ok) {
            c.header('Retry-After', String(ipRateLimit.retryAfterSeconds));
            return c.json({ ok: false, error: 'Demasiados intentos. Intenta nuevamente más tarde.' }, 429);
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
            try { await deps.sendPasswordChangedEmail(user.email, origin); } catch (error) { console.error('Password changed email error:', error); }
        }

        deps.setSession(c, user.id);
        const personalAccount = await deps.ensurePrimaryAccountForUser(user);
        return c.json({ ok: true, user: deps.sanitizeUser({ ...user, passwordHash: nextPasswordHash, lastLoginAt: now, primaryAccountId: personalAccount.id }) });
    });

    app.post('/email-verification/request', async (c) => {
        const payload = await c.req.json().catch(() => null);
        const parsed = deps.emailVerificationRequestSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

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
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

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

        await deps.db.update(deps.tables.users).set({ status: 'verified', updatedAt: now }).where(deps.eq(deps.tables.users.id, user.id));
        await deps.db.update(deps.tables.emailVerificationTokens).set({ usedAt: now }).where(deps.and(
            deps.eq(deps.tables.emailVerificationTokens.userId, user.id),
            deps.isNull(deps.tables.emailVerificationTokens.usedAt),
        ));

        const origin = deps.resolveBrowserOrigin(c);
        if (origin) {
            try { await deps.sendWelcomeEmail(user.email, user.name, origin); } catch (error) { console.error('Welcome email delivery error:', error); }
        }

        deps.setSession(c, user.id);
        const personalAccount = await deps.ensurePrimaryAccountForUser(user);
        return c.json({ ok: true, user: deps.sanitizeUser({ ...user, status: 'verified', primaryAccountId: personalAccount.id }) });
    });

    // ── Google OAuth ──────────────────────────────────────────────────────────

    app.get('/google', async (c) => {
        const clientId = deps.asString(process.env.GOOGLE_CLIENT_ID);
        const origin = deps.resolveBrowserOrigin(c);
        if (!origin) return c.json({ ok: false, error: 'Origin no autorizado' }, 403);
        if (!clientId) return c.json({ ok: false, error: 'Google OAuth no configurado' }, 500);

        // Use GOOGLE_REDIRECT_URI env var if set, otherwise fallback to building from origin
        const configuredRedirectUri = process.env.GOOGLE_REDIRECT_URI;
        const redirectUri = configuredRedirectUri || deps.buildGoogleRedirectUri(origin);
        console.log('[Google OAuth] Using redirect URI:', redirectUri, '| Configured:', configuredRedirectUri);

        const nonce = randomBytes(16).toString('hex');
        const state = buildOAuthState(nonce, origin);
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${encodeURIComponent(clientId)}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent('openid email profile')}&` +
            `state=${encodeURIComponent(state)}`;

        return c.json({ ok: true, authUrl });
    });

    app.get('/google/callback', async (c) => {
        const code = deps.asString(c.req.query('code'));
        const state = deps.asString(c.req.query('state'));

        if (!code || !state) {
            return c.json({ ok: false, error: 'Parámetros requeridos faltantes' }, 400);
        }

        try {
            const result = await exchangeGoogleCode(code, state, c);
            if (!result.ok) {
                return c.json({ ok: false, error: result.error }, result.status as 400 | 403 | 500);
            }

            deps.setSession(c, result.user.id);

            const origin = result.origin || deps.resolveBrowserOrigin(c) || 'http://localhost:3005';
            const redirectPath = result.isNewUser ? '/onboarding' : '/inicio';
            const redirectUrl = `${origin}${redirectPath}`;

            // Devolver HTML con redirección JavaScript para mantener la sesión cross-origin
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
        } catch (error) {
            console.error('Error en google callback:', error);
            return c.json({ ok: false, error: 'Error procesando autenticación' }, 500);
        }
    });

    app.get('/google/exchange', async (c) => {
        const token = deps.asString(c.req.query('token'));
        if (!token) return c.json({ ok: false, error: 'Token requerido' }, 400);

        const entry = pendingOAuthSessions.get(token);
        if (!entry || entry.expiresAt < Date.now()) return c.json({ ok: false, error: 'Token expirado o inválido' }, 401);
        pendingOAuthSessions.delete(token);

        const user = await deps.getUserById(entry.userId);
        if (!user || !deps.canAuthenticateUser(user)) return c.json({ ok: false, error: 'Usuario no encontrado' }, 401);

        deps.setSession(c, user.id);
        return c.json({ ok: true, user: deps.sanitizeUser(user) });
    });

    // Endpoint para obtener el usuario actual (verificar sesión)
    app.get('/me', async (c) => {
        const userId = c.get('userId') as string | undefined;
        if (!userId) {
            return c.json({ ok: false, error: 'No autenticado' }, 401);
        }

        const user = await deps.getUserById(userId);
        if (!user || !deps.canAuthenticateUser(user)) {
            return c.json({ ok: false, error: 'Usuario no encontrado' }, 401);
        }

        return c.json({ ok: true, user: deps.sanitizeUser(user) });
    });

    return app;
}
