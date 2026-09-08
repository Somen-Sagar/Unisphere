"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CampusUser, Membership, MembershipRole } from "@unisphere/types";
import {
  Bell,
  BookOpenCheck,
  Bot,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  DoorOpen,
  FileBadge,
  GraduationCap,
  Home,
  IdCard,
  LayoutDashboard,
  Map,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Ticket,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { PropsWithChildren } from "react";
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
  { href: "/dashboard/opportunities", label: "Opportunities", icon: Sparkles },
];

const activityNav: NavItem[] = [
  { href: "/dashboard/passes", label: "My Passes", icon: Ticket },
  { href: "/dashboard/certificates", label: "Certificates", icon: FileBadge },
  { href: "/dashboard/calendar", label: "Calendar", icon: BookOpenCheck },
];

const intelligenceNav: NavItem[] = [
  { href: "/dashboard/ai", label: "UniSphere AI", icon: Bot },
  {
    href: "/college-admin/dashboard",
    label: "Analytics",
    icon: CircleGauge,
    roles: ["COLLEGE_ADMIN", "PLATFORM_ADMIN"],
  },
];

const campusNav: NavItem[] = [
  { href: "/dashboard/services", label: "Campus Services", icon: Building2 },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell, badge: "0" },
  { href: "/dashboard/profile", label: "Profile", icon: IdCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
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
      <p>{collapsed ? title.slice(0, 1) : title}</p>
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
              <span>{item.label}</span>
              {item.badge ? <small>{item.badge}</small> : null}
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

  const shell = (
    <aside className={collapsed ? "portal-sidebar collapsed" : "portal-sidebar"}>
      <div className="portal-sidebar-top">
        <Link className="brand portal-brand" href="/dashboard">
          <span className="brand-mark">U</span>
          <span>UniSphere</span>
        </Link>
        <button
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="sidebar-collapse"
          onClick={() => setCollapsed((value) => !value)}
          type="button"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <div className="tenant-card">
        <span className="tenant-mark">{membership?.college.name.charAt(0) ?? "U"}</span>
        <div>
          <strong>{membership?.college.name ?? "UniSphere"}</strong>
          <p>{roleLabel(membership?.role)}</p>
        </div>
      </div>

      {user && user.memberships.filter((item) => item.status === "ACTIVE").length > 1 ? (
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
        <NavGroup title="General" items={generalNav} pathname={pathname} roles={activeRoles} collapsed={collapsed} />
        <NavGroup title="Activity" items={activityNav} pathname={pathname} roles={activeRoles} collapsed={collapsed} />
        <NavGroup title="Intelligence" items={intelligenceNav} pathname={pathname} roles={activeRoles} collapsed={collapsed} />
        <NavGroup title="Campus" items={campusNav} pathname={pathname} roles={activeRoles} collapsed={collapsed} />
        <NavGroup title="Role" items={roleNav} pathname={pathname} roles={activeRoles} collapsed={collapsed} />
      </div>

      <div className="portal-sidebar-bottom">
        <ApiStatus health={health.data ?? null} compact />
        <div className="profile-block">
          <span>{user?.firstName.charAt(0).toUpperCase() ?? "U"}</span>
          <div>
            <strong>{user ? `${user.firstName} ${user.lastName}` : "Loading..."}</strong>
            <p>{user?.email ?? "Checking session"}</p>
          </div>
        </div>
        <button className="sidebar-logout" onClick={signOut} disabled={signingOut}>
          <DoorOpen aria-hidden="true" size={17} />
          <span>{signingOut ? "Signing out..." : "Sign out"}</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="portal-shell">
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
            <h2>Campus command center</h2>
          </div>
          <label className="portal-search">
            <Search aria-hidden="true" size={17} />
            <input placeholder="Search events, clubs, services" />
            <kbd>Ctrl K</kbd>
          </label>
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
