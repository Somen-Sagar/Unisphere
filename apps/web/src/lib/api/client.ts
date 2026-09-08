import { UniSphereApi } from "@unisphere/api-client";

export const api = new UniSphereApi({
  baseUrl: "/api/backend",
  authBaseUrl: "/api/auth",
  getActiveCollegeId: () =>
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem("unisphere.activeCollegeId"),
  credentials: "same-origin",
});
