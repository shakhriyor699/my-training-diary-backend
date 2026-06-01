import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class GetNotificationsDto extends PaginationDto {
  @ApiPropertyOptional({
    example: false,
    description: 'Filter notifications by read status',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRead: boolean;
}
