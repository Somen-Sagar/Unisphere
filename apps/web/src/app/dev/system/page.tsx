import type { CampusUser } from "@unisphere/types";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { ACCESS_COOKIE, backendFetch } from "@/lib/server/backend";

type HealthBody = {
  service?: string;
  status?: string;
  database?: string;
  redis?: string;
  timestamp?: string;
};

function safeBackendHost(): string {
  const value =
    process.env.BACKEND_API_URL ??
    process.env.API_URL ??
    "http://127.0.0.1:4000/api/v1";
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "configured";
  }
}

async function readJson<T>(response: Response): Promise<T | null> {
  return response.json().catch(() => null) as Promise<T | null>;
}

export default async function DevSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const [healthResponse, meResponse] = await Promise.all([
    backendFetch("health"),
    accessToken ? backendFetch("auth/me", {}, accessToken) : Promise.resolve(null),
  ]);
  const health = await readJson<HealthBody>(healthResponse);
  const user =
    meResponse && meResponse.ok
      ? await readJson<CampusUser>(meResponse)
      : null;
  const activeMembership =
    user?.memberships.find((membership) => membership.status === "ACTIVE") ??
    null;

  const rows = [
    ["Web App", "Connected"],
    ["NestJS API", healthResponse.ok ? "Connected" : "Unavailable"],
    ["PostgreSQL", health?.database === "connected" ? "Connected" : "Unavailable"],
    ["Redis", health?.redis === "connected" ? "Connected" : "Degraded"],
    ["Authenticated User", user ? "Yes" : "No"],
    ["Active Tenant", activeMembership?.college.name ?? "None"],
    ["API Base URL", safeBackendHost()],
  ];

  return (
    <main className="dev-system-page">
      <section>
        <p className="eyebrow">Development diagnostics</p>
        <h1>UniSphere system path</h1>
        <p>
          This page is available only outside production and reports safe
          connectivity signals without tokens, passwords, or database URLs.
        </p>
      </section>
      <div className="dev-system-grid">
        {rows.map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="dev-system-flow">
        <span>Web UI</span>
        <span>Shared API client</span>
        <span>Next.js proxy</span>
        <span>NestJS API</span>
        <span>Prisma</span>
        <span>PostgreSQL</span>
      </section>
    </main>
  );
}
