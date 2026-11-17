export type MarketplaceClientPolicyFailure = {
    ok: false;
    error: string;
    status: 403;
};

export type MarketplaceClientPolicySuccess = { ok: true };

export type MarketplaceClientPolicyResult = MarketplaceClientPolicySuccess | MarketplaceClientPolicyFailure;

type ProviderGroupOwnership = {
    ownerUserId: string | null;
    ownerId: string | null;
};

export async function validateMarketplaceClientRequest(
    userId: string,
    group?: ProviderGroupOwnership | null,
): Promise<MarketplaceClientPolicyResult> {
    if (group?.ownerUserId === userId) {
        return {
            ok: false,
            error: 'No puedes solicitar serenatas de tu propio mariachi.',
            status: 403,
        };
    }

    return { ok: true };
}
