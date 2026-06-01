import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ExerciseType, MuscleGroup } from '@prisma/client';

export class CreateExerciseDto {
  @ApiProperty({
    example: 'Barbell Bench Press',
    description: 'Exercise name',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'Pause on the chest and press explosively',
    description: 'Exercise description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 0,
    description: 'Exercise order within the workout day',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    enum: ExerciseType,
    example: ExerciseType.compound,
    description: 'Exercise type',
  })
  @IsOptional()
  @IsEnum(ExerciseType)
  type?: ExerciseType;

  @ApiPropertyOptional({
    enum: MuscleGroup,
    example: MuscleGroup.chest,
    description: 'Primary muscle group',
  })
  @IsOptional()
  @IsEnum(MuscleGroup)
  muscleGroup?: MuscleGroup;

  @ApiPropertyOptional({
    example: 4,
    description: 'Target number of sets',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  targetSets?: number;

  @ApiPropertyOptional({
    example: 6,
    description: 'Minimum target reps',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  minReps?: number;

  @ApiPropertyOptional({
    example: 8,
    description: 'Maximum target reps',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxReps?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Target reps in reserve',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  targetRir?: number;

  @ApiPropertyOptional({
    example: 2.5,
    description: 'Weight increment step',
    minimum: 0.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  weightStep?: number;
}
