import React from "react";
import { IconCheck, IconUser, IconPhone, IconMail, IconId, IconCalendar, IconChevronLeft, IconChevronRight, IconChevronDown } from "@tabler/icons-react";
import { useToast, Button, FormInput as Input, FormSelect as Select } from "@simple/ui";

type PersonalFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  whatsapp: string;
  documentType: string;
  documentNumber: string;
  birthDate: string;
  gender: string;
  nationality: string;
  userRole: string;
};

const nationalityOptions = [
  "Argentina","Bolivia","Brasil","Chile","Colombia","Costa Rica","Cuba","República Dominicana","Ecuador","El Salvador","Guatemala","Honduras","México","Nicaragua","Panamá","Paraguay","Perú","Puerto Rico","Uruguay","Venezuela","España","Estados Unidos"
].map((n) => ({ label: n, value: n }));

const documentTypeOptions = [
  { label: "RUN / RUT", value: "run" },
  { label: "DNI", value: "dni" },
  { label: "Pasaporte", value: "passport" },
  { label: "Otro", value: "other" },
];

const genderOptions = [
  { label: "Prefiero no decir", value: "" },
  { label: "Femenino", value: "female" },
  { label: "Masculino", value: "male" },
  { label: "Otro", value: "other" },
];

const userRoleOptions = [
  { label: "Comprador", value: "buyer" },
  { label: "Vendedor particular", value: "seller" },
  { label: "Concesionario / Dealer", value: "dealer" },
  { label: "Empresa (flota / leasing)", value: "company" },
  { label: "Otro", value: "other" },
];

const formatDocumentNumber = (type: string, value: string) => {
  if (type === "run") {
    const clean = value.replace(/[^0-9kK]/g, "").toUpperCase().slice(0, 9);
    if (!clean) return "";
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);
    const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return body ? `${withDots}-${dv}` : dv;
  }
  if (type === "dni") {
    return value.replace(/\D/g, "").slice(0, 10);
  }
  if (type === "passport") {
    return value.replace(/[^0-9A-Za-z]/g, "").toUpperCase().slice(0, 15);
  }
  return value.trim();
};

const validateRun = (value: string) => {
  const clean = value.replace(/[^0-9kK]/g, "").toUpperCase();
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^[0-9]+$/.test(body)) return false;
  const reversed = body.split("").reverse();
  const sum = reversed.reduce((acc, digit, idx) => acc + parseInt(digit, 10) * ((idx % 6) + 2), 0);
  const mod = 11 - (sum % 11);
  const expected = mod === 11 ? "0" : mod === 10 ? "K" : String(mod);
  return dv === expected;
};

const validateDni = (value: string) => {
  const clean = value.replace(/\D/g, "");
  return clean.length >= 7 && clean.length <= 10;
};

const formatClPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  let num = digits;
  if (num.startsWith("56")) num = num.slice(2);
  if (num.startsWith("0")) num = num.slice(1);
  num = num.slice(0, 9);
  if (!num) return "";
  const spaced = `+56 ${num[0] || ""}${num[0] ? " " : ""}${num.slice(1, 5)}${num.length > 5 ? " " : ""}${num.slice(5, 9)}`;
  return spaced.trim();
};

const validateClPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  let num = digits;
  if (num.startsWith("56")) num = num.slice(2);
  if (num.startsWith("0")) num = num.slice(1);
  return num.length === 9 && num.startsWith("9");
};

