# Modelo Comercial SimpleSerenatas

## Decisión estratégica

SimpleSerenatas funciona con una prueba completa por tiempo limitado y dos planes pagados visibles:

- Prueba completa: 30 días, no se muestra como plan permanente.
- Esencial: $9.990 + IVA.
- Pro: $19.990 + IVA.

SimpleSerenatas no cobra comisión por serenata, reserva, evento o cierre.

## Modelo anterior

- Plan gratis permanente.
- Un solo plan Pro.
- Pro asociado a menor comisión.
- Comisión Simple sobre serenatas originadas desde la aplicación.
- Mensajes comerciales con porcentajes sobre reservas.

## Modelo nuevo

### Prueba gratis

La prueba permite conocer la plataforma sin fricción:

- crear cuenta;
- configurar perfil;
- configurar negocio;
- crear servicios;
- probar solicitudes, agenda, cobertura y repertorio;
- aparecer temporalmente en el marketplace;
- recibir solicitudes durante el periodo de prueba;
- operar sin comisión por serenata.

La prueba no debe presentarse como un plan gratis permanente.

### Esencial

Esencial mantiene activa la vitrina profesional:

- perfil público activo;
- aparición en marketplace;
- WhatsApp visible;
- hasta 3 servicios activos;
- repertorio básico;
- solicitudes básicas;
- agenda básica;
- operación sin comisión por serenata.

Mensaje comercial:

> Tu vitrina profesional activa, sin comisión por serenata.

### Pro

Pro es el plan recomendado para grupos que operan de forma activa:

- todo lo de Esencial;
- servicios y repertorio completos;
- solicitudes y agenda avanzada;
- invitaciones y gestión de músicos;
- finanzas, reportes y pagos a músicos;
- chat WhatsApp desde panel;
- mapa y rutas;
- mayor visibilidad;
- operación sin comisión por serenata.

Mensaje comercial:

> Opera tu grupo completo: solicitudes, agenda, músicos, finanzas y WhatsApp.

## Límites actuales

- Durante la prueba el usuario tiene acceso completo.
- Esencial permite hasta 3 servicios activos.
- Esencial permite 1 grupo de músicos.
- Si la prueba vence sin plan activo, los datos se conservan pero la operación debe quedar bloqueada hasta elegir Esencial o Pro.
- Pro permite más servicios, más grupos y funciones avanzadas.

## Pagos online

El checkout de suscripción se mantiene como mecanismo para activar Esencial o Pro.

El checkout de serenata booking queda como herramienta de pago online. Si se usa, cualquier costo de procesamiento corresponde al proveedor de pago, no a SimpleSerenatas.

## Campos legacy

Por compatibilidad se mantienen campos internos relacionados a comisión:

- `commissionRateBps`
- `commissionVatRateBps`
- `commissionAppBps`
- `commissionAppPercent`
- `commissionVatBps`
- `commissionVatPercent`
- `ownerOwnSerenataCommissionPercent`
- `alwaysFreeMonthly`

Estos campos no deben usarse en copy comercial ni como base del modelo actual.

## Implementación actual

- Las tasas de comisión Simple en `plan-config` están en cero.
- Los textos visibles hablan de prueba completa, Esencial, Pro y sin comisión por serenata.
- Nuevos dueños se crean con `subscriptionStatus: trialing` y fecha de término de prueba.
- `/me/plan` expone estado de prueba y visibilidad:
  - `trialDays`
  - `trialEndsAt`
  - `trialActive`
  - `subscriptionRequired`
  - `profileVisibilityStatus`

## Pendiente recomendado

- Migrar o normalizar dueños existentes con fecha 2099.
- Pausar perfil público y solicitudes cuando la prueba expire y no exista plan activo.
- Renombrar o retirar campos legacy de comisión en una fase posterior.

## Regla de copy

Permitido:

- "Prueba gratis por 30 días."
- "Activa Esencial para mantener tu vitrina profesional activa."
- "Activa Pro para operar tu grupo completo."
- "Sin comisión por serenata."
- "SimpleSerenatas no cobra comisión por tus eventos."
- "Si decides usar pagos online, el proveedor de pago puede aplicar sus propios costos de procesamiento."

No permitido:

- "Plan gratis permanente."
- "Comisión 15% + IVA."
- "Comisión 8% + IVA."
- "Menor comisión con Pro."
- "Success fee."
- "Simple cobra comisión por serenata."
