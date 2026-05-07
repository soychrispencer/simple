import type { Context } from 'hono';

/** Dependencias inyectadas en `createSerenatasRouter` y sub-routers (p. ej. notificaciones). */
export type SerenatasRouterDeps = {
    db: any;
    authUser: (c: Context) => Promise<{ id: string; role?: string } | null>;
    requireAuth: (c: Context, next: () => Promise<void>) => Promise<void>;
    service: any;
    /** Clave pública VAPID (misma que SimpleAgenda) para `GET .../push/vapid-public-key`. */
    vapidPublicKey?: string;
    /** Misma implementación que en `index.ts` — envía web push a todas las suscripciones del usuario. */
    sendPushToUser?: (userId: string, payload: { title: string; body: string; url?: string }) => Promise<void>;
    tables: {
        /** Suscripciones web push (tabla compartida con SimpleAgenda). */
        pushSubscriptions: any;
        serenataCoordinatorProfiles: any;
        serenataCoordinatorCrewMemberships: any;
        serenatas: any;
        serenataMusicianLineup: any;
        serenataMusicians: any;
        serenataSubscriptions: any;
        serenataSubscriptionPayments: any;
        serenataPayments: any;
        serenataReviews: any;
        serenataCoordinatorReviews: any;
        serenataAvailability: any;
        serenataMessages: any;
        serenataGroups: any;
        serenataGroupMembers: any;
        serenataRequests: any;
        serenataAssignments: any;
        serenataRoutes: any;
        serenataNotifications: any;
        serenataMpWebhookEvents: any;
        serenataCoordinatorPreapprovals: any;
        users: any;
    };
};
