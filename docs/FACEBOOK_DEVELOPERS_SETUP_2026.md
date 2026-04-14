# Guía de Configuración de Meta Developers para SimpleAgenda (2026)

Esta guía explica cómo configurar WhatsApp Business Platform para SimpleAgenda en 2026 usando el flujo actual de **https://developers.facebook.com**.

## ⚠️ Cambios Importantes de Meta en 2026

Meta ha introducido cambios significativos en WhatsApp Business Platform durante 2026:

### 1. Portfolio Pacing (Enero-Febrero 2026)
- Meta ahora envía mensajes en batches y monitorea feedback antes de liberar el siguiente batch
- Afecta a negocios nuevos (<500K mensajes/año) o con señales sospechosas
- Si se detectan señales de contenido dañino o violaciones, los mensajes restantes pueden no enviarse
- **Impacto**: "Tener un límite alto de mensajería no garantiza entrega inmediata"

### 2. Messaging Limits (Q1-Q2 2026)
- Se eliminan los tiers de 2K y 10K mensajes diarios
- Los negocios verificados pasan directamente a 100K mensajes diarios
- **Impacto**: Escalado más rápido de campañas, pero el pacing es el nuevo límite de seguridad

### 3. WhatsApp Usernames + BSUID (Junio-H2 2026)
- WhatsApp lanzará usernames para mejorar la privacidad
- Se introducirá BSUID (Business-Scoped User ID) como nuevo identificador
- Los números de teléfono no desaparecerán pero se necesitará almacenar BSUID
- **Impacto**: La base de datos debe prepararse para almacenar BSUID junto con el número de teléfono

### 4. Graph API v21.0
- La versión actual estable de Graph API es v21.0 (actualizado de v19.0)
- SimpleAgenda usa v21.0 para compatibilidad con 2026

