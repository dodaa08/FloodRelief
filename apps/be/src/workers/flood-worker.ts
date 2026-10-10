import { prisma, type FloodStatus } from "@repo/db";
import { getFloodLive, type FloodLive, type RiskLevel } from "../services/flood.js";
import { publishFloodRegionUpdated } from "../services/notify.js";

export type DistrictFloodRow = {
  districtId: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  isFloodProne: boolean;
  risk: FloodStatus | null;
  signals: string[];
  forecastRainMm: number | null;
  riverCurrent: number | null;
  riverPeak: number | null;
  riverTrend: FloodLive["river"]["trend"] | null;
  fetchedAt: string | null;
  changed: boolean;
  previousRisk: FloodStatus | null;
};

// Fetch live signals for every seeded district, persist a Reading (history)
// and upsert the API_READING DistrictStatus. MANUAL/GROUND_REPORTS rows
// still override via the effective-status priority in lib/flood.ts.
export async function refreshFloodStatuses(): Promise<DistrictFloodRow[]> {
  const districts = await prisma.district.findMany({
    where: { lat: { not: null }, lng: { not: null } },
    orderBy: [{ state: "asc" }, { name: "asc" }],
  });

  const rows = await Promise.all(
    districts.map(async (district) => {
      const lat = district.lat as number;
      const lng = district.lng as number;
      const base = {
        districtId: district.id,
        name: district.name,
        state: district.state,
        lat,
        lng,
        isFloodProne: district.isFloodProne,
      };
      try {
        const live = await getFloodLive(lat, lng);
        const currentStatus = await prisma.districtStatus.findUnique({
          where: { districtId_source: { districtId: district.id, source: "API_READING" } },
        });

        await prisma.districtStatus.upsert({
          where: { districtId_source: { districtId: district.id, source: "API_READING" } },
          create: {
            districtId: district.id,
            source: "API_READING",
            status: live.risk,
            reason: live.signals.join("; ") || null,
          },
          update: { status: live.risk, reason: live.signals.join("; ") || null },
        });

        await prisma.reading.create({
          data: {
            districtId: district.id,
            rainfallMm24h: live.rainfall.days[0]?.mm ?? null,
            riverDischarge: live.river.current,
            observedAt: new Date(),
            source: "open-meteo",
          },
        });

        return {
          ...base,
          risk: live.risk as FloodStatus,
          signals: live.signals,
          forecastRainMm: live.rainfall.forecastTotalMm,
          riverCurrent: live.river.current,
          riverPeak: live.river.peak,
          riverTrend: live.river.trend,
          fetchedAt: live.fetchedAt,
          changed: currentStatus !== null && currentStatus.status !== live.risk,
          previousRisk: currentStatus?.status ?? null,
        };
      } catch (error) {
        console.error(`flood refresh failed for ${district.name}:`, error);
        return {
          ...base,
          risk: null,
          signals: [],
          forecastRainMm: null,
          riverCurrent: null,
          riverPeak: null,
          riverTrend: null,
          fetchedAt: null,
          changed: false,
          previousRisk: null,
        };
      }
    }),
  );

  return rows;
}

async function runCycle(reason: string): Promise<void> {
  console.log(`[worker] flood refresh (${reason}) starting`);
  const rows = await refreshFloodStatuses();
  let published = 0;
  for (const row of rows) {
    if (!row.changed || row.risk === null) continue;
    await publishFloodRegionUpdated({
      districtId: row.districtId,
      name: row.name,
      state: row.state,
      fromRisk: row.previousRisk ?? null,
      toRisk: row.risk,
      signals: row.signals,
      riverCurrent: row.riverCurrent ?? 0,
      riverPeak: row.riverPeak ?? 0,
      fetchedAt: row.fetchedAt ?? new Date().toISOString(),
    });
    published += 1;
  }
  console.log(`[worker] flood refresh done (${rows.length} districts, ${published} status change(s) published)`);
}

export function startFloodWorker(): void {
  if ((process.env.FLOOD_WORKER_ENABLED ?? "true") === "false") {
    console.log("[worker] flood worker disabled (FLOOD_WORKER_ENABLED=false)");
    return;
  }
  const intervalMs = Number(process.env.FLOOD_WORKER_INTERVAL_MS ?? 6 * 60 * 60 * 1000);
  const runOnStart = process.env.FLOOD_WORKER_RUN_ON_START === "true";
  const intervalHours = intervalMs / 3_600_000;

  if (runOnStart) setTimeout(() => void runCycle("startup"), 15_000);
  setInterval(() => void runCycle("interval"), intervalMs);

  console.log(
    `[worker] flood worker started | every ${intervalHours}h | run-on-start=${runOnStart} | provider=${process.env.FLOOD_NOTIFY_PROVIDER ?? "console"}`,
  );
}