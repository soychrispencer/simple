import type { AuthModalCopyOverrides } from "@simple/ui";

export const propiedadesAuthCopy: AuthModalCopyOverrides = {
  login: {
    headline: "Bienvenid@ a SimplePropiedades",
    sideTitle: "¿Aún no tienes cuenta?",
    sideDescription: "Crea tu cuenta para seguir tus propiedades favoritas y recibir novedades en SimplePropiedades.",
    sideButtonLabel: "Crear cuenta",
  },
  register: {
    headline: "Crea tu Cuenta",
    submitLabel: "Crear cuenta",
    successMessage: "Revisa tu correo para activar tu cuenta y guardar tus proyectos favoritos.",
    sideDescription: "¿Ya tienes cuenta? Inicia sesión para seguir explorando.",
    sideButtonLabel: "Ya tengo cuenta",
  },
  forgot: {
    description: "Ingresa tu correo y te enviaremos instrucciones para recuperar el acceso a tu panel de SimplePropiedades.",
    successMessage: "Si el correo existe, recibiras un enlace para restablecer tu contrasena y volver a gestionar tus propiedades.",
  },
};
