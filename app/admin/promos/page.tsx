"use client";

import { useEffect, useState } from "react";

type Promo = {
  id: string;
  code: string;
  discountPercent: number;
  active: boolean;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  createdAt: string;
};

export default function AdminPromosPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [code, setCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadPromos() {
    try {
      const response = await fetch("/api/admin/promos", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to load promo codes.");
        return;
      }

      setPromos(data.promos || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPromos();
  }, []);

  async function createPromo() {
    if (!code.trim() || !discountPercent) {
      alert("Enter promo code and discount.");
      return;
    }

    const discount = Number(discountPercent);

    if (discount <= 0 || discount > 100) {
      alert("Discount must be between 1% and 100%.");
      return;
    }

    if (maxUses && Number(maxUses) <= 0) {
      alert("Max uses must be greater than 0.");
      return;
    }

    try {
      setCreating(true);

      const response = await fetch("/api/admin/promos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          discountPercent: discount,
          maxUses: maxUses ? Number(maxUses) : null,
          expiresAt: expiresAt || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to create promo.");
        return;
      }

      setCode("");
      setDiscountPercent("");
      setMaxUses("");
      setExpiresAt("");

      await loadPromos();
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  async function togglePromo(promo: Promo) {
    try {
      setUpdatingId(promo.id);

      const response = await fetch("/api/admin/promos", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promoId: promo.id,
          active: !promo.active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to update promo.");
        return;
      }

      await loadPromos();
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* HEADER */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-500 sm:text-sm">
          Mivo Capital Admin
        </p>

        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          Promo Codes
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400 sm:text-base">
          Create and manage challenge discount codes.
        </p>
      </div>

      {/* CREATE PROMO */}
      <section className="mt-7 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:mt-10 sm:p-6">
        <div>
          <h2 className="text-lg font-bold sm:text-xl">
            Create Promo Code
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Set the discount, usage limit and expiry date.
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-400">
              Promo Code
            </label>

            <input
              value={code}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase())
              }
              placeholder="MIVO20"
              className="w-full min-w-0 rounded-xl border border-zinc-700 bg-black px-4 py-3.5 text-base uppercase outline-none transition focus:border-green-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-400">
              Discount %
            </label>

            <input
              type="number"
              min="1"
              max="100"
              value={discountPercent}
              onChange={(e) =>
                setDiscountPercent(e.target.value)
              }
              placeholder="20"
              className="w-full min-w-0 rounded-xl border border-zinc-700 bg-black px-4 py-3.5 text-base outline-none transition focus:border-green-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-400">
              Maximum Uses
            </label>

            <input
              type="number"
              min="1"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Unlimited"
              className="w-full min-w-0 rounded-xl border border-zinc-700 bg-black px-4 py-3.5 text-base outline-none transition focus:border-green-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-400">
              Expiry Date
            </label>

            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full min-w-0 rounded-xl border border-zinc-700 bg-black px-4 py-3.5 text-base outline-none transition focus:border-green-500"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={createPromo}
          disabled={creating}
          className="mt-5 w-full rounded-xl bg-green-500 px-6 py-3.5 font-bold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {creating ? "Creating..." : "Create Promo"}
        </button>
      </section>

      {/* PROMO LIST */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold">
            Promo Codes
          </h2>

          {!loading && (
            <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold text-gray-400">
              {promos.length} Total
            </span>
          )}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-gray-400">
            Loading promo codes...
          </div>
        ) : promos.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-10 text-center">
            <p className="font-bold">
              No Promo Codes Yet
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Create your first discount code above.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {promos.map((promo) => {
              const expired =
                promo.expiresAt &&
                new Date(promo.expiresAt).getTime() <
                  new Date().getTime();

              return (
                <article
                  key={promo.id}
                  className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Promo Code
                      </p>

                      <h3 className="mt-1 break-all text-xl font-black text-green-400 sm:text-2xl">
                        {promo.code}
                      </h3>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold sm:px-3 sm:text-xs ${
                        expired
                          ? "bg-yellow-500/10 text-yellow-400"
                          : promo.active
                          ? "bg-green-500/10 text-green-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {expired
                        ? "EXPIRED"
                        : promo.active
                        ? "ACTIVE"
                        : "INACTIVE"}
                    </span>
                  </div>

                  <p className="mt-5 text-3xl font-black sm:text-4xl">
                    {promo.discountPercent}
                    <span className="text-green-500">% OFF</span>
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="min-w-0 rounded-xl bg-black p-4">
                      <p className="text-xs text-gray-500">
                        Uses
                      </p>

                      <p className="mt-1 break-words text-sm font-bold sm:text-base">
                        {promo.usedCount}
                        {promo.maxUses
                          ? ` / ${promo.maxUses}`
                          : " / Unlimited"}
                      </p>
                    </div>

                    <div className="min-w-0 rounded-xl bg-black p-4">
                      <p className="text-xs text-gray-500">
                        Expires
                      </p>

                      <p className="mt-1 text-sm font-bold sm:text-base">
                        {promo.expiresAt
                          ? new Date(
                              promo.expiresAt
                            ).toLocaleDateString()
                          : "No Expiry"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-zinc-800 pt-5">
                    <button
                      type="button"
                      onClick={() => togglePromo(promo)}
                      disabled={updatingId === promo.id}
                      className={`w-full rounded-xl px-5 py-3 font-bold transition disabled:opacity-50 sm:w-auto ${
                        promo.active
                          ? "border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          : "bg-green-500 text-black hover:bg-green-400"
                      }`}
                    >
                      {updatingId === promo.id
                        ? "Updating..."
                        : promo.active
                        ? "Deactivate"
                        : "Activate"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}