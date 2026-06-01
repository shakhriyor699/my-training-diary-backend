import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateCoachRequestDto {
  @ApiPropertyOptional({
    example: 'Хочу, чтобы вы помогли с программой на массу.',
    description: 'Optional message for the coach',
  })
  @IsOptional()
  @IsString()
  message?: string;
}
