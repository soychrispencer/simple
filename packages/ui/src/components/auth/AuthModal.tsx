'use client';
import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { IconEye, IconEyeOff, IconLogin, IconUserPlus, IconKey, IconX } from "@tabler/icons-react";
import { useAuth } from "@simple/auth";
import Input from "../forms/Input";
import { Button } from "../ui/Button";
import Modal from "../ui/modal/Modal";
import { GoogleIcon } from "./SocialIcons";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, any> ? DeepPartial<T[K]> : T[K];
};

export interface AuthModalCopy {
  login: {
    headline: string;
    subheading: string;
    submitLabel: string;
    rememberLabel: string;
    forgotLinkLabel: string;
    googleButtonLabel: string;
    sideTitle: string;
    sideDescription: string;
    sideButtonLabel: string;
  };
  register: {
    headline: string;
    submitLabel: string;
    successMessage: string;
    googleButtonLabel: string;
    sideTitle: string;
    sideDescription: string;
    sideButtonLabel: string;
  };
  forgot: {
    headline: string;
    description: string;
    submitLabel: string;
    successMessage: string;
    backLabel: string;
  };
}

export type AuthModalCopyOverrides = DeepPartial<AuthModalCopy>;

const defaultCopy: AuthModalCopy = {
  login: {
    headline: 'Bienvenido',
    subheading: 'Accede para publicar y gestionar.',
    submitLabel: 'Iniciar sesión',
    rememberLabel: 'Recordarme',
    forgotLinkLabel: 'Olvidé mi contraseña',
    googleButtonLabel: 'Continuar con Google',
    sideTitle: '¿Aún no tienes cuenta?',
    sideDescription: 'Regístrate gratis y comienza a publicar o gestionar.',
    sideButtonLabel: 'Registrarse como usuario',
  },
  register: {
    headline: 'Registro de usuario',
    submitLabel: 'Crear cuenta',
    successMessage: '¡Registro exitoso! Revisa tu correo para confirmar tu cuenta. Si no lo ves en tu bandeja de entrada, revisa la carpeta de spam o promociones.',
    googleButtonLabel: 'Registrarse con Google',
    sideTitle: '¿Ya tienes cuenta?',
    sideDescription: 'Inicia sesión para acceder a tu panel y gestionar.',
    sideButtonLabel: 'Iniciar sesión',
  },
  forgot: {
    headline: 'Recuperar contraseña',
    description: 'Ingresa tu correo y te enviaremos instrucciones para restablecer tu contraseña.',
    submitLabel: 'Enviar instrucciones',
    successMessage: 'Si el correo existe, se enviaron instrucciones para restablecer la contraseña.',
    backLabel: '← Volver a iniciar sesión',
  },
};

const resolveCopy = (overrides?: AuthModalCopyOverrides): AuthModalCopy => ({
  login: { ...defaultCopy.login, ...(overrides?.login || {}) },
  register: { ...defaultCopy.register, ...(overrides?.register || {}) },
  forgot: { ...defaultCopy.forgot, ...(overrides?.forgot || {}) },
});

const deriveBrandLabel = (headline?: string) => {
  if (!headline) return 'Nuevo en Simple';
  const replacements = ['Bienvenid@ a ', 'Bienvenido a ', 'Bienvenida a '];
  for (const prefix of replacements) {
    if (headline.startsWith(prefix)) return headline.replace(prefix, 'Nuevo en ');
  }
  return headline.startsWith('Nuevo en ') ? headline : `Nuevo en ${headline}`;
};

export interface AuthModalProps {
  open: boolean;
  mode: "login" | "register";
  onClose: () => void;
  copy?: AuthModalCopyOverrides;
}

