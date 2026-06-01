import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CoachRequestStatus, NotificationType, PlanStatus, Role, TrainingGoal } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCoachRequestDto } from './dto/create-coach-request.dto';
import { UsersService } from '../users/users.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateTrainingPlanDto } from '../training-plans/dto/create-training-plan.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { GetCoachesDto } from './dto/get-coaches.dto';

@Injectable()
export class CoachesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService
  ) { }


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

  async getCoaches(dto: GetCoachesDto) {
    return this.prisma.user.findMany({
      where: {
        role: Role.coach,
        ...(dto.search?.trim()
          ? {
            name: {
              contains: dto.search.trim(),
              mode: 'insensitive',
            },
          }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async sendRequest(
    studentId: number,
    coachId: number,
    dto: CreateCoachRequestDto,
  ) {
    if (studentId === coachId) {
      throw new BadRequestException('You cannot send request to yourself');
    }

    const coach = await this.prisma.user.findUnique({
      where: {
        id: coachId,
      },
    });

    if (!coach || coach.role !== Role.coach) {
      throw new NotFoundException('Coach not found');
    }

    const existingRequest = await this.prisma.coachRequest.findUnique({
      where: {
        studentId_coachId: {
          studentId,
          coachId,
        },
      },
    });

    if (existingRequest && existingRequest.status === CoachRequestStatus.pending) {
      throw new BadRequestException('Request already sent');
    }

    return this.prisma.coachRequest.upsert({
      where: {
        studentId_coachId: {
          studentId,
          coachId,
        },
      },
      update: {
        status: CoachRequestStatus.pending,
        message: dto.message,
      },
      create: {
        studentId,
        coachId,
        message: dto.message,
      },
    });
  }

  async getMyCoachRequests(coachId: number) {
    return this.prisma.coachRequest.findMany({
      where: {
        coachId,
        status: CoachRequestStatus.pending,
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async acceptRequest(coachId: number, requestId: number) {
    const request = await this.prisma.coachRequest.findUnique({
      where: {
        id: requestId,
      },
    });

    if (!request) {
      throw new NotFoundException('Coach request not found');
    }

    if (request.coachId !== coachId) {
      throw new ForbiddenException('You can accept only your requests');
    }

    if (request.status !== CoachRequestStatus.pending) {
      throw new BadRequestException('Request already reviewed');
    }

    return this.prisma.coachRequest.update({
      where: {
        id: requestId,
      },
      data: {
        status: CoachRequestStatus.accepted,
      },
    });
  }

  async rejectRequest(coachId: number, requestId: number) {
    const request = await this.prisma.coachRequest.findUnique({
      where: {
        id: requestId,
      },
    });

    if (!request) {
      throw new NotFoundException('Coach request not found');
    }

    if (request.coachId !== coachId) {
      throw new ForbiddenException('You can reject only your requests');
    }

    if (request.status !== CoachRequestStatus.pending) {
      throw new BadRequestException('Request already reviewed');
    }

    return this.prisma.coachRequest.update({
      where: {
        id: requestId,
      },
      data: {
        status: CoachRequestStatus.rejected,
      },
    });
  }

  async getMyStudents(coachId: number) {
    return this.prisma.coachRequest.findMany({
      where: {
        coachId,
        status: CoachRequestStatus.accepted,
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });
  }


  async isMyStudent(coachId: number, studentId: number) {
    const relation = await this.prisma.coachRequest.findFirst({
      where: {
        coachId,
        studentId,
        status: CoachRequestStatus.accepted,
      },
    });

    return Boolean(relation);
  }

  async getStudentStats(coachId: number, studentId: number) {
    await this.ensureIsMyStudent(coachId, studentId);

    return this.usersService.getUserStats(studentId);
  }

  async getStudentSessions(
    coachId: number,
    studentId: number,
    dto: PaginationDto,
  ) {
    await this.ensureIsMyStudent(coachId, studentId);

    const { page, limit } = dto;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.trainingSession.findMany({
        where: {
          userId: studentId,
        },
        skip,
        take: limit,
        orderBy: {
          date: 'desc',
        },
        include: {
          plan: {
            select: {
              id: true,
              title: true,
            },
          },
          exerciseSetLogs: {
            include: {
              exercise: {
                select: {
                  id: true,
                  name: true,
                  muscleGroup: true,
                },
              },
            },
            orderBy: [
              {
                exerciseId: 'asc',
              },
              {
                setNumber: 'asc',
              },
            ],
          },
        },
      }),
      this.prisma.trainingSession.count({
        where: {
          userId: studentId,
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStudentPlans(coachId: number, role: Role, studentId: number) {
    if (role === Role.coach) {
      await this.ensureIsMyStudent(coachId, studentId);
    }

    return this.prisma.trainingPlan.findMany({
      where: {
        assignedToUserId: studentId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        workoutDays: {
          orderBy: {
            order: 'asc',
          },
          include: {
            exercises: {
              orderBy: {
                order: 'asc',
              },
            },
          },
        },
      },
    });
  }


  async createPlanForStudent(
    coachId: number,
    studentId: number,
    dto: CreateTrainingPlanDto,
  ) {
    await this.ensureIsMyStudent(coachId, studentId);

    const plan = await this.prisma.trainingPlan.create({
      data: {
        title: dto.title,
        description: dto.description,
        goal: dto.goal ?? TrainingGoal.bulk,
        deloadAfterWeeks: dto.deloadAfterWeeks ?? 6,
        deloadPercent: dto.deloadPercent ?? 10,
        authorId: coachId,
        assignedToUserId: studentId,
        status: PlanStatus.approved,
      },
    });

    await this.notificationsService.create(studentId, {
      type: NotificationType.coach_plan_created,
      title: 'Тренер назначил вам новый план',
      message: `Ваш тренер назначил вам план: ${plan.title}`,
    });

    return plan;
  }
}
