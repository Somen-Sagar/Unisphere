import { NextRequest, NextResponse } from "next/server";

import {
  ACCESS_COOKIE,
  backendFetch,
  clearSessionCookies,
  refreshSession,
  setSessionCookies,
  trustedMutation,
} from "@/lib/server/backend";

const allowedRoots = new Set([
  "attendance",
  "clubs",
  "colleges",
  "events",
  "health",
  "registrations",
]);

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxy(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  if (!path.length || !allowedRoots.has(path[0])) {
    return NextResponse.json({ message: "Route is not available." }, { status: 404 });
  }
  if (request.method !== "GET" && !trustedMutation(request)) {
    return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  }

  const target = `${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();
  const activeCollegeId = request.headers.get("x-college-id");
  const forwardedHeaders = activeCollegeId
    ? { "X-College-Id": activeCollegeId }
    : undefined;
  let accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  let rotatedSession = null;
  let backend = await backendFetch(
    target,
    { method: request.method, body, headers: forwardedHeaders },
    accessToken,
  );

  if (backend.status === 401) {
    rotatedSession = await refreshSession(request);
    if (rotatedSession) {
      accessToken = rotatedSession.tokens.accessToken;
      backend = await backendFetch(
        target,
        { method: request.method, body, headers: forwardedHeaders },
        accessToken,
      );
    }
  }

  const responseBody = await backend.text();
  const response = new NextResponse(responseBody || null, {
    status: backend.status,
    headers: {
      "Content-Type": backend.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });

  if (rotatedSession) setSessionCookies(response, rotatedSession);
  if (backend.status === 401 && !rotatedSession) clearSessionCookies(response);
  return response;
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
