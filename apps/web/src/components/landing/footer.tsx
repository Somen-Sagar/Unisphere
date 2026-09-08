import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <Link className="brand" href="/">
        <span className="brand-mark">U</span>
        <span>UniSphere</span>
      </Link>
      <p>Campus operations, student life, and institutional intelligence.</p>
      <nav aria-label="Footer navigation">
        <a href="#platform">Platform</a>
        <a href="#ai">AI</a>
        <a href="#security">Security</a>
        <Link href="/login">Sign in</Link>
      </nav>
    </footer>
  );
}
