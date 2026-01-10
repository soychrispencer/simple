# Guía de Uso: Footer Compartido (@simple/ui)

## 🎯 Objetivo

El Footer ha sido extraído de SimpleAutos y convertido en un componente genérico que mantiene **todas las funcionalidades** y el **mismo diseño** pero ahora es adaptable para cualquier vertical del ecosistema.

---

## ✨ Características Mantenidas

✅ **Todas las funcionalidades originales:**
- Logo con color primario por vertical
- Información de contacto (ubicación, teléfono, email)
- Redes sociales con hover effects (Instagram, TikTok, Facebook, WhatsApp, YouTube)
- Columnas de navegación personalizables
- Badges de características destacadas
- Créditos y copyright dinámico
- Diseño en card con gradiente superior
- Totalmente responsive (mobile/desktop)

✅ **Nuevo: Adaptable por vertical:**
- Color primario dinámico según vertical
- Nombre de la empresa adaptado (SimpleAutos, SimplePropiedades, etc.)
- Navegación por defecto según vertical
- Badges personalizados por tipo de negocio
- Links de redes sociales generados automáticamente

---

## 📦 Instalación

Ya está disponible en `@simple/ui` si seguiste la guía del Header.

---

## 🚀 Uso Básico

### SimpleAutos (Mínimo)

```tsx
// apps/simpleautos/src/app/layout.tsx
import { Footer } from '@simple/ui';

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        {children}
        <Footer vertical="autos" />
      </body>
    </html>
  );
}
```

