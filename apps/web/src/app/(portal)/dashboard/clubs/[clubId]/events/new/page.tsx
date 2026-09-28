import { ClubEventCreateClient } from "@/components/club-event-create-client";

export default async function NewClubEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const [{ clubId }, query] = await Promise.all([params, searchParams]);
  return (
    <ClubEventCreateClient
      clubId={clubId}
      initialType={query.type?.toUpperCase() === "COMPETITION" ? "COMPETITION" : "GENERAL"}
    />
  );
}
