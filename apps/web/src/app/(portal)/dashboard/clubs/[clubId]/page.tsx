import { DashboardClient } from "@/components/dashboard-client";

export default async function DashboardClubDetailPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  return <DashboardClient clubId={clubId} view="club-detail" />;
}
