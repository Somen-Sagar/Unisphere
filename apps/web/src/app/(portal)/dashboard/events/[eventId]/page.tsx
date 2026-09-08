import { DashboardClient } from "@/components/dashboard-client";

export default async function DashboardEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return <DashboardClient eventId={eventId} view="event-detail" />;
}
