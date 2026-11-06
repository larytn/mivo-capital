"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/app/components/brand-logo";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      alert("Enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Admin login failed.");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch (error) {
      console.error("Admin login error:", error);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-5 text-white">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <div className="text-center">
          <Link href="/" aria-label="Mivo Capital home" className="inline-flex justify-center">
            <BrandLogo className="h-24 w-40" priority tone="dark" />
          </Link>

          <h1 className="mt-3 text-3xl font-black">
            Admin Login
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Sign in to the Mivo Capital control center.
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-8">
          <label className="text-sm text-gray-400">
            Admin Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@mivocapital.com"
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-black p-4 outline-none focus:border-green-500"
          />

          <label className="mt-5 block text-sm text-gray-400">
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-black p-4 outline-none focus:border-green-500"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-green-500 py-4 font-bold text-black transition hover:bg-green-400 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Login to Admin"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-white"
          >
            ← Back to Mivo Capital
          </Link>
        </div>
      </div>
    </main>
  );
}
