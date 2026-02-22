import { upsertListing } from "@simple/sdk";

function readAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem("simple_access_token");
    return value && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

export interface SaveSpecsParams {
  vehicleId: string;
  typeSlug: string;
  specs: Record<string, any>;
}

export interface SaveSpecsResult {
  ok: boolean;
  error?: string;
}

export async function saveVehicleSpecs({ vehicleId, specs }: SaveSpecsParams): Promise<SaveSpecsResult> {
  const accessToken = readAccessToken();
  if (!accessToken) return { ok: false, error: "No hay sesión activa" };

  try {
    await upsertListing({
      accessToken,
      vertical: "autos",
      listingId: vehicleId,
      listing: { metadata: { specs } },
      replaceImages: false
    });
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: String(error?.message || "No se pudo guardar specs") };
  }
}

export async function saveVehicleFeatures(vehicleId: string, featureCodes: string[]): Promise<SaveSpecsResult> {
  const accessToken = readAccessToken();
  if (!accessToken) return { ok: false, error: "No hay sesión activa" };

  try {
    await upsertListing({
      accessToken,
      vertical: "autos",
      listingId: vehicleId,
      listing: {},
      detail: { features: featureCodes },
      replaceImages: false
    });
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: String(error?.message || "No se pudo guardar features") };
  }
}
