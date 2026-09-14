import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { del, get, patch, post } from '../lib/api';
import type { Establecimiento } from '../lib/types';

const vacio = { nombre: '', direccion: '', ciudad: '' };

export default function Establecimientos() {
  const [lista, setLista] = useState<Establecimiento[]>([]);
  const [form, setForm] = useState(vacio);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  function cargar() {
    setCargando(true);
    get<Establecimiento[]>('/establecimientos')
      .then(setLista)
      .catch((err) => setError(err.message ?? 'Error al cargar'))
      .finally(() => setCargando(false));
  }

  useEffect(cargar, []);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editandoId) {
        await patch(`/establecimientos/${editandoId}`, form);
      } else {
        await post('/establecimientos', form);
      }
      setForm(vacio);
      setEditandoId(null);
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  }

  function editar(est: Establecimiento) {
    setEditandoId(est.id);
    setForm({ nombre: est.nombre, direccion: est.direccion, ciudad: est.ciudad });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function alternar(est: Establecimiento) {
    setError(null);
    try {
      await patch(`/establecimientos/${est.id}`, { activo: !est.activo });
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar');
    }
  }

  async function eliminar(est: Establecimiento) {
    if (!window.confirm(`Desactivar el establecimiento "${est.nombre}"?`)) return;
    setError(null);
    try {
      await del(`/establecimientos/${est.id}`);
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo desactivar');
    }
  }

  const campo =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500';

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Establecimientos</h1>

      <form onSubmit={guardar} className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-5 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <input
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          placeholder="Nombre"
          required
          className={campo}
        />
        <input
          value={form.direccion}
          onChange={(e) => setForm({ ...form, direccion: e.target.value })}
          placeholder="Dirección"
          required
          className={campo}
        />
        <input
          value={form.ciudad}
          onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
          placeholder="Ciudad"
          required
          className={campo}
        />
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {editandoId ? 'Guardar cambios' : 'Agregar'}
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
                <th className="px-4 py-3">Dirección</th>
                <th className="px-4 py-3">Ciudad</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map((est) => (
                <tr key={est.id} className={est.activo ? '' : 'opacity-50'}>
                  <td className="px-4 py-3 font-medium text-gray-800">{est.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{est.direccion}</td>
                  <td className="px-4 py-3 text-gray-600">{est.ciudad}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => alternar(est)}>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          est.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {est.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => editar(est)} className="mr-2 text-indigo-600 hover:underline">
                      Editar
                    </button>
                    <button onClick={() => eliminar(est)} className="text-red-600 hover:underline">
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