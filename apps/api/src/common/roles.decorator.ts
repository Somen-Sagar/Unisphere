import { SetMetadata } from '@nestjs/common';
import type { MembershipRole } from '@unisphere/types';

export const TENANT_ROLES_KEY = 'tenant_roles';

export const TenantRoles = (...roles: MembershipRole[]) =>
  SetMetadata(TENANT_ROLES_KEY, roles);
