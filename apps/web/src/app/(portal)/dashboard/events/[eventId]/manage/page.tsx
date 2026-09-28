import { EventManagementClient } from "@/components/event-management-client";

export default async function EventManagePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return <EventManagementClient eventId={eventId} />;
}
