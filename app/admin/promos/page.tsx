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

    try {
      setCreating(true);

      const response = await fetch("/api/admin/promos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          discountPercent: Number(discountPercent),
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
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-500">
        Mivo Capital Admin
      </p>

      <h1 className="mt-2 text-4xl font-black">
        Promo Codes
      </h1>

      <p className="mt-2 text-gray-400">
        Create and manage challenge discount codes.
      </p>

      {/* CREATE */}

      <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-xl font-bold">
          Create Promo Code
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <input
            value={code}
            onChange={(e) =>
              setCode(e.target.value.toUpperCase())
            }
            placeholder="Code e.g. MIVO20"
            className="rounded-xl border border-zinc-700 bg-black p-4 uppercase outline-none focus:border-green-500"
          />

          <input
            type="number"
            value={discountPercent}
            onChange={(e) =>
              setDiscountPercent(e.target.value)
            }
            placeholder="Discount %"
            className="rounded-xl border border-zinc-700 bg-black p-4 outline-none focus:border-green-500"
          />

          <input
            type="number"
            value={maxUses}
            onChange={(e) =>
              setMaxUses(e.target.value)
            }
            placeholder="Max uses (optional)"
            className="rounded-xl border border-zinc-700 bg-black p-4 outline-none focus:border-green-500"
          />

          <input
            type="date"
            value={expiresAt}
            onChange={(e) =>
              setExpiresAt(e.target.value)
            }
            className="rounded-xl border border-zinc-700 bg-black p-4 outline-none focus:border-green-500"
          />
        </div>

        <button
          onClick={createPromo}
          disabled={creating}
          className="mt-5 rounded-xl bg-green-500 px-7 py-3 font-bold text-black hover:bg-green-400 disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create Promo"}
        </button>
      </section>

      {/* LIST */}

      <section className="mt-8">
        {loading ? (
          <p className="text-gray-400">
            Loading promo codes...
          </p>
        ) : promos.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center text-gray-400">
            No promo codes yet.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {promos.map((promo) => (
              <div
                key={promo.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-green-400">
                      {promo.code}
                    </h2>

                    <p className="mt-2 text-3xl font-black">
                      {promo.discountPercent}% OFF
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      promo.active
                        ? "bg-green-500/10 text-green-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {promo.active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Uses</p>
                    <p className="mt-1 font-bold">
                      {promo.usedCount}
                      {promo.maxUses
                        ? ` / ${promo.maxUses}`
                        : " / Unlimited"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">
                      Expires
                    </p>

                    <p className="mt-1 font-bold">
                      {promo.expiresAt
                        ? new Date(
                            promo.expiresAt
                          ).toLocaleDateString()
                        : "No Expiry"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => togglePromo(promo)}
                  className={`mt-6 rounded-lg px-5 py-3 font-bold ${
                    promo.active
                      ? "bg-red-500/10 text-red-400"
                      : "bg-green-500 text-black"
                  }`}
                >
                  {promo.active
                    ? "Deactivate"
                    : "Activate"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}