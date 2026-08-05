"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const transactionId = searchParams.get("transaction_id");
        const txRef = searchParams.get("tx_ref");

        if (!transactionId || !txRef) {
          alert("Missing transaction information.");
          return;
        }

        const response = await fetch("/api/verify-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transaction_id: transactionId,
            tx_ref: txRef,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          alert(data.error || "Verification failed.");
          return;
        }

        alert("Challenge purchased successfully!");

        router.replace("/dashboard");
      } catch (err) {
        console.error(err);
        alert("Verification failed.");
      }
    };

    verifyPayment();
  }, [router, searchParams]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <h1 className="text-3xl font-bold text-green-500">
        Verifying Payment...
      </h1>
    </main>
  );
}
export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}