import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { IsOptional, Matches } from 'class-validator';

export class GetTrainingSessionsDto extends PaginationDto {
  @ApiPropertyOptional({
    example: '2026-05-17',
    description: 'Filter sessions by calendar date in YYYY-MM-DD format',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date?: string;
}
