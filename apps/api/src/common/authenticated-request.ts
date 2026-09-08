import type { Request } from 'express';
import type { TenantContext } from './tenant-context';

export type AccessTokenUser = {
  userId: string;
  email: string;
};

export type AuthenticatedRequest = Request & {
  user: AccessTokenUser;
  tenant?: TenantContext;
};
