# 🎨 Design System - Ecosistema Simple

**Autor:** Christian  
**Fecha:** 8 de noviembre de 2025  
**Versión:** 1.0

---

## 📋 Índice

1. [Filosofía de Diseño](#filosofía-de-diseño)
2. [Sistema de Colores](#sistema-de-colores)
3. [Tipografía](#tipografía)
4. [Espaciado y Layout](#espaciado-y-layout)
5. [Componentes Base](#componentes-base)
6. [Componentes Compartidos](#componentes-compartidos)
7. [Animaciones y Transiciones](#animaciones-y-transiciones)

---

## 💎 Filosofía de Diseño

### Inspiración Apple

El diseño del ecosistema Simple está inspirado en los principios de diseño de Apple:

1. **Minimalismo:** Menos es más. Eliminar lo innecesario.
2. **Claridad:** Jerarquía visual clara, tipografía legible.
3. **Consistencia:** Mismos patrones en todas las verticales.
4. **Atención al detalle:** Bordes redondeados, sombras sutiles, transiciones suaves.
5. **Espacio en blanco:** Generoso uso del espacio para que el contenido respire.

### Principios Core

```
┌─────────────────────────────────────────────────┐
│  1. SIMPLE & CLEAN                              │
│     - Sin clutter visual                        │
│     - Interfaces respiran                       │
│                                                 │
│  2. CONSISTENCIA RADICAL                        │
│     - Mismos componentes en todas las apps      │
│     - Solo cambia el color de acento            │
│                                                 │
│  3. MOBILE-FIRST                                │
│     - Diseñado para móvil primero               │
│     - Progressive enhancement                   │
│                                                 │
│  4. ACCESIBILIDAD                               │
│     - Contraste WCAG AA                         │
│     - Keyboard navigation                       │
│     - Screen reader friendly                    │
│                                                 │
│  5. PERFORMANCE                                 │
│     - Animaciones 60fps                         │
│     - Imágenes optimizadas                      │
│     - Lazy loading inteligente                  │
└─────────────────────────────────────────────────┘
```

---

## 🎨 Sistema de Colores

### Colores Base (Neutros)

Sistema de grises Apple-inspired:

```css
/* Light Mode */
--gray-50:  #fafafa;  /* Backgrounds alternativos */
--gray-100: #f5f5f5;  /* Hover states */
--gray-200: #e5e5e5;  /* Borders sutiles */
--gray-300: #d4d4d4;  /* Borders normales */
--gray-400: #a3a3a3;  /* Texto secundario */
--gray-500: #737373;  /* Texto terciario */
--gray-600: #525252;  /* Iconos */
--gray-700: #404040;  /* Texto principal */
--gray-800: #262626;  /* Encabezados */
--gray-900: #171717;  /* Negro intenso */

/* Dark Mode */
--dark-bg:     #111111;  /* Background principal */
--dark-card:   #1a1a1a;  /* Tarjetas/Cards */
--dark-border: rgba(255, 255, 255, 0.1);  /* Bordes */
--dark-text:   #ffffff;  /* Texto principal */
```

### Colores por Vertical

Cada vertical tiene su color primario característico:

```css
/* SimpleAutos - Naranja/Rojo vibrante */
[data-vertical="autos"] {
  --color-primary: #FF3600;
  --color-primary-hover: #E63000;
  --color-primary-light: #FF6B3D;
  --color-primary-dark: #CC2B00;
  --color-primary-rgb: 255, 54, 0;
}

/* SimplePropiedades - Azul confiable */
[data-vertical="propiedades"] {
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-primary-light: #3b82f6;
  --color-primary-dark: #1e40af;
  --color-primary-rgb: 37, 99, 235;
}

/* CRM - Morado profesional */
[data-vertical="crm"] {
  --color-primary: #8b5cf6;
  --color-primary-hover: #7c3aed;
  --color-primary-light: #a78bfa;
  --color-primary-dark: #6d28d9;
  --color-primary-rgb: 139, 92, 246;
}

/* Admin - Verde corporativo */
[data-vertical="admin"] {
  --color-primary: #059669;
  --color-primary-hover: #047857;
  --color-primary-light: #10b981;
  --color-primary-dark: #065f46;
  --color-primary-rgb: 5, 150, 105;
}
```

### Colores Semánticos

```css
/* Success */
--color-success: #10b981;
--color-success-light: #d1fae5;
--color-success-dark: #065f46;

/* Error */
--color-error: #ef4444;
--color-error-light: #fee2e2;
--color-error-dark: #991b1b;

/* Warning */
--color-warning: #f59e0b;
--color-warning-light: #fef3c7;
--color-warning-dark: #92400e;

/* Info */
--color-info: #3b82f6;
--color-info-light: #dbeafe;
--color-info-dark: #1e40af;
```

### Implementación en Tailwind

```javascript
// packages/ui/tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Base
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        'primary-light': 'var(--color-primary-light)',
        
        // Grays
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
        },
        
        // Semantic
        success: {
          DEFAULT: '#10b981',
          light: '#d1fae5',
          dark: '#065f46',
        },
        error: {
          DEFAULT: '#ef4444',
          light: '#fee2e2',
          dark: '#991b1b',
        },
        // ... etc
      },
    },
  },
};
```

---

## 📝 Tipografía

### Font Family

Usamos **Inter** como fuente principal (similar a San Francisco de Apple):

```css
@import url('https://rsms.me/inter/inter.css');

:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
               'Helvetica Neue', Arial, sans-serif;
  --font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 
               'Droid Sans Mono', monospace;
}

body {
  font-family: var(--font-sans);
  font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
}
```

### Escala Tipográfica

Sistema modular adaptado a UI compacta:

```css
:root {
  /* Tamaños */
  --text-xs: 0.75rem;      /* 12px - Labels pequeños */
  --text-sm: 0.8125rem;    /* 13px - Texto secundario */
  --text-base: 0.875rem;   /* 14px - Texto principal */
  --text-md: 1rem;         /* 16px - Texto destacado */
  --text-lg: 1.125rem;     /* 18px - Subtítulos */
  --text-xl: 1.375rem;     /* 22px - Títulos */
  --text-2xl: 1.75rem;     /* 28px - Títulos grandes */
  --text-3xl: 2.25rem;     /* 36px - Hero titles */
  --text-4xl: 3rem;        /* 48px - Landing heroes */
  
  /* Line Heights */
  --leading-tight: 1.1;
  --leading-snug: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  
  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  --font-extrabold: 800;
}
```

### Jerarquía Visual

```css
/* H1 - Hero Titles */
.text-h1 {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  letter-spacing: -0.02em;
}

/* H2 - Section Titles */
.text-h2 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  letter-spacing: -0.015em;
}

/* H3 - Card Titles */
.text-h3 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-snug);
}

/* Body - Principal */
.text-body {
  font-size: var(--text-base);
  font-weight: var(--font-normal);
  line-height: var(--leading-normal);
}

/* Caption - Secundario */
.text-caption {
  font-size: var(--text-sm);
  font-weight: var(--font-normal);
  line-height: var(--leading-normal);
  color: var(--gray-500);
}
```

---

## 📐 Espaciado y Layout

### Sistema de Espaciado

Escala modular basada en 4px:

```css
:root {
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  --space-24: 6rem;     /* 96px */
}
```

### Border Radius

Bordes redondeados Apple-style:

```css
:root {
  --radius-xs: 4px;    /* Inputs pequeños */
  --radius-sm: 6px;    /* Botones, badges */
  --radius-md: 10px;   /* Cards pequeñas */
  --radius-lg: 14px;   /* Cards medianas */
  --radius-xl: 20px;   /* Cards grandes */
  --radius-2xl: 28px;  /* Headers, modales */
  --radius-full: 9999px; /* Círculos, pills */
}
```

### Sombras

Sistema de elevación sutil:

```css
:root {
  /* Cards */
  --shadow-card: 
    0 1px 2px rgba(0, 0, 0, 0.05),
    0 8px 24px -8px rgba(0, 0, 0, 0.12);
  
  --shadow-card-hover:
    0 2px 6px rgba(0, 0, 0, 0.06),
    0 12px 28px -10px rgba(0, 0, 0, 0.16);
  
  /* Modales/Overlays */
  --shadow-modal:
    0 24px 48px rgba(0, 0, 0, 0.24);
  
  /* Dropdowns */
  --shadow-popover:
    0 12px 24px rgba(0, 0, 0, 0.20);
  
  /* Focus */
  --shadow-focus:
    0 0 0 3px rgba(var(--color-primary-rgb), 0.45);
}

/* Dark Mode - Sombras más suaves */
.dark {
  --shadow-card: 
    0 1px 2px rgba(0, 0, 0, 0.3),
    0 8px 24px -8px rgba(0, 0, 0, 0.4);
}
```

### Contenedores

```css
/* Contenedor principal */
.container {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1rem;
}

@media (min-width: 768px) {
  .container {
    padding: 0 2rem;
  }
}

/* Contenedor estrecho (formularios, artículos) */
.container-narrow {
  max-width: 720px;
}

/* Contenedor ancho (grids de listings) */
.container-wide {
  max-width: 1440px;
}
```

---

## 🧩 Componentes Base

### Button

```tsx
// packages/ui/src/components/Button/Button.tsx
import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    fullWidth = false,
    loading = false,
    disabled,
    children, 
    ...props 
  }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center
      font-medium rounded-md
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
    `;
    
    const variants = {
      primary: `
        bg-primary text-white
        hover:bg-primary-hover
        focus:ring-primary
      `,
      secondary: `
        bg-gray-100 dark:bg-gray-800 
        text-gray-900 dark:text-gray-100
        hover:bg-gray-200 dark:hover:bg-gray-700
        focus:ring-gray-500
      `,
      ghost: `
        text-gray-700 dark:text-gray-300
        hover:bg-gray-100 dark:hover:bg-gray-800
      `,
      danger: `
        bg-error text-white
        hover:bg-error-dark
        focus:ring-error
      `,
    };
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };
    
    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          loading && 'cursor-wait',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg 
            className="animate-spin -ml-1 mr-2 h-4 w-4" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
```

### Card

```tsx
// packages/ui/src/components/Card/Card.tsx
import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className, 
    variant = 'default', 
    padding = 'md',
    hoverable = false,
    children, 
    ...props 
  }, ref) => {
    const baseStyles = `
      rounded-xl
      bg-white dark:bg-dark-card
      transition-all duration-200
    `;
    
    const variants = {
      default: 'shadow-card',
      elevated: 'shadow-card-hover',
      outlined: 'border border-gray-200 dark:border-dark-border',
    };
    
    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };
    
    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          paddings[padding],
          hoverable && 'hover:shadow-card-hover hover:scale-[1.02] cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export { Card };
```

### Input

```tsx
// packages/ui/src/components/Input/Input.tsx
import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            `
              w-full px-3 py-2
              text-base
              bg-white dark:bg-dark-card
              border border-gray-300 dark:border-dark-border
              rounded-md
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
            `,
            error && 'border-error focus:ring-error',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-error">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
```

---

## 🔧 Componentes Compartidos

### Header

Componente Header unificado con soporte multi-vertical:

```tsx
// packages/ui/src/components/Header/Header.tsx
'use client';
import React from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { IconSun, IconMoon, IconMenu } from '@tabler/icons-react';

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface HeaderProps {
  vertical: 'autos' | 'propiedades' | 'crm';
  logo: string;
  navItems: NavItem[];
  user?: {
    name: string;
    avatar?: string;
  };
  onAuthClick?: () => void;
}

export function Header({ vertical, logo, navItems, user, onAuthClick }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { theme, setTheme } = useTheme();
  
  return (
    <header 
      className="w-full bg-transparent relative z-50"
      data-vertical={vertical}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card p-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white font-extrabold text-xl">S</span>
              </div>
              <span className="font-bold text-xl">{logo}</span>
            </Link>
            
            {/* Desktop Nav */}
            <nav className="hidden lg:flex gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary transition"
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>
            
            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:scale-105 transition"
              >
                {theme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
              </button>
              
              {/* Auth */}
              {user ? (
                <div className="flex items-center gap-2">
                  <img 
                    src={user.avatar || '/default-avatar.png'} 
                    alt={user.name}
                    className="w-10 h-10 rounded-full"
                  />
                </div>
              ) : (
                <button
                  onClick={onAuthClick}
                  className="px-4 py-2 text-sm font-medium hover:text-primary transition"
                >
                  Iniciar sesión
                </button>
              )}
              
              {/* Mobile Menu */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
              >
                <IconMenu size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
```

### ListingCard

Card adaptable para vehículos y propiedades:

```tsx
// packages/ui/src/components/ListingCard/ListingCard.tsx
'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { IconHeart } from '@tabler/icons-react';
import { Card } from '../Card';

interface ListingCardProps {
  id: string;
  title: string;
  price: number;
  currency?: string;
  image: string;
  location?: string;
  badge?: string;
  href: string;
  onFavoriteClick?: (id: string) => void;
  isFavorite?: boolean;
  vertical: 'autos' | 'propiedades';
}

export function ListingCard({
  id,
  title,
  price,
  currency = 'CLP',
  image,
  location,
  badge,
  href,
  onFavoriteClick,
  isFavorite = false,
  vertical,
}: ListingCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(price);
  };
  
  return (
    <Card hoverable padding="none" data-vertical={vertical}>
      <Link href={href}>
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 hover:scale-105"
          />
          
          {/* Badge */}
          {badge && (
            <div className="absolute top-3 left-3 bg-white dark:bg-dark-card px-2 py-1 rounded-md text-xs font-semibold shadow">
              {badge}
            </div>
          )}
          
          {/* Favorite */}
          <button
            onClick={(e) => {
              e.preventDefault();
              onFavoriteClick?.(id);
            }}
            className="absolute top-3 right-3 w-9 h-9 bg-white dark:bg-dark-card rounded-full flex items-center justify-center shadow hover:scale-110 transition"
          >
            <IconHeart
              size={20}
              fill={isFavorite ? 'currentColor' : 'none'}
              className={isFavorite ? 'text-red-500' : ''}
            />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-1 line-clamp-2">{title}</h3>
          {location && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{location}</p>
          )}
          <p className="text-xl font-bold text-primary">{formatPrice(price)}</p>
        </div>
      </Link>
    </Card>
  );
}
```

---

## ✨ Animaciones y Transiciones

### Transiciones Suaves

```css
:root {
  --ease-standard: cubic-bezier(0.33, 1, 0.68, 1);
  --ease-emphatic: cubic-bezier(0.83, 0, 0.17, 1);
  --transition-fast: 120ms var(--ease-standard);
  --transition-base: 200ms var(--ease-standard);
  --transition-slow: 360ms var(--ease-standard);
}

/* Aplicar a elementos interactivos */
button, a, .card {
  transition: all var(--transition-base);
}
```

### Micro-interacciones

```css
/* Hover scale sutil */
.hover-scale {
  transition: transform var(--transition-base);
}
.hover-scale:hover {
  transform: scale(1.02);
}

/* Fade in on load */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn var(--transition-slow) var(--ease-standard);
}
```

---

## 🚀 Siguiente Paso

Revisar el documento **04-PLAN-IMPLEMENTACION.md** para el plan de ejecución paso a paso.
