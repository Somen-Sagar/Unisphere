import { Injectable, NotFoundException } from '@nestjs/common';
import type { CampusNotification } from '@unisphere/types';

import type { TenantContext } from '../common/tenant-context';
import { PrismaService } from '../database/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenant: TenantContext): Promise<CampusNotification[]> {
    const notifications = await this.prisma.notification.findMany({
      where: {
        collegeId: tenant.collegeId,
        userId: tenant.userId,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return notifications.map((notification) =>
      this.toNotification(notification),
    );
  }

  async markRead(
    tenant: TenantContext,
    notificationId: string,
  ): Promise<CampusNotification> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        collegeId: tenant.collegeId,
        userId: tenant.userId,
      },
    });
    if (!notification) throw new NotFoundException('Notification not found.');

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: notification.readAt ?? new Date() },
    });
    return this.toNotification(updated);
  }

  private toNotification(notification: {
    id: string;
    collegeId: string;
    userId: string;
    type: CampusNotification['type'];
    title: string;
    message: string;
    readAt: Date | null;
    createdAt: Date;
  }): CampusNotification {
    return {
      id: notification.id,
      collegeId: notification.collegeId,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    };
  }
}
