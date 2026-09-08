import { ArrowRight, Bot, Building2, ChartNoAxesCombined, ShieldCheck, Smartphone, UsersRound } from "lucide-react";
import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";

const ecosystem = [
  {
    id: "events",
    title: "Events that move from approval to attendance.",
    body: "Publish cross-college events, manage registration capacity, issue QR passes, scan entry, and convert verified participation into certificates.",
    stat: "QR",
    meta: "Attendance-ready",
  },
  {
    id: "clubs",
    title: "Clubs and communities with operational depth.",
    body: "Give student bodies structured memberships, organizer roles, announcement flows, and a single place to build lasting campus communities.",
    stat: "12",
    meta: "Core activity modules",
  },
  {
    id: "colleges",
    title: "Multi-college from the foundation.",
    body: "Students can join existing colleges or request a new college workspace, while administrators control verification before access expands.",
    stat: "PENDING",
    meta: "Onboarding state",
  },
] as const;

const securityItems = [
  {
    icon: ShieldCheck,
    title: "HTTP-only web sessions",
    body: "The browser receives secure session cookies through Next.js routes.",
  },
  {
    icon: Building2,
    title: "Tenant-aware colleges",
    body: "College status and membership status are first-class database records.",
  },
  {
    icon: UsersRound,
    title: "Role-based foundation",
    body: "Students, faculty, organizers, admins, and platform admins share one model.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Analytics-ready data",
    body: "Events, clubs, attendance, certificates, and profiles feed the campus graph.",
  },
] as const;

export function ProductSections() {
  return (
    <>
      <section className="section ecosystem-section">
        <Reveal className="section-heading narrow">
          <p className="eyebrow">PRODUCT ECOSYSTEM</p>
          <h2>Built around the real campus graph.</h2>
        </Reveal>
        <div className="story-grid">
          {ecosystem.map((item) => (
            <Reveal key={item.id}>
              <article className="story-panel" id={item.id}>
                <span>{item.meta}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <strong>{item.stat}</strong>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section split-section" id="ai">
        <Reveal className="section-copy">
          <p className="eyebrow">CAMPUS AI ASSISTANT</p>
          <h2>Context-aware help without exposing AI keys to the frontend.</h2>
          <p>
            UniSphere AI is designed to answer from backend-approved campus sources:
            events, departments, clubs, notices, services, and opportunities.
          </p>
        </Reveal>
        <Reveal className="ai-preview" delay={0.1}>
          <div className="chat-bubble student">
            <span>student</span>
            <p>What technical events are happening this weekend?</p>
          </div>
          <div className="chat-bubble ai">
            <div>
              <Bot size={17} aria-hidden="true" />
              <span>UniSphere AI</span>
            </div>
            <p>
              3 events match your interests: a cloud lab, a robotics sprint, and
              the design systems workshop.
            </p>
            <ul>
              <li>Source: Events calendar</li>
              <li>Source: Technology Club</li>
              <li>Action: Save to profile</li>
            </ul>
          </div>
        </Reveal>
      </section>

      <section className="section split-section reverse">
        <Reveal className="mobile-preview">
          <div className="phone-frame">
            <div className="phone-top" />
            <div className="phone-card primary-card">
              <span>Today</span>
              <strong>Innovation Hall</strong>
              <small>QR pass ready</small>
            </div>
            <div className="phone-list">
              <span>Mess menu updated</span>
              <span>AI found 4 opportunities</span>
              <span>Certificate issued</span>
            </div>
          </div>
        </Reveal>
        <Reveal className="section-copy" delay={0.1}>
          <p className="eyebrow">MOBILE CONSISTENCY</p>
          <h2>One identity across web, Android, and iOS.</h2>
          <p>
            Shared design tokens now define UniSphere color, spacing, type, radius,
            and shadow direction so the Expo app can follow the same visual system.
          </p>
          <div className="icon-row" aria-label="Platform readiness">
            <span><Smartphone size={16} /> Android ready</span>
            <span><Smartphone size={16} /> iOS ready</span>
          </div>
        </Reveal>
      </section>

      <section className="section security-section" id="security">
        <Reveal className="section-heading">
          <p className="eyebrow">SECURITY AND ARCHITECTURE</p>
          <h2>Designed for real universities, not demo-only flows.</h2>
        </Reveal>
        <div className="security-grid">
          {securityItems.map(({ icon: Icon, title, body }) => (
            <Reveal key={String(title)}>
              <article className="security-item">
                <Icon size={20} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="final-cta">
        <Reveal>
          <p className="eyebrow">UNISPHERE</p>
          <h2>Bring every campus workflow into one intelligent universe.</h2>
          <Link className="button button-primary" href="/register">
            Join UniSphere <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </Reveal>
      </section>
    </>
  );
}
