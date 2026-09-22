"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { UniSphereApiError } from "@unisphere/api-client";
import type { CampusUser } from "@unisphere/types";
import { loginSchema, type LoginInput } from "@unisphere/validation";
import { ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { api } from "@/lib/api/client";
import { dashboardRouteForUser } from "@/lib/auth/dashboard-route";

function errorMessage(error: unknown): string {
  if (error instanceof UniSphereApiError) {
    if (error.status === 401) return "The email or password is incorrect.";
    if (error.status === 503) {
      return "UniSphere services are temporarily unavailable. Please try again.";
    }
    return error.message;
  }

  if (error instanceof TypeError) {
    return "Unable to connect to UniSphere. Please try again.";
  }

  return error instanceof Error ? error.message : "Sign in failed.";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const {
    formState: { errors },
    handleSubmit,
    register,
    setValue,
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const fillCredentials = (email: string, pass: string) => {
    setValue("email", email, { shouldValidate: true });
    setValue("password", pass, { shouldValidate: true });
  };

  const mutation = useMutation({
    mutationFn: (input: LoginInput) =>
      api.authRequest<{ user: CampusUser }>("login", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: ({ user }) => {
      const next = searchParams.get("next");
      router.replace(next?.startsWith("/") ? next : dashboardRouteForUser(user));
      router.refresh();
    },
    onError: (error) => {
      if (process.env.NODE_ENV === "development") {
        console.error("UniSphere login failed", error);
      }
    },
  });

  return (
    <section className="auth-card auth-card-elevated">
      <div className="auth-card-header">
        <div className="eyebrow-badge">
          <span className="eyebrow-dot" aria-hidden="true" />
          <span>Campus Portal</span>
        </div>
        <h1>Welcome Back</h1>
        <p className="auth-intro">
          Access your personalized student, club, or faculty workspace.
        </p>
      </div>

      {/* Interactive 1-click demo credentials bar */}
      <div className="demo-credentials-helper">
        <div className="demo-helper-label">
          <Sparkles size={13} aria-hidden="true" />
          <span>Quick Demo Fill:</span>
        </div>
        <div className="demo-pills">
          <button
            type="button"
            className="demo-pill"
            onClick={() => fillCredentials("student@unisphere.local", "UniSphere123!")}
            title="Auto-fill student fixture credentials"
          >
            🎓 Student
          </button>
          <button
            type="button"
            className="demo-pill"
            onClick={() => fillCredentials("organizer@unisphere.local", "UniSphere123!")}
            title="Auto-fill organizer fixture credentials"
          >
            ⚡ Organizer
          </button>
        </div>
      </div>

      <form className="auth-form" onSubmit={handleSubmit((input) => mutation.mutate(input))}>
        <label>
          <span>College email</span>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@college.edu"
            {...register("email")}
          />
          {errors.email ? <span className="field-error">{errors.email.message}</span> : null}
        </label>

        <label>
          <span>Password</span>
          <div className="field-with-action">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••••••"
              {...register("password")}
            />
            <button
              type="button"
              className="input-action-btn"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password ? (
            <span className="field-error">{errors.password.message}</span>
          ) : null}
        </label>

        <div className="auth-remember-row">
          <label className="checkbox-label">
            <input type="checkbox" />
            <span>Remember browser</span>
          </label>
          <Link href="/forgot-password" className="forgot-link">
            Forgot password?
          </Link>
        </div>

        {mutation.isError ? <p className="form-error">{errorMessage(mutation.error)}</p> : null}

        <button
          type="submit"
          className="button button-primary form-submit auth-submit-btn"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <span className="auth-spinner" aria-hidden="true" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign in to UniSphere</span>
              <ArrowRight size={16} aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <div className="auth-footer-prompt">
        <span>Don&apos;t have an account yet?</span>
        <Link href="/register" className="register-link">
          Create student account
        </Link>
      </div>

      <div className="auth-card-trust">
        <ShieldCheck size={14} aria-hidden="true" />
        <span>HTTP-only token rotation • End-to-end multi-tenant security</span>
      </div>
    </section>
  );
}
