import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';

import type { AuthenticatedRequest } from './authenticated-request';
import { PrismaService } from '../database/prisma/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const requestedCollegeId = this.readRequestedCollegeId(request);

    const memberships = await this.prisma.collegeMembership.findMany({
      where: {
        userId: request.user.userId,
        status: 'ACTIVE',
        ...(requestedCollegeId ? { collegeId: requestedCollegeId } : {}),
      },
      include: { college: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!memberships.length) {
      throw new ForbiddenException('An active college membership is required.');
    }

    const [primaryMembership] = memberships;
    const collegeMemberships = memberships.filter(
      (membership) => membership.collegeId === primaryMembership.collegeId,
    );

    request.tenant = {
      userId: request.user.userId,
      collegeId: primaryMembership.collegeId,
      roles: collegeMemberships.map((membership) => membership.role),
      membershipIds: collegeMemberships.map((membership) => membership.id),
      college: {
        id: primaryMembership.college.id,
        name: primaryMembership.college.name,
        slug: primaryMembership.college.slug,
        city: primaryMembership.college.city,
        state: primaryMembership.college.state,
        logoUrl: primaryMembership.college.logoUrl,
        status: primaryMembership.college.status,
      },
    };

    return true;
  }

  private readRequestedCollegeId(
    request: AuthenticatedRequest,
  ): string | undefined {
    const header = request.headers['x-college-id'];
    return Array.isArray(header) ? header[0] : header;
  }
}
