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

  const referralCode =
    searchParams.get("ref");

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleSignup = async () => {
    if (loading) return;

    try {
      setLoading(true);

      const response = await fetch(
        "/api/signup",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name,
            email,
            password,
            referralCode,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data.error ||
            "Signup failed"
        );

        return;
      }

      alert(
        data.message ||
          "Account created successfully!"
      );

      router.push("/login");
    } catch (error) {
      console.error(
        "SIGNUP ERROR:",
        error
      );

      alert(
        "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-5">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 p-10">
        <h1 className="text-center text-4xl font-bold text-green-500">
          Join Mivo Capital
        </h1>

        <p className="mt-2 text-center text-gray-400">
          Create your trading account
        </p>

        {referralCode && (
          <div className="mt-6 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-center text-sm text-green-400">
            Referral Code:{" "}
            {referralCode}
          </div>
        )}

        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) =>
            setName(
              e.target.value
            )
          }
          className="mt-8 w-full rounded-lg bg-gray-800 p-4 text-white outline-none"
        />

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) =>
            setEmail(
              e.target.value
            )
          }
          className="mt-4 w-full rounded-lg bg-gray-800 p-4 text-white outline-none"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(
              e.target.value
            )
          }
          className="mt-4 w-full rounded-lg bg-gray-800 p-4 text-white outline-none"
        />

        <button
          type="button"
          onClick={handleSignup}
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-green-500 py-4 font-bold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Creating Account..."
            : "Create Account"}
        </button>

        <p className="mt-5 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-green-500 hover:text-green-400"
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

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-black text-white">
          <p className="text-green-500">
            Loading...
          </p>
        </main>
      }
    >
      <SignupContent />
    </Suspense>
  );
}