const AuthModal = React.memo(function AuthModal({ open, mode, onClose, copy: copyOverrides }: AuthModalProps) {
  const [internalMode, setInternalMode] = useState(mode);
  const [showForgot, setShowForgot] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const copy = useMemo(() => resolveCopy(copyOverrides), [copyOverrides]);
  const brandLabel = useMemo(() => deriveBrandLabel(copy.login.headline), [copy.login.headline]);
  const heroHeadline = copy.login.headline || copy.register.headline;
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setInternalMode(mode);
      setShowForgot(false);
      setPendingVerificationEmail(null);
    }
  }, [mode, open]);

  const handleForgot = useCallback(() => setShowForgot(true), []);
  const handleBackFromForgot = useCallback(() => setShowForgot(false), []);
  const handleSwitchToRegister = useCallback(() => setInternalMode("register"), []);
  const handleSwitchToLogin = useCallback(() => {
    if (pendingVerificationEmail) return;
    setShowForgot(false);
    setInternalMode("login");
  }, [pendingVerificationEmail]);

  useEffect(() => {
    if (!open) return;
    const node = modalRef.current;
    if (!node) return;

    const focusableSelector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

    const focusInitial = () => {
      const target = node.querySelector<HTMLElement>('[data-modal-initial-focus="true"]')
        || node.querySelector<HTMLElement>(focusableSelector);
      target?.focus();
    };

    focusInitial();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = Array.from(node.querySelectorAll<HTMLElement>(focusableSelector))
        .filter(el => !el.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, isBusy, onClose]);

  useEffect(() => {
    if (!open) {
      setIsBusy(false);
    }
  }, [open]);

  const handleOverlayClick = () => {
    if (isBusy) return;
    onClose();
  };

  if (!open) return null;

  const showSidePanel = !showForgot && (internalMode === "login" || internalMode === "register");

  const heroIcon = internalMode === "register" ? (
    <IconUserPlus className="w-6 h-6 text-primary" stroke={1.5} />
  ) : (
    <IconLogin className="w-6 h-6 text-primary" stroke={1.5} />
  );

  return (
    <Modal
      open={open}
      onClose={handleOverlayClick}
      showClose={false}
      maxWidth="max-w-3xl"
      containerClassName="p-0 w-full max-h-[90vh]"
      contentClassName="p-0"
    >
      <div
        ref={modalRef}
        className={`p-0 flex flex-col ${showSidePanel ? "" : "justify-center"} relative`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-3 right-3 z-20 w-9 h-9 inline-flex items-center justify-center rounded-full bg-[var(--field-bg)] text-[var(--text-secondary)] hover:bg-[var(--field-bg-hover)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-a40)]"
          onClick={() => !isBusy && onClose()}
          aria-label="Cerrar modal"
          disabled={isBusy}
        >
          <IconX className="w-6 h-6" stroke={1.5} />
        </button>

        <div className="max-h-[90vh] overflow-y-auto">
          {showSidePanel && (
            <div className="w-full px-6 sm:px-10 pt-8 sm:pt-10 pb-4 text-center">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] w-full flex items-center justify-center gap-2">{heroIcon}{heroHeadline}</h1>
            </div>
          )}
          <div className={`flex w-full ${showSidePanel ? "flex-col md:flex-row" : "justify-center"}`}>
            {/* Lado izquierdo: login, registro o recuperación */}
            <div className={`flex flex-col gap-6 justify-center p-5 sm:p-8 ${showSidePanel ? "w-full md:flex-1 md:basis-1/2 md:min-w-[320px]" : "w-full max-w-md mx-auto"}`}>
            {showForgot ? (
              <ForgotForm
                onBack={handleBackFromForgot}
                onSuccess={handleSwitchToLogin}
                copy={copy}
                onBusyChange={setIsBusy}
              />
            ) : internalMode === "login" ? (
              <LoginForm
                onForgot={handleForgot}
                onClose={onClose}
                copy={copy}
                onBusyChange={setIsBusy}
                hideTitle={showSidePanel}
              />
            ) : (
              <RegisterForm
                copy={copy}
                onSuccess={handleSwitchToLogin}
                onVerificationPending={setPendingVerificationEmail}
                onBusyChange={setIsBusy}
                hideTitle={showSidePanel}
              />
            )}
          </div>
          {/* Lado derecho: opciones de registro o login */}
          {showSidePanel && internalMode === "login" ? (
            <div className="hidden md:flex md:flex-1 md:basis-1/2 min-w-[320px] p-2">
              <div className="flex flex-col justify-center items-center text-center gap-4 bg-[var(--surface-1)] text-[var(--text-primary)] w-full h-full px-8 py-10 rounded-[var(--card-radius)]">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--badge-inverted-bg)] text-[var(--badge-inverted-text)] shadow-token-sm">{brandLabel}</span>
                <div className="space-y-3">
                  <div className="text-2xl font-semibold leading-tight">{copy.login.sideTitle}</div>
                  <div className="text-sm text-[var(--text-secondary)] leading-relaxed">{copy.login.sideDescription}</div>
                </div>
                <Button
                  variant="neutral"
                  size="md"
                  className="w-full"
                  onClick={handleSwitchToRegister}
                >
                  {copy.login.sideButtonLabel}
                </Button>
              </div>
            </div>
          ) : showSidePanel && internalMode === "register" ? (
            <div className="hidden md:flex md:flex-1 md:basis-1/2 min-w-[320px] p-2">
              <div className="flex flex-col justify-center items-center text-center gap-4 bg-[var(--surface-1)] text-[var(--text-primary)] w-full h-full px-8 py-10 rounded-[var(--card-radius)]">
                {pendingVerificationEmail ? (
                  <>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--badge-inverted-bg)] text-[var(--badge-inverted-text)] shadow-token-sm">Pendiente de verificación</span>
                    <div className="space-y-3">
                      <div className="text-2xl font-semibold leading-tight">Revisa tu correo</div>
                      <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
                        Te enviamos un correo a <strong>{pendingVerificationEmail}</strong>. Confírmalo para activar tu cuenta.
                      </div>
                    </div>
                    <Button variant="neutral" size="md" className="w-full" onClick={() => onClose()}>
                      Cerrar
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--badge-inverted-bg)] text-[var(--badge-inverted-text)] shadow-token-sm">¿Ya tienes cuenta?</span>
                    <div className="space-y-3">
                      <div className="text-2xl font-semibold leading-tight">{copy.register.sideTitle}</div>
                      <div className="text-sm text-[var(--text-secondary)] leading-relaxed">{copy.register.sideDescription}</div>
                    </div>
                    <Button
                      variant="neutral"
                      size="md"
                      className="w-full"
                      onClick={handleSwitchToLogin}
                    >
                      {copy.register.sideButtonLabel}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      </div>
    </Modal>
  );
});

