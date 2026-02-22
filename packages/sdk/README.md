# @simple/sdk

SDK modular para consumir `simple-api` por dominios.

## Dominios

- `health`: `getSimpleApiHealth`
- `listings`: `listListings`, `getListingMedia`, `upsertListing`
- `publish`: `queuePublish`
- `profiles`: utilidades de normalizacion (`buildProfileSummary`)
- `subscriptions`: utilidades de plan/capacidades (`resolveSubscriptionPlan`)
- `integrations`: utilidades de estado (`normalizeInstagramIntegrationStatus`)

## Uso rapido

```ts
import { listListings, getListingMedia } from "@simple/sdk";

const listings = await listListings({ vertical: "autos", type: "sale", limit: 12 });
const media = await getListingMedia(listings.items[0].id);
```

Notas:

- Toma base URL desde `NEXT_PUBLIC_SIMPLE_API_BASE_URL` (o localhost en dev).
- Reusa timeout/retry/cooldown definidos en `@simple/config`.

