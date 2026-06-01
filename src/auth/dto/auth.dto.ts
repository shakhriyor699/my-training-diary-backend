import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNumber, IsString, MinLength } from 'class-validator';

export class AuthDto {
  @ApiProperty({
    example: 'test@gmail.com',
    description: 'User email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'User password, at least 6 characters',
  })
  @MinLength(6)
  password: string;
}

export class RegisterDto extends AuthDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'User name',
  })
  @IsString()
  @MinLength(2)
  name: string;
}

export class RefreshDto {
  @ApiProperty({
    example: 1,
    description: 'User id from access payload',
  })
  @IsNumber()
  userId: number;

  @ApiProperty({
    example: 'refresh-token-value',
    description: 'Refresh token string',
  })
  @IsString()
  refreshToken: string;
}
