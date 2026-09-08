import type { CampusUser, MembershipRole } from "@unisphere/types";

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

export function dashboardRouteForUser(user: CampusUser): string {
  const activeRoles = new Set(
    user.memberships
      .filter((membership) => membership.status === "ACTIVE")
      .map((membership) => membership.role),
  );

  if (!activeRoles.size) return "/onboarding";

  const role = rolePriority.find((candidate) => activeRoles.has(candidate));
  return role ? roleRoutes[role] : "/dashboard";
}
