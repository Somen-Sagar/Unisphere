"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  EventStatus,
  ClubMember,
  ClubPermission,
} from "@unisphere/types";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarPlus,
  Check,
  ClipboardList,
  Megaphone,
  Search,
  Settings,
  ShieldCheck,
  Trophy,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { api } from "@/lib/api/client";
import {
  assignableClubRoles,
  canChangeClubMemberRole,
  canManageClubMember,
  canOverrideClubPermission,
  clubMembershipRoles,
} from "@/lib/club-member-actions";
import {
  clubNavigation,
  clubQuickActions,
  type ClubNavigationKey,
} from "@/lib/club-navigation";

export type ClubManagementView =
  | "manage"
  | "members"
  | "events"
  | "recruitment"
  | "announcements"
  | "registrations"
  | "attendance"
  | "analytics"
  | "settings";

const actionIcons: Record<ClubNavigationKey, typeof ShieldCheck> = {
  dashboard: ShieldCheck,
  members: UsersRound,
  events: CalendarPlus,
  "create-event": CalendarPlus,
  "create-competition": Trophy,
  recruitment: UserPlus,
  announcements: Megaphone,
  registrations: ClipboardList,
  attendance: Activity,
  analytics: BarChart3,
  settings: Settings,
};

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The action could not be completed.";
}

