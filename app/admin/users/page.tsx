"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  referralCode: string | null;
  kycStatus: string | null;
  challenges: number;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadUsers() {
    try {
      const response = await fetch("/api/admin/users", {
        cache: "no-store",
      });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to load users.");
        return;
      }

      setUsers(data.users || []);
    } catch (error) {
      console.error("Users error:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const query = search.toLowerCase();

    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.referralCode?.toLowerCase().includes(query)
    );
  });

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-500">
              Mivo Capital Admin
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Users
            </h1>

            <p className="mt-2 text-gray-400">
              View and manage registered traders.
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-lg border border-zinc-700 px-5 py-3 font-bold hover:border-green-500 hover:text-green-400"
          >
            ← Admin Dashboard
          </Link>
        </div>

        {/* SEARCH */}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email or referral code..."
            className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-green-500"
          />

          <p className="text-sm text-gray-500">
            {filteredUsers.length} users
          </p>
        </div>

        {/* USERS */}

        <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          {loading ? (
            <div className="p-10 text-center text-gray-400">
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              No users found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[1000px]">
                <div className="grid grid-cols-[1.2fr_1.5fr_.7fr_.8fr_.8fr_1fr_80px] gap-4 border-b border-zinc-800 bg-zinc-950 px-6 py-4 text-xs font-bold uppercase text-gray-500">
                  <div>Name</div>
                  <div>Email</div>
                  <div>Role</div>
                  <div>KYC</div>
                  <div>Accounts</div>
                  <div>Joined</div>
                  <div></div>
                </div>

                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="grid grid-cols-[1.2fr_1.5fr_.7fr_.8fr_.8fr_1fr_80px] items-center gap-4 border-b border-zinc-800 px-6 py-5 last:border-0"
                  >
                    <div>
                      <p className="font-bold">
                        {user.name}
                      </p>

                      {user.referralCode && (
                        <p className="mt-1 text-xs text-green-400">
                          {user.referralCode}
                        </p>
                      )}
                    </div>

                    <div className="text-sm text-gray-300">
                      {user.email}
                    </div>

                    <div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          user.role === "ADMIN"
                            ? "bg-purple-500/10 text-purple-400"
                            : "bg-zinc-800 text-gray-300"
                        }`}
                      >
                        {user.role}
                      </span>
                    </div>

                    <div>
                      <KycBadge status={user.kycStatus} />
                    </div>

                    <div className="font-bold">
                      {user.challenges}
                    </div>

                    <div className="text-sm text-gray-400">
                      {new Date(
                        user.createdAt
                      ).toLocaleDateString()}
                    </div>

                    <Link
                      href={`/admin/users/${user.id}`}
                      className="font-bold text-green-400 hover:text-green-300"
                    >
                      View →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function KycBadge({
  status,
}: {
  status: string | null;
}) {
  if (status === "APPROVED") {
    return (
      <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-400">
        Verified
      </span>
    );
  }

  if (status === "PENDING") {
    return (
      <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-400">
        Pending
      </span>
    );
  }

  if (status === "REJECTED") {
    return (
      <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400">
        Rejected
      </span>
    );
  }

  return (
    <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-gray-400">
      Not Verified
    </span>
  );
}