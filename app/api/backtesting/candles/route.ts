
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type AssetClass =
  | "synthetic"
  | "crypto"
  | "forex"
  | "metal"
  | "stock"
  | "futures"
  | "commodity";

type CandleCacheEntry = {
  payload: { candles: Candle[]; provider: string; symbol: string; interval: string };
  expiresAt: number;
};

const candleResponseCache = new Map<string, CandleCacheEntry>();
const candleRequestsInFlight = new Map<
  string,
  Promise<{ candles: Candle[]; provider: string; symbol: string; interval: string }>
>();

const BINANCE_INTERVALS = new Set([
  "1m", "3m", "5m", "15m", "30m",
  "1h", "2h", "4h", "6h", "8h", "12h",
  "1d", "3d", "1w",
]);

const BINANCE_INTERVAL_MS: Record<string, number> = {
  "1m": 60_000, "3m": 180_000, "5m": 300_000, "15m": 900_000,
  "30m": 1_800_000, "1h": 3_600_000, "2h": 7_200_000,
  "4h": 14_400_000, "6h": 21_600_000, "8h": 28_800_000,
  "12h": 43_200_000, "1d": 86_400_000, "3d": 259_200_000,
  "1w": 604_800_000,
};

const BINANCE_KLINE_ENDPOINTS = [
  "https://data-api.binance.vision/api/v3/klines",
  "https://api.binance.com/api/v3/klines",
  "https://api1.binance.com/api/v3/klines",
];

const TWELVE_DATA_INTERVALS: Record<string, string> = {
  "1m": "1min",
  "5m": "5min",
  "15m": "15min",
  "30m": "30min",
  "1h": "1h",
  "2h": "2h",
  "4h": "4h",
  "1d": "1day",
};

const TWELVE_DATA_INTERVAL_SECONDS: Record<string, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "30m": 1800,
  "1h": 3600,
  "2h": 7200,
  "4h": 14400,
  "1d": 86400,
};

// These are user-facing aliases. Convert them to symbols that the provider's
// own catalog uses before requesting candles.
const TWELVE_DATA_SYMBOL_ALIASES: Partial<Record<AssetClass, Record<string, string>>> = {
  metal: {
    COPPER: "HG1",
  },
  commodity: {
    WTI: "WTI/USD",
    BRENT: "XBR/USD",
  },
};

const DERIV_SYMBOL_ALIASES: Record<string, string> = {
  "STEP INDEX": "stpRNG",
};

