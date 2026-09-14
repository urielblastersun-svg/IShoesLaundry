import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { get, patch } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ESTADOS } from '../lib/types';
import type { EstadoPedido, Pedido } from '../lib/types';

const COLOR_ESTADO: Record<EstadoPedido, string> = {
  NUEVO: 'bg-amber-100 text-amber-800',
  EN_TRANSPORTE: 'bg-blue-100 text-blue-800',
  EN_LAVADO: 'bg-violet-100 text-violet-800',
  TERMINADO: 'bg-emerald-100 text-emerald-800',
  ENTREGADO: 'bg-gray-100 text-gray-700',
};

const PROXIMO_ESTADO: Partial<Record<EstadoPedido, { estado: EstadoPedido; etiqueta: string }>> = {
  NUEVO: { estado: 'EN_TRANSPORTE', etiqueta: 'Marcar recogido por transporte' },
  EN_TRANSPORTE: { estado: 'EN_LAVADO', etiqueta: 'Recibir en centro de lavado' },
  EN_LAVADO: { estado: 'TERMINADO', etiqueta: 'Marcar listo para entrega' },
  TERMINADO: { estado: 'ENTREGADO', etiqueta: 'Marcar entregado' },
};

export default function DetallePedido() {
  const { id } = useParams<{ id: string }>();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marcando, setMarcando] = useState(false);

  useEffect(() => {
    if (!id) return;
    setCargando(true);
    get<Pedido>(`/pedidos/${id}`)
      .then(setPedido)
      .catch((err) => setError(err.message ?? 'No se pudo cargar el pedido'))
      .finally(() => setCargando(false));
  }, [id]);

  const proximo = pedido ? PROXIMO_ESTADO[pedido.estado] : undefined;
  const puedeMarcar =
    !!proximo &&
    (usuario?.rol === 'ADMIN' ||
      (usuario?.rol === 'TRANSPORTISTA' && pedido?.estado === 'NUEVO') ||
      (usuario?.rol === 'DESPACHADOR' && pedido?.estado === 'TERMINADO'));

  async function marcar() {
    if (!id || !proximo) return;
    setMarcando(true);
    setError(null);
    try {
      const actualizado = await patch<Pedido>(`/pedidos/${id}/estado`, {
        estado: proximo.estado,
      });
      setPedido((prev) =>
        prev ? { ...prev, estado: actualizado.estado } : prev,
      );
      const detalle = await get<Pedido>(`/pedidos/${id}`);
      setPedido(detalle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado');
    } finally {
      setMarcando(false);
    }
  }

  if (cargando) {
    return <p className="py-8 text-center text-gray-500">Cargando pedido…</p>;
  }

  if (error && !pedido) {
    return <p className="py-8 text-center text-red-600">{error}</p>;
  }

  if (!pedido) {
    return <p className="py-8 text-center text-gray-500">Pedido no encontrado.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link to="/" className="text-sm text-indigo-600 hover:underline">
            ← Pedidos
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{pedido.folio}</h1>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${COLOR_ESTADO[pedido.estado]}`}>
          {ESTADOS[pedido.estado]}
        </span>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">Cliente</h2>
          <p className="font-medium text-gray-800">{pedido.cliente.nombre}</p>
          <p className="text-sm text-gray-500">{pedido.cliente.telefono}</p>
          <h2 className="mb-1 mt-4 text-sm font-semibold uppercase text-gray-500">Nota</h2>
          <p className="text-sm text-gray-600">
            Local: {pedido.establecimiento.nombre} · Atendió: {pedido.empleado.nombre}
          </p>
          {pedido.notas && <p className="mt-1 text-sm text-gray-600">Notas: {pedido.notas}</p>}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">Resumen</h2>
          <p className="flex justify-between text-sm text-gray-600">
            <span>Subtotal ({pedido.items.length} artículos)</span>
            <span>${Number(pedido.subtotal).toFixed(2)}</span>
          </p>
          <p className="flex justify-between text-sm text-gray-600">
            <span>Descuento</span>
            <span>-${Number(pedido.descuento).toFixed(2)}</span>
          </p>
          <p className="mt-2 flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-indigo-700">
            <span>Total</span>
            <span>${Number(pedido.total).toFixed(2)}</span>
          </p>
          {puedeMarcar && proximo && (
            <button
              onClick={marcar}
              disabled={marcando}
              className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {marcando ? 'Actualizando…' : proximo.etiqueta}
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">Artículos</h2>
        <div className="space-y-4">
          {pedido.items.map((item, itemIndex) => (
            <div key={item.id} className="rounded-lg border border-gray-100 p-3">
              <p className="font-medium text-gray-800">
                {item.tipo === 'TENIS' ? 'Tenis' : item.tipo === 'GORRA' ? 'Gorra' : 'Mochila'}{' '}
                {itemIndex + 1}
                <span className="ml-2 text-xs text-gray-400">{item.tipo}</span>
              </p>
              <p className="text-sm text-gray-600">
                {item.marca} {item.modelo} · {item.color}
                {item.talla ? ` · Talla ${item.talla}` : ''} · ${Number(item.costo).toFixed(2)}
              </p>
              {item.fotos.length > 0 && (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {item.fotos.map((foto) => (
                    <a key={foto.id} href={foto.url} target="_blank" rel="noreferrer">
                      <img
                        src={foto.url}
                        alt={foto.tipo}
                        className="h-20 w-full rounded-lg object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {pedido.fotos.length > 0 && (
          <>
            <h2 className="mb-2 mt-5 text-sm font-semibold uppercase text-gray-500">
              Foto general
            </h2>
            <a href={pedido.fotos[0].url} target="_blank" rel="noreferrer">
              <img
                src={pedido.fotos[0].url}
                alt="Foto general"
                className="h-40 rounded-lg object-cover"
              />
            </a>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">Seguimiento</h2>
        <ol className="space-y-3">
          {pedido.historial.map((h, i) => (
            <li key={h.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-indigo-100 text-xs text-indigo-700">
                  {i + 1}
                </span>
                {i < pedido.historial.length - 1 && (
                  <span className="w-px flex-1 bg-gray-200" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{ESTADOS[h.estado]}</p>
                <p className="text-xs text-gray-500">
                  {h.usuario.nombre} ·{' '}
                  {new Date(h.timestamp).toLocaleString('es-MX', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => navigate('/')}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Volver
        </button>
      </div>
    </div>
  );
}