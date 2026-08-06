"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);

      await signIn("google", {
        callbackUrl: "/dashboard",
      });
    } catch (error) {
      console.error("GOOGLE LOGIN ERROR:", error);

      alert(
        "Unable to continue with Google. Please try again."
      );

      setGoogleLoading(false);
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (
      event.key === "Enter" &&
      !loading &&
      !googleLoading
    ) {
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

          {/* GOOGLE LOGIN */}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-white px-6 py-3.5 text-sm font-bold text-black transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:py-4"
          >
            {!googleLoading && (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M21.35 12.21c0-.74-.07-1.45-.19-2.13H12v4.03h5.24a4.48 4.48 0 0 1-1.94 2.94v2.61h3.14c1.84-1.69 2.91-4.18 2.91-7.45Z"
                />

                <path
                  fill="#34A853"
                  d="M12 21.72c2.62 0 4.82-.87 6.43-2.36l-3.14-2.61c-.87.58-1.98.93-3.29.93-2.53 0-4.67-1.71-5.44-4.01H3.32v2.7A9.72 9.72 0 0 0 12 21.72Z"
                />

                <path
                  fill="#FBBC05"
                  d="M6.56 13.67A5.84 5.84 0 0 1 6.25 12c0-.58.1-1.14.31-1.67v-2.7H3.32A9.72 9.72 0 0 0 2.28 12c0 1.57.38 3.06 1.04 4.37l3.24-2.7Z"
                />

                <path
                  fill="#EA4335"
                  d="M12 6.32c1.43 0 2.71.49 3.72 1.45l2.78-2.78A9.32 9.32 0 0 0 12 2.28a9.72 9.72 0 0 0-8.68 5.35l3.24 2.7C7.33 8.03 9.47 6.32 12 6.32Z"
                />
              </svg>
            )}

            {googleLoading
              ? "Connecting to Google..."
              : "Continue with Google"}
          </button>

          {/* DIVIDER */}

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-zinc-800" />

            <span className="text-xs font-medium uppercase text-gray-600">
              Or continue with email
            </span>

            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          {/* EMAIL */}

          <div>
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
              onChange={(e) =>
                setEmail(e.target.value)
              }
              onKeyDown={handleKeyDown}
              disabled={loading || googleLoading}
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
              onChange={(e) =>
                setPassword(e.target.value)
              }
              onKeyDown={handleKeyDown}
              disabled={loading || googleLoading}
              className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-green-500 disabled:opacity-60 sm:py-4"
            />
          </div>

          {/* FORGOT PASSWORD */}

          <div className="mt-3 text-right">
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-green-500 transition hover:text-green-400 sm:text-sm"
            >
              Forgot Password?
            </Link>
          </div>

          {/* LOGIN */}

          <button
            type="button"
            onClick={handleLogin}
            disabled={
              loading ||
              googleLoading ||
              !email.trim() ||
              !password
            }
            className="mt-6 w-full rounded-xl bg-green-500 px-6 py-3.5 text-sm font-black text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 sm:py-4"
          >
            {loading
              ? "Logging In..."
              : "Login"}
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