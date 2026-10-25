import type { Metadata } from 'next';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import {
    IconArrowRight,
    IconBuildingCommunity,
    IconDeviceMobile,
    IconHome,
    IconKey,
    IconUsers,
} from '@tabler/icons-react';
import { PanelBlockHeader, PanelCard } from '@simple/ui/panel';

const linkButtonClassName = 'panel-button inline-flex h-12 items-center justify-center gap-2 border px-6 text-sm font-medium transition-[background,color,border-color,box-shadow,transform] duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10';
const primaryLinkStyle = {
    '--panel-btn-bg': 'var(--button-primary-bg)',
    '--panel-btn-color': 'var(--button-primary-color)',
    '--panel-btn-border': 'var(--button-primary-border)',
    '--panel-btn-shadow': 'var(--button-primary-shadow)',
    '--panel-btn-hover-bg': 'var(--button-primary-hover-bg)',
    '--panel-btn-hover-color': 'var(--button-primary-hover-color)',
    '--panel-btn-hover-border': 'var(--button-primary-hover-border)',
    '--panel-btn-hover-shadow': 'var(--button-primary-hover-shadow)',
} as CSSProperties;
const secondaryLinkStyle = {
    '--panel-btn-bg': 'var(--surface)',
    '--panel-btn-color': 'var(--fg)',
    '--panel-btn-border': 'var(--border)',
    '--panel-btn-hover-bg': 'var(--bg-subtle)',
    '--panel-btn-hover-color': 'var(--fg)',
    '--panel-btn-hover-border': 'var(--border-strong)',
    '--panel-btn-hover-shadow': 'var(--shadow-xs)',
} as CSSProperties;

export const metadata: Metadata = {
    title: 'Alianzas inmobiliarias | SimplePropiedades',
    description: 'Publica inventario inmobiliario autorizado en SimplePropiedades o suma apoyo de comercialización para venta y arriendo.',
};

const message = encodeURIComponent(
    'Hola, represento a una inmobiliaria y quiero conversar sobre una alianza con SimplePropiedades para venta o arriendo.'
);

const whatsappHref = `https://wa.me/56978623828?text=${message}`;

