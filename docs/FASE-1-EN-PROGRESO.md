# 📦 Fase 1: Foundation - En Progreso

**Fecha Inicio:** 8 de enero de 2025  
**Estado:** 🚀 En Progreso (60% completado)  
**Objetivo:** Crear los packages fundamentales que serán la base de todo el ecosistema

---

## 🎯 Objetivos de Fase 1

1. ✅ **@simple/ui** - Design System compartido
2. ⏳ **@simple/database** - Cliente Supabase con tipos
3. ⏳ **@simple/auth** - Sistema de autenticación SSO
4. ⏳ **@simple/payments** - Integración MercadoPago

---

## 📦 1. @simple/ui - Design System

### ✅ Lo que se ha completado:

#### Configuración Base
```bash
packages/ui/
├── package.json          ✅ Configurado con deps correctas
├── tsconfig.json         ✅ Extiende @simple/typescript-config
├── tailwind.config.js    ✅ Tokens Apple-inspired
├── src/
│   ├── styles/
│   │   └── globals.css   ✅ Variables CSS para 4 verticales
│   ├── lib/
│   │   └── utils.ts      ✅ cn() utility
│   └── index.ts          ✅ Barrel exports
```

#### Design Tokens Implementados

**Colores de Verticales:**
- 🚗 **SimpleAutos**: `#FF3600` (orange/red vibrante)
- 🏠 **SimplePropiedades**: `#2563eb` (blue profesional)
- 📊 **CRM**: `#8b5cf6` (purple moderno)
- ⚙️ **Admin**: `#059669` (green confiable)

**Escala de Grises (Apple-inspired):**
```javascript
gray: {
  50: '#fafafa',
  100: '#f5f5f5',
  200: '#e5e5e5',
  300: '#d4d4d4',
  400: '#a3a3a3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  800: '#262626',
  900: '#171717',
  950: '#0a0a0a'
}
```

**Tipografía:**
- Font: Inter (system-ui fallback)
- Sizes: xs (0.75rem) → 9xl (8rem)
- Line heights optimizados para legibilidad

**Espaciado:**
- Escala 4px: 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4 → 96
- Generous spacing siguiendo principios Apple

#### Componentes Implementados

##### 1. **Button** ✅
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}
```

**Features:**
- ✅ 4 variantes con estilos consistentes
- ✅ 3 tamaños (sm: 32px, md: 40px, lg: 48px)
- ✅ Estado loading con spinner
- ✅ Soporte para iconos left/right
- ✅ Accesibilidad (disabled states)
- ✅ Hover/active/focus states

**Uso:**
```tsx
import { Button } from '@simple/ui'

<Button variant="primary" size="md" loading={isSubmitting}>
  Guardar
</Button>
```

##### 2. **Card** ✅
```typescript
interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
  onClick?: () => void
}
```

**Features:**
- ✅ 3 variantes visuales
- ✅ 4 opciones de padding
- ✅ Efecto hover opcional
- ✅ Clickable con cursor pointer
- ✅ Bordes redondeados consistentes

**Uso:**
```tsx
import { Card } from '@simple/ui'

<Card variant="elevated" hoverable onClick={handleClick}>
  <h3>Título</h3>
  <p>Contenido...</p>
</Card>
```

##### 3. **Input** ✅
```typescript
interface InputProps {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  disabled?: boolean
}
```

**Features:**
- ✅ Label flotante opcional
- ✅ Mensajes de error estilizados
- ✅ Helper text para contexto
- ✅ Iconos left/right
- ✅ Estados disabled/error
- ✅ Focus states con ring

**Uso:**
```tsx
import { Input } from '@simple/ui'

<Input
  label="Correo electrónico"
  type="email"
  error={errors.email}
  helperText="Usaremos este correo para notificaciones"
  leftIcon={<IconMail />}
