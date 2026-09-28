import type { ClubAccess } from "@unisphere/types";

export type ClubNavigationKey =
  | "dashboard"
  | "members"
  | "events"
  | "create-event"
  | "create-competition"
  | "recruitment"
  | "announcements"
  | "registrations"
  | "attendance"
  | "analytics"
  | "settings";

export type ClubNavigationItem = {
  key: ClubNavigationKey;
  label: string;
  href: string;
};

export function clubNavigation(
  clubId: string,
  access: ClubAccess,
): ClubNavigationItem[] {
  const base = `/dashboard/clubs/${clubId}`;
  const items: ClubNavigationItem[] = [];
  const mentor = access.canReviewEvents && access.role === "CLUB_MENTOR";

  if (access.canManageClub || access.canViewAnalytics || access.canReviewEvents) {
    items.push({
      key: "dashboard",
      label: mentor ? "Mentored Club" : "Club Dashboard",
      href: `${base}/manage`,
    });
  }
  if (access.permissions.includes("CLUB_VIEW_MEMBERS")) {
    items.push({ key: "members", label: "Members", href: `${base}/members` });
  }
  if (
    access.canCreateEvent ||
    access.canViewAnalytics ||
    access.canReviewEvents
  ) {
    items.push({
      key: "events",
      label: mentor ? "Event Reviews" : "Events",
      href: `${base}/events`,
    });
  }
  if (access.canCreateEvent) {
    items.push(
      {
        key: "create-event",
        label: "Create Event",
        href: `${base}/events/new`,
      },
      {
        key: "create-competition",
        label: "Create Competition",
        href: `${base}/events/new?type=COMPETITION`,
      },
    );
  }
  if (access.canManageRecruitment) {
    items.push({
      key: "recruitment",
      label: "Recruitment",
      href: `${base}/recruitment`,
    });
  }
  if (access.canPostAnnouncement) {
    items.push({
      key: "announcements",
      label: "Announcements",
      href: `${base}/announcements`,
    });
  }
  if (access.canViewRegistrations) {
    items.push({
      key: "registrations",
      label: "Registrations",
      href: `${base}/registrations`,
    });
  }
  if (access.canMarkAttendance) {
    items.push({
      key: "attendance",
      label: "Attendance",
      href: `${base}/attendance`,
    });
  }
  if (access.canViewAnalytics) {
    items.push({
      key: "analytics",
      label: "Analytics",
      href: `${base}/analytics`,
    });
  }
  if (access.canEditProfile) {
    items.push({
      key: "settings",
      label: "Club Settings",
      href: `${base}/settings`,
    });
  }

  return items;
}

export function clubQuickActions(
  clubId: string,
  access: ClubAccess,
): ClubNavigationItem[] {
  const actionKeys = new Set<ClubNavigationKey>([
    "create-event",
    "create-competition",
    "members",
    "recruitment",
    "announcements",
    "registrations",
    "attendance",
    "analytics",
    "settings",
  ]);
  return clubNavigation(clubId, access).filter((item) =>
    actionKeys.has(item.key),
  );
}
