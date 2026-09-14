import { PartialType } from '@nestjs/mapped-types';
import { CrearEstablecimientoDto } from './crear-establecimiento.dto.js';

export class ActualizarEstablecimientoDto extends PartialType(CrearEstablecimientoDto) {}