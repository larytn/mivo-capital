"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import {
  CandlestickSeries,
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type Logical,
  type MouseEventParams,
  type UTCTimestamp,
} from "lightweight-charts";

type AssetClass =
  | "crypto"
  | "forex"
  | "synthetic"
  | "stock"
  | "futures"
  | "metal"
  | "commodity";

type SizeMode = "LOTS" | "QUANTITY";

function defaultSizeMode(assetClass: AssetClass): SizeMode {
  return ["forex", "synthetic", "metal", "commodity"].includes(assetClass)
    ? "LOTS"
    : "QUANTITY";
}

function replayUnitsFromSize(size: number, mode: SizeMode, assetClass: AssetClass) {
  // A standard FX lot is 100,000 units of the base currency. Other replay
  // instruments use one price unit per lot/contract until a feed supplies its
  // own contract specification.
  return mode === "LOTS" && assetClass === "forex" ? size * 100_000 : size;
}

function formatTradeSize(size: number, mode: SizeMode) {
  const amount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: mode === "LOTS" ? 2 : 0,
    maximumFractionDigits: 4,
  }).format(size);
  return mode === "LOTS" ? `${amount} ${size === 1 ? "lot" : "lots"}` : `${amount} ${size === 1 ? "unit" : "units"}`;
}

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

function candleTimeAtLogical(candles: Candle[], logical: number, intervalSeconds: number) {
  if (!candles.length) return null;
  if (logical <= 0) return candles[0].time + logical * intervalSeconds;
  const lastIndex = candles.length - 1;
  if (logical >= lastIndex) return candles[lastIndex].time + (logical - lastIndex) * intervalSeconds;
  const leftIndex = Math.floor(logical);
  const fraction = logical - leftIndex;
  const left = candles[leftIndex];
  const right = candles[leftIndex + 1];
  return left.time + (right.time - left.time) * fraction;
}

function logicalAtCandleTime(candles: Candle[], time: number, intervalSeconds: number) {
  if (!candles.length) return null;
  if (time <= candles[0].time) return (time - candles[0].time) / intervalSeconds;
  const lastIndex = candles.length - 1;
  if (time >= candles[lastIndex].time) {
    return lastIndex + (time - candles[lastIndex].time) / intervalSeconds;
  }

  let low = 0;
  let high = lastIndex;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const candleTime = candles[middle].time;
    if (candleTime === time) return middle;
    if (candleTime < time) low = middle + 1;
    else high = middle - 1;
  }
  const left = candles[high];
  const right = candles[low];
  return high + (time - left.time) / (right.time - left.time);
}

type OrderType = "MARKET" | "LIMIT" | "STOP";
type TradeStatus = "PENDING" | "OPEN" | "CLOSED" | "CANCELLED";
type TradeExitReason = "STOP_LOSS" | "TAKE_PROFIT" | "MANUAL";

type Trade = {
  id: number;
  side: "BUY" | "SELL";
  orderType: OrderType;
  orderPrice?: number;
  orderPlacedAt?: number;
  stopLoss: number;
  takeProfit: number;
  entry: number;
  exit: number | null;
  displaySize?: number;
  sizeMode?: SizeMode;
  quantity: number;
  openedAt: number;
  closedAt: number | null;
  pnl: number | null;
  status: TradeStatus;
  exitReason?: TradeExitReason;
};

function pendingOrderFillPrice(trade: Trade, candle: Candle) {
  const price = trade.orderPrice;
  if (trade.status !== "PENDING" || price === undefined) return null;

  if (trade.orderType === "LIMIT") {
    if (trade.side === "BUY" && candle.low <= price) return Math.min(candle.open, price);
    if (trade.side === "SELL" && candle.high >= price) return Math.max(candle.open, price);
    return null;
  }

  if (trade.orderType === "STOP") {
    if (trade.side === "BUY" && candle.high >= price) return Math.max(candle.open, price);
    if (trade.side === "SELL" && candle.low <= price) return Math.min(candle.open, price);
  }
  return null;
}

function bracketExitPrice(trade: Trade, candle: Candle) {
  if (trade.side === "BUY") {
    if (candle.open <= trade.stopLoss) return { price: candle.open, reason: "STOP_LOSS" as const };
    if (candle.open >= trade.takeProfit) return { price: candle.open, reason: "TAKE_PROFIT" as const };
    const stopHit = candle.low <= trade.stopLoss;
    const targetHit = candle.high >= trade.takeProfit;
    if (stopHit) return { price: trade.stopLoss, reason: "STOP_LOSS" as const };
    if (targetHit) return { price: trade.takeProfit, reason: "TAKE_PROFIT" as const };
    return null;
  }

  if (candle.open >= trade.stopLoss) return { price: candle.open, reason: "STOP_LOSS" as const };
  if (candle.open <= trade.takeProfit) return { price: candle.open, reason: "TAKE_PROFIT" as const };
  const stopHit = candle.high >= trade.stopLoss;
  const targetHit = candle.low <= trade.takeProfit;
  if (stopHit) return { price: trade.stopLoss, reason: "STOP_LOSS" as const };
  if (targetHit) return { price: trade.takeProfit, reason: "TAKE_PROFIT" as const };
  return null;
}

function resolveReplayTrade(trade: Trade, candles: Candle[]): Trade {
  if (trade.status === "CANCELLED" || trade.status === "CLOSED") return trade;

  let status = trade.status;
  let entry = trade.entry;
  let openedAt = trade.openedAt;
  const orderPlacedAt = trade.orderPlacedAt ?? trade.openedAt;

  for (const candle of candles) {
    if (status === "PENDING") {
      if (candle.time <= orderPlacedAt) continue;
      const fill = pendingOrderFillPrice(trade, candle);
      if (fill === null) continue;
      entry = fill;
      openedAt = candle.time;
      status = "OPEN";
      const fillBarExit = bracketExitPrice({ ...trade, entry, openedAt, status }, candle);
      if (fillBarExit) {
        const direction = trade.side === "BUY" ? 1 : -1;
        return {
          ...trade,
          entry,
          openedAt,
          exit: fillBarExit.price,
          closedAt: candle.time,
          pnl: (fillBarExit.price - entry) * direction * trade.quantity,
          status: "CLOSED",
          exitReason: fillBarExit.reason,
        };
      }
      continue;
    }

    if (candle.time <= openedAt) continue;
    const exit = bracketExitPrice({ ...trade, entry, openedAt, status }, candle);
    if (!exit) continue;
    const direction = trade.side === "BUY" ? 1 : -1;
    return {
      ...trade,
      entry,
      openedAt,
      exit: exit.price,
      closedAt: candle.time,
      pnl: (exit.price - entry) * direction * trade.quantity,
      status: "CLOSED",
      exitReason: exit.reason,
    };
  }

  return status === trade.status ? trade : { ...trade, entry, openedAt, status };
}

type Market = {
  label: string;
  symbols: string[];
};

type CandleResponse = {
  candles?: Candle[];
  provider?: string;
  error?: string;
};

type ChartIndicator = "sma20" | "ema50" | "rsi14" | "bollinger20";
type DrawingTool =
  | "cursor"
  | "trendline"
  | "ray"
  | "extendedLine"
  | "infoLine"
  | "level"
  | "horizontalRay"
  | "vertical"
  | "crossline"
  | "fibRetracement"
  | "fibExtension"
  | "gannFan"
  | "longPosition"
  | "shortPosition"
  | "priceRange"
  | "dateRange"
  | "datePriceRange"
  | "rectangle"
  | "ellipse"
  | "circle"
  | "triangle"
  | "headShoulders"
  | "abcdPattern"
  | "elliottImpulse"
  | "arrow"
  | "brush"
  | "text";
type ChartDrawing = {
  id: string;
  tool: Exclude<DrawingTool, "cursor">;
  time1: number;
  time2: number;
  price1: number;
  price2: number;
  targetPrice?: number;
  sizeAmount?: number;
  sizeMode?: SizeMode;
  stopColor?: string;
  targetColor?: string;
  note?: string;
  points?: DrawingPoint[];
  color: string;
  lineWidth?: number;
  fontSize?: number;
  fillOpacity?: number;
  showPrices?: boolean;
};

const DRAWING_TOOL_GROUPS = [
  {
    id: "trend",
    label: "Trend tools",
    icon: "↗",
    tools: [
      ["trendline", "Trend line"],
      ["ray", "Ray"],
      ["extendedLine", "Extended line"],
      ["infoLine", "Info line"],
      ["level", "Horizontal line"],
      ["horizontalRay", "Horizontal ray"],
      ["vertical", "Vertical line"],
      ["crossline", "Crossline"],
      ["arrow", "Arrow"],
    ],
  },
  {
    id: "fibonacci",
    label: "Fibonacci and Gann",
    icon: "ƒ",
    tools: [
      ["fibRetracement", "Fib retracement"],
      ["fibExtension", "Trend-based Fib extension"],
      ["gannFan", "Gann fan"],
    ],
  },
  {
    id: "patterns",
    label: "Patterns",
    icon: "⌁",
    tools: [
      ["triangle", "Triangle pattern"],
      ["headShoulders", "Head and shoulders"],
      ["abcdPattern", "ABCD pattern"],
      ["elliottImpulse", "Elliott impulse wave"],
    ],
  },
  {
    id: "forecast",
    label: "Forecast and measurement",
    icon: "↕",
    tools: [
      ["longPosition", "Long position"],
      ["shortPosition", "Short position"],
      ["priceRange", "Price range"],
      ["dateRange", "Date range"],
      ["datePriceRange", "Date and price range"],
    ],
  },
  {
    id: "shapes",
    label: "Geometric shapes",
    icon: "□",
    tools: [
      ["rectangle", "Rectangle"],
      ["ellipse", "Ellipse"],
      ["circle", "Circle"],
      ["triangle", "Triangle"],
      ["brush", "Brush / freehand"],
    ],
  },
  {
    id: "annotation",
    label: "Annotations",
    icon: "T",
    tools: [["text", "Text note"]],
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  icon: string;
  tools: ReadonlyArray<readonly [DrawingTool, string]>;
}>;
function isPositionDrawing(
  drawing: ChartDrawing,
): drawing is ChartDrawing & { tool: "longPosition" | "shortPosition"; targetPrice: number } {
  return (
    (drawing.tool === "longPosition" || drawing.tool === "shortPosition") &&
    typeof drawing.targetPrice === "number"
  );
}

type PositionReplayState = {
  status: "pending" | "open" | "target" | "stop" | "invalid";
  time: number;
  price: number;
};

function evaluatePositionReplay(
  drawing: ChartDrawing & { tool: "longPosition" | "shortPosition"; targetPrice: number },
  candles: Candle[],
): PositionReplayState | null {
  const latestCandle = candles[candles.length - 1];
  if (!latestCandle) return null;

  const isLong = drawing.tool === "longPosition";
  const risk = Math.abs(drawing.price1 - drawing.price2);
  const levelsValid = risk > 0 && (isLong
    ? drawing.price2 < drawing.price1 && drawing.targetPrice > drawing.price1
    : drawing.price2 > drawing.price1 && drawing.targetPrice < drawing.price1);
  if (!levelsValid) {
    return { status: "invalid", time: latestCandle.time, price: latestCandle.close };
  }

  const rangeEndTime = Math.max(drawing.time1, drawing.time2);
  let firstCandidate = 0;
  let low = 0;
  let high = candles.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (candles[middle].time < drawing.time1) low = middle + 1;
    else high = middle;
  }
  firstCandidate = low;

  low = 0;
  high = candles.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (candles[middle].time <= rangeEndTime) low = middle + 1;
    else high = middle;
  }
  const lastCandidate = low - 1;
  const observedIndex = lastCandidate >= firstCandidate
    ? lastCandidate
    : Math.max(0, Math.min(candles.length - 1, firstCandidate - 1));
  const observedCandle = candles[observedIndex];
  if (lastCandidate < firstCandidate) {
    return { status: "pending", time: observedCandle.time, price: observedCandle.close };
  }

  let entryTouched = false;
  for (let index = firstCandidate; index <= lastCandidate; index += 1) {
    const candle = candles[index];
    if (!entryTouched) {
      entryTouched = candle.low <= drawing.price1 && candle.high >= drawing.price1;
      if (!entryTouched) continue;
    }

    const stopTouched = isLong
      ? candle.low <= drawing.price2
      : candle.high >= drawing.price2;
    const targetTouched = isLong
      ? candle.high >= drawing.targetPrice
      : candle.low <= drawing.targetPrice;

    // OHLC candles do not reveal which level was reached first when both
    // brackets are inside one bar. Resolve that ambiguity conservatively.
    if (stopTouched || targetTouched) {
      const hitStop = stopTouched;
      const exitPrice = hitStop ? drawing.price2 : drawing.targetPrice;
      return {
        status: hitStop ? "stop" : "target",
        time: candle.time,
        price: exitPrice,
      };
    }
  }

  if (!entryTouched) {
    return { status: "pending", time: observedCandle.time, price: observedCandle.close };
  }

  return {
    status: "open",
    time: observedCandle.time,
    price: observedCandle.close,
  };
}

function positionLevelPatch(
  drawing: ChartDrawing & { tool: "longPosition" | "shortPosition"; targetPrice: number },
  level: "entry" | "stop" | "target",
  price: number,
  minimumDistance: number,
): Partial<ChartDrawing> {
  const isLong = drawing.tool === "longPosition";
  if (level === "entry") {
    const delta = price - drawing.price1;
    return {
      price1: price,
      price2: drawing.price2 + delta,
      targetPrice: drawing.targetPrice + delta,
    };
  }
  if (level === "stop") {
    return {
      price2: isLong
        ? Math.min(price, drawing.price1 - minimumDistance)
        : Math.max(price, drawing.price1 + minimumDistance),
    };
  }
  return {
    targetPrice: isLong
      ? Math.max(price, drawing.price1 + minimumDistance)
      : Math.min(price, drawing.price1 - minimumDistance),
  };
}

function minimumPositionRisk(
  entry: number,
  range: { from: number; to: number } | null,
  precision: number,
) {
  const visibleSpan = range ? Math.abs(range.to - range.from) : 0;
  return Math.max(Math.abs(entry) * 0.0001, visibleSpan * 0.002, 10 ** -precision);
}
type DrawingPoint = { time: number; price: number };
const DRAWING_TOOLS = new Set<DrawingTool>([
  "trendline", "ray", "extendedLine", "infoLine", "level", "horizontalRay",
  "vertical", "crossline", "fibRetracement", "fibExtension", "gannFan",
  "longPosition", "shortPosition", "priceRange", "dateRange", "datePriceRange",
  "rectangle", "ellipse", "circle", "triangle", "headShoulders", "abcdPattern",
  "elliottImpulse", "arrow", "brush", "text",
]);

function isChartDrawing(value: unknown): value is ChartDrawing {
  if (!value || typeof value !== "object") return false;
  const drawing = value as Partial<ChartDrawing>;
  if (
    typeof drawing.id !== "string" ||
    !DRAWING_TOOLS.has(drawing.tool as DrawingTool) ||
    !Number.isFinite(drawing.time1) ||
    !Number.isFinite(drawing.time2) ||
    !Number.isFinite(drawing.price1) ||
    !Number.isFinite(drawing.price2) ||
    typeof drawing.color !== "string" ||
    !/^#[0-9a-f]{6}$/i.test(drawing.color)
  ) {
    return false;
  }

  if (
    drawing.lineWidth !== undefined &&
    (!Number.isFinite(drawing.lineWidth) || drawing.lineWidth < 1 || drawing.lineWidth > 8)
  ) return false;
  if (
    drawing.fontSize !== undefined &&
    (!Number.isFinite(drawing.fontSize) || drawing.fontSize < 10 || drawing.fontSize > 32)
  ) return false;
  if (
    drawing.fillOpacity !== undefined &&
    (!Number.isFinite(drawing.fillOpacity) || drawing.fillOpacity < 0 || drawing.fillOpacity > 0.65)
  ) return false;
  if (drawing.showPrices !== undefined && typeof drawing.showPrices !== "boolean") return false;
  for (const color of [drawing.stopColor, drawing.targetColor]) {
    if (color !== undefined && (typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color))) return false;
  }
  if (drawing.sizeAmount !== undefined && (!Number.isFinite(drawing.sizeAmount) || drawing.sizeAmount < 0)) return false;
  if (drawing.sizeMode !== undefined && drawing.sizeMode !== "LOTS" && drawing.sizeMode !== "QUANTITY") return false;
  if (
    (drawing.tool === "longPosition" || drawing.tool === "shortPosition") &&
    !Number.isFinite(drawing.targetPrice)
  ) return false;
  if (
    drawing.points !== undefined &&
    (!Array.isArray(drawing.points) || drawing.points.some((point) =>
      !point || !Number.isFinite(point.time) || !Number.isFinite(point.price),
    ))
  ) return false;
  if (drawing.tool === "brush" && (!drawing.points || drawing.points.length < 1)) return false;
  if (drawing.tool === "text" && drawing.note !== undefined && typeof drawing.note !== "string") return false;
  return true;
}

type DrawingDrag = {
  id: string;
  mode: "move" | "endpoint1" | "endpoint2" | "entry" | "target" | "stop";
  start: DrawingPoint;
  original: ChartDrawing;
};

const BINANCE_BROWSER_ENDPOINTS = [
  "https://data-api.binance.vision/api/v3/klines",
  "https://api.binance.com/api/v3/klines",
];

const BINANCE_INTERVAL_MS: Record<string, number> = {
  "1m": 60_000, "3m": 180_000, "5m": 300_000, "15m": 900_000,
  "30m": 1_800_000, "1h": 3_600_000, "2h": 7_200_000,
  "4h": 14_400_000, "6h": 21_600_000, "8h": 28_800_000,
  "12h": 43_200_000, "1d": 86_400_000, "3d": 259_200_000,
  "1w": 604_800_000,
};

const DERIV_GRANULARITY_SECONDS: Record<string, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "30m": 1800,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
};

const DERIV_BROWSER_SYMBOL_ALIASES: Record<string, string> = {
  "STEP INDEX": "stpRNG",
};

async function loadDerivCandlesInBrowser(
  symbol: string,
  interval: string,
  start: number,
  end: number,
  signal: AbortSignal,
): Promise<Candle[]> {
  const granularity = DERIV_GRANULARITY_SECONDS[interval];
  if (!granularity) throw new Error(`Deriv does not support ${interval} candles.`);
  if (signal.aborted) throw new Error("Market data request cancelled.");

  return new Promise((resolve, reject) => {
    const socket = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=1089");
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      signal.removeEventListener("abort", handleAbort);
      try {
        socket.close();
      } catch {
        // The socket may already be closed.
      }
      callback();
    };
    const handleAbort = () =>
      finish(() => reject(new Error("Market data request cancelled.")));
    const timeout = window.setTimeout(
      () => finish(() => reject(new Error("Deriv candle request timed out."))),
      8000,
    );

    signal.addEventListener("abort", handleAbort, { once: true });
    socket.addEventListener("open", () => {
      const count = Math.min(
        5000,
        Math.max(1, Math.ceil((end - start) / granularity) + 2),
      );
      socket.send(JSON.stringify({
        ticks_history: DERIV_BROWSER_SYMBOL_ALIASES[symbol.toUpperCase()] ?? symbol,
        start,
        end: String(end),
        count,
        style: "candles",
        granularity,
        adjust_start_time: 1,
        subscribe: 0,
      }));
    });
    socket.addEventListener("message", (event) => {
      let data: {
        error?: { message?: string };
        candles?: Array<{
          epoch: number | string;
          open: number | string;
          high: number | string;
          low: number | string;
          close: number | string;
        }>;
      };
      try {
        data = JSON.parse(String(event.data));
      } catch {
        finish(() => reject(new Error("Deriv returned an invalid candle response.")));
        return;
      }
      if (data.error) {
        finish(() => reject(new Error(data.error?.message || "Deriv rejected the candle request.")));
        return;
      }
      if (!data.candles) return;
      const candles = data.candles
        .map((candle) => ({
          time: Number(candle.epoch),
          open: Number(candle.open),
          high: Number(candle.high),
          low: Number(candle.low),
          close: Number(candle.close),
        }))
        .filter((candle) =>
          Number.isFinite(candle.time) &&
          Number.isFinite(candle.open) &&
          Number.isFinite(candle.high) &&
          Number.isFinite(candle.low) &&
          Number.isFinite(candle.close) &&
          candle.time >= start &&
          candle.time <= end,
        )
        .sort((a, b) => a.time - b.time);
      if (!candles.length) {
        finish(() => reject(new Error(`Deriv returned no candles for ${symbol} in this date range.`)));
        return;
      }
      finish(() => resolve(candles));
    });
    socket.addEventListener("error", () =>
      finish(() => reject(new Error("Could not connect to Deriv market data."))),
    );
    socket.addEventListener("close", () => {
      if (!settled) {
        finish(() => reject(new Error("Deriv closed the connection before returning candles.")));
      }
    });
  });
}

