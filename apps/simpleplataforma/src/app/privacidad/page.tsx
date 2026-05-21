import type { Metadata } from 'next';
import { LegalDocumentLayout, legalContactEmail } from '@/components/legal-document-layout';

export const metadata: Metadata = {
    title: 'Política de privacidad',
    description:
        'Política de privacidad del ecosistema Simple Plataforma: SimpleAutos, SimplePropiedades, SimpleAgenda, SimpleSerenatas y servicios asociados.',
};

export default function PrivacidadPage() {
    const email = legalContactEmail();

    return (
        <LegalDocumentLayout title="Política de privacidad">
            <p>
                La presente política describe cómo <strong>Simple Plataforma</strong> (&quot;nosotros&quot;, &quot;la
                plataforma&quot;) trata los datos personales de quienes utilizan nuestro sitio{' '}
                <strong>simpleplataforma.app</strong> y las aplicaciones del ecosistema Simple operadas bajo la misma
                infraestructura tecnológica.
            </p>

            <h2>1. Responsable del tratamiento</h2>
            <p>
                El responsable del tratamiento de datos personales asociados a la plataforma Simple es el titular del
                proyecto Simple Plataforma, con operación en Chile. Para ejercer derechos o consultas de privacidad:
                <a href={`mailto:${email}`} className="ml-1 font-medium text-[var(--accent)] underline">
                    {email}
                </a>
                .
            </p>

            <h2>2. Alcance</h2>
            <p>Esta política aplica a:</p>
            <ul>
                <li>
                    El sitio <strong>simpleplataforma.app</strong> (información institucional del ecosistema).
                </li>
                <li>
                    Las verticales vinculadas: <strong>SimpleAutos</strong> (simpleautos.app),{' '}
                    <strong>SimplePropiedades</strong> (simplepropiedades.app), <strong>SimpleAgenda</strong>{' '}
                    (simpleagenda.app), <strong>SimpleSerenatas</strong> (simpleserenatas.app) y herramientas de
                    administración asociadas.
                </li>
                <li>
                    La API central (<strong>api.simpleplataforma.app</strong>) que presta autenticación, almacenamiento,
                    pagos e integraciones comunes.
                </li>
            </ul>
            <p>
                Cada vertical puede publicar avisos complementarios; en caso de conflicto sobre datos tratados en esa
                app, prevalecerá el aviso específico de la vertical respecto de funciones propias del rubro.
            </p>

            <h2>3. Datos que podemos recopilar</h2>
            <ul>
                <li>
                    <strong>Identificación y cuenta:</strong> nombre, correo electrónico, teléfono, contraseña (almacenada
                    de forma segura), foto de perfil, identificadores de sesión.
                </li>
                <li>
                    <strong>Datos de uso:</strong> páginas visitadas, acciones en el panel, tipo de dispositivo,
                    navegador, dirección IP aproximada, registros técnicos y de seguridad.
                </li>
                <li>
                    <strong>Contenido publicado:</strong> textos, imágenes, videos, ubicaciones, precios y metadatos de
                    avisos, agendas, servicios o perfiles profesionales, según la vertical utilizada.
                </li>
                <li>
                    <strong>Datos de transacciones:</strong> historial de planes, órdenes de pago, identificadores de
                    Mercado Pago u otros proveedores de cobro (no almacenamos datos completos de tarjetas).
                </li>
                <li>
                    <strong>Integraciones:</strong> tokens OAuth de Google (inicio de sesión, sincronización de Google
                    Calendar cuando el usuario lo autoriza), tokens de Instagram u otras APIs conectadas
                    voluntariamente.
                </li>
                <li>
                    <strong>Ubicación:</strong> direcciones, comunas, coordenadas aproximadas cuando el usuario las
                    ingresa o selecciona mediante servicios de mapas.
                </li>
                <li>
                    <strong>Comunicaciones:</strong> mensajes de contacto, notificaciones por correo, WhatsApp o push
                    cuando el usuario las habilita.
                </li>
            </ul>

            <h2>4. Finalidades del tratamiento</h2>
            <p>Utilizamos los datos personales para:</p>
            <ul>
                <li>Crear y administrar cuentas de usuario en una o más verticales del ecosistema.</li>
                <li>Publicar, buscar, contactar y gestionar avisos, citas, servicios o reservas.</li>
                <li>Procesar pagos, suscripciones y facturación de planes.</li>
                <li>Enviar notificaciones operativas, recordatorios y mensajes solicitados por el usuario.</li>
                <li>
                    Sincronizar calendarios y autenticar con Google u otros proveedores, únicamente con el consentimiento
                    del usuario y dentro de los permisos otorgados.
                </li>
                <li>Prevenir fraude, abuso y accesos no autorizados.</li>
                <li>Cumplir obligaciones legales y responder requerimientos de autoridades competentes.</li>
                <li>Mejorar la estabilidad, seguridad y experiencia de los servicios.</li>
            </ul>

            <h2>5. Servicios de Google</h2>
            <p>
                Cuando el usuario elige <strong>iniciar sesión con Google</strong> o <strong>conectar Google
                Calendar</strong>, utilizamos las APIs de Google conforme a las políticas de Google, incluyendo la
                limitación de uso de datos de usuario de Google API Services. Solo accedemos a los alcances (scopes)
                necesarios para la función solicitada (por ejemplo, perfil básico o gestión de calendario). El usuario
                puede revocar el acceso desde su cuenta de Google o desconectando la integración en la app correspondiente.
            </p>
            <p>
                No utilizamos datos obtenidos mediante APIs de Google para publicidad no relacionada ni los vendemos a
                terceros.
            </p>

            <h2>6. Base legal y derechos (Chile)</h2>
            <p>
                El tratamiento se funda en la ejecución del contrato o relación de servicio, el consentimiento del
                titular cuando corresponda, y el interés legítimo en seguridad y mejora del producto, en conformidad con
                la legislación chilena aplicable, incluida la Ley N° 19.628 sobre protección de la vida privada.
            </p>
            <p>El titular de datos puede solicitar:</p>
            <ul>
                <li>Acceso, rectificación, actualización o eliminación de sus datos.</li>
                <li>Revocación del consentimiento para integraciones opcionales.</li>
                <li>Información sobre proveedores que intervienen como encargados del tratamiento.</li>
            </ul>

            <h2>7. Conservación y seguridad</h2>
            <p>
                Conservamos los datos mientras la cuenta esté activa o sea necesario para las finalidades descritas,
                obligaciones legales o resolución de disputas. Aplicamos medidas técnicas y organizativas razonables
                (cifrado en tránsito, controles de acceso, secretos en entornos seguros, copias de respaldo).
            </p>

            <h2>8. Encargados y transferencias</h2>
            <p>Podemos compartir datos con proveedores que nos ayudan a operar el servicio, por ejemplo:</p>
            <ul>
                <li>Infraestructura y alojamiento (servidores, bases de datos).</li>
                <li>Almacenamiento de archivos (p. ej. Cloudflare R2).</li>
                <li>Correo transaccional (p. ej. Brevo).</li>
                <li>Pasarelas de pago (Mercado Pago).</li>
                <li>Mapas y geocodificación (Google Maps Platform).</li>
                <li>Autenticación y calendario (Google).</li>
                <li>Mensajería (WhatsApp Business API, cuando esté habilitada).</li>
            </ul>
            <p>
                Estos proveedores tratan datos según instrucciones contractuales y solo para las finalidades indicadas.
                Algunos pueden ubicarse fuera de Chile; en esos casos adoptamos medidas contractuales y de seguridad
                acordes al riesgo.
            </p>

            <h2>9. Menores de edad</h2>
            <p>
                Los servicios están dirigidos a mayores de 18 años o a quienes actúen con capacidad legal para contratar.
                No recopilamos intencionalmente datos de menores sin el consentimiento de quien ejerce la patria potestad.
            </p>

            <h2>10. Cookies y tecnologías similares</h2>
            <p>
                Utilizamos cookies y almacenamiento local necesarios para mantener la sesión, preferencias (como tema
                claro/oscuro) y seguridad. No usamos cookies de publicidad de terceros en simpleplataforma.app con fines
                de perfilamiento masivo.
            </p>

            <h2>11. Cambios a esta política</h2>
            <p>
                Podemos actualizar esta política. Publicaremos la versión vigente en esta URL e indicaremos la fecha de
                actualización. El uso continuado del servicio tras cambios relevantes implica conocimiento de la nueva
                versión, salvo que la ley exija un consentimiento adicional.
            </p>

            <h2>12. Contacto</h2>
            <p>
                Consultas sobre privacidad:{' '}
                <a href={`mailto:${email}`} className="font-medium text-[var(--accent)] underline">
                    {email}
                </a>
            </p>
        </LegalDocumentLayout>
    );
}
