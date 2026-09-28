import type {
  CampusUser,
  ClubMembershipRole,
  MembershipRole,
} from "@unisphere/types";

const roleRoutes: Record<MembershipRole, string> = {
  PLATFORM_ADMIN: "/platform-admin/dashboard",
  COLLEGE_ADMIN: "/college-admin/dashboard",
  DEPARTMENT_ADMIN: "/faculty/dashboard",
  CLUB_ADMIN: "/club-admin/dashboard",
  FACULTY: "/faculty/dashboard",
  STUDENT: "/dashboard",
};

const rolePriority: MembershipRole[] = [
  "PLATFORM_ADMIN",
  "COLLEGE_ADMIN",
  "DEPARTMENT_ADMIN",
  "CLUB_ADMIN",
  "FACULTY",
  "STUDENT",
];

const operationalClubRoles = new Set<ClubMembershipRole>([
  "CLUB_LEAD",
  "CLUB_SUB_LEAD",
  // Keep older assignments useful while existing data is being normalized.
  "ADMIN",
  "PRESIDENT",
  "LEAD",
  "SECRETARY",
]);

export function dashboardRouteForUser(user: CampusUser): string {
  const activeRoles = new Set(
    user.memberships
      .filter((membership) => membership.status === "ACTIVE")
      .map((membership) => membership.role),
  );

  if (!activeRoles.size) return "/onboarding";

  const role = rolePriority.find((candidate) => activeRoles.has(candidate));
  if (
    role !== "PLATFORM_ADMIN" &&
    role !== "COLLEGE_ADMIN" &&
    user.clubMemberships?.some(
      (membership) =>
        membership.status === "ACTIVE" &&
        operationalClubRoles.has(membership.role),
    )
  ) {
    return "/club-admin/dashboard";
  }
  return role ? roleRoutes[role] : "/dashboard";
}