interface LoginFormProps {
  onForgot: () => void;
  onClose: () => void;
  copy: AuthModalCopy;
  onBusyChange: (busy: boolean) => void;
  hideTitle?: boolean;
}

const LoginForm = React.memo(function LoginForm({ onForgot, onClose, copy, onBusyChange, hideTitle }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { signIn, signInWithOAuth } = useAuth();

  useEffect(() => {
    const savedRemember = localStorage.getItem('simple_auth_remember') === 'true';
    const savedEmail = localStorage.getItem('simple_auth_email') || '';
    setRemember(savedRemember);
    if (savedRemember && savedEmail) setEmail(savedEmail);
  }, []);

  useEffect(() => {
    onBusyChange(loading || !!oauthLoading);
    return () => onBusyChange(false);
  }, [loading, oauthLoading, onBusyChange]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    onBusyChange(true);
    setError(null);
    const res = await signIn(email, password, remember);
    setLoading(false);
    onBusyChange(false);
    if (!res.ok) {
      if (res.error && (res.error.toLowerCase().includes('invalid') || res.error.toLowerCase().includes('credencial'))) {
        setError("Correo o contraseña incorrectos. Por favor, verifica tus datos.");
      } else if (res.error && res.error.toLowerCase().includes('email not confirmed')) {
        setError("Por favor confirma tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada y carpeta de spam.");
      } else {
        setError(res.error || 'Error al iniciar sesión');
      }
    } else {
      onClose();
    }
  }, [email, password, remember, signIn, onClose, onBusyChange]);

  const handleOAuth = useCallback(async (provider: 'google') => {
    setError(null);
    setOauthLoading(provider);
    try {
      const redirectTo = `${window.location.origin}/auth/confirm`;
      const res = await signInWithOAuth(provider, { redirectTo });
      if (!res.ok) {
        setError(res.error || 'No pudimos continuar con Google.');
      }
      // En caso de éxito, backend legado redirige fuera del sitio.
    } finally {
      setOauthLoading(null);
    }
  }, [signInWithOAuth]);

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value), []);
  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value), []);
  const handleShowPasswordToggle = useCallback(() => setShowPassword(prev => !prev), []);
  const handleRememberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setRemember(e.target.checked), []);

  return (
    <div className="flex flex-col gap-6">
      {!hideTitle && (
        <div className="text-center">
          <h2 id="modal-auth-title" className="text-2xl font-bold mb-6 flex items-center justify-center gap-3 text-lighttext dark:text-darktext w-full whitespace-nowrap">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary-a10)] flex items-center justify-center">
              <IconLogin className="text-primary text-xl" />
            </div>
            {copy.login.headline}
          </h2>
          <p className="text-lighttext/70 dark:text-darktext/70 text-sm">{copy.login.subheading}</p>
        </div>
      )}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Correo"
          type="email"
          placeholder="correo@ejemplo.com"
          required
          value={email}
          onChange={handleEmailChange}
          autoComplete="username"
          shape="pill"
          data-modal-initial-focus="true"
        />
        <label className="block text-sm font-medium text-lighttext dark:text-darktext mb-1">Contraseña</label>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            required
            value={password}
            onChange={handlePasswordChange}
            autoComplete="current-password"
            shape="pill"
            className="pr-12 h-10"
          />
          <button
            type="button"
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center p-0 text-lighttext/60 dark:text-darktext/60 hover:text-primary focus:outline-none"
            onClick={handleShowPasswordToggle}
            aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
          >
            {showPassword ? <IconEyeOff className="w-6 h-6" stroke={1.2} /> : <IconEye className="w-6 h-6" stroke={1.2} />}
          </button>
        </div>
        <div className="flex items-center justify-between text-xs">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-primary"
              checked={remember}
              onChange={handleRememberChange}
            /> {copy.login.rememberLabel}
          </label>
          <button type="button" className="text-primary hover:underline font-medium" onClick={onForgot}>{copy.login.forgotLinkLabel}</button>
        </div>
        {error && <div className="text-[var(--color-danger)] text-xs text-center">{error}</div>}
        <Button
          type="submit"
          className="w-full"
          loading={loading}
          disabled={loading}
        >
          {copy.login.submitLabel}
        </Button>
      </form>
      <div className="flex items-center gap-3 text-xs text-lighttext/60 dark:text-darktext/60">
        <div className="h-px flex-1 bg-lightborder/20 dark:bg-darkborder/20" /> o <div className="h-px flex-1 bg-lightborder/20 dark:bg-darkborder/20" />
      </div>
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="md"
          className="flex items-center justify-center gap-2 w-full"
          onClick={() => handleOAuth('google')}
          loading={oauthLoading === 'google'}
          disabled={loading || !!oauthLoading}
        >
          <GoogleIcon />
          <span className="font-medium">{copy.login.googleButtonLabel}</span>
        </Button>
      </div>
    </div>
  );
});