export function ClubManagementClient({
  clubId,
  initialView = "manage",
}: {
  clubId: string;
  initialView?: ClubManagementView;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<ClubMember | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);

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
  const summary = useQuery({
    queryKey: ["club-dashboard", clubId],
    queryFn: () => api.clubDashboard(clubId),
    enabled: access.data?.permissions.includes("CLUB_VIEW_ANALYTICS") ?? false,
    retry: false,
  });
  const members = useQuery({
    queryKey: ["club-members", clubId, search, roleFilter, statusFilter],
    queryFn: () =>
      api.clubMembers(clubId, {
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      }),
    enabled: access.data?.permissions.includes("CLUB_VIEW_MEMBERS") ?? false,
    retry: false,
  });
  const applications = useQuery({
    queryKey: ["club-applications", clubId],
    queryFn: () => api.clubApplications(clubId),
    enabled:
      access.data?.permissions.includes("CLUB_MANAGE_RECRUITMENT") ?? false,
    retry: false,
  });
  const announcements = useQuery({
    queryKey: ["club-announcements", clubId],
    queryFn: () => api.clubAnnouncements(clubId),
  });
  const managementEvents = useQuery({
    queryKey: ["club-management-events", clubId],
    queryFn: async () => {
      // The unfiltered request returns every public lifecycle state. Private
      // and terminal management states are requested explicitly so published
      // events remain available from registration and attendance views.
      const statuses: Array<EventStatus | undefined> = [
        undefined,
        "DRAFT",
        "PENDING_APPROVAL",
        "REJECTED",
        "CANCELLED",
        "POSTPONED",
      ];
      const pages = await Promise.all(
        statuses.map((status) =>
          api.events({ clubId, status, pageSize: 50 }),
        ),
      );
      return [...new Map(
        pages.flatMap((page) => page.items).map((event) => [event.id, event]),
      ).values()]
        .sort(
          (left, right) =>
            new Date(left.startsAt).getTime() -
            new Date(right.startsAt).getTime(),
        );
    },
    enabled:
      Boolean(access.data) &&
      (access.data!.canViewAnalytics ||
        access.data!.canViewRegistrations ||
        access.data!.canMarkAttendance ||
        access.data!.permissions.includes("CLUB_EDIT_EVENT")),
    retry: false,
  });

  const permissions = access.data?.permissions ?? [];
  const can = (permission: ClubPermission) => permissions.includes(permission);
  const assignableRoles = access.data
    ? assignableClubRoles(access.data)
    : clubMembershipRoles;

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
        queryClient.invalidateQueries({ queryKey: ["club-members", clubId] }),
        queryClient.invalidateQueries({ queryKey: ["club-dashboard", clubId] }),
        queryClient.invalidateQueries({
          queryKey: ["club-applications", clubId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["club-announcements", clubId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["club-management-events", clubId],
        }),
        queryClient.invalidateQueries({ queryKey: ["club", clubId] }),
      ]);
    } catch (error) {
      setFeedback(message(error));
    } finally {
      setWorking(null);
    }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const userId = String(form.get("userId") ?? "").trim();
    const role = String(form.get("role") ?? "MEMBER");
    await run(
      "add-member",
      () => api.addClubMember(clubId, { userId, role, status: "ACTIVE" }),
      "Member added.",
    );
    event.currentTarget.reset();
  }

  async function postAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await run(
      "announcement",
      () =>
        api.createClubAnnouncement(clubId, {
          title: String(form.get("title") ?? ""),
          content: String(form.get("content") ?? ""),
        }),
      "Announcement published.",
    );
    formElement.reset();
  }

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await run(
      "create-event",
      () =>
        api.createEvent({
          clubId,
          title: String(form.get("title") ?? ""),
          description: String(form.get("description") ?? ""),
          eventType: String(form.get("eventType") ?? "GENERAL"),
          venue: String(form.get("venue") ?? ""),
          startsAt: new Date(String(form.get("startsAt"))).toISOString(),
          endsAt: new Date(String(form.get("endsAt"))).toISOString(),
        }),
      "Event draft created. Submit it when it is ready for review.",
    );
    formElement.reset();
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(
      "profile",
      () =>
        api.updateClub(clubId, {
          name: String(form.get("name") ?? ""),
          description: String(form.get("description") ?? ""),
          category: String(form.get("category") ?? "General"),
          logoUrl: String(form.get("logoUrl") ?? ""),
          coverUrl: String(form.get("coverUrl") ?? ""),
          recruitmentStatus: String(form.get("recruitmentStatus") ?? "CLOSED"),
        }),
      "Club profile updated.",
    );
  }

  if (access.isPending || club.isPending) {
    return (
      <main className="portal-content">
        <div className="dashboard-skeleton hero" />
      </main>
    );
  }
  if (access.isError || club.isError || !access.data || !club.data) {
    return (
      <main className="portal-content centered-state">
        <ShieldCheck size={36} />
        <h1>Club workspace unavailable</h1>
        <p>{message(access.error ?? club.error)}</p>
      </main>
    );
  }
  if (!can("CLUB_VIEW_MEMBERS") && !access.data.isCollegeAdmin) {
    return (
      <main className="portal-content centered-state">
        <ShieldCheck size={36} />
        <h1>Club access required</h1>
        <p>Your active tenant membership has no access to this workspace.</p>
      </main>
    );
  }

  const dashboard = summary.data;
  const navigation = clubNavigation(clubId, access.data);
  const quickActions = clubQuickActions(clubId, access.data);

  return (
    <main className="portal-content governance-page">
      <section className="governance-hero">
        <div>
          <p className="eyebrow">Club governance</p>
          <h1>{club.data.name}</h1>
          <p>
            {club.data.description ??
              "Manage this campus community with tenant-safe permissions."}
          </p>
        </div>
        <div className="governance-role-card">
          <ShieldCheck size={20} />
          <span>
            {access.data.isCollegeAdmin
              ? "College administrator"
              : label(access.data.role ?? "member")}
          </span>
          <small>{permissions.length} effective permissions</small>
        </div>
      </section>

      <nav className="management-tabs" aria-label="Club management">
        {navigation
          .filter(
            (item) =>
              !["create-event", "create-competition"].includes(item.key),
          )
          .map((item) => (
            <Link
              className={initialView === item.key || (initialView === "manage" && item.key === "dashboard") ? "active" : ""}
              href={item.href}
              key={item.key}
            >
              {item.label}
            </Link>
          ))}
        <Link href={`/dashboard/clubs/${clubId}`}>Public profile</Link>
      </nav>
      {feedback ? <div className="action-message">{feedback}</div> : null}

      {initialView === "manage" && quickActions.length ? (
        <section className="club-quick-actions" aria-label="Club quick actions">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Permission-aware command center</p>
              <h2>Quick actions</h2>
            </div>
            <span>{quickActions.length} available</span>
          </div>
          <div className="club-quick-action-grid">
            {quickActions.map((item) => {
              const Icon = actionIcons[item.key];
              return (
                <Link href={item.href} key={item.key}>
                  <Icon size={19} />
                  <span>{item.label}</span>
                  <ArrowRight size={16} />
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {initialView !== "members" ? (
        <>
          {initialView === "manage" || initialView === "analytics" ? (
          <section className="management-kpis" id="analytics">
            {[
              {
                title: "Active members",
                value: dashboard?.memberCount ?? club.data.memberCount ?? 0,
                Icon: UsersRound,
              },
              {
                title: "Upcoming events",
                value:
                  dashboard?.upcomingEvents ?? club.data.upcomingEventCount,
                Icon: CalendarPlus,
              },
              {
                title: "Pending applications",
                value: dashboard?.pendingRequests ?? 0,
                Icon: UserPlus,
              },
              {
                title: "Attendance marked",
                value: dashboard?.attendance ?? 0,
                Icon: BarChart3,
              },
            ].map(({ title, value, Icon }) => (
              <article key={title}>
                <Icon size={19} />
                <span>{title}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </section>
          ) : null}

          <div className="management-grid">
            {can("CLUB_EDIT_PROFILE") &&
            (initialView === "manage" || initialView === "settings") ? (
              <section className="management-panel" id="settings">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Identity & recruitment</p>
                    <h2>Club profile</h2>
                  </div>
                </div>
                <form className="management-form" onSubmit={updateProfile}>
                  <input
                    name="name"
                    defaultValue={club.data.name}
                    minLength={2}
                    required
                  />
                  <textarea
                    name="description"
                    defaultValue={club.data.description ?? ""}
                    placeholder="Club description"
                  />
                  <div className="form-pair">
                    <input
                      name="category"
                      defaultValue={club.data.category}
                      minLength={2}
                      required
                    />
                    <select
                      name="recruitmentStatus"
                      defaultValue={club.data.recruitmentStatus}
                    >
                      <option value="OPEN">Recruitment open</option>
                      <option value="PAUSED">Recruitment paused</option>
                      <option value="CLOSED">Recruitment closed</option>
                    </select>
                  </div>
                  <input
                    name="logoUrl"
                    type="url"
                    defaultValue={club.data.logoUrl ?? ""}
                    placeholder="Logo URL"
                  />
                  <input
                    name="coverUrl"
                    type="url"
                    defaultValue={club.data.coverUrl ?? ""}
                    placeholder="Cover image URL"
                  />
                  <button
                    className="button button-primary"
                    disabled={working === "profile"}
                  >
                    {working === "profile" ? "Saving…" : "Save profile"}
                  </button>
                </form>
              </section>
            ) : null}

            {can("CLUB_CREATE_EVENT") && initialView === "manage" ? (
              <section className="management-panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Events</p>
                    <h2>Create event</h2>
                  </div>
                </div>
                <form className="management-form" onSubmit={createEvent}>
                  <input
                    name="title"
                    minLength={5}
                    placeholder="Event title"
                    required
                  />
                  <textarea
                    name="description"
                    minLength={20}
                    placeholder="Purpose, format, and attendee details"
                    required
                  />
                  <select name="eventType" defaultValue="GENERAL">
                    <option value="GENERAL">General event</option>
                    <option value="COMPETITION">Competition</option>
                    <option value="WORKSHOP">Workshop</option>
                    <option value="SEMINAR">Seminar</option>
                  </select>
                  <input
                    name="venue"
                    minLength={2}
                    placeholder="Venue"
                    required
                  />
                  <div className="form-pair">
                    <label>
                      Starts
                      <input name="startsAt" type="datetime-local" required />
                    </label>
                    <label>
                      Ends
                      <input name="endsAt" type="datetime-local" required />
                    </label>
                  </div>
                  <button
                    className="button button-primary"
                    disabled={working === "create-event"}
                  >
                    {working === "create-event" ? "Creating…" : "Create event"}
                  </button>
                </form>
              </section>
            ) : null}

            {can("CLUB_POST_ANNOUNCEMENT") &&
            (initialView === "manage" || initialView === "announcements") ? (
              <section className="management-panel" id="announcements">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Communication</p>
                    <h2>Post announcement</h2>
                  </div>
                  <Megaphone size={19} />
                </div>
                <form className="management-form" onSubmit={postAnnouncement}>
                  <input
                    name="title"
                    minLength={3}
                    placeholder="Announcement title"
                    required
                  />
                  <textarea
                    name="content"
                    minLength={3}
                    placeholder="Write a concise club update"
                    required
                  />
                  <button
                    className="button button-primary"
                    disabled={working === "announcement"}
                  >
                    {working === "announcement" ? "Publishing…" : "Publish"}
                  </button>
                </form>
              </section>
            ) : null}

            {(initialView === "manage" || initialView === "announcements") ? (
            <section className="management-panel span-full">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Latest</p>
                  <h2>Announcements</h2>
                </div>
              </div>
              <div className="announcement-list">
                {announcements.data?.map((item) => (
                  <article key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <small>
                        {new Date(item.publishedAt).toLocaleString()} ·{" "}
                        {item.author.firstName} {item.author.lastName}
                      </small>
                    </div>
                    <p>{item.content}</p>
                  </article>
                ))}
                {!announcements.data?.length ? (
                  <p className="muted-copy">No club announcements yet.</p>
                ) : null}
              </div>
            </section>
            ) : null}

            {["manage", "events", "registrations", "attendance"].includes(initialView) ? (
              <section className="management-panel span-full" id={initialView}>
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Governance queue</p>
                    <h2>
                      {initialView === "registrations"
                        ? "Event registrations"
                        : initialView === "attendance"
                          ? "Attendance operations"
                          : access.data.canReviewEvents
                            ? "Event reviews"
                            : "Events and governance queue"}
                    </h2>
                  </div>
                  <span>{managementEvents.data?.length ?? 0}</span>
                </div>
                <div className="approval-list">
                  {managementEvents.data?.map((event) => (
                    <article key={event.id}>
                      <div>
                        <strong>{event.title}</strong>
                        <small>
                          {label(event.eventType)} · {label(event.status)} · {event.registeredCount} registrations ·{" "}
                          {new Date(event.startsAt).toLocaleString()}
                        </small>
                      </div>
                      <div className="card-actions">
                        {event.status === "DRAFT" && can("CLUB_EDIT_EVENT") ? (
                          <button
                            className="button button-primary button-sm"
                            onClick={() =>
                              void run(
                                `submit-${event.id}`,
                                () =>
                                  api.updateEvent(event.id, {
                                    status: "PENDING_APPROVAL",
                                  }),
                                "Event submitted for approval.",
                              )
                            }
                          >
                            Submit
                          </button>
                        ) : null}
                        {event.status === "PENDING_APPROVAL" &&
                        access.data.canReviewEvents ? (
                          <>
                            <button
                              className="button button-primary button-sm"
                              onClick={() =>
                                void run(
                                  `approve-${event.id}`,
                                  () =>
                                    api.updateEvent(event.id, {
                                      status: "APPROVED",
                                    }),
                                  "Event approved.",
                                )
                              }
                            >
                              Approve
                            </button>
                            <button
                              className="button button-secondary button-sm"
                              onClick={() =>
                                void run(
                                  `reject-event-${event.id}`,
                                  () =>
                                    api.updateEvent(event.id, {
                                      status: "REJECTED",
                                    }),
                                  "Event rejected.",
                                )
                              }
                            >
                              Reject
                            </button>
                          </>
                        ) : null}
                        {event.status === "APPROVED" &&
                        can("CLUB_PUBLISH_EVENT") ? (
                          <button
                            className="button button-primary button-sm"
                            onClick={() =>
                              void run(
                                `publish-${event.id}`,
                                () => api.publishEvent(event.id),
                                "Event published.",
                              )
                            }
                          >
                            Publish
                          </button>
                        ) : null}
                        {event.status === "REJECTED" &&
                        can("CLUB_EDIT_EVENT") ? (
                          <button
                            className="button button-secondary button-sm"
                            onClick={() =>
                              void run(
                                `revise-${event.id}`,
                                () =>
                                  api.updateEvent(event.id, {
                                    status: "DRAFT",
                                  }),
                                "Event returned to draft.",
                              )
                            }
                          >
                            Revise
                          </button>
                        ) : null}
                        <Link
                          className="button button-secondary button-sm"
                          href={`/dashboard/events/${event.id}/manage`}
                        >
                          {initialView === "registrations"
                            ? "View registrations"
                            : initialView === "attendance"
                              ? "Manage attendance"
                              : access.data.canReviewEvents
                                ? "Review"
                                : "Manage"}
                        </Link>
                        {can("CLUB_DELETE_EVENT") &&
                        ["DRAFT", "REJECTED", "CANCELLED"].includes(
                          event.status,
                        ) ? (
                          <button
                            className="button button-secondary button-sm"
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Delete this event and its dependent assignments?",
                                )
                              )
                                void run(
                                  `delete-${event.id}`,
                                  () => api.deleteEvent(event.id),
                                  "Event deleted.",
                                );
                            }}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                  {!managementEvents.data?.length ? (
                    <p className="muted-copy">No club events are available in this view yet.</p>
                  ) : null}
                </div>
              </section>
            ) : null}

            {can("CLUB_MANAGE_RECRUITMENT") &&
            (initialView === "manage" || initialView === "recruitment") ? (
              <section className="management-panel span-full" id="recruitment">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Recruitment</p>
                    <h2>Pending applications</h2>
                  </div>
                  <span>
                    {applications.data?.filter(
                      (item) => item.status === "PENDING",
                    ).length ?? 0}
                  </span>
                </div>
                <div className="approval-list">
                  {applications.data
                    ?.filter((item) => item.status === "PENDING")
                    .map((item) => (
                      <article key={item.id}>
                        <div>
                          <strong>
                            {item.applicant
                              ? `${item.applicant.firstName} ${item.applicant.lastName}`
                              : item.userId}
                          </strong>
                          <small>{item.applicant?.email}</small>
                        </div>
                        <div>
                          <button
                            className="icon-action approve"
                            onClick={() =>
                              void run(
                                `approve-${item.id}`,
                                () =>
                                  api.reviewClubApplication(
                                    clubId,
                                    item.id,
                                    "APPROVED",
                                  ),
                                "Applicant approved and added as a member.",
                              )
                            }
                            aria-label="Approve"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            className="icon-action reject"
                            onClick={() =>
                              void run(
                                `reject-${item.id}`,
                                () =>
                                  api.reviewClubApplication(
                                    clubId,
                                    item.id,
                                    "REJECTED",
                                  ),
                                "Application rejected.",
                              )
                            }
                            aria-label="Reject"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </article>
                    ))}
                  {!applications.data?.some(
                    (item) => item.status === "PENDING",
                  ) ? (
                    <p className="muted-copy">
                      No applications require review.
                    </p>
                  ) : null}
                </div>
              </section>
            ) : null}

            {initialView === "analytics" && dashboard?.roleDistribution.length ? (
              <section className="management-panel span-full">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Membership composition</p>
                    <h2>Role distribution</h2>
                  </div>
                </div>
                <div className="role-distribution-grid">
                  {dashboard.roleDistribution.map((item) => (
                    <article key={item.role}>
                      <span>{label(item.role)}</span>
                      <strong>{item.count}</strong>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </>
      ) : null}

      {initialView === "members" ? (
        <section className="management-panel span-full">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Directory</p>
              <h2>Club members</h2>
            </div>
            <span>{members.data?.length ?? 0} shown</span>
          </div>
          <div className="directory-toolbar">
            <label>
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, or student ID"
              />
            </label>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
            >
              <option value="">All roles</option>
              {clubMembershipRoles.map((role) => (
                <option key={role} value={role}>
                  {label(role)}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">All statuses</option>
              <option>ACTIVE</option>
              <option>PENDING</option>
              <option>SUSPENDED</option>
              <option>REJECTED</option>
            </select>
          </div>
          {can("CLUB_MANAGE_MEMBERS") ? (
            <form className="inline-add-form" onSubmit={addMember}>
              <input name="userId" placeholder="College user ID" required />
              <select name="role" defaultValue="MEMBER">
                {assignableRoles.map((role) => (
                  <option key={role} value={role}>
                    {label(role)}
                  </option>
                ))}
              </select>
              <button
                className="button button-primary button-sm"
                disabled={working === "add-member"}
              >
                <UserPlus size={15} /> Add member
              </button>
            </form>
          ) : null}
          <div className="member-table-wrap">
            <table className="member-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Department</th>
                  <th>Year</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.data?.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <button
                        className="member-identity"
                        onClick={() => setSelected(member)}
                      >
                        <span>{member.fullName.charAt(0)}</span>
                        <div>
                          <strong>{member.fullName}</strong>
                          <small>{member.email ?? "Club member"}</small>
                        </div>
                      </button>
                    </td>
                    <td>{member.department?.code ?? "—"}</td>
                    <td>{member.academicYear ?? "—"}</td>
                    <td>
                      <span className="role-pill">{label(member.role)}</span>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${member.status.toLowerCase()}`}
                      >
                        {label(member.status)}
                      </span>
                    </td>
                    <td>
                      {member.joinedAt
                        ? new Date(member.joinedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      <button
                        className="button button-secondary button-sm"
                        onClick={() => setSelected(member)}
                      >
                        {can("CLUB_MANAGE_MEMBERS") ? "Manage" : "View"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!members.isPending && !members.data?.length ? (
            <p className="muted-copy">No members match these filters.</p>
          ) : null}
        </section>
      ) : null}

      {selected ? (
        <div
          className="member-drawer-backdrop"
          onMouseDown={() => setSelected(null)}
        >
          <aside
            className="member-drawer"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="drawer-close"
              onClick={() => setSelected(null)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <span className="member-drawer-avatar">
              {selected.fullName.charAt(0)}
            </span>
            <p className="eyebrow">Member profile</p>
            <h2>{selected.fullName}</h2>
            <p>{selected.email ?? "Private contact details"}</p>
            <dl className="member-facts">
              <div>
                <dt>Department</dt>
                <dd>{selected.department?.name ?? "Not assigned"}</dd>
              </div>
              <div>
                <dt>Activity</dt>
                <dd>
                  {selected.eventsOrganized} events · {selected.attendanceCount}{" "}
                  attended
                </dd>
              </div>
            </dl>
            {canChangeClubMemberRole(access.data, selected) ? (
              <label className="drawer-field">
                Club role
                <select
                  value={selected.role}
                  disabled={working === `role-${selected.id}`}
                  onChange={(event) =>
                    void run(
                      `role-${selected.id}`,
                      () =>
                        api.updateClubMember(clubId, selected.id, {
                          role: event.target.value,
                        }),
                      "Role updated.",
                    ).then(() => setSelected(null))
                  }
                >
                  {assignableRoles.map((role) => (
                    <option key={role} value={role}>
                      {label(role)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {selected.permissions.length ? (
              <div className="permission-list">
                <h3>Effective permissions</h3>
                {selected.permissions.map((item) => (
                  <article key={item.permission}>
                    <div>
                      <strong>
                        {label(item.permission.replace("CLUB_", ""))}
                      </strong>
                      <small>
                        {item.override
                          ? `Custom ${item.override.toLowerCase()}`
                          : item.inherited
                            ? "Inherited from role"
                            : "Not inherited"}
                      </small>
                    </div>
                    {canOverrideClubPermission(
                      access.data,
                      selected,
                      item.permission,
                    ) ? (
                      <select
                        value={item.override ?? "INHERIT"}
                        onChange={(event) =>
                          void run(
                            `permission-${item.permission}`,
                            () =>
                              api.setClubMemberPermission(
                                clubId,
                                selected.id,
                                item.permission,
                                event.target.value as
                                  "GRANT" | "REVOKE" | "INHERIT",
                              ),
                            "Permission updated.",
                          ).then(() => setSelected(null))
                        }
                      >
                        <option value="INHERIT">Inherit</option>
                        <option value="GRANT">Grant</option>
                        <option value="REVOKE">Revoke</option>
                      </select>
                    ) : (
                      <span
                        className={
                          item.effective ? "permission-on" : "permission-off"
                        }
                      >
                        {item.effective ? "Allowed" : "Denied"}
                      </span>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted-copy">
                Detailed permission grants are private to authorized club
                managers.
              </p>
            )}
            {canManageClubMember(access.data, selected) ? (
              <div className="card-actions">
                {selected.status !== "ACTIVE" ? (
                  <button
                    className="button button-primary button-sm"
                    onClick={() =>
                      void run(
                        `activate-${selected.id}`,
                        () =>
                          api.updateClubMember(clubId, selected.id, {
                            status: "ACTIVE",
                          }),
                        "Membership activated.",
                      ).then(() => setSelected(null))
                    }
                  >
                    Activate
                  </button>
                ) : (
                  <button
                    className="button button-secondary button-sm"
                    onClick={() =>
                      void run(
                        `suspend-${selected.id}`,
                        () =>
                          api.updateClubMember(clubId, selected.id, {
                            status: "SUSPENDED",
                          }),
                        "Membership suspended.",
                      ).then(() => setSelected(null))
                    }
                  >
                    Suspend
                  </button>
                )}
                <button
                  className="button button-secondary button-sm"
                  onClick={() => {
                    if (window.confirm("Remove this member from the club?"))
                      void run(
                        `remove-${selected.id}`,
                        () => api.removeClubMember(clubId, selected.id),
                        "Member removed.",
                      ).then(() => setSelected(null));
                  }}
                >
                  Remove
                </button>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </main>
  );
}
