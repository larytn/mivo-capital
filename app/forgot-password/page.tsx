"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    if (!email.trim()) {
      alert("Enter your email address.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Something went wrong.");
        return;
      }

      setMessage(
        data.message ||
          "If an account exists with this email, a password reset link has been sent."
      );
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-5 text-white">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-10">
        <h1 className="text-center text-3xl font-black text-green-500 sm:text-4xl">
          Forgot Password?
        </h1>

        <p className="mt-3 text-center text-sm leading-6 text-gray-400">
          Enter the email connected to your Mivo Capital account.
        </p>

        {message && (
          <div className="mt-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm leading-6 text-green-400">
            {message}
          </div>
        )}

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email Address"
          autoComplete="email"
          className="mt-7 w-full rounded-xl border border-zinc-700 bg-black p-4 outline-none transition focus:border-green-500"
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-green-500 py-4 font-bold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Sending..." : "Reset Password"}
        </button>

        <p className="mt-6 text-center text-sm text-gray-400">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-bold text-green-500 hover:text-green-400"
          >
            Login
          </Link>
        </p>

        <div className="mt-4 text-center">
          <Link
            href="/"
            className="text-sm text-gray-500 transition hover:text-white"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}