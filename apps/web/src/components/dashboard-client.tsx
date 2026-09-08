"use client";

import { motion } from "framer-motion";
import {
  Bell,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Clock3,
  FileBadge,
  Search,
  ShieldAlert,
  Sparkles,
  Ticket,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UniSphereApiError, type UniSphereHealth } from "@unisphere/api-client";
import type {
  CampusClub,
  CampusEvent,
  CampusUser,
  EventRegistration,
  Membership,
  MembershipRole,
} from "@unisphere/types";

import { api } from "@/lib/api/client";

export type DashboardView =
  | "overview"
  | "events"
  | "event-detail"
  | "clubs"
  | "club-detail"
  | "passes"
  | "opportunities"
  | "calendar"
  | "certificates"
  | "ai"
  | "services"
  | "notifications"
  | "profile"
  | "settings";

type DashboardData = {
  user: CampusUser;
  events: CampusEvent[];
  clubs: CampusClub[];
  registrations: EventRegistration[];
};

type DashboardClientProps = {
  allowedRoles?: MembershipRole[];
  view?: DashboardView;
  eventId?: string;
  clubId?: string;
};

const emptyEvents: CampusEvent[] = [];
const emptyClubs: CampusClub[] = [];
const emptyRegistrations: EventRegistration[] = [];

function fullName(user: CampusUser): string {
  return `${user.firstName} ${user.lastName}`;
}

