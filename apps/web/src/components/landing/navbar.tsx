"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";

const links = [
  ["Platform", "#platform"],
  ["Events", "#events"],
  ["Clubs", "#clubs"],
  ["Colleges", "#colleges"],
  ["AI", "#ai"],
  ["About", "#security"],
] as const;

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 12);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
      <nav className="site-nav" aria-label="Primary navigation">
        <Link className="brand" href="/" onClick={() => setOpen(false)}>
          <span className="brand-mark">U</span>
          <span>UniSphere</span>
        </Link>

        <div className="desktop-links">
          {links.map(([label, href]) => (
            <a key={label} href={href}>
              {label}
            </a>
          ))}
        </div>

        <div className="nav-actions">
          <ThemeToggle />
          <Link className="nav-link" href="/login">
            Sign in
          </Link>
          <Link className="button button-sm button-primary" href="/register">
            Join UniSphere
          </Link>
          <button
            className="icon-button mobile-menu-button"
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </nav>

      {open ? (
        <div className="mobile-menu">
          {links.map(([label, href]) => (
            <a key={label} href={href} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
          <Link href="/login" onClick={() => setOpen(false)}>
            Sign in
          </Link>
          <Link className="button button-primary" href="/register" onClick={() => setOpen(false)}>
            Join UniSphere
          </Link>
        </div>
      ) : null}
    </header>
  );
}
