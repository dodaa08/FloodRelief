// Live flood signal from Open-Meteo (keyless): GloFAS river discharge +
// rainfall forecast. Values are raw; the risk level is a coarse heuristic,
// NOT an official flood warning. See classifyRisk().

const FLOOD_API = "https://flood-api.open-meteo.com/v1/flood";
const FORECAST_API = "https://api.open-meteo.com/v1/forecast";
const CACHE_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12 * 1000;

export type RiskLevel = "NORMAL" | "WATCH" | "WARNING" | "FLOODED";

export type RainfallDay = { date: string; mm: number };
export type RiverDay = { date: string; discharge: number; mean: number; max: number };

export type FloodLive = {
  location: { lat: number; lng: number };
  source: "open-meteo";
  fetchedAt: string;
  risk: RiskLevel;
  signals: string[];
  rainfall: { unit: "mm"; days: RainfallDay[]; forecastTotalMm: number };
  river: {
    unit: "m³/s";
    days: RiverDay[];
    current: number;
    peak: number;
    trend: "rising" | "falling" | "flat";
  };
};

type FloodApiResponse = {
  daily?: {
    time?: string[];
    river_discharge?: (number | null)[];
    river_discharge_mean?: (number | null)[];
    river_discharge_max?: (number | null)[];
  };
};

type ForecastApiResponse = {
  daily?: { time?: string[]; precipitation_sum?: (number | null)[] };
};

function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

const RISK_ORDER: RiskLevel[] = ["NORMAL", "WATCH", "WARNING", "FLOODED"];
function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_ORDER.indexOf(a) >= RISK_ORDER.indexOf(b) ? a : b;
}

// IMD daily rainfall classes (mm). Auto-classification caps at WARNING;
// FLOODED is reserved for ground reports / manual override.
function classifyRisk(rainForecastMm: number, current: number, peak: number): {
  risk: RiskLevel;
  signals: string[];
} {
  let risk: RiskLevel = "NORMAL";
  const signals: string[] = [];

  if (rainForecastMm >= 204.4) {
    risk = maxRisk(risk, "WARNING");
    signals.push("rainfall_extremely_heavy");
  } else if (rainForecastMm >= 115.6) {
    risk = maxRisk(risk, "WARNING");
    signals.push("rainfall_very_heavy");
  } else if (rainForecastMm >= 64.5) {
    risk = maxRisk(risk, "WATCH");
    signals.push("rainfall_heavy");
  }

  const ratio = peak / Math.max(current, 1);
  if (ratio >= 1.5) {
    risk = maxRisk(risk, "WARNING");
    signals.push("discharge_sharp_rise");
  } else if (ratio >= 1.15) {
    risk = maxRisk(risk, "WATCH");
    signals.push("discharge_rising");
  }

  if (signals.length === 0) signals.push("no_signal");
  return { risk, signals };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (res.status === 429 || res.status === 503) {
    throw new RateLimitError(`Upstream ${res.status} for ${url}`);
  }
  if (!res.ok) throw new Error(`Upstream ${res.status} for ${url}`);
  return (await res.json()) as T;
}

class RateLimitError extends Error {}

// Open-Meteo free tier rate-limits. Keep a global queue so a 22-district
// overview never bursts past MAX_CONCURRENT requests, and back off + retry
// when the upstream returns 429.
const MAX_CONCURRENT = 4;
const MAX_ATTEMPTS = 4;
type QueueItem = {
  run: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};
const queue: QueueItem[] = [];
let active = 0;

function drain(): void {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    const { run, resolve, reject } = queue.shift()!;
    active += 1;
    run().then(resolve, reject).finally(() => {
      active -= 1;
      drain();
    });
  }
}

function schedule<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push({
      run: task,
      resolve: resolve as (value: unknown) => void,
      reject,
    });
    drain();
  });
}

async function getJson<T>(url: string): Promise<T> {
  return schedule(async () => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        return await fetchJson<T>(url);
      } catch (error) {
        if (error instanceof RateLimitError && attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, attempt * 1000));
          continue;
        }
        throw error;
      }
    }
    throw new Error(`Rate limit persisted for ${url}`);
  });
}

async function fetchFloodLive(lat: number, lng: number): Promise<FloodLive> {
  const floodUrl =
    `${FLOOD_API}?latitude=${lat}&longitude=${lng}` +
    `&daily=river_discharge,river_discharge_mean,river_discharge_max&past_days=7&forecast_days=7`;
  const forecastUrl =
    `${FORECAST_API}?latitude=${lat}&longitude=${lng}` +
    `&daily=precipitation_sum&past_days=1&forecast_days=7&timezone=Asia%2FKolkata`;

  const [flood, forecast] = await Promise.all([
    getJson<FloodApiResponse>(floodUrl),
    getJson<ForecastApiResponse>(forecastUrl),
  ]);

  const times = flood.daily?.time ?? [];
  const discharge = flood.daily?.river_discharge ?? [];
  const mean = flood.daily?.river_discharge_mean ?? [];
  const max = flood.daily?.river_discharge_max ?? [];

  const riverDays: RiverDay[] = times.map((date, i) => ({
    date,
    discharge: round(discharge[i] ?? 0),
    mean: round(mean[i] ?? 0),
    max: round(max[i] ?? 0),
  }));

  const rainTimes = forecast.daily?.time ?? [];
  const rainVals = forecast.daily?.precipitation_sum ?? [];
  const rainDays: RainfallDay[] = rainTimes.map((date, i) => ({
    date,
    mm: round(rainVals[i] ?? 0),
  }));

  const values = riverDays.map((d) => d.discharge);
  // Split observed (<= today, GMT as returned by the flood API) vs forecast.
  const today = new Date().toISOString().slice(0, 10);
  let forecastStartIdx = times.findIndex((t) => t >= today);
  if (forecastStartIdx === -1) forecastStartIdx = values.length - 1;

  const current = values[forecastStartIdx] ?? 0;
  const forecastVals = values.slice(forecastStartIdx);
  const peak = forecastVals.length ? Math.max(...forecastVals) : current;
  const endOfSeries = values[values.length - 1] ?? 0;

  // Forecast/observed portion of rainfall from today onward.
  const rainTodayIdx = rainTimes.findIndex((t) => t >= today);
  const forecastRainMm = round(
    rainDays
      .slice(rainTodayIdx === -1 ? 1 : rainTodayIdx)
      .reduce((sum, d) => sum + d.mm, 0),
  );

  const { risk, signals } = classifyRisk(forecastRainMm, current, peak);

  const trend: FloodLive["river"]["trend"] =
    endOfSeries > current * 1.05 ? "rising" : endOfSeries < current * 0.95 ? "falling" : "flat";

  return {
    location: { lat: round(lat, 4), lng: round(lng, 4) },
    source: "open-meteo",
    fetchedAt: new Date().toISOString(),
    risk,
    signals,
    rainfall: { unit: "mm", days: rainDays, forecastTotalMm: forecastRainMm },
    river: { unit: "m³/s", days: riverDays, current, peak, trend },
  };
}

const cache = new Map<string, { at: number; data: FloodLive }>();

export async function getFloodLive(lat: number, lng: number): Promise<FloodLive> {
  const key = `${round(lat, 3)}:${round(lng, 3)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.data;
  }
  const data = await fetchFloodLive(lat, lng);
  cache.set(key, { at: Date.now(), data });
  return data;
}
