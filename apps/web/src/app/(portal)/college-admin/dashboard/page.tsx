import { DashboardClient } from "@/components/dashboard-client";

export default function CollegeAdminDashboardPage() {
  return <DashboardClient allowedRoles={["COLLEGE_ADMIN"]} />;
}
