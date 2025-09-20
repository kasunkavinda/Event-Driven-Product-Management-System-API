import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ProductInputDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsOptional() description?: string;
  @IsNumber() @Min(0) price!: number;
  @IsInt() @Min(0) quantity!: number;
  @IsString() @IsNotEmpty() category!: string;
}
