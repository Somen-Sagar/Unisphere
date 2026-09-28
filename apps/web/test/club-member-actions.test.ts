import assert from "node:assert/strict";
import test from "node:test";

import type { ClubAccess, ClubMember, ClubPermission } from "@unisphere/types";

import {
  assignableClubRoles,
  canChangeClubMemberRole,
  canManageClubMember,
  canOverrideClubPermission,
} from "../src/lib/club-member-actions.ts";

function access(overrides: Partial<ClubAccess> = {}): ClubAccess {
  const permissions: ClubPermission[] = [
    "CLUB_MANAGE_MEMBERS",
    "CLUB_MANAGE_ROLES",
    "CLUB_MANAGE_PERMISSIONS",
  ];
  return {
    membershipId: "lead-membership",
    role: "CLUB_LEAD",
    permissions,
    isCollegeAdmin: false,
    canManageClub: true,
    canCreateEvent: false,
    canManageMembers: true,
    canManageRecruitment: false,
    canPostAnnouncement: false,
    canViewRegistrations: false,
    canManageRegistrations: false,
    canMarkAttendance: false,
    canViewAnalytics: false,
    canEditProfile: false,
    canReviewEvents: false,
    ...overrides,
  };
}

const member = (id: string, role: ClubMember["role"]) => ({ id, role });

test("club leads only see assignable operational roles", () => {
  assert.deepEqual(assignableClubRoles(access()), [
    "CLUB_SUB_LEAD",
    "ORGANIZER",
    "CORE_MEMBER",
    "MEMBER",
  ]);
});

test("club leads cannot mutate themselves or protected governance members", () => {
  const lead = access();
  assert.equal(canManageClubMember(lead, member("lead-membership", "CLUB_LEAD")), false);
  assert.equal(canManageClubMember(lead, member("mentor", "CLUB_MENTOR")), false);
  assert.equal(canManageClubMember(lead, member("member", "MEMBER")), true);
  assert.equal(canChangeClubMemberRole(lead, member("member", "MEMBER")), true);
});

test("critical permission overrides remain college-admin governance", () => {
  const target = member("member", "MEMBER");
  assert.equal(canOverrideClubPermission(access(), target, "CLUB_CREATE_EVENT"), true);
  assert.equal(canOverrideClubPermission(access(), target, "CLUB_MANAGE_ROLES"), false);

  const collegeAdmin = access({ isCollegeAdmin: true, membershipId: null });
  assert.equal(canOverrideClubPermission(collegeAdmin, target, "CLUB_MANAGE_ROLES"), true);
  assert.ok(assignableClubRoles(collegeAdmin).includes("CLUB_LEAD"));
});
