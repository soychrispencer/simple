# SimpleTickets — validación del flujo pagado

> **Estado:** pendiente. No ejecutar en producción todavía.
> Prioridad actual: cerrar SimpleTickets en local. Este checklist se retoma cuando
> el producto local esté listo para una prueba controlada.

Checklist operativo antes de vender entradas reales. No reemplaza pruebas de carga ni
observabilidad continua; valida que el camino feliz y los fallos controlados funcionen
con Mercado Pago.

## 0. Precondiciones de entorno

En `simple-api` (producción o staging equivalente):

- [ ] `TICKETS_APP_URL=https://simpletickets.app`
- [ ] `API_BASE_URL=https://api.simpleplataforma.app` (HTTPS)
- [ ] `TICKETS_QR_SECRET` aleatorio, **≥ 32 caracteres**, guardado en el gestor de secretos
- [ ] `MP_OPERATOR_APP_ID` y `MP_OPERATOR_APP_SECRET` de la app OAuth de Mercado Pago
- [ ] `MERCADO_PAGO_PUBLIC_ORIGIN_TICKETS=https://simpletickets.app`
- [ ] SMTP configurado para correos de entrega y reembolso
- [ ] Migraciones `0141`–`0146` aplicadas

Callback OAuth esperado:

`https://api.simpleplataforma.app/api/integrations/mercadopago/callback`

Webhook de pago (lo arma el checkout por orden):

`https://api.simpleplataforma.app/api/tickets/payments/mercadopago/webhook?order=<publicId>`

En el panel `/panel`, la banda de Mercado Pago debe mostrar **Runtime listo para ventas pagadas**
cuando el organizador ya conectó su cuenta y no hay blockers de configuración.

## 1. Sandbox — compra pagada

1. Crear organizador de prueba e iniciar sesión en SimpleTickets.
2. Conectar Mercado Pago (cuenta de prueba / app de test).
3. Crear evento borrador con al menos un tipo de entrada pagada (> $0).
4. Subir portada, publicar el evento.
5. Abrir la URL pública `/evento/<slug>` en otra sesión/navegador.
6. Completar checkout con comprador de prueba y pagar en Mercado Pago sandbox.
7. Verificar:
   - [ ] El webhook confirma el pedido (`paid`)
   - [ ] Se emiten entradas con QR
   - [ ] Llega el correo de entrega (o queda auditable el intento)
   - [ ] `/orden/<publicId>` muestra las entradas y permite descarga/reenvío
8. Escanear un QR en `/panel/accesos` y confirmar admisión idempotente.

## 2. Sandbox — reembolso y cancelación

1. Desde ventas, reembolsar una orden individual y verificar anulación de entradas.
2. Crear un segundo evento de prueba, vender una entrada y **cancelar el evento** con
   reembolsos automáticos.
3. Verificar resumen de cancelación (aprobados / revisión / omitidos por entradas usadas).

## 3. Compra real controlada (monto mínimo)

Solo después de sandbox en verde:

1. Usar credenciales de producción de Mercado Pago del organizador real.
2. Publicar un evento de prueba con precio mínimo y aforo bajo.
3. Comprar **una** entrada con tarjeta real.
4. Confirmar webhook, emisión, correo y acceso.
5. Reembolsar de inmediato.
6. Archivar el evento (pausar o cancelar) para que no quede a la venta.

## 4. Criterios de salida

El flujo pagado se considera validado cuando:

- no hay sobreventa en la compra de prueba;
- un webhook repetido no duplica entradas;
- el QR emitido con el `TICKETS_QR_SECRET` actual se valida y uno alterado se rechaza;
- reembolso y cancelación de evento dejan las entradas inutilizables;
- el panel no muestra blockers de runtime.

## 5. Si algo falla

| Síntoma | Revisar primero |
|---|---|
| Checkout no crea preferencia | Cuenta MP conectada, `MP_OPERATOR_*`, logs de `createCheckoutPreference` |
| Pedido queda pendiente | Firma/webhook, `API_BASE_URL` HTTPS, `x-signature`, orden en `ticket_payment_events` |
| QR no se emite en prod | `TICKETS_QR_SECRET` presente y distinto del valor por defecto |
| Correo no llega | SMTP, tabla `ticket_order_deliveries`, spam |
| Reembolso en revisión | Respuesta MP, estado `refund_pending`, reintento desde ventas |
