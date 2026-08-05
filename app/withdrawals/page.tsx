"use client";

import { useEffect, useState } from "react";

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

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] =
    useState<Withdrawal[]>([]);

  const [accounts, setAccounts] =
    useState<Challenge[]>([]);

  const [challengeId, setChallengeId] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [method, setMethod] =
    useState("BANK");

  const [accountName, setAccountName] =
    useState("");

  const [accountNumber, setAccountNumber] =
    useState("");

  const [bankName, setBankName] =
    useState("");

  const [cryptoNetwork, setCryptoNetwork] =
    useState("");

  const [walletAddress, setWalletAddress] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [pageLoading, setPageLoading] =
    useState(true);

  const selectedAccount =
    accounts.find(
      (account) =>
        account.id === challengeId
    );

  /*
   * LOAD WITHDRAWALS + FUNDED ACCOUNTS
   */

  const loadPage = async () => {
    try {
      const [
        withdrawalResponse,
        accountResponse,
      ] = await Promise.all([
        fetch("/api/withdrawals", {
          cache: "no-store",
        }),

        fetch("/api/my-challenges", {
          cache: "no-store",
        }),
      ]);

      const withdrawalData =
        await withdrawalResponse.json();

      const accountData =
        await accountResponse.json();

      if (withdrawalResponse.ok) {
        setWithdrawals(
          withdrawalData.withdrawals ||
            []
        );
      }

      if (
        accountResponse.ok &&
        Array.isArray(accountData)
      ) {
        /*
         * NEW ARCHITECTURE
         *
         * Funded is a STAGE.
         * The funded stage must also
         * currently be ACTIVE.
         */

        const fundedAccounts =
          accountData.filter(
            (account: Challenge) =>
              account.stage ===
                "FUNDED" &&
              account.status ===
                "ACTIVE"
          );

        setAccounts(
          fundedAccounts
        );
      }
    } catch (error) {
      console.error(
        "Failed to load withdrawal page:",
        error
      );
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  /*
   * SUBMIT WITHDRAWAL
   */

  const handleSubmit = async () => {
    try {
      if (!challengeId) {
        alert(
          "Please select an active funded trading account."
        );

        return;
      }

      if (!selectedAccount) {
        alert(
          "Trading account not found."
        );

        return;
      }

      /*
       * FRONTEND SAFETY CHECK
       *
       * Backend must also enforce this.
       */

      if (
        selectedAccount.stage !==
          "FUNDED" ||
        selectedAccount.status !==
          "ACTIVE"
      ) {
        alert(
          "Withdrawals are only available from active funded accounts."
        );

        return;
      }

      const withdrawalAmount =
        Number(amount);

      if (
        !Number.isFinite(
          withdrawalAmount
        ) ||
        withdrawalAmount <= 0
      ) {
        alert(
          "Enter a valid withdrawal amount."
        );

        return;
      }

      if (
        withdrawalAmount >
        selectedAccount.withdrawableProfit
      ) {
        alert(
          `You cannot request more than $${selectedAccount.withdrawableProfit.toLocaleString(
            "en-US",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }
          )}.`
        );

        return;
      }

      /*
       * BANK VALIDATION
       */

      if (method === "BANK") {
        if (
          !accountName ||
          !accountNumber ||
          !bankName
        ) {
          alert(
            "Complete your bank details."
          );

          return;
        }
      }

      /*
       * CRYPTO VALIDATION
       */

      if (method === "CRYPTO") {
        if (
          !cryptoNetwork ||
          !walletAddress
        ) {
          alert(
            "Complete your crypto payout details."
          );

          return;
        }
      }

      setLoading(true);

      const response =
        await fetch(
          "/api/withdrawals",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              challengeId,
              amount:
                withdrawalAmount,
              method,

              accountName,
              accountNumber,
              bankName,

              cryptoNetwork,
              walletAddress,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data.error ||
            "Withdrawal request failed."
        );

        return;
      }

      alert(
        "Withdrawal request submitted!"
      );

      /*
       * RESET FORM
       */

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

      alert(
        "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * LOADING
   */

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-black p-10 text-white">
        <p className="text-gray-400">
          Loading withdrawals...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <div className="mx-auto max-w-5xl">
        {/* HEADER */}

        <h1 className="text-4xl font-bold text-green-500">
          Withdrawals
        </h1>

        <p className="mt-2 text-gray-400">
          Request and track your payouts.
        </p>

        {/* WITHDRAWAL FORM */}

        <div className="mt-10 rounded-2xl border border-gray-800 bg-gray-900 p-8">
          <h2 className="text-2xl font-bold">
            Request Withdrawal
          </h2>

          {/* TRADING ACCOUNT */}

          <div className="mt-6">
            <label className="mb-2 block text-sm text-gray-400">
              Funded Trading Account
            </label>

            {accounts.length ===
            0 ? (
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                <p className="font-semibold text-yellow-400">
                  No active funded
                  accounts available
                </p>

                <p className="mt-1 text-sm text-gray-400">
                  Withdrawals are only
                  available from active
                  accounts in the funded
                  stage.
                </p>
              </div>
            ) : (
              <select
                value={
                  challengeId
                }
                onChange={(e) => {
                  setChallengeId(
                    e.target.value
                  );

                  setAmount("");
                }}
                className="w-full rounded-xl bg-gray-800 p-4 outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">
                  Select Trading
                  Account
                </option>

                {accounts.map(
                  (account) => (
                    <option
                      key={
                        account.id
                      }
                      value={
                        account.id
                      }
                    >
                      {
                        account.account
                      }

                      {account.mt5Login
                        ? ` - ${account.mt5Login}`
                        : ""}
                    </option>
                  )
                )}
              </select>
            )}
          </div>

          {/* AVAILABLE PROFIT */}

          {selectedAccount && (
            <div className="mt-5 rounded-xl border border-green-500/20 bg-green-500/10 p-5">
              <p className="text-sm text-gray-400">
                Available Withdrawable
                Profit
              </p>

              <p className="mt-2 text-3xl font-bold text-green-400">
                $
                {selectedAccount.withdrawableProfit.toLocaleString(
                  "en-US",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </p>

              <p className="mt-2 text-sm text-gray-400">
                Account:{" "}
                {
                  selectedAccount.account
                }
              </p>

              <p className="text-sm text-purple-400">
                Stage: Funded
              </p>

              <p className="text-sm text-green-400">
                Status: Active
              </p>

              {selectedAccount.mt5Login && (
                <p className="text-sm text-gray-400">
                  Login:{" "}
                  {
                    selectedAccount.mt5Login
                  }
                </p>
              )}
            </div>
          )}

          {/* AMOUNT */}

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm text-gray-400">
                Amount ($)
              </label>

              {selectedAccount &&
                selectedAccount.withdrawableProfit >
                  0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setAmount(
                        String(
                          selectedAccount.withdrawableProfit
                        )
                      )
                    }
                    className="text-sm font-semibold text-green-400 hover:text-green-300"
                  >
                    Withdraw Max
                  </button>
                )}
            </div>

            <input
              type="number"
              min="1"
              max={
                selectedAccount?.withdrawableProfit
              }
              value={amount}
              onChange={(e) =>
                setAmount(
                  e.target.value
                )
              }
              placeholder="Enter amount"
              disabled={
                !selectedAccount
              }
              className="w-full rounded-xl bg-gray-800 p-4 outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* PAYOUT METHOD */}

          <div className="mt-5">
            <label className="mb-2 block text-sm text-gray-400">
              Payout Method
            </label>

            <select
              value={method}
              onChange={(e) =>
                setMethod(
                  e.target.value
                )
              }
              className="w-full rounded-xl bg-gray-800 p-4 outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="BANK">
                Bank Transfer
              </option>

              <option value="CRYPTO">
                Crypto
              </option>
            </select>
          </div>

          {/* BANK */}

          {method === "BANK" && (
            <div className="mt-6 space-y-4">
              <input
                value={
                  accountName
                }
                onChange={(e) =>
                  setAccountName(
                    e.target.value
                  )
                }
                placeholder="Account Name"
                className="w-full rounded-xl bg-gray-800 p-4 outline-none focus:ring-2 focus:ring-green-500"
              />

              <input
                value={
                  accountNumber
                }
                onChange={(e) =>
                  setAccountNumber(
                    e.target.value
                  )
                }
                placeholder="Account Number"
                className="w-full rounded-xl bg-gray-800 p-4 outline-none focus:ring-2 focus:ring-green-500"
              />

              <input
                value={bankName}
                onChange={(e) =>
                  setBankName(
                    e.target.value
                  )
                }
                placeholder="Bank Name"
                className="w-full rounded-xl bg-gray-800 p-4 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          )}

          {/* CRYPTO */}

          {method === "CRYPTO" && (
            <div className="mt-6 space-y-4">
              <select
                value={
                  cryptoNetwork
                }
                onChange={(e) =>
                  setCryptoNetwork(
                    e.target.value
                  )
                }
                className="w-full rounded-xl bg-gray-800 p-4 outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">
                  Select Network
                </option>

                <option value="TRC20">
                  USDT - TRC20
                </option>

                <option value="ERC20">
                  USDT - ERC20
                </option>

                <option value="BEP20">
                  USDT - BEP20
                </option>
              </select>

              <input
                value={
                  walletAddress
                }
                onChange={(e) =>
                  setWalletAddress(
                    e.target.value
                  )
                }
                placeholder="Wallet Address"
                className="w-full rounded-xl bg-gray-800 p-4 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          )}

          {/* SUBMIT */}

          <button
            onClick={
              handleSubmit
            }
            disabled={
              loading ||
              !selectedAccount ||
              selectedAccount.withdrawableProfit <=
                0
            }
            className="mt-6 w-full rounded-xl bg-green-500 py-4 font-bold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Submitting..."
              : "Request Withdrawal"}
          </button>
        </div>

        {/* HISTORY */}

        <div className="mt-12">
          <h2 className="text-2xl font-bold">
            Withdrawal History
          </h2>

          {withdrawals.length ===
          0 ? (
            <div className="mt-6 rounded-xl bg-gray-900 p-6 text-gray-400">
              No withdrawal requests
              yet.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {withdrawals.map(
                (withdrawal) => (
                  <div
                    key={
                      withdrawal.id
                    }
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-800 bg-gray-900 p-6"
                  >
                    <div>
                      <p className="text-2xl font-bold">
                        $
                        {withdrawal.amount.toLocaleString(
                          "en-US",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </p>

                      {withdrawal.challenge && (
                        <p className="mt-2 text-sm font-semibold text-green-400">
                          {
                            withdrawal
                              .challenge
                              .account
                          }

                          {withdrawal
                            .challenge
                            .mt5Login
                            ? ` • ${withdrawal.challenge.mt5Login}`
                            : ""}
                        </p>
                      )}

                      <p className="mt-1 text-sm text-gray-400">
                        {withdrawal.method ===
                        "BANK"
                          ? "Bank Transfer"
                          : "Crypto"}{" "}
                        •{" "}
                        {new Date(
                          withdrawal.createdAt
                        ).toLocaleDateString()}
                      </p>

                      {withdrawal.adminNote && (
                        <p className="mt-2 text-sm text-red-300">
                          {
                            withdrawal.adminNote
                          }
                        </p>
                      )}
                    </div>

                    <StatusBadge
                      status={
                        withdrawal.status
                      }
                    />
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  if (status === "APPROVED") {
    return (
      <span className="rounded-full bg-green-500/20 px-4 py-2 text-sm font-bold text-green-400">
        🟢 Approved
      </span>
    );
  }

  if (status === "REJECTED") {
    return (
      <span className="rounded-full bg-red-500/20 px-4 py-2 text-sm font-bold text-red-400">
        🔴 Rejected
      </span>
    );
  }

  if (status === "PAID") {
    return (
      <span className="rounded-full bg-purple-500/20 px-4 py-2 text-sm font-bold text-purple-400">
        🟣 Paid
      </span>
    );
  }

  return (
    <span className="rounded-full bg-yellow-500/20 px-4 py-2 text-sm font-bold text-yellow-400">
      🟡 Pending
    </span>
  );
}