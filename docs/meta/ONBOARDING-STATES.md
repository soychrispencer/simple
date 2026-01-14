# Estados de onboarding para Mi Negocio

Estados propuestos
- pending: usuario base, sin negocio; CTA primario: Crear Mi Negocio (crea public_profile + has_business=true).
- business_started: comenzó wizard de negocio, no completado; CTA: Completar Mi Negocio (retomar wizard), mostrar checklist mínima.
- business_completed: negocio creado y visible; CTA: Publicar (si canPublish) o Invitar equipo / Configurar página pública.
- business_verified (opcional): negocio verificado; CTA: Publicar más / Integraciones / Estadísticas.

Transiciones
- pending -> business_started: inicia wizard de Mi Negocio.
- business_started -> business_completed: finaliza wizard y crea public_profile activo (o lo reactiva).
- business_completed -> business_verified: proceso manual/automático de verificación.

CTAs sugeridos por estado
- pending: "Crear Mi Negocio" (bloquea publicar hasta completar). Mostrar beneficio y que publicar requiere negocio.
- business_started: "Completar Mi Negocio" + checklist de campos clave (nombre público, contacto, región/comuna, logo/cover).
- business_completed: "Publicar Vehiculo" (o vertical correspondiente), "Configurar Mi Página".
- business_verified: "Publicar Vehiculo", "Integraciones", "Ver estadísticas".

Notas de implementación
- Guardar onboarding_status en profiles (ya existe), usar los valores anteriores.
- has_business se deriva de public_profiles y sirve como flag rápido para panel/capacidades.
- El panel dinámico se construye con capacidades, no con roles.
