import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GetNotificationsDto } from './dto/get-notifications.dto';

@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  @Get()
  findMyNotifications(@CurrentUser('sub') userId: number, @Query() dto: GetNotificationsDto) {
    return this.notificationsService.findMyNotifications(userId, dto);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser('sub') userId: number) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser('sub') userId: number) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  markAsRead(
    @CurrentUser('sub') userId: number,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(userId, +id);
  }







}
