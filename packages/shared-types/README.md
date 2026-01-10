# @simple/shared-types

Paquete de tipos TypeScript compartidos para el marketplace Simple.

## Descripción

Este paquete contiene todas las definiciones de tipos TypeScript utilizadas en el proyecto Simple, incluyendo:

- **Tipos compartidos**: Interfaces comunes utilizadas por ambas verticales (simpleautos y simplepropiedades)
- **Tipos de vehículos**: Interfaces específicas para la gestión de vehículos
- **Tipos de propiedades**: Interfaces específicas para la gestión de propiedades

## Instalación

```bash
npm install @simple/shared-types
```

## Uso

### Importación de tipos compartidos

```typescript
import { Profile, Company, Region, Commune } from '@simple/shared-types';
```

### Importación de tipos de vehículos

```typescript
import { Vehicle, VehicleDetailed, VehicleFilters } from '@simple/shared-types';
```

### Importación de tipos de propiedades

```typescript
import { Property, PropertyDetailed, PropertyFilters } from '@simple/shared-types';
```

## Estructura de tipos

### Tipos compartidos (`shared.ts`)

- `Profile`: Información de perfil de usuario
- `Company`: Información de empresa
- `Region`: Regiones de Chile
- `Commune`: Comunas de Chile
- `ListingType`: Tipo de publicación (venta, arriendo, etc.)
- `SocialLink`: Enlaces sociales
- `Schedule`: Horarios de atención
- `Review`: Reseñas y calificaciones
- `Message`: Mensajes entre usuarios
- `Notification`: Notificaciones del sistema

### Tipos de vehículos (`vehicles.ts`)

- `Vehicle`: Información completa de vehículo
- `VehicleDetailed`: Vista detallada con relaciones
- `VehicleFilters`: Filtros de búsqueda
- `VehicleWizardState`: Estado del wizard de creación
- `AuctionBid`: Ofertas de subasta

### Tipos de propiedades (`properties.ts`)

- `Property`: Información completa de propiedad
- `PropertyDetailed`: Vista detallada con relaciones
- `PropertyFilters`: Filtros de búsqueda
- `PropertyWizardState`: Estado del wizard de creación
- `AuctionBid`: Ofertas de subasta

## Desarrollo

### Compilación

```bash
npm run build
```

### Desarrollo con watch

```bash
npm run dev
```

## Contribución

Los tipos se generan automáticamente desde las migraciones de base de datos. Si necesitas agregar nuevos tipos:

1. Actualiza las migraciones de Supabase
2. Regenera los tipos desde la base de datos
3. Actualiza este paquete si es necesario

## Licencia

MIT