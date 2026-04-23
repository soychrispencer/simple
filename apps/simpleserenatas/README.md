# SimpleSerenatas

Sistema operativo para músicos de mariachis en Chile.

## 🎯 Descripción

SimpleSerenatas es una plataforma mobile-first diseñada para organizar músicos de mariachis, gestionar serenatas, optimizar rutas y coordinar grupos dinámicos.

## 🚀 Características Implementadas

### Core MVP (100% Completado)
- **✅ Sistema de Autenticación**: Login/registro con email, autenticación de sesión
- **✅ Onboarding**: Flujo de 3 pasos para crear perfil de músico (instrumento, comuna, experiencia)
- **✅ Modo "Disponible Ahora"**: Toggle para indicar disponibilidad inmediata para urgencias
- **✅ Dashboard**: Estadísticas de ganancias, serenatas próximas, toggle de disponibilidad

### Gestión de Serenatas
- **✅ Solicitudes**: Listado de solicitudes urgentes y disponibles
- **✅ Accept/Decline**: Músicos pueden aceptar o rechazar solicitudes
- **✅ Agenda**: Calendario con serenatas asignadas, filtradas por estado
- **✅ Detalle de Serenata**: Ver información completa y marcar como completada

### Grupos y Coordinación
- **✅ Crear Grupos**: Formar grupos dinámicos para cada jornada
- **✅ Agregar Miembros**: Buscar y agregar músicos por instrumento
- **✅ Confirmar Grupos**: Finalizar formación del grupo
- **✅ Matching Automático**: Encontrar músicos disponibles por instrumento y ubicación

### Rutas y Mapas
- **✅ Mapa Interactivo**: Visualización de serenatas en mapa (Leaflet)
- **✅ Optimización de Rutas**: Algoritmo de vecino más cercano
- **✅ Detalle de Ruta**: Ver ruta optimizada con waypoints

### Notificaciones
- **✅ Sistema de Notificaciones**: Tabla y endpoints completos
- **✅ Página de Notificaciones**: Listado, filtros, marcar como leídas
- **✅ Polling**: Actualización cada 30 segundos
- **✅ Service Worker**: Push notifications (base implementada)

### PWA (Progressive Web App)
- **✅ Manifest**: Configuración PWA con display standalone
- **✅ Service Worker**: Caché, offline fallback, sync
- **✅ Responsive**: Mobile-first design
- **✅ Shortcuts**: Accesos directos a funcionalidades principales

### API Backend (Completo)
- **✅ Músicos**: CRUD, disponibilidad, estadísticas
- **✅ Solicitudes**: CRUD, accept/decline, matching
- **✅ Grupos**: CRUD, miembros, confirmación
- **✅ Rutas**: Optimización, waypoints, stats
- **✅ Notificaciones**: CRUD, conteos

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 16 + React 19 + TailwindCSS
- **Backend**: Hono API (integrado en `/api/serenatas`)
- **Base de Datos**: PostgreSQL con Drizzle ORM
- **Mapas**: Leaflet

## 📁 Estructura

```
apps/simpleserenatas/
├── src/
│   ├── app/
│   │   ├── (tabs)/           # Navegación principal con bottom nav
│   │   │   ├── inicio/       # Dashboard del músico
│   │   │   ├── agenda/       # Calendario de serenatas
│   │   │   ├── solicitudes/  # Solicitudes disponibles
│   │   │   ├── grupos/       # Gestión de grupos
│   │   │   └── perfil/       # Perfil del músico
│   │   ├── auth/login/       # Login
│   │   ├── onboarding/       # Flujo de primer uso
│   │   └── page.tsx          # Landing page
│   ├── components/           # Componentes reutilizables
│   └── lib/api.ts            # Cliente API
```

## 🎨 Diseño

- **Mobile-first**: Diseñado para uso en terreno por músicos
- **Navegación inferior**: 5 tabs principales (Inicio, Agenda, Solicitudes, Grupos, Perfil)
- **UX optimizada**: Mínima fricción, tipo app operativa
- **Color principal**: `#E11D48` (Rosa elegante/emocional)

## 🚀 Comandos

```bash
# Desarrollo
npm run dev:serenatas

# Construcción
npm run build:serenatas

# Todos los servicios
npm run dev:all
```

## 🔌 API Endpoints

