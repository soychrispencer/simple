export default function TerminosPage() {
    return (
        <div className="container-app panel-page py-8 max-w-3xl">
            <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--fg)' }}>Términos y Condiciones</h1>
            <div className="prose prose-sm" style={{ color: 'var(--fg)' }}>
                <p className="mb-4">Última actualización: {new Date().toLocaleDateString('es-CL')}</p>

                <h2 className="text-lg font-semibold mt-6 mb-3">1. Aceptación de términos</h2>
                <p className="mb-4">Al usar Simple Agenda, aceptas estos términos y condiciones.</p>

                <h2 className="text-lg font-semibold mt-6 mb-3">2. Descripción del servicio</h2>
                <p className="mb-4">Simple Agenda es una plataforma de gestión de agenda para profesionales de la salud que permite:</p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li>Gestionar citas y pacientes</li>
                    <li>Enviar recordatorios automáticos</li>
                    <li>Procesar pagos</li>
                    <li>Sincronizar con Google Calendar</li>
                </ul>

                <h2 className="text-lg font-semibold mt-6 mb-3">3. Responsabilidades del usuario</h2>
                <p className="mb-4">El usuario se compromete a:</p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li>Proporcionar información veraz</li>
                    <li>Mantener la seguridad de su cuenta</li>
                    <li>No utilizar el servicio para actividades ilegales</li>
                    <li>Respetar la privacidad de sus pacientes</li>
                </ul>

                <h2 className="text-lg font-semibold mt-6 mb-3">4. Planes y pagos</h2>
                <p className="mb-4">Simple Agenda ofrece planes gratuitos y de pago. Los pagos se procesan de forma segura y las suscripciones pueden cancelarse en cualquier momento.</p>

                <h2 className="text-lg font-semibold mt-6 mb-3">5. Disponibilidad del servicio</h2>
                <p className="mb-4">Nos esforzamos por mantener el servicio disponible, pero no garantizamos disponibilidad continua. Podemos realizar mantenimiento programado.</p>

                <h2 className="text-lg font-semibold mt-6 mb-3">6. Modificaciones</h2>
                <p className="mb-4">Nos reservamos el derecho de modificar estos términos. Los cambios se notificarán a través de la plataforma.</p>

                <h2 className="text-lg font-semibold mt-6 mb-3">7. Contacto</h2>
                <p className="mb-4">Para consultas sobre estos términos, contáctanos en: hola@simpleagenda.app</p>
            </div>
        </div>
    );
}
