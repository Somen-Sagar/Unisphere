"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CampusUser, Membership, MembershipRole } from "@unisphere/types";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpenCheck,
  Bot,
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  DoorOpen,
  GraduationCap,
  Home,
  IdCard,
  LayoutDashboard,
  Map,
  Megaphone,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Ticket,
  Trophy,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { FormEvent, PropsWithChildren } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ApiStatus } from "@/components/system/api-status";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { api } from "@/lib/api/client";
import {
  ACTIVE_COLLEGE_STORAGE_KEY,
  activeMembershipForUser,
  reconcileActiveCollege,
} from "@/lib/auth/active-college";
import {
  clubNavigation,
  type ClubNavigationKey,
} from "@/lib/club-navigation";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: MembershipRole[];
  badge?: string;
};

const generalNav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/events", label: "Events", icon: CalendarDays },
  { href: "/dashboard/clubs", label: "Clubs", icon: UsersRound },
];

const activityNav: NavItem[] = [
  { href: "/dashboard/passes", label: "My Passes", icon: Ticket },
  { href: "/dashboard/calendar", label: "Calendar", icon: BookOpenCheck },
  {
    href: "/dashboard/notifications",
    label: "Notifications",
    icon: Bell,
  },
  { href: "/dashboard/profile", label: "Profile", icon: IdCard },
];

function activityNavWithBadge(unreadNotifications: number): NavItem[] {
  return [
    ...activityNav.map((item) =>
      item.href === "/dashboard/notifications"
        ? { ...item, badge: unreadNotifications ? String(unreadNotifications) : undefined }
        : item,
    ),
  ];
}

const intelligenceNav: NavItem[] = [
  { href: "/dashboard/ai", label: "AI Preview", icon: Bot },
];

const collegeRoleNav: NavItem[] = [
  { href: "/college-admin/dashboard", label: "College Admin", icon: Home, roles: ["COLLEGE_ADMIN"] },
  { href: "/platform-admin/dashboard", label: "Platform Admin", icon: Map, roles: ["PLATFORM_ADMIN"] },
];

const clubNavigationIcons: Record<ClubNavigationKey, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  members: UsersRound,
  events: CalendarDays,
  "create-event": CalendarPlus,
  "create-competition": Trophy,
  recruitment: UserPlus,
  announcements: Megaphone,
  registrations: ClipboardList,
  attendance: Activity,
  analytics: BarChart3,
  settings: Settings,
};

function activeMembership(user: CampusUser | null): Membership | null {
  const stored =
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem(ACTIVE_COLLEGE_STORAGE_KEY);
  return activeMembershipForUser(user, stored);
}

