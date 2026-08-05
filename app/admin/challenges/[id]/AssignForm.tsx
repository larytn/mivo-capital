"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  challengeId: string;
  platform: string;
  broker: string;
  server: string;
  login: string;
  password: string;
  investorPassword: string;
};

export default function AssignForm({
  challengeId,
  platform,
  broker,
  server,
  login,
  password,
  investorPassword,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    platform,
    broker,
    server,
    mt5Login: login,
    mt5Password: password,
    investorPassword,
  });

  async function assign() {
    setLoading(true);

    const res = await fetch("/api/admin/assign-account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        challengeId,
        ...form,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      alert("Failed to assign account");
      return;
    }

    router.push("/admin/challenges");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <input
        className="w-full rounded-lg bg-zinc-800 p-3"
        placeholder="Platform"
        value={form.platform}
        onChange={(e) =>
          setForm({ ...form, platform: e.target.value })
        }
      />

      <input
        className="w-full rounded-lg bg-zinc-800 p-3"
        placeholder="Broker"
        value={form.broker}
        onChange={(e) =>
          setForm({ ...form, broker: e.target.value })
        }
      />

      <input
        className="w-full rounded-lg bg-zinc-800 p-3"
        placeholder="Server"
        value={form.server}
        onChange={(e) =>
          setForm({ ...form, server: e.target.value })
        }
      />

      <input
        className="w-full rounded-lg bg-zinc-800 p-3"
        placeholder="MT5 Login"
        value={form.mt5Login}
        onChange={(e) =>
          setForm({ ...form, mt5Login: e.target.value })
        }
      />

      <input
        className="w-full rounded-lg bg-zinc-800 p-3"
        placeholder="Trader Password"
        value={form.mt5Password}
        onChange={(e) =>
          setForm({ ...form, mt5Password: e.target.value })
        }
      />

      <input
        className="w-full rounded-lg bg-zinc-800 p-3"
        placeholder="Investor Password"
        value={form.investorPassword}
        onChange={(e) =>
          setForm({
            ...form,
            investorPassword: e.target.value,
          })
        }
      />

      <button
        onClick={assign}
        disabled={loading}
        className="w-full rounded-xl bg-green-500 py-4 font-bold text-black"
      >
        {loading ? "Saving..." : "Assign Account"}
      </button>
    </div>
  );
}