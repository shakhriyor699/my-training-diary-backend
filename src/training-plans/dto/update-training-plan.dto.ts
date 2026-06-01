import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateTrainingPlanDto {
  @ApiPropertyOptional({
    example: 'New title',
    description: 'Updated title for the training plan',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: 'New description',
    description: 'Updated description for the training plan',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
