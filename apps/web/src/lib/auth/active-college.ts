import type { CampusUser, Membership } from "@unisphere/types";

export const ACTIVE_COLLEGE_STORAGE_KEY = "unisphere.activeCollegeId";
const invalidTenantMessage = "An active college membership is required.";

type ActiveCollegeStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function isInvalidActiveCollegeError(body: unknown): boolean {
  if (!body || typeof body !== "object" || !("message" in body)) return false;
  const message = (body as { message?: unknown }).message;
  return Array.isArray(message)
    ? message.includes(invalidTenantMessage)
    : message === invalidTenantMessage;
}

export function activeMembershipForUser(
  user: CampusUser | null,
  preferredCollegeId: string | null,
): Membership | null {
  if (!user) return null;
  const activeMemberships = user.memberships.filter(
    (membership) => membership.status === "ACTIVE",
  );
  return (
    activeMemberships.find(
      (membership) => membership.collegeId === preferredCollegeId,
    ) ??
    activeMemberships[0] ??
    null
  );
}

export function reconcileActiveCollege(
  user: CampusUser,
  storage: ActiveCollegeStorage,
): { collegeId: string | null; changed: boolean } {
  const storedCollegeId = storage.getItem(ACTIVE_COLLEGE_STORAGE_KEY);
  const membership = activeMembershipForUser(user, storedCollegeId);
  const collegeId = membership?.collegeId ?? null;

  if (collegeId && storedCollegeId !== collegeId) {
    storage.setItem(ACTIVE_COLLEGE_STORAGE_KEY, collegeId);
    return { collegeId, changed: true };
  }
  if (!collegeId && storedCollegeId) {
    storage.removeItem(ACTIVE_COLLEGE_STORAGE_KEY);
    return { collegeId: null, changed: true };
  }
  return { collegeId, changed: false };
}
