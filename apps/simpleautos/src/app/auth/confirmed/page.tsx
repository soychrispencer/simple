import Link from 'next/link';

export default function ConfirmedPage() {
  return (
    <div className="confirmed-container text-center p-8 text-lighttext dark:text-darktext">
      <h1 className="text-2xl font-bold mb-4">Correo confirmado exitosamente!</h1>
      <p className="mb-6">Tu correo ha sido verificado. Ahora puedes acceder al panel de usuario.</p>
      <Link href="/panel">
        <button className="btn-primary">Ir al Panel</button>
      </Link>
      <div className="mt-6 text-sm text-lighttext/70 dark:text-darktext/70">Si ya habías iniciado sesión, puedes cerrar esta ventana.</div>
    </div>
  );
}







