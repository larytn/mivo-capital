"use client";

import { FormEvent, useState } from "react";

export default function AdminPropertiesPage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body = Object.fromEntries(form.entries());
    try {
      const response = await fetch("/api/properties", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, price: Number(body.price), bedrooms: body.bedrooms ? Number(body.bedrooms) : null, bathrooms: body.bathrooms ? Number(body.bathrooms) : null }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to publish.");
      formElement.reset(); setMessage("Property listing published.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to publish."); }
    finally { setBusy(false); }
  }
  const input = "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm";
  return <section className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-widest text-muted">Property division</p><h1 className="mt-2 text-3xl font-black">Publish a listing</h1><p className="mt-2 text-sm text-muted">Published opportunities appear in the member Real Estate area.</p><form onSubmit={publish} className="mt-6 grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2"><input name="title" required maxLength={140} placeholder="Property title" className={`${input} sm:col-span-2`} /><input name="location" required placeholder="Location" className={input} /><input name="propertyType" required placeholder="Property type" className={input} /><input name="price" required type="number" min="1" step="any" placeholder="Price" className={input} /><select name="currency" className={input}><option value="NGN">NGN</option><option value="USD">USD</option></select><input name="bedrooms" type="number" min="0" placeholder="Bedrooms (optional)" className={input} /><input name="bathrooms" type="number" min="0" placeholder="Bathrooms (optional)" className={input} /><input name="imageUrl" type="url" placeholder="Image URL (optional)" className={`${input} sm:col-span-2`} /><textarea name="description" required maxLength={4000} rows={5} placeholder="Property details" className={`${input} sm:col-span-2`} /><div className="flex items-center justify-between gap-3 sm:col-span-2">{message && <p role="status" className="text-sm text-muted">{message}</p>}<button disabled={busy} className="ml-auto rounded-lg bg-foreground px-5 py-3 text-sm font-bold text-background disabled:opacity-50">{busy ? "Publishing…" : "Publish listing"}</button></div></form></section>;
}