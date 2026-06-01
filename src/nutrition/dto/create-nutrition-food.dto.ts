import { IsInt, IsNumber, IsString, Min } from 'class-validator';

export class CreateNutritionFoodDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(1)
  grams: number;

  @IsInt()
  @Min(0)
  calories: number;

  @IsNumber()
  @Min(0)
  protein: number;

  @IsNumber()
  @Min(0)
  fat: number;

  @IsNumber()
  @Min(0)
  carbs: number;
}