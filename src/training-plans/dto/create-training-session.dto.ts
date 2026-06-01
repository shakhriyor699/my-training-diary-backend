import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({
    example: 1,
    description: 'Set number',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  setNumber: number;

  @ApiProperty({
    example: 80,
    description: 'Weight used in the set',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  weight: number;

  @ApiProperty({
    example: 8,
    description: 'Repetitions completed',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  reps: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Reps in reserve',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  rir?: number;
}

class CreateLegacySetLogDto extends CreateSetLogDto {
  @ApiProperty({
    example: 12,
    description: 'Exercise id',
  })
  @IsInt()
  exerciseId: number;
}

class CreateExerciseLogDto {
  @ApiProperty({
    example: 12,
    description: 'Exercise id',
  })
  @IsInt()
  exerciseId: number;

  @ApiPropertyOptional({
    example: 'Last set felt easier than expected',
    description: 'Optional note for the exercise',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    type: () => [CreateSetLogDto],
    description: 'Completed sets for the exercise',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSetLogDto)
  sets: CreateSetLogDto[];
}

export class CreateTrainingSessionDto {
  @ApiProperty({
    example: 3,
    description: 'Training plan id',
  })
  @IsInt()
  planId: number;

  @ApiProperty({
    example: 5,
    description: 'Workout day id',
  })
  @IsInt()
  workoutDayId: number;

  @ApiPropertyOptional({
    example: '2026-05-15T10:30:00.000Z',
    description: 'Session date in ISO format',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    type: () => [CreateLegacySetLogDto],
    description: 'Legacy flat list of session sets',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLegacySetLogDto)
  sets?: CreateLegacySetLogDto[];

  @ApiPropertyOptional({
    type: () => [CreateExerciseLogDto],
    description: 'Exercise-based payload for the session',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExerciseLogDto)
  exercises?: CreateExerciseLogDto[];
}
