import { Controller, Get } from '@nestjs/common';
import {
  ExerciseType,
  MuscleGroup,
  TrainingGoal,
  PlanStatus,
} from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('access-token')
@Controller('references')
export class ReferencesController {
  @Get('exercise-types')
  @Public()
  getExerciseTypes() {
    return Object.values(ExerciseType);
  }

  @Get('muscle-groups')
  @Public()
  getMuscleGroups() {
    return Object.values(MuscleGroup);
  }

  @Get('training-goals')
  @Public()
  getTrainingGoals() {
    return Object.values(TrainingGoal);
  }

  @Get('plan-statuses')
  @Public()
  getPlanStatuses() {
    return Object.values(PlanStatus);
  }


  @Get()
  @Public()
  getAllReferences() {
    return {
      exerciseTypes: Object.values(ExerciseType),
      muscleGroups: Object.values(MuscleGroup),
      trainingGoals: Object.values(TrainingGoal),
      planStatuses: Object.values(PlanStatus),
    };
  }
}