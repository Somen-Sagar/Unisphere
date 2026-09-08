import "server-only";

import type { AuthSession } from "@unisphere/types";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const ACCESS_COOKIE = "unisphere.access";
export const REFRESH_COOKIE = "unisphere.refresh";

const backendUnavailableBody = {
  code: "BACKEND_UNAVAILABLE",
  message: "UniSphere API is currently unavailable.",
};

function backendUrl(): string {
  const value =
    process.env.BACKEND_API_URL ??
    process.env.API_URL ??
    "http://127.0.0.1:4000/api/v1";
  if (
    process.env.NODE_ENV === "production" &&
    !process.env.BACKEND_API_URL &&
    !process.env.API_URL
  ) {
    throw new Error("BACKEND_API_URL must be configured in production.");
  }
  return value.replace(/\/$/, "");
}

function logBackendProxy(message: string, detail?: unknown): void {
  if (process.env.NODE_ENV !== "development") return;
  if (detail) {
    console.info(`[UniSphere backend proxy] ${message}`, detail);
    return;
  }
  console.info(`[UniSphere backend proxy] ${message}`);
}

export async function backendFetch(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<Response> {
  const targetUrl = `${backendUrl()}/${path.replace(/^\//, "")}`;

  try {
    logBackendProxy(`${init.method ?? "GET"} ${targetUrl}`);
    const response = await fetch(targetUrl, {
      ...init,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        "X-Request-Id": crypto.randomUUID(),
        ...init.headers,
      },
    });
    logBackendProxy(`${init.method ?? "GET"} ${targetUrl} -> ${response.status}`);
    return response;
  } catch (error) {
    logBackendProxy(`${init.method ?? "GET"} ${targetUrl} -> unavailable`, error);
    return Response.json(backendUnavailableBody, { status: 503 });
  }
}

function secureCookies(): boolean {
  return process.env.NODE_ENV === "production";
}

export function setSessionCookies(
  response: NextResponse,
  session: AuthSession,
): void {
  response.cookies.set(ACCESS_COOKIE, session.tokens.accessToken, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: session.tokens.expiresIn,
  });
  response.cookies.set(REFRESH_COOKIE, session.tokens.refreshToken, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: Number(process.env.WEB_REFRESH_COOKIE_DAYS ?? 30) * 86_400,
  });
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE, "", {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(REFRESH_COOKIE, "", {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function refreshSession(
  request: NextRequest,
): Promise<AuthSession | null> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  const response = await backendFetch("auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) return null;
  return response.json() as Promise<AuthSession>;
}

export function trustedMutation(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const forwardedHost = request.headers
      .get("x-forwarded-host")
      ?.split(",", 1)[0]
      ?.trim();
    const requestHost = forwardedHost || request.headers.get("host");
    return Boolean(requestHost) && new URL(origin).host === requestHost;
  } catch {
    return false;
  }
}

export async function errorPayload(response: Response): Promise<unknown> {
  return response.json().catch(() => ({
    statusCode: response.status,
    message: "The backend request failed.",
  }));
}
