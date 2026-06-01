import { IsOptional, IsString } from 'class-validator';

export class CreateNutritionMealDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  time?: string;
}