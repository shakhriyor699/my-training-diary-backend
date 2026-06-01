import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetCoachesDto {
  @ApiPropertyOptional({
    example: 'john',
    description: 'Search coaches by name',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