function titleCase(value: string): string {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function eventDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function eventTimeRange(event: CampusEvent): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${formatter.format(new Date(event.startsAt))} - ${formatter.format(new Date(event.endsAt))}`;
}

function seatsLabel(event: CampusEvent): string {
  if (event.capacity === null) return "Open capacity";
  const remaining = Math.max(event.capacity - event.registeredCount, 0);
  return `${remaining} of ${event.capacity} seats left`;
}

function resolveMembership(user: CampusUser): Membership | null {
  const stored =
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem("unisphere.activeCollegeId");
  return (
    user.memberships.find(
      (membership) =>
        membership.status === "ACTIVE" && membership.collegeId === stored,
    ) ??
    user.memberships.find((membership) => membership.status === "ACTIVE") ??
    user.memberships[0] ??
    null
  );
}

function roleRoute(role: MembershipRole): string {
  const routes: Record<MembershipRole, string> = {
    STUDENT: "/dashboard",
    FACULTY: "/faculty/dashboard",
    CLUB_ADMIN: "/club-admin/dashboard",
    DEPARTMENT_ADMIN: "/faculty/dashboard",
    COLLEGE_ADMIN: "/college-admin/dashboard",
    PLATFORM_ADMIN: "/platform-admin/dashboard",
  };
  return routes[role];
}

function apiErrorMessage(error: unknown): string {
  if (error instanceof UniSphereApiError) {
    if (error.status === 503) return "UniSphere services are temporarily unavailable.";
    return error.message;
  }
  return error instanceof Error ? error.message : "The dashboard could not be loaded.";
}

async function loadDashboardData(): Promise<DashboardData | null> {
  try {
    const session = await api.session();
    const hasActiveMembership = session.user.memberships.some(
      (membership) => membership.status === "ACTIVE",
    );

    if (!hasActiveMembership) {
      return {
        user: session.user,
        events: emptyEvents,
        clubs: emptyClubs,
        registrations: emptyRegistrations,
      };
    }

    const [eventResult, clubResult, registrationResult] = await Promise.all([
      api.events({ upcoming: true, pageSize: 50 }),
      api.clubs(),
      api.myRegistrations(),
    ]);

    return {
      user: session.user,
      events: eventResult.items,
      clubs: clubResult,
      registrations: registrationResult,
    };
  } catch (error) {
    if (error instanceof UniSphereApiError && error.status === 401) return null;
    throw error;
  }
}

function useActiveTenantRefresh() {
  const [tenantVersion, setTenantVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setTenantVersion((value) => value + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("unisphere:tenant-change", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("unisphere:tenant-change", refresh);
    };
  }, []);

  return tenantVersion;
}

function PageIntro({
  eyebrow,
  title,
  copy,
  action,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  action?: ReactNode;
}) {
  return (
    <div className="portal-page-intro">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  copy,
  action,
}: {
  icon: typeof CalendarDays;
  title: string;
  copy: string;
  action?: ReactNode;
}) {
  return (
    <div className="premium-empty-state">
      <Icon aria-hidden="true" size={26} />
      <h3>{title}</h3>
      <p>{copy}</p>
      {action}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <main className="portal-content">
      <div className="dashboard-skeleton hero" />
      <div className="dashboard-skeleton-grid">
        <div className="dashboard-skeleton" />
        <div className="dashboard-skeleton" />
        <div className="dashboard-skeleton" />
        <div className="dashboard-skeleton" />
      </div>
    </main>
  );
}

function SystemBanner({
  health,
  loading,
  error,
  onRetry,
}: {
  health: UniSphereHealth | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const online = health?.status === "ok" && health.database === "connected";
  const degraded = Boolean(health && !online);
  const state = loading ? "checking" : online ? "online" : degraded ? "degraded" : "offline";
  const title =
    state === "checking"
      ? "Checking UniSphere services"
      : state === "online"
        ? "All systems operational"
        : state === "degraded"
          ? "Some services are degraded"
          : "UniSphere services unavailable";
  const copy =
    state === "offline"
      ? (error ?? "Live campus data cannot be reached right now.")
      : `API ${health?.status ?? "checking"} · Database ${health?.database ?? "checking"} · Redis ${health?.redis ?? "checking"}`;

  return (
    <section className={`system-banner ${state}`} aria-live="polite">
      <div>
        <span className="system-state-dot" />
        <div>
          <strong>{title}</strong>
          <p>{copy}</p>
        </div>
      </div>
      <button className="button button-secondary button-sm" onClick={onRetry} type="button">
        Retry
      </button>
    </section>
  );
}

function KpiGrid({
  events,
  clubs,
  registrations,
}: {
  events: CampusEvent[];
  clubs: CampusClub[];
  registrations: EventRegistration[];
}) {
  const items = [
    {
      label: "Upcoming events",
      value: events.length,
      copy: events.length ? "Open for discovery in your tenant" : "No published events yet",
      icon: CalendarDays,
    },
    {
      label: "Active clubs",
      value: clubs.length,
      copy: clubs.length ? "Communities available in your college" : "No active clubs yet",
      icon: UsersRound,
    },
    {
      label: "My registrations",
      value: registrations.length,
      copy: registrations.length ? "Passes issued from real registrations" : "No passes issued yet",
      icon: Ticket,
    },
    {
      label: "Certificates",
      value: 0,
      copy: "Certificate issuing is not connected yet",
      icon: FileBadge,
    },
  ];

  return (
    <section className="premium-kpi-grid" aria-label="Campus summary">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.article
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            key={item.label}
          >
            <span className="kpi-icon"><Icon size={18} /></span>
            <p>{item.label}</p>
            <strong>{item.value}</strong>
            <small>{item.copy}</small>
          </motion.article>
        );
      })}
    </section>
  );
}

function EventCard({
  event,
  registered,
  canRegister,
  registering,
  onRegister,
}: {
  event: CampusEvent;
  registered: boolean;
  canRegister: boolean;
  registering: boolean;
  onRegister: () => void;
}) {
  return (
    <motion.article className="premium-event-card" whileHover={{ y: -3 }}>
      <div className="event-poster">
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.imageUrl} alt="" />
        ) : (
          <CalendarDays aria-hidden="true" size={28} />
        )}
      </div>
      <div className="event-card-body">
        <div className="event-card-meta">
          <span>{titleCase(event.status)}</span>
          <span>{seatsLabel(event)}</span>
        </div>
        <h3>{event.title}</h3>
        <p>{event.description}</p>
        <dl className="compact-details">
          <div>
            <dt>Date</dt>
            <dd>{eventDate(event.startsAt)}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>{eventTimeRange(event)}</dd>
          </div>
          <div>
            <dt>Venue</dt>
            <dd>{event.venue}</dd>
          </div>
        </dl>
        <div className="card-actions">
          <Link className="button button-secondary button-sm" href={`/dashboard/events/${event.id}`}>
            View details
          </Link>
          <button
            className="button button-primary button-sm"
            disabled={!canRegister || registered || registering}
            onClick={onRegister}
            type="button"
          >
            {registered ? "Registered" : registering ? "Registering..." : "Register"}
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function ClubCard({ club }: { club: CampusClub }) {
  return (
    <motion.article className="premium-club-card" whileHover={{ y: -3 }}>
      <div className="club-logo">
        {club.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={club.logoUrl} alt="" />
        ) : (
          club.name.charAt(0)
        )}
      </div>
      <div>
        <p className="eyebrow">Campus community</p>
        <h3>{club.name}</h3>
        <p>{club.description ?? "A student community in your college tenant."}</p>
        <span>{club.upcomingEventCount} upcoming {club.upcomingEventCount === 1 ? "event" : "events"}</span>
      </div>
      <Link className="button button-secondary button-sm" href={`/dashboard/clubs/${club.id}`}>
        View club
      </Link>
    </motion.article>
  );
}

function PassCard({ registration }: { registration: EventRegistration }) {
  return (
    <article className="premium-pass-card">
      <div>
        <span>{registration.checkedInAt ? "Checked in" : titleCase(registration.status)}</span>
        <h3>{registration.event.title}</h3>
        <p>{eventDate(registration.event.startsAt)}</p>
        <p>{registration.event.venue}</p>
        <Link href={`/dashboard/events/${registration.eventId}`}>View event</Link>
      </div>
      <div className="pass-qr" aria-label={`QR pass for ${registration.event.title}`}>
        <QRCode
          value={`unisphere://registration/${registration.qrToken}`}
          size={128}
          bgColor="#ffffff"
          fgColor="#172033"
        />
      </div>
    </article>
  );
}

