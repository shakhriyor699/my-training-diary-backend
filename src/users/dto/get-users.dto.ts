import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserApprovalStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Role } from '../../common/enums/role.enum';

export class GetUsersDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: Role,
    example: Role.USER,
    description: 'Filter users by role',
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({
    example: 'john',
    description: 'Search by email or name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: UserApprovalStatus,
    example: UserApprovalStatus.pending,
    description: 'Filter users by approval status',
  })
  @IsOptional()
  @IsEnum(UserApprovalStatus)
  approvalStatus?: UserApprovalStatus;
}
