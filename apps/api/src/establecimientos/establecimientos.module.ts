import { Module } from '@nestjs/common';
import { EstablecimientosService } from './establecimientos.service.js';
import { EstablecimientosController } from './establecimientos.controller.js';

@Module({
  providers: [EstablecimientosService],
  controllers: [EstablecimientosController],
  exports: [EstablecimientosService],
})
export class EstablecimientosModule {}