// Twelve Data is the primary feed for the app. Yahoo's chart endpoint is a
// fallback for tickers that are missing from the configured Twelve Data plan.
// Futures use continuous symbols there, so the replay is a continuous contract
// series rather than a specific dated contract.
const YAHOO_SYMBOLS: Partial<Record<AssetClass, Record<string, string>>> = {
  crypto: {
    BTCUSDT: "BTC-USD", ETHUSDT: "ETH-USD", BNBUSDT: "BNB-USD",
    SOLUSDT: "SOL-USD", XRPUSDT: "XRP-USD", ADAUSDT: "ADA-USD",
    DOGEUSDT: "DOGE-USD", TRXUSDT: "TRX-USD", LINKUSDT: "LINK-USD",
    AVAXUSDT: "AVAX-USD", DOTUSDT: "DOT-USD", LTCUSDT: "LTC-USD",
    BCHUSDT: "BCH-USD", ATOMUSDT: "ATOM-USD", NEARUSDT: "NEAR-USD",
    APTUSDT: "APT-USD", ARBUSDT: "ARB-USD", OPUSDT: "OP-USD",
    SUIUSDT: "SUI-USD", TONUSDT: "TON-USD", BTCUSD: "BTC-USD",
    ETHBTC: "ETH-BTC",
  },
  forex: {
    "EUR/USD": "EURUSD=X", "GBP/USD": "GBPUSD=X", "USD/JPY": "JPY=X",
    "AUD/USD": "AUDUSD=X", "USD/CAD": "CAD=X", "USD/CHF": "CHF=X",
    "NZD/USD": "NZDUSD=X", "EUR/GBP": "EURGBP=X", "EUR/JPY": "EURJPY=X",
    "EUR/CHF": "EURCHF=X", "EUR/CAD": "EURCAD=X", "EUR/AUD": "EURAUD=X",
    "EUR/NZD": "EURNZD=X", "GBP/JPY": "GBPJPY=X", "GBP/CHF": "GBPCHF=X",
    "GBP/CAD": "GBPCAD=X", "GBP/AUD": "GBPAUD=X", "GBP/NZD": "GBPNZD=X",
    "AUD/JPY": "AUDJPY=X", "AUD/CAD": "AUDCAD=X", "AUD/CHF": "AUDCHF=X",
    "AUD/NZD": "AUDNZD=X", "CAD/JPY": "CADJPY=X", "CHF/JPY": "CHFJPY=X",
    "NZD/JPY": "NZDJPY=X", "NZD/CAD": "NZDCAD=X", "NZD/CHF": "NZDCHF=X",
    "CAD/CHF": "CADCHF=X",
  },
  stock: {
    AAPL: "AAPL", MSFT: "MSFT", NVDA: "NVDA", TSLA: "TSLA", AMZN: "AMZN",
    GOOGL: "GOOGL", META: "META", AMD: "AMD", NFLX: "NFLX", INTC: "INTC",
    ORCL: "ORCL", IBM: "IBM", DIS: "DIS", JPM: "JPM", BAC: "BAC", KO: "KO",
    PEP: "PEP", WMT: "WMT", COST: "COST", SHOP: "SHOP", UBER: "UBER",
    PLTR: "PLTR", COIN: "COIN", BABA: "BABA", T: "T",
  },
  futures: {
    ES: "ES=F", NQ: "NQ=F", YM: "YM=F", RTY: "RTY=F", MES: "MES=F",
    MNQ: "MNQ=F", MYM: "MYM=F", M2K: "M2K=F", CL: "CL=F", MCL: "MCL=F",
    GC: "GC=F", MGC: "MGC=F", SI: "SI=F", HG: "HG=F", NG: "NG=F",
    ZB: "ZB=F", ZN: "ZN=F", ZF: "ZF=F", ZT: "ZT=F", "6E": "6E=F",
    "6J": "6J=F",
  },
  commodity: {
    WTI: "CL=F", BRENT: "BZ=F", NATURALGAS: "NG=F", CORN: "ZC=F",
    WHEAT: "ZW=F", SOYBEAN: "ZS=F", SUGAR: "SB=F", COFFEE: "KC=F",
    COTTON: "CT=F", COCOA: "CC=F",
  },
};

const DERIV_GRANULARITIES: Record<string, number> = {
  "1m": 60,
  "2m": 120,
  "3m": 180,
  "5m": 300,
  "10m": 600,
  "15m": 900,
  "30m": 1800,
  "1h": 3600,
  "2h": 7200,
  "4h": 14400,
  "8h": 28800,
  "1d": 86400,
};

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function validCandle(candle: Candle) {
  return (
    Number.isFinite(candle.time) &&
    Number.isFinite(candle.open) &&
    Number.isFinite(candle.high) &&
    Number.isFinite(candle.low) &&
    Number.isFinite(candle.close) &&
    candle.time > 0
  );
}

function normalizeCandles(candles: Candle[]): Candle[] {
  const unique = new Map<number, Candle>();

  for (const candle of candles) {
    if (validCandle(candle)) {
      unique.set(candle.time, candle);
    }
  }

  return [...unique.values()].sort((a, b) => a.time - b.time);
}

type CandleFeed = {
  provider: string;
  load: (signal: AbortSignal) => Promise<Candle[]>;
};

