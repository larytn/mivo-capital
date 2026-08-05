"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      alert("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Login failed");
        return;
      }

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("LOGIN ERROR:", error);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter" && !loading) {
      handleLogin();
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

        {/* LOGIN CARD */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl sm:p-8">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500 sm:text-xs">
              Welcome Back
            </p>

            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              Login to Your Account
            </h1>

            <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-gray-500 sm:text-sm">
              Access your dashboard, trading accounts and Mivo
              Capital services.
            </p>
          </div>

          {/* EMAIL */}
          <div className="mt-7">
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
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-green-500 disabled:opacity-60 sm:py-4"
            />
          </div>

          {/* LOGIN */}
          <button
            type="button"
            onClick={handleLogin}
            disabled={
              loading ||
              !email.trim() ||
              !password
            }
            className="mt-6 w-full rounded-xl bg-green-500 px-6 py-3.5 text-sm font-black text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 sm:py-4"
          >
            {loading ? "Logging In..." : "Login"}
          </button>

          {/* SIGNUP */}
          <p className="mt-6 text-center text-xs text-gray-400 sm:text-sm">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-bold text-green-500 transition hover:text-green-400"
            >
              Sign Up
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