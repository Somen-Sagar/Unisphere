import {
  createParamDecorator,
  InternalServerErrorException,
  type ExecutionContext,
} from '@nestjs/common';

import type { AuthenticatedRequest } from './authenticated-request';
import type { TenantContext } from './tenant-context';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantContext => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.tenant) {
      throw new InternalServerErrorException(
        'Tenant context was not resolved.',
      );
    }
    return request.tenant;
  },
);
