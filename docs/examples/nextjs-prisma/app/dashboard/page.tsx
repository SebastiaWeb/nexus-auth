import { getSession } from '@nexus-auth/nextjs-helpers';
import { nexusAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await getSession(nexusAuth);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Cerrar Sesión
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Bienvenido de vuelta!</h2>

          <div className="space-y-3">
            <p>
              <span className="font-medium">Email:</span> {session.user.email}
            </p>
            <p>
              <span className="font-medium">Nombre:</span> {session.user.name}
            </p>
            <p>
              <span className="font-medium">ID:</span> {session.user.id}
            </p>
          </div>

          <div className="mt-6">
            <Link
              href="/profile"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Ver Perfil Completo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
