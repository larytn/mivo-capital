"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Mt5Connection = {
  id: string;
  server: string;
  status: string;
  connectionStatus: string | null;
  accountState: string | null;
  loginHint: string | null;
  lastSyncedAt: string | null;
};

type ConnectionResponse = {
  connection: Mt5Connection | null;
  providerConfigured?: boolean;
  error?: string;
};

const pendingSetupKey = "mivo.mt5.pending-connect.v1";

function statusLabel(status?: string | null) {
  switch (status) {
    case "CONNECTED": return "Connected";
    case "AWAITING_CREDENTIALS": return "Credentials needed";
    case "PENDING": return "Connecting";
    default: return "Not connected";
  }
}

function statusTone(status?: string | null) {
  return status === "CONNECTED"
    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
    : status === "PENDING" || status === "AWAITING_CREDENTIALS"
      ? "border-amber-300/30 bg-amber-300/10 text-amber-200"
      : "border-border bg-surface-raised text-muted";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not synced yet";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not synced yet";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function wait(ms: number) {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function AutomationPage() {
  const [server, setServer] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [connection, setConnection] = useState<Mt5Connection | null>(null);
  const [providerConfigured, setProviderConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<"connect" | "sync" | "disconnect" | "" >("");
  const [error, setError] = useState("");
  const [connectionIssue, setConnectionIssue] = useState("");
  const [message, setMessage] = useState("");

  const loadConnection = useCallback(async () => {
    try {
      const response = await fetch("/api/automation/mt5/connection", { cache: "no-store" });
      const result = (await response.json()) as ConnectionResponse;
      if (response.ok) {
        setConnection(result.connection);
        setProviderConfigured(result.providerConfigured === true);
        setConnectionIssue(result.error || "");
      } else {
        setConnectionIssue(result.error || "Unable to check the MT5 connection status.");
      }
    } catch {
      setConnectionIssue("Mivo could not reach the MT5 connection service. The next status check will retry.");
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadConnection(), 0);
    const timer = window.setInterval(loadConnection, 30_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [loadConnection]);

  async function connectAccount() {
    const selectedServer = server.trim();
    const selectedLogin = login.trim();
    if (!selectedServer) {
      setError("Enter the exact server name shown in your MT5 account details.");
      return;
    }
    if (!/^\d{1,32}$/.test(selectedLogin)) {
      setError("Enter the numeric MT5 account login shown in your account details.");
      return;
    }
    if (!password) {
      setError("Enter your MT5 investor password for read-only access.");
      return;
    }

    setBusy("connect");
    setError("");
    setConnectionIssue("");
    setMessage("");
    try {
      const setupKey = `${pendingSetupKey}:${selectedServer.toLowerCase()}:${selectedLogin}`;
      let transactionId = window.localStorage.getItem(setupKey);
      if (!transactionId) {
        transactionId = window.crypto.randomUUID().replaceAll("-", "");
        window.localStorage.setItem(setupKey, transactionId);
      }

      for (let attempt = 0; attempt < 8; attempt++) {
        const response = await fetch("/api/automation/mt5/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ server: selectedServer, login: selectedLogin, password, transactionId }),
        });
        const result = (await response.json()) as {
          pending?: boolean;
          retryAfter?: string | null;
          transactionId?: string;
          connection?: Pick<Mt5Connection, "server" | "status">;
          error?: string;
        };

        if (response.status === 202 || result.pending) {
          if (result.transactionId) {
            transactionId = result.transactionId;
            window.localStorage.setItem(setupKey, transactionId);
          }
          setMessage("Checking your MT5 server connection. The same secure request will be retried shortly.");
          const retrySeconds = Number(result.retryAfter);
          const delay = Number.isFinite(retrySeconds)
            ? Math.min(Math.max(retrySeconds, 2), 10) * 1000
            : 5000;
          await wait(delay);
          continue;
        }

        if (!response.ok) {
          window.localStorage.removeItem(setupKey);
          throw new Error(result.error || "Could not connect your MT5 account.");
        }
        window.localStorage.removeItem(setupKey);
        setServer(result.connection?.server || selectedServer);
        setLogin("");
        setMessage("MT5 connection started. Mivo will sync trades using read-only access.");
        await loadConnection();
        return;
      }

      setMessage("Your broker is still checking the connection. Refresh the status shortly to continue.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not connect your MT5 account.");
    } finally {
      setPassword("");
      setBusy("");
    }
  }

  async function syncNow() {
    setBusy("sync");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/automation/mt5/sync", { method: "POST" });
      const result = (await response.json()) as {
        status?: string;
        imported?: number;
        open?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "Could not sync your MT5 journal.");
      setMessage(result.status === "CONNECTED"
        ? `Sync complete. ${result.imported ?? 0} closed trades updated and ${result.open ?? 0} open positions refreshed.`
        : statusLabel(result.status));
      await loadConnection();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sync your MT5 journal.");
    } finally {
      setBusy("");
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect this MT5 account from automatic journaling? Existing journal entries will remain.")) return;
    setBusy("disconnect");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/automation/mt5/connection", { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not disconnect the MT5 account.");
      setConnection(null);
      setServer("");
      setLogin("");
      setPassword("");
      setMessage("MT5 disconnected. Trades already added to your journal were kept.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not disconnect the MT5 account.");
    } finally {
      setBusy("");
    }
  }

  const connected = connection?.status === "CONNECTED";

  return (
    <main className="min-h-screen bg-background px-5 py-9 text-foreground sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="text-sm text-muted transition hover:text-foreground">← Workspace</Link>

        <section className="mt-7 overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-[0_24px_80px_-48px_color-mix(in_srgb,var(--accent)_40%,transparent)] sm:p-9">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-[.22em] text-accent">Trade journal automation</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Your MT5 trades, already in your journal.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
                Connect MetaTrader 5 to import open positions and completed trades into Mivo. Your connection is read-only for journaling; Mivo does not place or manage orders.
              </p>
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${statusTone(connection?.status)}`}>
              <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-300" : connection ? "bg-amber-200" : "bg-muted"}`} />
              {statusLabel(connection?.status)}
            </span>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-muted">Connection</p>
              <p className="mt-2 text-sm font-bold">{connection ? `${connection.server}${connection.loginHint ? ` · ${connection.loginHint}` : ""}` : "No broker account connected"}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-muted">Last automatic sync</p>
              <p className="mt-2 text-sm font-bold">{formatDate(connection?.lastSyncedAt)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-muted">Sync schedule</p>
              <p className="mt-2 text-sm font-bold">Every minute while connected</p>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
          <section className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-accent">MT5 account login</p>
            <h2 className="mt-2 text-2xl font-extrabold">Connect your MetaTrader 5 account</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Enter the same server, login number and investor password you use for your MT5 account. The investor password gives Mivo read-only access for journaling.
            </p>

            {!connection ? (
              <>
                <label htmlFor="mt5-server" className="mt-6 block text-xs font-bold text-muted">Broker server</label>
                <input
                  id="mt5-server"
                  value={server}
                  onChange={(event) => setServer(event.target.value)}
                  placeholder="For example, Exness-MT5Trial"
                  autoComplete="off"
                  disabled={busy !== ""}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent disabled:opacity-60"
                />

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="mt5-login" className="block text-xs font-bold text-muted">MT5 account login</label>
                    <input
                      id="mt5-login"
                      inputMode="numeric"
                      value={login}
                      onChange={(event) => setLogin(event.target.value.replace(/\D/g, ""))}
                      placeholder="Account number"
                      autoComplete="off"
                      disabled={busy !== ""}
                      className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label htmlFor="mt5-password" className="block text-xs font-bold text-muted">Investor password</label>
                    <input
                      id="mt5-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Read-only password"
                      autoComplete="off"
                      disabled={busy !== ""}
                      className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent disabled:opacity-60"
                    />
                  </div>
                </div>

                <p className="mt-4 rounded-xl border border-border bg-background p-4 text-xs leading-5 text-muted">
                  Use your MT5 investor password, not your main trading password. Mivo sends it securely to MetaApi, which keeps the credential needed for ongoing read-only sync. Mivo does not save your password in its database or browser storage.
                </p>
              </>
            ) : (
              <div className="mt-6 rounded-2xl border border-border bg-background p-4">
                <p className="text-sm font-bold">An MT5 account is already linked</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {connection.status === "AWAITING_CREDENTIALS"
                    ? "This setup was started with the previous hosted flow. Disconnect it, then enter your MT5 login here."
                    : `${connection.server}${connection.loginHint ? ` · ${connection.loginHint}` : ""}`}
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              {!connection && (
                <button
                  type="button"
                  onClick={connectAccount}
                  disabled={busy !== "" || providerConfigured === false}
                  className="rounded-xl bg-accent px-5 py-3 text-sm font-extrabold text-accent-foreground shadow-lg shadow-emerald-950/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === "connect" ? "Connecting securely…" : "Connect read-only account"}
                </button>
              )}
              {connected && (
                <button type="button" onClick={syncNow} disabled={busy !== ""} className="rounded-xl border border-border bg-background px-5 py-3 text-sm font-bold transition hover:bg-surface-raised disabled:opacity-50">
                  {busy === "sync" ? "Syncing…" : "Sync now"}
                </button>
              )}
              {connection && (
                <button type="button" onClick={disconnect} disabled={busy !== ""} className="rounded-xl border border-border px-4 py-3 text-sm font-semibold text-muted transition hover:border-red-400/40 hover:text-red-300 disabled:opacity-50">
                  {busy === "disconnect" ? "Disconnecting…" : "Disconnect"}
                </button>
              )}
            </div>

            {providerConfigured === false && (
              <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/5 p-4 text-sm text-amber-100">MT5 sync has not been configured on the server yet. Add the MetaApi server credential before members can connect accounts.</p>
            )}
            {connectionIssue && <p role="status" className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/5 p-4 text-sm text-amber-100">{connectionIssue}</p>}
            {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-400/5 p-4 text-sm text-red-200">{error}</p>}
            {message && <p role="status" className="mt-4 rounded-xl border border-border bg-background p-4 text-sm text-muted">{message}</p>}
          </section>

          <aside className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-accent">Read-only trade journaling</p>
            <ol className="mt-5 space-y-5">
              {[
                ["01", "Enter your MT5 details", "Use your exact broker server, account login number and investor password."],
                ["02", "Connect in Mivo", "The account is connected in the background. There is no MetaApi setup-page redirect."],
                ["03", "Trades sync into Mivo", "Open positions and completed trades are imported into your journal automatically."],
              ].map(([number, title, description]) => (
                <li key={number} className="flex gap-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-accent/20 bg-accent/10 text-xs font-black text-accent">{number}</span>
                  <span><span className="block text-sm font-bold">{title}</span><span className="mt-1 block text-xs leading-5 text-muted">{description}</span></span>
                </li>
              ))}
            </ol>
            <div className="mt-7 rounded-2xl border border-border bg-background p-4">
              <p className="text-xs font-bold">Trade control stays with you</p>
              <p className="mt-2 text-xs leading-5 text-muted">This connection imports records only. It does not submit, modify, or close trades. You can disconnect at any time; existing journal entries stay in Mivo.</p>
            </div>
            <Link href="/journal" className="mt-5 inline-flex text-sm font-bold text-accent hover:underline">Open your trade journal →</Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
