﻿# GuÃ­a de Uso: Header Compartido (@simple/ui)

## ðŸŽ¯ Objetivo

El Header ha sido extraÃ­do de SimpleAutos y convertido en un componente genÃ©rico que mantiene **todas las funcionalidades** originales pero ahora puede ser usado por cualquier vertical del ecosistema.

---

## âœ¨ CaracterÃ­sticas Mantenidas

âœ… **Todas las funcionalidades originales:**
- Logo con color primario por vertical
- NavegaciÃ³n responsive (desktop y mÃ³vil)
- Sistema de autenticaciÃ³n integrado
- MenÃº de usuario con dropdown
- Notificaciones (si se provee componente)
- Favoritos
- Theme toggle (dark/light)
- BotÃ³n de publicar adaptado por vertical
- MenÃº mÃ³vil expandible
- Animaciones y transiciones

âœ… **Nuevo: Adaptable por vertical:**
- Color primario dinÃ¡mico segÃºn vertical
- Textos personalizados (SimpleAutos, SimplePropiedades, etc.)
- Nav items configurables
- BotÃ³n de publicar con texto apropiado

---

## ðŸ“¦ InstalaciÃ³n en una Vertical

### 1. Agregar dependencia

En `apps/simpleautos/package.json`:

```json
{
  "dependencies": {
    "@simple/ui": "*",
    "@simple/config": "*",
    // ... otras dependencias
  }
}
```

### 2. Instalar

```bash
cd c:\Users\chris\OneDrive\Desktop\Simple
npm install
```

---

## ðŸš€ Uso en SimpleAutos

### OpciÃ³n A: Uso BÃ¡sico (Recomendado)

```tsx
// apps/simpleautos/src/app/layout.tsx
import { Header } from '@simple/ui';
import { AuthModalMount } from '@simple/ui';
import { useAuth } from '@/context/AuthContext';
import { NotificationsBell } from '@/components/NotificationsBell';
import { getAvatarUrl } from '@/lib/supabaseStorage';
import { useSupabase } from '@/lib/supabase/useSupabase';
import { autosAuthCopy } from '@/config/authCopy';

export default function RootLayout({ children }) {
  const { user, loading, signOut } = useAuth();
  const supabase = useSupabase();

  return (
    <html lang="es">
      <body>
        <ThemeProvider>
          <AuthProvider>
            <Header
              vertical="autos"
              user={user}
              loading={loading}
              onLogout={signOut}
              NotificationComponent={NotificationsBell}
              getAvatarUrl={(user) => getAvatarUrl(supabase, user.avatar_url)}
            />
            <AuthModalMount copy={autosAuthCopy} />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

#### Personalizar el copy del modal de auth

1. Crea `apps/simpleautos/src/config/authCopy.ts`:

```ts
import type { AuthModalCopyOverrides } from '@simple/ui';

export const autosAuthCopy: AuthModalCopyOverrides = {
  login: {
    subheading: 'Accede para publicar y gestionar tus vehículos.',
    sideDescription: 'Regístrate gratis y comienza a publicar autos o administrar tus leads.',
    sideButtonLabel: 'Crear cuenta SimpleAutos',
  },
  // ... overrides opcionales para register/forgot
};
```

2. Pásalo al montar el modal:

```tsx
<AuthModalMount copy={autosAuthCopy} />
// o
<AuthModal open={open} mode="login" onClose={handleClose} copy={autosAuthCopy} />
```

##### Copys listos por vertical

- `apps/simpleautos/src/config/authCopy.ts` -> `autosAuthCopy` usado en el layout y `app/login` de SimpleAutos.
- `apps/simplepropiedades/src/config/authCopy.ts` -> `propiedadesAuthCopy` montado dentro de `LayoutContent` para alinear messaging inmobiliario.
- `apps/simpletiendas/src/config/authCopy.ts` -> `tiendasAuthCopy` utilizado para ecommerce físico/online.
- `apps/simplefood/src/config/authCopy.ts` -> `foodAuthCopy` con foco en operaciones de restaurantes.

Cada vertical importa su archivo desde `@/config/authCopy` y lo pasa al `AuthModalMount` (o a `AuthModal` directo) para mantener un solo modal compartido con copy especializado.
```

### OpciÃ³n B: Con NavegaciÃ³n Personalizada

```tsx
import { Header, type NavItem } from '@simple/ui';
import { IconCar, IconHome, IconGavel } from '@tabler/icons-react';

const customNavItems: NavItem[] = [
  { label: "Inicio", href: "/", icon: IconHome },
  { label: "Autos Nuevos", href: "/ventas/nuevos", icon: IconCar },
  { label: "Autos Usados", href: "/ventas/usados", icon: IconCar },
  { label: "Subastas", href: "/subastas", icon: IconGavel },
];

export default function Layout({ children }) {
  return (
    <Header
      vertical="autos"
      navItems={customNavItems}
      // ... resto de props
    />
  );
}
```

