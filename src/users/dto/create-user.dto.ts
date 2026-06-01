import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../../common/enums/role.enum';
import { ApiProperty } from '@nestjs/swagger';
import { UserApprovalStatus } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'User name',
  })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    example: 'test@gmail.com',
    description: 'User email',
  })
  @IsEmail()
  email: string;


  @ApiProperty({
    example: 'testPassword123',
    description: 'User password',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    enum: Role,
    example: Role.USER,
    description: 'User role',
  })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({
    enum: UserApprovalStatus,
    example: UserApprovalStatus.approved,
    description: 'User approval status',
    required: false,
  })
  @IsOptional()
  @IsEnum(UserApprovalStatus)
  approvalStatus?: UserApprovalStatus;
}
