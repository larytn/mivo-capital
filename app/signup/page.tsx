"use client";

import { Suspense, useState } from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import Link from "next/link";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const referralCode = searchParams.get("ref");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (
      loading ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/signup", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          referralCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Signup failed");
        return;
      }

      alert(
        data.message ||
          "Account created successfully!"
      );

      router.push("/login");
    } catch (error) {
      console.error("SIGNUP ERROR:", error);

      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter" && !loading) {
      handleSignup();
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-8 text-white sm:px-6">
      <div className="w-full max-w-md">
        {/* BRAND */}
        <div className="mb-7 text-center sm:mb-8">
          <Link
            href="/"
            className="inline-block text-2xl font-black tracking-tight text-green-500 sm:text-3xl"
          >
            Mivo Capital
          </Link>

          <p className="mt-2 text-xs text-gray-500 sm:text-sm">
            Trade. Perform. Get Funded.
          </p>
        </div>

        {/* SIGNUP CARD */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl sm:p-8">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500 sm:text-xs">
              Get Started
            </p>

            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              Create Your Account
            </h1>

            <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-gray-500 sm:text-sm">
              Join Mivo Capital and start your journey toward a
              funded trading account.
            </p>
          </div>

          {/* REFERRAL */}
          {referralCode && (
            <div className="mt-6 rounded-xl border border-green-500/20 bg-green-500/[0.08] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Referral Code
              </p>

              <p className="mt-1 break-all text-sm font-bold text-green-400">
                {referralCode}
              </p>
            </div>
          )}

          {/* FULL NAME */}
          <div className="mt-7">
            <label
              htmlFor="name"
              className="mb-2 block text-xs font-medium text-gray-400 sm:text-sm"
            >
              Full Name
            </label>

            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-green-500 disabled:opacity-60 sm:py-4"
            />
          </div>

          {/* EMAIL */}
          <div className="mt-4">
            <label
              htmlFor="email"
              className="mb-2 block text-xs font-medium text-gray-400 sm:text-sm"
            >
              Email Address
            </label>

            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-green-500 disabled:opacity-60 sm:py-4"
            />
          </div>

          {/* PASSWORD */}
          <div className="mt-4">
            <label
              htmlFor="password"
              className="mb-2 block text-xs font-medium text-gray-400 sm:text-sm"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-green-500 disabled:opacity-60 sm:py-4"
            />
          </div>

          {/* CREATE ACCOUNT */}
          <button
            type="button"
            onClick={handleSignup}
            disabled={
              loading ||
              !name.trim() ||
              !email.trim() ||
              !password
            }
            className="mt-6 w-full rounded-xl bg-green-500 px-6 py-3.5 text-sm font-black text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 sm:py-4"
          >
            {loading
              ? "Creating Account..."
              : "Create Account"}
          </button>

          {/* LOGIN */}
          <p className="mt-6 text-center text-xs text-gray-400 sm:text-sm">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-green-500 transition hover:text-green-400"
            >
              Login
            </Link>
          </p>
        </section>

        {/* BACK */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs text-gray-500 transition hover:text-white sm:text-sm"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-black text-white">
          <p className="text-sm font-bold text-green-500">
            Loading...
          </p>
        </main>
      }
    >
      <SignupContent />
    </Suspense>
  );
}