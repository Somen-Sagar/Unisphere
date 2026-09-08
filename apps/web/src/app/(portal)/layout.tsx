import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

import { AppShell } from "@/components/app-shell";
import { REFRESH_COOKIE } from "@/lib/server/backend";

export default async function PortalLayout({ children }: PropsWithChildren) {
  const cookieStore = await cookies();
  if (!cookieStore.has(REFRESH_COOKIE)) redirect("/login");

  return <AppShell>{children}</AppShell>;
}
