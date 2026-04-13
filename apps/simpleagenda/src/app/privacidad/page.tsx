export default function PrivacidadPage() {
    return (
        <div className="container-app panel-page py-8 max-w-3xl">
            <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--fg)' }}>Política de Privacidad</h1>
            <div className="prose prose-sm" style={{ color: 'var(--fg)' }}>
                <p className="mb-4">Última actualización: {new Date().toLocaleDateString('es-CL')}</p>
                
                <h2 className="text-lg font-semibold mt-6 mb-3">1. Información que recopilamos</h2>
                <p className="mb-4">Simple Agenda recopila la siguiente información para proporcionar nuestros servicios:</p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li><strong>Datos de cuenta:</strong> nombre, email, contraseña</li>
                    <li><strong>Datos profesionales:</strong> nombre, especialidad, ubicación, horarios de atención</li>
                    <li><strong>Datos de pacientes:</strong> nombre, contacto, historial de citas, notas clínicas</li>
                    <li><strong>Datos de citas:</strong> fechas, horas, modalidad, pagos</li>
                </ul>

                <h2 className="text-lg font-semibold mt-6 mb-3">2. Uso de la información</h2>
                <p className="mb-4">Utilizamos tu información para:</p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li>Gestionar tu agenda y citas</li>
                    <li>Enviar recordatorios y notificaciones</li>
                    <li>Procesar pagos</li>
                    <li>Mejorar nuestros servicios</li>
                </ul>

                <h2 className="text-lg font-semibold mt-6 mb-3">3. Seguridad</h2>
                <p className="mb-4">Implementamos medidas de seguridad para proteger tu información, incluyendo encriptación de datos y acceso restringido.</p>

                <h2 className="text-lg font-semibold mt-6 mb-3">4. Compartición de datos</h2>
                <p className="mb-4">No vendemos tus datos a terceros. Solo compartimos información cuando:</p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li>Es necesario para el servicio (ej. procesamiento de pagos)</li>
                    <li>Tu lo autorizas explícitamente</li>
                    <li>Lo exige la ley</li>
                </ul>

                <h2 className="text-lg font-semibold mt-6 mb-3">5. Tus derechos</h2>
                <p className="mb-4">Tienes derecho a:</p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li>Acceder a tus datos personales</li>
                    <li>Solicitar corrección o eliminación</li>
                    <li>Exportar tus datos</li>
                    <li>Revocar autorizaciones</li>
                </ul>

                <h2 className="text-lg font-semibold mt-6 mb-3">6. Contacto</h2>
                <p className="mb-4">Para consultas sobre privacidad, contáctanos en: hola@simpleagenda.app</p>
            </div>
        </div>
    );
}
