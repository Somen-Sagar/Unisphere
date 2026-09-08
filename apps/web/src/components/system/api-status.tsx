import type { HealthStatus, UniSphereHealth } from "@unisphere/api-client";

function statusFromHealth(health: UniSphereHealth | null): HealthStatus {
  if (!health) return "offline";
  if (health.status === "ok" && health.database === "connected") return "connected";
  return "degraded";
}

export function ApiStatus({ health, compact = false }: { health: UniSphereHealth | null; compact?: boolean }) {
  const status = statusFromHealth(health);
  const label =
    status === "connected"
      ? "Platform connected"
      : status === "degraded"
        ? "Platform degraded"
        : "Platform offline";

  return (
    <div className={`api-status ${status}`} aria-live="polite">
      <span className="status-dot" aria-hidden="true" />
      <span>{compact ? label : `${label}${health?.timestamp ? "" : ""}`}</span>
    </div>
  );
}

export function SystemStatusCard({ health }: { health: UniSphereHealth | null }) {
  const connected = health?.status === "ok";
  const rows = [
    ["Web", "Connected"],
    ["Android", "Ready"],
    ["iOS", "Ready"],
    ["API", connected ? "Online" : "Offline"],
    ["Database", health?.database === "connected" ? "Connected" : "Unavailable"],
    ["Redis", health?.redis === "connected" ? "Connected" : "Ready"],
  ];

  return (
    <div className="system-status-card" aria-label="UniSphere system status">
      {rows.map(([name, value]) => (
        <div key={name}>
          <span>{name}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}
