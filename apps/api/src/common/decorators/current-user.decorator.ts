import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Usuario } from '@prisma/client';

export interface UsuarioAutenticado {
  sub: string;
  email: string;
  rol: string;
  nombre: string;
  establecimientoId?: string | null;
  usuario?: Usuario;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioAutenticado => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);