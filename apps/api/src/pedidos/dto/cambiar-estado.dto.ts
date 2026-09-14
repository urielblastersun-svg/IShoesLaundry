import { IsEnum } from 'class-validator';
import { EstadoPedido } from '../../common/enums.js';

export class CambiarEstadoDto {
  @IsEnum(EstadoPedido)
  estado!: EstadoPedido;
}