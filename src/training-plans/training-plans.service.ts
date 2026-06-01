import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrainingPlanDto } from './dto/create-training-plan.dto';
import { ExerciseType, MuscleGroup, NotificationType, PlanStatus, Role } from '@prisma/client';
import { UpdatePlanStatusDto } from './dto/update-plan-status.dto';
import { UpdateTrainingPlanDto } from './dto/update-training-plan.dto';
import { GetTrainingPlansDto } from './dto/get-training-plans.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateWorkoutDayDto } from './dto/create-workout-day.dto';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateWorkoutDayDto } from './dto/update-workout-day.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { CreateTrainingSessionDto } from './dto/create-training-session.dto';
import { UpdateTrainingSessionDto } from './dto/update-training-session.dto';
import { GetTrainingSessionsDto } from './dto/get-training-sessions.dto';

@Injectable()
export class TrainingPlansService {
  constructor(
    private prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) { }

  private async notifyAssignedStudentIfNeeded(
    planId: number,
    title: string,
    message: string,
  ) {
    const plan = await this.prisma.trainingPlan.findUnique({
      where: { id: planId },
      select: {
        assignedToUserId: true,
      },
    });

    if (!plan?.assignedToUserId) {
      return;
    }

    await this.notificationsService.create(plan.assignedToUserId, {
      type: NotificationType.coach_plan_updated,
      title,
      message,
    });
  }


  private async ensureCanEditPlan(userId: number, planId: number) {
    const plan = await this.prisma.trainingPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const isAuthor = plan.authorId === userId;

    const isAssignedCoach =
      plan.authorId === userId && plan.assignedToUserId !== null;

    if (!isAuthor && !isAssignedCoach) {
      throw new ForbiddenException('You can edit only your plans');
    }

    this.ensurePlanIsNotPending(plan.status);

    return plan;
  }

  private ensurePlanIsNotPending(status: PlanStatus) {
    if (status === PlanStatus.pending) {
      throw new BadRequestException(
        'Plan is under review and no actions are allowed',
      );
    }
  }

  private getDefaultWeightStep(type: ExerciseType) {
    switch (type) {
      case ExerciseType.compound:
        return 2.5;

      case ExerciseType.isolation:
        return 1;

      case ExerciseType.bodyweight:
        return 2.5;

      default:
        return 2.5;
    }
  }

