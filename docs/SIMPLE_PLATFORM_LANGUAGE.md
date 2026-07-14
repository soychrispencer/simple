# Simple Platform Language

Vocabulario oficial de producto. Congelar estos términos en UI y código de dominio nuevo.

> **Publicar crea. Mis publicaciones administran. Mi negocio configura.**

> Las apps son verticales que activan **capabilities**. El core trabaja con **Publications**, no con `if (app === 'autos')`.

## Términos

| Término | Significa |
|---------|-----------|
| **Business** | Negocio del usuario (empresa / profesional / particular que opera) |
| **Profile** | Página pública del Business |
| **Publication** | Todo lo que el usuario publica (aviso, servicio, producto) |
| **PublishType** | Tipo de publicación: `sale`, `rent`, `auction`, `project`, `service`, `product` |
| **Offer** | Condición comercial sobre una Publication (precio vigente, promo, cupón, pack). Dominio futuro; hoy el precio puede vivir en `publication.pricing` |
| **Order** | Compra o contratación |
| **Lead** | Interesado |
| **Conversation** | Chat |
| **Notification** | Evento del sistema |
| **Subscription** | Plan |
| **Payment** | Pago |
| **Capability** | Módulo de plataforma que una vertical puede activar (`publications`, `crm`, `messages`, `booking`, …) |
| **VerticalConfig** | Configuración de una vertical: `publishTypes`, `capabilities`, branding |

## Cadena de dominio

```
Business → Publication → Offer → Order
```

## Prohibido en UI / dominio nuevo

- **Operación** como etiqueta del selector de publicar (usar **¿Qué quieres publicar?** / PublishType)
- **Operator** / **Catalog** como concepto de producto
- **Listing** fuera de la capa técnica/DB
- **Kind** (usar **PublishType**)

## Capa técnica (puede cambiar)

- Tablas: `listings`, `marketplace_operator_services`, `marketplace_operator_products`, `public_profiles`
- Los mappers convierten persistencia → `Publication`; los módulos de producto solo ven `Publication`
