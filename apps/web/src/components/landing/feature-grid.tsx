import {
  Bell,
  Bot,
  CalendarDays,
  Compass,
  FileBadge,
  GraduationCap,
  Home,
  Landmark,
  LineChart,
  Map,
  QrCode,
  Utensils,
  UsersRound,
} from "lucide-react";

import { Reveal } from "@/components/motion/reveal";

const features = [
  ["Events", "Publish, approve, register, check in, and certify activity.", CalendarDays],
  ["Clubs", "Run communities with memberships, roles, and live event pipelines.", UsersRound],
  ["Faculty", "Coordinate departments, mentoring, office hours, and approvals.", GraduationCap],
  ["AI Assistant", "Answer campus questions from trusted university context.", Bot],
  ["Opportunities", "Surface internships, hackathons, calls, and scholarships.", Compass],
  ["Mess", "Menus, feedback, schedules, and service notices in one place.", Utensils],
  ["Hostels", "Requests, updates, permissions, and resident workflows.", Home],
  ["Notifications", "Targeted alerts across college, role, club, and event.", Bell],
  ["Certificates", "Verified participation records and downloadable certificates.", FileBadge],
  ["QR Attendance", "Fast event entry, anti-duplicate scanning, and audit trails.", QrCode],
  ["Campus Map", "Venues, services, routes, and discovery for new students.", Map],
  ["Analytics", "Participation, engagement, operations, and growth insight.", LineChart],
  ["Activity Profile", "A trusted record of student contribution and skill growth.", Landmark],
] as const;

export function FeatureGrid() {
  return (
    <section className="section band" id="platform">
      <Reveal className="section-heading">
        <p className="eyebrow">EVERYTHING YOUR CAMPUS NEEDS</p>
        <h2>A product ecosystem for daily campus operations.</h2>
        <p>
          UniSphere connects student life and administration without turning campus
          work into scattered spreadsheets, group chats, and manual approvals.
        </p>
      </Reveal>
      <div className="feature-grid">
        {features.map(([title, body, Icon], index) => (
          <Reveal key={title} delay={Math.min(index * 0.025, 0.2)}>
            <article className="feature-card">
              <div className="feature-icon">
                <Icon size={19} aria-hidden="true" />
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
              <span className="feature-indicator" aria-hidden="true" />
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
