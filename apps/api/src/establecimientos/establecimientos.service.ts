import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CrearEstablecimientoDto } from './dto/crear-establecimiento.dto.js';
import { ActualizarEstablecimientoDto } from './dto/actualizar-establecimiento.dto.js';

@Injectable()
export class EstablecimientosService {
  constructor(private readonly prisma: PrismaService) {}

  listar(activosSolo = true) {
    return this.prisma.establecimiento.findMany({
      where: activosSolo ? { activo: true } : undefined,
      orderBy: { nombre: 'asc' },
    });
  }

  async obtener(id: string) {
    const encontrado = await this.prisma.establecimiento.findUnique({ where: { id } });
    if (!encontrado) {
      throw new NotFoundException('Establecimiento no encontrado');
    }
    return encontrado;
  }

  crear(dto: CrearEstablecimientoDto) {
    return this.prisma.establecimiento.create({ data: dto });
  }

  async actualizar(id: string, dto: ActualizarEstablecimientoDto) {
    await this.obtener(id);
    return this.prisma.establecimiento.update({ where: { id }, data: dto });
  }

  async eliminar(id: string) {
    await this.obtener(id);
    return this.prisma.establecimiento.update({
      where: { id },
      data: { activo: false },
    });
  }
}