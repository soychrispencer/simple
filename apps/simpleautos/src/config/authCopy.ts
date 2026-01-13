import type { AuthModalCopyOverrides } from "@simple/ui";

export const autosAuthCopy: AuthModalCopyOverrides = {
  login: {
    headline: "Bienvenid@ a SimpleAutos",
    subheading: "Inicia sesión para publicar, guardar y gestionar tus vehículos.",
    sideDescription: "Regístrate gratis para seguir tus autos favoritos y recibir novedades en SimpleAutos.",
    sideButtonLabel: "Crear cuenta",
    googleButtonLabel: "Continuar con Google",
    forgotLinkLabel: "Olvidé mi contraseña",
  },
  register: {
    headline: "Crea tu Cuenta",
    submitLabel: "Crear cuenta",
    successMessage: "Revisa tu correo para activar tu cuenta en SimpleAutos. Si no lo ves en tu bandeja de entrada, revisa spam/promociones.",
    sideDescription: "¿Ya tienes cuenta? Inicia sesión para continuar explorando.",
    sideButtonLabel: "Ya tengo cuenta",
    googleButtonLabel: "Registrarme con Google",
  },
  forgot: {
    description: "Ingresa tu correo y te enviaremos instrucciones para recuperar el acceso a tu cuenta de SimpleAutos.",
    successMessage: "Listo. Si el correo existe, te enviaremos un enlace para restablecer tu contraseña en SimpleAutos.",
    backLabel: "← Volver a iniciar sesión",
    submitLabel: "Enviar enlace",
  },
};
