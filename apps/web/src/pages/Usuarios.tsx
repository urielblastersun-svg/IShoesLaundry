import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { del, get, post } from '../lib/api';
import type { Establecimiento, Rol, Usuario } from '../lib/types';

const ROLES: { valor: Rol; etiqueta: string }[] = [
  { valor: 'ADMIN', etiqueta: 'Administrador' },
  { valor: 'DESPACHADOR', etiqueta: 'Despachador' },
  { valor: 'TRANSPORTISTA', etiqueta: 'Transportista' },
];

const formaVacia = {
  nombre: '',
  telefono: '',
  email: '',
  password: '',
  rol: 'DESPACHADOR' as Rol,
  establecimientoId: '',
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [form, setForm] = useState(formaVacia);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  function cargar() {
    setCargando(true);
    get<Usuario[]>('/usuarios')
      .then(setUsuarios)
      .catch((err) => setError(err.message ?? 'Error al cargar'))
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    cargar();
    get<Establecimiento[]>('/establecimientos')
      .then(setEstablecimientos)
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await post<{ id: string }>('/usuarios', form);
      setForm(formaVacia);
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  }

  async function eliminar(usuario: Usuario) {
    if (!window.confirm(`Desactivar al usuario "${usuario.nombre}"?`)) return;
    setError(null);
    try {
      await del(`/usuarios/${usuario.id}`);
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo desactivar');
    }
  }

  const campo =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500';

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Usuarios</h1>

      <form onSubmit={guardar} className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-5 sm:grid-cols-3">
        <input
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          placeholder="Nombre completo"
          required
          className={campo}
        />
        <input
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          type="email"
          placeholder="correo@islaundry.app"
          required
          className={campo}
        />
        <input
          value={form.telefono}
          onChange={(e) => setForm({ ...form, telefono: e.target.value })}
          placeholder="Teléfono"
          className={campo}
        />
        <input
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          type="password"
          placeholder="Contraseña inicial"
          minLength={6}
          required
          className={campo}
        />
        <select
          value={form.rol}
          onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}
          className={campo}
        >
          {ROLES.map((r) => (
            <option key={r.valor} value={r.valor}>
              {r.etiqueta}
            </option>
          ))}
        </select>
        <select
          value={form.establecimientoId}
          onChange={(e) => setForm({ ...form, establecimientoId: e.target.value })}
          className={campo}
          disabled={form.rol === 'ADMIN' || form.rol === 'TRANSPORTISTA'}
        >
          <option value="">Sin establecimiento</option>
          {establecimientos.map((est) => (
            <option key={est.id} value={est.id}>
              {est.nombre}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 sm:col-span-3"
        >
          Crear usuario
        </button>
      </form>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {cargando ? (
        <p className="py-4 text-center text-gray-500">Cargando…</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Establecimiento</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuarios.map((u) => (
                <tr key={u.id} className={u.activo ? '' : 'opacity-50'}>
                  <td className="px-4 py-3 font-medium text-gray-800">{u.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {ROLES.find((r) => r.valor === u.rol)?.etiqueta}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {u.establecimiento?.nombre ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => eliminar(u)} className="text-red-600 hover:underline">
                      Desactivar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}