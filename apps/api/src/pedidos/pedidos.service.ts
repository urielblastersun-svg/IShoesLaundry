import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { EstadoPedido, Rol, TipoFoto } from '../common/enums.js';
import { UsuarioAutenticado } from '../common/decorators/current-user.decorator.js';
import { CrearPedidoDto } from './dto/crear-pedido.dto.js';
import { FiltersPedidosDto } from './dto/filtros-pedidos.dto.js';

const TRANSICIONES: Record<EstadoPedido, { destino: EstadoPedido; roles: Rol[] }> = {
  [EstadoPedido.NUEVO]: {
    destino: EstadoPedido.EN_TRANSPORTE,
    roles: [Rol.TRANSPORTISTA, Rol.ADMIN],
  },
  [EstadoPedido.EN_TRANSPORTE]: {
    destino: EstadoPedido.EN_LAVADO,
    roles: [Rol.ADMIN],
  },
  [EstadoPedido.EN_LAVADO]: {
    destino: EstadoPedido.TERMINADO,
    roles: [Rol.ADMIN],
  },
  [EstadoPedido.TERMINADO]: {
    destino: EstadoPedido.ENTREGADO,
    roles: [Rol.ADMIN, Rol.DESPACHADOR],
  },
  [EstadoPedido.ENTREGADO]: {
    destino: EstadoPedido.ENTREGADO,
    roles: [],
  },
};

@Injectable()
export class PedidosService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(dto: CrearPedidoDto, usuario: UsuarioAutenticado) {
    if (dto.items.length === 0) {
      throw new BadRequestException('El pedido debe incluir al menos un artículo');
    }

    const establecimientoId = dto.establecimientoId ?? usuario.establecimientoId;
    if (!establecimientoId) {
      throw new BadRequestException(
        'No se determinó un establecimiento para el pedido',
      );
    }

    const cliente = await this.prisma.cliente.upsert({
      where: { telefono: dto.cliente.telefono },
      update: { nombre: dto.cliente.nombre },
      create: {
        nombre: dto.cliente.nombre,
        telefono: dto.cliente.telefono,
      },
    });

    const subtotal = dto.items.reduce((acc, item) => acc + item.costo, 0);

    const folio = await this.generarFolio();
    const qrRef = randomUUID();

    const { items, fotosGenerales } = dto;
    const pedido = await this.prisma.$transaction(async (tx) => {
      const creado = await tx.pedido.create({
        data: {
          folio,
          qrRef,
          clienteId: cliente.id,
          establecimientoId,
          empleadoId: usuario.sub,
          estado: EstadoPedido.NUEVO,
          subtotal,
          descuento: 0,
          total: subtotal,
          notas: dto.notas,
          items: {
            create: items.map((item) => ({
              tipo: item.tipo,
              categoria: item.categoria,
              marca: item.marca,
              modelo: item.modelo,
              color: item.color,
              talla: item.talla,
              costo: item.costo,
            })),
          },
        },
        include: { items: true },
      });

      const itemRows = creado.items;
      await Promise.all(
        itemRows.map(async (itemRow, i) => {
          const urls = items[i]?.fotos ?? [];
          if (urls.length === 0) {
            return;
          }
          await tx.foto.createMany({
            data: urls.slice(0, 4).map((url, j) => ({
              pedidoId: creado.id,
              itemId: itemRow.id,
              tipo: this.tipoAngulo(j),
              url,
            })),
          });
        }),
      );

      if (fotosGenerales && fotosGenerales.length > 0) {
        await tx.foto.createMany({
          data: fotosGenerales.map((url) => ({
            pedidoId: creado.id,
            itemId: null,
            tipo: TipoFoto.GENERAL,
            url,
          })),
        });
      }

      await tx.historialEstado.create({
        data: {
          pedidoId: creado.id,
          estado: EstadoPedido.NUEVO,
          usuarioId: usuario.sub,
        },
      });

      return creado;
    });

    return this.obtener(pedido.id);
  }

  async listar(filtros: FiltersPedidosDto) {
    const donde = {
      ...(filtros.estado ? { estado: filtros.estado } : {}),
      ...(filtros.establecimientoId
        ? { establecimientoId: filtros.establecimientoId }
        : {}),
      ...(filtros.folio ? { folio: filtros.folio } : {}),
      ...(filtros.desde || filtros.hasta
        ? {
            createdAt: {
              ...(filtros.desde ? { gte: new Date(filtros.desde) } : {}),
              ...(filtros.hasta ? { lte: new Date(filtros.hasta) } : {}),
            },
          }
        : {}),
      ...(filtros.q
        ? {
            OR: [
              { folio: { contains: filtros.q, mode: 'insensitive' as const } },
              {
                cliente: {
                  OR: [
                    { nombre: { contains: filtros.q, mode: 'insensitive' as const } },
                    { telefono: { contains: filtros.q } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    return this.prisma.pedido.findMany({
      where: donde,
      orderBy: { createdAt: 'desc' },
      include: {
        cliente: true,
        establecimiento: true,
        empleado: { select: { id: true, nombre: true } },
        _count: { select: { items: true, fotos: true } },
      },
    });
  }

  async obtener(id: string) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
      include: {
        cliente: true,
        establecimiento: true,
        empleado: { select: { id: true, nombre: true } },
        items: {
          include: { fotos: true },
          orderBy: { id: 'asc' },
        },
        fotos: { where: { itemId: null } },
        historial: {
          include: { usuario: { select: { id: true, nombre: true } } },
          orderBy: { timestamp: 'asc' },
        },
      },
    });
    if (!pedido) {
      throw new NotFoundException('Pedido no encontrado');
    }
    return pedido;
  }

  async cambiarEstado(id: string, estado: EstadoPedido, usuario: UsuarioAutenticado) {
    const pedido = await this.prisma.pedido.findUnique({ where: { id } });
    if (!pedido) {
      throw new NotFoundException('Pedido no encontrado');
    }
    const transicion = TRANSICIONES[pedido.estado];
    if (transicion.destino !== estado) {
      throw new BadRequestException(
        `Transición no permitida de ${pedido.estado} a ${estado}`,
      );
    }
    if (transicion.roles.length > 0 && !transicion.roles.includes(usuario.rol as Rol)) {
      throw new ForbiddenException('Tu rol no permite este cambio de estado');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.historialEstado.create({
        data: { pedidoId: id, estado, usuarioId: usuario.sub },
      });
      return tx.pedido.update({ where: { id }, data: { estado } });
    });
  }

  private async generarFolio(): Promise<string> {
    const anio = new Date().getFullYear();
    const ultimo = await this.prisma.pedido.findFirst({
      where: { folio: { startsWith: `IL-${anio}` } },
      orderBy: { folio: 'desc' },
    });
    const secuencia = ultimo ? Number(ultimo.folio.split('-')[2]) + 1 : 1000;
    return `IL-${anio}-${String(secuencia).padStart(4, '0')}`;
  }

  private tipoAngulo(index: number): TipoFoto {
    const tipos = [
      TipoFoto.ANGULO_1,
      TipoFoto.ANGULO_2,
      TipoFoto.ANGULO_3,
      TipoFoto.ANGULO_4,
    ];
    return tipos[index] ?? TipoFoto.ANGULO_1;
  }
}