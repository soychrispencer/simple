# @simple/ui

Design System compartido para todo el ecosistema Simple.

## 📦 Instalación

```bash
pnpm add @simple/ui
```

## 🎨 Componentes Disponibles

### Componentes Base
- **Button** - Botón con múltiples variantes y estados
- **Card** - Tarjeta contenedora con variantes
- **Input** - Input de texto con label, error e iconos

### Componentes de Formulario
- **Select** - Dropdown select con opciones
- **Textarea** - Área de texto multi-línea
- **Checkbox** - Checkbox con label y descripción
- **Radio** - Radio button con label
- **Switch** - Toggle switch moderno

### Componentes de UI
- **Modal** - Modal/Dialog con backdrop
- **Badge** - Badge con variantes de color
- **Tag** - Tag removible con variantes
- **Alert** - Alerta inline con iconos

### Componentes de Layout
- **Header** - Header adaptable por vertical
- **Footer** - Footer con links y copyright

## 🚀 Uso Básico

```tsx
import { Button, Card, Input, Modal, Badge } from '@simple/ui'

function App() {
  return (
    <Card variant="elevated" padding="lg">
      <h2>Formulario de Ejemplo</h2>
      
      <Input
        label="Email"
        type="email"
        placeholder="tu@email.com"
      />
      
      <Button variant="primary" size="md">
        Enviar
      </Button>
      
      <Badge variant="success" dot>
        Activo
      </Badge>
    </Card>
  )
}
```

## 🎨 Design Tokens

### Colores por Vertical

El sistema soporta 4 verticales con colores primarios distintos:

- **SimpleAutos**: `#FF3600` (naranja/rojo vibrante)
- **SimplePropiedades**: `#2563eb` (azul profesional)
- **CRM**: `#8b5cf6` (morado moderno)
- **Admin**: `#059669` (verde confiable)

Los componentes usan automáticamente el color primary configurado vía CSS variables:

```css
/* SimpleAutos */
:root {
  --color-primary: #FF3600;
}

/* SimplePropiedades */
:root {
  --color-primary: #2563eb;
}
```

### Escala de Grises

Inspirada en el diseño de Apple con soporte para modo oscuro:

```javascript
gray: {
  50: '#fafafa',   // Casi blanco
  100: '#f5f5f5',
  200: '#e5e5e5',
  300: '#d4d4d4',
  400: '#a3a3a3',
  500: '#737373',  // Gris medio
  600: '#525252',
  700: '#404040',
  800: '#262626',
  900: '#171717',
  950: '#0a0a0a'   // Casi negro
}
```

## 📖 Ejemplos de Componentes

### Button

```tsx
import { Button } from '@simple/ui'

// Variantes
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>

// Tamaños
<Button size="sm">Pequeño</Button>
<Button size="md">Mediano</Button>
<Button size="lg">Grande</Button>

// Con estado loading
<Button loading>Cargando...</Button>

// Con iconos
<Button leftIcon={<IconPlus />}>Agregar</Button>
<Button rightIcon={<IconArrowRight />}>Siguiente</Button>
```

### Modal

```tsx
import { Modal, Button } from '@simple/ui'
import { useState } from 'react'

function Example() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>Abrir Modal</Button>
      
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Título del Modal"
        description="Descripción opcional"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary">
              Confirmar
            </Button>
          </>
        }
      >
        <p>Contenido del modal...</p>
      </Modal>
    </>
  )
}
```

### Select

```tsx
import { Select } from '@simple/ui'

const options = [
  { value: 'option1', label: 'Opción 1' },
  { value: 'option2', label: 'Opción 2' },
  { value: 'option3', label: 'Opción 3', disabled: true },
]

<Select
  label="Selecciona una opción"
  options={options}
  placeholder="Seleccionar..."
  error={errors.select}
/>
```

### Badge & Tag

