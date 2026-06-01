import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserApprovalStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

import * as bcrypt from 'bcrypt';
import { AuthDto, RegisterDto } from './dto/auth.dto';
import { StringValue } from 'ms';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService
  ) { }


  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const hash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        password: hash,
      },
      select: {
        id: true,
        email: true,
        role: true,
        approvalStatus: true,
      },
    });

    return {
      message: 'Registration request created. Wait for admin approval.',
      user,
    };
  }



  async issueTokens(userId: number, role: string) {
    const payload = { sub: userId, role };

    const accessToken = this.jwt.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: (process.env.JWT_ACCESS_EXPIRES || '1h') as StringValue,
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: (process.env.JWT_REFRESH_EXPIRES || '7d') as StringValue,
    });

    await this.saveRefreshToken(userId, refreshToken);

    return { accessToken, refreshToken };
  }

  async saveRefreshToken(userId: number, token: string) {
    const hash = await bcrypt.hash(token, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hash },
    });
  }


  async login(dto: AuthDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException();

    this.ensureUserApproved(user.approvalStatus, user.rejectionReason);

    return this.issueTokens(user.id, user.role);
  }


  async refresh(userId: number, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.refreshToken) throw new ForbiddenException();

    this.ensureUserApproved(user.approvalStatus, user.rejectionReason);

    const match = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!match) throw new ForbiddenException();

    return this.issueTokens(user.id, user.role);
  }





  async logout(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  private ensureUserApproved(
    approvalStatus: UserApprovalStatus,
    rejectionReason: string | null,
  ) {
    if (approvalStatus === UserApprovalStatus.approved) {
      return;
    }

    if (approvalStatus === UserApprovalStatus.pending) {
      throw new ForbiddenException({
        message: 'Your account is waiting for admin approval.',
        approvalStatus,
      });
    }

    throw new ForbiddenException({
      message: 'Your registration request was rejected.',
      approvalStatus,
      rejectionReason,
    });
  }

}