const PersonalDataForm: React.FC<{ user: any; onSave?: (data: any) => void }> = ({ user, onSave }) => {
  const { addToast } = useToast();
  const formattedInitialPhone = React.useMemo(() => formatClPhone(user?.phone || ""), [user?.phone]);
  const formattedInitialWhatsapp = React.useMemo(() => formatClPhone(user?.whatsapp || ""), [user?.whatsapp]);
  const initialUseSameForWhatsapp = React.useMemo(
    () => !!(formattedInitialPhone && formattedInitialWhatsapp && formattedInitialPhone === formattedInitialWhatsapp),
    [formattedInitialPhone, formattedInitialWhatsapp]
  );
  const [saving, setSaving] = React.useState(false);
  const [missing, setMissing] = React.useState<{ [k: string]: boolean }>({});
  const [errors, setErrors] = React.useState<{ [k: string]: string }>({});
  const [lastSavedAt, setLastSavedAt] = React.useState<string | null>(null);
  const [useSameForWhatsapp, setUseSameForWhatsapp] = React.useState<boolean>(initialUseSameForWhatsapp);

  const [form, setForm] = React.useState<PersonalFormState>({
    firstName: user?.first_name || "",
    lastName: user?.last_name || "",
    phone: formattedInitialPhone,
    whatsapp: formattedInitialWhatsapp,
    documentType: user?.document_type || "run",
    documentNumber: user?.document_number || "",
    birthDate: user?.birth_date || "",
    gender: user?.gender || "",
    nationality: user?.nationality || "",
    userRole: user?.user_role || "",
  });
  const todayDate = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const parsedBirthDate = React.useMemo(() => {
    if (!form.birthDate) return null;
    const date = new Date(`${form.birthDate}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [form.birthDate]);
  const [showCalendar, setShowCalendar] = React.useState(false);
  const [viewDate, setViewDate] = React.useState<Date>(() => parsedBirthDate || todayDate);
  const [monthMenuOpen, setMonthMenuOpen] = React.useState(false);
  const [yearMenuOpen, setYearMenuOpen] = React.useState(false);
  const calendarRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLDivElement | null>(null);

  const idPlaceholder = React.useMemo(() => {
    switch (form.documentType) {
      case "run":
        return "12.345.678-9";
      case "dni":
        return "12345678";
      case "passport":
        return "AB123456";
      default:
        return "Número de identificación";
    }
  }, [form.documentType]);

  React.useEffect(() => {
    if (parsedBirthDate) {
      setViewDate(parsedBirthDate);
    }
  }, [parsedBirthDate]);

  React.useEffect(() => {
    if (!showCalendar) {
      setMonthMenuOpen(false);
      setYearMenuOpen(false);
    }
  }, [showCalendar]);

  React.useEffect(() => {
    setForm((prev) => ({
      ...prev,
      phone: formattedInitialPhone,
      whatsapp: initialUseSameForWhatsapp ? formattedInitialPhone : formattedInitialWhatsapp,
    }));
    setUseSameForWhatsapp(initialUseSameForWhatsapp);
  }, [formattedInitialPhone, formattedInitialWhatsapp, initialUseSameForWhatsapp]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (showCalendar && calendarRef.current && triggerRef.current) {
        if (!calendarRef.current.contains(target) && !triggerRef.current.contains(target)) {
          setShowCalendar(false);
        }
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowCalendar(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showCalendar]);

  const displayBirthDate = React.useMemo(() => {
    if (!parsedBirthDate) return "Selecciona una fecha";
    return parsedBirthDate.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
  }, [parsedBirthDate]);

  const yearOptions = React.useMemo(() => {
    const currentYear = todayDate.getFullYear();
    const years: number[] = [];
    for (let y = currentYear; y >= 1900; y -= 1) years.push(y);
    return years;
  }, [todayDate]);

  const monthOptions = React.useMemo(() => {
    const formatter = new Intl.DateTimeFormat("es-CL", { month: "long" });
    return Array.from({ length: 12 }, (_v, idx) => ({
      value: idx,
      label: formatter.format(new Date(2024, idx, 1)),
    }));
  }, []);

  const calendarDays = React.useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday as first day
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = startWeekday;
    const cells: Date[] = [];

    for (let i = prevMonthDays; i > 0; i -= 1) {
      cells.push(new Date(year, month, 1 - i));
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }
    while (cells.length % 7 !== 0 || cells.length < 42) {
      const last = cells[cells.length - 1];
      cells.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
    }

    return cells;
  }, [viewDate]);

  const setMonthOffset = (offset: number) => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const handleSelectDate = (date: Date) => {
    if (date > todayDate) return;
    const iso = date.toISOString().split("T")[0];
    setForm((prev) => ({ ...prev, birthDate: iso }));
    setMissing((prev) => ({ ...prev, birthDate: false }));
    setShowCalendar(false);
  };

  const normalizePhoneE164 = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("56")) return `+${digits}`;
    if (digits.startsWith("0")) return `+56${digits.slice(1)}`;
    if (digits.length === 9 && digits.startsWith("9")) return `+56${digits}`;
    return `+${digits}`;
  };


  const handleSave = async () => {
    if (!user?.id) {
      addToast("No pudimos identificar tu usuario. Intenta recargar.", { type: "error" });
      return;
    }

    const required = ["firstName", "lastName", "documentNumber", "birthDate", "userRole"];
    const missingFields: { [k: string]: boolean } = {};
    required.forEach((key) => {
      const value = form[key as keyof PersonalFormState];
      if (!value || !String(value).trim()) {
        missingFields[key] = true;
      }
    });

    if (Object.keys(missingFields).length > 0) {
      setMissing(missingFields);
      addToast("Completa los campos obligatorios.", { type: "error" });
      return;
    }

    const validationErrors: { [k: string]: string } = {};

    if (form.documentType === "run" && form.documentNumber && !validateRun(form.documentNumber)) {
      validationErrors.documentNumber = "RUN inválido";
    }
    if (form.documentType === "dni" && form.documentNumber && !validateDni(form.documentNumber)) {
      validationErrors.documentNumber = "DNI inválido";
    }
    if (form.phone && !validateClPhone(form.phone)) {
      validationErrors.phone = "Teléfono debe ser +56 9 XXXX XXXX";
    }
    if (form.whatsapp && !validateClPhone(form.whatsapp)) {
      validationErrors.whatsapp = "WhatsApp debe ser +56 9 XXXX XXXX";
    }

    if (parsedBirthDate) {
      const today = new Date();
      let age = today.getFullYear() - parsedBirthDate.getFullYear();
      const m = today.getMonth() - parsedBirthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < parsedBirthDate.getDate())) {
        age -= 1;
      }
      if (age < 18) {
        validationErrors.birthDate = "Debes ser mayor de 18 años";
      } else if (age > 100) {
        validationErrors.birthDate = "Edad inválida";
      }
    }
    if (form.documentType === "other" && form.documentNumber.trim().length < 4) {
      validationErrors.documentNumber = "Agrega un número válido";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      addToast("Revisa los datos marcados en rojo.", { type: "error" });
      return;
    }

    setSaving(true);
    try {
      const normalizedPhone = form.phone ? normalizePhoneE164(form.phone) : "";
      const normalizedWhatsapp = form.whatsapp ? normalizePhoneE164(form.whatsapp) : "";
      const payload = {
        id: user.id,
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        phone: normalizedPhone || null,
        whatsapp: normalizedWhatsapp || null,
        document_type: form.documentType || null,
        document_number: form.documentNumber.trim(),
        birth_date: form.birthDate || null,
        gender: form.gender || null,
        nationality: form.nationality?.trim() || null,
        user_role: form.userRole || null,
      };

      const response = await fetch("/api/profile/personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("[PersonalDataForm] save error", result);
        const fieldError: { [k: string]: string } = {};
        if (String(result?.error || "").toLowerCase().includes("document")) {
          fieldError.documentNumber = "Número ya registrado";
        }
        setErrors(fieldError);
        addToast(String(result?.error || "No se pudo guardar el perfil"), { type: "error" });
        return;
      }

      addToast("Perfil actualizado", { type: "success" });
      setLastSavedAt(new Date().toISOString());
      setMissing({});
      setErrors({});
      onSave?.(payload);
    } catch (err) {
      console.error("[PersonalDataForm] unexpected", err);
      addToast("Error inesperado al guardar", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-lighttext dark:text-darktext">Datos de tu cuenta</h3>
        <p className="text-sm text-lighttext/70 dark:text-darktext/70">Toda la información se guarda en tu perfil privado.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg card-surface">
        <div className="space-y-2">
          <Input
            label="Correo"
            value={user?.email || ""}
            disabled
            leftIcon={<IconMail size={16} />}
            appearance="line"
            fieldSize="md"
          />
        </div>
        <div className="space-y-2">
          <Input
            label="Teléfono"
            placeholder="+56 9 1234 5678"
            value={form.phone}
            onChange={(e) => {
              const formatted = formatClPhone(e.target.value);
              setForm((prev) => ({ ...prev, phone: formatted }));
              setErrors((prev) => ({ ...prev, phone: "" }));
              if (useSameForWhatsapp) {
                setForm((prev) => ({ ...prev, whatsapp: formatted }));
              }
            }}
            leftIcon={<IconPhone size={16} />}
            error={errors.phone || undefined}
            appearance="line"
            fieldSize="md"
          />
          <div className="flex flex-wrap items-center gap-3 text-xs text-lighttext/70 dark:text-darktext/70">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={useSameForWhatsapp}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setUseSameForWhatsapp(checked);
                  if (checked) {
                    const formatted = formatClPhone(form.phone);
                    setForm((prev) => ({ ...prev, whatsapp: formatted }));
                    setErrors((prev) => ({ ...prev, whatsapp: "" }));
                  }
                }}
                className="accent-primary"
              />
              <span>Usar el mismo número para WhatsApp</span>
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="Rol de uso"
          value={form.userRole}
          onChange={(value) => setForm((prev) => ({ ...prev, userRole: String(value) }))}
          options={userRoleOptions}
          error={missing.userRole ? "Campo requerido" : undefined}
        />
        <Input
          label="Nombre"
          placeholder="Tu nombre"
          value={form.firstName}
          onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
          leftIcon={<IconUser size={16} />}
          required
          error={missing.firstName ? "Campo requerido" : undefined}
        />
        <Input
          label="Apellidos"
          placeholder="Tus apellidos"
          value={form.lastName}
          onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
          leftIcon={<IconUser size={16} />}
          required
          error={missing.lastName ? "Campo requerido" : undefined}
        />
        <Select
          label="Tipo de identificación"
          value={form.documentType}
          onChange={(value) => setForm((prev) => ({ ...prev, documentType: String(value), documentNumber: "" }))}
          options={documentTypeOptions}
        />
        <Input
          label="Número de identificación"
          placeholder={idPlaceholder}
          value={form.documentNumber}
          onChange={(e) => {
            const formatted = formatDocumentNumber(form.documentType, e.target.value);
            setForm((prev) => ({ ...prev, documentNumber: formatted }));
            setErrors((prev) => ({ ...prev, documentNumber: "" }));
          }}
          leftIcon={<IconId size={16} />}
          inputMode={form.documentType === "run" || form.documentType === "dni" ? "numeric" : "text"}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          autoCapitalize="off"
          name="documentNumber"
          required
          error={missing.documentNumber ? "Campo requerido" : errors.documentNumber || undefined}
          appearance="line"
          fieldSize="md"
        />
        {errors.documentNumber ? <p className="text-xs text-[var(--color-danger)]">{errors.documentNumber}</p> : null}
        <Input
          label="WhatsApp"
          placeholder="+56 9 1234 5678"
          value={form.whatsapp}
          onChange={(e) => {
            const formatted = formatClPhone(e.target.value);
            setForm((prev) => ({ ...prev, whatsapp: formatted }));
            setErrors((prev) => ({ ...prev, whatsapp: "" }));
            if (!formatted) setUseSameForWhatsapp(false);
          }}
          leftIcon={<IconPhone size={16} />}
          error={errors.whatsapp || undefined}
          disabled={useSameForWhatsapp}
          appearance="line"
          fieldSize="md"
        />
        <Select
          label="Nacionalidad"
          value={form.nationality}
          onChange={(value) => setForm((prev) => ({ ...prev, nationality: String(value) }))}
          options={nationalityOptions}
        />
        <div className="relative" ref={triggerRef}>
          <Input
            label="Fecha de nacimiento"
            value={displayBirthDate}
            placeholder="Selecciona una fecha"
            readOnly
            onClick={() => setShowCalendar((prev) => !prev)}
            leftIcon={<IconCalendar size={16} />}
            appearance="line"
            fieldSize="md"
            error={missing.birthDate ? "Campo requerido" : undefined}
            className="cursor-pointer"
          />
          {showCalendar ? (
            <div
              ref={calendarRef}
              className="absolute z-20 mt-2 w-full max-w-xs rounded-lg card-surface card-surface-raised border border-[var(--field-border)] shadow-card"
              role="dialog"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--field-border)]">
                <button type="button" onClick={() => setMonthOffset(-1)} className="p-1 rounded hover:bg-[var(--field-bg-hover)]">
                  <IconChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setMonthMenuOpen((prev) => !prev);
                        setYearMenuOpen(false);
                      }}
                      className="inline-flex items-center gap-1 h-8 px-3 text-sm rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] text-[var(--field-text)] hover:border-[var(--field-border-hover)] hover:bg-[var(--field-bg-hover)] focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-border/80 dark:focus-visible:ring-border/80"
                    >
                      <span className="capitalize">{monthOptions[viewDate.getMonth()]?.label}</span>
                      <IconChevronDown size={14} />
                    </button>
                    {monthMenuOpen ? (
                      <div className="absolute left-0 mt-1 w-36 max-h-60 overflow-y-auto rounded-md card-surface card-surface-raised border border-[var(--field-border)] shadow-card py-1 z-10">
                        {monthOptions.map((month) => (
                          <button
                            key={month.value}
                            type="button"
                            className={`w-full text-left px-3 py-2 text-sm capitalize hover:bg-[var(--field-bg-hover)] ${month.value === viewDate.getMonth() ? "font-semibold text-primary" : "text-[var(--field-text)]"}`}
                            onClick={() => {
                              setViewDate((prev) => new Date(prev.getFullYear(), month.value, 1));
                              setMonthMenuOpen(false);
                            }}
                          >
                            {month.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setYearMenuOpen((prev) => !prev);
                        setMonthMenuOpen(false);
                      }}
                      className="inline-flex items-center gap-1 h-8 px-3 text-sm rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] text-[var(--field-text)] hover:border-[var(--field-border-hover)] hover:bg-[var(--field-bg-hover)] focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-border/80 dark:focus-visible:ring-border/80"
                    >
                      <span>{viewDate.getFullYear()}</span>
                      <IconChevronDown size={14} />
                    </button>
                    {yearMenuOpen ? (
                      <div className="absolute left-0 mt-1 w-28 max-h-60 overflow-y-auto rounded-md card-surface card-surface-raised border border-[var(--field-border)] shadow-card py-1 z-10">
                        {yearOptions.map((year) => (
                          <button
                            key={year}
                            type="button"
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--field-bg-hover)] ${year === viewDate.getFullYear() ? "font-semibold text-primary" : "text-[var(--field-text)]"}`}
                            onClick={() => {
                              setViewDate((prev) => new Date(year, prev.getMonth(), 1));
                              setYearMenuOpen(false);
                            }}
                          >
                            {year}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                <button type="button" onClick={() => setMonthOffset(1)} className="p-1 rounded hover:bg-[var(--field-bg-hover)]">
                  <IconChevronRight size={16} />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 px-3 pt-2 pb-3 text-center">
                {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                  <span key={d} className="text-[11px] uppercase text-lighttext/70 dark:text-darktext/70 tracking-wide">{d}</span>
                ))}
                {calendarDays.map((date) => {
                  const isCurrentMonth = date.getMonth() === viewDate.getMonth();
                  const isSelected = parsedBirthDate ? date.toDateString() === parsedBirthDate.toDateString() : false;
                  const isFuture = date > todayDate;
                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      onClick={() => handleSelectDate(date)}
                      disabled={isFuture}
                      className={`h-9 text-sm rounded-md transition-colors ${isSelected ? "bg-primary text-[var(--color-on-primary)]" : ""} ${!isSelected ? "hover:bg-[var(--field-bg-hover)]" : ""} ${!isCurrentMonth ? "text-lighttext/50 dark:text-darktext/50" : "text-lighttext dark:text-darktext"} ${isFuture ? "opacity-40 cursor-not-allowed hover:bg-transparent" : ""}`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {missing.birthDate ? <p className="text-xs text-[var(--color-danger)] mt-1">Campo requerido</p> : null}
          {errors.birthDate && !missing.birthDate ? <p className="text-xs text-[var(--color-danger)] mt-1">{errors.birthDate}</p> : null}
        </div>
        <Select
          label="Género"
          value={form.gender}
          onChange={(value) => setForm((prev) => ({ ...prev, gender: String(value) }))}
          options={genderOptions}
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        {lastSavedAt ? <span className="text-xs text-lighttext/70 dark:text-darktext/70">Guardado {new Date(lastSavedAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</span> : null}
        <Button onClick={handleSave} loading={saving} disabled={saving} leftIcon={<IconCheck size={16} />}>Guardar perfil</Button>
      </div>

    </div>
  );
};

export default PersonalDataForm;








