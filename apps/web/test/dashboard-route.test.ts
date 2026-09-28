import assert from "node:assert/strict";
import test from "node:test";

import type { CampusUser, MembershipRole } from "@unisphere/types";

import { dashboardRouteForUser } from "../src/lib/auth/dashboard-route.ts";

function user(
  collegeRole: MembershipRole,
  clubRole?: NonNullable<CampusUser["clubMemberships"]>[number]["role"],
): CampusUser {
  return {
    id: "user-a",
    email: "lead@example.test",
    firstName: "Club",
    lastName: "Lead",
    avatarUrl: null,
    memberships: [
      {
        id: "college-membership-a",
        collegeId: "college-a",
        role: collegeRole,
        status: "ACTIVE",
        studentId: null,
        college: {
          id: "college-a",
          name: "Test College",
          slug: "test-college",
          city: null,
          state: null,
          logoUrl: null,
        },
      },
    ],
    clubMemberships: clubRole
      ? [
          {
            id: "club-membership-a",
            clubId: "club-a",
            role: clubRole,
            status: "ACTIVE",
            joinedAt: null,
            club: {
              id: "club-a",
              collegeId: "college-a",
              name: "Test Club",
              slug: "test-club",
              logoUrl: null,
            },
          },
        ]
      : [],
  };
}

test("an active club lead lands in the club workspace", () => {
  assert.equal(
    dashboardRouteForUser(user("STUDENT", "CLUB_LEAD")),
    "/club-admin/dashboard",
  );
});

test("an active club sub-lead lands in the club workspace", () => {
  assert.equal(
    dashboardRouteForUser(user("STUDENT", "CLUB_SUB_LEAD")),
    "/club-admin/dashboard",
  );
});

test("college-wide admin routes keep priority over club assignments", () => {
  assert.equal(
    dashboardRouteForUser(user("COLLEGE_ADMIN", "CLUB_LEAD")),
    "/college-admin/dashboard",
  );
});

test("inactive or non-operational club assignments do not change the student route", () => {
  assert.equal(dashboardRouteForUser(user("STUDENT", "MEMBER")), "/dashboard");
});
