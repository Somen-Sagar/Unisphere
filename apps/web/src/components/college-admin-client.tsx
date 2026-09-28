"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { MembershipRole } from "@unisphere/types";
import {
  Building2,
  CalendarDays,
  Check,
  GraduationCap,
  Megaphone,
  Search,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState, type FormEvent } from "react";

import { api } from "@/lib/api/client";
import {
  ACTIVE_COLLEGE_STORAGE_KEY,
  activeMembershipForUser,
} from "@/lib/auth/active-college";

const title = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "The action could not be completed.";
const assignableRoles: MembershipRole[] = [
  "STUDENT",
  "FACULTY",
  "COLLEGE_ADMIN",
];

export function CollegeAdminClient() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => api.session(),
    retry: false,
  });
  const membership = useMemo(() => {
    const activeCollegeId =
      typeof window === "undefined"
        ? null
        : localStorage.getItem(ACTIVE_COLLEGE_STORAGE_KEY);
    const active = activeMembershipForUser(
      session.data?.user ?? null,
      activeCollegeId,
    );
    return [active, ...(session.data?.user.memberships ?? [])].find(
        (item) =>
          item &&
          item.status === "ACTIVE" &&
          ["COLLEGE_ADMIN", "PLATFORM_ADMIN"].includes(item.role),
      );
  }, [session.data]);
  const collegeId = membership?.collegeId ?? "";
  const summary = useQuery({
    queryKey: ["college-admin-summary", collegeId],
    queryFn: () => api.collegeAdminSummary(collegeId),
    enabled: Boolean(collegeId),
    retry: false,
  });
  const members = useQuery({
    queryKey: ["college-members", collegeId],
    queryFn: () => api.collegeMembers(collegeId),
    enabled: Boolean(collegeId),
    retry: false,
  });
  const clubs = useQuery({
    queryKey: ["college-admin-clubs", collegeId],
    queryFn: () => api.collegeAdminClubs(collegeId),
    enabled: Boolean(collegeId),
    retry: false,
  });
  const departments = useQuery({
    queryKey: ["departments", collegeId],
    queryFn: () => api.departments(),
    enabled: Boolean(collegeId),
  });
  const pendingEvents = useQuery({
    queryKey: ["pending-events", collegeId],
    queryFn: () => api.events({ status: "PENDING_APPROVAL", pageSize: 50 }),
    enabled: Boolean(collegeId),
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
        queryClient.invalidateQueries({
          queryKey: ["college-admin-summary", collegeId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["college-members", collegeId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["college-admin-clubs", collegeId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["pending-events", collegeId],
        }),
        queryClient.invalidateQueries({ queryKey: ["departments", collegeId] }),
      ]);
    } catch (error) {
      setFeedback(errorText(error));
    } finally {
      setWorking(null);
    }
  }

  async function createDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await run(
      "department",
      () =>
        api.createDepartment({
          name: String(form.get("name")),
          code: String(form.get("code")),
          description: String(form.get("description") || ""),
        }),
      "Department created.",
    );
    formElement.reset();
  }

  async function assignMentor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(
      "mentor",
      () =>
        api.addClubMember(String(form.get("clubId")), {
          userId: String(form.get("userId")),
          role: "CLUB_MENTOR",
          status: "ACTIVE",
        }),
      "Faculty mentor assigned.",
    );
  }

  async function postCollegeAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await run(
      "college-announcement",
      () =>
        api.createCollegeAnnouncement(collegeId, {
          title: String(form.get("title") ?? ""),
          message: String(form.get("message") ?? ""),
        }),
      "College announcement delivered.",
    );
    formElement.reset();
  }

  if (session.isPending || (collegeId && summary.isPending))
    return (
      <main className="portal-content">
        <div className="dashboard-skeleton hero" />
      </main>
    );
  if (
    !membership ||
    !["COLLEGE_ADMIN", "PLATFORM_ADMIN"].includes(membership.role)
  )
    return (
      <main className="portal-content centered-state">
        <ShieldCheck size={36} />
        <h1>College admin access required</h1>
        <p>
          This workspace is scoped to an active college administrator
          membership.
        </p>
      </main>
    );
  if (summary.isError)
    return (
      <main className="portal-content centered-state">
        <ShieldCheck size={36} />
        <h1>Admin data unavailable</h1>
        <p>{errorText(summary.error)}</p>
      </main>
    );

  const filteredMembers =
    members.data?.filter((item) =>
      `${item.user?.firstName} ${item.user?.lastName} ${item.user?.email} ${item.studentId}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    ) ?? [];
  const faculty =
    members.data?.filter(
      (item) => item.role === "FACULTY" && item.status === "ACTIVE",
    ) ?? [];
  const data = summary.data;

  return (
    <main className="portal-content governance-page">
      <section className="governance-hero">
        <div>
          <p className="eyebrow">College administration</p>
          <h1>{membership.college.name}</h1>
          <p>
            Tenant-scoped people, club governance, approvals, departments, and
            event oversight.
          </p>
        </div>
        <div className="governance-role-card spatial-role-card">
          <span className="role-orbit-visual" aria-hidden="true">
            <Image src="/media/campus-orbit.webp" alt="" width={108} height={108} />
            <i />
          </span>
          <span className="role-card-copy">
            <small><i /> Authority online</small>
            <strong>{title(membership.role)}</strong>
            <em>{data?.activeMemberships ?? 0} identities synchronized</em>
          </span>
        </div>
      </section>
      {feedback ? <div className="action-message">{feedback}</div> : null}
      <section className="management-kpis college-kpis">
        {[
          { name: "Students", value: data?.students ?? 0, Icon: GraduationCap },
          { name: "Faculty", value: data?.faculty ?? 0, Icon: UsersRound },
          { name: "Clubs", value: data?.clubs ?? 0, Icon: Building2 },
          { name: "Events", value: data?.events ?? 0, Icon: CalendarDays },
          {
            name: "Pending members",
            value: data?.pendingMemberships ?? 0,
            Icon: UsersRound,
          },
          {
            name: "Pending clubs",
            value: data?.pendingClubs ?? 0,
            Icon: Building2,
          },
          {
            name: "Pending events",
            value: data?.pendingEvents ?? 0,
            Icon: CalendarDays,
          },
          {
            name: "Active memberships",
            value: data?.activeMemberships ?? 0,
            Icon: ShieldCheck,
          },
        ].map(({ name, value, Icon }) => (
          <article key={name}>
            <Icon size={19} />
            <span>{name}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
      <div className="management-grid">
        <section className="management-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Academic structure</p>
              <h2>Create department</h2>
            </div>
          </div>
          <form className="management-form" onSubmit={createDepartment}>
            <div className="form-pair">
              <input name="name" placeholder="Department name" required />
              <input name="code" placeholder="Code" required />
            </div>
            <textarea name="description" placeholder="Department description" />
            <button
              className="button button-primary"
              disabled={working === "department"}
            >
              Create department
            </button>
          </form>
          <div className="chip-list">
            {departments.data?.map((department) => (
              <span key={department.id}>
                {department.code} · {department.name}
              </span>
            ))}
          </div>
        </section>
        <section className="management-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Faculty</p>
              <h2>Assign club mentor</h2>
            </div>
          </div>
          <form className="management-form" onSubmit={assignMentor}>
            <select name="clubId" required defaultValue="">
              <option value="" disabled>
                Select club
              </option>
              {clubs.data?.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
            <select name="userId" required defaultValue="">
              <option value="" disabled>
                Select active faculty
              </option>
              {faculty.map((item) => (
                <option key={item.id} value={item.user?.id}>
                  {item.user?.firstName} {item.user?.lastName}
                </option>
              ))}
            </select>
            <button
              className="button button-primary"
              disabled={working === "mentor"}
            >
              Assign mentor
            </button>
          </form>
        </section>
        <section className="management-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Communication</p>
              <h2>College announcement</h2>
            </div>
            <Megaphone size={19} />
          </div>
          <form className="management-form" onSubmit={postCollegeAnnouncement}>
            <input name="title" minLength={3} placeholder="Announcement title" required />
            <textarea name="message" minLength={3} placeholder="Message for active college members" required />
            <button className="button button-primary" disabled={working === "college-announcement"}>
              {working === "college-announcement" ? "Sending…" : "Send announcement"}
            </button>
          </form>
        </section>
        <section className="management-panel span-full">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Approvals</p>
              <h2>Pending clubs and events</h2>
            </div>
          </div>
          <div className="approval-columns">
            <div>
              <h3>Clubs</h3>
              <div className="approval-list">
                {clubs.data
                  ?.filter((club) => club.verificationStatus === "PENDING")
                  .map((club) => (
                    <article key={club.id}>
                      <div>
                        <strong>{club.name}</strong>
                        <small>{club.category}</small>
                      </div>
                      <div>
                        <button
                          className="icon-action approve"
                          onClick={() =>
                            void run(
                              `club-${club.id}`,
                              () =>
                                api.updateClub(club.id, {
                                  verificationStatus: "VERIFIED",
                                }),
                              "Club approved.",
                            )
                          }
                        >
                          <Check size={16} />
                        </button>
                        <button
                          className="icon-action reject"
                          onClick={() =>
                            void run(
                              `club-reject-${club.id}`,
                              () =>
                                api.updateClub(club.id, {
                                  verificationStatus: "REJECTED",
                                }),
                              "Club rejected.",
                            )
                          }
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </article>
                  ))}
                {!clubs.data?.some(
                  (club) => club.verificationStatus === "PENDING",
                ) ? (
                  <p className="muted-copy">No pending clubs.</p>
                ) : null}
              </div>
            </div>
            <div>
              <h3>Events</h3>
              <div className="approval-list">
                {pendingEvents.data?.items.map((event) => (
                  <article key={event.id}>
                    <div>
                      <strong>{event.title}</strong>
                      <small>
                        {new Date(event.startsAt).toLocaleDateString()}
                      </small>
                    </div>
                    <div>
                      <button
                        className="icon-action approve"
                        onClick={() =>
                          void run(
                            `event-${event.id}`,
                            () =>
                              api.updateEvent(event.id, { status: "APPROVED" }),
                            "Event approved.",
                          )
                        }
                      >
                        <Check size={16} />
                      </button>
                      <button
                        className="icon-action reject"
                        onClick={() =>
                          void run(
                            `event-reject-${event.id}`,
                            () =>
                              api.updateEvent(event.id, { status: "REJECTED" }),
                            "Event rejected.",
                          )
                        }
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </article>
                ))}
                {!pendingEvents.data?.items.length ? (
                  <p className="muted-copy">No pending events.</p>
                ) : null}
              </div>
            </div>
          </div>
        </section>
        <section className="management-panel span-full">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Directory</p>
              <h2>College members</h2>
            </div>
            <span>{filteredMembers.length} shown</span>
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
          </div>
          <div className="member-table-wrap">
            <table className="member-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="member-identity">
                        <span>{item.user?.firstName.charAt(0)}</span>
                        <div>
                          <strong>
                            {item.user?.firstName} {item.user?.lastName}
                          </strong>
                          <small>{item.user?.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {item.user?.id === session.data?.user.id ? (
                        title(item.role)
                      ) : (
                        <select
                          value={item.role}
                          disabled={working === `role-${item.id}`}
                          onChange={(event) =>
                            void run(
                              `role-${item.id}`,
                              () =>
                                api.updateCollegeMember(collegeId, item.id, {
                                  role: event.target.value,
                                }),
                              "College role updated.",
                            )
                          }
                        >
                          {assignableRoles.map((role) => (
                            <option key={role} value={role}>
                              {title(role)}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>{item.department?.code ?? "—"}</td>
                    <td>
                      <span
                        className={`status-pill ${item.status.toLowerCase()}`}
                      >
                        {title(item.status)}
                      </span>
                    </td>
                    <td>
                      {item.status === "PENDING" ? (
                        <div className="card-actions">
                          <button
                            className="button button-primary button-sm"
                            onClick={() =>
                              void run(
                                `member-${item.id}`,
                                () =>
                                  api.updateCollegeMember(collegeId, item.id, {
                                    status: "ACTIVE",
                                  }),
                                "Membership approved.",
                              )
                            }
                          >
                            Approve
                          </button>
                          <button
                            className="button button-secondary button-sm"
                            onClick={() =>
                              void run(
                                `reject-${item.id}`,
                                () =>
                                  api.updateCollegeMember(collegeId, item.id, {
                                    status: "REJECTED",
                                  }),
                                "Membership rejected.",
                              )
                            }
                          >
                            Reject
                          </button>
                        </div>
                      ) : item.user?.id !== session.data?.user.id ? (
                        <button
                          className="button button-secondary button-sm"
                          onClick={() =>
                            void run(
                              `member-${item.id}`,
                              () =>
                                api.updateCollegeMember(collegeId, item.id, {
                                  status:
                                    item.status === "SUSPENDED"
                                      ? "ACTIVE"
                                      : "SUSPENDED",
                                }),
                              item.status === "SUSPENDED"
                                ? "Membership restored."
                                : "Membership suspended.",
                            )
                          }
                        >
                          {item.status === "SUSPENDED" ? "Restore" : "Suspend"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