### Músicos
- `GET /api/serenatas/musicians` - Listar músicos
- `GET /api/serenatas/musicians/:id` - Perfil de músico
- `GET /api/serenatas/musicians/me/profile` - Mi perfil
- `POST /api/serenatas/musicians` - Crear perfil
- `PATCH /api/serenatas/musicians/:id` - Actualizar perfil
- `PATCH /api/serenatas/musicians/:id/availability` - Actualizar disponibilidad
- `GET /api/serenatas/musicians/me/stats` - Estadísticas del músico

### Solicitudes (Serenatas)
- `GET /api/serenatas/requests` - Listar solicitudes
- `GET /api/serenatas/requests/:id` - Detalle de solicitud
- `POST /api/serenatas/requests` - Crear solicitud
- `PATCH /api/serenatas/requests/:id` - Actualizar solicitud
- `POST /api/serenatas/requests/:id/accept` - Aceptar solicitud
- `POST /api/serenatas/requests/:id/decline` - Rechazar solicitud
- `GET /api/serenatas/requests/urgent/list` - Solicitudes urgentes
- `GET /api/serenatas/requests/available/for-musician` - Solicitudes disponibles
- `GET /api/serenatas/requests/my/assigned` - Mis serenatas asignadas
- `GET /api/serenatas/requests/:id/matches` - Matching de músicos

### Grupos
- `GET /api/serenatas/groups` - Listar grupos
- `GET /api/serenatas/groups/:id` - Detalle de grupo
- `POST /api/serenatas/groups` - Crear grupo
- `PATCH /api/serenatas/groups/:id` - Actualizar grupo
- `POST /api/serenatas/groups/:id/members` - Agregar miembro
- `DELETE /api/serenatas/groups/:id/members/:musicianId` - Eliminar miembro
- `POST /api/serenatas/groups/:id/confirm` - Confirmar grupo

### Rutas
- `GET /api/serenatas/routes/:id` - Detalle de ruta
- `GET /api/serenatas/routes/group/:groupId` - Ruta del grupo
- `POST /api/serenatas/routes` - Crear ruta
- `POST /api/serenatas/routes/optimize` - Optimizar ruta
- `POST /api/serenatas/routes/:id/start` - Iniciar ruta
- `POST /api/serenatas/routes/:id/complete` - Completar ruta
- `GET /api/serenatas/routes/:id/stats` - Estadísticas de ruta

### Notificaciones
- `GET /api/serenatas/notifications` - Listar notificaciones
- `GET /api/serenatas/notifications/unread-count` - Contador sin leer
- `PATCH /api/serenatas/notifications/:id/read` - Marcar como leída
- `POST /api/serenatas/notifications/read-all` - Marcar todas como leídas
- `DELETE /api/serenatas/notifications/:id` - Eliminar notificación

## 📊 Modelos de Datos

### Tablas principales
- `serenata_musicians` - Perfiles de músicos
- `serenata_requests` - Solicitudes de serenatas
- `serenata_groups` - Grupos dinámicos
- `serenata_group_members` - Miembros de grupos
- `serenata_assignments` - Asignaciones de serenatas a grupos
- `serenata_routes` - Rutas optimizadas
- `serenata_notifications` - Notificaciones del sistema
- `serenata_reviews` - Calificaciones y reseñas
- `serenata_availability_slots` - Slots de disponibilidad semanal

## � Cómo Empezar

### 1. Iniciar servicios
```bash
# Terminal 1: Backend
cd services/api
npm run dev

# Terminal 2: Frontend
cd apps/simpleserenatas
npm run dev
```

### 2. Flujo de prueba
1. Registra una cuenta en `http://localhost:3005/auth/registro`
2. Completa el onboarding (instrumento, comuna, experiencia)
3. Activa "Disponible Ahora" desde el dashboard
4. Crea una solicitud de prueba usando la API
5. Acepta la solicitud y forma un grupo
6. Optimiza la ruta desde el mapa
7. Marca la serenata como completada

## 🧪 Testing

```bash
# Ejecutar tests de integración
cd apps/simpleserenatas
bash scripts/test-integration.sh
```

## �📝 Notas

- Puerto de desarrollo: `3005`
- URL local: `http://localhost:3005`
- Requiere backend corriendo en `localhost:4000`
- La base de datos debe tener las migraciones aplicadas

## 🎉 Estado del Proyecto

**MVP COMPLETO** - Todas las funcionalidades core implementadas y funcionales.

Próximas mejoras:
- Integración con WhatsApp para notificaciones
- Sistema de pagos (WebPay/MercadoPago)
- App nativa (React Native/Capacitor)
- Dashboard de administrador
