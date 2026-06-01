import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateSetLogDto {
  @IsInt()
  @Min(1)
  setNumber: number;

  @IsNumber()
  @Min(0)
  weight: number;

  @IsInt()
  @Min(1)
  reps: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  rir?: number;
}

class CreateExerciseLogDto {
  @IsInt()
  exerciseId: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSetLogDto)
  sets: CreateSetLogDto[];
}

export class CreateTrainingSessionDto {
  @IsInt()
  planId: number;

  @IsInt()
  workoutDayId: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExerciseLogDto)
  exercises: CreateExerciseLogDto[];
}