import type { AuthModalCopyOverrides } from "@simple/ui";

export const tiendasAuthCopy: AuthModalCopyOverrides = {
  login: {
    headline: "Bienvenid@ a SimpleTiendas",
    sideTitle: "¿Aún no tienes cuenta?",
    sideDescription: "Regístrate gratis para guardar productos y recibir novedades de SimpleTiendas.",
    sideButtonLabel: "Crear cuenta",
  },
  register: {
    headline: "Crea tu Cuenta",
    submitLabel: "Crear cuenta",
    successMessage: "Revisa tu correo para activar tu cuenta y seguir tus compras favoritas.",
    sideDescription: "¿Ya tienes cuenta? Inicia sesión para continuar.",
    sideButtonLabel: "Ya tengo cuenta",
  },
  forgot: {
    description: "Ingresa el correo de tu tienda y te enviaremos instrucciones para recuperar el acceso.",
    successMessage: "Si el correo existe te enviaremos un enlace para restablecer tu contraseña.",
  },
};
