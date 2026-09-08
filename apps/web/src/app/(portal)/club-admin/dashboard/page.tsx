import { DashboardClient } from "@/components/dashboard-client";

export default function ClubAdminDashboardPage() {
  return <DashboardClient allowedRoles={["CLUB_ADMIN", "COLLEGE_ADMIN"]} />;
}
