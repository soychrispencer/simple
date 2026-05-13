# 🔐 Análisis del Flujo de Login — Hallazgos y Sugerencias

## Resumen del Flujo Actual

El login funciona como **modal overlay** (no como página separada) con 4 modos internos:
1. **Login** — email/password + Google OAuth
2. **Registro** — nombre + email/password + Google OAuth
3. **Recuperar contraseña** — envío de enlace por email
4. **Verificar email** — pantalla post-registro con instrucciones

Páginas dedicadas: `reset-password`, `verify-email`, `google/callback`

---

## 🚨 Problemas Encontrados

### 1. Código 100% Duplicado (Arquitectura)

> [!CAUTION]
> Los siguientes archivos son **byte-por-byte idénticos** entre `simpleautos` y `simplepropiedades`:

| Archivo | Líneas duplicadas |
|---------|------------------|
| [auth-context.tsx](../apps/simpleautos/src/context/auth-context.tsx) | 176 |
| [auth-modal.tsx](../apps/simpleautos/src/components/auth/auth-modal.tsx) | 306 |
| [GoogleLoginButton.tsx](../apps/simpleautos/src/components/GoogleLoginButton.tsx) | 52 |

**Total: ~534 líneas duplicadas.** Cualquier fix o mejora hay que hacerlo en 2 lugares.

**💡 Sugerencia:** Mover estos archivos a `packages/ui/` o crear un `packages/auth/` compartido.

---

### 2. Inconsistencia de Estilos (UX)

El modal de login usa componentes de `@simple/ui` (`PanelButton`, `PanelNotice`)... pero las páginas dedicadas **NO**:

| Componente | Usa @simple/ui | Problema |
|-----------|:-:|---------|
| `auth-modal.tsx` | ✅ | Consistente |
| `reset-password/page.tsx` | ❌ | Usa `btn-primary` (clase CSS), `<p>` con colores hardcoded |
| `verify-email/page.tsx` | ❌ | SVGs inline, colores hardcoded (`#dcfce7`, `#16a34a`) |
| `google/callback/page.tsx` | ❌ | Clases Tailwind (`bg-green-100`, `text-green-600`), mezcla con CSS vars |

**💡 Sugerencia:** Unificar todas las páginas de auth para usar exclusivamente `PanelButton`, `PanelNotice` y CSS vars del design system.

---

### 3. Sin Validación de Contraseña en Registro (Seguridad/UX)

El formulario de registro **no valida la contraseña** del lado del cliente:
- Sin requisito de longitud mínima visible
- Sin indicador de fortaleza de contraseña
- Sin confirmación de contraseña (solo un campo)
- El `reset-password` sí valida `password.length < 8`, pero el registro no

**💡 Sugerencia:**
- Agregar validación mínima (8 caracteres) con feedback visual
- Agregar campo de confirmar contraseña o toggle de visibilidad
- Mostrar indicador de fortaleza

---

### 4. Sin Feedback de Rate Limiting (UX)

Las llamadas al API no manejan respuestas `429 Too Many Requests`. Si el usuario intenta muchas veces:
- No hay throttle local (puede martillar el botón)
- No hay mensaje específico para rate limiting

**💡 Sugerencia:** Desabilitar temporalmente el botón tras envío exitoso del recovery email, y manejar status 429 con mensaje amigable.

---

### 5. El Estado del Modal No se Limpia al Cerrar (UX Bug)

Al cerrar el modal con ❌ y reabrirlo:
- El `mode` se mantiene (si estabas en "recovery", se abre en "recovery")
- Los campos de `email`/`password` quedan con el valor anterior  
- Los mensajes de error/éxito persisten

**💡 Sugerencia:** Resetear todo el estado al cerrar el modal.

---

### 6. Accesibilidad (A11y)

- ❌  Sin `aria-labelledby` ni `role="dialog"` en el modal
- ❌  Sin focus trap (el Tab key puede escapar del modal)
- ❌  Sin cierre con tecla Escape
- ❌  Sin `aria-label` en los formularios
- ✅  Los inputs tienen `required`
- ✅  El botón de cerrar tiene `label="Cerrar modal"`

**💡 Sugerencia:** Agregar `role="dialog"`, `aria-modal="true"`, focus trap y cierre con Escape.

---

### 7. Google Callback con Hardcoded Tailwind (Consistencia)

`google/callback/page.tsx` mezcla:
```tsx
// Tailwind directo
className="bg-green-100" className="text-green-600"
// Con CSS vars
style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
```
Esto rompe el theming si se implementa dark mode.

---

### 8. Redirect Post-Login Fijo a `/` (UX)

Tanto `google/callback` como `verify-email` y `reset-password` redirigen siempre a `/`. Si el usuario estaba en `/panel/publicar` y fue redirigido a auth, se pierde su ubicación.

**💡 Sugerencia:** Guardar la URL de origen en `returnTo` y redirigir de vuelta post-login.

---

## 📋 Priorización Sugerida

| # | Mejora | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 1 | Resetear estado al cerrar modal | 🟢 Bajo | 🔴 Alto (bug visible) |
| 2 | Validación de contraseña en registro | 🟢 Bajo | 🔴 Alto (seguridad) |
| 3 | Unificar estilos en páginas de auth | 🟡 Medio | 🟡 Medio (consistencia) |
| 4 | Accesibilidad (dialog, escape, focus) | 🟡 Medio | 🔴 Alto (a11y) |
| 5 | Return URL post-login | 🟡 Medio | 🟡 Medio (UX) |
| 6 | Extraer auth a package compartido | 🔴 Alto | 🔴 Alto (mantenibilidad) |
| 7 | Rate limiting feedback | 🟢 Bajo | 🟢 Bajo (edge case) |

---

> [!TIP]
> Las mejoras **1 y 2** se pueden implementar en menos de 30 minutos y tienen el mayor impacto inmediato. ¿Quieres que las implemente?
