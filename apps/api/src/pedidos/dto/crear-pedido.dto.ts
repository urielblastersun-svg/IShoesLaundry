import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CategoriaTenis, TipoItem } from '../../common/enums.js';

export class ClienteDto {
  @IsString()
  @MinLength(2)
  nombre!: string;

  @IsString()
  @MinLength(7)
  telefono!: string;
}

export class CrearItemDto {
  @IsEnum(TipoItem)
  tipo!: TipoItem;

  @IsOptional()
  @IsEnum(CategoriaTenis)
  categoria?: CategoriaTenis;

  @IsString()
  @MinLength(1)
  marca!: string;

  @IsString()
  @MinLength(1)
  modelo!: string;

  @IsString()
  @MinLength(1)
  color!: string;

  @IsOptional()
  @IsString()
  talla?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costo!: number;

  @IsOptional()
  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  fotos?: string[];
}

export class CrearPedidoDto {
  @IsOptional()
  @IsString()
  establecimientoId?: string;

  @ValidateNested()
  @Type(() => ClienteDto)
  cliente!: ClienteDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrearItemDto)
  items!: CrearItemDto[];

  @IsOptional()
  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  fotosGenerales?: string[];

  @IsOptional()
  @IsString()
  notas?: string;
}