async function loadBinanceCandlesInBrowser(
  symbol: string,
  interval: string,
  start: number,
  end: number,
  signal?: AbortSignal,
): Promise<Candle[]> {
  const endMs = end * 1000;
  const initialCursor = Math.max(
    start * 1000,
    endMs - 366 * 24 * 60 * 60 * 1000,
  );
  const controllers = BINANCE_BROWSER_ENDPOINTS.map(() => new AbortController());
  const attempts = BINANCE_BROWSER_ENDPOINTS.map(async (endpoint, endpointIndex) => {
    const requestWindowMs = (BINANCE_INTERVAL_MS[interval] || 3_600_000) * 1000;
    const pageCount = Math.ceil((endMs - initialCursor + 1) / requestWindowMs);
    const candles: Candle[] = [];
    const pageBatchSize = 8;

    for (let firstPage = 0; firstPage < pageCount; firstPage += pageBatchSize) {
      const batchLength = Math.min(pageBatchSize, pageCount - firstPage);
      const chunks = await Promise.all(
        Array.from({ length: batchLength }, async (_, batchIndex) => {
          const page = firstPage + batchIndex;
          const cursor = initialCursor + page * requestWindowMs;
          const url = new URL(endpoint);
          url.searchParams.set("symbol", symbol.toUpperCase().replaceAll("/", ""));
          url.searchParams.set("interval", interval);
          url.searchParams.set("startTime", String(cursor));
          url.searchParams.set("endTime", String(Math.min(endMs, cursor + requestWindowMs - 1)));
          url.searchParams.set("limit", "1000");

          const fetchSignals = [
            controllers[endpointIndex].signal,
            AbortSignal.timeout(7000),
          ];
          if (signal) fetchSignals.push(signal);
          const response = await fetch(url, {
            cache: "no-store",
            signal: AbortSignal.any(fetchSignals),
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

    const result = candles
      .filter((candle) => candle.time >= start && candle.time <= end)
      .sort((a, b) => a.time - b.time);
    if (!result.length) throw new Error(`${new URL(endpoint).hostname} returned no candles.`);
    return result;
  });

  try {
    return await Promise.any(attempts);
  } catch (error) {
    const causes = error instanceof AggregateError
      ? error.errors.map((cause) => cause instanceof Error ? cause.message : String(cause))
      : [error instanceof Error ? error.message : "Browser market-data fallback failed."];
    throw new Error(`Browser market-data fallback failed: ${causes.join("; ")}`);
  } finally {
    controllers.forEach((controller) => controller.abort());
  }
}

function calculateSma(candles: Candle[], period: number) {
  const result: { time: UTCTimestamp; value: number }[] = [];
  for (let index = period - 1; index < candles.length; index++) {
    const window = candles.slice(index - period + 1, index + 1);
    result.push({
      time: candles[index].time as UTCTimestamp,
      value: window.reduce((sum, candle) => sum + candle.close, 0) / period,
    });
  }
  return result;
}

function calculateEma(candles: Candle[], period: number) {
  if (candles.length < period) return [];
  const result: { time: UTCTimestamp; value: number }[] = [];
  const multiplier = 2 / (period + 1);
  let ema = candles.slice(0, period).reduce((sum, candle) => sum + candle.close, 0) / period;
  result.push({ time: candles[period - 1].time as UTCTimestamp, value: ema });
  for (let index = period; index < candles.length; index++) {
    ema = (candles[index].close - ema) * multiplier + ema;
    result.push({ time: candles[index].time as UTCTimestamp, value: ema });
  }
  return result;
}

function calculateRsi(candles: Candle[], period = 14) {
  if (candles.length <= period) return [];
  let averageGain = 0;
  let averageLoss = 0;
  for (let index = 1; index <= period; index++) {
    const change = candles[index].close - candles[index - 1].close;
    averageGain += Math.max(0, change) / period;
    averageLoss += Math.max(0, -change) / period;
  }
  const result: { time: UTCTimestamp; value: number }[] = [
    {
      time: candles[period].time as UTCTimestamp,
      value: averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss),
    },
  ];
  for (let index = period + 1; index < candles.length; index++) {
    const change = candles[index].close - candles[index - 1].close;
    averageGain = (averageGain * (period - 1) + Math.max(0, change)) / period;
    averageLoss = (averageLoss * (period - 1) + Math.max(0, -change)) / period;
    result.push({
      time: candles[index].time as UTCTimestamp,
      value: averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss),
    });
  }
  return result;
}

function calculateBollingerBands(candles: Candle[], period = 20, deviation = 2) {
  const upper: { time: UTCTimestamp; value: number }[] = [];
  const middle: { time: UTCTimestamp; value: number }[] = [];
  const lower: { time: UTCTimestamp; value: number }[] = [];

  for (let index = period - 1; index < candles.length; index++) {
    const window = candles.slice(index - period + 1, index + 1);
    const average = window.reduce((sum, candle) => sum + candle.close, 0) / period;
    const variance = window.reduce(
      (sum, candle) => sum + (candle.close - average) ** 2,
      0,
    ) / period;
    const spread = Math.sqrt(variance) * deviation;
    const time = candles[index].time as UTCTimestamp;

    upper.push({ time, value: average + spread });
    middle.push({ time, value: average });
    lower.push({ time, value: average - spread });
  }

  return { upper, middle, lower };
}

const MARKETS: Record<AssetClass, Market> = {
  crypto: {
    label: "Crypto",
    symbols: [
      "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT",
      "DOGEUSDT", "TRXUSDT", "LINKUSDT", "AVAXUSDT", "DOTUSDT", "LTCUSDT",
      "BCHUSDT", "ATOMUSDT", "NEARUSDT", "APTUSDT", "ARBUSDT", "OPUSDT",
      "SUIUSDT", "TONUSDT", "BTCUSD", "ETHBTC",
    ],
  },
  forex: {
    label: "Forex",
    symbols: [
      "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF",
      "NZD/USD", "EUR/GBP", "EUR/JPY", "EUR/CHF", "EUR/CAD", "EUR/AUD",
      "EUR/NZD", "GBP/JPY", "GBP/CHF", "GBP/CAD", "GBP/AUD", "GBP/NZD",
      "AUD/JPY", "AUD/CAD", "AUD/CHF", "AUD/NZD", "CAD/JPY", "CHF/JPY",
      "NZD/JPY", "NZD/CAD", "NZD/CHF", "CAD/CHF",
    ],
  },
  synthetic: {
    label: "Synthetics",
    symbols: [
      "R_10", "R_25", "R_50", "R_75", "R_100", "1HZ10V", "1HZ25V",
      "1HZ50V", "1HZ75V", "1HZ100V", "1HZ150V", "1HZ250V", "BOOM300N",
      "BOOM500", "BOOM1000", "CRASH300N", "CRASH500", "CRASH1000",
      "STEP INDEX", "JD10", "JD25", "JD50", "JD75", "JD100",
    ],
  },
  stock: {
    label: "Stocks",
    symbols: [
      "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "AMD",
      "NFLX", "INTC", "ORCL", "IBM", "DIS", "JPM", "BAC", "KO", "PEP",
      "WMT", "COST", "SHOP", "UBER", "PLTR", "COIN", "BABA", "T",
    ],
  },
  futures: {
    label: "Futures",
    symbols: [
      "ES", "NQ", "YM", "RTY", "MES", "MNQ", "MYM", "M2K", "CL", "MCL",
      "GC", "MGC", "SI", "HG", "NG", "ZB", "ZN", "ZF", "ZT", "6E", "6J",
    ],
  },
  metal: {
    label: "Metals",
    symbols: ["XAU/USD", "XAG/USD", "XPT/USD", "XPD/USD", "COPPER"],
  },
  commodity: {
    label: "Commodities",
    symbols: [
      "WTI", "BRENT", "NATURALGAS", "CORN", "WHEAT", "SOYBEAN",
      "SUGAR", "COFFEE", "COTTON", "COCOA",
    ],
  },
};

const TIMEFRAMES = [
  { label: "1m", seconds: 60 },
  { label: "5m", seconds: 300 },
  { label: "15m", seconds: 900 },
  { label: "30m", seconds: 1800 },
  { label: "1h", seconds: 3600 },
  { label: "4h", seconds: 14400 },
  { label: "1D", seconds: 86400 },
] as const;

const STARTING_BALANCE = 10_000;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const CANDLE_CACHE_INDEX = "mivo.backtesting.candles.v1.index";
const CANDLE_CACHE_LIMIT = 5;

type CachedCandles = { candles: Candle[]; provider: string };

function candleCacheKey(
  assetClass: AssetClass,
  symbol: string,
  interval: string,
  start: number,
  end: number,
) {
  const endDay = new Date(end * 1000).toISOString().slice(0, 10);
  return [assetClass, symbol.toUpperCase(), interval, start, endDay].join(":");
}

function readCachedCandles(key: string): CachedCandles | null {
  try {
    const raw = window.localStorage.getItem(`mivo.backtesting.candles.v1:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedCandles>;
    if (!Array.isArray(parsed.candles) || typeof parsed.provider !== "string") return null;
    const candles = parsed.candles.filter(
      (candle): candle is Candle =>
        candle !== null &&
        typeof candle === "object" &&
        Number.isFinite(candle.time) &&
        Number.isFinite(candle.open) &&
        Number.isFinite(candle.high) &&
        Number.isFinite(candle.low) &&
        Number.isFinite(candle.close),
    );
    return candles.length ? { candles, provider: parsed.provider } : null;
  } catch {
    return null;
  }
}

function writeCachedCandles(key: string, entry: CachedCandles) {
  // Keep browser storage bounded; unusually large one-minute histories stay in
  // memory for this page session but are not copied into local storage.
  if (entry.candles.length > 10_000) return;

  try {
    const storageKey = `mivo.backtesting.candles.v1:${key}`;
    const previous = JSON.parse(window.localStorage.getItem(CANDLE_CACHE_INDEX) || "[]") as unknown;
    const keys = Array.isArray(previous)
      ? previous.filter((item): item is string => typeof item === "string")
      : [];
    const nextKeys = [key, ...keys.filter((item) => item !== key)].slice(0, CANDLE_CACHE_LIMIT);
    window.localStorage.setItem(storageKey, JSON.stringify(entry));
    window.localStorage.setItem(CANDLE_CACHE_INDEX, JSON.stringify(nextKeys));
    for (const oldKey of keys) {
      if (!nextKeys.includes(oldKey)) {
        window.localStorage.removeItem(`mivo.backtesting.candles.v1:${oldKey}`);
      }
    }
  } catch {
    // Storage can be disabled or full. The live chart still works without it.
  }
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultDateRange() {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 30);
  return { start: toDateInputValue(start), end: toDateInputValue(end) };
}

function getRangeSeconds(startDate: string, endDate: string) {
  const start = Math.floor(new Date(`${startDate}T00:00:00Z`).getTime() / 1000);
  const selectedEnd = Math.floor(
    new Date(`${endDate}T23:59:59Z`).getTime() / 1000,
  );
  const today = toDateInputValue(new Date());
  const end = endDate === today
    ? Math.min(selectedEnd, Math.floor(Date.now() / 1000))
    : selectedEnd;
  return { start, end };
}

function getCandlePricePrecision(
  assetClass: AssetClass,
  symbol: string,
  candles: Candle[],
): number {
  if (assetClass === "forex") {
    return symbol.toUpperCase().endsWith("/JPY") ? 3 : 5;
  }

  if (assetClass === "metal") {
    return symbol.toUpperCase() === "COPPER" ? 4 : 2;
  }

  if (assetClass === "crypto" && candles.length > 0) {
    const maxPrice = Math.max(
      ...candles.slice(-100).flatMap((candle) => [
        Math.abs(candle.open),
        Math.abs(candle.high),
        Math.abs(candle.low),
        Math.abs(candle.close),
      ]),
    );

    if (maxPrice >= 100) return 2;
    if (maxPrice >= 1) return 4;
    if (maxPrice >= 0.01) return 6;
    return 8;
  }

  let precision = 2;

  for (const candle of candles) {
    for (const value of [candle.open, candle.high, candle.low, candle.close]) {
      const decimals = value.toFixed(8).split(".")[1]?.replace(/0+$/, "").length ?? 0;
      precision = Math.max(precision, decimals);
      if (precision === 8) return precision;
    }
  }

  return precision;
}

function formatPrice(value: number, _symbol: string, pricePrecision = 2): string {
  const digits = Math.max(0, Math.min(8, Math.trunc(pricePrecision)));

  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatMoney(value: number): string {
  const amount = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${value < 0 ? "-$" : "$"}${amount}`;
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp * 1000));
}

function DrawingToolIcon({ tool }: { tool: DrawingTool }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.7,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19">
      {tool === "cursor" && <path {...common} d="M5 3.5 18.5 16l-5.7-.6-2.9 5.1L5 3.5Z" />}
      {(tool === "trendline" || tool === "infoLine") && <><path {...common} d="m4.5 18.5 15-13" /><circle {...common} cx="4.5" cy="18.5" r="1.5" /><circle {...common} cx="19.5" cy="5.5" r="1.5" /></>}
      {tool === "ray" && <><path {...common} d="M4.5 19 19 5" /><path {...common} d="M12 5h7v7" /><circle {...common} cx="4.5" cy="19" r="1.4" /></>}
      {tool === "extendedLine" && <><path {...common} d="M3 20 21 4" /><circle {...common} cx="7" cy="16.5" r="1.3" /><circle {...common} cx="17" cy="7.5" r="1.3" /></>}
      {(tool === "level" || tool === "horizontalRay") && <><path {...common} d="M3 12h18" />{tool === "horizontalRay" ? <path {...common} d="m16 8 4 4-4 4" /> : <path {...common} d="M7 8.5v7" />}</>}
      {tool === "vertical" && <><path {...common} d="M12 4v16" /><path {...common} d="M8.5 7.5h7" /></>}
      {tool === "crossline" && <><path {...common} d="M12 3v18M3 12h18" /><circle {...common} cx="12" cy="12" r="2" /></>}
      {(tool === "rectangle" || tool === "priceRange" || tool === "dateRange" || tool === "datePriceRange") && <rect {...common} x="4" y="5" width="16" height="14" rx="1.5" />}
      {(tool === "ellipse" || tool === "circle") && <ellipse {...common} cx="12" cy="12" rx={tool === "circle" ? 7 : 9} ry={tool === "circle" ? 7 : 5.5} />}
      {tool === "triangle" && <polygon {...common} points="12,4 21,19 3,19" />}
      {tool === "brush" && <path {...common} d="M4 18c4-12 6 5 9-5s5 1 7-7" />}
      {tool === "arrow" && <><path {...common} d="M4 19 19 5" /><path {...common} d="M11 5h8v8" /></>}
      {tool === "gannFan" && <><path {...common} d="M4 20 4 4M4 20h16M4 20 20 4M4 20 16 4M4 20 20 12" /></>}
      {(tool === "fibRetracement" || tool === "fibExtension") && <><path {...common} d="M4 19 19 5" /><path {...common} d="M6 7h14M4 11h16M3 15h15M4 19h12" /></>}
      {(tool === "headShoulders" || tool === "abcdPattern" || tool === "elliottImpulse") && <polyline {...common} points={tool === "headShoulders" ? "3,18 6,12 9,17 12,5 15,17 18,12 21,18" : tool === "abcdPattern" ? "3,18 9,6 15,15 21,9" : "3,19 7,12 10,16 14,5 18,11 21,4"} />}
      {tool === "longPosition" && <><path {...common} d="M12 20V5m0 0-5 5m5-5 5 5" /><path {...common} d="M5 17h4M15 7h4" /></>}
      {tool === "shortPosition" && <><path {...common} d="M12 4v15m0 0 5-5m-5 5-5-5" /><path {...common} d="M5 7h4m6 10h4" /></>}
      {tool === "text" && <><path {...common} d="M4 6h16M12 6v13M8 19h8" /><path {...common} d="m8 6 4-2 4 2" /></>}
    </svg>
  );
}

function drawingToolName(tool: DrawingTool) {
  for (const group of DRAWING_TOOL_GROUPS) {
    for (const item of group.tools) {
      if (item[0] === tool) return item[1];
    }
  }
  return "Drawing";
}

export default function BacktestingLabPage() {
  const [assetClass, setAssetClass] = useState<AssetClass>("crypto");
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] =
    useState<(typeof TIMEFRAMES)[number]["label"]>("15m");
  const [playing, setPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [visibleCount, setVisibleCount] = useState(180);
  const [replayResetKey, setReplayResetKey] = useState(0);
  const [quantity, setQuantity] = useState("1");
  const [sizeMode, setSizeMode] = useState<SizeMode>("QUANTITY");
  const [initialBalance, setInitialBalance] = useState(STARTING_BALANCE);
  const [storedTrades, setTrades] = useState<Trade[]>([]);
  const [orderTicketSide, setOrderTicketSide] = useState<Trade["side"] | null>(null);
  const [orderDrawingId, setOrderDrawingId] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<OrderType>("MARKET");
  const [orderPrice, setOrderPrice] = useState("");
  const [stopLossPrice, setStopLossPrice] = useState("");
  const [takeProfitPrice, setTakeProfitPrice] = useState("");
  const [orderError, setOrderError] = useState("");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [followLatest, setFollowLatest] = useState(true);
  const [datesReady, setDatesReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marketDataRefresh, setMarketDataRefresh] = useState(0);
  const [dataError, setDataError] = useState("");
  const [dataProvider, setDataProvider] = useState("");
  const [hoveredCandleTime, setHoveredCandleTime] = useState<number | null>(null);
  const [journaledTradeIds, setJournaledTradeIds] = useState<number[]>([]);
  const [journalSaveBusyId, setJournalSaveBusyId] = useState<number | null>(null);
  const [journalMessage, setJournalMessage] = useState("");
  const [tradeMessage, setTradeMessage] = useState("");
  const [pageTheme, setPageTheme] = useState<"dark" | "light">("dark");
  const [activeTool, setActiveTool] = useState<DrawingTool>("cursor");
  const [drawings, setDrawingsState] = useState<ChartDrawing[]>([]);
  const [drawingDraft, setDrawingDraftState] = useState<ChartDrawing | null>(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [drawingSettingsOpen, setDrawingSettingsOpen] = useState(false);
  const [keepDrawing, setKeepDrawing] = useState(false);
  const [snapToCandle, setSnapToCandle] = useState(false);
  const [placingReplayStart, setPlacingReplayStart] = useState(false);
  const [replayPlacementX, setReplayPlacementX] = useState<number | null>(null);
  const [drawingsLoadedFor, setDrawingsLoadedFor] = useState("");
  const [indicators, setIndicators] = useState<Record<ChartIndicator, boolean>>({
    sma20: false,
    ema50: false,
    rsi14: false,
    bollinger20: false,
  });
  const [indicatorMenuOpen, setIndicatorMenuOpen] = useState(false);
  const [indicatorsLoadedFor, setIndicatorsLoadedFor] = useState("");
  const [openToolGroup, setOpenToolGroup] = useState<string | null>(null);

  const drawingsRef = useRef<ChartDrawing[]>([]);
  const drawingDraftRef = useRef<ChartDrawing | null>(null);
  const drawingProjectorRef = useRef<() => void>(() => {});
  const drawingProjectionFrameRef = useRef<number | null>(null);
  const scheduleDrawingProjection = useCallback(() => {
    if (drawingProjectionFrameRef.current !== null) return;
    drawingProjectionFrameRef.current = window.requestAnimationFrame(() => {
      drawingProjectionFrameRef.current = null;
      drawingProjectorRef.current();
    });
  }, []);
  const setDrawings = useCallback((
    update: ChartDrawing[] | ((current: ChartDrawing[]) => ChartDrawing[]),
  ) => {
    const next = typeof update === "function" ? update(drawingsRef.current) : update;
    drawingsRef.current = next;
    setDrawingsState(next);
    scheduleDrawingProjection();
  }, [scheduleDrawingProjection]);
  const setDrawingDraft = useCallback((
    update: ChartDrawing | null | ((current: ChartDrawing | null) => ChartDrawing | null),
  ) => {
    const next = typeof update === "function" ? update(drawingDraftRef.current) : update;
    drawingDraftRef.current = next;
    setDrawingDraftState(next);
    scheduleDrawingProjection();
  }, [scheduleDrawingProjection]);

  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const drawingOverlayRef = useRef<SVGSVGElement | null>(null);
  const replayPlacementPointerRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const indicatorSeriesRef = useRef<{
    sma20: ISeriesApi<"Line">;
    ema50: ISeriesApi<"Line">;
    bollingerUpper: ISeriesApi<"Line">;
    bollingerMiddle: ISeriesApi<"Line">;
    bollingerLower: ISeriesApi<"Line">;
    rsi14: ISeriesApi<"Line"> | null;
  } | null>(null);
  const rsiPaneIndexRef = useRef<number | null>(null);
  const drawingDragRef = useRef<DrawingDrag | null>(null);
  const drawingPointerStartRef = useRef<{ pointerId: number; x: number; y: number; mode: "new" | "finish" } | null>(null);
  const chartDatasetKeyRef = useRef("");
  const chartVisibleCountRef = useRef(-1);
  const latestCandleTimeRef = useRef(0);
  const replayAtLatestRef = useRef(true);
  const candlesLengthRef = useRef(candles.length);

  const drawingStorageKey = `mivo.backtesting.drawings.v1:${assetClass}:${symbol}:${timeframe}`;
  const indicatorStorageKey = `mivo.backtesting.indicators.v1:${assetClass}:${symbol}:${timeframe}`;

  const activeCandles = useMemo(
    () => candles.slice(0, visibleCount),
    [candles, visibleCount],
  );
  const chartCandles = placingReplayStart ? candles : activeCandles;
  const currentCandle = activeCandles[activeCandles.length - 1];
  const trades = useMemo(
    () => storedTrades.map((trade) => resolveReplayTrade(trade, activeCandles)),
    [activeCandles, storedTrades],
  );
  const selectedDrawing = drawings.find((drawing) => drawing.id === selectedDrawingId) ?? null;
  const orderDrawing = drawings.find((drawing) => drawing.id === orderDrawingId) ?? null;
  const linkedPositionDrawing = orderDrawing && isPositionDrawing(orderDrawing) && orderTicketSide &&
    orderDrawing.tool === (orderTicketSide === "BUY" ? "longPosition" : "shortPosition")
    ? orderDrawing
    : null;
  const pricePrecision = useMemo(
    () => getCandlePricePrecision(assetClass, symbol, candles),
    [assetClass, candles, symbol],
  );
  const hoveredCandle = hoveredCandleTime === null
    ? undefined
    : chartCandles.find((candle) => candle.time === hoveredCandleTime);
  const displayCandle = hoveredCandle ?? currentCandle;
  const displayCandleIndex = displayCandle
    ? chartCandles.findIndex((candle) => candle.time === displayCandle.time)
    : -1;
  const displayPreviousCandle = displayCandleIndex > 0
    ? chartCandles[displayCandleIndex - 1]
    : undefined;

  useEffect(() => {
    candlesLengthRef.current = candles.length;
  }, [candles.length]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(drawingStorageKey);
        const parsed: unknown = saved ? JSON.parse(saved) : [];
        setDrawings(
          Array.isArray(parsed)
            ? parsed.filter(isChartDrawing)
            : [],
        );
      } catch {
        setDrawings([]);
      }
      setDrawingsLoadedFor(drawingStorageKey);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [drawingStorageKey, setDrawings]);

  useEffect(() => {
    if (drawingsLoadedFor !== drawingStorageKey) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(drawingStorageKey, JSON.stringify(drawings));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [drawingStorageKey, drawings, drawingsLoadedFor]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(indicatorStorageKey);
        const parsed = saved ? (JSON.parse(saved) as Partial<Record<ChartIndicator, boolean>>) : {};
        setIndicators({
          sma20: parsed.sma20 === true,
          ema50: parsed.ema50 === true,
          rsi14: parsed.rsi14 === true,
          bollinger20: parsed.bollinger20 === true,
        });
      } catch {
        setIndicators({ sma20: false, ema50: false, rsi14: false, bollinger20: false });
      }
      setIndicatorsLoadedFor(indicatorStorageKey);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [indicatorStorageKey]);

  useEffect(() => {
    if (indicatorsLoadedFor !== indicatorStorageKey) return;
    window.localStorage.setItem(indicatorStorageKey, JSON.stringify(indicators));
  }, [indicatorStorageKey, indicators, indicatorsLoadedFor]);

  const closedTrades = trades.filter((trade) => trade.status === "CLOSED");
  const realizedPnl = closedTrades.reduce(
    (sum, trade) => sum + (trade.pnl ?? 0),
    0,
  );
  const openTrades = trades.filter((trade) => trade.status === "OPEN");

  const unrealizedPnl = openTrades.reduce((sum, trade) => {
    if (!currentCandle) return sum;

    const direction = trade.side === "BUY" ? 1 : -1;
    return sum + (currentCandle.close - trade.entry) * direction * trade.quantity;
  }, 0);

  const wins = closedTrades.filter((trade) => (trade.pnl ?? 0) > 0).length;
  const winRate = closedTrades.length ? (wins / closedTrades.length) * 100 : 0;
  const grossProfit = closedTrades.reduce((sum, trade) => sum + Math.max(0, trade.pnl ?? 0), 0);
  const grossLoss = closedTrades.reduce((sum, trade) => sum + Math.abs(Math.min(0, trade.pnl ?? 0)), 0);
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? "\u221E" : "--";
  const expectancy = closedTrades.length ? realizedPnl / closedTrades.length : 0;
  let equity = initialBalance;
  let peakEquity = initialBalance;
  let maxDrawdownPercent = 0;
  for (const trade of [...closedTrades].sort((a, b) => (a.closedAt ?? 0) - (b.closedAt ?? 0))) {
    equity += trade.pnl ?? 0;
    peakEquity = Math.max(peakEquity, equity);
    if (peakEquity > 0) maxDrawdownPercent = Math.max(maxDrawdownPercent, ((peakEquity - equity) / peakEquity) * 100);
  }

  const handleAssetClassChange = (next: AssetClass) => {
    replayAtLatestRef.current = true;
    setAssetClass(next);
    setSymbol(MARKETS[next].symbols[0]);
    const nextSizeMode = defaultSizeMode(next);
    setSizeMode(nextSizeMode);
    setQuantity(nextSizeMode === "LOTS" && next === "forex" ? "0.01" : "1");
    setPlacingReplayStart(false);
    setReplayPlacementX(null);
    setSelectedDrawingId(null);
    setDrawingSettingsOpen(false);
    setVisibleCount(2);
    setPlaying(false);
    setTrades([]);
    setCandles([]);
  };

  const handleSymbolChange = (next: string) => {
    replayAtLatestRef.current = true;
    setSymbol(next);
    setPlacingReplayStart(false);
    setReplayPlacementX(null);
    setSelectedDrawingId(null);
    setDrawingSettingsOpen(false);
    setVisibleCount(2);
    setPlaying(false);
    setTrades([]);
    setCandles([]);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const range = defaultDateRange();
      setStartDate(range.start);
      setEndDate(range.end);
      setDatesReady(true);
    }, 0);

    const root = document.documentElement;
    const updateTheme = () => {
      setPageTheme(root.dataset.theme === "light" ? "light" : "dark");
    };
    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!datesReady) return;

    const { start } = getRangeSeconds(startDate, endDate);
    const getEnd = () => {
      const selectedEnd = Math.floor(
        new Date(`${endDate}T23:59:59Z`).getTime() / 1000,
      );
      const today = toDateInputValue(new Date());
      if (endDate !== today) return selectedEnd;

      const intervalSeconds =
        TIMEFRAMES.find((item) => item.label === timeframe)?.seconds ?? 60;
      const currentBarStart =
        Math.floor(Date.now() / 1000 / intervalSeconds) * intervalSeconds;
      return Math.min(selectedEnd, currentBarStart);
    };
    const end = getEnd();
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
      window.setTimeout(() => {
        setDataError("Choose a valid start and end date.");
        setCandles([]);
        setLoading(false);
      }, 0);
      return;
    }

    if (end - start > 366 * 24 * 60 * 60) {
      window.setTimeout(() => {
        setDataError("Choose a date range of one year or less.");
        setCandles([]);
        setLoading(false);
      }, 0);
      return;
    }

    let cancelled = false;
    let isFirstLoad = true;
    let requestInFlight = false;
    const controller = new AbortController();
    const cacheKey = candleCacheKey(
      assetClass,
      symbol,
      timeframe.toLowerCase(),
      start,
      end,
    );
    const cachedData = readCachedCandles(cacheKey);
    if (cachedData) {
      window.setTimeout(() => {
        if (cancelled) return;
        setCandles(cachedData.candles);
        setDataProvider(cachedData.provider);
        setDataError("");
        setLoading(false);
        if (replayAtLatestRef.current) {
          setVisibleCount(cachedData.candles.length);
        } else {
          setVisibleCount((count) => Math.min(count, cachedData.candles.length));
        }
      }, 0);
    }

    const loadCandles = async () => {
      if (requestInFlight || cancelled) return;
      requestInFlight = true;
      if (isFirstLoad && !cachedData) setLoading(true);
      setDataError("");

      const query = new URLSearchParams({
        assetClass,
        symbol,
        interval: timeframe.toLowerCase(),
        start: String(start),
        end: String(getEnd()),
      });

      try {
        const response = await fetch(`/api/backtesting/candles?${query}`, {
          signal: controller.signal,
        });
        const result = (await response.json()) as CandleResponse;
        const receivedCandles = result.candles;

        if (!response.ok) {
          throw new Error(result.error || "Unable to load historical candles.");
        }
        if (!Array.isArray(receivedCandles) || receivedCandles.length === 0) {
          throw new Error("No candles were returned for this instrument and date range.");
        }

        if (cancelled) return;
        setCandles(receivedCandles);
        setDataProvider(result.provider || "Market data provider");
        writeCachedCandles(cacheKey, {
          candles: receivedCandles,
          provider: result.provider || "Market data provider",
        });
        if (isFirstLoad) {
          replayAtLatestRef.current = true;
          setVisibleCount(receivedCandles.length);
        } else if (replayAtLatestRef.current) {
          setVisibleCount(receivedCandles.length);
        } else {
          setVisibleCount((count) => Math.min(count, receivedCandles.length));
        }
      } catch (error) {
        if (cancelled) return;
        if (assetClass === "crypto" || assetClass === "synthetic") {
          try {
            const browserCandles = assetClass === "crypto"
              ? await loadBinanceCandlesInBrowser(
                  symbol,
                  timeframe.toLowerCase(),
                  start,
                  getEnd(),
                  controller.signal,
                )
              : await loadDerivCandlesInBrowser(
                  symbol,
                  timeframe.toLowerCase(),
                  start,
                  getEnd(),
                  controller.signal,
                );
            const fallbackProvider = assetClass === "crypto"
              ? "Binance direct connection"
              : "Deriv direct connection";
            if (cancelled) return;
            setCandles(browserCandles);
            setDataProvider(fallbackProvider);
            writeCachedCandles(cacheKey, {
              candles: browserCandles,
              provider: fallbackProvider,
            });
            if (isFirstLoad || replayAtLatestRef.current) {
              replayAtLatestRef.current = true;
              setVisibleCount(browserCandles.length);
            } else {
              setVisibleCount((count) => Math.min(count, browserCandles.length));
            }
            return;
          } catch (browserError) {
            const serverMessage = error instanceof Error ? error.message : "Market data request failed.";
            const browserMessage = browserError instanceof Error ? browserError.message : "Browser request failed.";
            if (!cachedData) setDataError(`${serverMessage} ${browserMessage}`);
          }
        } else {
          if (!cachedData) {
            setDataError(
              error instanceof Error ? error.message : "Unable to load market data.",
            );
          }
        }
        if (isFirstLoad && !cachedData) setCandles([]);
      } finally {
        requestInFlight = false;
        if (!cancelled && isFirstLoad && !cachedData) setLoading(false);
        isFirstLoad = false;
      }
    };

    void loadCandles();
    const shouldRefresh = followLatest || endDate === toDateInputValue(new Date());
    const refreshTimer = shouldRefresh
      ? window.setInterval(loadCandles, REFRESH_INTERVAL_MS)
      : undefined;
    const refreshOnFocus = () => {
      if (shouldRefresh && document.visibilityState === "visible") {
        void loadCandles();
      }
    };
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      cancelled = true;
      controller.abort();
      if (refreshTimer !== undefined) window.clearInterval(refreshTimer);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [assetClass, datesReady, endDate, followLatest, marketDataRefresh, startDate, symbol, timeframe]);

  useEffect(() => {
    if (!followLatest) return;

    const updateEndDate = () => {
      const today = toDateInputValue(new Date());
      setEndDate((current) => current === today ? current : today);
    };

    const timer = window.setInterval(updateEndDate, 60_000);
    return () => window.clearInterval(timer);
  }, [followLatest]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { color: "#080a0d" },
        textColor: "#c6cbd1",
        fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: "#1b1e24" },
        horzLines: { color: "#1b1e24" },
      },
      rightPriceScale: {
        borderColor: "#1b1e24",
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderColor: "#1b1e24",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: { price: true, time: false },
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      crosshair: {
        vertLine: { color: "#c6cbd1", labelBackgroundColor: "#1b1e24" },
        horzLine: { color: "#c6cbd1", labelBackgroundColor: "#1b1e24" },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#42dfc1",
      downColor: "#ff7187",
      borderUpColor: "#42dfc1",
      borderDownColor: "#ff7187",
      wickUpColor: "#42dfc1",
      wickDownColor: "#ff7187",
      priceLineVisible: false,
    });
    const sma20 = chart.addSeries(LineSeries, {
      color: "#f7c95c",
      lineWidth: 2,
      title: "SMA 20",
      visible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const ema50 = chart.addSeries(LineSeries, {
      color: "#58c9ff",
      lineWidth: 2,
      title: "EMA 50",
      visible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const bollingerUpper = chart.addSeries(LineSeries, {
      color: "#b49cff",
      lineWidth: 1,
      title: "BB Upper",
      visible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const bollingerMiddle = chart.addSeries(LineSeries, {
      color: "#d6c8ff",
      lineWidth: 1,
      title: "BB Basis",
      visible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const bollingerLower = chart.addSeries(LineSeries, {
      color: "#b49cff",
      lineWidth: 1,
      title: "BB Lower",
      visible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = series;
    indicatorSeriesRef.current = {
      sma20,
      ema50,
      bollingerUpper,
      bollingerMiddle,
      bollingerLower,
      rsi14: null,
    };

    const handlePriceScaleWheel = (event: WheelEvent) => {
      const bounds = container.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      const plotRight = chart.timeScale().width();
      if (x < plotRight || x > bounds.width || y < 0 || y > chart.paneSize(0).height) return;

      const priceScale = series.priceScale();
      const range = priceScale.getVisibleRange();
      const anchor = series.coordinateToPrice(y);
      if (!range || anchor === null) return;

      event.preventDefault();
      event.stopPropagation();
      const zoomFactor = Math.exp(Math.sign(event.deltaY) * 0.12);
      const nextFrom = anchor - (anchor - range.from) * zoomFactor;
      const nextTo = anchor + (range.to - anchor) * zoomFactor;
      if (nextFrom >= nextTo) return;
      priceScale.setAutoScale(false);
      priceScale.setVisibleRange({ from: nextFrom, to: nextTo });
      scheduleDrawingProjection();
    };
    container.addEventListener("wheel", handlePriceScaleWheel, { capture: true, passive: false });

    const resizeObserver = new ResizeObserver(() => {
      if (!chartContainerRef.current) return;

      chart.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
      });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener("wheel", handlePriceScaleWheel, true);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      indicatorSeriesRef.current = null;
      rsiPaneIndexRef.current = null;
    };
  }, [scheduleDrawingProjection]);

  useEffect(() => {
    const chart = chartRef.current;
    const indicatorSeries = indicatorSeriesRef.current;
    if (!chart || !indicatorSeries) return;

    if (indicators.rsi14 && !indicatorSeries.rsi14) {
      const pane = chart.addPane();
      pane.setStretchFactor(0.25);
      const paneIndex = chart.panes().length - 1;
      indicatorSeries.rsi14 = pane.addSeries(LineSeries, {
        color: "#c48cff",
        lineWidth: 2,
        title: "RSI 14",
        priceLineVisible: false,
        lastValueVisible: true,
        autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }),
      });
      chart.priceScale("right", paneIndex).applyOptions({
        scaleMargins: { top: 0.12, bottom: 0.12 },
      });
      rsiPaneIndexRef.current = paneIndex;
    } else if (!indicators.rsi14 && indicatorSeries.rsi14) {
      chart.removeSeries(indicatorSeries.rsi14);
      if (rsiPaneIndexRef.current !== null && rsiPaneIndexRef.current > 0) {
        chart.removePane(rsiPaneIndexRef.current);
      }
      indicatorSeries.rsi14 = null;
      rsiPaneIndexRef.current = null;
    }
  }, [indicators.rsi14]);

  useEffect(() => {
    const chart = chartRef.current;
    const refs = indicatorSeriesRef.current;
    if (!chart || !refs) return;

    refs.sma20.applyOptions({ visible: indicators.sma20 });
    refs.ema50.applyOptions({ visible: indicators.ema50 });
    refs.bollingerUpper.applyOptions({ visible: indicators.bollinger20 });
    refs.bollingerMiddle.applyOptions({ visible: indicators.bollinger20 });
    refs.bollingerLower.applyOptions({ visible: indicators.bollinger20 });
    refs.sma20.setData(calculateSma(chartCandles, 20));
    refs.ema50.setData(calculateEma(chartCandles, 50));
    const bands = calculateBollingerBands(chartCandles, 20, 2);
    refs.bollingerUpper.setData(bands.upper);
    refs.bollingerMiddle.setData(bands.middle);
    refs.bollingerLower.setData(bands.lower);
    refs.rsi14?.setData(calculateRsi(chartCandles, 14));
  }, [chartCandles, indicators.bollinger20, indicators.ema50, indicators.rsi14, indicators.sma20]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    chart.applyOptions({
      layout: {
        background: { color: pageTheme === "dark" ? "#080a0d" : "#f2f0e9" },
        textColor: pageTheme === "dark" ? "#c6cbd1" : "#1b1e24",
      },
      grid: {
        vertLines: { color: pageTheme === "dark" ? "#1b1e24" : "#c6cbd1" },
        horzLines: { color: pageTheme === "dark" ? "#1b1e24" : "#c6cbd1" },
      },
      rightPriceScale: { borderColor: "#c6cbd1" },
      timeScale: { borderColor: "#c6cbd1" },
    });
  }, [pageTheme]);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;

    if (!series || !chart) return;

    const datasetKey = `${assetClass}:${symbol}:${timeframe}:${startDate}:${endDate}:${placingReplayStart ? "placing" : "replay"}:${replayResetKey}`;
    if (chartDatasetKeyRef.current !== datasetKey) {
      series.priceScale().setAutoScale(true);
    }
    series.applyOptions({
      priceFormat: {
        type: "price",
        precision: pricePrecision,
        minMove: 10 ** -pricePrecision,
      },
    });
    setHoveredCandleTime(null);

    series.setData(
      chartCandles.map((candle) => {
        return {
          time: candle.time as UTCTimestamp,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        };
      }),
    );

    if (chartCandles.length === 0) {
      chartDatasetKeyRef.current = "";
      chartVisibleCountRef.current = chartCandles.length;
      return;
    }

    const latestCandleTime = candles[candles.length - 1]?.time ?? 0;
    if (
      chartDatasetKeyRef.current !== datasetKey ||
      chartVisibleCountRef.current !== chartCandles.length ||
      (replayAtLatestRef.current && latestCandleTime > latestCandleTimeRef.current)
    ) {
      const displayedBars = Math.min(chartCandles.length, 180);
      const lastLogicalIndex = chartCandles.length - 1;
      chart.timeScale().setVisibleLogicalRange({
        from: Math.max(0, chartCandles.length - displayedBars),
        to: lastLogicalIndex + 8,
      });
      chartDatasetKeyRef.current = datasetKey;
      chartVisibleCountRef.current = chartCandles.length;
    }
    latestCandleTimeRef.current = latestCandleTime;
  }, [assetClass, candles, chartCandles, endDate, placingReplayStart, pricePrecision, replayResetKey, startDate, symbol, timeframe]);

  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;

    const onCrosshairMove = (parameter: MouseEventParams) => {
      const time = parameter.time;
      if (typeof time === "number" && parameter.seriesData.has(series)) {
        setHoveredCandleTime(time);
      } else {
        setHoveredCandleTime(null);
      }
    };

    chart.subscribeCrosshairMove(onCrosshairMove);
    return () => chart.unsubscribeCrosshairMove(onCrosshairMove);
  }, [chartCandles]);

  useEffect(() => {
    const chart = chartRef.current;
    const container = chartContainerRef.current;
    const svg = drawingOverlayRef.current;
    const series = seriesRef.current;
    if (!chart || !container || !svg || !series) return;

    const projectDrawings = () => {
      const plotWidth = chart.timeScale().width();
      const plotHeight = chart.paneSize(0).height;
      svg.style.left = "0px";
      svg.style.top = "0px";
      svg.style.right = "auto";
      svg.style.bottom = "auto";
      svg.style.width = `${plotWidth}px`;
      svg.style.height = `${plotHeight}px`;
      svg.replaceChildren();
      const intervalSeconds = TIMEFRAMES.find((item) => item.label === timeframe)?.seconds ?? 60;
      const drawingX = (time: number) => {
        const logical = logicalAtCandleTime(chartCandles, time, intervalSeconds);
        return logical === null
          ? null
          : chart.timeScale().logicalToCoordinate(logical as Logical);
      };
      if (activeTool !== "cursor") {
        const drawingSurface = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        drawingSurface.setAttribute("x", "0");
        drawingSurface.setAttribute("y", "0");
        drawingSurface.setAttribute("width", String(plotWidth));
        drawingSurface.setAttribute("height", String(plotHeight));
        drawingSurface.setAttribute("fill", "transparent");
        drawingSurface.setAttribute("pointer-events", "all");
        svg.appendChild(drawingSurface);
      }
      for (const drawing of drawingsLoadedFor === drawingStorageKey
        ? [
            ...drawingsRef.current,
            ...(drawingDraftRef.current ? [drawingDraftRef.current] : []),
          ]
        : []) {
        let x1: number | null;
        let x2: number | null;
        let y1: number | null;
        let y2: number | null;
        let endpoint1X: number | null = null;
        let endpoint1Y: number | null = null;
        let endpoint2X: number | null = null;
        let endpoint2Y: number | null = null;

        if (drawing.tool === "level" || drawing.tool === "crossline") {
          x1 = 0;
          x2 = chart.timeScale().width();
          y1 = series.priceToCoordinate(drawing.price1);
          y2 = y1;
        } else if (drawing.tool === "vertical") {
          x1 = drawingX(drawing.time1);
          x2 = x1;
          y1 = 0;
          y2 = chart.paneSize(0).height;
        } else if (drawing.tool === "horizontalRay") {
          x1 = drawingX(drawing.time1);
          x2 = chart.timeScale().width();
          y1 = series.priceToCoordinate(drawing.price1);
          y2 = y1;
        } else {
          x1 = drawingX(drawing.time1);
          x2 = drawingX(drawing.time2);
          y1 = series.priceToCoordinate(drawing.price1);
          y2 = series.priceToCoordinate(drawing.price2);
          endpoint2X = x2;
          endpoint2Y = y2;
          if ((drawing.tool === "ray" || drawing.tool === "extendedLine") && x1 !== null && x2 !== null && y1 !== null && y2 !== null && x2 !== x1) {
            const anchorX1 = x1;
            const anchorX2 = x2;
            const anchorY1 = y1;
            const anchorY2 = y2;
            endpoint1X = anchorX1;
            endpoint1Y = anchorY1;
            if (drawing.tool === "ray") {
              const edgeX = x2 > x1 ? chart.timeScale().width() : 0;
              y2 = y1 + ((y2 - y1) / (x2 - x1)) * (edgeX - x1);
              x2 = edgeX;
            } else {
              const slope = (anchorY2 - anchorY1) / (anchorX2 - anchorX1);
              y1 = anchorY1 - slope * anchorX1;
              y2 = anchorY1 + slope * (chart.timeScale().width() - anchorX1);
              x1 = 0;
              x2 = chart.timeScale().width();
            }
            endpoint2X = anchorX2;
            endpoint2Y = anchorY2;
          }
        }
        if (x1 === null || x2 === null || y1 === null || y2 === null) continue;

        const selected = drawing.id === selectedDrawingId;
        const lineWidth = drawing.lineWidth ?? 2;
        const visibleLineWidth = lineWidth + (selected ? 1 : 0);
        if (isPositionDrawing(drawing)) {
          const targetY = series.priceToCoordinate(drawing.targetPrice);
          if (targetY === null) continue;

          const plotWidth = chart.timeScale().width();
          const boxLeft = Math.max(0, Math.min(plotWidth - 48, Math.min(x1, x2)));
          const boxRight = Math.min(plotWidth, Math.max(boxLeft + 48, Math.max(x1, x2)));
          const boxTop = Math.max(0, Math.min(targetY, y1, y2));
          const boxBottom = Math.min(chart.paneSize(0).height, Math.max(targetY, y1, y2));
          const targetColor = drawing.targetColor ?? "#39d98a";
          const stopColor = drawing.stopColor ?? "#ff5b76";
          const profitTop = Math.min(targetY, y1);
          const profitBottom = Math.max(targetY, y1);
          const lossTop = Math.min(y1, y2);
          const lossBottom = Math.max(y1, y2);

          const zone = (top: number, bottom: number, fill: string, opacity: number) => {
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", String(boxLeft));
            rect.setAttribute("y", String(top));
            rect.setAttribute("width", String(Math.max(1, boxRight - boxLeft)));
            rect.setAttribute("height", String(Math.max(1, bottom - top)));
            rect.setAttribute("fill", fill);
            rect.setAttribute("fill-opacity", String(opacity));
            rect.setAttribute("pointer-events", "none");
            svg.appendChild(rect);
          };
          const positionLine = (y: number, color: string, dashed = false) => {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", String(boxLeft));
            line.setAttribute("y1", String(y));
            line.setAttribute("x2", String(boxRight));
            line.setAttribute("y2", String(y));
            line.setAttribute("stroke", color);
            line.setAttribute("stroke-width", String(visibleLineWidth));
            line.setAttribute("vector-effect", "non-scaling-stroke");
            line.setAttribute("pointer-events", "none");
            if (dashed) line.setAttribute("stroke-dasharray", "5 4");
            svg.appendChild(line);
          };
          const label = (text: string, y: number, color: string) => {
            const node = document.createElementNS("http://www.w3.org/2000/svg", "text");
            node.setAttribute("x", String(boxLeft + 7));
            node.setAttribute("y", String(Math.max(12, Math.min(chart.paneSize(0).height - 4, y + 14))));
            node.setAttribute("fill", color);
            node.setAttribute("font-size", "10");
            node.setAttribute("font-weight", "700");
            node.setAttribute("font-family", "Montserrat, ui-sans-serif, system-ui, sans-serif");
            node.setAttribute("pointer-events", "none");
            node.textContent = text;
            svg.appendChild(node);
          };

          zone(profitTop, profitBottom, targetColor, drawing.fillOpacity ?? 0.16);
          zone(lossTop, lossBottom, stopColor, drawing.fillOpacity ?? 0.16);
          positionLine(targetY, targetColor, true);
          positionLine(y1, drawing.color);
          positionLine(y2, stopColor, true);
          label("TAKE PROFIT", targetY, targetColor);
          label("ENTRY", y1, "#9de7ff");
          label("STOP LOSS", y2, stopColor);

          const hitArea = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          hitArea.setAttribute("x", String(boxLeft));
          hitArea.setAttribute("y", String(boxTop));
          hitArea.setAttribute("width", String(Math.max(1, boxRight - boxLeft)));
          hitArea.setAttribute("height", String(Math.max(1, boxBottom - boxTop)));
          hitArea.setAttribute("fill", "transparent");
          hitArea.setAttribute("pointer-events", "all");
          hitArea.setAttribute("data-drawing-id", drawing.id);
          hitArea.setAttribute("cursor", "move");
          svg.appendChild(hitArea);

          const replayState = evaluatePositionReplay(drawing, chartCandles);
          const replayX = replayState && replayState.status !== "pending" && replayState.status !== "invalid"
            ? drawingX(replayState.time)
            : null;
          const replayY = replayState && replayState.status !== "pending" && replayState.status !== "invalid"
            ? series.priceToCoordinate(replayState.price)
            : null;
          if (replayState && replayX !== null && replayY !== null) {
            const favorable = (replayState.price - drawing.price1) * (drawing.tool === "longPosition" ? 1 : -1) >= 0;
            const progressColor = replayState.status === "target" || (replayState.status === "open" && favorable)
              ? targetColor
              : stopColor;
            const progressLeft = Math.max(boxLeft, Math.min(boxRight, x1));
            const progressRight = Math.max(progressLeft, Math.min(boxRight, replayX));
            const progressTop = Math.min(y1, replayY);
            const progressBottom = Math.max(y1, replayY);

            if (progressRight > progressLeft && progressBottom > progressTop) {
              const progressFill = document.createElementNS("http://www.w3.org/2000/svg", "rect");
              progressFill.setAttribute("x", String(progressLeft));
              progressFill.setAttribute("y", String(progressTop));
              progressFill.setAttribute("width", String(progressRight - progressLeft));
              progressFill.setAttribute("height", String(progressBottom - progressTop));
              progressFill.setAttribute("fill", progressColor);
              progressFill.setAttribute("fill-opacity", String(drawing.fillOpacity ?? 0.16));
              progressFill.setAttribute("pointer-events", "none");
              svg.appendChild(progressFill);
            }

            // This edge advances with the replay candle; the translucent fill
            // between it and entry shows favorable or adverse movement.
            const progressEdge = document.createElementNS("http://www.w3.org/2000/svg", "line");
            progressEdge.setAttribute("x1", String(progressRight));
            progressEdge.setAttribute("y1", String(y1));
            progressEdge.setAttribute("x2", String(progressRight));
            progressEdge.setAttribute("y2", String(replayY));
            progressEdge.setAttribute("stroke", progressColor);
            progressEdge.setAttribute("stroke-width", "1.5");
            progressEdge.setAttribute("stroke-opacity", "0.8");
            progressEdge.setAttribute("pointer-events", "none");
            svg.appendChild(progressEdge);
          }

          if (selected) {
            for (const [endpoint, x, y] of [
              ["target", x1, targetY],
              ["entry", x1, y1],
              ["stop", x1, y2],
              ["endpoint2", x2, y1],
            ] as const) {
              const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
              handle.setAttribute("cx", String(x));
              handle.setAttribute("cy", String(y));
              handle.setAttribute("r", "5");
              handle.setAttribute("fill", "#f4fbff");
              handle.setAttribute("stroke", drawing.color);
              handle.setAttribute("stroke-width", "2");
              handle.setAttribute("pointer-events", "all");
              handle.setAttribute("data-drawing-id", drawing.id);
              handle.setAttribute("data-drawing-endpoint", endpoint);
              handle.setAttribute("cursor", endpoint === "endpoint2" ? "ew-resize" : "ns-resize");
              svg.appendChild(handle);
            }
          }
          continue;
        }

        if (drawing.tool === "gannFan") {
          const anchorX = drawingX(drawing.time1);
          const anchorY = series.priceToCoordinate(drawing.price1);
          const secondX = drawingX(drawing.time2);
          const secondY = series.priceToCoordinate(drawing.price2);
          if (anchorX === null || anchorY === null || secondX === null || secondY === null || secondX === anchorX) continue;
          const baseSlope = (secondY - anchorY) / (secondX - anchorX);
          const edgeX = secondX > anchorX ? chart.timeScale().width() : 0;
          for (const factor of [-2, -1, -0.5, 0.5, 1, 2]) {
            const edgeY = anchorY + baseSlope * factor * (edgeX - anchorX);
            const ray = document.createElementNS("http://www.w3.org/2000/svg", "line");
            ray.setAttribute("x1", String(anchorX));
            ray.setAttribute("y1", String(anchorY));
            ray.setAttribute("x2", String(edgeX));
            ray.setAttribute("y2", String(edgeY));
            ray.setAttribute("stroke", drawing.color);
            ray.setAttribute("stroke-width", String(Math.max(1, visibleLineWidth * (factor === 1 ? 0.85 : 0.65))));
            ray.setAttribute("stroke-opacity", factor === 1 ? "0.95" : "0.58");
            ray.setAttribute("stroke-dasharray", factor === 1 ? "" : "4 3");
            ray.setAttribute("pointer-events", "none");
            svg.appendChild(ray);
            const hit = document.createElementNS("http://www.w3.org/2000/svg", "line");
            hit.setAttribute("x1", String(anchorX));
            hit.setAttribute("y1", String(anchorY));
            hit.setAttribute("x2", String(edgeX));
            hit.setAttribute("y2", String(edgeY));
            hit.setAttribute("stroke", "transparent");
            hit.setAttribute("stroke-width", "10");
            hit.setAttribute("pointer-events", "stroke");
            hit.setAttribute("data-drawing-id", drawing.id);
            hit.setAttribute("cursor", "move");
            svg.appendChild(hit);
          }
          if (selected) {
            for (const [endpoint, x, y] of [["endpoint1", anchorX, anchorY], ["endpoint2", secondX, secondY]] as const) {
              const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
              handle.setAttribute("cx", String(x));
              handle.setAttribute("cy", String(y));
              handle.setAttribute("r", "4");
              handle.setAttribute("fill", "#f4fbff");
              handle.setAttribute("stroke", drawing.color);
              handle.setAttribute("stroke-width", "2");
              handle.setAttribute("pointer-events", "all");
              handle.setAttribute("data-drawing-id", drawing.id);
              handle.setAttribute("data-drawing-endpoint", endpoint);
              svg.appendChild(handle);
            }
          }
          continue;
        }

        if (drawing.tool === "fibRetracement" || drawing.tool === "fibExtension") {
          const ratios = drawing.tool === "fibRetracement"
            ? [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
            : [0, 0.618, 1, 1.618, 2.618];
          const startX = drawingX(drawing.time1);
          const endX = drawingX(drawing.time2);
          const startY = series.priceToCoordinate(drawing.price1);
          const endY = series.priceToCoordinate(drawing.price2);
          if (startX === null || endX === null || startY === null || endY === null) continue;
          ratios.forEach((ratio, index) => {
            const price = drawing.price1 + (drawing.price2 - drawing.price1) * ratio;
            const levelY = series.priceToCoordinate(price);
            if (levelY === null) return;
            const levelLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            levelLine.setAttribute("x1", String(Math.min(startX, endX)));
            levelLine.setAttribute("x2", String(Math.max(startX, endX)));
            levelLine.setAttribute("y1", String(levelY));
            levelLine.setAttribute("y2", String(levelY));
            levelLine.setAttribute("stroke", drawing.color);
            levelLine.setAttribute("stroke-width", String(visibleLineWidth));
            levelLine.setAttribute("stroke-opacity", index === 0 || index === ratios.length - 1 ? "0.9" : "0.62");
            levelLine.setAttribute("stroke-dasharray", index === 0 || index === ratios.length - 1 ? "" : "4 3");
            levelLine.setAttribute("pointer-events", "none");
            svg.appendChild(levelLine);
            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute("x", String(Math.max(2, Math.min(chart.timeScale().width() - 64, Math.max(startX, endX) + 5))));
            label.setAttribute("y", String(levelY - 3));
            label.setAttribute("fill", drawing.color);
            label.setAttribute("font-size", "9");
            label.setAttribute("font-family", "Montserrat, ui-sans-serif, system-ui, sans-serif");
            label.setAttribute("pointer-events", "none");
            const ratioLabel = `${(ratio * 100).toFixed(ratio % 1 ? 1 : 0)}%`;
            label.textContent = drawing.showPrices
              ? `${ratioLabel} · ${formatPrice(price, symbol, pricePrecision)}`
              : ratioLabel;
            svg.appendChild(label);
          });
          const hitArea = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          hitArea.setAttribute("x", String(Math.min(startX, endX)));
          hitArea.setAttribute("y", String(Math.min(startY, endY) - 5));
          hitArea.setAttribute("width", String(Math.max(12, Math.abs(endX - startX))));
          hitArea.setAttribute("height", String(Math.max(12, Math.abs(endY - startY) + 10)));
          hitArea.setAttribute("fill", "transparent");
          hitArea.setAttribute("pointer-events", "all");
          hitArea.setAttribute("data-drawing-id", drawing.id);
          hitArea.setAttribute("cursor", "move");
          svg.appendChild(hitArea);
          if (selected) {
            for (const [x, y] of [[startX, startY], [endX, endY]]) {
              const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
              handle.setAttribute("cx", String(x));
              handle.setAttribute("cy", String(y));
              handle.setAttribute("r", "4");
              handle.setAttribute("fill", "#f4fbff");
              handle.setAttribute("stroke", drawing.color);
              handle.setAttribute("stroke-width", "2");
              handle.setAttribute("pointer-events", "all");
              handle.setAttribute("data-drawing-id", drawing.id);
              handle.setAttribute("data-drawing-endpoint", x === startX && y === startY ? "endpoint1" : "endpoint2");
              svg.appendChild(handle);
            }
          }
          continue;
        }

        if (drawing.tool === "brush") {
          const projected = (drawing.points ?? [])
            .map((point) => {
              const x = drawingX(point.time);
              const y = series.priceToCoordinate(point.price);
              return x === null || y === null ? null : `${x},${y}`;
            })
            .filter((point): point is string => point !== null);
          if (projected.length === 1) {
            const [dotX, dotY] = projected[0].split(",");
            const hitDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            hitDot.setAttribute("cx", dotX);
            hitDot.setAttribute("cy", dotY);
            hitDot.setAttribute("r", "8");
            hitDot.setAttribute("fill", "transparent");
            hitDot.setAttribute("pointer-events", "all");
            hitDot.setAttribute("data-drawing-id", drawing.id);
            hitDot.setAttribute("cursor", "move");
            svg.appendChild(hitDot);
            const visibleDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            visibleDot.setAttribute("cx", dotX);
            visibleDot.setAttribute("cy", dotY);
            visibleDot.setAttribute("r", String(Math.max(2, visibleLineWidth)));
            visibleDot.setAttribute("fill", drawing.color);
            visibleDot.setAttribute("pointer-events", "none");
            svg.appendChild(visibleDot);
            continue;
          }
          if (projected.length < 2) continue;
          const hit = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
          hit.setAttribute("points", projected.join(" "));
          hit.setAttribute("fill", "none");
          hit.setAttribute("stroke", "transparent");
          hit.setAttribute("stroke-width", "16");
          hit.setAttribute("stroke-linecap", "round");
          hit.setAttribute("stroke-linejoin", "round");
          hit.setAttribute("pointer-events", "stroke");
          hit.setAttribute("data-drawing-id", drawing.id);
          hit.setAttribute("cursor", "move");
          svg.appendChild(hit);
          const stroke = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
          stroke.setAttribute("points", projected.join(" "));
          stroke.setAttribute("fill", "none");
          stroke.setAttribute("stroke", drawing.color);
          stroke.setAttribute("stroke-width", String(visibleLineWidth));
          stroke.setAttribute("stroke-linecap", "round");
          stroke.setAttribute("stroke-linejoin", "round");
          stroke.setAttribute("pointer-events", "none");
          svg.appendChild(stroke);
          continue;
        }

        if (["rectangle", "ellipse", "circle", "triangle", "headShoulders", "abcdPattern", "elliottImpulse", "priceRange", "dateRange", "datePriceRange", "text"].includes(drawing.tool)) {
          const anchorX1 = drawingX(drawing.time1);
          const anchorX2 = drawingX(drawing.time2);
          const anchorY1 = series.priceToCoordinate(drawing.price1);
          const anchorY2 = series.priceToCoordinate(drawing.price2);
          if (anchorX1 === null || anchorX2 === null || anchorY1 === null || anchorY2 === null) continue;
          const plotHeight = chart.paneSize(0).height;
          const left = Math.min(anchorX1, anchorX2);
          const top = Math.min(anchorY1, anchorY2);
          const width = Math.max(2, Math.abs(anchorX2 - anchorX1));
          const height = Math.max(2, Math.abs(anchorY2 - anchorY1));
          if (drawing.tool === "text") {
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", String(anchorX1));
            text.setAttribute("y", String(anchorY1));
            text.setAttribute("fill", drawing.color);
            text.setAttribute("font-size", String(drawing.fontSize ?? 13));
            text.setAttribute("font-weight", "600");
            text.setAttribute("pointer-events", "none");
            text.textContent = drawing.note || "Note";
            svg.appendChild(text);
          } else if (drawing.tool === "triangle") {
            const shape = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            shape.setAttribute("points", `${anchorX1},${anchorY2} ${(anchorX1 + anchorX2) / 2},${anchorY1} ${anchorX2},${anchorY2}`);
            shape.setAttribute("fill", drawing.color);
            shape.setAttribute("fill-opacity", String(drawing.fillOpacity ?? 0.08));
            shape.setAttribute("stroke", drawing.color);
            shape.setAttribute("stroke-width", String(visibleLineWidth));
            shape.setAttribute("pointer-events", "none");
            svg.appendChild(shape);
          } else if (drawing.tool === "headShoulders" || drawing.tool === "abcdPattern" || drawing.tool === "elliottImpulse") {
            const patternPoints = drawing.tool === "headShoulders"
              ? [[0, 0.72], [0.16, 0.48], [0.3, 0.7], [0.5, 0.18], [0.7, 0.7], [0.84, 0.48], [1, 0.72]]
              : drawing.tool === "abcdPattern"
                ? [[0, 0.88], [0.33, 0.15], [0.64, 0.58], [1, 0.28]]
                : [[0, 0.86], [0.2, 0.48], [0.4, 0.68], [0.6, 0.16], [0.8, 0.42], [1, 0.08]];
            const points = patternPoints
              .map(([xRatio, yRatio]) => `${anchorX1 + (anchorX2 - anchorX1) * xRatio},${anchorY1 + (anchorY2 - anchorY1) * yRatio}`)
              .join(" ");
            const pattern = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
            pattern.setAttribute("points", points);
            pattern.setAttribute("fill", "none");
            pattern.setAttribute("stroke", drawing.color);
            pattern.setAttribute("stroke-width", String(visibleLineWidth));
            pattern.setAttribute("stroke-linecap", "round");
            pattern.setAttribute("stroke-linejoin", "round");
            pattern.setAttribute("pointer-events", "none");
            svg.appendChild(pattern);
            if (drawing.tool === "headShoulders") {
              const neckline = document.createElementNS("http://www.w3.org/2000/svg", "line");
              neckline.setAttribute("x1", String(anchorX1 + (anchorX2 - anchorX1) * 0.16));
              neckline.setAttribute("x2", String(anchorX1 + (anchorX2 - anchorX1) * 0.84));
              neckline.setAttribute("y1", String(anchorY1 + (anchorY2 - anchorY1) * 0.7));
              neckline.setAttribute("y2", String(anchorY1 + (anchorY2 - anchorY1) * 0.7));
              neckline.setAttribute("stroke", drawing.color);
              neckline.setAttribute("stroke-dasharray", "4 3");
              neckline.setAttribute("stroke-width", "1");
              neckline.setAttribute("pointer-events", "none");
              svg.appendChild(neckline);
            }
          } else if (drawing.tool === "ellipse" || drawing.tool === "circle") {
            const shape = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
            shape.setAttribute("cx", String(left + width / 2));
            shape.setAttribute("cy", String(top + height / 2));
            shape.setAttribute("rx", String(drawing.tool === "circle" ? Math.min(width, height) / 2 : width / 2));
            shape.setAttribute("ry", String(drawing.tool === "circle" ? Math.min(width, height) / 2 : height / 2));
            shape.setAttribute("fill", drawing.color);
            shape.setAttribute("fill-opacity", String(drawing.fillOpacity ?? 0.08));
            shape.setAttribute("stroke", drawing.color);
            shape.setAttribute("stroke-width", String(visibleLineWidth));
            shape.setAttribute("pointer-events", "none");
            svg.appendChild(shape);
          } else {
            const shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            shape.setAttribute("x", String(drawing.tool === "dateRange" ? left : drawing.tool === "priceRange" ? 0 : left));
            shape.setAttribute("y", String(drawing.tool === "dateRange" ? 0 : top));
            shape.setAttribute("width", String(drawing.tool === "priceRange" ? chart.timeScale().width() : width));
            shape.setAttribute("height", String(drawing.tool === "dateRange" ? plotHeight : height));
            shape.setAttribute("fill", drawing.color);
            shape.setAttribute("fill-opacity", String(drawing.fillOpacity ?? 0.08));
            shape.setAttribute("stroke", drawing.color);
            shape.setAttribute("stroke-width", String(visibleLineWidth));
            shape.setAttribute("pointer-events", "none");
            svg.appendChild(shape);
            if (drawing.tool === "priceRange" || drawing.tool === "datePriceRange") {
              const delta = drawing.price2 - drawing.price1;
              const percent = drawing.price1 ? (delta / drawing.price1) * 100 : 0;
              const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
              label.setAttribute("x", String(left + 5));
              label.setAttribute("y", String(Math.max(12, top + 14)));
              label.setAttribute("fill", drawing.color);
              label.setAttribute("font-size", "10");
              label.setAttribute("font-family", "Montserrat, ui-sans-serif, system-ui, sans-serif");
              label.setAttribute("pointer-events", "none");
              label.textContent = `${formatPrice(delta, symbol, pricePrecision)} · ${percent.toFixed(2)}%`;
              svg.appendChild(label);
            }
          }
          const hitArea = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          hitArea.setAttribute("x", String(drawing.tool === "text" ? anchorX1 - 4 : drawing.tool === "priceRange" ? -4 : left - 4));
          hitArea.setAttribute("y", String(drawing.tool === "text" ? anchorY1 - 20 : drawing.tool === "dateRange" ? -4 : top - 4));
          hitArea.setAttribute("width", String(drawing.tool === "text" ? 132 : drawing.tool === "priceRange" ? chart.timeScale().width() + 8 : width + 8));
          hitArea.setAttribute("height", String(drawing.tool === "text" ? 28 : drawing.tool === "dateRange" ? plotHeight + 8 : height + 8));
          hitArea.setAttribute("fill", "transparent");
          hitArea.setAttribute("pointer-events", "all");
          hitArea.setAttribute("stroke", "transparent");
          hitArea.setAttribute("stroke-width", "14");
          hitArea.setAttribute("data-drawing-id", drawing.id);
          hitArea.setAttribute("cursor", "move");
          svg.appendChild(hitArea);
          if (selected && drawing.tool !== "text") {
            for (const [endpoint, x, y] of [["endpoint1", anchorX1, anchorY1], ["endpoint2", anchorX2, anchorY2]] as const) {
              const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
              handle.setAttribute("cx", String(x));
              handle.setAttribute("cy", String(y));
              handle.setAttribute("r", "4");
              handle.setAttribute("fill", "#f4fbff");
              handle.setAttribute("stroke", drawing.color);
              handle.setAttribute("stroke-width", "2");
              handle.setAttribute("pointer-events", "all");
              handle.setAttribute("data-drawing-id", drawing.id);
              handle.setAttribute("data-drawing-endpoint", endpoint);
              svg.appendChild(handle);
            }
          }
          continue;
        }

        const hitLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        hitLine.setAttribute("x1", String(x1));
        hitLine.setAttribute("y1", String(y1));
        hitLine.setAttribute("x2", String(x2));
        hitLine.setAttribute("y2", String(y2));
        hitLine.setAttribute("stroke", "transparent");
        hitLine.setAttribute("stroke-width", "16");
        hitLine.setAttribute("stroke-linecap", "round");
        hitLine.setAttribute("pointer-events", "stroke");
        hitLine.setAttribute("data-drawing-id", drawing.id);
        hitLine.setAttribute("cursor", "move");
        svg.appendChild(hitLine);

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", String(x1));
        line.setAttribute("y1", String(y1));
        line.setAttribute("x2", String(x2));
        line.setAttribute("y2", String(y2));
        line.setAttribute("stroke", drawing.color);
        line.setAttribute("stroke-width", String(visibleLineWidth));
        line.setAttribute("vector-effect", "non-scaling-stroke");
        line.setAttribute("pointer-events", "none");
        if (drawing.tool === "level" || drawing.tool === "vertical") line.setAttribute("stroke-dasharray", "7 5");
        svg.appendChild(line);

        if (drawing.tool === "crossline") {
          const verticalLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
          const crossX = drawingX(drawing.time1);
          verticalLine.setAttribute("x1", String(crossX ?? 0));
          verticalLine.setAttribute("x2", String(crossX ?? 0));
          verticalLine.setAttribute("y1", "0");
          verticalLine.setAttribute("y2", String(chart.paneSize(0).height));
          verticalLine.setAttribute("stroke", drawing.color);
          verticalLine.setAttribute("stroke-width", String(visibleLineWidth));
          verticalLine.setAttribute("stroke-dasharray", "7 5");
          verticalLine.setAttribute("pointer-events", "none");
          svg.appendChild(verticalLine);
          const verticalHit = document.createElementNS("http://www.w3.org/2000/svg", "line");
          verticalHit.setAttribute("x1", String(crossX ?? 0));
          verticalHit.setAttribute("x2", String(crossX ?? 0));
          verticalHit.setAttribute("y1", "0");
          verticalHit.setAttribute("y2", String(chart.paneSize(0).height));
          verticalHit.setAttribute("stroke", "transparent");
          verticalHit.setAttribute("stroke-width", "14");
          verticalHit.setAttribute("pointer-events", "stroke");
          verticalHit.setAttribute("data-drawing-id", drawing.id);
          verticalHit.setAttribute("cursor", "move");
          svg.appendChild(verticalHit);
        }

        if (drawing.tool === "arrow") {
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const size = 8;
          const points = [
            [x2, y2],
            [x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6)],
            [x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6)],
          ].map(([x, y]) => `${x},${y}`).join(" ");
          const head = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
          head.setAttribute("points", points);
          head.setAttribute("fill", drawing.color);
          head.setAttribute("pointer-events", "none");
          svg.appendChild(head);
        }

        if (drawing.tool === "infoLine") {
          const delta = drawing.price2 - drawing.price1;
          const percent = drawing.price1 ? (delta / drawing.price1) * 100 : 0;
          const elapsed = Math.abs(drawing.time2 - drawing.time1);
          const duration = elapsed >= 86_400
            ? `${(elapsed / 86_400).toFixed(1)}d`
            : elapsed >= 3_600
              ? `${(elapsed / 3_600).toFixed(1)}h`
              : `${Math.max(1, Math.round(elapsed / 60))}m`;
          const info = document.createElementNS("http://www.w3.org/2000/svg", "text");
          info.setAttribute("x", String((x1 + x2) / 2 + 6));
          info.setAttribute("y", String((y1 + y2) / 2 - 6));
          info.setAttribute("fill", drawing.color);
          info.setAttribute("font-size", "10");
          info.setAttribute("font-family", "Montserrat, ui-sans-serif, system-ui, sans-serif");
          info.setAttribute("pointer-events", "none");
          info.textContent = `${formatPrice(delta, symbol, pricePrecision)} · ${percent.toFixed(2)}% · ${duration}`;
          svg.appendChild(info);
        }

        if (selected && drawing.tool !== "level" && drawing.tool !== "vertical" && drawing.tool !== "horizontalRay" && drawing.tool !== "crossline") {
          for (const [endpoint, x, y] of [
            ["endpoint1", endpoint1X ?? x1, endpoint1Y ?? y1],
            ["endpoint2", endpoint2X ?? x2, endpoint2Y ?? y2],
          ] as const) {
            const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            handle.setAttribute("cx", String(x));
            handle.setAttribute("cy", String(y));
            handle.setAttribute("r", "5");
            handle.setAttribute("fill", drawing.color);
            handle.setAttribute("stroke", "#06130d");
            handle.setAttribute("stroke-width", "2");
            handle.setAttribute("pointer-events", "all");
            handle.setAttribute("data-drawing-id", drawing.id);
            handle.setAttribute("data-drawing-endpoint", endpoint);
            handle.setAttribute("cursor", "crosshair");
            svg.appendChild(handle);
          }
        }
      }

      // Mirror replay orders and open positions on the chart. These levels
      // use the same time and price scales as the candles, so they pan and
      // zoom with the market instead of behaving like fixed poster artwork.
      const appendTradeLevel = (
        price: number,
        color: string,
        label: string,
        fromX: number,
        dashed = false,
        labelColor = color,
      ) => {
        const rawY = series.priceToCoordinate(price);
        if (rawY === null || !Number.isFinite(rawY) || plotHeight <= 0 || plotWidth <= 0) return;

        const y = Math.max(8, Math.min(plotHeight - 8, rawY));
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", String(Math.max(0, Math.min(plotWidth, fromX))));
        line.setAttribute("x2", String(plotWidth));
        line.setAttribute("y1", String(y));
        line.setAttribute("y2", String(y));
        line.setAttribute("stroke", color);
        line.setAttribute("stroke-width", dashed ? "1.15" : "1.5");
        line.setAttribute("stroke-opacity", rawY < 0 || rawY > plotHeight ? "0.55" : "0.9");
        line.setAttribute("vector-effect", "non-scaling-stroke");
        line.setAttribute("pointer-events", "none");
        if (dashed || rawY < 0 || rawY > plotHeight) line.setAttribute("stroke-dasharray", "5 4");
        svg.appendChild(line);

        const maxTagWidth = Math.max(52, Math.min(250, plotWidth - 8));
        const tagText = label.length * 5.5 + 16 > maxTagWidth
          ? `${label.slice(0, Math.max(4, Math.floor((maxTagWidth - 25) / 5.5)))}…`
          : label;
        const tagWidth = Math.min(maxTagWidth, Math.max(52, tagText.length * 5.5 + 16));
        const tagX = Math.max(4, plotWidth - tagWidth - 4);
        const tagY = Math.max(2, Math.min(plotHeight - 20, y - 9));
        const tag = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        tag.setAttribute("x", String(tagX));
        tag.setAttribute("y", String(tagY));
        tag.setAttribute("width", String(tagWidth));
        tag.setAttribute("height", "18");
        tag.setAttribute("rx", "4");
        tag.setAttribute("fill", "#0b1220");
        tag.setAttribute("fill-opacity", "0.94");
        tag.setAttribute("stroke", labelColor);
        tag.setAttribute("stroke-opacity", "0.78");
        tag.setAttribute("pointer-events", "none");
        svg.appendChild(tag);

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", String(tagX + tagWidth - 7));
        text.setAttribute("y", String(tagY + 12.5));
        text.setAttribute("fill", labelColor);
        text.setAttribute("font-size", "9.5");
        text.setAttribute("font-weight", "700");
        text.setAttribute("font-family", "Montserrat, ui-sans-serif, system-ui, sans-serif");
        text.setAttribute("text-anchor", "end");
        text.setAttribute("pointer-events", "none");
        text.textContent = tagText;
        svg.appendChild(text);
      };

      for (const trade of trades) {
        if (trade.status !== "OPEN" && trade.status !== "PENDING") continue;

        const pending = trade.status === "PENDING";
        const entryPrice = pending ? trade.orderPrice ?? trade.entry : trade.entry;
        const startTime = pending ? trade.orderPlacedAt ?? trade.openedAt : trade.openedAt;
        const mappedStartX = drawingX(startTime);
        const startX = mappedStartX === null ? 0 : Math.max(0, Math.min(plotWidth, mappedStartX));
        const entryY = series.priceToCoordinate(entryPrice);
        const stopY = series.priceToCoordinate(trade.stopLoss);
        const targetY = series.priceToCoordinate(trade.takeProfit);

        if (!pending && entryY !== null && stopY !== null && targetY !== null) {
          const makeRiskZone = (levelY: number, color: string) => {
            const top = Math.max(0, Math.min(plotHeight, Math.min(entryY, levelY)));
            const bottom = Math.max(0, Math.min(plotHeight, Math.max(entryY, levelY)));
            if (bottom <= top || startX >= plotWidth) return;
            const zone = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            zone.setAttribute("x", String(startX));
            zone.setAttribute("y", String(top));
            zone.setAttribute("width", String(Math.max(0, plotWidth - startX)));
            zone.setAttribute("height", String(bottom - top));
            zone.setAttribute("fill", color);
            zone.setAttribute("fill-opacity", "0.055");
            zone.setAttribute("pointer-events", "none");
            svg.appendChild(zone);
          };
          makeRiskZone(targetY, "#22c55e");
          makeRiskZone(stopY, "#fb7185");
        }

        const sideColor = trade.side === "BUY" ? "#4adeb5" : "#fb7185";
        const sizeLabel = formatTradeSize(
          trade.displaySize ?? trade.quantity,
          trade.sizeMode ?? "QUANTITY",
        );
        const livePnl = !pending && currentCandle
          ? (currentCandle.close - trade.entry) * (trade.side === "BUY" ? 1 : -1) * trade.quantity
          : null;
        const pnlLabel = livePnl === null
          ? ""
          : `${livePnl > 0 ? "+" : ""}${formatMoney(livePnl)}`;
        const orderLabel = pending
          ? `${trade.side} ${trade.orderType} · ${sizeLabel} · ${formatPrice(entryPrice, symbol, pricePrecision)}`
          : `${trade.side} ${pnlLabel} · ${sizeLabel} · ${formatPrice(entryPrice, symbol, pricePrecision)}`;

        appendTradeLevel(
          entryPrice,
          sideColor,
          orderLabel,
          startX,
          false,
          livePnl === null ? sideColor : livePnl >= 0 ? "#4ade80" : "#fb7185",
        );
        appendTradeLevel(
          trade.takeProfit,
          "#4ade80",
          `TP · ${formatPrice(trade.takeProfit, symbol, pricePrecision)}`,
          startX,
          true,
        );
        appendTradeLevel(
          trade.stopLoss,
          "#fb7185",
          `SL · ${formatPrice(trade.stopLoss, symbol, pricePrecision)}`,
          startX,
          true,
        );

        if (!pending && entryY !== null && mappedStartX !== null && mappedStartX >= 0 && mappedStartX <= plotWidth && entryY >= 0 && entryY <= plotHeight) {
          const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          marker.setAttribute("cx", String(mappedStartX));
          marker.setAttribute("cy", String(entryY));
          marker.setAttribute("r", "3.5");
          marker.setAttribute("fill", sideColor);
          marker.setAttribute("stroke", "#0b1220");
          marker.setAttribute("stroke-width", "1.5");
          marker.setAttribute("pointer-events", "none");
          svg.appendChild(marker);
        }
      }
    };

    drawingProjectorRef.current = projectDrawings;
    projectDrawings();
    const timeScale = chart.timeScale();
    const resizeObserver = new ResizeObserver(scheduleDrawingProjection);
    const scheduleDuringChartGesture = (event: Event) => {
      if (event.type !== "pointermove" || (event as globalThis.PointerEvent).buttons !== 0) {
        scheduleDrawingProjection();
      }
    };
    resizeObserver.observe(container);
    timeScale.subscribeVisibleTimeRangeChange(scheduleDrawingProjection);
    timeScale.subscribeVisibleLogicalRangeChange(scheduleDrawingProjection);
    timeScale.subscribeSizeChange(scheduleDrawingProjection);
    container.addEventListener("pointermove", scheduleDuringChartGesture, { passive: true });
    container.addEventListener("pointerup", scheduleDrawingProjection, { passive: true });
    container.addEventListener("wheel", scheduleDrawingProjection, { passive: true });
    return () => {
      resizeObserver.disconnect();
      timeScale.unsubscribeVisibleTimeRangeChange(scheduleDrawingProjection);
      timeScale.unsubscribeVisibleLogicalRangeChange(scheduleDrawingProjection);
      timeScale.unsubscribeSizeChange(scheduleDrawingProjection);
      container.removeEventListener("pointermove", scheduleDuringChartGesture);
      container.removeEventListener("pointerup", scheduleDrawingProjection);
      container.removeEventListener("wheel", scheduleDrawingProjection);
      if (drawingProjectorRef.current === projectDrawings) {
        drawingProjectorRef.current = () => {};
      }
      if (drawingProjectionFrameRef.current !== null) {
        window.cancelAnimationFrame(drawingProjectionFrameRef.current);
        drawingProjectionFrameRef.current = null;
      }
    };
  }, [activeTool, assetClass, chartCandles, currentCandle, drawingStorageKey, drawingsLoadedFor, pricePrecision, quantity, scheduleDrawingProjection, selectedDrawingId, sizeMode, symbol, timeframe, trades, visibleCount]);

  const readDrawingPoint = (event: PointerEvent<SVGSVGElement>, allowOutside = false) => {
    const chart = chartRef.current;
    const container = chartContainerRef.current;
    const series = seriesRef.current;
    if (!chart || !container || !series) return null;

    const bounds = event.currentTarget.getBoundingClientRect();
    const plotWidth = chart.timeScale().width();
    const plotHeight = chart.paneSize(0).height;
    const rawX = event.clientX - bounds.left;
    const rawY = event.clientY - bounds.top;
    if (!allowOutside && (rawX < 0 || rawX > plotWidth || rawY < 0 || rawY > plotHeight)) return null;
    const x = Math.max(0, Math.min(plotWidth, rawX));
    const y = Math.max(0, Math.min(plotHeight, rawY));
    const logical = chart.timeScale().coordinateToLogical(x);
    if (logical === null) return null;
    const intervalSeconds = TIMEFRAMES.find((item) => item.label === timeframe)?.seconds ?? 60;
    const time = candleTimeAtLogical(chartCandles, Number(logical), intervalSeconds);
    const price = series.coordinateToPrice(y);
    if (time === null || price === null) return null;

    if (snapToCandle && chartCandles.length) {
      const candleIndex = Math.max(0, Math.min(chartCandles.length - 1, Math.round(Number(logical))));
      const candle = chartCandles[candleIndex];
      let nearestPrice = price;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const candidate of [candle.open, candle.high, candle.low, candle.close]) {
        const candidateY = series.priceToCoordinate(candidate);
        if (candidateY === null) continue;
        const distance = Math.abs(Number(candidateY) - y);
        if (distance < nearestDistance) {
          nearestPrice = candidate as typeof price;
          nearestDistance = distance;
        }
      }
      return { time: candle.time, price: nearestPrice as typeof price };
    }
    return { time, price };
  };

  const placeReplayStartAt = (clientX: number) => {
    const chart = chartRef.current;
    const container = chartContainerRef.current;
    if (!chart || !container || candles.length < 2) return;

    const bounds = container.getBoundingClientRect();
    const x = clientX - bounds.left;
    const logical = chart.timeScale().coordinateToLogical(x);
    if (logical === null) return;

    const latestReplayStart = Math.max(2, candles.length - 1);
    const nextCount = Math.max(2, Math.min(latestReplayStart, Math.round(logical) + 1));
    setPlaying(false);
    setSelectedDrawingId(null);
    setDrawingSettingsOpen(false);
    replayAtLatestRef.current = nextCount >= candles.length;
    setVisibleCount(nextCount);
    setPlacingReplayStart(false);
    setReplayPlacementX(null);
  };

  const handleChartPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!placingReplayStart) return;
    const bounds = chartContainerRef.current?.getBoundingClientRect();
    const chart = chartRef.current;
    if (!bounds || !chart) return;
    setReplayPlacementX(Math.max(0, Math.min(chart.timeScale().width(), event.clientX - bounds.left)));
  };

  const handleChartPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (!placingReplayStart) {
      if (activeTool === "cursor") {
        setSelectedDrawingId(null);
        setDrawingSettingsOpen(false);
      }
      return;
    }
    replayPlacementPointerRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  };

  const handleChartPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = replayPlacementPointerRef.current;
    replayPlacementPointerRef.current = null;
    if (!placingReplayStart || !start || start.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return;
    placeReplayStartAt(event.clientX);
  };

  const beginDrawing = (event: PointerEvent<SVGSVGElement>) => {
    if (placingReplayStart) return;

    if (activeTool === "cursor") {
      const target = event.target instanceof Element
        ? event.target.closest<SVGElement>("[data-drawing-id]")
        : null;
      const id = target?.getAttribute("data-drawing-id");
      const drawing = id ? drawings.find((item) => item.id === id) : null;
      if (!drawing) {
        setSelectedDrawingId(null);
        setDrawingSettingsOpen(false);
        return;
      }

      const point = readDrawingPoint(event);
      if (!point) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      setSelectedDrawingId(drawing.id);
      setDrawingSettingsOpen(false);
      const endpoint = target?.getAttribute("data-drawing-endpoint");
      drawingDragRef.current = {
        id: drawing.id,
        mode: endpoint === "target" || endpoint === "entry" || endpoint === "stop"
          ? endpoint
          : endpoint === "endpoint1"
          ? "endpoint1"
          : endpoint === "endpoint2"
            ? "endpoint2"
            : "move",
        start: point,
        original: drawing,
      };
      return;
    }

    const pendingDraft = drawingDraftRef.current;
    if (pendingDraft && pendingDraft.tool === activeTool && activeTool !== "brush") {
      const point = readDrawingPoint(event);
      if (!point) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      drawingPointerStartRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, mode: "finish" };
      setDrawingDraft((current) => {
        if (!current) return current;
        return { ...current, time2: point.time, price2: point.price };
      });
      return;
    }

    const point = readDrawingPoint(event);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();

    if (activeTool === "text") {
      const note = window.prompt("Text to place on the chart");
      if (note?.trim()) {
        const id = crypto.randomUUID();
        setDrawings((current) => [...current, {
          id,
          tool: "text",
          time1: point.time,
          time2: point.time,
          price1: point.price,
          price2: point.price,
          note: note.trim(),
          color: "#f4c95d",
        }]);
        setSelectedDrawingId(id);
        setDrawingSettingsOpen(false);
      }
      if (!keepDrawing) setActiveTool("cursor");
      return;
    }

    if (activeTool === "brush") {
      event.currentTarget.setPointerCapture(event.pointerId);
      drawingPointerStartRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, mode: "new" };
      setDrawingDraft({
        id: crypto.randomUUID(),
        tool: "brush",
        time1: point.time,
        time2: point.time,
        price1: point.price,
        price2: point.price,
        points: [point],
        color: "#b18cff",
      });
      return;
    }

    if (activeTool === "longPosition" || activeTool === "shortPosition") {
      event.preventDefault();
      event.stopPropagation();
      const id = crypto.randomUUID();
      const isLong = activeTool === "longPosition";
      const visibleRange = seriesRef.current?.priceScale().getVisibleRange() ?? null;
      const intervalSeconds = TIMEFRAMES.find((item) => item.label === timeframe)?.seconds ?? 60;
      const bounds = event.currentTarget.getBoundingClientRect();
      const logical = chartRef.current?.timeScale().coordinateToLogical(event.clientX - bounds.left);
      const time2 = logical === null || logical === undefined
        ? point.time + intervalSeconds * 8
        : candleTimeAtLogical(chartCandles, Number(logical) + 8, intervalSeconds) ?? point.time + intervalSeconds * 8;
      const pipSize = symbol.toUpperCase().includes("JPY") ? 0.01 : 0.0001;
      const visiblePriceSpan = visibleRange
        ? Math.abs(visibleRange.to - visibleRange.from)
        : 0;
      const minimumForexStop = assetClass === "forex" ? pipSize * 20 : 0;
      const risk = Math.max(
        minimumPositionRisk(point.price, visibleRange, pricePrecision),
        visiblePriceSpan * 0.1,
        minimumForexStop,
      );
      const reward = risk * 2;
      const positionDrawing: ChartDrawing = {
        id,
        tool: activeTool,
        time1: point.time,
        time2,
        price1: point.price,
        price2: point.price + (isLong ? -risk : risk),
        targetPrice: point.price + (isLong ? reward : -reward),
        sizeAmount: Number(quantity) > 0 ? Number(quantity) : sizeMode === "LOTS" && assetClass === "forex" ? 0.01 : 1,
        sizeMode,
        color: "#9de7ff",
        targetColor: "#39d98a",
        stopColor: "#ff5b76",
      };
      setDrawings((current) => [...current, positionDrawing]);
      setSelectedDrawingId(id);
      setDrawingSettingsOpen(false);
      if (!keepDrawing) setActiveTool("cursor");
      return;
    }

    if (activeTool === "level" || activeTool === "vertical" || activeTool === "horizontalRay" || activeTool === "crossline") {
      const id = crypto.randomUUID();
      setDrawings((current) => [
        ...current,
        {
          id,
          tool: activeTool,
          time1: point.time,
          time2: point.time,
          price1: point.price,
          price2: point.price,
          color: activeTool === "level" ? "#ffc66d" : activeTool === "vertical" ? "#7e9cff" : activeTool === "crossline" ? "#6fb4ff" : "#ff9f79",
        },
      ]);
      setSelectedDrawingId(id);
      setDrawingSettingsOpen(false);
      if (!keepDrawing) setActiveTool("cursor");
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    drawingPointerStartRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, mode: "new" };
    setDrawingDraft({
      id: crypto.randomUUID(),
      tool: activeTool,
      time1: point.time,
      time2: point.time,
      price1: point.price,
      price2: point.price,
        color: activeTool === "ray" ? "#48d9c4" : activeTool === "fibRetracement" || activeTool === "fibExtension" ? "#ffd166" : activeTool === "arrow" ? "#62d9c4" : activeTool === "rectangle" || activeTool === "ellipse" || activeTool === "triangle" ? "#b18cff" : activeTool === "priceRange" || activeTool === "dateRange" || activeTool === "datePriceRange" ? "#64b5ff" : "#53b7ff",
    });
  };

  const moveDrawing = (event: PointerEvent<SVGSVGElement>) => {
    const point = readDrawingPoint(event, Boolean(drawingDragRef.current || drawingDraftRef.current));
    if (!point) return;
    const draft = drawingDraftRef.current ?? drawingDraft;

    const drag = drawingDragRef.current;
    if (activeTool === "cursor" && drag) {
      event.preventDefault();
      event.stopPropagation();
      const deltaTime = point.time - drag.start.time;
      const deltaPrice = point.price - drag.start.price;
      setDrawings((current) => current.map((drawing) => {
        if (drawing.id !== drag.id) return drawing;
        if (isPositionDrawing(drawing)) {
          const minimumDistance = minimumPositionRisk(
            drawing.price1,
            seriesRef.current?.priceScale().getVisibleRange() ?? null,
            pricePrecision,
          );
          if (drag.mode === "target" || drag.mode === "stop" || drag.mode === "entry") {
            return {
              ...drawing,
              ...positionLevelPatch(drawing, drag.mode, point.price, minimumDistance),
            };
          }
          if (drag.mode === "endpoint1") return { ...drawing, time1: point.time };
          if (drag.mode === "endpoint2") return { ...drawing, time2: point.time };
          return {
            ...drawing,
            time1: drag.original.time1 + deltaTime,
            time2: drag.original.time2 + deltaTime,
            price1: drag.original.price1 + deltaPrice,
            price2: drag.original.price2 + deltaPrice,
            targetPrice: (drag.original.targetPrice ?? drawing.targetPrice) + deltaPrice,
          };
        }
        if (drawing.tool === "brush" && drawing.points && drag.mode === "move") {
          return {
            ...drawing,
            points: drawing.points.map((item) => ({ time: item.time + deltaTime, price: item.price + deltaPrice })),
          };
        }
        if (drag.mode === "endpoint1" && !["level", "vertical", "horizontalRay", "crossline"].includes(drawing.tool)) {
          return { ...drawing, time1: point.time, price1: point.price };
        }
        if (drag.mode === "endpoint2" && !["level", "vertical", "horizontalRay", "crossline"].includes(drawing.tool)) {
          return { ...drawing, time2: point.time, price2: point.price };
        }
        if (drawing.tool === "level") {
          const price = drag.original.price1 + deltaPrice;
          return { ...drawing, price1: price, price2: price };
        }
        if (drawing.tool === "vertical") {
          const time = drag.original.time1 + deltaTime;
          return { ...drawing, time1: time, time2: time };
        }
        return {
          ...drawing,
          time1: drag.original.time1 + deltaTime,
          time2: drag.original.time2 + deltaTime,
          price1: drag.original.price1 + deltaPrice,
          price2: drag.original.price2 + deltaPrice,
        };
      }));
      return;
    }

    if (activeTool === "brush" && draft?.tool === "brush") {
      event.preventDefault();
      event.stopPropagation();
      setDrawingDraft((current) => {
        if (!current || current.tool !== "brush") return current;
        const last = current.points?.[current.points.length - 1];
        if (last && Math.abs(last.time - point.time) < 1 && Math.abs(last.price - point.price) < 1e-12) return current;
        return { ...current, time2: point.time, price2: point.price, points: [...(current.points ?? []), point] };
      });
      return;
    }

    if (activeTool === "cursor" || !draft) return;
    event.preventDefault();
    event.stopPropagation();
    setDrawingDraft((current) =>
      current ? { ...current, time2: point.time, price2: point.price } : current,
    );
  };

  const finishDrawing = (event: PointerEvent<SVGSVGElement>) => {
    if (drawingDragRef.current) {
      drawingDragRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return;
    }

    const pointerStart = drawingPointerStartRef.current;
    drawingPointerStartRef.current = null;
    if (
      pointerStart?.pointerId === event.pointerId &&
      pointerStart.mode === "new" &&
      activeTool !== "brush" &&
      Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) < 5
    ) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }

    const draft = drawingDraftRef.current ?? drawingDraft;
    if (!draft) return;
    const point = readDrawingPoint(event, true);
    const lastPoint = point ?? {
      time: draft.time2,
      price: draft.price2,
    };
    const completedDrawing = draft.tool === "brush"
      ? {
          ...draft,
          time2: lastPoint.time,
          price2: lastPoint.price,
          points: (() => {
            const points = draft.points ?? [];
            const last = points[points.length - 1];
            return last && last.time === lastPoint.time && last.price === lastPoint.price
              ? points
              : [...points, lastPoint];
          })(),
        }
      : { ...draft, time2: lastPoint.time, price2: lastPoint.price };
    setDrawings((current) => [...current, completedDrawing]);
    setSelectedDrawingId(completedDrawing.id);
    setDrawingSettingsOpen(false);
    setDrawingDraft(null);
    if (!keepDrawing) setActiveTool("cursor");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const cancelDrawing = (event: PointerEvent<SVGSVGElement>) => {
    if (drawingDraftRef.current) {
      finishDrawing(event);
      return;
    }
    drawingPointerStartRef.current = null;
    drawingDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const updateSelectedDrawing = (patch: Partial<ChartDrawing>) => {
    if (!selectedDrawingId) return;
    setDrawings((current) => current.map((drawing) =>
      drawing.id === selectedDrawingId ? { ...drawing, ...patch } : drawing,
    ));
  };

  const changeSizeMode = (nextMode: SizeMode) => {
    if (nextMode === sizeMode) return;
    const currentSize = Number(quantity);
    if (Number.isFinite(currentSize) && currentSize > 0) {
      const normalizedUnits = replayUnitsFromSize(currentSize, sizeMode, assetClass);
      const nextSize = nextMode === "LOTS" && assetClass === "forex"
        ? normalizedUnits / 100_000
        : normalizedUnits;
      setQuantity(String(nextSize));
    }
    setSizeMode(nextMode);
  };

  const changeSelectedPositionSizeMode = (nextMode: SizeMode) => {
    if (!selectedDrawing || !isPositionDrawing(selectedDrawing)) return;
    const currentMode = selectedDrawing.sizeMode ?? sizeMode;
    if (nextMode === currentMode) return;
    const currentSize = selectedDrawing.sizeAmount ?? (Number(quantity) || 0);
    const normalizedUnits = replayUnitsFromSize(currentSize, currentMode, assetClass);
    const nextSize = nextMode === "LOTS" && assetClass === "forex"
      ? normalizedUnits / 100_000
      : normalizedUnits;
    updateSelectedDrawing({ sizeMode: nextMode, sizeAmount: nextSize });
  };

  const updateSelectedPositionLevel = (level: "entry" | "stop" | "target", price: number) => {
    if (!selectedDrawing || !isPositionDrawing(selectedDrawing) || !Number.isFinite(price)) return;
    const minimumDistance = minimumPositionRisk(
      selectedDrawing.price1,
      seriesRef.current?.priceScale().getVisibleRange() ?? null,
      pricePrecision,
    );
    updateSelectedDrawing(positionLevelPatch(selectedDrawing, level, price, minimumDistance));
  };

  const deleteSelectedDrawing = () => {
    if (!selectedDrawingId) return;
    setDrawings((current) => current.filter((drawing) => drawing.id !== selectedDrawingId));
    setSelectedDrawingId(null);
    setDrawingSettingsOpen(false);
  };

  useEffect(() => {
    if (!playing) return;

    const timer = window.setInterval(() => {
      setVisibleCount((count) => {
        if (count >= candlesLengthRef.current) {
          setPlaying(false);
          replayAtLatestRef.current = true;
          return count;
        }

        return count + 1;
      });
    }, Math.max(80, 700 / playbackSpeed));

    return () => window.clearInterval(timer);
  }, [playing, playbackSpeed]);

  const openOrderTicket = useCallback(
    (side: Trade["side"]) => {
      if (!currentCandle) {
        setTradeMessage("Load market candles before placing a paper trade.");
        return;
      }

      const positionTool = side === "BUY" ? "longPosition" : "shortPosition";
      const positionDrawing = drawingsLoadedFor === drawingStorageKey
        ? selectedDrawing && isPositionDrawing(selectedDrawing) && selectedDrawing.tool === positionTool
          ? selectedDrawing
          : [...drawings].reverse().find(
              (drawing) => isPositionDrawing(drawing) && drawing.tool === positionTool,
            ) ?? null
        : null;

      setPlaying(false);
      setOrderTicketSide(side);
      setOrderDrawingId(positionDrawing?.id ?? null);
      setOrderType("MARKET");
      setOrderPrice(String(positionDrawing?.price1 ?? currentCandle.close));
      setStopLossPrice(positionDrawing ? String(positionDrawing.price2) : "");
      setTakeProfitPrice(positionDrawing ? String(positionDrawing.targetPrice) : "");
      setOrderError("");
      setTradeMessage("");
    },
    [currentCandle, drawingStorageKey, drawings, drawingsLoadedFor, selectedDrawing],
  );

  const placeOrder = () => {
    if (!orderTicketSide || !currentCandle) return;

    const parsedSize = Number(quantity);
    if (!Number.isFinite(parsedSize) || parsedSize <= 0) {
      setOrderError(`Enter a ${sizeMode === "LOTS" ? "lot size" : "quantity"} greater than zero.`);
      return;
    }
    const parsedQuantity = replayUnitsFromSize(parsedSize, sizeMode, assetClass);

    const parsedPrice = orderType === "MARKET" ? undefined : Number(orderPrice);
    if (orderType !== "MARKET" && (!Number.isFinite(parsedPrice) || (parsedPrice ?? 0) <= 0)) {
      setOrderError("Enter a valid order price.");
      return;
    }

    const parsedStopLoss = Number(stopLossPrice);
    const parsedTakeProfit = Number(takeProfitPrice);
    if (
      !Number.isFinite(parsedStopLoss) || parsedStopLoss <= 0 ||
      !Number.isFinite(parsedTakeProfit) || parsedTakeProfit <= 0
    ) {
      setOrderError("Enter both a stop loss and a take profit price.");
      return;
    }

    if (orderType === "STOP" && parsedPrice !== undefined) {
      const isValidStop = orderTicketSide === "BUY"
        ? parsedPrice > currentCandle.close
        : parsedPrice < currentCandle.close;
      if (!isValidStop) {
        setOrderError(orderTicketSide === "BUY"
          ? "A buy stop must be above the current replay price."
          : "A sell stop must be below the current replay price.");
        return;
      }
    }

    const isMarketableLimit = orderType === "LIMIT" && parsedPrice !== undefined && (
      orderTicketSide === "BUY"
        ? parsedPrice >= currentCandle.close
        : parsedPrice <= currentCandle.close
    );
    const fillsImmediately = orderType === "MARKET" || isMarketableLimit;
    const expectedEntry = orderType === "MARKET"
      ? linkedPositionDrawing ? linkedPositionDrawing.price1 : currentCandle.close
      : fillsImmediately ? currentCandle.close : parsedPrice ?? currentCandle.close;
    const bracketsMatchSide = orderTicketSide === "BUY"
      ? parsedStopLoss < expectedEntry && parsedTakeProfit > expectedEntry
      : parsedTakeProfit < expectedEntry && parsedStopLoss > expectedEntry;
    if (!bracketsMatchSide) {
      setOrderError(orderTicketSide === "BUY"
        ? "For a buy, stop loss must be below entry and take profit above entry."
        : "For a sell, take profit must be below entry and stop loss above entry.");
      return;
    }

    const entry = expectedEntry;
    const trade: Trade = {
      id: Date.now() + Math.random(),
      side: orderTicketSide,
      orderType,
      orderPrice: parsedPrice,
      orderPlacedAt: currentCandle.time,
      stopLoss: parsedStopLoss,
      takeProfit: parsedTakeProfit,
      entry,
      exit: null,
      displaySize: parsedSize,
      sizeMode,
      quantity: parsedQuantity,
      openedAt: currentCandle.time,
      closedAt: null,
      pnl: null,
      status: fillsImmediately ? "OPEN" : "PENDING",
    };
    setTrades((current) => [trade, ...current]);

    const sideLabel = orderTicketSide === "BUY" ? "Buy" : "Sell";
    const priceLabel = formatPrice(entry, symbol, pricePrecision);
    if (orderType === "MARKET") {
      setTradeMessage(`${sideLabel} market order filled at ${priceLabel}.`);
    } else if (isMarketableLimit) {
      setTradeMessage(`${sideLabel} limit order was marketable and filled at ${priceLabel}.`);
    } else {
      const orderLabel = orderType === "LIMIT" ? "limit" : "stop";
      setTradeMessage(`${sideLabel} ${orderLabel} order placed at ${formatPrice(parsedPrice!, symbol, pricePrecision)}. It will fill only if a later replay candle reaches its price.`);
    }
    setOrderTicketSide(null);
    setOrderDrawingId(null);
    setOrderError("");
  };

  const cancelPendingOrder = (id: number) => {
    setTrades((current) => current.map((trade) =>
      trade.id === id && trade.status === "PENDING"
        ? { ...trade, status: "CANCELLED" }
        : trade,
    ));
  };

  const closeTrade = useCallback(
    (id: number) => {
      if (!currentCandle) return;
      const openPosition = trades.find((trade) => trade.id === id && trade.status === "OPEN");
      if (!openPosition) return;

      setTrades((current) =>
        current.map((trade) => {
          if (
            trade.id !== id ||
            (trade.status !== "OPEN" && trade.status !== "PENDING")
          ) return trade;

          const direction = trade.side === "BUY" ? 1 : -1;
          const pnl =
            (currentCandle.close - openPosition.entry) * direction * trade.quantity;

          return {
            ...trade,
            entry: openPosition.entry,
            openedAt: openPosition.openedAt,
            exit: currentCandle.close,
            closedAt: currentCandle.time,
            pnl,
            status: "CLOSED",
            exitReason: "MANUAL",
          };
        }),
      );
    },
    [currentCandle, trades],
  );

  async function saveTradeToJournal(trade: Trade) {
    if (trade.status !== "CLOSED" || trade.exit === null || journaledTradeIds.includes(trade.id)) return;
    setJournalSaveBusyId(trade.id);
    setJournalMessage("");
    try {
      const response = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol, direction: trade.side, status: "CLOSED", entryPrice: trade.entry, exitPrice: trade.exit,
          pnl: trade.pnl ?? 0, fees: 0, openedAt: new Date(trade.openedAt * 1000).toISOString(),
          strategy: `Mivo replay - ${symbol}`, notes: `Saved from a ${timeframe} historical replay session. Exit: ${trade.exitReason?.replace("_", " ").toLowerCase() ?? "closed manually"}.`, isPublic: false,
        }),
      });
      const result = await response.json();
      if (response.status === 401) { window.location.href = "/login"; return; }
      if (!response.ok) throw new Error(result.error || "Unable to add this replay trade to your journal.");
      setJournaledTradeIds((ids) => [...ids, trade.id]);
      setJournalMessage("Replay trade added to your journal.");
    } catch (error) {
      setJournalMessage(error instanceof Error ? error.message : "Unable to save this replay trade.");
    } finally {
      setJournalSaveBusyId(null);
    }
  }
  const resetSession = () => {
    setPlaying(false);
    setActiveTool("cursor");
    setDrawingDraft(null);
    setSelectedDrawingId(null);
    setDrawingSettingsOpen(false);
    setPlacingReplayStart(candles.length > 2);
    setReplayPlacementX(null);
    setVisibleCount(Math.max(2, candles.length));
    replayAtLatestRef.current = true;
    setReplayResetKey((key) => key + 1);
    setTrades([]);
    setInitialBalance(STARTING_BALANCE);
  };

  const stepForward = () => {
    setPlaying(false);
    setPlacingReplayStart(false);
    setReplayPlacementX(null);
    replayAtLatestRef.current = visibleCount + 1 >= candles.length;
    setVisibleCount((count) => Math.min(count + 1, candles.length));
  };

  const stepBack = () => {
    setPlaying(false);
    setPlacingReplayStart(false);
    setReplayPlacementX(null);
    replayAtLatestRef.current = false;
    setVisibleCount((count) => Math.max(count - 1, 2));
  };

  return (
    <main className="backtesting-page min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/95">
        <div className="mx-auto flex w-full max-w-none items-center justify-between gap-4 px-4 py-3 lg:px-5">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 font-black text-accent">M</div><div><p className="text-sm font-semibold tracking-wide">BACKTESTING LAB</p><p className="text-xs text-muted">Replay the market. Test your edge.</p></div></div>
          <span className={`hidden rounded-full border px-3 py-1 text-xs sm:inline-flex ${dataError ? "border-amber-300/30 bg-amber-300/10 text-amber-200" : "border-accent/20 bg-accent/10 text-accent"}`}>
            {dataProvider ? `REAL MARKET DATA | ${dataProvider}` : loading ? "LOADING MARKET DATA" : dataError ? "DATA UNAVAILABLE" : "MARKET DATA"}
          </span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-none space-y-4 px-3 py-5 sm:px-4 lg:px-5">
        <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
          <div>
            <label htmlFor="range-start" className="mb-1 block text-xs text-muted">Replay start (UTC)</label>
            <input
              id="range-start"
              type="date"
              value={startDate}
              max={endDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                setPlaying(false);
                setVisibleCount(2);
                setTrades([]);
                setCandles([]);
              }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="range-end" className="mb-1 block text-xs text-muted">Replay end (UTC)</label>
            <input
              id="range-end"
              type="date"
              value={endDate}
              min={startDate}
              onChange={(event) => {
                setFollowLatest(false);
                setEndDate(event.target.value);
                setPlaying(false);
                setVisibleCount(2);
                setTrades([]);
                setCandles([]);
              }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <label className="flex h-10 items-center gap-2 px-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={followLatest}
              onChange={(event) => {
                const enabled = event.target.checked;
                setFollowLatest(enabled);
                if (enabled) setEndDate(toDateInputValue(new Date()));
              }}
              className="accent-accent"
            />
            Keep end date current
          </label>
          <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-background/60 p-2">
            <label htmlFor="balance" className="text-xs text-muted">
              <span className="mb-1 block">Starting balance</span>
              <input
                id="balance"
                type="number"
                min="0"
                step="100"
                value={initialBalance}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isFinite(value) && value >= 0) setInitialBalance(value);
                }}
                className="w-32 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </label>
            <button
              type="button"
              onClick={resetSession}
              className="h-9 rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:border-accent hover:text-accent"
            >
              Reset session
            </button>
          </div>
          <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-3">
          <p role={dataError ? "alert" : undefined} className={`max-w-xl text-xs ${dataError ? "text-amber-200" : "text-muted"}`}>
            {dataError || (loading ? "Loading historical candles…" : `${candles.length.toLocaleString()} candles · refreshed every 5 minutes`)}
          </p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setMarketDataRefresh((version) => version + 1);
            }}
            disabled={loading}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold transition hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-50"
          >
            {loading ? "Loading…" : "Refresh candles"}
          </button>
          </div>
        </section>

        <section className="grid min-w-0 gap-4">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={assetClass}
                  onChange={(event) =>
                    handleAssetClassChange(event.target.value as AssetClass)
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                  aria-label="Asset class"
                >
                  {Object.entries(MARKETS).map(([key, market]) => (
                    <option key={key} value={key}>
                      {market.label}
                    </option>
                  ))}
                </select>

                <select
                  value={symbol}
                  onChange={(event) => handleSymbolChange(event.target.value)}
                  className="max-w-[190px] rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold outline-none focus:border-accent"
                  aria-label="Instrument"
                >
                  {MARKETS[assetClass].symbols.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <div className="chart-timeframe-list flex min-w-0 items-center gap-1 rounded-lg bg-background p-1">
                  {TIMEFRAMES.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        setTimeframe(item.label);
                        setPlacingReplayStart(false);
                        setReplayPlacementX(null);
                        setSelectedDrawingId(null);
                        setDrawingSettingsOpen(false);
                        setVisibleCount(2);
                        replayAtLatestRef.current = false;
                        setPlaying(false);
                        setTrades([]);
                        setCandles([]);
                      }}
                      className={`rounded-md px-2.5 py-1.5 text-xs ${
                        timeframe === item.label
                          ? "bg-accent text-accent-foreground"
                          : "text-muted hover:text-white"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

              </div>

              <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1 text-xs text-muted">
                <span>
                  O{" "}
                  <b className="text-foreground">
                    {displayCandle
                      ? formatPrice(displayCandle.open, symbol, pricePrecision)
                      : "—"}
                  </b>
                </span>
                <span>
                  H{" "}
                  <b className="text-green-300">
                    {displayCandle
                      ? formatPrice(displayCandle.high, symbol, pricePrecision)
                      : "—"}
                  </b>
                </span>
                <span>
                  L{" "}
                  <b className="text-red-300">
                    {displayCandle
                      ? formatPrice(displayCandle.low, symbol, pricePrecision)
                      : "—"}
                  </b>
                </span>
                <span>
                  C{" "}
                  <b className="text-foreground">
                    {displayCandle
                      ? formatPrice(displayCandle.close, symbol, pricePrecision)
                      : "—"}
                  </b>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border bg-background/50 px-3 py-2 sm:px-4">
              <div>
                <span className="font-semibold">{symbol}</span>
                <span className="ml-2 text-xs text-muted">
                  {MARKETS[assetClass].label} · {timeframe}
                </span>
                {displayPreviousCandle && displayCandle && (
                  <span
                    className={`ml-3 text-xs ${
                      displayCandle.close >= displayPreviousCandle.close
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {displayCandle.close >= displayPreviousCandle.close ? "▲" : "▼"}{" "}
                    {formatPrice(
                      Math.abs(displayCandle.close - displayPreviousCandle.close),
                      symbol,
                      pricePrecision,
                    )}
                  </span>
                )}
              </div>

              <span className="text-right text-[10px] text-muted sm:text-xs">
                {hoveredCandle ? "Cursor · " : "Last bar · "}{displayCandle ? formatDate(displayCandle.time) : "Loading…"} UTC
              </span>
            </div>

            <div className="chart-workspace">
              <aside className="chart-drawing-rail relative z-40" aria-label="Chart drawing tools">
                <button
                  type="button"
                  title="Select and move drawings"
                  aria-label="Select and move drawings"
                  aria-pressed={activeTool === "cursor"}
                  onClick={() => {
                    setDrawingDraft(null);
                    setOpenToolGroup(null);
                    setActiveTool("cursor");
                  }}
                  className={`chart-rail-button ${activeTool === "cursor" ? "is-active" : ""}`}
                >
                  <DrawingToolIcon tool="cursor" />
                </button>
                {DRAWING_TOOL_GROUPS.map((group) => (
                  <div
                    key={group.id}
                    className="relative"
                    onPointerEnter={() => setOpenToolGroup(group.id)}
                    onPointerLeave={() => {
                      setOpenToolGroup((open) => open === group.id ? null : open);
                    }}
                  >
                    <button
                      type="button"
                      title={group.label}
                      aria-label={group.label}
                      aria-expanded={openToolGroup === group.id}
                      aria-haspopup="true"
                      onClick={() => setOpenToolGroup(group.id)}
                      className={`chart-rail-button ${group.tools.some(([tool]) => tool === activeTool) ? "is-active" : ""}`}
                    >
                      <span aria-hidden="true" className="text-base font-bold">{group.icon}</span>
                    </button>
                    {openToolGroup === group.id && (
                      <>
                        <div className="absolute left-full top-0 z-[59] hidden h-[min(70vh,28rem)] w-2 sm:block" aria-hidden="true" />
                        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-[60] max-h-[min(70vh,28rem)] w-60 max-w-[calc(100vw-4rem)] overflow-y-auto rounded-xl border border-border bg-surface p-2 text-foreground shadow-2xl sm:left-[calc(100%+0.5rem)] sm:top-0 sm:max-w-none">
                          <p className="px-2 pb-1.5 pt-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">{group.label}</p>
                          {group.tools.map(([tool, label]) => (
                            <button
                              key={tool}
                              type="button"
                              onClick={() => {
                                setDrawingDraft(null);
                                setSelectedDrawingId(null);
                                setDrawingSettingsOpen(false);
                                setPlacingReplayStart(false);
                                setReplayPlacementX(null);
                                setActiveTool(tool);
                                setOpenToolGroup(null);
                              }}
                              aria-pressed={activeTool === tool}
                              className={`flex min-h-8 w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs ${activeTool === tool ? "bg-accent/15 text-accent" : "text-foreground hover:bg-surface-raised"}`}
                            >
                              <span className="flex items-center gap-2"><DrawingToolIcon tool={tool} /><span>{label}</span></span>
                              {activeTool === tool && <span aria-hidden="true">✓</span>}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                <span className="chart-rail-divider" />
                <button
                  type="button"
                  title={snapToCandle ? "Disable candle snapping" : "Snap drawings to candle prices"}
                  aria-label={snapToCandle ? "Disable candle snapping" : "Snap drawings to candle prices"}
                  aria-pressed={snapToCandle}
                  onClick={() => setSnapToCandle((value) => !value)}
                  className={`chart-rail-button ${snapToCandle ? "is-active" : ""}`}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M8 3v6m8-6v6M6 9h12v3a6 6 0 0 1-12 0V9Zm6 9v3" /></svg>
                </button>
                <button
                  type="button"
                  title={keepDrawing ? "Disable keep drawing" : "Keep the current drawing tool active"}
                  aria-label={keepDrawing ? "Disable keep drawing" : "Keep the current drawing tool active"}
                  aria-pressed={keepDrawing}
                  onClick={() => setKeepDrawing((value) => !value)}
                  className={`chart-rail-button ${keepDrawing ? "is-active" : ""}`}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11a8 8 0 0 0-14-5L4 8m0-4v4h4M4 13a8 8 0 0 0 14 5l2-2m0 4v-4h-4" /></svg>
                </button>
                <button
                  type="button"
                  title="Delete selected drawing"
                  aria-label="Delete selected drawing"
                  disabled={!selectedDrawingId}
                  onClick={() => {
                    if (!selectedDrawingId) return;
                    setDrawings((current) => current.filter((drawing) => drawing.id !== selectedDrawingId));
                    setSelectedDrawingId(null);
                    setDrawingSettingsOpen(false);
                  }}
                  className="chart-rail-button chart-rail-danger"
                ><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m3 4v5m6-5v5" /></svg></button>
                <button
                  type="button"
                  title="Clear all drawings"
                  aria-label="Clear all drawings"
                  disabled={!drawings.length}
                  onClick={() => {
                    setDrawings([]);
                    setSelectedDrawingId(null);
                    setDrawingSettingsOpen(false);
                  }}
                  className="chart-rail-button chart-rail-danger"
                ><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
              </aside>
              <div className="min-w-0 flex-1">
            <div
              className={`relative min-w-0 ${placingReplayStart ? "is-placing-replay-start" : ""}`}
              onPointerMove={handleChartPointerMove}
              onPointerDown={handleChartPointerDown}
              onPointerUp={handleChartPointerUp}
              onPointerCancel={() => { replayPlacementPointerRef.current = null; }}
              onContextMenu={(event) => {
                if (!placingReplayStart) return;
                event.preventDefault();
                event.stopPropagation();
                replayPlacementPointerRef.current = null;
                setPlaying(false);
                setPlacingReplayStart(false);
                setReplayPlacementX(null);
              }}
            >
              <div
                ref={chartContainerRef}
                className="chart-container h-[440px] w-full sm:h-[560px] xl:h-[calc(100vh-390px)] xl:min-h-[520px]"
              />
              <div className="pointer-events-none absolute inset-0 z-10">
                {!candles.length && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/75 px-6 text-center text-sm text-foreground">
                    {loading ? "Loading historical market data…" : dataError || "No candles available for this selection."}
                  </div>
                )}
                {placingReplayStart && replayPlacementX !== null && (
                  <div
                    className="replay-placement-guide"
                    style={{ left: replayPlacementX }}
                    aria-hidden="true"
                  >
                    <span>REPLAY START</span>
                  </div>
                )}
                {placingReplayStart && (
                  <div className="absolute bottom-3 left-3 rounded-lg border border-accent/40 bg-background/90 px-3 py-2 text-xs font-semibold text-foreground shadow-lg">
                    Click a candle to set the replay start. Right-click or press Esc to cancel.
                  </div>
                )}
                {(activeTool === "longPosition" || activeTool === "shortPosition") && (
                  <div role="status" className="absolute bottom-3 left-3 max-w-[min(26rem,calc(100%-1.5rem))] rounded-lg border border-accent/40 bg-background/90 px-3 py-2 text-xs font-semibold text-foreground shadow-lg">
                    {activeTool === "longPosition" ? "Long" : "Short"}: click once to place the complete position. Forex defaults to a 20-pip stop and 40-pip target; drag levels or use Edit to adjust.
                  </div>
                )}
                {activeTool !== "cursor" && activeTool !== "longPosition" && activeTool !== "shortPosition" && activeTool !== "text" && (
                  <div role="status" className="absolute bottom-3 left-3 max-w-[min(26rem,calc(100%-1.5rem))] rounded-lg border border-border bg-background/90 px-3 py-2 text-xs font-semibold text-foreground shadow-lg">
                    {activeTool === "brush"
                      ? "Drag to draw freehand."
                      : drawingDraft
                        ? "Move the cursor to the end point, then click to finish."
                        : "Drag to draw, or click once for the start and again for the end."}
                  </div>
                )}
              </div>
              <svg
                ref={drawingOverlayRef}
                className="chart-drawing-overlay"
                tabIndex={placingReplayStart ? 0 : -1}
                aria-label="Chart drawings"
                style={{
                  // Keep the SVG out of the way in cursor mode so Lightweight
                  // Charts can receive drag gestures and pan the plot. Drawing
                  // hit targets explicitly opt back into pointer events.
                  pointerEvents: activeTool === "cursor" && !placingReplayStart ? "none" : "auto",
                  cursor: placingReplayStart || activeTool !== "cursor" ? "crosshair" : "default",
                  touchAction: "none",
                }}
                onPointerDown={beginDrawing}
                onPointerMove={moveDrawing}
                onPointerUp={finishDrawing}
                onPointerCancel={cancelDrawing}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setPlacingReplayStart(false);
                    setReplayPlacementX(null);
                    drawingPointerStartRef.current = null;
                    setDrawingDraft(null);
                    setActiveTool("cursor");
                  }
                  if ((event.key === "Delete" || event.key === "Backspace") && selectedDrawingId) {
                    setDrawings((current) => current.filter((drawing) => drawing.id !== selectedDrawingId));
                    setSelectedDrawingId(null);
                      setDrawingSettingsOpen(false);
                  }
                }}
              />
              {selectedDrawing && (
                <div
                  className={`pointer-events-auto absolute bottom-3 right-3 z-[35] flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface/95 px-2 py-1.5 text-foreground shadow-2xl backdrop-blur ${drawingSettingsOpen ? "max-h-[min(45vh,22rem)] max-w-[min(22rem,calc(100%-1rem))] overflow-y-auto" : ""}`}
                  aria-label="Selected drawing options"
                  onPointerDown={(event) => event.stopPropagation()}
                  onPointerMove={(event) => event.stopPropagation()}
                  onPointerUp={(event) => event.stopPropagation()}
                >
                  <span className="mr-1 flex items-center gap-1.5 text-[11px] font-semibold">
                    <DrawingToolIcon tool={selectedDrawing.tool} />
                    {drawingToolName(selectedDrawing.tool)}
                  </span>
                  <button
                    type="button"
                    title={drawingSettingsOpen ? "Hide drawing settings" : "Edit drawing settings"}
                    aria-label={drawingSettingsOpen ? "Hide drawing settings" : "Edit drawing settings"}
                    aria-expanded={drawingSettingsOpen}
                    onClick={() => setDrawingSettingsOpen((open) => !open)}
                    className={`flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] font-semibold ${drawingSettingsOpen ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent"}`}
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m4 20 4.5-1 10.7-10.7a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z" /><path d="m14.8 6.7 3 3" /></svg>
                    Edit
                  </button>
                  {drawingSettingsOpen && (
                    <div className={isPositionDrawing(selectedDrawing)
                      ? "grid w-full grid-cols-2 gap-x-2 gap-y-1 rounded-md border border-border/70 bg-background/40 p-1.5"
                      : "flex w-full flex-wrap items-center gap-2"}>
                  <label className={isPositionDrawing(selectedDrawing) ? "hidden" : "flex items-center gap-1 text-[10px] text-muted"} title="Drawing color">
                    Color
                    <input
                      type="color"
                      value={selectedDrawing.color}
                      onChange={(event) => updateSelectedDrawing({ color: event.target.value })}
                      className="h-6 w-8 cursor-pointer rounded border border-border bg-background p-0.5"
                      aria-label="Drawing color"
                    />
                  </label>
                  <label className={isPositionDrawing(selectedDrawing) ? "hidden" : "flex items-center gap-1 text-[10px] text-muted"} title="Line thickness">
                    Width
                    <input
                      type="range"
                      min="1"
                      max="8"
                      step="0.5"
                      value={selectedDrawing.lineWidth ?? 2}
                      onChange={(event) => updateSelectedDrawing({ lineWidth: Number(event.target.value) })}
                      className="w-16 accent-accent"
                      aria-label="Drawing line width"
                    />
                  </label>
                  {["rectangle", "ellipse", "circle", "triangle", "priceRange", "dateRange", "datePriceRange", "longPosition", "shortPosition"].includes(selectedDrawing.tool) && !isPositionDrawing(selectedDrawing) && (
                    <label className="flex items-center gap-1 text-[10px] text-muted" title="Fill opacity">
                      Fill
                      <input
                        type="range"
                        min="0"
                        max="0.65"
                        step="0.01"
                        value={selectedDrawing.fillOpacity ?? 0.08}
                        onChange={(event) => updateSelectedDrawing({ fillOpacity: Number(event.target.value) })}
                        className="w-14 accent-accent"
                        aria-label="Drawing fill opacity"
                      />
                    </label>
                  )}
                  {selectedDrawing.tool === "text" && (
                    <>
                      <label className="flex items-center gap-1 text-[10px] text-muted" title="Text size">
                        Size
                        <input
                          type="range"
                          min="10"
                          max="32"
                          step="1"
                          value={selectedDrawing.fontSize ?? 13}
                          onChange={(event) => updateSelectedDrawing({ fontSize: Number(event.target.value) })}
                          className="w-14 accent-accent"
                          aria-label="Text size"
                        />
                      </label>
                      <button
                        type="button"
                        className="rounded-md border border-border px-2 py-1 text-[10px] hover:border-accent"
                        onClick={() => {
                          const note = window.prompt("Edit chart note", selectedDrawing.note ?? "");
                          if (note !== null) updateSelectedDrawing({ note: note.trim() });
                        }}
                      >Edit text</button>
                    </>
                  )}
                  {isPositionDrawing(selectedDrawing) && (
                    <>
                      <label className="flex min-w-0 items-center justify-between gap-1 text-[9px] text-muted" title="Entry price">
                        Entry
                        <input
                          type="number"
                          step="any"
                          value={selectedDrawing.price1}
                          onChange={(event) => updateSelectedPositionLevel("entry", Number(event.target.value))}
                          className="h-6 w-20 rounded-md border border-border bg-background px-1.5 text-[10px] text-foreground"
                          aria-label="Position entry price"
                        />
                      </label>
                      <label className="flex min-w-0 items-center justify-between gap-1 text-[9px] text-muted" title="Stop-loss price">
                        Stop
                        <input
                          type="number"
                          step="any"
                          value={selectedDrawing.price2}
                          onChange={(event) => updateSelectedDrawing({ price2: Number(event.target.value) })}
                          onBlur={(event) => updateSelectedPositionLevel("stop", Number(event.target.value))}
                          className="h-6 w-20 rounded-md border border-border bg-background px-1.5 text-[10px] text-foreground"
                          aria-label="Position stop-loss price"
                        />
                      </label>
                      <label className="flex min-w-0 items-center justify-between gap-1 text-[9px] text-muted" title="Take-profit price">
                        Target
                        <input
                          type="number"
                          step="any"
                          value={selectedDrawing.targetPrice}
                          onChange={(event) => updateSelectedDrawing({ targetPrice: Number(event.target.value) })}
                          onBlur={(event) => updateSelectedPositionLevel("target", Number(event.target.value))}
                          className="h-6 w-20 rounded-md border border-border bg-background px-1.5 text-[10px] text-foreground"
                          aria-label="Position take-profit price"
                        />
                      </label>
                      <label className="flex min-w-0 items-center justify-between gap-1 text-[9px] text-muted" title="Position size units">
                        Size unit
                        <select
                          value={selectedDrawing.sizeMode ?? sizeMode}
                          onChange={(event) => changeSelectedPositionSizeMode(event.target.value as SizeMode)}
                          className="h-6 w-20 rounded-md border border-border bg-background px-1.5 text-[10px] text-foreground"
                          aria-label="Position size unit"
                        >
                          <option value="LOTS">Lot size</option>
                          <option value="QUANTITY">Quantity</option>
                        </select>
                      </label>
                      <label className="flex min-w-0 items-center justify-between gap-1 text-[9px] text-muted" title="Position size">
                        Size
                        <input
                          type="number"
                          min="0.000001"
                          step="any"
                          value={selectedDrawing.sizeAmount ?? (Number(quantity) || 0)}
                          onChange={(event) => updateSelectedDrawing({ sizeAmount: Number(event.target.value) })}
                          className="h-6 w-20 rounded-md border border-border bg-background px-1.5 text-[10px] text-foreground"
                          aria-label="Position size"
                        />
                      </label>
                      <label className="flex min-w-0 items-center justify-between gap-1 text-[9px] text-muted" title="Entry line color">
                        Entry color
                        <input
                          type="color"
                          value={selectedDrawing.color}
                          onChange={(event) => updateSelectedDrawing({ color: event.target.value })}
                          className="h-5 w-7 cursor-pointer rounded border border-border bg-background p-0.5"
                          aria-label="Position entry color"
                        />
                      </label>
                      <label className="flex min-w-0 items-center justify-between gap-1 text-[9px] text-muted" title="Profit target color">
                        Target color
                        <input
                          type="color"
                          value={selectedDrawing.targetColor ?? "#39d98a"}
                          onChange={(event) => updateSelectedDrawing({ targetColor: event.target.value })}
                          className="h-5 w-7 cursor-pointer rounded border border-border bg-background p-0.5"
                          aria-label="Position target color"
                        />
                      </label>
                      <label className="flex min-w-0 items-center justify-between gap-1 text-[9px] text-muted" title="Stop-loss color">
                        Stop color
                        <input
                          type="color"
                          value={selectedDrawing.stopColor ?? "#ff5b76"}
                          onChange={(event) => updateSelectedDrawing({ stopColor: event.target.value })}
                          className="h-5 w-7 cursor-pointer rounded border border-border bg-background p-0.5"
                          aria-label="Position stop color"
                        />
                      </label>
                      <label className="col-span-2 flex items-center justify-between gap-2 text-[9px] text-muted" title="Position zone opacity">
                        Fill opacity
                        <input
                          type="range"
                          min="0"
                          max="0.65"
                          step="0.01"
                          value={selectedDrawing.fillOpacity ?? 0.16}
                          onChange={(event) => updateSelectedDrawing({ fillOpacity: Number(event.target.value) })}
                          className="w-32 accent-accent"
                          aria-label="Position fill opacity"
                        />
                      </label>
                    </>
                  )}
                  {(selectedDrawing.tool === "fibRetracement" || selectedDrawing.tool === "fibExtension") && (
                    <label className="flex items-center gap-1 text-[10px] text-muted">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedDrawing.showPrices)}
                        onChange={(event) => updateSelectedDrawing({ showPrices: event.target.checked })}
                        className="accent-accent"
                      />
                      Show Fibonacci prices
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={deleteSelectedDrawing}
                    className={isPositionDrawing(selectedDrawing)
                      ? "col-span-2 justify-self-end rounded-md border border-red-400/40 px-2 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-400/10"
                      : "rounded-md border border-red-400/40 px-2 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-400/10"}
                  >Delete drawing</button>
                    </div>
                  )}
                </div>
              )}
              <div className="pointer-events-none absolute left-2 right-2 top-2 z-[30] flex flex-col items-start gap-2 lg:right-14 lg:flex-row lg:items-start lg:justify-between">
                <div
                  className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-lg border border-border/80 bg-surface/90 p-1 shadow-lg backdrop-blur"
                  onPointerDown={(event) => event.stopPropagation()}
                  onPointerMove={(event) => event.stopPropagation()}
                  onPointerUp={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={resetSession}
                    className="control-button chart-overlay-control"
                    title="Reset session and choose replay start"
                    aria-label="Reset session and choose replay start"
                  >
                    ↺
                  </button>
                  <button
                    type="button"
                    onClick={stepBack}
                    className="control-button chart-overlay-control"
                    title="Previous candle"
                    aria-label="Previous candle"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (playing) {
                        setPlaying(false);
                      } else if (placingReplayStart) {
                        setPlacingReplayStart(false);
                        setReplayPlacementX(null);
                      } else if (visibleCount >= candles.length) {
                        setActiveTool("cursor");
                        setDrawingDraft(null);
                        setPlacingReplayStart(true);
                        setReplayPlacementX(null);
                        setPlaying(false);
                      } else {
                        setPlaying(true);
                      }
                    }}
                    disabled={candles.length < 2}
                    className="flex h-7 min-w-16 items-center justify-center gap-1 rounded-md bg-accent px-2 text-[11px] font-bold text-accent-foreground hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={playing ? "Pause replay" : placingReplayStart ? "Cancel replay start selection" : "Play replay"}
                  >
                    {playing ? "Ⅱ Pause" : placingReplayStart ? "Cancel" : "▶ Play"}
                  </button>
                  <button
                    type="button"
                    onClick={stepForward}
                    className="control-button chart-overlay-control"
                    title="Next candle"
                    aria-label="Next candle"
                  >
                    ▶|
                  </button>
                  <select
                    value={playbackSpeed}
                    onChange={(event) => setPlaybackSpeed(Number(event.target.value))}
                    className="h-7 rounded-md border border-border bg-background px-1.5 text-[10px]"
                    aria-label="Playback speed"
                  >
                    {[0.5, 1, 2, 4, 8].map((speed) => (
                      <option key={speed} value={speed}>{speed}×</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setPlaying(false);
                      setSelectedDrawingId(null);
                      setDrawingSettingsOpen(false);
                      setActiveTool("cursor");
                      setDrawingDraft(null);
                      setReplayPlacementX(null);
                      setPlacingReplayStart((placing) => !placing);
                    }}
                    disabled={candles.length < 2}
                    aria-pressed={placingReplayStart}
                    className={`h-7 rounded-md border px-2 text-[10px] font-semibold ${placingReplayStart ? "border-accent bg-accent/15 text-accent" : "border-border bg-background text-foreground hover:border-accent"} disabled:cursor-not-allowed disabled:opacity-50`}
                    title="Choose the candle where replay should begin"
                  >
                    ◷ Start
                  </button>
                  <div className="relative" onPointerLeave={() => setIndicatorMenuOpen(false)}>
                    <button
                      type="button"
                      onClick={() => setIndicatorMenuOpen((open) => !open)}
                      aria-expanded={indicatorMenuOpen}
                      aria-haspopup="true"
                      className="h-7 rounded-md border border-border bg-background px-2 text-[10px] font-semibold text-foreground hover:border-accent"
                    >
                      Indicators{Object.values(indicators).filter(Boolean).length ? ` · ${Object.values(indicators).filter(Boolean).length}` : ""}
                    </button>
                    {indicatorMenuOpen && (
                      <div className="indicator-menu absolute left-0 top-full z-[70] mt-1 w-64 rounded-lg border border-border bg-surface p-2 shadow-2xl">
                        <p className="px-2 pb-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-muted">Moving averages</p>
                        {([
                          ["sma20", "Simple Moving Average", "SMA 20"],
                          ["ema50", "Exponential Moving Average", "EMA 50"],
                          ["bollinger20", "Bollinger Bands", "20 · 2"],
                        ] as const).map(([indicator, name, settings]) => (
                          <label key={indicator} className="indicator-option min-h-7 py-1 text-[11px]">
                            <input
                              type="checkbox"
                              checked={indicators[indicator]}
                              onChange={() => setIndicators((current) => ({ ...current, [indicator]: !current[indicator] }))}
                            />
                            <span>{name}</span><small>{settings}</small>
                          </label>
                        ))}
                        <p className="mt-2 border-t border-border px-2 pb-1 pt-2 text-[9px] font-extrabold uppercase tracking-[0.14em] text-muted">Oscillators</p>
                        <label className="indicator-option min-h-7 py-1 text-[11px]">
                          <input
                            type="checkbox"
                            checked={indicators.rsi14}
                            onChange={() => setIndicators((current) => ({ ...current, rsi14: !current.rsi14 }))}
                          />
                          <span>Relative Strength Index</span><small>RSI 14</small>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className="pointer-events-auto w-full rounded-lg border border-border/80 bg-surface/90 p-1.5 shadow-lg backdrop-blur lg:w-auto"
                  onPointerDown={(event) => event.stopPropagation()}
                  onPointerMove={(event) => event.stopPropagation()}
                  onPointerUp={(event) => event.stopPropagation()}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <label className="flex items-center gap-1 text-[9px] font-semibold text-muted">
                      <span>Size</span>
                      <select
                        value={sizeMode}
                        onChange={(event) => changeSizeMode(event.target.value as SizeMode)}
                        title="Forex lots use 100,000 base units per lot. Use quantity for shares and contracts."
                        className="h-7 rounded-md border border-border bg-background px-1.5 text-[10px] text-foreground"
                        aria-label="Trade size unit"
                      >
                        <option value="LOTS">Lot size</option>
                        <option value="QUANTITY">Quantity</option>
                      </select>
                    </label>
                    <label htmlFor="chart-size" className="flex items-center gap-1 text-[9px] font-semibold text-muted">
                      <span>{sizeMode === "LOTS" ? "Lots" : "Units"}</span>
                      <input
                        id="chart-size"
                        type="number"
                        min="0.000001"
                        step="any"
                        value={quantity}
                        onChange={(event) => setQuantity(event.target.value)}
                        className="h-7 w-16 rounded-md border border-border bg-background px-1.5 text-[10px] text-foreground outline-none focus:border-accent"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => openOrderTicket("BUY")}
                      disabled={!currentCandle || !(Number(quantity) > 0)}
                      title="Buy / Long"
                      className="h-7 rounded-md bg-green-500/15 px-2.5 text-[10px] font-bold text-green-300 hover:bg-green-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Buy
                    </button>
                    <button
                      type="button"
                      onClick={() => openOrderTicket("SELL")}
                      disabled={!currentCandle || !(Number(quantity) > 0)}
                      title="Sell / Short"
                      className="h-7 rounded-md bg-red-500/15 px-2.5 text-[10px] font-bold text-red-300 hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Sell
                    </button>
                  </div>
                  {tradeMessage && (
                    <p className="mt-1 max-w-64 truncate text-[9px] text-muted" role="status" aria-live="polite">
                      {tradeMessage}
                    </p>
                  )}
                </div>
              </div>
              {orderTicketSide && currentCandle && (
                <div
                  className="absolute inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
                  onPointerDown={(event) => event.stopPropagation()}
                  onPointerMove={(event) => event.stopPropagation()}
                  onPointerUp={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    if (event.target === event.currentTarget) setOrderTicketSide(null);
                  }}
                >
                  <section
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="order-ticket-title"
                    className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-5 text-foreground shadow-2xl"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">Paper replay order</p>
                        <h2 id="order-ticket-title" className="mt-1 text-lg font-bold">
                          {orderTicketSide === "BUY" ? "Buy / Long" : "Sell / Short"} · {symbol}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOrderTicketSide(null)}
                        aria-label="Close order ticket"
                        className="rounded-lg border border-border px-2 py-1 text-muted hover:border-accent hover:text-foreground"
                      >×</button>
                    </div>

                    <div className="mt-5 grid gap-4">
                      <label className="grid gap-1.5 text-xs font-medium text-muted">
                        Order type
                        <select
                          value={orderType}
                          onChange={(event) => {
                            const nextType = event.target.value as OrderType;
                            setOrderType(nextType);
                            setOrderError("");
                            setOrderPrice(
                              nextType === "MARKET"
                                ? String(linkedPositionDrawing?.price1 ?? currentCandle.close)
                                : linkedPositionDrawing ? String(linkedPositionDrawing.price1) : "",
                            );
                          }}
                          className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                        >
                          <option value="MARKET">Market entry</option>
                          <option value="LIMIT">{orderTicketSide === "BUY" ? "Buy limit" : "Sell limit"}</option>
                          <option value="STOP">{orderTicketSide === "BUY" ? "Buy stop" : "Sell stop"}</option>
                        </select>
                      </label>

                      {orderType === "MARKET" && (
                        <label className="grid gap-1.5 text-xs font-medium text-muted">
                          {linkedPositionDrawing ? "Market entry · drawing entry" : "Market execution price"}
                          <input
                            type="number"
                            value={linkedPositionDrawing ? linkedPositionDrawing.price1 : currentCandle.close}
                            readOnly
                            aria-label="Market entry price"
                            className="h-10 rounded-lg border border-border bg-background/70 px-3 text-sm text-foreground outline-none"
                          />
                        </label>
                      )}

                      <label className="grid gap-1.5 text-xs font-medium text-muted">
                        {sizeMode === "LOTS" ? "Lot size" : "Quantity"}
                        <input
                          type="number"
                          min="0.000001"
                          step="any"
                          value={quantity}
                          onChange={(event) => setQuantity(event.target.value)}
                          className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                        />
                      </label>

                      {orderType !== "MARKET" && (
                        <label className="grid gap-1.5 text-xs font-medium text-muted">
                          {orderType === "LIMIT" ? "Limit price" : "Stop price"}
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={orderPrice}
                            onChange={(event) => {
                              setOrderPrice(event.target.value);
                              setOrderError("");
                            }}
                            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                          />
                        </label>
                      )}

                      {linkedPositionDrawing && (
                        <p className="-mt-2 text-[11px] text-accent">
                          Entry, stop loss, and take profit are prefilled from the {orderTicketSide === "BUY" ? "long" : "short"} position drawing.
                        </p>
                      )}

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="grid gap-1.5 text-xs font-medium text-muted">
                          Stop loss price · required
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={stopLossPrice}
                            onChange={(event) => {
                              setStopLossPrice(event.target.value);
                              setOrderError("");
                            }}
                            aria-label="Stop loss price"
                            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-red-400"
                          />
                        </label>
                        <label className="grid gap-1.5 text-xs font-medium text-muted">
                          Take profit price · required
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={takeProfitPrice}
                            onChange={(event) => {
                              setTakeProfitPrice(event.target.value);
                              setOrderError("");
                            }}
                            aria-label="Take profit price"
                            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-green-400"
                          />
                        </label>
                      </div>

                      <div className="rounded-lg border border-border bg-background/70 px-3 py-2 text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted">Current replay price</span>
                          <strong>{formatPrice(currentCandle.close, symbol, pricePrecision)}</strong>
                        </div>
                        {orderType === "LIMIT" && Number(orderPrice) > 0 && (
                          <p className="mt-2 text-muted">
                            {(orderTicketSide === "BUY" && Number(orderPrice) >= currentCandle.close) ||
                            (orderTicketSide === "SELL" && Number(orderPrice) <= currentCandle.close)
                              ? "This limit is marketable and will fill immediately at the current replay price."
                              : "This limit stays pending until a later replay candle reaches the price or a better price."}
                          </p>
                        )}
                        {orderType === "STOP" && (
                          <p className="mt-2 text-muted">
                            The stop stays pending until a later replay candle reaches its trigger. A gap through the stop fills at the candle open.
                          </p>
                        )}
                        {orderType === "MARKET" && (
                          <p className="mt-2 text-muted">This market order fills at the current replay candle close after you confirm.</p>
                        )}
                        <p className="mt-2 text-muted">The stop loss and take profit are attached to the order. The first level reached after entry closes the full position. If one candle crosses both, the replay assumes the stop loss came first.</p>
                      </div>

                      {orderError && <p role="alert" className="text-xs font-medium text-red-400">{orderError}</p>}
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setOrderTicketSide(null)}
                          className="h-10 rounded-lg border border-border px-4 text-sm font-semibold hover:border-accent"
                        >Cancel</button>
                        <button
                          type="button"
                          onClick={placeOrder}
                          className={`h-10 rounded-lg px-4 text-sm font-bold text-white ${orderTicketSide === "BUY" ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"}`}
                        >
                          Place {orderTicketSide === "BUY" ? "buy" : "sell"} {orderType === "MARKET" ? "market" : orderType.toLowerCase()} order
                        </button>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>
              </div>
            </div>

            <div className="border-t border-border bg-background/60 px-4 py-3">
              <div className="mb-3 flex items-center justify-between text-xs text-muted">
                <span>Replay progress</span>
                <span>
                  {Math.min(visibleCount, candles.length)} / {candles.length} candles
                </span>
              </div>

              <input
                type="range"
                min={2}
                max={Math.max(2, candles.length)}
                value={Math.min(Math.max(2, visibleCount), Math.max(2, candles.length))}
                onChange={(event) => {
                  setPlaying(false);
                  setPlacingReplayStart(false);
                  setReplayPlacementX(null);
                  const nextCount = Number(event.target.value);
                  replayAtLatestRef.current = nextCount >= candles.length;
                  setVisibleCount(nextCount);
                }}
                className="h-1.5 w-full cursor-pointer accent-accent"
                aria-label="Replay progress"
                disabled={candles.length < 2}
              />

              <p className="mt-3 text-right text-xs text-muted">
                Drag the chart to pan · drag the price scale to zoom
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <StatCard label="Net P&L" value={formatMoney(realizedPnl + unrealizedPnl)} hint={`${formatMoney(realizedPnl)} realized`} positive={realizedPnl + unrealizedPnl >= 0} />
          <StatCard label="Win rate" value={`${winRate.toFixed(1)}%`} hint={`${wins} winning trades`} />
          <StatCard label="Trades" value={`${closedTrades.length} closed`} hint={`${openTrades.length} open position${openTrades.length === 1 ? "" : "s"}`} />
          <StatCard label="Profit factor" value={profitFactor} hint="Gross profit / gross loss" />
          <StatCard label="Expectancy" value={formatMoney(expectancy)} hint="Average realized P&L per trade" positive={expectancy >= 0} />
          <StatCard label="Max drawdown" value={`${maxDrawdownPercent.toFixed(1)}%`} hint="Peak-to-trough on closed trades" />
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="font-semibold">Trade history</h2>
              <p className="mt-0.5 text-xs text-muted">
                Bracket exits close trades automatically when replay candles hit a stop or target.
              </p>
            </div>
            <span className="rounded-full bg-surface-raised px-2.5 py-1 text-xs text-muted">
              {trades.length} total
            </span>
          </div>

          <p role="status" className="px-4 pt-3 text-xs text-accent">{journalMessage}</p><div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="bg-background/60 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Side</th>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Stop / TP</th>
                  <th className="px-4 py-3 font-medium">Order / entry time</th>
                  <th className="px-4 py-3 font-medium">Entry</th>
                  <th className="px-4 py-3 font-medium">Exit</th>
                  <th className="px-4 py-3 font-medium">Lot size / quantity</th>
                  <th className="px-4 py-3 font-medium">P&amp;L</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {trades.map((trade) => {
                  const livePnl =
                    trade.status === "OPEN" && currentCandle
                      ? (currentCandle.close - trade.entry) *
                        (trade.side === "BUY" ? 1 : -1) *
                        trade.quantity
                      : trade.pnl;

                  return (
                    <tr key={trade.id} className="text-foreground">
                      <td
                        className={`px-4 py-3 font-semibold ${
                          trade.side === "BUY"
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {trade.side}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="font-medium">
                          {trade.orderType === "MARKET"
                            ? "Market"
                            : `${trade.side === "BUY" ? "Buy" : "Sell"} ${trade.orderType.toLowerCase()}`}
                        </span>
                        {trade.orderPrice !== undefined && (
                          <span className="mt-0.5 block text-muted">
                            @ {formatPrice(trade.orderPrice, symbol, pricePrecision)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="block text-red-300">SL {formatPrice(trade.stopLoss, symbol, pricePrecision)}</span>
                        <span className="mt-0.5 block text-green-300">TP {formatPrice(trade.takeProfit, symbol, pricePrecision)}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {formatDate(
                          trade.status === "PENDING" || trade.status === "CANCELLED"
                            ? trade.orderPlacedAt ?? trade.openedAt
                            : trade.openedAt,
                        )} UTC
                      </td>
                      <td className="px-4 py-3">
                        {trade.status === "PENDING" || trade.status === "CANCELLED"
                          ? "—"
                          : formatPrice(trade.entry, symbol, pricePrecision)}
                      </td>
                      <td className="px-4 py-3">
                        {trade.exit === null
                          ? "—"
                          : formatPrice(trade.exit, symbol, pricePrecision)}
                      </td>
                      <td className="px-4 py-3">
                        {formatTradeSize(trade.displaySize ?? trade.quantity, trade.sizeMode ?? "QUANTITY")}
                      </td>
                      <td
                        className={`px-4 py-3 font-medium ${
                          (livePnl ?? 0) >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {livePnl === null ? "—" : formatMoney(livePnl)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                            trade.status === "OPEN"
                              ? "bg-green-400/10 text-green-300"
                              : trade.status === "PENDING"
                                ? "bg-amber-400/10 text-amber-300"
                                : "bg-surface-raised text-muted"
                          }`}
                        >
                          {trade.exitReason === "STOP_LOSS"
                            ? "STOP LOSS"
                            : trade.exitReason === "TAKE_PROFIT"
                              ? "TAKE PROFIT"
                              : trade.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {trade.status === "OPEN" && (
                          <button
                            onClick={() => closeTrade(trade.id)}
                            className="text-xs text-accent hover:text-accent"
                          >
                            Close
                          </button>
                        )}
                        {trade.status === "PENDING" && (
                          <button
                            onClick={() => cancelPendingOrder(trade.id)}
                            className="text-xs text-red-300 hover:text-red-200"
                          >Cancel order</button>
                        )}
                        {trade.status === "CLOSED" && (
                          <button disabled={journalSaveBusyId === trade.id || journaledTradeIds.includes(trade.id)} onClick={() => void saveTradeToJournal(trade)} className="text-xs text-accent hover:text-accent disabled:opacity-60">
                            {journaledTradeIds.includes(trade.id) ? "Saved" : journalSaveBusyId === trade.id ? "Saving..." : "Save to journal"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {trades.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-10 text-center text-sm text-muted"
                    >
                      No trades yet. Start the replay and place a paper trade to
                      begin your test.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="pb-4 text-center text-xs text-muted">
          Historical prices are supplied by {dataProvider || "the configured market data provider"}.
          Current-date ranges refresh every five minutes while this page is open.
        </p>
      </div>

      <style jsx>{`
        .control-button.chart-overlay-control {
          width: 28px;
          min-width: 28px;
          height: 28px;
          padding: 0;
          font-size: 11px;
        }
        .control-button {
          display: inline-flex;
          height: 36px;
          min-width: 36px;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 1px solid var(--border);
          color: var(--foreground);
          background: var(--surface);
          padding: 0 10px;
          font-size: 13px;
        }

        .control-button:hover {
          background: var(--surface-raised);
          color: var(--foreground);
        }

      `}</style>
      <style jsx global>{`
        .backtesting-page { background-color: var(--background); background-image: radial-gradient(ellipse at 88% 0%, color-mix(in srgb, var(--accent) 6%, transparent), transparent 38rem); color: var(--foreground); }
      `}</style>
    </main>
  );
}

function StatCard({
  label,
  value,
  hint,
  positive,
}: {
  label: string;
  value: string;
  hint: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold tracking-tight ${
          positive === undefined
            ? "text-foreground"
            : positive
              ? "text-green-400"
              : "text-red-400"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}
