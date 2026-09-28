import { SetMetadata } from '@nestjs/common';
import type { ClubPermission } from '@unisphere/types';

export const CLUB_PERMISSION_KEY = 'club_permission';

export const RequireClubPermission = (permission: ClubPermission) =>
  SetMetadata(CLUB_PERMISSION_KEY, permission);
