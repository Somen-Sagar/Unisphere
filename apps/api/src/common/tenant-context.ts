import type { CollegeSummary, MembershipRole } from '@unisphere/types';

export type TenantContext = {
  userId: string;
  collegeId: string;
  roles: MembershipRole[];
  membershipIds: string[];
  college: CollegeSummary;
};
