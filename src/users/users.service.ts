import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersDto } from './dto/get-users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

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
        email: dto.email,
        password: hash,
        role: dto.role,
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

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async update(id: number, dto: UpdateUserDto) {
    let data = { ...dto };

    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  }

  async findAll(paginationDto: GetUsersDto) {
    const { page, limit, role, search } = paginationDto;

    if (page && limit) {
      const skip = (page - 1) * limit;

      const where: any = {};

      if (role) {
        where.role = role;
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

}
