import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { SelfOrAdminGuard } from '../common/guards/self-or-admin.guard';
import { GetUsersDto } from './dto/get-users.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { UpdateUserApprovalDto } from './dto/update-user-approval.dto';
import { GetTrainingSessionsDto } from '../training-plans/dto/get-training-sessions.dto';

@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) { }

 

  @Post('create')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }


  @Get('me')
  getMe(@CurrentUser('sub') userId: number) {
    return this.usersService.findById(userId);
  }

  @Get('all')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @UseGuards(RolesGuard)
  findAll(@Query() paginationDto: GetUsersDto) {
    return this.usersService.findAll(paginationDto);
  }

  @Get('pending')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @UseGuards(RolesGuard)
  findPendingApprovals() {
    return this.usersService.findPendingApprovals();
  }

  @Get('roles')
  @Public()
  getRoles() {
    return Object.values(Role).map((role) => ({
      value: role,
      label: this.getRoleLabel(role),
    }));
  }

  private getRoleLabel(role: Role) {
    switch (role) {
      case Role.ADMIN:
        return 'Admin';
      case Role.MODERATOR:
        return 'Moderator';
      case Role.USER:
        return 'User';
      case Role.COACH:
        return 'Coach';
      default:
        return role;
    }
  }


  // Получить пользователя по id (admin / moderator)
  @Get(':id')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @UseGuards(RolesGuard)
  findOne(@Param('id') id: string) {
    return this.usersService.findById(+id);
  }

  @Get(':id/training-overview')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  getTrainingOverview(
    @Param('id') id: string,
    @Query() dto: GetTrainingSessionsDto,
  ) {
    return this.usersService.getAdminTrainingOverview(+id, dto);
  }


  @Patch(':id')
  @UseGuards(SelfOrAdminGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {

    return this.usersService.update(+id, dto);

  }

  @Patch(':id/approval')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @UseGuards(RolesGuard)
  updateApprovalStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserApprovalDto,
  ) {
    return this.usersService.updateApprovalStatus(+id, dto);
  }

  @Get('me/stats')
  getMyStats(@CurrentUser('sub') userId: number) {
    return this.usersService.getMyStats(userId);
  }




}
