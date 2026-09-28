import { ClubManagementClient } from "@/components/club-management-client";

export default async function ClubSettingsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  return <ClubManagementClient clubId={clubId} initialView="settings" />;
}