function roleLabel(role?: MembershipRole | string): string {
  if (!role) return "Member";
  return role.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function canShow(item: NavItem, roles: MembershipRole[]): boolean {
  if (!item.roles?.length) return true;
  if (roles.includes("PLATFORM_ADMIN")) return true;
  return item.roles.some((role) => roles.includes(role));
}

function NavGroup({
  title,
  items,
  pathname,
  roles,
  collapsed,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  roles: MembershipRole[];
  collapsed: boolean;
}) {
  const visible = items.filter((item) => canShow(item, roles));
  if (!visible.length) return null;

  return (
    <section className="portal-nav-group">
      {!collapsed ? (
        <p className="portal-nav-title">{title}</p>
      ) : (
        <div className="portal-nav-divider" aria-hidden="true" />
      )}
      <nav aria-label={title}>
        {visible.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={active ? "active" : ""}
              href={item.href}
              key={item.href}
              title={item.label}
            >
              <Icon aria-hidden="true" size={18} />
              {!collapsed ? <span>{item.label}</span> : null}
              {!collapsed && item.badge ? <small>{item.badge}</small> : null}
            </Link>
          );
        })}
      </nav>
    </section>
  );
}

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === searchRef.current) {
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const session = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const currentSession = await api.session();
      if (typeof window !== "undefined") {
        const { changed } = reconcileActiveCollege(
          currentSession.user,
          window.localStorage,
        );
        if (changed) {
          window.dispatchEvent(new Event("unisphere:tenant-change"));
        }
      }
      return currentSession;
    },
    retry: false,
  });
  const tenantReady = !session.isPending;
  const health = useQuery({
    queryKey: ["backend-health"],
    queryFn: () => api.health(),
    refetchInterval: 60_000,
  });
  const summary = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => api.dashboardSummary(),
    enabled:
      session.isSuccess &&
      Boolean(session.data?.user.memberships.some((item) => item.status === "ACTIVE")),
  });

  const user = session.data?.user ?? null;
  const membership = activeMembership(user);
  const activeRoles = useMemo(
    () =>
      user?.memberships
        .filter((item) => item.status === "ACTIVE" && item.collegeId === membership?.collegeId)
        .map((item) => item.role) ?? [],
    [user, membership?.collegeId],
  );
  const managedClubs = useQuery({
    queryKey: ["shell-managed-clubs", membership?.collegeId],
    queryFn: async () => {
      const clubs = await api.managedClubs();
      const items = await Promise.all(clubs.map(async (club) => ({ club, access: await api.clubAccess(club.id) })));
      return items.filter(
        (item) => clubNavigation(item.club.id, item.access).length > 0,
      );
    },
    enabled: session.isSuccess && Boolean(membership?.collegeId),
    staleTime: 60_000,
    retry: false,
  });
  const activeClubRole = user?.clubMemberships?.find(
    (item) =>
      item.status === "ACTIVE" && item.club.collegeId === membership?.collegeId,
  )?.role;
  const managementNav = useMemo(() => {
    const items: NavItem[] = [...collegeRoleNav];
    const pathnameClubId = pathname.match(/^\/dashboard\/clubs\/([^/]+)/)?.[1];
    const contextualClub =
      managedClubs.data?.find((item) => item.club.id === pathnameClubId) ??
      managedClubs.data?.[0];
    const firstMentored = managedClubs.data?.find((item) => item.access.role === "CLUB_MENTOR");
    const operationalClub = managedClubs.data?.find(
      (item) =>
        item.access.role !== "CLUB_MENTOR" &&
        (item.access.canManageClub || item.access.role === "CLUB_SUB_LEAD"),
    );
    if (contextualClub) {
      items.unshift(
        ...clubNavigation(contextualClub.club.id, contextualClub.access).map(
          (item) => ({
            href: item.href,
            label: item.label,
            icon: clubNavigationIcons[item.key],
          }),
        ),
      );
    }
    if (operationalClub) {
      items.unshift({
        href: "/club-admin/dashboard",
        label: "Club Workspaces",
        icon: ShieldCheck,
      });
    }
    if (firstMentored) {
      items.unshift({
        href: "/faculty/dashboard",
        label: "Mentored Clubs",
        icon: GraduationCap,
      });
    }
    return items;
  }, [managedClubs.data, pathname]);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.localStorage.removeItem(ACTIVE_COLLEGE_STORAGE_KEY);
    queryClient.clear();
    router.replace("/login");
    router.refresh();
  }

  function changeCollege(collegeId: string) {
    window.localStorage.setItem(ACTIVE_COLLEGE_STORAGE_KEY, collegeId);
    window.dispatchEvent(new Event("unisphere:tenant-change"));
    void queryClient.invalidateQueries();
  }

  function submitGlobalSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = globalSearch.trim();
    router.push(query ? `/dashboard/events?search=${encodeURIComponent(query)}` : "/dashboard/events");
  }

  const shell = (
    <aside className={collapsed ? "portal-sidebar collapsed" : "portal-sidebar"}>
      <div className="portal-sidebar-top">
        <Link className="brand portal-brand" href="/dashboard" title="UniSphere Dashboard">
          <span className="brand-mark">U</span>
          {!collapsed ? (
            <span className="portal-brand-copy">
              <strong>UniSphere</strong>
              <small>Campus OS</small>
            </span>
          ) : null}
        </Link>
        <button
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="sidebar-collapse"
          onClick={() => setCollapsed((value) => !value)}
          type="button"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {!collapsed ? (
        <div className="tenant-card">
          <div className="tenant-icon-box" aria-hidden="true">
            <GraduationCap size={16} />
          </div>
          <div className="tenant-info">
            <strong>{membership?.college.name ?? "UniSphere"}</strong>
            <p><span className="tenant-live-dot" />{roleLabel(activeClubRole ?? membership?.role)}</p>
          </div>
        </div>
      ) : null}

      {!collapsed && user && user.memberships.filter((item) => item.status === "ACTIVE").length > 1 ? (
        <label className="tenant-switcher">
          <span>College</span>
          <select value={membership?.collegeId} onChange={(event) => changeCollege(event.target.value)}>
            {user.memberships
              .filter((item) => item.status === "ACTIVE")
              .map((item) => (
                <option key={item.id} value={item.collegeId}>
                  {item.college.name}
                </option>
              ))}
          </select>
        </label>
      ) : null}

      <div className="portal-nav-scroll">
        <NavGroup title="Discover" items={generalNav} pathname={pathname} roles={activeRoles} collapsed={collapsed} />
        <NavGroup title="My Campus" items={activityNavWithBadge(summary.data?.unreadNotifications ?? 0)} pathname={pathname} roles={activeRoles} collapsed={collapsed} />
        <NavGroup title="Intelligence" items={intelligenceNav} pathname={pathname} roles={activeRoles} collapsed={collapsed} />
        <NavGroup title="Management" items={managementNav} pathname={pathname} roles={activeRoles} collapsed={collapsed} />
      </div>

      <div className="portal-sidebar-bottom">
        {!collapsed ? (
          <>
            <ApiStatus health={health.data ?? null} compact />
            <div className="profile-block">
              <span className="profile-avatar-pill">{user?.firstName.charAt(0).toUpperCase() ?? "U"}</span>
              <div className="profile-info">
                <strong>{user ? `${user.firstName} ${user.lastName}` : "Loading..."}</strong>
                <p>{user?.email ?? "Checking session"}</p>
              </div>
            </div>
            <button className="sidebar-logout" onClick={signOut} disabled={signingOut} title="Sign out of UniSphere">
              <DoorOpen aria-hidden="true" size={17} />
              <span>{signingOut ? "Signing out..." : "Sign out"}</span>
            </button>
          </>
        ) : (
          <div className="collapsed-bottom-rail">
            <div className="profile-avatar-pill" title={user ? `${user.firstName} ${user.lastName} (${user.email})` : "User Profile"}>
              {user?.firstName.charAt(0).toUpperCase() ?? "U"}
            </div>
            <button
              className="collapsed-icon-btn"
              onClick={signOut}
              disabled={signingOut}
              title="Sign out of UniSphere"
              aria-label="Sign out"
            >
              <DoorOpen aria-hidden="true" size={18} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <div className={collapsed ? "portal-shell collapsed" : "portal-shell"}>
      {shell}
      {drawerOpen ? (
        <div className="mobile-drawer" role="dialog" aria-modal="true">
          <button
            className="mobile-drawer-close"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            type="button"
          >
            <X size={18} />
          </button>
          {shell}
        </div>
      ) : null}
      <div className="portal-main">
        <div className="portal-ambient" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="portal-spatial-scene" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="portal-spatial-panorama"
            src="/media/campus-command-center.webp"
            alt=""
          />
          <div className="portal-orbit-stage">
            <span className="orbit-line orbit-line-one" />
            <span className="orbit-line orbit-line-two" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="portal-orbit-object"
              src="/media/campus-orbit.webp"
              alt=""
            />
          </div>
        </div>
        <header className="portal-topbar">
          <button
            aria-label="Open navigation"
            className="mobile-menu-button"
            onClick={() => setDrawerOpen(true)}
            type="button"
          >
            <Menu size={18} />
          </button>
          <div className="portal-topbar-context">
            <p className="eyebrow">{membership?.college.name ?? "UNISPHERE"}</p>
            <h2>{user ? `${greeting()}, ${user.firstName}` : "Campus command center"}</h2>
            <span className="command-status"><i /> Live workspace</span>
          </div>
          <form className="portal-search" onSubmit={submitGlobalSearch}>
            <Search aria-hidden="true" size={17} />
            <input
              aria-label="Search events"
              onChange={(event) => setGlobalSearch(event.target.value)}
              placeholder="Search events"
              ref={searchRef}
              value={globalSearch}
            />
            <kbd>⌘/Ctrl K</kbd>
          </form>
          <div className="portal-live-visual" title="Live campus digital twin">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/media/campus-digital-twin.gif" alt="" />
            <span>
              <small>Spatial campus</small>
              <strong><i /> Digital twin live</strong>
            </span>
          </div>
          <Link className="topbar-icon" href="/dashboard/notifications" aria-label="Notifications">
            <Bell size={18} />
          </Link>
          <ThemeToggle />
          <Link className="topbar-avatar" href="/dashboard/profile" aria-label="Profile">
            {user?.firstName.charAt(0).toUpperCase() ?? "U"}
          </Link>
        </header>
        {tenantReady ? (
          children
        ) : (
          <main className="portal-content">
            <div className="dashboard-skeleton hero" />
          </main>
        )}
      </div>
    </div>
  );
}
