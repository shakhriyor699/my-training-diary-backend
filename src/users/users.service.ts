import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersDto } from './dto/get-users.dto';
import { UserApprovalStatus } from '@prisma/client';
import { UpdateUserApprovalDto } from './dto/update-user-approval.dto';
import { GetTrainingSessionsDto } from '../training-plans/dto/get-training-sessions.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  private formatExerciseTarget(exerciseLog: any) {
    return {
      sets: exerciseLog.targetSetsSnapshot ?? exerciseLog.exercise?.targetSets ?? null,
      minReps: exerciseLog.minRepsSnapshot ?? exerciseLog.exercise?.minReps ?? null,
      maxReps: exerciseLog.maxRepsSnapshot ?? exerciseLog.exercise?.maxReps ?? null,
      targetRir: exerciseLog.targetRirSnapshot ?? exerciseLog.exercise?.targetRir ?? null,
      weightStep: exerciseLog.weightStepSnapshot ?? exerciseLog.exercise?.weightStep ?? null,
    };
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
        sets: (exerciseLog.setLogs ?? []).map((set: any) => ({
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

  private buildExerciseProgress(logs: any[]) {
    const groupedByExercise = new Map<number, any[]>();

    for (const log of logs) {
      const exerciseLogs = groupedByExercise.get(log.exerciseId) ?? [];
      exerciseLogs.push(log);
      groupedByExercise.set(log.exerciseId, exerciseLogs);
    }

    return Array.from(groupedByExercise.values()).map((exerciseLogs) => {
      const firstLog = exerciseLogs[0];
      const groupedBySession = new Map<number, any[]>();

      for (const log of exerciseLogs) {
        const sessionId = log.exerciseLog.session.id;
        const sessionLogs = groupedBySession.get(sessionId) ?? [];
        sessionLogs.push(log);
        groupedBySession.set(sessionId, sessionLogs);
      }

      const progress = Array.from(groupedBySession.values()).map((sessionLogs) => {
        const bestSet = sessionLogs.reduce((best, current) => {
          const bestOneRm = best.weight * (1 + best.reps / 30);
          const currentOneRm = current.weight * (1 + current.reps / 30);

          return currentOneRm > bestOneRm ? current : best;
        });

        const totalVolume = sessionLogs.reduce((sum, current) => {
          return sum + current.weight * current.reps;
        }, 0);

        return {
          sessionId: bestSet.exerciseLog.session.id,
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

      const bestEstimatedOneRepMax = progress.reduce((best, current) => {
        return current.bestEstimatedOneRepMax > best
          ? current.bestEstimatedOneRepMax
          : best;
      }, 0);

      const totalVolume = progress.reduce((sum, current) => {
        return sum + current.totalVolume;
      }, 0);

      const lastEntry = progress[progress.length - 1] ?? null;

      return {
        exerciseId: firstLog.exerciseId,
        exerciseName: firstLog.exercise.name,
        muscleGroup: firstLog.exercise.muscleGroup,
        workoutDay: firstLog.exercise.workoutDay
          ? {
              id: firstLog.exercise.workoutDay.id,
              title: firstLog.exercise.workoutDay.title,
            }
          : null,
        plan: firstLog.exercise.workoutDay?.plan
          ? {
              id: firstLog.exercise.workoutDay.plan.id,
              title: firstLog.exercise.workoutDay.plan.title,
            }
          : null,
        summary: {
          sessionsCount: progress.length,
          lastPerformedAt: lastEntry?.date ?? null,
          bestEstimatedOneRepMax: Number(bestEstimatedOneRepMax.toFixed(1)),
          totalVolume,
        },
        progress,
      };
    }).sort((a, b) => {
      const left = a.summary.lastPerformedAt
        ? new Date(a.summary.lastPerformedAt).getTime()
        : 0;
      const right = b.summary.lastPerformedAt
        ? new Date(b.summary.lastPerformedAt).getTime()
        : 0;

      return right - left;
    });
  }

  private buildAdminOverview(
    userId: number,
    plans: any[],
    formattedSessions: any[],
    exerciseProgress: any[],
  ) {
    const assignedPlans = plans.filter((plan) => plan.assignedToUserId === userId);
    const authoredPlans = plans.filter((plan) => plan.authorId === userId);
    const approvedAssignedPlans = assignedPlans.filter(
      (plan) => plan.status === 'approved',
    );

    const activePlan =
      approvedAssignedPlans[0] ??
      assignedPlans[0] ??
      authoredPlans[0] ??
      null;

    const topExercises = [...exerciseProgress]
      .sort((a, b) => {
        if (b.summary.sessionsCount !== a.summary.sessionsCount) {
          return b.summary.sessionsCount - a.summary.sessionsCount;
        }

        return b.summary.totalVolume - a.summary.totalVolume;
      })
      .slice(0, 5);

    return {
      activePlan,
      recentSessions: formattedSessions.slice(0, 5),
      topExercises,
      counts: {
        totalPlans: plans.length,
        assignedPlans: assignedPlans.length,
        authoredPlans: authoredPlans.length,
        activeExercises: exerciseProgress.length,
      },
    };
  }

  private calculateCurrentStreak(dates: Date[]) {
    if (dates.length === 0) {
      return 0;
    }

    const uniqueDays = Array.from(
      new Set(
        dates.map((date) => date.toISOString().slice(0, 10)),
      ),
    ).sort((a, b) => (a > b ? -1 : 1));

    let streak = 0;
    let currentDate = new Date();

    for (const day of uniqueDays) {
      const expectedDay = currentDate.toISOString().slice(0, 10);

      if (day === expectedDay) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
        continue;
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (streak === 0 && day === yesterday.toISOString().slice(0, 10)) {
        streak++;
        currentDate = yesterday;
        currentDate.setDate(currentDate.getDate() - 1);
        continue;
      }

      break;
    }

    return streak;
  }


  private calculatePeriodStats(sessions: any[]) {
    const allSets = sessions.flatMap((session) => session.exerciseSetLogs);

    const totalWorkouts = sessions.length;

    const totalSets = allSets.length;

    const totalReps = allSets.reduce((sum, set) => {
      return sum + set.reps;
    }, 0);

    const totalVolume = allSets.reduce((sum, set) => {
      return sum + set.weight * set.reps;
    }, 0);

    return {
      totalWorkouts,
      totalSets,
      totalReps,
      totalVolume,
    };
  }

  async create(dto: CreateUserDto) {
    const hash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        password: hash,
        role: dto.role,
        approvalStatus: dto.approvalStatus ?? UserApprovalStatus.approved,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        approvalStatus: true,
        rejectionReason: true,
        createdAt: true,
      },
    });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        approvalStatus: true,
        rejectionReason: true,
        createdAt: true,
      },
    });
  }

  async update(id: number, dto: UpdateUserDto) {
    let data = { ...dto };

    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    if (dto.email) {
      data.email = dto.email.trim().toLowerCase();
    }

    if (dto.name) {
      data.name = dto.name.trim();
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        approvalStatus: true,
        rejectionReason: true,
      },
    });
  }

  async findAll(paginationDto: GetUsersDto) {
    const { page, limit, role, search, approvalStatus } = paginationDto;

    if (page && limit) {
      const skip = (page - 1) * limit;

      const where: any = {};

      if (role) {
        where.role = role;
      }

      if (approvalStatus) {
        where.approvalStatus = approvalStatus;
      }

      if (search) {
        where.OR = [
          {
            email: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ];
      }

      const [users, total] = await this.prisma.$transaction([
        this.prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            approvalStatus: true,
            rejectionReason: true,
            createdAt: true,
          },
        }),
        this.prisma.user.count({ where }),
      ]);

      return {
        data: users,
        meta: {
          total,
          page,
          lastPage: Math.ceil(total / limit),
        },
      };
    }
  }

  async findPendingApprovals() {
    return this.prisma.user.findMany({
      where: {
        approvalStatus: UserApprovalStatus.pending,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        approvalStatus: true,
        rejectionReason: true,
        createdAt: true,
      },
    });
  }

  async updateApprovalStatus(id: number, dto: UpdateUserApprovalDto) {
    return this.prisma.user.update({
      where: { id },
      data: {
        approvalStatus: dto.status,
        rejectionReason:
          dto.status === UserApprovalStatus.rejected ? dto.reason ?? null : null,
        refreshToken:
          dto.status === UserApprovalStatus.approved ? undefined : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        approvalStatus: true,
        rejectionReason: true,
        createdAt: true,
      },
    });
  }

  async getMyStats(userId: number) {
    const sessions = await this.prisma.trainingSession.findMany({
      where: {
        userId,
      },
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
        },
      },
    });

    const allStats = this.calculatePeriodStats(sessions);

    const now = new Date();

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const monthStart = new Date(now);
    monthStart.setDate(now.getDate() - 30);

    const weekSessions = sessions.filter((session) => {
      return session.date >= weekStart;
    });

    const monthSessions = sessions.filter((session) => {
      return session.date >= monthStart;
    });

    const allSets = sessions.flatMap((session) => session.exerciseSetLogs);

    const muscleGroupStatsMap = new Map<
      string,
      {
        muscleGroup: string;
        totalSets: number;
        totalReps: number;
        totalVolume: number;
      }
    >();

    for (const set of allSets) {
      const muscleGroup = set.exercise.muscleGroup;

      const existing = muscleGroupStatsMap.get(muscleGroup) ?? {
        muscleGroup,
        totalSets: 0,
        totalReps: 0,
        totalVolume: 0,
      };

      existing.totalSets += 1;
      existing.totalReps += set.reps;
      existing.totalVolume += set.weight * set.reps;

      muscleGroupStatsMap.set(muscleGroup, existing);
    }

    const muscleGroupStats = Array.from(muscleGroupStatsMap.values()).sort(
      (a, b) => b.totalVolume - a.totalVolume,
    );

    const setsWithRir = allSets.filter((set) => set.rir !== null);

    const averageRir =
      setsWithRir.length > 0
        ? setsWithRir.reduce((sum, set) => sum + (set.rir ?? 0), 0) /
        setsWithRir.length
        : null;

    const bestEstimatedOneRepMaxByExercise = new Map<
      number,
      {
        exerciseId: number;
        exerciseName: string;
        estimatedOneRepMax: number;
        weight: number;
        reps: number;
      }
    >();

    for (const set of allSets) {
      const estimatedOneRepMax = set.weight * (1 + set.reps / 30);

      const existing = bestEstimatedOneRepMaxByExercise.get(set.exerciseId);

      if (!existing || estimatedOneRepMax > existing.estimatedOneRepMax) {
        bestEstimatedOneRepMaxByExercise.set(set.exerciseId, {
          exerciseId: set.exerciseId,
          exerciseName: set.exercise.name,
          estimatedOneRepMax: Number(estimatedOneRepMax.toFixed(1)),
          weight: set.weight,
          reps: set.reps,
        });
      }
    }

    const currentStreak = this.calculateCurrentStreak(
      sessions.map((session) => session.date),
    );

    const lastWorkout = sessions[0]
      ? {
        id: sessions[0].id,
        date: sessions[0].date,
        plan: sessions[0].plan,
      }
      : null;

    return {
      summary: {
        ...allStats,
        averageRir:
          averageRir !== null ? Number(averageRir.toFixed(1)) : null,
        currentStreak,
        lastWorkout,
      },
      week: this.calculatePeriodStats(weekSessions),
      month: this.calculatePeriodStats(monthSessions),
      muscleGroupStats,
      bestEstimatedOneRepMaxByExercise: Array.from(
        bestEstimatedOneRepMaxByExercise.values(),
      ),
    };
  }


  async getUserStats(userId: number) {
    return this.getMyStats(userId);
  }

  async getAdminTrainingOverview(
    userId: number,
    dto: GetTrainingSessionsDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        approvalStatus: true,
        rejectionReason: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { page, limit, date } = dto;
    const skip = (page - 1) * limit;
    const sessionsWhere = {
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

    const [stats, plans, sessions, totalSessions, exerciseLogs] = await Promise.all([
      this.getUserStats(userId),
      this.prisma.trainingPlan.findMany({
        where: {
          OR: [
            { authorId: userId },
            { assignedToUserId: userId },
          ],
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
          assignedToUser: {
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
      }),
      this.prisma.trainingSession.findMany({
        where: sessionsWhere,
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
              status: true,
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
                  muscleGroup: true,
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
        where: sessionsWhere,
      }),
      this.prisma.exerciseSetLog.findMany({
        where: {
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
          exercise: {
            include: {
              workoutDay: {
                include: {
                  plan: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                },
              },
            },
          },
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
      }),
    ]);

    const formattedSessions = sessions.map((session) => this.formatTrainingSession(session));
    const exerciseProgress = this.buildExerciseProgress(exerciseLogs);
    const assignedPlans = plans.filter((plan) => plan.assignedToUserId === userId);
    const authoredPlans = plans.filter((plan) => plan.authorId === userId);

    return {
      user,
      overview: this.buildAdminOverview(
        userId,
        plans,
        formattedSessions,
        exerciseProgress,
      ),
      stats,
      plans: {
        assigned: assignedPlans,
        authored: authoredPlans,
      },
      sessions: {
        data: formattedSessions,
        meta: {
          total: totalSessions,
          page,
          limit,
          totalPages: Math.ceil(totalSessions / limit),
        },
      },
      exerciseProgress,
    };
  }

}
