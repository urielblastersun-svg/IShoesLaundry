import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post, subirFoto } from '../lib/api';
import { useAuth } from '../lib/auth';
import { CATEGORIAS_TENIS, TIPOS_ITEM } from '../lib/types';
import type { CategoriaTenis, Establecimiento, TipoItem } from '../lib/types';

interface FotoSlot {
  file: File | null;
  preview: string | null;
}

interface ItemBorrador {
  temporalKey: number;
  tipo: TipoItem;
  categoria: CategoriaTenis | '';
  marca: string;
  modelo: string;
  color: string;
  talla: string;
  costo: string;
  fotos: FotoSlot[];
}

const pasoEtiquetas = ['Cliente', 'Artículos', 'Resumen'];

function hacerFotosVacia(): FotoSlot[] {
  return [0, 1, 2, 3].map(() => ({ file: null, preview: null }));
}

export default function NuevoPedido() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [paso, setPaso] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState(
    usuario?.establecimientoId ?? '',
  );
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [notas, setNotas] = useState('');
  const [fotoGeneral, setFotoGeneral] = useState<FotoSlot>({ file: null, preview: null });
  const [items, setItems] = useState<ItemBorrador[]>([]);
  const [creadoFolio, setCreadoFolio] = useState<string | null>(null);

  useEffect(() => {
    get<Establecimiento[]>('/establecimientos')
      .then((datos) => {
        setEstablecimientos(datos);
        setEstablecimientoId((actual) =>
          actual
            ? actual
            : datos.find((d) => d.id === usuario?.establecimientoId)?.id ??
              datos[0]?.id ??
              '',
        );
      })
      .catch(() => undefined);
  }, [usuario?.establecimientoId]);

  function agregarItem() {
    setItems((prev) => [
      ...prev,
      {
        temporalKey: Date.now(),
        tipo: 'TENIS',
        categoria: 'BLANCO',
        marca: '',
        modelo: '',
        color: '',
        talla: '',
        costo: '',
        fotos: hacerFotosVacia(),
      },
    ]);
    setPaso(1);
  }

  function actualizarItem(index: number, campo: Partial<ItemBorrador>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...campo } : item)),
    );
  }

  function asignarFoto(index: number, slot: number, archivo: File | null) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const fotos = [...item.fotos];
        fotos[slot] = archivo
          ? { file: archivo, preview: URL.createObjectURL(archivo) }
          : { file: null, preview: null };
        return { ...item, fotos };
      }),
    );
  }

  function asignarFotoGeneral(archivo: File | null) {
    setFotoGeneral(
      archivo ? { file: archivo, preview: URL.createObjectURL(archivo) } : { file: null, preview: null },
    );
  }

  const subtotal = items.reduce((acc, item) => acc + (Number(item.costo) || 0), 0);
  const pasoValido =
    paso === 0
      ? clienteNombre.trim().length >= 2 && clienteTelefono.trim().length >= 7
      : items.length > 0;

  async function guardar() {
    setEnviando(true);
    setError(null);
    try {
      const itemsConFotos = await Promise.all(
        items.map(async (item) => {
          const urls: string[] = [];
          for (const slot of item.fotos) {
            if (slot.file) {
              urls.push(await subirFoto(slot.file));
            }
          }
          return {
            tipo: item.tipo,
            ...(item.tipo === 'TENIS' && item.categoria
              ? { categoria: item.categoria as CategoriaTenis }
              : {}),
            marca: item.marca,
            modelo: item.modelo,
            color: item.color,
            talla: item.talla || undefined,
            costo: Number(item.costo),
            ...(urls.length > 0 ? { fotos: urls } : {}),
          };
        }),
      );

      const fotosGenerales: string[] = [];
      if (fotoGeneral.file) {
        fotosGenerales.push(await subirFoto(fotoGeneral.file));
      }

      const respuesta = await post<{ folio: string }>('/pedidos', {
        cliente: { nombre: clienteNombre, telefono: clienteTelefono },
        establecimientoId: establecimientoId || undefined,
        items: itemsConFotos,
        ...(fotosGenerales.length > 0 ? { fotosGenerales } : {}),
        ...(notas.trim() ? { notas: notas.trim() } : {}),
      });

      setCreadoFolio(respuesta.folio);
      setPaso(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el pedido');
    } finally {
      setEnviando(false);
    }
  }

  if (creadoFolio) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <span className="text-4xl">✅</span>
        <h1 className="mt-2 text-xl font-bold text-gray-900">Nota creada</h1>
        <p className="mt-1 text-gray-600">
          Pedido <strong className="text-indigo-700">{creadoFolio}</strong> registrado.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Ver pedidos
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Nueva nota
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Nueva nota</h1>

      <ol className="flex gap-1 rounded-xl bg-white p-1 shadow-sm">
        {pasoEtiquetas.map((etiqueta, i) => (
          <li
            key={etiqueta}
            className={`flex-1 rounded-lg px-2 py-2 text-center text-xs font-medium sm:text-sm ${
              i === paso ? 'bg-indigo-600 text-white' : 'text-gray-500'
            }`}
          >
            {i + 1}. {etiqueta}
          </li>
        ))}
      </ol>

      {paso === 0 && (
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nombre del cliente *
              </label>
              <input
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                placeholder="Juan Pérez"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Teléfono *
              </label>
              <input
                value={clienteTelefono}
                onChange={(e) => setClienteTelefono(e.target.value)}
                inputMode="tel"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                placeholder="5512345678"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Establecimiento
            </label>
            <select
              value={establecimientoId}
              onChange={(e) => setEstablecimientoId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              {establecimientos.map((est) => (
                <option key={est.id} value={est.id}>
                  {est.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              placeholder="Condiciones del calzado, observaciones…"
              rows={2}
            />
          </div>

          {items.length > 0 && (
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
              {items.length} artículo(s) pendiente(s) por detallar.
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setPaso(1)}
              disabled={!pasoValido}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {paso === 1 && (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.temporalKey} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Artículo {index + 1}</h2>
                <button
                  onClick={() =>
                    setItems((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="text-sm text-red-600 hover:underline"
                >
                  Quitar
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Tipo</label>
                  <select
                    value={item.tipo}
                    onChange={(e) =>
                      actualizarItem(index, {
                        tipo: e.target.value as TipoItem,
                        categoria: e.target.value === 'TENIS' ? item.categoria || 'BLANCO' : '',
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  >
                    {TIPOS_ITEM.map((t) => (
                      <option key={t.valor} value={t.valor}>
                        {t.etiqueta}
                      </option>
                    ))}
                  </select>
                </div>

                {item.tipo === 'TENIS' && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Categoría</label>
                    <select
                      value={item.categoria}
                      onChange={(e) =>
                        actualizarItem(index, { categoria: e.target.value as CategoriaTenis })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    >
                      {CATEGORIAS_TENIS.map((c) => (
                        <option key={c.valor} value={c.valor}>
                          {c.etiqueta}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Marca</label>
                  <input
                    value={item.marca}
                    onChange={(e) => actualizarItem(index, { marca: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    placeholder="Nike"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Modelo</label>
                  <input
                    value={item.modelo}
                    onChange={(e) => actualizarItem(index, { modelo: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    placeholder="Air Force"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Color</label>
                  <input
                    value={item.color}
                    onChange={(e) => actualizarItem(index, { color: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    placeholder="Blanco"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Talla</label>
                  <input
                    value={item.talla}
                    onChange={(e) => actualizarItem(index, { talla: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    placeholder="27"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Costo ({item.tipo === 'MOCHILA' ? 'según tamaño' : 'unitario'}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.costo}
                    onChange={(e) => actualizarItem(index, { costo: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    placeholder="120"
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-gray-600">
                  Fotos de respaldo (estado de llegada)
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {item.fotos.map((slot, slotIndex) => (
                    <FotoInput
                      key={slotIndex}
                      slot={slot}
                      etiqueta={`Ángulo ${slotIndex + 1}`}
                      onChange={(archivo) => asignarFoto(index, slotIndex, archivo)}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={agregarItem}
            className="w-full rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-600 hover:border-indigo-400 hover:text-indigo-600"
          >
            + Agregar artículo
          </button>

          <div className="flex justify-between">
            <button
              onClick={() => setPaso(0)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Atrás
            </button>
            <button
              onClick={() => setPaso(2)}
              disabled={!pasoValido}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Revisar
            </button>
          </div>
        </div>
      )}

      {paso === 2 && (
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="font-semibold text-gray-800">Resumen</h2>

          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">Cliente</p>
              <p className="font-medium text-gray-800">
                {clienteNombre} · {clienteTelefono}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">Artículos</p>
              <p className="font-medium text-gray-800">{items.length} artículo(s)</p>
            </div>
          </div>

          <div className="space-y-1">
            {items.map((item) => (
              <div key={item.temporalKey} className="flex items-center justify-between border-b border-gray-100 py-2 text-sm">
                <span className="text-gray-700">
                  {TIPOS_ITEM.find((t) => t.valor === item.tipo)?.etiqueta}
                  {item.categoria ? ` · ${CATEGORIAS_TENIS.find((c) => c.valor === item.categoria)?.etiqueta}` : ''}
                  {' — '}
                  {item.marca} {item.modelo} {item.color}
                  {item.fotos.filter((f) => f.file).length > 0 && (
                    <span className="ml-2 text-xs text-gray-400">
                      {item.fotos.filter((f) => f.file).length}/4 fotos
                    </span>
                  )}
                </span>
                <span className="font-medium text-gray-800">
                  ${(Number(item.costo) || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-gray-700">Foto general de los pares y la nota</span>
            <FotoInput slot={fotoGeneral} etiqueta="Foto general" onChange={asignarFotoGeneral} />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
            <span className="text-sm font-medium text-gray-700">Total</span>
            <span className="text-lg font-bold text-indigo-700">${subtotal.toFixed(2)}</span>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex justify-between">
            <button
              onClick={() => setPaso(1)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Atrás
            </button>
            <button
              onClick={guardar}
              disabled={enviando}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {enviando ? 'Guardando…' : 'Guardar nota'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FotoInput({
  slot,
  etiqueta,
  onChange,
}: {
  slot: FotoSlot;
  etiqueta: string;
  onChange: (archivo: File | null) => void;
}) {
  return (
    <label className="relative block cursor-pointer overflow-hidden rounded-lg border border-gray-300">
      {slot.preview ? (
        <img src={slot.preview} alt={etiqueta} className="h-24 w-full object-cover" />
      ) : (
        <div className="flex h-24 flex-col items-center justify-center gap-1 text-gray-400">
          <span className="text-2xl">📷</span>
          <span className="text-[10px] font-medium">{etiqueta}</span>
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const archivo = e.target.files?.[0] ?? null;
          onChange(archivo);
          e.target.value = '';
        }}
      />
      {slot.preview && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onChange(null);
          }}
          className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white"
        >
          ✕
        </button>
      )}
    </label>
  );
}