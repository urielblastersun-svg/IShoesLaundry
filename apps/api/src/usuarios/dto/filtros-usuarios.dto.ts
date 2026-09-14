import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Rol } from '../../common/enums.js';

export class FiltersUsuariosDto {
  @IsOptional()
  @IsEnum(Rol)
  rol?: Rol;

  @IsOptional()
  @IsString()
  establecimientoId?: string;
}