"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { CampusUser, CollegeSummary } from "@unisphere/types";
import { webRegisterSchema } from "@unisphere/validation";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { api } from "@/lib/api/client";
import { dashboardRouteForUser } from "@/lib/auth/dashboard-route";

type WebRegisterInput = z.infer<typeof webRegisterSchema>;
type CollegeFormErrors = {
  collegeId?: { message?: string };
  studentId?: { message?: string };
  name?: { message?: string };
  website?: { message?: string };
  emailDomain?: { message?: string };
  city?: { message?: string };
  state?: { message?: string };
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Registration failed.";
}

function toRegisterPayload(input: WebRegisterInput) {
  return {
    email: input.email,
    password: input.password,
    firstName: input.firstName,
    lastName: input.lastName,
    role: input.role,
    termsAccepted: input.termsAccepted,
    college: input.college,
  };
}

export function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"join" | "create">("join");
  const colleges = useQuery({
    queryKey: ["colleges"],
    queryFn: () => api.colleges(),
  });

  const defaultCollegeId = useMemo(
    () => colleges.data?.[0]?.id ?? "",
    [colleges.data],
  );

  const {
    formState: { errors },
    handleSubmit,
    register,
    resetField,
    setValue,
  } = useForm<WebRegisterInput>({
    resolver: zodResolver(webRegisterSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "STUDENT",
      termsAccepted: false as unknown as true,
      college: {
        mode: "join",
        collegeId: "",
        studentId: "",
      },
    },
  });

  const mutation = useMutation({
    mutationFn: (input: WebRegisterInput) => {
      return api.authRequest<{ user: CampusUser }>("register", {
        method: "POST",
        body: JSON.stringify(toRegisterPayload(input)),
      });
    },
    onSuccess: ({ user }) => {
      router.replace(dashboardRouteForUser(user));
      router.refresh();
    },
  });
  const collegeErrors = errors.college as CollegeFormErrors | undefined;

  function chooseMode(nextMode: "join" | "create") {
    setMode(nextMode);
    resetField("college");
    if (nextMode === "join") {
      setValue("college", {
        mode: "join",
        collegeId: defaultCollegeId,
        studentId: "",
      });
    } else {
      setValue("college", {
        mode: "create",
        name: "",
        website: undefined,
        emailDomain: "",
        city: "",
        state: "",
      });
    }
  }

  return (
    <section className="auth-card register-card">
      <p className="eyebrow">JOIN UNISPHERE</p>
      <h1>Create your campus account.</h1>
      <p className="auth-intro">
        Join a verified college or request a new college workspace. New
        memberships begin pending until campus approval.
      </p>

      <form className="auth-form" onSubmit={handleSubmit((input) => mutation.mutate(input))}>
        <div className="form-row">
          <label>
            First name
            <input autoComplete="given-name" {...register("firstName")} />
            {errors.firstName ? (
              <span className="field-error">{errors.firstName.message}</span>
            ) : null}
          </label>
          <label>
            Last name
            <input autoComplete="family-name" {...register("lastName")} />
            {errors.lastName ? (
              <span className="field-error">{errors.lastName.message}</span>
            ) : null}
          </label>
        </div>

        <label>
          College email
          <input type="email" autoComplete="email" {...register("email")} />
          {errors.email ? <span className="field-error">{errors.email.message}</span> : null}
        </label>

        <div className="form-row">
          <label>
            Password
            <span className="field-with-action">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
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
          <label>
            Confirm password
            <input type="password" autoComplete="new-password" {...register("confirmPassword")} />
            {errors.confirmPassword ? (
              <span className="field-error">{errors.confirmPassword.message}</span>
            ) : null}
          </label>
        </div>

        <label>
          Role
          <select {...register("role")}>
            <option value="STUDENT">Student</option>
            <option value="FACULTY">Faculty</option>
            <option value="COLLEGE_ADMIN">College admin</option>
          </select>
        </label>

        <div className="segment-control" aria-label="College onboarding mode">
          <button
            className={mode === "join" ? "active" : ""}
            type="button"
            onClick={() => chooseMode("join")}
          >
            Join college
          </button>
          <button
            className={mode === "create" ? "active" : ""}
            type="button"
            onClick={() => chooseMode("create")}
          >
            Register college
          </button>
        </div>

        {mode === "join" ? (
          <div className="form-row">
            <label>
              College
              <select {...register("college.collegeId")}>
                <option value="">
                  {colleges.isLoading ? "Loading colleges..." : "Choose a college"}
                </option>
                {colleges.data?.map((college: CollegeSummary) => (
                  <option key={college.id} value={college.id}>
                    {college.name}
                    {college.city ? `, ${college.city}` : ""}
                  </option>
                ))}
              </select>
              {mode === "join" && collegeErrors?.collegeId?.message ? (
                <span className="field-error">{collegeErrors.collegeId.message}</span>
              ) : null}
            </label>
            <label>
              Student or employee ID
              <input {...register("college.studentId")} />
            </label>
          </div>
        ) : (
          <>
            <div className="form-row">
              <label>
                College name
                <input {...register("college.name")} />
                {mode === "create" && collegeErrors?.name?.message ? (
                  <span className="field-error">{collegeErrors.name.message}</span>
                ) : null}
              </label>
              <label>
                Official website
                <input type="url" placeholder="https://college.edu" {...register("college.website")} />
              </label>
            </div>
            <div className="form-row">
              <label>
                Email domain
                <input placeholder="college.edu" {...register("college.emailDomain")} />
                {mode === "create" && collegeErrors?.emailDomain?.message ? (
                  <span className="field-error">{collegeErrors.emailDomain.message}</span>
                ) : null}
              </label>
              <label>
                City
                <input {...register("college.city")} />
              </label>
            </div>
            <label>
              State
              <input {...register("college.state")} />
            </label>
          </>
        )}

        <label className="checkbox-label">
          <input type="checkbox" {...register("termsAccepted")} />
          <span>I accept the UniSphere terms and campus verification policy.</span>
          {errors.termsAccepted ? (
            <span className="field-error">{errors.termsAccepted.message}</span>
          ) : null}
        </label>

        {mutation.isError ? <p className="form-error">{errorMessage(mutation.error)}</p> : null}
        <button className="button button-primary form-submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating account..." : "Create account"}
        </button>
      </form>

      <div className="status-strip" aria-label="Membership states">
        <span>Pending</span>
        <span>Verified</span>
        <span>Rejected</span>
      </div>
      <p className="auth-switch">
        Already registered? <Link href="/login">Sign in</Link>
      </p>
    </section>
  );
}
