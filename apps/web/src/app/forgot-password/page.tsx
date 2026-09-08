import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <Link className="brand auth-brand" href="/">
        <span className="brand-mark">U</span>
        <span>UniSphere</span>
      </Link>
      <section className="auth-card">
        <p className="eyebrow">ACCOUNT RECOVERY</p>
        <h1>Password recovery is pending backend email setup.</h1>
        <p className="auth-intro">
          UniSphere has not exposed a password reset endpoint in this workspace yet.
          This route is reserved for the production email flow.
        </p>
        <Link className="button button-secondary form-submit" href="/login">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
