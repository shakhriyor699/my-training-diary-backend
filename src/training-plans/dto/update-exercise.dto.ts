import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ExerciseType, MuscleGroup } from '@prisma/client';

export class UpdateExerciseDto {
  @ApiPropertyOptional({
    example: 'Incline Dumbbell Press',
    description: 'Updated exercise name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'Focus on controlled eccentric phase',
    description: 'Updated exercise description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Updated exercise order',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    enum: ExerciseType,
    example: ExerciseType.compound,
    description: 'Updated exercise type',
  })
  @IsOptional()
  @IsEnum(ExerciseType)
  type?: ExerciseType;

  @ApiPropertyOptional({
    enum: MuscleGroup,
    example: MuscleGroup.chest,
    description: 'Updated primary muscle group',
  })
  @IsOptional()
  @IsEnum(MuscleGroup)
  muscleGroup?: MuscleGroup;

  @ApiPropertyOptional({
    example: 4,
    description: 'Updated target number of sets',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  targetSets?: number;

  @ApiPropertyOptional({
    example: 8,
    description: 'Updated minimum target reps',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  minReps?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Updated maximum target reps',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxReps?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Updated target reps in reserve',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  targetRir?: number;

  @ApiPropertyOptional({
    example: 1.25,
    description: 'Updated weight increment step',
    minimum: 0.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  weightStep?: number;
}
