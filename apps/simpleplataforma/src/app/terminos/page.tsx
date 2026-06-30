import type { Metadata } from 'next';
import { LegalDocumentLayout, legalContactEmail } from '@/components/legal-document-layout';

export const metadata: Metadata = {
    title: 'Términos y condiciones',
    description:
        'Términos y condiciones de uso del ecosistema Simple Plataforma y sus aplicaciones asociadas.',
};

export default function TerminosPage() {
    const email = legalContactEmail();

    return (
        <LegalDocumentLayout title="Términos y condiciones">
            <p>
                Los presentes términos regulan el acceso y uso de <strong>simpleplataforma.app</strong> y de las
                aplicaciones del ecosistema <strong>Simple</strong> operadas bajo la misma plataforma tecnológica. Al
                registrarte, iniciar sesión o utilizar cualquiera de nuestros servicios, declaras haber leído y aceptado
                estos términos.
            </p>

            <h2>1. Identificación del servicio</h2>
            <p>
                <strong>Simple Plataforma</strong> es el hub del ecosistema que integra, entre otras, las verticales:
            </p>
            <ul>
                <li>
                    <strong>SimpleAutos</strong> — publicación y búsqueda de vehículos (simpleautos.app).
                </li>
                <li>
                    <strong>SimplePropiedades</strong> — publicación y búsqueda de propiedades (simplepropiedades.app).
                </li>
                <li>
                    <strong>SimpleAgenda</strong> — agenda y reservas para profesionales (simpleagenda.app).
                </li>
                <li>
                    <strong>SimpleSerenatas</strong> — gestión de serenatas y servicios musicales (simpleserenatas.app).
                </li>
            </ul>
            <p>
                La API central (<strong>api.simpleplataforma.app</strong>) provee autenticación, almacenamiento, pagos e
                integraciones compartidas. Cada vertical puede incluir condiciones adicionales propias del rubro; en
                caso de conflicto sobre una función específica de esa app, prevalecerán las condiciones particulares de
                la vertical.
            </p>

            <h2>2. Capacidad y registro</h2>
            <p>
                Debes ser mayor de 18 años o contar con capacidad legal para contratar en Chile. Te comprometes a
                proporcionar información veraz y mantener actualizados tus datos de contacto. Eres responsable de la
                confidencialidad de tus credenciales y de toda actividad realizada desde tu cuenta.
            </p>

            <h2>3. Uso permitido</h2>
            <p>Está prohibido utilizar la plataforma para:</p>
            <ul>
                <li>Actividades ilegales, fraudulentas o que vulneren derechos de terceros.</li>
                <li>Publicar contenido falso, engañoso, difamatorio o que infrinja propiedad intelectual.</li>
                <li>Intentar acceder sin autorización a sistemas, cuentas o datos de otros usuarios.</li>
                <li>Automatizar scraping o uso masivo que degrade el servicio sin autorización previa.</li>
                <li>Eludir medidas de seguridad, límites de planes o restricciones técnicas.</li>
            </ul>

            <h2>4. Contenido y publicaciones</h2>
            <p>
                El usuario conserva la titularidad del contenido que publica, pero otorga a Simple una licencia no
                exclusiva, mundial y gratuita para alojar, mostrar, reproducir y distribuir dicho contenido en la medida
                necesaria para operar el servicio (incluidas miniaturas, indexación y respaldos).
            </p>
            <p>
                Simple puede moderar, ocultar o eliminar contenido que viole estos términos, la ley o políticas de la
                vertical, sin perjuicio de acciones legales adicionales.
            </p>

            <h2>5. Planes, pagos y reembolsos</h2>
            <p>
                Algunas funciones requieren planes de pago procesados por terceros (p. ej. Mercado Pago). Los precios,
                periodicidad y beneficios se informan antes de contratar. Salvo obligación legal en contrario, los pagos
                por períodos ya iniciados no son reembolsables por cancelación voluntaria a mitad de ciclo. El usuario
                puede cancelar la renovación futura según las opciones disponibles en su panel.
            </p>

            <h2>6. Integraciones de terceros</h2>
            <p>
                Al conectar servicios externos (Google, Instagram, WhatsApp, mapas, etc.), aceptas también los términos
                de esos proveedores. Simple no controla la disponibilidad ni las políticas de terceros. La desconexión
                de una integración puede limitar funcionalidades asociadas sin derecho a compensación.
            </p>

            <h2>7. Disponibilidad y cambios</h2>
            <p>
                Procuramos mantener el servicio disponible, pero no garantizamos operación ininterrumpida. Podemos
                realizar mantenimiento, actualizaciones o modificar funciones con aviso razonable cuando sea posible.
            </p>

            <h2>8. Propiedad intelectual de la plataforma</h2>
            <p>
                El software, diseño, marcas, logos y documentación de Simple Plataforma son propiedad de sus titulares o
                licenciantes. No se concede ningún derecho sobre ellos salvo el uso limitado necesario para utilizar el
                servicio conforme a estos términos.
            </p>

            <h2>9. Limitación de responsabilidad</h2>
            <p>
                En la máxima medida permitida por la ley chilena, Simple no será responsable por daños indirectos,
                lucro cesante o pérdida de datos derivados del uso o imposibilidad de uso del servicio. La responsabilidad
                total directa, si la hubiere, se limitará al monto efectivamente pagado por el usuario a Simple en los
                doce meses anteriores al hecho que originó el reclamo, o a cero si solo utilizó planes gratuitos.
            </p>
            <p>
                Las transacciones entre usuarios (compradores, arrendatarios, pacientes, clientes de serenatas, etc.)
                son responsabilidad de las partes involucradas; Simple actúa como intermediario tecnológico salvo que se
                indique expresamente otro rol.
            </p>

            <h2>10. Suspensión y terminación</h2>
            <p>
                Podemos suspender o cerrar cuentas ante incumplimiento grave, riesgo de fraude o requerimiento legal. El
                usuario puede solicitar el cierre de su cuenta conforme a los mecanismos de cada vertical; algunos datos
                pueden conservarse por obligación legal o respaldo temporal.
            </p>

            <h2>11. Ley aplicable y jurisdicción</h2>
            <p>
                Estos términos se rigen por las leyes de la República de Chile. Cualquier controversia se someterá a los
                tribunales ordinarios de justicia de Santiago, sin perjuicio de las normas imperativas que protejan al
                consumidor cuando corresponda.
            </p>

            <h2>12. Modificaciones</h2>
            <p>
                Podemos modificar estos términos publicando la versión actualizada en esta URL. El uso continuado tras
                cambios materiales constituye aceptación, salvo que la ley exija un procedimiento distinto.
            </p>

            <h2>13. Contacto</h2>
            <p>
                Consultas legales o sobre estos términos:{' '}
                <a href={`mailto:${email}`} className="font-medium text-[var(--accent)] underline">
                    {email}
                </a>
            </p>
        </LegalDocumentLayout>
    );
}
