import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';


import { CreateNutritionPlanDto } from './dto/create-nutrition-plan.dto';
import { CreateNutritionDayDto } from './dto/create-nutrition-day.dto';
import { CreateNutritionMealDto } from './dto/create-nutrition-meal.dto';
import { CreateNutritionFoodDto } from './dto/create-nutrition-food.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLevel, CoachRequestStatus, Gender, NutritionGoal, Role } from '@prisma/client';

@Injectable()
export class NutritionService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureIsMyStudent(coachId: number, studentId: number) {
    const relation = await this.prisma.coachRequest.findFirst({
      where: {
        coachId,
        studentId,
        status: CoachRequestStatus.accepted,
      },
    });

    if (!relation) {
      throw new ForbiddenException('This user is not your student');
    }

    return relation;
  }

  private calculateBmr(data: {
    gender: Gender;
    weightKg: number;
    heightCm: number;
    age: number;
  }) {
    const base = 10 * data.weightKg + 6.25 * data.heightCm - 5 * data.age;

    if (data.gender === Gender.male) {
      return base + 5;
    }

    return base - 161;
  }

  private getActivityMultiplier(activity: ActivityLevel) {
    switch (activity) {
      case ActivityLevel.low:
        return 1.2;

      case ActivityLevel.medium:
        return 1.55;

      case ActivityLevel.high:
        return 1.75;

      default:
        return 1.2;
    }
  }

  private applyGoalCalories(tdee: number, goal: NutritionGoal) {
    switch (goal) {
      case NutritionGoal.bulk:
        return Math.round(tdee + 300);

      case NutritionGoal.cut:
        return Math.round(tdee - 400);

      case NutritionGoal.maintenance:
        return Math.round(tdee);

      default:
        return Math.round(tdee);
    }
  }

  private calculateMacros(data: {
    calories: number;
    weightKg: number;
    goal: NutritionGoal;
  }) {
    const proteinPerKg = data.goal === NutritionGoal.cut ? 2.2 : 2;
    const fatPerKg = 0.9;

    const proteinGrams = Math.round(data.weightKg * proteinPerKg);
    const fatGrams = Math.round(data.weightKg * fatPerKg);

    const proteinCalories = proteinGrams * 4;
    const fatCalories = fatGrams * 9;

    const carbsGrams = Math.round(
      (data.calories - proteinCalories - fatCalories) / 4,
    );

    return {
      proteinGrams,
      fatGrams,
      carbsGrams: Math.max(carbsGrams, 0),
    };
  }

  async createPlanForStudent(
    coachId: number,
    studentId: number,
    dto: CreateNutritionPlanDto,
  ) {
    await this.ensureIsMyStudent(coachId, studentId);

    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const coach = await this.prisma.user.findUnique({
      where: { id: coachId },
    });

    if (!coach || coach.role !== Role.coach) {
      throw new ForbiddenException('Only coach can create nutrition plan');
    }

    const bmr = this.calculateBmr({
      gender: dto.gender,
      weightKg: dto.weightKg,
      heightCm: dto.heightCm,
      age: dto.age,
    });

    const tdee = bmr * this.getActivityMultiplier(dto.activity);

    const dailyCalories = this.applyGoalCalories(tdee, dto.goal);

    const macros = this.calculateMacros({
      calories: dailyCalories,
      weightKg: dto.weightKg,
      goal: dto.goal,
    });

    return this.prisma.nutritionPlan.create({
      data: {
        coachId,
        studentId,
        title: dto.title,
        goal: dto.goal,
        weightKg: dto.weightKg,
        heightCm: dto.heightCm,
        age: dto.age,
        gender: dto.gender,
        activity: dto.activity,
        dailyCalories,
        proteinGrams: macros.proteinGrams,
        fatGrams: macros.fatGrams,
        carbsGrams: macros.carbsGrams,
      },
    });
  }

  async getMyPlans(userId: number) {
    return this.prisma.nutritionPlan.findMany({
      where: {
        studentId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        coach: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async getStudentPlans(coachId: number, studentId: number) {
    await this.ensureIsMyStudent(coachId, studentId);

    return this.prisma.nutritionPlan.findMany({
      where: {
        coachId,
        studentId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getPlanById(userId: number, planId: number) {
    const plan = await this.prisma.nutritionPlan.findUnique({
      where: {
        id: planId,
      },
      include: {
        coach: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        student: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        days: {
          orderBy: {
            dayNumber: 'asc',
          },
          include: {
            meals: {
              include: {
                foods: true,
              },
            },
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Nutrition plan not found');
    }

    const isStudent = plan.studentId === userId;
    const isCoach = plan.coachId === userId;

    if (!isStudent && !isCoach) {
      throw new ForbiddenException('You cannot view this nutrition plan');
    }

    return plan;
  }

  private async ensureCanEditPlan(coachId: number, planId: number) {
    const plan = await this.prisma.nutritionPlan.findUnique({
      where: {
        id: planId,
      },
    });

    if (!plan) {
      throw new NotFoundException('Nutrition plan not found');
    }

    if (plan.coachId !== coachId) {
      throw new ForbiddenException('You can edit only your nutrition plans');
    }

    await this.ensureIsMyStudent(coachId, plan.studentId);

    return plan;
  }

  async addDay(
    coachId: number,
    planId: number,
    dto: CreateNutritionDayDto,
  ) {
    await this.ensureCanEditPlan(coachId, planId);

    return this.prisma.nutritionDay.create({
      data: {
        planId,
        dayNumber: dto.dayNumber,
        title: dto.title,
      },
    });
  }

  private async ensureCanEditDay(coachId: number, dayId: number) {
    const day = await this.prisma.nutritionDay.findUnique({
      where: {
        id: dayId,
      },
      include: {
        plan: true,
      },
    });

    if (!day) {
      throw new NotFoundException('Nutrition day not found');
    }

    if (day.plan.coachId !== coachId) {
      throw new ForbiddenException('You can edit only your nutrition plans');
    }

    await this.ensureIsMyStudent(coachId, day.plan.studentId);

    return day;
  }

  async addMeal(
    coachId: number,
    dayId: number,
    dto: CreateNutritionMealDto,
  ) {
    await this.ensureCanEditDay(coachId, dayId);

    return this.prisma.nutritionMeal.create({
      data: {
        dayId,
        name: dto.name,
        time: dto.time,
      },
    });
  }

  private async ensureCanEditMeal(coachId: number, mealId: number) {
    const meal = await this.prisma.nutritionMeal.findUnique({
      where: {
        id: mealId,
      },
      include: {
        day: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!meal) {
      throw new NotFoundException('Nutrition meal not found');
    }

    if (meal.day.plan.coachId !== coachId) {
      throw new ForbiddenException('You can edit only your nutrition plans');
    }

    await this.ensureIsMyStudent(coachId, meal.day.plan.studentId);

    return meal;
  }

  async addFood(
    coachId: number,
    mealId: number,
    dto: CreateNutritionFoodDto,
  ) {
    await this.ensureCanEditMeal(coachId, mealId);

    return this.prisma.nutritionFood.create({
      data: {
        mealId,
        name: dto.name,
        grams: dto.grams,
        calories: dto.calories,
        protein: dto.protein,
        fat: dto.fat,
        carbs: dto.carbs,
      },
    });
  }

  async deletePlan(coachId: number, planId: number) {
    await this.ensureCanEditPlan(coachId, planId);

    await this.prisma.nutritionPlan.delete({
      where: {
        id: planId,
      },
    });

    return {
      success: true,
      message: 'Nutrition plan deleted successfully',
    };
  }
}