async function getFirstAvailableCandles(
  feeds: CandleFeed[],
  timeoutMs = 8_000,
): Promise<{ candles: Candle[]; provider: string }> {
  const controllers = feeds.map(() => new AbortController());
  const attempts = feeds.map((feed, index) =>
    feed
      .load(
        AbortSignal.any([
          controllers[index].signal,
          AbortSignal.timeout(timeoutMs),
        ]),
      )
      .then((candles) => {
        if (!candles.length) throw new Error(`${feed.provider} returned no candles.`);
        return { candles, provider: feed.provider };
      }),
  );

  try {
    return await Promise.any(attempts);
  } catch (error) {
    const causes =
      error instanceof AggregateError
        ? error.errors
            .map((cause) =>
              cause instanceof Error ? cause.message : String(cause),
            )
            .filter(Boolean)
        : [error instanceof Error ? error.message : "All market data feeds failed."];
    throw new Error(causes.join(" Backup feed: "));
  } finally {
    controllers.forEach((controller) => controller.abort());
  }
}

async function getBinanceCandles(
  symbol: string,
  interval: string,
  start: number,
  end: number,
  signal?: AbortSignal,
): Promise<Candle[]> {
  if (!BINANCE_INTERVALS.has(interval)) {
    throw new Error(
      `Binance does not support the ${interval} timeframe. Choose another timeframe.`,
    );
  }

  const errors: string[] = [];
  const endMs = end * 1000;
  const initialCursor = Math.max(
    start * 1000,
    endMs - 366 * 24 * 60 * 60 * 1000,
  );

  for (const endpoint of BINANCE_KLINE_ENDPOINTS) {
    try {
      const candleMs = BINANCE_INTERVAL_MS[interval];
      // Binance returns at most 1,000 bars per request. Page by that many bars
      // (the old code advanced by one bar and capped out at only 20 candles).
      const requestWindowMs = candleMs * 1000;
      const pageCount = Math.ceil((endMs - initialCursor + 1) / requestWindowMs);
      const candles: Candle[] = [];
      const pageBatchSize = 8;

      for (let firstPage = 0; firstPage < pageCount; firstPage += pageBatchSize) {
        const batchLength = Math.min(pageBatchSize, pageCount - firstPage);
        const chunks = await Promise.all(
          Array.from({ length: batchLength }, async (_, batchIndex) => {
            const page = firstPage + batchIndex;
            const cursor = initialCursor + page * requestWindowMs;
            const pageEnd = Math.min(
              endMs,
              cursor + requestWindowMs - 1,
            );
            const url = new URL(endpoint);
            url.searchParams.set("symbol", symbol.toUpperCase().replaceAll("/", ""));
            url.searchParams.set("interval", interval);
            url.searchParams.set("startTime", String(cursor));
            url.searchParams.set("endTime", String(pageEnd));
            url.searchParams.set("limit", "1000");

            const response = await fetch(url, {
              cache: "no-store",
              signal: signal
                ? AbortSignal.any([signal, AbortSignal.timeout(5500)])
                : AbortSignal.timeout(5500),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const rows: unknown = await response.json();
            if (!Array.isArray(rows)) throw new Error("Invalid candle response");
            return (rows as unknown[][]).map((row) => ({
              time: Math.floor(Number(row[0]) / 1000),
              open: Number(row[1]),
              high: Number(row[2]),
              low: Number(row[3]),
              close: Number(row[4]),
            }));
          }),
        );
        candles.push(...chunks.flat());
      }

      const result = normalizeCandles(
        candles.filter(
          (candle) => candle.time >= start && candle.time <= end,
        ),
      );
      if (result.length) return result;
      errors.push(`${new URL(endpoint).hostname} returned no candles`);
    } catch (error) {
      errors.push(
        `${new URL(endpoint).hostname}: ${
          error instanceof Error ? error.message : "request failed"
        }`,
      );
    }
  }

  throw new Error(
    `Could not load ${symbol} from Binance market-data endpoints. Check your network connection or try again. ${errors.join("; ")}`,
  );
}

function getTwelveDataCryptoSymbol(symbol: string) {
  const normalized = symbol.toUpperCase().replaceAll("/", "");
  const match = normalized.match(/^([A-Z0-9]+)(USDT|USD|BTC)$/);
  if (!match) return symbol;
  const quote = match[2] === "USDT" ? "USD" : match[2];
  return `${match[1]}/${quote}`;
}

async function getTwelveDataCandles(
  symbol: string,
  interval: string,
  start: number,
  end: number,
  signal?: AbortSignal,
): Promise<Candle[]> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Twelve Data API key is missing. Add TWELVE_DATA_API_KEY to the app's environment settings. For the deployed site, configure it in Vercel Production.",
    );
  }

  const providerInterval = TWELVE_DATA_INTERVALS[interval];
  const intervalSeconds = TWELVE_DATA_INTERVAL_SECONDS[interval];

  if (!providerInterval || !intervalSeconds) {
    throw new Error(
      `The ${interval} timeframe is not supported by this Twelve Data adapter. Choose 1m, 5m, 15m, 30m, 1H, 2H, 4H, or 1D.`,
    );
  }

  // Twelve Data returns at most 5,000 values per response. Split larger
  // histories into bounded windows so a long replay does not silently stop
  // at the provider's response limit.
  const formatUtc = (seconds: number) =>
    new Date(seconds * 1000)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);
  const maxPointsPerWindow = 4_500;
  const maxWindows = 32;
  const windows: Array<{ start: number; end: number }> = [];
  for (
    let windowStart = start;
    windowStart <= end;
    windowStart += intervalSeconds * maxPointsPerWindow
  ) {
    windows.push({
      start: windowStart,
      end: Math.min(
        end,
        windowStart + intervalSeconds * maxPointsPerWindow - 1,
      ),
    });
  }

  if (windows.length > maxWindows) {
    throw new Error(
      `This ${interval} history is too large to load reliably. Choose a shorter replay range or a higher timeframe.`,
    );
  }

  const loadWindow = async (window: { start: number; end: number }) => {
    const url = new URL("https://api.twelvedata.com/time_series");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", providerInterval);
    url.searchParams.set("start_date", formatUtc(window.start));
    url.searchParams.set("end_date", formatUtc(window.end));
    url.searchParams.set("timezone", "UTC");
    url.searchParams.set("order", "ASC");
    url.searchParams.set("outputsize", String(maxPointsPerWindow));
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url, {
      cache: "no-store",
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(7500)])
        : AbortSignal.timeout(7500),
    });
    if (!response.ok) {
      throw new Error(`Twelve Data request failed (HTTP ${response.status}).`);
    }

    const data = await response.json();
    if (data.status === "error" || data.code) {
      throw new Error(data.message || "Twelve Data rejected this symbol or timeframe.");
    }
    if (!Array.isArray(data.values)) {
      throw new Error("Twelve Data returned no historical candles for part of this range.");
    }

    return (data.values as Array<{
      datetime: string;
      open: string;
      high: string;
      low: string;
      close: string;
    }>).map((item) => {
      const raw = item.datetime;
      const timestamp = /^\d{4}-\d{2}-\d{2}$/.test(raw)
        ? `${raw}T00:00:00Z`
        : /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
          ? `${raw.replace(" ", "T")}Z`
          : raw;
      return {
        time: Math.floor(new Date(timestamp).getTime() / 1000),
        open: Number(item.open),
        high: Number(item.high),
        low: Number(item.low),
        close: Number(item.close),
      } satisfies Candle;
    });
  };

  const candles: Candle[] = [];
  const windowConcurrency = 4;
  for (let index = 0; index < windows.length; index += windowConcurrency) {
    const batch = windows.slice(index, index + windowConcurrency);
    candles.push(...(await Promise.all(batch.map(loadWindow))).flat());
  }

  const filtered = normalizeCandles(
    candles.filter((candle) => candle.time >= start && candle.time <= end),
  );

  if (filtered.length === 0) {
    throw new Error(
      `No candles were returned for ${symbol} within the selected dates. Check historical data availability and your API plan.`,
    );
  }

  return filtered;
}

