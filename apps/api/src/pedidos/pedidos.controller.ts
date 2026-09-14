import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PedidosService } from './pedidos.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Rol } from '../common/enums.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { UsuarioAutenticado } from '../common/decorators/current-user.decorator.js';
import { CrearPedidoDto } from './dto/crear-pedido.dto.js';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto.js';
import { FiltersPedidosDto } from './dto/filtros-pedidos.dto.js';

@Controller('pedidos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PedidosController {
  constructor(private readonly service: PedidosService) {}

  @Post()
  @Roles(Rol.DESPACHADOR, Rol.ADMIN)
  crear(@Body() dto: CrearPedidoDto, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.service.crear(dto, usuario);
  }

  @Get()
  listar(@Query() filtros: FiltersPedidosDto) {
    return this.service.listar(filtros);
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.service.obtener(id);
  }

  @Patch(':id/estado')
  @Roles(Rol.DESPACHADOR, Rol.TRANSPORTISTA, Rol.ADMIN)
  cambiarEstado(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.cambiarEstado(id, dto.estado, usuario);
  }
}