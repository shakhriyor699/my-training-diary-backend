import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserApprovalStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateUserApprovalDto {
  @ApiProperty({
    enum: UserApprovalStatus,
    example: UserApprovalStatus.approved,
    description: 'User approval status',
  })
  @IsEnum(UserApprovalStatus)
  status: UserApprovalStatus;

  @ApiPropertyOptional({
    example: 'Registration request was rejected by admin',
    description: 'Reason for rejection',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