### OpciÃ³n C: Con Handlers Personalizados

```tsx
import { Header } from '@simple/ui';
import { AuthModal } from '@simple/ui';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Layout({ children }) {
  const router = useRouter();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <Header
        vertical="autos"
        onAuthClick={() => setShowAuthModal(true)}
        onPublishClick={() => {
          // LÃ³gica personalizada
          router.push('/panel/nueva-publicacion');
        }}
        onLogout={async () => {
          await customLogoutLogic();
        }}
      />
      
      <AuthModal 
        open={showAuthModal} 
        mode="login"
        onClose={() => setShowAuthModal(false)} 
      />
      
      {children}
    </>
  );
}
```

---

## ðŸ¡ Uso en SimplePropiedades

```tsx
// apps/simplepropiedades/src/app/layout.tsx
import { Header } from '@simple/ui';
import { IconHome, IconBuilding, IconKey } from '@tabler/icons-react';

const propsNavItems = [
  { label: "Inicio", href: "/", icon: IconHome },
  { label: "Comprar", href: "/ventas", icon: IconBuilding },
  { label: "Arrendar", href: "/arriendos", icon: IconKey },
];

export default function Layout({ children }) {
  const { user, loading, signOut } = useAuth();

  return (
    <Header
      vertical="properties"  // ðŸ‘ˆ Cambia a verde automÃ¡ticamente
      user={user}
      loading={loading}
      navItems={propsNavItems}
      onLogout={signOut}
      // AuthModalComponent y otros igual que SimpleAutos
    />
  );
}
```

