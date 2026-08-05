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

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [message, setMessage] = useState(
    "Verifying Payment..."
  );

  const [error, setError] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    const sleep = (ms: number) =>
      new Promise((resolve) =>
        setTimeout(resolve, ms)
      );

    /*
     * CRYPTO PAYMENT
     */
    async function verifyCryptoPayment(
      txRef: string
    ) {
      setMessage(
        "Confirming your crypto payment..."
      );

      /*
       * Check for about 60 seconds.
       *
       * NOWPayments webhook will update
       * the payment to SUCCESS once the
       * blockchain payment is confirmed.
       */
      const maxAttempts = 20;

      for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
      ) {
        if (cancelled) {
          return;
        }

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

          const data =
            await response.json();

          if (response.status === 401) {
            if (cancelled) return;

            setError(true);

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

          const status =
            data.payment?.status;

          /*
           * PAYMENT CONFIRMED
           */
          if (status === "SUCCESS") {
            if (cancelled) return;

            setMessage(
              "Payment confirmed! Your challenge has been created."
            );

            await sleep(1500);

            if (cancelled) return;

            router.replace(
              "/dashboard"
            );

            return;
          }

          /*
           * PAYMENT FAILED
           */
          if (
            status === "FAILED" ||
            status === "CANCELLED"
          ) {
            if (cancelled) return;

            setError(true);

            setMessage(
              "Your crypto payment was not completed."
            );

            return;
          }

          /*
           * STILL WAITING
           */
          setMessage(
            `Waiting for crypto confirmation... (${attempt}/${maxAttempts})`
          );

          await sleep(3000);
        } catch (err) {
          console.error(
            "Crypto status error:",
            err
          );

          await sleep(3000);
        }
      }

      /*
       * PAYMENT STILL PENDING
       *
       * Do not mark it failed because
       * blockchain confirmation may
       * simply be taking longer.
       */
      if (!cancelled) {
        setMessage(
          "Your payment is still being confirmed. You can return to your dashboard and check again shortly."
        );
      }
    }

    /*
     * FLUTTERWAVE PAYMENT
     */
    async function verifyFlutterwavePayment() {
      try {
        const transactionId =
          searchParams.get(
            "transaction_id"
          );

        const txRef =
          searchParams.get(
            "tx_ref"
          );

        if (
          !transactionId ||
          !txRef
        ) {
          if (cancelled) return;

          setError(true);

          setMessage(
            "Missing payment information."
          );

          return;
        }

        setMessage(
          "Verifying your payment..."
        );

        const response =
          await fetch(
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

                tx_ref:
                  txRef,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          if (cancelled) return;

          setError(true);

          setMessage(
            data.error ||
              "Payment verification failed."
          );

          return;
        }

        if (cancelled) return;

        setMessage(
          "Challenge purchased successfully!"
        );

        await sleep(1500);

        if (cancelled) return;

        router.replace(
          "/dashboard"
        );
      } catch (err) {
        console.error(
          "Flutterwave verification error:",
          err
        );

        if (cancelled) return;

        setError(true);

        setMessage(
          "Unable to verify your payment."
        );
      }
    }

    /*
     * DETERMINE PAYMENT PROVIDER
     */
    async function startVerification() {
      const provider =
        searchParams.get(
          "provider"
        );

      if (
        provider ===
        "nowpayments"
      ) {
        const txRef =
          searchParams.get(
            "tx_ref"
          );

        if (!txRef) {
          setError(true);

          setMessage(
            "Missing crypto transaction reference."
          );

          return;
        }

        await verifyCryptoPayment(
          txRef
        );

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
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">
        {!error ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-700 border-t-green-500" />
            </div>

            <h1 className="mt-6 text-2xl font-black text-green-500">
              {message}
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              Crypto payments may require
              blockchain confirmations before
              your trading account appears.
            </p>

            <button
              type="button"
              onClick={() =>
                router.replace(
                  "/dashboard"
                )
              }
              className="mt-7 w-full rounded-xl border border-zinc-700 px-6 py-4 font-bold transition hover:border-green-500 hover:text-green-400"
            >
              Go to Dashboard
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-2xl font-black text-red-400">
              !
            </div>

            <h1 className="mt-6 text-2xl font-black text-red-400">
              Payment Verification
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              {message}
            </p>

            <button
              type="button"
              onClick={() =>
                router.replace(
                  "/dashboard"
                )
              }
              className="mt-7 w-full rounded-xl bg-green-500 px-6 py-4 font-bold text-black transition hover:bg-green-400"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-black text-white">
          <p className="text-xl font-bold text-green-500">
            Loading...
          </p>
        </main>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}