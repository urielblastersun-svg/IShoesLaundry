import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { CrearUsuarioDto } from './dto/crear-usuario.dto.js';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto.js';
import { FiltersUsuariosDto } from './dto/filtros-usuarios.dto.js';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(filtros: FiltersUsuariosDto) {
    return this.prisma.usuario.findMany({
      where: {
        ...(filtros.rol ? { rol: filtros.rol } : {}),
        ...(filtros.establecimientoId
          ? { establecimientoId: filtros.establecimientoId }
          : {}),
      },
      select: {
        id: true,
        nombre: true,
        telefono: true,
        email: true,
        rol: true,
        activo: true,
        establecimientoId: true,
        establecimiento: {
          select: { id: true, nombre: true, direccion: true, ciudad: true },
        },
        createdAt: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async obtener(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        telefono: true,
        email: true,
        rol: true,
        activo: true,
        establecimientoId: true,
        establecimiento: {
          select: { id: true, nombre: true, direccion: true, ciudad: true },
        },
        createdAt: true,
      },
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return usuario;
  }

  async crear(dto: CrearUsuarioDto) {
    const existe = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    if (existe) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const { password: _ignored, ...data } = dto;
    return this.prisma.usuario.create({
      data: { ...data, passwordHash },
      select: {
        id: true,
        nombre: true,
        telefono: true,
        email: true,
        rol: true,
        activo: true,
        establecimientoId: true,
      },
    });
  }

  async actualizar(id: string, dto: ActualizarUsuarioDto) {
    await this.obtener(id);
    const data: Record<string, unknown> = { ...dto };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
      delete data.password;
    }
    return this.prisma.usuario.update({
      where: { id },
      data,
      select: {
        id: true,
        nombre: true,
        telefono: true,
        email: true,
        rol: true,
        activo: true,
        establecimientoId: true,
      },
    });
  }

  async eliminar(id: string) {
    await this.obtener(id);
    return this.prisma.usuario.update({
      where: { id },
      data: { activo: false },
      select: { id: true, activo: true },
    });
  }
}