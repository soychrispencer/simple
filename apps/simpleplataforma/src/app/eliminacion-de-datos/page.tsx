import type { Metadata } from 'next';
import { LegalDocumentLayout, legalContactEmail } from '@/components/legal-document-layout';

export const metadata: Metadata = {
    title: 'Eliminación de datos',
    description: 'Cómo solicitar la eliminación de tu cuenta y datos personales de Simple Plataforma.',
};

export default function EliminacionDeDatosPage() {
    const email = legalContactEmail();

    return (
        <LegalDocumentLayout title="Eliminación de datos y cuenta">
            <p>
                Puedes solicitar la eliminación de tu cuenta y de los datos personales asociados a los servicios de
                Simple. La solicitud puede incluir SimpleAgenda y las demás aplicaciones del ecosistema vinculadas a
                la misma cuenta.
            </p>

            <h2>Cómo solicitarla</h2>
            <ol>
                <li>
                    Escribe desde el correo asociado a tu cuenta a{' '}
                    <a href={`mailto:${email}`} className="font-medium text-[var(--accent)] underline">
                        {email}
                    </a>
                    .
                </li>
                <li>Usa el asunto “Solicitud de eliminación de datos”.</li>
                <li>Indica el correo de tu cuenta y qué servicios de Simple utilizaste.</li>
            </ol>
            <p>
                Por seguridad, podríamos pedirte que confirmes que eres titular de la cuenta antes de procesar la
                solicitud. No incluyas contraseñas, códigos de verificación ni datos de tarjetas en el mensaje.
            </p>

            <h2>Qué ocurre después</h2>
            <p>
                Revisaremos la solicitud y eliminaremos o desvincularemos la cuenta y los datos personales que
                corresponda. Podemos conservar información mínima cuando sea necesario para cumplir obligaciones
                legales, resolver disputas, prevenir fraude o mantener registros de seguridad. La información
                conservada quedará limitada a esos fines.
            </p>
            <p>
                Si conectaste una cuenta de un servicio externo, también puedes revocar su autorización directamente
                desde ese servicio. Para más información sobre el tratamiento de datos, consulta nuestra{' '}
                <a href="/privacidad" className="font-medium text-[var(--accent)] underline">
                    política de privacidad
                </a>
                .
            </p>
        </LegalDocumentLayout>
    );
}
