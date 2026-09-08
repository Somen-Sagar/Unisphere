import type { CampusUser } from "@unisphere/types";
import { NextRequest, NextResponse } from "next/server";

import {
  ACCESS_COOKIE,
  backendFetch,
  clearSessionCookies,
  errorPayload,
  refreshSession,
  setSessionCookies,
} from "@/lib/server/backend";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (accessToken) {
    const backend = await backendFetch("auth/me", {}, accessToken);
    if (backend.ok) {
      return NextResponse.json({ user: (await backend.json()) as CampusUser });
    }
    if (backend.status !== 401) {
      return NextResponse.json(await errorPayload(backend), { status: backend.status });
    }
  }

  const session = await refreshSession(request);
  if (!session) {
    const response = NextResponse.json({ message: "Authentication required." }, { status: 401 });
    clearSessionCookies(response);
    return response;
  }

  const response = NextResponse.json({ user: session.user });
  setSessionCookies(response, session);
  return response;
}
