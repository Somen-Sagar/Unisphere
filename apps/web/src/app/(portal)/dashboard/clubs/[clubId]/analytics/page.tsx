import { ClubManagementClient } from "@/components/club-management-client";

export default async function ClubAnalyticsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  return <ClubManagementClient clubId={clubId} initialView="analytics" />;
}
