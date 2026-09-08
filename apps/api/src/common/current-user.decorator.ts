import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type {
  AccessTokenUser,
  AuthenticatedRequest,
} from './authenticated-request';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AccessTokenUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
