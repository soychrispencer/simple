# SimpleAgenda - Guía de Desarrollo

## 🎯 **Estado Actual**

SimpleAgenda está en **desarrollo local** y **no está en producción**. Esto es importante porque:

1. **Base de datos**: SimpleAgenda comparte la BD de producción con las otras verticales
2. **Cron jobs**: Los reminders de SimpleAgenda están activos por defecto
3. **Columnas nuevas**: SimpleAgenda usa campos que no existen en la BD de producción

## ⚠️ **Problema Actual**

Los cron jobs de SimpleAgenda intentan acceder a columnas que no existen en producción:
```
column agenda_professional_profiles.encuadre does not exist
```

## ✅ **Solución Implementada**

### **Control de Cron Jobs**

Se ha implementado un control para desactivar los cron jobs de SimpleAgenda:

```typescript
// Solo activar cron jobs de SimpleAgenda en producción o cuando esté configurado
const isProduction = process.env.NODE_ENV === 'production';
const agendaEnabled = process.env.AGENDA_CRON_ENABLED === 'true';

if (!isProduction && !agendaEnabled) {
    console.log('[agenda] cron jobs desactivados');
    return;
}
```

### **Comportamiento por Defecto**

- **Producción**: ✅ Cron jobs activos automáticamente
- **Desarrollo**: ❌ Cron jobs desactivados (a menos que `AGENDA_CRON_ENABLED=true`)

## 🛠️ **Para Desarrollo Local**

Si necesitas activar los cron jobs de SimpleAgenda en desarrollo:

### **Opción 1: Variable de Entorno**

En tu `.env` local:
```env
AGENDA_CRON_ENABLED=true
```

### **Opción 2: Modo Producción**

```env
NODE_ENV=production
```

### **Opción 3: Aplicar Migración Manual**

Si quieres probar SimpleAgenda con la BD de producción:

```sql
-- Aplicar migración de SimpleAgenda
ALTER TABLE agenda_professional_profiles
  ADD COLUMN IF NOT EXISTS encuadre TEXT,
  ADD COLUMN IF NOT EXISTS requires_advance_payment BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS advance_payment_instructions TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS google_access_token TEXT,
  ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMP;

ALTER TABLE agenda_appointments
  ADD COLUMN IF NOT EXISTS policy_agreed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS policy_agreed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'not_required';
```

## 🚀 **Para Pasar a Producción**

### **1. Preparar Base de Datos**

```bash
# Aplicar migraciones pendientes
pnpm run db:push
```

### **2. Configurar Variables de Entorno**

En Coolify, agregar:
```env
NODE_ENV=production
# AGENDA_CRON_ENABLED no es necesario en producción
```

### **3. Desplegar Vertical**

- Crear servicio en Coolify para SimpleAgenda
- Configurar dominio (agenda.simpleplataforma.app)
- Configurar CORS_ORIGINS
- Probar integración con WhatsApp y Google Calendar

## 📋 **Checklist Antes de Producción**

- [ ] Migraciones de BD aplicadas
- [ ] Variables de entorno configuradas
- [ ] Dominio y SSL configurados
- [ ] WhatsApp Cloud API funcionando
- [ ] Google Calendar OAuth configurado
- [ ] Mercado Pago integrado
- [ ] Tests de end-to-end funcionando

## 🔍 **Monitoreo**

Una vez en producción, monitorear:
- Logs de cron jobs: `[agenda] registering reminder cron jobs...`
- Errores de BD en reminders
- Entrega de WhatsApp
- Sincronización con Google Calendar

---

**Nota**: Mientras SimpleAgenda esté en desarrollo, los cron jobs permanecerán desactivados para evitar errores en producción.
