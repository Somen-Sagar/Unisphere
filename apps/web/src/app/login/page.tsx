import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <Link className="brand auth-brand" href="/">
        <span className="brand-mark">U</span>
        <span>UniSphere</span>
      </Link>
      <Suspense fallback={<section className="auth-card" aria-busy="true" />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
