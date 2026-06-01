import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthDto, RegisterDto } from './dto/auth.dto';
import { JwtService } from '@nestjs/jwt';
import { RefreshJwtGuard } from '../jwt/refresh-jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/types/jwt-payload.interface';
import { Public } from '../common/decorators/public.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';


@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService, private jwt: JwtService) { }

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }


  @Public()
  @Post('login')
  async login(@Body() dto: AuthDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.login(dto);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: false, // true на https
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken: tokens.accessToken };
  }


  @Public()
  @Post('refresh')
  @UseGuards(RefreshJwtGuard)
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const user = req.user;

    const tokens = await this.auth.refresh(
      user.sub,
      user.refreshToken,
    );

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken: tokens.accessToken };
  }

  @ApiBearerAuth('access-token')
  @Get('profile')
  getProfile(@CurrentUser() user: JwtPayload) {
    return user
  }


  @Post('logout')
  logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    res.clearCookie('refreshToken');
    return this.auth.logout(req.user.sub);
  }
}
