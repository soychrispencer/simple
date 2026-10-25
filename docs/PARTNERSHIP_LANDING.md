# Solicitudes desde la landing de alianzas

La página `/alianzas-inmobiliarias` de SimplePropiedades presenta el canal digital y la comercialización asistida para venta y arriendo. Las condiciones se acuerdan por aliado; la página no publica porcentajes de comisión.

El formulario envía nombre, empresa, correo, operación y autorización de contacto a `POST /api/public/partnership-inquiries`. No crea una cuenta de inmobiliaria ni otorga permisos de publicación.

Cada solicitud válida se guarda primero como un evento `channel.inbound`, canal `web_form`, en el historial operativo existente. Aparece pendiente en **Conversaciones de SimpleAdmin**, con empresa, correo de respuesta y operación de interés. El equipo puede abrir el correo del contacto y marcar la conversación como respondida. No requiere una migración adicional.

El servidor intenta enviar un aviso interno a `hola@simpleplataforma.app`, usando el transporte SMTP ya configurado. El correo del visitante se usa como `Reply-To`; el destinatario del aviso es fijo. Si el aviso falla, el contacto sigue registrado en SimpleAdmin y el fallo se registra sin datos personales en los logs.

La clave UUID del formulario evita duplicados al reintentar. Se valida la autorización y el contenido, se limita el tamaño de la solicitud y se aplica el límite existente por IP (cinco solicitudes cada quince minutos), además de un campo trampa. La solicitud no dispara correos automáticos hacia el visitante.

Para publicar esta funcionalidad se despliegan `simple-api`, `simpleadmin` y `simplepropiedades`. La API debe estar disponible antes de activar la nueva landing.