- Logo dice "SimplePropiedades"
- Color primario es turquesa (#009BA3)
- BotÃ³n dice "Publicar Propiedad"
- Â¡Todo lo demÃ¡s funciona igual!

---

## ðŸ“‹ Props del Header

### Requeridas

| Prop | Tipo | DescripciÃ³n |
|------|------|-------------|
| `vertical` | `'autos' \| 'properties' \| 'stores'` | Determina tema y textos |

### Opcionales - AutenticaciÃ³n

| Prop | Tipo | Default | DescripciÃ³n |
|------|------|---------|-------------|
| `user` | `any` | `undefined` | Usuario autenticado |
| `loading` | `boolean` | `false` | Estado de carga de auth |
| `onAuthClick` | `() => void` | Modal interno | Handler para click en login |
| `onLogout` | `() => Promise<void>` | - | Handler para cerrar sesiÃ³n |
| `AuthModalComponent` | `React.ComponentType` | - | Componente de modal de auth |

### Opcionales - NavegaciÃ³n

| Prop | Tipo | Default | DescripciÃ³n |
|------|------|---------|-------------|
| `navItems` | `NavItem[]` | Por vertical | Items del menÃº |
| `onPublishClick` | `() => void` | `/panel/nueva-publicacion` | Handler personalizado para publicar |

### Opcionales - Funcionalidades

| Prop | Tipo | Default | DescripciÃ³n |
|------|------|---------|-------------|
| `showNotifications` | `boolean` | `true` | Mostrar notificaciones |
| `NotificationComponent` | `React.ComponentType` | - | Componente de notificaciones |
| `getAvatarUrl` | `(user) => string` | - | FunciÃ³n para obtener URL de avatar |

---

## ðŸŽ¨ PersonalizaciÃ³n por Vertical

El Header se adapta automÃ¡ticamente segÃºn la prop `vertical`:

### SimpleAutos (`vertical="autos"`)
```tsx
- Color: #ffd400 (Amarillo/Dorado)
- Logo: "SimpleAutos"
- Nav Default: Inicio, Ventas, Arriendos, Subastas
- BotÃ³n: "Publicar VehÃ­culo"
- Menu: "Publicaciones"
```

### SimplePropiedades (`vertical="properties"`)
```tsx
- Color: #009BA3 (Turquesa)
- Logo: "SimplePropiedades"
- Nav Default: Inicio, Comprar, Arrendar
- BotÃ³n: "Publicar Propiedad"
- Menu: "Propiedades"
```

### SimpleTiendas (`vertical="stores"`)
```tsx
- Color: #7A5CFF (Violeta tech)
- Logo: "SimpleTiendas"
- Nav Default: Inicio, Productos, Servicios
- BotÃ³n: "Publicar Producto"
- Menu: "Productos"
```

---

## ðŸ”§ Componentes Adicionales Requeridos

Para que el Header funcione completamente, necesitas proveer:

### 1. AuthModal Component

```tsx
// Tu componente de modal de autenticaciÃ³n
interface AuthModalProps {
  open: boolean;
  mode: 'login' | 'register';
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ open, mode, onClose }) => {
  // Tu implementaciÃ³n
};
```

### 2. Notifications Component (Opcional)

```tsx
// Tu componente de notificaciones
const NotificationsBell: React.FC = () => {
  // Debe incluir el CircleButton con el Ã­cono de campana
  // y el dropdown de notificaciones
};
```

### 3. Auth Context/Hook

```tsx
// Hook que provee user, loading y signOut
const { user, loading, signOut } = useAuth();
```

---

## ðŸŽ¯ Migrando desde Header Antiguo

### Antes (SimpleAutos especÃ­fico):

```tsx
// apps/simpleautos/src/components/layout/Header.tsx
import Header from "@/components/layout/Header";

<Header />
```

### DespuÃ©s (Header compartido):

```tsx
// Cualquier vertical
import { Header } from '@simple/ui';

<Header
  vertical="autos"
  user={user}
  loading={loading}
  onLogout={signOut}
  AuthModalComponent={AuthModal}
  NotificationComponent={NotificationsBell}
  getAvatarUrl={getAvatarUrl}
/>
```

### Pasos de MigraciÃ³n:

1. âœ… Instalar `@simple/ui` como dependencia
2. âœ… Cambiar import de `@/components/layout/Header` a `@simple/ui`
3. âœ… Agregar prop `vertical="autos"`
4. âœ… Pasar props necesarias (user, loading, etc.)
5. âœ… Verificar que funciona igual
6. âœ… Eliminar Header antiguo de `/components/layout/Header.tsx`

---

## ðŸ’¡ Ventajas del Header Compartido

### Para el Desarrollo
âœ… **Una sola fuente de verdad** - Cambios en un lugar afectan todas las verticales
âœ… **Consistencia** - Mismo UX en todo el ecosistema
âœ… **Menos cÃ³digo** - No duplicar lÃ³gica compleja
âœ… **FÃ¡cil testing** - Testear una vez, funciona en todos lados

### Para Nuevas Verticales
âœ… **RÃ¡pido setup** - Solo configurar vertical y listo
âœ… **Funcionalidades completas** - Todo incluido desde el inicio
âœ… **Personalizable** - FÃ¡cil adaptar si se necesita algo especÃ­fico

### Para Mantenimiento
âœ… **Bug fixes globales** - Arreglar en @simple/ui y todas las verticales se benefician
âœ… **Nuevas features** - Agregar funcionalidad una vez, disponible en todas
âœ… **Actualizaciones** - npm install y listo

---

## ðŸ› Troubleshooting

### Error: "Cannot find module '@simple/ui'"

**SoluciÃ³n:**
```bash
cd c:\Users\chris\OneDrive\Desktop\Simple
npm install
```

### El color primario no cambia

**Problema:** No se estÃ¡ pasando la prop `vertical` correctamente

**SoluciÃ³n:**
```tsx
<Header vertical="autos" /> // âœ…
<Header vertical={vertical} /> // âœ… si `vertical` es una variable
<Header /> // âŒ Falta la prop
```

### Tailwind no aplica estilos del Header

**SoluciÃ³n:** Agregar path de @simple/ui en `tailwind.config.js`:

```javascript
// apps/simpleautos/tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}", // ðŸ‘ˆ Agregar esto
  ],
  // ...
};
```

### AuthModal no se muestra

**Problema:** No se estÃ¡ pasando el componente correctamente

**SoluciÃ³n:**
```tsx
import { AuthModal } from '@simple/ui';

<Header
  AuthModalComponent={AuthModal} // âœ… Pasar el componente
  // NO: AuthModalComponent={<AuthModal />} âŒ
/>
```

---

## ðŸš€ PrÃ³ximos Pasos

1. **Footer Compartido** - Extraer y adaptar Footer de la misma manera
2. **MÃ¡s Componentes UI** - Button, Input, Select, etc.
3. **Paquete de Auth** - `@simple/auth` con contexto compartido
4. **Theme Provider** - Sistema de temas unificado

---

## ðŸ“ž Soporte

Si tienes dudas o encuentras problemas:
1. Revisa la documentaciÃ³n en `/docs`
2. Revisa el cÃ³digo fuente en `/packages/ui/src/components/layout/Header.tsx`
3. Compara con el uso en SimpleAutos

---

**Ãšltima ActualizaciÃ³n:** 11 de noviembre de 2025  
**VersiÃ³n de @simple/ui:** 1.0.0
