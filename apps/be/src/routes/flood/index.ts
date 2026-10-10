import { Router } from "express";
import { getFloodLive } from "../../services/flood.js";
import { refreshFloodStatuses } from "../../workers/flood-worker.js";

const router = Router();

function parseCoord(raw: unknown, min: number, max: number): number | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

// Public, read-only proxy of live flood signals for a point on the map.
router.get("/live", async (req, res) => {
  const lat = parseCoord(req.query.lat, -90, 90);
  const lng = parseCoord(req.query.lng, -180, 180);
  if (lat === null || lng === null) {
    return res
      .status(400)
      .json({ error: "Query params 'lat' (-90..90) and 'lng' (-180..180) are required" });
  }

  try {
    const data = await getFloodLive(lat, lng);
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(502).json({ error: "Flood data source unavailable" });
  }
});

// Public overview: live signal for every seeded district, keyed by id, so
// the map is one call with no ambiguity about which row is which district.
// Shares the worker's refresh (persists Reading + API_READING DistrictStatus);
// does NOT publish notifications on change (that's the worker's job).
router.get("/overview", async (_req, res) => {
  try {
    const rows = await refreshFloodStatuses();
    return res.status(200).json({
      source: "open-meteo",
      fetchedAt: new Date().toISOString(),
      districts: rows.map((r) => ({
        districtId: r.districtId,
        name: r.name,
        state: r.state,
        lat: r.lat,
        lng: r.lng,
        isFloodProne: r.isFloodProne,
        risk: r.risk,
        signals: r.signals,
        forecastRainMm: r.forecastRainMm,
        riverCurrent: r.riverCurrent,
        riverPeak: r.riverPeak,
        riverTrend: r.riverTrend,
        fetchedAt: r.fetchedAt,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
