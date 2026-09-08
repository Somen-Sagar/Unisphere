import Link from "next/link";

import { CampusNetwork } from "@/components/landing/campus-network";
import { Reveal } from "@/components/motion/reveal";
import { ApiStatus, SystemStatusCard } from "@/components/system/api-status";
import type { UniSphereHealth } from "@unisphere/api-client";

export function Hero({ health }: { health: UniSphereHealth | null }) {
  return (
    <section className="hero-section">
      <div className="hero-copy">
        <Reveal>
          <p className="eyebrow">THE CAMPUS OPERATING SYSTEM</p>
          <h1>
            Your entire campus.
            <span>One intelligent universe.</span>
          </h1>
          <p className="lede">
            Events, clubs, faculty, AI, opportunities, mess, hostel, services,
            and verified student life connected inside one secure ecosystem.
          </p>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="hero-actions">
            <Link className="button button-primary magnetic" href="/register">
              Join UniSphere
            </Link>
            <a className="button button-secondary" href="#platform">
              Explore the platform
            </a>
          </div>
        </Reveal>
        <Reveal delay={0.18}>
          <div className="hero-status-row">
            <ApiStatus health={health} />
            <span>Multi-college ready</span>
            <span>Secure by default</span>
          </div>
        </Reveal>
      </div>

      <div className="hero-visual">
        <CampusNetwork />
        <SystemStatusCard health={health} />
      </div>
    </section>
  );
}
