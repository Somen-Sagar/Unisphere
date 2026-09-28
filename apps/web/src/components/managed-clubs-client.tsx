"use client";

import { useQuery } from "@tanstack/react-query";
import type { CampusClub, ClubAccess } from "@unisphere/types";
import { Activity, CalendarDays, ChevronRight, GraduationCap, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { api } from "@/lib/api/client";
import { clubNavigation } from "@/lib/club-navigation";

type ManagedClub = { club: CampusClub; access: ClubAccess };

export function ManagedClubsClient({ mentorOnly = false }: { mentorOnly?: boolean }) {
  const clubs = useQuery({
    queryKey: ["managed-clubs", mentorOnly],
    queryFn: async () => {
      const directory = await api.managedClubs();
      const results = await Promise.all(directory.map(async (club) => ({ club, access: await api.clubAccess(club.id) })));
      return results.filter((item) => mentorOnly
        ? item.access.role === "CLUB_MENTOR"
        : item.access.canManageClub || item.access.role === "CLUB_SUB_LEAD") as ManagedClub[];
    },
    retry: false,
  });

  if (clubs.isPending) return <main className="portal-content"><div className="dashboard-skeleton hero" /></main>;
  if (clubs.isError) return <main className="portal-content centered-state"><ShieldCheck size={36} /><h1>Managed clubs unavailable</h1><p>{clubs.error.message}</p></main>;

  const assigned = clubs.data?.length ?? 0;
  const members = clubs.data?.reduce((total, item) => total + (item.club.memberCount ?? 0), 0) ?? 0;
  const upcoming = clubs.data?.reduce((total, item) => total + item.club.upcomingEventCount, 0) ?? 0;
  const capabilities = clubs.data?.reduce(
    (total, item) => total + clubNavigation(item.club.id, item.access).length,
    0,
  ) ?? 0;

  return <main className="portal-content governance-page">
    <section className="governance-hero"><div><p className="eyebrow">{mentorOnly ? "Faculty oversight" : "Club operations"}</p><h1>{mentorOnly ? "Mentored clubs" : "Your club workspaces"}</h1><p>{mentorOnly ? "Review the clubs where you hold an active faculty mentor assignment. Advisory access stays scoped to those clubs." : "Open the management workspace for clubs where your effective permissions allow operational access."}</p></div><div className="governance-role-card spatial-role-card"><span className="role-orbit-visual" aria-hidden="true"><Image src="/media/campus-orbit.webp" alt="" width={108} height={108} /><i /></span><span className="role-card-copy"><small><i /> {mentorOnly ? "Advisory link online" : "Operations online"}</small><strong>{clubs.data?.length ?? 0} assigned</strong><em>{mentorOnly ? "Faculty oversight layer" : "Active college tenant"}</em></span></div></section>
    <section className="management-kpis workspace-command-kpis" aria-label="Club portfolio overview">
      <article><ShieldCheck size={19} /><span>Active workspaces</span><strong>{assigned}</strong><small>governed clubs</small></article>
      <article><UsersRound size={19} /><span>Community reach</span><strong>{members}</strong><small>active members</small></article>
      <article><CalendarDays size={19} /><span>Event pipeline</span><strong>{upcoming}</strong><small>upcoming events</small></article>
      <article><Activity size={19} /><span>Control surface</span><strong>{capabilities}</strong><small>available actions</small></article>
    </section>
    <section className="workspace-section-heading"><div><p className="eyebrow">Operational grid</p><h2>Choose a command workspace</h2></div><span><Sparkles size={14} /> Permission-aware</span></section>
    <div className="managed-club-grid futuristic-workspace-grid">
      {clubs.data?.map(({ club, access }) => {
        const navigation = clubNavigation(club.id, access);
        return (
          <article key={club.id}>
            <div className="workspace-card-scan" aria-hidden="true" />
            <div className="managed-club-logo">{club.name.charAt(0)}</div>
            <div>
              <p className="eyebrow">{access.role?.replaceAll("_", " ") ?? "College admin"}</p>
              <h2>{club.name}</h2>
              <p>{club.description}</p>
              <div className="club-meta-row"><span><UsersRound size={13} /> {club.memberCount ?? 0} members</span><span><CalendarDays size={13} /> {club.upcomingEventCount} upcoming</span></div>
            </div>
            <div className="card-actions managed-workspace-actions">
              <Link className="button button-primary button-sm" href={`/dashboard/clubs/${club.id}/manage`}>Open workspace <ChevronRight size={15} /></Link>
              {navigation
                .filter((item) => item.key !== "dashboard")
                .map((item) => (
                  <Link className="button button-secondary button-sm" href={item.href} key={item.key}>{item.label}</Link>
                ))}
            </div>
          </article>
        );
      })}
    </div>
    {!clubs.data?.length ? <section className="premium-empty-state">{mentorOnly ? <GraduationCap size={28} /> : <UsersRound size={28} />}<h2>No club assignments</h2><p>{mentorOnly ? "A college administrator must assign you as a mentor before clubs appear here." : "Club lead, sub-lead, mentor, or delegated analytics access is required."}</p></section> : null}
  </main>;
}
