"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

type PaymentState =
  | "processing"
  | "success"
  | "pending"
  | "error";

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [message, setMessage] = useState(
    "Verifying your payment..."
  );

  const [paymentState, setPaymentState] =
    useState<PaymentState>("processing");

  useEffect(() => {
    let cancelled = false;

    const sleep = (ms: number) =>
      new Promise((resolve) =>
        setTimeout(resolve, ms)
      );

    async function verifyCryptoPayment(
      txRef: string
    ) {
      setPaymentState("processing");
      setMessage(
        "Confirming your crypto payment..."
      );

      const maxAttempts = 20;

      for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
      ) {
        if (cancelled) return;

        try {
          const response = await fetch(
            `/api/nowpayments/status?tx_ref=${encodeURIComponent(
              txRef
            )}`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

          const data = await response.json();

          if (response.status === 401) {
            if (cancelled) return;

            setPaymentState("error");
            setMessage(
              "Your session has expired. Please log in again."
            );

            return;
          }

          if (!response.ok) {
            console.error(
              "Payment status check failed:",
              data
            );

            await sleep(3000);
            continue;
          }

          const status = data.payment?.status;

          if (status === "SUCCESS") {
            if (cancelled) return;

            setPaymentState("success");
            setMessage(
              "Payment confirmed! Your challenge has been created."
            );

            await sleep(1800);

            if (cancelled) return;

            router.replace("/dashboard");
            return;
          }

          if (
            status === "FAILED" ||
            status === "CANCELLED"
          ) {
            if (cancelled) return;

            setPaymentState("error");
            setMessage(
              "Your crypto payment was not completed."
            );

            return;
          }

          setMessage(
            `Waiting for crypto confirmation... (${attempt}/${maxAttempts})`
          );

          await sleep(3000);
        } catch (error) {
          console.error(
            "Crypto status error:",
            error
          );

          await sleep(3000);
        }
      }

      if (!cancelled) {
        setPaymentState("pending");

        setMessage(
          "Your payment is still being confirmed."
        );
      }
    }

    async function verifyFlutterwavePayment() {
      try {
        const transactionId =
          searchParams.get("transaction_id");

        const txRef =
          searchParams.get("tx_ref");

        if (!transactionId || !txRef) {
          if (cancelled) return;

          setPaymentState("error");

          setMessage(
            "Missing payment information."
          );

          return;
        }

        setPaymentState("processing");

        setMessage(
          "Verifying your payment..."
        );

        const response = await fetch(
          "/api/verify-payment",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              transaction_id:
                transactionId,

              tx_ref: txRef,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          if (cancelled) return;

          setPaymentState("error");

          setMessage(
            data.error ||
              "Payment verification failed."
          );

          return;
        }

        if (cancelled) return;

        setPaymentState("success");

        setMessage(
          "Challenge purchased successfully!"
        );

        await sleep(1800);

        if (cancelled) return;

        router.replace("/dashboard");
      } catch (error) {
        console.error(
          "Flutterwave verification error:",
          error
        );

        if (cancelled) return;

        setPaymentState("error");

        setMessage(
          "Unable to verify your payment."
        );
      }
    }

    async function startVerification() {
      const provider =
        searchParams.get("provider");

      if (provider === "nowpayments") {
        const txRef =
          searchParams.get("tx_ref");

        if (!txRef) {
          setPaymentState("error");

          setMessage(
            "Missing crypto transaction reference."
          );

          return;
        }

        await verifyCryptoPayment(txRef);
        return;
      }

      await verifyFlutterwavePayment();
    }

    startVerification();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-8 text-white sm:px-6">
      <div className="w-full max-w-md">
        {/* BRAND */}
        <div className="mb-7 text-center">
          <p className="text-2xl font-black tracking-tight text-green-500 sm:text-3xl">
            Mivo Capital
          </p>

          <p className="mt-2 text-xs text-gray-500 sm:text-sm">
            Secure Payment Verification
          </p>
        </div>

        {/* PAYMENT CARD */}
        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          <div className="p-5 text-center sm:p-8">
            {paymentState === "processing" && (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-green-500/20 bg-green-500/[0.06]">
                  <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-zinc-700 border-t-green-500" />
                </div>

                <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-green-500">
                  Processing Payment
                </p>

                <h1 className="mt-2 break-words text-xl font-black leading-7 sm:text-2xl">
                  {message}
                </h1>

                <p className="mx-auto mt-3 max-w-sm text-xs leading-5 text-gray-500 sm:text-sm sm:leading-6">
                  Please keep this page open while we
                  confirm your payment.
                </p>
              </>
            )}

            {paymentState === "success" && (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-2xl font-black text-black">
                  ✓
                </div>

                <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-green-500">
                  Payment Successful
                </p>

                <h1 className="mt-2 text-xl font-black leading-7 sm:text-2xl">
                  {message}
                </h1>

                <p className="mt-3 text-xs leading-5 text-gray-500 sm:text-sm">
                  Taking you back to your dashboard...
                </p>
              </>
            )}

            {paymentState === "pending" && (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 text-2xl font-black text-yellow-400">
                  …
                </div>

                <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-400">
                  Confirmation Pending
                </p>

                <h1 className="mt-2 text-xl font-black leading-7 sm:text-2xl">
                  {message}
                </h1>

                <p className="mx-auto mt-3 max-w-sm text-xs leading-5 text-gray-400 sm:text-sm sm:leading-6">
                  Blockchain confirmation may take longer.
                  Your payment is not being marked as failed.
                  You can return to your dashboard and check
                  again shortly.
                </p>
              </>
            )}

            {paymentState === "error" && (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-2xl font-black text-red-400">
                  !
                </div>

                <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
                  Payment Verification
                </p>

                <h1 className="mt-2 text-xl font-black leading-7 sm:text-2xl">
                  We Couldn&apos;t Confirm Your Payment
                </h1>

                <p className="mx-auto mt-3 max-w-sm break-words text-xs leading-5 text-gray-400 sm:text-sm sm:leading-6">
                  {message}
                </p>
              </>
            )}
          </div>

          {/* ACTION */}
          <div className="border-t border-zinc-800 bg-black/40 p-4 sm:p-5">
            <button
              type="button"
              onClick={() =>
                router.replace("/dashboard")
              }
              className={`w-full rounded-xl px-6 py-3.5 text-sm font-bold transition sm:py-4 ${
                paymentState === "error" ||
                paymentState === "pending"
                  ? "bg-green-500 text-black hover:bg-green-400"
                  : "border border-zinc-700 text-white hover:border-green-500 hover:text-green-400"
              }`}
            >
              Go to Dashboard
            </button>

            {paymentState === "processing" && (
              <p className="mt-3 text-center text-[10px] leading-4 text-gray-600">
                Crypto payments may require multiple
                blockchain confirmations.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
          <div className="text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-[3px] border-zinc-700 border-t-green-500" />

            <p className="mt-4 text-sm font-bold text-green-500">
              Loading payment...
            </p>
          </div>
        </main>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}