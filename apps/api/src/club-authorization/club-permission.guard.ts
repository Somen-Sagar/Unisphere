import {
  BadRequestException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ClubPermission } from '@unisphere/types';

import type { AuthenticatedRequest } from '../common/authenticated-request';
import { CLUB_PERMISSION_KEY } from './club-permission.decorator';
import { ClubPermissionService } from './club-permission.service';

@Injectable()
export class ClubPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: ClubPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<ClubPermission>(
      CLUB_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!permission) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const rawClubId = request.params?.clubId;
    const clubId = Array.isArray(rawClubId) ? rawClubId[0] : rawClubId;
    if (!clubId || !request.tenant) {
      throw new BadRequestException('A tenant-scoped club route is required.');
    }
    await this.permissions.assert(request.tenant, clubId, permission);
    return true;
  }
}
