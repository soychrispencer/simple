# 📚 README - Plan Maestro Ecosistema Simple

**Proyecto:** Ecosistema Simple  
**Autor:** Christian  
**Fecha:** 8 de noviembre de 2025  
**Versión:** 1.0

---

## 🎯 Descripción del Proyecto

**Simple** es un ecosistema unificado de marketplaces verticales con CRM integrado. Cada vertical mantiene su identidad visual única mientras comparte la misma arquitectura, componentes y experiencia de usuario.

### Verticales Iniciales

1. **🚗 SimpleAutos** - Marketplace de vehículos (compra, venta, arriendo, subastas)
2. **🏠 SimplePropiedades** - Marketplace inmobiliario (compra, venta, arriendo)

### Productos Transversales

- **📊 Simple CRM** - Gestión empresarial de leads, clientes y analytics
- **⚙️ Simple Admin** - Panel de administración del ecosistema
- **🔐 Simple Auth** - Sistema de autenticación unificado (SSO)

---

## 🏗️ Arquitectura

### Stack Tecnológico

- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript
- **Estilos:** Tailwind CSS 4
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Pagos:** MercadoPago
- **Monorepo:** Turborepo + PNPM
- **Hosting:** Vercel + Supabase Cloud

### Filosofía de Diseño

Inspirado en Apple: **minimalista, limpio, moderno y consistente**.

- Colores sobrios: negro, blanco, grises
- Modo claro y oscuro perfecto
- Espacios generosos
- Animaciones sutiles
- Color primario diferente por vertical

---

## 📁 Estructura del Proyecto

```
simple/
├── apps/                        # Aplicaciones
│   ├── simpleautos/             # Vertical de vehículos
│   ├── simplepropiedades/       # Vertical inmobiliario
│   ├── crm/                     # CRM empresarial
│   └── admin/                   # Panel admin
│
├── packages/                    # Packages compartidos
│   ├── ui/                      # Design System
│   ├── database/                # Supabase client + queries
│   ├── auth/                    # Autenticación SSO
│   ├── payments/                # MercadoPago integration
│   ├── utils/                   # Utilidades compartidas
│   └── config/                  # Configuración compartida
│
├── supabase/                    # Base de datos y backend
│   ├── migrations/
│   └── functions/
│
├── docs/                        # Documentación adicional
│
└── PLAN_MAESTRO/               # 📌 ESTA CARPETA
    ├── 01-ARQUITECTURA-GENERAL.md
    ├── 02-BASE-DE-DATOS.md
    ├── 03-DESIGN-SYSTEM.md
    ├── 04-PLAN-IMPLEMENTACION.md
    ├── 05-GUIA-DESARROLLO.md
    └── README.md (este archivo)
```

---

## 📖 Documentación

### Orden de Lectura Recomendado

1. **[01-ARQUITECTURA-GENERAL.md](./01-ARQUITECTURA-GENERAL.md)**
   - Visión general del ecosistema
   - Principios de diseño
   - Stack tecnológico
   - Estructura del monorepo
   - Sistema de colores por vertical

2. **[02-BASE-DE-DATOS.md](./02-BASE-DE-DATOS.md)**
   - Diseño completo del esquema
   - Tablas core y por vertical
   - Row Level Security (RLS)
   - Storage buckets
   - Triggers y functions

3. **[03-DESIGN-SYSTEM.md](./03-DESIGN-SYSTEM.md)**
   - Filosofía de diseño Apple-inspired
   - Sistema de colores y tipografía
   - Espaciado y layout
   - Componentes base
   - Componentes compartidos
   - Animaciones

4. **[04-PLAN-IMPLEMENTACION.md](./04-PLAN-IMPLEMENTACION.md)**
   - Fases del proyecto (0 a 4)
   - Cronograma estimado (14-16 semanas)
   - Prioridades por sprint
   - Entregables de cada fase
   - Estructura de apps y packages

5. **[05-GUIA-DESARROLLO.md](./05-GUIA-DESARROLLO.md)**
   - Convenciones de código
   - TypeScript best practices
   - React patterns
   - Git workflow
   - Testing guidelines
   - Seguridad y performance

---

## 🚀 Roadmap de Implementación

### Fase 0: Setup Inicial (1 semana)
- ✅ Crear estructura del monorepo
- ⬜ Configurar Turborepo + PNPM
- ⬜ Conectar Supabase real
- ⬜ Setup CI/CD básico

