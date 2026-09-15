import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { CampusNotification } from '@unisphere/types';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTenant } from '../common/current-tenant.decorator';
import { TenantGuard } from '../common/tenant.guard';
import type { TenantContext } from '../common/tenant-context';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  findAll(
    @CurrentTenant() tenant: TenantContext,
  ): Promise<CampusNotification[]> {
    return this.notifications.findAll(tenant);
  }

  @Post(':notificationId/read')
  markRead(
    @CurrentTenant() tenant: TenantContext,
    @Param('notificationId') notificationId: string,
  ): Promise<CampusNotification> {
    return this.notifications.markRead(tenant, notificationId);
  }
}
