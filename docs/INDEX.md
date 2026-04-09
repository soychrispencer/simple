# Documentation Structure 📚

**Actualizado:** 9 de abril de 2026

---

## 📂 Estructura de Documentación

```
docs/
├── ✅ PROJECT_STATUS.md
│   └── Estado actual, problemas identificados, próximos pasos
│   └── Destinatarios: Project Managers, Developers
│
├── ✅ DATABASE_SETUP.md
│   └── Plan paso a paso para implementar Drizzle + PostgreSQL
│   └── Schemas, migrations, environment setup
│   └── Destinatarios: Backend Developers, DevOps
│
├── ✅ ARCHITECTURE.md
│   └── Diagramas de arquitectura, data flows, layers
│   └── Seguridad, performance, deployment
│   └── Destinatarios: Tech Leads, Architects
│
├── ✅ DEVELOPMENT.md
│   └── Guía práctica de desarrollo
│   └── Scripts, creación de rutas, endpoints, troubleshooting
│   └── Destinatarios: Frontend/Backend Developers
│
├── ✅ AUDIT_REGISTRO_COMPLETO.md
│   └── Auditoría de seguridad detallada
│   └── Hallazgos críticos, planes de remediación
│   └── Destinatarios: Security Team, CTO
│
├── ✅ STORAGE_SETUP.md
│   └── Configuración de Backblaze B2 para almacenamiento
│   └── Costos, troubleshooting, variables de entorno
│
├── ✅ COOLIFY_DEPLOYMENT.md
│   └── Guía de deployment en Coolify
│   └── Configuración de servicios, variables de entorno
│
├── ✅ GOOGLE_OAUTH_GUIA.md
│   └── Configuración de Google OAuth
│   └── Credenciales, redirect URIs, troubleshooting
│
├── ✅ SIMPLEAGENDA_DEVELOPMENT.md
│   └── Guía específica para desarrollo de SimpleAgenda
│   └── Configuración de cron jobs, variables de entorno
│
├── ✅ INSTAGRAM_INTELLIGENCE_IMPLEMENTATION.md
│   └── Implementación de templates inteligentes para Instagram
│   └── Arquitectura de templates modernos
│
├── ✅ SIMPLEAUTOS_ARQUITECTURA_COMPLETA.md
│   └── Arquitectura detallada del flujo de publicaciones
│   └── Componentes, hooks, data flow
│
├── ✅ login_analysis.md
│   └── Análisis del flujo de login y duplicaciones identificadas
│   └── Recomendaciones de refactorización
│
├── ✅ IMPLEMENTATION_SUMMARY.md
│   └── Resumen de implementación de almacenamiento B2
│
├── ✅ INTEGRATION_ROADMAP.md
│   └── Roadmap de integración de almacenamiento
│
└── ✅ INDEX.md
    └── Este archivo - índice y guía de navegación
```

---

## 🗂️ Archivos Eliminados en Limpieza (Abril 2026)

### ❌ Eliminados de la raíz del repo:
```
build_debug.txt              ← Archivo temporal de debug
diff_status.txt              ← Archivo temporal de diff
files_in_head.txt            ← Archivo temporal de git
git-show-index.txt           ← Archivo temporal de git
git-show.txt                 ← Archivo temporal de git
test-payload.json            ← Archivo de prueba
test-templates.js            ← Archivo de prueba de templates
fix-instagram-migration.sql  ← Archivo SQL de migración (ya aplicado)
```

### ❌ Eliminados de /docs:
```
auditoria-paridad-original-vs-v2.md  ← Obsoleto (ya no hay SimpleV2)
REVISION_FLUJO.md                    ← Análisis temporal completado
```

**Razón:** Este es el único repositorio actualizado. No existe SimpleV2 ni repositorios de prueba.

---

## 📖 Cómo Usar la Documentación

