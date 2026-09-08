"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { UniSphereApiError } from "@unisphere/api-client";
import type { CampusUser } from "@unisphere/types";
import { loginSchema, type LoginInput } from "@unisphere/validation";
import { Eye, EyeOff } from "lucide-react";
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
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

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
    <section className="auth-card">
      <p className="eyebrow">WELCOME BACK</p>
      <h1>Sign in to UniSphere.</h1>
      <p className="auth-intro">
        Your secure web session is stored with HTTP-only cookies and validated by
        the UniSphere API.
      </p>
      <form className="auth-form" onSubmit={handleSubmit((input) => mutation.mutate(input))}>
        <label>
          College email
          <input
            type="email"
            autoComplete="email"
            placeholder="you@college.edu"
            {...register("email")}
          />
          {errors.email ? <span className="field-error">{errors.email.message}</span> : null}
        </label>
        <label>
          Password
          <span className="field-with-action">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Your password"
              {...register("password")}
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
          {errors.password ? (
            <span className="field-error">{errors.password.message}</span>
          ) : null}
        </label>
        <label className="checkbox-label">
          <input type="checkbox" />
          <span>Remember this browser</span>
        </label>
        {mutation.isError ? <p className="form-error">{errorMessage(mutation.error)}</p> : null}
        <button className="button button-primary form-submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <div className="auth-links">
        <Link href="/forgot-password">Forgot password?</Link>
        <Link href="/register">Create account</Link>
      </div>
    </section>
  );
}
