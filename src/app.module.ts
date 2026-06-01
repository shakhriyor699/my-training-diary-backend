import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './jwt/access-jwt.guard';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { TrainingPlansModule } from './training-plans/training-plans.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReferencesModule } from './references/references.module';
import { CoachesModule } from './coaches/coaches.module';
import { NutritionModule } from './nutrition/nutrition.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, ConfigModule.forRoot({
    isGlobal: true, // ВАЖНО
  }), TrainingPlansModule, NotificationsModule, ReferencesModule, CoachesModule, NutritionModule,],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    }
  ],
})
export class AppModule { }
