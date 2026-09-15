"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CampusUser, Membership, MembershipRole } from "@unisphere/types";
import {
  Bell,
  BookOpenCheck,
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  GraduationCap,
  Home,
  IdCard,
  LayoutDashboard,
  Map,
  Menu,
  Search,
  ShieldCheck,
  Ticket,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { FormEvent, PropsWithChildren } from "react";
import { useEffect, useMemo, useState } from "react";

import { ApiStatus } from "@/components/system/api-status";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { api } from "@/lib/api/client";

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

const roleNav: NavItem[] = [
  { href: "/faculty/dashboard", label: "Faculty", icon: GraduationCap, roles: ["FACULTY", "DEPARTMENT_ADMIN"] },
  { href: "/club-admin/dashboard", label: "Club Admin", icon: ShieldCheck, roles: ["CLUB_ADMIN", "COLLEGE_ADMIN"] },
  { href: "/college-admin/dashboard", label: "College Admin", icon: Home, roles: ["COLLEGE_ADMIN"] },
  { href: "/platform-admin/dashboard", label: "Platform Admin", icon: Map, roles: ["PLATFORM_ADMIN"] },
];

function activeMembership(user: CampusUser | null): Membership | null {
  if (!user) return null;
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

function roleLabel(role?: MembershipRole): string {
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

  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => api.session(),
    retry: false,
  });
  const health = useQuery({
    queryKey: ["backend-health"],
    queryFn: () => api.health(),
    refetchInterval: 60_000,
  });
  const summary = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => api.dashboardSummary(),
    enabled: Boolean(session.data?.user.memberships.some((item) => item.status === "ACTIVE")),
  });

  const user = session.data?.user ?? null;
  const membership = activeMembership(user);
  const activeRoles = useMemo(
    () =>
      user?.memberships
        .filter((item) => item.status === "ACTIVE")
        .map((item) => item.role) ?? [],
    [user],
  );

  useEffect(() => {
    if (!membership || typeof window === "undefined") return;
    const stored = window.localStorage.getItem("unisphere.activeCollegeId");
    if (!stored && membership.status === "ACTIVE") {
      window.localStorage.setItem("unisphere.activeCollegeId", membership.collegeId);
    }
  }, [membership]);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    queryClient.clear();
    router.replace("/login");
    router.refresh();
  }

  function changeCollege(collegeId: string) {
    window.localStorage.setItem("unisphere.activeCollegeId", collegeId);
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
          {!collapsed ? <span>UniSphere</span> : null}
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
            <p>{roleLabel(membership?.role)}</p>
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
        <NavGroup title="Management" items={roleNav} pathname={pathname} roles={activeRoles} collapsed={collapsed} />
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
        <header className="portal-topbar">
          <button
            aria-label="Open navigation"
            className="mobile-menu-button"
            onClick={() => setDrawerOpen(true)}
            type="button"
          >
            <Menu size={18} />
          </button>
          <div>
            <p className="eyebrow">{membership?.college.name ?? "UNISPHERE"}</p>
            <h2>{user ? `${greeting()}, ${user.firstName}` : "Campus command center"}</h2>
          </div>
          <form className="portal-search" onSubmit={submitGlobalSearch}>
            <Search aria-hidden="true" size={17} />
            <input
              aria-label="Search events"
              onChange={(event) => setGlobalSearch(event.target.value)}
              placeholder="Search events"
              value={globalSearch}
            />
            <kbd>Ctrl K</kbd>
          </form>
          <Link className="topbar-icon" href="/dashboard/notifications" aria-label="Notifications">
            <Bell size={18} />
          </Link>
          <ThemeToggle />
          <Link className="topbar-avatar" href="/dashboard/profile" aria-label="Profile">
            {user?.firstName.charAt(0).toUpperCase() ?? "U"}
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}
