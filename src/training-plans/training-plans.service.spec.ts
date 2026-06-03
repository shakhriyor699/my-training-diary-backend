import { PlanStatus, Role } from '@prisma/client';
import { TrainingPlansService } from './training-plans.service';

describe('TrainingPlansService', () => {
  let service: TrainingPlansService;
  let prisma: any;
  let notificationsService: any;

  beforeEach(() => {
    prisma = {
      trainingPlan: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      workoutDay: {
        create: jest.fn(),
      },
    };

    notificationsService = {
      create: jest.fn(),
    };

    service = new TrainingPlansService(prisma, notificationsService);
  });

  it('keeps approved plan status unchanged when plan details are updated', async () => {
    prisma.trainingPlan.findUnique.mockResolvedValue({
      id: 11,
      authorId: 7,
      assignedToUserId: null,
      status: PlanStatus.approved,
    });

    prisma.trainingPlan.update.mockResolvedValue({
      id: 11,
      title: 'Updated title',
      status: PlanStatus.approved,
    });

    await service.update(11, 7, { title: 'Updated title' });

    expect(prisma.trainingPlan.update).toHaveBeenCalledWith({
      where: { id: 11 },
      data: { title: 'Updated title' },
    });
  });

  it('does not re-submit an approved plan for review when a workout day is added', async () => {
    prisma.trainingPlan.findUnique.mockResolvedValue({
      id: 11,
      authorId: 7,
      assignedToUserId: null,
      status: PlanStatus.approved,
    });

    prisma.workoutDay.create.mockResolvedValue({
      id: 21,
      title: 'Day 1',
      order: 1,
      planId: 11,
    });

    await service.addWorkoutDay(11, 7, {
      title: 'Day 1',
      order: 1,
    });

    expect(prisma.trainingPlan.update).not.toHaveBeenCalled();
  });

  it('still notifies an assigned student when the coach updates an approved plan', async () => {
    prisma.trainingPlan.findUnique.mockResolvedValue({
      id: 12,
      authorId: 8,
      assignedToUserId: 55,
      status: PlanStatus.approved,
      role: Role.user,
    });

    prisma.trainingPlan.update.mockResolvedValue({
      id: 12,
      title: 'Coach plan',
      status: PlanStatus.approved,
    });

    await service.update(12, 8, { title: 'Coach plan' });

    expect(notificationsService.create).toHaveBeenCalledWith(55, {
      type: 'coach_plan_updated',
      title: 'Тренер обновил ваш план',
      message: 'Тренер обновил план: Coach plan',
    });
  });
});
