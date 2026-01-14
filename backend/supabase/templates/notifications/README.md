# Security notifications (Supabase) · Simple Plataforma

Estos templates corresponden a **Authentication → Email → Security notifications** en el dashboard de Supabase.

## Subjects sugeridos

- Password changed: `Contraseña cambiada · Simple Plataforma`
- Email address changed: `Correo actualizado · Simple Plataforma`
- Phone number changed: `Teléfono actualizado · Simple Plataforma`
- Identity linked: `Identidad vinculada · Simple Plataforma`
- Identity unlinked: `Identidad desvinculada · Simple Plataforma`
- MFA method added: `Segundo factor agregado · Simple Plataforma`
- MFA method removed: `Segundo factor removido · Simple Plataforma`

## Archivos

- `password_changed_notification.html`
- `email_changed_notification.html`
- `phone_changed_notification.html`
- `identity_linked_notification.html`
- `identity_unlinked_notification.html`
- `mfa_factor_enrolled_notification.html`
- `mfa_factor_unenrolled_notification.html`

## Cómo activarlos en Supabase

1. En Supabase ve a: **Authentication → Email → Security notifications**.
2. En cada notificación:
   - Activa el toggle **Enabled**.
   - Pega el **Subject** (usa los sugeridos arriba).
   - Pega el **Body** (HTML) desde el archivo correspondiente.
3. Usa **Send test email** (si aparece) para validar que renderiza bien.

## Variables usadas

Estos templates usan placeholders soportados por Supabase:

- `{{ .Email }}`
- `{{ .OldEmail }}`
- `{{ .Phone }}`
- `{{ .OldPhone }}`
- `{{ .Provider }}`
- `{{ .FactorType }}`

Nota: algunos eventos no entregan todas las variables (por ejemplo, los de identidad solo usan `Provider`/`Email`).
