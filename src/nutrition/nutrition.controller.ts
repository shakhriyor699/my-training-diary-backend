import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { NutritionService } from './nutrition.service';
import { CreateNutritionPlanDto } from './dto/create-nutrition-plan.dto';
import { CreateNutritionDayDto } from './dto/create-nutrition-day.dto';
import { CreateNutritionMealDto } from './dto/create-nutrition-meal.dto';
import { CreateNutritionFoodDto } from './dto/create-nutrition-food.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('access-token')
@Controller('nutrition')
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Post('students/:studentId/plans')
  @Roles(Role.coach)
  @UseGuards(RolesGuard)
  createPlanForStudent(
    @CurrentUser('sub') coachId: number,
    @Param('studentId') studentId: string,
    @Body() dto: CreateNutritionPlanDto,
  ) {
    return this.nutritionService.createPlanForStudent(
      coachId,
      +studentId,
      dto,
    );
  }

  @Get('my/plans')
  getMyPlans(@CurrentUser('sub') userId: number) {
    return this.nutritionService.getMyPlans(userId);
  }

  @Get('students/:studentId/plans')
  @Roles(Role.coach)
  @UseGuards(RolesGuard)
  getStudentPlans(
    @CurrentUser('sub') coachId: number,
    @Param('studentId') studentId: string,
  ) {
    return this.nutritionService.getStudentPlans(coachId, +studentId);
  }

  @Get('plans/:planId')
  getPlanById(
    @CurrentUser('sub') userId: number,
    @Param('planId') planId: string,
  ) {
    return this.nutritionService.getPlanById(userId, +planId);
  }

  @Post('plans/:planId/days')
  @Roles(Role.coach)
  @UseGuards(RolesGuard)
  addDay(
    @CurrentUser('sub') coachId: number,
    @Param('planId') planId: string,
    @Body() dto: CreateNutritionDayDto,
  ) {
    return this.nutritionService.addDay(coachId, +planId, dto);
  }

  @Post('days/:dayId/meals')
  @Roles(Role.coach)
  @UseGuards(RolesGuard)
  addMeal(
    @CurrentUser('sub') coachId: number,
    @Param('dayId') dayId: string,
    @Body() dto: CreateNutritionMealDto,
  ) {
    return this.nutritionService.addMeal(coachId, +dayId, dto);
  }

  @Post('meals/:mealId/foods')
  @Roles(Role.coach)
  @UseGuards(RolesGuard)
  addFood(
    @CurrentUser('sub') coachId: number,
    @Param('mealId') mealId: string,
    @Body() dto: CreateNutritionFoodDto,
  ) {
    return this.nutritionService.addFood(coachId, +mealId, dto);
  }

  @Delete('plans/:planId')
  @Roles(Role.coach)
  @UseGuards(RolesGuard)
  deletePlan(
    @CurrentUser('sub') coachId: number,
    @Param('planId') planId: string,
  ) {
    return this.nutritionService.deletePlan(coachId, +planId);
  }
}