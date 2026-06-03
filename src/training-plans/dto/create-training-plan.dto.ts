import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { TrainingGoal } from '@prisma/client';

export class CreateTrainingPlanDto {
  @ApiProperty({
    example: 'Upper/Lower Mass Program',
    description: 'Training plan title',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    example: '4-day split with progressive overload',
    description: 'Training plan description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: TrainingGoal,
    example: TrainingGoal.bulk,
    description: 'Primary training goal',
  })
  @IsOptional()
  @IsEnum(TrainingGoal)
  goal?: TrainingGoal;

  @ApiPropertyOptional({
    example: 6,
    description: 'Weeks before a deload week',
    minimum: 3,
    maximum: 52,
  })
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(52)
  deloadAfterWeeks?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Load reduction percentage during deload',
    minimum: 5,
    maximum: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(30)
  deloadPercent?: number;
}
