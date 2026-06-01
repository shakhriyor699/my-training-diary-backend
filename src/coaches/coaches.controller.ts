import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { Role } from '@prisma/client';
import { CoachesService } from './coaches.service';
import { CreateCoachRequestDto } from './dto/create-coach-request.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateTrainingPlanDto } from '../training-plans/dto/create-training-plan.dto';
import { GetCoachesDto } from './dto/get-coaches.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('access-token')
@Controller('coaches')
export class CoachesController {
  constructor(private readonly coachesService: CoachesService) { }

  @Get()
  getCoaches(@Query() dto: GetCoachesDto) {
    return this.coachesService.getCoaches(dto);
  }

  @Post(':coachId/request')
  sendRequest(
    @CurrentUser('sub') studentId: number,
    @Param('coachId') coachId: string,
    @Body() dto: CreateCoachRequestDto,
  ) {
    return this.coachesService.sendRequest(studentId, +coachId, dto);
  }

  @Get('requests/my')
  @Roles(Role.coach)
  @UseGuards(RolesGuard)
  getMyCoachRequests(@CurrentUser('sub') coachId: number) {
    return this.coachesService.getMyCoachRequests(coachId);
  }

  @Patch('requests/:requestId/accept')
  @Roles(Role.coach)
  @UseGuards(RolesGuard)
  acceptRequest(
    @CurrentUser('sub') coachId: number,
    @Param('requestId') requestId: string,
  ) {
    return this.coachesService.acceptRequest(coachId, +requestId);
  }

  @Patch('requests/:requestId/reject')
  @Roles(Role.coach)
  @UseGuards(RolesGuard)
  rejectRequest(
    @CurrentUser('sub') coachId: number,
    @Param('requestId') requestId: string,
  ) {
    return this.coachesService.rejectRequest(coachId, +requestId);
  }

  @Get('students/my')
  @Roles(Role.coach)
  @UseGuards(RolesGuard)
  getMyStudents(@CurrentUser('sub') coachId: number) {
    return this.coachesService.getMyStudents(coachId);
  }


  @Get('students/:studentId/stats')
  @Roles(Role.coach)
  @UseGuards(RolesGuard)
  getStudentStats(
    @CurrentUser('sub') coachId: number,
    @Param('studentId') studentId: string,
  ) {
    return this.coachesService.getStudentStats(coachId, +studentId);
  }

  @Get('students/:studentId/sessions')
  @Roles(Role.coach)
  @UseGuards(RolesGuard)
  getStudentSessions(
    @CurrentUser('sub') coachId: number,
    @Param('studentId') studentId: string,
    @Query() dto: PaginationDto,
  ) {
    return this.coachesService.getStudentSessions(
      coachId,
      +studentId,
      dto,
    );
  }

  @Get('students/:studentId/plans')
  @Roles(Role.coach, Role.admin, Role.moderator)
  @UseGuards(RolesGuard)
  getStudentPlans(
    @CurrentUser('sub') coachId: number,
    @CurrentUser('role') role: Role,
    @Param('studentId') studentId: string,
  ) {
    return this.coachesService.getStudentPlans(coachId, role, +studentId);
  }

  @Post('students/:studentId/plans')
  @Roles(Role.coach)
  @UseGuards(RolesGuard)
  createPlanForStudent(
    @CurrentUser('sub') coachId: number,
    @Param('studentId') studentId: string,
    @Body() dto: CreateTrainingPlanDto,
  ) {
    return this.coachesService.createPlanForStudent(
      coachId,
      +studentId,
      dto,
    );
  }
}
