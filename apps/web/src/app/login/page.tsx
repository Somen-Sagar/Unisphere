import { ArrowLeft, Bot, Calendar, QrCode, ShieldCheck, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function LoginPage() {
  return (
    <main className="auth-split-layout">
      {/* Left Creative Showcase Panel */}
      <section className="auth-showcase" aria-label="UniSphere Campus Features">
        <div className="auth-showcase-backdrop" aria-hidden="true">
          <div className="showcase-orb showcase-orb-1" />
          <div className="showcase-orb showcase-orb-2" />
          <div className="showcase-mesh" />
        </div>

        <div className="auth-showcase-content">
          <Link className="brand showcase-brand" href="/">
            <span className="brand-mark">U</span>
            <span>UniSphere</span>
            <span className="showcase-version-badge">CAMPUS OS</span>
          </Link>

          <div className="showcase-hero-text">
            <h2>
              Your entire campus.
              <span>One intelligent universe.</span>
            </h2>
            <p>
              Experience a unified operating ecosystem for events, student societies,
              instant QR access, faculty approvals, and real-time AI answers.
            </p>
          </div>

          {/* Live Campus Pulse Cards */}
          <div className="showcase-cards">
            <article className="showcase-card showcase-card-event">
              <div className="showcase-card-header">
                <span className="showcase-badge event-badge">
                  <span className="pulse-dot live" aria-hidden="true" />
                  Upcoming Event
                </span>
                <span className="showcase-timestamp">Today, 5:00 PM</span>
              </div>
              <div className="showcase-card-body">
                <div className="showcase-icon-box brand-gradient">
                  <Calendar size={18} aria-hidden="true" />
                </div>
                <div>
                  <strong>HackNova 2026 • Grand Finale</strong>
                  <p>428 participants registered • Main Auditorium</p>
                </div>
              </div>
            </article>

            <article className="showcase-card showcase-card-club">
              <div className="showcase-card-header">
                <span className="showcase-badge club-badge">
                  <Users size={12} aria-hidden="true" />
                  Student Guild
                </span>
                <span className="showcase-timestamp">Active now</span>
              </div>
              <div className="showcase-card-body">
                <div className="showcase-icon-box violet-gradient">
                  <Bot size={18} aria-hidden="true" />
                </div>
                <div>
                  <strong>Robotics &amp; AI Society</strong>
                  <p>Weekly build sprint &amp; flight controller workshop</p>
                </div>
              </div>
            </article>

            <article className="showcase-card showcase-card-pass">
              <div className="showcase-card-header">
                <span className="showcase-badge pass-badge">
                  <QrCode size={12} aria-hidden="true" />
                  Verified Pass
                </span>
                <span className="showcase-timestamp">One-Scan Ready</span>
              </div>
              <div className="showcase-card-body">
                <div className="showcase-icon-box cyan-gradient">
                  <Sparkles size={18} aria-hidden="true" />
                </div>
                <div>
                  <strong>Universal Digital Gate Pass</strong>
                  <p>Cryptographic QR attendance with anti-duplicate guard</p>
                </div>
              </div>
            </article>
          </div>

          {/* Showcase Trust Badges */}
          <div className="showcase-trust-bar">
            <div className="trust-item">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>Multi-College Isolation</span>
            </div>
            <div className="trust-item">
              <Sparkles size={16} aria-hidden="true" />
              <span>Contextual AI Assistant</span>
            </div>
          </div>
        </div>
      </section>

      {/* Right Authentication Chamber */}
      <section className="auth-chamber">
        <header className="auth-top-bar">
          <Link href="/" className="auth-nav-link" title="Return to home page">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Back to overview</span>
          </Link>
          <div className="auth-nav-controls">
            <span className="auth-status-pill">
              <span className="status-dot live" aria-hidden="true" />
              <span>API Live</span>
            </span>
            <ThemeToggle />
          </div>
        </header>

        <div className="auth-card-container">
          <Suspense fallback={<section className="auth-card" aria-busy="true" />}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
