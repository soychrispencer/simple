# Documentation Structure 📚

**Actualizado:** 9 de marzo de 2026

---

## 📂 Estructura de Documentación Reorganizada

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
├── ❌ (Eliminados - Obsoletos)
│   ├── implementation_plan.md.resolved
│   ├── task.md.resolved
│   ├── walkthrough.md.resolved
│   └── scratchpad_7pezsbxg.md.resolved
│   
└── auditoria-paridad-original-vs-v2.md
    └── Archivos heredados - Mantener para referencia histórica
```

---

## 🗂️ Archivos Temporales (Eliminados de repo)

En `.gitignore`:

```
tmp_brand_lookup.ps1       ← Scripts de testing Excel/PowerShell
tmp_captiva_check.ps1
tmp_catalog_stats.ps1
tmp_categories_exact.ps1
tmp_compare_excel_seed.ps1
tmp_corolla_check.ps1
tmp_debug.txt              ← Archivos de debug HTML
tmp_err.txt
tmp_excel_captiva.ps1
tmp_parse_excel.ps1
tmp_profile_excel.ps1
tmp_special.ps1
tmp_step_commercial.txt    ← Notas de desarrollo temporales
tmp_step_review.txt
tmp_year_patterns.ps1

.logs/                     ← Logs de desarrollo viejos
```

**Acción:** Son archivos temporales de desarrollo. El `.gitignore` los ignora automáticamente.

---

## 📖 Cómo Usar la Documentación

### 🟢 Nuevo al proyecto?
1. Lee [README.md](../README.md) - Visión general
2. Lee [DEVELOPMENT.md](./DEVELOPMENT.md) - Quick start
3. Sigue [DEVELOPMENT.md → Quick Start](./DEVELOPMENT.md#quick-start)

### 🔧 Implementando Drizzle + PostgreSQL?
1. Lee [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Completo
2. Sigue paso a paso: Instalación local → Schemas → Migrations
3. Consulta [ARCHITECTURE.md](./ARCHITECTURE.md) - Data Layer

### 🏗️ Diseñando nueva feature?
1. Lee [ARCHITECTURE.md](./ARCHITECTURE.md) - Estructura general
2. Lee [DEVELOPMENT.md](./DEVELOPMENT.md) - Ejemplos prácticos
3. Referencia [CODE_SNIPPETS.md](./CODE_SNIPPETS.md) (si existe)

### 🚨 ¿Problemas de seguridad?
1. Consulta [AUDIT_REGISTRO_COMPLETO.md](./AUDIT_REGISTRO_COMPLETO.md)
2. Revisa el checklist de producción
3. Implementa fixes antes de deploy

### 📊 ¿Estado del proyecto?
1. Lee [PROJECT_STATUS.md](./PROJECT_STATUS.md)
2. Revisa checklist de próximas prioridades
3. Consulta timeframe realista

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

### Checklist actualización:
- [ ] Actualizar PROJECT_STATUS.md si hay cambios de estado
- [ ] Actualizar ARCHITECTURE.md si cambió la arquitectura
- [ ] Actualizar DEVELOPMENT.md con nuevos snippets/workflows
- [ ] Actualizar README.md con nuevas features
- [ ] Versionar en git: `git commit -m "docs: actualización de X"`

---

## 🚀 Quick Links

| Necesito... | Mirar aquí |
|------------|-----------|
| Entender qué es Simple V2 | [README.md](../README.md) |
| Ver estado actual del proyecto | [PROJECT_STATUS.md](./PROJECT_STATUS.md) |
| Instalar PostgreSQL y Drizzle | [DATABASE_SETUP.md](./DATABASE_SETUP.md) |
| Entender la arquitectura | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Comenzar a desarrollar | [DEVELOPMENT.md](./DEVELOPMENT.md) |
| Información de seguridad | [AUDIT_REGISTRO_COMPLETO.md](./AUDIT_REGISTRO_COMPLETO.md) |
| Auditoría histórica vs Simple v1 | [auditoria-paridad-original-vs-v2.md](./auditoria-paridad-original-vs-v2.md) |

