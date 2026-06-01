import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateWorkoutDayDto {
  @ApiProperty({
    example: 'Push Day',
    description: 'Workout day title',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    example: 0,
    description: 'Workout day order inside the plan',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
