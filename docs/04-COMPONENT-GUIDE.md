# Shared Component Guide (Header + Footer)

Este documento reemplaza las guías separadas de header y footer. Todo se consume desde `@simple/ui` y se configura por vertical usando `@simple/config`.

## 1. Dependencias mínimas
```bash
npm install @simple/ui @simple/config @simple/auth
```

Providers comunes:
```tsx
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@simple/auth';
import { NotificationsProvider, ToastProvider } from '@simple/ui';
```

## 2. Header (`<Header />`)
- **Ubicación:** `packages/ui/src/components/layout/Header.tsx`.
- **Props claves:**
  - `vertical`: `'autos' | 'properties' | 'stores' | 'food'`.
  - `user`, `loading`, `onLogout`, `onAuthClick`.
  - `navItems?: NavItem[]` para overrides (default según vertical).
  - `NotificationComponent`, `AuthModalComponent`, `getAvatarUrl`.
  - Toggles: `showNotifications`.
- **Feature set:** navegación responsive, menú móvil, toggles de tema, botón "Publicar" context-aware, dropdown de usuario y notificaciones.

### 2.1 Ejemplo (SimpleAutos)
```tsx
<Header
  vertical="autos"
  user={user}
  loading={loading}
  onLogout={signOut}
  NotificationComponent={NotificationsBell}
  getAvatarUrl={(profile) => getAvatarUrl(supabase, profile.avatar_url)}
/>
<AuthModalMount copy={autosAuthCopy} />
```

### 2.2 Resultados por vertical
| Vertical | Color | Botón Publicar | Menu label |
| --- | --- | --- | --- |
| `autos` | `#ffd400` (amarillo/dorado) | "Publicar Vehículo" | "Publicaciones" |
| `properties` | `#009BA3` (turquesa) | "Publicar Propiedad" | "Propiedades" |
| `stores` | `#7A5CFF` (violeta tech) | "Publicar Producto" | "Productos" |
| `food` | `#FFB800` (amarillo gourmet) | "Publicar Restaurante" | "Restaurantes" |

## 3. Footer (`<Footer />`)
- **Ubicación:** `packages/ui/src/components/layout/Footer.tsx`.
- **Props claves:**
  - `vertical`: mismo enum que Header.
  - `contactInfo`, `socialLinks`, `navigationColumns`, `badges`, `description`, `bottomContent`.
- **Feature set:** branding por vertical, columnas configurables, badges, enlaces legales, redes sociales y modo claro/oscuro consistente.

### 3.1 Ejemplo mínimo
```tsx
<Footer
  vertical="properties"
  contactInfo={{
    location: 'Las Condes, Santiago',
    phone: '+56 2 2987 6543',
    email: 'hola@simplepropiedades.app',
  }}
  socialLinks={{ instagram: 'https://instagram.com/simplepropiedades' }}
/>
```

### 3.2 Defaults por vertical
| Vertical | Claim | Navegación base | Badges |
| --- | --- | --- | --- |
| autos | "La forma más simple de comprar y vender vehículos" | Vehículos / Empresa / Soporte | Compra segura, 100% confiable, +10k vehículos |
| properties | "Encuentra tu hogar ideal" | Propiedades / Empresa / Soporte | Transacciones seguras, 100% confiable, +5k propiedades |
| stores | "Vende productos y servicios en minutos" | Productos / Empresa / Soporte | Compra segura, +20k productos |
| food | "Delivery inteligente para restaurantes" | Restaurantes / Operaciones / Soporte | Entregas confiables, SLA 99%, Integración POS |

## 4. Checklist de implementación
1. Importar tokens Tailwind de cada app (`tailwind.config.js`) con la paleta actualizada.
2. En layouts (`app/layout.tsx`), envolver con `ThemeProvider`, `AuthProvider`, `ToastProvider`, `NotificationsProvider`.
3. Montar `<Header />`, `<AuthModalMount />`, contenido (`<div className="mt-[10px]">`), `<Footer />`.
4. Configurar copy de Auth por vertical en `apps/*/src/config/authCopy.ts`.
5. Verificar deg en mobile: nav central + menú hamburguesa.

## 5. Troubleshooting
- **Hydration mismatch:** asegura usar `use client` y un flag `mounted` antes de renderizar Header/Footer cuando dependan de hooks del cliente.
- **Avatar vacío:** proveer `getAvatarUrl` con cliente Supabase server-side o usar `@simple/ui` helper `useAvatarUrl`.
- **Color incorrecto:** revisar `@simple/config` y la variable `vertical` usada.

## 6. Branding unificado
- Todas las apps y paquetes consumen el preset `@simple/config/tailwind-preset`, que ya expone `colors.primary` y tonos neutrales. No agregues overrides por vertical; solo importa el preset en `tailwind.config.js`.
- El color distintivo se define en CSS vía `@layer base { :root { --color-primary: ...; --color-primary-rgb: ...; } }` dentro de `apps/<vertical>/src/app/globals.css`. Ese valor alimenta automáticamente cualquier clase `bg-primary`, `text-primary`, `border-primary`, etc.
- Si un componente necesita contrastar sobre la marca, usa `text-primary-foreground` / `bg-primary` en vez de hardcodear `#fff`. La variable `--color-on-primary` queda disponible en `tokens.css` para overrides puntuales.
- Para nuevos verticales replica el bloque `@layer base` con los valores HEX/RGB adecuados y asegúrate de importar `@simple/config/tokens.css` antes de tus estilos.
- `packages/ui` y cualquier otro paquete pueden confiar en las utilidades Tailwind estándar (`bg-primary`, `shadow-card`, `text-lightmuted`, etc.) sin conocer la vertical, garantizando coherencia de branding.

---
Última actualización: 26 de noviembre de 2025
