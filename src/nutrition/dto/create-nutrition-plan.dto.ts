import { ActivityLevel, Gender, NutritionGoal } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';


export class CreateNutritionPlanDto {
  @IsString()
  title: string;

  @IsEnum(NutritionGoal)
  goal: NutritionGoal;

  @IsNumber()
  @Min(20)
  @Max(300)
  weightKg: number;

  @IsNumber()
  @Min(100)
  @Max(250)
  heightCm: number;

  @IsInt()
  @Min(10)
  @Max(100)
  age: number;

  @IsEnum(Gender)
  gender: Gender;

  @IsEnum(ActivityLevel)
  activity: ActivityLevel;
}