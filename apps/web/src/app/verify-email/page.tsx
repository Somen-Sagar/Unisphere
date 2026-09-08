import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <main className="auth-page">
      <Link className="brand auth-brand" href="/">
        <span className="brand-mark">U</span>
        <span>UniSphere</span>
      </Link>
      <section className="auth-card">
        <p className="eyebrow">EMAIL VERIFICATION</p>
        <h1>Verification opens after campus email delivery is connected.</h1>
        <p className="auth-intro">
          The current API supports authenticated sessions and pending memberships.
          Email verification can be activated once the backend mail provider exists.
        </p>
        <Link className="button button-primary form-submit" href="/dashboard">
          Continue to dashboard
        </Link>
      </section>
    </main>
  );
}
