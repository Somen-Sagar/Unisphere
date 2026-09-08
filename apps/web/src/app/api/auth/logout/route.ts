import { NextRequest, NextResponse } from "next/server";

import {
  REFRESH_COOKIE,
  backendFetch,
  clearSessionCookies,
  trustedMutation,
} from "@/lib/server/backend";

export async function POST(request: NextRequest) {
  if (!trustedMutation(request)) {
    return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    await backendFetch("auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  return response;
}
