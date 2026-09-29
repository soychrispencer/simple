# SimpleTickets

Plan de producto y arquitectura para `simpletickets.app`.

## Propuesta

SimpleTickets es la ticketera de Simple para crear, vender y validar entradas sin
comision de plataforma. Cada organizador conecta su propia cuenta de Mercado Pago,
recibe el dinero directamente y asume solo el costo de procesamiento informado por
Mercado Pago.

Para el lanzamiento, la suscripcion de SimpleTickets es gratuita. El comprador paga
el precio publicado de la entrada: Simple no agrega cargos al checkout.

## Decisiones base

- Nombre de trabajo: **SimpleTickets**, siguiendo la convencion plural del ecosistema.
- Dominio: `simpletickets.app`.
- Comision Simple por venta: `0%`, forzada en datos y pagos.
- Dinero: nunca pasa por una cuenta de Simple.
- Cuenta de pago: pertenece al organizador y se conecta por OAuth.
- Primer mercado: productores independientes, bandas y recintos con admision general.
- Primer canal: marketplace liviano de eventos y venta directa mediante enlace.
- Operacion: un solo superadmin global durante la etapa inicial.

## Principios tecnicos

- Un pedido, un pago y una emision son estados distintos y auditables.
- El inventario se reserva por tiempo limitado antes de confirmar el pago.
- Los webhooks son idempotentes: un evento repetido no duplica entradas.
- Cada entrada emitida tiene identidad propia; el QR no contiene datos sensibles.
- Cada validacion de acceso deja un registro inmutable e idempotente.
- Eventos, funciones y tipos de entrada son entidades separadas.
- La logica compartida vive en paquetes del monorepo; la logica de ticketing conserva
  su propio dominio.

## Unificacion del ecosistema

SimpleTickets reutiliza las capas compartidas que reducen mantenimiento:

- marca, tema, autenticacion, header, footer y navegacion del panel;
- botones, formularios, avisos, estados, modales, esqueletos y manejo de errores;
- metadatos, iconos, manifest, robots y convenciones de despliegue;
- utilidades de API, Mercado Pago, correo y configuracion global.

Se mantienen dentro de la vertical el checkout, inventario, pedidos, emision, QR,
cola offline, lector y control de acceso. No se incorporan modulos de publicaciones,
agenda, perfiles comerciales o suscripciones que no resuelvan ticketing.

## Fases

### 1. Fundacion operativa

Estado: implementada.

- Registro de la vertical en autenticacion, marcas, navegacion y Mercado Pago.
- Panel para crear borradores con fecha, recinto, aforo y tipos de entrada.
- Conexion de la cuenta Mercado Pago del organizador.
- Publicacion bloqueada si un evento pagado no tiene una cuenta conectada.
- Pagina publica inicial del evento.
- Portada publica tipo marketplace con busqueda y proximos eventos.
- Panel privado bajo `/panel`, con sidebar en escritorio y navegacion inferior movil.
- Modelo de datos para organizadores, funciones, inventario, pedidos, entradas,
  validaciones, reservas y webhooks.

### 2. Motor de venta

Estado: implementada; falta validacion pagada controlada.

Implementado:

- Reservas atomicas de inventario con expiracion y liberacion automatica.
- Pedidos publicos idempotentes y precio final sin cargos Simple.
- Pago en la cuenta Mercado Pago del organizador con `marketplace_fee` en cero.
- Confirmacion mediante webhook firmado, con validacion de monto, moneda, referencia y receptor.
- Emision de una entrada unica por unidad comprada.
- Flujo completo para entradas gratuitas y pagina publica del pedido.
- QR firmado por entrada, descarga individual y verificacion criptografica.
- Correo de entrega con QR inline, pagina de pedido y reenvio limitado.
- Historial auditable de intentos de entrega.

Validacion pendiente:

- Probar el flujo pagado con credenciales de prueba y luego con una compra real controlada.

### 3. Control de acceso

Estado: nucleo operativo implementado.

Implementado:

- Lector movil con camara y validacion manual para el organizador autenticado.
- Resultado inmediato: admitida, ya utilizada, anulada, invalida o de otro evento.
- Cola local persistente para mala conectividad, sin autorizar ingresos sin servidor.
- Sincronizacion idempotente individual y por lotes de hasta 100 escaneos.
- Registro auditable de dispositivo, operador, hora de escaneo y hora de recepcion.
- Puertas configurables por funcion, separadas de la identidad tecnica del dispositivo.
- Padron paginado con busqueda por nombre, correo o codigo y filtros de estado.
- Admision manual desde el padron, confirmada por el servidor e idempotente.
- Panel en vivo con entradas emitidas, ingresadas, restantes y actividad reciente.
- Proteccion de datos ante entradas invalidas o pertenecientes a otro organizador.

Pendiente:

- Prueba fisica de camara y concurrencia con varios telefonos en un recinto.

### 4. Operacion de ventas

Estado: nucleo operativo implementado.

Implementado:

- Resumen de ventas pagadas, costo informado por Mercado Pago, neto y entradas.
- Deteccion visible de pagos pendientes de revision o con costo aun no informado.
- Busqueda por orden, comprador, correo e identificador de pago.
- Filtros por evento, estado y periodo, con paginacion por cursor.
- Detalle protegido de comprador, entradas, pago, conciliacion y entregas.
- Exportacion CSV de todos los resultados filtrados, hasta 10.000 ordenes por archivo.
- Comision Simple expuesta siempre en cero, separada del costo del procesador.
- Devolucion total desde la cuenta Mercado Pago conectada por el organizador.
- Confirmacion explicita, motivo e historial auditable de cada intento de reembolso.
- Idempotencia frente a reintentos y conciliacion con el pago ante respuestas inciertas.
- Bloqueo inmediato de entradas durante el proceso, anulacion y reposicion de inventario al confirmar.
- Reconciliacion de reembolsos realizados directamente en Mercado Pago mediante webhook.
- Estado publico del pedido y correo de confirmacion para el comprador.
- Cancelacion de evento con liberacion de reservas, anulacion de cortesias y reembolsos
  coordinados por lote de las ordenes pagadas.

Pendiente:

- Devoluciones parciales, cuando el modelo de negocio realmente las requiera.
- Registro y tratamiento de contracargos de Mercado Pago.
- Reportes agregados por tipo de entrada.
- Invitaciones, cortesias y venta en puerta.
- Roles simples por organizacion: propietario, productor, caja y acceso.
- Historial de cambios administrativos.

### 5. Crecimiento

- Codigos promocionales con limites y vigencia.
- Enlaces por promotor con atribucion, sin alterar el precio del comprador.
- Analitica de conversion y origen de ventas.
- Consentimiento y exportacion de audiencia propia del organizador.
- Plantillas reutilizables para eventos recurrentes.

### 6. Escala avanzada

- Multiples funciones del mismo evento.
- Aforo por zonas y asientos numerados.
- Varios medios de pago sin acoplar el dominio a un proveedor.
- Terminal de boleteria y hardware de acceso.
- Colas y procesamiento asincrono para ventas de alta demanda.

## Condiciones de lanzamiento

Trabajo actual: **solo local**. No desplegar ni vender entradas reales hasta cerrar
el producto en desarrollo.

Pendiente de entorno (no bloquear features locales):

- checklist de validacion pagada en `docs/SIMPLETICKETS_PAID_VALIDATION.md`;
- secreto estable `TICKETS_QR_SECRET` en el entorno de despliegue;
- pruebas sandbox/producción de Mercado Pago, carga y observabilidad.

Antes de vender entradas reales deben estar terminados y probados:

- reserva atomica de inventario y prevencion de sobreventa;
- confirmacion de pago por webhook;
- emision y reenvio de entradas;
- QR firmado y validacion idempotente;
- devolucion, anulacion y cancelacion de evento;
- politica de privacidad, terminos del servicio y responsabilidades del organizador
  (`/privacidad` y `/terminos` en simpletickets.app).

## Alcance inicial recomendado

El primer lanzamiento debe resolver muy bien un concierto de admision general: un
organizador, una fecha, varios tipos de entrada, pago directo, QR y escaneo. Asientos
numerados, reventa, categorias editoriales y automatizaciones comerciales quedan
fuera hasta validar ventas y operacion en eventos reales.
