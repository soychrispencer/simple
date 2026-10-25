import type { Metadata } from 'next';
import Image from 'next/image';
import {
    IconArrowRight, IconBrandWhatsapp, IconCheck,
    IconDeviceMobile, IconInfoCircle, IconShieldCheck, IconTrendingUp, IconUsers,
} from '@tabler/icons-react';
import { PartnershipForm } from './partnership-form';
import styles from './page.module.css';

export const metadata: Metadata = {
    title: 'Alianzas inmobiliarias | SimplePropiedades',
    description: 'Un canal digital y apoyo comercial para su cartera de venta y arriendo. Evaluemos una alianza directa con inventario autorizado y condiciones acordadas.',
    alternates: { canonical: 'https://simplepropiedades.app/alianzas-inmobiliarias' },
    openGraph: {
        title: 'Alianzas inmobiliarias | SimplePropiedades',
        description: 'Un canal digital y apoyo comercial para venta y arriendo. Evaluemos una alianza directa para su cartera.',
        url: 'https://simplepropiedades.app/alianzas-inmobiliarias',
        images: [{ url: 'https://simplepropiedades.app/hero/projects.jpg', width: 1536, height: 1024, alt: 'Alianzas inmobiliarias con SimplePropiedades' }],
    },
};

const whatsappHref = `https://wa.me/56978623828?text=${encodeURIComponent('Hola, represento a una inmobiliaria y quiero evaluar una alianza con SimplePropiedades para una cartera de venta o arriendo.')}`;
const comparison = [
    { task: 'Publicación autorizada', digital: 'Simple', assisted: 'Simple', included: true },
    { task: 'Atención de consultas', digital: 'Su equipo', assisted: 'Simple, según acuerdo' },
    { task: 'Seguimiento de interesados', digital: 'Su equipo', assisted: 'Simple, según acuerdo' },
    { task: 'Coordinación de visitas', digital: 'Su equipo', assisted: 'Coordinación conjunta' },
    { task: 'Aprobación y contratos', digital: 'Su equipo', assisted: 'Su equipo' },
];