### 🟢 ¿Nuevo al proyecto?
1. Lee [README.md](../README.md) - Visión general
2. Lee [DEVELOPMENT.md](./DEVELOPMENT.md) - Quick start
3. Sigue [DEVELOPMENT.md → Quick Start](./DEVELOPMENT.md#quick-start)

### 🔧 ¿Implementando Drizzle + PostgreSQL?
1. Lee [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Completo
2. Sigue paso a paso: Instalación local → Schemas → Migrations
3. Consulta [ARCHITECTURE.md](./ARCHITECTURE.md) - Data Layer

### 🏗️ ¿Diseñando nueva feature?
1. Lee [ARCHITECTURE.md](./ARCHITECTURE.md) - Estructura general
2. Lee [DEVELOPMENT.md](./DEVELOPMENT.md) - Ejemplos prácticos
3. Referencia [SIMPLEAUTOS_ARQUITECTURA_COMPLETA.md](./SIMPLEAUTOS_ARQUITECTURA_COMPLETA.md) para flujos específicos

### 🚨 ¿Problemas de seguridad?
1. Consulta [AUDIT_REGISTRO_COMPLETO.md](./AUDIT_REGISTRO_COMPLETO.md)
2. Revisa el checklist de producción
3. Implementa fixes antes de deploy

### 📊 ¿Estado del proyecto?
1. Lee [PROJECT_STATUS.md](./PROJECT_STATUS.md)
2. Revisa checklist de próximas prioridades
3. Consulta timeframe realista

### 🚀 ¿Deploy a producción?
1. Lee [COOLIFY_DEPLOYMENT.md](./COOLIFY_DEPLOYMENT.md)
2. Verifica variables de entorno en [STORAGE_SETUP.md](./STORAGE_SETUP.md)
3. Consulta [DATABASE_SETUP.md](./DATABASE_SETUP.md) para migraciones

---

## 🔄 Flujo de Documentación por Rol

### 👨‍💻 Frontend Developer
```
README.md
  ↓
DEVELOPMENT.md (Frontend section)
  ↓
ARCHITECTURE.md (Frontend layer)
  ↓
Específico: componentes, rutas, state management
```

### 👨‍💻 Backend Developer
```
README.md
  ↓
DATABASE_SETUP.md
  ↓
DEVELOPMENT.md (API endpoints)
  ↓
Específico: queries, migrations, business logic
```

### 🔒 Security/DevOps
```
PROJECT_STATUS.md (Security section)
  ↓
AUDIT_REGISTRO_COMPLETO.md
  ↓
ARCHITECTURE.md (Security layers)
  ↓
DATABASE_SETUP.md (Production DB)
  ↓
COOLIFY_DEPLOYMENT.md
```

### 👔 Project Manager / Product Owner
```
README.md
  ↓
PROJECT_STATUS.md
  ↓
Roadmap section
```

---

## 📝 Maintaining Documentation

### Cuándo actualizar docs:
- [ ] Nuevo feature implementado
- [ ] Arquitectura cambió
- [ ] Encontraste un bug o workaround
- [ ] Completaste un sprint
- [ ] Se eliminan archivos obsoletos

### Checklist actualización:
- [ ] Actualizar PROJECT_STATUS.md si hay cambios de estado
- [ ] Actualizar ARCHITECTURE.md si cambió la arquitectura
- [ ] Actualizar DEVELOPMENT.md con nuevos snippets/workflows
- [ ] Actualizar README.md con nuevas features
- [ ] Actualizar INDEX.md si se agregan/eliminan archivos
- [ ] Versionar en git: `git commit -m "docs: actualización de X"`

---

## 🚀 Quick Links

| Necesito... | Mirar aquí |
|------------|-----------|
| Entender qué es este proyecto | [README.md](../README.md) |
| Ver estado actual del proyecto | [PROJECT_STATUS.md](./PROJECT_STATUS.md) |
| Instalar PostgreSQL y Drizzle | [DATABASE_SETUP.md](./DATABASE_SETUP.md) |
| Entender la arquitectura | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Comenzar a desarrollar | [DEVELOPMENT.md](./DEVELOPMENT.md) |
| Información de seguridad | [AUDIT_REGISTRO_COMPLETO.md](./AUDIT_REGISTRO_COMPLETO.md) |
| Configurar deploy en Coolify | [COOLIFY_DEPLOYMENT.md](./COOLIFY_DEPLOYMENT.md) |
| Configurar almacenamiento B2 | [STORAGE_SETUP.md](./STORAGE_SETUP.md) |
| Desarrollar SimpleAgenda | [SIMPLEAGENDA_DEVELOPMENT.md](./SIMPLEAGENDA_DEVELOPMENT.md) |
| Implementar Instagram | [INSTAGRAM_INTELLIGENCE_IMPLEMENTATION.md](./INSTAGRAM_INTELLIGENCE_IMPLEMENTATION.md) |

---

**Nota:** Este es el repositorio único y actualizado. No existe SimpleV2 ni otros repositorios de prueba.
