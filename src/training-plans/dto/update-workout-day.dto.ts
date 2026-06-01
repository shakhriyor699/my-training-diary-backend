import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateWorkoutDayDto {
  @ApiPropertyOptional({
    example: 'Leg Day',
    description: 'Updated workout day title',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Updated workout day order',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
