"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@simple/auth";
import { PanelPageLayout } from "@simple/ui";
import { PersonalDataForm, ProfileAddresses } from "@simple/profile";
import { IconChartBar, IconClock, IconCalendar, IconCheck, IconAlertTriangle, IconFlag } from "@tabler/icons-react";

export default function Perfil() {
  const router = useRouter();
  const { user, refresh: refreshAuth, loading } = useAuth();

  const personalFields = [
    user?.first_name,
    user?.last_name,
    user?.document_number,
    user?.birth_date,
    user?.user_role,
  ];
  const personalCompleted = personalFields.filter((c) => c && String(c).trim().length > 0).length;
  const personalTotal = personalFields.length;
  const personalMissing = Math.max(0, personalTotal - personalCompleted);

  const formatDateTime = React.useCallback((value?: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    const datePart = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(date).replace(/\.$/, "");
    const timePart = new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit" }).format(date);
    return `${datePart} · ${timePart}`;
  }, []);

  const roleLabel = React.useMemo(() => {
    const map: Record<string, string> = {
      buyer: "Comprador",
      seller: "Vendedor particular",
      dealer: "Concesionario / Dealer",
      company: "Empresa (flota / leasing)",
      other: "Otro",
    };
    if (!user?.user_role) return "—";
    return map[String(user.user_role)] || String(user.user_role);
  }, [user?.user_role]);

  const formatTenure = React.useCallback((value?: string | null) => {
    if (!value) return "—";
    const created = new Date(value);
    return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" })
      .format(created)
      .replace(/\.$/, "");
  }, []);

  React.useEffect(() => {
    if (!loading && !user?.id) {
      router.replace("/");
    }
  }, [user, loading, router]);

  const handleProfileSave = async () => {
    await refreshAuth(true);
  };

  return (
    <PanelPageLayout
      header={{
        title: "Mi Perfil",
        description: "Gestiona los datos basicos de tu cuenta (perfil privado).",
      }}
    >
      <div className="flex flex-wrap items-center gap-2 w-full text-sm mb-6">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg card-surface">
          <IconChartBar className="text-primary" size={16} stroke={1.5} />
          <span className="font-semibold">Datos personales {personalCompleted}/{personalTotal}</span>
          {personalMissing > 0 ? (
            <a href="#datos-personales" className="text-[var(--color-warn)] flex items-center gap-1 text-xs">
              <IconAlertTriangle size={14} /> Falta {personalMissing}
            </a>
          ) : <IconCheck size={16} className="text-[var(--color-success)]" />}
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg card-surface">
          <IconClock className="text-primary" size={16} stroke={1.5} />
          <span className="font-semibold">Actualizado</span>
          <span title={user?.updated_at || undefined}>{formatDateTime(user?.updated_at)}</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg card-surface">
          <IconCalendar className="text-lighttext/70 dark:text-darktext/70" size={16} stroke={1.5} />
          <span className="font-semibold">Miembro</span>
          <span title={user?.created_at || undefined}>{formatTenure(user?.created_at)}</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg card-surface">
          <IconFlag className="text-primary" size={16} stroke={1.5} />
          <span className="font-semibold">Rol: {roleLabel}</span>
        </div>
      </div>
      <div className="w-full mt-8" id="datos-personales">
        <div className="card-surface shadow-token-lg p-6">
          <PersonalDataForm user={user} onSave={handleProfileSave} />
        </div>
      </div>
      <div className="w-full mt-8" id="direcciones">
        <div className="card-surface shadow-token-lg p-6">
          <ProfileAddresses userId={user?.id} />
        </div>
      </div>
    </PanelPageLayout>
  );
}