```tsx
import { Badge, Tag } from '@simple/ui'

// Badges
<Badge variant="default">Default</Badge>
<Badge variant="primary" dot>Primary con dot</Badge>
<Badge variant="success">Éxito</Badge>
<Badge variant="warning">Advertencia</Badge>
<Badge variant="danger">Peligro</Badge>

// Tags (removibles)
<Tag variant="primary" onRemove={() => console.log('removed')}>
  Etiqueta
</Tag>
```

### Alert

```tsx
import { Alert } from '@simple/ui'
import { IconInfoCircle } from '@tabler/icons-react'

<Alert
  variant="info"
  title="Información importante"
  icon={<IconInfoCircle size={20} />}
  onClose={() => console.log('closed')}
>
  Este es un mensaje informativo que puede ser cerrado.
</Alert>
```

### Header & Footer

```tsx
import { Header, Footer, Button } from '@simple/ui'

// Header
<Header
  logo={<img src="/logo.png" alt="Logo" />}
  navigation={
    <>
      <a href="/ventas">Ventas</a>
      <a href="/arriendos">Arriendos</a>
      <a href="/subastas">Subastas</a>
    </>
  }
  actions={
    <>
      <Button variant="ghost">Ingresar</Button>
      <Button variant="primary">Registrarse</Button>
    </>
  }
  sticky
/>

// Footer
<Footer
  logo={<img src="/logo.png" alt="Logo" />}
  description="Simple - Marketplace unificado"
  links={[
    {
      title: 'Producto',
      items: [
        { label: 'SimpleAutos', href: '/autos' },
        { label: 'SimplePropiedades', href: '/propiedades' },
      ],
    },
    {
      title: 'Empresa',
      items: [
        { label: 'Sobre Nosotros', href: '/about' },
        { label: 'Contacto', href: '/contact' },
      ],
    },
  ]}
  copyright="© 2025 Simple. Todos los derechos reservados."
/>
```

## 🎯 Filosofía de Diseño

Este design system está inspirado en los principios de diseño de Apple:

- **Minimalismo**: Solo elementos necesarios
- **Espaciado generoso**: Respiro visual abundante
- **Tipografía clara**: Inter con pesos optimizados
- **Colores sutiles**: Grises como base, colores para acentos
- **Animaciones suaves**: Transiciones de 150-300ms
- **Bordes redondeados**: Consistentes en todo el sistema

## 🌗 Modo Oscuro

Todos los componentes soportan modo oscuro automáticamente usando la clase `dark:` de Tailwind CSS.

```tsx
// El modo oscuro funciona automáticamente basado en la preferencia del sistema
// o puedes controlarlo manualmente agregando la clase "dark" al html/body

<html className="dark">
  {/* Todos los componentes se adaptan automáticamente */}
</html>
```

## 🔧 Configuración Avanzada

### Importar Estilos Globales

Para usar Tailwind CSS correctamente, importa los estilos globales en tu app:

```tsx
// app/layout.tsx o pages/_app.tsx
import '@simple/ui/styles/globals.css'
```

### Extender Tailwind Config

Si necesitas extender la configuración de Tailwind en tu app:

```javascript
// tailwind.config.js
const uiConfig = require('@simple/ui/tailwind.config')

module.exports = {
  ...uiConfig,
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@simple/ui/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      ...uiConfig.theme.extend,
      // Tus extensiones aquí
    },
  },
}
```

## 📚 Documentación Completa

Para más información, consulta la documentación del proyecto en `/PLAN_MAESTRO/03-DESIGN-SYSTEM.md`

## 🤝 Contribuir

Este package es parte del monorepo Simple. Para contribuir:

1. Clona el repositorio
2. Navega a `packages/ui`
3. Ejecuta `pnpm install`
4. Haz tus cambios
5. Ejecuta `pnpm tsc --noEmit` para verificar tipos
6. Crea un PR

## 📄 Licencia

Privado - Uso interno Simple
