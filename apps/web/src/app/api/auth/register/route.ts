import type { AuthSession } from "@unisphere/types";
import { NextRequest, NextResponse } from "next/server";

import {
  backendFetch,
  errorPayload,
  setSessionCookies,
  trustedMutation,
} from "@/lib/server/backend";

export async function POST(request: NextRequest) {
  if (!trustedMutation(request)) {
    return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  }

  const body = await request.text();
  const backend = await backendFetch("auth/register", { method: "POST", body });
  if (!backend.ok) {
    return NextResponse.json(await errorPayload(backend), { status: backend.status });
  }

  const session = (await backend.json()) as AuthSession;
  const response = NextResponse.json(
    { user: session.user },
    { status: backend.status },
  );
  setSessionCookies(response, session);
  return response;
}
