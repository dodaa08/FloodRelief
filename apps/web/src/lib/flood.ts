export type FloodRisk = "NORMAL" | "WATCH" | "WARNING" | "FLOODED";

export type FloodDistrict = {
  districtId: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  isFloodProne: boolean;
  risk: FloodRisk;
  signals: string[];
  forecastRainMm: number | null;
  riverCurrent: number | null;
  riverPeak: number | null;
  riverTrend: string | null;
  fetchedAt: string;
};

export type FloodOverview = {
  source: string;
  fetchedAt: string;
  districts: FloodDistrict[];
};

// Highest severity first.
export const RISK_ORDER: FloodRisk[] = ["FLOODED", "WARNING", "WATCH", "NORMAL"];

export const RISK_META: Record<
  FloodRisk,
  { label: string; hex: string; badge: string; dot: string }
> = {
  FLOODED: {
    label: "Flooded",
    hex: "#dc2626",
    badge: "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
  WARNING: {
    label: "Warning",
    hex: "#ea580c",
    badge: "border-orange-200 bg-orange-50 text-orange-700",
    dot: "bg-orange-500",
  },
  WATCH: {
    label: "Watch",
    hex: "#d97706",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  NORMAL: {
    label: "Normal",
    hex: "#059669",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
};

const SIGNAL_LABELS: Record<string, string> = {
  rainfall_extremely_heavy: "Extremely heavy rain",
  rainfall_very_heavy: "Very heavy rain",
  rainfall_heavy: "Heavy rain",
  discharge_sharp_rise: "River rising sharply",
  discharge_rising: "River rising",
  no_signal: "No active signal",
};

export function signalLabel(signal: string): string {
  return SIGNAL_LABELS[signal] ?? signal.replaceAll("_", " ");
}

export const TREND_LABEL: Record<string, string> = {
  rising: "Rising",
  falling: "Falling",
  steady: "Steady",
};