function Overview({
  user,
  membership,
  events,
  clubs,
  registrations,
  registeredEventIds,
  canRegister,
  registeringId,
  onRegister,
}: {
  user: CampusUser;
  membership: Membership | null;
  events: CampusEvent[];
  clubs: CampusClub[];
  registrations: EventRegistration[];
  registeredEventIds: Set<string>;
  canRegister: boolean;
  registeringId: string | null;
  onRegister: (eventId: string) => void;
}) {
  const nextEvent = events[0];

  return (
    <>
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">{membership?.college.name ?? "UNISPHERE"}</p>
          <h1>Good to see you, {user.firstName}.</h1>
          <p>Here is what is happening across your campus today, powered by real tenant-scoped UniSphere data.</p>
          <div className="quick-actions">
            <Link className="button button-primary" href="/dashboard/events">Browse Events</Link>
            <Link className="button button-secondary" href="/dashboard/clubs">Explore Clubs</Link>
            <Link className="button button-secondary" href="/dashboard/ai">Ask UniSphere AI</Link>
            <Link className="button button-secondary" href="/dashboard/passes">View Passes</Link>
          </div>
        </div>
        <aside className="hero-context-panel">
          <span className="eyebrow">Next campus moment</span>
          {nextEvent ? (
            <>
              <h2>{nextEvent.title}</h2>
              <p>{eventDate(nextEvent.startsAt)} · {nextEvent.venue}</p>
              <Link className="button button-secondary button-sm" href={`/dashboard/events/${nextEvent.id}`}>
                Open event
              </Link>
            </>
          ) : (
            <>
              <h2>No upcoming events yet</h2>
              <p>Published events for your active college will appear here.</p>
            </>
          )}
        </aside>
      </section>
      <KpiGrid events={events} clubs={clubs} registrations={registrations} />
      <section className="portal-two-column">
        <div className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Discover</p>
              <h2>Upcoming events</h2>
            </div>
            <Link href="/dashboard/events">View all</Link>
          </div>
          <div className="event-list-compact">
            {events.slice(0, 3).map((event) => (
              <EventCard
                key={event.id}
                event={event}
                registered={registeredEventIds.has(event.id)}
                canRegister={canRegister}
                registering={registeringId === event.id}
                onRegister={() => onRegister(event.id)}
              />
            ))}
            {!events.length ? (
              <EmptyState
                icon={CalendarDays}
                title="No upcoming events yet"
                copy="Events published by your college or club admins will appear here."
                action={<Link className="button button-secondary button-sm" href="/dashboard/events">Explore all events</Link>}
              />
            ) : null}
          </div>
        </div>
        <aside className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Communities</p>
              <h2>Clubs</h2>
            </div>
            <Link href="/dashboard/clubs">Open</Link>
          </div>
          <div className="club-list-compact">
            {clubs.slice(0, 4).map((club) => (
              <ClubCard key={club.id} club={club} />
            ))}
            {!clubs.length ? (
              <EmptyState
                icon={UsersRound}
                title="No active clubs"
                copy="Approved clubs in your active college will appear here."
              />
            ) : null}
          </div>
        </aside>
      </section>
    </>
  );
}