export default function AlianzasInmobiliariasPage() {
    return (
        <div className={styles.landing}>
            <section className={styles.hero} aria-labelledby="partnership-title">
                <Image src="/hero/projects.jpg" alt="" fill priority sizes="100vw" className={styles.heroImage} />
                <div className={`${styles.container} ${styles.heroGrid}`}>
                    <div className={styles.heroCopy}>
                        <p className={styles.eyebrow}>Alianzas para inmobiliarias</p>
                        <h1 id="partnership-title">Su cartera, conectada con nuevas oportunidades.</h1>
                        <p className={styles.heroDescription}>Publicación y apoyo comercial para venta y arriendo, con roles y condiciones acordados directamente.</p>
                        <ul className={styles.heroTrust} aria-label="Bases de la alianza">
                            <li>Inventario autorizado</li><li>Modalidad a elección</li><li>Acuerdo directo</li>
                        </ul>
                    </div>
                    <PartnershipForm />
                </div>
            </section>

            <section className={styles.benefits} aria-labelledby="partnership-value">
                <div className={styles.container}>
                    <p className={styles.eyebrow}>Un aliado para su operación</p>
                    <h2 id="partnership-value">Más valor para su operación.</h2>
                    <div className={styles.benefitGrid}>
                        {[
                            { Icon: IconTrendingUp, title: 'Más presencia', text: 'Sume un canal digital para publicar las unidades que autorice y recibir nuevas consultas.' },
                            { Icon: IconUsers, title: 'Apoyo para su equipo', text: 'Elija entre derivar las consultas a su equipo o sumar atención y seguimiento comercial.' },
                            { Icon: IconShieldCheck, title: 'Control de la operación', text: 'Usted define el inventario, las condiciones y la aprobación final de cada operación.' },
                        ].map(({ Icon, title, text }) => (
                            <div key={title} className={styles.benefit}>
                                <span className={styles.iconCircle}><Icon size={26} stroke={1.7} /></span>
                                <div><h3>{title}</h3><p>{text}</p></div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="modalidades" className={styles.modalities} aria-labelledby="partnership-modalities">
                <div className={styles.container}>
                    <div className={styles.comparisonGrid}>
                        <div className={styles.comparisonIntro}>
                            <p className={styles.eyebrow}>Dos formas de trabajar juntos</p>
                            <h2 id="partnership-modalities">Elija cómo trabajamos juntos.</h2>
                            <p>Puede publicar sus unidades y gestionar directamente las consultas, o sumar a Simple en la atención y el seguimiento comercial.</p>
                            <p>Ambas modalidades aplican a <strong>venta y arriendo</strong>. El alcance y los honorarios se acuerdan con su equipo antes de comenzar.</p>
                        </div>
                        <div className={styles.tableWrap}>
                            <table className={styles.comparisonTable}>
                                <caption className={styles.srOnly}>Responsabilidades por modalidad de alianza, para venta y arriendo</caption>
                                <colgroup><col className={styles.taskColumn} /><col /><col /></colgroup>
                                <thead><tr>
                                    <td aria-hidden="true" />
                                    <th scope="col"><IconDeviceMobile size={27} stroke={1.6} /><span>Canal digital</span><small>Publicación y derivación de consultas.</small></th>
                                    <th scope="col"><IconUsers size={27} stroke={1.6} /><span className={styles.fullModeLabel}>Comercialización asistida</span><span className={styles.shortModeLabel} aria-hidden="true">Asistida</span><small>Publicación y apoyo comercial, según acuerdo.</small></th>
                                </tr></thead>
                                <tbody>{comparison.map((row) => (
                                    <tr key={row.task}>
                                        <th scope="row">{row.task}</th>
                                        <td>{row.included ? <><IconCheck size={17} className={styles.included} aria-hidden="true" /><span className={styles.srOnly}>A cargo de Simple</span></> : row.digital}</td>
                                        <td>{row.included ? <><IconCheck size={17} className={styles.included} aria-hidden="true" /><span className={styles.srOnly}>A cargo de Simple</span></> : row.assisted}</td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    </div>
                    <p className={styles.scopeNote}><IconInfoCircle size={22} stroke={1.7} /><span>La administración posterior del arriendo requiere un acuerdo independiente. Esta alianza se enfoca en la comercialización de las unidades.</span></p>
                </div>
            </section>

            <section className={styles.pilot} aria-labelledby="partnership-pilot">
                <div className={`${styles.container} ${styles.pilotGrid}`}>
                    <div><p className={styles.eyebrow}>Un piloto simple y enfocado</p><h2 id="partnership-pilot">En tres pasos,<br />a su medida.</h2></div>
                    <ol className={styles.steps}>
                        {[
                            { title: 'Definimos la cartera', text: 'Conversamos sobre sus objetivos y el tipo de unidades, en venta, arriendo o ambos.' },
                            { title: 'Acordamos roles', text: 'Definimos la modalidad, la atribución de consultas y las condiciones del piloto.' },
                            { title: 'Activamos el piloto', text: 'Publicamos las unidades autorizadas y revisamos juntos las consultas y el seguimiento.' },
                        ].map((step, index) => <li key={step.title}><span className={styles.stepNumber}>{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}
                    </ol>
                </div>
            </section>

            <section className={styles.finalCta} aria-labelledby="partnership-next-step">
                <div className={`${styles.container} ${styles.finalGrid}`}>
                    <div><p className={styles.eyebrow}>Alianzas para inmobiliarias</p><h2 id="partnership-next-step">Partamos con un piloto<br />a su medida.</h2><p>Conversemos sobre sus objetivos y evaluemos una alianza para su cartera, en venta, arriendo o ambos.</p></div>
                    <div className={styles.finalActions}>
                        <a href="#evaluar-alianza" className={styles.whiteButton}>Evaluar una alianza <IconArrowRight size={18} /></a>
                        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={styles.outlineButton}><IconBrandWhatsapp size={19} /> Hablar por WhatsApp</a>
                        <a href="mailto:hola@simpleplataforma.app?subject=Alianza%20inmobiliaria" className={styles.emailLink}>O escríbanos por correo</a>
                    </div>
                </div>
            </section>
        </div>
    );
}
