"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "../../components/Navbar";

type Challenge = {
  id: string;
  account: string;
  type: string;
  accountType: string;
  stage: string;
  status: string;
  mt5Login: string | null;
  withdrawableProfit: number;
};

type Withdrawal = {
  id: string;
  amount: number;
  method: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  challenge: {
    id: string;
    account: string;
    mt5Login: string | null;
  } | null;
};

function money(value: number) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [accounts, setAccounts] = useState<Challenge[]>([]);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("BANK");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [cryptoNetwork, setCryptoNetwork] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const selectedAccount = accounts.find(
    (account) => account.id === challengeId
  );

  const kycApproved = kycStatus === "APPROVED";

  const loadPage = async () => {
    try {
      const [withdrawalResponse, accountResponse, kycResponse] =
        await Promise.all([
          fetch("/api/withdrawals", { cache: "no-store" }),
          fetch("/api/my-challenges", { cache: "no-store" }),
          fetch("/api/kyc", { cache: "no-store" }),
        ]);

      if (
        withdrawalResponse.status === 401 ||
        accountResponse.status === 401 ||
        kycResponse.status === 401
      ) {
        window.location.href = "/login";
        return;
      }

      const withdrawalData = await withdrawalResponse.json();
      const accountData = await accountResponse.json();
      const kycData = await kycResponse.json();

      if (withdrawalResponse.ok) {
        setWithdrawals(withdrawalData.withdrawals || []);
      }

      if (accountResponse.ok && Array.isArray(accountData)) {
        setAccounts(
          accountData.filter(
            (account: Challenge) =>
              account.stage === "FUNDED" &&
              account.status === "ACTIVE"
          )
        );
      }

      if (kycResponse.ok) {
        setKycStatus(kycData.kyc?.status ?? null);
      }
    } catch (error) {
      console.error("Failed to load withdrawal page:", error);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const handleSubmit = async () => {
    try {
      if (!kycApproved) {
        alert(
          "Your KYC must be approved before you can request a withdrawal."
        );
        return;
      }

      if (!challengeId || !selectedAccount) {
        alert("Please select an active funded trading account.");
        return;
      }

      if (
        selectedAccount.stage !== "FUNDED" ||
        selectedAccount.status !== "ACTIVE"
      ) {
        alert(
          "Withdrawals are only available from active funded accounts."
        );
        return;
      }

      const withdrawalAmount = Number(amount);

      if (!Number.isFinite(withdrawalAmount) || withdrawalAmount <= 0) {
        alert("Enter a valid withdrawal amount.");
        return;
      }

      if (withdrawalAmount > selectedAccount.withdrawableProfit) {
        alert(
          `You cannot request more than ${money(
            selectedAccount.withdrawableProfit
          )}.`
        );
        return;
      }

      if (
        method === "BANK" &&
        (!accountName || !accountNumber || !bankName)
      ) {
        alert("Complete your bank details.");
        return;
      }

      if (
        method === "CRYPTO" &&
        (!cryptoNetwork || !walletAddress)
      ) {
        alert("Complete your crypto payout details.");
        return;
      }

      setLoading(true);

      const response = await fetch("/api/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          challengeId,
          amount: withdrawalAmount,
          method,
          accountName,
          accountNumber,
          bankName,
          cryptoNetwork,
          walletAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Withdrawal request failed.");
        return;
      }

      alert("Withdrawal request submitted!");

      setAmount("");
      setChallengeId("");
      setAccountName("");
      setAccountNumber("");
      setBankName("");
      setCryptoNetwork("");
      setWalletAddress("");

      await loadPage();
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center text-sm text-gray-400">
            Loading withdrawals...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      {/* HEADER */}
      <section className="border-b border-zinc-900">
        <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500 sm:text-sm">
                Mivo Capital
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Withdrawals
              </h1>

              <p className="mt-2 text-sm text-gray-400 sm:text-base">
                Request and track your payouts.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm font-bold transition hover:border-green-500 hover:text-green-400 sm:w-auto"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        {/* KYC */}
        <section
          className={`rounded-2xl border p-4 sm:p-6 ${
            kycApproved
              ? "border-green-500/20 bg-green-500/10"
              : kycStatus === "PENDING"
              ? "border-yellow-500/20 bg-yellow-500/10"
              : "border-red-500/20 bg-red-500/10"
          }`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  KYC Verification
                </p>

                <span
                  className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${
                    kycApproved
                      ? "bg-green-500/20 text-green-400"
                      : kycStatus === "PENDING"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {kycApproved
                    ? "Verified"
                    : kycStatus === "PENDING"
                    ? "Pending"
                    : "Required"}
                </span>
              </div>

              <h2 className="mt-2 text-lg font-bold sm:text-xl">
                {kycApproved
                  ? "Identity Verified"
                  : kycStatus === "PENDING"
                  ? "KYC Under Review"
                  : kycStatus === "REJECTED"
                  ? "KYC Rejected"
                  : "KYC Required"}
              </h2>

              <p className="mt-2 max-w-2xl text-xs leading-5 text-gray-400 sm:text-sm sm:leading-6">
                {kycApproved
                  ? "Your account is verified and eligible for withdrawals."
                  : kycStatus === "PENDING"
                  ? "Your verification is being reviewed. Withdrawals will unlock after approval."
                  : "Complete and pass KYC verification before requesting a withdrawal."}
              </p>
            </div>

            {!kycApproved && (
              <Link
                href="/kyc"
                className="w-full rounded-xl bg-green-500 px-5 py-3 text-center text-sm font-bold text-black transition hover:bg-green-400 sm:w-auto"
              >
                {kycStatus === "PENDING"
                  ? "View KYC"
                  : "Complete KYC"}
              </Link>
            )}
          </div>
        </section>

        {/* FORM */}
        <section className="mt-5 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 sm:mt-7">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4 sm:px-6 sm:py-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500">
                Payout
              </p>

              <h2 className="mt-1 text-xl font-bold sm:text-2xl">
                Request Withdrawal
              </h2>
            </div>

            {!kycApproved && (
              <span className="rounded-full bg-red-500/10 px-3 py-1 text-[10px] font-bold text-red-400 sm:text-xs">
                Locked
              </span>
            )}
          </div>

          <div className="p-4 sm:p-6">
            {/* ACCOUNT */}
            <div>
              <label className="mb-2 block text-xs font-medium text-gray-400 sm:text-sm">
                Funded Trading Account
              </label>

              {accounts.length === 0 ? (
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                  <p className="text-sm font-semibold text-yellow-400">
                    No active funded accounts
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-400 sm:text-sm">
                    Withdrawals are only available from active
                    funded accounts.
                  </p>
                </div>
              ) : (
                <select
                  value={challengeId}
                  disabled={!kycApproved}
                  onChange={(e) => {
                    setChallengeId(e.target.value);
                    setAmount("");
                  }}
                  className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm text-white outline-none transition focus:border-green-500 disabled:cursor-not-allowed disabled:opacity-50 sm:py-4"
                >
                  <option value="">Select Trading Account</option>

                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account}
                      {account.mt5Login
                        ? ` - ${account.mt5Login}`
                        : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* AVAILABLE PROFIT */}
            {selectedAccount && (
              <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 p-4 sm:p-5">
                <p className="text-xs text-gray-400 sm:text-sm">
                  Available Withdrawable Profit
                </p>

                <p className="mt-1 text-2xl font-black text-green-400 sm:text-3xl">
                  {money(selectedAccount.withdrawableProfit)}
                </p>

                <div className="mt-3 flex flex-wrap gap-2 text-[10px] sm:text-xs">
                  <span className="rounded-full bg-black/40 px-2.5 py-1 text-gray-300">
                    {selectedAccount.account}
                  </span>

                  <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-green-400">
                    Funded • Active
                  </span>

                  {selectedAccount.mt5Login && (
                    <span className="rounded-full bg-black/40 px-2.5 py-1 text-gray-300">
                      Login: {selectedAccount.mt5Login}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* AMOUNT */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="text-xs font-medium text-gray-400 sm:text-sm">
                  Amount ($)
                </label>

                {kycApproved &&
                  selectedAccount &&
                  selectedAccount.withdrawableProfit > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setAmount(
                          String(selectedAccount.withdrawableProfit)
                        )
                      }
                      className="text-xs font-bold text-green-400 hover:text-green-300 sm:text-sm"
                    >
                      Withdraw Max
                    </button>
                  )}
              </div>

              <input
                type="number"
                min="1"
                max={selectedAccount?.withdrawableProfit}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                disabled={!kycApproved || !selectedAccount}
                className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm outline-none transition placeholder:text-gray-600 focus:border-green-500 disabled:cursor-not-allowed disabled:opacity-50 sm:py-4"
              />
            </div>

            {/* METHOD */}
            <div className="mt-5">
              <label className="mb-2 block text-xs font-medium text-gray-400 sm:text-sm">
                Payout Method
              </label>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  type="button"
                  disabled={!kycApproved}
                  onClick={() => setMethod("BANK")}
                  className={`rounded-xl border px-3 py-3.5 text-xs font-bold transition sm:px-4 sm:py-4 sm:text-sm ${
                    method === "BANK"
                      ? "border-green-500 bg-green-500 text-black"
                      : "border-zinc-800 bg-black text-gray-300 hover:border-green-500"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  Bank Transfer
                </button>

                <button
                  type="button"
                  disabled={!kycApproved}
                  onClick={() => setMethod("CRYPTO")}
                  className={`rounded-xl border px-3 py-3.5 text-xs font-bold transition sm:px-4 sm:py-4 sm:text-sm ${
                    method === "CRYPTO"
                      ? "border-green-500 bg-green-500 text-black"
                      : "border-zinc-800 bg-black text-gray-300 hover:border-green-500"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  Crypto
                </button>
              </div>
            </div>

            {/* BANK */}
            {method === "BANK" && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <input
                  value={accountName}
                  disabled={!kycApproved}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Account Name"
                  className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm outline-none placeholder:text-gray-600 focus:border-green-500 disabled:opacity-50 sm:col-span-2"
                />

                <input
                  value={accountNumber}
                  disabled={!kycApproved}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Account Number"
                  className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm outline-none placeholder:text-gray-600 focus:border-green-500 disabled:opacity-50"
                />

                <input
                  value={bankName}
                  disabled={!kycApproved}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Bank Name"
                  className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm outline-none placeholder:text-gray-600 focus:border-green-500 disabled:opacity-50"
                />
              </div>
            )}

            {/* CRYPTO */}
            {method === "CRYPTO" && (
              <div className="mt-5 grid gap-3">
                <select
                  value={cryptoNetwork}
                  disabled={!kycApproved}
                  onChange={(e) => setCryptoNetwork(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm outline-none focus:border-green-500 disabled:opacity-50"
                >
                  <option value="">Select Network</option>
                  <option value="TRC20">USDT - TRC20</option>
                  <option value="ERC20">USDT - ERC20</option>
                  <option value="BEP20">USDT - BEP20</option>
                </select>

                <input
                  value={walletAddress}
                  disabled={!kycApproved}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="Wallet Address"
                  className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm outline-none placeholder:text-gray-600 focus:border-green-500 disabled:opacity-50"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                loading ||
                !kycApproved ||
                !selectedAccount ||
                selectedAccount.withdrawableProfit <= 0
              }
              className="mt-5 w-full rounded-xl bg-green-500 px-5 py-3.5 text-sm font-bold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-6 sm:py-4"
            >
              {!kycApproved
                ? "KYC Required"
                : loading
                ? "Submitting..."
                : "Request Withdrawal"}
            </button>
          </div>
        </section>

        {/* HISTORY */}
        <section className="mt-8 sm:mt-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500">
                Payout Activity
              </p>

              <h2 className="mt-1 text-xl font-bold sm:text-2xl">
                Withdrawal History
              </h2>
            </div>

            {withdrawals.length > 0 && (
              <span className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-bold text-gray-400">
                {withdrawals.length}
              </span>
            )}
          </div>

          {withdrawals.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-center text-sm text-gray-400 sm:mt-6">
              No withdrawal requests yet.
            </div>
          ) : (
            <div className="mt-4 space-y-3 sm:mt-6">
              {withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xl font-black sm:text-2xl">
                        {money(withdrawal.amount)}
                      </p>

                      {withdrawal.challenge && (
                        <p className="mt-2 truncate text-xs font-semibold text-green-400 sm:text-sm">
                          {withdrawal.challenge.account}
                          {withdrawal.challenge.mt5Login
                            ? ` • ${withdrawal.challenge.mt5Login}`
                            : ""}
                        </p>
                      )}
                    </div>

                    <StatusBadge status={withdrawal.status} />
                  </div>

                  <div className="mt-4 border-t border-zinc-800 pt-3">
                    <p className="text-xs text-gray-500 sm:text-sm">
                      {withdrawal.method === "BANK"
                        ? "Bank Transfer"
                        : "Crypto"}{" "}
                      •{" "}
                      {new Date(
                        withdrawal.createdAt
                      ).toLocaleDateString()}
                    </p>

                    {withdrawal.adminNote && (
                      <p className="mt-2 text-xs leading-5 text-red-300 sm:text-sm">
                        {withdrawal.adminNote}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "APPROVED") {
    return (
      <span className="shrink-0 rounded-full bg-green-500/10 px-2.5 py-1 text-[10px] font-bold text-green-400 sm:px-3 sm:text-xs">
        Approved
      </span>
    );
  }

  if (status === "REJECTED") {
    return (
      <span className="shrink-0 rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-400 sm:px-3 sm:text-xs">
        Rejected
      </span>
    );
  }

  if (status === "PAID") {
    return (
      <span className="shrink-0 rounded-full bg-purple-500/10 px-2.5 py-1 text-[10px] font-bold text-purple-400 sm:px-3 sm:text-xs">
        Paid
      </span>
    );
  }

  return (
    <span className="shrink-0 rounded-full bg-yellow-500/10 px-2.5 py-1 text-[10px] font-bold text-yellow-400 sm:px-3 sm:text-xs">
      Pending
    </span>
  );
}