import { DashboardClient } from "@/components/dashboard-client";

export default function FacultyDashboardPage() {
  return <DashboardClient allowedRoles={["FACULTY", "DEPARTMENT_ADMIN"]} />;
}
