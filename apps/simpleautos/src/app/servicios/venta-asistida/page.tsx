'use client';

import { useState } from 'react';
import {
    IconArrowRight, IconBrandFacebook, IconBrandInstagram, IconBrandTiktok, IconBrandWhatsapp, IconCheck, IconClock, IconCoin, IconShieldCheck, } from '@tabler/icons-react';
import { PublicMarketingShell } from '@simple/ui/layout';
import { PanelBlockHeader, PanelButton, PanelCard, PanelNotice, PanelSegmentedToggle } from '@simple/ui/panel';

type Plan = 'basico' | 'premium';

export default function VentaAsistidaPage() {
    const [plan, setPlan] = useState<Plan>('basico');
    const [form, setForm] = useState({
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        locationLabel: '',
        assetBrand: '',
        assetModel: '',
        assetYear: '',
        assetMileage: '',
        expectedPrice: '',
        notes: '',
        acceptedTerms: true,
    });
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const benefits = plan === 'basico' ? BASIC_BENEFITS : PREMIUM_BENEFITS;

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage(null);
        setError(null);

        const subject = encodeURIComponent(`Venta asistida (${plan})`);
        const body = encodeURIComponent([
            `Nombre: ${form.contactName}`,
            `Correo: ${form.contactEmail}`,
            `Teléfono: ${form.contactPhone}`,
            `Ubicación: ${form.locationLabel || '—'}`,
            `Vehículo: ${[form.assetBrand, form.assetModel, form.assetYear].filter(Boolean).join(' ') || '—'}`,
            `Kilometraje: ${form.assetMileage || '—'}`,
            `Precio esperado: ${form.expectedPrice || '—'}`,
            '',
            form.notes || '',
        ].join('\n'));
        window.location.href = `mailto:hola@simpleplataforma.app?subject=${subject}&body=${body}`;
        setMessage('Abriendo tu cliente de correo para enviar la solicitud.');
    }

    return (
        <PublicMarketingShell
            eyebrow="Servicios · Venta asistida"
            title="Vendemos tu auto por ti"
            intro="Tú mantienes el auto hasta la venta. Nosotros gestionamos publicación, negociación y coordinación. Comisión solo si se vende."
        >
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
                <div className="space-y-6">
                    <PanelCard size="lg">
                        <PanelBlockHeader title="Plan de servicio" description="Elige el nivel de acompañamiento que necesitas." className="mb-5" />
                        <PanelSegmentedToggle
                            items={[
                                { key: 'basico', label: 'Básico' },
                                { key: 'premium', label: 'Premium' },
                            ]}
                            activeKey={plan}
                            onChange={(value) => setPlan(value as Plan)}
                        />
                        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {benefits.map((benefit) => (
                                <div key={benefit.title} className="panel-benefit-cell">
                                    <div className="flex items-start gap-2">
                                        <IconCheck size={14} className="mt-0.5 shrink-0 text-(--fg-muted)" />
                                        <div>
                                            <p className="text-sm font-semibold text-(--fg)">{benefit.title}</p>
                                            <p className="mt-0.5 text-sm text-(--fg-secondary)">{benefit.description}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </PanelCard>

                    {plan === 'premium' ? (
                        <PanelCard size="md">
                            <PanelBlockHeader title="Difusión multicanal" description="Fotos profesionales, video y publicación en los principales canales." className="mb-4" />
                            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                {[
                                    { icon: <IconBrandInstagram size={16} />, label: 'Instagram' },
                                    { icon: <IconBrandTiktok size={16} />, label: 'TikTok' },
                                    { icon: <IconBrandFacebook size={16} />, label: 'Facebook' },
                                    { icon: <IconBrandWhatsapp size={16} />, label: 'WhatsApp' },
                                ].map((channel) => (
                                    <div key={channel.label} className="panel-channel-chip">
                                        {channel.icon}
                                        {channel.label}
                                    </div>
                                ))}
                            </div>
                        </PanelCard>
                    ) : null}

                    <PanelCard size="md">
                        <PanelBlockHeader title="Proceso" className="mb-4" />
                        <div className="space-y-4">
                            {TIMELINE.map((step, index) => (
                                <div key={step.title} className="flex items-start gap-3">
                                    <div className="flex flex-col items-center">
                                        <div className="panel-step-marker">{index + 1}</div>
                                        {index < TIMELINE.length - 1 ? <div className="panel-step-connector" /> : null}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-(--fg)">{step.title}</p>
                                        <p className="text-sm text-(--fg-muted)">{step.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </PanelCard>
                </div>

                <PanelCard size="lg">
                    <PanelBlockHeader title="Solicita una evaluación" description="Déjanos tus datos y te contactamos para revisar el vehículo." className="mb-5" />
                    <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field label="Nombre completo *" placeholder="Tu nombre" value={form.contactName} onChange={(value) => setForm((current) => ({ ...current, contactName: value }))} />
                            <Field label="Teléfono *" placeholder="+56 9 1234 5678" value={form.contactPhone} onChange={(value) => setForm((current) => ({ ...current, contactPhone: value }))} />
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field label="Correo electrónico *" placeholder="nombre@correo.com" type="email" value={form.contactEmail} onChange={(value) => setForm((current) => ({ ...current, contactEmail: value }))} />
                            <Field label="Comuna o ciudad" placeholder="Santiago" value={form.locationLabel} onChange={(value) => setForm((current) => ({ ...current, locationLabel: value }))} />
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <Field label="Marca" placeholder="Toyota" value={form.assetBrand} onChange={(value) => setForm((current) => ({ ...current, assetBrand: value }))} />
                            <Field label="Modelo" placeholder="Corolla" value={form.assetModel} onChange={(value) => setForm((current) => ({ ...current, assetModel: value }))} />
                            <Field label="Año" placeholder="2020" value={form.assetYear} onChange={(value) => setForm((current) => ({ ...current, assetYear: value }))} />
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field label="Kilometraje" placeholder="85.000 km" value={form.assetMileage} onChange={(value) => setForm((current) => ({ ...current, assetMileage: value }))} />
                            <Field label="Precio esperado" placeholder="$9.500.000" value={form.expectedPrice} onChange={(value) => setForm((current) => ({ ...current, expectedPrice: value }))} />
                        </div>
                        <Field label="Estado y detalles">
                            <textarea
                                className="form-textarea"
                                rows={4}
                                placeholder="Mantenciones, estado general y cualquier detalle relevante."
                                value={form.notes}
                                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                            />
                        </Field>
                        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                            <input
                                type="checkbox"
                                checked={form.acceptedTerms}
                                onChange={(event) => setForm((current) => ({ ...current, acceptedTerms: event.target.checked }))}
                            />
                            Acepto que SimpleAutos me contacte para evaluar y gestionar la venta.
                        </label>
                        {error ? <PanelNotice>{error}</PanelNotice> : null}
                        {message ? <PanelNotice>{message}</PanelNotice> : null}
                        <PanelButton type="submit" variant="primary" className="w-full" disabled={submitting || !form.acceptedTerms}>
                            Enviar solicitud
                            <IconArrowRight size={14} />
                        </PanelButton>
                        <PanelNotice className="text-center">
                            Sin cobro si no se concreta la venta. Plan seleccionado: <span className="font-medium capitalize">{plan}</span>.
                        </PanelNotice>
                    </form>
                </PanelCard>
            </div>

            <section className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                    { icon: <IconClock size={18} />, title: 'Más velocidad', description: 'Publicación optimizada y respuesta rápida a interesados.' },
                    { icon: <IconShieldCheck size={18} />, title: 'Transparencia total', description: 'Acompañamiento y decisiones contigo. Sin sorpresas.' },
                    { icon: <IconCoin size={18} />, title: 'Pago solo al vender', description: 'Modelo por comisión: si no hay venta, no hay cobro.' },
                ].map((feature) => (
                    <PanelCard key={feature.title} size="md">
                        <div className="mb-2" style={{ color: 'var(--fg-muted)' }}>{feature.icon}</div>
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{feature.title}</h3>
                        <p className="mt-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>{feature.description}</p>
                    </PanelCard>
                ))}
            </section>
        </PublicMarketingShell>
    );
}

function Field(props: { label: string; placeholder?: string; type?: string; value?: string; onChange?: (value: string) => void; children?: React.ReactNode }) {
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

const BASIC_BENEFITS = [
    { title: 'Evaluación y estrategia', description: 'Revisamos tu caso y definimos el plan.' },
    { title: 'Gestión de interesados', description: 'Filtramos, respondemos y coordinamos.' },
    { title: 'Tu auto siempre contigo', description: 'No entregas el vehículo hasta concretar.' },
    { title: 'Comisión solo al vender', description: 'Si no hay venta, no hay cobro.' },
];

const PREMIUM_BENEFITS = [
    ...BASIC_BENEFITS,
    { title: 'Fotos profesionales', description: 'Sesión fotográfica con equipo profesional.' },
    { title: 'Video HD', description: 'Video completo del vehículo para redes.' },
    { title: 'Publicación multicanal', description: 'Instagram, TikTok, Facebook y WhatsApp.' },
    { title: 'Publicidad destacada', description: 'Tu vehículo en posición premium por 30 días.' },
];

const TIMELINE = [
    { title: 'Solicitud', description: 'Envías tus datos y detalles del vehículo.' },
    { title: 'Evaluación', description: 'Revisamos y definimos estrategia de venta.' },
    { title: 'Publicación', description: 'Creamos la publicación optimizada.' },
    { title: 'Interesados', description: 'Gestionamos consultas y coordinamos visitas.' },
    { title: 'Cierre', description: 'Negociamos y cerramos la venta contigo.' },
];