interface ForgotFormProps {
  onBack: () => void;
  onSuccess: () => void;
  copy: AuthModalCopy;
  onBusyChange: (busy: boolean) => void;
}

const ForgotForm = React.memo(function ForgotForm({ onBack, onSuccess, copy, onBusyChange }: ForgotFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    onBusyChange(loading);
    return () => onBusyChange(false);
  }, [loading, onBusyChange]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const sendResetEmail = useCallback(async () => {
    if (!email.trim()) {
      setError('Debes ingresar un correo válido.');
      return;
    }
    if (cooldown > 0) {
      setError('Por favor espera unos segundos antes de intentar nuevamente.');
      return;
    }

    setError(null);
    setLoading(true);
    onBusyChange(true);

    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/reset`
      : undefined;

    const response = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, redirectTo }),
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);
    onBusyChange(false);

    if (!response.ok) {
      setError(String((payload as any)?.error || "No se pudo enviar el correo de recuperación"));
      return;
    }

    setSuccess(copy.forgot.successMessage);
    setCooldown(30);
  }, [email, cooldown, onBusyChange, copy.forgot.successMessage]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    await sendResetEmail();
  }, [sendResetEmail]);

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value), []);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-6 flex items-center justify-center gap-3 text-lighttext dark:text-darktext w-full whitespace-nowrap">
          <div className="w-10 h-10 rounded-full bg-[var(--color-primary-a10)] flex items-center justify-center">
            <IconKey className="text-primary text-xl" />
          </div>
          {copy.forgot.headline}
        </h2>
        <p className="text-lighttext/70 dark:text-darktext/70 text-sm">{copy.forgot.description}</p>
      </div>
      {success ? (
        <div className="text-center">
          <div className="text-[var(--color-success)] text-sm mb-3">{success}</div>
          <div className="text-sm text-lighttext/70 dark:text-darktext/70 mb-4">
            Si no lo ves, revisa spam/promociones. Cuando abras el enlace, podrás crear una nueva contraseña.
          </div>
          {error && <div className="text-[var(--color-danger)] text-xs text-center mb-3">{error}</div>}
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="w-full"
              variant="outline"
              onClick={sendResetEmail}
              disabled={loading || cooldown > 0}
              loading={loading}
            >
              {cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar correo'}
            </Button>
            <Button type="button" className="w-full" onClick={onBack}>Entendido</Button>
          </div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium mb-1 text-lighttext dark:text-darktext">Correo</label>
            <Input
              type="email"
              placeholder="correo@ejemplo.com"
              required
              value={email}
              onChange={handleEmailChange}
              shape="pill"
              data-modal-initial-focus="true"
            />
          </div>
          {error && <div className="text-[var(--color-danger)] text-xs text-center">{error}</div>}
          <Button type="submit" className="w-full" loading={loading} disabled={loading}>{copy.forgot.submitLabel}</Button>
        </form>
      )}

      {!success ? (
        <button type="button" className="text-primary hover:underline font-medium text-sm mt-2" onClick={onBack}>{copy.forgot.backLabel}</button>
      ) : null}
    </div>
  );
});

interface RegisterFormProps {
  copy: AuthModalCopy;
  onSuccess: () => void;
  onVerificationPending?: (email: string | null) => void;
  onBusyChange: (busy: boolean) => void;
  hideTitle?: boolean;
}

const passwordValidationMessage = (value: string): string | null => {
  if (value.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (!/[0-9]/.test(value)) return 'Incluye al menos un número para mayor seguridad.';
  if (!/[A-Z]/.test(value)) return 'Incluye al menos una letra mayúscula.';
  return null;
};

const RegisterForm = React.memo(function RegisterForm({ copy, onSuccess, onVerificationPending, onBusyChange, hideTitle }: RegisterFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { signUp, signInWithOAuth } = useAuth();
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    onBusyChange(loading || !!oauthLoading);
    return () => onBusyChange(false);
  }, [loading, oauthLoading, onBusyChange]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (password !== password2) {
      setError("Las contraseñas no coinciden");
      return;
    }
    const pwdError = passwordValidationMessage(password);
    if (pwdError) {
      setError(pwdError);
      return;
    }
    setLoading(true);
    onBusyChange(true);
    try {
      localStorage.setItem('pending_name', name);
      const res = await signUp(email, password, { nombre: name });
      if (!res.ok) {
        const formatted = res.error?.toLowerCase().includes('already') || res.error?.toLowerCase().includes('exists')
          ? 'Este correo ya está registrado. Intenta iniciar sesión o recuperar tu contraseña.'
          : res.error;
        throw new Error(formatted || 'Error en registro');
      }
      const normalizedEmail = String(email || '').trim().toLowerCase();
      try {
        localStorage.setItem('simple_pending_verification_email', normalizedEmail);
      } catch {
        // ignore
      }
      onVerificationPending?.(normalizedEmail);
      setSuccess(copy.register.successMessage);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
    onBusyChange(false);
  }, [name, email, password, password2, signUp, onVerificationPending, onBusyChange, copy.register.successMessage]);

  const handleResendConfirmation = useCallback(async () => {
    const targetEmail = String(email || '').trim();
    if (!targetEmail) {
      setError('Ingresa tu correo para reenviar la confirmación.');
      return;
    }
    setError(null);
    setResending(true);
    try {
      const emailRedirectTo = `${window.location.origin}/auth/confirm?email=${encodeURIComponent(targetEmail)}`;
      const response = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "signup",
          email: targetEmail,
          options: { emailRedirectTo },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(String((payload as any)?.error || 'No pudimos reenviar el correo.'));
      } else {
        setResendCooldown(60);
      }
    } catch (e: any) {
      setError(e?.message || 'No pudimos reenviar el correo.');
    } finally {
      setResending(false);
    }
  }, [email]);

  const handleOAuth = useCallback(async (provider: 'google') => {
    setError(null);
    setOauthLoading(provider);
    try {
      const redirectTo = `${window.location.origin}/auth/confirm`;
      const res = await signInWithOAuth(provider, { redirectTo });
      if (!res.ok) {
        setError(res.error || 'No pudimos continuar con Google.');
      }
    } finally {
      setOauthLoading(null);
    }
  }, [signInWithOAuth]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value), []);
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value), []);
  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value), []);
  const handlePassword2Change = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setPassword2(e.target.value), []);
  const handleShowPasswordToggle = useCallback(() => setShowPassword(prev => !prev), []);
  const handleShowPassword2Toggle = useCallback(() => setShowPassword2(prev => !prev), []);

  return (
    <div>
      {!hideTitle && (
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold flex items-center justify-center gap-3 text-lighttext dark:text-darktext w-full whitespace-nowrap">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary-a10)] flex items-center justify-center">
              <IconUserPlus className="text-primary text-xl" />
            </div>
            {copy.register.headline}
          </h2>
        </div>
      )}
      {success ? (
        <div className="text-center">
          <div className="text-[var(--color-success)] text-sm mb-3">{success}</div>
          <div className="text-sm text-lighttext/70 dark:text-darktext/70 mb-4">
            Te enviamos un correo a <strong>{String(email || '').trim()}</strong>. Confírmalo para activar tu cuenta.
          </div>
          {error && <div className="text-[var(--color-danger)] text-xs text-center mb-3">{error}</div>}
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="w-full"
              variant="outline"
              onClick={handleResendConfirmation}
              disabled={resending || resendCooldown > 0}
              loading={resending}
            >
              {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar correo'}
            </Button>
            <Button type="button" className="w-full" onClick={onSuccess}>Entendido</Button>
          </div>
          <div className="text-xs text-lighttext/60 dark:text-darktext/60 mt-4">
            Si no llegó, revisa spam o espera unos minutos.
          </div>
        </div>
      ) : (
        <form className="space-y-3" onSubmit={handleSubmit}>
          <Input
            label="Nombre"
            type="text"
            required
            value={name}
            onChange={handleNameChange}
            shape="pill"
            data-modal-initial-focus="true"
          />
          <Input
            label="Correo"
            type="email"
            required
            value={email}
            onChange={handleEmailChange}
            shape="pill"
          />
          <label className="block text-sm font-medium text-lighttext dark:text-darktext mb-1">Contraseña</label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={handlePasswordChange}
              shape="pill"
              className="pr-12 h-10 text-sm"
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center p-0 text-lighttext/60 dark:text-darktext/60 hover:text-primary focus:outline-none"
              onClick={handleShowPasswordToggle}
              aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
            >
              {showPassword ? <IconEyeOff className="w-6 h-6" stroke={1.2} /> : <IconEye className="w-6 h-6" stroke={1.2} />}
            </button>
          </div>
          <label className="block text-sm font-medium text-lighttext dark:text-darktext mb-1 mt-2">Repetir contraseña</label>
          <div className="relative">
            <Input
              type={showPassword2 ? "text" : "password"}
              required
              value={password2}
              onChange={handlePassword2Change}
              shape="pill"
              className="pr-12 h-10 text-sm"
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center p-0 text-lighttext/60 dark:text-darktext/60 hover:text-primary focus:outline-none"
              onClick={handleShowPassword2Toggle}
              aria-label={showPassword2 ? "Ocultar contraseña" : "Ver contraseña"}
            >
              {showPassword2 ? <IconEyeOff className="w-6 h-6" stroke={1.2} /> : <IconEye className="w-6 h-6" stroke={1.2} />}
            </button>
          </div>
          {error && <div className="text-[var(--color-danger)] text-xs text-center">{error}</div>}
          <Button type="submit" className="w-full" loading={loading} disabled={loading}>{copy.register.submitLabel}</Button>
        </form>
      )}
      {!success ? (
        <>
          <div className="my-4 flex items-center gap-3 text-xs text-lighttext/60 dark:text-darktext/60">
            <div className="h-px flex-1 bg-lightborder/20 dark:bg-darkborder/20" /> o <div className="h-px flex-1 bg-lightborder/20 dark:bg-darkborder/20" />
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="flex items-center justify-center gap-2 w-full"
              onClick={() => handleOAuth('google')}
              loading={oauthLoading === 'google'}
              disabled={loading || !!oauthLoading}
            >
              <GoogleIcon />
              <span className="font-medium">{copy.register.googleButtonLabel}</span>
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
});

export { AuthModal };
export default AuthModal;