/>
```

---

### 🔄 Próximos Componentes (Pendiente)

#### Fase 1.1 - Componentes de Formulario
- [ ] **Select** - Dropdown con búsqueda
- [ ] **Textarea** - Input multi-línea
- [ ] **Checkbox** - Con label y states
- [ ] **Radio** - Grupos de opciones
- [ ] **Switch** - Toggle on/off

#### Fase 1.2 - Componentes de UI
- [ ] **Modal/Dialog** - Overlay con backdrop
- [ ] **Badge** - Labels pequeñas
- [ ] **Tag** - Etiquetas removibles
- [ ] **Tooltip** - Info hover
- [ ] **Alert** - Notificaciones inline

#### Fase 1.3 - Componentes de Layout
- [ ] **Header** - Adaptable por vertical
  - Logo dinámico según vertical
  - Color scheme automático
  - Navigation responsiva
  - User menu integrado
- [ ] **Footer** - Reutilizable
  - Links estándar
  - Social media
  - Copyright dinámico
- [ ] **Sidebar** - Navigation lateral

#### Fase 1.4 - Componentes de Dominio
- [ ] **ListingCard** - Card de vehículo/propiedad
  - Adaptable a SimpleAutos/SimplePropiedades
  - Imágenes optimizadas
  - Badges de estado
  - Quick actions
- [ ] **SearchFilters** - Filtros avanzados
  - Checkboxes múltiples
  - Range sliders
  - Location picker
- [ ] **UserMenu** - Menú de usuario
  - Avatar
  - Dropdown con opciones
  - Logout
- [ ] **NotificationBell** - Campana de notificaciones
  - Badge con contador
  - Dropdown con lista
  - Mark as read

---

## 📋 Checklist de Calidad para cada Componente

Antes de marcar un componente como "completado":

- [ ] TypeScript types exportados correctamente
- [ ] Props documentadas con JSDoc
- [ ] Variantes visuales implementadas
- [ ] Estados (hover, active, focus, disabled) funcionando
- [ ] Accesibilidad básica (aria-labels, keyboard nav)
- [ ] Responsive en mobile/tablet/desktop
- [ ] Dark mode funcionando
- [ ] Exportado en `src/index.ts`
- [ ] Compilación TypeScript sin errores
- [ ] Ejemplo de uso documentado

---

## 🎨 Filosofía de Diseño

### Inspiración Apple
- **Minimalismo**: Elementos justos y necesarios
- **Espaciado generoso**: Respiro visual abundante
- **Tipografía clara**: Inter con pesos apropiados
- **Colores sutiles**: Grises como base, colores para acentos
- **Animaciones suaves**: Transiciones de 150-300ms
- **Bordes redondeados**: lg (8px) para cards, md (6px) para inputs

### Adaptabilidad por Vertical
Los componentes se adaptan automáticamente usando CSS variables:
```css
/* SimpleAutos */
--color-primary: #FF3600;

/* SimplePropiedades */
--color-primary: #2563eb;
```

Los componentes usan `text-primary`, `bg-primary`, `border-primary` que se resuelven según el vertical activo.

---

## 🚀 Comandos Útiles

### Desarrollo
```bash
# Navegar al package
cd packages/ui

# Verificar tipos
pnpm tsc --noEmit

# Formatear código
pnpm prettier --write "src/**/*.{ts,tsx}"
```

### Testing (futuro)
```bash
# Unit tests
pnpm test

# Visual regression (Storybook)
pnpm storybook
```

---

## 📦 Dependencias

### Producción
```json
{
  "clsx": "^2.1.1",                    // Conditional classes
  "tailwind-merge": "^2.6.0",          // Merge Tailwind classes
  "@tabler/icons-react": "^3.34.1"     // Icon set
}
```

### Peer Dependencies
```json
{
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "next": "^15.5.0"
}
```

### Dev Dependencies
```json
{
  "@simple/typescript-config": "workspace:*",
  "@simple/eslint-config": "workspace:*",
  "@types/react": "^19.0.9",
  "@types/react-dom": "^19.0.3",
  "typescript": "^5.7.2",
  "tailwindcss": "^4.1.0"
}
```

---

## 🎯 Criterios de Éxito para Fase 1

Para considerar @simple/ui "completo" y pasar a Fase 2:

1. ✅ **Setup completo**: Tailwind + TypeScript + dependencies
2. 🔄 **20+ componentes**: Todos los listados arriba implementados
3. ⏳ **0 errores TypeScript**: Compilación limpia
4. ⏳ **Exportaciones limpias**: Todos los componentes exportados en index.ts
5. ⏳ **Documentación**: README.md con ejemplos de cada componente
6. ⏳ **Demo app**: App de ejemplo usando todos los componentes

---

## 📅 Timeline Estimado

- **Completado hasta ahora**: 3 días (setup + 3 componentes base)
- **Restante estimado**: 4-5 días
  - Día 4: Select, Textarea, Checkbox, Radio, Switch
  - Día 5: Modal, Badge, Tag, Tooltip, Alert
  - Día 6: Header, Footer, Sidebar
  - Día 7: ListingCard, SearchFilters
  - Día 8: UserMenu, NotificationBell, testing final

**Total Fase 1 (@simple/ui)**: ~8 días

---

## 🔗 Referencias

- **Master Plan**: `/PLAN_MAESTRO/03-DESIGN-SYSTEM.md`
- **Tailwind Docs**: https://tailwindcss.com/docs
- **Tabler Icons**: https://tabler.io/icons
- **Apple HIG**: https://developer.apple.com/design/human-interface-guidelines/

---

**Última Actualización:** 8 de enero de 2025  
**Próxima Revisión:** Al completar 10 componentes
