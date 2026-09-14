import { Link, NavLink, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import type { Rol } from '../lib/types';

const ROLES_ETIQUETA: Record<Rol, string> = {
  ADMIN: 'Administrador',
  DESPACHADOR: 'Despachador',
  TRANSPORTISTA: 'Transportista',
};

const NAV: { a: string; etiqueta: string; roles: Rol[] }[] = [
  { a: '/', etiqueta: 'Pedidos', roles: ['ADMIN', 'DESPACHADOR', 'TRANSPORTISTA'] },
  { a: '/nuevo-pedido', etiqueta: 'Nueva nota', roles: ['DESPACHADOR', 'ADMIN'] },
  { a: '/establecimientos', etiqueta: 'Establecimientos', roles: ['ADMIN'] },
  { a: '/usuarios', etiqueta: 'Usuarios', roles: ['ADMIN'] },
];

function claseActivo({ isActive }: { isActive: boolean }) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-indigo-600 text-white'
      : 'text-gray-700 hover:bg-gray-100'
  }`;
}

export default function Layout({ children }: { children: ReactNode }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const enlaces = usuario ? NAV.filter((n) => n.roles.includes(usuario.rol)) : [];

  function cerrar() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-bold text-indigo-700">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white">
              iS
            </span>
            <span className="hidden sm:inline">iShoes Laundry</span>
          </Link>
          <nav className="flex flex-1 gap-1 overflow-x-auto">
            {enlaces.map((enlace) => (
              <NavLink key={enlace.a} to={enlace.a} end={enlace.a === '/'} className={claseActivo}>
                {enlace.etiqueta}
              </NavLink>
            ))}
          </nav>
          {usuario && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">{usuario.nombre}</p>
                <p className="text-xs text-gray-500">
                  {ROLES_ETIQUETA[usuario.rol]}
                  {usuario.establecimiento ? ` · ${usuario.establecimiento.nombre}` : ''}
                </p>
              </div>
              <button
                onClick={cerrar}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                Salir
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}