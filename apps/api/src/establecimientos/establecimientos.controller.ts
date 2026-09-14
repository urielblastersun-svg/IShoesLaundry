import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Rol } from '../common/enums.js';
import { EstablecimientosService } from './establecimientos.service.js';
import { CrearEstablecimientoDto } from './dto/crear-establecimiento.dto.js';
import { ActualizarEstablecimientoDto } from './dto/actualizar-establecimiento.dto.js';

@Controller('establecimientos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EstablecimientosController {
  constructor(private readonly service: EstablecimientosService) {}

  @Get()
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  async obtener(@Param('id') id: string) {
    return this.service.obtener(id);
  }

  @Post()
  @Roles(Rol.ADMIN)
  crear(@Body() dto: CrearEstablecimientoDto) {
    return this.service.crear(dto);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN)
  actualizar(@Param('id') id: string, @Body() dto: ActualizarEstablecimientoDto) {
    return this.service.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN)
  eliminar(@Param('id') id: string) {
    return this.service.eliminar(id);
  }
}