function EventsView({
  events,
  registeredEventIds,
  canRegister,
  registeringId,
  onRegister,
}: {
  events: CampusEvent[];
  registeredEventIds: Set<string>;
  canRegister: boolean;
  registeringId: string | null;
  onRegister: (eventId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = events.filter((event) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      `${event.title} ${event.description} ${event.venue}`.toLowerCase().includes(term);
    const matchesStatus = status === "all" || event.status === status;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <PageIntro
        eyebrow="Events"
        title="Campus event command center"
        copy="Browse tenant-scoped events from the UniSphere backend. Filters run on the live result set."
      />
      <div className="filter-bar">
        <label>
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search events or venues" />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="REGISTRATION_OPEN">Registration open</option>
          <option value="PUBLISHED">Published</option>
          <option value="ONGOING">Ongoing</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>
      <div className="premium-event-grid">
        {filtered.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            registered={registeredEventIds.has(event.id)}
            canRegister={canRegister}
            registering={registeringId === event.id}
            onRegister={() => onRegister(event.id)}
          />
        ))}
      </div>
      {!filtered.length ? (
        <EmptyState
          icon={CalendarDays}
          title="No matching events"
          copy="Adjust your filters or check back after your college publishes more events."
        />
      ) : null}
    </>
  );
}

function EventDetailView({
  event,
  registered,
  canRegister,
  registering,
  onRegister,
}: {
  event?: CampusEvent;
  registered: boolean;
  canRegister: boolean;
  registering: boolean;
  onRegister: () => void;
}) {
  if (!event) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Event not found"
        copy="This event either does not exist or is outside your active college."
        action={<Link className="button button-secondary button-sm" href="/dashboard/events">Back to events</Link>}
      />
    );
  }

  return (
    <section className="detail-layout">
      <div className="detail-main">
        <p className="eyebrow">{titleCase(event.status)}</p>
        <h1>{event.title}</h1>
        <p>{event.description}</p>
        <dl className="detail-grid">
          <div><dt>Date</dt><dd>{eventDate(event.startsAt)}</dd></div>
          <div><dt>Time</dt><dd>{eventTimeRange(event)}</dd></div>
          <div><dt>Venue</dt><dd>{event.venue}</dd></div>
          <div><dt>Capacity</dt><dd>{seatsLabel(event)}</dd></div>
        </dl>
        <div className="card-actions">
          <Link className="button button-secondary" href="/dashboard/events">Back to events</Link>
          <button className="button button-primary" disabled={!canRegister || registered || registering} onClick={onRegister} type="button">
            {registered ? "Registered" : registering ? "Registering..." : "Register for event"}
          </button>
        </div>
      </div>
    </section>
  );
}

