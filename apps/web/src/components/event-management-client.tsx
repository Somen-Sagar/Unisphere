"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { EventOrganizerPermission } from "@unisphere/types";
import {
  CalendarCheck,
  CheckCircle2,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { api } from "@/lib/api/client";

const organizerPermissions: EventOrganizerPermission[] = [
  "EDIT_EVENT",
  "VIEW_REGISTRATIONS",
  "MANAGE_REGISTRATIONS",
  "MARK_ATTENDANCE",
  "SEND_EVENT_NOTIFICATION",
];

const title = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "The action could not be completed.";
const dateTimeValue = (value: string) =>
  new Date(value).toISOString().slice(0, 16);

export function EventManagementClient({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const event = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => api.event(eventId),
    retry: false,
  });
  const access = useQuery({
    queryKey: ["event-access", eventId],
    queryFn: () => api.eventAccess(eventId),
    retry: false,
  });
  const canViewRegistrations =
    access.data?.permissions.includes("VIEW_REGISTRATIONS") ?? false;
  const canMarkAttendance =
    access.data?.permissions.includes("MARK_ATTENDANCE") ?? false;
  const canEdit = access.data?.permissions.includes("EDIT_EVENT") ?? false;
  const canManageOrganizers = access.data?.canManageOrganizers ?? false;
  const registrations = useQuery({
    queryKey: ["event-registrations", eventId],
    queryFn: () => api.eventRegistrations(eventId),
    enabled: canViewRegistrations,
    retry: false,
  });
  const organizers = useQuery({
    queryKey: ["event-organizers", eventId],
    queryFn: () => api.eventOrganizers(eventId),
    enabled: canViewRegistrations || canManageOrganizers,
    retry: false,
  });
  const clubMembers = useQuery({
    queryKey: ["event-organizer-candidates", event.data?.clubId],
    queryFn: () =>
      api.clubMembers(event.data!.clubId!, { status: "ACTIVE" }),
    enabled: Boolean(event.data?.clubId && canManageOrganizers),
    retry: false,
  });

  async function run(
    key: string,
    action: () => Promise<unknown>,
    success: string,
  ) {
    setWorking(key);
    setFeedback(null);
    try {
      await action();
      setFeedback(success);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["event", eventId] }),
        queryClient.invalidateQueries({ queryKey: ["event-access", eventId] }),
        queryClient.invalidateQueries({
          queryKey: ["event-registrations", eventId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["event-organizers", eventId],
        }),
      ]);
    } catch (error) {
      setFeedback(errorText(error));
    } finally {
      setWorking(null);
    }
  }

  async function assign(eventForm: FormEvent<HTMLFormElement>) {
    eventForm.preventDefault();
    const formElement = eventForm.currentTarget;
    const form = new FormData(formElement);
    const selected = new Set(
      organizerPermissions.filter((permission) => form.get(permission) === "on"),
    );
    if (
      selected.has("MANAGE_REGISTRATIONS") ||
      selected.has("MARK_ATTENDANCE")
    ) {
      selected.add("VIEW_REGISTRATIONS");
    }
    await run(
      "assign",
      () =>
        api.assignEventOrganizer(eventId, {
          userId: String(form.get("userId")),
          role: String(form.get("role")),
          permissions: [...selected],
        }),
      "Organizer assigned.",
    );
    formElement.reset();
  }

  async function editEvent(eventForm: FormEvent<HTMLFormElement>) {
    eventForm.preventDefault();
    const form = new FormData(eventForm.currentTarget);
    await run(
      "edit",
      () =>
        api.updateEvent(eventId, {
          title: String(form.get("title")),
          description: String(form.get("description")),
          venue: String(form.get("venue")),
          startsAt: new Date(String(form.get("startsAt"))).toISOString(),
          endsAt: new Date(String(form.get("endsAt"))).toISOString(),
        }),
      "Event details updated.",
    );
  }

  if (event.isPending || access.isPending) {
    return (
      <main className="portal-content">
        <div className="dashboard-skeleton hero" />
      </main>
    );
  }
  if (event.isError || access.isError || !event.data || !access.data) {
    return (
      <main className="portal-content centered-state">
        <ShieldCheck size={36} />
        <h1>Event management unavailable</h1>
        <p>{errorText(event.error ?? access.error)}</p>
        <Link className="button button-secondary" href="/dashboard/events">
          Back to events
        </Link>
      </main>
    );
  }

  return (
    <main className="portal-content governance-page">
      <section className="governance-hero">
        <div>
          <p className="eyebrow">Event operations</p>
          <h1>{event.data.title}</h1>
          <p>
            {event.data.venue} · {new Date(event.data.startsAt).toLocaleString()}
          </p>
        </div>
        <div className="governance-role-card">
          <CalendarCheck size={20} />
          <span>{title(event.data.status)}</span>
          <small>{event.data.registeredCount} registrations</small>
        </div>
      </section>
      <nav className="management-tabs">
        <Link href={`/dashboard/events/${eventId}`}>Public details</Link>
        <Link className="active" href={`/dashboard/events/${eventId}/manage`}>
          Manage
        </Link>
      </nav>
      {feedback ? <div className="action-message">{feedback}</div> : null}
      <section className="management-kpis">
        <article>
          <UsersRound size={19} />
          <span>Registrations</span>
          <strong>{registrations.data?.length ?? event.data.registeredCount}</strong>
        </article>
        <article>
          <CheckCircle2 size={19} />
          <span>Checked in</span>
          <strong>
            {registrations.data?.filter((item) => item.checkedInAt).length ?? "—"}
          </strong>
        </article>
        <article>
          <UserPlus size={19} />
          <span>Organizers</span>
          <strong>{organizers.data?.length ?? "—"}</strong>
        </article>
        <article>
          <CalendarCheck size={19} />
          <span>Capacity</span>
          <strong>{event.data.capacity ?? "∞"}</strong>
        </article>
      </section>
      <div className="management-grid">
        <section className="management-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Lifecycle</p>
              <h2>Event status</h2>
            </div>
          </div>
          <p className="muted-copy">
            Only transitions delegated to your tenant or event role are shown.
          </p>
          <div className="card-actions">
            {event.data.status === "DRAFT" && canEdit ? (
              <button
                className="button button-primary"
                onClick={() =>
                  void run(
                    "submit",
                    () => api.updateEvent(eventId, { status: "PENDING_APPROVAL" }),
                    "Event submitted for review.",
                  )
                }
              >
                Submit for approval
              </button>
            ) : null}
            {event.data.status === "PENDING_APPROVAL" && access.data.canReview ? (
              <>
                <button
                  className="button button-primary"
                  onClick={() =>
                    void run(
                      "approve",
                      () => api.updateEvent(eventId, { status: "APPROVED" }),
                      "Event approved.",
                    )
                  }
                >
                  Approve
                </button>
                <button
                  className="button button-secondary"
                  onClick={() =>
                    void run(
                      "reject",
                      () => api.updateEvent(eventId, { status: "REJECTED" }),
                      "Event rejected.",
                    )
                  }
                >
                  Reject
                </button>
              </>
            ) : null}
            {event.data.status === "APPROVED" && access.data.canPublish ? (
              <button
                className="button button-primary"
                onClick={() =>
                  void run(
                    "publish",
                    () => api.publishEvent(eventId),
                    "Event published.",
                  )
                }
              >
                Publish
              </button>
            ) : null}
            {event.data.status === "PUBLISHED" && canEdit ? (
              <button
                className="button button-secondary"
                onClick={() =>
                  void run(
                    "open",
                    () => api.updateEvent(eventId, { status: "REGISTRATION_OPEN" }),
                    "Registration opened.",
                  )
                }
              >
                Open registration
              </button>
            ) : null}
            {event.data.status === "REGISTRATION_OPEN" && canEdit ? (
              <button
                className="button button-secondary"
                onClick={() =>
                  void run(
                    "close",
                    () => api.updateEvent(eventId, { status: "REGISTRATION_CLOSED" }),
                    "Registration closed.",
                  )
                }
              >
                Close registration
              </button>
            ) : null}
            {event.data.status === "REGISTRATION_CLOSED" && canEdit ? (
              <button
                className="button button-secondary"
                onClick={() =>
                  void run(
                    "start",
                    () => api.updateEvent(eventId, { status: "ONGOING" }),
                    "Event marked ongoing.",
                  )
                }
              >
                Start event
              </button>
            ) : null}
            {event.data.status === "ONGOING" && canEdit ? (
              <button
                className="button button-secondary"
                onClick={() =>
                  void run(
                    "complete",
                    () => api.updateEvent(eventId, { status: "COMPLETED" }),
                    "Event completed.",
                  )
                }
              >
                Complete event
              </button>
            ) : null}
          </div>
        </section>

        {canEdit ? (
          <section className="management-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Details</p>
                <h2>Edit event</h2>
              </div>
            </div>
            <form className="management-form" onSubmit={editEvent}>
              <input name="title" minLength={5} defaultValue={event.data.title} required />
              <textarea
                name="description"
                minLength={20}
                defaultValue={event.data.description}
                required
              />
              <input name="venue" minLength={2} defaultValue={event.data.venue} required />
              <div className="form-pair">
                <label>
                  Starts
                  <input
                    name="startsAt"
                    type="datetime-local"
                    defaultValue={dateTimeValue(event.data.startsAt)}
                    required
                  />
                </label>
                <label>
                  Ends
                  <input
                    name="endsAt"
                    type="datetime-local"
                    defaultValue={dateTimeValue(event.data.endsAt)}
                    required
                  />
                </label>
              </div>
              <button className="button button-primary" disabled={working === "edit"}>
                {working === "edit" ? "Saving…" : "Save event"}
              </button>
            </form>
          </section>
        ) : null}

        {canManageOrganizers ? (
          <section className="management-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Delegation</p>
                <h2>Assign organizer</h2>
              </div>
            </div>
            <form className="management-form" onSubmit={assign}>
              {clubMembers.data?.length ? (
                <select name="userId" required defaultValue="">
                  <option value="" disabled>
                    Select club member
                  </option>
                  {clubMembers.data.map((member) => (
                    <option key={member.id} value={member.userId}>
                      {member.fullName} · {title(member.role)}
                    </option>
                  ))}
                </select>
              ) : (
                <input name="userId" placeholder="Active college user ID" required />
              )}
              <select name="role" defaultValue="CO_ORGANIZER">
                <option>MAIN_ORGANIZER</option>
                <option>CO_ORGANIZER</option>
                <option>REGISTRATION_MANAGER</option>
                <option>ATTENDANCE_MANAGER</option>
                <option>MEDIA_COORDINATOR</option>
              </select>
              <div className="organizer-permissions">
                {organizerPermissions.map((permission) => (
                  <label key={permission}>
                    <input name={permission} type="checkbox" /> {title(permission)}
                  </label>
                ))}
              </div>
              <button className="button button-primary" disabled={working === "assign"}>
                Assign organizer
              </button>
            </form>
          </section>
        ) : null}

        {canViewRegistrations || canManageOrganizers ? (
          <section className="management-panel span-full">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Team</p>
                <h2>Event organizers</h2>
              </div>
            </div>
            {organizers.isError ? (
              <p className="muted-copy">{errorText(organizers.error)}</p>
            ) : (
              <div className="approval-list">
                {organizers.data?.map((organizer) => (
                  <article key={organizer.id}>
                    <div>
                      <strong>
                        {organizer.user.firstName} {organizer.user.lastName}
                      </strong>
                      <small>
                        {title(organizer.role)} ·{" "}
                        {organizer.permissions.map(title).join(", ") ||
                          "No delegated permissions"}
                      </small>
                    </div>
                    {canManageOrganizers ? (
                      <button
                        className="button button-secondary button-sm"
                        onClick={() =>
                          void run(
                            `remove-${organizer.id}`,
                            () => api.removeEventOrganizer(eventId, organizer.userId),
                            "Organizer removed.",
                          )
                        }
                      >
                        Remove
                      </button>
                    ) : null}
                  </article>
                ))}
                {!organizers.data?.length ? (
                  <p className="muted-copy">No delegated organizers yet.</p>
                ) : null}
              </div>
            )}
          </section>
        ) : null}

        <section className="management-panel span-full">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Attendance</p>
              <h2>Registration list</h2>
            </div>
            <span>{canMarkAttendance ? "Manual check-in enabled" : "View only"}</span>
          </div>
          {!canViewRegistrations ? (
            <p className="muted-copy">
              Registration access has not been delegated for this event.
            </p>
          ) : registrations.isError ? (
            <p className="muted-copy">{errorText(registrations.error)}</p>
          ) : (
            <>
              <div className="member-table-wrap">
                <table className="member-table">
                  <thead>
                    <tr>
                      <th>Attendee</th>
                      <th>Code</th>
                      <th>Status</th>
                      <th>Registered</th>
                      <th>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.data?.map((registration) => (
                      <tr key={registration.id}>
                        <td>
                          {registration.registrant
                            ? `${registration.registrant.firstName} ${registration.registrant.lastName}`
                            : registration.registrationCode}
                        </td>
                        <td>{registration.registrationCode}</td>
                        <td>{title(registration.status)}</td>
                        <td>{new Date(registration.registeredAt).toLocaleString()}</td>
                        <td>
                          {registration.checkedInAt ? (
                            <span className="permission-on">Checked in</span>
                          ) : canMarkAttendance ? (
                            <button
                              className="button button-primary button-sm"
                              disabled={working === `checkin-${registration.id}`}
                              onClick={() =>
                                void run(
                                  `checkin-${registration.id}`,
                                  () => api.manualCheckIn(eventId, registration.id),
                                  "Attendance recorded.",
                                )
                              }
                            >
                              Check in
                            </button>
                          ) : (
                            <span className="muted-copy">Not delegated</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!registrations.data?.length ? (
                <p className="muted-copy">No registrations yet.</p>
              ) : null}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
