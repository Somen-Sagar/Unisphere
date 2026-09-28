"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, ShieldCheck, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { api } from "@/lib/api/client";

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "The event could not be created.";

export function ClubEventCreateClient({
  clubId,
  initialType,
}: {
  clubId: string;
  initialType: "GENERAL" | "COMPETITION";
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const access = useQuery({
    queryKey: ["club-access", clubId],
    queryFn: () => api.clubAccess(clubId),
    retry: false,
  });
  const club = useQuery({
    queryKey: ["club", clubId],
    queryFn: () => api.club(clubId),
    retry: false,
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setFeedback(null);
    try {
      const created = await api.createEvent({
        clubId,
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        eventType: String(form.get("eventType") ?? initialType),
        venue: String(form.get("venue") ?? ""),
        startsAt: new Date(String(form.get("startsAt"))).toISOString(),
        endsAt: new Date(String(form.get("endsAt"))).toISOString(),
        registrationOpensAt: form.get("registrationOpensAt")
          ? new Date(String(form.get("registrationOpensAt"))).toISOString()
          : undefined,
        registrationClosesAt: form.get("registrationClosesAt")
          ? new Date(String(form.get("registrationClosesAt"))).toISOString()
          : undefined,
        capacity: form.get("capacity")
          ? Number(form.get("capacity"))
          : undefined,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["club-dashboard", clubId] }),
        queryClient.invalidateQueries({ queryKey: ["club-management-events", clubId] }),
      ]);
      router.push(`/dashboard/events/${created.id}/manage`);
    } catch (error) {
      setFeedback(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (access.isPending || club.isPending) {
    return <main className="portal-content"><div className="dashboard-skeleton hero" /></main>;
  }
  if (access.isError || club.isError || !access.data || !club.data) {
    return <main className="portal-content centered-state"><ShieldCheck size={36} /><h1>Event creation unavailable</h1><p>{errorMessage(access.error ?? club.error)}</p></main>;
  }
  if (!access.data.canCreateEvent) {
    return <main className="portal-content centered-state"><ShieldCheck size={36} /><h1>Create-event permission required</h1><p>Your effective club permissions do not include CLUB_CREATE_EVENT.</p><Link className="button button-secondary" href={`/dashboard/clubs/${clubId}/manage`}>Back to club dashboard</Link></main>;
  }

  const competition = initialType === "COMPETITION";
  const Icon = competition ? Trophy : CalendarPlus;

  return (
    <main className="portal-content governance-page">
      <section className="governance-hero">
        <div>
          <p className="eyebrow">{club.data.name} · Event operations</p>
          <h1>{competition ? "Create competition" : "Create event"}</h1>
          <p>Create a governed draft. Review and publishing continue through the existing event lifecycle.</p>
        </div>
        <div className="governance-role-card"><Icon size={20} /><span>{competition ? "Competition" : "Event"}</span><small>Authorized by CLUB_CREATE_EVENT</small></div>
      </section>
      <nav className="management-tabs" aria-label="Event creation">
        <Link href={`/dashboard/clubs/${clubId}/manage`}>Club Dashboard</Link>
        <Link href={`/dashboard/clubs/${clubId}/events`}>Events</Link>
        <Link className={!competition ? "active" : ""} href={`/dashboard/clubs/${clubId}/events/new`}>Create Event</Link>
        <Link className={competition ? "active" : ""} href={`/dashboard/clubs/${clubId}/events/new?type=COMPETITION`}>Create Competition</Link>
      </nav>
      {feedback ? <div className="action-message">{feedback}</div> : null}
      <section className="management-panel event-create-panel">
        <div className="panel-heading"><div><p className="eyebrow">Draft details</p><h2>{competition ? "Competition brief" : "Event brief"}</h2></div><Icon size={20} /></div>
        <form className="management-form" onSubmit={submit}>
          <div className="form-pair">
            <input name="title" minLength={5} placeholder={competition ? "Competition title" : "Event title"} required />
            <select name="eventType" defaultValue={initialType}>
              <option value="GENERAL">General event</option>
              <option value="COMPETITION">Competition</option>
              <option value="WORKSHOP">Workshop</option>
              <option value="SEMINAR">Seminar</option>
            </select>
          </div>
          <textarea name="description" minLength={20} placeholder="Purpose, format, eligibility, and attendee details" required />
          <input name="venue" minLength={2} placeholder="Venue or platform" required />
          <div className="form-pair">
            <label>Starts<input name="startsAt" type="datetime-local" required /></label>
            <label>Ends<input name="endsAt" type="datetime-local" required /></label>
          </div>
          <div className="form-pair">
            <label>Registration opens<input name="registrationOpensAt" type="datetime-local" /></label>
            <label>Registration closes<input name="registrationClosesAt" type="datetime-local" /></label>
          </div>
          <input name="capacity" type="number" min={1} max={100000} placeholder="Capacity (optional)" />
          <div className="card-actions">
            <button className="button button-primary" disabled={submitting}>{submitting ? "Creating draft…" : competition ? "Create competition" : "Create event"}</button>
            <Link className="button button-secondary" href={`/dashboard/clubs/${clubId}/events`}>Cancel</Link>
          </div>
        </form>
      </section>
    </main>
  );
}
