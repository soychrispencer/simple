import type { AuthModalCopyOverrides } from "@simple/ui";

export const foodAuthCopy: AuthModalCopyOverrides = {
  login: {
    headline: "Bienvenid@ a SimpleFood",
    sideTitle: "¿Aún no tienes cuenta?",
    sideDescription: "Regístrate gratis para guardar restaurantes y recibir novedades de SimpleFood.",
    sideButtonLabel: "Crear cuenta",
  },
  register: {
    headline: "Crea tu Cuenta",
    submitLabel: "Crear cuenta",
    successMessage: "Revisa tu correo para activar tu cuenta y seguir tus pedidos favoritos.",
    sideDescription: "¿Ya tienes cuenta? Inicia sesión para continuar.",
    sideButtonLabel: "Ya tengo cuenta",
  },
  forgot: {
    description: "Ingresa el correo del restaurante para restablecer tu contraseña.",
    successMessage: "Si el correo existe te enviaremos un enlace para recuperar el acceso.",
  },
};
