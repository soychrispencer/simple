import type { AuthModalCopyOverrides } from "@simple/ui";

export const autosAuthCopy: AuthModalCopyOverrides = {
  login: {
    headline: "Bienvenid@ a SimpleAutos",
    sideDescription: "Regístrate gratis para seguir tus autos favoritos y recibir novedades en SimpleAutos.",
    sideButtonLabel: "Crear cuenta",
  },
  register: {
    headline: "Crea tu Cuenta",
    submitLabel: "Crear cuenta",
    successMessage: "Revisa tu correo para activar tu cuenta y seguir tus vehículos favoritos.",
    sideDescription: "¿Ya tienes cuenta? Inicia sesión para continuar explorando.",
    sideButtonLabel: "Ya tengo cuenta",
  },
  forgot: {
    description: "Ingresa tu correo y te enviaremos instrucciones para recuperar el acceso a tu cuenta de SimpleAutos.",
    successMessage: "Si el correo existe, te enviaremos los pasos para recuperar tu acceso a SimpleAutos.",
    backLabel: "← Volver a iniciar sesión",
  },
};