export default function AlianzasInmobiliariasPage() {
    return (
        <main>
            <section style={{ background: 'var(--bg)' }}>
                <div className="container-app py-12 sm:py-16">
                    <div className="mx-auto max-w-4xl text-center">
                        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--fg-muted)' }}>
                            Alianzas para inmobiliarias
                        </p>
                        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl" style={{ color: 'var(--fg)' }}>
                            Un canal comercial que se adapta a su equipo.
                        </h1>
                        <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--fg-secondary)' }}>
                            Sume inventario autorizado a SimplePropiedades y elija el nivel de apoyo que necesita. Puede comenzar con un piloto acotado en venta, arriendo o ambos, con funciones y condiciones acordadas directamente.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={linkButtonClassName} style={primaryLinkStyle}>
                                Conversar por WhatsApp <IconArrowRight size={15} />
                            </a>
                            <a href="mailto:hola@simpleplataforma.app?subject=Alianza%20inmobiliaria%20con%20SimplePropiedades" className={linkButtonClassName} style={secondaryLinkStyle}>
                                Escribir por correo
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            <section id="modalidades" className="marketplace-section-bg">
                <div className="container-app py-12 sm:py-16">
                    <PanelBlockHeader
                        title="Dos modalidades, responsabilidades claras"
                        description="Puede elegir una modalidad distinta para cada cartera u operación. Los detalles comerciales se definen en conjunto antes de publicar."
                        className="mb-7"
                    />
                    <div className="grid gap-5 lg:grid-cols-2">
                        <PanelCard size="lg" className="h-full">
                            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}>
                                <IconDeviceMobile size={22} />
                            </div>
                            <h2 className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>1. Canal digital</h2>
                            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                                Simple publica y difunde las propiedades que la inmobiliaria autoriza. Las consultas se derivan a su equipo y acordamos previamente cómo registrar su origen.
                            </p>
                            <ul className="mt-5 list-disc space-y-3 pl-5 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                <li>Inventario, precios, disponibilidad e imágenes aprobados por la inmobiliaria.</li>
                                <li>Derivación de consultas y mecanismo de atribución acordados con el aliado.</li>
                                <li>La inmobiliaria responde, coordina visitas, negocia y formaliza.</li>
                                <li>Permite probar el canal con una selección de unidades autorizadas.</li>
                            </ul>
                        </PanelCard>

                        <PanelCard size="lg" className="h-full">
                            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}>
                                <IconUsers size={22} />
                            </div>
                            <h2 className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>2. Comercialización asistida</h2>
                            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                                Además de difundir el inventario, Simple puede apoyar la atención inicial, calificación de interesados, seguimiento y coordinación de visitas, dentro del alcance que se acuerde.
                            </p>
                            <ul className="mt-5 list-disc space-y-3 pl-5 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                <li>Atención y seguimiento inicial para reducir consultas sin respuesta.</li>
                                <li>Calificación y coordinación de visitas con criterios definidos por la inmobiliaria.</li>
                                <li>Apoyo comercial hasta la oferta y cierre en venta, o hasta la firma del arriendo.</li>
                                <li>La inmobiliaria mantiene la decisión final y formaliza los contratos; la administración posterior del arriendo no está incluida.</li>
                            </ul>
                        </PanelCard>
                    </div>
                </div>
            </section>

            <section className="container-app py-12 sm:py-16">
                <PanelBlockHeader
                    title="Venta y arriendo, con el alcance correspondiente"
                    description="El canal puede ser digital o asistido en ambas líneas. El equipo y las tareas se definen por operación."
                    className="mb-7"
                />
                <div className="grid gap-5 lg:grid-cols-2">
                    <PanelCard size="md" className="h-full">
                        <div className="mb-3 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
                            <IconHome size={20} />
                            <h3 className="text-lg font-semibold">Venta</h3>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                            En canal digital, Simple deriva las consultas y la inmobiliaria se encarga de visitas, negociación y cierre. En modalidad asistida, podemos sumar atención y seguimiento de prospectos, coordinación comercial y apoyo durante el proceso hasta el cierre, según el acuerdo.
                        </p>
                    </PanelCard>
                    <PanelCard size="md" className="h-full">
                        <div className="mb-3 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
                            <IconKey size={20} />
                            <h3 className="text-lg font-semibold">Arriendo</h3>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                            En canal digital, la inmobiliaria recibe y gestiona las consultas. En modalidad asistida, podemos apoyar la captación y calificación conforme a sus criterios, las visitas y el seguimiento hasta la firma. La administración del inmueble después de firmado el contrato no está incluida, salvo acuerdo independiente.
                        </p>
                    </PanelCard>
                </div>
            </section>

            <section className="marketplace-section-bg">
                <div className="container-app py-12 sm:py-16">
                    <PanelBlockHeader
                        title="Un piloto simple y medible"
                        description="Partimos por un conjunto de propiedades autorizado y revisamos los resultados antes de ampliar la colaboración."
                        className="mb-7"
                    />
                    <div className="grid gap-4 md:grid-cols-3">
                        {[
                            { number: '01', title: 'Definimos el alcance', description: 'Elegimos cartera, comunas, modalidad, responsables, atribución y condiciones comerciales.' },
                            { number: '02', title: 'Activamos el piloto', description: 'Validamos contenido, disponibilidad y contacto para publicar y derivar consultas correctamente.' },
                            { number: '03', title: 'Revisamos y ajustamos', description: 'Evaluamos consultas, seguimiento y aprendizajes para decidir juntos los próximos pasos.' },
                        ].map((step) => (
                            <PanelCard key={step.number} size="md" className="h-full">
                                <p className="text-sm font-semibold" style={{ color: 'var(--fg-muted)' }}>{step.number}</p>
                                <h3 className="mt-2 text-base font-semibold" style={{ color: 'var(--fg)' }}>{step.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>{step.description}</p>
                            </PanelCard>
                        ))}
                    </div>
                    <div className="mt-6 rounded-xl border p-5 sm:p-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                        <div className="flex items-start gap-3">
                            <IconBuildingCommunity size={20} style={{ color: 'var(--fg-muted)', flex: 'none', marginTop: 2 }} />
                            <div>
                                <h3 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Inventario y atribución transparentes</h3>
                                <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                                    Publicamos solo unidades autorizadas y acordamos previamente el uso de material, actualización de disponibilidad, derivación de prospectos, seguimiento y cualquier comisión o tarifa aplicable. No se asumen exclusividad ni condiciones comerciales sin un acuerdo expreso.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={linkButtonClassName} style={primaryLinkStyle}>
                            Proponer una alianza <IconArrowRight size={15} />
                        </a>
                        <Link href="/ventas" className={linkButtonClassName} style={secondaryLinkStyle}>
                            Ver SimplePropiedades
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
