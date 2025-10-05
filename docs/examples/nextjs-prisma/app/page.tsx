import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">
          NexusAuth + Next.js Example
        </h1>

        <div className="flex flex-col gap-4 items-center">
          <p className="text-center text-lg">
            Ejemplo completo de autenticación con NexusAuth
          </p>

          <div className="flex gap-4 mt-8">
            <Link
              href="/login"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Iniciar Sesión
            </Link>

            <Link
              href="/signup"
              className="px-6 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition"
            >
              Registrarse
            </Link>
          </div>

          <div className="mt-12 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg max-w-2xl">
            <h2 className="text-xl font-semibold mb-4">Características</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Autenticación con credentials (email/password)</li>
              <li>OAuth con Google</li>
              <li>Protected routes con middleware</li>
              <li>Server Components y Client Components</li>
              <li>Password reset flow</li>
              <li>JWT tokens con refresh</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
