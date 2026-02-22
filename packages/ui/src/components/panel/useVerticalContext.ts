"use client";
import * as React from "react";
import type { VerticalName } from "@simple/config";
import { useAuth } from "@simple/auth";

export interface CompanyRecord {
  id: string;
  name?: string;
  slug?: string;
  logo_url?: string;
  is_active?: boolean;
  industry?: string | null;
  company_type?: string | null;
  [key: string]: any;
}

export interface CompanyMembership {
  id: string;
  companyId: string;
  role: string;
  permissions: Record<string, any> | null;
  isActive: boolean;
  company?: CompanyRecord | null;
}

export interface VerticalContextValue {
  profile: ReturnType<typeof useAuth>["profile"];
  user: ReturnType<typeof useAuth>["user"];
  memberships: CompanyMembership[];
  currentCompany: CompanyMembership | null;
  setCurrentCompanyId: (companyId: string | null) => void;
  refreshMemberships: () => Promise<void>;
  loading: boolean;
  error?: string | null;
}

function filterByVertical(
  memberships: CompanyMembership[],
  vertical?: VerticalName
): CompanyMembership[] {
  if (!vertical) return memberships;

  return memberships.filter((membership) => {
    const company = membership.company;
    if (!company) return true;

    const directVerticalKey = company.vertical_key ?? company.vertical;
    if (typeof directVerticalKey === "string") {
      return directVerticalKey === vertical;
    }

    const tags: string[] | undefined = company.verticals || company.vertical_keys;
    if (Array.isArray(tags)) {
      return tags.includes(vertical);
    }

    return true;
  });
}

export function useVerticalContext(vertical?: VerticalName): VerticalContextValue {
  const { user, profile } = useAuth();
  const [memberships, setMemberships] = React.useState<CompanyMembership[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = React.useState<string | null>(null);

  const storageKey = React.useMemo(() => {
    return vertical ? `simple:panel:${vertical}:company` : "simple:panel:company";
  }, [vertical]);

  const refreshMemberships = React.useCallback(async () => {
    if (!user?.id) {
      setMemberships([]);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch("/api/profile/companies", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("[useVerticalContext] memberships query error", result);
      setError(String(result?.error || "No se pudo cargar membresías"));
      setMemberships([]);
    } else {
      const mapped: CompanyMembership[] = (Array.isArray(result?.companies) ? result.companies : []).map((row: any) => ({
        id: String(row.membershipId || row.id || ""),
        role: String(row.role || "member"),
        permissions: row.permissions || {},
        isActive: String(row.status || "active") === "active",
        companyId: String(row.companyId || row.company_id || ""),
        company: row.company ?? null,
      }));
      setMemberships(mapped.filter((item) => item.id && item.companyId));
    }

    setLoading(false);
  }, [user?.id]);

  React.useEffect(() => {
    refreshMemberships();
  }, [refreshMemberships]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      setCurrentCompanyId(stored);
    }
  }, [storageKey]);

  const filteredMemberships = React.useMemo(
    () => filterByVertical(memberships, vertical),
    [memberships, vertical]
  );

  React.useEffect(() => {
    if (filteredMemberships.length === 0) {
      setCurrentCompanyId(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(storageKey);
      }
      return;
    }

    if (
      !currentCompanyId ||
      !filteredMemberships.some((m) => m.companyId === currentCompanyId)
    ) {
      const fallback = filteredMemberships[0];
      setCurrentCompanyId(fallback.companyId);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, fallback.companyId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredMemberships, storageKey]);

  const currentCompany = React.useMemo(() => {
    if (!currentCompanyId) return null;
    return (
      filteredMemberships.find((membership) => membership.companyId === currentCompanyId) || null
    );
  }, [filteredMemberships, currentCompanyId]);

  const handleSetCurrentCompanyId = React.useCallback(
    (companyId: string | null) => {
      setCurrentCompanyId(companyId);
      if (typeof window === "undefined") return;
      if (companyId) {
        window.localStorage.setItem(storageKey, companyId);
      } else {
        window.localStorage.removeItem(storageKey);
      }
    },
    [storageKey]
  );

  return {
    profile,
    user,
    memberships: filteredMemberships,
    currentCompany,
    setCurrentCompanyId: handleSetCurrentCompanyId,
    refreshMemberships,
    loading,
    error,
  };
}
