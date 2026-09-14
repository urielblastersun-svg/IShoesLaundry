import { IsString, MinLength } from 'class-validator';

export class CrearEstablecimientoDto {
  @IsString()
  @MinLength(2)
  nombre!: string;

  @IsString()
  direccion!: string;

  @IsString()
  ciudad!: string;
}