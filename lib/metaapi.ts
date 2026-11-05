const PROVISIONING_API =
  "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";

export type MetaApiAccount = {
  _id?: string;
  id?: string;
  login?: string;
  server?: string;
  state?: string;
  connectionStatus?: string;
  region?: string;
  platform?: string;
};

export type MetaTraderAccountInformation = {
  platform?: string;
  currency?: string;
  server?: string;
  balance?: number;
  equity?: number;
  tradeAllowed?: boolean;
  investorMode?: boolean;
  marginMode?: string;
  login?: number | string;
  type?: string;
};

export type MetaApiDeal = {
  id?: string;
  positionId?: string;
  symbol?: string;
  type?: string;
  entryType?: string;
  time?: string;
  price?: number;
  volume?: number;
  profit?: number;
  commission?: number;
  swap?: number;
  stopLoss?: number;
  takeProfit?: number;
};

export type MetaApiPosition = {
  id?: string;
  symbol?: string;
  type?: string;
  time?: string;
  openPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  volume?: number;
  profit?: number;
  commission?: number;
  swap?: number;
  currentPrice?: number;
};

export class MetaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function providerErrorMessage(data: unknown, status: number, fallback: string) {
  if (!data || typeof data !== "object") return fallback;
  const body = data as { message?: unknown; details?: unknown; error?: unknown };
  const message = typeof body.message === "string" && body.message.trim()
    ? body.message.trim()
    : fallback;
  const detail = typeof body.details === "string" && body.details.trim()
    ? body.details.trim()
    : typeof body.error === "string" && body.error.trim() && body.error !== message
      ? body.error.trim()
      : "";
  const suffix = detail ? ` (${detail})` : "";
  return `${message}${suffix} [HTTP ${status}]`;
}

async function requestMetaApi(path: string, init: RequestInit) {
  try {
    return await fetch(`${PROVISIONING_API}${path}`, {
      ...init,
      cache: "no-store",
      signal: init.signal ?? AbortSignal.timeout(20000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new MetaApiError("MetaApi did not respond in time. Check the server connection and try again.", 504);
    }
    throw new MetaApiError("Mivo could not reach MetaApi. Check the server connection and try again.", 502);
  }
}

export function hasMetaApiToken() {
  return Boolean(process.env.META_API_TOKEN);
}

export async function metaApiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: { accept202?: boolean } = {},
): Promise<{ data: T | null; status: number; retryAfter: string | null }> {
  const token = process.env.META_API_TOKEN;
  if (!token) {
    throw new MetaApiError("MT5 sync is not configured on this server.", 503);
  }

  const response = await requestMetaApi(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
      "auth-token": token,
    },
  });

  const text = response.status === 204 ? "" : await response.text();
  let data: T | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = null;
    }
  }

  if (!response.ok && !(options.accept202 && response.status === 202)) {
    const providerMessage = providerErrorMessage(
      data,
      response.status,
      "MetaApi could not prepare this account.",
    );
    throw new MetaApiError(providerMessage, response.status);
  }

  return {
    data,
    status: response.status,
    retryAfter: response.headers.get("retry-after"),
  };
}

export function metaApiClientUrl(region: string, path: string) {
  if (!/^[a-z0-9-]+$/i.test(region)) {
    throw new MetaApiError("MetaApi returned an invalid account region.", 502);
  }
  return `https://mt-client-api-v1.${region}.agiliumtrade.ai${path}`;
}

export async function copyFactoryRequest<T>(
  region: string,
  path: string,
  init: RequestInit = {},
): Promise<T | null> {
  const token = process.env.META_API_TOKEN;
  if (!token) throw new MetaApiError("Live MT5 copy is not configured on this server.", 503);
  if (!/^[a-z0-9-]+$/i.test(region) || !path.startsWith("/users/current/")) {
    throw new MetaApiError("Invalid CopyFactory request.", 400);
  }

  let response: Response;
  try {
    response = await fetch(`https://copyfactory-api-v1.${region}.agiliumtrade.ai${path}`, {
      ...init,
      cache: "no-store",
      signal: init.signal ?? AbortSignal.timeout(25000),
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
        "auth-token": token,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new MetaApiError("CopyFactory did not respond in time. Try again shortly.", 504);
    }
    throw new MetaApiError("Mivo could not reach the live copy service.", 502);
  }

  const responseText = response.status === 204 ? "" : await response.text();
  let data: unknown = null;
  if (responseText) {
    try { data = JSON.parse(responseText); } catch { data = null; }
  }
  if (!response.ok) {
    throw new MetaApiError(providerErrorMessage(data, response.status, "CopyFactory could not complete the request."), response.status);
  }
  return data as T | null;
}

export async function metaApiClientRequest<T>(
  region: string,
  path: string,
): Promise<T> {
  const token = process.env.META_API_TOKEN;
  if (!token) {
    throw new MetaApiError("MT5 sync is not configured on this server.", 503);
  }

  let response: Response;
  try {
    response = await fetch(metaApiClientUrl(region, path), {
      headers: { Accept: "application/json", "auth-token": token },
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new MetaApiError("MetaApi trade-history request timed out. Try syncing again shortly.", 504);
    }
    throw new MetaApiError("Mivo could not reach the MetaApi trade-history service.", 502);
  }
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!response.ok) {
    const providerMessage = providerErrorMessage(
      data,
      response.status,
      "MetaApi could not return the trade history.",
    );
    throw new MetaApiError(providerMessage, response.status);
  }
  return data as T;
}