function ClubsView({ clubs }: { clubs: CampusClub[] }) {
  const [search, setSearch] = useState("");
  const filtered = clubs.filter((club) =>
    `${club.name} ${club.description ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <>
      <PageIntro
        eyebrow="Clubs"
        title="Student communities"
        copy="Explore real clubs from your active college tenant."
      />
      <div className="filter-bar">
        <label>
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search clubs" />
        </label>
      </div>
      <div className="premium-club-grid">
        {filtered.map((club) => <ClubCard key={club.id} club={club} />)}
      </div>
      {!filtered.length ? (
        <EmptyState icon={UsersRound} title="No matching clubs" copy="Approved active clubs will appear here." />
      ) : null}
    </>
  );
}

function ClubDetailView({ club }: { club?: CampusClub }) {
  if (!club) {
    return (
      <EmptyState
        icon={UsersRound}
        title="Club not found"
        copy="This club either does not exist or is outside your active college."
        action={<Link className="button button-secondary button-sm" href="/dashboard/clubs">Back to clubs</Link>}
      />
    );
  }

  return (
    <section className="detail-layout">
      <div className="detail-main">
        <p className="eyebrow">Campus community</p>
        <h1>{club.name}</h1>
        <p>{club.description ?? "A student community in your college tenant."}</p>
        <dl className="detail-grid">
          <div><dt>Slug</dt><dd>{club.slug}</dd></div>
          <div><dt>Upcoming events</dt><dd>{club.upcomingEventCount}</dd></div>
        </dl>
        <Link className="button button-secondary" href="/dashboard/clubs">Back to clubs</Link>
      </div>
    </section>
  );
}

function PassesView({ registrations }: { registrations: EventRegistration[] }) {
  return (
    <>
      <PageIntro
        eyebrow="My Passes"
        title="Registration passes"
        copy="QR passes are generated only from real event registrations stored in PostgreSQL."
      />
      <div className="premium-pass-grid">
        {registrations.map((registration) => (
          <PassCard key={registration.id} registration={registration} />
        ))}
      </div>
      {!registrations.length ? (
        <EmptyState
          icon={Ticket}
          title="No registration passes yet"
          copy="Register for an event to create your first QR pass."
          action={<Link className="button button-primary button-sm" href="/dashboard/events">Browse events</Link>}
        />
      ) : null}
    </>
  );
}

function CalendarView({ events, registrations }: { events: CampusEvent[]; registrations: EventRegistration[] }) {
  const registered = new Set(registrations.map((item) => item.eventId));
  return (
    <>
      <PageIntro
        eyebrow="Calendar"
        title="Your campus schedule"
        copy="A polished schedule view from your tenant events and your registrations."
      />
      <div className="calendar-board">
        {events.slice(0, 10).map((event) => (
          <article key={event.id}>
            <span>{new Date(event.startsAt).getDate()}</span>
            <div>
              <strong>{event.title}</strong>
              <p>{eventTimeRange(event)} · {event.venue}</p>
            </div>
            {registered.has(event.id) ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}
          </article>
        ))}
      </div>
      {!events.length ? (
        <EmptyState icon={CalendarDays} title="No calendar items" copy="Upcoming events and registration deadlines will appear here." />
      ) : null}
    </>
  );
}

function ProfileView({ user, membership, registrations }: { user: CampusUser; membership: Membership | null; registrations: EventRegistration[] }) {
  return (
    <>
      <PageIntro
        eyebrow="Profile"
        title={fullName(user)}
        copy="Your verified identity and tenant memberships come from the authenticated user session."
      />
      <section className="profile-grid">
        <article>
          <span className="profile-avatar">{user.firstName.charAt(0).toUpperCase()}</span>
          <h2>{fullName(user)}</h2>
          <p>{user.email}</p>
        </article>
        <article>
          <p className="eyebrow">Active college</p>
          <h3>{membership?.college.name ?? "No active college"}</h3>
          <p>{membership ? `${membership.college.city ?? "Campus"} · ${membership.college.state ?? "Region"}` : "Complete onboarding to activate your tenant."}</p>
          <dl className="detail-grid">
            <div><dt>Role</dt><dd>{membership ? titleCase(membership.role) : "Pending"}</dd></div>
            <div><dt>Status</dt><dd>{membership ? titleCase(membership.status) : "Pending"}</dd></div>
            <div><dt>Student ID</dt><dd>{membership?.studentId ?? "Not provided"}</dd></div>
            <div><dt>Registrations</dt><dd>{registrations.length}</dd></div>
          </dl>
        </article>
        <article>
          <p className="eyebrow">All memberships</p>
          <div className="membership-list">
            {user.memberships.map((item) => (
              <div key={item.id}>
                <strong>{item.college.name}</strong>
                <span>{titleCase(item.role)} · {titleCase(item.status)}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}

function FutureState({ view }: { view: DashboardView }) {
  const copy: Record<string, { icon: typeof CalendarDays; title: string; body: string; action?: React.ReactNode }> = {
    opportunities: {
      icon: Sparkles,
      title: "No opportunities published yet",
      body: "Hackathons, internships, scholarships, faculty projects, and placement updates will appear after the backend module ships.",
    },
    certificates: {
      icon: FileBadge,
      title: "No certificates issued yet",
      body: "Certificate generation and verification are not connected yet, so no fake credentials are shown.",
    },
    ai: {
      icon: Bot,
      title: "UniSphere AI backend is not connected yet",
      body: "The assistant surface is ready, but responses must come through a backend AI endpoint before chat is enabled.",
    },
    services: {
      icon: Building2,
      title: "Campus services are being connected",
      body: "Mess, hostel, notices, complaints, lost and found, and campus map pages are routed from here without fake production data.",
      action: (
        <div className="service-route-grid">
          {["Mess", "Hostel", "Notices", "Complaints", "Lost & Found", "Campus Map"].map((item) => (
            <Link href="/dashboard/services" key={item}>{item}<ChevronRight size={14} /></Link>
          ))}
        </div>
      ),
    },
    notifications: {
      icon: Bell,
      title: "No notifications",
      body: "Event reminders, club notices, certificates, and campus alerts will appear once the notifications backend is connected.",
    },
    settings: {
      icon: CircleGauge,
      title: "Settings are intentionally limited",
      body: "Theme and session controls are active. Account and notification preferences need backend endpoints before editing is enabled.",
    },
  };
  const item = copy[view] ?? copy.opportunities;
  return (
    <>
      <PageIntro eyebrow={titleCase(view)} title={item.title} copy={item.body} />
      <EmptyState icon={item.icon} title={item.title} copy={item.body} action={item.action} />
    </>
  );
}

function WorkspaceContext({
  membership,
  events,
  registrations,
}: {
  membership: Membership | null;
  events: CampusEvent[];
  registrations: EventRegistration[];
}) {
  return (
    <aside className="right-context-panel">
      <p className="eyebrow">Tenant Context</p>
      <h2>{membership?.college.name ?? "No active college"}</h2>
      <p>{membership ? `${titleCase(membership.role)} · ${titleCase(membership.status)}` : "Complete onboarding to activate campus data."}</p>
      <div className="context-stat-list">
        <div><span>Next event</span><strong>{events[0]?.title ?? "None"}</strong></div>
        <div><span>Passes</span><strong>{registrations.length}</strong></div>
        <div><span>Isolation</span><strong>Membership scoped</strong></div>
      </div>
    </aside>
  );
}

export function DashboardClient({
  allowedRoles,
  view = "overview",
  eventId,
  clubId,
}: DashboardClientProps = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const tenantVersion = useActiveTenantRefresh();
  const dashboard = useQuery({
    queryKey: ["dashboard-data", tenantVersion],
    queryFn: loadDashboardData,
  });
  const health = useQuery({
    queryKey: ["backend-health"],
    queryFn: () => api.health(),
    retry: 1,
    refetchInterval: 60_000,
  });
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  useEffect(() => {
    if (dashboard.data === null) router.replace("/login?next=/dashboard");
  }, [dashboard.data, router]);

  if (dashboard.isPending || dashboard.data === null) return <DashboardSkeleton />;

  if (dashboard.isError) {
    return (
      <main className="portal-content">
        <SystemBanner
          health={health.data ?? null}
          loading={health.isLoading}
          error={apiErrorMessage(dashboard.error)}
          onRetry={() => {
            void health.refetch();
            void dashboard.refetch();
          }}
        />
        <EmptyState
          icon={ShieldAlert}
          title="Dashboard data unavailable"
          copy={apiErrorMessage(dashboard.error)}
          action={<button className="button button-primary button-sm" onClick={() => void dashboard.refetch()} type="button">Retry dashboard</button>}
        />
      </main>
    );
  }

  const { user, events = emptyEvents, clubs = emptyClubs, registrations = emptyRegistrations } = dashboard.data;
  const membership = resolveMembership(user);
  const activeRoles = user.memberships
    .filter((item) => item.status === "ACTIVE")
    .map((item) => item.role);
  const canRegister = Boolean(membership && membership.status === "ACTIVE");
  const registeredEventIds = new Set(registrations.map((registration) => registration.eventId));
  const roleAllowed =
    !allowedRoles?.length ||
    activeRoles.includes("PLATFORM_ADMIN") ||
    allowedRoles.some((role) => activeRoles.includes(role));

  async function register(eventIdToRegister: string) {
    setRegisteringId(eventIdToRegister);
    setActionMessage(null);
    try {
      const registration = await api.registerForEvent(eventIdToRegister);
      queryClient.setQueryData<DashboardData | null>(["dashboard-data", tenantVersion], (current) => {
        if (!current) return current;
        const other = current.registrations.filter((item) => item.eventId !== eventIdToRegister);
        return {
          ...current,
          registrations: [...other, registration].sort((left, right) =>
            left.event.startsAt.localeCompare(right.event.startsAt),
          ),
        };
      });
      setActionMessage("Registration confirmed. Your QR pass is ready.");
    } catch (registrationError) {
      setActionMessage(apiErrorMessage(registrationError));
    } finally {
      setRegisteringId(null);
    }
  }

  if (!roleAllowed) {
    return (
      <main className="portal-content centered-state">
        <ShieldAlert aria-hidden="true" size={34} />
        <p className="eyebrow">Access denied</p>
        <h1>You do not have access to this dashboard.</h1>
        <p>Use a role that is active for this college.</p>
        {activeRoles[0] ? <Link className="button button-primary" href={roleRoute(activeRoles[0])}>Open my dashboard</Link> : null}
      </main>
    );
  }

  const selectedEvent = events.find((event) => event.id === eventId);
  const selectedClub = clubs.find((club) => club.id === clubId);

  return (
    <main className="portal-content">
      <SystemBanner
        health={health.data ?? null}
        loading={health.isLoading}
        error={health.error ? apiErrorMessage(health.error) : null}
        onRetry={() => void health.refetch()}
      />
      {membership?.status === "PENDING" ? (
        <div className="dashboard-notice">
          <strong>College verification pending</strong>
          <span>Your membership exists, but tenant actions unlock after approval.</span>
        </div>
      ) : null}
      {actionMessage ? <div className="action-message">{actionMessage}</div> : null}

      <div className="workspace-grid">
        <section className="workspace-main">
          {view === "overview" ? (
            <Overview
              user={user}
              membership={membership}
              events={events}
              clubs={clubs}
              registrations={registrations}
              registeredEventIds={registeredEventIds}
              canRegister={canRegister}
              registeringId={registeringId}
              onRegister={register}
            />
          ) : null}
          {view === "events" ? (
            <EventsView
              events={events}
              registeredEventIds={registeredEventIds}
              canRegister={canRegister}
              registeringId={registeringId}
              onRegister={register}
            />
          ) : null}
          {view === "event-detail" ? (
            <EventDetailView
              event={selectedEvent}
              registered={selectedEvent ? registeredEventIds.has(selectedEvent.id) : false}
              canRegister={canRegister}
              registering={selectedEvent ? registeringId === selectedEvent.id : false}
              onRegister={() => selectedEvent && register(selectedEvent.id)}
            />
          ) : null}
          {view === "clubs" ? <ClubsView clubs={clubs} /> : null}
          {view === "club-detail" ? <ClubDetailView club={selectedClub} /> : null}
          {view === "passes" ? <PassesView registrations={registrations} /> : null}
          {view === "calendar" ? <CalendarView events={events} registrations={registrations} /> : null}
          {view === "profile" ? <ProfileView user={user} membership={membership} registrations={registrations} /> : null}
          {["opportunities", "certificates", "ai", "services", "notifications", "settings"].includes(view) ? (
            <FutureState view={view} />
          ) : null}
        </section>
        <WorkspaceContext membership={membership} events={events} registrations={registrations} />
      </div>
    </main>
  );
}