## Índice
1. [Prerrequisitos](#prerrequisitos)
2. [Flujo de Configuración 2026](#flujo-de-configuración-2026)
3. [Configuración de Templates](#configuración-de-templates)
4. [Configurar Variables de Entorno](#configurar-variables-de-entorno)
5. [Verificación y Testing](#verificación-y-testing)
6. [Preparación para BSUID](#preparación-para-bsuid)

---

## Prerrequisitos

- Cuenta de Facebook activa
- Número de teléfono para WhatsApp Business (no debe estar registrado en WhatsApp personal)
- Documentos de verificación del negocio (licencia, factura, etc.)
- Sitio web del negocio (https://simpleagenda.app)

---

## Flujo de Configuración 2026

El flujo actual de Meta para configurar WhatsApp Business Platform se hace completamente desde **https://developers.facebook.com**.

### Paso 1: Crear Meta Business Account y Verificar

1. Ve a [https://business.facebook.com](https://business.facebook.com)
2. Inicia sesión con tu cuenta de Facebook
3. Crea un Meta Business Account si no tienes uno:
   - Nombre legal del negocio (debe coincidir con documentos oficiales)
   - Dirección del negocio y número de teléfono
   - URL del sitio web
   - ID fiscal o número de registro del negocio
4. **Business Verification** (OBLIGATORIO para enviar mensajes):
   - Ve a "Business Settings" → "Business Verification"
   - Sube documentos: licencia de negocio, factura de servicios, certificado fiscal
   - La verificación toma 2-5 días hábiles
   - **NO puedes enviar mensajes hasta que la verificación sea aprobada**

### Paso 2: Configurar Meta Developer Account

1. Ve a [https://developers.facebook.com](https://developers.facebook.com)
2. Regístrate como desarrollador usando la misma cuenta de tu Meta Business Account
3. Acepta los términos de servicio de desarrollador
4. Completa cualquier verificación de identidad solicitada
5. Este proceso toma minutos y es rápido

### Paso 3: Crear WhatsApp Business App en Meta Developer Dashboard

1. En el dashboard de Meta Developers, haz clic en "Create App"
2. Selecciona "Business" como tipo de app
3. Nombre de la app: "SimpleAgenda WhatsApp"
4. Asocia la app con tu Meta Business Account verificado
5. Haz clic en "Create App"

### Paso 4: Agregar Producto WhatsApp

1. En el dashboard de la app, busca la sección "Products"
2. Haz clic en "Set Up" en la tarjeta de producto "WhatsApp"
3. Acepta los términos y condiciones de WhatsApp Business Platform
4. Esto provisiona un número de teléfono de prueba con mensajes gratuitos limitados para desarrollo

### Paso 5: Agregar Número de WhatsApp

1. En la sección WhatsApp de tu app, ve a "Phone Numbers"
2. Haz clic en "Add Phone Number"
3. **REQUISITO CRÍTICO**: El número no debe estar registrado en ninguna cuenta de WhatsApp (personal o Business App)
   - Si está registrado, primero debes eliminar la cuenta de WhatsApp asociada
   - Puedes usar línea fija, móvil o número gratuito
4. Ingresa tu número de teléfono de negocio

### Paso 6: Verificar el Número de Teléfono

1. Meta envía un código de verificación de 6 dígitos
2. Elige recibirlo por SMS o llamada de voz
3. Ingresa el código en el dashboard de desarrolladores
4. Una vez verificado, el número está registrado como WhatsApp Business API number
5. **IMPORTANTE**: El número ya no puede usarse con WhatsApp personal o Business App

### Paso 7: Generar Access Token Permanente

El token temporal que Meta proporciona expira en 24 horas. Para producción necesitas un token permanente:

1. Ve a tu Meta Business Account → "Business Settings" → "System Users"
2. Haz clic en "Add" → "Create a System User"
3. Nombre: "SimpleAgenda API"
4. Rol: "Admin" (recomendado)
5. Haz clic en "Create"

### Paso 8: Asignar la App al System User

1. En Business Settings, ve a "Accounts" → "Apps"
2. Selecciona tu app "SimpleAgenda WhatsApp"
3. Haz clic en "Add People"
4. Selecciona el System User "SimpleAgenda API"
5. Asigna el rol "Admin"

### Paso 9: Generar el Token

1. Ve a la página del System User "SimpleAgenda API"
2. Haz clic en "Generate Token"
3. Selecciona la app "SimpleAgenda WhatsApp"
4. Selecciona los permisos necesarios:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. Haz clic en "Generate Token"
6. **COPIA Y GUARDA EL TOKEN** - no se volverá a mostrar
7. Este token no expira a menos que sea revocado

### Paso 10: Obtener Phone Number ID

1. En el dashboard de tu app en developers.facebook.com
2. Ve a la sección WhatsApp → "Phone Numbers"
3. Verás tu número agregado
4. Haz clic en el número para ver el **Phone Number ID** (formato: 982048811666705)

**El Phone Number ID para producción es**: `982048811666705`

---

## Configuración de Templates

Los templates de WhatsApp deben aprobarse en Meta Developers antes de usarlos. SimpleAgenda usa los siguientes templates:

### Template: simpleagenda_confirmacion

**Propósito**: Confirmación de cita al paciente (incluye enlace de Google Meet)

**Configuración**:
- Nombre: `simpleagenda_confirmacion`
- Categoría: `appointment_update`
- Idioma: `es` (Español)

**Body** (6 parámetros):
```
Hola {{1}}, tu cita con {{2}} está confirmada.

📅 Fecha: {{3}}
⏰ Hora: {{4}}

🎥 Enlace de videollamada: {{6}}

Para cancelar, usa este enlace: {{5}}

SimpleAgenda
```

**Parámetros**:
1. `{{1}}` - Nombre del paciente (tipo: text)
2. `{{2}}` - Nombre del profesional (tipo: text)
3. `{{3}}` - Fecha (tipo: text)
4. `{{4}}` - Hora (tipo: text)
5. `{{5}}` - URL de cancelación (tipo: text)
6. `{{6}}` - URL de Google Meet (tipo: text) - **NUEVO en 2026**

**Botones** (opcional):
- Botón rápido: "Ver cita" (URL: {{5}})

**IMPORTANTE**: Si ya tienes este template creado, necesitas actualizarlo para incluir el 6to parámetro (`{{6}}` para el enlace de Google Meet). Ver la sección "Actualizar Template Existente" abajo.

---

### Template: simpleagenda_recordatorio_24h

**Propósito**: Recordatorio 24 horas antes de la cita

**Configuración**:
- Nombre: `simpleagenda_recordatorio_24h`
- Categoría: `appointment_reminder`
- Idioma: `es`

**Body** (4 parámetros):
```
Hola {{1}}, recordatorio de tu cita mañana con {{2}} a las {{3}}.

⚠️ Tienes hasta {{4}} horas antes para cancelar sin costo.

SimpleAgenda
```

**Parámetros**:
1. `{{1}}` - Nombre del paciente
2. `{{2}}` - Nombre del profesional
3. `{{3}}` - Hora
4. `{{4}}` - Horas de cancelación

---

### Template: simpleagenda_recordatorio_30min

**Propósito**: Recordatorio 30 minutos antes de la cita

**Configuración**:
- Nombre: `simpleagenda_recordatorio_30min`
- Categoría: `appointment_reminder`
- Idioma: `es`

**Body** (3 parámetros):
```
Hola {{1}}, tu cita con {{2}} es en 30 minutos ({{3}}).

🎥 Enlace de videollamada: {{6}}

SimpleAgenda
```

**Parámetros**:
1. `{{1}}` - Nombre del paciente
2. `{{2}}` - Nombre del profesional
3. `{{3}}` - Hora
4. `{{6}}` - URL de Google Meet (opcional)

---

### Template: simpleagenda_cancelacion

**Propósito**: Confirmación de cancelación de cita

**Configuración**:
- Nombre: `simpleagenda_cancelacion`
- Categoría: `appointment_update`
- Idioma: `es`

**Body** (4 parámetros):
```
Hola {{1}}, tu cita con {{2}} del {{3}} a las {{4}} ha sido cancelada.

SimpleAgenda
```

**Parámetros**:
1. `{{1}}` - Nombre del paciente
2. `{{2}}` - Nombre del profesional
3. `{{3}}` - Fecha
4. `{{4}}` - Hora

---

### Template: simpleagenda_alerta_profesional

**Propósito**: Alerta al profesional cuando se agenda una nueva cita

**Configuración**:
- Nombre: `simpleagenda_alerta_profesional`
- Categoría: `alert_update`
- Idioma: `es`

**Body** (4 parámetros):
```
Hola {{1}}, tienes una nueva cita agendada:

👤 Paciente: {{2}}
📅 Fecha: {{3}}
⏰ Hora: {{4}}

SimpleAgenda
```

**Parámetros**:
1. `{{1}}` - Nombre del profesional
2. `{{2}}` - Nombre del paciente
3. `{{3}}` - Fecha
4. `{{4}}` - Hora

---

### Cómo Crear y Aprobar Templates en Meta Developers

1. Ve a [https://developers.facebook.com](https://developers.facebook.com)
2. Selecciona tu app "SimpleAgenda WhatsApp"
3. En el menú lateral, ve a "WhatsApp" → "Message Templates"
4. Haz clic en "Create a new message template"
5. Completa la información:
   - Nombre: (usar los nombres especificados arriba)
   - Categoría: (según el template)
   - Idioma: Español (es)
6. Escribe el contenido del body
7. Agrega los parámetros usando `{{1}}`, `{{2}}`, etc.
8. Haz clic en "Submit for approval"
9. Espera la aprobación (puede tomar de minutos a horas)

**Nota importante**: Para 2026, Meta revisa los templates más estrictamente. Asegúrate de:
- No usar lenguaje promocional
- Incluir branding claro (SimpleAgenda)
- Usar categorías correctas
- No incluir información de contacto directo en el template

---

### Cómo Actualizar un Template Existente

Si ya tienes el template `simpleagenda_confirmacion` creado sin el 6to parámetro (meetingUrl), necesitas actualizarlo:

1. Ve a [https://developers.facebook.com](https://developers.facebook.com)
2. Selecciona tu app "SimpleAgenda WhatsApp"
3. En el menú lateral, ve a "WhatsApp" → "Message Templates"
4. Busca el template `simpleagenda_confirmacion`
5. Haz clic en el template para ver los detalles
6. Haz clic en "Edit" (Editar) o "Create variation" (Crear variación)
7. Agrega el 6to parámetro `{{6}}` en el texto del body donde quieres que aparezca el enlace de Google Meet
8. Haz clic en "Save" y luego "Submit for approval"
9. Espera la aprobación de la actualización

**Nota**: Meta puede requerir re-aprobación completa del template si el cambio es significativo. Ten en cuenta que durante el proceso de aprobación, el template original seguirá funcionando.

---

## Configurar Variables de Entorno

### Variables Requeridas

Actualiza las variables de entorno en Coolify (`docs/COOLIFY_DEPLOYMENT.md`):

```bash
# WhatsApp (Meta Business)
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Token generado en el paso anterior
WHATSAPP_PHONE_NUMBER_ID=982048811666705
WHATSAPP_PHONE_NUMBER_ID_AUTOS=982048811666705
WHATSAPP_PHONE_NUMBER_ID_PROPIEDADES=982048811666705
WHATSAPP_PHONE_NUMBER_ID_AGENDA=982048811666705
```

### Pasos para Configurar en Coolify

1. Accede a Coolify: https://142.44.211.73:8000/login
2. Ve al servicio `api`
3. Settings → Environment Variables
4. Busca o agrega la variable `WHATSAPP_ACCESS_TOKEN`
5. Pega el token generado (comienza con `EAA...`)
6. Guarda los cambios
7. Haz **Redeploy** del servicio API

### Verificar Variables Configuradas

Después de configurar, verifica que las variables estén correctas:

```bash
# En el servidor de Coolify (ssh)
ssh root@142.44.211.73
docker exec -it <api-container-id> env | grep WHATSAPP
```

Deberías ver:
- `WHATSAPP_ACCESS_TOKEN=EAA...`
- `WHATSAPP_PHONE_NUMBER_ID_AGENDA=982048811666705`

---

## Verificación y Testing

### 1. Verificar que WhatsApp está Configurado

El código de SimpleAgenda tiene una función `isConfigured()` que verifica que:
- `WHATSAPP_ACCESS_TOKEN` esté definido
- `WHATSAPP_PHONE_NUMBER_ID_AGENDA` esté definido

Si no están configurados, las llamadas a WhatsApp se ignoran silenciosamente (no se envían).

### 2. Enviar Mensaje de Prueba

Para verificar que todo funciona, usa el endpoint de prueba:

```bash
curl -X POST https://api.simpleplataforma.app/api/agenda/test-whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+56912345678",
    "professionalName": "Dr. Test"
  }'
```

Este endpoint usa el template `simpleagenda_recordatorio_24h` con datos de prueba.

### 3. Verificar Logs del API

Si el mensaje no llega, verifica los logs del API:

```bash
# En Coolify
ssh root@142.44.211.73
docker logs -f <api-container-id>
```

Busca mensajes como:
- `[whatsapp] Template "simpleagenda_confirmacion" failed:` - Error de envío
- `[agenda] Failed to send WhatsApp confirmation to` - Error en la llamada
- `[whatsapp] Invalid phone number:` - Número inválido

### 4. Verificar en Meta Developers

1. Ve a [https://developers.facebook.com](https://developers.facebook.com)
2. Selecciona tu app "SimpleAgenda WhatsApp"
3. En el menú lateral, ve a "WhatsApp" → "Message Templates"
4. Verifica que los templates estén en estado "Approved"
5. Ve a "WhatsApp" → "Messaging" → "Message Insights" para ver métricas de envío

### 5. Verificar Normalización de Números

El código normaliza números chilenos a formato E.164 (+56912345678). Asegúrate de que los números en la base de datos estén en formato correcto:

- `56912345678` (sin +)
- `+56912345678` (con +)
- `912345678` (solo móvil, se agrega 56)
- `21234567` (fijo, se agrega 56)

---

## Troubleshooting

### Error: "Template not found"

**Causa**: El template no existe o no está aprobado.

**Solución**:
1. Ve a Meta Developers → WhatsApp → Message Templates
2. Verifica que el template exista y esté en estado "Approved"
3. Si está en "Pending", espera la aprobación
4. Si está "Rejected", lee el motivo de rechazo y corrige el template

### Error: "Invalid phone number"

**Causa**: El número de teléfono no está en formato correcto.

**Solución**:
1. Verifica que el número esté en formato E.164 (+56912345678)
2. El código normaliza automáticamente, pero asegúrate de que el número sea válido
3. Para Chile, los móviles empiezan con 569 (11 dígitos)

### Error: "Access token has expired"

**Causa**: El token de acceso expiró (System User tokens no expiran, pero User tokens sí).

**Solución**:
1. Verifica que estés usando un **System User Token**, no un User Token
2. Si usas User Token, regenera un System User Token siguiendo los pasos de arriba

### Error: "Insufficient permissions"

**Causa**: El token no tiene los permisos necesarios.

**Solución**:
1. Ve a Business Settings → Users → System Users
2. Selecciona tu System User
3. Verifica que tenga los permisos:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
4. Regenera el token si es necesario

### Error: "Rate limit exceeded"

**Causa**: Has enviado demasiados mensajes en un corto período.

**Solución**:
1. Espera unos minutos antes de enviar más mensajes
2. Para producción, considera implementar rate limiting en tu código
3. Los límites de WhatsApp Cloud API son generosos, pero existen

### Error: "Template parameters mismatch"

**Causa**: El código envía un número diferente de parámetros que los que tiene el template.

**Solución**:
1. Verifica que el template en Meta tenga el número correcto de parámetros
2. Para `simpleagenda_confirmacion`: debe tener 6 parámetros (incluyendo meetingUrl)
3. Si el template tiene menos parámetros, actualízalo siguiendo la sección "Actualizar Template Existente"

---

## Checklist Final de Configuración

Antes de ir a producción, verifica:

- [ ] Meta Business Account creado y verificado
- [ ] Meta Developer account configurado
- [ ] WhatsApp Business App creada en developers.facebook.com
- [ ] Producto WhatsApp agregado a la app
- [ ] Número de WhatsApp agregado y verificado
- [ ] System User creado con permisos correctos
- [ ] System User Token generado y guardado
- [ ] Phone Number ID obtenido (982048811666705)
- [ ] Todos los templates creados y aprobados:
  - [ ] `simpleagenda_confirmacion` (6 parámetros, incluye meetingUrl)
  - [ ] `simpleagenda_recordatorio_24h` (4 parámetros)
  - [ ] `simpleagenda_recordatorio_30min` (3 parámetros)
  - [ ] `simpleagenda_cancelacion` (4 parámetros)
  - [ ] `simpleagenda_alerta_profesional` (4 parámetros)
- [ ] Variables de entorno configuradas en Coolify:
  - [ ] `WHATSAPP_ACCESS_TOKEN` configurado
  - [ ] `WHATSAPP_PHONE_NUMBER_ID_AGENDA=982048811666705`
- [ ] API redeployado después de configurar variables
- [ ] Mensaje de prueba enviado exitosamente
- [ ] Logs del API sin errores de WhatsApp

### Requisitos Adicionales 2026

- [ ] Graph API v21.0 configurado (actualizado de v19.0)
- [ ] Business Verification completada (para acceso a 100K mensajes diarios)
- [ ] Preparación para Portfolio Pacing:
  - [ ] No enviar spikes de mensajes masivos sin calentamiento previo
  - [ ] Segmentar audiencias para mejores señales de calidad
  - [ ] Monitorear bloques/reports para evitar throttling
- [ ] Preparación para BSUID (Q2 2026):
  - [ ] Campo `waBsuid` agregado al schema de base de datos
  - [ ] Código actualizado para capturar BSUID de respuestas
  - [ ] Lógica de envío modificada para soportar ambos identificadores

---

## Resumen

Para configurar WhatsApp Business Platform para SimpleAgenda en 2026:

1. **Meta Business Account**: Crea y verifica tu Business en business.facebook.com
2. **Meta Developer Account**: Regístrate en developers.facebook.com
3. **WhatsApp App**: Crea la app en developers.facebook.com y agrega el producto WhatsApp
4. **Número**: Agrega y verifica tu número de WhatsApp Business
5. **System User**: Crea un System User con permisos de WhatsApp
6. **Token**: Genera un System User Token (no expira)
7. **Templates**: Crea y aprueba los 5 templates (incluyendo el 6to parámetro para meetingUrl)
8. **Variables**: Configura `WHATSAPP_ACCESS_TOKEN` en Coolify
9. **Testing**: Envía un mensaje de prueba para verificar

**Documentación oficial de Meta**:
- [WhatsApp Business Platform](https://developers.facebook.com/docs/whatsapp/)
- [Message Templates](https://developers.facebook.com/docs/whatsapp/message-templates/)
- [System Users](https://developers.facebook.com/docs/development/create-an-app/system-users/)

**Contacto de soporte de Meta**:
Si tienes problemas con la aprobación de templates o verificación del Business, contacta a [Meta Business Support](https://www.facebook.com/business/help).

---

## Preparación para BSUID

A partir de junio 2026, WhatsApp introducirá usernames y BSUID (Business-Scoped User ID). SimpleAgenda debe prepararse para este cambio.

### Qué es BSUID

- BSUID es un identificador único por negocio
- El mismo cliente tendrá diferentes BSUID con diferentes negocios
- Es necesario para cuando los usuarios adopten usernames y oculten su número de teléfono

### Cambios Requeridos en SimpleAgenda

#### 1. Schema de Base de Datos

Agregar campo `waBsuid` en la tabla de clientes:

```sql
ALTER TABLE agenda_clients ADD COLUMN wa_bsuid VARCHAR(255);
```

#### 2. Código de WhatsApp

Actualizar `services/api/src/whatsapp.ts` para capturar y almacenar BSUID:

```typescript
// Cuando se recibe un mensaje o confirmación de entrega
// Extraer BSUID de la respuesta de la API
const bsuid = response?.contacts?.[0]?.wa_id;

// Almacenar BSUID en el perfil del cliente
await db.update(agendaClients)
    .set({ waBsuid: bsuid })
    .where(eq(agendaClients.phone, normalizedPhone));
```

#### 3. Lógica de Envío de Mensajes

Modificar las funciones de envío para usar BSUID cuando esté disponible:

```typescript
async function sendTemplate(
    to: string, // Puede ser número de teléfono o BSUID
    templateName: string,
    ...
) {
    // Si el identificador empieza con formato BSUID, usarlo directamente
    // Si es número de teléfono, normalizar como antes
    const identifier = isBsuid(to) ? to : normalizePhone(to);
    // ...
}
```

#### 4. Transición de 30 Días

WhatsApp proporcionará un rolling 30-day transition:
- Después de cualquier interacción, WhatsApp retornará el número de teléfono por 30 días
- Esto permite que SimpleAgenda capture y almacene BSUID gradualmente
- Plan: Capturar BSUID en cada interacción y almacenarlo

### Timeline de Implementación

- **Q2 2026**: Agregar campo `waBsuid` al schema
- **Q2 2026**: Actualizar código para capturar BSUID de respuestas
- **Q2 2026**: Modificar lógica de envío para soportar ambos identificadores
- **H2 2026**: Testing con usuarios en países donde usernames se lancen primero

### Compatibilidad hacia Atrás

- Los números de teléfono no desaparecerán inmediatamente
- SimpleAgenda continuará funcionando con números de teléfono
- La transición será gradual, permitiendo implementación incremental<tool_call>read_file<arg_key>file_path</arg_key><arg_value>c:\Users\chris\Desktop\Simple\docs\COOLIFY_DEPLOYMENT.md
