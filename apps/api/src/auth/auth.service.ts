import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { Rol } from '../common/enums.js';

export interface PayloadJwt {
  sub: string;
  email: string;
  rol: Rol;
  nombre: string;
  establecimientoId?: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async validarCredenciales(email: string, password: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      include: { establecimiento: true },
    });
    if (!usuario || !usuario.activo) {
      return null;
    }
    const ok = await bcrypt.compare(password, usuario.passwordHash);
    if (!ok) {
      return null;
    }
    return usuario;
  }

  async login(email: string, password: string) {
    const usuario = await this.validarCredenciales(email, password);
    if (!usuario) {
      throw new Error('Credenciales inválidas');
    }
    const payload: PayloadJwt = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      nombre: usuario.nombre,
      establecimientoId: usuario.establecimientoId,
    };
    return {
      accessToken: this.jwt.sign(payload),
      usuario: this.sanitizar(usuario),
    };
  }

  async perfil(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { establecimiento: true },
    });
    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }
    return this.sanitizar(usuario);
  }

  private sanitizar(usuario: {
    id: string;
    nombre: string;
    telefono: string | null;
    email: string;
    rol: Rol;
    activo: boolean;
    establecimientoId: string | null;
    establecimiento?: { id: string; nombre: string; direccion: string; ciudad: string } | null;
  }) {
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      telefono: usuario.telefono,
      email: usuario.email,
      rol: usuario.rol,
      activo: usuario.activo,
      establecimientoId: usuario.establecimientoId,
      establecimiento: usuario.establecimiento,
    };
  }
}