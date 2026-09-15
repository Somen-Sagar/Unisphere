import { Injectable } from '@nestjs/common';
import type { DashboardSummary } from '@unisphere/types';

import type { TenantContext } from '../common/tenant-context';
import { PrismaService } from '../database/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(tenant: TenantContext): Promise<DashboardSummary> {
    const now = new Date();
    const [upcomingEvents, activeClubs, registrations, unreadNotifications] =
      await this.prisma.$transaction([
        this.prisma.event.count({
          where: {
            collegeId: tenant.collegeId,
            status: {
              in: [
                'APPROVED',
                'PUBLISHED',
                'REGISTRATION_OPEN',
                'REGISTRATION_CLOSED',
                'ONGOING',
              ],
            },
            endsAt: { gte: now },
          },
        }),
        this.prisma.club.count({
          where: {
            collegeId: tenant.collegeId,
            isActive: true,
            verificationStatus: 'VERIFIED',
          },
        }),
        this.prisma.eventRegistration.count({
          where: {
            collegeId: tenant.collegeId,
            userId: tenant.userId,
            status: { not: 'CANCELLED' },
          },
        }),
        this.prisma.notification.count({
          where: {
            collegeId: tenant.collegeId,
            userId: tenant.userId,
            readAt: null,
          },
        }),
      ]);

    return {
      upcomingEvents,
      activeClubs,
      registrations,
      unreadNotifications,
    };
  }
}
