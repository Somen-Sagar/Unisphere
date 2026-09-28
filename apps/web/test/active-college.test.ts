import assert from "node:assert/strict";
import test from "node:test";

import type { CampusUser } from "@unisphere/types";

import {
  ACTIVE_COLLEGE_STORAGE_KEY,
  activeMembershipForUser,
  isInvalidActiveCollegeError,
  reconcileActiveCollege,
} from "../src/lib/auth/active-college.ts";

function user(status: "ACTIVE" | "PENDING" = "ACTIVE"): CampusUser {
  return {
    id: "user-a",
    email: "lead@example.test",
    firstName: "Club",
    lastName: "Lead",
    avatarUrl: null,
    memberships: [
      {
        id: "membership-a",
        collegeId: "current-college",
        role: "STUDENT",
        status,
        studentId: null,
        college: {
          id: "current-college",
          name: "Current College",
          slug: "current-college",
          city: null,
          state: null,
          logoUrl: null,
        },
      },
    ],
    clubMemberships: [],
  };
}

function storage(initial?: string) {
  const values = new Map<string, string>();
  if (initial) values.set(ACTIVE_COLLEGE_STORAGE_KEY, initial);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

test("a stale college id is replaced with the user's active college", () => {
  const browserStorage = storage("deleted-college");
  const result = reconcileActiveCollege(user(), browserStorage);

  assert.deepEqual(result, { collegeId: "current-college", changed: true });
  assert.equal(
    browserStorage.getItem(ACTIVE_COLLEGE_STORAGE_KEY),
    "current-college",
  );
});

test("a valid selected college is preserved", () => {
  const browserStorage = storage("current-college");
  assert.deepEqual(reconcileActiveCollege(user(), browserStorage), {
    collegeId: "current-college",
    changed: false,
  });
});

test("inactive memberships never become an API tenant", () => {
  const browserStorage = storage("current-college");
  assert.equal(activeMembershipForUser(user("PENDING"), "current-college"), null);
  assert.deepEqual(reconcileActiveCollege(user("PENDING"), browserStorage), {
    collegeId: null,
    changed: true,
  });
  assert.equal(browserStorage.getItem(ACTIVE_COLLEGE_STORAGE_KEY), null);
});

test("only the stale-tenant authorization response triggers recovery", () => {
  assert.equal(
    isInvalidActiveCollegeError({
      message: "An active college membership is required.",
    }),
    true,
  );
  assert.equal(
    isInvalidActiveCollegeError({ message: "Club permission is required." }),
    false,
  );
});
