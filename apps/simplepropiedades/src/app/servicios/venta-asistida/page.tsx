'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    IconArrowRight,
    IconCheck,
    IconHome2,
    IconKey,
} from '@tabler/icons-react';
import { ModernSelect } from '@simple/ui/forms';
import { PanelBlockHeader } from '@simple/ui/panel';
import { PanelButton, PanelCard, PanelNotice, PanelSegmentedToggle } from '@simple/ui/panel';

type ServiceKind = 'arriendo' | 'compraventa';

const COMMISSION: Record<ServiceKind, { label: string; rate: string; summary: string }> = {
    arriendo: {
        label: 'Arriendo',
        rate: '25% + IVA',
        summary: 'Sobre el primer mes de arriendo al concretar la operación.',
    },
    compraventa: {
        label: 'Compraventa',
        rate: '2% + IVA',
        summary: 'Sobre el valor de venta al cerrar la transacción.',
    },
};

export default function GestionInmobiliariaPage() {
    const [serviceKind, setServiceKind] = useState<ServiceKind>('compraventa');
    const [form, setForm] = useState({
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        locationLabel: '',
        assetType: 'Casa',
        assetArea: '',
        expectedPrice: '',
        notes: '',
        acceptedTerms: true,
    });
    const [message, setMessage] = useState<string | null>(null);
    const commission = COMMISSION[serviceKind];

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage(null);

        const subject = encodeURIComponent(`Gestión inmobiliaria · ${commission.label}`);
        const body = encodeURIComponent([
            `Operación: ${commission.label}`,
            `Comisión referencial: ${commission.rate}`,
            '',
            `Nombre: ${form.contactName}`,
            `Correo: ${form.contactEmail}`,
            `Teléfono: ${form.contactPhone}`,
            `Comuna: ${form.locationLabel || '—'}`,
            `Tipo: ${form.assetType || '—'}`,
            `Superficie: ${form.assetArea || '—'}`,
            `Precio esperado: ${form.expectedPrice || '—'}`,
            '',
            form.notes || '',
        ].join('\n'));
        window.location.href = `mailto:hola@simpleplataforma.app?subject=${subject}&body=${body}`;
        setMessage('Abriendo tu cliente de correo para enviar la solicitud.');
    }

    return (
        <div className="flex flex-col">
            <section style={{ background: 'var(--bg)' }}>
                <div className="container-app py-10 sm:py-12">
                    <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
                        <div className="max-w-xl">
                            <p className="mb-2 text-sm font-medium" style={{ color: 'var(--fg-muted)' }}>Servicios · Gestión inmobiliaria</p>
                            <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: 'var(--fg)' }}>
                                Delega tu {serviceKind === 'arriendo' ? 'arriendo' : 'venta'}
                            </h1>
                            <p className="text-sm sm:text-base" style={{ color: 'var(--fg-secondary)' }}>
                                Publicamos, filtramos interesados y te acompañamos al cierre. Comisión {commission.rate}.
                            </p>
                            <div
                                className="mt-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
                                style={{ borderColor: 'var(--accent-border)', background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                            >
                                {serviceKind === 'arriendo' ? <IconKey size={16} /> : <IconHome2 size={16} />}
                                {commission.rate}
                            </div>
                        </div>
                        <div
                            className="overflow-hidden rounded-[1.5rem] border"
                            style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow-lg)' }}
                        >
                            <img
                                src="/hero/servicios-gestion.svg"
                                alt="Gestión inmobiliaria"
                                width={1600}
                                height={900}
                                className="aspect-[16/10] w-full object-cover"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section style={{ background: 'var(--bg-subtle)' }}>
                <div className="container-app py-10 sm:py-12">
                    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
                        <div className="space-y-6">
                            <PanelCard size="lg">
                                <PanelBlockHeader title="Tipo de operación" description="Selecciona arriendo o compraventa." className="mb-5" />
                                <PanelSegmentedToggle
                                    items={[
                                        { key: 'compraventa', label: 'Compraventa' },
                                        { key: 'arriendo', label: 'Arriendo' },
                                    ]}
                                    activeKey={serviceKind}
                                    onChange={(value) => setServiceKind(value as ServiceKind)}
                                />
                                <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Comisión: {commission.rate}</p>
                                    <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>{commission.summary}</p>
                                </div>
                                <ul className="mt-5 space-y-2">
                                    {['Evaluación de la propiedad', 'Publicación y difusión', 'Gestión de interesados', 'Acompañamiento al cierre'].map((item) => (
                                        <li key={item} className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                            <IconCheck size={14} style={{ color: 'var(--fg-muted)' }} />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </PanelCard>

                            <PanelCard size="md">
                                <PanelBlockHeader title="Proceso" className="mb-4" />
                                <div className="grid gap-3 sm:grid-cols-3">
                                    {[
                                        { title: '1. Solicitud', desc: 'Nos cuentas de la propiedad.' },
                                        { title: '2. Publicación', desc: 'Activamos la gestión.' },
                                        { title: '3. Cierre', desc: 'Negociamos y concretamos.' },
                                    ].map((step) => (
                                        <div key={step.title} className="rounded-2xl p-4" style={{ border: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{step.title}</p>
                                            <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>{step.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </PanelCard>
                        </div>

                        <PanelCard size="lg" className="lg:sticky lg:top-24">
                            <PanelBlockHeader title="Solicitar evaluación" description="Te contactamos para revisar tu caso." className="mb-5" />
                            <form className="space-y-4" onSubmit={handleSubmit}>
                                <Field label="Nombre *" placeholder="Tu nombre" value={form.contactName} onChange={(value) => setForm((c) => ({ ...c, contactName: value }))} />
                                <Field label="Teléfono *" placeholder="+56 9 1234 5678" value={form.contactPhone} onChange={(value) => setForm((c) => ({ ...c, contactPhone: value }))} />
                                <Field label="Correo *" placeholder="nombre@correo.com" type="email" value={form.contactEmail} onChange={(value) => setForm((c) => ({ ...c, contactEmail: value }))} />
                                <Field label="Comuna" placeholder="Providencia" value={form.locationLabel} onChange={(value) => setForm((c) => ({ ...c, locationLabel: value }))} />
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Tipo">
                                        <ModernSelect
                                            value={form.assetType}
                                            onChange={(value) => setForm((c) => ({ ...c, assetType: value }))}
                                            options={['Casa', 'Departamento', 'Oficina', 'Terreno', 'Local'].map((o) => ({ value: o, label: o }))}
                                            ariaLabel="Tipo de propiedad"
                                        />
                                    </Field>
                                    <Field label="m²" placeholder="120" value={form.assetArea} onChange={(value) => setForm((c) => ({ ...c, assetArea: value }))} />
                                </div>
                                <Field
                                    label={serviceKind === 'arriendo' ? 'Arriendo esperado' : 'Precio esperado'}
                                    placeholder={serviceKind === 'arriendo' ? '$850.000' : '5.200 UF'}
                                    value={form.expectedPrice}
                                    onChange={(value) => setForm((c) => ({ ...c, expectedPrice: value }))}
                                />
                                <Field label="Detalles (opcional)">
                                    <textarea
                                        className="form-textarea"
                                        rows={3}
                                        placeholder="Estado, orientación u otros datos."
                                        value={form.notes}
                                        onChange={(event) => setForm((c) => ({ ...c, notes: event.target.value }))}
                                    />
                                </Field>
                                <label className="flex items-start gap-2 text-xs leading-snug" style={{ color: 'var(--fg-muted)' }}>
                                    <input
                                        type="checkbox"
                                        className="mt-0.5"
                                        checked={form.acceptedTerms}
                                        onChange={(event) => setForm((c) => ({ ...c, acceptedTerms: event.target.checked }))}
                                    />
                                    Acepto que SimplePropiedades me contacte para evaluar la gestión.
                                </label>
                                {message ? <PanelNotice>{message}</PanelNotice> : null}
                                <PanelButton type="submit" variant="primary" className="w-full" disabled={!form.acceptedTerms}>
                                    Enviar solicitud
                                    <IconArrowRight size={14} />
                                </PanelButton>
                                <p className="text-center text-xs" style={{ color: 'var(--fg-muted)' }}>
                                    Sin operación concretada, sin cobro.
                                </p>
                            </form>
                        </PanelCard>
                    </div>

                    <p className="mt-8 text-center text-sm" style={{ color: 'var(--fg-muted)' }}>
                        <Link href="/servicios" className="underline underline-offset-2">Volver a servicios</Link>
                    </p>
                </div>
            </section>
        </div>
    );
}

function Field(props: {
    label: string;
    placeholder?: string;
    type?: string;
    value?: string;
    onChange?: (value: string) => void;
    children?: React.ReactNode;
}) {
    return (
        <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--fg-secondary)' }}>{props.label}</label>
            {props.children ?? (
                <input
                    type={props.type ?? 'text'}
                    className="form-input"
                    placeholder={props.placeholder}
                    value={props.value ?? ''}
                    onChange={(event) => props.onChange?.(event.target.value)}
                />
            )}
        </div>
    );
}
