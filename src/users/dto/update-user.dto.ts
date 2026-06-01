import { UserApprovalStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { Role } from '../../common/enums/role.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'User name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'test@gmail.com',
    description: 'User email',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: 'testPassword123',
    description: 'User password',
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({
    enum: Role,
    example: Role.USER,
    description: 'User role',
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({
    enum: UserApprovalStatus,
    example: UserApprovalStatus.approved,
    description: 'User approval status',
  })
  @IsOptional()
  @IsEnum(UserApprovalStatus)
  approvalStatus?: UserApprovalStatus;

  @ApiPropertyOptional({
    example: 'Registration request rejected by admin',
    description: 'Reason for rejection',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
