'use client';

import { useState } from 'react';
import {
    IconArrowRight,
    IconBrandFacebook,
    IconBrandInstagram,
    IconBrandTiktok,
    IconBrandWhatsapp,
    IconCheck,
    IconClock,
    IconCoin,
    IconShieldCheck,
} from '@tabler/icons-react';
import ModernSelect from '@/components/ui/modern-select';
import { submitServiceLead } from '@/lib/service-leads';
import { PanelBlockHeader, PanelButton, PanelCard, PanelNotice, PanelSegmentedToggle } from '@simple/ui';

type Plan = 'basico' | 'premium';

export default function VentaAsistidaPage() {
    const [plan, setPlan] = useState<Plan>('basico');
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
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const benefits = plan === 'basico' ? BASIC_BENEFITS : PREMIUM_BENEFITS;

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        setMessage(null);

        const result = await submitServiceLead({
            vertical: 'propiedades',
            serviceType: 'gestion_inmobiliaria',
            planId: plan,
            contactName: form.contactName,
            contactEmail: form.contactEmail,
            contactPhone: form.contactPhone,
            locationLabel: form.locationLabel || null,
            assetType: form.assetType || null,
            assetArea: form.assetArea || null,
            expectedPrice: form.expectedPrice || null,
            notes: form.notes || null,
            sourcePage: '/servicios/venta-asistida',
            acceptedTerms: true,
        });

        setSubmitting(false);
        if (!result.ok) {
            setError(result.error || 'No pudimos enviar tu solicitud.');
            return;
        }

        setMessage('Solicitud enviada. El lead ya quedo disponible en SimpleAdmin.');
        setForm({
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
    }

    return (
        <div className="container-app py-12">
            <div className="mb-10 max-w-3xl">
                <p className="mb-3 text-sm font-medium" style={{ color: 'var(--fg-muted)' }}>Servicios · Gestión inmobiliaria</p>
                <h1 className="mb-2 text-3xl font-semibold md:text-4xl" style={{ color: 'var(--fg)' }}>Vendemos tu propiedad por ti</h1>
                <p className="text-base" style={{ color: 'var(--fg-secondary)' }}>
                    Tú mantienes la propiedad. Nosotros gestionamos publicación, visitas, negociación y cierre. Comisión solo si se vende.
                </p>
            </div>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
                <div className="space-y-6">
                    <PanelCard size="lg">
                        <PanelBlockHeader title="Plan de servicio" description="Escoge el nivel de gestión que quieres delegar." className="mb-5" />
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
                                <div key={benefit.title} className="rounded-2xl p-4" style={{ border: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                                    <div className="flex items-start gap-2">
                                        <IconCheck size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--fg-muted)' }} />
                                        <div>
                                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{benefit.title}</p>
                                            <p className="mt-0.5 text-sm" style={{ color: 'var(--fg-secondary)' }}>{benefit.description}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </PanelCard>

                    {plan === 'premium' ? (
                        <PanelCard size="md">
                            <PanelBlockHeader title="Difusión multicanal" description="Fotos profesionales, tour virtual y publicación en los principales canales." className="mb-4" />
                            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                {[
                                    { icon: <IconBrandInstagram size={16} />, label: 'Instagram' },
                                    { icon: <IconBrandTiktok size={16} />, label: 'TikTok' },
                                    { icon: <IconBrandFacebook size={16} />, label: 'Facebook' },
                                    { icon: <IconBrandWhatsapp size={16} />, label: 'WhatsApp' },
                                ].map((channel) => (
                                    <div key={channel.label} className="flex items-center gap-2 rounded-2xl px-3 py-3 text-sm" style={{ border: '1px solid var(--border)', color: 'var(--fg-secondary)' }}>
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
                                        <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold" style={{ background: 'var(--fg)', color: 'var(--bg)' }}>
                                            {index + 1}
                                        </div>
                                        {index < TIMELINE.length - 1 ? <div className="mt-1 h-6 w-px" style={{ background: 'var(--border)' }} /> : null}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{step.title}</p>
                                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{step.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </PanelCard>
                </div>

                <PanelCard size="lg">
                    <PanelBlockHeader title="Solicita una evaluación" description="Déjanos tus datos y te contactamos para revisar la propiedad." className="mb-5" />
                    <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field label="Nombre completo *" placeholder="Tu nombre" value={form.contactName} onChange={(value) => setForm((current) => ({ ...current, contactName: value }))} />
                            <Field label="Teléfono *" placeholder="+56 9 1234 5678" value={form.contactPhone} onChange={(value) => setForm((current) => ({ ...current, contactPhone: value }))} />
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field label="Correo electrónico *" placeholder="nombre@correo.com" type="email" value={form.contactEmail} onChange={(value) => setForm((current) => ({ ...current, contactEmail: value }))} />
                            <Field label="Comuna" placeholder="Providencia" value={form.locationLabel} onChange={(value) => setForm((current) => ({ ...current, locationLabel: value }))} />
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <Field label="Tipo de propiedad">
                                <ModernSelect
                                    value={form.assetType}
                                    onChange={(value) => setForm((current) => ({ ...current, assetType: value }))}
                                    options={['Casa', 'Departamento', 'Oficina', 'Terreno', 'Local'].map((option) => ({ value: option, label: option }))}
                                    ariaLabel="Tipo de propiedad"
                                />
                            </Field>
                            <Field label="Superficie referencial (m²)" placeholder="120" value={form.assetArea} onChange={(value) => setForm((current) => ({ ...current, assetArea: value }))} />
                            <Field label="Precio esperado (UF)" placeholder="5.200" value={form.expectedPrice} onChange={(value) => setForm((current) => ({ ...current, expectedPrice: value }))} />
                        </div>
                        <Field label="Estado y detalles">
                            <textarea
                                className="form-textarea"
                                rows={4}
                                placeholder="Programa, estado general, orientación o detalles relevantes."
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
                            Acepto que SimplePropiedades me contacte para evaluar y gestionar la venta.
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
                    { icon: <IconClock size={18} />, title: 'Más velocidad', description: 'Publicación optimizada y gestión rápida de interesados.' },
                    { icon: <IconShieldCheck size={18} />, title: 'Transparencia', description: 'Acompañamiento y decisiones contigo en todo momento.' },
                    { icon: <IconCoin size={18} />, title: 'Pago al vender', description: 'Modelo por comisión: sin venta, sin cobro.' },
                ].map((feature) => (
                    <PanelCard key={feature.title} size="md">
                        <div className="mb-2" style={{ color: 'var(--fg-muted)' }}>{feature.icon}</div>
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{feature.title}</h3>
                        <p className="mt-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>{feature.description}</p>
                    </PanelCard>
                ))}
            </section>
        </div>
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
    { title: 'Evaluación profesional', description: 'Revisamos la propiedad y definimos estrategia.' },
    { title: 'Gestión de interesados', description: 'Filtrado, respuesta y coordinación de visitas.' },
    { title: 'Tu propiedad contigo', description: 'No entregas hasta concretar la venta.' },
    { title: 'Comisión al vender', description: 'Si no se vende, no se cobra.' },
];

const PREMIUM_BENEFITS = [
    ...BASIC_BENEFITS,
    { title: 'Fotos profesionales', description: 'Sesión fotográfica con equipo profesional.' },
    { title: 'Tour virtual 360°', description: 'Recorrido interactivo de la propiedad.' },
    { title: 'Publicación multicanal', description: 'Instagram, TikTok, Facebook y WhatsApp.' },
    { title: 'Posición premium', description: 'Destacada en inicio y búsquedas por 30 días.' },
];

const TIMELINE = [
    { title: 'Solicitud', description: 'Envías datos de la propiedad.' },
    { title: 'Evaluación', description: 'Visita y valoración presencial.' },
    { title: 'Publicación', description: 'Creación optimizada del listing.' },
    { title: 'Interesados', description: 'Gestión de visitas y consultas.' },
    { title: 'Cierre', description: 'Negociación y firma con acompañamiento.' },
];
