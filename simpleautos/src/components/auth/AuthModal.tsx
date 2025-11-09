
import React, { useState } from "react";
import Input from "@/components/ui/form/Input";
// Ya no importamos el cliente directo; usamos el del contexto
import { useAuth } from "@/context/AuthContext";
import Button from "../ui/Button";
import { GoogleIcon, AppleIcon } from "../ui/SocialIcons";
import { IconEye, IconEyeOff, IconLogin, IconUserPlus, IconKey } from "@tabler/icons-react";


export interface AuthModalProps {
  open: boolean;
  mode: "login" | "register";
  onClose: () => void;
}

export default function AuthModal({ open, mode, onClose }: AuthModalProps) {
  const [internalMode, setInternalMode] = useState(mode);
  const [showForgot, setShowForgot] = useState(false);
  React.useEffect(() => { setInternalMode(mode); setShowForgot(false); }, [mode, open]);
  if (!open) return null;
  const showSidePanel = !showForgot && (internalMode === "login" || internalMode === "register");
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="modal-auth-title">
      <div className={`bg-lightcard dark:bg-darkcard rounded-2xl shadow-token-lg p-0 relative flex overflow-hidden animate-scale-in origin-center min-w-[450px] max-w-2xl max-h-[90vh] border border-lightborder/20 dark:border-darkborder/20 ${showSidePanel ? "justify-start" : "justify-center"}`}>
        <button
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-lightbg dark:bg-darkbg hover:bg-lightborder/10 dark:hover:bg-darkborder/10 flex items-center justify-center transition-colors focus-ring z-10"
          onClick={onClose}
          aria-label="Cerrar modal"
          autoFocus
        >
          <span className="text-lighttext/60 dark:text-darktext/60 text-lg leading-none">×</span>
        </button>
        {/* Lado izquierdo: login, registro o recuperación */}
        <div className={`flex flex-col justify-center p-8 pr-12 ${showSidePanel ? "w-full md:w-[380px]" : "w-full max-w-md mx-auto"}`}>
          {showForgot ? (
            <ForgotForm onBack={() => setShowForgot(false)} />
          ) : internalMode === "login" ? (
             <LoginForm onForgot={() => setShowForgot(true)} onClose={onClose} />
          ) : (
            <RegisterForm />
          )}
        </div>
        {/* Lado derecho: opciones de registro o login */}
        {showSidePanel && internalMode === "login" ? (
          <div className="hidden md:flex flex-col justify-center items-center bg-gradient-to-br from-primary/90 to-primary/60 text-white w-80 px-8 py-10 gap-6">
            <div className="text-center">
              <div className="text-xl font-bold mb-2">¿Aún no tienes cuenta?</div>
              <div className="text-sm mb-6">Regístrate gratis y comienza a publicar o gestionar tus vehículos.</div>
              <Button
                variant="neutral"
                size="md"
                shape="rounded"
                className="bg-white !text-black font-semibold w-full mb-3 hover:bg-gray-100 dark:bg-white dark:text-black"
                onClick={() => setInternalMode("register")}
              >
                Registrarse como usuario
              </Button>
            </div>
          </div>
        ) : showSidePanel && internalMode === "register" ? (
          <div className="hidden md:flex flex-col justify-center items-center bg-gradient-to-br from-primary/90 to-primary/60 text-white w-80 px-8 py-10 gap-6">
            <div className="text-center">
              <div className="text-xl font-bold mb-2">¿Ya tienes cuenta?</div>
              <div className="text-sm mb-6">Inicia sesión para acceder a tu panel y gestionar tus vehículos.</div>
              <Button
                variant="neutral"
                size="md"
                shape="rounded"
                className="bg-white !text-black font-semibold w-full mb-3 hover:bg-gray-100 dark:bg-white dark:text-black"
                onClick={() => setInternalMode("login")}
              >
                Iniciar sesión
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface LoginFormProps {
  onForgot: () => void;
  onClose: () => void;
}

function LoginForm({ onForgot, onClose }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();
  // Recibir onClose correctamente

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn(email, password);
    setLoading(false);
    if (!res.ok) {
      if (res.error && (res.error.toLowerCase().includes('invalid') || res.error.toLowerCase().includes('credencial'))) {
        setError("Correo o contraseña incorrectos. Por favor, verifica tus datos.");
      } else if (res.error && res.error.toLowerCase().includes('email not confirmed')) {
        setError("Por favor confirma tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada y carpeta de spam.");
      } else {
        setError(res.error || 'Error al iniciar sesión');
      }
    } else if (typeof onClose === 'function') onClose();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 id="modal-auth-title" className="text-2xl font-bold mb-6 flex items-center justify-center gap-3 text-lighttext dark:text-darktext">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <IconLogin className="text-primary text-xl" />
          </div>
          Bienvenido
        </h2>
        <p className="text-lighttext/70 dark:text-darktext/70 text-sm">Accede para publicar y gestionar tus vehículos.</p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Correo"
          type="email"
          placeholder="correo@ejemplo.com"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="username"
          shape="pill"
        />
        <label className="block text-sm font-medium text-lighttext dark:text-darktext mb-1">Contraseña</label>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            shape="pill"
            className="pr-12 h-10"
          />
          <button
            type="button"
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center p-0 text-lighttext/60 dark:text-darktext/60 hover:text-primary focus:outline-none"
            onClick={() => setShowPassword(v => !v)}
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
              onChange={e => setRemember(e.target.checked)}
            /> Recordarme
          </label>
          <button type="button" className="text-primary hover:underline font-medium" onClick={onForgot}>Olvidé mi contraseña</button>
        </div>
        {error && <div className="text-red-500 text-xs text-center">{error}</div>}
        <Button
          type="submit"
          className="w-full"
          loading={loading}
          disabled={loading}
        >
          Iniciar sesión
        </Button>
      </form>
      <div className="flex items-center gap-3 text-xs text-lighttext/60 dark:text-darktext/60">
        <div className="h-px flex-1 bg-lightborder/20 dark:bg-darkborder/20" /> o <div className="h-px flex-1 bg-lightborder/20 dark:bg-darkborder/20" />
      </div>
      <div className="flex flex-col gap-2">
        <Button variant="outline" size="md" shape="rounded" className="flex items-center justify-center gap-2 w-full bg-lightcard dark:bg-darkcard hover:bg-lightborder/10 dark:hover:bg-darkborder/10 text-lighttext dark:text-darktext border border-lightborder/20 dark:border-darkborder/20">
          <GoogleIcon />
          <span className="font-medium">Continuar con Google</span>
        </Button>
        <Button variant="outline" size="md" shape="rounded" className="flex items-center justify-center gap-2 w-full bg-lightcard dark:bg-darkcard hover:bg-lightborder/10 dark:hover:bg-darkborder/10 text-lighttext dark:text-darktext border border-lightborder/20 dark:border-darkborder/20">
          <AppleIcon />
          <span className="font-medium">Continuar con Apple</span>
        </Button>
      </div>
      {/* Botones de registro movidos al recuadro lateral */}
    </div>
  );
}

interface ForgotFormProps {
  onBack: () => void;
}

function ForgotForm({ onBack }: ForgotFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { supabase } = useAuth();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess("Si el correo existe, se enviaron instrucciones para restablecer la contraseña.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-6 flex items-center justify-center gap-3 text-lighttext dark:text-darktext">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <IconKey className="text-primary text-xl" />
          </div>
          Recuperar contraseña
        </h2>
        <p className="text-lighttext/70 dark:text-darktext/70 text-sm">Ingresa tu correo y te enviaremos instrucciones para restablecer tu contraseña.</p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium mb-1 text-lighttext dark:text-darktext">Correo</label>
          <Input
            type="email"
            placeholder="correo@ejemplo.com"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            shape="pill"
          />
        </div>
        {error && <div className="text-red-500 text-xs text-center">{error}</div>}
        {success && <div className="text-green-600 text-xs text-center">{success}</div>}
        <Button type="submit" className="w-full" loading={loading} disabled={loading}>Enviar instrucciones</Button>
      </form>
      <button type="button" className="text-primary hover:underline font-medium text-sm mt-2" onClick={onBack}>&larr; Volver a iniciar sesión</button>
    </div>
  );
}

function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { signUp } = useAuth();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (password !== password2) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    try {
      // Guardar el nombre temporalmente en localStorage para usarlo tras la confirmación
      localStorage.setItem('pending_name', name);
  const res = await signUp(email, password, { nombre: name });
  if (!res.ok) throw new Error(res.error || 'Error en registro');
      setSuccess("¡Registro exitoso! Revisa tu correo para confirmar tu cuenta. Si no lo ves en tu bandeja de entrada, revisa la carpeta de spam o promociones.");
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-3 text-lighttext dark:text-darktext">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <IconUserPlus className="text-primary text-xl" />
          </div>
          Registro de usuario
        </h2>
      </div>
      {success ? (
        <div className="text-green-600 text-center text-sm mb-4">{success}</div>
      ) : (
        <form className="space-y-3" onSubmit={handleSubmit}>
          <Input
            label="Nombre"
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            shape="pill"
          />
          <Input
            label="Correo"
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            shape="pill"
          />
          <label className="block text-sm font-medium text-lighttext dark:text-darktext mb-1">Contraseña</label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              shape="pill"
              className="pr-12 h-10 text-sm"
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center p-0 text-lighttext/60 dark:text-darktext/60 hover:text-primary focus:outline-none"
              onClick={() => setShowPassword(v => !v)}
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
              onChange={e => setPassword2(e.target.value)}
              shape="pill"
              className="pr-12 h-10 text-sm"
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center p-0 text-lighttext/60 dark:text-darktext/60 hover:text-primary focus:outline-none"
              onClick={() => setShowPassword2(v => !v)}
              aria-label={showPassword2 ? "Ocultar contraseña" : "Ver contraseña"}
            >
              {showPassword2 ? <IconEyeOff className="w-6 h-6" stroke={1.2} /> : <IconEye className="w-6 h-6" stroke={1.2} />}
            </button>
          </div>
          {error && <div className="text-red-500 text-xs text-center">{error}</div>}
          <Button type="submit" className="w-full" loading={loading} disabled={loading}>Crear cuenta</Button>
        </form>
      )}
      <div className="my-4 flex items-center gap-3 text-xs text-lighttext/60 dark:text-darktext/60">
        <div className="h-px flex-1 bg-lightborder/20 dark:bg-darkborder/20" /> o <div className="h-px flex-1 bg-lightborder/20 dark:bg-darkborder/20" />
      </div>
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="md"
          shape="rounded"
          className="flex items-center justify-center gap-2 w-full bg-lightcard dark:bg-darkcard hover:bg-lightborder/10 dark:hover:bg-darkborder/10 text-lighttext dark:text-darktext border border-lightborder/20 dark:border-darkborder/20"
        >
          <GoogleIcon />
          <span className="font-medium">Registrarse con Google</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="md"
          shape="rounded"
          className="flex items-center justify-center gap-2 w-full bg-lightcard dark:bg-darkcard hover:bg-lightborder/10 dark:hover:bg-darkborder/10 text-lighttext dark:text-darktext border border-lightborder/20 dark:border-darkborder/20"
        >
          <AppleIcon />
          <span className="font-medium">Registrarse con Apple</span>
        </Button>
      </div>
      {/* Botones de login/empresa movidos al recuadro lateral */}
    </div>
  );
}
