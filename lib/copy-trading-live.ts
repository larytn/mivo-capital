import {
  copyFactoryRequest,
  metaApiClientRequest,
  metaApiRequest,
  MetaApiError,
  type MetaApiAccount,
  type MetaTraderAccountInformation,
} from "@/lib/metaapi";
import { copyFactoryCommissionSettings } from "@/lib/copy-trading-fees";

export const LIVE_COPY_ENABLED = process.env.META_API_COPYFACTORY_ENABLED === "true";

export type CopyFactoryRole = "PROVIDER" | "SUBSCRIBER";

export async function inspectCopyTradingAccount(metaApiAccountId: string) {
  const { data: account } = await metaApiRequest<MetaApiAccount>(
    `/users/current/accounts/${encodeURIComponent(metaApiAccountId)}`,
  );
  const region = account?.region;
  if (!region) throw new MetaApiError("MetaApi has not returned a deployment region for this account.", 409);
  const information = await metaApiClientRequest<MetaTraderAccountInformation>(
    region,
    `/users/current/accounts/${encodeURIComponent(metaApiAccountId)}/account-information?refreshTerminalState=true`,
  );
  if (account?.connectionStatus !== "CONNECTED" || account?.state !== "DEPLOYED") {
    throw new MetaApiError("Wait until the MetaTrader account is connected and deployed, then try again.", 409);
  }
  if (account.platform?.toLowerCase() !== "mt5") {
    throw new MetaApiError("Mivo live copy trading currently supports MT5 accounts only.", 400);
  }
  if (information.type !== "ACCOUNT_TRADE_MODE_REAL") {
    throw new MetaApiError("Live copy trading accepts real broker accounts only. Demo and contest accounts are not eligible.", 400);
  }
  if (information.marginMode !== "ACCOUNT_MARGIN_MODE_RETAIL_HEDGING") {
    throw new MetaApiError("This copy service requires an MT account using hedging mode. Netting and exchange mode are not supported.", 400);
  }
  return { account, information, region };
}

export async function enableCopyFactoryRole(accountId: string, region: string, role: CopyFactoryRole) {
  if (!LIVE_COPY_ENABLED) {
    throw new MetaApiError("Live copy activation is disabled until Mivo enables its paid MetaApi CopyFactory service.", 503);
  }
  await metaApiRequest(
    `/users/current/accounts/${encodeURIComponent(accountId)}/enable-copy-factory-api`,
    {
      method: "POST",
      body: JSON.stringify({ copyFactoryRoles: [role], copyFactoryResourceSlots: 1 }),
    },
  );
  return region;
}

export async function createOrUpdateProviderStrategy(input: {
  region: string;
  strategyId?: string | null;
  accountId: string;
  name: string;
  description: string;
  copierProfitShareRate: number;
}) {
  const commissionSettings = copyFactoryCommissionSettings(input.copierProfitShareRate);
  if (!commissionSettings) throw new MetaApiError("The provider's copier profit share must be between 0% and 90%.", 400);
  const strategyId = input.strategyId || (await copyFactoryRequest<{ id?: string }>(
    input.region,
    "/users/current/configuration/unused-strategy-id",
  ))?.id;
  if (!strategyId) throw new MetaApiError("CopyFactory did not allocate a strategy identifier.", 502);

  await copyFactoryRequest(
    input.region,
    `/users/current/configuration/strategies/${encodeURIComponent(strategyId)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        name: input.name.slice(0, 80),
        description: input.description.slice(0, 1200),
        accountId: input.accountId,
        commissionScheme: {
          type: "high-water-mark",
          billingPeriod: "month",
          commissionRate: commissionSettings.commissionRate,
        },
        // CopyFactory's platform rate applies to the total commission. Set it so Mivo receives
        // exactly 10% of eligible profit; the remainder of the commission goes to the provider.
        platformCommissionRate: commissionSettings.platformCommissionRate,
        skipPendingOrders: true,
        copyStopLoss: true,
        copyTakeProfit: true,
        closeOnRemovalMode: "close-gracefully-by-position",
      }),
    },
  );
  return strategyId;
}

export type CopyFactorySubscription = {
  strategyId: string;
  maxTradeRisk?: number;
  tradeSizeScaling?: { mode: "fixedRisk"; riskFraction: number; maxRiskCoefficient: number };
  copyStopLoss?: boolean;
  copyTakeProfit?: boolean;
  skipPendingOrders?: boolean;
  closeOnly?: "by-strategy" | "immediately";
};

export type CopyFactorySubscriber = {
  _id: string;
  name?: string;
  subscriptions?: CopyFactorySubscription[];
};

export async function updateCopyFactorySubscription(input: {
  region: string;
  accountId: string;
  accountName: string;
  strategyId: string;
  riskPercent: number;
  action: "start" | "pause" | "resume" | "stop";
}) {
  let subscriber: CopyFactorySubscriber | null = null;
  try {
    subscriber = await copyFactoryRequest<CopyFactorySubscriber>(
      input.region,
      `/users/current/configuration/subscribers/${encodeURIComponent(input.accountId)}`,
    );
  } catch (error) {
    if (!(error instanceof MetaApiError && error.status === 404)) throw error;
  }

  const current = subscriber?.subscriptions ?? [];
  const existing = current.find((item) => item.strategyId === input.strategyId);
  let subscriptions: CopyFactorySubscription[];
  if (input.action === "stop") {
    subscriptions = current.filter((item) => item.strategyId !== input.strategyId);
  } else if (input.action === "pause") {
    if (!existing) throw new MetaApiError("This live copy subscription is not active at MetaApi.", 409);
    subscriptions = current.map((item) => item.strategyId === input.strategyId ? { ...item, closeOnly: "by-strategy" } : item);
  } else if (input.action === "resume") {
    if (!existing) throw new MetaApiError("This live copy subscription is not active at MetaApi.", 409);
    subscriptions = current.map((item) => {
      if (item.strategyId !== input.strategyId) return item;
      const active = { ...item };
      delete active.closeOnly;
      return active;
    });
  } else {
    if (existing) throw new MetaApiError("This account already has a subscription to that strategy.", 409);
    subscriptions = [
      ...current,
      {
        strategyId: input.strategyId,
        maxTradeRisk: input.riskPercent / 100,
        tradeSizeScaling: { mode: "fixedRisk", riskFraction: input.riskPercent / 100, maxRiskCoefficient: 1 },
        copyStopLoss: true,
        copyTakeProfit: true,
        skipPendingOrders: true,
      },
    ];
  }

  await copyFactoryRequest(
    input.region,
    `/users/current/configuration/subscribers/${encodeURIComponent(input.accountId)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        name: (subscriber?.name || input.accountName).slice(0, 80),
        subscriptions,
      }),
    },
  );
}
