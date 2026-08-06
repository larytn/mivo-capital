"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

function SignupContent() {
  const searchParams = useSearchParams();

  const referralFromUrl =
    searchParams.get("ref") || "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [referralCode, setReferralCode] =
    useState(referralFromUrl);

  const [loading, setLoading] = useState(false);

  const [googleLoading, setGoogleLoading] =
    useState(false);

  const [resendLoading, setResendLoading] =
    useState(false);

  const [error, setError] = useState("");

  const [resendMessage, setResendMessage] =
    useState("");

  const [signupComplete, setSignupComplete] =
    useState(false);

  const [registeredEmail, setRegisteredEmail] =
    useState("");

  // --------------------------------
  // EMAIL SIGNUP
  // --------------------------------

  const handleSignup = async () => {
    if (
      loading ||
      googleLoading ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const normalizedEmail =
        email.trim().toLowerCase();

      const response = await fetch(
        "/api/signup",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name: name.trim(),

            email: normalizedEmail,

            password,

            referralCode:
              referralCode.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "Signup failed."
        );
        return;
      }

      // Do NOT send the trader directly
      // to login. Their email must first
      // be verified.
      setRegisteredEmail(
        data.email || normalizedEmail
      );

      setSignupComplete(true);
      setPassword("");
    } catch (error) {
      console.error(
        "SIGNUP ERROR:",
        error
      );

      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------
  // RESEND VERIFICATION
  // --------------------------------

  const handleResendVerification =
    async () => {
      if (!registeredEmail) {
        return;
      }

      try {
        setResendLoading(true);
        setResendMessage("");

        const response = await fetch(
          "/api/resend-verification",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              email: registeredEmail,
            }),
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          setResendMessage(
            data.error ||
              "Unable to resend verification email."
          );

          return;
        }

        setResendMessage(
          data.message ||
            "A new verification email has been sent."
        );
      } catch (error) {
        console.error(
          "RESEND VERIFICATION ERROR:",
          error
        );

        setResendMessage(
          "Unable to resend verification email. Please try again."
        );
      } finally {
        setResendLoading(false);
      }
    };

  // --------------------------------
  // GOOGLE SIGNUP
  // --------------------------------

  const handleGoogleSignup = async () => {
    try {
      setGoogleLoading(true);
      setError("");

      // Keep the referral code through
      // the Google OAuth redirect.
      if (referralCode.trim()) {
        document.cookie =
          `mivo_referral=${encodeURIComponent(
            referralCode
              .trim()
              .toUpperCase()
          )}; path=/; max-age=600; SameSite=Lax`;
      } else {
        document.cookie =
          "mivo_referral=; path=/; max-age=0; SameSite=Lax";
      }

      await signIn("google", {
        callbackUrl: "/dashboard",
      });
    } catch (error) {
      console.error(
        "GOOGLE SIGNUP ERROR:",
        error
      );

      setError(
        "Unable to continue with Google. Please try again."
      );

      setGoogleLoading(false);
    }
  };

  // --------------------------------
  // ENTER KEY
  // --------------------------------

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (
      event.key === "Enter" &&
      !loading &&
      !googleLoading
    ) {
      handleSignup();
    }
  };

  // --------------------------------
  // CHECK EMAIL SCREEN
  // --------------------------------

  if (signupComplete) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-4 py-8 text-white sm:px-6">
        <div className="w-full max-w-md">

          {/* BRAND */}

          <div className="mb-7 text-center sm:mb-8">
            <Link
              href="/"
              className="inline-block text-2xl font-black tracking-tight text-green-500 sm:text-3xl"
            >
              Mivo Capital
            </Link>

            <p className="mt-2 text-xs text-gray-500 sm:text-sm">
              Trade. Perform. Get Funded.
            </p>
          </div>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-center shadow-2xl sm:p-8">

            {/* ICON */}

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-3xl text-green-400">
              ✉
            </div>

            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-green-500 sm:text-xs">
              Account Created
            </p>

            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              Check Your Email
            </h1>

            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-400">
              We sent a verification link to
            </p>

            <p className="mt-2 break-all text-sm font-bold text-white">
              {registeredEmail}
            </p>

            <p className="mx-auto mt-4 max-w-sm text-xs leading-5 text-gray-500 sm:text-sm">
              Click the verification link in
              the email to activate your Mivo
              Capital account. The link expires
              in 24 hours.
            </p>

            {/* INFO */}

            <div className="mt-6 rounded-xl border border-zinc-800 bg-black p-4 text-left">
              <p className="text-sm font-bold text-white">
                Didn&apos;t receive the email?
              </p>

              <p className="mt-2 text-xs leading-5 text-gray-500">
                Check your spam or junk folder.
                You can also request a new
                verification email below.
              </p>
            </div>

            {/* RESEND */}

            <button
              type="button"
              onClick={
                handleResendVerification
              }
              disabled={resendLoading}
              className="mt-5 w-full rounded-xl border border-green-500/40 bg-green-500/10 px-6 py-3.5 text-sm font-bold text-green-400 transition hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resendLoading
                ? "Sending..."
                : "Resend Verification Email"}
            </button>

            {resendMessage && (
              <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/[0.08] p-3">
                <p className="text-xs leading-5 text-green-400">
                  {resendMessage}
                </p>
              </div>
            )}

            {/* LOGIN */}

            <Link
              href="/login"
              className="mt-4 block w-full rounded-xl bg-green-500 px-6 py-3.5 text-sm font-black text-black transition hover:bg-green-400"
            >
              Go to Login
            </Link>

            <Link
              href="/"
              className="mt-5 inline-block text-xs text-gray-500 transition hover:text-white sm:text-sm"
            >
              ← Back to Home
            </Link>

          </section>
        </div>
      </main>
    );
  }

  // --------------------------------
  // SIGNUP FORM
  // --------------------------------

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-8 text-white sm:px-6">
      <div className="w-full max-w-md">

        {/* BRAND */}

        <div className="mb-7 text-center sm:mb-8">
          <Link
            href="/"
            className="inline-block text-2xl font-black tracking-tight text-green-500 sm:text-3xl"
          >
            Mivo Capital
          </Link>

          <p className="mt-2 text-xs text-gray-500 sm:text-sm">
            Trade. Perform. Get Funded.
          </p>
        </div>

        {/* SIGNUP CARD */}

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl sm:p-8">

          <div className="text-center">

            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500 sm:text-xs">
              Get Started
            </p>

            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              Create Your Account
            </h1>

            <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-gray-500 sm:text-sm">
              Join Mivo Capital and start your
              journey toward a funded trading
              account.
            </p>

          </div>

          {/* ERROR */}

          {error && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm text-red-400">
                {error}
              </p>
            </div>
          )}

          {/* GOOGLE */}

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={
              googleLoading || loading
            }
            className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-white px-6 py-3.5 text-sm font-bold text-black transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:py-4"
          >
            {!googleLoading && (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M21.35 12.21c0-.74-.07-1.45-.19-2.13H12v4.03h5.24a4.48 4.48 0 0 1-1.94 2.94v2.61h3.14c1.84-1.69 2.91-4.18 2.91-7.45Z"
                />

                <path
                  fill="#34A853"
                  d="M12 21.72c2.62 0 4.82-.87 6.43-2.36l-3.14-2.61c-.87.58-1.98.93-3.29.93-2.53 0-4.67-1.71-5.44-4.01H3.32v2.7A9.72 9.72 0 0 0 12 21.72Z"
                />

                <path
                  fill="#FBBC05"
                  d="M6.56 13.67A5.84 5.84 0 0 1 6.25 12c0-.58.1-1.14.31-1.67v-2.7H3.32A9.72 9.72 0 0 0 2.28 12c0 1.57.38 3.06 1.04 4.37l3.24-2.7Z"
                />

                <path
                  fill="#EA4335"
                  d="M12 6.32c1.43 0 2.71.49 3.72 1.45l2.78-2.78A9.32 9.32 0 0 0 12 2.28a9.72 9.72 0 0 0-8.68 5.35l3.24 2.7C7.33 8.03 9.47 6.32 12 6.32Z"
                />
              </svg>
            )}

            {googleLoading
              ? "Connecting to Google..."
              : "Continue with Google"}
          </button>

          {/* DIVIDER */}

          <div className="my-6 flex items-center gap-4">

            <div className="h-px flex-1 bg-zinc-800" />

            <span className="text-xs font-medium uppercase text-gray-600">
              Or continue with email
            </span>

            <div className="h-px flex-1 bg-zinc-800" />

          </div>

          {/* FULL NAME */}

          <div>

            <label
              htmlFor="name"
              className="mb-2 block text-xs font-medium text-gray-400 sm:text-sm"
            >
              Full Name
            </label>

            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              onKeyDown={handleKeyDown}
              disabled={
                loading || googleLoading
              }
              className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-green-500 disabled:opacity-60 sm:py-4"
            />

          </div>

          {/* EMAIL */}

          <div className="mt-4">

            <label
              htmlFor="email"
              className="mb-2 block text-xs font-medium text-gray-400 sm:text-sm"
            >
              Email Address
            </label>

            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              onKeyDown={handleKeyDown}
              disabled={
                loading || googleLoading
              }
              className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-green-500 disabled:opacity-60 sm:py-4"
            />

          </div>

          {/* PASSWORD */}

          <div className="mt-4">

            <label
              htmlFor="password"
              className="mb-2 block text-xs font-medium text-gray-400 sm:text-sm"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              onKeyDown={handleKeyDown}
              disabled={
                loading || googleLoading
              }
              className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-green-500 disabled:opacity-60 sm:py-4"
            />

            <p className="mt-2 text-xs text-gray-600">
              Password must be at least 8
              characters.
            </p>

          </div>

          {/* REFERRAL CODE */}

          <div className="mt-4">

            <label
              htmlFor="referralCode"
              className="mb-2 block text-xs font-medium text-gray-400 sm:text-sm"
            >
              Referral Code{" "}
              <span className="text-gray-600">
                (Optional)
              </span>
            </label>

            <input
              id="referralCode"
              type="text"
              autoComplete="off"
              placeholder="Enter referral code"
              value={referralCode}
              onChange={(e) =>
                setReferralCode(
                  e.target.value.toUpperCase()
                )
              }
              onKeyDown={handleKeyDown}
              disabled={
                loading || googleLoading
              }
              className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm uppercase text-white outline-none transition placeholder:normal-case placeholder:text-gray-600 focus:border-green-500 disabled:opacity-60 sm:py-4"
            />

            {referralFromUrl && (
              <p className="mt-2 text-xs text-green-400">
                Referral code applied
                automatically.
              </p>
            )}

          </div>

          {/* CREATE ACCOUNT */}

          <button
            type="button"
            onClick={handleSignup}
            disabled={
              loading ||
              googleLoading ||
              !name.trim() ||
              !email.trim() ||
              password.length < 8
            }
            className="mt-6 w-full rounded-xl bg-green-500 px-6 py-3.5 text-sm font-black text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 sm:py-4"
          >
            {loading
              ? "Creating Account..."
              : "Create Account"}
          </button>

          {/* LOGIN */}

          <p className="mt-6 text-center text-xs text-gray-400 sm:text-sm">
            Already have an account?{" "}

            <Link
              href="/login"
              className="font-bold text-green-500 transition hover:text-green-400"
            >
              Login
            </Link>
          </p>

        </section>

        {/* BACK */}

        <div className="mt-6 text-center">

          <Link
            href="/"
            className="text-xs text-gray-500 transition hover:text-white sm:text-sm"
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
          <p className="text-sm font-bold text-green-500">
            Loading...
          </p>
        </main>
      }
    >
      <SignupContent />
    </Suspense>
  );
}