import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';
import { EstadoPedido } from '../../common/enums.js';

export class FiltersPedidosDto {
  @IsOptional()
  @IsEnum(EstadoPedido)
  estado?: EstadoPedido;

  @IsOptional()
  @IsString()
  establecimientoId?: string;

  @IsOptional()
  @IsISO8601()
  desde?: string;

  @IsOptional()
  @IsISO8601()
  hasta?: string;

  @IsOptional()
  @IsString()
  folio?: string;

  @IsOptional()
  @IsString()
  q?: string;
}