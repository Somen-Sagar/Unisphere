import { DashboardClient } from "@/components/dashboard-client";

export default function PlatformAdminDashboardPage() {
  return <DashboardClient allowedRoles={["PLATFORM_ADMIN"]} />;
}
