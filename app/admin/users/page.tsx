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
    const query = search.trim().toLowerCase();

    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.referralCode?.toLowerCase().includes(query)
    );
  });

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto w-full max-w-7xl">
        {/* HEADER */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500 sm:text-xs">
                Mivo Capital Admin
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Users
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                View and manage registered traders.
              </p>
            </div>

            <Link
              href="/admin"
              className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-center text-xs font-bold text-gray-300 transition hover:border-green-500 hover:text-green-400 sm:w-auto sm:text-sm"
            >
              ← Admin Dashboard
            </Link>
          </div>
        </section>

        {/* SEARCH */}
        <section className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-md">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email or referral code..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-green-500"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 sm:min-w-[150px]">
              <span className="text-xs text-gray-500">
                Users
              </span>

              <span className="text-sm font-black text-white">
                {loading ? "..." : filteredUsers.length}
              </span>
            </div>
          </div>
        </section>

        {/* LOADING */}
        {loading && (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center text-sm text-gray-500">
            Loading users...
          </div>
        )}

        {/* EMPTY */}
        {!loading && filteredUsers.length === 0 && (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center">
            <p className="font-bold">
              No users found.
            </p>

            {search && (
              <p className="mt-2 text-xs text-gray-500">
                Try a different search.
              </p>
            )}
          </div>
        )}

        {/* MOBILE */}
        {!loading && filteredUsers.length > 0 && (
          <section className="mt-6 space-y-3 lg:hidden">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-base font-black">
                      {user.name}
                    </p>

                    <p className="mt-1 break-all text-xs text-gray-500">
                      {user.email}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      user.role === "ADMIN"
                        ? "bg-purple-500/10 text-purple-400"
                        : "bg-zinc-800 text-gray-300"
                    }`}
                  >
                    {user.role}
                  </span>
                </div>

                {user.referralCode && (
                  <div className="mt-4 rounded-lg border border-green-500/10 bg-green-500/[0.05] px-3 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-gray-600">
                      Referral Code
                    </p>

                    <p className="mt-1 break-all text-xs font-bold text-green-400">
                      {user.referralCode}
                    </p>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <MobileStat
                    label="KYC"
                    value={
                      user.kycStatus === "APPROVED"
                        ? "Verified"
                        : user.kycStatus === "PENDING"
                        ? "Pending"
                        : user.kycStatus === "REJECTED"
                        ? "Rejected"
                        : "Not Verified"
                    }
                  />

                  <MobileStat
                    label="Accounts"
                    value={String(user.challenges)}
                  />

                  <MobileStat
                    label="Joined"
                    value={new Date(
                      user.createdAt
                    ).toLocaleDateString()}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4">
                  <KycBadge status={user.kycStatus} />

                  <Link
                    href={`/admin/users/${user.id}`}
                    className="text-xs font-black text-green-400 transition hover:text-green-300"
                  >
                    View User →
                  </Link>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* DESKTOP */}
        {!loading && filteredUsers.length > 0 && (
          <section className="mt-6 hidden overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 lg:block">
            <div className="overflow-x-auto">
              <div className="min-w-[1000px]">
                <div className="grid grid-cols-[1.2fr_1.5fr_.7fr_.8fr_.8fr_1fr_80px] gap-4 border-b border-zinc-800 bg-zinc-900 px-6 py-4 text-xs font-bold uppercase text-gray-500">
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
                    className="grid grid-cols-[1.2fr_1.5fr_.7fr_.8fr_.8fr_1fr_80px] items-center gap-4 border-b border-zinc-800 px-6 py-5 transition last:border-0 hover:bg-zinc-900/60"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-bold">
                        {user.name}
                      </p>

                      {user.referralCode && (
                        <p className="mt-1 break-all text-xs text-green-400">
                          {user.referralCode}
                        </p>
                      )}
                    </div>

                    <div className="break-all text-sm text-gray-300">
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

                    <div className="font-black">
                      {user.challenges}
                    </div>

                    <div className="text-sm text-gray-400">
                      {new Date(
                        user.createdAt
                      ).toLocaleDateString()}
                    </div>

                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-sm font-bold text-green-400 transition hover:text-green-300"
                    >
                      View →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function MobileStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-black p-3">
      <p className="text-[9px] font-bold uppercase tracking-wide text-gray-600">
        {label}
      </p>

      <p className="mt-1 break-words text-[11px] font-bold text-gray-300">
        {value}
      </p>
    </div>
  );
}

function KycBadge({
  status,
}: {
  status: string | null;
}) {
  if (status === "APPROVED") {
    return (
      <span className="rounded-full bg-green-500/10 px-3 py-1 text-[10px] font-bold text-green-400 sm:text-xs">
        Verified
      </span>
    );
  }

  if (status === "PENDING") {
    return (
      <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-[10px] font-bold text-yellow-400 sm:text-xs">
        Pending
      </span>
    );
  }

  if (status === "REJECTED") {
    return (
      <span className="rounded-full bg-red-500/10 px-3 py-1 text-[10px] font-bold text-red-400 sm:text-xs">
        Rejected
      </span>
    );
  }

  return (
    <span className="rounded-full bg-zinc-800 px-3 py-1 text-[10px] font-bold text-gray-400 sm:text-xs">
      Not Verified
    </span>
  );
}