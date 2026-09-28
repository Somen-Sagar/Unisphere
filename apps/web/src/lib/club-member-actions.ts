import type {
  ClubAccess,
  ClubMember,
  ClubMembershipRole,
  ClubPermission,
} from "@unisphere/types";

const protectedRoles = new Set<ClubMembershipRole>([
  "CLUB_MENTOR",
  "CLUB_LEAD",
]);

const criticalPermissions = new Set<ClubPermission>([
  "CLUB_MANAGE_ROLES",
  "CLUB_MANAGE_PERMISSIONS",
]);

export const clubMembershipRoles: ClubMembershipRole[] = [
  "CLUB_MENTOR",
  "CLUB_LEAD",
  "CLUB_SUB_LEAD",
  "ORGANIZER",
  "CORE_MEMBER",
  "MEMBER",
];

export function assignableClubRoles(access: ClubAccess): ClubMembershipRole[] {
  return access.isCollegeAdmin
    ? clubMembershipRoles
    : clubMembershipRoles.filter((role) => !protectedRoles.has(role));
}

export function canManageClubMember(
  access: ClubAccess,
  member: Pick<ClubMember, "id" | "role">,
): boolean {
  if (!access.canManageMembers || member.id === access.membershipId) return false;
  return access.isCollegeAdmin || !protectedRoles.has(member.role);
}

export function canChangeClubMemberRole(
  access: ClubAccess,
  member: Pick<ClubMember, "id" | "role">,
): boolean {
  return (
    canManageClubMember(access, member) &&
    access.permissions.includes("CLUB_MANAGE_ROLES")
  );
}

export function canOverrideClubPermission(
  access: ClubAccess,
  member: Pick<ClubMember, "id" | "role">,
  permission: ClubPermission,
): boolean {
  if (
    !canManageClubMember(access, member) ||
    !access.permissions.includes("CLUB_MANAGE_PERMISSIONS")
  ) {
    return false;
  }
  return access.isCollegeAdmin || !criticalPermissions.has(permission);
}
