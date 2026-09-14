export type Rol = 'DESPACHADOR' | 'TRANSPORTISTA' | 'ADMIN';

export type EstadoPedido =
  | 'NUEVO'
  | 'EN_TRANSPORTE'
  | 'EN_LAVADO'
  | 'TERMINADO'
  | 'ENTREGADO';

export type TipoItem = 'TENIS' | 'GORRA' | 'MOCHILA';

export type CategoriaTenis = 'BLANCO' | 'COLOR' | 'NINIO' | 'PIEL_GAMUZA';

export type TipoFoto = 'ANGULO_1' | 'ANGULO_2' | 'ANGULO_3' | 'ANGULO_4' | 'GENERAL';

export interface Establecimiento {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  activo: boolean;
  createdAt: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string;
  rol: Rol;
  activo: boolean;
  establecimientoId: string | null;
  establecimiento?: Pick<Establecimiento, 'id' | 'nombre' | 'direccion' | 'ciudad'> | null;
  createdAt?: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
}

export interface Foto {
  id: string;
  pedidoId: string;
  itemId: string | null;
  tipo: TipoFoto;
  url: string;
  almacenEn: 'LOCAL' | 'GCS';
  createdAt: string;
}

export interface Item {
  id: string;
  tipo: TipoItem;
  categoria: CategoriaTenis | null;
  marca: string;
  modelo: string;
  color: string;
  talla: string | null;
  costo: number | string;
  fotos: Foto[];
}

export interface HistorialEstado {
  id: string;
  estado: EstadoPedido;
  usuario: { id: string; nombre: string };
  timestamp: string;
}

export interface Pedido {
  id: string;
  folio: string;
  estado: EstadoPedido;
  subtotal: number | string;
  descuento: number | string;
  total: number | string;
  notas: string | null;
  createdAt: string;
  cliente: Cliente;
  establecimiento: Pick<Establecimiento, 'id' | 'nombre' | 'direccion' | 'ciudad'>;
  empleado: { id: string; nombre: string };
  items: Item[];
  fotos: Foto[];
  historial: HistorialEstado[];
  _count?: { items: number; fotos: number };
}

export const ESTADOS: Record<EstadoPedido, string> = {
  NUEVO: 'Nuevo',
  EN_TRANSPORTE: 'En transporte',
  EN_LAVADO: 'En lavado',
  TERMINADO: 'Terminado',
  ENTREGADO: 'Entregado',
};

export const CATEGORIAS_TENIS: { valor: CategoriaTenis; etiqueta: string }[] = [
  { valor: 'BLANCO', etiqueta: 'Blancos' },
  { valor: 'COLOR', etiqueta: 'De color' },
  { valor: 'NINIO', etiqueta: 'Niños' },
  { valor: 'PIEL_GAMUZA', etiqueta: 'Piel / gamuza' },
];

export const TIPOS_ITEM: { valor: TipoItem; etiqueta: string }[] = [
  { valor: 'TENIS', etiqueta: 'Tenis' },
  { valor: 'GORRA', etiqueta: 'Gorra' },
  { valor: 'MOCHILA', etiqueta: 'Mochila' },
];