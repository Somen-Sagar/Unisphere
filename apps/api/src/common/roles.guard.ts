import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { MembershipRole } from '@unisphere/types';

import type { AuthenticatedRequest } from './authenticated-request';
import { TENANT_ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<MembershipRole[]>(TENANT_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (!requiredRoles.length) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const roles = request.tenant?.roles ?? [];
    const allowed =
      roles.includes('PLATFORM_ADMIN') ||
      requiredRoles.some((role) => roles.includes(role));

    if (!allowed) {
      throw new ForbiddenException('You do not have access to this action.');
    }

    return true;
  }
}
