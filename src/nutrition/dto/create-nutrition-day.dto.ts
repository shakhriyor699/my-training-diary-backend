import { IsInt, IsString, Min } from 'class-validator';

export class CreateNutritionDayDto {
  @IsInt()
  @Min(1)
  dayNumber: number;

  @IsString()
  title: string;
}