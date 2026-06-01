import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { TrainingPlansService } from './training-plans.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateTrainingPlanDto } from './dto/create-training-plan.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdatePlanStatusDto } from './dto/update-plan-status.dto';
import { UpdateTrainingPlanDto } from './dto/update-training-plan.dto';
import { GetTrainingPlansDto } from './dto/get-training-plans.dto';
import { OptionalAuth } from '../common/decorators/optional-auth.decorator';
import { CreateWorkoutDayDto } from './dto/create-workout-day.dto';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateWorkoutDayDto } from './dto/update-workout-day.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { CreateTrainingSessionDto } from './dto/create-training-session.dto';
import { UpdateTrainingSessionDto } from './dto/update-training-session.dto';
import { GetTrainingSessionsDto } from './dto/get-training-sessions.dto';

@ApiBearerAuth('access-token')
@Controller('training-plans')
export class TrainingPlansController {
  constructor(private service: TrainingPlansService) { }

  @Post()
  create(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateTrainingPlanDto,
  ) {
    return this.service.create(userId, dto);
  }

  @Post('sessions')
  logTrainingSession(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateTrainingSessionDto,
  ) {
    return this.service.logTrainingSession(userId, dto);
  }


  @Post(':id/workout-days')
  addWorkoutDay(
    @Param('id') id: string,
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateWorkoutDayDto,
  ) {
    return this.service.addWorkoutDay(+id, userId, dto);
  }

  @Post('workout-days/:dayId/exercises')
  addExercise(
    @Param('dayId') dayId: string,
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateExerciseDto,
  ) {
    return this.service.addExercise(+dayId, userId, dto);
  }


  @Get('exercises/:exerciseId/recommendation')
  getExerciseRecommendation(
    @CurrentUser('sub') userId: number,
    @Param('exerciseId') exerciseId: string,
  ) {
    return this.service.getExerciseProgressionRecommendation(
      userId,
      +exerciseId,
    );
  }

  @Get('my')
  getMyPlans(@CurrentUser('sub') userId: number) {
    return this.service.findMyPlans(userId);
  }


  @Get('pending')
  @Roles(Role.admin, Role.moderator)
  @UseGuards(RolesGuard)
  getPendingPlans() {
    return this.service.findPendingPlans();
  }

  @Patch(':id/status')
  @Roles(Role.admin, Role.moderator)
  @UseGuards(RolesGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePlanStatusDto,
  ) {
    return this.service.updateStatus(+id, dto);
  }

  @Get()
  @OptionalAuth()
  getApprovedPlans(
    @Query() query: GetTrainingPlansDto,
    @CurrentUser('sub') userId?: number,
  ) {
    return this.service.findApprovedPlans(query, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('sub') userId: number,
    @Body() dto: UpdateTrainingPlanDto,
  ) {
    return this.service.update(+id, userId, dto);
  }

  @Delete(':id')
  deletePlan(
    @Param('id') id: string,
    @CurrentUser('sub') userId: number,
  ) {
    return this.service.deletePlan(+id, userId);
  }

  @Patch('workout-days/:dayId')
  updateWorkoutDay(
    @Param('dayId') dayId: string,
    @CurrentUser('sub') userId: number,
    @Body() dto: UpdateWorkoutDayDto,
  ) {
    return this.service.updateWorkoutDay(+dayId, userId, dto);
  }

  @Delete('workout-days/:dayId')
  deleteWorkoutDay(
    @Param('dayId') dayId: string,
    @CurrentUser('sub') userId: number,
  ) {
    return this.service.deleteWorkoutDay(+dayId, userId);
  }

  @Patch('exercises/:exerciseId')
  updateExercise(
    @Param('exerciseId') exerciseId: string,
    @CurrentUser('sub') userId: number,
    @Body() dto: UpdateExerciseDto,
  ) {
    return this.service.updateExercise(+exerciseId, userId, dto);
  }

  @Delete('exercises/:exerciseId')
  deleteExercise(
    @Param('exerciseId') exerciseId: string,
    @CurrentUser('sub') userId: number,
  ) {
    return this.service.deleteExercise(+exerciseId, userId);
  }

  @Post(':id/like')
  toggleLike(
    @Param('id') id: string,
    @CurrentUser('sub') userId: number,
  ) {
    return this.service.toggleLike(userId, +id);
  }

  @Post(':id/save')
  toggleSave(
    @Param('id') id: string,
    @CurrentUser('sub') userId: number,
  ) {
    return this.service.toggleSave(userId, +id);
  }

  @Get('saved')
  getSavedPlans(@CurrentUser('sub') userId: number) {
    return this.service.getSavedPlans(userId);
  }


  // прогресс по плану

  @Get('exercises/:exerciseId/progress')
  getExerciseProgress(
    @CurrentUser('sub') userId: number,
    @Param('exerciseId') exerciseId: string,
  ) {
    return this.service.getExerciseProgress(userId, +exerciseId);
  }


  // для графика


  @Get('exercises/:exerciseId/progress-summary')
  getExerciseProgressSummary(
    @CurrentUser('sub') userId: number,
    @Param('exerciseId') exerciseId: string,
  ) {
    return this.service.getExerciseProgressSummary(userId, +exerciseId);
  }

  // список тренировочных сессий

  @Get('sessions/my')
  getMyTrainingSessions(
    @CurrentUser('sub') userId: number,
    @Query() dto: GetTrainingSessionsDto,
  ) {
    return this.service.getMyTrainingSessions(userId, dto);
  }


  @Get('sessions/:sessionId')
  getTrainingSessionById(
    @CurrentUser('sub') userId: number,
    @Param('sessionId') sessionId: string,
  ) {
    return this.service.getTrainingSessionById(userId, +sessionId);
  }


  @Patch('sessions/:sessionId')
  updateTrainingSession(
    @CurrentUser('sub') userId: number,
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateTrainingSessionDto,
  ) {
    return this.service.updateTrainingSession(userId, +sessionId, dto);
  }

  @Delete('sessions/:sessionId')
  deleteTrainingSession(
    @CurrentUser('sub') userId: number,
    @Param('sessionId') sessionId: string,
  ) {
    return this.service.deleteTrainingSession(userId, +sessionId);
  }

  @Get('workout-days/:dayId/next-workout')
  getNextWorkoutRecommendation(
    @CurrentUser('sub') userId: number,
    @Param('dayId') dayId: string,
  ) {
    return this.service.getNextWorkoutRecommendation(userId, +dayId);
  }


  @Get('workout-days/:dayId/history')
  getWorkoutDayHistory(
    @CurrentUser('sub') userId: number,
    @Param('dayId') dayId: string,
  ) {
    return this.service.getWorkoutDayHistory(userId, +dayId);
  }

}
