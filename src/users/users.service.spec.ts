import { NotFoundException } from '@nestjs/common';
import { PlanStatus, Role, UserApprovalStatus } from '@prisma/client';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      trainingPlan: {
        findMany: jest.fn(),
      },
      trainingSession: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      exerciseSetLog: {
        findMany: jest.fn(),
      },
    };

    service = new UsersService(prisma);
  });

  it('throws when admin requests training overview for a missing user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.getAdminTrainingOverview(99, { page: 1, limit: 10 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns user training overview with plans, sessions and exercise progress', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      name: 'Alex',
      email: 'alex@example.com',
      role: Role.user,
      approvalStatus: UserApprovalStatus.approved,
      rejectionReason: null,
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
    });

    prisma.trainingPlan.findMany.mockResolvedValue([
      {
        id: 1,
        title: 'Assigned plan',
        authorId: 99,
        assignedToUserId: 7,
        status: PlanStatus.approved,
        workoutDays: [],
      },
      {
        id: 2,
        title: 'Authored plan',
        authorId: 7,
        assignedToUserId: null,
        status: PlanStatus.approved,
        workoutDays: [],
      },
    ]);

    prisma.trainingSession.findMany.mockResolvedValue([
      {
        id: 11,
        userId: 7,
        planId: 1,
        workoutDayId: 3,
        date: new Date('2026-06-02T10:00:00.000Z'),
        createdAt: new Date('2026-06-02T11:00:00.000Z'),
        plan: {
          id: 1,
          title: 'Assigned plan',
          status: PlanStatus.approved,
        },
        workoutDay: {
          id: 3,
          title: 'Upper 1',
        },
        exerciseLogs: [
          {
            id: 20,
            exerciseId: 100,
            note: null,
            targetSetsSnapshot: 3,
            minRepsSnapshot: 8,
            maxRepsSnapshot: 12,
            targetRirSnapshot: 2,
            weightStepSnapshot: 2.5,
            exercise: {
              id: 100,
              name: 'Bench Press',
              muscleGroup: 'chest',
              targetSets: 3,
              minReps: 8,
              maxReps: 12,
              targetRir: 2,
              weightStep: 2.5,
            },
            setLogs: [
              {
                id: 30,
                exerciseId: 100,
                setNumber: 1,
                weight: 60,
                reps: 8,
                rir: 2,
                createdAt: new Date('2026-06-02T10:00:00.000Z'),
              },
            ],
          },
        ],
      },
    ]);

    prisma.trainingSession.count.mockResolvedValue(1);

    prisma.exerciseSetLog.findMany.mockResolvedValue([
      {
        exerciseId: 100,
        weight: 60,
        reps: 8,
        exercise: {
          id: 100,
          name: 'Bench Press',
          muscleGroup: 'chest',
          workoutDay: {
            id: 3,
            title: 'Upper 1',
            plan: {
              id: 1,
              title: 'Assigned plan',
            },
          },
        },
        exerciseLog: {
          session: {
            id: 11,
            date: new Date('2026-06-02T10:00:00.000Z'),
          },
        },
      },
    ]);

    jest.spyOn(service, 'getUserStats').mockResolvedValue({
      summary: {
        totalWorkouts: 1,
      },
    } as any);

    const result = await service.getAdminTrainingOverview(7, {
      page: 1,
      limit: 10,
    });

    expect(result.user.id).toBe(7);
    expect(result.overview.activePlan.id).toBe(1);
    expect(result.overview.recentSessions).toHaveLength(1);
    expect(result.overview.topExercises[0]).toMatchObject({
      exerciseId: 100,
      exerciseName: 'Bench Press',
    });
    expect(result.overview.counts).toMatchObject({
      totalPlans: 2,
      assignedPlans: 1,
      authoredPlans: 1,
      activeExercises: 1,
    });
    expect(result.plans.assigned).toHaveLength(1);
    expect(result.plans.authored).toHaveLength(1);
    expect(result.sessions.meta.total).toBe(1);
    expect(result.sessions.data[0].exercises[0].exercise.name).toBe('Bench Press');
    expect(result.exerciseProgress[0]).toMatchObject({
      exerciseId: 100,
      exerciseName: 'Bench Press',
    });
  });
});