**Resultado:** 
- Logo "SimpleAutos" en amarillo/dorado (#FFB600)
- Navegación: Vehículos, Empresa, Soporte
- Badges: "Compra Segura", "100% Confiable", "+10,000 Vehículos"
- Redes sociales: @simpleautos.app
- Todo funcional y con el diseño original

---

## 🎨 Personalización

### Con Información de Contacto Personalizada

```tsx
<Footer
  vertical="autos"
  contactInfo={{
    location: 'Providencia, Santiago, Chile',
    phone: '+56 2 2345 6789',
    email: 'contacto@simpleautos.app',
  }}
/>
```

### Con Redes Sociales Específicas

```tsx
<Footer
  vertical="autos"
  socialLinks={{
    instagram: 'https://instagram.com/simpleautos',
    facebook: 'https://facebook.com/simpleautoscl',
    whatsapp: 'https://wa.me/56987654321',
    // tiktok y youtube opcional
  }}
/>
```

### Con Navegación Personalizada

```tsx
import { IconCar, IconGavel, IconStar } from '@tabler/icons-react';

const customColumns = [
  {
    title: 'Vehículos Premium',
    icon: IconStar,
    links: [
      { label: 'Autos de Lujo', href: '/ventas/lujo' },
      { label: 'SUVs', href: '/ventas/suvs' },
      { label: 'Deportivos', href: '/ventas/deportivos' },
    ],
  },
  {
    title: 'Subastas',
    icon: IconGavel,
    links: [
      { label: 'Subastas Activas', href: '/subastas/activas' },
      { label: 'Próximas Subastas', href: '/subastas/proximas' },
      { label: 'Historial', href: '/subastas/historial' },
    ],
  },
  // ... más columnas
];

<Footer
  vertical="autos"
  navigationColumns={customColumns}
/>
```

### Con Badges Personalizados

```tsx
import { IconShield, IconTruck, IconAward } from '@tabler/icons-react';

<Footer
  vertical="autos"
  badges={[
    { icon: IconShield, label: 'Garantía Extendida' },
    { icon: IconTruck, label: 'Envío Nacional' },
    { icon: IconAward, label: 'Mejor Valorados 2024' },
  ]}
/>
```

### Con Descripción Personalizada

```tsx
<Footer
  vertical="autos"
  description="SimpleAutos es la plataforma líder en Chile para la compra y venta de vehículos. Con más de 10 años de experiencia, conectamos a miles de compradores y vendedores cada día."
/>
```

### Con Footer Inferior Personalizado

```tsx
<Footer
  vertical="autos"
  bottomContent={
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs text-gray-500">
        © 2024 SimpleAutos SpA - RUT: 12.345.678-9
      </p>
      <div className="flex gap-4 text-xs">
        <a href="/legal" className="text-gray-500 hover:text-primary">Términos Legales</a>
        <a href="/cookies" className="text-gray-500 hover:text-primary">Política de Cookies</a>
      </div>
    </div>
  }
/>
```

---

## 🏡 Uso en SimplePropiedades

```tsx
// apps/simplepropiedades/src/app/layout.tsx
import { Footer } from '@simple/ui';

export default function Layout({ children }) {
  return (
    <>
      {children}
      <Footer 
        vertical="properties"  // 👈 Automáticamente verde
        contactInfo={{
          location: 'Las Condes, Santiago',
          phone: '+56 2 2987 6543',
          email: 'hola@simplepropiedades.app',
        }}
      />
    </>
  );
}
```

**Resultado:**
- Logo "SimplePropiedades" en turquesa (#009BA3)
- Navegación: Propiedades, Empresa, Soporte
- Badges: "Transacciones Seguras", "100% Confiable", "+5,000 Propiedades"
- Descripción adaptada a propiedades
- ¡Mismo diseño!

---

## 🛍️ Uso en SimpleTiendas

```tsx
<Footer 
  vertical="stores"  // 👈 Automáticamente púrpura
  socialLinks={{
    instagram: 'https://instagram.com/simpletiendas',
    tiktok: 'https://tiktok.com/@simpletiendas',
    facebook: 'https://facebook.com/simpletiendas',
  }}
/>
```

**Resultado:**
- Logo "SimpleTiendas" en violeta (#7A5CFF)
- Navegación: Productos, Empresa, Soporte
- Badges: "Compra Segura", "100% Confiable", "+20,000 Productos"
- Enfocado en e-commerce

---

## 📋 Props del Footer

### Requeridas

| Prop | Tipo | Descripción |
|------|------|-------------|
| `vertical` | `'autos' \| 'properties' \| 'stores'` | Determina tema, textos y navegación por defecto |

### Opcionales

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `contactInfo` | `ContactInfo` | Santiago + genérico | Ubicación, teléfono y email |
| `socialLinks` | `SocialLinks` | URLs generadas | Links a redes sociales |
| `navigationColumns` | `NavigationColumn[]` | Por vertical | Columnas de navegación |
| `description` | `string` | Por vertical | Descripción de la empresa |
| `badges` | `Badge[]` | Por vertical | Características destacadas |
| `bottomContent` | `ReactNode` | Copyright + Artestudio | Contenido del footer inferior |

---

## 🎨 Configuración por Vertical

### SimpleAutos (`vertical="autos"`)

```tsx
Color: #FFB600 (Amarillo/Dorado)
Logo: "SimpleAutos"

Descripción Default:
"La plataforma más simple para comprar y vender vehículos en Chile..."

Navegación Default:
- Vehículos: Comprar, Alquilar, Subastas, Vender
- Empresa: Sobre Nosotros, Contacto, Ayuda, Términos
- Soporte: FAQ, Guía Vendedor, Privacidad, Reportar

Badges Default:
- Compra Segura
- 100% Confiable
- +10,000 Vehículos

Redes Default:
@simpleautos.app en todas las plataformas
```

### SimplePropiedades (`vertical="properties"`)

```tsx
Color: #009BA3 (Turquesa)
Logo: "SimplePropiedades"

Descripción Default:
"La plataforma más simple para comprar, vender y arrendar propiedades..."

Navegación Default:
- Propiedades: Comprar, Arrendar, Destacadas, Publicar
- Empresa: Sobre Nosotros, Contacto, Ayuda, Términos
- Soporte: FAQ, Guía Propietario, Privacidad, Reportar

Badges Default:
- Transacciones Seguras
- 100% Confiable
- +5,000 Propiedades

Redes Default:
@simplepropiedades.app
```

### SimpleTiendas (`vertical="stores"`)

```tsx
Color: #7A5CFF (Violeta tech)
Logo: "SimpleTiendas"

Descripción Default:
"La plataforma más simple para comprar y vender productos en Chile..."

Navegación Default:
- Productos: Explorar, Servicios, Ofertas, Vender
- Empresa: Sobre Nosotros, Contacto, Ayuda, Términos
- Soporte: FAQ, Guía Vendedor, Privacidad, Reportar

Badges Default:
- Compra Segura
- 100% Confiable
- +20,000 Productos

Redes Default:
@simpletiendas.app
```

---

## 🔧 Tipos TypeScript

### ContactInfo

```typescript
interface ContactInfo {
  location?: string;
  phone?: string;
  email?: string;
}
```

### SocialLinks

```typescript
interface SocialLinks {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  whatsapp?: string;
  youtube?: string;
}
```

### NavigationColumn

```typescript
interface NavigationColumn {
  title: string;
  icon?: React.ComponentType<{ size?: number }>;
  links: Array<{
    label: string;
    href: string;
  }>;
}
```

### Badge

```typescript
interface Badge {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
}
```

---

## 🎯 Migrando desde Footer Antiguo

### Antes (SimpleAutos específico):

```tsx
import Footer from "@/components/layout/Footer";

<Footer />
```

### Después (Footer compartido):

```tsx
import { Footer } from '@simple/ui';

<Footer vertical="autos" />
```

### Pasos de Migración:

1. ✅ Cambiar import de `@/components/layout/Footer` a `@simple/ui`
2. ✅ Agregar prop `vertical="autos"`
3. ✅ (Opcional) Agregar personalización con props adicionales
4. ✅ Verificar que se ve igual
5. ✅ Eliminar Footer antiguo de `/components/layout/Footer.tsx`

---

## 💡 Ventajas

### Consistencia Visual
✅ Mismo diseño en todo el ecosistema
✅ Actualizaciones de estilo se propagan automáticamente
✅ Brand identity unificado

### Facilidad de Uso
✅ Zero config - solo pasar `vertical`
✅ Personalizable cuando se necesite
✅ TypeScript completo con autocomplete

### Mantenimiento
✅ Un solo componente para todas las verticales
✅ Bug fixes globales
✅ Nuevas features una vez, disponibles para todos

---

## 🐛 Troubleshooting

### Los links no tienen el color de la vertical en hover

**Problema:** Tailwind necesita ver los paths de @simple/ui

**Solución:** En `tailwind.config.js`:

```javascript
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}", // 👈 Importante
  ],
  // ...
};
```

### El color del gradiente superior no se ve

**Problema:** Inline styles necesitan más especificidad

**Solución:** Ya está manejado con `style={{ color: verticalConfig.color }}` en el componente. Si no funciona, verifica que `@simple/config` esté instalado.

### Quiero ocultar las redes sociales

```tsx
<Footer
  vertical="autos"
  socialLinks={{}} // 👈 Objeto vacío = no muestra ninguna
/>
```

### Quiero menos columnas de navegación

```tsx
<Footer
  vertical="autos"
  navigationColumns={[
    {
      title: 'Enlaces',
      links: [
        { label: 'Inicio', href: '/' },
        { label: 'Contacto', href: '/contacto' },
      ],
    },
  ]}
/>
```

---

## 🚀 Próximos Pasos

- **Componentes de UI**: Extraer Button, Input, Select, Card, etc.
- **AuthModal**: Modal de autenticación compartido
- **Toast/Notifications**: Sistema de notificaciones unificado
- **@simple/auth**: Paquete de autenticación compartida

---

## 📞 Soporte

Código fuente: `/packages/ui/src/components/layout/Footer.tsx`  
Documentación completa: `/docs/`

---

**Última Actualización:** 11 de noviembre de 2025  
**Versión de @simple/ui:** 1.0.0
