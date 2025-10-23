# 🚗 SimpleAutos

> Plataforma moderna de marketplace para compra, venta, arriendo y subasta de vehículos en Chile.

Plataforma web para compra, venta, arriendo y subasta de vehículos en Chile. Base para un futuro ecosistema de verticales (SimpleTiendas, SimplePropiedades, etc.).

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/) [![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/) [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/) [![Supabase](https://img.shields.io/badge/Supabase-Latest-green)](https://supabase.com/)

---

## 📋 Tabla de Contenidos

- [🎯 Objetivos](#-objetivos)
- [✨ Características](#-características)
- [🛠️ Stack Tecnológico](#️-stack-tecnológico)
- [🚀 Instalación](#-instalación)
- [⚙️ Configuración](#️-configuración)
- [🗄️ Base de Datos](#️-base-de-datos)
- [📁 Estructura del Proyecto](#-estructura-del-proyecto)
- [💻 Desarrollo](#-desarrollo)
- [🚢 Despliegue](#-despliegue)
- [🔍 Auditoría de Producción](#-auditoría-de-producción)
- [📧 Configuración de Email](#-configuración-de-email)
- [🔄 Sincronización con Marketplaces](#-sincronización-con-marketplaces)
- [🎨 Sistema de Boosts](#-sistema-de-boosts)
- [📈 Métricas](#-métricas)
- [🔒 Seguridad](#-seguridad)
- [🤝 Contribución](#-contribución)

---

## 🎯 Objetivos

- Crear una experiencia moderna, fluida y premium para usuarios y empresas.
- Permitir gestión integral de vehículos: publicación, edición, arriendo, venta y subasta.
- Escalabilidad para nuevos verticales y funcionalidades.

---

## ✨ Características

### Funcionalidades Principales
- 🔍 **Búsqueda Avanzada** con filtros por tipo, marca, modelo, región, precio, año, combustible, transmisión, color y estado
- 🚀 **Sistema de Boosts** para destacar vehículos en ubicaciones premium (Home, Categorías, Perfil)
- 📸 **Gestión Multimedia** con upload, crop y preview de imágenes
- 💬 **Reviews y Calificaciones** para vendedores
- 📊 **Dashboard Completo** con métricas y gestión de publicaciones
- 🌙 **Dark Mode** nativo

### Arquitectura y Componentes Clave
- Contexto global de usuario único (`UserContext.tsx`).
- Uploader y cropper de avatar/portada sincronizados con Supabase Storage.
- Componentes desacoplados y reutilizables (`UserAvatar`, `Card`, `Header`, `Button`, etc.).
- Formularios robustos y validados.
- Tokens CSS globales para diseño consistente.

### Checklist de Estado y Flujos

#### Tipos de Listados
- 💰 **Venta** - Precio fijo
- 📅 **Arriendo** - Precios diarios/semanales/mensuales + depósito
- 🔨 **Subasta** - Con fechas de inicio y término

#### Implementado ✅
- [x] Frontend desacoplado y avanzado
- [x] Componentes reutilizables y tokens de diseño
- [x] Validaciones modernas y UX premium
- [x] Sincronización de avatar/portada en tiempo real (crop, subida, borrado, refresh global)
- [x] Unificación de contexto de usuario (solo `UserContext.tsx`)
- [x] Refactor para evitar duplicidad y facilitar mantenimiento
- [x] Sistema de perfiles completo (profiles, companies, social_links, schedules, reviews)
- [x] Migración SQL limpia con RLS policies
- [x] API de vehículos conectado a Supabase (/api/vehicles)
- [x] Panel de publicaciones muestra datos reales
- [x] Corrección de mapeo de columnas (owner_id, public_name, description)

#### En progreso / Pendiente 🚧
- [ ] Implementar edición de vehículos en panel
- [ ] Implementar duplicar vehículos (POST a Supabase)
- [ ] Métricas reales (vistas, clics) en publicaciones
- [ ] Filtros y búsqueda en panel de publicaciones
- [ ] Terminar todas las integraciones de perfil público
- [ ] Preparar la arquitectura para nuevos verticales

---

## 🛠️ Stack Tecnológico

**Frontend**: Next.js 15 (App Router) · React 19 · TypeScript 5 · Tailwind CSS 3
**Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
**Tools**: Vercel · ESLint · Swiper · React Hot Toast · Lucide Icons

---

## 🚀 Instalación

### 1. Clonar repositorio
```bash
git clone <repository-url>
cd simpleautos
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar entorno
```bash
cp .env.example .env.local
# Editar .env.local con tus credenciales
```

### 4. Iniciar desarrollo
```bash
npm run dev
```

Aplicación disponible en `http://localhost:3000`

---

## ⚙️ Configuración

### Variables de Entorno Requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email (Resend)
RESEND_API_KEY=your_resend_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Configuración de Supabase

#### Storage Buckets (públicos):
- `avatars` - Avatares de usuarios
- `portadas` - Imágenes de portada
- `vehicle-images` - Fotos de vehículos

#### Auth:
- Email/Password habilitado
- Persistencia de sesión: `persistSession: true`
- Auto refresh token: `autoRefreshToken: true`

---

## 🗄️ Base de Datos

### Esquema Completo
El esquema completo con tablas, índices, RLS policies y funciones está en:
`supabase/migrations/20251021120000_final_consolidated_schema.sql`

### Tablas Principales

#### Usuarios
- `profiles` - Perfiles de usuarios
- `companies` - Empresas
- `social_links` - Redes sociales
- `schedules` - Horarios
- `reviews` - Reseñas

#### Vehículos
- `vehicles` - Tabla principal
- `vehicle_types` - Tipos (auto, moto, camión, etc.)
- `brands` - Marcas
- `models` - Modelos por marca
- `vehicle_media` - Imágenes y videos
- `vehicle_features` - Características específicas
- `commercial_conditions` - Condiciones de venta/alquiler/subasta

#### Ubicación
- `regions` - Regiones de Chile
- `communes` - Comunas por región

#### Boost System
- `boost_plans` - Planes disponibles
- `vehicle_boosts` - Boosts activos
- `vehicle_boost_slots` - Posiciones diarias

#### Métricas
- `vehicle_metrics` - Vistas, clics, favoritos

### RLS Policies
Todas las tablas tienen Row Level Security habilitado:
- **INSERT/UPDATE/DELETE**: Solo el dueño (`auth.uid() = user_id`)
- **SELECT**: Dueño O perfiles públicos con `username IS NOT NULL`

### Migración
Archivo: `supabase/migrations/20251021120000_final_consolidated_schema.sql`
- DROP de tablas antiguas (español)
- CREATE de tablas nuevas (inglés)
- Índices para performance
- Triggers para `updated_at`
- Políticas RLS completas

### Datos Iniciales Incluidos
- 16 regiones chilenas
- 346 comunas chilenas
- Tipos de vehículo (automóvil, camioneta, motocicleta, camión, maquinaria)
- 25 marcas de vehículos populares
- 200+ modelos de vehículos
- Planes de boost (Básico, Premium, VIP)

---

## 📁 Estructura del Proyecto

```
simpleautos/
├── public/                     # Estáticos
├── scripts/                    # Scripts de mantenimiento
│   ├── seed-fake-data.js      # Seed de datos
│   └── ...
├── src/
│   ├── app/                   # App Router
│   │   ├── actions/          # Server Actions
│   │   ├── api/              # API Routes
│   │   ├── auth/             # Páginas de autenticación
│   │   ├── panel/            # Dashboard
│   │   ├── perfil/           # Perfiles públicos
│   │   ├── vehiculo/         # Páginas de vehículos
│   │   └── ...
│   ├── components/           # Componentes
│   │   ├── ui/              # UI reutilizables
│   │   ├── boost/           # Sistema de boosts
│   │   ├── filters/         # Filtros
│   │   ├── vehicles/        # Componentes de vehículos
│   │   └── ...
│   ├── context/             # React Context
│   ├── hooks/               # Custom Hooks
│   ├── lib/                 # Utilidades
│   │   ├── marketplaces/    # Sistema de sincronización
│   │   └── ...
│   └── types/               # TypeScript types
├── supabase/
│   └── migrations/          # Migraciones de BD
├── .env.example
├── next.config.ts
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

---

## 💻 Desarrollo

### Comandos
```bash
npm run dev          # Desarrollo
npm run build        # Build producción
npm run start        # Servidor producción
npm run lint         # Linting
npx tsc --noEmit    # Type checking
```

### Convenciones

#### Archivos
- Componentes: `PascalCase.tsx`
- Utilidades: `camelCase.ts`
- Páginas: `page.tsx`, `layout.tsx`

#### Componentes
```tsx
"use client"; // Solo si es necesario

interface Props {
  // Props tipadas
}

export default function Component({ }: Props) {
  return (
    /* JSX */
  );
}
```

#### Server Actions
```tsx
'use server';

export async function myAction(data: FormData) {
  // Lógica server-side
}
```

### Plan de Trabajo y Buenas Prácticas

1. **Respaldo y limpieza**
   - Backup y control de versiones en GitHub
   - Eliminar código y dependencias obsoletas

2. **Migración a Supabase**
   - Crear y versionar migraciones
   - Separar entornos dev/prod
   - Mantener seeds solo en local

3. **Desarrollo desacoplado**
   - Centralizar lógica de usuario y API
   - Usar hooks y contextos únicos

4. **Documentación y control de cambios**
   - Actualizar README y comentarios en cada avance
   - Documentar decisiones y cambios de arquitectura

5. **Escalabilidad**
   - Mantener el frontend desacoplado
   - Preparar para migrar a VPS propio cuando sea necesario

---

## 🚢 Despliegue

### Vercel (Recomendado)

1. Conectar repo en [vercel.com](https://vercel.com)
2. Configurar variables de entorno
3. Deploy automático en cada push

### Build Manual
```bash
npm run build
npm start
```

### Configuración de Email en Producción
Cuando despliegues la aplicación, **recuerda cambiar** el parámetro `redirect_to` a:
`https://tudominio.com/auth/confirm`

---

## 🔍 Auditoría de Producción

### Estado General: ✅ LISTO PARA PRODUCCIÓN CON MEJORAS MENORES

### Puntos Fuertes ✅
- Sistema de autenticación robusto y funcional
- Avatar/cover correctamente migrado a `avatar_url`/`cover_url`
- Sistema de impulsos (boost) implementado con terminología consistente (⚡)
- Filtros avanzados con sincronización de URL
- Dark mode implementado ampliamente
- Validaciones de formularios presentes
- Estados de carga para evitar flash de mensajes

### Áreas de Mejora Identificadas ⚠️
- Falta implementar RLS policies en Supabase (ya implementado)
- OAuth (Google/Apple) no funcional (botones presentes pero sin implementación)
- Validación de RUT chileno mejorable
- Accesibilidad (aria-labels, lectores de pantalla)
- Sistema de pagos para slots de impulso no implementado

### Sistema de Autenticación ✅
- **Registro de usuarios:** Funcional con validación de email/contraseña
- **Inicio de sesión:** Funcional con mensajes de error claros
- **Recuperación de contraseña:** Flujo completo con `/forgot` y `/reset`
- **Persistencia de sesión:** `persistSession: true`, `autoRefreshToken: true`
- **Validaciones:** Contraseñas coincidentes, campos obligatorios
- **Feedback visual:** Toasts para errores y éxito

---

## 📧 Configuración de Email

### Estado Actual
- ✅ **Código frontend**: Ya implementado correctamente en `PersonalDataForm.tsx`
- ✅ **Variables de entorno**: Configuradas en `.env.local`
- ❌ **Problema**: Supabase no tiene SMTP configurado → no envía correos

### Funcionamiento del Flujo
1. **Registro de usuario (`signUp`)**: Supabase envía automáticamente un correo de verificación
2. **Cambio de correo (`updateUser`)**: Requiere confirmación del nuevo email

### Configuración SMTP (Obligatorio)

#### Opción Recomendada: Gmail (Desarrollo Rápido)
1. Ve a: `https://app.supabase.com/project/[tu-project]/settings/auth`
2. Scroll hasta "SMTP Settings"
3. Activa "Enable Custom SMTP"
4. Configura:
   ```
   Host: smtp.gmail.com
   Port: 587
   User: tu-email@gmail.com
   Pass: tu-app-password-de-16-caracteres
   ```

### Email Templates
Personalizar en Supabase Dashboard:
- **Confirm signup**: Mensaje de bienvenida
- **Email change**: Confirmación de cambio de correo
- **Invite**: Invitaciones de usuario

### Testing del Flujo
1. Registrar usuario → Recibir email de confirmación
2. Cambiar email en perfil → Recibir email de confirmación
3. Verificar redirección automática después de confirmar

---

## 🔄 Sincronización con Marketplaces

Este sistema permite sincronizar automáticamente las publicaciones de SimpleAutos con otros marketplaces chilenos.

### ⚠️ Importante: Limitaciones de Facebook Marketplace

**Facebook Marketplace tiene restricciones técnicas significativas:**

#### ❌ Lo que NO es posible:
- **Publicación automática**: La API oficial de Facebook NO permite crear publicaciones en Marketplace
- **Actualización automática**: No se pueden modificar publicaciones existentes vía API
- **Eliminación automática**: No se pueden eliminar publicaciones vía API

#### ✅ Lo que SÍ es posible (con limitaciones):
- **Lectura de datos**: Ver estadísticas de publicaciones existentes
- **Integración manual**: Los usuarios deben subir manualmente a Facebook
- **Monitoreo**: Ver vistas y contactos de publicaciones

### Arquitectura

#### Componentes Principales
1. **MarketplaceAdapter**: Clase abstracta base para adaptadores de marketplaces
2. **MarketplaceRegistry**: Registro de adaptadores disponibles
3. **MarketplaceSyncService**: Servicio principal de sincronización
4. **Adaptadores Específicos**: ChileautosAdapter, YapoAdapter, etc.

### Adaptadores Disponibles

#### ChileautosAdapter
- **Autenticación**: API Key + Secret
- **Mapeo**: Convierte datos a formato Chileautos
- **Funciones**: sync, update, delete, getStatus

#### FacebookAdapter ⚠️
- **Estado**: **NO FUNCIONAL** para sincronización automática
- **Autenticación**: Facebook Graph API (requiere aprobación especial)
- **Limitaciones**: Solo lectura, no escritura

### Configuración en Producción

#### Variables de Entorno
```env
# Chileautos
CHILEAUTOS_API_KEY=tu_api_key_aqui
CHILEAUTOS_API_SECRET=tu_api_secret_aqui

# Yapo
YAPO_USERNAME=tu_usuario
YAPO_PASSWORD=tu_password
```

#### Base de Datos
Las configuraciones de usuario se almacenan en la tabla `user_marketplace_configs`.

### Próximas Funcionalidades
- [ ] Más marketplaces (MercadoLibre, Facebook Marketplace)
- [ ] Sincronización bidireccional
- [ ] Dashboard de rendimiento por marketplace
- [ ] Webhooks para actualizaciones en tiempo real
- [ ] API para integraciones de terceros

---

## 🎨 Sistema de Boosts

### Slots Disponibles
- `home_main` - Slider home (5 vehículos)
- `venta_tab` - Tab ventas (4 vehículos)
- `arriendo_tab` - Tab arriendos (4 vehículos)
- `subasta_tab` - Tab subastas (4 vehículos)
- `user_page` - Perfil usuario (5 vehículos)

### Flujo
1. Usuario selecciona vehículo en panel
2. Elige plan de boost (1, 7, 15, 30 días)
3. Selecciona slots
4. Sistema activa boost con badge ⚡

### Implementación
- Server Actions con `service_role_key`
- Validación de ownership
- Queries optimizadas con índices

---

## 📈 Métricas

### Por Vehículo
- `views_count` - Vistas
- `clicks_count` - Clics
- `favorites_count` - Favoritos

### Incrementar Métrica
```sql
SELECT increment_vehicle_metric('vehicle_id', 'metric_name');
```

---

## 🔒 Seguridad

- ✅ RLS policies en todas las tablas
- ✅ Validación frontend + backend
- ✅ Sanitización de inputs
- ✅ `.env.local` NO commitear
- ✅ `service_role_key` solo en Server Actions

---

## 🤝 Contribución

1. Seguir convenciones de código
2. PRs pequeños y enfocados
3. Sin console.logs innecesarios
4. TypeScript sin errores
5. Actualizar README si es necesario

---

## 📝 Notas Adicionales

### Filtros Avanzados
Sistema completo con cascada:
- **Ubicación**: Región → Comuna
- **Vehículo**: Marca → Modelo
- Botón "Limpiar filtros" para resetear

### Componentes UI
Componentes reutilizables en `src/components/ui/`:
- `Input` - Campos de texto (pill/rounded, sm/md)
- `Select` - Selectores con opciones
- `Button` - Botones con variantes
- `Badge` - Insignias
- `ContactModal` - Modal genérico para contactar usuarios/vendedores

### Estructura de Componentes
La carpeta `src/components/` está organizada por funcionalidad:

#### Componentes por Carpeta
- `auth/` - Modales de autenticación (login, registro, recuperación)
- `boost/` - Gestión de boosts para vehículos
- `filters/` - Filtros de búsqueda avanzada
- `layout/` - Layout principal (Header, Footer, navegación)
- `panel/` - Panel de administración con subcarpetas por sección
- `perfil/` - Componentes de perfiles de usuario
- `search/` - Componentes de búsqueda
- `slider/` - Sliders/carouseles para destacados
- `ui/` - Componentes reutilizables y modales
- `vehicle-wizard/` - Asistente paso a paso para publicar vehículos
- `vehicles/` - Componentes relacionados con vehículos

#### Cambios Recientes (Octubre 2025)
- ✅ **Limpieza de archivos**: Eliminados archivos vacíos y backups innecesarios
- ✅ **Consolidación de ContactModal**: Unificado en `ui/modal/ContactModal.tsx` con props flexibles para diferentes contextos
- ✅ **Mejora de organización**: Mejor separación de responsabilidades por carpetas

### Temas
Variables CSS en `globals.css` para light/dark mode automático.

### Troubleshooting

#### Publicaciones no aparecen en panel
**Causa:** Problema de autenticación con cookies del servidor en API routes.  
**Solución:** Ahora usa Supabase client-side directamente (sin API route).

#### Error "Could not find 'bio' column"
**Causa:** Frontend usa nombres antiguos en español.  
**Solución:** Ya corregido. La columna correcta es `description`.

#### Error 400 en upsert de perfil
**Causa:** RLS bloquea UPDATE cuando no existe el row.  
**Solución:** Ya corregido. Ahora verifica existencia y hace INSERT o UPDATE explícito.

---

**Versión**: 1.0.0  
**Última actualización**: Octubre 2025  
**Desarrollado para**: SimpleAutos Chile 🇨🇱

---

Para soporte o preguntas, crear un issue en el repositorio.