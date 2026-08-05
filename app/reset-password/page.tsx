"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!token) {
      alert("Invalid password reset link.");
      return;
    }

    if (password.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Unable to reset password.");
        return;
      }

      alert("Password reset successfully.");

      router.push("/login");
    } catch (error) {
      console.error("RESET PASSWORD ERROR:", error);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-5 text-white">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-10">
        <h1 className="text-center text-3xl font-black text-green-500 sm:text-4xl">
          Reset Password
        </h1>

        <p className="mt-3 text-center text-sm text-gray-400">
          Create a new password for your Mivo Capital account.
        </p>

        {!token ? (
          <div className="mt-7 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-400">
            This password reset link is invalid.
          </div>
        ) : (
          <>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New Password"
              autoComplete="new-password"
              className="mt-8 w-full rounded-xl border border-zinc-700 bg-black p-4 outline-none focus:border-green-500"
            />

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm New Password"
              autoComplete="new-password"
              className="mt-4 w-full rounded-xl border border-zinc-700 bg-black p-4 outline-none focus:border-green-500"
            />

            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-green-500 py-4 font-bold text-black transition hover:bg-green-400 disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </>
        )}

        <p className="mt-6 text-center text-sm text-gray-400">
          Back to{" "}
          <Link
            href="/login"
            className="font-bold text-green-500 hover:text-green-400"
          >
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-black text-white">
          Loading...
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}