  private normalizeSessionExercises(
    dto: CreateTrainingSessionDto | UpdateTrainingSessionDto,
  ) {
    if (dto.exercises) {
      return dto.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({
          ...set,
          exerciseId: exercise.exerciseId,
        })),
      }));
    }

    const exercises = (dto.sets ?? []).reduce((acc: any[], set: any) => {
        let exercise = acc.find((item) => item.exerciseId === set.exerciseId);

        if (!exercise) {
          exercise = {
            exerciseId: set.exerciseId,
            sets: [],
          };
          acc.push(exercise);
        }

        exercise.sets.push({
          exerciseId: set.exerciseId,
          setNumber: set.setNumber,
          weight: set.weight,
          reps: set.reps,
          rir: set.rir,
        });

        return acc;
      }, []);

    return exercises;
  }

  private formatTrainingSession(session: any) {
    return {
      id: session.id,
      userId: session.userId,
      planId: session.planId,
      workoutDayId: session.workoutDayId,
      date: session.date,
      createdAt: session.createdAt,
      plan: session.plan,
      workoutDay: session.workoutDay,
      exercises: (session.exerciseLogs ?? []).map((exerciseLog: any) => ({
        id: exerciseLog.id,
        exerciseId: exerciseLog.exerciseId,
        note: exerciseLog.note,
        exercise: exerciseLog.exercise,
        target: this.formatExerciseTarget(exerciseLog),
        sets: exerciseLog.setLogs.map((set: any) => ({
          id: set.id,
          exerciseId: set.exerciseId,
          setNumber: set.setNumber,
          weight: set.weight,
          reps: set.reps,
          rir: set.rir,
          createdAt: set.createdAt,
        })),
      })),
    };
  }

  private formatExerciseTarget(exerciseLog: any) {
    return {
      sets: exerciseLog.targetSetsSnapshot ?? exerciseLog.exercise?.targetSets ?? null,
      minReps: exerciseLog.minRepsSnapshot ?? exerciseLog.exercise?.minReps ?? null,
      maxReps: exerciseLog.maxRepsSnapshot ?? exerciseLog.exercise?.maxReps ?? null,
      targetRir: exerciseLog.targetRirSnapshot ?? exerciseLog.exercise?.targetRir ?? null,
      weightStep: exerciseLog.weightStepSnapshot ?? exerciseLog.exercise?.weightStep ?? null,
    };
  }

  async create(userId: number, dto: CreateTrainingPlanDto) {
    const plan = await this.prisma.trainingPlan.create({
      data: {
        title: dto.title,
        description: dto.description,
        authorId: userId,
      },
    });

    const moderatorsAndAdmins = await this.prisma.user.findMany({
      where: {
        role: {
          in: [Role.moderator, Role.admin],
        },
      },
      select: {
        id: true,
      },
    });

    await Promise.all(
      moderatorsAndAdmins.map((user) =>
        this.notificationsService.create(user.id, {
          type: NotificationType.plan_created,
          title: 'Новый план на модерации',
          message: `Пользователь создал новый план: ${plan.title}`,
        }),
      ),
    );

    return plan;

  }

  async findMyPlans(userId: number) {
    return this.prisma.trainingPlan.findMany({
      where: {
        OR: [
          {
            authorId: userId,
          },
          {
            assignedToUserId: userId,
          },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        author: {
          select: {
            id: true,
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

  async findPendingPlans() {
    return this.prisma.trainingPlan.findMany({
      where: { status: 'pending' },
      include: {
        author: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }


  async updateStatus(id: number, dto: UpdatePlanStatusDto) {
    const plan = await this.prisma.trainingPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // можно модерировать только pending
    if (plan.status !== PlanStatus.pending) {
      throw new BadRequestException('Plan already reviewed');
    }

    const updatedPlan = await this.prisma.trainingPlan.update({
      where: { id },
      data: {
        status: dto.status,
        rejectionReason:
          dto.status === PlanStatus.rejected ? dto.reason : null,
      },
    });

    if (dto.status === PlanStatus.approved) {
      await this.notificationsService.create(plan.authorId, {
        type: NotificationType.plan_approved,
        title: 'План одобрен',
        message: `Ваш план "${plan.title}" был одобрен модератором.`,
      });
    }

    if (dto.status === PlanStatus.rejected) {
      await this.notificationsService.create(plan.authorId, {
        type: NotificationType.plan_rejected,
        title: 'План отклонён',
        message: dto.reason
          ? `Ваш план "${plan.title}" был отклонён. Причина: ${dto.reason}`
          : `Ваш план "${plan.title}" был отклонён.`,
      });
    }

    return updatedPlan;

  }


  async findApprovedPlans(query: GetTrainingPlansDto, userId?: number) {
    const { search, page, limit, authorId, sort, order } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      status: 'approved',
    };

    // 🔍 поиск
    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // фильтр по автору
    if (authorId) {
      where.authorId = authorId;
    }

    const [plans, total] = await Promise.all([
      this.prisma.trainingPlan.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sort]: order,
        },
        include: {
          author: {
            select: {
              id: true,
              email: true,
            },
          },
          userPlanInteractions: {
            select: {
              userId: true,
              liked: true,
              saved: true,
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
      }),

      this.prisma.trainingPlan.count({ where }),
    ]);

    const data = plans.map((plan) => {
      const likesCount = plan.userPlanInteractions.filter(
        (userPlanInteractions) => userPlanInteractions.liked,
      ).length;

      const myInteraction = userId
        ? plan.userPlanInteractions.find(
          (userPlanInteractions) => userPlanInteractions.userId === userId,
        )
        : null;

      return {
        id: plan.id,
        title: plan.title,
        description: plan.description,
        status: plan.status,
        author: plan.author,
        createdAt: plan.createdAt,

        likesCount,
        isLiked: myInteraction?.liked ?? false,
        isSaved: myInteraction?.saved ?? false,
      };
    });

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


  async update(
    planId: number,
    userId: number,
    dto: UpdateTrainingPlanDto,
  ) {
    const plan = await this.ensureCanEditPlan(userId, planId);

    const updatedPlan = await this.prisma.trainingPlan.update({
      where: { id: planId },
      data: {
        ...dto,
        status: plan.assignedToUserId ? PlanStatus.approved : PlanStatus.pending,
        rejectionReason: null,
      },
    });

    if (plan.assignedToUserId) {
      await this.notificationsService.create(plan.assignedToUserId, {
        type: NotificationType.coach_plan_updated,
        title: 'Тренер обновил ваш план',
        message: `Тренер обновил план: ${updatedPlan.title}`,
      });
    }

    return updatedPlan;
  }

  async deletePlan(planId: number, userId: number) {
    await this.ensureCanEditPlan(userId, planId);

    await this.prisma.$transaction(async (tx) => {
      await tx.exerciseSetLog.deleteMany({
        where: {
          exerciseLog: {
            session: {
              planId,
            },
          },
        },
      });

      await tx.trainingSession.deleteMany({
        where: {
          planId,
        },
      });

      await tx.userPlanInteraction.deleteMany({
        where: {
          planId,
        },
      });

      await tx.trainingPlan.delete({
        where: {
          id: planId,
        },
      });
    });

    return {
      success: true,
      message: 'Training plan deleted successfully',
    };
  }

  async toggleLike(userId: number, planId: number) {
    const plan = await this.prisma.trainingPlan.findUnique({
      where: { id: planId },
      select: { status: true },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    this.ensurePlanIsNotPending(plan.status);

    const existing = await this.prisma.userPlanInteraction.findUnique({
      where: {
        userId_planId: {
          userId,
          planId,
        },
      },
    });

    if (existing) {
      return this.prisma.userPlanInteraction.update({
        where: {
          userId_planId: { userId, planId },
        },
        data: {
          liked: !existing.liked,
        },
      });
    }

    return this.prisma.userPlanInteraction.create({
      data: {
        userId,
        planId,
        liked: true,
      },
    });
  }


  async toggleSave(userId: number, planId: number) {
    const plan = await this.prisma.trainingPlan.findUnique({
      where: { id: planId },
      select: { status: true },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    this.ensurePlanIsNotPending(plan.status);

    const existing = await this.prisma.userPlanInteraction.findUnique({
      where: {
        userId_planId: {
          userId,
          planId,
        },
      },
    });

    if (existing) {
      return this.prisma.userPlanInteraction.update({
        where: {
          userId_planId: { userId, planId },
        },
        data: {
          saved: !existing.saved,
        },
      });
    }

    return this.prisma.userPlanInteraction.create({
      data: {
        userId,
        planId,
        saved: true,
      },
    });
  }

  async getSavedPlans(userId: number) {
    return this.prisma.trainingPlan.findMany({
      where: {
        userPlanInteractions: {
          some: {
            userId,
            saved: true,
          },
        },
        status: 'approved',
      },
      include: {
        author: true,
      },
    });
  }


  async addWorkoutDay(
    planId: number,
    userId: number,
    dto: CreateWorkoutDayDto,
  ) {
    const plan = await this.ensureCanEditPlan(userId, planId);

    const workoutDay = await this.prisma.workoutDay.create({
      data: {
        title: dto.title,
        order: dto.order ?? 0,
        planId,
      },
    });

    await this.prisma.trainingPlan.update({
      where: { id: planId },
      data: {
        status: plan.assignedToUserId ? PlanStatus.approved : PlanStatus.pending,
        rejectionReason: null,
      },
    });

    if (plan.assignedToUserId) {
      await this.notificationsService.create(plan.assignedToUserId, {
        type: NotificationType.coach_plan_updated,
        title: 'Тренер обновил ваш план',
        message: `Тренер добавил новый день "${workoutDay.title}" в ваш план.`,
      });
    }

    return workoutDay;
  }


  async addExercise(
    workoutDayId: number,
    userId: number,
    dto: CreateExerciseDto,
  ) {
    const workoutDay = await this.prisma.workoutDay.findUnique({
      where: { id: workoutDayId },
      include: {
        plan: true,
      },
    });

    if (!workoutDay) {
      throw new NotFoundException('Workout day not found');
    }

    const plan = await this.ensureCanEditPlan(userId, workoutDay.planId);

    const type = dto.type ?? ExerciseType.compound;

    const exercise = await this.prisma.exercise.create({
      data: {
        name: dto.name,
        description: dto.description,
        order: dto.order ?? 0,
        type,
        muscleGroup: dto.muscleGroup ?? MuscleGroup.full_body,
        targetSets: dto.targetSets ?? 3,
        minReps: dto.minReps ?? 8,
        maxReps: dto.maxReps ?? 12,
        targetRir: dto.targetRir ?? 2,
        weightStep:
          dto.weightStep ?? this.getDefaultWeightStep(type),
        workoutDayId,
      },
    });

    await this.prisma.trainingPlan.update({
      where: { id: workoutDay.planId },
      data: {
        status: plan.assignedToUserId ? PlanStatus.approved : PlanStatus.pending,
        rejectionReason: null,
      },
    });

    if (plan.assignedToUserId) {
      await this.notificationsService.create(plan.assignedToUserId, {
        type: NotificationType.coach_plan_updated,
        title: 'Тренер обновил ваш план',
        message: `Тренер добавил упражнение "${exercise.name}" в ваш план.`,
      });
    }

    return exercise;
  }


  async updateWorkoutDay(
    dayId: number,
    userId: number,
    dto: UpdateWorkoutDayDto,
  ) {
    const workoutDay = await this.prisma.workoutDay.findUnique({
      where: { id: dayId },
      include: {
        plan: true,
      },
    });

    if (!workoutDay) {
      throw new NotFoundException('Workout day not found');
    }

    const plan = await this.ensureCanEditPlan(userId, workoutDay.planId);

    const updatedDay = await this.prisma.workoutDay.update({
      where: { id: dayId },
      data: dto,
    });

    await this.prisma.trainingPlan.update({
      where: { id: workoutDay.planId },
      data: {
        status: plan.assignedToUserId ? PlanStatus.approved : PlanStatus.pending,
        rejectionReason: null,
      },
    });

    if (plan.assignedToUserId) {
      await this.notificationsService.create(plan.assignedToUserId, {
        type: NotificationType.coach_plan_updated,
        title: 'Тренер обновил ваш план',
        message: `Тренер обновил день "${updatedDay.title}" в вашем плане.`,
      });
    }

    return updatedDay;
  }


  async deleteWorkoutDay(dayId: number, userId: number) {
    const workoutDay = await this.prisma.workoutDay.findUnique({
      where: { id: dayId },
      include: {
        plan: true,
      },
    });

    if (!workoutDay) {
      throw new NotFoundException('Workout day not found');
    }

    const plan = await this.ensureCanEditPlan(userId, workoutDay.planId);

    const dayTitle = workoutDay.title;

    await this.prisma.workoutDay.delete({
      where: { id: dayId },
    });

    await this.prisma.trainingPlan.update({
      where: { id: workoutDay.planId },
      data: {
        status: plan.assignedToUserId ? PlanStatus.approved : PlanStatus.pending,
        rejectionReason: null,
      },
    });

    if (plan.assignedToUserId) {
      await this.notificationsService.create(plan.assignedToUserId, {
        type: NotificationType.coach_plan_updated,
        title: 'Тренер обновил ваш план',
        message: `Тренер удалил день "${dayTitle}" из вашего плана.`,
      });
    }

    return {
      success: true,
      message: 'Workout day deleted successfully',
    };
  }

  async updateExercise(
    exerciseId: number,
    userId: number,
    dto: UpdateExerciseDto,
  ) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        workoutDay: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    const plan = await this.ensureCanEditPlan(
      userId,
      exercise.workoutDay.planId,
    );

    const data: any = { ...dto };

    if (dto.type && dto.weightStep === undefined) {
      data.weightStep = this.getDefaultWeightStep(dto.type);
    }

    const updatedExercise = await this.prisma.exercise.update({
      where: { id: exerciseId },
      data,
    });

    await this.prisma.trainingPlan.update({
      where: { id: exercise.workoutDay.planId },
      data: {
        status: plan.assignedToUserId ? PlanStatus.approved : PlanStatus.pending,
        rejectionReason: null,
      },
    });

    if (plan.assignedToUserId) {
      await this.notificationsService.create(plan.assignedToUserId, {
        type: NotificationType.coach_plan_updated,
        title: 'Тренер обновил ваш план',
        message: `Тренер обновил упражнение "${updatedExercise.name}" в вашем плане.`,
      });
    }

    return updatedExercise;
  }


  async deleteExercise(exerciseId: number, userId: number) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        workoutDay: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    const plan = await this.ensureCanEditPlan(
      userId,
      exercise.workoutDay.planId,
    );

    const exerciseName = exercise.name;

    await this.prisma.exercise.delete({
      where: { id: exerciseId },
    });

    await this.prisma.trainingPlan.update({
      where: { id: exercise.workoutDay.planId },
      data: {
        status: plan.assignedToUserId ? PlanStatus.approved : PlanStatus.pending,
        rejectionReason: null,
      },
    });

    if (plan.assignedToUserId) {
      await this.notificationsService.create(plan.assignedToUserId, {
        type: NotificationType.coach_plan_updated,
        title: 'Тренер обновил ваш план',
        message: `Тренер удалил упражнение "${exerciseName}" из вашего плана.`,
      });
    }

    return {
      success: true,
      message: 'Exercise deleted successfully',
    };
  }



  async logTrainingSession(userId: number, dto: CreateTrainingSessionDto) {
    const normalizedExercises = this.normalizeSessionExercises(dto);

    if (normalizedExercises.length === 0) {
      throw new BadRequestException(
        'Provide either "sets" or "exercises" with at least one set',
      );
    }

    const plan = await this.prisma.trainingPlan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    this.ensurePlanIsNotPending(plan.status);

    const workoutDay = await this.prisma.workoutDay.findUnique({
      where: { id: dto.workoutDayId },
      include: {
        exercises: true,
      },
    });

    if (!workoutDay || workoutDay.planId !== dto.planId) {
      throw new BadRequestException('Workout day does not belong to this plan');
    }

    const exerciseIds = normalizedExercises.map((item) => item.exerciseId);

    const exercises = await this.prisma.exercise.findMany({
      where: {
        id: {
          in: exerciseIds,
        },
        workoutDayId: dto.workoutDayId,
      },
    });

    if (exercises.length !== exerciseIds.length) {
      throw new BadRequestException('Some exercises do not belong to this workout day');
    }

    const session = await this.prisma.trainingSession.create({
      data: {
        userId,
        planId: dto.planId,
        workoutDayId: dto.workoutDayId,
        date: dto.date ? new Date(dto.date) : new Date(),

        exerciseLogs: {
          create: normalizedExercises.map((exerciseLog) => {
            const exercise = exercises.find(
              (item) => item.id === exerciseLog.exerciseId,
            );

            if (!exercise) {
              throw new BadRequestException('Exercise not found');
            }

            return {
              exerciseId: exerciseLog.exerciseId,
              note: exerciseLog.note,

              targetSetsSnapshot: exercise.targetSets,
              minRepsSnapshot: exercise.minReps,
              maxRepsSnapshot: exercise.maxReps,
              targetRirSnapshot: exercise.targetRir,
              weightStepSnapshot: exercise.weightStep,

              setLogs: {
                create: exerciseLog.sets.map((set) => ({
                  exerciseId: exerciseLog.exerciseId,
                  setNumber: set.setNumber,
                  weight: set.weight,
                  reps: set.reps,
                  rir: set.rir,
                })),
              },
            };
          }),
        },
      },
      include: {
        plan: {
          select: {
            id: true,
            title: true,
          },
        },
        workoutDay: true,
        exerciseLogs: {
          include: {
            exercise: true,
            setLogs: {
              orderBy: {
                setNumber: 'asc',
              },
            },
          },
        },
      },
    });

    return this.formatTrainingSession(session);
  }

  async getWorkoutDayHistory(userId: number, dayId: number) {
    const workoutDay = await this.prisma.workoutDay.findUnique({
      where: { id: dayId },
      include: {
        plan: true,
        exercises: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!workoutDay) {
      throw new NotFoundException('Workout day not found');
    }

    const sessions = await this.prisma.trainingSession.findMany({
      where: {
        userId,
        workoutDayId: dayId,
      },
      orderBy: {
        date: 'asc',
      },
      include: {
        exerciseLogs: {
          include: {
            exercise: true,
            setLogs: {
              orderBy: {
                setNumber: 'asc',
              },
            },
          },
        },
      },
    });

    return {
      workoutDay: {
        id: workoutDay.id,
        title: workoutDay.title,
        planId: workoutDay.planId,
        planTitle: workoutDay.plan.title,
      },

      exercises: workoutDay.exercises.map((exercise) => {
        const history = sessions
          .map((session) => {
            const exerciseLog = session.exerciseLogs.find(
              (log) => log.exerciseId === exercise.id,
            );

            if (!exerciseLog) {
              return null;
            }

            return {
              date: session.date,
              note: exerciseLog.note,
              target: {
                sets: exerciseLog.targetSetsSnapshot,
                minReps: exerciseLog.minRepsSnapshot,
                maxReps: exerciseLog.maxRepsSnapshot,
                targetRir: exerciseLog.targetRirSnapshot,
                weightStep: exerciseLog.weightStepSnapshot,
              },
              sets: exerciseLog.setLogs.map((set) => ({
                setNumber: set.setNumber,
                weight: set.weight,
                reps: set.reps,
                rir: set.rir,
                label: `${set.weight}×${set.reps}`,
              })),
            };
          })
          .filter(Boolean);

        return {
          id: exercise.id,
          name: exercise.name,
          description: exercise.description,
          type: exercise.type,
          muscleGroup: exercise.muscleGroup,
          target: {
            sets: exercise.targetSets,
            minReps: exercise.minReps,
            maxReps: exercise.maxReps,
            targetRir: exercise.targetRir,
            weightStep: exercise.weightStep,
            label: `${exercise.targetSets}×${exercise.minReps}–${exercise.maxReps} | RIR ${exercise.targetRir}`,
          },
          history,
        };
      }),
    };
  }


  async getExerciseProgressionRecommendation(
    userId: number,
    exerciseId: number,
  ) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        workoutDay: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    const logs = await this.prisma.exerciseSetLog.findMany({
      where: {
        exerciseId,
        exerciseLog: {
          session: {
            userId,
          },
        },
      },
      orderBy: {
        exerciseLog: {
          session: {
            date: 'desc',
          },
        },
      },
      include: {
        exerciseLog: {
          include: {
            session: {
              select: {
                id: true,
                date: true,
              },
            },
          },
        },
      },
    });

    if (logs.length === 0) {
      return {
        action: 'start',
        message:
          'Начните с комфортного веса в диапазоне повторений и оставьте RIR 2–3.',
      };
    }

    const sessionsMap = new Map<number, typeof logs>();

    for (const log of logs) {
      const sessionId = log.exerciseLog.session.id;

      if (!sessionsMap.has(sessionId)) {
        sessionsMap.set(sessionId, []);
      }

      sessionsMap.get(sessionId)!.push(log);
    }

    const lastSessions = Array.from(sessionsMap.values())
      .slice(0, 3)
      .map((sessionLogs) =>
        sessionLogs.sort((a, b) => a.setNumber - b.setNumber),
      );

    const lastSession = lastSessions[0];

    const lastWeight = lastSession[0].weight;
    const goal = exercise.workoutDay.plan.goal;

    const sessionSummaries = lastSessions.map((sessionLogs) => {
      const totalReps = sessionLogs.reduce((sum, set) => {
        return sum + set.reps;
      }, 0);

      const averageRir =
        sessionLogs.reduce((sum, set) => {
          return sum + (set.rir ?? exercise.targetRir);
        }, 0) / sessionLogs.length;

      const bestEstimatedOneRepMax = Math.max(
        ...sessionLogs.map((set) => set.weight * (1 + set.reps / 30)),
      );

      return {
        date: sessionLogs[0].exerciseLog.session.date,
        weight: sessionLogs[0].weight,
        totalReps,
        averageRir,
        bestEstimatedOneRepMax,
      };
    });

    const hasThreeSessions = sessionSummaries.length >= 3;

    const plateau =
      hasThreeSessions &&
      sessionSummaries.every((session) => session.weight === lastWeight) &&
      sessionSummaries[0].totalReps <= sessionSummaries[1].totalReps &&
      sessionSummaries[1].totalReps <= sessionSummaries[2].totalReps;

    const overloadRisk =
      hasThreeSessions &&
      sessionSummaries.every(
        (session) => session.averageRir < exercise.targetRir,
      );

    const performanceDrop =
      hasThreeSessions &&
      sessionSummaries[0].bestEstimatedOneRepMax <
      sessionSummaries[2].bestEstimatedOneRepMax * 0.95;

    if (plateau || overloadRisk || performanceDrop) {
      const deloadPercent = exercise.workoutDay.plan.deloadPercent;

      const deloadWeight = Number(
        (lastWeight * (1 - deloadPercent / 100)).toFixed(1),
      );

      return {
        action: 'deload',
        currentWeight: lastWeight,
        recommendedWeight: deloadWeight,
        deloadPercent,
        reason: plateau
          ? 'Обнаружено плато по повторениям.'
          : overloadRisk
            ? 'Несколько тренировок подряд RIR ниже целевого.'
            : 'Обнаружено падение результата.',
        message: `Рекомендуется deload: снизьте вес примерно на ${deloadPercent}% до ${deloadWeight} кг и работайте технично с RIR ${exercise.targetRir + 1
          }–${exercise.targetRir + 2}.`,
      };
    }

    const lastSessionReachedMax = lastSession.every(
      (set) => set.reps >= exercise.maxReps,
    );

    const lastSessionRirGood = lastSession.every(
      (set) => set.rir === null || set.rir >= exercise.targetRir,
    );

    const hasLowRir = lastSession.some(
      (set) => set.rir !== null && set.rir < exercise.targetRir,
    );

    const averageRir =
      lastSession.reduce((sum, set) => {
        return sum + (set.rir ?? exercise.targetRir);
      }, 0) / lastSession.length;

    const recentSessionsWithSameWeight = lastSessions.filter((sessionLogs) =>
      sessionLogs.every((set) => set.weight === lastWeight),
    );

    const stableTopPerformance = recentSessionsWithSameWeight.some(
      (sessionLogs) =>
        sessionLogs.every(
          (set) =>
            set.reps >= exercise.maxReps &&
            (set.rir === null || set.rir >= exercise.targetRir),
        ),
    );

    if (
      lastSessionReachedMax &&
      lastSessionRirGood &&
      stableTopPerformance
    ) {
      const increase =
        goal === 'cut'
          ? exercise.weightStep / 2
          : goal === 'maintenance'
            ? exercise.weightStep / 2
            : exercise.weightStep;

      return {
        action: 'increase_weight',
        currentWeight: lastWeight,
        recommendedWeight: Number((lastWeight + increase).toFixed(1)),
        increaseBy: increase,
        reason:
          'Вы достигли верхней границы повторений с нормальным RIR.',
        message:
          goal === 'bulk'
            ? `Можно повысить вес на ${increase} кг.`
            : `Можно повысить вес осторожно на ${increase} кг, так как цель сейчас не агрессивный набор.`,
      };
    }

    if (hasLowRir) {
      return {
        action: 'keep_weight',
        currentWeight: lastWeight,
        averageRir: Number(averageRir.toFixed(1)),
        reason: 'RIR ниже целевого.',
        message:
          'Вес пока не повышаем. Оставьте текущий вес и попробуйте выполнить подходы техничнее с нужным запасом.',
      };
    }

    return {
      action: 'increase_reps',
      currentWeight: lastWeight,
      targetRange: {
        minReps: exercise.minReps,
        maxReps: exercise.maxReps,
      },
      reason:
        'Верхняя граница повторений ещё не достигнута во всех подходах.',
      message: `Оставьте ${lastWeight} кг и попробуйте добавить 1 повтор в одном или нескольких подходах.`,
    };
  }


  // прогресс 

  async getExerciseProgress(
    userId: number,
    exerciseId: number,
  ) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    const logs = await this.prisma.exerciseSetLog.findMany({
      where: {
        exerciseId,
        exerciseLog: {
          session: {
            userId,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        exerciseLog: {
          include: {
            session: {
              select: {
                date: true,
              },
            },
          },
        },
      },
    });

    const data = logs.map((log) => {
      const volume = log.weight * log.reps;

      const estimatedOneRepMax =
        log.weight * (1 + log.reps / 30);

      return {
        date: log.exerciseLog.session.date,
        setNumber: log.setNumber,
        weight: log.weight,
        reps: log.reps,
        rir: log.rir,
        volume,
        estimatedOneRepMax: Number(estimatedOneRepMax.toFixed(1)),
      };
    });

    return {
      exerciseId,
      data,
    };
  }

  // для графика 

  async getExerciseProgressSummary(
    userId: number,
    exerciseId: number,
  ) {
    const logs = await this.prisma.exerciseSetLog.findMany({
      where: {
        exerciseId,
        exerciseLog: {
          session: {
            userId,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        exerciseLog: {
          include: {
            session: {
              select: {
                id: true,
                date: true,
              },
            },
          },
        },
      },
    });

    const grouped = new Map<number, typeof logs>();

    for (const log of logs) {
      const sessionId = log.exerciseLog.session.id;

      if (!grouped.has(sessionId)) {
        grouped.set(sessionId, []);
      }

      grouped.get(sessionId)!.push(log);
    }

    const data = Array.from(grouped.values()).map((sessionLogs) => {
      const bestSet = sessionLogs.reduce((best, current) => {
        const bestOneRm = best.weight * (1 + best.reps / 30);
        const currentOneRm = current.weight * (1 + current.reps / 30);

        return currentOneRm > bestOneRm ? current : best;
      });

      const totalVolume = sessionLogs.reduce((sum, log) => {
        return sum + log.weight * log.reps;
      }, 0);

      return {
        date: bestSet.exerciseLog.session.date,
        bestWeight: bestSet.weight,
        bestReps: bestSet.reps,
        bestEstimatedOneRepMax: Number(
          (bestSet.weight * (1 + bestSet.reps / 30)).toFixed(1),
        ),
        totalVolume,
        setsCount: sessionLogs.length,
      };
    });

    return {
      exerciseId,
      data,
    };
  }


  // список тренировчоных сессий


  async getMyTrainingSessions(
    userId: number,
    dto: GetTrainingSessionsDto,
  ) {
    const { page, limit, date } = dto;
    const skip = (page - 1) * limit;
    const where = {
      userId,
      ...(date
        ? {
            date: {
              gte: new Date(`${date}T00:00:00.000Z`),
              lt: new Date(`${date}T23:59:59.999Z`),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.trainingSession.findMany({
        where,
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
          workoutDay: {
            select: {
              id: true,
              title: true,
            },
          },
          exerciseLogs: {
            include: {
              exercise: {
                select: {
                  id: true,
                  name: true,
                  targetSets: true,
                  minReps: true,
                  maxReps: true,
                  targetRir: true,
                  weightStep: true,
                },
              },
              setLogs: {
                orderBy: {
                  setNumber: 'asc',
                },
              },
            },
          },
        },
      }),

      this.prisma.trainingSession.count({
        where,
      }),
    ]);

    return {
      data: data.map((session) => this.formatTrainingSession(session)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }


  async getTrainingSessionById(
    userId: number,
    sessionId: number,
  ) {
    const session = await this.prisma.trainingSession.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        plan: {
          select: {
            id: true,
            title: true,
          },
        },
        workoutDay: {
          select: {
            id: true,
            title: true,
          },
        },
        exerciseLogs: {
          include: {
            exercise: {
              select: {
                id: true,
                name: true,
                targetSets: true,
                minReps: true,
                maxReps: true,
                targetRir: true,
                weightStep: true,
              },
            },
            setLogs: {
              orderBy: {
                setNumber: 'asc',
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Training session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('You can view only your sessions');
    }

    return this.formatTrainingSession(session);
  }


  async updateTrainingSession(
    userId: number,
    sessionId: number,
    dto: UpdateTrainingSessionDto,
  ) {
    const session = await this.prisma.trainingSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Training session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('You can update only your sessions');
    }

    const plan = await this.prisma.trainingPlan.findUnique({
      where: { id: session.planId },
      select: { status: true },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    this.ensurePlanIsNotPending(plan.status);

    const normalizedExercises = this.normalizeSessionExercises(dto);
    const workoutDayId = dto.workoutDayId ?? session.workoutDayId;

    if (normalizedExercises.length === 0) {
      throw new BadRequestException(
        'Provide either "sets" or "exercises" with at least one set',
      );
    }

    if (!workoutDayId) {
      throw new BadRequestException('Workout day is required for this session');
    }

    const exerciseIds = normalizedExercises.map((exercise) => exercise.exerciseId);

    const exercises = await this.prisma.exercise.findMany({
      where: {
        id: {
          in: exerciseIds,
        },
        workoutDayId,
      },
    });

    if (exercises.length !== exerciseIds.length) {
      throw new BadRequestException(
        'Some exercises do not belong to this workout day',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.exerciseSetLog.deleteMany({
        where: {
          exerciseLog: {
            sessionId,
          },
        },
      });

      await tx.exerciseSessionLog.deleteMany({
        where: {
          sessionId,
        },
      });

      const updatedSession = await tx.trainingSession.update({
        where: {
          id: sessionId,
        },
        data: {
          workoutDayId,
          date: dto.date ? new Date(dto.date) : undefined,
          exerciseLogs: {
            create: normalizedExercises.map((exercise) => {
              const currentExercise = exercises.find(
                (item) => item.id === exercise.exerciseId,
              );

              if (!currentExercise) {
                throw new BadRequestException('Exercise not found');
              }

              return {
                exerciseId: exercise.exerciseId,
                note: exercise.note,
                targetSetsSnapshot: currentExercise.targetSets,
                minRepsSnapshot: currentExercise.minReps,
                maxRepsSnapshot: currentExercise.maxReps,
                targetRirSnapshot: currentExercise.targetRir,
                weightStepSnapshot: currentExercise.weightStep,
                setLogs: {
                  create: exercise.sets.map((set) => ({
                    exerciseId: set.exerciseId,
                    setNumber: set.setNumber,
                    weight: set.weight,
                    reps: set.reps,
                    rir: set.rir,
                  })),
                },
              };
            }),
          },
        },
        include: {
          plan: {
            select: {
              id: true,
              title: true,
            },
          },
          workoutDay: {
            select: {
              id: true,
              title: true,
            },
          },
          exerciseLogs: {
            include: {
              exercise: {
                select: {
                  id: true,
                  name: true,
                  targetSets: true,
                  minReps: true,
                  maxReps: true,
                  targetRir: true,
                  weightStep: true,
                },
              },
              setLogs: {
                orderBy: {
                  setNumber: 'asc',
                },
              },
            },
          },
        },
      });

      return this.formatTrainingSession(updatedSession);
    });
  }


  async deleteTrainingSession(
    userId: number,
    sessionId: number,
  ) {
    const session = await this.prisma.trainingSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Training session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('You can delete only your sessions');
    }

    const plan = await this.prisma.trainingPlan.findUnique({
      where: { id: session.planId },
      select: { status: true },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    this.ensurePlanIsNotPending(plan.status);

    await this.prisma.trainingSession.delete({
      where: {
        id: sessionId,
      },
    });

    return {
      success: true,
      message: 'Training session deleted successfully',
    };
  }


  async getNextWorkoutRecommendation(userId: number, dayId: number) {
    const workoutDay = await this.prisma.workoutDay.findUnique({
      where: { id: dayId },
      include: {
        plan: true,
        exercises: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!workoutDay) {
      throw new NotFoundException('Workout day not found');
    }

    if (
      workoutDay.plan.authorId !== userId &&
      workoutDay.plan.status !== PlanStatus.approved
    ) {
      throw new ForbiddenException(
        'This workout day is not available',
      );
    }

    const recommendations = await Promise.all(
      workoutDay.exercises.map(async (exercise) => {
        const recommendation =
          await this.getExerciseProgressionRecommendation(userId, exercise.id);

        return {
          exerciseId: exercise.id,
          name: exercise.name,
          type: exercise.type,
          targetSets: exercise.targetSets,
          minReps: exercise.minReps,
          maxReps: exercise.maxReps,
          targetRir: exercise.targetRir,
          weightStep: exercise.weightStep,
          recommendation,
        };
      }),
    );

    return {
      workoutDay: {
        id: workoutDay.id,
        title: workoutDay.title,
        planId: workoutDay.planId,
        planTitle: workoutDay.plan.title,
        goal: workoutDay.plan.goal,
      },
      recommendations,
    };
  }

}
