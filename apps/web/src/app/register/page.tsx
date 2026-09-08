import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <Link className="brand auth-brand" href="/">
        <span className="brand-mark">U</span>
        <span>UniSphere</span>
      </Link>
      <RegisterForm />
    </main>
  );
}
