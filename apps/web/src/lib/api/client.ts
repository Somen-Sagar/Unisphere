import { UniSphereApi } from "@unisphere/api-client";

import {
  ACTIVE_COLLEGE_STORAGE_KEY,
  isInvalidActiveCollegeError,
} from "@/lib/auth/active-college";

async function tenantResilientFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await globalThis.fetch(input, init);
  if (typeof window === "undefined" || response.status !== 403) return response;

  const headers = new Headers(init?.headers);
  if (!headers.has("X-College-Id")) return response;
  const body = await response.clone().json().catch(() => null);
  if (!isInvalidActiveCollegeError(body)) return response;

  window.localStorage.removeItem(ACTIVE_COLLEGE_STORAGE_KEY);
  window.dispatchEvent(new Event("unisphere:tenant-change"));
  headers.delete("X-College-Id");
  return globalThis.fetch(input, { ...init, headers });
}

export const api = new UniSphereApi({
  baseUrl: "/api/backend",
  authBaseUrl: "/api/auth",
  getActiveCollegeId: () =>
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem(ACTIVE_COLLEGE_STORAGE_KEY),
  fetchImplementation: tenantResilientFetch,
  credentials: "same-origin",
});
