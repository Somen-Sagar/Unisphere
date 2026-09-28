import assert from "node:assert/strict";
import test from "node:test";

import type { ClubAccess, ClubPermission } from "@unisphere/types";

import { clubNavigation } from "../src/lib/club-navigation.ts";

function access(
  role: ClubAccess["role"],
  permissions: ClubPermission[],
  overrides: Partial<ClubAccess> = {},
): ClubAccess {
  const has = (permission: ClubPermission) => permissions.includes(permission);
  return {
    membershipId: "membership-a",
    role,
    permissions,
    isCollegeAdmin: false,
    canManageClub: permissions.length > 3,
    canCreateEvent: has("CLUB_CREATE_EVENT"),
    canManageMembers: has("CLUB_MANAGE_MEMBERS"),
    canManageRecruitment: has("CLUB_MANAGE_RECRUITMENT"),
    canPostAnnouncement: has("CLUB_POST_ANNOUNCEMENT"),
    canViewRegistrations: has("CLUB_VIEW_REGISTRATIONS"),
    canManageRegistrations: has("CLUB_MANAGE_REGISTRATIONS"),
    canMarkAttendance: has("CLUB_MARK_ATTENDANCE"),
    canViewAnalytics: has("CLUB_VIEW_ANALYTICS"),
    canEditProfile: has("CLUB_EDIT_PROFILE"),
    canReviewEvents: role === "CLUB_MENTOR",
    ...overrides,
  };
}

const leadPermissions: ClubPermission[] = [
  "CLUB_VIEW_MEMBERS",
  "CLUB_MANAGE_MEMBERS",
  "CLUB_EDIT_PROFILE",
  "CLUB_CREATE_EVENT",
  "CLUB_VIEW_REGISTRATIONS",
  "CLUB_MANAGE_REGISTRATIONS",
  "CLUB_MARK_ATTENDANCE",
  "CLUB_POST_ANNOUNCEMENT",
  "CLUB_MANAGE_RECRUITMENT",
  "CLUB_VIEW_ANALYTICS",
];

test("lead navigation exposes every operational milestone action", () => {
  const keys = clubNavigation("club-a", access("CLUB_LEAD", leadPermissions)).map(
    (item) => item.key,
  );

  assert.deepEqual(keys, [
    "dashboard",
    "members",
    "events",
    "create-event",
    "create-competition",
    "recruitment",
    "announcements",
    "registrations",
    "attendance",
    "analytics",
    "settings",
  ]);
});

test("sub-lead create-event visibility follows the effective grant", () => {
  const restricted = access("CLUB_SUB_LEAD", [
    "CLUB_VIEW_MEMBERS",
    "CLUB_VIEW_REGISTRATIONS",
    "CLUB_VIEW_ANALYTICS",
  ]);
  const granted = access("CLUB_SUB_LEAD", [
    ...restricted.permissions,
    "CLUB_CREATE_EVENT",
  ], { canManageClub: true, canCreateEvent: true });

  assert.equal(
    clubNavigation("club-a", restricted).some(
      (item) => item.key === "create-event",
    ),
    false,
  );
  assert.equal(
    clubNavigation("club-a", granted).some(
      (item) => item.key === "create-event",
    ),
    true,
  );
});

test("mentor navigation stays advisory and organizer gets no club workspace", () => {
  const mentor = clubNavigation(
    "club-a",
    access("CLUB_MENTOR", [
      "CLUB_VIEW_MEMBERS",
      "CLUB_VIEW_REGISTRATIONS",
      "CLUB_VIEW_ANALYTICS",
    ]),
  );
  const organizer = clubNavigation("club-a", access("ORGANIZER", []));

  assert.equal(mentor.some((item) => item.key === "create-event"), false);
  assert.equal(mentor.find((item) => item.key === "events")?.label, "Event Reviews");
  assert.deepEqual(organizer, []);
});
