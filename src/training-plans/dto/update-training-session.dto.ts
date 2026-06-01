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

class UpdateSetLogDto {
  @ApiPropertyOptional({
    example: 15,
    description: 'Existing set log id for update',
  })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiPropertyOptional({
    example: 12,
    description: 'Exercise id for legacy flat payload',
  })
  @IsOptional()
  @IsInt()
  exerciseId?: number;

  @ApiProperty({
    example: 2,
    description: 'Set number',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  setNumber: number;

  @ApiProperty({
    example: 82.5,
    description: 'Weight used in the set',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  weight: number;

  @ApiProperty({
    example: 6,
    description: 'Repetitions completed',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  reps: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Reps in reserve',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  rir?: number;
}

class UpdateLegacySetLogDto extends UpdateSetLogDto {
  @ApiProperty({
    example: 12,
    description: 'Exercise id',
  })
  @IsInt()
  declare exerciseId: number;
}

class UpdateExerciseLogDto {
  @ApiProperty({
    example: 12,
    description: 'Exercise id',
  })
  @IsInt()
  exerciseId: number;

  @ApiPropertyOptional({
    example: 'Adjusted technique on the final set',
    description: 'Optional note for the exercise',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    type: () => [UpdateSetLogDto],
    description: 'Updated sets for the exercise',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSetLogDto)
  sets: UpdateSetLogDto[];
}

export class UpdateTrainingSessionDto {
  @ApiPropertyOptional({
    example: 5,
    description: 'Workout day id',
  })
  @IsOptional()
  @IsInt()
  workoutDayId?: number;

  @ApiPropertyOptional({
    example: '2026-05-15T10:30:00.000Z',
    description: 'Session date in ISO format',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    type: () => [UpdateLegacySetLogDto],
    description: 'Legacy flat list of session sets',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateLegacySetLogDto)
  sets?: UpdateLegacySetLogDto[];

  @ApiPropertyOptional({
    type: () => [UpdateExerciseLogDto],
    description: 'Exercise-based session payload matching session creation',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateExerciseLogDto)
  exercises?: UpdateExerciseLogDto[];
}
