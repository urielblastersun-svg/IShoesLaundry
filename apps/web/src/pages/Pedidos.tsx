import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  ESTADOS,
} from '../lib/types';
import type { EstadoPedido, Establecimiento, Pedido } from '../lib/types';

const COLOR_ESTADO: Record<EstadoPedido, string> = {
  NUEVO: 'bg-amber-100 text-amber-800',
  EN_TRANSPORTE: 'bg-blue-100 text-blue-800',
  EN_LAVADO: 'bg-violet-100 text-violet-800',
  TERMINADO: 'bg-emerald-100 text-emerald-800',
  ENTREGADO: 'bg-gray-100 text-gray-700',
};

export default function Pedidos() {
  const { usuario } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [estado, setEstado] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState('');
  const [q, setQ] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  useEffect(() => {
    get<Establecimiento[]>('/establecimientos')
      .then(setEstablecimientos)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setCargando(true);
    const params = new URLSearchParams();
    if (estado) params.set('estado', estado);
    if (establecimientoId) params.set('establecimientoId', establecimientoId);
    if (q.trim()) params.set('q', q.trim());
    if (desde) params.set('desde', new Date(desde).toISOString());
    if (hasta) params.set('hasta', new Date(`${hasta}T23:59:59`).toISOString());

    const buscar = setTimeout(() => {
      get<Pedido[]>(`/pedidos?${params.toString()}`)
        .then((datos) => {
          setPedidos(datos);
          setError(null);
        })
        .catch((err) => setError(err.message ?? 'No se pudieron cargar los pedidos'))
        .finally(() => setCargando(false));
    }, 250);

    return () => clearTimeout(buscar);
  }, [estado, establecimientoId, q, desde, hasta]);

  const esAdmin = usuario?.rol === 'ADMIN';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Pedidos</h1>
        {(usuario?.rol === 'DESPACHADOR' || esAdmin) && (
          <Link
            to="/nuevo-pedido"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Nueva nota
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-200 bg-white p-3 sm:grid-cols-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Folio, cliente o teléfono"
          className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        >
          <option value="">Estado: todos</option>
          {(Object.keys(ESTADOS) as EstadoPedido[]).map((e) => (
            <option key={e} value={e}>
              {ESTADOS[e]}
            </option>
          ))}
        </select>
        {esAdmin && (
          <select
            value={establecimientoId}
            onChange={(e) => setEstablecimientoId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">Local: todos</option>
            {establecimientos.map((est) => (
              <option key={est.id} value={est.id}>
                {est.nombre}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-2">
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            title="Desde"
          />
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            title="Hasta"
          />
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {cargando ? (
        <p className="py-8 text-center text-gray-500">Cargando pedidos…</p>
      ) : pedidos.length === 0 ? (
        <p className="py-8 text-center text-gray-500">No hay pedidos con esos filtros.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Folio</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Local</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pedidos.map((pedido) => (
                <tr key={pedido.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-indigo-700">
                    <Link to={`/pedidos/${pedido.id}`}>{pedido.folio}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{pedido.cliente.nombre}</p>
                    <p className="text-xs text-gray-500">{pedido.cliente.telefono}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{pedido.establecimiento.nombre}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    ${Number(pedido.total).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_ESTADO[pedido.estado]}`}>
                      {ESTADOS[pedido.estado]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(pedido.createdAt).toLocaleDateString('es-MX')}
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