function getYahooSymbol(assetClass: AssetClass, symbol: string) {
  return YAHOO_SYMBOLS[assetClass]?.[symbol.toUpperCase()] ?? null;
}

function aggregateFourHourCandles(candles: Candle[]): Candle[] {
  const bucketSeconds = 4 * 60 * 60;
  const buckets = new Map<number, Candle>();

  for (const candle of candles) {
    const bucketTime = Math.floor(candle.time / bucketSeconds) * bucketSeconds;
    const current = buckets.get(bucketTime);
    if (!current) {
      buckets.set(bucketTime, { ...candle, time: bucketTime });
      continue;
    }

    current.high = Math.max(current.high, candle.high);
    current.low = Math.min(current.low, candle.low);
    current.close = candle.close;
  }

  return [...buckets.values()].sort((a, b) => a.time - b.time);
}

async function getYahooCandles(
  assetClass: AssetClass,
  symbol: string,
  interval: string,
  start: number,
  end: number,
  signal?: AbortSignal,
): Promise<Candle[]> {
  const yahooSymbol = getYahooSymbol(assetClass, symbol);
  if (!yahooSymbol) {
    throw new Error(`No Yahoo Finance mapping is configured for ${symbol}.`);
  }

  const yahooInterval = interval === "1h" || interval === "4h" ? "60m" : interval;
  const intraday = yahooInterval !== "1d";
  const rangeSeconds = end - start;
  if (yahooInterval === "1m" && rangeSeconds > 7 * 24 * 60 * 60) {
    throw new Error("Yahoo Finance only provides 1-minute history for the past 7 days. Use a shorter date range or choose 5m or higher.");
  }
  if (intraday && yahooInterval !== "1m" && rangeSeconds > 60 * 24 * 60 * 60) {
    throw new Error("Yahoo Finance intraday history is limited to 60 days. Choose a shorter date range or use the daily timeframe.");
  }

  const url = new URL(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}`,
  );
  url.searchParams.set("period1", String(start));
  url.searchParams.set("period2", String(end + 1));
  url.searchParams.set("interval", yahooInterval);
  url.searchParams.set("events", "history");
  url.searchParams.set("includePrePost", "true");

  const response = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0 MivoCapitalBacktesting/1.0" },
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(7500)])
      : AbortSignal.timeout(7500),
  });
  if (!response.ok) {
    throw new Error(`Yahoo Finance returned HTTP ${response.status} for ${symbol}.`);
  }

  const payload = await response.json();
  const chartResult = payload?.chart?.result?.[0];
  if (payload?.chart?.error || !chartResult) {
    throw new Error(payload?.chart?.error?.description || `Yahoo Finance has no history for ${symbol}.`);
  }

  const timestamps: unknown[] = chartResult.timestamp ?? [];
  const quote = chartResult.indicators?.quote?.[0];
  if (!quote || !Array.isArray(timestamps)) {
    throw new Error(`Yahoo Finance returned no candles for ${symbol}.`);
  }

  const candles = normalizeCandles(
    timestamps.map((timestamp, index) => {
      const numericValue = (value: unknown) =>
        value === null || value === undefined ? Number.NaN : Number(value);
      return {
        time: numericValue(timestamp),
        open: numericValue(quote.open?.[index]),
        high: numericValue(quote.high?.[index]),
        low: numericValue(quote.low?.[index]),
        close: numericValue(quote.close?.[index]),
      };
    }).filter((candle) => candle.time >= start && candle.time <= end),
  );
  const result = interval === "4h" ? aggregateFourHourCandles(candles) : candles;
  if (!result.length) {
    throw new Error(`Yahoo Finance returned no candles for ${symbol} in the selected date range.`);
  }
  return result;
}

async function getDerivCandles(
  symbol: string,
  interval: string,
  start: number,
  end: number,
): Promise<Candle[]> {
  const granularity = DERIV_GRANULARITIES[interval];

  if (!granularity) {
    throw new Error(
      `Deriv does not support the ${interval} timeframe in this adapter.`,
    );
  }

  return new Promise((resolve, reject) => {
    const socket = new WebSocket(
      "wss://api.derivws.com/trading/v1/options/ws/public",
    );

    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);

      try {
        socket.close();
      } catch {
        // Socket may already be closed.
      }

      callback();
    };

    const timeout = setTimeout(() => {
      finish(() =>
        reject(
          new Error(
            "Deriv timed out while loading historical candles.",
          ),
        ),
      );
    }, 8000);

    const count = Math.min(
      5000,
      Math.max(1, Math.ceil((end - start) / granularity) + 2),
    );

    socket.addEventListener("open", () => {
      try {
        socket.send(
          JSON.stringify({
            ticks_history: DERIV_SYMBOL_ALIASES[symbol.toUpperCase()] ?? symbol,
            start,
            end: String(end),
            count,
            style: "candles",
            granularity,
            adjust_start_time: 1,
          }),
        );
      } catch {
        finish(() => reject(new Error("Could not request candles from Deriv.")));
      }
    });

    socket.addEventListener("message", (event) => {
      let data: {
        error?: { message?: string };
        candles?: Array<{
          epoch: number;
          open: number | string;
          high: number | string;
          low: number | string;
          close: number | string;
        }>;
      };

      try {
        data = JSON.parse(String(event.data));
      } catch {
        finish(() =>
          reject(new Error("Invalid response from Deriv.")),
        );
        return;
      }

      if (data.error) {
        finish(() =>
          reject(
            new Error(
              data.error?.message ||
                "Deriv rejected the request.",
            ),
          ),
        );
        return;
      }

      if (data.candles) {
        const candles = data.candles.map((candle) => ({
          time: Number(candle.epoch),
          open: Number(candle.open),
          high: Number(candle.high),
          low: Number(candle.low),
          close: Number(candle.close),
        }));

        finish(() =>
          resolve(
            normalizeCandles(
              candles.filter(
                (candle) =>
                  candle.time >= start &&
                  candle.time <= end,
              ),
            ),
          ),
        );
      }
    });

    socket.addEventListener("error", () => {
      finish(() =>
        reject(
          new Error("Could not connect to Deriv market data."),
        ),
      );
    });

    socket.addEventListener("close", () => {
      if (!settled) {
        finish(() =>
          reject(
            new Error(
              "Deriv closed the connection before returning candles.",
            ),
          ),
        );
      }
    });
  });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const assetClass = params.get("assetClass") || "crypto";
  const symbol = (params.get("symbol") || "").trim();
  const interval = params.get("interval") || "1h";
  const start = Number(params.get("start"));
  const end = Number(params.get("end"));

  const allowedClasses = [
    "synthetic",
    "crypto",
    "forex",
    "metal",
    "stock",
    "futures",
    "commodity",
  ];

  if (!allowedClasses.includes(assetClass)) {
    return errorResponse("Unsupported market category.");
  }

  if (!symbol) {
    return errorResponse("Select or enter a market symbol.");
  }

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start <= 0 ||
    end <= 0 ||
    start > end
  ) {
    return errorResponse("Choose a valid start and end date.");
  }

  if (end - start > 366 * 24 * 60 * 60) {
    return errorResponse(
      "Choose a date range of one year or less.",
    );
  }

  const endDay = new Date(end * 1000).toISOString().slice(0, 10);
  const isLiveRange = endDay === new Date().toISOString().slice(0, 10);
  const cacheKey = [assetClass, symbol.toUpperCase(), interval, start, end].join(":");
  const cacheControl = isLiveRange
    ? "public, s-maxage=15, stale-while-revalidate=45"
    : "public, s-maxage=3600, stale-while-revalidate=86400";
  const now = Date.now();
  const cached = candleResponseCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.payload, {
      headers: { "Cache-Control": cacheControl },
    });
  }
  if (cached) candleResponseCache.delete(cacheKey);

  let requestPromise = candleRequestsInFlight.get(cacheKey);
  if (!requestPromise) {
    requestPromise = (async () => {
    let candles: Candle[];
    let provider: string;
    const marketClass = assetClass as AssetClass;

    if (marketClass === "synthetic") {
      candles = await getDerivCandles(
        symbol,
        interval,
        start,
        end,
      );
      provider = "Deriv";
    } else if (marketClass === "crypto") {
      const result = await getFirstAvailableCandles([
        {
          provider: "Binance",
          load: (signal) => getBinanceCandles(symbol, interval, start, end, signal),
        },
        {
          provider: "Twelve Data (crypto fallback)",
          load: (signal) =>
            getTwelveDataCandles(
              getTwelveDataCryptoSymbol(symbol),
              interval,
              start,
              end,
              signal,
            ),
        },
        {
          provider: "Yahoo Finance (crypto fallback)",
          load: (signal) =>
            getYahooCandles(marketClass, symbol, interval, start, end, signal),
        },
      ], 15_000);
      candles = result.candles;
      provider = result.provider;
    } else if (marketClass === "futures") {
      // Use Yahoo's explicit continuous-contract symbols (ES=F, NQ=F, etc.).
      // Sending bare codes such as ES to a stock feed can resolve to an
      // unrelated company with the same ticker.
      const result = await getFirstAvailableCandles([
        {
          provider: "Yahoo Finance (continuous futures)",
          load: (signal) =>
            getYahooCandles(marketClass, symbol, interval, start, end, signal),
        },
      ]);
      candles = result.candles;
      provider = result.provider;
    } else {
      const providerSymbol =
        TWELVE_DATA_SYMBOL_ALIASES[marketClass]?.[symbol.toUpperCase()] ?? symbol;
      const feeds: CandleFeed[] = [
        {
          provider: "Twelve Data",
          load: (signal) =>
            getTwelveDataCandles(providerSymbol, interval, start, end, signal),
        },
      ];

      // A spot metal must not silently fall back to a futures contract. The
      // futures/spot basis makes that a different instrument and price.
      if (marketClass !== "metal") {
        feeds.push({
          provider: marketClass === "commodity"
            ? "Yahoo Finance (continuous futures fallback)"
            : "Yahoo Finance (fallback)",
          load: (signal) =>
            getYahooCandles(marketClass, symbol, interval, start, end, signal),
        });
      }

      const result = await getFirstAvailableCandles(
        feeds,
        marketClass === "forex" || marketClass === "metal" ? 25_000 : 8_000,
      );
      candles = result.candles;
      provider = result.provider;
    }

    if (candles.length === 0) {
      throw new Error(
        `No historical candles were found for ${symbol} at ${interval}. Check the symbol, timeframe, date range, and provider coverage.`,
      );
    }

    return { candles, provider, symbol, interval };
    })();
    candleRequestsInFlight.set(cacheKey, requestPromise);
  }

  try {
    const payload = await requestPromise;
    const expiresAt = Date.now() + (isLiveRange ? 20_000 : 60 * 60 * 1000);
    candleResponseCache.set(cacheKey, { payload, expiresAt });
    if (candleResponseCache.size > 80) {
      const oldestKey = candleResponseCache.keys().next().value;
      if (oldestKey) candleResponseCache.delete(oldestKey);
    }

    return NextResponse.json(
      payload,
      {
        headers: {
          "Cache-Control": cacheControl,
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load market data.";

    console.error("[Backtesting candles]", message);

    return errorResponse(message, 502);
  } finally {
    if (candleRequestsInFlight.get(cacheKey) === requestPromise) {
      candleRequestsInFlight.delete(cacheKey);
    }
  }
}
