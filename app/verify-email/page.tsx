"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/app/components/brand-logo";

type VerificationState =
  | "VERIFYING"
  | "SUCCESS"
  | "ERROR";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] =
    useState<VerificationState>(token ? "VERIFYING" : "ERROR");

  const [message, setMessage] = useState(
    token ? "Verifying your email..." : "This verification link is invalid."
  );

  useEffect(() => {
    if (!token) return;

    async function verifyEmail() {
      try {
        const response = await fetch(
          "/api/verify-email",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              token,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          setStatus("ERROR");
          setMessage(
            data.error ||
              "Unable to verify your email."
          );
          return;
        }

        setStatus("SUCCESS");

        setMessage(
          data.message ||
            "Your email has been verified successfully."
        );
      } catch (error) {
        console.error(
          "EMAIL VERIFICATION ERROR:",
          error
        );

        setStatus("ERROR");

        setMessage(
          "Something went wrong while verifying your email."
        );
      }
    }

    verifyEmail();
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-10 text-white">
      <div className="w-full max-w-md">

        <div className="mb-8 text-center">
          <Link
            href="/"
            aria-label="Mivo Capital home"
            className="inline-flex justify-center"
          >
            <BrandLogo className="h-28 w-44" priority tone="dark" />
          </Link>

          <p className="mt-2 text-sm text-gray-500">
            Learn. Test. Trade. Grow.
          </p>
        </div>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-center shadow-2xl sm:p-8">

          {status === "VERIFYING" && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-2xl">
                ✉
              </div>

              <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-green-500">
                Please Wait
              </p>

              <h1 className="mt-2 text-2xl font-black">
                Verifying Email
              </h1>

              <p className="mt-3 text-sm leading-6 text-gray-400">
                {message}
              </p>
            </>
          )}

          {status === "SUCCESS" && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-3xl text-green-400">
                ✓
              </div>

              <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-green-500">
                Verification Complete
              </p>

              <h1 className="mt-2 text-2xl font-black">
                Email Verified
              </h1>

              <p className="mt-3 text-sm leading-6 text-gray-400">
                {message}
              </p>

              <Link
                href="/login"
                className="mt-7 block w-full rounded-xl bg-green-500 px-6 py-3.5 text-sm font-black text-black transition hover:bg-green-400"
              >
                Continue to Login
              </Link>
            </>
          )}

          {status === "ERROR" && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-3xl text-red-400">
                !
              </div>

              <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-red-400">
                Verification Failed
              </p>

              <h1 className="mt-2 text-2xl font-black">
                Unable to Verify Email
              </h1>

              <p className="mt-3 text-sm leading-6 text-gray-400">
                {message}
              </p>

              <Link
                href="/login"
                className="mt-7 block w-full rounded-xl border border-zinc-700 px-6 py-3.5 text-sm font-bold transition hover:border-green-500 hover:text-green-400"
              >
                Back to Login
              </Link>
            </>
          )}

        </section>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-black text-white">
          <p className="text-sm font-bold text-green-500">
            Verifying email...
          </p>
        </main>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