### Fase 1: Foundation (2-3 semanas)
- ⬜ @simple/ui (Design System completo)
- ⬜ @simple/database (Client + queries)
- ⬜ @simple/auth (SSO)
- ⬜ @simple/payments (MercadoPago)
- ⬜ @simple/utils

### Fase 2: Verticales Core (4-6 semanas)
- ⬜ SimpleAutos MVP (venta, arriendo, subastas)
- ⬜ SimplePropiedades MVP (venta, arriendo)
- ⬜ Componentes compartidos funcionando

### Fase 3: CRM (3-4 semanas)
- ⬜ Dashboard analytics
- ⬜ Gestión de leads
- ⬜ Sistema de suscripciones

### Fase 4: Optimización (ongoing)
- ⬜ Performance
- ⬜ SEO
- ⬜ Testing
- ⬜ Monitoring

**Total estimado: 14-16 semanas para MVP completo**

---

## 🎨 Colores por Vertical

```css
/* SimpleAutos */
--color-primary: #FF3600;  /* Naranja/Rojo vibrante */

/* SimplePropiedades */
--color-primary: #2563eb;  /* Azul confiable */

/* CRM */
--color-primary: #8b5cf6;  /* Morado profesional */

/* Admin */
--color-primary: #059669;  /* Verde corporativo */
```

---

## 🔐 Seguridad y Privacidad

- **Row Level Security (RLS)** habilitado en todas las tablas
- **Variables de entorno** nunca commiteadas
- **Tokens de acceso** encriptados
- **Validación de inputs** con Zod
- **Rate limiting** en APIs críticas
- **CORS** configurado correctamente

---

## 📊 Métricas de Éxito

### Performance
- Lighthouse Score > 90
- First Contentful Paint < 1.5s
- Time to Interactive < 3s

### SEO
- Todas las páginas con metadata
- Sitemap.xml generado automáticamente
- Structured data implementado

### Testing
- Code coverage > 80%
- E2E tests para flujos críticos
- Visual regression tests

### Accesibilidad
- WCAG AA compliance
- Keyboard navigation completa
- Screen reader friendly

---

## 🛠️ Comandos Principales

```bash
# Desarrollo
pnpm dev                 # Ejecutar todas las apps
pnpm dev --filter simpleautos  # Solo simpleautos

# Build
pnpm build               # Build todas las apps
pnpm build --filter crm  # Solo CRM

# Testing
pnpm test                # Ejecutar todos los tests
pnpm test:coverage       # Con coverage

# Linting
pnpm lint                # Lint todo el monorepo
pnpm format              # Formatear con Prettier

# Database
pnpm supabase:gen-types  # Generar tipos de TypeScript
pnpm supabase:migrate    # Aplicar migraciones
```

---

## 👥 Contribución

### Flujo de Trabajo

1. Crear branch desde `develop`
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```

2. Hacer commits siguiendo [Conventional Commits](https://www.conventionalcommits.org/)
   ```bash
   git commit -m "feat(auth): add Google OAuth"
   ```

3. Crear Pull Request hacia `develop`

4. Code review requerido antes de merge

5. Tests y linting deben pasar

### Convenciones

- **Código:** TypeScript estricto, sin `any`
- **Componentes:** PascalCase
- **Funciones:** camelCase
- **Constantes:** UPPER_SNAKE_CASE
- **Archivos:** Seguir estructura del proyecto

---

## 📞 Contacto y Soporte

**Desarrollador Principal:** Christian

**Repositorio:** [GitHub](https://github.com/christian/simple)

**Documentación:** `/PLAN_MAESTRO/`

---

## 📝 Notas Finales

Este plan maestro es un **documento vivo**. Se actualizará conforme el proyecto evolucione.

### Principios Fundamentales

1. **Limpieza y Orden:** Prioridad absoluta
2. **Modularidad:** Todo debe ser reutilizable
3. **Escalabilidad:** Diseñado para crecer
4. **Consistencia:** Misma experiencia en todas las verticales
5. **Modernidad:** Tecnologías actualizadas y estables

### Próximos Pasos

1. ✅ **Leer toda la documentación** del PLAN_MAESTRO
2. ⬜ **Inicializar el monorepo** (Fase 0)
3. ⬜ **Crear base de datos** en Supabase
4. ⬜ **Implementar design system** (@simple/ui)
5. ⬜ **Desarrollar primer vertical** (SimpleAutos)

---

**¡Vamos a construir algo increíble! 🚀**

---

*Última actualización: 8 de noviembre de 2025*
